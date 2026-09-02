# Behavior and Interactivity Encoding — Making Construction-File Prototypes Click Without Putting Logic in the Spec

**Scope:** The construction-file architecture in [00](00-architecture-synthesis.md) carries a hard rule inherited from six domains: "no logic in the construction file, ever — loops/conditions live in the builder or the escape hatch" (cross-domain lesson 4, from [06](06-declarative-infrastructure-patterns.md), [09](09-model-driven-engineering.md), [10](10-visual-programming-node-graphs.md)). Prototypes nevertheless have to click: navigate between screens, open modals and drawers, validate and submit forms, show optimistic/loading/empty/error states, hide and reveal, add and delete list rows, walk multi-step flows, undo. This doc answers the open questions left in [03 §6](03-construction-file-generation.md) (actions must be "enum verbs resolved by the builder", never code-valued props), [04 §10 Q3](04-deterministic-assembly.md) ("where does interaction logic live at each fidelity tier — and at what point does a prototype's `Custom`-node ratio signal 'stop speccing, start coding'"), [05 §6](05-surgical-editing-iteration.md) (flows as screens + edges, patched by JSON Patch) and [02 §2.5](02-intent-spec-and-context.md) (the `from / trigger / to` transition table and EARS-style `when/then` interactions). It surveys the eight encodings in play — server-driven-UI action tables, statecharts, prototyping-tool interaction models, generative-UI protocols, bounded expression languages, state/data binding, fidelity tiers and the LLM-reliability evidence — and ends with a concrete v1 encoding. Not repeated here: format choice and validity layers (03), builder mechanics (04), patch economics (05), fixtures/faker/MSW basics (02 §5). Verified live September 2026; every claim links its source; fetch failures are marked.

## Table of Contents

