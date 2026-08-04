# Stage 01 — Codifying the Design System as Primitives and Templates (the DSL/Schema Layer)

**Research date:** August 2026
**Series:** Efficient AI Prototype Generation — Stage 1 of the proposed architecture
**Status:** Research document (standalone)

## Scope

This document investigates the foundation layer of the proposed architecture: turning a real product design system into a machine-consumable set of **primitives** — component contracts, layout containers, patterns, and tokens — plus a **schema/DSL** that an LLM can reliably target when emitting a construction file, and **templates** that a deterministic builder can instantiate. It surveys prior art in server-driven UI (Airbnb, Lyft, Spotify), JSON component models (Puck, Builder.io, Plasmic, craft.js, Gutenberg, Framer, react-jsonschema-form, Mitosis), and design-system-as-contract practice (Radix, shadcn); analyzes how to encode the schema so models follow it (JSON Schema vs. TypeScript-style types vs. Zod, DTCG tokens as the value layer); covers template/scaffold systems and registry models; addresses drift and versioning against the living design system; and closes with tradeoffs, escape hatches, and recommended experiments specific to this architecture.

---

## Table of Contents

1. [The core insight and why it is well-precedented](#1-the-core-insight-and-why-it-is-well-precedented)
2. [What the primitives should be](#2-what-the-primitives-should-be)
   - 2.1 The four-layer vocabulary
   - 2.2 Anatomy of a component contract
   - 2.3 Granularity: atomic primitives vs. pattern-level blocks
   - 2.4 Slots as constrained holes
3. [Prior art: schema-driven and server-driven UI](#3-prior-art-schema-driven-and-server-driven-ui)
   - 3.1 Server-driven UI at scale: Airbnb, Lyft, Spotify
   - 3.2 JSON component models in visual builders
   - 3.3 Block/metadata schemas: Gutenberg, Framer
   - 3.4 Compile-target IRs: Mitosis
   - 3.5 Design-system APIs as contracts: Radix, shadcn
   - 3.6 Lessons distilled
4. [Encoding the schema so LLMs use it correctly](#4-encoding-the-schema-so-llms-use-it-correctly)
   - 4.1 JSON Schema and constrained decoding
   - 4.2 TypeScript-style types as the prompt-facing spec
   - 4.3 Zod as the single source of truth
   - 4.4 The catalog document: an OpenAPI for components
   - 4.5 DTCG tokens as the value layer
   - 4.6 Naming and semantics that models follow reliably
   - 4.7 Validate-and-repair loops
5. [Template systems representative of real components](#5-template-systems-representative-of-real-components)
   - 5.1 Scaffold generators: Hygen, Plop, Nx, Yeoman heritage
   - 5.2 The copy-in registry model: shadcn
   - 5.3 Storybook stories as canonical usage
   - 5.4 What the deterministic builder actually instantiates
6. [Keeping primitives in sync with the real design system](#6-keeping-primitives-in-sync-with-the-real-design-system)
7. [Tradeoffs and value analysis for this architecture](#7-tradeoffs-and-value-analysis-for-this-architecture)
8. [Open questions and recommended experiments](#8-open-questions-and-recommended-experiments)
9. [References](#9-references)

---

## 1. The core insight and why it is well-precedented

The proposal — "LLM emits a small declarative construction file; a deterministic builder assembles real components" — is structurally identical to a pattern that large product companies have already built for a different reason. In **server-driven UI (SDUI)**, a backend emits a declarative payload describing *which* known components to render and *with what data*, and native clients render them with real, pre-built, on-brand implementations. Airbnb's Ghost Platform, Lyft's SDUI framework, and Spotify's (now-deprecated) HubFramework all converged on the same decomposition:

- a **closed vocabulary** of components ("sections") owned by the design-system/platform team;
- a **layout container** grammar describing arrangement ("screens");
- a **typed payload schema** shared across producers and consumers;
- **data separated from presentation logic**, with presentation logic living in the client component, not the payload.

The only novelty in the proposed architecture is *who authors the payload*: an LLM instead of a backend service. That substitution is exactly what the last two years of structured-output research addresses — and the empirical evidence (see §4.1) is that when output is constrained to a schema, validity can approach 100%, while the *semantic* quality of the choices still depends on how legible the vocabulary is to the model. So the design problem of this stage is really two problems:

1. **Vocabulary design** — what the primitives are and at what granularity (a design-system problem, §2).
2. **Spec legibility** — how the vocabulary is documented/encoded so a model selects and parameterizes primitives correctly (an LLM-interface problem, §4).

Everything else (templates §5, sync §6) is plumbing to keep those two honest against the living codebase.

---

## 2. What the primitives should be

### 2.1 The four-layer vocabulary

A workable primitive set is a layered vocabulary, from values up to pages:

| Layer | What it is | Examples | Who decides values |
|---|---|---|---|
| **Tokens** | Named design decisions (color, space, type, radius, motion) | `color.surface.raised`, `space.400`, `type.heading.md` | Design system only — the LLM should reference, never invent |
| **Component primitives** | Leaf components with a strict prop/variant contract | `Button`, `TextField`, `Badge`, `Avatar`, `Icon` | LLM picks variant + content within enums |
| **Layout containers** | Structural components that own arrangement, spacing, responsiveness | `Stack`, `Grid`, `Split`, `PageShell`, `Modal`, `Toolbar` | LLM picks container + children; container owns spacing via tokens |
| **Patterns / composites** | Opinionated multi-component blocks with named slots | `DataTableWithToolbar`, `SettingsSection`, `EmptyState`, `ObjectHeader`, `FormSection` | LLM picks pattern + fills slots; pattern owns internal structure |

Above patterns sits an optional fifth layer, **screen archetypes** (list-detail, dashboard, settings, wizard, object page), which encode entire page skeletons. Airbnb's Ghost Platform demonstrates that "Sections" (≈ patterns) plus "Screens" (≈ archetypes) is sufficient vocabulary to ship real product surfaces across web/iOS/Android ([Airbnb deep dive](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5)).

Two principles from SDUI practice worth adopting verbatim:

- **Data and UI travel together, logic does not.** The construction file says *what* appears with *what content*; interaction behavior lives inside the real component implementation. This is why SDUI payloads stay small and why deterministic assembly is possible.
- **The vocabulary is closed and owned.** New primitives are added by the design-system side, not invented per-prototype. The escape hatch (§7) is an explicit, marked primitive — not schema looseness.

### 2.2 Anatomy of a component contract

Each primitive needs more than a prop list. A contract that an LLM (and a validator) can act on includes:

```yaml
# catalog entry sketch (YAML for readability; storage format discussed in §4)
Button:
  kind: primitive
  description: >
    Triggers an action. Use `primary` at most once per view region.
    Never use for navigation — use Link.
  props:
    label:    { type: string, required: true, maxLength: 32 }
    variant:  { type: enum, values: [primary, secondary, ghost, destructive], default: secondary }
    size:     { type: enum, values: [sm, md, lg], default: md }
    iconLead: { type: iconRef, required: false }   # closed icon set, not free string
    disabled: { type: boolean, default: false }
  events:
    onPress:  { type: actionRef }                  # named intents, not code
  constraints:
    - "at most 1 variant=primary per FormActions or Toolbar"
    - "destructive requires ConfirmDialog pattern nearby"
  usage_example:   # one canonical instance — doubles as few-shot
    { type: Button, props: { label: "Save changes", variant: primary } }
  anti_example:
    bad:  { type: Button, props: { label: "Go to settings" } }
    why:  "Navigation — use Link or MenuItem instead."
```

The pieces and why each earns its place:

- **Props with enumerated variants and defaults.** Enums are the highest-leverage constraint: they turn open generation into selection. Defaults let the LLM omit — shorter output, fewer errors.
- **Slots** (for containers/patterns): named holes with *allowed-children* lists and cardinality (`min`/`max`), the schema equivalent of Gutenberg's parent/child block restrictions or Puck's zone restrictions.
- **Constraints**: usage rules ("one primary CTA per region") that pure JSON Schema cannot express but a post-validator can lint. Encode them in machine-checkable form where possible; keep the prose version in the description because models read prose.
- **Semantic description with "use when / never use for."** This is where correct *selection* between near-neighbors (Badge vs. Tag vs. Pill; Modal vs. Drawer vs. Popover) is won or lost.
- **One canonical usage example and one anti-example.** Few-shot in the catalog itself outperforms abstract descriptions for selection accuracy; this mirrors what Storybook stories already are (§5.3).
- **Events as named intents** (`actionRef` like `submitForm`, `navigate:detail`, `openDialog:confirmDelete`) rather than inline handlers — keeping behavior out of the construction file, per the SDUI principle.

### 2.3 Granularity: atomic primitives vs. pattern-level blocks

The central tradeoff of this stage. The two poles:

**Atomic-first** (vocabulary ≈ Button/Input/Stack/Text):
- ✅ Maximum expressiveness; almost any screen is reachable.
- ✅ Small catalog (20–40 entries) — cheap to keep in context.
- ❌ The LLM re-derives every pattern (form layout, table toolbar, card anatomy) each time → the *composition* becomes the unreliable part. You've moved the hallucination from CSS to structure.
- ❌ Construction files get deep and long — token savings evaporate.
- ❌ "On-system" only guarantees on-system *pieces*, not on-system *layouts*.

**Pattern-first** (vocabulary ≈ SettingsSection/DataTablePage/CheckoutForm):
- ✅ Few decisions per screen; construction files are short (Airbnb's screens are lists of sections with data).
- ✅ Design intent (spacing rhythm, hierarchy, responsive behavior) is baked in and cannot drift.
- ❌ Expressiveness ceiling arrives fast; every unanticipated screen becomes a feature request on the catalog.
- ❌ Catalog grows combinatorially if patterns try to absorb variation as props ("prop explosion" — the classic design-system API smell).

**Recommendation: a two-level grammar, pattern-first with atomic infill.** The construction file's top level speaks in screen archetypes and patterns; *inside designated slots*, the LLM may compose from a small set of atomic primitives and layout containers. This mirrors how Airbnb constrains screens→sections but lets section producers vary content, and how Gutenberg allows nested blocks only inside blocks that declare support. Concretely:

```json
{
  "screen": "settings",
  "regions": {
    "main": [
      { "type": "SettingsSection",
        "props": { "title": "Notifications" },
        "slots": {
          "rows": [
            { "type": "ToggleRow", "props": { "label": "Email digests", "checked": true } },
            { "type": "ToggleRow", "props": { "label": "Mentions", "checked": false } },
            { "type": "CustomRow", "slots": { "content": [
                { "type": "Stack", "props": { "gap": "space.200" }, "children": [
                    { "type": "Text", "props": { "variant": "body-sm", "text": "Quiet hours" } },
                    { "type": "TimeRangeInput", "props": { "start": "22:00", "end": "07:00" } }
                ] }
            ] } }
          ]
        }
      }
    ]
  }
}
```

The `CustomRow` is the sanctioned drop to atomic granularity — visible, lintable, and countable (a prototype whose construction file is 80% `CustomRow` is a signal that the pattern catalog is missing something).

### 2.4 Slots as constrained holes

Slots deserve first-class treatment because they are the mechanism that makes "containers constructed deterministically, LLM surgically authors contents" real. Prior art for slot semantics:

- **Radix UI's `asChild`/Slot** ([radix-ui.com/primitives](https://www.radix-ui.com/primitives/docs/utilities/slot)) — behavior-owning primitive delegates rendering to a child; the contract is "one child, receives merged props."
- **Web Components named slots** — named insertion points with fallback content; fallback content is a useful idea for prototypes (empty slot still renders something sensible).
- **Puck zones/DropZones** ([puckeditor.com](https://puckeditor.com)) — named regions with `allow`/`disallow` component lists; exactly the constraint model needed here.
- **Gutenberg `allowedBlocks` / `parent` / `ancestor`** in block.json — bidirectional containment rules (a block can also declare *where it is allowed to live*).

A slot definition in the catalog should carry: name, allowed types (or "any primitive"), cardinality, ordering semantics, and fallback. This is the part of the schema most worth over-specifying, because containment errors (a `TableCell` outside a `Table`) are the deterministic builder's most likely runtime failure.

---

## 3. Prior art: schema-driven and server-driven UI

### 3.1 Server-driven UI at scale: Airbnb, Lyft, Spotify

**Airbnb — Ghost Platform (GP).** The canonical write-up is Ryan Brooks' [deep dive](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5) (see also [InfoQ's summary](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)). Key architectural facts relevant here:

- The unit of UI is the **Section** — an independent, reusable component with a typed data payload. A **Screen** declares which sections appear and a layout arrangement. This two-level grammar shipped real features across web, iOS, Android.
- A **single shared GraphQL schema** defines the payload for all three platforms; client frameworks in TypeScript/Swift/Kotlin render sections natively. The schema *is* the contract; drift is structurally impossible because clients are generated against it.
- Sections carry data + presentation selection; **interaction logic lives in client code**. GP payloads include "actions" as declarative events, resolved by client-side handlers — the same named-intent approach recommended in §2.2.

**Lyft.** Lyft's SDUI motivation was A/B testing UI across millions of users without release cycles; their Jetpack Compose adoption story ([Android Developers Blog](https://android-developers.googleblog.com/2022/10/lyft-reduced-their-code-for-ui-components-using-jetpack-compose.html)) notes the SDUI framework team adopted Compose specifically because declarative rendering makes server-pushed component-tree changes cheap. Lesson: a declarative client rendering layer makes the deterministic builder trivial — for the proposed architecture, React (or any declarative framework) plays that role, so the "builder" can be a thin recursive walk of the construction file.

**Spotify.** Spotify's **HubFramework** (open-sourced 2016, later deprecated) was a component-driven SDUI framework for iOS; its deprecation is a useful cautionary datapoint — SDUI systems die when the component vocabulary's maintenance cost exceeds the iteration speed it buys (see the comparative discussion in [this SDUI retrospective](https://medium.com/@aubreyhaskett/server-driven-ui-what-airbnb-netflix-and-lyft-learned-building-dynamic-mobile-experiences-20e346265305)). Spotify's design system **Encore** ([Figma blog interview](https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/)) is organized as a federated "system of systems" — token layer shared globally, platform catalogs above it — which is the right mental model for keeping a prototype-primitive catalog as a *view* over the real system rather than a fork.

The transferable SDUI lessons:

1. Two-level grammar (screens/sections) is proven sufficient for production surfaces.
2. Contract-first schemas shared between producer and consumer eliminate drift by construction.
3. Keep behavior in components, intents in payloads.
4. The vocabulary has a real carrying cost; budget for it or the system rots (HubFramework).

### 3.2 JSON component models in visual builders

Visual page builders solved "non-engineer authors a component tree against a closed catalog" a decade ago; an LLM is just a new author. Their data models are directly reusable prior art:

**Puck** ([github.com/puckeditor/puck](https://github.com/puckeditor/puck)) — open-source React visual editor. Its model is the cleanest template for this architecture: a **config** (catalog) maps component names → `{ fields, defaultProps, render }`, and the **data** (construction file) is plain JSON: a `content` array of `{ type, props }` nodes plus named `zones` for nested slots. Fields are typed (text, number, select, radio, array, object, external) — i.e., Puck already defines a field-type vocabulary for props that an LLM prompt can reuse. Puck's `resolveData` hook (async data enrichment after authoring) maps to the proposal's "fill with real/sample data" step.

**Builder.io content JSON** ([builder.io](https://www.builder.io/c/docs/how-builder-works-technical)) — content entries are trees of elements (`@type: "@builder.io/sdk:Element"`) where each element names a registered component and an `options` (props) bag, plus responsive styles. Notable: Builder registers **code components** with input metadata so the visual editor knows what's configurable — the same registration/metadata move as Plasmic. Builder is also the furthest along in AI authoring against this model (Visual Copilot / Fusion generate against registered components), making it the closest commercial analog to the proposed architecture.

**Plasmic** ([docs.plasmic.app/learn/registering-code-components](https://docs.plasmic.app/learn/registering-code-components/)) — registration API where you pass the real React component plus metadata: prop types (with editor controls), slot props, default styles, and importantly **prop-control conditionality** (`hidden`, `advanced`) — a reminder that catalogs can encode *which knobs matter*, which is equally useful for telling an LLM what to leave alone.

**craft.js / Measured** ([craft.js.org](https://craft.js.org)) — a headless page-editor framework whose editor state is a serialized flat node map: `{ nodeId: { type, props, nodes: [childIds], linkedNodes } }`. The flat-map-with-id-references shape (vs. deeply nested trees) is worth considering for the construction file: it makes surgical LLM edits (patch one node) and diffing much cheaper than re-emitting a nested tree. This matters for the "LLM surgically authors contents within" part of the proposal.

**react-jsonschema-form (RJSF)** ([rjsf-team.github.io/react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/docs/)) — the granddaddy of schema-driven UI in React: JSON Schema in, form UI out, with a parallel `uiSchema` for presentation hints. Two transferable ideas: (a) the **data-schema / ui-schema split** — for form-heavy prototypes, the LLM could emit a JSON Schema of the *data* and a uiSchema of presentation, and the builder gets an entire working form from RJSF-style machinery for free; (b) proof that JSON Schema alone under-specifies presentation, hence the second file — expect the same split pressure in any construction-file design.

### 3.3 Block/metadata schemas: Gutenberg, Framer

**WordPress Gutenberg block.json** ([block metadata reference](https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md), [published JSON Schema](https://github.com/WordPress/gutenberg/blob/trunk/schemas/json/block.json)) is the most battle-tested public component-contract format (hundreds of thousands of blocks in the wild). Relevant design decisions:

- `attributes` — typed props with `default`, plus *source* mapping (where the value is stored/derived).
- `supports` — capability flags (color, spacing, typography…) that gate which *global* controls apply to the block: a clean way to say "this primitive accepts token-level customization on these axes only."
- `parent` / `ancestor` / `allowedBlocks` — containment constraints (see §2.4).
- `styles` (named style variations) and `example` (canonical preview instance — literally the few-shot example embedded in the contract).
- The whole format has a published JSON Schema, so `block.json` files are editor-validated — the pattern to copy: **publish a meta-schema for your catalog entries.**

**Framer code components** ([framer.com/developers](https://www.framer.com/developers/components-introduction)) — `addPropertyControls(Component, {...})` declares typed controls (enum, color, fusedNumber, array, componentInstance) so the canvas can manipulate real React components. Notable for the token layer: control types like `ControlType.Color` accept token references, and `ControlType.ComponentInstance` is a slot-as-prop. Framer proves that a *thin metadata layer over real components* (rather than a parallel component model) is enough for third-party tooling to compose them — which is exactly the relationship the primitive catalog should have to the production design system.

### 3.4 Compile-target IRs: Mitosis

**Mitosis** ([github.com/BuilderIO/mitosis](https://github.com/BuilderIO/mitosis)) writes components once in a restricted JSX subset, parses to a JSON IR (`MitosisComponent`), and compiles to React, Vue, Svelte, Angular, Qwik, etc. Relevance: it demonstrates that a **JSON IR of UI is a viable compile target** with multiple serializers — the construction file in the proposed architecture is a (much higher-level) IR, and the deterministic builder is one serializer. If the prototype pipeline ever needs to target more than one framework (e.g., React prototype + SwiftUI prototype from one construction file), the Mitosis architecture — one IR, N generators — is the roadmap, and its key enabling decision was *restricting the input language* until it was statically analyzable. Same lesson at the DSL level: expressiveness you exclude is what makes determinism possible.

### 3.5 Design-system APIs as contracts: Radix, shadcn

- **Radix Primitives** ([radix-ui.com/primitives](https://www.radix-ui.com/primitives)) show what a *behavioral* contract looks like: compound components (`Dialog.Root/Trigger/Content`), controlled/uncontrolled prop pairs, `asChild` composition. For the catalog, compound components should usually be exposed as a *single* pattern-level primitive (`Dialog` with `trigger`/`content` slots) — the LLM should not be asked to reassemble `Root/Portal/Overlay/Content` correctly every time; that assembly is precisely what the template owns.
- **shadcn/ui** ([ui.shadcn.com](https://ui.shadcn.com)) matters twice: as the de facto naming standard LLMs know best (§4.6), and as a distribution model (§5.2). Its variant idiom — `class-variance-authority` (cva) definitions enumerating `variant`/`size` with defaults — is effectively a machine-readable variant contract already sitting in component source, extractable into the catalog automatically (§6).

### 3.6 Lessons distilled

| Source | Lesson for the primitive layer |
|---|---|
| Airbnb GP | Screens→sections two-level grammar suffices; shared typed schema kills drift |
| Lyft | Declarative render layer makes the builder trivial; SDUI pays off when iteration speed is the goal |
| Spotify HubFramework | Vocabulary maintenance cost is real; deprecated when cost > value |
| Puck | Catalog = `{type → fields, defaultProps, render}`; data = `{type, props}` tree + zones — reuse this shape |
| Builder.io | Register real components with metadata; AI authoring against a registered catalog is proven commercially |
| Plasmic | Prop metadata can encode which knobs matter (`hidden`/`advanced`) |
| craft.js | Flat node-map serialization enables surgical edits and cheap diffs |
| RJSF | Expect a data-schema/ui-schema split for form-heavy screens |
| Gutenberg | Publish a meta-schema; `supports` flags for token-axis customization; containment constraints; embedded `example` |
| Framer | Thin metadata over real components beats a parallel component model |
| Mitosis | JSON IR + N generators; restrict the input language to keep it analyzable |
| Radix/shadcn | Expose compound components as one pattern with slots; cva variants are extractable contracts |

---

## 4. Encoding the schema so LLMs use it correctly

Two distinct artifacts are needed, and conflating them is a common mistake:

- **The output grammar** — the schema of the construction file itself (enforced at generation time).
- **The catalog** — documentation of available primitives, their props/slots/constraints/examples (consumed as context).

### 4.1 JSON Schema and constrained decoding

For the output grammar, JSON Schema is the pragmatic choice because every serving stack enforces it: OpenAI Structured Outputs, Anthropic tool `input_schema`, and open-source constrained-decoding engines (Outlines, Guidance, XGrammar — XGrammar is now the default structured-generation backend in vLLM/SGLang/TensorRT-LLM). With grammar-constrained decoding, **schema validity is guaranteed by construction** — the sampler masks tokens that would violate the schema ([overview](https://www.aidancooper.co.uk/constrained-decoding/); [JSONSchemaBench, arXiv:2501.10868](https://arxiv.org/pdf/2501.10868) benchmarks engines on coverage/efficiency/quality across ~10K real-world schemas).

Design guidance for the construction-file schema:

- Model the node as a **discriminated union on `type`** with per-type `props` schemas. Constrained decoders and models both handle tagged unions far better than `oneOf` over structurally similar objects.
- **Recursion is supported but costly** — deeply recursive schemas degrade both decoder performance and model planning. The two-level grammar (§2.3) conveniently bounds depth: screen → pattern → (slot) → atomic, max ~4–5 levels.
- Beware the caveat from ["Let Me Speak Freely?" (arXiv:2408.02442)](https://arxiv.org/pdf/2408.02442): hard format restriction can measurably degrade *reasoning* quality. Mitigation used in practice: let the model plan in prose first (or in a `"rationale"` field ordered before the tree; key order is part of the schema), then emit the constrained structure — or split planning and emission into two calls, which dovetails with the proposal's intent/concept stage.
- Enums everywhere values are closed (variants, sizes, token refs, icon names, action intents). Every enum is a hallucination class eliminated.

### 4.2 TypeScript-style types as the prompt-facing spec

For the *catalog* (context, not enforcement), compact TypeScript-style type definitions materially beat raw JSON Schema: BAML's analysis found **type-definition prompting uses ~60% fewer tokens than the equivalent JSON Schema with no information loss** ([BAML blog](https://boundaryml.com/blog/type-definition-prompting-baml)), because JSON Schema's own JSON syntax (`"type": "object"`, `"properties"`, quoting) is overhead the model doesn't need. Models also have vastly more TypeScript in training data than JSON Schema meta-syntax. A catalog entry rendered for the prompt:

```ts
/** Triggers an action. Max one `primary` per region. Never for navigation (use Link). */
type Button = {
  type: "Button";
  props: {
    label: string;              // <= 32 chars
    variant?: "primary" | "secondary" | "ghost" | "destructive"; // default: secondary
    size?: "sm" | "md" | "lg";  // default: md
    iconLead?: IconName;
    onPress?: ActionRef;
  };
};
```

This is prompt-side sugar only; the enforcement layer stays JSON Schema. Tool-schema overhead is nontrivial at scale (catalogs easily reach thousands of tokens; agent tool schemas are measured at 3K–25K tokens per invocation in recent surveys), so the 60% compression compounds with prompt caching.

### 4.3 Zod as the single source of truth

The maintenance answer to "JSON Schema for enforcement, TS types for prompts, validators for constraints" is: author once in **Zod** (or Pydantic on the Python side) and derive the rest.

```ts
const ButtonNode = z.object({
  type: z.literal("Button"),
  props: z.object({
    label: z.string().max(32),
    variant: z.enum(["primary", "secondary", "ghost", "destructive"]).default("secondary"),
    size: z.enum(["sm", "md", "lg"]).default("md"),
    iconLead: IconName.optional(),
    onPress: ActionRef.optional(),
  }),
}).describe("Triggers an action. Never for navigation — use Link.");

const Node: z.ZodType<NodeT> = z.lazy(() =>
  z.discriminatedUnion("type", [ButtonNode, StackNode, SettingsSectionNode /* … */]));
```

From this one definition: `z.toJSONSchema()` (native in Zod 4) → the enforcement schema; a printer → the TS-style prompt catalog; `.parse()` → the builder's runtime validation with defaults applied; `.superRefine()` → the cross-node lint rules JSON Schema can't express ("one primary per region"). Zod 4 also added significant JSON Schema interop precisely because this schema-as-hub pattern became standard in LLM pipelines.

### 4.4 The catalog document: an OpenAPI for components

Treat the catalog as a spec document with the same discipline OpenAPI brought to REST: machine-readable source, human/model-readable rendering, versioned, published. A practical structure:

```
catalog/
  meta.json            # catalog version, DS package version it was generated from
  tokens.json          # DTCG token file (see §4.5)
  primitives/*.json    # one contract per primitive (validated against meta-schema)
  patterns/*.json      # pattern contracts incl. slot definitions
  screens/*.json       # screen archetypes
  examples/*.json      # canonical construction-file snippets (few-shot corpus)
  render/catalog.d.ts  # generated TS-style prompt rendering
  schema.json          # generated construction-file JSON Schema
```

For prompt assembly, do **not** ship the whole catalog every call once it exceeds ~50 entries: retrieve the relevant subset (screen archetype + patterns matching the intent + always-on core primitives), and rely on prompt caching for the stable core. This is the same motion as MCP servers exposing design systems on demand — e.g., the [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) and Storybook-based design-system MCP servers surface component docs as tools/resources rather than as a monolithic prompt.

### 4.5 DTCG tokens as the value layer

The token layer should be a **DTCG Design Tokens Format Module** file — the spec reached its first stable version (2025.10, Candidate Recommendation) in October 2025 ([spec](https://www.designtokens.org/tr/2025.10/format/), [announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)), with support across Figma, Style Dictionary, Tokens Studio, Terrazzo, Penpot, Sketch, and others. Shape:

```json
{
  "color": { "surface": { "raised": { "$type": "color", "$value": "#FFFFFF" } } },
  "space": { "400": { "$type": "dimension", "$value": { "value": 16, "unit": "px" } } },
  "action": { "bg": { "$type": "color", "$value": "{color.brand.600}" } }
}
```

Rules for the construction file: **props that accept visual values accept only token references** (`"gap": "space.400"`), enumerated in the schema, never raw hex/px. This single rule does most of the "on-system" enforcement work, and DTCG aliasing means semantic tokens (`action.bg`) — the level the LLM should reference — stay stable while primitives rebrand underneath. Style Dictionary ([styledictionary.com](https://styledictionary.com/info/dtcg/)) is the standard transformer from the DTCG file to platform outputs, and equally serves as the bridge *from* Figma Variables into the catalog (§6).

### 4.6 Naming and semantics that models follow reliably

Empirically important and cheap to get right:

- **Align names with the ecosystem the model already knows.** Models have deep priors from Radix/shadcn/MUI/Chakra. A `Dialog` with `open`/`onOpenChange` gets used correctly with near-zero documentation; a bespoke `PopupWindow` with `visible`/`setShown` fights the prior. Where the internal DS uses idiosyncratic names, consider aliasing in the catalog (`type: "Dialog"` → internal `OverlayPanel`) — the builder owns the mapping.
- **Semantic, intent-revealing enum values** (`variant: "destructive"` not `variant: "v3"`; `gap: "space.400"` not `gap: 4`), because the model selects by meaning.
- **Descriptions are load-bearing.** In tool-use evals, the description field drives selection more than the schema shape. Write "use when / don't use when" comparatively, naming the near-neighbor alternatives.
- **Prefer flat props over nested config objects** — fewer nesting errors, better partial generation.
- **Put defaults in the contract and tell the model to omit defaults** — shorter files, fewer wrong values, cleaner diffs.

### 4.7 Validate-and-repair loops

Even with constrained decoding (structural validity guaranteed), *semantic* validation remains: unknown token refs (if not enum-locked), containment-rule violations, constraint lints, missing required slots. The standard pattern is deterministic validation → machine-readable error list → one repair call with the errors and the offending subtree only (cheap, surgical — and another argument for craft.js-style addressable nodes). Budget for exactly one repair round; beyond that, error rates signal a catalog-legibility problem, not a model problem.

---

## 5. Template systems representative of real components

### 5.1 Scaffold generators: Hygen, Plop, Nx, Yeoman heritage

The deterministic builder is, mechanically, a code generator — a lineage with mature tooling:

- **Yeoman** ([yeoman.io](https://yeoman.io)) — the heritage: generator packages with prompts + template copies. Mostly relevant as the cautionary tale on generator drift (§6): generated code that isn't regenerable rots.
- **Plop** ([plopjs.com](https://plopjs.com)) — "micro-generator framework": Handlebars templates + a `plopfile` of generators/actions (`add`, `modify`, `append`). The action model — a list of declarative file operations — is a good shape for the builder's internals: construction file → list of add/modify actions → files.
- **Hygen** ([hygen.io](https://www.hygen.io)) — templates-live-in-the-repo (`_templates/`), EJS with frontmatter (`to:`, `inject:`, `after:`) enabling *injection into existing files*, not just file creation. Injection matters for this architecture: registering a generated screen into a router/nav file is an inject operation.
- **Nx generators** ([nx.dev](https://nx.dev/extending-nx/recipes/local-generators)) — TypeScript generators over a *virtual file tree* with dry-run diffing. The virtual-tree + dry-run design is worth copying: the builder can produce a full diff preview of the prototype before writing anything — useful for the designer-in-the-loop review step.

The builder for this architecture is best understood as **Plop-style declarative actions, driven not by interactive prompts but by the construction file**, with Hygen-style injection for wiring and Nx-style dry-run for preview.

### 5.2 The copy-in registry model: shadcn

shadcn's registry format is the closest existing thing to the proposal's "code templates representative of the real components," and it's already LLM-ecosystem-native (the shadcn CLI and MCP server install from any conforming registry):

- **[`registry.json`](https://ui.shadcn.com/docs/registry/registry-json)** — index: name, homepage, items.
- **[`registry-item.json`](https://ui.shadcn.com/docs/registry/registry-item-json)** — per item: `name`, `type` (`registry:ui`, `registry:block`, `registry:page`, `registry:component`, `registry:hook`, `registry:style`…), `description`, `files` (with target paths), `dependencies` (npm), `registryDependencies` (other items), `cssVars`/`tailwind` config.

Notable properties of the model for this architecture:

1. **`registry:block`** is exactly the pattern-level primitive: a multi-file composite (page + components + hooks) with declared dependencies. shadcn's own blocks (dashboards, login pages, sidebars) demonstrate pattern-level granularity in the wild.
2. **`registryDependencies`** gives the dependency closure — the builder can resolve a construction file to the exact set of component sources to materialize, deterministically.
3. **Copy-in vs. import tension.** shadcn copies source into the project (ownable, editable — good for prototypes meant to be hacked on); classic DS packages import from npm (non-drifting — good for fidelity). For prototypes, a sensible hybrid: *import real DS components* for primitives (fidelity, zero drift) and *copy in generated scaffold* for screens/patterns instantiated from templates (editable, disposable).
4. The registry format is a JSON contract an LLM can also *read* — teams already point coding agents at registry indexes; the primitive catalog (§4.4) can embed or reference registry items so contract and installable artifact travel together.

### 5.3 Storybook stories as canonical usage

Storybook CSF3 stories are already: (a) real, executing usage examples of every component; (b) enumerations of meaningful states/variants (`Primary`, `Destructive`, `LoadingState`); (c) structured metadata (`argTypes` with control types and options — a de facto prop contract); (d) increasingly, LLM-facing documentation — Storybook's guidance on [connecting design systems to LLMs](https://storybook.js.org/blog/design-systems-in-the-age-of-ai/) and community design-system MCP servers expose stories/docs as agent context.

Uses in this architecture:

- **Extraction source:** `argTypes` + story args → catalog props/variants/examples, automatically (§6).
- **Few-shot corpus:** each pattern's canonical story is the `usage_example` in its contract.
- **Ground truth for the builder:** a builder-materialized primitive should render identically to its story; visual-regression (Chromatic) between "story" and "builder output for the equivalent construction node" is a strong CI check that templates faithfully represent real components.

### 5.4 What the deterministic builder actually instantiates

Putting §§5.1–5.3 together, "template" means three different things by layer, and keeping them distinct avoids muddle:

| Layer | Template form | Builder operation |
|---|---|---|
| Primitive (Button…) | None — the real DS component, imported | Emit JSX: `<Button variant="primary">Save</Button>` |
| Pattern (SettingsSection…) | Real composite component with slot props, imported or registry block | Emit JSX with slot children from construction file |
| Screen archetype | Scaffold template (EJS/Handlebars) with regions + wiring | Instantiate file(s), inject route/nav entries |
| App shell | Static boilerplate (Vite/Next starter with DS installed, tokens wired) | Copy once per prototype |

The key discipline: **the amount of generated (vs. imported) code should be minimized** — every generated line is a line that can drift from the design system. The construction file should compile mostly to *invocations* of real components, and templates exist only for the connective tissue (files, routes, layout regions, sample-data plumbing).

---

## 6. Keeping primitives in sync with the real design system

Drift is the failure mode that killed many a generator (Yeoman-era scaffolds) and SDUI vocabulary (HubFramework). Four sources of truth exist — component source code, Storybook, Figma, and the token pipeline — and the catalog must be *generated from* them, never hand-maintained in parallel.

**Generate contracts from component source.**
- **react-docgen-typescript** / **react-docgen** extract prop names, TS types, JSDoc descriptions, defaults from real components — this is exactly how Storybook autogenerates `argTypes`. A nightly (or CI-on-DS-release) job regenerates `primitives/*.json` from the DS package.
- **cva/variant extraction:** for shadcn-style codebases, `cva()` definitions are statically parseable into variant enums + defaults.
- **TS compiler API** for anything docgen misses (generic props, discriminated unions).

**Generate examples from Storybook.** Story files (CSF is statically analyzable; Storybook's index JSON lists all stories) → canonical `usage_example` per contract, kept live because stories break in CI when components change.

**Sync the token layer from design tools.** Figma Variables ↔ DTCG via Figma's Variables REST API, Tokens Studio, or Terrazzo; Style Dictionary transforms to platform outputs. Because the construction file references tokens only by name (§4.5), token *value* changes require no catalog change at all — only additions/removals/renames do.

**Bridge design-tool components with Code Connect.** [Figma Code Connect](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration) maps Figma components to real code components with prop mappings; teams using it already maintain machine-readable "Figma prop → code prop" tables. If prototype briefs ever arrive as Figma frames (likely in a design org), Code Connect mappings let the intent stage resolve "this frame uses DS/Button[variant=primary]" directly into catalog terms. Figma's Simple Design System (SDS) repo demonstrates the full triangle: React + Storybook + Code Connect + token sync.

**Versioning discipline:**

- Stamp every catalog build with the DS package version it was generated from (`meta.json`); stamp every construction file with the catalog version it targeted. A construction file is then *replayable* — rerun the builder against a newer catalog and diff, which is how old prototypes get cheap facelifts after a DS release.
- **Deprecation as metadata, not deletion:** contracts get `deprecated: true` + `replacement:` so the validator can warn and the repair loop can migrate, mirroring how Gutenberg handles block deprecations with migration functions.
- **CI drift gate:** regenerate the catalog on every DS release; a non-empty diff that wasn't reviewed fails the gate. Plus the §5.3 visual-regression check that builder output matches stories.
- Semver semantics for the catalog: prop/variant additions = minor; removals/renames = major, which should be rare precisely because the LLM-facing names can be aliases (§4.6) — the alias table absorbs internal churn.

---

## 7. Tradeoffs and value analysis for this architecture

**Where the value is real:**

- **Reliability transfer.** The LLM's job shrinks from "write correct, on-system React/CSS" to "choose and parameterize from a closed vocabulary." Structural validity becomes guaranteeable (constrained decoding, §4.1); visual fidelity becomes *inherited* (real components render). The residual error surface — wrong primitive selection, wrong content — is smaller, cheaper to detect, and cheaper to repair.
- **Token economics.** A construction file for a screen is typically 10–30× smaller than the equivalent generated TSX+CSS, and the stable catalog prefix is prompt-cacheable. Compression compounds: TS-style catalog rendering (~60% smaller than JSON Schema, §4.2), omitted defaults, retrieval of catalog subsets.
- **Reviewability and editability.** A designer can read a construction file; diffs are semantic ("added a FormSection") not syntactic; surgical edits (regenerate one node) are natural, especially with flat-map addressing (§3.2, craft.js).
- **Replayability** (§6): prototypes upgrade with the design system for free — impossible when every prototype is bespoke generated code.

**The expressiveness ceiling — what a fixed primitive set cannot say:**

1. **Novel interaction patterns** — anything whose *behavior* isn't already a component (a new gesture, a bespoke drag-to-reorder visualization). The construction file carries intents, not behavior; new behavior needs a new primitive.
2. **Motion and choreography** — staggered transitions, shared-element animation. Feasible only as pre-built motion presets on containers.
3. **Bespoke layout** — anything off the container grammar (overlapping/free-form/canvas layouts, art-directed marketing pages). SDUI systems hit exactly this wall; it's why Ghost Platform serves product surfaces, not the brand homepage.
4. **Conditional logic and state machines** — "show X after 3 items are selected." Declarative payloads express structure, not logic; beyond trivial visibility conditions, this belongs in code.
5. **Data transformation** — derived values, formatting pipelines. Mitigate with a small formatter enum (`currency`, `relativeTime`), but the tail is long.
6. **The genuinely new component** — by definition outside the catalog; and prototyping is often *for* exploring the new.

**Escape hatches (design them in from day one):**

- **`CustomBlock` primitive:** a marked island whose contents the LLM authors as real code (JSX constrained to DS imports + tokens), rendered inside a deterministic container. This is the proposal's "LLM surgically authors contents within" formalized: containers/patterns deterministic, islands generative. Lint the islands (imports whitelist, token-only styling) so even escape-hatch code stays semi-on-system.
- **Style overrides restricted to token refs** on a whitelisted axis set — Gutenberg's `supports` model (§3.3) — never raw CSS.
- **Eject:** the builder's output is ordinary project code; a prototype that outgrows the DSL is abandoned *forward* into hand editing, losing replayability but nothing else. Make ejection explicit (stamp the file) so nobody expects regeneration to preserve hand edits.
- **Escape-hatch telemetry:** the fraction of nodes using `CustomBlock`/overrides is the single best health metric of the catalog — rising usage = missing patterns; near-zero = catalog possibly over-fitted or prototypes insufficiently ambitious.

**When it is *not* worth it:** exploratory concept work that deliberately departs from the current system (new product lines, brand-level exploration); one-off throwaway prototypes where a general-purpose generator (v0, Fusion, plain Claude) is faster than catalog upkeep; and teams without a stable componentized design system to codify — the architecture *amplifies* an existing system, it cannot substitute for one. The Spotify HubFramework lesson applies directly: the catalog has a standing maintenance cost (mitigated but not eliminated by generation-from-source, §6), and the architecture pays off in proportion to prototype volume against a stable system.

---

## 8. Open questions and recommended experiments

**Open questions**

1. **Optimal granularity split** — which decisions belong in pattern contracts vs. LLM-composed slots? (Hypothesis from §2.3: pattern-first with atomic infill; needs empirical calibration per design system.)
2. **Catalog exposure strategy** — full catalog in a cached prompt vs. retrieval of subsets vs. MCP-style on-demand lookup; at what catalog size does each win?
3. **Construction-file shape** — nested tree (readable, matches JSX mental model) vs. flat node map (diffable, surgically editable)? Possibly: nested for generation, flattened for edits.
4. **How much does constrained decoding hurt selection quality** for this task (per arXiv:2408.02442), and does a plan-then-emit split recover it?
5. **Behavior boundary** — how far can named action intents + simple visibility conditions go before prototypes feel dead? Where exactly does interactivity force code islands?
6. **Aliasing vs. native naming** — does mapping internal DS names onto ecosystem-familiar names (Dialog, Sheet, Badge) measurably improve selection accuracy, and what does the alias table cost in confusion?
7. **Multi-fidelity** — can one construction file drive both a lo-fi wireframe renderer and the hi-fi builder (same tree, two serializers, per Mitosis)?

**Recommended experiments (ordered, each ~days not weeks)**

1. **Minimal vertical slice:** hand-write a catalog of ~15 primitives + 5 patterns + 2 screen archetypes (Zod source per §4.3); build the Plop-style builder; run 10 realistic prototype briefs. Metrics: schema-validity rate (should be ~100% with constrained decoding), primitive-selection accuracy (human-judged), tokens per prototype vs. a freeform-generation baseline, wall-clock, and designer-rated on-system fidelity.
2. **Granularity A/B:** same 10 briefs against (a) atomic-only catalog, (b) pattern-first catalog, (c) two-level grammar. Compare construction-file size, error classes, fidelity ratings. This directly answers question 1.
3. **Extraction pipeline spike:** run react-docgen-typescript + story extraction against the real design system; measure what fraction of the hand-written catalog could have been generated, and what human-authored fields remain irreducible (descriptions, constraints, anti-examples — expect these to be the durable manual investment).
4. **Escape-hatch stress test:** pick 5 briefs *chosen to exceed* the catalog (novel interaction, bespoke layout); measure how gracefully `CustomBlock` degrades, and whether the resulting prototypes are still mostly-deterministic (target: >70% of nodes from catalog).
5. **Repair-loop economics:** measure semantic-error rate post-generation and cost of one surgical repair round vs. full regeneration, on both nested and flat file shapes (answers question 3).
6. **Replay test:** bump a token set and a component's variant enum, regenerate the catalog, replay all experiment-1 construction files; count breakages and verify the deprecation-migration path (§6) works end to end.

---

## 9. References

- Ryan Brooks, [A deep dive into Airbnb's server-driven UI system](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5) — Airbnb Tech Blog
- [Airbnb's Server-Driven UI Platform](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/) — InfoQ
- [Lyft reduced their code for UI components using Jetpack Compose](https://android-developers.googleblog.com/2022/10/lyft-reduced-their-code-for-ui-components-using-jetpack-compose.html) — Android Developers Blog
- [Server-Driven UI: What Airbnb, Netflix, and Lyft Learned](https://medium.com/@aubreyhaskett/server-driven-ui-what-airbnb-netflix-and-lyft-learned-building-dynamic-mobile-experiences-20e346265305) — Medium
- [How Spotify's Design System Goes Beyond Platforms (Encore)](https://www.figma.com/blog/creating-coherence-how-spotifys-design-system-goes-beyond-platforms/) — Figma Blog
- [Puck — the visual editor for React](https://github.com/puckeditor/puck) — GitHub
- [Builder.io](https://www.builder.io/c/docs/how-builder-works-technical) — content JSON / registered components
- [Registering your code components](https://docs.plasmic.app/learn/registering-code-components/) — Plasmic docs
- [craft.js](https://craft.js.org) — headless page editor framework
- [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/docs/) — RJSF docs
- [Gutenberg block metadata (block.json)](https://github.com/WordPress/gutenberg/blob/trunk/docs/reference-guides/block-api/block-metadata.md) and [published JSON Schema](https://github.com/WordPress/gutenberg/blob/trunk/schemas/json/block.json) — WordPress
- [Framer code components / property controls](https://www.framer.com/developers/components-introduction) — Framer
- [Mitosis — write components once, compile to every framework](https://github.com/BuilderIO/mitosis) — Builder.io
- [Radix Primitives](https://www.radix-ui.com/primitives) — Radix UI
- [shadcn/ui registry.json](https://ui.shadcn.com/docs/registry/registry-json) and [registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json) — shadcn docs
- [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) and [first stable version announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/) — DTCG / W3C
- [Style Dictionary — DTCG support](https://styledictionary.com/info/dtcg/)
- [JSONSchemaBench: A Rigorous Benchmark of Structured Outputs for Language Models](https://arxiv.org/pdf/2501.10868) — arXiv
- [Let Me Speak Freely? Impact of Format Restrictions on LLM Performance](https://arxiv.org/pdf/2408.02442) — arXiv
- [A Guide to Structured Outputs Using Constrained Decoding](https://www.aidancooper.co.uk/constrained-decoding/) — Aidan Cooper
- [Your prompts are using 4x more tokens than you need](https://boundaryml.com/blog/type-definition-prompting-baml) — BAML Blog
- [Guide to the Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) and [Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration) — Figma
- [Hygen](https://www.hygen.io), [Plop](https://plopjs.com), [Nx local generators](https://nx.dev/extending-nx/recipes/local-generators), [Yeoman](https://yeoman.io) — scaffold tooling
