# AI × Product Design Resources

**Christopher Smith** — seasoned builder across design and engineering; currently building enterprise software with [Xplor](https://www.xplor.com) and some other awesome folks.

[christophersmith.io](https://christophersmith.io) 
[github.com/atebit](https://github.com/atebit)

---

Resources that make a designer's life easier when defining and executing AI workflows — across design systems, UI generation, graphic design, information architecture, animation, and interaction design.

The repo is built on a simple loop: **research the landscape → curate only what survives verification → compose it into working setups**. Everything here has been through that loop.

## What's in the repo

```
├── skillchains.md            # START HERE to set things up — composing the collection into working chains
├── skill-resources/          # The curated collection (verified picks + writeups)
│   ├── skills.md             #   14 agent skills for design work
│   ├── rules.md              #   11 rules resources + what-to-encode guide with snippets
│   ├── hooks.md              #   5 design-QA hook recipes + 5 vetted resources
│   ├── mcp-servers.md        #   12 MCP servers + the recommended stack
│   └── subagents-and-commands.md  # 11 subagents & slash commands + prompt lessons
└── docs/research/            # The research base the collection is grounded in
    ├── foundational/         #   6-doc landscape survey + synthesis (250+ sources)
    └── prototype-construction/  # 12-doc architecture study: construction-file prototyping
```

### [skillchains.md](skillchains.md) — the setup guide

How to compose the collection into five working chains — **UI generation**, **design-to-code**, **design QA & review**, **design system work**, and **research & strategy** — plus the config files involved, which pieces complement or conflict, how to adapt everything to your own design system, and how to push must-happen behavior toward determinism (hooks) instead of hope (prompts).

### [skill-resources/](skill-resources/README.md) — the curated collection

The best skills, rules, hooks, MCP servers, subagents, and commands for design work — deliberately *not* thousands of entries. Every pick was verified live: repo exists, actively maintained, contents read and honestly judged. Each file includes per-pick writeups (what it does, how it works, where it fits in the design process) and an "Evaluated but not selected" list with reasons.

### [docs/research/](docs/research/foundational/00-overview.md) — the research base

- **[foundational/](docs/research/foundational/00-overview.md)** — six landscape documents covering agentic tooling primitives, AI × design systems, UI generation, graphic design & brand, motion/IxD/prototyping, and UX research & process. The [overview](docs/research/foundational/00-overview.md) synthesizes cross-cutting themes (the AI-legibility standards stack, the altitude ladder, verification loops, the evaluation gap) and a prioritized fan-out plan.
- **[prototype-construction/](docs/research/prototype-construction/README.md)** — an original architecture for efficient prototype authoring: codify the design system as primitives, have the LLM emit a small schema-validated **construction file** instead of raw code, expand it deterministically with a builder, and iterate via surgical patches. The [folder README](docs/research/prototype-construction/README.md) explains the concept and briefs what the research has found; 12 documents cover the five pipeline stages plus a six-report tangential-patterns series (declarative infra, game engines, compilers, MDE, node graphs, constraint layout), consolidated in the [architecture synthesis](docs/research/prototype-construction/00-architecture-synthesis.md) with a falsifiable experiment roadmap (E0–E6).

## Status & roadmap

- [x] Foundational landscape research (6 docs, ~250 sources)
- [x] Construction-file prototyping architecture research (6 docs)
- [x] Curated collection: skills, rules, hooks, MCP servers, subagents & commands
- [x] Skillchains setup guide
- [ ] Construction-file prototyping experiments (E0 baseline → E1 vertical slice) → builder skill, catalog extractor, intent template
- [ ] Deep-dive fan-outs: prompting & aesthetic direction library, machine-readable design systems playbook, generated-UI evaluation, AI product UX patterns
- [ ] Original artifacts for identified gaps: designer-audience altitude-ladder guide, expanded design hook library, motion patterns for AI product states