1. [Reframing the rule: logic-free is not behavior-free](#1-reframing-the-rule-logic-free-is-not-behavior-free)
2. [Action enums and event→action tables (server-driven UI)](#2-action-enums-and-eventaction-tables-server-driven-ui)
3. [Declarative state machines](#3-declarative-state-machines)
4. [Flow-level specs in prototyping tools](#4-flow-level-specs-in-prototyping-tools)
5. [Generative-UI protocols and their behavior models](#5-generative-ui-protocols-and-their-behavior-models)
6. [Bounded expression languages](#6-bounded-expression-languages)
7. [State and data binding](#7-state-and-data-binding)
8. [Fidelity tiers and the "stop speccing" signal](#8-fidelity-tiers-and-the-stop-speccing-signal)
9. [Evidence on LLM reliability for machines, tables and flows](#9-evidence-on-llm-reliability-for-machines-tables-and-flows)
10. [Tradeoffs](#10-tradeoffs)
11. [Recommended v1 encoding](#11-recommended-v1-encoding)
12. [Open questions](#12-open-questions)
13. [Recommended experiments](#13-recommended-experiments)
14. [Candidate picks for skill-resources](#14-candidate-picks-for-skill-resources)
15. [Sources](#15-sources)

---

## 1. Reframing the rule: logic-free is not behavior-free

The "no logic in the spec" rule, read precisely, forbids *Turing-complete, imperative* content in the construction file: loops, arbitrary conditionals, code-valued props. It does not forbid behavior. Every system surveyed below that kept its spec diffable and safe did so by encoding behavior as **data in one of three shapes**, each interpreted by a trusted engine:

| Shape | What the file says | Who supplies the semantics | Precedent |
|---|---|---|---|
| **Event→action table** | "when `press` on node X, run named action A with params" | A closed action vocabulary in the builder/runtime | Airbnb GP, Yelp CHAOS, Adaptive Cards, json-render, A2UI |
| **State machine** | "this widget has states S; event E moves S1→S2; state S3 invokes named effect F" | Machine interpreter; effects and guards referenced by *name* | XState v5 config, SCXML, Stately |
| **Bounded expression** | "visible when `order.status != 'refunded'`" | A non-Turing-complete evaluator with a fixed function set | CEL, JMESPath, Figma Expression, Adaptive Expression Language |

The reconciliation is therefore not a loophole but exactly what [06](06-declarative-infrastructure-patterns.md) found in Terraform and Kubernetes: the spec names *what* should happen in a closed vocabulary; the engine owns *how*. The practical question is which of the three shapes each of the ten required behaviors should take, and how small the vocabularies can be while still producing prototypes that feel real. The cautionary pattern, repeated in §6, is what happens when a declarative format grows its own escape valve *inline* (SCXML's `<script>`, Home Assistant's Jinja templates, Retool's `{{ }}` JavaScript): the "declarative" file becomes code with worse tooling.

---

## 2. Action enums and event→action tables (server-driven UI)

**What it is:** SDUI systems ship screens as JSON and let the client render from a registry; interactivity is a closed set of named actions attached to component events. This is the construction file's nearest production relative, so its action models are the strongest evidence for what a bounded vocabulary needs.

| System | Event binding | Action model | State mutation | Status |
|---|---|---|---|---|
| **Airbnb Ghost Platform** | Sections expose typed action props, e.g. `onTitleClickAction: IAction` | Three element types: "sections … screens … and actions, which are used to handle user interaction" ([InfoQ](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/)) | Backend response; "even the actions taken when users interact with sections is controlled by a single backend response" (same) | Primary Medium post returned 403; summary via InfoQ and search |
| **Yelp CHAOS** | `"onClick"` / `"onView"` event properties on components ([Yelp 2025](https://engineeringblog.yelp.com/2025/07/chaos-inside-yelps-sdui-framework.html)) | Versioned action objects: `identifier`, `actionType` such as `"chaos.open-url.v1"`, `"chaos.open-subsequent-view.v1"` (with `viewId`), `parameters` as stringified JSON | "triggers an action that updates the UI directly or indirectly through a **property** – a piece of observable application state" ([Yelp 2024](https://engineeringblog.yelp.com/2024/03/chaos-yelps-unified-framework-for-server-driven-ui.html)); "subsequent views" preload navigation targets so a tap needs no round trip | Live; 8 clients across Yelp and Yelp for Business; Konbini generates "four different libraries" from "a single JSON definition" where the button's `on_click` is typed `"Nullable<Action>"` ([Yelp 2026](https://engineeringblog.yelp.com/2026/04/keeping-server-driven-ui-consistent-across-platforms.html)) |
| **Lyft Bikes & Scooters** | Protobuf-defined primitives incl. "action callbacks" | Built "the smallest and most atomic components and actions possible"; "if missing Actions or Components are needed, they can be added and become available for all future work" | Server round trip | Post returned 403; quotes via search snippets of [eng.lyft.com](https://eng.lyft.com/the-journey-to-server-driven-ui-at-lyft-bikes-and-scooters-c19264a0378e) — not independently verified |
| **Spotify Hub Framework** | Component model's `"target": { "actions": ["myNamespace:myAction"] }` | `HUBAction` protocol with one method, `performWithContext:`; namespaced identifiers "matched … just like the way components are matched" ([action guide](https://spotify.github.io/HubFramework/action-programming-guide.html)) | Default: "the URI associated with that component's target will be opened" (same) | Archived 2018: "being phased out at Spotify" ([repo](https://github.com/spotify/HubFramework)) |
| **Shopify remote-dom** | Elements declare `static get remoteEvents() { return ['click']; }`; host allowlists elements "to keep tight control over the visual appearance" ([README](https://github.com/Shopify/remote-dom/blob/main/README.md)) | Not an action enum: it ships *code* in "hidden iframes" or Web Workers and mirrors a DOM | Remote-side JS | Live; the "sandbox the code" end of the spectrum, not the "UI as data" end |
| **Instacart** | — | No primary SDUI post located; only referenced in DoorDash's Facets write-up ([DoorDash](https://careersatdoordash.com/blog/improving-development-velocity-with-generic-server-driven-ui-components/)) | — | Not verified |

**Key findings:**

- Every production SDUI converges on **namespaced, versioned action names with a params bag** (`chaos.open-url.v1`, `myNamespace:myAction`). Versioning the *verb* is what lets old payloads keep working when semantics change — the same protobuf-style stability lesson as [08](08-compiler-ir-build-patterns.md).
- Navigation is just another action (`open-subsequent-view` with a `viewId`, Hub's target URI). There is no separate "router" concept in the payload; that is the builder's business.
- CHAOS's **observable property** is the one piece of client-side state SDUI admits: actions may set a named property, components may bind to it. That is the minimum viable "state" for a click-through prototype and maps directly onto the `{"$state": "/path"}` bindings in §7.
- Lyft's "atomic actions" framing is the growth model for our catalog: an action vocabulary is a second catalog, with the same escape-hatch telemetry as components ([01](01-primitive-codification.md)).

---

## 3. Declarative state machines

**What it is:** A statechart names the states a screen or widget can be in and the events that move between them; effects and guards are named, not written. This is the natural carrier for loading/empty/error/submitting states, multi-step wizards and optimistic flows.

- **XState v5** machine configs are designed to be JSON-serializable; the parts that are not — "Actions … Guards … Actors … Delays" — are "implementations" that "you can reference … using JSON-serializable strings and/or objects, such as `{ type: 'doSomething' }`" ([Stately docs](https://stately.ai/docs/machines)). This is exactly the no-logic split: the file holds `{ "on": { "SUBMIT": { "target": "submitting", "guard": "formValid" } } }`; the builder's registry holds `formValid`. 30k stars, MIT ([repo](https://github.com/statelyai/xstate)).
- **SCXML** is a "W3C Recommendation 1 September 2015"; transitions are "triggered by events and conditionalized via guard conditions" via a `cond` attribute, and the standard admits three datamodels — "null", "ecmascript", "xpath" — plus a `<script>` element that "adds scripting capability to the state machine" ([W3C](https://www.w3.org/TR/scxml/)). The cautionary reading: the moment the standard allowed ECMAScript in `cond`, an SCXML file stopped being logic-free. Our `cond` must be a bounded expression (§6), never a script.
- **Stately Studio's "Generate with AI"** will "auto-create machines from text descriptions" and "Generate from current flow" for modifications; it is "an experimental feature", Pro-gated, with monthly generation limits ([Stately](https://stately.ai/docs/generate-flow)). That a specialist vendor still labels text→statechart experimental in 2026 is itself evidence for §9.
- **Stately Agent 2** (alpha) inverts the relationship — the machine constrains the LLM: "The model proposes an event; the machine decides whether it is allowed and what happens next", with `allowedEvents: ["AUTO_REFUND", "REVIEW"]` and guards such as `context.amount <= 100` rejecting bad proposals; the stated goal is "Make invalid agent actions impossible" ([repo](https://github.com/statelyai/agent)). The same mechanism can gate *iteration*: when the model patches a flow, the builder can reject a patch that sends an event no state accepts.
- Practitioner signal: an XState maintainer answered a request for LLM docs with "This does exist: https://stately.ai/llms.txt" and a skills registry entry ([discussion #5459](https://github.com/statelyai/xstate/discussions/5459)); the llms.txt is live and lists the agent docs.

**Why it matters for the pipeline:** a machine per *async interaction* (submit, load, delete) is small — 3–5 states — and the builder can own a generic one. The construction file then needs only to *name* which machine a node uses and which UI variant each state shows, which is how Adaptive Cards' `$when` and json-render's `visible` work in practice (§5). Full per-screen statecharts authored by the model are where §9's transition-wiring failures live; keep them for the "stateful" tier and validate reachability.

---

## 4. Flow-level specs in prototyping tools

**What it is:** Designer-facing tools already encode click-through and stateful prototypes as data; their models are the closest thing to a designer-validated "minimum interaction vocabulary".

| Tool | Triggers | Actions | Conditions / variables | Serialization |
|---|---|---|---|---|
| **Figma** | `ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `ON_DRAG`, `AFTER_TIMEOUT`, `MOUSE_ENTER/LEAVE/UP/DOWN`, `ON_KEY_DOWN`, `ON_MEDIA_HIT`, `ON_MEDIA_END`; hover/press "revert the navigation when the trigger is finished" ([REST spec](https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml)) | `BACK`, `CLOSE`, `URL`, `NODE`, `SET_VARIABLE`, `SET_VARIABLE_MODE`, `CONDITIONAL`, `UPDATE_MEDIA_RUNTIME`; `NODE` carries `navigation` ∈ `NAVIGATE`, `SWAP`, `OVERLAY`, `SCROLL_TO`, `CHANGE_TO` plus `transition` ([plugin API](https://developers.figma.com/docs/plugins/api/Action/)) | `ConditionalAction` = if/else `conditionalBlocks` of `{condition, actions}`; `Expression` over exactly 15 `ExpressionFunction`s: `ADDITION … DIVISION`, `EQUALS … GREATER_THAN_OR_EQUAL`, `AND`, `OR`, `VAR_MODE_LOOKUP`, `NEGATE`, `NOT` (REST spec) | Public JSON: an `Interaction` is "a trigger and one or more actions"; readable via REST, writable via plugin |
| **ProtoPie** | Touch (Tap … Rotate), Conditional (Chain, Range, Start, Detect), Mouse, Key, Input, Sensor ([docs](https://www.protopie.io/learn/docs/interactions-triggers)) | Responses incl. overwriting variables; "Range trigger fires when an object's property or variable transitions into a range you define" | Variables "carry state across components, screens, and devices" ([ProtoPie](https://www.protopie.io/features/interaction-logic)) | Proprietary `.pie` |
| **Play 2.0** | tap, scroll, shake, timers | scale, navigate, change component state, "loading data" | "string, number, boolean … variables", If-statement conditions, "loops, animate & delay blocks" ([Play docs](https://learn.createwithplay.com/en/articles/8491415-introduction-to-interactions), [2.0](https://learn.createwithplay.com/en/articles/9890193-welcome-to-play-2-0)) | Proprietary; exports SwiftUI |
| **Origami Studio** | Pulses ("On ✓ only for a single frame") | Patches as dataflow nodes | `Switch` "remain[s] that way until you tell [it] otherwise" ([Origami](https://origami.design/documentation/patches/builtin.switch.html)) | Node graph — a DAG, i.e. the encoding [10](10-visual-programming-node-graphs.md) found LLMs wire worst |
| **Framer** | click, mouse enter/leave, appear, scroll | overlays, variant switches | "interactions (what the visitor does) and conditions (who the visitor is …)" ([Framer help](https://www.framer.com/help/articles/using-triggers/)); code overrides as the island | Proprietary |

**Key findings:**

- Figma's model is the **existence proof for a bounded expression language that designers accept**: 15 operators, no functions except mode lookup, no loops, no strings beyond equality — and it covers counters, toggles, form gating and branching flows. It is also fully JSON-visible through the REST API, so a construction file that mirrors its shape can be *round-tripped to Figma prototypes* later.
- All five tools separate trigger → (condition) → actions with an ordered action list. None lets a designer write a loop over data except Play's explicit loop block; list CRUD in these tools is simulated with fixed instances. That is a hint that "list CRUD" is better served by builder-owned store actions (§5 json-render's `pushState`/`removeState`) than by flow-tool constructs.
- Variables are global, typed scalars in every tool. A JSON store with paths (§7) is a strict superset and costs nothing extra.

---

## 5. Generative-UI protocols and their behavior models

**What it is:** The 2025–2026 protocols for LLM-emitted UI each had to answer our exact question, and they split into three camps that CopilotKit names controlled / declarative / open-ended, where moving right means "you trade consistency and safety for flexibility" ([CopilotKit](https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026); [examples repo](https://github.com/CopilotKit/generative-ui)).

| Protocol | Behavior model | State | Expressions | Camp |
|---|---|---|---|---|
| **Google A2UI v1.0** (announced 15 Dec 2025; 16.3k stars, Apache-2.0, [repo](https://github.com/a2ui-project/a2ui)) | `"action": { "event": { "name": "submit_form", "context": {…} } }` sent back to the agent, or local `"functionCall": { "call": "openUrl", "args": {…} }`; functions declare `allowedCallers` ∈ `rendererOnly` / `agentOnly` / `rendererOrAgent` and the renderer "MUST immediately reject" out-of-scope calls ([spec](https://a2ui.org/specification/v1.0-a2ui/)) | Four messages `createSurface`, `updateComponents`, `updateDataModel`, `deleteSurface`; bindings are JSON Pointers (`{"path": "/user/name"}`) | Catalog functions only — `required`, `regex`, `length`, `numeric`, `email`, `and/or/not`, `formatString/Number/Currency/Date`, `pluralize`; input `checks` are `[{condition, message}]`; "Functions are catalog-defined abstractions that avoid sending raw executable code across the wire" (spec); "A2UI is a *declarative* data format, not executable code" ([Google](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)) | Declarative |
| **Vercel json-render** (16.1k stars, Apache-2.0, [repo](https://github.com/vercel-labs/json-render)) | Element-level `"on": { "<event>": { "action", "params", "confirm", "onSuccess", "onError", "preventDefault" } }`; built-ins `setState`, `pushState`, `removeState`, `push`/`pop` (nav stack at `/navStack`, `/currentScreen`), `validateForm`; custom actions need a Zod-typed catalog entry plus a handler ([DeepWiki](https://deepwiki.com/vercel-labs/json-render/3.7-event-system-and-actions)) | JSON-Pointer `StateStore`; `$bindState` two-way; `watch` triggers actions on path change | `{"$state"}`, `{"$cond","$then","$else"}`, `{"$template": "Hello, ${/user/name}!"}`, `visible: [ … ]` | Declarative — closest to our file |
| **thesys C1** | `onAction(event)` with `type` ∈ `open_url`, `continue_conversation` (+ custom); `continue_conversation` carries an `llmFriendlyMessage` "designed to be sent to your backend for the LLM" ([docs](https://docs.thesys.dev/guides/interactivity/actions)) | Hosted | Hosted | Declarative, closed component set |
| **Adaptive Cards** | `Action.Submit` and, from schema 1.4, `Action.Execute` with a `verb` "to identify the action", `data` "hidden" inputs, `fallback`, and a `refresh` block; the host receives `adaptiveCard/action` with `"trigger": "automatic \| manual"` and may return a replacement card ([Microsoft Learn](https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model)) | Data is separate from template: `$data`, `$root`, `$index`; an element whose `$data` "is bound to an **array** … will be repeated for each item" | `${…}` bindings, `$when` drops an element when false, `if(expr, a, b)`; "built on top of the Adaptive Expression Language (AEL) … a proper superset of 'Logic Apps'" ([template language](https://learn.microsoft.com/en-us/adaptive-cards/templating/language)); AEL function list page returned 404 | Declarative — the longest-running precedent (2020 RC) |
| **MCP Apps** (Final 26 Jan 2026; 2.8k stars, [repo](https://github.com/modelcontextprotocol/ext-apps)) | UI is `text/html;profile=mcp-app` in a CSP-locked iframe; UI→host `tools/call`, `ui/message`, `ui/open-link`, `ui/update-model-context`; host→UI `ui/notifications/tool-input`, `tool-result`, `host-context-changed` ([spec](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)) | Inside the iframe | Arbitrary JS | Open-ended — code, sandboxed |
| **mcp-ui** (5.1k stars, Apache-2.0, [repo](https://github.com/MCP-UI-Org/mcp-ui)) | `onUIAction` with five intents: tool, prompt, link, intent, notify; now "implement[s] the MCP Apps standard" | — | Arbitrary (HTML / remote-dom) | Open-ended |
| **OpenAI Apps SDK** | `window.openai.callTool`, `sendFollowUpMessage`, `setWidgetState`; three state tiers — business data "owned by MCP server", UI state "owned by UI instance", cross-session state "in storage you control"; "Do not use [widget state] as the source of truth for business data" ([OpenAI](https://developers.openai.com/apps-sdk/build/state-management)) | Tiered | Arbitrary JS | Open-ended |
| **Open-JSON-UI** | Described as "an open standardization of OpenAI's internal declarative Generative UI schema"; the CopilotKit page shows components (`id`, `type`, `properties`, `children`, `style`) but no action model ([CopilotKit docs](https://docs.copilotkit.ai/agno/generative-ui/open-json-ui)) | — | — | Declarative; action model **not verified** (no spec URL located) |
| **CopilotKit AG-UI** | "Controlled": app registers tools via `useFrontendTool`, agent picks one, frontend `render`s by lifecycle status; `renderAndWaitForResponse` for human-in-the-loop ([docs](https://docs.copilotkit.ai/reference/hooks/useCopilotAction)) | App-owned | None in the payload | Controlled |

**Key findings:**

- The declarative camp independently converged on the **same four primitives**: named events with a context payload; a small built-in action set (set/push/remove state, navigate, open URL, validate); JSON-Pointer bindings into one data model; and a catalog of pure functions for conditions and formatting. json-render and A2UI are near-isomorphic here, which is strong evidence the shape is not arbitrary.
- Both A2UI and json-render add **`confirm` / `checks` / `onSuccess` / `onError`** at the binding site. That is enough to express form validation and optimistic-then-rollback without a statechart, at the cost of one more nested object per action.
- The open-ended camp (MCP Apps, mcp-ui, Apps SDK) is instructive as the *escape hatch* model: code lives in an iframe, talks to the host through a JSON-RPC whitelist, and every UI-initiated action "goes through the same audit and consent path as a direct tool call". Our `CustomBlock` island should have the same posture — a code island may only reach prototype state through the same named actions the file uses.
- Adaptive Cards' `refresh` + `Action.Execute` → "updated card" loop is the cleanest precedent for **server-computed next state**: the client never branches; it asks and re-renders. For a prototype whose fake API is builder-owned, "action → mock endpoint → next screen state" is the same loop with zero client logic.

---

## 6. Bounded expression languages

**What it is:** The point on the ladder between "enum only" and "JavaScript" where conditional visibility, gating and formatting become expressible without Turing-completeness.

| Language | Power | Guarantees | Where it leaks |
|---|---|---|---|
| **Figma Expression** | 15 operators, variables, mode lookup ([REST spec](https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml)) | Trivially total; AST-shaped JSON, so schema-enforceable | No string functions, no collections |
| **CEL** | Comparisons, macros `has`, `all`, `exists`, `exists_one`, `map`, `filter`; app-supplied functions | "non-Turing complete, and only accesses data provided by the host application" ([cel.dev](https://cel.dev/)); Kubernetes evaluates it "directly in the API server" and imposes a "runtime cost budget" ([k8s docs](https://kubernetes.io/docs/reference/using-api/cel/)); 4k stars, Apache-2.0 ([spec](https://github.com/cel-expr/cel-spec)) | String-typed: schema can't check it, so a validator step is mandatory |
| **JMESPath** | Filters, projections, slices, a fixed function library | "The result … will always result in valid JSON"; no assignment, no arbitrary computation ([spec](https://jmespath.org/specification.html)) | Query-only; no arithmetic beyond functions; awkward for booleans |
| **JSONata** | XPath-like paths plus "user defined functions", higher-order functions ([docs](https://docs.jsonata.org/overview.html)); 2.7k stars, MIT | Popular in Node-RED and IBM tooling | Lambdas and recursion make it effectively general-purpose — too big |
| **Adaptive Expression Language** | `if()`, `json()`, string/date/collection functions; "proper superset of 'Logic Apps'" ([Adaptive Cards](https://learn.microsoft.com/en-us/adaptive-cards/templating/language)) | No loops; iteration is the `$data`-array repeat | Function list page 404 — full surface not verified |
| **Power Fx** | "general-purpose, strongly typed, declarative, and functional"; formulas "recalculate … automatically"; but "offers imperative logic when needed" in the same language ([Microsoft Learn](https://learn.microsoft.com/en-us/power-platform/power-fx/overview)); 3.4k stars, MIT | "Always live", no compile step — a model for instant preview | It *is* a programming language; behavior formulas mutate state |
| **Retool `{{ }}`** | "evaluates {{ }} embedded expressions as JavaScript" ([Retool](https://docs.retool.com/apps/scripting-events/guides/javascript)); event handlers are enum actions "Control query, Control component, Open URL, and Run script" ([Retool](https://docs.retool.com/apps/guides/interaction-navigation/event-handlers)) | Enum actions cover the common cases | `Run script` and `{{ }}` are unbounded JS — the island leaked into every property |
| **Home Assistant** | Automations are trigger / condition / action — "Conditions are an optional part … that will prevent an action from firing" ([HA](https://www.home-assistant.io/docs/automation/basics/)) | Started enum-only | Scripts grew `if-then`, `choose`, `repeat` (count / for_each / while / until), `wait_template`, and Jinja templates where "All forms accept templates" ([HA scripts](https://www.home-assistant.io/docs/scripts/)) — the CI/CD-YAML sprawl of [06](06-declarative-infrastructure-patterns.md) replayed |
| **Node-RED** | Wires between typed nodes; the Function node lets "JavaScript code … be run against the messages" ([Node-RED](https://nodered.org/docs/user-guide/writing-functions)) | The island is a *node*, visibly bounded | Flows are DAGs (see [10](10-visual-programming-node-graphs.md)) |

**Key findings:**

- The minimal language that covers the ten behaviors is smaller than any general expression language: **comparisons, boolean connectives, path reads, `length`/`isEmpty`, and a handful of formatters**. Figma proves designers ship with roughly that; A2UI's function catalog is the same set plus validators.
- **AST-in-JSON beats string expressions for v1** because the schema then enforces the grammar at decode time — the same argument [03](03-construction-file-generation.md) made for enum component types. `{"op": "neq", "args": [{"$state": "/order/status"}, "refunded"]}` is verbose but cannot be malformed; `"order.status != 'refunded'"` needs a parser and a repair loop. A CEL-subset string form can be added as sugar once a validator exists.
- The failure pattern is consistent across Retool, Home Assistant and SCXML: **inline** escape valves spread. Node-RED and MCP Apps show the alternative: the island is a distinct, bounded node with an explicit boundary — which is already our `CustomBlock` design ([01](01-primitive-codification.md)).

---

## 7. State and data binding

**What it is:** Where prototype state lives, how nodes reference it, and how "fake server" behavior (latency, failure, persistence across screens) is produced without logic in the file. [02 §5](02-intent-spec-and-context.md) covered fixtures, seeded faker, json-schema-faker and MSW; this section extends to *mutable* state.

- **One store, plain-object actions.** Redux's three principles are the right invariants for a prototype store: "stored in an object tree within a single store"; "The only way to change the state is to emit an action, an object describing what happened"; changes via pure reducers ([Redux](https://redux.js.org/understanding/thinking-in-redux/three-principles)). Because actions "are just plain objects, they can be logged, serialized, stored, and later replayed" (same) — which is what makes a construction-file action table replayable for testing and grading ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)).
- **Undo for free.** Redux's undo recipe is a `{ past, present, future }` wrapper and the note that "mutations are already described as discrete actions, which is close to the undo stack mental model" ([Redux](https://redux.js.org/usage/implementing-undo-history)). A builder-owned reducer enhancer gives every prototype undo/redo without a line in the file; the file only needs `"do": "history.undo"`.
- **Path bindings.** json-render and A2UI both use JSON Pointer (RFC 6901) into the store (§5). Paths compose with JSON Patch (RFC 6902) already chosen in [05](05-surgical-editing-iteration.md): a patch that renames a fixture field can be checked against every `$state` path in the file.
- **State tiers.** OpenAI's split — authoritative business data, ephemeral UI state, durable cross-session state ([OpenAI](https://developers.openai.com/apps-sdk/build/state-management)) — maps onto a prototype as: `fixtures` (read-mostly, seeded), `ui` (open drawers, selected tab, form drafts), and `session` (what the fake server "remembers" across screens). Keeping them as separate top-level keys lets the builder reset `ui` on navigation and persist `session` to `localStorage` deterministically.
- **Optimistic state.** TanStack Query's two approaches are the two encodings available: "use the `onMutate` option to update your cache directly, or leverage the returned `variables` to update your UI", with rollback by restoring a snapshot in `onError` ([TanStack](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)). In file terms: an `api` action with `optimistic: [ …state ops… ]` and the builder snapshotting before applying.
- **A fake server with memory.** MSW intercepts at the network layer, and `@mswjs/data` adds "a powerful querying syntax (inspired by Prisma)" over in-memory collections with one-to-one, one-to-many, many-to-many relations and `.findFirst()/.findMany()/.update()/.delete()` (1.1k stars, MIT, [repo](https://github.com/mswjs/data)). Mirage JS offers "an in-memory database" plus "an ORM to help keep your route handlers clean" ([Mirage](https://miragejs.com/docs/getting-started/overview/)); its docs carry no maintenance statement and the last major release predates 2024 — prefer MSW. The builder can derive both the store *and* the mock handlers from the same intent fixtures, so list CRUD is `pushState`/`removeState` against a collection the mock API also reads.

---

## 8. Fidelity tiers and the "stop speccing" signal

**What it is:** [04 §10 Q3](04-deterministic-assembly.md) asked where interaction logic lives per tier. The survey supports three tiers, each adding one encoding shape from §1:

| Tier | Behaviors covered | Encoding added | Precedent | Builder owns |
|---|---|---|---|---|
| **T0 Click-through** | navigate, back, overlays/drawers, hover/press variants, timed transitions, simple conditional branch on a variable | Event→action table + scalar variables + Figma-grade expressions | Figma prototype model | Router, overlay stack, transitions |
| **T1 Stateful** | form validation and submit, loading/empty/error, optimistic + rollback, list CRUD, multi-step flows with per-step state, undo | JSON-Pointer store; `checks`; builder-owned async machine (idle → submitting → success/error) referenced by name; `api` mock endpoints with latency and outcome | json-render, A2UI, Adaptive Cards refresh loop, TanStack | Store, reducers, history, mock server, generic machines |
| **T2 Logic-heavy** | custom gestures, canvas/drag, computed layouts, domain algorithms, real-time | `CustomBlock` islands that may only touch state through the T1 action vocabulary (MCP-Apps posture) | MCP Apps, Node-RED Function node, Framer overrides | The boundary |

**The stop signal** should be computed by the validator on every build, not felt:

1. **Island ratio** — share of nodes that are `CustomBlock`. [00](00-architecture-synthesis.md) already sets the architecture's break-even at 60–70% pattern coverage; apply the same threshold per prototype: above ~30–40% islands, route to agent-writes-code.
2. **Custom action ratio** — share of action bindings whose verb is not in the built-in vocabulary. Lyft's rule ("add the missing Action") applies once; a prototype that needs five bespoke verbs is a T2 prototype.
3. **Expression depth and cross-screen state** — any condition deeper than three nested ops, or state read by more than ~3 screens, is a hint the flow wants a real statechart or code.
4. **Machine size** — a model-authored machine with more than ~8 states or with unreachable states (the failure mode in §9) should be rejected and either split per screen or moved to code.

These are the same shape as the `Custom`-ratio telemetry in [01](01-primitive-codification.md) and can be reported in the plan step before apply ([06](06-declarative-infrastructure-patterns.md)).

---

## 9. Evidence on LLM reliability for machines, tables and flows

**What it is:** How well models actually emit the three shapes. The evidence is thinner than for component trees but consistent.

- **Transitions are the weak link, not states.** PSMBench (NeurIPS 2025) pairs "1,580 pages of cleaned RFC text with 108 manually validated states and 297 transitions" and finds models reach "up to 0.82 F1" on states but "≤ 0.38 F1" on transition graphs — "a persistent state–transition gap" attributed to "long-context reasoning, alias resolution, and action/event disambiguation" ([PSMBench](https://proceedings.neurips.cc/paper_files/paper/2025/hash/521bd9583b3a39e92f662ee57e81e5ce-Abstract-Datasets_and_Benchmarks_Track.html)). This matches [10](10-visual-programming-node-graphs.md)'s ComfyUI finding that failures concentrate in link-level DAG wiring.
- **Prompt shape dominates model choice.** Cammaerts, Zhang, Feroze and Snoeck (EMMSAD 2026) generated PlantUML FSMs for "twelve business cases" with ChatGPT 5.2 and Claude Sonnet 4.5 under three prompting regimes; per the abstract, "unconstrained prompting yields incomplete and inconsistent FSMs, particularly for complex cases, while prompts using redacted case descriptions augmented with iterative refinement achieve near-perfect accuracy" and "prompting technique has a stronger impact on FSM quality than LLM choice" ([Springer](https://link.springer.com/chapter/10.1007/978-3-032-28274-3_22) — paywalled; abstract via search, numbers not verified).
- **Single-shot FSM generation is a coin flip; structure fixes it.** On 20 HDLBits FSM problems, single-shot success was "41%" (Claude 3 Opus), "32%" (ChatGPT-4), "31%" (ChatGPT-4o); a to-do-oriented prompt patch lifted ChatGPT-4o on synchronous-reset FSMs from "30%" to "70%" and Claude on one-hot FSMs to "90%" ([arXiv 2506.00001](https://arxiv.org/html/2506.00001v1)). Hardware FSMs are not UI flows, but the delta from format discipline is the same signal as 03's structured-output data.
- **Editing an existing machine is far more reliable than authoring one.** ChatFSM had GPT-4o and Llama-3.1-70B modify real RoboCup@Home FSMs: "No Difference: 5/6 cases (83%)", one small difference where the model "hallucinated the condition name 'not_found'", zero structural errors; models took 59.4 s / 3.7 s vs "164 seconds" for humans ([arXiv 2412.05625](https://arxiv.org/html/2412.05625)). The one failure is exactly a *named-guard hallucination* — the thing an enum-constrained guard registry makes impossible. This is the strongest argument for builder-owned machine templates plus patch-based iteration ([05](05-surgical-editing-iteration.md)) over fresh machine generation.
- **Structured UI states/transitions are learnable data.** UI-Simulator trains agents on synthesized "structured UI states and transitions" and "matches the performance of Llama-3-70B-Instruct using only Llama-3-8B-Instruct" ([arXiv 2510.14969](https://arxiv.org/abs/2510.14969)) — evidence that screen-transition graphs are a tractable representation, not that models author them reliably.
- **UI-generation research still stops at the screen.** Generative UI (2026) reports outputs "overwhelmingly preferred by humans over the standard LLM markdown output" and "at least comparable in 50% of cases" to expert-crafted pages ([arXiv 2604.09577](https://arxiv.org/abs/2604.09577)); SpecifyUI's hierarchical SPEC "significantly outperformed Stitch on intent alignment, design quality, controllability" with 16 designers ([arXiv 2509.07334](https://arxiv.org/abs/2509.07334)); PrototypeFlow generates "high-fidelity UI design" from text and layout preferences ([arXiv 2412.20071](https://arxiv.org/abs/2412.20071)). None evaluates interactions or multi-screen flows; no public benchmark for LLM-authored clickable flows was found (search budget exhausted before a final pass — treat as "none located", not "none exists").
- **Vendor signal.** Stately still ships text→statechart as "experimental" (§3); the TSL reactive-synthesis benchmark exists but publishes no headline numbers ([repo](https://github.com/Barnard-PL-Labs/TSL_LLM_Benchmark), 4 stars).

**Implications:** (1) keep model-authored transition tables *per screen* and small; (2) validate reachability and event/handler existence deterministically and feed errors back (03's repair loop); (3) prefer named, builder-owned machines that the model *selects and parameterizes* over machines it *authors*; (4) treat flow edits as patches against an existing graph, where the evidence is strongest.

---

## 10. Tradeoffs

| Encoding | Expressiveness | Schema-enforceable | LLM reliability (evidence) | Designer legibility | Cost to build | Best tier |
|---|---|---|---|---|---|---|
| Action enum + params (SDUI style) | Low–medium: anything the vocabulary names | Full (enum verbs, per-verb param schemas via discriminated union) | High — same as component enums (03) | High — reads as "on press → open refund modal" | Low: one registry | T0, T1 |
| Scalar variables + AST conditions (Figma style) | Medium: branching, gating, counters | Full (AST in JSON) | High for shallow trees; unknown beyond depth 3 | Medium — verbose JSON, but Figma users already think this way | Low | T0 |
| Builder-owned named machines (idle/submitting/…) | Medium: all async states | Full (machine id enum + event enum) | High — model selects, doesn't author | High — "this form uses the submit machine" | Medium: a handful of generic machines | T1 |
| Model-authored statecharts (XState JSON) | High | Structure yes; semantics need reachability lint | Medium-low — "≤ 0.38 F1" on transitions (PSMBench); good when editing (ChatFSM 83%) | Medium — needs a visualizer (Stately) | Medium | T1 flows with explicit steps |
| JSON-Pointer store + `$state`/`$bind` | High for data-driven UI | Path syntax yes; path *existence* needs a lint against fixtures | High (json-render / A2UI in production) | Medium | Medium: store, reducers, history | T1 |
| String expression (CEL subset) | High | No (string) — parser + validator required | Unknown for this domain; CEL is one-liner friendly | High — reads like prose | Medium: parser, validator, cost limits | T1 (later) |
| Code island (`CustomBlock`) | Unbounded | Boundary only | High for code, per 03's baseline | Low | Low per island, high in aggregate | T2 |

---

## 11. Recommended v1 encoding

**Shape:** event→action tables with a closed, versioned verb set; a single JSON-Pointer store seeded from intent fixtures; conditions as JSON ASTs over the Figma-sized operator set; async behavior by *referencing* builder-owned machines; flows as a screen-level edge table; `CustomBlock` islands that can only reach state through the same verbs. No strings are ever evaluated. Every verb, machine id, event name, function name and fixture path is an enum or a lint-checked reference, so the validity ladder from [03](03-construction-file-generation.md) applies unchanged.

```json
{
  "screen": "order-detail",
  "state": {
    "order":  { "$fixture": "order[0]" },
    "refund": { "amount": null }
  },
  "children": {
    "header": { "type": "DetailHeader", "props": { "title": { "$state": "/order/id" } },
                "on": { "back": [ { "do": "nav.back" } ] } },
    "refund-btn": { "type": "Button", "props": { "label": "Refund…", "intent": "primary" },
                    "visible": { "op": "neq", "args": [ { "$state": "/order/status" }, "refunded" ] },
                    "on": { "press": [ { "do": "overlay.open", "target": "refund-modal" } ] } },
    "refund-modal": { "type": "RefundDialog", "overlay": true,
      "machine": { "use": "async.submit", "id": "refund" },
      "slots": {
        "amount": { "type": "MoneyInput", "bind": "/refund/amount",
                    "checks": [ { "fn": "required" },
                                { "fn": "lte", "args": [ { "$state": "/order/total" } ], "message": "Cannot exceed order total" } ] }
      },
      "on": {
        "confirm": [ { "do": "form.validate", "scope": "refund-modal" },
                     { "do": "api.call", "endpoint": "refunds.create", "machine": "refund",
                       "optimistic": [ { "do": "state.set", "path": "/order/status", "value": "refunded" } ] } ],
        "cancel":  [ { "do": "overlay.close" } ]
      },
      "stateViews": { "refund.submitting": "loading", "refund.error": "error", "refund.success": "done" }
    }
  },
  "api": {
    "refunds.create": { "latency": 800, "outcome": { "$fixture": "refund.outcome" },
      "onDone": [ { "do": "toast", "text": "Refund issued" }, { "do": "overlay.close" } ],
      "onFail": [ { "do": "history.undo" } ] }
  },
  "flows": [ { "from": "order-detail", "on": "nav.back", "to": "orders-list" } ]
}
```

What the builder owns here: the router and overlay stack (`nav.*`, `overlay.*`), the store with history (`state.*`, `history.*`), the generic `async.submit` machine (idle → submitting → success | error, with `RETRY`/`DISMISS`), the mock server derived from `api` plus fixtures (MSW + `@mswjs/data`), form validation from `checks`, and the `stateViews` mapping to component variants. What the model owns: which verbs, which targets, which paths, which fixture outcomes, and copy. Iteration remains JSON Patch: "make the refund optimistic" is one `add` of the `optimistic` array; "add a confirmation step" is one new `flows` edge plus a screen node ([05 §6](05-surgical-editing-iteration.md)).

Verb set for v1 (deliberately Figma-plus-json-render sized): `nav.to`, `nav.back`, `overlay.open`, `overlay.close`, `state.set`, `state.push`, `state.remove`, `form.validate`, `api.call`, `machine.send`, `toast`, `history.undo`, `history.redo`, `url.open`. Function set for `checks`/conditions: `eq neq lt lte gt gte and or not isEmpty length required regex email` plus `formatNumber formatCurrency formatDate pluralize` for display bindings — A2UI's catalog nearly verbatim.

---

## 12. Open questions

1. **AST vs string conditions at scale.** The AST form is schema-safe but ~3× the tokens of a CEL string; at what condition count per screen does the token cost of the AST outweigh the repair-loop cost of strings? No data.
2. **Machine authorship boundary.** When a designer wants a bespoke five-step wizard, is it better to let the model author an XState-shaped config (validated for reachability) or to force composition of builder machines? ChatFSM's 83% is for *edits*; authoring numbers for UI flows do not exist.
3. **Cross-screen state ownership.** Should `session` state be declared per screen (BMAD-style sharding, [02](02-intent-spec-and-context.md)) or once in a `prototype.json` root? Sharding helps generation; a root helps lint.
4. **Round-trip to Figma.** The v1 verb/trigger set is a near-subset of Figma's `Interaction` model; is exporting construction-file flows as Figma prototype interactions (via the plugin API) worth building as a review surface?
5. **Optimistic semantics.** Snapshot-and-restore (TanStack `onMutate`) vs history-based undo are different rollback models; the example uses `history.undo` for simplicity, which is wrong if unrelated state changed during the request.
6. **Expression cost limits.** CEL/Kubernetes impose a cost budget; do AST conditions need a depth/size cap enforced by schema, and what should it be?

---

## 13. Recommended experiments

- **E7 — Behavior validity rate.** Extend E1's vertical slice with the v1 verb set and 10 screens that each require three of the ten behaviors; measure first-pass validity of action bindings (unknown verb, dangling target, unreachable flow edge) against the ≥90% bar from [00](00-architecture-synthesis.md).
- **E8 — Condition encoding A/B.** Same screens, conditions as JSON AST vs CEL-subset strings; measure tokens, parse/validate failure rate, and repair rounds. Decides open question 1.
- **E9 — Select-vs-author machines.** For five flows (wizard, delete-with-undo, optimistic edit, paginated load, auth-gate), compare builder-machine selection against model-authored XState JSON; grade with reachability lint plus a human "does it behave as specced" pass. Uses PSMBench-style state/transition F1 as the metric.
- **E10 — Patch reliability on flows.** 20 sequential flow edits ("insert a confirmation step", "make deletion undoable") via JSON Patch; count invalid edges and orphaned handlers. This is the ChatFSM setting, where evidence predicts success.
- **E11 — Island pressure.** Deliberately request T2 behaviors (drag-reorder, canvas) and check that the validator's island/custom-verb ratios trigger the "stop speccing" recommendation rather than a bloated file.

---

## 14. Candidate picks for skill-resources

- [vercel-labs/json-render](https://github.com/vercel-labs/json-render) — 16.1k stars, Apache-2.0; the closest shipped action/state/expression model (`on`, `setState`/`pushState`/`removeState`, `$state`/`$cond`/`$bindState`, `watch`) to copy shapes from.
- [A2UI v1.0 specification](https://a2ui.org/specification/v1.0-a2ui/) — Google's declarative protocol; its function catalog (`required`, `regex`, `formatCurrency`…) and `allowedCallers` scoping are a ready-made bounded function set.
- [Figma REST API spec (`rest-api-spec`)](https://github.com/figma/rest-api-spec) — MIT; the `Interaction`/`Trigger`/`Action`/`ExpressionFunction` schemas are a designer-validated minimum vocabulary and a round-trip target.
- [Adaptive Cards templating language](https://learn.microsoft.com/en-us/adaptive-cards/templating/language) and [Universal Action Model](https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model) — six years of "declarative UI with a bounded expression language" in production; `$when`, `$data` repeat, `verb`+`data`, `refresh`.
- [XState v5 docs — machines](https://stately.ai/docs/machines) and [stately.ai/llms.txt](https://stately.ai/llms.txt) — the JSON-serializable config with named implementations; the llms.txt is the model-facing reference to bundle.
- [statelyai/agent](https://github.com/statelyai/agent) — MIT, alpha; "make invalid agent actions impossible" via `allowedEvents` and guards — a pattern for gating model-proposed patches.
- [cel-expr/cel-spec](https://github.com/cel-expr/cel-spec) — Apache-2.0; the reference non-Turing-complete expression language if v2 moves from AST to strings; Kubernetes' cost-budget doc shows how to bound it.
- [mswjs/data](https://github.com/mswjs/data) — MIT; Prisma-style in-memory collections with relations, the fake-server-with-memory layer for T1 list CRUD.
- [MCP Apps specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) — the posture for code islands: sandboxed HTML that can only reach the host through a JSON-RPC whitelist.
- [Yelp CHAOS series](https://engineeringblog.yelp.com/2024/03/chaos-yelps-unified-framework-for-server-driven-ui.html) — the best-documented SDUI action model (versioned `actionType`, observable properties, subsequent views, single-JSON → four typed libraries).
- [Redux — implementing undo history](https://redux.js.org/usage/implementing-undo-history) — the `{past, present, future}` enhancer that gives every prototype undo for free.
- [PSMBench (NeurIPS 2025)](https://proceedings.neurips.cc/paper_files/paper/2025/hash/521bd9583b3a39e92f662ee57e81e5ce-Abstract-Datasets_and_Benchmarks_Track.html) — the state/transition F1 metric to reuse for grading model-authored flows.

---

## 15. Sources

- https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/
- https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5 (403)
- https://eng.lyft.com/the-journey-to-server-driven-ui-at-lyft-bikes-and-scooters-c19264a0378e (403; quotes via search)
- https://engineeringblog.yelp.com/2024/03/chaos-yelps-unified-framework-for-server-driven-ui.html
- https://engineeringblog.yelp.com/2025/07/chaos-inside-yelps-sdui-framework.html
- https://engineeringblog.yelp.com/2026/04/keeping-server-driven-ui-consistent-across-platforms.html
- https://careersatdoordash.com/blog/improving-development-velocity-with-generic-server-driven-ui-components/
- https://spotify.github.io/HubFramework/action-programming-guide.html
- https://github.com/spotify/HubFramework
- https://github.com/Shopify/remote-dom/blob/main/README.md
- https://stately.ai/docs/machines
- https://stately.ai/docs/generate-flow
- https://stately.ai/llms.txt
- https://github.com/statelyai/xstate
- https://github.com/statelyai/xstate/discussions/5459
- https://github.com/statelyai/agent
- https://www.w3.org/TR/scxml/
- https://github.com/figma/rest-api-spec/blob/main/openapi/openapi.yaml
- https://developers.figma.com/docs/plugins/api/Action/
- https://developers.figma.com/docs/plugins/api/Trigger/
- https://help.figma.com/hc/en-us/articles/15253194385943-Use-conditionals-in-prototypes
- https://www.protopie.io/learn/docs/interactions-triggers
- https://www.protopie.io/features/interaction-logic
- https://learn.createwithplay.com/en/articles/8491415-introduction-to-interactions
- https://learn.createwithplay.com/en/articles/9890193-welcome-to-play-2-0
- https://origami.design/documentation/patches/builtin.switch.html
- https://origami.design/documentation/concepts/pulsesignal
- https://www.framer.com/help/articles/using-triggers/
- https://a2ui.org/specification/v1.0-a2ui/
- https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- https://github.com/a2ui-project/a2ui
- https://github.com/vercel-labs/json-render
- https://deepwiki.com/vercel-labs/json-render/3.7-event-system-and-actions
- https://docs.thesys.dev/guides/interactivity/actions
- https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model
- https://learn.microsoft.com/en-us/adaptive-cards/templating/language
- https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-adaptive-expressions (404)
- https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx
- https://github.com/MCP-UI-Org/mcp-ui
- https://developers.openai.com/apps-sdk/build/state-management
- https://docs.copilotkit.ai/agno/generative-ui/open-json-ui
- https://github.com/CopilotKit/generative-ui
- https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026
- https://docs.copilotkit.ai/reference/hooks/useCopilotAction
- https://cel.dev/
- https://github.com/cel-expr/cel-spec
- https://kubernetes.io/docs/reference/using-api/cel/
- https://jmespath.org/specification.html
- https://docs.jsonata.org/overview.html
- https://github.com/jsonata-js/jsonata
- https://learn.microsoft.com/en-us/power-platform/power-fx/overview
- https://github.com/microsoft/Power-Fx
- https://docs.retool.com/apps/scripting-events/guides/javascript
- https://docs.retool.com/apps/guides/interaction-navigation/event-handlers
- https://www.home-assistant.io/docs/automation/basics/
- https://www.home-assistant.io/docs/scripts/
- https://nodered.org/docs/user-guide/writing-functions
- https://redux.js.org/understanding/thinking-in-redux/three-principles
- https://redux.js.org/usage/implementing-undo-history
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- https://github.com/mswjs/data
- https://miragejs.com/docs/getting-started/overview/
- https://proceedings.neurips.cc/paper_files/paper/2025/hash/521bd9583b3a39e92f662ee57e81e5ce-Abstract-Datasets_and_Benchmarks_Track.html
- https://link.springer.com/chapter/10.1007/978-3-032-28274-3_22 (paywalled; abstract via search)
- https://arxiv.org/html/2506.00001v1
- https://arxiv.org/html/2412.05625
- https://arxiv.org/abs/2510.14969
- https://arxiv.org/abs/2604.09577
- https://arxiv.org/abs/2509.07334
- https://arxiv.org/abs/2412.20071
- https://github.com/Barnard-PL-Labs/TSL_LLM_Benchmark
