# Subagents & Slash Commands for Design Workflows

A curated, verified shortlist — quality over quantity. Every entry below was checked against the live repo (August 2026), and the actual agent/command definition files were read, not just the READMEs.

**Subagents** are delegated specialists: a markdown file (`.claude/agents/*.md`) with its own system prompt, its own tool allowlist, and its own context window. The orchestrating Claude hands work to them and gets a report back. **Slash commands** are user-triggered prompt macros: a markdown file (`.claude/commands/*.md`) that becomes `/command-name` — a named, parameterized prompt you fire yourself.

**The one-line rule:** if you'd hand the work to a specialist and wait for their report (review, audit, build), make it a subagent; if it's a ritual you run yourself mid-flow (critique this, package that), make it a slash command.

---

## Process map: design stage → tool

| Design process stage | Recommended pick |
|---|---|
| Discovery & user research | `/design-research:discover` (Dean) |
| Heuristic / usability evaluation | `/prototyping-testing:evaluate` (Dean) |
| Visual & UI design direction | Anthropic **frontend-design** plugin + **ui-designer** subagent (wshobson) |
| Component & screen implementation | **frontend-developer** subagent (wshobson) |
| Visual critique of a single screen | `/visual-critique:critique-screen` (Dean) |
| Accessibility audit | `/accessibility-audit` (wshobson) |
| Design review of a branch / PR | **design-review** subagent + `/design-review` command (OneRedOak) |
| Developer handoff | `/design-ops:handoff` (Dean) |

---

## Subagents

### 1. design-review — OneRedOak/claude-code-workflows

**[github.com/OneRedOak/claude-code-workflows/tree/main/design-review](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review)** · ~3.9k stars · file: `design-review/design-review-agent.md`

The canonical design-review subagent — the closest thing to an automated design crit, and the template most other review agents copy. It audits front-end changes in seven phases: interaction and user flow, responsiveness, visual polish, accessibility (WCAG 2.1 AA), robustness, code health, and content/console.

**Why the system prompt is good:** it operationalizes judgment instead of describing a persona. Three things stand out:

- A **"Live Environment First" philosophy** — it must drive the actual running UI with Playwright before reading any code, rejecting static analysis as the primary evidence.
- A **strict triage vocabulary** (Blocker / High-Priority / Medium-Priority / Nitpick) so output is consistently actionable, not a wall of opinions.
- An **evidence rule**: findings require screenshots, and feedback must "describe problems and their impact, not technical solutions" — the agent critiques like a principal designer, it doesn't redesign for you.

It also pins concrete numbers: 4.5:1 contrast, and specific viewports (1440×900 desktop, 768px tablet, 375px mobile).

**Tools needed:** Playwright MCP (browser automation, screenshots) — this is non-negotiable; without it the agent degrades to a diff-reader. Plus Read/Grep/Bash for the diff.

**When to invoke:** on any PR or branch that touches UI, before merge. Pairs with the repo's GitHub Action for automatic PR review, or the `/design-review` command (below) for on-demand runs.

**Caveats:** repo is a small template collection (~12 commits) — treat it as a starting point you tailor with your own `design-principles.md`. Also remember the reviewer is the same model family as the author: it catches consistency and a11y issues reliably, taste issues less so.

### 2. ui-designer — wshobson/agents (ui-design plugin)

