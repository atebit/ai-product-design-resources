# 05 — Surgical Editing and the Iteration Loop

**Stage 5 of the prototype-construction architecture research.**

## Scope

This document investigates the hybrid construction model — where a deterministic builder assembles the structural skeleton of a prototype from a construction file and the LLM "surgically" authors only the content, data, and one-off details inside it — and what happens *after* v1 ships: how change requests ("make the header sticky", "add a confirmation step") flow through the system. It covers where to draw the deterministic/generative line, patch-based editing of the construction file (JSON Patch, merge patch, structured YAML diffs, and the empirical reliability record of LLMs emitting diffs), protected/editable-region techniques from two decades of codegen tooling, the source-of-truth problem and round-trip feasibility, the validation loop that keeps every iteration on-system, multi-screen iteration and git-reviewable diffs, and a candid cost/benefit analysis of when this whole apparatus beats just letting a good coding agent edit code directly.

---

## Table of Contents

1. [The hybrid split: what is deterministic, what is authored](#1-the-hybrid-split-what-is-deterministic-what-is-authored)
2. [Patch-based editing of the construction file](#2-patch-based-editing-of-the-construction-file)
3. [Targeted region editing in generated code](#3-targeted-region-editing-in-generated-code)
4. [The iteration UX and the source-of-truth problem](#4-the-iteration-ux-and-the-source-of-truth-problem)
5. [Validation and the feedback loop](#5-validation-and-the-feedback-loop)
6. [Multi-screen and flow iteration](#6-multi-screen-and-flow-iteration)
7. [Tradeoffs and value analysis](#7-tradeoffs-and-value-analysis)
8. [Open questions and recommended experiments](#8-open-questions-and-recommended-experiments)
9. [Sources](#9-sources)

---

## 1. The hybrid split: what is deterministic, what is authored

### 1.1 The principle: determinism where fidelity matters, generation where judgment matters

The useful heuristic is not "structure vs. content" but **"anything the design system already has an opinion about should never be re-derived by a model."** An LLM asked to produce a card grid will get the gap wrong 1 time in 20; a template never will. Conversely, an LLM writing the empty-state microcopy for a "no invoices yet" screen is doing something no template can do. The split:

**Deterministic construction (the builder owns it):**

- **Layout scaffolding** — page shells, nav chrome, split panes, responsive grid containers, safe-area handling. These are the highest-blast-radius elements (one wrong flex property breaks a whole screen) and the least creative.
- **Component instances** — every use of a real design-system component (`Button`, `DataTable`, `Modal`) is emitted as an import + instantiation from the codified template, with props constrained to the component's actual API. This is exactly the property Figma's Code Connect exploits: mapping design components to real code so agents reuse rather than reinvent ([figma.com/blog/introducing-code-connect](https://www.figma.com/blog/introducing-code-connect/)).
- **Design tokens** — color, type scale, spacing, radius, elevation. Emitted as token references (`var(--space-4)`, `tokens.color.surface`), never literals. Builder.io's Fusion takes the same position: generated code references the project's existing tokens and components rather than synthesizing values ([builder.io/c/docs/fusion-design-system-intelligence](https://www.builder.io/c/docs/fusion-design-system-intelligence)).
- **Pattern-level containers** — codified compositions like "settings page = sidebar nav + sectioned form + sticky footer actions." Patterns are where token savings compound: one construction-file line expands to 100+ lines of correct code.
- **Wiring boilerplate** — routing between screens, state stubs, mock-data plumbing, imports.

**LLM authorship (surgical, inside slots the builder leaves open):**

- **Copy and microcopy** — headings, empty states, error strings, button labels, tooltips. High judgment, low structural risk.
- **Sample/mock data** — realistic domain data (names, invoice line items, plausible timestamps). LLMs are excellent at this and templates are terrible at it. Emit as a separate data file (see §3.3) so it can be regenerated without touching structure.
- **One-off custom components** — the visualization, the novel interaction, the thing the DSL has no primitive for. Authored as a normal component file that the construction file *references* but does not describe internally.
- **Edge-case styling** — the 5% of styling that is intentionally off-pattern for this prototype (a promotional gradient, a bespoke animation). Should be authored into a designated override location, not sprinkled inline.
- **Behavioral glue** — small event handlers, conditional show/hide logic, prototype-grade state transitions.

### 1.2 Where exactly to draw the line

A practical test for each decision: **"If two different runs produced two different answers here, would a design reviewer care?"** If yes (spacing, component choice, token usage) → deterministic. If no or if variety is desirable (copy, sample data) → LLM. A secondary test: **"Does the design system have a documented answer?"** If the system's docs specify it, the builder enforces it.

The riskiest middle zone is **composition of components within a container** — e.g., which components appear in a toolbar and in what order. This is genuinely a design decision (LLM territory) but expressed structurally (builder territory). The resolution used by most schema-driven UI systems (see stage-2/3 docs on server-driven UI) is: the LLM decides *which* primitives and their order **in the construction file**, and the builder decides *how* they are assembled, spaced, and styled. Design intent lives in the construction file; rendering fidelity lives in the builder.

### 1.3 Escape hatches: "the DSL can't express this"

Every constrained DSL meets a request it cannot express, usually within the first week. Without a designed escape hatch, the LLM will either refuse or — worse — abuse the nearest primitive (`Box` with 14 style overrides). Escape-hatch tiers, cheapest first:

1. **Override props** — every primitive accepts a bounded `overrides` map (e.g., a whitelisted subset of CSS or a `className` pass-through). Cheap, but the first step toward drift; lint it (count overrides per screen, warn above a threshold).
2. **The `custom` node** — a first-class DSL node: `{ "type": "custom", "id": "revenue-sparkline", "src": "custom/RevenueSparkline.tsx", "slotProps": {...} }`. The builder emits the mount point and import; the LLM authors the referenced file with full freedom. This keeps the construction file complete (it still *names* everything on screen) while conceding authorship. It is the DSL analog of OpenAPI Generator's ignore-file: a declared boundary between generated and hand-written territory ([openapi-generator.tech/docs/customization](https://openapi-generator.tech/docs/customization/)).
3. **The `raw` block** — inline verbatim code inside the construction file. Useful for one-liners; dangerous at scale because it turns the construction file back into code. Cap its size in the schema (e.g., maxLength on the string).
4. **Eject** — for a screen that is genuinely off-system, mark it `"managed": false` and let the agent own the file outright. The builder skips it thereafter. Better an honest eject than a construction file that lies.

Crucially, escape-hatch usage is **telemetry**: every `custom` node is a signal that the DSL (or the design system itself) is missing a pattern. Reviewing them weekly is how the primitive library grows.

---

## 2. Patch-based editing of the construction file

Once v1 exists, the question is how the LLM expresses "change X" against the construction file. Regenerating the whole file per request is simple but re-rolls the dice on everything that was already correct; patching touches only what changed. The evidence on both sides:

### 2.1 The patch format options

**JSON Patch (RFC 6902)** — an ordered list of operations (`add`, `remove`, `replace`, `move`, `copy`, `test`) addressed by JSON Pointer paths. Precise, auditable, and reversible-ish. Its known weakness for LLM authorship is **array index arithmetic**: after one `remove` on an array, every subsequent index shifts, and models handle this badly (see §2.2). Mitigation: give every node in the construction file a stable `id` and address by id, not index — either by structuring collections as id-keyed maps, or by resolving `#header`-style selectors to paths in the build tool before applying.

**JSON Merge Patch (RFC 7396)** — "here is a partial document; deep-merge it." Far easier for a model to emit correctly (it looks like the document itself), but it cannot express array surgery (any array is replaced wholesale) and uses `null` to mean *delete*, so it cannot set a value *to* null. Good for prop/token tweaks; useless for "insert a screen between step 2 and 3."

**Structured YAML diffs** — if the construction file is YAML, tools like **dyff** ([github.com/homeport/dyff](https://github.com/homeport/dyff)) produce semantic, path-addressed diffs ("changed `screens.settings.header.sticky` from `false` to `true`") rather than line diffs. This matters less for *applying* changes than for **showing** them: a dyff-style rendering of a construction-file change is a legible design-review artifact (see §6.3).

**Domain-specific edit operations** — the strongest option for this architecture: define a small verb set *over the DSL itself* — `set_prop`, `insert_child`, `remove_node`, `move_node`, `replace_content`, `add_screen` — each addressed by node id. This is what Kubernetes did with *strategic merge patch* (annotating schemas with merge keys so arrays merge by identity), and what the multi-agent state-mutation literature converged on: path-addressed, schema-validated operations are "easier to validate, attribute, and replay than free-form messages" (PatchBoard, [arxiv.org/pdf/2605.29313](https://arxiv.org/pdf/2605.29313)). A five-verb tool-call API is easier for a model than raw RFC 6902 and easier to validate than merge patch.

### 2.2 Reliability evidence: LLMs emitting patches

- **Aider's edit-format benchmarks** are the canonical field data for code. On a refactoring suite built to provoke laziness, GPT-4 Turbo scored **20% with SEARCH/REPLACE blocks vs 61% with unified diffs** — a 3× improvement from the edit format alone; the older gpt-4-0613 went from 26% to 59% ([aider.chat/docs/unified-diffs.html](https://aider.chat/docs/unified-diffs.html)). Aider's takeaway generalizes: the *shape* of the edit encoding changes model behavior materially, and formats that resemble familiar artifacts (diffs the model saw in pretraining) outperform bespoke ones. Aider today maintains multiple formats per model — `whole`, `diff` (search/replace), `udiff`, and editor variants — because no single format wins everywhere ([aider.chat/docs/more/edit-formats.html](https://aider.chat/docs/more/edit-formats.html)).
- **JSON Whisperer** (EMNLP 2025 industry track) tested exactly the construction-file scenario: LLMs emitting RFC 6902 patches against JSON documents. Findings: patching cut token usage **~31%** with edit quality **within 5% of full regeneration** — but only after fixing the array problem by transforming arrays into stable-key dictionaries (their "EASE" encoding), because models "often miss related updates when generating isolated patches" and "handle index shifts poorly" ([arxiv.org/html/2510.04717v1](https://arxiv.org/html/2510.04717v1)). Direct design implication: **id-keyed children, never positional arrays**, in the construction schema.
- **Trustcall** (LangChain ecosystem) applies the same insight to structured extraction: models patch an existing JSON object rather than regenerate it, which is "simpler, faster, cheaper," and validation failures are repaired by asking for a *corrective patch* rather than a full retry ([github.com/hinthornw/trustcall](https://github.com/hinthornw/trustcall)).
- **Fast-apply models** — Morph's Fast Apply is a small (7B) specialized model that merges a "lazy" edit snippet (with `// ... existing code ...` markers) into the original file at ~10,500 tok/s with ~98% claimed accuracy ([morphllm.com/fast-apply-model](https://www.morphllm.com/fast-apply-model)); Relace Apply 3 makes equivalent claims ([relace.ai/blog/relace-apply-3](https://relace.ai/blog/relace-apply-3)). Architecturally this is the industry's answer to "big models are bad at mechanical merging": let the frontier model express *intent* sloppily and a cheap specialized system apply it. **In the construction-file architecture, the deterministic builder plays the fast-apply role** — the LLM emits a small semantic edit; a program does the merging. The construction-file approach is strictly stronger where it applies, because application is rule-based (100% mechanical fidelity) rather than 98% model-based.
- **Cursor's apply model** (speculative-decoding rewrite of full files from sketchy edits) is the same pattern inside a commercial editor.

**Synthesis:** patching beats regeneration on tokens and latency, and matches it on quality *if and only if* the addressing scheme is index-free and every patch is validated-then-repaired. Whole-file regeneration remains the right fallback for small files and for "restructure everything" requests — which is fine, because construction files are small (§7.1).

### 2.3 The CRDT/OT angle

CRDTs (Automerge, Yjs) solve *concurrent* editing — multiple writers merging without coordination. Relevant only if the architecture allows simultaneous writers: e.g., a designer nudging the construction file in a GUI while an agent patches it, or parallel agents on different screens of one flow. Automerge gives JSON-shaped documents with automatic merge ([github.com/automerge/automerge](https://github.com/SmartBear/automerge)), and Automerge 3.0 (2025) made large documents practical. But the multi-agent literature carries a warning: CodeCRDT measured that **5–10% of concurrent LLM-agent edits merged into structurally valid but *logically* conflicting states** (arXiv:2510.18893) — the merge succeeds, the design is wrong. For a v1 of this system, the pragmatic answer is **git, not CRDTs**: one writer per construction file per branch, merge at the file level, and treat CRDTs as a later concern if a live multiplayer editing surface is ever built. Sequence the work so each screen's file has a single owner (§6.2) and the problem mostly disappears.

### 2.4 Illustrative example: "make the header sticky"

Construction file (excerpt, id-keyed):

```yaml
screens:
  invoices:
    layout: app-shell           # pattern primitive
    regions:
      header:
        type: PageHeader
        props: { title: "Invoices", sticky: false }
        slots:
          actions:
            - { id: new-invoice, type: Button, props: { variant: primary }, content: "New invoice" }
      body:
        type: DataTablePattern
        props: { source: "@data/invoices", columns: "@columns/invoices" }
```

The LLM's entire response to *"make the header sticky and rename the button to 'Create invoice'"*, as RFC 6902:

```json
[
  { "op": "test",    "path": "/screens/invoices/regions/header/type", "value": "PageHeader" },
  { "op": "replace", "path": "/screens/invoices/regions/header/props/sticky", "value": true },
  { "op": "replace", "path": "/screens/invoices/regions/header/slots/actions/new-invoice/content", "value": "Create invoice" }
]
```

~60 output tokens. The `test` op is a cheap guard: if the file changed since the model last read it, application fails loudly instead of patching the wrong node. The builder re-emits only the affected screen; `PageHeader` with `sticky: true` renders whatever the design system's canonical sticky treatment is — elevation, backdrop blur, safe-area padding — none of which the model had to know or could have gotten subtly wrong.

The same request against a raw React file would require the model to know/rediscover the header's implementation, emit a correct code diff (position, z-index, scroll container interplay), and not disturb anything nearby — hundreds to thousands of tokens and a real chance of an off-system `position: fixed` hack.

---

## 3. Targeted region editing in generated code

Sometimes the edit has to land in *generated output* (a custom component, slot content). Twenty-plus years of codegen tooling has converged on a handful of patterns for mixing generated and authored code without losing either.

### 3.1 Protected / editable regions (the classic MDE lineage)

- **Acceleo / EMF protected areas**: generated files contain marked blocks (`[protected ('id')] ... [/protected]`); regeneration rewrites everything *except* those blocks. EMF's JMerge variant inverts it with `@generated` Javadoc tags — remove the tag (or write `@generated NOT`) and the regenerator leaves that member alone.
- **The modern consensus is file-level, not block-level separation.** In-file protected regions proved fragile (markers get deleted, merges get hairy), so newer systems separate by *file*: **.NET partial classes** (generated half + hand-written half of one class), **OpenAPI Generator's `.openapi-generator-ignore`** (gitignore-style patterns declaring which output files the generator must never overwrite — explicitly recommended over `--skip-overwrite` for granular control, [github.com/OpenAPITools/openapi-generator/blob/master/docs/customization.md](https://github.com/OpenAPITools/openapi-generator/blob/master/docs/customization.md)), and **Plasmic's owned-file split** (§4.2).

**Lesson for this architecture:** prefer *file-granular* ownership — builder-owned files are always safe to regenerate wholesale; LLM/human-owned files are never touched by the builder. Reserve in-file markers only for unavoidable cases, and make the builder *verify* markers on every run (error if an anchor disappeared) rather than silently guessing.

### 3.2 Generator conflict resolution (Rails, Angular)

- **Rails generators** re-run against an existing app and prompt per conflicting file — overwrite / skip / diff / merge (it can even shell out to your configured git mergetool) ([guides.rubyonrails.org/generators.html](https://guides.rubyonrails.org/generators.html)). This is the interactive-human version of patch application; an agent needs the *decidable* version, which is exactly what strict file ownership provides.
- **Angular Schematics** stage all changes in a virtual `Tree` and apply `MergeStrategy` rules on commit — and the GitHub issue history (e.g., [angular-cli#11337](https://github.com/angular/angular-cli/issues/11337)) shows how hard override/merge semantics are to get right even for a mature tool. The transferable idea is the **virtual tree itself**: the builder should compute the entire output in memory, diff against what is on disk, refuse to touch non-owned files, and apply atomically. That also yields a free "plan" step — show the file-level diff before writing, Terraform-style.

### 3.3 Slot-content files: separating structure from authored content

The cleanest surgical-editing mechanism is to make the *builder's output* import the *LLM's output*:

```
build/invoices/
  Screen.tsx          # builder-owned, regenerated freely, never hand-edited
  content.ts          # LLM-owned: copy, labels, empty-state strings
  data.mock.ts        # LLM-owned: sample data matching a builder-emitted type
  custom/
    RevenueSparkline.tsx   # LLM-owned: the escape-hatch component
```

`Screen.tsx` references `content.headerTitle`, `mockInvoices`, and `<RevenueSparkline/>` by contract; the builder emits *TypeScript types* for the content and data shapes so the LLM-owned files are compiler-checked against the structure. Now "punchier empty-state copy" is an edit to `content.ts` only — no structural risk, trivially reviewable — and a structural rebuild never clobbers authored content. This is the codegen equivalent of tokens-vs-values: structure passes *references* to content, never inlines it.

### 3.4 "Fill in this TODO" and anchor comments

For content the LLM authors *inside* builder-emitted files (rare, but e.g. a handler body), the builder emits explicit anchors:

```tsx
// <llm:fill id="on-export-click" contract="(rows: Invoice[]) => void">
const onExportClick = (rows: Invoice[]) => { /* TODO */ };
// </llm:fill>
```

The skill then runs the LLM with *only the anchor block plus its contract* in context and splices the result back — the code-level analog of constrained decoding. Anchor comments are also emerging agent practice for *navigation* (stable grep-able landmarks like `AIDEV-NOTE:` that survive refactors better than line numbers); the same mechanism doubles as the write-target registry. Structural variants of this exist in **ast-grep** ([ast-grep.github.io](https://ast-grep.github.io/)) — pattern-addressed rewriting over tree-sitter ASTs — which is the right tool when the edit target is "every `<Button variant=primary>` inside a `CardFooter`" rather than a named anchor.

---

## 4. The iteration UX and the source-of-truth problem

### 4.1 Where does "make the header sticky" land?

Route by *what kind of change it is*, with the construction file as the default:

| Request | Edit target | Mechanism |
|---|---|---|
| "Make the header sticky" | Construction file | patch `props.sticky` → rebuild |
| "Rename the button" | Construction file (or content file) | patch `content` |
| "Punchier empty-state copy" | Content file | LLM rewrites `content.ts` |
| "The sparkline should animate on load" | Custom component file | LLM edits `custom/RevenueSparkline.tsx` directly |
| "Add a confirmation step to the flow" | Construction file | `add_screen` + routing patch → rebuild |
| "This spacing looks off" (and the token is right) | Design system / builder template | fix upstream, rebuild everything — **not** a per-screen patch |

The last row is the quiet superpower of the architecture: systemic fixes are made *once* in the template/tokens and every screen inherits them on rebuild — impossible when each screen is bespoke generated code.

The routing decision itself is an LLM classification step ("is this expressible in the DSL?") with a deterministic guard: if the resulting patch fails schema validation, fall back to the escape hatch rather than forcing a bad patch.

### 4.2 Drift, and the one rule that prevents it

Drift happens when someone (user *or* agent) edits builder-owned output directly; the construction file now lies, and the next rebuild silently reverts the change. Every surviving system in this space enforces the same rule — **regenerable files are never hand-edited; hand-editable files are never regenerated**:

- **Plasmic codegen** is the most complete prior art: Plasmic-owned "Plasmic*" files are blindly overwritten on every `plasmic sync`, while developer-owned wrapper files (where all logic and overrides live) are generated once and never touched again — so design updates flow down indefinitely without losing code changes ([docs.plasmic.app/learn/codegen-guide](https://docs.plasmic.app/learn/codegen-guide/)). Note what Plasmic does *not* do: it does not parse your code edits back into the design. The "two-way" in its sync is *both sides keep editing their own files*, not round-trip inference.
- **Builder.io Fusion** dodges the problem differently: the visual canvas *writes real code in your repo* using your components and tokens ([builder.io/fusion](https://www.builder.io/fusion)) — one artifact, two editing surfaces. That is the "no construction file" end of the spectrum (see §7.3).
- **Figma Code Connect** points the arrow the other way — code is the source of truth and Figma components carry *pointers* to it, feeding real component APIs to MCP-connected agents ([help.figma.com — Code to canvas](https://help.figma.com/hc/en-us/articles/40287261761559-Code-to-canvas-with-your-design-system)). Philosophically identical to this architecture: the mapping layer, not the rendering, is what gets maintained.

Practical enforcement: banner comments (`// GENERATED — edit build/invoices.yaml instead`), a lint/CI check that hashes builder-owned files against the last build manifest and fails on divergence, and an agent-rules entry (CLAUDE.md / AGENTS.md) telling coding agents to route changes through the construction file. When drift is detected anyway, offer two recoveries: *re-adopt* (a model translates the code edit back into a construction-file patch, then rebuilds — verifying the rebuilt output matches) or *eject* the file (§1.3, tier 4).

### 4.3 Full round-trip: feasible?

Parsing arbitrarily edited output code back into the construction file is **general round-trip engineering**, and its history (CASE tools, UML round-tripping) is one of near-universal failure — the code can express infinitely more than the DSL, so the inverse mapping is partial at best. Feasible narrow cases: recognizing prop-value changes on known component instances (a constrained AST match — ast-grep territory) and lifting them into patches. Not feasible: recovering structural refactors or novel code. Recommendation: **do not build round-trip for v1.** Build drift *detection* (cheap, reliable) plus the model-assisted re-adopt flow (best-effort, verified by rebuild-and-diff). This mirrors where the industry landed: Plasmic ships file-ownership, not inference; Code Connect ships pointers, not parsing.

### 4.4 The conversational loop, end to end

```
user request
  → classify: DSL-expressible? content-only? custom-code?
  → emit patch (construction file) | rewrite content file | edit custom file
  → validate patch against schema (+ test ops)        [reject → repair loop]
  → apply patch, rebuild affected screens (deterministic, ~instant)
  → typecheck/build                                    [fail → repair loop]
  → screenshot + a11y pass                             [report → optional auto-fix]
  → present: rendered result + human-readable dyff of the construction change
```

The user sees two artifacts per iteration: the prototype and a semantic changelog ("`header.sticky: false → true`"). That changelog is something raw code generation can never give a design reviewer.

---

## 5. Validation and the feedback loop

Determinism upstream is only half the reliability story; the other half is cheap, layered checks after every edit, ordered cheapest-first so failures are caught before expensive steps:

1. **Patch validity** — RFC 6902 application either succeeds or fails atomically; failed `test` ops catch stale context. Milliseconds.
2. **Schema validation** — the patched construction file re-validates against the DSL's JSON Schema (Ajv or equivalent): unknown component types, illegal props, missing required slots, dangling `@data/` references. This is the on-system enforcement point — an off-system value *cannot pass* if the schema enumerates tokens as enums. On failure, the trustcall pattern: feed the validator errors back and request a **corrective patch**, not a regeneration ([github.com/hinthornw/trustcall](https://github.com/hinthornw/trustcall)). Cap at 2–3 repair rounds, then fall back to whole-file regen, then to human.
3. **Build/typecheck** — the assembled output compiles; builder-emitted types verify LLM-owned content/data files against structure (§3.3). Catches contract breaks between the halves of the hybrid.
4. **Visual check** — headless screenshot (Playwright) of affected screens. Uses: (a) attach to the reply so the human verifies intent; (b) optional VLM pass ("does this match the request? any layout breakage?") for self-correction; (c) pixel-diff against the previous build to confirm the change's blast radius matched expectations (only the header region should differ after a header patch — a large diff elsewhere is a red flag).
5. **Accessibility check** — axe-core against rendered output. Because structure is builder-emitted from accessible templates, most a11y is guaranteed by construction; the check mainly polices LLM-authored slots (contrast of custom components, alt text in sample data, label copy).
6. **On-system audit** — a lint over the *output* for token-policy violations (raw hex colors, px literals outside token scale) — belt-and-braces for escape-hatch content, and a drift detector for builder-owned files (§4.2).

In a Claude Code-style harness, steps 1–3 run as **hooks** (PostToolUse / pre-commit) so they are non-optional; the agent cannot "forget" to validate. Failure telemetry is a design input: recurring schema violations on the same prop mean the DSL's affordance is unclear — fix the schema docs, not the prompt.

---

## 6. Multi-screen and flow iteration

### 6.1 Adding screens and evolving flows

With flows declared in the construction file (screens + edges), "add a confirmation step between payment and success" is: one `add` of a screen node (likely instantiating an existing `ConfirmationPattern`), plus two routing-edge patches. The builder regenerates the new screen and the two touched neighbors; untouched screens are byte-identical (build only what changed — hash construction-file subtrees per screen for incremental rebuilds). Contrast with code-level iteration, where inserting a flow step means touching a router, several navigation callsites, and hoping the model finds them all.

### 6.2 Refactoring shared patterns across screens

When the same ad-hoc composition appears on 3+ screens, promote it: define a new pattern primitive in the DSL/builder, then patch each screen to instantiate it (`replace` subtree with `{ type: NewPattern, props }`). Verify with rebuild-and-pixel-diff ≈ 0. This is the design-system contribution loop in miniature — escape-hatch and repeated-composition telemetry (§1.3) tells you *what* to promote. File organization: one construction file per screen (or per flow) with a shared `patterns.yaml`/`tokens` import, so parallel work on different screens never collides in git — the practical answer to the concurrency question from §2.3.

### 6.3 Construction files in git: reviewable design diffs

A major secondary benefit of the architecture: **the construction file diff is a design-review artifact.** A PR that changes 6 lines of YAML ("`DataTable` → `CardGrid`, added `EmptyState`, header sticky") is reviewable by a design lead who would never review 400 lines of JSX. Practices:

- Construction files are the *reviewed* artifact; builder-owned output can be gitignored (rebuilt in CI) or committed for greppability — if committed, mark generated files via `.gitattributes` `linguist-generated` so PR diffs collapse them.
- Render dyff-style semantic diffs ([github.com/homeport/dyff](https://github.com/homeport/dyff)) plus before/after screenshots in PR comments via CI — the whole review becomes "intent diff + visual evidence."
- Tags/branches of construction files are cheap design versioning: "the v2 checkout exploration" is a branch of small YAML files, not a duplicated codebase; A/B variants are two construction files sharing every template.

---

## 7. Tradeoffs and value analysis

### 7.1 Token economics (estimates)

Assumptions: a mid-complexity prototype screen ≈ 300–600 lines of React ≈ **4–8k tokens**; its construction file ≈ 60–150 lines of YAML ≈ **0.8–2k tokens**; a surgical patch ≈ **50–300 tokens**.

| Iteration mode | Input context | Output tokens | Notes |
|---|---|---|---|
| Full-code regen of a screen | code + design-system rules: 6–15k | 4–8k | re-rolls everything; risk of regression elsewhere in file |
| Code diff edit (aider-style) | same input | 0.3–1.5k | good with strong models; merge fidelity ~98% w/ fast-apply |
| Construction-file whole regen | DSL docs + file: 3–6k | 0.8–2k | safe: schema-validated, structure re-derived deterministically |
| **Construction-file patch** | DSL docs + file: 3–6k | **0.05–0.3k** | ~10–30× less output than code regen; application is 100% mechanical |

Per-iteration output savings vs full-code regen: roughly **15–50×**; vs code-diff editing: ~3–5×. Input savings come from context: the construction file *is* the compressed representation of the screen, so the model never needs the assembled code in context at all for structural edits. JSON Whisperer's measured ~31% *total* token reduction for JSON patching (with quality within 5% of regen) is the conservative floor ([arxiv.org/html/2510.04717v1](https://arxiv.org/html/2510.04717v1)); the numbers above add the code→DSL compression on top. Over a 20-iteration design session, the compounding matters less for cost (tokens are cheapening) than for **latency and reliability**: less generated text = fewer places to be wrong, and deterministic rebuild is near-instant.

### 7.2 Reliability gains — and the real costs

**Gains:** on-system correctness by construction (tokens/components cannot drift inside builder territory); bounded blast radius per edit; schema validation as a hard gate rather than a prompt hope; semantic, reviewable change history; systemic fixes applied once in templates.

**Costs, honestly:**

- **You are now maintaining a compiler.** The DSL schema, builder, patch verbs, validators, and docs are a real software product that must track every design-system change. Stale templates are *worse* than no system — they mass-produce wrong UI with high confidence.
- **Expressiveness ceiling + escape-hatch erosion.** Every novel design idea hits the DSL boundary first; if escape hatches are too easy, the construction file degrades into a code file with extra steps.
- **Two-representation cognitive load.** Everyone (humans and agents) must know which file to edit for which change. The routing table in §4.1 must be encoded in agent rules and tooling, not tribal knowledge.
- **The frontier-model headwind.** Each model generation narrows the raw-quality gap this system compensates for. Claude-class models with a good design system, Code Connect-style component references, and rules files already produce largely on-system code ([figma.com/blog/design-systems-ai-mcp](https://www.figma.com/blog/design-systems-ai-mcp/)). The durable advantages are the ones models don't erase: determinism (exact reproducibility), reviewability (semantic diffs), and cost/latency at volume.

### 7.3 When the whole system is overkill

Direct code editing with a strong agent + good design system + rules file is the better choice when: the team ships **< a few prototypes/month**; prototypes are **mostly novel** (escape-hatch ratio would exceed ~30–40%, at which point the DSL is overhead, not leverage); the design system itself is unstable (you'd rebuild templates weekly); or there is no owner for the builder toolchain. The construction-file architecture earns its keep when prototyping is **high-volume and pattern-heavy** (many screens from a stable component library), when **non-engineers** need to review/redirect work at the intent level, or when outputs feed a pipeline that demands consistency (usability-test batteries, sales demos, spec-handoff). A useful decision proxy: *if >60–70% of a typical prototype screen is expressible as existing patterns + component instances, the hybrid pays; below that, use the agent directly and invest in the design system instead.* The middle path — skip the DSL, but keep §3.3's file-ownership split, §5's validation hooks, and a rules file — captures much of the reliability benefit at a fraction of the build cost, and is the right *first* step regardless (see experiment E0).

---

## 8. Open questions and recommended experiments

### Open questions

1. **Patch vs regen crossover:** at what construction-file size / edit complexity does patching stop outperforming whole-file regeneration in quality? (JSON Whisperer says "within 5%" on their corpus; a DSL with deep nesting may differ.)
2. **Escape-hatch equilibrium:** what override budget keeps files honest without frustrating iteration — and can lint pressure alone hold the line?
3. **Routing accuracy:** how reliably does a model classify requests into construction-patch vs content-edit vs custom-code (§4.1), and what does a misroute cost in practice?
4. **Re-adopt fidelity:** how often can a model correctly lift a direct code edit back into a construction patch (verified by rebuild-and-diff)? This determines how harshly drift must be policed.
5. **VLM-in-the-loop value:** does an automated screenshot critique measurably reduce human iteration rounds, or is it noise?
6. **Multiplayer:** if a GUI editor over the construction file ever exists alongside agents, is git-branch discipline enough, or do CRDTs (with their 5–10% logical-conflict rate under agent concurrency) become necessary?

### Recommended experiments (in order)

- **E0 — Baseline first (1 day):** run 10 representative iteration requests against plain agent-edits-code with a rules file + design system. This is the bar every later experiment must beat; without it the whole architecture is unfalsifiable.
- **E1 — Patch reliability harness (2–3 days):** 30 edit requests × {RFC 6902 by id, merge patch, domain verbs, whole-file regen} against one screen's construction file. Measure: valid-on-first-try %, repair rounds, tokens, semantic correctness. Decides §2.1 empirically. Use id-keyed children from the start.
- **E2 — Hybrid split stress test (1 week):** build 5 screens of a real product area via builder + slots; log every escape-hatch use. If custom/override share > ~1/3, the DSL needs more patterns — or the approach needs rethinking for that product area.
- **E3 — Iteration loop end-to-end (1 week):** wire §4.4 (classify → patch → validate → rebuild → screenshot → semantic diff) as a skill with hooks; run a scripted 15-request design session. Measure wall-clock per iteration, human interventions, drift incidents vs the E0 baseline.
- **E4 — Design-review diff study (2 days):** show design leads the same 5 changes as (a) code diffs, (b) YAML dyff + screenshots. Measure review time and error detection. This tests the architecture's most under-priced benefit.
- **E5 — Drift & re-adopt (2–3 days):** deliberately hand-edit builder-owned output 10 ways; measure detection rate and model re-adopt success. Sets policy for §4.2.

---

## 9. Sources

- Aider — Unified diffs make GPT-4 Turbo 3× less lazy: https://aider.chat/docs/unified-diffs.html
- Aider — Edit formats: https://aider.chat/docs/more/edit-formats.html
- JSON Whisperer: Efficient JSON Editing with LLMs (RFC 6902 patches, EASE encoding): https://arxiv.org/html/2510.04717v1
- Trustcall — patch-don't-post for structured outputs: https://github.com/hinthornw/trustcall
- Morph Fast Apply (7B merge model, ~10.5k tok/s, ~98%): https://www.morphllm.com/fast-apply-model
- Relace — A Year of Fast Apply: https://relace.ai/blog/relace-apply-3
- PatchBoard — schema-grounded state mutation for LLM agents: https://arxiv.org/pdf/2605.29313
- RFC 6902 (JSON Patch) / RFC 7396 (JSON Merge Patch): https://www.rfc-editor.org/rfc/rfc6902 · https://www.rfc-editor.org/rfc/rfc7396
- dyff — semantic YAML diff: https://github.com/homeport/dyff
- Automerge (JSON CRDT): https://github.com/SmartBear/automerge · CodeCRDT concurrency findings: arXiv:2510.18893
- OpenAPI Generator — customization & ignore file: https://github.com/OpenAPITools/openapi-generator/blob/master/docs/customization.md
- Rails — Creating and Customizing Generators (conflict prompts): https://guides.rubyonrails.org/generators.html
- Angular Schematics — Tree/MergeStrategy (and its difficulties): https://github.com/angular/angular-cli/issues/11337 · https://angular.love/angular-schematics-deep-dive-part-2-ng-generate
- Plasmic — Codegen overview (owned-file split, continuous sync): https://docs.plasmic.app/learn/codegen-guide/
- Builder.io Fusion — design-system intelligence: https://www.builder.io/c/docs/fusion-design-system-intelligence · https://www.builder.io/fusion
- Figma — Code Connect: https://www.figma.com/blog/introducing-code-connect/ · Code to canvas: https://help.figma.com/hc/en-us/articles/40287261761559-Code-to-canvas-with-your-design-system · Design systems & MCP: https://www.figma.com/blog/design-systems-ai-mcp/
- ast-grep — structural search/rewrite: https://ast-grep.github.io/
