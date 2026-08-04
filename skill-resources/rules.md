# Rules Files for Design Work

**Curated picks for encoding design constraints into always-on agent instructions.** Verified August 2026.

Rules files are persistent, repo-committed instruction files that coding agents load automatically at the start of every session — no prompting required. They are the **"always-on constitution" layer** of agentic tooling: unlike skills (model-triggered) or slash commands (user-triggered), rules apply to *every* generation. That makes them the single highest-leverage place for a designer to encode a design system: token usage, component reuse, accessibility floors, spacing scales, brand voice, and aesthetic direction all become defaults instead of per-prompt reminders.

### File conventions across agents

| File | Agent | Scoping / behavior |
|---|---|---|
| `CLAUDE.md` | Claude Code | Hierarchical: global (`~/.claude`) → project root → subdirectory; all applicable files load |
| `.cursor/rules/*.mdc` | Cursor | Modern format with glob scoping + activation modes; legacy single `.cursorrules` still read |
| `AGENTS.md` | Codex, Jules, Cursor, Copilot, Aider, Devin, 20+ others | Cross-vendor open standard (Linux Foundation / Agentic AI Foundation); nearest-ancestor file wins in monorepos; used by 60k+ projects |
| `.github/copilot-instructions.md` + `*.instructions.md` | GitHub Copilot | Repo-wide file plus scoped instruction files with `applyTo` glob frontmatter |
| `.windsurf/rules/*.md` | Windsurf | Four activation modes: Always On / Manual / Model Decision / Glob |
| `DESIGN.md` | Stitch, Figma Make, Claude Code, Cursor (emerging) | Google Labs open spec for *visual identity* specifically: YAML token frontmatter + prose rationale |

Practical implication: teams increasingly write one canonical rules document and symlink or duplicate it across `CLAUDE.md` / `AGENTS.md`, keeping agent-specific quirks in the native files.

---

## What to encode: design constraints that belong in rules

The categories below are distilled from the best files we actually read (cited per snippet). The consistent lesson: **generic rules do nothing** ("follow best practices", "use clean design") — the files that measurably change output name exact values, exact components, and exact prohibitions.

### 1. Token usage (never hardcode values)