**[github.com/wshobson/agents](https://github.com/wshobson/agents)** · ~38.5k stars, actively maintained · file: `plugins/ui-design/agents/ui-designer.md`

Visual design and component specialist from the largest production-grade agent collection (203 agents, plugin-structured, multi-harness). Covers component creation, layout systems, design tokens, and visual design implementation.

**Why the system prompt is good:** it's an operational spec, not vibes. It prescribes atomic design, mobile-first flow, design tokens, and enumerated component states — "State-driven component design: default, hover, active, focus, disabled, error" — plus measurable floors like 44×44px touch targets, and an explicit value ordering: "Prioritizes user needs and usability over aesthetic preferences."

**Tools needed:** standard file tools (Read/Write/Edit); benefits from Figma MCP if your designs live there. Runs on Opus per the catalog (model: inherit in the file).

**When to invoke:** when designing new components/screens in code, or systematizing an existing UI into tokens and variants.

**Caveats:** the repo restructured from flat files into plugins — old deep links are dead; install via the plugin marketplace (`ui-design` plugin). Siblings worth noting in the same plugin: `accessibility-expert` and `design-system-architect`.

### 3. frontend-developer — wshobson/agents (multi-platform-apps plugin)

**[github.com/wshobson/agents](https://github.com/wshobson/agents)** · file: `plugins/multi-platform-apps/agents/frontend-developer.md`

The build counterpart to ui-designer: a React/Next.js specialist for components, responsive layouts, and client-side state.

**Why the system prompt is good:** version-specific rather than timeless-generic — it names "React 19 features including Actions, Server Components, and async transitions," Next.js 15 patterns, TypeScript 5.x, and WCAG 2.1/2.2, with a structured response approach and example interactions. Generic frontend personas can't tell React 17 advice from React 19; this one can.

**Tools needed:** file tools + Bash for builds/tests; model: inherit (Sonnet-tier per catalog).

**When to invoke:** implementing designs as production components — the "designer designs, agent builds, design-review agent checks" loop.

**Caveats:** React-ecosystem opinionated; if you're on Vue/Svelte, look to VoltAgent's language specialists instead.

### 4. ui-designer — VoltAgent/awesome-claude-code-subagents

**[github.com/VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)** · ~24k stars · file: `categories/01-core-development/ui-designer.md`

A strong alternative ui-designer with a distinctive three-phase execution model: Context Discovery → Design Execution → Handoff Documentation. Unusually thorough on the unglamorous parts — dark-mode color adaptation, motion/animation performance budgets, cross-platform (iOS/Android guideline) consistency, and WCAG 2.1 AA validation as a workflow step.

**Why the system prompt is good:** the phased workflow forces the agent to gather context before designing and to end with handoff-quality specs — mirroring how a real design task actually runs, rather than jumping straight to output.

**Tools needed:** Read, Write, Edit, Bash, Glob, Grep.

**Caveats:** the prompt opens with "Always begin by requesting design context from the context-manager" — a coupling to VoltAgent's orchestration pattern. If you use it standalone, delete or repoint that instruction. Sibling picks in the same repo if you need them: `frontend-developer.md`, `ui-ux-tester.md` (documented-flow UI testing).

### 5. frontend-design — Anthropic official plugin

**[claude.com/plugins/frontend-design](https://claude.com/plugins/frontend-design)** · source: [github.com/anthropics/claude-code/tree/main/plugins/frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) · 1.1M+ installs

Technically a **skill**, not a subagent (it triggers automatically during frontend work rather than being delegated to) — included here because it fills the slot a "design direction agent" would: it makes Claude commit to a clear aesthetic direction (typography, palette, motion, visual detail) *before* writing code, explicitly to avoid generic "AI slop" defaults.

**Why it's good:** it's the official distillation of Anthropic's [Frontend Aesthetics Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb), by Rajasekaran & Bricken — the same technique the study-material prompts below use at production scale.

**When to use:** install it and it self-triggers on frontend builds; combine with the ui-designer/frontend-developer subagents above.

**Caveats:** it biases toward *bold* aesthetics; for conservative enterprise UI you may want to temper it with your own design-principles rules file.

---

## Slash commands

### 1. /design-review — OneRedOak/claude-code-workflows

**file:** `design-review/design-review-slash-command.md` · [repo](https://github.com/OneRedOak/claude-code-workflows)

On-demand design review of the current branch: gathers `git status`, diff against `origin/HEAD`, and commit history, then reviews the diff against your `design-principles.md` and `style-guide.md` and emits a triaged markdown report. Opens with "You are an elite design review specialist…" but earns it with the same triage/evidence machinery as the agent version.

**When:** pre-PR self-check, or whenever you want the crit without the GitHub Action. **Caveat:** works best after you write the two referenced principle docs (the repo ships `design-principles-example.md` as a template).

### 2. /visual-critique:critique-screen — Marie Claire Dean, designer-skills

**[github.com/owl-listener/designer-skills](https://github.com/owl-listener/designer-skills)** · ~2k stars, 88 commands across 33 plugins · file: `visual-critique/commands/critique-screen.md`

The standout of Dean's collection: runs **seven sequential critiques** on one screen — visual hierarchy, brand consistency, composition, typography, color, affordance, information density — then consolidates every flagged issue into a P1/P2/P3 fix list ("Breaks usability, accessibility, or brand compliance; fix before shipping" defines P1). Accepts a screen name, Figma URL, or screenshot. The forced multi-lens pass is what makes it better than "critique this": each dimension gets dedicated attention before prioritization.

**When:** before any screen ships; also great on competitor screenshots. Sibling: `/visual-critique:critique-ux` for functional rather than visual critique.

### 3. /prototyping-testing:evaluate — designer-skills

**file:** `prototyping-testing/commands/evaluate.md`

Heuristic evaluation of an existing design or flow: scopes the evaluation, applies Nielsen's ten heuristics via a dedicated `heuristic-evaluation` skill, walks flows for friction points, checks accessibility, ranks findings by severity, and suggests targeted fixes — then nudges you to "consider following up with `/test-plan` to validate findings with real users." That last line is the tell: the command knows AI evaluation is a hypothesis, not a verdict.

**When:** early — on prototypes and flows before you'd spend real usability-testing budget.

### 4. /design-ops:handoff — designer-skills

**file:** `design-ops/commands/handoff.md`

Generates a complete developer handoff package: visual specs with measurements and tokens, interaction/state specs, asset list, implementation QA checklist, readiness validation, and version tagging. Chains the repo's `handoff-spec` and `design-qa-checklist` skills — a good example of a command orchestrating skills.

**When:** the moment a design is "done" and engineering is next. **Caveat:** output quality tracks how much real spec detail (tokens, states) exists in your project for it to compile.

### 5. /design-research:discover — designer-skills

**file:** `design-research/commands/discover.md`

A full discovery cycle in one command: generates 2–4 personas, builds empathy maps for the primary persona, maps the end-to-end journey, then synthesizes into insights and design implications with suggested validation follow-ups.

**When:** kicking off a feature when you need a structured research scaffold fast. **Caveat — the big one:** personas and journeys generated without real user data are assumptions dressed as artifacts. Use it to structure and accelerate research, feed it real interview notes when you have them, and treat unvalidated output as hypotheses.

### 6. /accessibility-audit — wshobson/commands

**[github.com/wshobson/commands](https://github.com/wshobson/commands)** · ~2.6k stars · file: `tools/accessibility-audit.md`

Deep WCAG compliance audit: automated passes (Axe, Pa11y, HTML validation), contrast analysis, keyboard-navigation testing ("test interactive elements for click handlers without keyboard support"), screen-reader checks, manual checklists, remediation code fixes, CI integration, and severity-weighted scoring (critical/serious/moderate/minor). Parameterized by WCAG level (AA/AAA), viewport, and scope.

**When:** periodically on the whole product and always before release; complements the design-review agent's per-PR a11y phase with tool-driven depth. **Caveat:** needs the audit tools installed/runnable in your environment to deliver its full automated pass.

---

## Study material: production system prompts

**[x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools)** (~142k stars, updated July 2026) collects the full system prompts and tool schemas of v0, Lovable, Cursor, Devin, Windsurf, and others. Don't install anything from it — read it. The v0 and Lovable prompts are the best available textbooks on encoding design judgment as instructions. Lessons from actually reading them:

1. **Numbers beat adjectives.** v0 doesn't say "restrained palette" — it says "ALWAYS use exactly 3-5 colors total" and maximum 2 font families, line-height 1.4–1.6. Quantified constraints are enforceable; "clean and modern" is not.
2. **Make the design system the law, not a suggestion.** Lovable: "The design system is everything. You should never write custom styles in components" — all color/type/effects live as semantic tokens in central files; components may only consume them. That single rule is why Lovable output stays coherent across generations.
3. **Prohibitions carry as much weight as directives.** Both prompts ban failure modes by name: no gradients unless requested, no emojis as icons, no mixing warm and cool color temperatures. Your rules file should enumerate *your* product's known AI-slop patterns the same way.
4. **State the priority order explicitly.** Lovable literally ranks "Beautiful designs are your top priority" over feature completeness; v0 resolves the taste dilemma with "ship something interesting rather than boring, but never ugly." When you don't state trade-off order, the model picks one silently.
5. **Bake accessibility into generation, not review.** Both prompts put semantic HTML, ARIA, `sr-only` text, and alt text in the *writing* rules — cheaper than catching violations in audit later. Mirror this in your own CLAUDE.md rather than relying solely on `/accessibility-audit`.

---

## Evaluated but not selected

- **lst97/claude-code-sub-agents** (ui-designer/ux-designer) — competent definitions, but fully overlapped by the better-maintained wshobson and VoltAgent picks (~1.6k stars, low commit activity).
- **VoltAgent frontend-developer / design-bridge / ui-ux-tester** — solid, but redundant with picks above; noted as siblings rather than headline entries.
- **wshobson accessibility-expert & design-system-architect agents** — likely good (same plugin as the picked ui-designer) but not evaluated in depth; the `/accessibility-audit` command covers the a11y slot.
- **wshobson/commands (rest of collection)** — 57 commands, but overwhelmingly backend/infra; only `accessibility-audit` is design-relevant.
- **hesreallyhim/awesome-claude-code** (~51.6k stars) — the master discovery index, not a pick itself; use it (and its `THE_RESOURCES_TABLE.csv`) to find what this list doesn't cover.
- **Marie Claire Dean's remaining ~80 commands** — the collection is worth browsing whole (`/ux-strategy:strategize`, `/design-systems:tokenize`), but the five selected are the standouts; listing 27+ would defeat curation.
- **lxcong/awesome-claude-dynamic-workflows, danielrosehill/Claude-Slash-Commands** — orchestration experiments and a personal library; not design-focused enough to make the cut.
