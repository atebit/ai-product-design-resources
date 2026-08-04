# Construction-File Prototyping: Architecture Synthesis

**Purpose:** Synthesis of the five-part research series on a proposed architecture for efficient AI prototype authoring: codify the design system as primitives, have the LLM emit a small structured **construction file** (JSON/YAML) instead of raw code, expand it deterministically with a builder script, and let the LLM edit surgically within that structure afterward. This doc assembles the end-to-end pipeline, the verdict on feasibility, the key decision points, and the experiment roadmap.

**The series:**

| Doc | Stage |
|---|---|
| [01 — Primitive Codification](01-primitive-codification.md) | The DSL/schema layer: what primitives are, how to encode them, how to keep them in sync |
| [02 — Intent Spec & Context](02-intent-spec-and-context.md) | Capturing intent/data/concept; serving the catalog docs to the model |
| [03 — Construction File Generation](03-construction-file-generation.md) | The structured-output step: format choice, validity enforcement, token economics |
| [04 — Deterministic Assembly](04-deterministic-assembly.md) | The builder: runtime interpretation vs codegen, skills packaging, determinism |
| [05 — Surgical Editing & Iteration](05-surgical-editing-iteration.md) | The hybrid split, patch-based iteration, source-of-truth management |

**Tangential-pattern series** — domains that solved "declarative spec → deterministic realization" long before LLMs, each report ending in a lessons-mapping onto this architecture:

| Doc | Domain | What it contributes |
|---|---|---|
| [06 — Declarative Infrastructure](06-declarative-infrastructure-patterns.md) | Terraform, Kubernetes, Nix/Bazel, GitOps, CI/CD YAML | Plan/apply previews, state files & drift resolution, field ownership, validation chains, the "no logic in the spec" rule |
| [07 — Game Engines](07-game-engine-patterns.md) | Prefabs, scene formats, USD, ECS, procgen, asset pipelines | Sparse-delta overrides, opinion layering, WFC-style slot constraints, stable GUIDs, merge tooling, editor-writes-the-spec invariant |
| [08 — Compilers & Build Systems](08-compiler-ir-build-patterns.md) | IRs, incremental compilation, source maps, hermetic builds, schema codegen | Construction file as IR, click-to-source provenance, Salsa-style incremental rebuild, protobuf-style stable ids, verify-before-build |
| [09 — Model-Driven Engineering](09-model-driven-engineering.md) | MDA/UML post-mortem, DSL workbenches, EMF, low-code, spreadsheets | The cautionary tale: why MDA failed, why survivors narrowed the domain; ten binding lessons; the schema-migration gap |
| [10 — Visual Programming & Node Graphs](10-visual-programming-node-graphs.md) | Blueprints, Blender/Houdini nodes, ComfyUI | ComfyUI as the live existence proof; bottom-up pattern harvesting; escape-hatch ladders; trees beat DAGs for LLM generation |
| [11 — Constraint & Generative Layout](11-constraint-and-generative-layout.md) | Auto Layout, parametric CAD, shape grammars, TeX, diagrams-as-code | Preset layout vocabulary over raw constraints; loud-and-local invalidation; spacing "feel" as builder-owned badness function |

---

## Verdict up front

**The idea is sound, well-precedented, and the industry is independently converging on it.** Server-driven UI (Airbnb Ghost Platform), Vercel's json-render ("catalog-constrained UI generation"), thesys C1, Builder.io's Mitosis (JSON IR → multi-framework codegen), and Puck/Plasmic/Builder data models are all partial implementations of the same insight. Nobody has assembled the full loop — primitives + intent spec + constrained generation + deterministic build + patch iteration — as a designer-operable skill. That assembly is the opportunity.

The two claimed benefits both check out, with numbers:

- **Token churn:** emitting a ~2K-token construction file instead of ~50K tokens of code is a ~5–10× saving per screen; patch-based iteration (~60-token JSON Patch for "make the header sticky" vs regenerating a full file) is ~30–50×. Prompt caching makes the primitive catalog nearly free to keep in context.
- **Reliability:** with provider-native structured outputs, component types are enum-constrained — a hallucinated component name becomes *impossible*, not a bug to catch. Every construction file is schema-validated before a single file is built, and the builder guarantees on-system output (tokens, real components) by construction.

The honest caveat (doc 05): the architecture only pays off when **>60–70% of screens are expressible in the pattern library**. Below that, the escape hatch dominates and you've built a compiler for the minority case. Hence experiment E0: benchmark against a plain agent-edits-code baseline with a good design system + rules, and keep the whole thing falsifiable.

---

## The pipeline, end to end

