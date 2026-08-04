# Agentic Tooling Primitives for Designers — The "Infrastructure" Layer

**Scope:** The primitives designers can use to define and execute AI workflows: agent skills, rules files, hooks, MCP servers, subagents and multi-agent patterns, slash commands, and the curated lists that map the ecosystem. This is the foundation layer everything else in this research series builds on — the mechanisms by which design judgment, process, and constraints become executable infrastructure.

## Table of Contents

1. [Agent "Skills" for Design Work](#1-agent-skills-for-design-work)
2. [Rules Files](#2-rules-files-claudemd-cursorrules-agentsmd-windsurf-rules-copilot-instructionsmd)
3. [Hooks and Automation](#3-hooks-and-automation)
4. [MCP Servers Relevant to Design](#4-mcp-servers-relevant-to-design)
5. [Subagents / Multi-Agent Patterns + Prompt Libraries](#5-subagents--multi-agent-patterns--prompt-libraries-for-design)
6. [Slash Commands / Custom Commands](#6-slash-commands--custom-commands-for-design-workflows)
7. [Notable Curated Lists](#7-notable-curated-lists-awesome--repos-for-ai-x-design-tooling)
8. [Cross-Cutting Themes for Deeper Research](#cross-cutting-themes-for-deeper-research)

---

## 1. Agent "Skills" for Design Work (Claude Code / Agent Skills format)

**What it is:** Skills are portable folders containing a `SKILL.md` markdown file (YAML frontmatter with `name` + `description`, then instructions, optionally bundled scripts/references). The agent loads them on demand via "progressive disclosure" — only the description sits in context until the skill is triggered. Anthropic published the format as an open spec ("Agent Skills"), and it now works across Claude Code, Claude.ai, Codex, Gemini CLI, and 40+ agents via community tooling.

**Why designers care:** Skills are the first agent primitive that packages *design judgment* — not code — as a reusable, versionable artifact. A designer who can write markdown can encode taste, process (heuristic evaluation, discovery research, handoff), and brand systems into something an agent executes repeatedly and consistently. It converts "prompting well" into infrastructure.

**Concrete examples:**

- **anthropics/skills** — Anthropic's first-party repo (~17 skills incl. design-relevant ones): `canvas-design` (visual art/posters as PNG/PDF), `artifacts-builder` (React + Tailwind + shadcn/ui artifacts), `theme-factory` (10 preset themes + custom theming), `frontend-design`, plus doc skills (pptx, pdf). https://github.com/anthropics/skills
- **Owl-Listener/designer-skills (Marie Claire Dean)** — the landmark designer-authored collection: 63+ skills (now 87) and 27 commands across 8 plugins covering research, UX strategy, design systems, UI, interaction, prototyping/testing, and design ops. Commands like `/discover`, `/strategize`, `/handoff`. MIT-licensed; built by a designer, not an engineer. https://github.com/owl-listener/designer-skills — origin story: https://marieclairedean.substack.com/p/i-built-63-design-skills-for-claude
- **Figma Skills for Claude Code** — Figma ships official skills (installed with the Figma plugin / MCP) that teach Claude to act on the Figma canvas: `/figma-use`, `/figma-generate-design`, `/figma-generate-library`, `/figma-code-connect`. Figma's own explainer: https://www.figma.com/resource-library/claude-skills-for-design/ ; walkthrough: https://uxplanet.org/figma-skills-for-claude-code-bb05a21984fd
- **jiji262/claude-design-skill** — portable skill adapted from Claude.ai's internal "Design" system prompt; turns any Claude into an expert designer of HTML artifacts (decks, landing pages, posters). https://github.com/jiji262/claude-design-skill
- **freshtechbro/claudedesignskills** — "design agency skillstack" for 3D/WebGL, GSAP animation, and interactive web, packaged as a Claude Code plugin marketplace. https://github.com/freshtechbro/claudedesignskills
- **rohitg00/awesome-claude-design** — 28+ production `DESIGN.md` prompts organized into 9 "aesthetic families," with remix recipes and an "anti-slop kit." https://github.com/rohitg00/awesome-claude-design
- **Skill marketplaces/registries:** skills.sh (Vercel-labs' open registry, installs SKILL.md packages across 40+ agents) https://skills.sh ; VoltAgent/awesome-agent-skills (1000+ skills); daymade/claude-code-skills; comparison of marketplaces: https://www.agensi.io/learn/best-ai-agent-skills-marketplaces-2026
- **Composio's design skill roundup:** https://composio.dev/content/top-design-skills

**Open questions worth deeper research:**
- How do skills interact/conflict when many are installed (token cost, triggering accuracy)?
- Which design skills measurably improve output vs. placebo?
- Is a "design skill standard library" emerging (Dean's taxonomy vs. Anthropic's vs. Figma's)?
- Governance/provenance for marketplace skills (prompt-injection risk in third-party SKILL.md files).

---

## 2. Rules Files: CLAUDE.md, .cursorrules, AGENTS.md, Windsurf rules, copilot-instructions.md

**What it is:** Persistent, repo-committed instruction files agents auto-load — the "constitution" layer. Conventions: `CLAUDE.md` (Claude Code, hierarchical: global → project → directory), `.cursorrules` (legacy) → `.cursor/rules/*.mdc` with glob scoping (Cursor), `AGENTS.md` (the deliberately minimal cross-vendor standard now backed by OpenAI, Google, Cursor, Sourcegraph, Factory — nearest-ancestor file wins), `.windsurfrules` → `.windsurf/rules/*.md` with four activation modes (Always On / Manual / Model Decision / Glob), and `.github/copilot-instructions.md` plus scoped `*.instructions.md` (Copilot).

**Why designers care:** Rules files are where design systems become enforceable: token usage ("never hardcode hex, use `--color-*` variables"), accessibility floors, component reuse ("always use existing shadcn variants"), brand voice, spacing scales. A designer can own this file the way they own a style guide — and it applies on every generation, not per prompt.

**Concrete examples:**

- **PatrickJS/awesome-cursorrules** — the canonical collection; hundreds of framework-specific templates (Next.js, Tailwind, React Native…). https://github.com/PatrickJS/awesome-cursorrules
- **cursor.directory** — searchable community rules directory (plus MCPs); has frontend/design/Tailwind categories. https://cursor.directory
- **sanjeed5/awesome-cursor-rules-mdc** — rules in the modern `.mdc` format. https://github.com/sanjeed5/awesome-cursor-rules-mdc
- **AGENTS.md spec:** https://agents.md — comparison pieces: https://codersera.com/blog/agents-md-vs-claude-md-vs-cursor-rules-comparison-2026/ and https://thepromptshelf.dev/blog/cursorrules-vs-claude-md/
- **github/awesome-copilot** — Microsoft's official community repo of `copilot-instructions.md`, scoped `.instructions.md`, `.prompt.md`, and `.agent.md` files. https://github.com/github/awesome-copilot (instructions dir: https://github.com/github/awesome-copilot/tree/main/instructions ; announcement: https://developer.microsoft.com/blog/introducing-awesome-github-copilot-customizations-repo/)
- **Windsurf rules directories:** https://windsurf.run/ and https://windsurf.diy/ ; guide: https://design.dev/guides/windsurf-rules/
- **OneRedOak's CLAUDE.md design-principles excerpts** — CLAUDE.md snippets encoding Stripe/Linear-grade design principles and brand guidelines for automated review. https://github.com/OneRedOak/claude-code-workflows
- **rohitg00/awesome-claude-code-toolkit** — includes 15 rules files among 135 agents / 42 commands / 20 hooks. https://github.com/rohitg00/awesome-claude-code-toolkit

**Open questions:**
- Are there *designer-authored* rules collections comparable to the dev-focused ones (gap in the market)?
- Best practice for encoding design tokens in rules vs. exposing via MCP?
- How teams keep CLAUDE.md/AGENTS.md in sync with the actual design system; measured effect of rules on visual consistency.

---

## 3. Hooks and Automation

**What it is:** Claude Code hooks are shell commands bound to lifecycle events (`PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `UserPromptSubmit`, etc. — 13 events) configured in `settings.json`. Unlike prompts, they are *deterministic*: the linter always runs after an edit; the dangerous command is always blocked. Docs: https://code.claude.com/docs/en/hooks

**Why designers care:** Hooks are the design-QA enforcement layer: auto-run Prettier/ESLint/Stylelint after every edit, block hardcoded colors that bypass tokens, take a Playwright screenshot after UI changes so the agent self-verifies visually, run axe accessibility checks post-edit. This is "design linting" moved into the agent loop.

**Concrete examples:**

- **disler/claude-code-hooks-mastery** — reference implementation of all 13 hook events with PostToolUse validators. https://github.com/disler/claude-code-hooks-mastery
- **decider/claude-hooks** — clean-code enforcement hooks (validation, quality checks, notifications). https://github.com/decider/claude-hooks
- **ChrisWiles/claude-code-showcase** — full worked example: hooks + skills + agents + commands + GitHub Actions; ESLint automation, auto-format, type-check, branch protection. https://github.com/ChrisWiles/claude-code-showcase
- **OneRedOak/claude-code-workflows** — the design-review workflow wires hooks + Playwright MCP so every UI change is screenshotted and assessed against WCAG AA+ and visual-hierarchy criteria. https://github.com/OneRedOak/claude-code-workflows
- **rohitg00/awesome-claude-code-toolkit** — 20 curated hooks among a larger toolkit. https://github.com/rohitg00/awesome-claude-code-toolkit
- Practical guides: https://www.ayautomate.com/blog/best-claude-code-hooks and https://github.com/RiyaParikh0112/claude-code-playbook/blob/main/docs/advanced/hooks-and-automation.md

**Open questions:**
- Design-specific hook recipes are scarce vs. code-lint hooks — what would a "design token linter hook" or "visual-diff-on-Stop hook" standard look like?
- Can hooks call visual regression tools (Chromatic, Percy) economically?
- Hook portability across agents (hooks are Claude Code-specific; no AGENTS.md-equivalent standard).

---

## 4. MCP Servers Relevant to Design

**What it is:** Model Context Protocol servers give agents tools/data access — the connective tissue between the agent and design tools (Figma, browsers, Storybook, token pipelines, image models).

**Why designers care:** MCP is what turns an agent from "text about design" into an actor in design tools: reading real Figma layouts for faithful design-to-code, driving a browser to see rendered UI, querying the live component library, generating image assets.

**Concrete examples:**

- **Official Figma MCP server (Dev Mode MCP)** — reads design context, screenshots, variables/tokens, Code Connect mappings; now also *writes* designs into Figma. https://claude.com/connectors/figma ; setup guide: https://blog.logrocket.com/ux-design/design-to-code-with-figma-mcp/
- **Framelink / GLips/Figma-Context-MCP** — the most popular open-source Figma MCP (simplified layout payloads for any Figma account via API token). https://github.com/glips/figma-context-mcp ; docs: https://www.framelink.ai/docs/quickstart
- **cursor-talk-to-figma-mcp (Sonny Lazuardi, now grab/)** — bidirectional: agents read *and modify* Figma via a plugin websocket bridge (~7k stars). https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp
- **microsoft/playwright-mcp** — browser automation via accessibility snapshots; the standard "eyes and hands" for design review loops. https://playwright.dev/docs/getting-started-mcp
- **@storybook/addon-mcp (storybookjs/mcp)** — official; serves your Storybook at `localhost:6006/mcp` so agents reuse documented components, generate stories, and run interaction/a11y tests. https://github.com/storybookjs/mcp ; docs: https://storybook.js.org/docs/ai/mcp/overview
- **Design-token MCPs:** kenneives/design-token-bridge-mcp (translates tokens between Tailwind/Figma/CSS/DTCG → Material 3, SwiftUI) https://github.com/kenneives/design-token-bridge-mcp ; yajihum/design-system-mcp (component props + Style Dictionary tokens) https://github.com/yajihum/design-system-mcp ; Tokens Studio "Relay" MCP; DIY tutorial: https://learn.thedesignsystem.guide/p/build-your-own-mcp-server-for-design
- **southleft/figma-console-mcp** — "your design system as an API": extraction, bidirectional token sync, variable management, visual debugging. https://github.com/southleft/figma-console-mcp
- **21st.dev Magic MCP** — generates React/Tailwind UI components from curated design inspiration. https://21st.dev/mcp
- **Image-gen MCPs:** BartWaardenburg/recraft-mcp-server (16 tools: text-to-image, vectorize, upscale) https://github.com/BartWaardenburg/recraft-mcp-server ; merlinrabens/image-gen-mcp-server (multi-provider: DALL-E, Stability, Replicate, fal, Recraft) https://github.com/merlinrabens/image-gen-mcp-server ; EverArt MCP (Anthropic reference server) https://www.pulsemcp.com/servers/anthropic-everart
- Roundups: https://snyk.io/articles/14-mcp-servers-for-ui-ux-engineers/ ; https://www.mcpevals.io/blog/best-mcp-servers-for-designers

**Open questions:**
- Official Figma MCP vs. Framelink vs. talk-to-figma tradeoffs (fidelity, write access, pricing/seat requirements).
- Token-cost of large design payloads.
- Whether design-token MCPs converge on the W3C DTCG format.
- MCP registries (Smithery https://smithery.ai, PulseMCP, mcp.so) as discovery layers for designers.

---

## 5. Subagents / Multi-Agent Patterns + Prompt Libraries for Design

**What it is:** Subagents are markdown-defined specialist personas (`.claude/agents/*.md`) with their own system prompt, tool allowlist, and context window; an orchestrator delegates to them. Docs: https://code.claude.com/docs/en/sub-agents. Complementary: collections of system prompts that reveal how production design tools (v0, Lovable) encode design behavior.

**Why designers care:** The design-review subagent pattern — a separate agent with Playwright access that audits UI like a principal designer — is the closest thing to automated design crit. And leaked system prompts from v0/Lovable are the best available textbooks on how to write design-directive prompts at production scale.

**Concrete examples:**

- **OneRedOak/claude-code-workflows — design-review** — the canonical design-review subagent: multi-phase review (interaction, responsiveness, visual polish, WCAG AA+, robustness, code health), triggered on PRs or via slash command, using Playwright to drive the live UI. https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review
- **wshobson/agents** — 50+ production subagents (frontend-developer, architect-review, code-reviewer, etc.), model-tiered per task. https://github.com/wshobson/agents
- **VoltAgent/awesome-claude-code-subagents** — large categorized subagent collection incl. UI/UX-designer-type agents. https://github.com/VoltAgent/awesome-claude-code-subagents
- **Anthropic frontend-design plugin** — official plugin (1.1M+ installs) that establishes aesthetic direction before coding and avoids "AI slop" defaults. https://claude.com/plugins/frontend-design ; source: https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design
- **x1xhlol/system-prompts-and-models-of-ai-tools** — 137k-star collection of full system prompts + tool schemas for v0, Lovable, Cursor, Devin, Windsurf, etc. — study material for design-directive prompt writing. https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools (also EliFuzz/awesome-system-prompts)
- **lst97/claude-code-sub-agents** — full-stack subagent collection with UI-focused specialists. https://github.com/lst97/claude-code-sub-agents
- Pattern write-up: parallel feature-building with subagents — https://dev.to/alvarito1983/claude-code-part-2-how-i-use-sub-agents-to-build-entire-features-in-parallel-aj3

**Open questions:**
- When does a design task warrant a subagent vs. a skill vs. a rule (altitude question designers need a mental model for)?
- Reviewer-agent objectivity (same model reviewing its own output).
- Cost/latency of multi-agent design loops; emerging "orchestrator + design-critic + implementer" triads.

---

## 6. Slash Commands / Custom Commands for Design Workflows

**What it is:** Markdown files in `.claude/commands/` (or plugin-provided) that become `/commands` — parameterized, shareable prompt macros. The lightest-weight primitive: a prompt with a name.

**Why designers care:** Commands turn recurring design rituals into one keystroke: `/design-review`, `/handoff`, `/discover`, `/heuristic-eval`. They're the easiest entry point for a designer to build their own tooling.

**Concrete examples:**

- **Marie Claire Dean's 27 commands** (within designer-skills): `/discover`, `/strategize`, `/handoff`, heuristic evaluations, etc. https://github.com/owl-listener/designer-skills
- **wshobson/commands** — production-ready command collection (pairs with wshobson/agents). https://github.com/wshobson/commands
- **OneRedOak design-review slash command** — on-demand `/design-review` of the current branch. https://github.com/OneRedOak/claude-code-workflows
- **hesreallyhim/awesome-claude-code** — the central curated index of slash commands, CLAUDE.md files, and workflows (resource table: https://github.com/hesreallyhim/awesome-claude-code/blob/main/THE_RESOURCES_TABLE.csv). https://github.com/hesreallyhim/awesome-claude-code
- **lxcong/awesome-claude-dynamic-workflows** — multi-agent orchestration scripts that install as slash commands. https://github.com/lxcong/awesome-claude-dynamic-workflows
- **danielrosehill/Claude-Slash-Commands** — personal command library example. https://github.com/danielrosehill/Claude-Slash-Commands

**Open questions:**
- Commands vs. skills is genuinely confusing (commands are user-invoked, skills model-invoked) — best framing for designers?
- Are there curated *design-only* command packs beyond Dean's?
- Team distribution patterns (plugins vs. dotfiles vs. marketplace).

---

## 7. Notable Curated Lists (awesome-* repos) for AI x Design Tooling

**Why designers care:** The ecosystem churns weekly; awesome-lists are the practical discovery layer and reveal which primitives have community gravity.

**Concrete examples:**

- **hesreallyhim/awesome-claude-code** — the master list (commands, CLAUDE.md files, hooks, workflows, tooling). https://github.com/hesreallyhim/awesome-claude-code (visual mirror: https://awesomeclaude.ai/awesome-claude-code)
- **Skills lists:** travisvn/awesome-claude-skills https://github.com/travisvn/awesome-claude-skills ; ComposioHQ/awesome-claude-skills https://github.com/ComposioHQ/awesome-claude-skills ; BehiSecc/awesome-claude-skills https://github.com/BehiSecc/awesome-claude-skills ; VoltAgent/awesome-agent-skills
- **Design-specific:** rohitg00/awesome-claude-design https://github.com/rohitg00/awesome-claude-design ; bergside/awesome-design-skills (67 DESIGN.md/SKILL.md files for Claude, Stitch, Codex, Cursor) https://github.com/bergside/awesome-design-skills
- **Smashing Magazine / Smart Interface Design Patterns: "Useful AI Skills And Workflows For Designers"** — the best designer-audience curation of this whole space (by Vitaly Friedman). https://smart-interface-design-patterns.com/articles/ai-skills-for-designers-a-curated-list/
- **rohitg00/awesome-claude-code-toolkit** — 135 agents, 35 skills, 42 commands, 20 hooks, 15 rules, 14 MCP configs in one repo. https://github.com/rohitg00/awesome-claude-code-toolkit
- **Rules/instructions lists:** PatrickJS/awesome-cursorrules ; github/awesome-copilot ; Code-and-Sorts/awesome-copilot-agents https://github.com/Code-and-Sorts/awesome-copilot-agents
- **AI-design tool lists (broader):** allanjsx/awesome-ai-for-design https://github.com/allanjsx/awesome-ai-for-design ; maxbogo/awesome-ai-tools-for-ui https://github.com/maxbogo/awesome-ai-tools-for-ui
- **Writeups aggregating designer skill stacks:** https://nervegna.substack.com/p/50-claude-code-skills-for-designers ; https://www.925studios.co/blog/best-claude-skills-for-designers

**Open questions:**
- List rot and duplication (many awesome-claude-skills forks).
- No single canonical "awesome-ai-x-design-infrastructure" list exists yet — a genuine gap this project could fill.

---

## Cross-Cutting Themes for Deeper Research

1. **The altitude ladder:** rules (always-on) → skills (model-triggered) → commands (user-triggered) → subagents (delegated) → hooks (deterministic) → MCP (tool access). Designers need a decision framework; nobody has published a designer-audience version.
2. **Designers as infrastructure authors:** Dean's designer-skills proves non-engineers can ship this layer; the pattern of "design judgment as markdown" is the story.
3. **Verification loop:** Playwright/Chrome MCP + screenshots + hooks = agents that can *see* their UI output; this is what separates design-capable agents from text generators.
4. **Standards convergence:** AGENTS.md (rules), SKILL.md/Agent Skills (skills), MCP (tools), DTCG (tokens) — which wins, and what designers should bet on.

*Sources: gathered via searches of GitHub, Figma, Anthropic docs, Smashing/UX Planet/Substack design community writeups, and MCP registries (PulseMCP, Smithery, mcpservers.org).*
