# Foundational Research Overview — AI × Product Design Landscape

**Purpose:** This is the synthesis report for the foundational research phase of this repository — a collection of design resources, AI skills, rules, hooks, and workflow infrastructure that makes it easier for designers to define and execute AI workflows across design systems, UI generation, graphic design, information architecture, animation, and interaction design.

Six research documents map the breadth of the landscape (2024–2026), and a second research stream ([prototype-construction](../prototype-construction/00-architecture-synthesis.md)) deep-dives a proposed architecture for efficient prototype authoring. This overview ties them together: what each covers, the themes that cut across all of them, the gaps nobody has filled, and a prioritized fan-out plan for the deep-dive research phase that comes next.

---

## The Six Foundational Documents

| Doc | Domain | One-line summary |
|---|---|---|
| [01 — Agentic Tooling Primitives](01-agentic-tooling-primitives.md) | Infrastructure | Skills, rules files, hooks, MCP servers, subagents, slash commands — the mechanisms that turn design judgment into executable infrastructure |
| [02 — AI & Design Systems](02-ai-design-systems.md) | Design systems | How systems become machine-operable: DTCG tokens, Code Connect, Storybook MCP, llms.txt, registries, design QA, and the governance debate |
| [03 — AI UI Generation](03-ai-ui-generation.md) | UI generation | The prompt-to-app landscape (v0, Lovable, Figma Make…), design-to-code, code-to-design, prompting for quality, evaluation, and failure modes |
| [04 — Graphic Design & Brand](04-ai-graphic-design-brand.md) | Visual craft | Image/vector/SVG generation, typography, layout automation, brand-guidelines-as-context, asset editing agents, ethics & licensing |
| [05 — Motion, IxD & Prototyping](05-ai-motion-ixd-prototyping.md) | Motion & interaction | AI-legible animation libraries (GSAP, Motion, Rive, Lottie), AI video, prototype-to-production, AI product UX patterns, 3D, sound/haptics |
| [06 — UX Research, IA & Process](06-ai-ux-research-ia-process.md) | Research & process | IA with AI, research synthesis tools, synthetic users, AI usability evaluation, content design, design ops, career/skills shift |

### Companion stream: Construction-File Prototyping

A six-doc series in [docs/research/prototype-construction](../prototype-construction/00-architecture-synthesis.md) investigates an original architecture: codify the design system as primitives, have the LLM emit a small schema-validated construction file (JSON/YAML) instead of raw code, expand it deterministically with a builder skill, and iterate via surgical patches. Verdict: sound and well-precedented (server-driven UI, Mitosis, Vercel json-render converge on the same insight), with estimated ~5–10× token savings per screen and ~30–50× on iteration — but it only pays off when >60–70% of screens are expressible in the pattern library. See the [architecture synthesis](../prototype-construction/00-architecture-synthesis.md) for the pipeline, decision points, and a falsifiable experiment roadmap (E0–E6).

---

## Cross-Cutting Themes

These patterns appeared independently in multiple research streams — they are the load-bearing ideas of the whole landscape.

### 1. An "AI-legibility" standards stack is crystallizing

Every domain is converging on the same move: make the artifact machine-readable, then serve it to agents. The emerging stack:

- **DTCG JSON** (W3C Design Tokens, stable Oct 2025) — design decisions as data
- **DESIGN.md** (Google Labs/Stitch, field-tested by Atlassian) — visual identity + rationale for agents
- **llms.txt** — docs indexes for LLM ingestion (shadcn/ui, Motion)
- **Registry schemas** (shadcn model) — components as installable, readable open code
- **MCP** — active integration: Figma, Storybook, Carbon, Atlassian ADS, Lottie, Pencil all ship servers
- **SKILL.md / AGENTS.md** — process and constraints as portable markdown

Open question tracked across docs 01, 02, 05: is this converging into a coherent standard set or fragmenting per-vendor? The missing piece everyone notes: no **brand.json** equivalent exists for visual/brand identity (doc 04).

### 2. The altitude ladder — and nobody has explained it to designers

The primitives form a spectrum of control: **rules** (always-on) → **skills** (model-triggered) → **commands** (user-triggered) → **subagents** (delegated) → **hooks** (deterministic enforcement) → **MCP** (tool access). Choosing the right altitude for a given design concern (token enforcement → hook or rule; heuristic evaluation → skill; design review → subagent) is the core practical skill, and no designer-audience decision framework has been published. **This is a gap this repo can own.**

### 3. Verification loops separate design-capable agents from text generators

The single biggest quality unlock across UI generation, design systems, and motion: agents that can *see and check* their output. Playwright/browser MCP screenshots, axe-core a11y checks, visual diffs, Storybook test runs, Motion's curve-rendering-as-images — wired in via hooks and subagents (the OneRedOak design-review workflow is the canonical example). Design-specific hook recipes remain scarce; token-drift linting has no open-source standard.

### 4. Evaluation is the biggest open gap in the field

Preference leaderboards exist (Design Arena, WebDev Arena) but there are essentially no public benchmarks for: design-system adherence ("on-system rate"), accessibility of generated UI, responsive behavior, motion quality, or brand consistency. Atlassian is nearly alone in publishing measured outcomes. Anyone who builds credible evals here defines the field.

