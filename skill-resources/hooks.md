# Hooks: The Design-QA Enforcement Layer

Hooks are shell commands (or HTTP/MCP calls) bound to lifecycle events in Claude Code, configured in `settings.json`. Unlike prompts, rules files, or skills — which the model may follow, half-follow, or forget under context pressure — hooks are **deterministic**: the formatter *always* runs after an edit, the off-token color is *always* flagged, the screenshot is *always* taken. That determinism is exactly what design QA needs, because AI-generated UI routinely passes text-based gates (types, unit tests) while shipping off-token colors, wrong spacing, and contrast failures.

The events that matter most for design work:

| Event | Fires | Design use |
|---|---|---|
| `PreToolUse` | Before a tool runs; **can block** (exit 2 or `permissionDecision: "deny"`) | Stop an edit that would hardcode values or touch protected files |
| `PostToolUse` | After a tool succeeds; can't undo, but stderr on exit 2 is fed back to Claude | Auto-format, lint for token drift, trigger a screenshot — Claude sees the feedback and self-corrects |
| `Stop` | When Claude finishes responding; **exit 2 prevents stopping** | Run a11y/visual checks before "done" is allowed to mean done |
| `SessionStart` | Session begins/resumes | Inject design-system context (token file paths, component inventory) |
| `UserPromptSubmit` | Before a prompt is processed | Add per-prompt context or route to skills |

Mechanics in one paragraph (full reference: [official hooks docs](https://code.claude.com/docs/en/hooks)): hooks receive a JSON payload on stdin (`tool_name`, `tool_input.file_path`, `cwd`, …), match on tool names via `matcher` (`"Edit|Write"`, regex allowed) with optional file-scoped `if` filters (`"Edit(*.css)"`), and communicate back via exit codes — `0` = proceed (stdout can carry JSON like `additionalContext` to inject text into Claude's context), `2` = block/feed stderr to Claude, other = non-blocking error. That small contract is enough to build an entire design-QA loop.

---

## Design QA Hook Recipes

The honest state of the ecosystem (confirmed by direct review of the major hook repos in mid-2026): **design-specific hooks barely exist in the wild.** Community hook collections are overwhelmingly code-hygiene focused — dangerous-command blockers, linters, test runners. So this section curates the few real mechanisms that exist and **authors the missing recipes** on top of verified hook semantics. Each recipe is marked as *sourced* (exists in a public repo) or *authored here* (written for this collection; mechanism verified against official docs, script untested in your stack — adjust globs, ports, and commands).

### Recipe 1 — Format-on-edit (Prettier + Stylelint)  ·  *sourced: adapted from ChrisWiles/claude-code-showcase*

Protects: **code hygiene during implementation** — no drift between what the agent writes and your formatting/CSS conventions; diffs stay reviewable.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.css|*.scss) npx stylelint --fix \"$f\" 2>&1; npx prettier --write \"$f\" 2>&1 ;; *.ts|*.tsx|*.js|*.jsx|*.json|*.md) npx prettier --write \"$f\" 2>&1 ;; esac; exit 0",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

How it works: after every `Edit`/`Write`, the file path is pulled from the stdin JSON and piped through Prettier (and Stylelint for stylesheets). Always exits 0 — formatting is a silent fix, not a conversation. `claude-code-showcase` runs the same pattern and additionally chains `tsc --noEmit` and related-test runs; copy those if you want a fuller gate.

### Recipe 2 — Token-drift guard (block hardcoded hex/px)  ·  *authored here*

Protects: **design-system fidelity at generation time** — the "shift-left" answer to the drift problem where agents ignore the token system they were told about (no dominant open-source token-linter exists yet; this is the 20-line stopgap).

Script — save as `.claude/hooks/token-drift.sh`, `chmod +x`:

```bash
#!/bin/bash
# Flags hardcoded colors and raw px values in edited style/component files.
input=$(cat)
f=$(echo "$input" | jq -r '.tool_input.file_path // empty')
case "$f" in
  *.css|*.scss|*.tsx|*.jsx|*.vue|*.svelte) ;;
  *) exit 0 ;;
esac
# Skip the token source-of-truth files themselves
case "$f" in *tokens*|*theme*) exit 0 ;; esac
hits=$(grep -nE '#[0-9a-fA-F]{3,8}\b|(font-size|margin|padding|gap|border-radius)[^;]*:\s*[0-9]+px' "$f" 2>/dev/null | grep -v 'token-ok' | head -15)
if [ -n "$hits" ]; then
  echo "Off-token values in $f — use design tokens (var(--*) / theme scale) instead:" >&2
  echo "$hits" >&2
  echo "If a raw value is genuinely intentional, append /* token-ok */ to that line." >&2
  exit 2
fi
exit 0
```

Wiring:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/token-drift.sh" }
        ]
      }
    ]
  }
}
```

How it works: on `PostToolUse`, exit 2 can't undo the edit, but stderr is fed straight back to Claude — which reliably triggers an immediate self-correction pass ("replace `#3B82F6` with `var(--color-action-primary)`"). Move it to `PreToolUse` (grepping `tool_input.new_string` instead of the file) if you want a hard block before the write; the warn-and-fix variant is less brittle in practice because legitimate exceptions exist. Tune the regex to your system — add `rgb(`, `rem` opt-outs, spacing-scale allowlists.

