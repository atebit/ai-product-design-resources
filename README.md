# AI × Product Design Resources

**Christopher Smith** — seasoned builder across design and engineering; currently building enterprise software with [Xplor](https://www.xplor.com) and some other awesome folks.

[christophersmith.io](https://christophersmith.io) 

[github.com/atebit](https://github.com/atebit)

---

Resources that make a designer's life easier when defining and executing AI workflows — across design systems, UI generation, graphic design, information architecture, animation, and interaction design.

The repo is built on a simple loop: **research the landscape → curate only what survives verification → compose it into working setups**. Everything here has been through that loop.

## What's in the repo

```
├── skill-resources/          # The curated collection (verified picks + writeups)
│   ├── skillchains.md        #   START HERE to set things up — composing the collection into working chains
│   ├── skills.md             #   14 agent skills for design work
│   ├── rules.md              #   11 rules resources + what-to-encode guide with snippets
│   ├── hooks.md              #   5 design-QA hook recipes + 5 vetted resources
│   ├── mcp-servers.md        #   12 MCP servers + the recommended stack
│   ├── subagents-and-commands.md  # 11 subagents & slash commands + prompt lessons
│   ├── review-and-feedback.md     # Feedback surfaces, critique formats, templates, hook recipes
│   ├── prototype-governance.md    # Lifecycle, ledger, promotion gate, Figma↔code sync tooling
│   ├── guardrails-and-evals.md    # Guardrail ladder, structured output, routing, eval harnesses
│   ├── eval-loops.md              # Grade → review → feed back: the loop that improves a generator
│   └── prototype-review-overlay.md # Building blocks for a drop-in comment/grade/provenance package
└── docs/research/            # The research base the collection is grounded in
    ├── foundational/         #   6-doc landscape survey + synthesis (250+ sources)
    ├── prototype-construction/  # 19-doc architecture study: construction-file prototyping
    ├── theming/              #   4-doc codification: OKLCH theme mutation + 3 portable skills
    ├── design-sdlc/          #   5-doc process study: source of truth, feedback, governance, guardrails
    ├── eval-tuning-loops/    #   6-doc loop study: grading, review, feeding back, training, governance
    └── prototype-review-overlay/ # 7-doc package design: anchoring, storage, grading, provenance, packaging
```

### [skillchains.md](skill-resources/skillchains.md) — the setup guide

How to compose the collection into five working chains — **UI generation**, **design-to-code**, **design QA & review**, **design system work**, and **research & strategy** — plus the config files involved, which pieces complement or conflict, how to adapt everything to your own design system, and how to push must-happen behavior toward determinism (hooks) instead of hope (prompts).

### [skill-resources/](skill-resources/README.md) — the curated collection

The best skills, rules, hooks, MCP servers, subagents, commands, review and feedback tooling, prototype-governance scaffolds, guardrail/eval harnesses, and eval-loop tooling for design work — deliberately *not* thousands of entries. Every pick was verified live: repo exists, actively maintained, contents read and honestly judged. Each file includes per-pick writeups (what it does, how it works, where it fits in the design process) and an "Evaluated but not selected" list with reasons.

### [docs/research/](docs/research/foundational/00-overview.md) — the research base

- **[foundational/](docs/research/foundational/00-overview.md)** — six landscape documents covering agentic tooling primitives, AI × design systems, UI generation, graphic design & brand, motion/IxD/prototyping, and UX research & process. The [overview](docs/research/foundational/00-overview.md) synthesizes cross-cutting themes (the AI-legibility standards stack, the altitude ladder, verification loops, the evaluation gap) and a prioritized fan-out plan.
- **[prototype-construction/](docs/research/prototype-construction/README.md)** — an original architecture for efficient prototype authoring: codify the design system as primitives, have the LLM emit a small schema-validated **construction file** instead of raw code, expand it deterministically with a builder, and iterate via surgical patches. The [folder README](docs/research/prototype-construction/README.md) explains the concept and briefs what the research has found; 19 documents cover the five pipeline stages, a six-report tangential-patterns series (declarative infra, game engines, compilers, MDE, node graphs, constraint layout), and a seven-report deep-dive series closing every open question (behavior/interactivity, schema migration, catalog extraction, responsive/motion, spec-authorship UX, pattern harvesting, and a live September-2026 landscape refresh finding the bet confirmed but half-commoditized by Google's A2UI and Vercel's json-render). Consolidated in the [architecture synthesis](docs/research/prototype-construction/00-architecture-synthesis.md) with a falsifiable experiment roadmap (E0–E7).
- **[design-sdlc/](docs/research/design-sdlc/README.md)** — hardening the design process for an AI-native delivery loop: four live-verified answers to the questions that appear once prototypes scatter across Figma, code, hosted AI apps, and static mockups — **source of truth** (code-canonical, Figma-resident, mapping-layer maintained; nobody round-trips), **feedback** on prototypes that aren't on a canvas (rebuild the anchor and the overview; comments are now agent inputs), **governance** of prototypes outside the codebase (the ledger and the promotion gate, not the pipe), and **small-model guardrails** (a verifier, not a conscience; a 13-rung ladder split by interactive vs. automated mode). The [synthesis](docs/research/design-sdlc/00-synthesis.md) composes them into one lifecycle table and a five-step adoption order; four copy-paste templates ship with the docs.
- **[eval-tuning-loops/](docs/research/eval-tuning-loops/README.md)** — the loop that improves a generator over time: every generated prototype gets a **grade** (rank, don't score; VLMs can't see spacing, so compute it from the DOM), the grade is **reviewed** (trust the check, sample the judge, own the taste; humans agree ~85% pairwise on UI, the best judge ~66%), and the reviewed grade is **fed back** into the skill, catalog, or prompt (constraint, then example, then sentence; textual feedback is the currency) or, late and rarely, into weights. The [synthesis](docs/research/eval-tuning-loops/00-synthesis.md) composes the five stage docs into one loop table, six convergence invariants, and a four-level maturity model; four templates ship with the docs (grade record, review card, change record, weekly review).
- **[theming/](docs/research/theming/README.md)** — theming as a *computation*: the three-tier semantic token model (brand reflows / neutrals tilt / sentiment pinned), OKLCH color mutation with gamut-clamped chroma, and contrast-preserving dark↔light reversal — codified from a production design system's shipping theming engine. Four docs and three portable skills including a verified zero-dependency [reflow engine](docs/research/theming/skills/oklch-brand-reflow/oklch-engine.ts).
- **[prototype-review-overlay/](docs/research/prototype-review-overlay/README.md)** — designing a drop-in JS package for every generated prototype: **commenting** on DOM elements with a layered, regeneration-resilient anchor (the state of the art, borrowed from Hypothesis's decade-old text-anchoring work, since no vendor combines more than one anchor layer), **grading** (binary verdict, an eight-category "what was wrong" taxonomy, written to the repo's own grade store because no eval platform accepts a keyless browser write and carries a located defect at once), and **provenance** (a content-hashed stamp carrying session/model/skill identity across vibe-coding sessions, since Claude Code, Cursor, Codex, and Copilot hand hooks a session id but never a skill version). The [synthesis](docs/research/prototype-review-overlay/00-synthesis.md) composes six documents into one package architecture, one shared JSON record, and a four-stage build order from a one-week MVP to backend-requiring later tiers.

## Status & roadmap

- [x] Foundational landscape research (6 docs, ~250 sources)
- [x] Construction-file prototyping architecture research (19 docs: 5 core stages + 6-report tangential-patterns series + 7-report deep-dive series)
- [x] Curated collection: skills, rules, hooks, MCP servers, subagents & commands
- [x] Skillchains setup guide
- [x] Theming & mathematical color mutation codification (4 docs + 3 skills)
- [x] Design-SDLC process research (5 docs + 4 templates) → three new skill-resources categories: review & feedback, prototype governance, guardrails & evals
- [x] Eval-tuning loops research (6 docs + 4 templates) → eval-loops collection: grading, review, feeding back, training, loop governance
- [x] Prototype review overlay research (6 docs + synthesis + 4 templates) → prototype-review-overlay.md: anchoring, storage, grading, and packaging building blocks for a drop-in review package
- [ ] Construction-file prototyping experiments (E0 baseline → E1 vertical slice) → builder skill, catalog extractor, intent template
- [ ] Deep-dive fan-outs: prompting & aesthetic direction library, machine-readable design systems playbook, generated-UI evaluation, AI product UX patterns
- [ ] Original artifacts for identified gaps: designer-audience altitude-ladder guide, expanded design hook library, motion patterns for AI product states