```
┌─────────────┐   ┌──────────────┐   ┌───────────────┐   ┌─────────────┐   ┌────────────┐
│ 1. CATALOG   │→→│ 2. INTENT     │→→│ 3. CONSTRUCTION│→→│ 4. BUILD     │→→│ 5. ITERATE  │
│ primitives,  │   │ intent.yaml:  │   │ LLM emits      │   │ deterministic│   │ JSON Patch  │
│ patterns,    │   │ concept, data,│   │ schema-valid   │   │ expansion to │   │ edits; LLM  │
│ tokens as    │   │ flows         │   │ JSON tree of   │   │ code; preview│   │ authors slot│
│ Zod schemas  │   │               │   │ pattern refs   │   │ server       │   │ contents    │
└─────────────┘   └──────────────┘   └───────────────┘   └─────────────┘   └────────────┘
       ↑ generated from source (docgen, stories, Code Connect) — never hand-maintained
```

### Stage 1 — Catalog (doc 01)

A four-layer vocabulary: **DTCG tokens → primitives (Button, Input…) → layout containers (Stack, Grid, Split…) → patterns/screens (SettingsForm, ObjectList, DetailHeader…)**. Construction files speak **pattern-first with atomic infill** — a two-level grammar where whole screens are mostly pattern references, and atomic primitives appear only inside constrained slots (mirrors Airbnb's screens/sections model; flat lists generate more reliably than deep trees).

- **Zod as single source of truth** — derives (a) JSON Schema for constrained decoding, (b) a compact TypeScript-style catalog rendering for the prompt (~60% fewer tokens than JSON Schema per BAML's data), (c) runtime validation in the builder.
- **Styling by token reference only** — no raw values in construction files.
- **Catalog generated from source** (react-docgen-typescript, cva variant extraction, Storybook stories, Figma Code Connect/Variables) so primitives cannot drift from the real system.
- **Escape hatch:** a `CustomBlock` code island; its usage telemetry is the catalog's health metric (frequent islands = missing pattern).

### Stage 2 — Intent (doc 02)

A designer-friendly `intent.yaml`: concept, audience, screens, flows, and **sample data that doubles as the build fixture** (seeded faker / json-schema-faker so output is deterministic). Borrow the specify/plan split from Spec Kit and slot-filling clarification where the model's questions accrue answers *into the spec file*, not into chat scrollback.

Context serving rules: small catalogs (≤~20–30 primitives) go fully in-context (cheap under prompt caching); large catalogs get an index + on-demand retrieval (MCP query or skill references) — context-rot research shows degradation by ~50K tokens. **Few-shot examples of valid construction files are the strongest teacher** — better than more schema prose.

### Stage 3 — Construction file (doc 03)

**Schema-enforced JSON as the wire format** (provider-native structured outputs; Outlines/GBNF if self-hosted), converted to YAML for human review and git diffs. Terse custom DSLs save ~20–30% tokens but lose enforcement and underperform on correctness (TOON benchmarks) — not worth it. Schema design: flat where possible, enums for component types, reasoning-first field order, descriptions on every field. Layered defense: enum constraints → schema validation → semantic lint (slot rules, nesting rules) → repair loop with actionable errors.

### Stage 4 — Build (doc 04)

**Build the codegen path first** (construction file → real React/TSX via templates + ts-morph splicing), because generated code degrades gracefully — it survives ejection from the system, is inspectable, and permits surgical authoring. A runtime interpreter (Puck-style renderer) can be added later for live-editing speed; the hybrid stages on prototype maturity (interpret while iterating, compile on graduation).

Determinism mechanics: pinned Prettier as canonicalizer, seeded fake data, and a **generation manifest** (hash of each generated file) for clobber detection. Packaged as an agent skill: SKILL.md + bundled Python/Node builder scripts — validate, build, serve preview (Vite), surface errors back to the model in actionable form.

### Stage 5 — Iterate (doc 05)

The hybrid split: builder owns structure (layout, containers, instances, tokens); LLM owns content (copy, sample data, custom islands, edge-case styling) — at **file granularity** (builder-owned vs LLM-owned files), which is far more robust than in-file protected regions.

- **Id-keyed children, not positional arrays** — so patches survive reordering.
- **JSON Patch (RFC 6902) for edits** — evidence: aider's 20%→61% jump from diff-format choice; JSON Whisperer's ~31% token savings within 5% of regen quality; trustcall's corrective-patch loop.
- **Construction file stays source of truth**; drift is detected via the manifest and resolved with a model-assisted "re-adopt" step — full code→construction round-trip parsing is not worth building.
- Every iteration passes the same gate: schema validate → build → screenshot → a11y check (wired as hooks).

---

## Cross-domain lessons (from the tangential series)

Six unrelated fields were surveyed for patterns; they converge with striking consistency. The recurring findings, strongest first:

1. **Every mature field arrived at the same authority split.** Humans/LLMs state intent in a constrained vocabulary; a deterministic engine owns realization (Terraform providers, game-engine bakes, TeX's optimizer, diagram auto-layout, K8s controllers). The architecture's core bet is independently validated six times (docs 06, 07, 08, 10, 11).

2. **Show a plan before you apply.** Terraform's plan/apply split is the single most transferable UX pattern: on any construction-file change, show the designer a diff of what will be rebuilt before rebuilding (06).

3. **Stable identity is the load-bearing detail.** Protobuf field numbers, Unity GUIDs, USD prims — every system that survives schema evolution and patching does it with immutable, never-reused ids. Our id-keyed children decision (05) is necessary but not sufficient: add reserved-id rules and a CI breaking-change check (07, 08).

4. **The spec must stay logic-free and diffable-text.** CI/CD YAML sprawl shows what happens when declarative specs grow conditionals; MDA's undiffable model formats killed collaboration; binary node-graph formats forced whole ecosystems into file-locking. Hard rule: no logic in the construction file, ever — loops/conditions live in the builder or the escape hatch (06, 09, 10).

5. **One-way generation + re-adopt beats round-trip.** EMF's 25 years, MDA's round-trip breakdown, and OpenAPI's regenerate-trust death spiral all point the same way; docs 04/05 chose correctly. Townscaper's invariant is the clean formulation: *the editor writes the construction file, never the output* (07, 08, 09).

6. **Overrides are sparse deltas with explicit verbs.** Unity prefab variants and USD opinion layers model slot customization as recorded deltas with Apply/Revert operations — richer than raw patches and directly adoptable (07).

7. **Fail loudly and locally on invalidation.** Parametric CAD's regeneration hell teaches that when an upstream edit breaks downstream references, the error must name the exact node and offer local repair — not cascade silently (11).

8. **Provenance enables the killer preview feature.** Source-map thinking (`data-cf-node` attributes + a manifest sidecar) gives click-any-element-in-preview → jump-to-construction-file-node (08).

9. **Grow the pattern library bottom-up.** Node-graph communities harvest reusable groups from repeated fragments; mine recurring construction-file subtrees for pattern candidates instead of designing the catalog top-down (10).

10. **ComfyUI is the existence proof; trees are easier than graphs.** LLMs generate ComfyUI's JSON workflows at community scale today, and the research shows their failures concentrate in link-level DAG wiring — a tree-shaped construction file dodges that failure mode entirely (10).

**New risk surfaced (09):** there is no construction-file **migration story** when pattern schemas evolve — the one real gap the original five docs didn't cover. Treat schema versioning + migration tooling (protobuf-style reserved ids, codemod-style migrators) as a first-class component before E1 hardens the schema.

## Key decision points (the short list)

1. **Pattern granularity** — pattern-first (bigger blocks, fewer errors, lower expressiveness) vs atomic-first. Recommendation: two-level grammar; A/B in experiment 2.
2. **JSON vs YAML vs DSL** — enforced JSON wire format + YAML review surface. Resolved unless the bake-off says otherwise.
3. **Runtime interpreter vs codegen** — codegen first; interpreter later if live-editing latency matters.
4. **Catalog in context vs retrieved** — size-dependent; threshold ~20–30 primitives / ~50K tokens.
5. **Patch vs regenerate on iteration** — patch for small edits, regen for restructures; let the model choose with both tools available.
6. **When NOT to use this** — novel/expressive one-offs, motion-heavy work, <60% pattern coverage. Route those to the normal agent-writes-code path; the skill should detect and say so.

---

## Experiment roadmap (consolidated)

Ordered so each result can kill or redirect the project cheaply:

- **E0 — Baseline (doc 05):** competent agent + design system + rules files editing code directly, on 10 representative screens. Measure tokens, wall-clock, off-system violations, a11y errors. This is the bar to beat.
- **E1 — Vertical slice (docs 01/04):** 10–15 primitives + 3 patterns, Zod catalog, JSON construction file, Python builder, Vite preview. Same 10 screens. Compare against E0.
- **E2 — Granularity A/B (doc 01):** pattern-first vs atomic-first construction files; measure validity rate and design quality.
- **E3 — Format bake-off (doc 03):** enforced-JSON vs YAML vs terse DSL on the same screens; validity, tokens, quality.
- **E4 — Spec ablation (doc 02):** full intent.yaml vs one-line prompt; how much does structured intent actually buy?
- **E5 — Iteration economics (doc 05):** 20 sequential edits via patches vs full regen vs direct code editing; cumulative tokens + drift count.
- **E6 — Escape-hatch pressure (docs 01/05):** deliberately off-catalog requests; measure CustomBlock rate and failure gracefulness.

**Success criteria vs E0:** ≥5× token reduction, ≥90% first-pass schema validity, zero off-system token/component violations, and design quality judged no worse. If E1 can't beat E0 on at least tokens + violations, stop.

---

## What this becomes in the repo

If the experiments validate, this architecture ships as a resource set: a **catalog-codification guide + extractor scripts** (Stage 1), an **intent.yaml template** (Stage 2), a **construction-file schema starter** (Stage 3), a **builder skill** (SKILL.md + scripts, Stage 4), and **iteration hooks** (validate/build/screenshot/a11y, Stage 5). It also directly feeds the Tier-1 topics in the [foundational overview](../foundational/00-overview.md): skills, hooks, and the altitude-ladder framework.
