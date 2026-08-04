# Stage 3 — The LLM Generating the Construction File: Structured Output as the Plan Format

**Scope.** This document researches the middle stage of the proposed prototype-generation architecture: instead of asking an LLM to author full React/HTML code, the LLM emits a compact *construction file* (JSON/YAML/DSL) describing which design-system primitives to instantiate, with what props and content, in what arrangement — and a deterministic builder (shell/Python) turns that file into a runnable prototype. The questions here are: what format should the construction file take, how do we get the LLM to emit it validly and reliably, does constraining the output degrade design quality, what prior art exists for "UI as data" emitted by LLMs, what are the token/latency economics versus full code generation, and what error modes need engineering around.

---

## Table of Contents

1. [Format choice: JSON, YAML, TOML, custom DSL, JSX-as-DSL](#1-format-choice)
2. [Getting valid structured output](#2-getting-valid-structured-output)
3. [Does constraining output hurt quality? The evidence](#3-does-constraining-output-hurt-quality)
4. [Prior art: LLMs emitting UI-as-data](#4-prior-art-llms-emitting-ui-as-data)
5. [Token economics: construction file vs. full code](#5-token-economics)
6. [Error modes and mitigations](#6-error-modes-and-mitigations)
7. [Tradeoffs and value analysis](#7-tradeoffs-and-value-analysis)
8. [Open questions and recommended experiments](#8-open-questions-and-recommended-experiments)
9. [Sources](#9-sources)

---

## 1. Format Choice

### 1.1 The candidates

| Format | Token cost | Nesting ergonomics | Comments | Diff/review readability | LLM emission reliability |
|---|---|---|---|---|---|
| JSON | Baseline (highest of the mainstream trio) | Braces/brackets scale fine to deep trees | No | Noisy diffs (trailing commas, quoting) | Highest — most native tooling (schema-enforced modes target JSON) |
| YAML | ~10–30% fewer tokens than pretty-printed JSON | Indentation gets fragile past ~5–6 levels | Yes | Clean line-oriented diffs | Good, but whitespace errors possible; no native schema enforcement from providers |
| TOML | Similar to YAML for flat data; poor for trees | Deep nesting is awkward (`[a.b.c.d]` tables) | Yes | Good for config, bad for trees | Rarely used in LLM pipelines; weakest fit |
| Terse custom DSL (Emmet/Pug-like) | Potentially 2–5× fewer tokens than JSON | Excellent for trees (indentation + inline props) | Usually | Very compact diffs | Unproven; no provider-side enforcement; model has near-zero training prior on *your* notation |
| JSX-as-DSL (restricted JSX subset) | Between DSL and full code | Natural for UI trees | Yes (`{/* */}`) | Familiar to reviewers | High fluency (massive training prior) but hard to *guarantee* the restricted subset |

### 1.2 Token efficiency evidence

- The widely-cited Better Programming analysis ([Livshitz, "YAML vs. JSON: Which Is More Efficient for Language Models?"](https://betterprogramming.pub/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df)) found YAML meaningfully cheaper than JSON for the same payload (roughly 30% fewer tokens in their examples, largely from eliminating braces, quotes, and commas), and recommends "request YAML, convert to JSON code-side." Microsoft's data-science team measured more modest but real gains — [~18% fewer tokens than formatted JSON](https://medium.com/data-science-at-microsoft/token-efficiency-with-structured-output-from-language-models-be2e51d3d9d5) — noting the savings come from indentation-based hierarchy replacing structural punctuation. Gains depend heavily on key lengths, string-heavy vs. structure-heavy payloads, and whether the JSON baseline is minified (minified JSON closes much of the gap; but minified JSON is hostile to human review, which matters for a design-review artifact).
- **TOON (Token-Oriented Object Notation)** ([toon-format/toon](https://github.com/toon-format/toon)) is the recent purpose-built "compact JSON for LLMs": YAML-like indentation for nesting plus CSV-style tabular blocks for uniform arrays, with lossless JSON round-tripping. Its own benchmarks claim ~40–60% token reduction vs. JSON. However, independent benchmarks ([Improving Agents, "TOON Benchmarks"](https://www.improvingagents.com/blog/toon-benchmarks/)) found TOON *comprehension* accuracy lagging: on nested data, YAML scored 62.1% accuracy at 42.5k tokens vs. TOON's 43.1% at 45.4k tokens and JSON's 50.3% at 57.9k — i.e., YAML beat both on accuracy *and* tokens for nested structures. An arXiv benchmark of TOON generation ([2603.03306](https://arxiv.org/abs/2603.03306)) found plain JSON generation had the best one-shot structural correctness, with TOON's advantage being token count only. Lesson: novel terse formats save tokens on *input* but are riskier for *generation*, because the model has little training prior and no provider-side grammar enforcement (unless you build a custom grammar — see §2.3).
- For **UI trees specifically**, the payload is structure-heavy and string-light (component types, prop keys, short content strings), which is exactly where JSON's punctuation overhead is proportionally largest and YAML/terse DSLs shine.

### 1.3 Terse custom notations (Emmet-like, Pug-like)

An Emmet-style line (`Card>Stack(gap=2)>Avatar+Text.title{Jane}`) or Pug-style indented tree is the theoretical token-minimum for a UI tree. Realities to weigh:

- **LLM reliability is the weak point.** Models emit Emmet and Pug tolerably because both exist in training data, but a *custom* notation is learned only from your prompt's documentation and few-shot examples — every syntax rule you invent is a rule the model can violate, and no provider JSON-mode can enforce it. The TOON generation results above are the cautionary datapoint: even a well-documented compact format underperformed plain JSON on structural correctness.
- Terse notations also punish the *parser author*: you now own a grammar, a parser, error messages, and an escaping story for arbitrary content strings (what happens when a button label contains `>` or `{`?).
- A defensible middle path: **YAML with conventions** (e.g., `type`/`props`/`children` keys, or `Component@variant` shorthand strings that your builder expands). You keep near-DSL terseness while staying inside a format every model emits fluently and every language parses.

### 1.4 Nesting depth for UI trees

UI trees routinely reach 6–10 levels (page → region → card → stack → row → button → icon). JSON handles arbitrary depth mechanically but burns tokens on closing ladders (`}]}]}`) and is where models make bracket-balance errors in *free* generation (eliminated by schema-enforced modes). YAML reads well to ~5 levels; beyond that, indentation alignment becomes a genuine model failure mode (a 2-space slip silently reparents a node — a *worse* failure than a JSON parse error because it's valid YAML). Two mitigations used in practice:

- **Flatten the tree**: emit a flat list of nodes with `id` + `parent` references (or `children: [ids]`), like Figma's REST file format. This caps physical nesting at 2 levels regardless of logical depth, makes diffs surgical (one node = one small object), and pairs well with schema enforcement. Cost: humans reconstruct the tree mentally; the builder revalidates referential integrity (see §6).
- **Cap logical depth in the schema** and force composition through named pattern primitives (a `ListDetailLayout` primitive instead of six nested containers) — which is also exactly the design-system philosophy of the overall architecture.

### 1.5 Comments and reviewability

Comments matter for this artifact more than for typical machine JSON: the construction file *is* the design rationale surface ("why is this a `DangerButton`"). JSON has no comments (teams smuggle `_comment` keys — ugly, and they pollute the schema); YAML and TOML have real comments; JSX has both comment styles. If the construction file is meant to be diffed in PRs and annotated by designers, YAML's comment support plus line-oriented diffs is a significant practical advantage. See the format roundup in [Hannecke, "Beyond JSON: Picking the Right Format for LLM Pipelines"](https://medium.com/@michael.hannecke/beyond-json-picking-the-right-format-for-llm-pipelines-b65f15f77f7d).

### 1.6 Recommendation

**Generate JSON (schema-enforced) as the wire format; store/review YAML as the human format.** The provider-native enforcement machinery (§2) is JSON-only across OpenAI, Anthropic, and Gemini — that guarantee is worth more than YAML's ~20% token savings on output, because a guaranteed-valid file eliminates a whole retry loop (each retry costs a full regeneration, dwarfing the 20%). Then `json → yaml` conversion is a free deterministic step for the artifact humans diff and annotate. If you later adopt open-weights inference with grammar-constrained decoding (§2.3), you can enforce YAML or even a custom DSL directly and drop the conversion.

### 1.7 Illustrative construction-file sketch

The same small screen in the two candidate encodings.

**YAML (human/review format):**

```yaml
# construction file — "Invite teammate" sheet
screen: invite-teammate
version: ds-2.4          # design-system snapshot the builder resolves against
frame: { device: mobile, theme: light }
root:
  - Sheet:
      title: "Invite a teammate"
      children:
        - Stack: { gap: md }
        - TextField:
            id: email
            label: "Email address"
            input_type: email
            placeholder: "name@company.com"
        - Select:
            id: role
            label: "Role"
            options: [Viewer, Editor, Admin]   # enum values from DS catalog
            default: Editor
        - Callout:
            tone: info
            text: "Admins can manage billing and members."
        - ButtonRow:
            primary:   { label: "Send invite", action: submit }
            secondary: { label: "Cancel", action: dismiss }
```

**JSON (wire/schema-enforced format, flat-node variant):**

```json
{
  "screen": "invite-teammate",
  "version": "ds-2.4",
  "frame": { "device": "mobile", "theme": "light" },
  "nodes": [
    { "id": "n1", "type": "Sheet", "props": { "title": "Invite a teammate" }, "children": ["n2"] },
    { "id": "n2", "type": "Stack", "props": { "gap": "md" }, "children": ["n3", "n4", "n5", "n6"] },
    { "id": "n3", "type": "TextField", "props": { "label": "Email address", "inputType": "email", "placeholder": "name@company.com" } },
    { "id": "n4", "type": "Select", "props": { "label": "Role", "options": ["Viewer", "Editor", "Admin"], "default": "Editor" } },
    { "id": "n5", "type": "Callout", "props": { "tone": "info", "text": "Admins can manage billing and members." } },
    { "id": "n6", "type": "ButtonRow", "props": { "primary": { "label": "Send invite", "action": "submit" }, "secondary": { "label": "Cancel", "action": "dismiss" } } }
  ]
}
```

Note what is *absent*: no CSS, no imports, no event-handler code, no layout math. All of that lives in the deterministic builder and the design-system templates. The LLM's job collapses to *selection, arrangement, and content*.

---

## 2. Getting Valid Structured Output

Four layers, roughly in order of how strong the guarantee is.

### 2.1 Provider-native structured outputs (strongest guarantee, least control)

- **OpenAI Structured Outputs** (`response_format: {type: "json_schema", strict: true}`) — introduced Aug 2024; on OpenAI's own eval, gpt-4o with structured outputs scored **100% schema compliance vs. <40% for prompt-only gpt-4** ([OpenAI announcement](https://openai.com/index/introducing-structured-outputs-in-the-api/)). Implemented via constrained decoding against a compiled subset of JSON Schema. Constraints: subset only (all fields effectively required, additionalProperties:false, limits on schema size/enum count/nesting depth), first-call latency for schema compilation, and [large schemas / deep nesting / huge enums add latency](https://developers.openai.com/api/docs/guides/structured-outputs) — a direct schema-design pressure (§3.2). SDKs bind to Pydantic (`client.beta.chat.completions.parse`) and Zod (`zodResponseFormat`).
- **Anthropic Structured Outputs** — public beta Nov 2025 (`structured-outputs-2025-11-13`, `output_format`/`output_config.format` with a JSON Schema), guaranteeing schema-compliant JSON for Claude Haiku 4.5 / Sonnet 4.5 / Opus 4.1+ ([Towards Data Science hands-on guide](https://towardsdatascience.com/hands-on-with-anthropics-new-structured-output-capabilities/); [Vercel AI Gateway docs](https://vercel.com/docs/ai-gateway/sdks-and-apis/anthropic-messages-api/structured-outputs)). Before this, the standard Claude pattern was **tool-use schemas**: define a single `emit_construction_file` tool whose `input_schema` is your construction-file schema and force `tool_choice` — tool-input JSON is strongly (though historically not absolutely) schema-shaped. Both patterns remain relevant; tool-use also composes with agentic flows (the "tool call" *is* the plan handoff).
- **Gemini** — `responseSchema` + `responseMimeType: application/json` (also supports enum-only outputs); comparable constrained-decoding guarantee, with its own schema-subset quirks (see [Logic's cross-provider guide](https://logic.inc/resources/structured-outputs-guide)).

### 2.2 Schema validation + repair loops (works everywhere, weaker guarantee)

The portable pattern: generate → parse → validate against Zod/Pydantic → on failure, re-prompt with the validation errors attached → retry (typically max 2–3).

- **[Instructor](https://github.com/567-labs/instructor)** (Python/TS, 11k+ stars) is the canonical library: patches the provider client, validates against a Pydantic model, and automatically retries with the *specific* validation error messages in context — turning the validator into a teacher. Works across OpenAI/Anthropic/Gemini/open models.
- The same loop is trivially hand-rolled with Zod: `safeParse`, feed `error.issues` back. Key practice: validation errors must be *actionable in model terms* ("`nodes[3].type` must be one of [Button, TextField, …], got 'InputBox'"), not stack traces.
- **JSON repair before retry**: libraries like `jsonrepair` (JS) and `json_repair` (Python) deterministically fix truncated/malformed JSON (unclosed brackets, trailing commas, single quotes) and often rescue an output without any LLM round-trip. Cheap first line of defense when not using native enforcement.

### 2.3 Grammar-based constrained decoding (strongest + most flexible, needs inference control)

When you control inference (vLLM, SGLang, llama.cpp, TGI), you can mask invalid tokens at every decoding step so *only* grammar-conforming outputs are producible — no parse errors, ever, and for any grammar, not just JSON:

- **[Outlines](https://github.com/dottxt-ai/outlines)** (dottxt) — regex/JSON-Schema/CFG constraints compiled to finite-state machines over the token vocabulary.
- **[Guidance](https://github.com/guidance-ai/guidance) / llguidance** — Rust-based engine; in [JSONSchemaBench](https://arxiv.org/abs/2501.10868) (EPFL, 10k real-world JSON schemas; evaluated Guidance, Outlines, llama.cpp, XGrammar, OpenAI, Gemini) Guidance showed the **highest schema coverage and compliance on 6 of 8 datasets and ~2× faster token generation**; the benchmark also found constrained decoding can *speed up* generation ~50% vs. unconstrained (fewer degrees of freedom per step, structural tokens fast-forwarded).
- **XGrammar** — current state-of-the-art on speed via context-independent token-mask caching; integrated into vLLM/SGLang/MLC.
- **GBNF** (llama.cpp grammars) — EBNF-style grammar files; llama.cpp auto-converts JSON Schema → GBNF; the right tool for local/embedded inference.

This is the only route that could *enforce* a YAML construction file or a custom Emmet-like DSL (write the CFG once). Overview: [ZeroEntropy, "Constrained decoding"](https://zeroentropy.dev/concepts/constrained-decoding/).

### 2.4 Streaming partial JSON

For designer-facing latency, stream the construction file and render progressively:

- **Vercel AI SDK `streamObject`** emits progressively-complete typed objects against a Zod schema; **Instructor `create_partial`** does the same for Pydantic (all fields optional during streaming, populated field-by-field) ([Instructor partial docs](https://python.useinstructor.com/concepts/partial/)).
- Under the hood these use error-tolerant incremental parsers (`jiter`, `partial-json`, `best-effort-json-parser`) that parse a JSON *prefix* into the best-effort object. Caveat: intermediate chunks are not individually schema-valid (enums/literals mid-token break naive validators).
- For this architecture, streaming enables a compelling UX: the builder can begin instantiating top-of-tree containers while leaf content is still generating — the prototype "draws in" section by section, mirroring how thesys C1 streams UI (§4.2). If nodes stream in a flat list (§1.4), each completed node object is independently buildable — a strong argument for the flat-node schema.

---

## 3. Does Constraining Output Hurt Quality?

### 3.1 The controversy — both sides

- **["Let Me Speak Freely?"](https://arxiv.org/abs/2408.02442)** (Tam et al., 2024, Appier/NTU) claimed significant degradation of reasoning under format restriction, with stricter constraints degrading more — widely cited as "JSON mode makes models dumber."
- **[.dottxt's rebuttal, "Say What You Mean"](https://blog.dottxt.ai/say-what-you-mean.html)** re-ran the evals and found **structured generation *outperformed* unstructured across the board** (GSM8K 0.77→0.78, Last Letter 0.73→0.77, Shuffle Objects 0.41→0.44). The original paper's negative results traced to: (a) *different prompts* for the structured vs. unstructured conditions, with the JSON-mode prompt omitting schema details; (b) an "AI parser" (Claude 3 Haiku) for extracting unstructured answers that was itself unreliable (57% vs. 61% for a flexible regex on the same data); and (c) conflating provider "JSON-mode" (fine-tuned tendency, no guarantee) with true constrained decoding. Follow-up analysis: [Dylan Castillo, "Structured outputs can hurt performance — sometimes"](https://dylancastillo.co/posts/say-what-you-mean-sometimes.html), whose own experiments land at "no meaningful difference when prompts are fair, occasional wins either way."
- Residual truths worth keeping from the critique: **token ordering matters** (a schema that forces the *answer* field before any *reasoning* field genuinely degrades chain-of-thought-dependent tasks — [field-order analysis](https://www.dsdev.in/order-of-fields-in-structured-output-can-hurt-llms-output)); and unfamiliar/awkward schemas do impose a formatting burden on smaller models. A 2026 line of work on "structure snowballing" ([arXiv 2604.06066](https://arxiv.org/pdf/2604.06066)) finds constrained decoding can lock a model into locally-valid-but-globally-wrong continuations during reflective tasks — relevant if the construction file is generated in one constrained pass with no scratchpad.

### 3.2 Consensus schema-design practices that keep quality high

1. **Let the model think before it commits.** Either put a free-text `rationale`/`plan` field *first* in the schema, or split into two calls: free-form design reasoning, then constrained emission. Field order is generation order.
2. **Prompt the schema, don't just enforce it.** Constrained decoding guarantees shape, not understanding — the schema (with its `description`s) should also be visible in the prompt, with 1–2 few-shot construction files. The .dottxt rebuttal showed most "degradation" was really under-specified prompts.
3. **Enums for anything closed-world**: component `type`, spacing tokens, color/tone tokens, icon names, action verbs. This converts hallucination (§6) into an impossibility at decode time. Keep enum sets from ballooning (hundreds of enum values add provider-side latency — [OpenAI guidance](https://developers.openai.com/api/docs/guides/structured-outputs)).
4. **Prefer flat over deep.** Deeply nested optional structures add latency and error surface; the flat-node encoding (§1.4) or depth-capped trees validate better. JSONSchemaBench shows real-world schema complexity is where even "guaranteed" engines diverge in coverage.
5. **`description` fields are prompt real estate.** Every schema property description is instruction text the model actually reads; write them like microcopy ("gap: spacing token between children; prefer 'md' unless the design calls for density").
6. **Recursion support varies.** True recursive `children` schemas work on OpenAI's implementation but strain FSM-based engines; another nudge toward flat nodes.

**Bottom line for this architecture:** the construction-file task is *selection and arrangement*, not competition-math reasoning — the task family where the anti-structure evidence was weakest. With reasoning-first field order, enum-constrained vocabularies, and schema-in-prompt, current evidence says structured emission will be *more* reliable than free-form code generation, not less.

---

## 4. Prior Art: LLMs Emitting UI-as-Data

The proposed architecture is a converging industry pattern, not a novelty. Closest neighbors:

### 4.1 Vercel: tool-call → component, and json-render

- **AI SDK Generative UI** ([AI SDK 3.0 announcement](https://vercel.com/blog/ai-sdk-3-generative-ui)): the model calls *tools*; each tool maps to a React (Server) Component; the SDK streams rendered components to the client. The LLM never writes component code — it emits structured tool arguments (exactly a micro construction file per component), and trusted code renders. `streamUI` + generator functions give progressive loading states.
- **json-render** ([The New Stack coverage](https://thenewstack.io/vercels-json-render-a-step-toward-generative-ui/); [pattern write-up](https://medium.com/@kenzic/stop-parsing-text-how-json-render-turns-model-output-into-ui-0cd01b59dfa9)): you define a **component catalog** (names + prop schemas); the LLM emits a JSON payload conforming to the catalog; a renderer maps it to real React components. The write-ups name the key principle **"Restrictive UI Generation" — the generated JSON is always renderable because the model can only reference the catalog**. This is the same bet as the proposed architecture, minus the offline deterministic builder.
- **Renderify** ([dev.to](https://dev.to/unadlib/renderify-a-runtime-engine-for-rendering-llm-generated-ui-instantly-in-the-browser-1amf)) covers the adjacent point in the design space: sandbox-render LLM-generated JSX/JSON plans at runtime with no build step — useful comparison for the "why not just let it write JSX?" debate (its seven sandboxing layers illustrate the security cost of accepting generated *code* instead of generated *data*).

### 4.2 thesys C1: a hosted "construction file" API

[C1 by Thesys](https://docs.thesys.dev/) is an OpenAI-compatible endpoint whose models emit a **JSON-based UI schema** streamed progressively; a React SDK renders it into live, stateful components ([InfoWorld](https://www.infoworld.com/article/3971182/thesys-introduces-generative-ui-api-for-building-ai-apps.html)). It validates three assumptions of the proposed architecture commercially: (1) component-JSON is expressive enough for real product UI; (2) streaming the spec gives good perceived latency; (3) a fixed renderer keeps output on-system. Its limitation is equally instructive: you get *thesys's* component system, not your own — the proposed architecture is essentially "C1, but the catalog is your design system and the renderer is your builder."

### 4.3 Server-driven UI as the destination format

Airbnb (Ghost Platform), Lyft, Shopify, and most large apps already ship **server-driven UI**: screens described as JSON, rendered by native/web clients from a fixed component registry. The construction file is precisely an SDUI payload authored by an LLM instead of a backend — a decade of SDUI schema-versioning practice (registry versioning, forward-compatible unknown-component handling) applies directly.

### 4.4 Diagrams-as-code analogy: Mermaid/PlantUML

LLMs emitting Mermaid is the mainstream "structured artifact instead of pixels" case, and its failure data is instructive: models frequently emit syntactically invalid Mermaid, so tooling converged on validate-and-repair loops (GenAIScript's [diagram repair](https://microsoft.github.io/genaiscript/blog/mermaids/): feed the parser error back, usually fixed in one round) and even **two-stage generation where the model emits a JSON representation of the diagram against a schema, and deterministic code serializes to Mermaid** ([Matt Adams](https://www.matt-adams.co.uk/2025/02/12/structured-data-generation.html); [MermaidSeqBench](https://arxiv.org/abs/2511.14967) benchmarks syntax correctness explicitly). That two-stage pattern — *schema-enforced JSON first, deterministic serialization second* — is the exact shape of the proposed pipeline and the strongest analogy in the wild.

### 4.5 Screenshot/design-to-structure research

- [pix2code](https://www.researchgate.net/publication/325920827_pix2code_Generating_Code_from_a_Graphical_User_Interface_Screenshot) (2017) generated a *DSL*, not raw code, from screenshots — the original argument that a constrained intermediate representation beats free code generation for UI.
- [Design2Code](https://arxiv.org/abs/2403.03163) (Stanford, 484 real webpages) shows frontier multimodal models' main failures are **element recall and layout arrangement** — precisely the two things a construction file + deterministic layout primitives externalize away from the model. ScreenAI (Google) similarly learns structured screen representations for UI understanding.
- Modular Layout Synthesis ([arXiv 2512.18996](https://arxiv.org/pdf/2512.18996)) explicitly pairs structure normalization with constrained generation for front-end code — academic convergence on the same decomposition.

### 4.6 Figma-side precedents

Figma's REST/plugin object model is itself a flat-node JSON scene graph (the pattern in §1.4). Figma First Draft / Make and the Figma MCP server's design-generation tools all work by having a model emit structured design descriptions that deterministic machinery instantiates against libraries — and community Figma plugins that ask LLMs for raw Figma-node JSON report exactly the §6 error modes (invented node types, invalid property combinations), which the catalog-constrained approach exists to fix. OpenAI's Canvas-style artifacts show the same product pattern of models emitting structured, incrementally-editable documents rather than monolithic text.

---

## 5. Token Economics

### 5.1 Output-size comparison (estimates, order-of-magnitude)

For a moderately complex screen (list + detail, ~15 components):

| Artifact | Typical size | Output tokens (≈) |
|---|---|---|
| Full TSX + CSS, from scratch | 600–900 lines | 6,000–12,000 |
| Full TSX importing a real DS (no styling authored) | 200–400 lines | 2,000–4,500 |
| Construction file, JSON (schema-enforced) | 60–120 nodes/lines | 700–1,800 |
| Construction file, YAML | 50–90 lines | 500–1,200 |
| Diff/patch update to construction file (iteration) | 5–20 lines | 50–250 |

So the construction file is roughly **5–10× cheaper in output tokens than from-scratch code, and ~3× cheaper than DS-import code**. Output tokens are also the *expensive* tokens (typically ~3–5× input price) and the *slow* ones.

### 5.2 Latency

Output tokens dominate wall-clock. At ~60–120 tok/s: a 9k-token TSX file streams in **75–150 s**; a 1.2k-token construction file in **10–20 s**, plus a deterministic build measured in milliseconds-to-seconds. Constrained decoding adds negligible per-token overhead on modern engines and JSONSchemaBench measured up to ~50% *speedups* from fast-forwarding forced structural tokens. Streaming flat nodes lets the prototype begin rendering ~2–3 s in.

### 5.3 Input-side and caching effects

The construction-file approach front-loads a large *static* prompt: DSL documentation + component catalog + JSON schema + few-shot examples (plausibly 5–20k tokens). This is exactly what **prompt caching** is for — the catalog/schema block is identical across every generation, so it's written to cache once and read at ~10% of base input price (Anthropic) or ~50% (OpenAI automatic caching) thereafter, with corresponding TTFT reductions. Full-code generation *also* wants the design-system docs in context (or it goes off-system), so the input side is roughly a wash — the construction file wins on the output side and on cache stability (the static block never changes, maximizing hit rate).

### 5.4 Iteration cost — where the real savings live

Design work is iterative; this is the decisive economic argument. "Make the callout a warning and swap the button order" against:

- **Full code**: regenerate or agentically edit an 800-line file — either ~9k output tokens again, or an agent loop doing reads + search/replace edits (multiple calls, file reads back into context each turn).
- **Construction file**: regenerate 50-line YAML (~600 tokens), or better, emit a **patch operation list** (`[{op: set, node: n5, prop: tone, value: warning}, {op: reorder, …}]`) — tens of tokens, schema-enforceable, trivially applied by the builder, and yielding a perfect semantic diff/undo history for free.

Ten iterations on a screen: ~90k output tokens (full code, naive) vs. ~2–3k (construction file + patches) — a **30–50×** difference where designers actually spend their time. It also keeps conversation context small: the construction file re-enters context cheaply each turn, where full code files blow up multi-turn context (and cost) quickly.

---

## 6. Error Modes and Mitigations

| Error mode | Example | Mitigation |
|---|---|---|
| **Hallucinated component types** | `"type": "InputBox"` when the catalog has `TextField` | Enum-constrain `type` in the schema → *impossible* under native structured outputs/constrained decoding. Fallback: validator with fuzzy-match suggestions ("did you mean TextField?") fed to the repair loop. |
| **Hallucinated / misused props** | `size: "xl"` on a component whose variants stop at `lg`; `onClick` handlers as strings of JS | Per-component prop schemas via a **discriminated union** on `type` (Zod/Pydantic tagged unions; JSON Schema `oneOf`+`const`). `additionalProperties: false`. Never accept code-valued props — actions are enum verbs resolved by the builder. |
| **Invalid nesting/containment** | `Button` inside `Select`; `Sheet` inside `Card`; grid child without required slot | Containment rules are hard to express in JSON Schema — enforce in the **builder's semantic validator** (a containment matrix from DS docs, like HTML content models). Return actionable errors ("Callout may not contain interactive children; move ButtonRow to Sheet level") for the self-repair loop. Recursion-limited schemas or flat nodes + post-parse tree check. |
| **Dangling references** (flat-node encoding) | `children: ["n9"]` where `n9` doesn't exist; cycles; orphans | Referential-integrity pass in the builder: every id defined once, reachable from root, acyclic. Cheap and deterministic. |
| **Structurally valid, semantically wrong** | Everything validates but the screen is a bad design (wrong hierarchy, missing empty state) | Not a parser problem — mitigate with pattern-level primitives (bigger, opinionated blocks reduce arrangement freedom), few-shot exemplar files, and a render-then-critique loop (screenshot the built prototype back to a multimodal model). |
| **Truncation** | Output cut at max_tokens mid-array | Detect via finish_reason; `jsonrepair` salvage for preview; regenerate with continuation or raise budget. Flat streaming nodes degrade gracefully (complete nodes still build). |
| **YAML-specific silent errors** (if generating YAML directly) | 2-space indentation slip reparents a subtree; `Norway problem` (`no` → false); unquoted strings coercing types | Prefer JSON generation + YAML conversion (§1.6). If generating YAML: schema-validate the *parsed* result, require quoted strings for content, and diff node-count against a model-declared `node_count` field. |
| **Schema drift** | Catalog v2.5 renames a prop; cached prompts/few-shots still teach v2.4 | Version pin in the file (`version: ds-2.4`); builder resolves against the pinned snapshot or migrates; CI regenerates few-shot examples from the live catalog. |

The layered defense that works in practice: **(1) decode-time constraint** (shape + enums guaranteed) → **(2) deterministic repair** (jsonrepair, reference fixup) → **(3) semantic validation with model-readable errors** (containment, refs, DS lint) → **(4) bounded LLM self-repair loop** (Instructor-style, errors-in-context, max 2 retries) → **(5) builder fail-safes** (unknown-value fallbacks render as annotated placeholder blocks rather than crashing, so a designer always gets *something* reviewable).

---

## 7. Tradeoffs and Value Analysis

**What the construction-file stage buys:**

- **Reliability compounding**: every guarantee added at this stage (enum types, schema shape) multiplies through the deterministic builder — an enforced catalog means *zero* off-system components in output, which no amount of prompting achieves for free-form code generation.
- **Economics**: ~5–10× output-token reduction per screen, ~30–50× on iteration loops, major latency wins (§5).
- **Reviewability**: a 60-line YAML file is a designer-readable, diffable, comment-annotatable artifact; an 800-line TSX diff is not. The construction file becomes the *design document*.
- **Model-agnosticism**: the plan format outlives model churn; swapping models changes nothing downstream. Cheaper/smaller models become viable because the task (constrained selection) is easier than code synthesis.

**What it costs:**

- **Expressiveness ceiling.** The model can only build what the catalog + builder can express. Novel interactions, bespoke layouts, and one-off visualizations need either an escape hatch (a sandboxed `CustomBlock` where the LLM *does* author code surgically — matching the "LLM surgically authors contents within deterministic containers" idea, and the Renderify security lesson applies) or catalog growth. Risk: the escape hatch becomes the main path if the catalog lags.
- **Schema/DSL maintenance** is a real ongoing engineering surface: catalog ↔ schema ↔ builder ↔ few-shots must stay in lockstep (mitigate by *generating* the JSON Schema and docs from the component templates — single source of truth).
- **Two-brain problem**: design intelligence now lives partly in the prompt/model and partly in builder heuristics (responsive behavior, spacing fallbacks); debugging "why does it look wrong" spans both.
- **Interactivity gap**: a construction file naturally describes structure and content; real prototype *behavior* (state, navigation, data flow) needs either declarative action/flow vocabulary in the schema (more DSL to design) or accepts lower interactive fidelity than generated code.

**Net assessment**: for the stated goal — reliable, on-system prototypes of an *existing* app with an *existing* design system, iterated quickly — the evidence strongly favors this stage's design. The pattern is independently converged upon by Vercel (json-render/catalog constraint), thesys (C1), the Mermaid two-stage repair ecosystem, and SDUI practice; the main open risks are expressiveness ceiling and schema maintenance, not feasibility of reliable generation.

---

## 8. Open Questions and Recommended Experiments

**Open questions**

1. Where is the right altitude for primitives — atoms (Button, Stack) vs. patterns (SettingsSection, ListDetailLayout)? Higher altitude = fewer nodes, fewer arrangement errors, less flexibility.
2. Tree vs. flat-node encoding: which do models arrange more accurately at 15+ components, and which streams/patches better in practice?
3. Should iteration use full-file regeneration or a patch-op vocabulary? (Patch ops are cheaper but add a second schema to maintain and a state-sync problem.)
4. How much does a `rationale`-first field (or a separate free-form planning turn) measurably improve arrangement quality vs. cost?
5. Does the escape-hatch `CustomBlock` stay a minority of nodes in real usage, or does it reveal catalog gaps fast enough to erode the guarantees?
6. How should behavior/interactivity be encoded (action enums? declarative state machine? none in v1)?

**Recommended experiments (cheap, decisive)**

1. **Format bake-off (1 day).** Take 10 representative screens; hand-author gold construction files; have 2–3 models generate them from briefs in (a) strict-JSON native structured output, (b) prompted YAML, (c) prompted terse DSL. Measure: parse rate, schema-valid rate, semantic-valid rate (containment/refs), node-level F1 vs. gold, output tokens. Prediction from the literature: (a) wins validity decisively; (b) wins tokens modestly; (c) loses validity.
2. **Tree vs. flat** on the same 10 screens; measure arrangement accuracy and truncation behavior.
3. **Repair-loop ablation**: schema-only vs. +semantic validator vs. +2-retry self-repair; measure end-to-end success rate and cost. (Expect: validator-with-actionable-errors is the highest-leverage component.)
4. **Iteration benchmark**: 5 sequential change requests per screen; compare tokens/latency/error rate for full-code agent editing vs. construction-file regeneration vs. patch ops.
5. **Reasoning-field ablation**: same task with/without leading `rationale`, measuring semantic quality — directly tests the "Let Me Speak Freely" concern in this domain.
6. **Small-model floor**: run the winning setup on a cheap model (Haiku-class) to find the smallest model that clears, say, 95% semantic-valid — the economics of §5 improve further if selection-and-arrangement doesn't need a frontier model.

---

## 9. Sources

- YAML/JSON token efficiency: [Livshitz (Better Programming)](https://betterprogramming.pub/yaml-vs-json-which-is-more-efficient-for-language-models-5bc11dd0f6df) · [Microsoft Data Science](https://medium.com/data-science-at-microsoft/token-efficiency-with-structured-output-from-language-models-be2e51d3d9d5) · [Hannecke format roundup](https://medium.com/@michael.hannecke/beyond-json-picking-the-right-format-for-llm-pipelines-b65f15f77f7d)
- TOON: [toon-format/toon](https://github.com/toon-format/toon) · [Improving Agents benchmarks](https://www.improvingagents.com/blog/toon-benchmarks/) · [TOON vs JSON generation benchmark (arXiv 2603.03306)](https://arxiv.org/abs/2603.03306)
- Structured output engines: [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) · [OpenAI schema guide](https://developers.openai.com/api/docs/guides/structured-outputs) · [Anthropic structured outputs hands-on (TDS)](https://towardsdatascience.com/hands-on-with-anthropics-new-structured-output-capabilities/) · [Cross-provider guide (Logic)](https://logic.inc/resources/structured-outputs-guide) · [ZeroEntropy constrained decoding](https://zeroentropy.dev/concepts/constrained-decoding/) · [JSONSchemaBench (arXiv 2501.10868)](https://arxiv.org/abs/2501.10868) · [Outlines](https://github.com/dottxt-ai/outlines) · [Guidance](https://github.com/guidance-ai/guidance) · [Instructor](https://github.com/567-labs/instructor) · [Instructor partial streaming](https://python.useinstructor.com/concepts/partial/)
- Quality debate: [Let Me Speak Freely (arXiv 2408.02442)](https://arxiv.org/abs/2408.02442) · [.dottxt, Say What You Mean](https://blog.dottxt.ai/say-what-you-mean.html) · [Castillo follow-up](https://dylancastillo.co/posts/say-what-you-mean-sometimes.html) · [Field-order effects](https://www.dsdev.in/order-of-fields-in-structured-output-can-hurt-llms-output) · [Structure snowballing (arXiv 2604.06066)](https://arxiv.org/pdf/2604.06066)
- UI-as-data prior art: [Vercel AI SDK 3.0 Generative UI](https://vercel.com/blog/ai-sdk-3-generative-ui) · [json-render (New Stack)](https://thenewstack.io/vercels-json-render-a-step-toward-generative-ui/) · [json-render pattern (McKenzie)](https://medium.com/@kenzic/stop-parsing-text-how-json-render-turns-model-output-into-ui-0cd01b59dfa9) · [Renderify](https://dev.to/unadlib/renderify-a-runtime-engine-for-rendering-llm-generated-ui-instantly-in-the-browser-1amf) · [thesys C1 docs](https://docs.thesys.dev/) · [InfoWorld on C1](https://www.infoworld.com/article/3971182/thesys-introduces-generative-ui-api-for-building-ai-apps.html)
- Diagram/vision analogies: [GenAIScript Mermaid repair](https://microsoft.github.io/genaiscript/blog/mermaids/) · [MermaidSeqBench (arXiv 2511.14967)](https://arxiv.org/abs/2511.14967) · [JSON-first Mermaid generation (Adams)](https://www.matt-adams.co.uk/2025/02/12/structured-data-generation.html) · [Design2Code (arXiv 2403.03163)](https://arxiv.org/abs/2403.03163) · [pix2code](https://www.researchgate.net/publication/325920827_pix2code_Generating_Code_from_a_Graphical_User_Interface_Screenshot) · [Modular Layout Synthesis (arXiv 2512.18996)](https://arxiv.org/pdf/2512.18996)
