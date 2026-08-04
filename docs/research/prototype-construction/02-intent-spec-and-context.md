# 02 — Defining Intent, Data & Concept, and Packaging DSL Docs as LLM Context

**Stage 2 research for the deterministic prototype-construction pipeline.**

This document investigates the *input side* of the proposed architecture: how a designer expresses "what to build" (intent, data, concept) in a form an LLM can reliably translate into a construction file, and how the documentation of the DSL/primitive catalog should be packaged and served to the model so that generation stays accurate, on-system, and token-cheap. It draws on spec-driven development tooling (GitHub Spec Kit, Kiro, BMAD), Anthropic's context-engineering and Agent Skills guidance, Chroma's context-rot research, Atlassian's design-system "context engine" results, shadcn's MCP registry pattern, schema-first data mocking, and research on clarification/slot-filling dialogue. It ends with a tradeoff analysis and a set of recommended experiments.

---

## Table of Contents

1. [Framing: the two inputs to the generation step](#1-framing-the-two-inputs-to-the-generation-step)
2. [Intent specification formats](#2-intent-specification-formats)
   - 2.1 The fidelity spectrum of intent
   - 2.2 Spec-driven development: Spec Kit, Kiro, BMAD
   - 2.3 What a *screen-level* spec contains
   - 2.4 Data-shape definitions as specification
   - 2.5 Flows and journeys
   - 2.6 A designer-friendly intent format (illustrative sketch)
3. [Serving DSL/primitive docs to the model](#3-serving-dslprimitive-docs-to-the-model)
   - 3.1 Context-engineering first principles
   - 3.2 Progressive disclosure and the Skills pattern
   - 3.3 llms.txt: the pattern is useful even where the standard failed
   - 3.4 Full catalog in context vs retrieval — and context rot
   - 3.5 Few-shot construction files: the strongest teacher
   - 3.6 MCP resources/tools vs static docs
4. [Prior art: catalog-grounded generation](#4-prior-art-catalog-grounded-generation)
5. [Data binding: getting real/sample data into prototypes](#5-data-binding-getting-realsample-data-into-prototypes)
6. [The conversation loop: iterating on intent](#6-the-conversation-loop-iterating-on-intent)
7. [Tradeoffs and value analysis](#7-tradeoffs-and-value-analysis)
8. [Open questions](#8-open-questions)
9. [Recommended experiments](#9-recommended-experiments)
10. [Sources](#10-sources)

---

## 1. Framing: the two inputs to the generation step

In the proposed pipeline the LLM's only creative act is producing a **construction file** (JSON/YAML) that references catalog primitives. That act is conditioned on exactly two inputs, and this stage of the research is about both:

```
┌─────────────────┐     ┌──────────────────────┐
│  INTENT SPEC    │     │  DSL / CATALOG DOCS  │
│  what to build, │  +  │  what can be built,  │──► LLM ──► construction file
│  with what data │     │  with what knobs     │
└─────────────────┘     └──────────────────────┘
```

Everything downstream (deterministic build, validation, assembly) is only as good as these two inputs. The key insight from every system surveyed below — Spec Kit, Kiro, BMAD, Atlassian's context engine — is the same: **the spec and the catalog docs are not prompts; they are artifacts.** They live in files, they are versioned, they are reviewed, and the LLM call is a (mostly) pure function of them. That property is what makes the pipeline reproducible and debuggable, and it is what distinguishes this architecture from "vibe prototyping."

A second framing point: the intent spec and the catalog docs trade off against each other. The richer and more constrained the catalog documentation (enums, defaults, slot rules), the *less* the intent spec has to say — the designer specifies deltas from sensible defaults, not full descriptions. This is the same economy that makes design systems valuable to humans, applied to model context.

---

## 2. Intent specification formats

### 2.1 The fidelity spectrum of intent

Intent capture exists on a spectrum, and the right point depends on how much the output must be trusted:

| Level | Form | Example | Best for |
|---|---|---|---|
| L0 | Loose prompt | "make a settings page for notifications" | throwaway explorations |
| L1 | Structured brief | goal + audience + constraints + tone, in prose sections | early concepts, mood |
| L2 | Screen/flow spec | named screens, regions, states, data shape, interactions | **prototype construction (this pipeline)** |
| L3 | Formal requirements | EARS acceptance criteria, testable statements | production handoff |

The prototyping pipeline lives at **L2**: enough structure that the construction file is derivable without guessing, not so much ceremony that a designer abandons it. Guidance from designer-facing tools converges here: Figma's own prompting guidance for Figma Make tells designers to treat the prompt "like a mini design brief" — what you're designing, who it's for, how it should feel — and reports that structured, sectioned prompts materially outperform freeform ones ([Figma blog: a designer's framework for better AI prompts](https://www.figma.com/blog/designer-framework-for-better-ai-prompts/), [How to prompt Figma Make's AI better](https://uxdesign.cc/how-to-prompt-figma-makes-ai-better-for-product-design-627daf3f4036)). Figma Make also inserts a *plan step* — clarify intent, produce an editable structured plan, then generate — which is essentially L1→L2 promotion built into the product.

### 2.2 Spec-driven development: Spec Kit, Kiro, BMAD

Three mature systems show what "spec as executable artifact" looks like in practice. All three are code-oriented, but their decomposition maps cleanly onto prototype construction.

**GitHub Spec Kit** ([github.com/github/spec-kit](https://github.com/github/spec-kit), [docs](https://github.github.com/spec-kit/), [methodology essay](https://github.com/github/spec-kit/blob/main/spec-driven.md)) packages a CLI, templates, and prompts around a four-phase loop: **Specify → Plan → Tasks → Implement**. The critical design decisions relevant here:

- The *specify* phase deliberately captures only the **what and why** — no tech choices. This is the layer a designer owns.
- The *plan* phase maps the spec onto the available stack — in our pipeline, that's the mapping of intent onto catalog primitives, i.e., the construction file.
- Specs contain explicit `[NEEDS CLARIFICATION]` markers that the agent must resolve with the human before proceeding — a formalized ambiguity protocol (see §6).
- The spec is "the source of truth for your tools and AI agents to generate, test, and validate code" — validation runs *against the spec*, which is only possible because it's structured.

**Kiro** (AWS's agentic IDE, [kiro.dev/docs/specs/feature-specs](https://kiro.dev/docs/specs/feature-specs/)) splits every feature into three files:

- `requirements.md` — user stories with acceptance criteria in **EARS notation** ("Easy Approach to Requirements Syntax": `WHEN <trigger> THE SYSTEM SHALL <response>`). EARS is interesting for prototypes because it is exactly the shape of *interaction* specs: "WHEN the user taps a row, the detail sheet SHALL open."
- `design.md` — architecture, diagrams, component interactions.
- `tasks.md` — discrete, trackable implementation units.

**BMAD Method** ([github repo](https://github.com/cdwbrad/bmad-method), [overview](https://www.augmentcode.com/guides/bmad-method-ai-development)) adds one idea the others lack: **sharding**. A PM/Architect agent pair produces a Product Brief + PRD + architecture doc; a Scrum Master agent then shards these into self-contained **story files**, each embedding *all* the context a dev agent needs — requirements, rationale, architectural constraints, acceptance criteria — so the executing agent never needs the whole corpus in context. For prototype construction, the analog is: a multi-screen prototype spec gets sharded into **per-screen construction tasks**, each carrying its own data slice and only the catalog subset it needs. This is context-budget management done at the spec layer rather than the retrieval layer.

**Takeaway for this pipeline:** adopt the Spec Kit separation (intent ≠ construction plan), the EARS-style trigger/response form for interactions, and the BMAD sharding move for multi-screen prototypes.

### 2.3 What a *screen-level* spec contains

Synthesizing across the above plus server-driven-UI practice (see §4), a screen spec sufficient to derive a construction file needs seven ingredients:

1. **Purpose** — one sentence; what the user accomplishes here.
2. **Context** — where in the app/flow it lives; entry and exit points.
3. **Data shape** — the entities on screen, ideally as sample JSON or a schema reference (§2.4).
4. **Structure sketch** — regions/containers in order (header, list, detail pane…), *named in catalog vocabulary* where possible.
5. **States** — loading, empty, error, populated, and any per-component variants that matter to the concept.
6. **Interactions** — EARS-style trigger→response pairs, limited to what the prototype must demonstrate.
7. **Out-of-scope declarations** — what is deliberately fake/static. Marking non-goals suppresses hallucinated completeness (the model otherwise invents settings pages and auth flows).

Notably absent: visual styling. In this architecture the *catalog is the styling*; the spec should never restate what tokens and components already encode. Atlassian's DESIGN.md work found this exact division of labor turned output "from generic slop to recognizably Atlassian" ([Atlassian DESIGN.md](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)).

### 2.4 Data-shape definitions as specification

A repeated finding across generative-UI systems: **sample data is the highest-leverage part of the spec.** A concrete JSON sample simultaneously communicates entity names, field types, cardinality, realistic value lengths (which drive layout truthfully), and the domain register ("Invoice #INV-2041 · Overdue" vs "Item 1"). Options, in increasing formality:

- **Inline sample JSON** (3–5 records) — the designer-friendly default; doubles as the fixture the deterministic builder binds (§5).
- **JSON Schema** — when constraints matter (enums, required fields, formats); feeds `json-schema-faker` for volume generation ([json-schema-faker.js.org](https://json-schema-faker.js.org/)).
- **TypeScript types** — natural when the catalog is TS; models parse them extremely well, but designers rarely author them.
- **A pointer to a real API response** — captured once, scrubbed, checked into the repo as a fixture.

Recommended rule: *sample JSON is required, schema is optional.* The sample is the contract; the schema is an amplifier.

### 2.5 Flows and journeys

For multi-screen prototypes the spec needs a flow layer above screens. Minimal viable representation: a list of screens plus a transition table (`from`, `trigger`, `to`), which is trivially checkable ("every screen reachable? every trigger defined on a component that exists?"). Mermaid flowcharts are a good authoring surface since LLMs read and write them natively and designers can review them visually. Keep flow logic out of individual screen specs — the BMAD sharding point again: each screen construction task receives only its own transitions.

### 2.6 A designer-friendly intent format (illustrative sketch)

The design goal for the format itself: **a designer can author it in a text file in under 15 minutes, and a reviewer can diff it.** YAML with prose-friendly fields; catalog vocabulary optional-but-encouraged (the LLM's job is precisely to map loose nouns onto catalog primitives). A sketch:

```yaml
# intent.yaml — prototype intent spec (stage-2 sketch)
prototype: order-refunds-console
concept: >
  Support agents need to find an order and issue a partial or full refund
  in under a minute. Optimize for scan speed and confirmation confidence.
audience: internal support agents (expert users, keyboard-heavy)
scope:
  in: [order search, order detail, refund modal, success state]
  out: [auth, real payments, editing orders]      # explicit non-goals

data:
  order:                      # inline sample data IS the fixture (see §5)
    sample:
      - id: "ORD-10422"
        customer: "Maya Chen"
        total: 148.50
        currency: USD
        status: fulfilled
        items:
          - { sku: "TSH-M-BLK", name: "Tee — Black M", qty: 2, price: 24.00 }
          - { sku: "HDY-L-GRY", name: "Hoodie — Grey L", qty: 1, price: 100.50 }
    volume: 25                # builder expands via faker to 25 rows
    variants: [fulfilled, refunded, partially_refunded]   # ensure states appear

screens:
  - id: orders-list
    purpose: find an order fast
    structure: [page-header, filter-bar, data-table]      # catalog nouns
    states: [populated, empty-search, loading]
    interactions:
      - when: user selects a table row
        then: navigate to order-detail
  - id: order-detail
    purpose: verify the order and start a refund
    structure: [page-header/back, summary-card, line-item-table, action-bar]
    interactions:
      - when: user presses "Refund…"
        then: open refund-modal
  - id: refund-modal
    purpose: choose full/partial refund with clear consequence preview
    states: [default, partial-selected, submitting, error]
    interactions:
      - when: user confirms refund
        then: show success toast, return to order-detail with status updated

open_questions:               # designer flags ambiguity instead of hiding it
  - should partial refunds be per-line-item or free-amount?
```

Properties worth noting: non-goals are first-class; states are enumerated (the classic omission in loose prompts); interactions use the EARS when/then shape; `open_questions` gives the conversation loop (§6) a native slot; and the data block is simultaneously spec and fixture. This file — not the chat transcript — is what gets versioned and re-run.

---

## 3. Serving DSL/primitive docs to the model

### 3.1 Context-engineering first principles

Anthropic's context-engineering guidance ([Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)) provides the frame:

- **Attention budget is finite.** Transformer attention over n tokens involves n² pairwise relationships; accuracy degrades as context grows even far below the window limit. Treat every token of catalog doc as spend.
- **Right altitude.** Docs that are too prescriptive become brittle "hardcoded if-else"; too vague and the model improvises off-system. The catalog doc should give *concrete signals* (props, enums, slot rules, defaults) without prose essays.
- **Just-in-time context.** Prefer lightweight identifiers (component names + one-liners) that the model can expand on demand over loading everything upfront.
- **Examples over rules.** "Curate diverse, canonical examples" rather than enumerating edge cases in prose — directly supporting §3.5.

### 3.2 Progressive disclosure and the Skills pattern

Anthropic's Agent Skills ([Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)) are the reference implementation of progressive disclosure, in three levels:

1. **Metadata** (name + description, ~tens of tokens) — always in context; enough to know *when* the capability is relevant.
2. **SKILL.md body** — loaded when triggered; the core how-to.
3. **Bundled reference files** — loaded only as navigated (per-component doc pages, the full schema, example galleries).

Mapped onto a design-system catalog, this yields a concrete packaging recommendation:

```
catalog-skill/
  SKILL.md            # L2: DSL overview, construction-file grammar, top rules,
                      #     the component INDEX (name + 1-line + key props)
  references/
    components/       # L3: one file per primitive — full props, slots,
      data-table.md   #     constraints, 2 usage examples each
      filter-bar.md
    examples/         # L3: complete valid construction files (see §3.5)
    schema/           # L3: the machine-checkable JSON Schema of the DSL
```

The index-in-SKILL.md / details-in-files split means a 100-component system costs perhaps 1.5–3K tokens resident, with per-component pages (~300–800 tokens each) pulled only when the intent spec touches them. This matches how the SwirlAI analysis characterizes Skills: "a lightweight index of capabilities, pulls in details when needed, keeps context lean" ([Agent Skills: Progressive Disclosure as a System Design Pattern](https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure)).

### 3.3 llms.txt: the pattern is useful even where the standard failed

llms.txt — a markdown index file listing curated doc links for LLM consumption — has effectively failed as a *public web* standard: no major provider reads it in production, Google explicitly rejected it, and analyses find no citation effect ([Mintlify: What is llms.txt?](https://www.mintlify.com/blog/what-is-llms-txt), [The llms.txt Standard: Why Nobody Uses It](https://rye.dev/blog/llms-txt-standard-elegant-solution-nobody-using/)). But the *shape* it proposes — a single markdown index with one-line descriptions linking to flattened markdown pages — is exactly the right shape for a **private, deliberately-loaded catalog**, where you control the agent and can guarantee the file is read. The failure was distribution, not design. Practical translation: maintain an `INDEX.md` for the catalog (llms.txt shape) and load it deliberately via the skill; don't wait for any tool to discover it.

### 3.4 Full catalog in context vs retrieval — and context rot

Chroma's context-rot research ([Context Rot: How Increasing Input Tokens Impacts LLM Performance](https://www.trychroma.com/research/context-rot)) tested 18 frontier models and found: reliability declines with input length even on trivial tasks; degradation appears well before window limits (models showing significant degradation at ~50K tokens despite 200K windows); mid-context information suffers most; and **distractors hurt non-uniformly** — highly similar-but-wrong items are the worst case. That last finding matters specifically for component catalogs, which are *full* of near-duplicates (`Select` vs `Dropdown` vs `Combobox`, three table variants). A dumped catalog is a distractor-maximizing context.

Practical sizing guidance for this pipeline:

- **Small catalog (≤ ~30 primitives, ≤ ~10–15K tokens fully documented):** put it all in context, ordered with the most-used primitives first and last (avoid burying keystones mid-context). Prompt caching makes the recurring cost minor (§7).
- **Medium (30–150 primitives):** resident index + on-demand pages (the Skills layout above).
- **Large / multi-brand:** index + retrieval/tool-query (the shadcn/Atlassian MCP pattern, §4), plus BMAD-style sharding so each generation task only ever needs a subset.

The strongest mitigation, though, is upstream of context management: **the DSL grammar itself**. If the construction-file schema names exactly one primitive per job and validation rejects unknown types, near-duplicate confusion becomes a build-time error rather than a silent quality loss.

### 3.5 Few-shot construction files: the strongest teacher

Both practitioner evidence and research agree that worked examples of the *exact* output format outperform prose documentation of the format. Reported figures: prompting-only structured-output reliability tops out around ~85% in OpenAI evals, while adding few-shot exemplars lifted GPT-4 to ~89% and Llama-3 from much lower baselines to ~72% in one comparative test ([structured output guides](https://genaiunplugged.substack.com/p/structured-outputs-json-prompts-guide), [few-shot JSON reliability](https://dev.to/maanu07/reliable-llm-json-output-few-shot-prompting-robust-parsing-2f11)). Anthropic's guidance frames examples as the highest-density teaching tokens available.

For this pipeline, ship an `examples/` gallery of **3–5 complete intent-spec → construction-file pairs**, chosen to be *diverse and canonical*: one list/detail screen, one form-heavy screen, one dashboard, one multi-screen flow, and — importantly — **one example that exercises the weird parts** (slot overrides, state variants, data binding syntax). Each generation call includes the 1–2 nearest examples (selected by simple similarity to the intent spec), not all five. Examples also encode the idioms no schema can: which container to reach for, how much to leave to defaults, how sparse a good construction file looks.

A corollary: every time the pipeline fails and gets hand-fixed, the corrected pair is a candidate new exemplar. The example gallery is the pipeline's training loop, at zero fine-tuning cost.

### 3.6 MCP resources/tools vs static docs

Three serving mechanisms, with distinct failure modes:

| Mechanism | Pull model | Strengths | Weaknesses |
|---|---|---|---|
| **Static docs in repo (skill)** | agent reads files | versioned with the catalog, diffable, works offline, cache-friendly | agent must be told the layout; goes stale if docs aren't generated from source |
| **MCP resources** | host attaches docs | clean separation, shareable across tools | resource support uneven across clients; still essentially static |
| **MCP tools (queryable catalog)** | model *asks* (`search_components`, `get_component`, `get_examples`) | scales to huge catalogs; always-current; the model pulls only what it needs (JIT principle) | per-call latency; agent may under-query; requires running a server |

Evidence favors the tool-query pattern at scale: shadcn's official MCP server lets agents browse/search/install from any registry, eliminating "outdated knowledge and hallucinated props" by serving live registry data ([ui.shadcn.com/docs/mcp](https://ui.shadcn.com/docs/mcp)); Atlassian's ADS MCP is the delivery channel for their schema files (§4). Anthropic's tool-design guidance applies: few, unambiguous tools — a `search` + a `get` beats a dozen overlapping endpoints.

**Recommendation:** docs *generated from the component source* (so they cannot drift), exposed **both** ways — as static skill files for the common case (cheap, cacheable) and as a thin MCP query tool for long-tail lookups. Generation-from-source is the non-negotiable part; Atlassian's core move was exactly "translate documentation into machine-readable schema files."

---

## 4. Prior art: catalog-grounded generation

**Atlassian's design-system context engine** is the most direct precedent with published numbers. They converted ADS documentation into structured schema files delivered via an MCP server and skills, plus a portable `DESIGN.md`. Reported results: **52% improvement in AI-call accuracy, 34% faster ADS-specific tasks, 26% fewer tool calls, 16% fewer tokens** ([Building the context engine for the AI era](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)). In their Rovo Dev demo, generated code used real tokens and real ADS components with correct a11y patterns from the start, compressing a homepage redesign from an estimated 4–5 developer-days to ~20 minutes ([Redesigning a homepage in 20 minutes](https://www.atlassian.com/blog/developer/redesigning-homepage-20-minutes-with-rovo-dev)). Their meta-finding is worth internalizing: *"identifying the rules that help LLMs also uncovers the rules that help explain these concepts to humans"* — codifying the catalog for machines audits it for people.

**shadcn registry + MCP** demonstrates the query-not-hold pattern at community scale: any registry following the shadcn spec (public, private, company-internal) becomes agent-browsable; comparative write-ups find the gap between agents with and without live registry access "huge" ([LogRocket: AI + shadcn components](https://blog.logrocket.com/ai-shadcn-components/)). The registry spec itself — flat JSON metadata per component with files, dependencies, and docs — is a reasonable template for the catalog manifest in this pipeline.

**RAG over component docs** is the older pattern (embed Storybook/docs pages, retrieve top-k per request). It works, but two findings push against it for *this* use case: context-rot's distractor result (retrieval over near-duplicate component docs retrieves confusable neighbors together), and the general drift toward agentic navigation instead of embedding search — e.g., "Don't Retrieve, Navigate" style approaches distilling knowledge into navigable skill trees ([arxiv 2604.14572](https://arxiv.org/pdf/2604.14572)). For a curated, finite catalog, a structured index the model *navigates* beats similarity search over prose.

**Server-driven UI / generative-UI protocols** validate the construction-file concept itself. A2UI has the model emit declarative JSON that a client renderer materializes into native components ([A2UI introduction](https://a2aprotocol.ai/blog/a2ui-introduction), [spec](https://a2ui.org/specification/v0.8-a2ui/)); the curated [awesome-generative-ui](https://github.com/narrowin/awesome-generative-ui) list catalogs many such systems. Two transferable design lessons from that space: (1) **flat component lists with string-ID references generate more reliably than deeply nested trees** — models are better at emitting flat records than perfectly balanced nesting; (2) naming in the DSL should align with pre-training distributions (call it `button`, not `ads-interactive-trigger-v2`) while still validating against the closed catalog.

---

## 5. Data binding: getting real/sample data into prototypes

The pipeline's promise — prototypes that feel real — depends on data discipline. The mature stack:

- **Fixtures (checked-in JSON):** the baseline. The intent spec's inline `sample` records (§2.6) are written out by the builder as `fixtures/*.json`; components bind to them by path. Deterministic, diffable, reviewable.
- **Faker-style expansion:** `@faker-js/faker` generates volume (`volume: 25`) from a few authored seeds; **seed the RNG** so every build is identical — determinism is the whole point of this architecture.
- **Schema-first generation:** [json-schema-faker](https://json-schema-faker.js.org/) generates conforming records straight from JSON Schema (with faker/chance extensions for realistic values) — ideal when the spec includes a schema; guarantees mock data and spec can't disagree ([usage docs](https://github.com/json-schema-faker/json-schema-faker/blob/master/docs/USAGE.md)).
- **Network-level mocking:** [Mock Service Worker](https://mswjs.io/) intercepts fetch at the service-worker layer, so the prototype's code paths are the *real* ones (loading states, errors, latency) against fake endpoints. Combine with json-schema-faker for schema-conformant responses. This matters when the prototype should demonstrate async states honestly.

**Binding syntax in the construction file** should be declarative references, not inlined values:

```yaml
- type: data-table
  id: orders-table
  data: "@order"                 # binds to the 'order' collection from intent.yaml
  columns: [id, customer, total, status]
  states:
    empty: { when: "@order.length == 0" }
```

The builder resolves `@order` deterministically. Keeping data *out* of the component tree keeps the construction file small (less for the LLM to get wrong), lets the same construction render against different fixtures (empty/error/dense variants for free), and means data edits never require regeneration.

One more pattern from the intent side: **variant coverage declarations** (`variants: [fulfilled, refunded, …]`) instruct the fixture generator to guarantee that every visually distinct state actually appears in the sample set — a common gap when designers eyeball a single happy-path record.

---

## 6. The conversation loop: iterating on intent

A designer will not produce a complete intent spec in one pass, and the system shouldn't pretend otherwise. Relevant research and practice:

- **Clarify before generating.** Research on clarifying agents frames the job as detecting underspecification and asking *targeted* questions — precise questions help users express intent; broad ones add burden ([Active Task Disambiguation with LLMs](https://arxiv.org/pdf/2502.04485), [Modeling Future Conversation Turns to Teach LLMs to Ask Clarifying Questions](https://arxiv.org/pdf/2410.13788), [Clarifying Agent overview](https://www.emergentmind.com/topics/clarifying-agent)). The hard sub-problems are knowing the task *is* ambiguous and knowing when to *stop* asking.
- **Hybrid slot-filling.** The robust pattern from dialogue systems: the LLM parses free-text into slots, but a **deterministic slot manager** tracks which required fields are still empty and drives the questioning ([intent/input extraction pattern](https://medium.com/@hemantkohli1612/extracting-user-intent-and-inputs-in-conversation-91c66b14740e)). The intent-spec schema (§2.6) *is* the slot definition: required = purpose, data sample, screens+structure; optional = states, interactions, volume. This gives a checkable definition of "spec complete enough to build."
- **Spec Kit's `[NEEDS CLARIFICATION]` markers** show the artifact-centric version: the agent writes the spec draft with ambiguities flagged inline, and the human resolves them *in the document*, not in chat. This beats Q&A chat because resolved answers land somewhere durable.
- **Figma Make's plan gate** shows the product version: generate a structured, editable plan first; the designer edits the plan, then generation proceeds. Cheap to review, cheap to correct.

Recommended loop for this pipeline:

1. Designer writes a partial `intent.yaml` (or dictates prose; the LLM drafts the YAML).
2. A deterministic linter checks required slots; the LLM asks **at most 2–3 batched questions** targeting the highest-impact gaps (data shape and states first — they change layout most).
3. Answers are written *into the spec file*, including an `assumptions:` block for defaults the model chose silently (surfaced, not asked).
4. Generate construction file → build → designer reacts to the *rendered prototype*, and each reaction is applied as a **spec edit + regenerate** (or, for container-level tweaks, a direct construction-file patch — the "surgical authoring" idea from the architecture).

The critical discipline in step 4: iteration accrues to the spec, not to an ephemeral chat. Otherwise the spec rots within three rounds and the pipeline degenerates back into vibe prototyping.

Two failure modes to design against: **over-asking** (designers will tolerate one round of good questions, not five — prefer visible assumptions over questions for low-stakes gaps) and **premature convergence** (locking a spec too early during genuinely exploratory work; support an explicit "sketch mode" that skips slot enforcement).

---

## 7. Tradeoffs and value analysis

**Upfront spec cost vs generation reliability.** The intent spec costs a designer 10–20 minutes that a loose prompt doesn't. That cost buys: (a) determinism — same spec, same prototype; (b) reviewability — a diffable artifact rather than a chat log; (c) sharper generations — every SDD system reports fewer wrong-direction iterations; (d) a regression suite — old specs re-run against a new catalog version reveal breakage. The cost is real, though: spec-writing is a skill, ceremony deters exploration, and a wrong-but-precise spec fails more confidently than a vague one.

**When loose prompts beat structured intent.** Honest boundaries for this pipeline:

- *Divergent exploration* — when the designer doesn't yet know what they want, structure is friction; L0/L1 prompting into a throwaway tool is correct, and the pipeline should accept "promote this exploration into a spec" as an entry path rather than demanding specs first.
- *Off-system concepts* — when the point is to break the design system, a catalog-constrained pipeline is the wrong tool by definition.
- *One-shot trivia* — a single tweak to one screen doesn't amortize spec ceremony; that's what surgical construction-file edits are for.

The pipeline wins when the prototype must be *on-system, multi-screen, data-realistic, or repeatedly iterated* — which is most prototyping for an existing product.

**Token economics.** Three regimes:

1. **Catalog-in-context + prompt caching.** Cached input tokens are billed at roughly 10% of base input price on Claude-class APIs; a stable catalog prefix (system prompt + index + top examples) is the ideal cache target, and practitioners report up-to-90% cost reductions on cache-friendly workloads ([prompt caching economics](https://medium.com/@harshravivarapu/prompt-caching-the-overlooked-trick-that-cuts-your-llm-costs-by-90-f6d1f844be81), [RAG vs CAG analysis](https://futureagi.substack.com/p/rag-vs-cag-when-to-stop-retrieving)). For small/medium catalogs this makes "just include it, cached" cheaper *and* simpler than retrieval infrastructure — cost stops being the reason to retrieve.
2. **Retrieval/tool-query.** Justified not by cost but by **quality at scale**: context rot means a 60K-token catalog dump degrades accuracy regardless of price. Atlassian's structured-context results (26% fewer calls, 16% fewer tokens, 52% accuracy gain) show that *curated, schema-shaped* context beats both raw dumps and naive retrieval.
3. **The pipeline's own dividend.** The architecture's biggest token saving is upstream of any of this: the LLM emits a ~1–3K-token construction file instead of ~20–60K tokens of React/HTML per iteration, and iterations touch the spec or file, not full regenerations. The construction-file bet dwarfs catalog-serving optimizations by an order of magnitude.

**Net assessment.** Every load-bearing claim in the proposed architecture has independent supporting evidence: structured spec input (SDD tooling), machine-readable catalog context (Atlassian's metrics), few-shot format teaching (structured-output studies), declarative-JSON-to-renderer (A2UI/SDUI), deterministic data (schema-first mocking). The genuinely open risks are ergonomic, not technical: whether designers will author and maintain specs, and whether the catalog's expressiveness ceiling frustrates them (see below).

---

## 8. Open questions

1. **Spec authorship in practice.** Will designers write YAML, or does the intent spec need a form-like UI / conversational drafting front-end that *emits* the YAML? (The format sketch assumes text-file tolerance that may not exist outside design-engineer hybrids.)
2. **Expressiveness escape hatch.** What happens when intent exceeds the catalog — hard fail, nearest-primitive substitution with a warning, or a sanctioned `custom` block the LLM authors freely (the "surgical contents" idea)? Where that line sits determines whether the tool feels empowering or caging.
3. **Spec granularity floor.** How incomplete can a spec be before construction quality collapses? Is there a measurable knee (e.g., data sample present vs absent) that defines "minimum viable spec"?
4. **Catalog doc generation.** Can component-source → doc-page generation be fully automated (from TS props + Storybook stories), or does each primitive need hand-written usage guidance? Atlassian implies significant curation labor.
5. **Example-gallery maintenance.** Who curates the few-shot pairs as the DSL evolves, and how are stale exemplars detected (an old example teaching a deprecated pattern is actively harmful)?
6. **Flat vs nested construction files.** SDUI experience says flat + ID references generates more reliably; nested trees are easier for the deterministic builder and for humans to read. Which wins for *this* builder?
7. **Multi-fidelity intent.** Can one spec format serve both "sketchy concept" and "handoff-grade prototype" modes, or are those two formats with a promotion path?
8. **Where does the conversation state live** when a designer iterates across sessions/tools — in the spec file's `open_questions`/`assumptions` blocks, or does the pipeline need a session store?

---

## 9. Recommended experiments

1. **Spec-ablation study (cheapest, highest information).** Take 5 target screens from the real app. Generate each from (a) a one-line prompt, (b) a structured brief, (c) the full intent spec — against the same catalog context. Score construction files on: valid-primitive rate, states covered, hand-fix minutes. This measures exactly what the spec ceremony buys.
2. **Context-packaging bake-off.** Same 5 specs, three catalog servings: full dump in context (cached), skills-style index + on-demand pages, MCP query tool. Measure primitive-selection accuracy (especially near-duplicate confusions), tokens per generation, wall time. Chroma's distractor findings predict the dump loses on catalogs with confusable components — verify on *your* catalog size.
3. **Few-shot dosage curve.** 0, 1, 2, and 4 exemplar construction files in context; measure schema-valid output rate and idiom quality. Expect the 0→1 jump to dominate; find the point of diminishing returns to set the default.
4. **Data-realism A/B with designers.** Same prototype with lorem-ipsum data vs spec-driven seeded fixtures; have 3–5 designers/stakeholders react. Validates (or kills) the claim that data discipline is what makes prototypes persuasive.
5. **Clarification-loop dry runs.** Give 3 designers the blank intent template and a 15-minute limit; record where they stall and what the slot-linter flags. This surfaces whether the format needs a drafting UI (open question #1) before any more pipeline investment.
6. **Round-trip regression harness.** Freeze 10 spec → construction → build triples as golden files; re-run on every catalog/DSL change. This is cheap to build early and is what makes the "deterministic" promise enforceable over time.

---

## 10. Sources

**Spec-driven development**
- GitHub Spec Kit — https://github.com/github/spec-kit · docs: https://github.github.com/spec-kit/ · methodology: https://github.com/github/spec-kit/blob/main/spec-driven.md
- Microsoft: Diving into spec-driven development with Spec Kit — https://developer.microsoft.com/blog/spec-driven-development-spec-kit/
- Kiro feature specs (requirements/design/tasks, EARS) — https://kiro.dev/docs/specs/feature-specs/
- BMAD Method — https://github.com/cdwbrad/bmad-method · guide: https://www.augmentcode.com/guides/bmad-method-ai-development

**Context engineering & serving docs**
- Anthropic: Effective context engineering for AI agents — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Anthropic: Equipping agents for the real world with Agent Skills — https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- SwirlAI: Agent Skills — progressive disclosure as a system design pattern — https://www.newsletter.swirlai.com/p/agent-skills-progressive-disclosure
- Chroma: Context Rot — https://www.trychroma.com/research/context-rot · summary: https://cobusgreyling.medium.com/llm-context-rot-28a6d0399655
- Mintlify: What is llms.txt? — https://www.mintlify.com/blog/what-is-llms-txt · critique: https://rye.dev/blog/llms-txt-standard-elegant-solution-nobody-using/

**Catalog-grounded generation prior art**
- Atlassian: Building the context engine for the AI era — https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era
- Atlassian: DESIGN.md in practice — https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice
- Atlassian: Homepage redesign in 20 minutes (Figma MCP + ADS MCP + Rovo Dev) — https://www.atlassian.com/blog/developer/redesigning-homepage-20-minutes-with-rovo-dev
- shadcn/ui MCP server — https://ui.shadcn.com/docs/mcp · LogRocket analysis: https://blog.logrocket.com/ai-shadcn-components/
- A2UI declarative UI protocol — https://a2aprotocol.ai/blog/a2ui-introduction · https://a2ui.org/specification/v0.8-a2ui/
- awesome-generative-ui — https://github.com/narrowin/awesome-generative-ui

**Data mocking**
- json-schema-faker — https://json-schema-faker.js.org/ · usage: https://github.com/json-schema-faker/json-schema-faker/blob/master/docs/USAGE.md
- Mock Service Worker — https://mswjs.io/

**Structured output & few-shot**
- Reliable LLM JSON output via few-shot prompting — https://dev.to/maanu07/reliable-llm-json-output-few-shot-prompting-robust-parsing-2f11
- Structured outputs guide — https://genaiunplugged.substack.com/p/structured-outputs-json-prompts-guide

**Clarification & elicitation**
- Active Task Disambiguation with LLMs — https://arxiv.org/pdf/2502.04485
- Modeling Future Conversation Turns to Teach LLMs to Ask Clarifying Questions — https://arxiv.org/pdf/2410.13788
- Slot-filling with deterministic slot manager — https://medium.com/@hemantkohli1612/extracting-user-intent-and-inputs-in-conversation-91c66b14740e

**Designer prompting practice**
- Figma: A designer's framework for better AI prompts — https://www.figma.com/blog/designer-framework-for-better-ai-prompts/
- How to prompt Figma Make's AI better — https://uxdesign.cc/how-to-prompt-figma-makes-ai-better-for-product-design-627daf3f4036

**Token economics**
- RAG vs CAG — https://futureagi.substack.com/p/rag-vs-cag-when-to-stop-retrieving
- Prompt caching cost analysis — https://medium.com/@harshravivarapu/prompt-caching-the-overlooked-trick-that-cuts-your-llm-costs-by-90-f6d1f844be81
- Adaline: LLM cost optimization — https://www.adaline.ai/blog/llm-cost-optimization-token-efficiency-caching-prompt-design