### 5. Designers now ship behavior, not pictures

Converging evidence: ~50% of designers have shipped AI-generated code to production (AI in Design Report 2026); prototypes are expected design output; Rive data binding and Lottie state machines make animation a shipped runtime asset; code prototypes replace click-throughs; handoff rituals are collapsing into code-as-spec. The designer/engineer boundary is the site of the biggest role shift.

### 6. Defaults are the enemy; taste is infrastructure

AI output regresses to the statistical median — "indigo gradient, Inter, card grid," inaccessible by default (~96% of training-data homepages fail WCAG). The countermeasures are packaged, versioned aesthetics: anti-slop skills (Anthropic frontend-design), DESIGN.md files, aesthetic-direction prompts, brand-guidelines-as-context. Turning taste into a distributable artifact is the recurring product idea of 2025–26.

### 7. Known content gaps (opportunities for this repo)

- A canonical **awesome-AI×design-infrastructure** list — doesn't exist (01)
- A **designer-audience altitude-ladder decision framework** (01)
- **Design-specific hook recipes** — token linting, visual-diff-on-stop, a11y gates (01, 02)
- A **motion pattern library for AI product states** — streaming choreography, agent-status animation (05)
- **brand.json** — a portable brand-identity standard (04)
- **On-system generation benchmarks** (02, 03)
- Designer-authored **rules-file collections** (01)

---

## Fan-Out Plan: Deep-Dive Research Topics

Prioritized candidates for the next phase. Each is scoped to become its own research doc (and eventually its own resource collection in this repo).

### Tier 1 — Core to the repo's mission (do first)

1. **Design skills teardown** — deep evaluation of the major skill collections (anthropics/skills, designer-skills, Figma skills, claudedesignskills): taxonomy, quality, overlap, what's missing. Output: the seed of our own skill library.
2. **Rules files for design** — survey existing collections, extract patterns for encoding tokens/a11y/component reuse; draft reference CLAUDE.md/AGENTS.md templates for design teams.
3. **Design QA hooks & verification loops** — catalog hook recipes (screenshot-on-edit, axe gates, token linting); prototype the missing ones. Includes the OneRedOak workflow teardown.
4. **Design MCP server landscape** — comparative teardown: Figma official vs Framelink vs talk-to-figma; Storybook, token, image-gen MCPs; what a designer's MCP stack should look like.
5. **The altitude ladder framework** — synthesize 1–4 into the designer-audience decision guide (rule vs skill vs command vs subagent vs hook vs MCP).

### Tier 2 — High-value domain deep-dives

6. **Machine-readable design systems playbook** — DTCG + DESIGN.md + llms.txt + Code Connect + registry; teardown of Atlassian/Carbon/shadcn/SLDS2 implementations.
7. **Prompting & aesthetic direction** — the anti-slop corpus: aesthetic families, style-guide-in-prompt patterns, system prompts of v0/Lovable; build a reusable design-direction prompt library.
8. **Generated-UI evaluation** — what exists (arenas, screenshot loops, VLM judges), what's missing (adherence/a11y/responsive benchmarks); spec a practical eval harness.
9. **AI product UX patterns** — consolidate Shape of AI, agentic UX patterns, generative UI (AI SDK, Thesys C1), streaming/chat craft into a designer reference.
10. **Motion + AI workflows** — AI-legible animation libraries in practice (Motion AI Kit, GSAP, Rive data binding, Lottie MCP); the missing AI-state motion pattern library.

### Tier 3 — Adjacent domains

11. **Brand & asset pipelines** — brand-guidelines-as-context, style consistency (sref/oref, Firefly Custom Models), the brand.json opportunity, licensing/C2PA practicalities.
12. **UX research & synthesis stack** — Dovetail/Marvin/etc. teardown, synthetic-users evidence review, AI-moderated research, agentic usability testing.
13. **IA & content design with AI** — taxonomy/ontology tooling, conversational IA, voice-and-tone-as-prompts, terminology systems.
14. **Code-to-design & design-as-code formats** — Pencil (.pen), Figma MCP write-path, html/story.to.design; the source-of-truth question.
15. **3D, sound & haptics** — the emerging frontier; lighter-touch watch-list doc.

### Tier 1b — The construction-file prototyping bet (researched, ready to prototype)

The [prototype-construction series](../prototype-construction/00-architecture-synthesis.md) is past the research stage: it has a concrete pipeline design and an ordered experiment roadmap (E0 baseline → E1 vertical slice → granularity/format/spec ablations). Building E0+E1 would produce several of this repo's flagship artifacts in one stroke: a catalog-codification guide with extractor scripts, a builder skill (SKILL.md + scripts), an intent template, and iteration hooks — concrete instances of Tier 1 items 1, 3, and 5.

### Suggested next step

Start with Tier 1, items 1–3 in parallel (they directly seed the repo's own collections: skills, rules, hooks), then 4–5 to produce the framework doc that organizes everything this repository will offer. Run the construction-file experiments (Tier 1b) alongside — the E0/E1 pair is the fastest path to shippable, differentiated artifacts.

---

*Research conducted August 2026 via parallel web-research agents. Each foundational doc contains its own sources and open questions; roughly 250+ linked resources across the six documents.*
