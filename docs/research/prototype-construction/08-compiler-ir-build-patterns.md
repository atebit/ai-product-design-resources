# 08 — Compiler, IR, and Build-System Patterns

**Scope:** The construction-file architecture — LLM emits a small schema-validated spec, a deterministic builder expands it into a working prototype, iteration happens via surgical patches — is structurally a *compiler pipeline*: source language (intent), intermediate representation (construction file), lowering (builder), object code (React/TSX), debug info (provenance maps), incremental rebuild (patch → partial rebuild). Compilers and build systems are the discipline that spent fifty years industrializing "high-level spec → deterministic artifact," and nearly every hard problem in our architecture has a named, battle-tested analogue there. This document deep-dives seven pattern families as they work in their home domains — multi-level IRs and progressive lowering, query-based incremental compilation, source maps and provenance, deterministic/hermetic builds, macro hygiene and staged codegen, schema-first codegen ecosystems, and typed-IR validation — then maps each to construction-file prototyping, with failure stories and open questions.

---

## Table of contents

1. [Intermediate representations & progressive lowering](#1-intermediate-representations--progressive-lowering)
2. [Incremental & query-based compilation](#2-incremental--query-based-compilation)
3. [Source maps & provenance](#3-source-maps--provenance)
4. [Deterministic & hermetic builds](#4-deterministic--hermetic-builds)
5. [Macro systems & codegen hygiene](#5-macro-systems--codegen-hygiene)
6. [Schema-first codegen ecosystems](#6-schema-first-codegen-ecosystems)
7. [Type systems as validation](#7-type-systems-as-validation)
8. [Lessons for construction-file prototyping](#8-lessons-for-construction-file-prototyping)
9. [Failure stories & tradeoffs](#9-failure-stories--tradeoffs)
10. [Open questions](#10-open-questions)

---

## 1. Intermediate representations & progressive lowering

### 1.1 What an IR is for

Every serious compiler inserts one or more intermediate representations between source and target. The IR exists to be a *stable meeting point*: N frontends and M backends meet at one representation instead of N×M translators. But the deeper function of an IR is that it is a representation **designed for transformation** — analyzable, verifiable, and manipulable in ways the source language is not.

**LLVM IR** ([LangRef](https://llvm.org/docs/LangRef.html)) is the canonical modern example, and three of its design decisions matter directly to us:

1. **Three isomorphic forms.** LLVM IR exists as an in-memory compiler IR, an on-disk bitcode format (`.bc`), and a human-readable textual assembly (`.ll`) — and the spec requires all three to be *equivalent*, with `llvm-as`/`llvm-dis` round-tripping between them losslessly. This is why LLVM tooling composes: any pass can be debugged by dumping text, any text can be hand-edited and re-fed, test cases are just `.ll` files in a repo. The lesson generalizes: **an IR without a canonical, round-trippable, diffable text form cannot accumulate an ecosystem** of tools, tests, and human review.
2. **SSA (static single assignment).** Every value is defined exactly once; uses refer to that unique definition. SSA makes def-use chains explicit — you can always answer "where did this value come from" and "who consumes it" in O(1). It is less an optimization than a *referential integrity discipline*: names are stable identities, not mutable slots.
3. **The verifier is a separate, mandatory pass.** LLVM explicitly distinguishes "what the parser accepts" from "well-formed IR" — e.g., `%x = add i32 %x, %x` parses fine but is ill-formed because the definition doesn't dominate its uses. The verifier pass runs after every transformation in debug builds, so a broken pass is caught at the point of breakage, not three passes later as a miscompile. Syntactic validity and semantic well-formedness are *different layers*, checked by different machinery.

### 1.2 MLIR: dialects and progressive lowering

LLVM IR's weakness is that it is *one* level of abstraction — low-level, target-independent, but domain-blind. Machine-learning compilers (TensorFlow's XLA era) discovered that lowering `tensor.matmul` straight to LLVM IR throws away the structure that high-level optimizations need. **MLIR** (Multi-Level Intermediate Representation, [mlir.llvm.org](https://mlir.llvm.org/), Lattner et al., CGO 2021) was the response, and its architecture is the single most relevant compiler artifact for our project:

- **Dialects.** MLIR is not one IR but a *framework for defining IRs*. A dialect is a namespaced set of operations, types, and attributes (`tf.`, `linalg.`, `affine.`, `scf.`, `llvm.`). Dialects coexist in the same module — a function can contain `linalg.matmul` next to `arith.addf`. The [MLIR Rationale](https://mlir.llvm.org/docs/Rationale/Rationale/) frames this as the core bet: represent computation *at the level where its structure is still visible*.
- **Progressive lowering.** Compilation is a staircase, not a cliff: `tf → mhlo → linalg → affine/scf → llvm`. Each lowering step converts operations from a higher dialect to a lower one via declarative rewrite patterns, and each step is small enough to verify. The [Linalg rationale](https://mlir.llvm.org/docs/Rationale/RationaleLinalgDialect/) is explicit that this was learned from failure: prior systems (including LLVM-only pipelines) suffered from "premature lowering" — once you drop to loops and pointers, you can never recover the fact that this *was* a matmul. **Information destroyed by lowering is unrecoverable; therefore lower as late as possible, and keep every intermediate level inspectable.**
- **Verification per dialect.** Each dialect defines its own invariants (op verifiers, type constraints), so a module is verifiable at *every* stage of lowering, not just at the ends.
- **Round-trippable text at every level.** Like LLVM, every MLIR module prints to canonical text and re-parses, at any mixture of dialects. Test suites are textual IR before/after pairs checked with FileCheck.

### 1.3 WebAssembly: an IR designed for validation-first consumption

**Wasm** is instructive from the opposite direction: it is an IR designed to be *received from an untrusted producer* — which is precisely our situation, since the LLM is an untrusted producer of construction files. Design choices from the [Wasm Rationale](https://github.com/WebAssembly/design/blob/main/Rationale.md):

- **Structured control flow only.** No arbitrary gotos — only nested `block`/`loop`/`if`. This makes validation a *single linear pass* (no fixpoint iteration like JVM bytecode verification) and lets engines decode directly into SSA. Constraining the producer's expressiveness bought the consumer cheap, total verification.
- **Validation is total and mandatory.** Every module is fully validated before instantiation; there is no "trust me" path. Validation is specified formally (a type system over the instruction sequence), so every engine rejects exactly the same ill-formed modules.
- **Determinism as a design goal.** Wasm execution is deterministic with a small, explicitly enumerated list of exceptions (NaN bit patterns, resource exhaustion). The [design docs](https://webassembly.org/docs/security/) treat nondeterminism as a budget to be spent knowingly, not an accident.

### 1.4 What makes a good IR — checklist distilled

From LLVM/MLIR/Wasm plus the general literature, a good IR is:

| Property | Meaning | Our analogue |
|---|---|---|
| **Closed vocabulary** | Ops come from a defined set with defined semantics | Component/pattern enums from the catalog |
| **Verifiable** | Well-formedness is decidable and checked by a separate verifier, beyond parse | Schema validation + semantic lint (slot rules, nesting) |
| **Round-trippable text** | Canonical, diffable, hand-editable serialization equivalent to the in-memory form | JSON wire ↔ YAML review surface; canonical key order |
| **Stable names/identities** | SSA-ish: every entity has one durable identity that references point at | Id-keyed nodes (doc 05), not positional paths |
| **Right altitude, or multiple altitudes** | Preserves domain structure needed by its transformations; lowers progressively | Pattern-level vs primitive-level layers (§8.1) |
| **Explicit effects/escapes** | Anything outside the closed world is marked, not smuggled | `CustomBlock` islands as declared escape hatches |
| **Designed for its consumers** | Cheap to validate/transform for the machine, legible for the human | Flat two-level grammar; terse in tokens, reviewable in YAML |

The construction file *is* an IR: it sits between design intent (source language) and TSX (object code), it is emitted by an unreliable frontend (the LLM), consumed by a deterministic backend (the builder), and it must be verifiable, diffable, and patchable. Framing it as an IR — rather than as "a config file" — imports the whole discipline above.

---

## 2. Incremental & query-based compilation

### 2.1 rustc's red-green algorithm

The Rust compiler is architected as a **query system**: instead of fixed passes over the whole program, computations like `type_of(def_id)` or `borrowck(def_id)` are memoized queries that call other queries, forming a dependency DAG recorded at runtime. Incremental compilation ([rustc dev guide: incremental compilation in detail](https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html)) works by persisting that DAG plus result fingerprints between sessions, then running the **red-green algorithm**:

- On a new session, a query node is **green** if its result is unchanged from last time, **red** if changed.
- To decide a node's color *without recomputing it*, try to mark it green: check each of its dependencies (recursively). If all deps are green, the node is green — reuse the cached result, **never execute the query**.
- If some dep is red, execute the query, then compare the new result's fingerprint (a stable hash) to the cached one. If equal, the node is *still green* despite a red input — this is the crucial **early cutoff** (also called firewalling): a whitespace edit changes the source text (red), but the parsed HIR of untouched functions fingerprints identically (green), so typechecking, borrowck, and codegen downstream are all reused.

Two supporting mechanisms matter: **stable identifiers** (`DefPath` — a path-like ID for each item that survives edits elsewhere in the file, unlike byte offsets or array indices) and **stable fingerprints** (hashes computed over a form that ignores irrelevant detail like spans). Without stable IDs, every edit renumbers everything and nothing can ever be green.

### 2.2 Salsa: the reusable library form

[Salsa](https://github.com/salsa-rs/salsa) extracts rustc's design into a general Rust library ("strongly inspired by rustc's query system, down to the red/green algorithm" — [rustc dev guide on Salsa](https://rustc-dev-guide.rust-lang.org/queries/salsa.html)). You declare **inputs** (set explicitly, revision-stamped) and **derived queries** (pure functions of inputs and other queries); Salsa tracks dependencies automatically during execution and implements memoization + early cutoff. It powers **rust-analyzer**, where the workload is exactly ours: a long-lived session, a big mostly-stable context, and a stream of small edits, each of which should invalidate only a sliver of derived state. The design lesson from rust-analyzer's experience: derive *everything* from inputs through queries — never cache outside the system — and keep queries fine-grained enough that edits don't red-flag giant monolithic results.

### 2.3 Roslyn: immutable trees with sub-tree reuse

The .NET Roslyn compiler attacks incrementality at the syntax layer with its (confusingly homonymous) **red-green trees** ([Roslyn design doc](https://github.com/dotnet/roslyn/blob/main/docs/compilers/Design/Red-Green%20Trees.md), [Eric Lippert's explanation](https://ericlippert.com/2012/06/08/red-green-trees/)) — a different mechanism from rustc's red-green *algorithm*:

- **Green nodes** are immutable, parent-free, position-free (they store only widths), built bottom-up, and freely *shared* between trees.
- **Red nodes** are a lazily-built facade over green nodes adding parents and absolute positions.
- On an edit, the incremental parser reparses only the region intersecting the edit and builds a new tree that **reuses almost all existing green nodes**; a new root is cheap because unchanged subtrees are shared by reference.
- Trees are **full fidelity**: every character, including whitespace, comments, and *malformed syntax*, is represented — so the tree round-trips to the exact source text.

The transferable ideas: immutability + structural sharing make "new version of the world" cheap; width-relative (not absolute) positioning localizes the damage of an edit; and error-tolerant full-fidelity representation means the IDE keeps working on broken input — the analogue of our repair loop needing to hold a *partially invalid* construction file without collapsing.

### 2.4 Coarser-grained industrial incrementality

- **TypeScript `--incremental`** persists a `.tsbuildinfo` file describing the project's file-level dependency graph and per-file version hashes; watch mode recompiles changed files and their transitive dependents ([TypeScript incremental builds](https://deepwiki.com/microsoft/TypeScript/8-incremental-and-project-builds)). Known failure mode: the state file drifting from reality (renames, version skew), fixed by deleting it — i.e., **every incremental system needs a cheap "nuke the cache and rebuild from scratch" escape**, and the from-scratch build must be the semantics-defining path.
- **esbuild/Vite watch modes** hold a context object and rebuild on change ([esbuild incremental discussion](https://github.com/evanw/esbuild/issues/1049)); Vite goes further by not bundling at all in dev — native ESM means an edit invalidates exactly one module, and HMR patches it into the running page. The pattern: in the inner loop, *skip lowering stages entirely* (serve a more interpreted form), and reserve full compilation for the outer loop. This is precisely doc 04's interpret-while-iterating / compile-on-graduation hybrid, discovered independently by the bundler ecosystem.
- **Build-system theory:** the paper *Build Systems à la Carte* (Mokhov, Mitchell, Peyton Jones; ICFP 2018) decomposes all build systems into a **scheduler** (how to order rebuilds: topological like Make, suspending like Excel/Shake) × a **rebuilder** (how to decide staleness: dirty bits, verifying traces like Salsa, constructive traces like Bazel's cloud cache). It's the cleanest map of the design space if we build our own invalidation logic.

### 2.5 Relevance

A construction-file patch is an *input diff with known shape* — far better information than a text edit. `replace /nodes/hero-3/props/title` should invalidate: regeneration of the one file owning `hero-3`, plus formatting of that file — and nothing else. The red-green insights we need are: (a) **id-keyed nodes are our `DefPath`s** — invalidation must key on node identity, not tree position; (b) **early cutoff via content hashing** — if a patch touches a node but the regenerated file is byte-identical (e.g., a no-op patch or a comment-level change), downstream steps (Prettier, screenshot, a11y) should not rerun; (c) the **generation manifest** (doc 04) is already the persisted trace store — extend it from "clobber detection" to "rebuild decision," mapping construction-node-id → generated-file → content hash.

---

## 3. Source maps & provenance

### 3.1 JavaScript source maps (ECMA-426)

Source maps solve "which original line produced this generated character" for the minified-JS world, and after a decade as a de-facto spec they were standardized as **ECMA-426** by TC39-TG4 in 2024 ([tc39/ecma426](https://github.com/tc39/ecma426), [Bloomberg's account of standardization](https://bloomberg.github.io/js-blog/post/standardizing-source-maps/)). Mechanics worth knowing because we may literally emit them:

- A JSON sidecar with `sources`, `sourcesContent` (optionally embedding the originals — self-contained debugging), `names`, and a `mappings` string.
- `mappings` encodes segments of up to 5 fields — generated column, source index, original line, original column, name index — as **Base64 VLQ deltas** relative to the previous segment, which keeps maps compact because consecutive mappings are near each other.
- Consumers: devtools translate stack traces, breakpoints, and click-throughs; error monitors (Sentry) symbolicate production traces.
- Known weakness driving the v4 proposals ([scopes proposal](https://github.com/tc39/source-map/issues/12)): mappings are *positional only* — they don't carry scope or binding info, so debuggers can't reliably reconstruct variables. Lesson: **decide up front what questions your provenance format must answer**; retrofitting richer semantics onto a positional format took the JS ecosystem ten years.

### 3.2 DWARF and compiler debug info

Native compilers solve the same problem with **DWARF** ([dwarfstd.org](https://dwarfstd.org/)): a tree of DIEs (Debugging Information Entries) describing every function, variable, and type, plus a **line table** mapping machine-code addresses ↔ source file/line/column, embedded in the binary's sections. Two lessons scale down to us:

1. **Provenance is emitted during lowering, not reconstructed after.** Every LLVM instruction carries a `!dbg` metadata attachment from the moment the frontend creates it; each transformation is responsible for *propagating* it. Systems that try to recover provenance post-hoc by diffing/pattern-matching (decompilers) are heuristic and lossy. Our builder knows exactly which construction node it is expanding at every moment — it should stamp provenance then, at zero marginal cost.
2. **Optimization degrades provenance, and that's a managed tradeoff.** Inlining and code motion make "which line is this instruction from" genuinely ambiguous; DWARF handles it with explicit constructs (inlined-subroutine DIEs, `is_stmt` flags). For us: when one construction node expands through nested templates, or a pattern inlines a sub-pattern, the map should record the *chain* (node → pattern → sub-template), not just the leaf.

### 3.3 The frontend precedents: click-to-source is a solved UI

The "click an element in the preview, select the node that produced it" feature has several shipped implementations to copy:

- **React DevTools / `data-` attribute injection.** Babel's `preset-react` in dev mode attaches `__source` (`{fileName, lineNumber, columnNumber}`) to every JSX element — that's how DevTools' "jump to definition" works.
- **Click-to-component tooling** ([click-to-react-component](https://github.com/ericclemmons/click-to-react-component)) alt-click-opens your editor at the JSX source, reading those injected coordinates.
- **Vite plugins / Next.js dev overlay** map runtime DOM → source via the same inject-at-transform-time trick.
- **Visual builders (Plasmic, Builder.io, Puck)** do it in reverse order: the renderer walks the JSON tree at runtime, so it stamps `data-node-id` (or keeps a WeakMap of DOM element → node) *natively* — no mapping infrastructure needed because the IR is the runtime data structure.

This cleanly exposes the codegen-vs-interpreter tradeoff from doc 04: the interpreter path gets provenance **for free** (renderer knows the node at render time); the codegen path must **thread provenance through the templates** — the compiler-world discipline. The cheap and robust codegen mechanism: emit `data-cf-node="hero-3"` attributes on each generated element's root (dev builds only), plus a sidecar map `{nodeId → {file, exportName, jsxPath}}` in the generation manifest for editor jump-to-source. That is a two-way map: preview click → DOM → `data-cf-node` → construction node (for patch targeting), and construction node → file/line (for humans reading the generated code).

---

## 4. Deterministic & hermetic builds

### 4.1 Reproducible-builds.org practice

The [Reproducible Builds](https://reproducible-builds.org/) project (Debian-born, now cross-distro) defines the discipline: a build is reproducible if, given the same source and build environment, *anyone* can produce bit-for-bit identical artifacts. Their catalog of nondeterminism sources ([deterministic build systems doc](https://reproducible-builds.org/docs/deterministic-build-systems/)) is a checklist of everything that will silently break our "same construction file → same output" guarantee:

- **Timestamps** — the #1 offender. Compilers, archivers, and generators love embedding "now". The fix is the [`SOURCE_DATE_EPOCH` spec](https://reproducible-builds.org/specs/source-date-epoch/): builds MUST use this env var instead of the current time; tools like [`strip-nondeterminism`](https://reproducible-builds.org/tools/) normalize timestamps in outputs post-hoc.
- **Nondeterministic ordering** — filesystem readdir order (varies by OS/locale), hash-map iteration order, parallel task completion order leaking into output ordering. Fix: sort everything explicitly before emitting.
- **Randomness & unique IDs** — UUIDs, gensym counters, random seeds. Fix: seed derivation from stable inputs (content hashes), never from entropy or wall clock.
- **Environment capture** — build paths, `$HOME`, locale, tool versions bleeding into artifacts. Fix: pin and record the environment; embed nothing from it.
- **Verification tooling** — Debian's `diffoscope` does deep recursive diffs of artifacts to *localize* nondeterminism when two builds differ. The practice of running the build twice and diffing is itself the test.

The motivation there is supply-chain security (a reproducible artifact can be independently verified against source — the countermeasure to Trusting-Trust attacks, and what made the 2024 **xz-utils backdoor** class of attack detectable in principle). Our motivation is different — *diff legibility and cache correctness* — but the mechanics are identical.

### 4.2 Content-addressed build caching: Bazel, Nix, Turborepo

**Bazel** ([remote caching docs](https://bazel.build/remote/caching), [BuildBuddy's explainer](https://www.buildbuddy.io/blog/bazels-remote-caching-and-remote-execution-explained/)) is the industrial pattern:

- Every build step is an **action**: declared inputs (files by SHA-256 content digest), command line, environment, declared outputs.
- The **action cache** maps hash(action) → result metadata; the **CAS** (content-addressable store) maps SHA-256 → file bytes. Cache hit = skip execution entirely; this is only *sound* if actions are **hermetic** — they read nothing undeclared (Bazel sandboxes actions to enforce this) and are deterministic.
- Because keys are content hashes, caches are shareable across machines and users (remote cache/remote execution) — correctness by construction, not by trust.

**Nix/NixOS** pushes the same idea to whole environments: every package lives at a path containing the hash of *all* its inputs (`/nix/store/<hash>-name`), making dependency drift structurally impossible. **Turborepo** ([turborepo.com](https://turborepo.com/docs/crafting-your-repository/caching)) is the JS-ecosystem lightweight version: hash of {source files, task config, env allowlist, dependency outputs} → cached task outputs + logs, replayed on hit. Turborepo's pragmatic compromise — hermeticity by *convention* (declared env allowlists) rather than sandbox enforcement — is roughly our tier: we can't sandbox a Node builder cheaply, but we can pin its inputs.

### 4.3 Canonicalization

The third leg: even a deterministic pipeline produces spurious diffs unless outputs are *canonical*. Established practices:

- **Pinned formatter as canonicalizer** — gofmt is the exemplar: one canonical rendering of any Go AST, zero configuration, so generated and hand-written code are indistinguishable in form and diffs are 100% semantic. Our pinned-Prettier decision (doc 04) is this; the pin must be *exact-version* (Prettier's output changes across minor versions).
- **Canonical JSON** — sorted keys, fixed number formatting, no insignificant whitespace ([RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785) is the formal spec) — required wherever we hash construction files for caching or sign/manifest them.
- **Stable sort keys everywhere** — any list whose order is not semantically meaningful gets an explicit canonical order (alphabetical imports, sorted props), so reorderings never masquerade as changes.

### 4.4 Relevance

Doc 04's determinism mechanics (pinned Prettier, seeded faker, generation manifest) are the right instincts; the compiler world adds the *systematization*: (a) treat the builder as a Bazel-style action — enumerate its full input set {construction file, catalog version, builder version, template versions, faker seed} and hash it; the manifest becomes an action cache, giving us skip-rebuild-on-identical-input for free; (b) adopt the run-twice-and-diff test as a CI check on the builder itself — it's the cheapest possible determinism regression harness; (c) derive all generated IDs (React keys, DOM ids, faker seeds) from construction-node ids, never from counters or entropy, so unrelated patches can never ripple ids across the output.

---

## 5. Macro systems & codegen hygiene

Macro systems are the part of compilers where *programs generate program text* — exactly our builder's job — and their 60-year history is mostly a history of collision bugs and the disciplines invented to kill them.

### 5.1 The capture problem and hygiene

Classic Lisp macros splice code templates into call sites, and naive splicing causes **accidental capture** ([Hygienic macro, Wikipedia](https://en.wikipedia.org/wiki/Hygienic_macro)): a temp variable introduced by the macro shadows (or is captured by) a user variable of the same name. Lisp's mitigation was `gensym` — manually generating guaranteed-unique symbols — a discipline that works only if every macro author remembers it. Scheme's **hygienic macros** (Kohlbecker et al. 1986; `syntax-rules`/`syntax-case`) automated it: identifiers introduced by a macro live in the macro-definition scope, renamed apart from call-site identifiers, so capture is *impossible by default* and must be explicitly requested (anaphoric escape hatches like `datum->syntax`).

**Rust** inherited this: `macro_rules!` identifiers created inside a macro are in a separate hygiene context and cannot collide with surrounding code ([Rust Reference: hygiene](https://doc.rust-lang.org/reference/macros-by-example.html#hygiene)); proc-macros get `Span` hygiene. The **C preprocessor** is the cautionary tale at the other pole: textual substitution with no notion of scope or syntax — the source of the multiple-evaluation bug (`#define MAX(a,b) ((a)>(b)?(a):(b))` evaluating `a++` twice), operator-precedence bugs requiring defensive parenthesization of everything, and header-guard collisions. Its lesson is foundational for us: **generate structure, not text**. Every codegen bug class shrinks when the generator manipulates ASTs/typed builders (ts-morph, in our case) instead of concatenating strings.

### 5.2 Hygiene disciplines for generated code

Translated out of macro-land, the collision-avoidance toolkit for any expander:

- **Namespace everything you introduce.** Generated identifiers, CSS classes, DOM ids, file names get a reserved prefix or derived-from-node-id name (`cf_hero3_...`), so they can never collide with user-authored names — the gensym/hygiene move at codegen granularity.
- **One symbol, one owner.** A generated module exports what it defines and imports everything else explicitly; no ambient/global registration (the header-guard problem generalized).
- **Idempotent expansion.** Re-running the builder on unchanged input must produce identical output including all fresh names — which forbids counters and entropy in name generation (ties to §4.3).
- **Explicit staging.** **Zig comptime** ([matklad: Things Zig comptime Won't Do](https://matklad.github.io/2025/04/19/things-zig-comptime-wont-do.html)) is the modern counterpoint to macro systems: rather than letting programs emit arbitrary source, Zig only allows *partial evaluation* — the same language, run earlier, with no facility for dynamic code synthesis at all. Its bet: most metaprogramming needs are specialization, not synthesis, and forbidding synthesis eliminates the entire hygiene problem. The staged-programming tradition (MetaML/MetaOCaml, Lisp quasiquote, Terra) formalizes the middle ground: multi-stage programs with typed quotation, where stage-1 code *constructs* stage-2 code through an API that makes ill-formed output unrepresentable.

### 5.3 Relevance

Our builder is a macro expander whose "call sites" are pattern references and whose "expansion" is TSX. The mapping is direct: pattern templates = macro definitions; slot contents = macro arguments; the LLM-authored file = the program being macro-expanded. Hygiene translates to: (a) template-introduced identifiers (component-local state names, handler names, CSS module classes) must be derived from node ids or namespaced, never bare (`const cfHero3_open = ...`), so two instances of the same pattern on one screen can't collide — the exact two-`swap!`s-in-one-scope Lisp bug; (b) slot contents must be spliced as *AST nodes with their own scope* (a slot's JSX cannot see or shadow template internals) — which the builder-owned-file / LLM-owned-file split (doc 05) achieves structurally, since module boundaries are JavaScript's hygiene mechanism; (c) Zig's lesson endorses our architecture wholesale: we deliberately chose *specialization of a fixed template set* over *free code synthesis*, and comptime is proof that the restricted model covers most real needs while eliminating the failure class.

---

## 6. Schema-first codegen ecosystems

Three ecosystems have run "schema in, generated code out, at scale, for a decade" — and their scar tissue is our free curriculum.

### 6.1 Protocol Buffers: field numbers as the masterstroke

protobuf's single most consequential design decision: on the wire, fields are identified by **number, not name** ([protobuf: Proto Best Practices](https://protobuf.dev/best-practices/dos-donts/)). `string title = 3;` serializes as tag 3. Consequences:

- **Renames are free.** Names are codegen-side sugar; the wire contract is numbers. Refactor at will.
- **Adding fields is safe.** Old readers skip unknown tags; new readers default missing ones. Bidirectional compatibility between arbitrary version pairs.
- **Numbers are forever.** Deleting a field requires `reserved 3;` (and reserving the name) so the number is never reused with a different meaning — reuse would silently misinterpret old data ([schema evolution guides](https://softwaremill.com/schema-evolution-protobuf-scalapb-fs2grpc/)). Tooling enforces it: [buf breaking](https://buf.build/docs/breaking/overview/) diffs schema versions in CI and fails on wire-breaking changes.
- **Unknown-field preservation.** Since proto3.5, unknown fields are retained through parse→serialize round trips, so an old intermediary doesn't strip data it doesn't understand — a forward-compatibility property our older-builder-meets-newer-construction-file case will need.

The generalized principle: **separate the durable identity (number) from the human name; evolution then only has to keep identities stable.** Generated-code conventions matter too: protoc emits to conventionally named files (`.pb.go`, `_pb2.py`) with `// Code generated by protoc-gen-go. DO NOT EDIT.` headers; the ecosystem's linters and code review tools recognize the convention and skip/collapse those files. Generated code is *committed or not* per ecosystem (Go commits it; Bazel-based shops regenerate), but it is always **regenerable and never hand-patched** — hand edits go in sibling files that extend the generated types.

### 6.2 GraphQL: schema-first clients and persisted queries

The GraphQL ecosystem inverted the flow: the *schema* is the contract, and [GraphQL Code Generator](https://the-guild.dev/graphql/codegen/docs/getting-started) generates typed client code from schema + the operations your app actually wrote. Two patterns transfer:

- **Typed artifacts from a validating compiler.** The codegen step *validates every query against the schema at build time* — an invalid query is a build error, not a runtime 400. Same layering as our validate-then-build gate.
- **Persisted queries / trusted documents** ([client preset docs](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client), [graphql.org going-to-production](https://www.graphql-js.org/docs/going-to-production/)): at build time, extract every operation, hash it, ship the client only the hashes; the server accepts *only* known hashes. The runtime accepts nothing that didn't pass through the build-time validator — an allowlist-by-construction. This is the strongest available precedent for "the preview server only renders construction files that passed validation": bind the preview to manifest-listed, hash-verified builds, and arbitrary unvalidated input is unrepresentable at the serving layer.

### 6.3 OpenAPI: the cautionary member of the family

OpenAPI Generator / swagger-codegen demonstrate schema-first codegen *failing to earn trust* ([What I wish I knew before using OpenAPI Generator](https://medium.com/@niedoba.lukas/what-i-wish-i-knew-before-using-the-openapi-generator-876b3f4715de), [Mux's adventure in OpenAPI codegen](https://www.mux.com/blog/an-adventure-in-openapi-v3-api-code-generation), [the "do people successfully use this?" issue](https://github.com/OpenAPITools/openapi-generator/issues/7490)). The recurring complaints, each a design warning for our builder:

1. **Output quality below hand-written bar** — generated clients that are verbose, unidiomatic, sometimes non-compiling. Root cause: dozens of target languages × templates maintained by a diffuse community; no single target gets a full-time owner. Our advantage: *one* target (React/TS + our design system) — we can and must hold generated output to hand-written quality, because designers/engineers will read it.
2. **Spec permissiveness poisons codegen** — OpenAPI allows constructs (freeform `additionalProperties`, polymorphic `oneOf` soup) that don't map cleanly to typed code, so generators sprout heuristics and per-generator dialects. Lesson: constrain the *schema* to what the builder can expand excellently; don't let the spec accept what the backend handles badly. (Wasm made the same choice at the control-flow level.)
3. **Spec-vs-codegen fork** — teams hand-edit their spec to make generated SDKs prettier, forking "truth about the API" into "codegen convenience"; the emerging fix is [OpenAPI Overlays](https://apievangelist.com/2026/07/15/openapi-overlays-for-sdk-generation-prep/) — build-pipeline-only patch layers over a clean source spec. Directly analogous risk for us: polluting construction files with builder-implementation hints. Builder-tuning knobs belong in builder config, not in the IR.

---

## 7. Type systems as validation

### 7.1 Typed IRs catch invalid programs before execution

The through-line from LLVM's verifier, Wasm's validation, and TypeScript: a typed IR moves failure *earlier and makes it cheaper*. Wasm is the purest demonstration — its validation is literally a type system (each instruction consumes/produces typed stack slots; blocks have declared types), specified formally enough that it's been machine-verified, and total: no module executes without passing it. The economic argument for our pipeline is the same as compilers': an error caught at validation costs one repair-loop round trip on a 2K-token file; the same error caught at build costs a build + error-interpretation; caught at render, a screenshot + human. **Every class of error should be caught at the earliest layer capable of expressing it** — which is why doc 03's layered defense (enum constraints → schema → semantic lint → build) is the right shape; type-system thinking tells us what belongs in each layer.

### 7.2 Bidirectional type checking

Modern checkers (and all the fancy ones) are **bidirectional** ([Dunfield & Krishnaswami, *Bidirectional Typing*, ACM Computing Surveys 2021](https://arxiv.org/abs/1908.05839); [Pierce & Turner, *Local Type Inference*, TOPLAS 2000](https://www.cis.upenn.edu/~bcpierce/papers/lti-toplas.pdf)): they interleave two modes —

- **Checking** (⇐): "here is the expected type, verify the term against it" — information flows *down* from context into the term.
- **Synthesis** (⇒): "infer this term's type from its parts" — information flows *up*.

The payoff is that checking mode lets known context (a function's parameter type, a record field's declared type) flow inward, so terms need few annotations and — crucially for us — **error messages point at the site of the mismatch with the expectation in hand** ("expected `MetricCard` here, found `Button`") rather than unifying globally and reporting a confusing distant conflict, the classic Hindley-Milner-error problem.

Our construction files are checked, not inferred: the pattern catalog *declares* every slot's type (`slot: actions, accepts: Button | IconButton, max: 3`), so validation is almost pure checking mode — expected types flow top-down from pattern definition into slot contents, and every node is verified against a locally-known expectation. Two design consequences: (a) **slot types are the checking context** — semantic lint should be implemented as a bidirectional walk (push expected slot type down; at each node, check node type ∈ slot's accepted set, then recurse with the node's own slot declarations), which automatically yields precise, located, actionable errors of exactly the form the repair loop needs (doc 03's "actionable errors" requirement, but derived from a principled algorithm rather than ad hoc messages); (b) the rare synthesis-mode cases are the escape hatches — a `CustomBlock`'s type can't be checked against much, which is the type-theoretic restatement of why islands are where guarantees end.

There's also a strong precedent for *pairing constrained generation with typing*: constrained-decoding research (e.g., grammar-constrained decoding, and type-directed program synthesis systems like Synquid) shows that making ill-typed output *unsamplable* beats generating-then-fixing — the same result as doc 03's finding that enum-constrained component types make hallucinated components impossible rather than repairable.

---

## 8. Lessons for construction-file prototyping

The mapping table, then each lesson expanded:

| Compiler-world pattern | Construction-file analogue |
|---|---|
| MLIR dialects + progressive lowering | Intent-level and component-level layers of the construction file; lower late |
| LLVM three isomorphic forms | JSON wire ↔ YAML review ↔ in-memory tree, all round-trippable |
| Verify-the-IR (LLVM verifier, Wasm validation) | Validate + semantic-lint before any build step; verifier separate from parser |
| rustc red-green / Salsa | Patch-driven partial rebuild keyed on node ids, with early cutoff via content hashes |
| Roslyn immutable trees | Structural sharing + error-tolerant tree for the editing/repair loop |
| Source maps / DWARF `!dbg` | `data-cf-node` attributes + manifest sidecar; provenance emitted during expansion |
| Reproducible builds + Bazel CAS | Builder as hermetic action; input-hash cache; run-twice-diff CI test |
| Macro hygiene / gensym / Zig comptime | Node-id-derived generated identifiers; slots spliced as scoped AST; specialization over synthesis |
| protobuf field numbers + `reserved` | Stable node ids never reused; schema evolution via additive fields + reservations |
| GraphQL persisted queries | Preview serves only hash-verified, validated builds |
| OpenAPI's failures | One excellent target; constrain the schema to what the builder expands well; no codegen hints in the IR |
| Bidirectional checking | Slot-type validation as a check-mode walk producing located, expectation-carrying errors |

**8.1 — MLIR dialects → layered construction files.** The two-level grammar (patterns + atomic infill, doc 01) is already a two-dialect IR; name it that. The intent spec (doc 02) is a third, higher dialect. Progressive lowering says: let the pipeline *materialize* the intermediate level — when the LLM emits `pattern: SettingsForm`, the builder can first expand it to the primitive-level construction dialect (Stack/Input/Button tree), verify *that*, then lower to TSX. This buys (a) a verification point at each altitude, (b) an "eject one level" story — a designer who outgrows a pattern gets its primitive-level expansion to customize, instead of jumping straight to TSX (the graceful-degradation ladder), and (c) the Linalg lesson enforced: never lower to TSX anything still expressible one level up, because that structure is what patches operate on.

**8.2 — Source maps → click-to-source.** Interpreter path: free (renderer stamps node ids). Codegen path: templates emit `data-cf-node="<id>"` on each expansion root in dev builds, and the generation manifest carries `{nodeId → file/export/jsxPath}`. Preview click → walk up DOM to nearest `data-cf-node` → highlight node in construction file → patches target it. Record expansion *chains* (node → pattern → sub-template) for nested patterns, per DWARF's inlining lesson. Emit provenance during expansion; never reconstruct it.

**8.3 — Salsa → incremental rebuild on patch.** JSON Patch paths give exact invalidation roots. Manifest as trace store: `{nodeId → generatedFile → contentHash}`. On patch: recompute owning files; early-cutoff if the regenerated file hashes identical (skip Prettier/screenshot/a11y downstream). Full rebuild remains the semantic definition and the always-available escape (delete-tsbuildinfo lesson); incremental is an optimization that must be byte-identical to it — assert that equivalence in CI occasionally.

**8.4 — protobuf field numbers → stable node ids.** Node ids are wire identity; display names are sugar. Rules: ids never reused after deletion (keep a `reserved` list in the file or manifest — a resurrected id would revive stale manifest/provenance/patch references); ids never derived from position or content (they must survive both moves and edits); schema evolution is additive-first (new optional fields with defaults; old builders ignore unknown fields *but must preserve them through any rewrite*, per proto3.5 unknown-field retention). Add a `buf breaking`-style CI check for the construction-file schema itself: catalog/schema changes are diffed against the previous version and breaking changes (removed pattern, narrowed slot type, repurposed field) fail CI unless versioned.

**8.5 — Verify-the-IR → validate before build.** Parser-accepts ≠ well-formed: keep schema validation (syntax) and semantic lint (dominance-style rules: slot compatibility, nesting, token references resolve, ids unique) as separate layers with separate error vocabularies. Run the verifier after every *transformation* too — patches are passes, so validate post-patch before rebuild, catching bad patches at the cheapest point. Implement the lint as the bidirectional walk of §7.2 so every error carries location + expectation + actual — the repair loop's ideal diet.

**8.6 — Hermetic action → cacheable, trustable builds.** Define the builder's action key = hash{construction file (canonical JSON, RFC 8785), catalog version, builder version, template hashes, seed}. Same key → serve cached output; changed key → rebuild. Run-twice-and-diff as the builder's own CI test; `SOURCE_DATE_EPOCH`-style rules (no wall clock, no entropy, no env capture, sorted emission order) as builder code-review checklist.

**8.7 — Hygiene → collision-free expansion.** All generated identifiers derived from node ids (`cfHero3_isOpen`); file-per-node module boundaries as the hygiene mechanism between builder-owned and LLM-owned code; slot splicing via ts-morph AST insertion, never string interpolation; `// GENERATED by construction-builder vX from <file>#<nodeId> — DO NOT EDIT` headers plus the conventional-filename pattern (`*.gen.tsx`) so linters, reviewers, and the drift detector all recognize generated files mechanically.

**8.8 — Persisted queries → trusted preview.** The preview server renders only builds whose construction-file hash appears in the manifest of validated builds — the runtime cannot be handed an unvalidated tree, by construction rather than by discipline.

---

## 9. Failure stories & tradeoffs

**IR complexity tax (MLIR).** MLIR's flexibility has a real cost: dozens of dialects, unclear canonical lowering paths between them, and a steep learning curve — practitioners regularly report that *choosing* a path through the dialect zoo is itself a research problem. Tradeoff for us: every added construction-file "dialect" or altitude multiplies the mental model designers must hold. Two levels (pattern + primitive) is likely the ceiling; the intent layer should stay a separate file, not a third in-file grammar.

**Incremental unsoundness (TypeScript, Gradle, everyone).** Every incremental system has shipped bugs where stale state produced wrong output, and every one converged on the same mitigation: a trusted from-scratch path plus easy cache nuking. Budget for it from day one; never let incremental output be the only path to an artifact.

**The OpenAPI trust death-spiral.** When generated code is ugly or subtly wrong, users patch it by hand; hand-patches are clobbered on regeneration; users stop regenerating; the spec drifts from the code; the whole value proposition inverts. This is the single most likely failure mode of our architecture too — it is exactly the drift problem of doc 05, and the countermeasures are the same: generated output at hand-written quality, hard ownership boundaries, clobber detection, and a re-adopt flow instead of silent overwrites.

**Source maps' decade of ambiguity.** The de-facto v3 spec was underspecified enough that browsers and tools disagreed on edge cases for ten years before ECMA-426 cleaned it up; and its positional-only design meant scope/variable info had to be bolted on later. Lesson: write down the provenance format's exact semantics (what a mapping *means* for nested expansions, islands, fragments) on day one, even if the format is a 30-line JSON schema.

**C preprocessor: the cost of untyped textual expansion** — fifty years of multiple-evaluation, precedence, and capture bugs, all stemming from generating *text* instead of *structure*. Any place our builder concatenates strings into TSX is a place this class of bug lives.

**Wasm's discipline paying off vs JVM's flexibility taxing forever.** JVM bytecode allows arbitrary jumps, so its verifier needs iterative dataflow analysis and has had soundness CVEs; Wasm restricted control flow and got single-pass, formally verified validation. Constraining the producer is not a limitation to apologize for — it's where the consumer's guarantees come from. Our enum-constrained, flat, two-level grammar is the Wasm move.

**Tradeoff summary:** determinism costs flexibility (seeded data is less "alive" than random); hermeticity costs convenience (declaring every input is tedious); hygiene costs brevity (namespaced identifiers are uglier); stable ids cost the LLM tokens (ids must be emitted and preserved). In every home domain the cost was paid and repaid; the one we should watch is id overhead in generation — if id bookkeeping measurably degrades LLM emission quality, ids can be builder-assigned on first build and only *preserved* (never invented) by the model thereafter.

---

## 10. Open questions

1. **How many altitudes should materialize?** Does expanding pattern-level → primitive-level as an inspectable intermediate (8.1) earn its complexity in the vertical slice, or is it a v2 feature? Testable in E1/E2.
2. **Builder-assigned vs LLM-assigned node ids.** protobuf's authoring flow has humans pick field numbers with linter help; ours could have the builder assign ids on first build and require the LLM only to preserve them in patches. Which yields fewer id-stability violations in practice?
3. **How fine should incremental invalidation go?** File-level (per-node file regeneration) is clearly worth it; is sub-file (per-slot splice) invalidation ever worth the complexity given Prettier runs per-file anyway? Measure real rebuild latencies in E5 before building anything Salsa-shaped.
4. **Provenance for islands.** `CustomBlock` code is LLM-authored — the builder can stamp the island's root node id, but interior provenance (which line of island code produced which element) would need real source-map tooling. Is root-level granularity enough for click-to-select?
5. **Schema-evolution ceremony threshold.** `buf breaking`-style CI on the catalog schema is cheap; full `reserved`-list bookkeeping in every construction file may be overkill for prototype-lifespan artifacts. Where's the line between "prototype" and "long-lived construction files that must survive catalog upgrades"?
6. **Formal-ish spec for the verifier?** Wasm's formally specified validation is the gold standard; for us, even a property-based test suite (generate random valid/invalid trees, assert verifier decisions) would harden the layered defense. Worth it pre- or post-E1?
7. **Content-addressed preview hosting.** If builds are keyed by input hash (8.6), preview URLs can be `/p/<hash>` — immutable, shareable, cache-forever. Does that interact well with the iterate-fast loop, or does hash-per-keystroke churn defeat it?

---

## Sources

- LLVM: [Language Reference](https://llvm.org/docs/LangRef.html) (three forms, SSA, verifier)
- MLIR: [Rationale](https://mlir.llvm.org/docs/Rationale/Rationale/) · [Linalg Dialect Rationale](https://mlir.llvm.org/docs/Rationale/RationaleLinalgDialect/) · [Lowering paths overview](https://apxml.com/courses/compiler-runtime-optimization-ml/chapter-2-advanced-ml-intermediate-representations/mlir-lowering-paths)
- WebAssembly: [Design Rationale](https://github.com/WebAssembly/design/blob/main/Rationale.md) · [Security/determinism](https://webassembly.org/docs/security/)
- rustc: [Incremental compilation in detail](https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html) · [Salsa chapter](https://rustc-dev-guide.rust-lang.org/queries/salsa.html) · [Salsa repo](https://github.com/salsa-rs/salsa)
- Roslyn: [Red-Green Trees design doc](https://github.com/dotnet/roslyn/blob/main/docs/compilers/Design/Red-Green%20Trees.md) · [Eric Lippert on red-green trees](https://ericlippert.com/2012/06/08/red-green-trees/)
- TypeScript: [Incremental and project builds](https://deepwiki.com/microsoft/TypeScript/8-incremental-and-project-builds)
- Source maps: [ECMA-426 / tc39 source-map spec](https://github.com/tc39/source-map-spec/blob/main/source-map-rev3.md) · [Bloomberg: standardizing source maps](https://bloomberg.github.io/js-blog/post/standardizing-source-maps/) · [VLQ internals](https://www.polarsignals.com/blog/posts/2025/11/04/javascript-source-maps-internals) · [DWARF standard](https://dwarfstd.org/) · [click-to-react-component](https://github.com/ericclemmons/click-to-react-component)
- Reproducible builds: [reproducible-builds.org deterministic build systems](https://reproducible-builds.org/docs/deterministic-build-systems/) · [SOURCE_DATE_EPOCH spec](https://reproducible-builds.org/specs/source-date-epoch/) · [Timestamps doc](https://reproducible-builds.org/docs/timestamps/)
- Build caching: [Bazel remote caching](https://bazel.build/remote/caching) · [BuildBuddy explainer](https://www.buildbuddy.io/blog/bazels-remote-caching-and-remote-execution-explained/) · [Turborepo caching](https://turborepo.com/docs/crafting-your-repository/caching) · Mokhov/Mitchell/Peyton Jones, *Build Systems à la Carte* (ICFP 2018)
- Macros/hygiene: [Hygienic macro (Wikipedia)](https://en.wikipedia.org/wiki/Hygienic_macro) · [Rust hygiene reference](https://doc.rust-lang.org/reference/macros-by-example.html#hygiene) · [matklad: Things Zig comptime Won't Do](https://matklad.github.io/2025/04/19/things-zig-comptime-wont-do.html)
- protobuf: [Proto best practices](https://protobuf.dev/best-practices/dos-donts/) · [Schema evolution guide (SoftwareMill)](https://softwaremill.com/schema-evolution-protobuf-scalapb-fs2grpc/) · [buf breaking](https://buf.build/docs/breaking/overview/)
- GraphQL: [GraphQL Code Generator](https://the-guild.dev/graphql/codegen/docs/getting-started) · [Client preset / persisted documents](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client) · [Persisted operations in production](https://www.graphql-js.org/docs/going-to-production/)
- OpenAPI: [What I wish I knew before using OpenAPI Generator](https://medium.com/@niedoba.lukas/what-i-wish-i-knew-before-using-the-openapi-generator-876b3f4715de) · [Mux: an adventure in OpenAPI v3 codegen](https://www.mux.com/blog/an-adventure-in-openapi-v3-api-code-generation) · [openapi-generator issue #7490](https://github.com/OpenAPITools/openapi-generator/issues/7490) · [API Evangelist on OpenAPI Overlays](https://apievangelist.com/2026/07/15/openapi-overlays-for-sdk-generation-prep/)
- Typing: [Dunfield & Krishnaswami, *Bidirectional Typing*](https://arxiv.org/abs/1908.05839) · [Pierce & Turner, *Local Type Inference*](https://www.cis.upenn.edu/~bcpierce/papers/lti-toplas.pdf) · [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
