# Curated Agent Skills for Design Work

**Agent skills** are portable folders containing a `SKILL.md` file — YAML frontmatter (`name` + `description`) followed by markdown instructions, optionally bundled with scripts and reference files. The agent loads them on demand via progressive disclosure: only the one-line description sits in context until the task matches, then the full instructions load. Anthropic published the format as an open spec, and it now works across Claude Code, Claude.ai, Codex, Cursor, Gemini CLI, and dozens of other agents.

How skills fit against the other primitives: **rules files** (CLAUDE.md / AGENTS.md) are always-on constitutions the agent can't opt out of, while skills are model-triggered expertise loaded only when relevant. **Hooks** are deterministic shell commands bound to lifecycle events — enforcement, not judgment. **Slash commands** are user-invoked prompt macros; a skill is the model deciding it needs a playbook, a command is you demanding one.

**Installing:** In Claude Code, the cleanest path is the plugin marketplace — `/plugin marketplace add <owner>/<repo>` then `/plugin install <name>` (most picks below support this). Manual install: copy a skill folder into `~/.claude/skills/` (personal) or `.claude/skills/` (project). On Claude.ai: Settings → Capabilities → Skills → upload a zipped skill folder. Cross-agent registries like [skills.sh](https://skills.sh) install SKILL.md packages into 40+ agents.

*Curation date: August 2026. Every repo below was verified live (existence, stars, last-commit recency) and the top candidates' SKILL.md contents were read and judged. Stars are as of verification.*

---

## Process map

| Design process stage | Recommended skills |
|---|---|
| **Discovery / Research** | designer-skills: `design-research` plugin (interview scripts, usability test plans, JTBD, synthesis) |
| **IA & Strategy** | designer-skills: `ux-strategy` plugin (IA, competitive analysis, experience maps, service blueprints) |
| **Design System** | designer-skills: `design-systems` plugin · Figma `figma-generate-library` + `figma-code-connect` · Anthropic `brand-guidelines` (as a fork-template) |
| **UI Generation** | Anthropic `frontend-design` · Figma `figma-generate-design` · claude-design-skill · ui-design-brain · MengTo Skills · Anthropic `web-artifacts-builder` |
| **Motion / IxD** | claudedesignskills (GSAP / Three.js / Rive / Lottie) · MengTo Skills motion recipes · designer-skills `interaction-design` plugin |
| **QA & Review** | Anthropic `webapp-testing` · designer-skills `heuristic-evaluation` + `design-qa-checklist` |
| **Handoff / Ops** | designer-skills: `design-ops` plugin (`handoff-spec`, `design-critique`) · Figma `figma-code-connect` |
| **Brand & Visual Assets** | Anthropic `canvas-design` · Anthropic `theme-factory` |

---

## The picks

### 1. Anthropic frontend-design ([claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/frontend-design))

The official "anti-AI-slop" skill, with over a million installs — the single highest-leverage skill for anyone generating UI with an agent. It forces the agent to act as an opinionated design lead: establish aesthetic direction *before* writing code, rather than defaulting to the purple-gradient template look.

**How it works:** The SKILL.md prescribes a two-pass process — first brainstorm a compact design plan (color, type, layout, one "signature element"), then critique that plan against generic defaults before building. Instruction writing is genuinely strong and specific: "Spend your boldness in one place… keep everything around it quiet," ground choices in the subject's own materials and vernacular, take one justified visual risk per project, treat copy as design material.

**When to reach for it:** Any UI Generation task — landing pages, dashboards, components — especially first drafts where the agent would otherwise produce the median AI aesthetic.

**Install:** `/plugin install frontend-design@claude-plugins-official` (a copy also ships in [anthropics/skills](https://github.com/anthropics/skills), 166k★, active).

**Caveats:** It's direction, not a design system — pair with rules/tokens for brand-constrained work. Its taste is opinionated (editorial, restrained); if you want maximalist output you'll fight it.

### 2. Figma official skills ([figma/mcp-server-guide](https://github.com/figma/mcp-server-guide/tree/main/skills)) — `figma-use`, `figma-generate-design`, `figma-generate-library`, `figma-code-connect`

Figma's first-party skills (1.8k★, pushed the day of this review) teach agents to act *on the Figma canvas* through the Figma MCP server — the only picks here that make an agent a competent Figma operator rather than a code generator. `figma-generate-design` builds new screens from your existing component library; `figma-generate-library` generates Figma components *from a codebase*; `figma-code-connect` maps components to code.

**How it works:** These are dense operational SKILL.mds, not vibes. `figma-generate-design` mandates a six-step workflow — inspect Code Connect mappings and existing screens, collect component keys/variables/styles, create the wrapper frame first, build sections incrementally, validate — with hard gates like "Never hardcode hex colors or pixel spacing when a design system variable exists" and explicit API patterns in bundled reference docs.

**When to reach for it:** Design System and UI Generation stages whenever Figma is the canvas — generating on-system screens, syncing a design system when code has outpaced design, or wiring design-to-code handoff.

**Install:** Ships automatically with the Figma plugin for Claude Code (`/plugin install figma@claude-plugins-official`) or the Figma MCP server; requires the MCP connection to actually do anything. Figma also hosts a community skills page at [figma.com/community/skills](https://www.figma.com/community/skills).

**Caveats:** Useless without the Figma MCP server connected (and some features assume paid Figma seats). Heavy skills — the workflows are long and token-hungry.

### 3. designer-skills: design-research + ux-strategy plugins ([Owl-Listener/designer-skills](https://github.com/owl-listener/designer-skills))

Marie Claire Dean's collection (2.0k★, active, MIT) is the landmark designer-authored skill set — 97 skills and 30 commands across 9 plugins, written by a designer encoding real process rather than an engineer guessing at it. These two plugins cover the front of the process: `design-research` (12 skills: interview scripts, usability test plans, JTBD, card-sort analysis, `summarize-interview`, personas, journey maps) and `ux-strategy` (12 skills: IA, competitive analysis, experience mapping, content strategy, service blueprints), plus commands like `/discover` and `/strategize`.

**How it works:** Each skill is a structured method playbook — prescriptive steps, output templates, and severity/quality criteria — that turns "help me plan a usability test" into a consistent, reviewable artifact instead of a freeform essay.

**When to reach for it:** Discovery/Research and IA & Strategy — kicking off a project, structuring research, synthesizing interview data, or pressure-testing a product's information architecture.

**Install:** `/plugin marketplace add Owl-Listener/designer-skills`, then install the individual plugins you want from the Discover tab (don't install all 9 — see caveats).

**Caveats:** Honest read: instruction quality is good-but-not-elite — solid method structure and templates, with recommendations that sometimes stay high-level. The methods still assume *you* bring real user data; the skills structure the work, they don't validate it. Installing all 9 plugins floods the skill-triggering surface — pick 2–4 plugins.

### 4. designer-skills: design-systems plugin ([Owl-Listener/designer-skills](https://github.com/owl-listener/designer-skills/tree/main/design-systems))

The strongest systems-thinking plugin in Dean's collection: 11 skills covering `design-token` (three-tier global → alias → component architecture, "Never reference raw values in components; use semantic alias tokens"), `accessibility-audit`, `component-spec`, `motion-system`, `theming-system`, `icon-system`, `naming-convention`, and `design-system-governance`.

**How it works:** Method playbooks that make the agent produce properly-architected system artifacts — token taxonomies with naming conventions, component specs with all states documented, governance models — rather than flat lists of hex values.

**When to reach for it:** Design System stage — founding or auditing a token architecture, writing component specifications, or defining governance for a growing system.

**Install:** Same marketplace as above; install `design-systems` individually.

**Caveats:** Teaches architecture patterns, not your specific system — pair with the Figma skills or a design-token MCP for ground truth. Some overlap with `figma-generate-library` when Figma is in the loop.

### 5. designer-skills: prototyping-testing + design-ops plugins ([Owl-Listener/designer-skills](https://github.com/owl-listener/designer-skills))

The back-of-process pair. `prototyping-testing` includes the standout `heuristic-evaluation` skill — a seven-step Nielsen-heuristics walkthrough (new-user pass, experienced-user pass, task flows) with a 0–4 severity scale and a structured issue template ("Don't just find problems — suggest solutions"). `design-ops` covers `handoff-spec` (visual specs, interactions, content rules, assets, edge cases — "Include all states, not just the happy path"), `design-critique`, `design-qa-checklist`, and `design-debt-audit`, plus the `/handoff` command.

**How it works:** Converts fuzzy rituals (crit, QA, handoff) into structured documents with required fields — the handoff spec, for instance, demands token references over raw values, state definitions, transition durations, character limits, and localization notes.

**When to reach for it:** QA & Review (heuristic eval before user testing; structured crit) and Handoff/Ops (spec generation for engineers, design-debt triage).

**Install:** Same marketplace; install `prototyping-testing` and/or `design-ops`.

**Caveats:** Heuristic evaluation on code the same model wrote has a self-review objectivity problem — most useful on interfaces the agent *didn't* build, or paired with screenshots via `webapp-testing`.

### 6. MengTo/Skills — web-design + ui collections ([MengTo/Skills](https://github.com/MengTo/Skills))

Meng To's (Design+Code) library — 4.1k★, updated within days of this review — is the best *recipe-style* collection: 118 skills, with the web-design folder alone containing 143 named aesthetic and technique recipes (`cinematic-gsap-lenis-motion-system`, `progressive-blur`, `liquid-metal-border`, `editorial-portfolio-chapters`, `mesh-gradient-dark-blue-clean`, `glass-dark-ui`…). Where Anthropic's frontend-design teaches judgment, this hands you a shelf of specific, named looks.

**How it works:** Each skill is a self-contained playbook with explicit triggers, defaults, and guardrails; many bundle demos and reference code. The flagship `build-awwwards-quality-sites` prescribes a seven-phase workflow (art direction → asset provenance → hero composition → GSAP motion choreography → selective Three.js → validation → accessibility) with sharp prohibitions: exactly one smooth-scroll engine, no fake testimonials, reduced-motion testing mandated, provenance documented for every asset.

**When to reach for it:** UI Generation and Motion/IxD when you want a *specific* high-craft look or effect — portfolio sites, marketing pages, scroll-driven storytelling — rather than open-ended direction.

**Install:** Manual, by design — clone the repo and copy the skill folders you need into `.claude/skills/` (or load a SKILL.md into any agent's context). Cross-agent: written for Codex, Claude Code, and Cursor alike.

**Caveats:** 143 recipes is a browsing library, not an install-everything pack — copying the whole folder in will wreck skill triggering. Aesthetics skew toward the Awwwards/agency-site genre; less useful for enterprise product UI.

### 7. claude-design-skill ([jiji262/claude-design-skill](https://github.com/jiji262/claude-design-skill))

A portable skill (168★, active) adapted from Claude.ai's internal "Design" system prompt — it turns any Claude into a disciplined HTML-artifact designer for decks, landing pages, posters, and prototypes. Small repo, but the instruction writing is among the most specific evaluated.

**How it works:** Enforces a workflow: fact-check the product first (WebSearch before assuming), gather brand/design context, declare a visual system up front (type scale, colors, layout rhythm), build 3+ variations from conservative to novel, verify in a real browser. Includes a "Design Direction Advisor" mode for vague briefs and a Core Asset Protocol that ranks real assets above styling ("Logo / product shots / UI screenshots are first-class citizens. Colors and fonts are auxiliary."). Names forbidden patterns (aggressive gradients, emoji bullets), sets minimum sizes (24px slide text, 44px touch targets), bans lorem ipsum.

**When to reach for it:** UI Generation of standalone HTML deliverables — pitch decks, landing-page mockups, posters — especially on Claude.ai or Codex where the frontend-design plugin isn't installed.

**Install:** Manual — copy the skill folder into `~/.claude/skills/` or upload to Claude.ai.

**Caveats:** Significant overlap with Anthropic's frontend-design; running both invites conflicting direction. Provenance is "adapted from a leaked/internal prompt," so expect drift from whatever Claude.ai currently ships.

### 8. ui-design-brain ([carmahhawwari/ui-design-brain](https://github.com/carmahhawwari/ui-design-brain))

A component-knowledge skill (854★, active): best practices, layout patterns, and design-system conventions for 60+ interface components (accordion, alert, breadcrumbs, data table…), so the agent generates production-grade component behavior instead of generic markup.

**How it works:** Two files do the work — `SKILL.md` (philosophy + workflow + five selectable design directions: Modern SaaS, Minimal, Enterprise, Creative, Data Dashboard) and a large `components.md` reference the agent consults per component. Activation is automatic when UI is requested; no explicit invocation needed.

**When to reach for it:** UI Generation of *product* UI — admin panels, dashboards, forms — where correctness of component conventions (states, keyboard behavior, hierarchy) matters more than visual flair. Complements frontend-design (aesthetic direction) with component-level convention knowledge.

**Install:** Written for Cursor (`~/.cursor/skills/ui-design-brain`), but it's standard SKILL.md — drops into `.claude/skills/` unchanged.

**Caveats:** The big `components.md` is a token-heavy load when consulted. Conventions are framework-agnostic prose, not code-verified against a real component library.

### 9. Anthropic canvas-design ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/canvas-design))

Anthropic's visual-art skill: produces poster/print-grade compositions as PNG or PDF, with a philosophy-first process. One of the most distinctive skills in the official repo (166k★, active).

**How it works:** Two-stage mechanism — first write a design-philosophy manifesto (form, color, space, composition), then execute it as a pristine single- or multi-page artifact using bundled fonts in `./canvas-fonts`. Highly prescriptive: explicit prohibitions on copying existing artists, overlapping elements, amateur aesthetics; "Information lives in design, not paragraphs."

**When to reach for it:** Brand & Visual Assets — posters, key visuals, event graphics, editorial art — anywhere the deliverable is an image, not an interface.

**Install:** Ships in Claude.ai's built-in skills; for Claude Code, copy from anthropics/skills or install via its `.claude-plugin` marketplace.

**Caveats:** Output is code-rendered composition, not image-model generation — great for typographic/geometric work, wrong tool for photorealism. The manifesto step adds tokens and time.

### 10. Anthropic theme-factory ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/theme-factory))

A small, reliable theming skill: applies one of ten curated font + color themes (Ocean Depths, Modern Minimalist, Tech Innovation…) to slide decks and HTML artifacts, or generates a custom theme on request.

**How it works:** Shows a bundled theme-showcase PDF, asks the user to pick, gets explicit confirmation, then applies that theme's palette and font pairings consistently across the artifact — reading specs from a bundled themes directory. A human-in-the-loop mechanism, deliberately.

**When to reach for it:** Brand & Visual Assets / deck production — fast, coherent styling for presentations and one-off artifacts when no brand system exists.

**Install:** Built into Claude.ai; copy from anthropics/skills for Claude Code.

**Caveats:** Ten presets are tasteful but finite; this is a convenience skill, not a design system. Skip it when real brand guidelines exist.

### 11. Anthropic web-artifacts-builder ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/web-artifacts-builder))

The heavy-duty prototype skill: scaffolds a real React 18 + TypeScript + Tailwind + shadcn/ui project and compiles it into a single self-contained HTML file — turning "artifact" from a toy into a multi-component, stateful prototype.

**How it works:** Bundles two scripts: `init-artifact.sh` (sets up a configured Vite/Parcel React project with dependencies pre-installed) and `bundle-artifact.sh` (inlines everything into one shareable `bundle.html`). The SKILL.md scopes it explicitly: use for complex artifacts needing state, routing, or shadcn components — not simple single-file HTML.

**When to reach for it:** UI Generation / prototyping when a design needs to be *interactive and shareable* — clickable multi-screen prototypes, stakeholder demos — without standing up a repo.

**Install:** Built into Claude.ai; works in Claude Code from anthropics/skills (requires Node in the environment).

**Caveats:** Overkill for static comps (the skill itself says so). Build tooling means slower, heavier runs than plain HTML generation.

### 12. Anthropic webapp-testing ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing))

The "eyes" skill: Playwright-based toolkit for driving a local web app — screenshots, DOM inspection, console-log capture — so the agent can *see and verify* the UI it just built instead of declaring victory blind.

**How it works:** Bundles Python Playwright helpers, notably `with_server.py` for server lifecycle management. Prescribes a reconnaissance-then-action pattern: wait for `networkidle`, screenshot/inspect the rendered DOM, derive selectors from reality, then act — with a decision tree for static vs. dynamic apps, and guidance to invoke scripts via `--help` rather than reading their source into context.

**When to reach for it:** QA & Review — visual self-verification after UI changes, reproducing UI bugs, capturing evidence for design review. The essential complement to every generation skill above.

**Install:** From anthropics/skills; requires Python + Playwright installed locally.

**Caveats:** Screenshot-based checking catches layout breakage, not taste — pair with heuristic-evaluation or a design-review workflow for judgment. Playwright setup is a real dependency.

### 13. claudedesignskills — motion & 3D stack ([freshtechbro/claudedesignskills](https://github.com/freshtechbro/claudedesignskills))

A "design agency skillstack" (651★): 22 skills across GSAP, Three.js/React Three Fiber, Framer Motion, Rive, Lottie, Pixi.js, Locomotive Scroll, Babylon.js, and 3D authoring tools (Blender, Spline), packaged as a Claude Code plugin marketplace with bundles and 50+ slash commands.

**How it works:** Library-specific knowledge skills — each teaches idioms, setup patterns, and pitfalls for one motion/3D library (e.g., ScrollTrigger pinning/scrubbing patterns, React cleanup with `useGSAP`), so the agent writes idiomatic animation code instead of hallucinating APIs.

**When to reach for it:** Motion/IxD — scroll-driven storytelling, WebGL scenes, micro-interactions, Rive/Lottie integration. Install only the bundles for libraries you actually use.

**Install:** `/plugin marketplace add freshtechbro/claudedesignskills`, then `/plugin install core-3d-animation` (bundle) or individual plugins; zips also uploadable to Claude.ai.

**Caveats:** Last substantive push November 2025 — the stalest pick here. Library-reference content ages slowly, but verify against current GSAP/Three.js versions. Overlaps with MengTo's motion recipes: this teaches the *libraries*, MengTo packages finished *effects*.

### 14. Anthropic brand-guidelines ([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/brand-guidelines)) — as a template

Anthropic's own brand skill: applies their corporate palette (#141413 dark, #faf9f5 light, accent set) and type pairing (Poppins/Lora with fallbacks), including contrast-aware color selection. Selected not for its content — it's Anthropic-specific — but as the **canonical pattern for encoding your own brand as a skill**: fork it, swap the palette, fonts, and rules, and your brand becomes a triggerable capability in every agent your team runs.

**When to reach for it:** Design System stage, as the starting template for a first-party "our-brand" skill.

**Caveats:** Useless as-is unless you are Anthropic. It encodes visual identity only — no voice/tone (pair with a writing-guidelines skill if you fork it).

---

## Evaluated but not selected

- **[rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design)** (950★) — good DESIGN.md *prompt* library organized by aesthetic family, but prompts-to-paste, not SKILL.md-format skills; belongs in a prompts collection, not here.
- **[chiroro-jr/pencil-design-skill](https://github.com/chiroro-jr/pencil-design-skill)** — repo is archived; dead.
- **[rknall/claude-skills](https://github.com/rknall/claude-skills)** (svg-logo-designer) — 56★ personal collection, no updates since Oct 2025; the logo-designer concept is nice but this instance is personal-grade, not curation-grade.
- **[madebysan/claude-figma-skills](https://github.com/madebysan/claude-figma-skills)** — promising scope (design review, comments, token sync) but 2★ and unproven; re-check in six months.
- **[senlindesign/claude2figma](https://github.com/senlindesign/claude2figma)** — design-system enforcement layer for Claude+Figma; surfaced late in research, no demonstrated adoption yet; not evaluated in depth.
- **Owl-Listener's remaining plugins** (`ui-design`, `interaction-design`, `visual-critique`, `designer-toolkit`) — real but weaker value-per-token than the four plugin groups selected; the `ui-design` layout/color/typography content is largely superseded by frontend-design + ui-design-brain.
- **[OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows)** (design-review) — excellent, but it's a subagent + hooks + Playwright *workflow*, not a skill; belongs in the workflows/subagents file of this collection.
- **[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills), [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills), [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills)** — aggregator lists, useful for discovery but not skills themselves; heavy duplication and list-rot risk.
- **[skills.sh](https://skills.sh)** — registry/installer infrastructure, not a skill; covered in the install notes above.
- **Anthropic `algorithmic-art`, `slack-gif-creator`** ([anthropics/skills](https://github.com/anthropics/skills)) — fun, well-made, but marginal for professional design process; canvas-design covers the visual-art ground.
- **Shopify Polaris / Atlassian ADS agent skills** — the most advanced *enterprise* design-system skills programs, but ecosystem-locked (Shopify apps, Atlassian products) rather than generally installable; study them as case studies instead.