```md
## Color
- Never hardcode hex values in components. All color comes from tokens
  (CSS custom properties `--color-*` / Tailwind theme keys).
- `color.primary` (#2563EB) is for CTAs and links only — never backgrounds,
  never dividers.
- Semantic states are fixed: Success = green scale, Error/Destructive = red,
  Warning = amber, Info = blue. Do not invent new state colors.
```
*Adapted from the [DESIGN.md spec](https://github.com/google-labs-code/design.md) examples (semantic token references like `"{colors.primary}"`), [OneRedOak's design-principles file](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review), and 925Studios' CLAUDE.md templates.*

### 2. Component reuse (block bespoke re-implementation)

```md
## Components
- ALWAYS use existing components from `src/components/ui` (shadcn/ui) before
  writing new markup. Never re-implement Button, Dialog, Select, or Tooltip.
- New variants go through the component's variant API (cva), not one-off
  className overrides.
- If no suitable component exists, stop and propose one — do not inline a
  bespoke div-based substitute.
```
*This is the constraint Atlassian's [DESIGN.md field test](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice) found most critical: static context files "encourage recreating components rather than importing existing ones" — rules must point at real import paths to counteract that.*

### 3. Accessibility floors (measurable, not aspirational)

```md
## Accessibility (non-negotiable)
- Contrast: 4.5:1 for normal text, 3:1 for large text (18pt / 14pt bold) — WCAG 2.2 AA.
- Prefer native HTML: `<button>`, never `<div role="button">`. Native elements
  ship keyboard, focus, and semantics for free.
- Every interactive component must be escapable by keyboard (no traps);
  modals close on Escape and restore focus to the trigger.
- Every input has a programmatically associated label; icon-only buttons
  have `aria-label`.
```
*Adapted from [`a11y.instructions.md`](https://github.com/github/awesome-copilot/tree/main/instructions) in github/awesome-copilot — the single most enforceable rules file we reviewed (38+ anti-patterns, each with severity, detection pattern, and WCAG reference).*

### 4. Spacing and typography scales

```md
## Spacing & type
- All padding, margin, and gap values are multiples of the 4px base unit
  (4, 8, 12, 16, 24, 32). Arbitrary values (e.g. `p-[13px]`) are forbidden.
- Type scale is fixed: 12/14/16/18/24/32. Body line-height 1.5–1.7.
- Card padding follows the 8px grid.
```
*Adapted from OneRedOak's [design-principles-example.md](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review) and the DESIGN.md examples (8px spacing foundation).*

### 5. Brand voice and copy

```md
## Voice
- UI copy is sentence case, active voice, no exclamation marks.
- Error messages state what happened + one recovery action. Never blame the user.
- Empty states teach; they never just say "No data".
```
*Pattern drawn from the SKILL.md structure used across [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) (brand philosophy + writing tone as first-class sections) and Atlassian's guidance that prose "rationale" is what LLMs use to generalize beyond listed values.*

### 6. Anti-slop aesthetic direction

```md
## Aesthetic direction
- Commit to ONE distinctive direction per project (defined below) and apply it
  consistently — do not average toward defaults.
- Banned defaults: purple-to-blue gradients on white cards, emoji as icons,
  centered-hero + three-feature-cards layouts, `Inter` for display type,
  gratuitous glassmorphism.
- Depth model: 1px borders for static cards; shadow only when interactive.
```
*Pattern from Anthropic's [frontend-design plugin](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) (explicitly built to "avoid generic AI aesthetics" by forcing a bold aesthetic choice up front) and the Do's/Don'ts section the DESIGN.md spec requires. The concrete "banned defaults" list is the part that works — vague "be distinctive" instructions do not.*

### 7. Self-verification ritual

```md
## After any UI change
1. Navigate to the affected page and screenshot it (Playwright/browser MCP).
2. Compare against the design principles doc; check console for errors.
3. For significant changes, invoke the design-review agent.
```
*Directly from OneRedOak's [CLAUDE.md snippet](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review) — rules that force the agent to look at its own rendered output are the cheapest quality gate available.*

---

## Recommended resources

### 1. AGENTS.md spec ([agents.md](https://agents.md/))

- **What it covers:** The cross-vendor open standard for agent rules files — "a README for agents." Plain Markdown, no required fields; typical sections are project overview, build/test commands, code style, conventions.
- **How it works:** Agents read the nearest `AGENTS.md` in the directory tree (nearest ancestor wins in monorepos); explicit user prompts override it. Supported by OpenAI Codex, Google Jules, Cursor, VS Code/Copilot, Aider, Devin, Factory, JetBrains Junie and 20+ more; stewarded by the Agentic AI Foundation under the Linux Foundation; used by 60,000+ open-source projects.
- **When to use:** As the portable home for your design constitution when your team uses more than one agent. Write design rules once here; point `CLAUDE.md` at it.
- **Quality:** Verified live. This is the standard that won the format war — deliberately minimal, which is its strength and its weakness.
- **Caveats:** The spec says nothing about *what* to write; it ships no design content. Nesting semantics differ subtly from CLAUDE.md's additive hierarchy (AGENTS.md: nearest wins).

### 2. OneRedOak / claude-code-workflows — design-review rules ([repo](https://github.com/OneRedOak/claude-code-workflows/tree/main/design-review))

- **What it covers:** The best public example of design principles as CLAUDE.md content: `design-principles-example.md` (an "S-Tier SaaS dashboard" checklist — tokens, 4px spacing grid, WCAG AA contrast, line-height 1.5–1.7, interaction timing 150–300ms) plus `design-review-claude-md-snippet.md` (a rules snippet that forces a screenshot-and-verify loop after every UI change and escalation to a design-review subagent).
- **How it works:** Drop the principles file in your repo, reference it from CLAUDE.md via the provided snippet; the companion agent + slash command use Playwright to review live UI against those principles.
- **When to use:** As the starting template for a product team's design-principles rules file — replace its example values with your system's.
- **Quality:** Verified; 3.9k stars, MIT, by Patrick Ellis (built from real startup workflows). The principles are concrete where it counts (spacing, contrast, states) though some items are philosophy-level.
- **Caveats:** Only ~12 commits; it's a reference artifact, not a maintained library. Claude Code-specific wiring (subagent, Playwright MCP) needs adaptation for other agents.

### 3. DESIGN.md spec — google-labs-code/design.md ([repo](https://github.com/google-labs-code/design.md))

- **What it covers:** Google Labs' Apache-2.0 spec (from the Stitch team) for describing a visual identity to agents: YAML frontmatter with machine-parseable tokens (colors, typography scales, radius, spacing, component→token mappings) plus a prose body explaining rationale, with a required Do's and Don'ts section.
- **How it works:** One `DESIGN.md` at repo root; agents read tokens for exact values and prose for judgment. Ships a CLI/linter (`@google/design.md`) and three full examples (`atmospheric-glass`, `paws-and-paths`, `totality-festival`) worth reading as model rule-writing — e.g. glassmorphism encoded as exact blur values (20px standard, 40px elevated) and rgba surface alphas, not adjectives.
- **When to use:** Greenfield projects, prototypes, and any context where the "design system" is an identity rather than a component library; also as the token-frontmatter pattern to steal for your own CLAUDE.md.
- **Quality:** Verified; 26.9k stars, very active, real spec discipline (schema, linter, examples). The strongest *format* in this space.
- **Caveats:** Alpha status. And read Atlassian's field test (next entry) before adopting it as your only context layer.

### 4. Atlassian's DESIGN.md field test ([writeup](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice))

- **What it covers:** The only published *measured* evaluation of a design rules file: Atlassian generated a DESIGN.md from their design-system pipeline and benchmarked it against their MCP server.
- **What they found:** As sole context, DESIGN.md cost ~92% more tokens than MCP retrieval, ran slower, and showed 2.7x more run-to-run variance; compressing 2.5MB of guidance into 80KB forced dropping component usage detail; the format nudges agents to *recreate* components instead of importing real ones.
- **When to use:** Read this before deciding what goes in rules vs. what should be retrieved on demand (MCP). Their conclusion: static design-context files win for quick prototyping, artistic direction, and theming; retrieval wins for production work against a real component library.
- **Quality:** Essential — the honest counterweight to rules-file enthusiasm, from the team with the most advanced machine-readable design system program.
- **Caveats:** It's an article, not a downloadable artifact; findings reflect Atlassian's very large system and may overstate costs for small token sets.

### 5. github/awesome-copilot — design-relevant instructions ([instructions dir](https://github.com/github/awesome-copilot/tree/main/instructions))

- **What it covers:** Microsoft's official community repo of Copilot customizations (37k+ stars, actively maintained). The design-relevant picks: **`a11y.instructions.md`** — ~4,500 words, 38+ accessibility anti-patterns, each with severity (CRITICAL/IMPORTANT/SUGGESTION), a detection regex, WCAG 2.2 AA reference, and good/bad code — plus `html-css-style-color-guide.instructions.md` and `markdown-accessibility.instructions.md`.
- **How it works:** Copy into `.github/instructions/` with `applyTo` glob frontmatter; content is plain Markdown, so it ports directly into CLAUDE.md/AGENTS.md.
- **When to use:** `a11y.instructions.md` is the accessibility-floor rules file to adopt, whatever agent you use. It was the most specific and enforceable single file in this entire review.
- **Quality:** Verified and read; exemplary rule-writing (measurable, detectable, referenced).
- **Caveats:** Dev-audience repo — beyond a11y/CSS there is little visual-design content; no token or brand-direction material.

### 6. PatrickJS/awesome-cursorrules — frontend subset ([repo](https://github.com/PatrickJS/awesome-cursorrules))

- **What it covers:** The canonical rules collection (40.5k stars, active, now migrated to `.mdc`): hundreds of framework templates including `nextjs-react-tailwind`, `nextjs-typescript-tailwind`, `tailwind-shadcn-ui-integration`, `react-components-creation`, `react-chakra-ui`, `cypress-accessibility-testing`, `landing-page-image-quality`, `rtl-right-to-left-i18n`.
- **How it works:** Copy a template into `.cursor/rules/`; most set stack conventions (component structure, styling approach, naming).
- **When to use:** As a scaffold for stack-level conventions when starting a Cursor project — then rewrite it with your actual tokens and components.
- **Quality:** Honest assessment: **highly variable.** We read the shadcn/React file and found mostly section headings with little enforceable content ("use the latest stable version...", "don't be lazy"). The repo's value is breadth and convention, not depth — treat every template as a starting skeleton, not a finished design constitution.
- **Caveats:** Community-contributed with no quality bar; many files predate `.mdc` best practices; near-zero genuine *design* judgment (no token discipline, no a11y specifics) in the files we sampled.

### 7. cursor.directory ([site](https://cursor.directory))

- **What it covers:** The searchable community directory of Cursor rules (plus MCPs), with framework/language pages including [TailwindCSS](https://cursor.directory/rules/tailwindcss) and frontend categories.
- **How it works:** Browse, copy into `.cursor/rules/`. Popularity signals surface the commonly used templates.
- **When to use:** Discovery — faster to search than the GitHub repo, and includes rules not in awesome-cursorrules.
- **Quality:** Active and widely referenced. Direct verification was partially blocked by rate-limiting during this review; the Tailwind page and category structure were confirmed via search. Same variability caveat as awesome-cursorrules — it aggregates the same community material.
- **Caveats:** No editorial quality bar; popular ≠ good.

### 8. 925Studios — "The CLAUDE.md File Every Design Project Needs" ([article + templates](https://www.925studios.co/blog/claude-md-setup-design-projects-templates))

- **What it covers:** A designer-audience walkthrough (March 2026, by 925Studios' lead designer) of writing CLAUDE.md for design work, with three complete templates: SaaS dashboard, marketing landing page, and design-system component library. Recommends seven sections: project/stack, typography, color tokens, spacing/layout, component conventions, accessibility, and "do not" rules; keep the file under ~200 lines.
- **When to use:** The best current *tutorial* entry point for a designer writing their first rules file; the templates are directly usable.
- **Quality:** Verified and read; concrete (exact hex tokens, 8px grid rules, explicit prohibitions). Its "60–80% fewer design corrections" claim is anecdotal — treat as directional.
- **Caveats:** A studio blog, not a maintained repo; templates are opinionated defaults you must replace with your own system's values.

### 9. VoltAgent/awesome-claude-design ([repo](https://github.com/VoltAgent/awesome-claude-design))

- **What it covers:** 68 ready-to-use DESIGN.md files across 11 categories (AI platforms, dev tools, SaaS, fintech, media...), each following a consistent 9-section structure: visual theme, palette, typography, components, layout, elevation, guidelines, responsive behavior, agent prompts.
- **How it works:** Drop one file into a project to give an agent a complete aesthetic direction in one shot.
- **When to use:** Prototyping and aesthetic exploration — instant, coherent visual direction without writing your own spec; also useful as worked examples of the DESIGN.md format.
- **Quality:** Verified; 3.3k stars, MIT, consistent structure, clear brand-attribution disclaimers.
- **Caveats:** These are *inspired-by* renditions of existing products' aesthetics — great for learning the format and for demos, legally and creatively wrong as your product's actual identity. Not designer-authored in the professional sense.

### 10. bergside/awesome-design-skills ([repo](https://github.com/bergside/awesome-design-skills))

- **What it covers:** 67 design skill files, each pairing a `SKILL.md` (agent instructions: brand philosophy, typography, palette, components, accessibility, writing tone, quality criteria) with a `DESIGN.md` (rationale), spanning aesthetic families (glassmorphism, brutalism, minimalism, neumorphism, Material) and branded systems.
- **How it works:** Cross-tool by design — Claude Code, Cursor, Stitch, Codex — with interactive preview links and CLI install.
- **When to use:** When you want an aesthetic-direction rules layer with visual previews before committing; the SKILL.md section taxonomy (including writing tone and quality criteria) is worth copying even if you use none of the files.
- **Quality:** Verified; 2.2k stars, consistent structure, previews raise the curation bar above most collections.
- **Caveats:** Same "aesthetic costume" caveat as VoltAgent's collection; SKILL.md blurs the skill/rules boundary (these load on-trigger in Claude Code, always-on elsewhere).

### 11. Anthropic frontend-design plugin ([source](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design))

- **What it covers:** Anthropic's official plugin (1M+ installs) that makes Claude establish a bold aesthetic direction — distinctive type, palette, motion — before writing frontend code, explicitly to avoid "generic AI aesthetics." Companion reading: the [Frontend Aesthetics Cookbook](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb).
- **How it works:** Technically a skill (auto-activates on frontend tasks), included here because its instruction content is the best available model for writing *anti-slop aesthetic rules* — the "commit to a direction, ban the defaults" pattern in the snippet section above.
- **When to use:** Install it in Claude Code; on other agents, port its approach into your rules file.
- **Quality:** Verified; first-party, massively adopted, directly targets the failure mode designers care most about.
- **Caveats:** Not a rules file; being always-on via rules vs. triggered via skill changes token cost. Its taste is opinionated — dramatic-by-default isn't right for every product.

---

## The honest gap

The research behind this list flagged it, and verification confirmed it: **designer-authored rules collections barely exist.** The big rules repos (awesome-cursorrules, cursor.directory) are engineer-built and design-thin — the frontend files we sampled were mostly skeletal stack declarations. The most enforceable design-relevant rules file we found (`a11y.instructions.md`) lives in a developer repo. The DESIGN.md ecosystem is format-strong but content-wise dominated by brand-mimicry files. What a working product designer actually needs — a maintained, exemplary "here is our real design system as rules" file with real tokens, real component paths, and real prohibitions — exists mainly as private artifacts and blog-post templates (OneRedOak and 925Studios are the closest public examples). That's a genuine gap, and an opportunity for this repository's audience to fill.

---

## Evaluated but not selected

- **rohitg00/awesome-claude-design** — 28+ DESIGN.md prompts in 9 aesthetic families with an "anti-slop kit"; substantially overlaps the larger, more consistently structured VoltAgent and bergside collections.
- **sanjeed5/awesome-cursor-rules-mdc** — solid `.mdc`-format collection (3.6k stars) but rules are LLM-generated from library docs and skew backend; little design judgment.
- **rohitg00/awesome-claude-code-toolkit** — its 15 rules files are a minor slice of a 135-agent grab-bag; nothing design-specific stood out.
- **Windsurf rules directories (windsurf.run / windsurf.diy)** — thin, unverified curation; the Windsurf *convention* is covered in the table above, and content ports from the picks here.
- **`.cursorrules` "toss-style-design-system" and similar one-off design-system rules in awesome-cursorrules** — could not verify depth; sampled peers in the repo were skeletal.
- **UI Rules (uirules.com) / ui-design-brain** — token-extraction-to-rules tools noted in research; tools rather than rules files, and not independently verified in this pass.
- **AGENTS.md comparison blog posts** (codersera, thepromptshelf) — useful background, superseded by the spec site itself.
