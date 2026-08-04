# 04 — The Deterministic Assembly Layer: Compiling a Construction File into a Working Prototype

**Scope.** This document researches the *build* stage of the proposed pipeline: an LLM has already emitted a validated construction file (JSON/YAML) describing a prototype in terms of design-system primitives; a deterministic tool must now turn that file into something a designer can open, click through, and share. It examines the two viable architectures — runtime interpretation (a renderer walks the JSON) versus codegen/compilation (the JSON is expanded into real source files) — surveys the tooling landscape for each, describes how the builder runs as an Anthropic-style agent skill with bundled scripts, works through composition mechanics (slots, layout, variants, routing, sample data), addresses determinism and regeneration semantics, catalogs prior art in full pipelines (Mitosis, Plasmic, OpenAPI Generator, Amplication/Wasp, Puck, GrapesJS, Anima/Locofy), covers preview/serving, and closes with a tradeoff analysis and recommended experiments specific to *prototyping* (not production app generation).

---

## Table of Contents

1. [The Two Architectures](#1-the-two-architectures)
   - 1.1 Option A: Runtime interpretation (server-driven-UI style renderer)
   - 1.2 Option B: Codegen / compilation to real source
   - 1.3 Option C (hybrid): interpret first, eject to code on demand
   - 1.4 Tradeoff matrix
2. [Codegen Tooling Landscape](#2-codegen-tooling-landscape)
   - 2.1 String template engines
   - 2.2 Scaffolding frameworks
   - 2.3 AST-level generation
   - 2.4 Prettier as canonicalizer
   - 2.5 Mitosis: the closest prior art
3. [Running the Builder as an Agent Skill](#3-running-the-builder-as-an-agent-skill)
4. [Composition Mechanics](#4-composition-mechanics)
5. [Determinism & Idempotency](#5-determinism--idempotency)
6. [Prior Art: Full Pipelines](#6-prior-art-full-pipelines)
7. [Preview & Serving](#7-preview--serving)
8. [Worked Example: Construction File → Assembled Output](#8-worked-example-construction-file--assembled-output)
9. [Tradeoffs & Value Analysis for the Prototyping Use Case](#9-tradeoffs--value-analysis-for-the-prototyping-use-case)
10. [Open Questions & Recommended Experiments](#10-open-questions--recommended-experiments)
11. [Source Index](#11-source-index)

---

## 1. The Two Architectures

Once the LLM has produced a construction file, there are exactly two places the "expansion" from spec to pixels can happen:

- **At runtime**, inside the browser: a generic renderer reads the JSON and calls `React.createElement` (or equivalent) against a registry of real design-system components. The JSON *is* the artifact; no source files are generated per prototype.
- **At build time**, on disk: a compiler/scaffolder expands the JSON into real `.tsx`/`.vue`/`.html` files, which are then built and served like any hand-written app. The generated source is the artifact; the JSON is its input.

These are the same two poles the industry has already explored under different names: **server-driven UI (SDUI)** vs **code generation**, or in Plasmic's vocabulary, **Loader (Headless API)** vs **Codegen** (https://docs.plasmic.app/learn/loader-vs-codegen/).

### 1.1 Option A: Runtime interpretation

**The pattern.** A JSON payload defines a component tree; a lightweight renderer inside the client interprets that schema and maps node `type` strings to real component implementations through a **registry**. This is the standard server-driven UI architecture used at scale by Airbnb ("Ghost Platform"), Shopify, Lyft, and many mobile-first companies, and it can be implemented in remarkably little code — a recursive function that switches on `node.type` and spreads `node.props` (see "Server-Driven UI in 22 lines of TypeScript", https://neciudan.dev/implementing-server-driven-ui).

The registry is the security and design-governance boundary: **components must be registered on the client, so the spec can't conjure new functionality at runtime — it can only rearrange what's already there.** This property maps *exactly* onto the design goal of the proposed system ("make design output more reliable/on-system"): if the renderer only knows `Button`, `Card`, `DataTable`, etc., an LLM literally cannot produce off-system UI, no matter what it emits. Invalid types fail loudly at validation time, not silently as bespoke CSS.

**Concrete implementations to study:**

| Tool | What it renders | Notes |
|---|---|---|
| **Puck `<Render>`** (`@puckeditor/core`, formerly `@measured/puck`; https://puckeditor.com/docs/api-reference/components/render) | A `Data` payload (`{ content: [{type, props}], root, zones }`) against a `Config` of components, each with typed `fields` and a `render` function | Open-source (MIT), React. Puck's data model — flat `content` array plus named `zones`/slots — is a proven, minimal schema for page-level composition and is probably the best off-the-shelf starting point for this project |
| **Builder.io SDK / "Gen 2" SDKs** (https://www.builder.io) | Builder's own JSON content model | Commercial; the JSON model is documented and the rendering SDKs exist for React, Vue, Svelte, etc. (themselves generated via Mitosis — see §2.5) |
| **react-jsonschema-form (RJSF)** (https://rjsf-team.github.io/react-jsonschema-form/docs/) | Forms from a JSON Schema + uiSchema | Form-domain only, but the mature reference for "schema in, widgets out," theming via widget registries (MUI, AntD, Chakra themes exist) |
| **JSON Forms** (https://jsonforms.io) | Forms from a data schema + separate UI schema (`VerticalLayout`, `Control` with `scope`) | Cleaner separation of data schema vs layout schema than RJSF — a useful design precedent for separating *content* from *arrangement* in the construction file |
| **Vercel json-render** (https://json-render.dev/docs/registry) | A UI spec against a catalog/registry, designed explicitly for *LLM-generated* specs | The newest and most directly on-point: "define a catalog of allowed components, map them to real React implementations through a registry, render the resulting spec inside a validated runtime." Built for streaming model output into live UI |
| **react-from-json**, `loserkid.io/react-dynamic-rendering`-style hand-rolled renderers | Arbitrary JSON → `React.createElement` trees | Trivial to build in-house; the value is in the registry + validation, not the recursion |

**Strengths for prototyping.**
- **Zero build step per prototype.** New prototype = new JSON file. Iteration latency is "save file, browser hot-swaps state" — sub-second.
- **The LLM's output surface is tiny and closed.** The model only ever emits the DSL; the renderer is written once by humans.
- **Trivially diffable/versionable prototypes** — a prototype is one JSON document.
- **Streaming-friendly**: a renderer can paint a partially-streamed spec (json-render is built around this).

**Weaknesses.**
- **Expressiveness ceiling.** Anything not anticipated by the registry (a bespoke micro-interaction, an odd layout) is impossible without first extending the renderer. For prototypes meant to *probe beyond* the current system, this is a real constraint.
- **Logic/state is awkward in JSON.** Conditionals, cross-component state, and event wiring need an expression mini-language (SDUI systems grow `"visibleWhen": "state.tab == 2"` dialects, which become a second programming language with worse tooling).
- **The artifact isn't code.** Engineers can't pick up the prototype and evolve it; you hand them JSON plus a renderer dependency.
- **Debugging is indirect** — stack traces point into the interpreter, not "your" code.

### 1.2 Option B: Codegen / compilation

**The pattern.** A build script reads the construction file and emits real source files — one file per screen/component, importing the actual design-system package — then formats and (optionally) type-checks the result. The output is an ordinary Vite/Next app that anyone can run, read, and edit.

Expansion happens through some mix of:
1. **Templates** — string interpolation of component skeletons (Handlebars/EJS/Jinja2 — §2.1);
2. **Structured emission** — building an AST or using a code-emitting API so output is syntactically correct by construction (ts-morph — §2.3);
3. **Normalization** — Prettier as the final canonicalization pass so output is byte-stable (§2.4).

This is the architecture of every mature "spec → app" system: OpenAPI Generator (spec → API clients/servers, via Mustache templates — §6.4), Wasp (declarative `main.wasp`/TS spec → full React+Node+Prisma app, via a Haskell compiler — §6.3), Amplication (data model → NestJS microservice), Plasmic Codegen (design → checked-in React components), and Mitosis (JSON IR → per-framework source — §2.5).

**Strengths for prototyping.**
- **No expressiveness ceiling.** Anything the target framework can do, the generator can emit — and, crucially for the "surgical authoring" idea, *the LLM can post-edit generated files* using ordinary code-editing tools it is already good at.
- **The artifact is a real codebase**: shareable, deployable (static export), evolvable into production by engineers, debuggable with normal tooling.
- **Type-checking as a free correctness oracle**: `tsc --noEmit` over generated output catches invalid prop usage that JSON Schema validation might miss (e.g., variant/prop combinations).
- **The design system is consumed natively** — generated files `import { Button } from '@acme/ds'`, so the prototype exercises the exact production components, tokens, and CSS.

**Weaknesses.**
- **A build pipeline per prototype** (install, compile, serve) — slower inner loop than pure interpretation, though Vite makes this nearly moot (§7).
- **The regeneration problem.** Once files exist on disk and someone (human or LLM) edits them, regenerating from an updated construction file can clobber edits. This is the classic codegen problem and has classic solutions (§5), but they must be designed in from day one.
- **More surface to maintain**: templates drift as the design system evolves; the generator itself needs tests.

### 1.3 Option C (hybrid): interpret first, eject to code

The options are not mutually exclusive, and the strongest reading of the prior art is that the industry keeps converging on **both, staged**:

- **Plasmic** ships Loader (runtime fetch + render, "no generated code in your repo") *and* Codegen ("generated code checked into git, reviewed, tested, deployed like any code"), positioning codegen as the "more advanced" path for when logic must attach to designs (https://docs.plasmic.app/learn/loader-vs-codegen/).
- **Builder.io** renders its JSON at runtime via SDKs *but built those SDKs with a compiler* (Mitosis) from a JSON IR.
- **GrapesJS** edits an internal component-tree model at runtime and *exports* HTML/CSS on demand.

For this project the natural hybrid is: **interpret during design iteration** (LLM emits/edits JSON, renderer shows it instantly), **compile when the prototype "graduates"** (needs custom logic, needs engineer handoff, needs the LLM to do surgical content authoring inside real files). The construction file is the single source of truth for both paths — which is precisely Mitosis's architecture, with the construction file playing the role of the IR.

### 1.4 Tradeoff matrix

| Dimension | Runtime interpretation | Codegen |
|---|---|---|
| Iteration latency | ★★★ instant (state swap) | ★★ fast (Vite HMR after file write) |
| Expressiveness | ★ registry-bounded | ★★★ full framework |
| On-system enforcement | ★★★ structurally guaranteed | ★★ guaranteed at generation; post-edits can drift |
| LLM output surface | tiny (DSL only) | DSL + optional surgical code edits |
| Token economy | best (JSON only, ever) | good (JSON + small targeted diffs) |
| Handoff to engineering | poor (JSON + runtime dep) | excellent (real source) |
| Custom logic/interactions | expression DSL (grows ugly) | native code |
| Validation story | JSON Schema | JSON Schema + tsc + ESLint |
| Regeneration problem | none (no files) | must be designed for (§5) |
| Debuggability | interpreter frames | your own stack traces |
| Maintenance burden | one renderer | templates + generator + conventions |

---

## 2. Codegen Tooling Landscape

### 2.1 String template engines

The workhorse layer for "component skeleton + holes":

- **Handlebars** (https://handlebarsjs.com) — logic-less-ish Mustache superset; partials map naturally onto "primitive templates" (a partial per design-system component). Used by Hygen (via EJS actually — see below), many in-house generators, and conceptually identical to OpenAPI Generator's Mustache layer.
- **EJS** (https://ejs.co) — full JS inside `<% %>`; more power, less discipline. This is what **Hygen** and many Plop helpers use.
- **Jinja2** (https://jinja.palletsprojects.com) — the Python ecosystem's equivalent; the natural choice if the builder script is Python (as agent-skill builders often are, §3). **Cookiecutter** is Jinja2-based.
- **Mustache** (https://mustache.github.io) — the strictest, most portable choice; OpenAPI Generator standardized on it precisely because logic-less templates keep generators honest: data shaping happens in the generator program, not the template ("Mustache is a logic-less template framework used to generate output that must conform to a structure and format we want to control" — https://openapi-generator.tech/docs/templating/).

**Guidance:** keep templates logic-less; do all conditional/loop shaping in the builder script that feeds them. This keeps templates reviewable by designers and diffable as the design system evolves.

### 2.2 Scaffolding frameworks

These wrap template engines with file-routing, prompting, and injection:

- **Plop** (https://plopjs.com) — "micro-generator framework"; Handlebars-based; actions like `add`, `addMany`, `modify` (regex injection into existing files). Best for small in-repo generators.
- **Hygen** (https://www.hygen.io) — EJS templates with frontmatter that declares the target path (`to:`) and injection points (`inject: true`, `after:`); templates live in `_templates/` beside the code. Fast, self-contained, good fit for a skill's `assets/` directory.
- **Nx generators** (https://nx.dev/docs/features/generate-code) — the most industrial option: generators run against a **virtual file system tree** (changes are staged in memory, then flushed), which gives free `--dry-run` and composability. Nx generators frequently embed **ts-morph** for AST-level edits (see the pattern in https://www.ngserve.io/nx-how-to-write-a-generator/). The virtual-tree + dry-run pattern is worth copying even outside Nx.
- **Turborepo `turbo gen`** (https://turborepo.com/docs/guides/generating-code) — Plop-config-compatible generators scoped to a monorepo workspace; lighter than Nx.
- **Cookiecutter** (https://cookiecutter.readthedocs.io) — Python/Jinja2 project templating from a `cookiecutter.json` context; the standard for whole-project scaffolds (i.e., generating the prototype app *shell* once, before per-screen generation runs).

**Fit:** the prototype shell (Vite config, router, theme provider, DS package install) is a one-time Cookiecutter/Plop-style scaffold; per-screen/per-component expansion is a custom builder script using templates directly — scaffolding frameworks add interactivity (prompts) this pipeline doesn't need, since the construction file *is* the answers file.

### 2.3 AST-level generation

When output must be syntactically guaranteed or when *modifying* existing generated files:

- **ts-morph** (https://ts-morph.com, https://github.com/dsherret/ts-morph) — a friendly wrapper over the TypeScript compiler API. Two relevant modes: (1) building files programmatically (`sourceFile.addImportDeclaration(...)`, `addFunction(...)`) so output is well-formed by construction; (2) **surgical modification** — locating a node by query ("the JSX element with `data-slot="content"`") and replacing only it. Mode 2 is the deterministic complement to "LLM surgically authors contents within containers": the LLM proposes content, a ts-morph script performs the splice at a schema-addressed location.
- **jscodeshift** (https://github.com/facebook/jscodeshift) — Facebook's codemod runner; better for *bulk transformation* of many files (migrations when the DSL schema changes version) than for generation.
- **Babel** (`@babel/types` + `@babel/generator`) — building ASTs by hand and printing them; maximal control, maximal verbosity. Rarely worth it over ts-morph for TS targets.
- **recast** — preserves formatting of untouched nodes when printing modified ASTs; important if surgical edits should produce minimal diffs.

**Pragmatic rule from the field:** template-emit whole new files (simpler, faster, reviewable); AST-edit only when touching files that already exist and must be partially preserved.

### 2.4 Prettier as canonicalizer

Determinism at the byte level is cheap: run **Prettier** (https://prettier.io) with a pinned version and config as the *last* stage of every emission. Then:
- template whitespace sloppiness stops mattering;
- template-emitted and AST-emitted code converge to one style;
- `git diff` between regenerations reflects *semantic* change only;
- "same construction file → identical bytes" becomes testable with a hash (§5).

Pin the Prettier version in the skill's lockfile — Prettier's output can change across major versions, which would silently break byte-level idempotency.

### 2.5 Mitosis: the closest prior art

**Mitosis** (https://mitosis.builder.io, https://github.com/BuilderIO/mitosis) is the single most relevant system to study, because it is *exactly* "a JSON IR for components, compiled deterministically to real framework code":

- Components are authored in a **static, analyzable subset of JSX** (`.lite.tsx`) — restricted precisely so it can be **parsed into a simple JSON structure** (the `MitosisComponent` IR).
- A **parser system** produces the IR (from `.lite.tsx`, Svelte, or **Builder.io's JSON content format** — proving JSON-native input works); a **generator system** ("serializers") emits React, Vue, Angular, Svelte, Solid, Qwik, React Native, Web Components, etc. Mitosis explicitly analogizes itself to **LLVM**: one IR, many backends (https://mitosis.builder.io/docs/overview/).
- Builder.io uses it in production to generate its own multi-framework SDKs, and its plugin hooks (`json` pre/post, `code` pre/post) show where a real pipeline needs extension points (https://mitosis.builder.io/docs/customizability/).

**Lessons for this project:**
1. **Restrict the input language until it's statically analyzable** — Mitosis's whole trick is that a *subset* is compilable; the construction-file DSL should likewise forbid arbitrary expressions except in explicitly-marked escape hatches.
2. **IR-first design**: define the JSON schema as the contract; parsers (LLM emission, future Figma import) and generators (React today, others later) both target it. This future-proofs the pipeline if the org's stack changes.
3. **Mitosis's pain points are instructive**: state/logic representation is the hard part (its `useStore`/`useState` conventions exist because *data* is easy to serialize and *behavior* is not). Expect the same: the construction file will handle structure and content well and interaction logic poorly — plan the escape hatch (§4, §9).
4. There is even prior art for wrapping Mitosis knowledge as an agent skill (https://github.com/Tyler-R-Kendrick/agent-skills/blob/main/skills/design-system/mitosis/SKILL.md).

---

## 3. Running the Builder as an Agent Skill

Anthropic's **Agent Skills** format (https://github.com/anthropics/skills, spec overview at https://agentskills.io) is a strong packaging fit because it was designed for exactly this split of labor:

> Skills bundle executable scripts precisely because "operations like sorting a large list or validating data are far more efficient and reliable via code than token generation" — the agent runs the script **without loading it into context**, producing consistent, repeatable results. (See https://www.firecrawl.dev/blog/agent-skills)

**Proposed skill layout:**

```
build-prototype/
├── SKILL.md                  # frontmatter (name, description) + workflow instructions
├── references/
│   ├── dsl-reference.md      # full DSL docs, loaded only when authoring the spec
│   └── component-catalog.md  # primitive list + props/variants (generated from DS source)
├── scripts/
│   ├── validate.py           # JSON Schema + referential checks; NEVER skipped
│   ├── build.py              # spec → files (templates in assets/), runs Prettier
│   ├── diff.py               # dry-run: what would change vs. current output
│   └── serve.sh              # boot/attach Vite dev server, print preview URL
├── assets/
│   ├── templates/            # *.hbs / *.jinja per primitive + screen + shell
│   └── schema/
│       └── construction.schema.json
```

**Workflow encoded in SKILL.md:**
1. Agent authors/edits `prototype.json` (the only creative act).
2. Agent runs `scripts/validate.py prototype.json`.
3. On success, `scripts/build.py prototype.json --out ./proto-app` (deterministic, no LLM).
4. `scripts/serve.sh` → preview URL for the designer.

**Validation before build — the critical junction.** The validator is the token-efficiency lever of the whole architecture, so it must:
- Validate against **JSON Schema** (structure, enum'd component types, per-component prop schemas — ideally *generated from the design-system TypeScript types* so it can't drift).
- Run **referential checks** schema can't express: navigation targets exist, slot names valid for the parent component, token references resolve, no orphan screens.
- **Surface errors as structured, LLM-repairable messages** — path-addressed and suggestion-bearing, e.g.:

```json
{ "ok": false, "errors": [
  { "path": "screens[0].children[2].type",
    "error": "Unknown component 'Chip'",
    "suggestion": "Closest registered primitives: 'Tag', 'Badge'" },
  { "path": "screens[1].children[0].props.variant",
    "error": "'tertiary' not a Button variant",
    "suggestion": "One of: 'primary' | 'secondary' | 'ghost'" }
] }
```

This turns the fix into a cheap, targeted patch of the JSON rather than a regeneration. The same contract applies to build-time failures (template errors, and — if enabled — `tsc` errors mapped back to spec paths via source-comment breadcrumbs in generated files: emit `/* @spec screens[0].children[2] */` markers so compiler errors are traceable to spec locations).

**Language choice:** Python (Jinja2 + `jsonschema` + subprocess to Prettier) is the lowest-friction skill-script stack; a Node builder (ts-morph, native Prettier) is better if AST-surgery and type-aware validation matter from day one. Both are legitimate; don't mix.

**Guardrail:** SKILL.md should explicitly instruct the agent to *never hand-write files inside the generated output directory* except via the sanctioned escape hatches (§5) — otherwise the LLM will helpfully "fix" generated files and break regeneration.

---

## 4. Composition Mechanics

What the construction-file schema must express, and how each mechanism assembles:

**Slots / children.** Two proven encodings:
- *Implicit single slot*: `"children": [ ...nodes ]` (Puck's `content` array).
- *Named slots*: `"slots": { "header": [...], "footer": [...] }` — required for real DS components (Card with header/body/actions, Modal with title/body/footer). Puck's `zones`/slot fields and Mitosis's named-slot handling both model this. Codegen maps named slots to either named props (`<Card header={<>...</>}>`) or compound components (`<Card><Card.Header>...`), per the DS's own convention — encode that mapping in the per-primitive template, not in the schema.

**Layout containers.** Keep layout as *first-class primitives with enum'd props*, not freeform CSS: `Stack {direction, gap, align}`, `Grid {columns, gap}`, `Split {ratio}`, `Page {maxWidth}`. JSON Forms' separation of `VerticalLayout`/`HorizontalLayout` from `Control`s (https://jsonforms.io) is the precedent: arrangement nodes vs. content nodes are different kinds. Enum'ing `gap`/`padding` to token names keeps spacing on-system by construction.

**Responsive variants.** Options in ascending complexity: (a) rely on DS components' built-in responsiveness plus responsive layout primitives (recommended for prototypes); (b) responsive prop objects `"columns": {"base": 1, "md": 3}` compiled to the DS's responsive-prop syntax or CSS; (c) per-breakpoint subtree overrides (avoid — combinatorial and rarely needed at prototype fidelity).

**Conditional / state variants.** The hard part (cf. Mitosis, §2.5). A pragmatic three-tier ladder:
1. **Named screen states**: `"states": {"empty": {...overrides}, "loading": {...}}` — compiled to a state-switcher (query param or floating toolbar in the prototype). This covers most *design* review needs without any logic language.
2. **A micro-expression grammar** for visibility/binding only (`"visibleWhen": {"var": "hasItems"}` — JSONLogic-style, not stringified JS), interpreted or compiled to ternaries.
3. **Escape hatch to code** for real logic (§5) — do not grow the JSON dialect into a programming language; that is the documented failure mode of SDUI systems.

**Page-level assembly & routing.** Top level of the spec: `"screens": [{id, route, title, children}]` plus `"navigation"` edges. Codegen target: file-based routes (one file per screen under `src/screens/`, a generated router file) — React Router or TanStack Router in the Vite shell. Interactive elements get `"onTap": {"navigate": "screen-id"}` — the one interaction primitive every clickable prototype needs, and validation checks every target exists (this is the prototype equivalent of Figma's prototype wiring).

**Sample-data injection.** Separate `"data"` block (named collections of records, optionally `"generate": {"count": 12, "shape": {...}}` expanded deterministically with **Faker seeded from a fixed seed** — unseeded Faker breaks idempotency, §5). Component props reference data by binding (`"items": {"$data": "invoices"}`). Codegen emits `src/data/*.json` fixtures plus typed imports; the interpreter path resolves bindings at render time. Keeping data out of the tree keeps token counts down and lets content be regenerated independently of structure.

---

## 5. Determinism & Idempotency

**Byte-identical regeneration.** Requirements: pinned tool versions (lockfile inside the skill), sorted iteration everywhere (never emit from unordered dict traversal), no timestamps/UUIDs/absolute paths in output (a "generated by, DO NOT EDIT" header is fine — a datestamp in it is not), seeded fake data, Prettier-as-final-pass (§2.4). Test it: CI builds every fixture spec twice and asserts directory-hash equality.

**The regeneration-vs-hand-edits problem** is the oldest problem in codegen; the established solutions, in order of preference for this project:

1. **Don't edit generated files — edit the spec.** The cleanest discipline: generated output is a build artifact, marked with `.generated.tsx` suffixes and `/* AUTO-GENERATED — edit prototype.json instead */` headers, optionally `.gitignore`d or marked `linguist-generated` so diffs collapse. Viable *only* if the escape hatch below exists.
2. **Generation Gap pattern** (Fowler; https://martinfowler.com/dslCatalog/generationGap.html): generated code and handwritten code live in **separate files linked by inheritance/composition** — "generated code should never be edited by hand, otherwise you can't safely regenerate it." Modern React translation: generator emits `InvoiceScreen.generated.tsx`; a sibling `InvoiceScreen.tsx` is scaffolded **once, never overwritten**, wraps/re-exports the generated component, and is where humans or the LLM add logic. Regeneration touches only `*.generated.*`. This is the same shape as C# `partial class` codegen conventions and Angular/EMF practice (EMF's `@generated` annotations, removable to protect a method from regeneration, are the fine-grained variant).
3. **Protected regions** (`// <custom:handlers> ... // </custom:handlers>` blocks whose contents the generator preserves by extraction-and-reinsertion). Works (EMF, many MDD tools, patent literature above) but is fragile under renames/moves; prefer file-level separation (option 2) over region-level.
4. **`.openapi-generator-ignore`-style ignore files** (OpenAPI Generator's convention, gitignore syntax): list files the generator must never overwrite. Cheap to implement; good complement to option 2.
5. **Three-way merge** (regenerate against a pristine copy of the last generation, then git-merge user changes) — powerful, complex; overkill for prototypes.

**Recommendation:** option 1 as the default posture + option 2 as the escape hatch + option 4 as the mechanism. Record a **generation manifest** (`.proto-manifest.json`: spec hash, per-file content hashes) so the builder can (a) skip unchanged outputs (build caching — with a spec-subtree→file mapping, only screens whose subtree hash changed are re-emitted; Nx's virtual-tree/computation-cache is the industrial version of this), and (b) *detect* out-of-band edits (file hash ≠ manifest hash) and refuse to clobber without `--force`, surfacing the conflict to the agent instead.

**Idempotency of injection.** Where the builder must *inject into* shared files (route table, nav registry), injection must be idempotent: regenerate the whole file from the spec (preferred) rather than append-with-markers (Plop/Hygen `inject` actions are append-oriented and double-insert unless guarded with `skip_if`/unique checks).

---

## 6. Prior Art: Full Pipelines

**6.1 Plasmic Codegen** (https://docs.plasmic.app/learn/codegen-components/). Design tool → real React source checked into git; explicitly markets the consequences: "you can review, test, deploy, and rollback design changes just as you can any code changes." Its **blackbox scheme** is a production-grade Generation Gap implementation: a fully-generated presentational `Plasmic<Name>` component plus a wrapper file generated once and owned by the developer thereafter. Also instructive: dual Loader/Codegen offering (§1.3) — evidence that one artifact model doesn't fit all consumers.

**6.2 Builder.io + Mitosis.** Covered in §2.5; the takeaway at pipeline level is that Builder's *editor* manipulates JSON, its *delivery* is runtime SDK rendering, and its *SDK maintenance* is codegen from the same IR family — all three modes coexisting around one content model.

**6.3 App-from-spec DSL generators.**
- **Wasp** (https://wasp.sh, https://github.com/wasp-lang/wasp): declarative spec (`main.wasp` DSL; since mid-2026, a **TypeScript spec** — https://wasp.sh/blog/2026/06/15/wasp-typescript-spec) compiled by a Haskell compiler into a full React+Node+Prisma app. Two lessons: (a) whole-app generation from a small declarative surface works and is exactly this project's shape one level up; (b) **Wasp abandoned its custom DSL syntax for TypeScript** under user pressure — a warning about DSL ergonomics and tooling gravity. (For an LLM-authored DSL the calculus differs — JSON needs no human ergonomics — but the human *review* experience of the spec still matters.)
- **Amplication** (https://github.com/amplication/amplication): data-model + config → NestJS/Prisma services via a plugin-based generator; notable for its regeneration story (custom code kept in designated modules; "smart git sync" merging regenerated code on a branch — the three-way-merge approach of §5 in production).
- **RedwoodJS generators** (`yarn rw g page|cell|scaffold`): not app-from-spec, but the best-known example of *convention-heavy scaffolding as a first-class workflow*, including idempotent route injection into `Routes.tsx` — the shared-file injection problem of §5 solved by convention.

**6.4 OpenAPI Generator — the mature analogy** (https://openapi-generator.tech). Twenty years of lineage (Swagger Codegen → OpenAPI Generator), 200+ targets, and the clearest architectural template for this project: **spec → normalized internal model → logic-less Mustache templates → files**, with user-overridable template dirs (`--template-dir`), an ignore file for protected outputs, and strict separation of data-shaping (in the generator) from rendering (in templates) (https://openapi-generator.tech/docs/templating/, https://openapi-generator.tech/docs/customization/). Every problem this project will hit — spec versioning, template overrides per team, generated-file headers, ignore conventions, normalization of two spec versions into one model — has a worked answer here.

**6.5 GrapesJS** (https://grapesjs.com): open-source web builder whose runtime model is a Component tree (JSON-serializable) with an **export/code-view path to HTML/CSS**; a long-standing demonstration of "runtime model, code export on demand," though its export is markup-level, not component-library-level.

**6.6 Anima / Locofy** (https://www.animaapp.com, https://www.locofy.ai): commercial Figma-to-code. Internals are proprietary, but public materials establish: Anima maps Figma layers to React/HTML/Tailwind with output quality "directly proportional to the cleanliness of the source Figma file"; Locofy uses trained "Large Design Models" for tagging/structure recognition, then a deterministic-ish builder step (plugin → cloud builder), supporting props/states/variants tagging in Figma and multiple styling frameworks. **Relevant negative lesson:** both fight an *inference* problem — recovering intent from pixels. The construction-file architecture sidesteps this entirely by making intent the input; that is its core structural advantage over design-to-code tools.

**6.7 v0 and LLM-direct generation** (https://v0.dev): the baseline being improved upon — LLM emits full React/Tailwind source per iteration. Maximum flexibility, maximum token churn, zero on-system guarantees without heavy prompting. Vercel's own trajectory is telling: alongside v0 they released **json-render** (§1.1) — a registry-validated JSON spec runtime *for constraining model-generated UI* — i.e., the same conclusion this proposal reaches.

---

## 7. Preview & Serving

**Codegen path.** A pre-scaffolded **Vite** shell (React + router + DS package, `optimizeDeps` warm) kept persistent; the builder writes into `src/`, and Vite HMR picks changes up in tens/hundreds of ms. Two refinements:
- A tiny **Vite plugin watches `prototype.json` itself** and triggers rebuild-then-HMR (`server.watcher.add()` + `handleHotUpdate`/`hotUpdate` hook — https://vite.dev/changes/hotupdate-hook), so the spec becomes hot-editable: agent edits JSON → builder runs → browser updates, no manual step.
- Keep the dev server long-lived across iterations (cold `npm install` + first boot is the only slow step; do it in the shell scaffold, not per iteration).

**Interpreter path.** Even simpler: the renderer app is static and permanent; "preview" = POST the JSON to it (or write it where the renderer fetches it) — no build at all. This is the latency argument for the hybrid (§1.3).

**Sandboxed/iframe preview.** For sharing inside docs/tools, an `<iframe sandbox>` around the served prototype; for zero-infra sharing, `vite build` → static export → any static host. WebContainers/StackBlitz-style in-browser Node (https://webcontainers.io) and Sandpack (https://sandpack.codesandbox.io) are options if the preview must run where no server can, e.g. embedding live prototypes in a design-system docs site.

**Multi-screen navigation preview** falls out of the router (§4); add a generated prototype chrome (screen switcher + state switcher overlay) as part of the shell, toggleable via query param — the equivalent of Figma's prototype UI.

---

## 8. Worked Example: Construction File → Assembled Output

**Input — `prototype.json` (excerpt):**

```json
{
  "$schema": "https://acme.dev/schemas/construction/v1.json",
  "app": { "name": "invoice-review", "theme": "acme-light" },
  "data": {
    "invoices": { "generate": { "count": 8, "seed": 42,
      "shape": { "id": "uuid", "client": "company", "amount": "money(200,9000)", "status": "pick(paid,overdue,draft)" } } }
  },
  "screens": [
    {
      "id": "invoice-list", "route": "/", "title": "Invoices",
      "states": { "empty": { "note": "no invoices yet" } },
      "children": [
        { "type": "PageHeader",
          "props": { "title": "Invoices" },
          "slots": { "actions": [
            { "type": "Button", "props": { "variant": "primary", "label": "New invoice" },
              "onTap": { "navigate": "invoice-new" } } ] } },
        { "type": "Stack", "props": { "gap": "space.400" },
          "children": [
            { "type": "DataTable",
              "props": { "items": { "$data": "invoices" },
                "columns": [
                  { "key": "client", "label": "Client" },
                  { "key": "amount", "label": "Amount", "format": "currency" },
                  { "key": "status", "label": "Status", "render": "StatusBadge" } ] },
              "onRowTap": { "navigate": "invoice-detail" } } ] }
      ]
    },
    { "id": "invoice-detail", "route": "/invoice/:id", "title": "Invoice", "children": ["…"] },
    { "id": "invoice-new", "route": "/new", "title": "New invoice", "children": ["…"] }
  ]
}
```

**Output sketch — codegen path** (builder run: validate → expand → Prettier; ~6 files):

```
proto-app/src/
├── data/invoices.json                  # 8 seeded records — identical on every build
├── routes.generated.tsx                # router from screens[].route
├── screens/
│   ├── InvoiceList.generated.tsx       # below
│   ├── InvoiceList.tsx                 # once-only wrapper (Generation Gap) — edit freely
│   └── ...
```

```tsx
/* AUTO-GENERATED from prototype.json — do not edit. @spec screens[0] */
import { PageHeader, Button, Stack, DataTable, StatusBadge } from "@acme/design-system";
import { useNavigate } from "react-router-dom";
import invoices from "../data/invoices.json";

export function InvoiceListGenerated() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Invoices"
        actions={<Button variant="primary" onClick={() => navigate("/new")}>New invoice</Button>} />
      <Stack gap="space.400">
        <DataTable
          items={invoices}
          columns={[
            { key: "client", label: "Client" },
            { key: "amount", label: "Amount", format: "currency" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
          ]}
          onRowClick={(row) => navigate(`/invoice/${row.id}`)} />
      </Stack>
    </>
  );
}
```

**Output — interpreter path:** no files; the same JSON is POSTed to the renderer app, whose registry maps `"PageHeader" → PageHeader` etc., and whose action interpreter maps `onTap.navigate` to the router. Note what the LLM emitted in either case: ~40 lines of dense JSON rather than ~200+ lines of imports, JSX, and boilerplate per screen — and every component, variant, and spacing token was validated against the catalog before anything rendered.

---

## 9. Tradeoffs & Value Analysis for the Prototyping Use Case

**Where the deterministic layer genuinely pays off:**
- **Token economy.** Boilerplate (imports, wrappers, router, fixtures, theme wiring) is the bulk of generated prototype code and is fully mechanical; moving it into templates converts per-prototype LLM cost into one-time engineering cost. Iterations become JSON patches, not file rewrites.
- **On-system reliability.** The enum'd component/prop/token vocabulary plus validation makes off-system output a *validation error* rather than a review finding. This is the strongest argument and is unique to this architecture vs. prompt-guided direct generation.
- **Reviewability of intent.** A construction file is a legible statement of *what the prototype is* — closer to a design spec than source code is — and can itself become a handoff artifact.
- **Compounding leverage.** Every improvement to templates/renderer improves all past and future prototypes on regeneration; prompt improvements to direct generation improve only future ones.

**Where it costs:**
- **Schema/template maintenance is a real product.** The catalog must track the design system (generate it from DS source or Code Connect metadata, don't hand-maintain). A stale catalog silently reintroduces off-system drift.
- **The expressiveness cliff.** Prototypes exist partly to explore *beyond* the current system. If the DSL can only express the system, novel exploration either escapes the pipeline (fine, if explicit: an `"type": "Custom"` node whose contents the LLM authors as code — surgical authoring, contained) or gets suppressed (bad: the tool quietly narrows design thinking). Design the escape hatch as a feature with a visible marker, so "how much Custom is in this prototype" is itself a design-system health metric.
- **Interaction fidelity ceiling** (runtime path especially). Navigation + states cover most review needs; bespoke micro-interactions need the code path.

**Runtime vs codegen, for prototyping specifically:** prototyping favors iteration speed and disposability (→ runtime), but *this* proposal's stated goals also include reliability, DS-native rendering, and surgical LLM authoring inside real structure (→ codegen). The recommended posture is the **hybrid staged on prototype maturity** (§1.3): interpret while the conversation with the designer is live; compile when the prototype needs logic, engineer handoff, or LLM code-surgery. Because both consume the same construction file, this is an output-mode flag, not two systems. If only one can be built first, **build codegen first**: it degrades gracefully (worst case, you shipped a very good scaffolder), its artifacts are independently useful, and an interpreter can be added later against the same schema — whereas an interpreter-first system that hits the expressiveness ceiling has no exit.

---

## 10. Open Questions & Recommended Experiments

**Open questions**
1. **Schema grain.** Are primitives atomic DS components only, or also pattern-level containers (SettingsPage, ObjectHeader+Tabs)? Pattern-level nodes slash token counts and raise on-system-ness further, but multiply catalog maintenance. (Likely answer: both tiers, patterns compiled *into* primitive trees so codegen has one target.)
2. **How is the catalog produced?** Hand-written vs. extracted from DS TypeScript types vs. Figma Code Connect mappings. Extraction is the only non-rotting option; feasibility depends on DS prop-type hygiene.
3. **Where does interaction logic live** at each fidelity tier — and at what point does a prototype's `Custom`-node ratio signal "stop speccing, start coding"?
4. **Spec evolution.** When `construction.schema.json` v2 lands, are v1 specs migrated by codemod (jscodeshift-for-JSON), by an LLM pass, or supported forever via normalization (the OpenAPI 2→3 approach)?
5. **Does surgical AST-editing by script (LLM proposes content, ts-morph splices at schema-addressed locations) beat letting the LLM edit generated files directly** with manifest-based clobber detection? The former is safer, the latter is simpler.
6. **Multi-target future**: is a second framework target (e.g., SwiftUI for native prototypes) plausible enough to justify Mitosis-style IR discipline now?

**Recommended experiments (in order)**
1. **Thin vertical slice (1–2 weeks).** 10-primitive catalog, JSON Schema, Python builder (Jinja2 + Prettier), Vite shell, one flow (list→detail→create). Measure against direct LLM generation of the same flow: tokens per first render, tokens per iteration, wall-clock per iteration, count of off-system violations.
2. **Idempotency harness (days).** CI: every fixture spec built twice → directory-hash equal; mutate one screen → assert only that screen's files change.
3. **Error-repair loop test.** Feed the LLM deliberately broken specs + validator output; measure single-shot repair rate. This calibrates how much validator-message engineering (§3) matters.
4. **Interpreter spike on the same schema (days).** A Puck-config or json-render registry over the identical component set; A/B the *designer experience* of iteration latency vs. the codegen path to decide whether the hybrid is worth its second head.
5. **Escape-hatch ergonomics.** One prototype requiring a bespoke interaction; implement via `Custom` node + Generation Gap wrapper; observe whether regeneration preserves it and whether the LLM respects the boundary.
6. **Catalog extraction spike.** Script that derives `component-catalog.md` + prop schemas from the real DS package's `.d.ts`; measure coverage and drift risk.

---

## 11. Source Index

- Plasmic Loader vs Codegen — https://docs.plasmic.app/learn/loader-vs-codegen/ ; Codegen components guide — https://docs.plasmic.app/learn/codegen-components/
- Puck (visual editor for React; `<Render>`, Data model, component Config) — https://puckeditor.com/docs/api-reference/components/render , https://puckeditor.com/docs/integrating-puck/component-configuration , https://github.com/puckeditor/puck
- Mitosis (JSON IR → multi-framework codegen) — https://mitosis.builder.io/docs/overview/ , https://github.com/BuilderIO/mitosis , customization/plugins — https://mitosis.builder.io/docs/customizability/
- Server-driven UI minimal implementation — https://neciudan.dev/implementing-server-driven-ui ; SDUI vs OTA overview — https://revopush.org/react-native-ota-and-server-driven-ui
- Vercel json-render (registry-validated LLM-generated UI) — https://json-render.dev/docs/registry , analysis — https://blog.logrocket.com/vercel-json-render-dynamic-ui/
- react-jsonschema-form — https://rjsf-team.github.io/react-jsonschema-form/docs/ ; JSON Forms — https://jsonforms.io ; comparison — https://dev.to/yanggmtl/schema-driven-forms-in-react-comparing-rjsf-json-forms-uniforms-formio-and-formitiva-2fg2
- OpenAPI Generator templating & customization — https://openapi-generator.tech/docs/templating/ , https://openapi-generator.tech/docs/customization/
- Wasp (spec-compiled full-stack apps; TS spec announcement) — https://wasp.sh , https://wasp.sh/blog/2026/06/15/wasp-typescript-spec , https://github.com/wasp-lang/wasp
- Amplication — https://github.com/amplication/amplication
- Nx generators (virtual tree, dry-run) — https://nx.dev/docs/features/generate-code ; ts-morph-in-Nx pattern — https://www.ngserve.io/nx-how-to-write-a-generator/
- ts-morph — https://ts-morph.com , https://github.com/dsherret/ts-morph ; jscodeshift — https://github.com/facebook/jscodeshift
- Scaffolders: Plop — https://plopjs.com ; Hygen — https://www.hygen.io ; Cookiecutter — https://cookiecutter.readthedocs.io ; Turborepo gen — https://turborepo.com/docs/guides/generating-code
- Generation Gap pattern (Fowler) — https://martinfowler.com/dslCatalog/generationGap.html
- Anthropic Agent Skills (SKILL.md, bundled scripts, determinism rationale) — https://github.com/anthropics/skills , https://www.firecrawl.dev/blog/agent-skills , https://agentskills.io
- Vite HMR / hotUpdate hook — https://vite.dev/changes/hotupdate-hook
- Design-to-code comparisons (Anima/Locofy/Builder.io) — https://www.pixelperfecthtml.com/figma-to-code-plugins-anima-vs-locofy-vs-hand-coding/ , https://medium.com/@mehrnooshakbarizadeh/generative-ai-for-front-end-development-comparing-anima-locofy-ai-and-vercel-v0-c2feb4c2eeea
- GrapesJS — https://grapesjs.com ; Builder.io — https://www.builder.io