### Recipe 3 — Screenshot after UI change (Playwright)  ·  *authored here; agent-driven variant sourced from OneRedOak/claude-code-workflows*

Protects: **the visual verification loop** — the single biggest difference between an agent that generates plausible UI code and one that has actually *seen* its output render.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in */components/*|*/pages/*|*/app/*|*.css) mkdir -p .claude/screenshots && npx playwright screenshot --viewport-size=1440,900 --wait-for-timeout=1500 http://localhost:3000 .claude/screenshots/latest.png >/dev/null 2>&1 && echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PostToolUse\",\"additionalContext\":\"UI changed. Screenshot saved to .claude/screenshots/latest.png — Read it and verify the change looks correct before continuing.\"}}' ;; esac",
            "timeout": 45,
            "statusMessage": "Capturing screenshot..."
          }
        ]
      }
    ]
  }
}
```

How it works: when a component/page/style file changes, the Playwright CLI screenshots the running dev server, and the hook's JSON stdout injects `additionalContext` telling Claude to `Read` the image (Claude reads PNGs natively). Deterministic where the popular alternative is instructional: **OneRedOak's approach** puts an "IMMEDIATELY after implementing any front-end change … capture evidence — take full page screenshot at desktop viewport (1440px)" directive in `CLAUDE.md` and lets the agent drive Playwright MCP itself, which can navigate to the *specific* changed route rather than a hardcoded URL. Best combined: hook for the guarantee, CLAUDE.md snippet for the smarts. Requires a running dev server; point the URL at your route or a Storybook story.

### Recipe 4 — Accessibility check on Stop (axe-core)  ·  *authored here*

Protects: **the accessibility floor as a completion gate** — "done" is not allowed to mean "done with WCAG failures."

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/a11y-gate.sh",
            "timeout": 60,
            "statusMessage": "Running axe accessibility check..."
          }
        ]
      }
    ]
  }
}
```

`.claude/hooks/a11y-gate.sh`:

```bash
#!/bin/bash
input=$(cat)
# Loop guard: if this Stop was already triggered by a stop hook, let it through.
[ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
# Only gate when UI files changed this session (cheap heuristic via git).
git diff --name-only 2>/dev/null | grep -qE '\.(tsx|jsx|vue|svelte|css|scss|html)$' || exit 0
violations=$(npx @axe-core/cli http://localhost:3000 2>/dev/null | grep -E 'Violation|violations found')
if echo "$violations" | grep -vq '0 violations'; then
  echo "axe-core found accessibility violations — fix before finishing:" >&2
  echo "$violations" >&2
  exit 2
fi
exit 0
```

How it works: exit 2 on a `Stop` hook *prevents Claude from stopping* and feeds the violations back, forcing a fix-and-recheck cycle. Two critical details: the `stop_hook_active` guard prevents infinite loops, and the git-diff heuristic keeps the gate from firing on non-UI work. Scope the axe run to changed routes/stories for speed; on component libraries, `@storybook/addon-a11y` test runs are the better target.

### Recipe 5 — Design review on PR  ·  *sourced: OneRedOak/claude-code-workflows, with an authored hook trigger*

Protects: **the release gate** — a structured design crit on every PR with visual changes, not just when someone remembers to ask.

Authored hook trigger — catches `gh pr create` and injects the review requirement before the PR goes up:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "cmd=$(jq -r '.tool_input.command // empty'); if echo \"$cmd\" | grep -q 'gh pr create'; then if git diff origin/main --name-only 2>/dev/null | grep -qE '\\.(tsx|jsx|vue|svelte|css|scss)$'; then echo '{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"This PR contains UI changes. Before creating it, run the @agent-design-review subagent (or /design-review) against the live preview and include findings in the PR description.\"}}'; fi; fi"
          }
        ]
      }
    ]
  }
}
```

The review itself is the sourced part: OneRedOak's `design-review` agent runs a seven-phase audit — preparation, interaction testing, responsiveness (1440/768/375px), visual polish, WCAG 2.1 AA, robustness/edge cases, code health — driving the live UI via Playwright MCP and reporting with `[Blocker]/[High-Priority]/[Medium-Priority]/[Nitpick]` triage. Its stated philosophy: "problems and their impact, not technical solutions." For a fully unattended variant, their repo also shows the GitHub Actions pattern (claude-code-action reviewing on PR open). This recipe is the natural terminus of recipes 1–4: format and tokens enforced per-edit, screenshots per-change, a11y per-turn, holistic crit per-PR.

---

## Recommended Resources

### [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks) — official

**What it provides:** The authoritative mechanism reference — the full event catalog (now 30+ events, well beyond the "13" most tutorials cover), `settings.json` schema, matcher and `if`-filter syntax, stdin payload shapes, exit-code semantics, and the JSON output contract (`permissionDecision`, `additionalContext`, `updatedInput`, `decision: block`).
**How it works:** Hooks live in `~/.claude/settings.json` (user), `.claude/settings.json` (project, shareable), or plugin/skill frontmatter; matching hooks run in parallel with a shared stdin JSON contract.
**Quality:** The one source that stays current as the hook surface expands — hook types now include `http`, `mcp_tool`, `prompt`, and experimental `agent` handlers that no community repo demonstrates yet.
**Caveats:** Reference, not recipes; read it alongside a worked example like disler's repo.

### [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) — the design-review loop

**What it provides:** The only widely-adopted, design-specific review workflow (~3.9k stars, MIT): a `design-review` subagent, `/design-review` slash command, a CLAUDE.md "immediate visual check" snippet, and an example design-principles file, alongside sibling code-review and security-review workflows.
**How it works:** The CLAUDE.md snippet makes every front-end change end with a Playwright-MCP screenshot at 1440px plus a console-error check; the subagent escalates to the full seven-phase, WCAG-AA, multi-viewport crit with structured triage output.
**Quality:** Excellent — this is the closest thing to a canonical automated design crit, written by people who ship (Silicon Valley AI-native startup provenance), with genuinely good review rubric writing.
**Caveats:** Strictly speaking its design loop is *instructional* (CLAUDE.md + agent) rather than hook-enforced — pair it with recipes 3 and 5 above for determinism. Requires Playwright MCP configured and a running preview environment.

### [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery) — the mechanism education

**What it provides:** The reference implementation of the hook lifecycle (~3.9k stars): every major event wired to a Python script, with logging of every payload to `logs/*.json` so you can *see* what each event receives, plus PreToolUse safety blockers (rm -rf patterns, `.env` access) and Stop-hook completion flows.
**How it works:** Each event maps to a UV single-file Python script (`uv run .claude/hooks/pre_tool_use.py`) — self-contained, no virtualenv, portable. The pre_tool_use blocker is a solid worked example of exit-2 semantics with normalized-regex command matching.
**Quality:** The best place to *learn* hooks — the payload logs alone are worth the install. Code is clean and defensive.
**Caveats:** Zero design-specific content (its "design" surface is terminal status lines and output styles). Covers the classic event set; the docs have since added many events it doesn't demonstrate. TTS/LLM-naming extras are fun but noise for this use case.

### [ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase) — the production-shaped template

**What it provides:** A complete, coherent `.claude/` setup (~6k stars, MIT): hooks + skills + agents + commands + GitHub Actions working together, not as isolated demos.
**How it works:** Its `settings.json` is the best public example of enforcement-grade PostToolUse chains — Prettier on every JS/TS edit, `tsc --noEmit` on TypeScript changes, related-test runs on test-adjacent edits, `npm install` on package.json changes — plus a PreToolUse main-branch edit blocker and a clever UserPromptSubmit hook that pattern-matches prompts against `skill-rules.json` to auto-suggest skills.
**Quality:** High — this is what a team's real config looks like, with timeouts, file-type scoping, and CI integration thought through. Recipe 1 above is its pattern.
**Caveats:** Dev-workflow focused (React/GraphQL/Jest stack assumptions); the design-QA layer is yours to add on top. Hook commands are inline shell in settings.json — fine to copy, harder to unit test.

### [decider/claude-hooks](https://github.com/decider/claude-hooks) — the validation-gate pattern

**What it provides:** A small, focused Python hook system (MIT) for automatic quality gates: code-quality limits (function/file/line length), an npm package-age checker that stops the agent installing stale dependencies, and task-completion notifications.
**How it works:** One-command installer scaffolds `.claude/` and wires PreToolUse/PostToolUse/Stop; notably supports **hierarchical config** — root plus per-directory JSON with inheritance, so different parts of a monorepo get different thresholds.
**Quality:** Clean and legible, but small (~74 stars) — include it for the *pattern*, not the community gravity: its "objective thresholds enforced per-directory" design is exactly the shape a design-token linter (recipe 2) should grow into.
**Caveats:** No design/CSS/UI content whatsoever; modest adoption means you're maintaining your fork of the idea.

---

## Evaluated But Not Selected

- **[rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit)** — 20 hooks inside an 850-file everything-repo (135 agents, 176 plugins); the hooks are generic (destructive-command blocking, branch guards, syntax checks) and the sheer breadth makes quality auditing impractical — breadth over depth.
- **[hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)** — valuable discovery layer with a hooks category, but it's an index, not a hook resource; covered by this repo's curated-lists file.
- **[RiyaParikh0112/claude-code-playbook (hooks doc)](https://github.com/RiyaParikh0112/claude-code-playbook/blob/main/docs/advanced/hooks-and-automation.md)** — decent tutorial prose, but the official docs plus disler's repo cover the same ground with more authority.
- **ayautomate "Best Claude Code Hooks" blog** — listicle-grade; nothing beyond what the selected repos demonstrate first-hand.
- **Chromatic / Percy / Applitools as hook targets** — real visual-regression value, but they're CI products, not hook resources; calling them per-edit from a hook is uneconomical. The right seam is recipe 5's PR gate feeding your existing CI visual tests.
