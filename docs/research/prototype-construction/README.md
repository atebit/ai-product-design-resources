# Construction-File Prototyping

## The concept

Today, when an agent builds a UI prototype, the LLM generates every line of code from scratch — hundreds of lines of React/HTML per screen, regenerated on every iteration. That's slow, expensive, and unreliable: the model re-derives the design system each time and drifts off it (hardcoded colors, invented components, inconsistent spacing).

This folder researches a different division of labor:

1. **Codify the design system as primitives.** Components, layout containers, and higher-level patterns become a machine-readable catalog — templates representative of the real components, with typed props, slots, and token-only styling.
2. **The LLM plans instead of typing.** Given the designer's intent (concept, data, flows) plus the catalog docs, the model emits a small **construction file** — a schema-validated JSON/YAML tree of pattern references and slot contents, ~2K tokens instead of ~50K of code.
3. **A deterministic builder does the expansion.** A skill (Python/shell scripts) compiles the construction file into a working prototype using the real templates. Same file in → byte-identical prototype out. On-system by construction: the builder physically cannot emit an off-token color or an invented component.
4. **Iteration is surgical.** Changes are patches to the construction file ("make the header sticky" ≈ a 60-token JSON Patch), rebuilt incrementally — with the LLM authoring freely only where judgment lives: copy, sample data, and explicitly-bounded custom code islands.

The intended payoff: **~5–10× fewer tokens per screen, ~30–50× on iteration loops, and design reliability as a structural guarantee rather than a hope.** The intended failure mode is also explicit: if fewer than ~60–70% of screens are expressible in the pattern catalog, the escape hatch dominates and plain agent-written code wins — which is why the experiment roadmap starts with a baseline to beat, not with the system itself.

## The documents

**Core architecture (00–05):** [00 — Synthesis](00-architecture-synthesis.md) assembles the full pipeline, decision points, and experiment roadmap. The five stage docs go deep: [01 — Primitive Codification](01-primitive-codification.md) (the catalog/DSL layer), [02 — Intent Spec & Context](02-intent-spec-and-context.md) (what the LLM is given), [03 — Construction File Generation](03-construction-file-generation.md) (the structured-output step), [04 — Deterministic Assembly](04-deterministic-assembly.md) (the builder), [05 — Surgical Editing & Iteration](05-surgical-editing-iteration.md) (life after v1).

**Tangential patterns (06–11):** six fields that solved "declarative spec → deterministic realization" before LLMs existed, each mined for transferable lessons: [06 — Declarative Infrastructure](06-declarative-infrastructure-patterns.md), [07 — Game Engines](07-game-engine-patterns.md), [08 — Compilers & Build Systems](08-compiler-ir-build-patterns.md), [09 — Model-Driven Engineering](09-model-driven-engineering.md), [10 — Visual Programming & Node Graphs](10-visual-programming-node-graphs.md), [11 — Constraint & Generative Layout](11-constraint-and-generative-layout.md).

## Research brief: what we've found so far

**The idea is validated — repeatedly and independently.** The industry is converging on it from the LLM side (Vercel's json-render, thesys C1, server-driven UI renderers), and six unrelated engineering fields arrived at the same authority split decades ago: humans state intent in a constrained vocabulary, a deterministic engine owns realization. ComfyUI is the live existence proof that LLMs can emit machine-executed graph files at community scale — and since LLM failures there concentrate in DAG link-wiring, our tree-shaped format dodges the hardest failure mode. Nobody has assembled the full loop as a designer-operable skill; that's the opportunity.

**The economics check out.** Atlassian measured 52% accuracy gains serving design systems as schemas; structured outputs make hallucinated component names impossible rather than catchable; prompt caching makes the catalog nearly free in context; and patch-based iteration is where the savings compound (aider's format research: 20%→61% edit reliability from diff-format choice alone).

**The design has hardened around a few load-bearing choices:**
- **Two-level grammar** — pattern-first construction files with atomic infill only inside constrained slots (Airbnb Ghost Platform's model); flat generates more reliably than deep.
- **Zod as single source of truth** — deriving the JSON Schema (for constrained decoding), the compact prompt catalog (~60% fewer tokens), and runtime validation from one definition; catalog auto-generated from source so it can't drift.
- **Codegen over runtime interpretation, one-way generation over round-trip** — generated code degrades gracefully and survives ejection; EMF's 25 years, MDA's post-mortem, and OpenAPI's "regenerate-trust death spiral" all warn against round-trip. Townscaper's invariant is the rule: *the editor writes the construction file, never the output.*
- **Ownership at file granularity** — builder-owned vs LLM-owned files, with Kubernetes-style per-path field ownership as the upgrade path; id-keyed children with protobuf-style never-reused ids for patch targeting.
- **Terraform's plan/apply as the UX** — show the designer a diff of what will rebuild before rebuilding; a state manifest with explicit drift-resolution options.
- **The builder owns layout "feel"** — spacing/responsive behavior as deterministic rules (TeX box-glue thinking); the LLM states only intent. Preset layout vocabulary, not raw constraints — Auto Layout's developer revolt is the cautionary tale.

**The honest risks, from the cautionary-tale research:** our architecture is structurally MDA-shaped, and MDA died. The survivors (low-code, spreadsheets, DSL workbenches) share three traits we must keep: narrow domain (prototypes within one design system — plausibly narrow enough), instant feedback (preview on every change), and diffable text in git. The LLM fixes MDA's decisive killer (the model-authoring bottleneck) but adds new risks: it makes drift easier and can launder misunderstanding into schema-valid-but-wrong output. One genuine gap remains unsolved: **no migration story for construction files when the pattern schema evolves** — flagged as a first-class component to design before the schema hardens.

**Next step:** the experiment roadmap in [00](00-architecture-synthesis.md) — E0 (a plain agent + design system + rules baseline that the system must beat) then E1 (a 10–15 primitive vertical slice), measured on tokens, first-pass validity, off-system violations, and judged design quality. Success is ≥5× token reduction and zero off-system violations at no quality loss; anything less, we stop.
