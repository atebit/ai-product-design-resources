# Review & Feedback Tooling for Prototypes Outside Figma

A curated, verified shortlist of how humans (and agents) **see, annotate, discuss, and track feedback** on prototypes and flows that do not live on a Figma canvas: hosted code prototypes (Vercel / Netlify previews, Storybook), Claude Code artifacts and Claude Design boards, Figma Make / v0 / Lovable / Bolt links, static generated mockups, and flow diagrams. Every entry was checked against the live repo, docs page, or product page in September 2026, and the actual contents (READMEs, skill files, CLI reference, help articles) were read, not just the landing copy.

**Why this category exists.** Figma gave reviewers two things for free: every screen visible at once, and a comment pinned to a coordinate. Code prototypes give neither. **The anchor is the whole problem** — a usable comment on a running prototype has to carry *route + viewport + state* (or a timestamp in a recording), and the deployment it points at changes with every push. Every tool below is differentiated by how much of that anchor it captures automatically (Figma Make's element screenshot, Netlify's recording, Agentation's selector) and by whether the comment can become a tracker issue or an agent task without retyping.

**How it fits against Chain C.** [Chain C in skillchains.md](skillchains.md#chain-c--design-qa--review-the-crit-loop) is the *agent-driven* crit loop — the OneRedOak design-review subagent driving Playwright MCP, hook recipes 4 and 5 as gates. This file is the *human* feedback layer around it: where reviewers leave comments, how the "every screen at once" overview gets rebuilt, which critique format keeps text feedback locatable, and how those comments flow back into an agent. Neither the design-review subagent nor Playwright MCP is re-listed here; see [subagents-and-commands.md](subagents-and-commands.md) and [mcp-servers.md](mcp-servers.md).

*Curated September 2026. Plan gating and prices are snapshots.*

---

## Playbook by artifact type

| Artifact | See it | Comment on it | Critique format | Track it |
|---|---|---|---|---|
| Hosted code prototype (Vercel) | Preview URL + a contact sheet of every route/state linked in the PR ([Recipe A](#recipe-a--contact-sheet-on-pr--authored-here)) | Vercel Toolbar comments (element/text anchored, free); external guests on Pro+ | Critique-response template with Conventional Comments labels; interaction feedback as a recording with timestamps | Convert threads to Linear/GitHub once discussion is done; make Vercel's unresolved-comments check required; agent reads via `vercel comments --json` ([Recipe B](#recipe-b--unresolved-preview-comments-gate--authored-here)) |
| Hosted code prototype (Netlify / Cloudflare) | Preview URL + contact sheet | Netlify Drawer (screenshots, recordings, PR sync); on Cloudflare, add a third-party overlay | Same as above | Drawer → Linear/Jira/GitHub |
| Branch preview with Storybook | One story per state; storycap sheet as a CI artifact | PR review comments on the storycap images (Chromatic UI Review is Enterprise-only now) | Blocker / High / Medium / Nit with the story ID as anchor | PR review threads; `@claude` on a thread for fixes |
| Claude Code artifact | The artifact page, pinned to a version for the review | Artifact comment threads (org-shared, Team/Enterprise); **Send to Claude** for changes you want automated | One problem per thread so resolve/reopen means something | Threads on the artifact; anything needing engineering copied to the tracker with the artifact URL |
| Claude Design board | Share link (view/comment) | Inline element comments; fall back to chat paste if pins fail | I like / I wish / What if early; the response template once converging | Bundle handoff to Claude Code; decisions summarized in the design doc |
| Figma Make / v0 / Lovable / Bolt | Figma Make preview; for v0 and Bolt, deploy and review the deployment | Figma Make comments (full seats, latest version); Lovable pinned comments; Vercel/Netlify comments for v0/Bolt deploys | Response template; name the version in every comment | Figma Make "Other versions" filter; Vercel/Netlify → tracker |
| Static generated mockup (image) | FigJam/Figma frame, or the Figma Chrome extension capture | FigJam/Figma comments; Casso or Agentation red-pen to hand back to the agent | I like / I wish / What if early; heuristic checklist later | Annotated image on the tracker issue; agent-bound annotations as markdown in the repo |
| Flow diagram (Mermaid/D2 in repo; FigJam/Miro) | Rendered diagram in the PR or the board | PR review comments on the diagram source lines; board comments | Anchor to node IDs / step names | The PR itself; board decisions summarized back into the repo diagram |

---

## Comment surfaces on hosted prototypes

### 1. Vercel Toolbar comments + `vercel comments` CLI + MCP toolbar tools

[vercel.com/docs/comments](https://vercel.com/docs/comments) · [CLI reference](https://vercel.com/docs/cli/comments) · [MCP tools](https://vercel.com/docs/agent-resources/vercel-mcp/tools)

The most complete platform-native surface, and the only one whose threads are a first-class agent input. Comments are "enabled by default on *all* preview deployments, for all account plans, free of charge"; reviewers click any element or highlight text, threads sync two-way with Slack, and any thread converts to a Linear, Jira, or GitHub issue carrying "all previous discussion and images, and a link back to the comment thread."

**How it works.** The toolbar anchors a thread to a page path and element. The Vercel bot posts an "Add your feedback" link on the PR and adds an unresolved-comments check that "is not required by default" — flip it to required in branch protection and the PR cannot merge with open threads. Since CLI **59.3.0 (20 Aug 2026)**, `vercel comments` lists unresolved threads for the current branch and can `inspect --context` (framework and device details), `reply`, `resolve -m`, `reopen`, `edit`, and `delete`, all with `--json`. The hosted MCP server (`https://mcp.vercel.com`) exposes `list_toolbar_threads`, `get_toolbar_thread`, `reply_to_toolbar_thread`, `change_toolbar_thread_resolve_status`, `edit_toolbar_message`, and `add_toolbar_reaction`.

**When to reach for it.** Any prototype already deploying to Vercel; the moment you want "process the reviewer's comments" to be a prompt rather than a copy-paste. Vercel's own suggested prompt: "Process the comments I left on the site. Run `vercel comments` to get started."

**Install/Setup.** Nothing for the toolbar. CLI: `npm i -g vercel@latest` (a 50.x install verified locally does not have the subcommand). MCP: `claude mcp add --transport http vercel https://mcp.vercel.com`, then `/mcp` to authorize.

**Caveats.** Reviewers need a Vercel account; external guests only on Pro/Enterprise. The CLI and MCP cannot *create* threads — only the toolbar can. Converting a thread to an issue resolves it permanently ("The thread cannot be unresolved"), so convert late. Nothing anchors to a *state* (open menu, error) — describe it in the comment.

### 2. Netlify Drawer

[docs.netlify.com — Netlify Drawer for feedback](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/)

The richest reviewer experience at zero cost: from a Deploy Preview, reviewers "can take screenshots and add visual or text-based annotations, create screen recordings, and share comments," and drag image/video files into a comment.

**How it works.** Every Drawer comment on a Deploy Preview "is automatically posted in the corresponding pull/merge request at your Git provider and vice versa," and issues open directly in GitHub, GitLab, Jira, Linear, Shortcut, Trello, and more. "An unlimited number of cross-functional stakeholders can review Deploy Previews and branch deploys for free" in the Reviewer role.

**When to reach for it.** Netlify-hosted prototypes, and any team whose reviewers are non-engineers — the screen recording is the only native surface that captures an *interaction sequence*, which no pinned comment can.

**Install/Setup.** On by default for Deploy Previews; invite reviewers from the team settings. Reviewers "must be approved and log in to Netlify through the Netlify Drawer."

**Caveats.** Login required (no anonymous guests). Branch deploys without a PR lose the PR-synced conversation, and the Drawer is hidden on branch deploys when split tests are active. No CLI or MCP surface — the PR comment is the agent's way in.

### 3. Claude Code artifact comment threads + Send to Claude

[code.claude.com/docs/en/artifacts](https://code.claude.com/docs/en/artifacts)

Comment threads on a published artifact that can wake the session that published it. Share an artifact within your organization and reviewers comment on the page; an editor activates a thread with **Send to Claude** or `@claude`, and "Claude can reply to or resolve only an activated thread."

**How it works.** From Claude Code v2.1.228 the publishing session "watches that artifact for comments for as long as the session runs" and, depending on permission mode, auto-replies and auto-edits the page (`Auto-edited Artifact: <name> in response to a comment thread`), capped at 60 sent comments per artifact per hour. Each publish is a version and the share control chooses which version viewers see — pin a review to a version while work continues. Ask for the threads any time: "Read the comments on https://claude.ai/code/artifact/… and make the changes the commenters ask for."

**When to reach for it.** Design options laid out side by side, annotated PR walkthroughs, static mockups exported as HTML — anything the agent built and can rebuild from feedback in the same session.

**Install/Setup.** Claude Code v2.1.221+ on a Team or Enterprise plan (comments), signed in with `/login`; artifacts themselves are on Pro/Max too. `/artifacts` lists and re-attaches artifacts across sessions.

**Caveats.** Publicly shared artifacts cannot take comments at all; only org-shared ones can. Threads are not element-anchored the way Figma's are — put the anchor in the comment text. Rate limits and permission mode decide whether auto-reply actually fires; check `/tasks`.

### 4. Claude Design and Figma Make comment modes

[Claude Design help](https://support.claude.com/en/articles/14604416-get-started-with-claude-design) · [Figma Make comments](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make)

The two AI design tools with real, element-level comment modes — grouped because they share the same shape and the same trap.

**How it works.** Claude Design shares a board with "view-only, comment, and edit access"; reviewers click elements to leave targeted feedback, and the board exports (HTML/PDF/PPTX/zip) or hands off with "Send to Claude Code Web" / "Send to local coding agent." Figma Make anchors a comment to an element and "captures a screenshot of the element's current state and attaches it to your comment" — the closest thing to a *state-anchored* comment on this page — and sorts threads into "Current version" and "Other versions" as the app changes.

**When to reach for it.** Direction-setting on generated boards (Claude Design) and structured feedback on a Make app before the bundle goes to code (Figma Make).

**Install/Setup.** None; org-scoped sharing in both. Figma Make comments need a full seat on a paid plan.

**Caveats.** Claude Design has a documented bug — "Inline comments occasionally don't appear on the page" — with the workaround to "paste the feedback directly into the chat instead." Figma Make: "While in comment mode, you currently can't interact with the app," only the latest version accepts comments, published-app visitors cannot comment, and the element screenshot "may not match what you see in the editor." v0 and Bolt document no commenting at all — deploy their output and use pick 1 or 2.

## Annotation-to-agent tools

### 5. Agentation — benjitaylor/agentation

[github.com/benjitaylor/agentation](https://github.com/benjitaylor/agentation) · ~4.6k stars · last push June 2026 · PolyForm Shield 1.0.0

Click-to-annotate for React apps on localhost, emitting markdown an agent can `grep` against. "Instead of describing 'the blue button in the sidebar,' you give the agent `.sidebar > button.primary` and your feedback."

**How it works.** A `<Agentation />` component renders a toolbar; click any element (or select text, drag-select several, or drag an empty area) and add a note. Output carries selectors, positions, computed styles, source-file paths, and the React component tree. **Animation pause** freezes CSS/JS/video so a mid-transition state can be annotated — the only tool here that solves state capture directly. The site documents an MCP integration and an annotation-format schema; the README is the copy-markdown flow.

**When to reach for it.** Design engineers reviewing their own or a teammate's running branch and handing fixes to Claude Code or Cursor.

**Install/Setup.** `npm install agentation -D`, mount `<Agentation />` next to your app root. React 18+, desktop browsers only.

**Caveats.** React only, localhost/dev only; not a reviewer surface for stakeholders. License is PolyForm Shield (free for internal use; commercial redistribution needs a license). Three months since the last push at curation time — healthy, not hot.

### 6. Casso

[usecasso.app](https://usecasso.app/) · $29 one-time · Mac and Windows

Numbered-box screen annotation for any app or browser, pasted straight into an agent. "Draw numbered boxes on your screen, annotate what to fix, and send to Claude Code, Cursor, Grok, or any agent that accepts images."

**How it works.** Overlay, draw boxes (auto-numbered `[1] [2] [3]`), type a note per box, confirm. It produces a "full screenshot, per-box crops, and an annotated composite" plus a prompt on the clipboard; with accessibility permission it auto-pastes into the terminal. "Annotations stay local — never uploaded."

**When to reach for it.** Static mockups, Storybook, native apps, or any page you cannot mount a React component in. The numbering is a deliberate hedge against vision models misreading hand-drawn arrows — copy that habit even when you annotate by hand.

**Install/Setup.** Download from the site; 7-day trial, no card.

**Caveats.** Image-only — no selectors, so the agent still has to find the code. Closed source, single-developer product.

### 7. MarkuprPlus — hashfunction/MarkuprPlus

[github.com/hashfunction/MarkuprPlus](https://github.com/hashfunction/MarkuprPlus) · 62 stars · v3.1.2, 1 Sep 2026 · MIT

Narrated screen recording → "one annotated screenshot per mark." Record a window, talk through the problem, Cmd-drag a circle while it happens; each stroke becomes its own finding (`MX-001`…) with its own frame, transcript slice, and timestamp.

**How it works.** Menu-bar app (macOS/Windows) with on-device Whisper transcription; the recorder locks to one window and excludes its own UI from capture. Ships an MCP server (`npx --yes --package markuprplus markuprplus-mcp`) with `capture_screenshot`, `capture_with_voice`, `start_recording` / `stop_recording`, `analyze_video`, and `push_to_github` / `push_to_linear` to file issues from a report.

**When to reach for it.** Interaction and flow bugs that a single screenshot cannot show, when you want the agent to receive the findings without you transcribing them.

**Install/Setup.** Release download from the repo; add the MCP block above to `~/.claude/settings.json` or `.mcp.json`.

**Caveats.** Very small community (62 stars) and fast-moving (two releases in two days at curation) — expect rough edges. Local-first is a feature, but the tracker push means reviewing what goes out.

## Rebuilding the overview

### 8. shot-scraper multi + ImageMagick montage — simonw/shot-scraper

[shot-scraper.datasette.io/multi](https://shot-scraper.datasette.io/en/stable/multi.html) · ~2.6k stars · last push July 2026 · Apache-2.0

The lowest-friction way to get the "every screen at once" sheet back from a running app: a YAML list of shots, one CLI call, then tile the output.

**How it works.** Each YAML entry takes `url`, `output`, `width`/`height`, `wait`/`wait_for`, `selector`(s), `padding`, and `javascript` to open a state before capture; a `server:` entry boots a local server for the run. `montage *.png -tile 4x -label '%t'` turns the folder into one labeled sheet. [Recipe A](#recipe-a--contact-sheet-on-pr--authored-here) wires it to `gh pr create`.

**When to reach for it.** Any hosted or local prototype without Storybook; the state list in the YAML is the review checklist worth owning.

**Install/Setup.** `pip install shot-scraper && shot-scraper install` (downloads Chromium); `brew install imagemagick` for `montage`.

**Caveats.** Which states get captured is a human decision — coverage gaps hide. Playwright's own API does the same in code if you would rather keep it in TypeScript.

### 9. storycap — reg-viz/storycap

[github.com/reg-viz/storycap](https://github.com/reg-viz/storycap) · 755 stars · MIT · last release v5.0.1 (Sep 2024), repo pushed Sep 2026

Screenshots every Storybook story — the component-level equivalent of the contact sheet, where "one story per state" is already the convention.

**How it works.** Simple mode needs zero config: `npx storycap http://localhost:6006`. Managed mode adds a `withScreenshot` decorator for per-story viewports, delays, and variants. `--serverCmd` boots Storybook for you; `--viewport 375x812 1440x900` captures both; `--shard` splits across CI machines.

**When to reach for it.** Component libraries and any prototype whose states are enumerated as stories; drop the output folder in as a CI artifact and review it in the PR.

**Install/Setup.** `npm i -D storycap puppeteer`.

**Caveats.** Tested against Storybook 7 and 8 only — check before relying on it with 9+. Puppeteer-based, so it is a separate browser from your Playwright setup. It is an image generator, not a review surface; pair with PR comments or Chromatic if you have it.

### 10. app-screenshots skill (on agent-browser) — alexanderop/app-screenshots

[github.com/alexanderop/app-screenshots](https://github.com/alexanderop/app-screenshots) · 20 stars · MIT · built on [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) (~41.8k stars, Apache-2.0, active daily)

A Claude Code skill that discovers pages from the site's navigation and produces a markdown doc of annotated screenshots — boxes around regions, circles and arrows on controls — for a local dev server or a live URL.

**How it works.** The skill file (`skill.md`, lowercase) walks the agent through: detect or start the dev server, `agent-browser screenshot --annotate` to survey interactive elements with numbered refs, snapshot the nav to enumerate pages, confirm the page list with you, then per page validate selectors and inject SVG annotations via `references/annotate.js`. agent-browser itself is a Rust CLI with `snapshot`, `find`, `eval`, `diff screenshot --baseline`, and viewport/device emulation.

**When to reach for it.** When you want the *agent* to build the overview and the reviewer to read a document rather than a folder — a review-request pack in one prompt ("Screenshot my app's checkout flow").

**Install/Setup.** `npm i -g agent-browser && agent-browser install`, then `npx skills add alexanderop/app-screenshots` (or clone into `.claude/skills/`).

**Caveats.** Tiny repo (20 stars, last push March 2026) — the value is the workflow, and agent-browser carries the maintenance load. Discovery is nav-based; SPA routes not linked from the nav need the grep step it suggests.

### 11. Figma capture of running code — Chrome extension and Claude Code → Figma

[Turn webpages into editable design layers](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-webpages-into-editable-design-layers) · [Claude Code to Figma (Feb 2026)](https://www.figma.com/blog/introducing-claude-code-to-figma/)

Rebuild the Figma canvas *from* the code prototype so reviewers get the surface they already know — comments, pins, and all.

**How it works.** The Chrome extension captures a page or section as editable layers and binds existing variables by matching "the variable name from the webpage's extracted CSS" — so "capture from your dev server URL if variable names don't match" production's minified ones. The Claude Code → Figma integration captures "a real, functioning UI from a browser — in production, staging, or localhost" and, "for flows, you can even capture multiple screens in a single session, preserving sequence and context"; each screen lands as an editable frame so teammates "can annotate what's working, call out what's unclear." The Figma MCP side of this is covered in [mcp-servers.md](mcp-servers.md).

**When to reach for it.** Stakeholder reviews where the reviewers live in Figma, and flow critiques where sequence matters more than interactivity.

**Install/Setup.** Extension: install from the Chrome Web Store; "Available on all plans." Claude Code capture: the official Figma MCP server configured in Claude Code.

**Caveats.** "No component and styles mapping yet" — captures are plain layers; "complex scroll-driven or canvas-rendered sites may capture imperfectly." The capture is a copy: decide who edits it and how Figma annotations get back to the code owner.

## Critique formats for text-only review

### 12. Conventional Comments

[conventionalcomments.org](https://conventionalcomments.org/)

The labeled-comment convention that makes text feedback triageable and machine-parseable: `<label> [decorations]: <subject>` with labels **praise · nitpick · suggestion · issue · todo · question · thought · chore · note · typo · polish · quibble** and decorations **(blocking) · (non-blocking) · (if-minor)**.

**How it works.** The label is the pin color; the decoration is the severity. `issue (blocking): error copy is clipped at 375px` can be grepped, counted, and routed; "the tone dramatically changes" because praise gets its own label. It composes with OneRedOak's `[Blocker]/[High-Priority]/[Medium-Priority]/[Nitpick]` triage from [subagents-and-commands.md](subagents-and-commands.md): triage word first, then label.

**When to reach for it.** Every PR review thread, artifact thread, and preview comment on this page; put it in CLAUDE.md so agent-written critiques use it too ([rules.md](rules.md)).

**Install/Setup.** None — a convention. The critique-response template below bakes it in.

**Caveats.** Engineering-native; designers need the one-paragraph explanation once. Over-labeling trivial remarks is its own noise — reserve decorations for things that actually gate.

### 13. Crit protocols: NN/g cheat sheet, GDS rules, Microsoft async reviews

[NN/g UX Critique Cheat Sheet (PDF)](https://media.nngroup.com/media/articles/attachments/NNg_UXCritiqueCheatsheet.pdf) · [GDS: using design crits](https://designnotes.blog.gov.uk/2017/11/27/using-design-crits-to-improve-collaboration/) · [Microsoft async design reviews](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/async-design-reviews/)

Three short, verified sources that together give a crit its rules — the part the tools above do not supply.

**How it works.** NN/g: "attach designs to the agenda" so people review beforehand; "each question or feedback should be tied back to a persona, scenario, use case or goal"; "direct the feedback towards the work, not the designer"; afterwards sort feedback into *To do / To persuade / To clarify*. GDS: presenters "specify feedback needs upfront" and "always have something to point to"; "I don't like it" and "that will never work" are out of bounds; someone other than the presenter takes notes. Microsoft: run the review as a PR on a markdown doc with named reviewers you asked personally, and "after two round trips of question/response, resort to synchronous communication."

**When to reach for it.** Setting up the ritual for a team new to async review; the review-request template below is these three sources compressed.

**Install/Setup.** None.

**Caveats.** Both NN/g and GDS assume a facilitator; async text has none, which is why the request template forces the "feedback wanted / not wanted" fields. GDS's guidance is from 2017 — the rules hold, the tooling references do not.

## Feedback → agent loops

### 14. GitHub review threads to fixes: `@claude` Action + address-review skill

[Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) · [corylanou/address-review.md (gist)](https://gist.github.com/corylanou/a381082d38b693792eed659bcdab09d0) (updated July 2026)

Two ends of the same loop for PR-hosted feedback — review comments on a storycap sheet, on a Mermaid diagram's source lines, or synced in from Netlify.

**How it works.** The Action runs in interactive mode when `@claude` appears "in an issue or pull request comment, in a pull request review, or in the body or title of a newly opened issue" and can implement changes and push commits; `/install-github-app` sets it up. The gist is a Claude Code command that fetches unresolved review threads via GraphQL (`reviewThreads … isResolved`), categorizes each (code change / docs / question / *disagree — ask the user first*), fixes, replies explaining what changed and why, and resolves the thread.

**When to reach for it.** Any time the durable record of design feedback is a PR thread. The gist's "ask before disagreeing" step is the guardrail that keeps an agent from resolving a designer's intent away.

**Install/Setup.** Action: `/install-github-app` in the repo. Skill: save the gist as `.claude/commands/address-review.md`; needs `gh` authenticated.

**Caveats.** The gist pins an older model string and requests re-review from a specific bot — edit both. The Action needs write access for the commenting user; on public repos fork PRs do not get secrets.

### Using AI critique in this loop (guidance, not a pick)

Two verified findings shape how to use `/visual-critique:critique-screen` or the design-review subagent as a *pre-review* pass. [UXBench (arXiv 2606.16262, June 2026)](https://arxiv.org/abs/2606.16262) defines critique quality as "whether a fixed downstream repair agent can improve the interface based on the critique," forces "coverage-gated browser exploration" before any report, and scores seven rubric dimensions — the rubric shape to copy: *evidence first, then localized findings, then impact*. [Catching UX Flaws in Code (arXiv 2512.04262)](https://arxiv.org/abs/2512.04262) found GPT-4o applying Nielsen's heuristics reached "Cohen's Kappa of 0.50 and an exact agreement of 84%" on *detecting* issues but "exact agreement was just 56%, and Krippendorff's Alpha was near zero" on *severity*. So: run the AI pass against the live prototype, make it emit the critique-response template, treat its severities as proposals, and use it for coverage (states, a11y, copy consistency), never for triage on its own.

---

## Hook recipes

Same format and semantics as [hooks.md](hooks.md). Both are *authored here*; the shell control flow was exercised against stubbed `vercel`, `shot-scraper`, and `montage` binaries, and anything not run for real is marked.

### Recipe A — Contact sheet on PR  ·  *authored here*

Protects: **the overview** — every reviewed route and state visible at once, attached to the PR, so feedback does not collapse into "the screen I happened to land on."

Route list — `.claude/review/routes.txt`, one `path|width|javascript` per line (the JS opens a state before capture):

```text
/|1440|
/checkout/address|375|document.querySelector("#postcode")?.focus()
/checkout/payment|1440|document.querySelector("[data-test=pay]")?.click()
```

Script — `.claude/hooks/contact-sheet.sh`, `chmod +x`:

```bash
#!/bin/bash
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')
echo "$cmd" | grep -q 'gh pr create' || exit 0
routes=".claude/review/routes.txt"; [ -f "$routes" ] || exit 0
command -v shot-scraper >/dev/null && command -v montage >/dev/null \
  || { echo "contact-sheet: shot-scraper or ImageMagick missing; skipping" >&2; exit 0; }
base="${PREVIEW_URL:-http://localhost:3000}"
out=".claude/review/sheet"; rm -rf "$out"; mkdir -p "$out"
yaml="$out/shots.yml"; : > "$yaml"
while IFS='|' read -r path width js; do
  [ -z "$path" ] && continue
  name=$(echo "${path#/}" | tr '/?=&' '____'); w="${width:-1440}"
  { echo "- url: ${base}${path}"; echo "  output: ${out}/${name:-home}-${w}.png"
    echo "  width: ${w}"; echo "  wait: 1500"
    [ -n "$js" ] && { echo "  javascript: |"; echo "    $js"; }; } >> "$yaml"
done < "$routes"
shot-scraper multi "$yaml" --fail >/dev/null 2>&1 || echo "contact-sheet: some shots failed; see $yaml" >&2
montage "$out"/*.png -tile 4x -geometry 360x+8+8 -label '%t' -pointsize 14 -background '#f4f4f4' "$out/contact-sheet.png"
echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"additionalContext\":\"Contact sheet of every reviewed route/state saved to $out/contact-sheet.png. Read it, then link it from the PR body under 'Overview sheet'.\"}}"
exit 0
```

How it works: on `gh pr create`, the routes file becomes a `shot-scraper multi` YAML (the `javascript` key opens the state — focus a field, click a tab — before the shot), the PNGs are tiled with `montage` into one labeled sheet, and `additionalContext` tells Claude to `Read` it and reference it from the PR body. Set `PREVIEW_URL` to shoot the deployed preview instead of localhost. To get the image *into* the PR, commit it under `docs/review/` or run the same script in CI behind `actions/upload-artifact` — `gh` cannot attach local files to a PR comment. **Storybook variant:** replace the loop with `npx storycap http://localhost:6006 -o "$out" --flat --viewport 375x812 1440x900` and keep the `montage` line. *Tested:* matching, YAML generation, and the JSON output against stubbed binaries. *Untested:* real `shot-scraper` and `montage` runs — check label rendering and `--fail` behavior in your stack. Wiring is shared with Recipe B below.

### Recipe B — Unresolved preview-comments gate  ·  *authored here*

Protects: **the review record** — no PR is opened or merged while reviewers' Vercel preview threads on this branch are still open; the open threads are handed to Claude instead.

Script — `.claude/hooks/preview-comments-gate.sh`, `chmod +x`:

```bash
#!/bin/bash
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')
echo "$cmd" | grep -qE 'gh pr (create|merge)' || exit 0
command -v vercel >/dev/null || exit 0                                   # no CLI: never block
out=$(vercel comments --json --status unresolved 2>/dev/null) || exit 0  # not linked / offline: never block
n=$(echo "$out" | jq '.threads | length')
[ "${n:-0}" -eq 0 ] && exit 0
list=$(echo "$out" | jq -r '.threads[] | "- \(.id) · \(.pagePath // .page // "?") · \(.excerpt // (.messages[0].body // "") | .[0:120])"')
reason="$n unresolved Vercel preview comment thread(s) on this branch. Reply or resolve first (vercel comments inspect <id> --context; vercel comments resolve <id> -m '...'):\n$list"
jq -n --arg r "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
exit 0
```

Wiring for both recipes (one `PreToolUse` matcher, two hooks):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/preview-comments-gate.sh", "timeout": 30 },
          { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/contact-sheet.sh", "timeout": 120, "statusMessage": "Building contact sheet..." }
        ]
      }
    ]
  }
}
```

How it works: `vercel comments` scopes to the linked project and infers the current branch, so `--json --status unresolved` is exactly "what reviewers still want on this PR." A non-empty list returns `permissionDecision: "deny"` with the threads in the reason — Claude sees them and can `inspect --context`, fix, and `resolve -m 'Fixed in <sha>'` before retrying. Fail-open on purpose: no CLI, no linked project, or no network never blocks a PR. For an *advisory* variant, swap the `deny` JSON for `additionalContext` and let the required Vercel PR check be the hard gate. *Tested:* matching, jq extraction, and the deny JSON against a stubbed `vercel` returning the documented `threads` array. *Untested:* live `vercel comments --json` — the docs guarantee `threads[].id` but not the page-path or excerpt field names, so run `vercel comments --json | jq '.threads[0]'` once and adjust the `list` line. Requires Vercel CLI 59.3.0+.

---

## Templates

### Prototype review request

```markdown
## Review request: <feature / flow name>
**Link:** <preview URL or artifact URL> (version/commit: <sha or artifact version>)
**Overview sheet:** <link to contact sheet / Figma capture / storycap>
**Flows to test (in order):**
1. <Flow A>: start at <route>, do <steps>, expect <outcome>
2. <Flow B>: …
**States covered:** default · loading · empty · error · <n> breakpoints · keyboard/screen reader
**States NOT covered (known gaps):** <list>
**Feedback wanted:** <e.g., does the step order make sense? is the error copy clear?>
**Feedback NOT wanted right now:** <e.g., visual polish, colors>
**How to comment:** <Vercel toolbar / artifact threads / recording> — one problem per thread, use the response format
**Deadline / next sync:** <date>; after two round trips we switch to a call
```

### Structured critique response

```markdown
**[Blocker | High | Medium | Nit]** <label: issue | suggestion | question | praise> <(blocking | non-blocking)>
**Where:** <route or screen> · <viewport> · <state / step / timestamp> · <selector or element name>
**What I observed:** <one or two sentences, factual>
**Why it matters (impact):** <who is affected, which goal/persona/heuristic, how often>
**Evidence:** <screenshot / recording link / console output>
**Not proposing a solution** — unless asked; if I have one: <optional, clearly marked>
```

The **Where** line is the anchor problem made explicit: a flow comment names a step sequence (`Checkout › Address › Payment` or a Mermaid node ID), a screen comment names route + viewport, an interaction comment needs a timestamp or a state description, a copy comment quotes the string.

---

## Evaluated but not selected

- **[Chromatic UI Review](https://www.chromatic.com/pricing)** — the best component-level review surface (per-snapshot threads, PR status check), but as of September 2026 UI Review is listed only on the Enterprise tier; Free/Starter/Pro exclude it. Use storycap + PR comments unless you already pay for it.
- **[Lovable preview toolbar](https://docs.lovable.dev/features/preview-toolbar)** — genuinely good (pinned threads, "send to Lovable" as a task), verified live, but it is a feature of one AI builder rather than a tool you can bring to other prototypes; covered in the playbook row.
- **[Marker.io](https://marker.io/pricing)**, **[BugHerd](https://bugherd.com/pricing)**, **[Ruttl](https://ruttl.com/pricing)**, **[Userback](https://userback.io/pricing)**, **[Usersnap](https://usersnap.com/pricing)** — the paid "annotate any URL" overlays. They earn their keep only for external guests without accounts, Jira-heavy teams, or Cloudflare Pages (no native commenting); Vercel and Netlify cover the rest for free. Ruttl's free tier and Userback's MCP connectors are the two worth a look if you need one.
- **[Pastel](https://usepastel.com/)** and **[Markup.io](https://www.markup.io/pricing)** — image/PDF/video annotation for guests; Pastel's pricing page returned 404 during research, and neither adds anything over FigJam for teams that have Figma.
- **[Miro AI diagrams](https://miro.com/ai/diagram-ai/)**, **FigJam AI**, **[Whimsical](https://whimsical.com/ai)** — fine canvases with board comments, but Mermaid/D2 reviewed in the PR diff keeps the flow decision next to the code; the boards are inputs, not review tooling.
- **[Attention Insight](https://attentioninsight.com/)** — predictive attention heatmaps (€119/month) are a hierarchy first pass for landing pages, not flow critique.
- **[html.to.design](https://html.to.design/docs/bulk-import-url-list/)** — bulk URL-to-Figma import is PRO-only and now overlapped by Figma's own Chrome extension (all plans) and Claude Code → Figma capture.
- **Loom**, **Relume / UX Pilot / Uizard** — a video tool and three image generators respectively, none of them review tooling; the playbook covers them as "recording with timestamps" and "static generated mockup."
- **[Google eng-practices comment guide](https://google.github.io/eng-practices/review/reviewer/comments.html)** and **I like / I wish / What if** — Conventional Comments subsumes the first; the second is a workshop prompt, not a review format.

---

Grounding research, with vendor pricing tables, the third-party overlay comparison, team-practice accounts, and the full source list: [../docs/research/design-sdlc/02-feedback-on-code-prototypes-and-flows.md](../docs/research/design-sdlc/02-feedback-on-code-prototypes-and-flows.md).
