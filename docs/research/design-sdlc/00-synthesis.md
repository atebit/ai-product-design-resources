# Design-SDLC Synthesis — Hardening the Design Process for an AI-Native Delivery Loop

**Purpose:** Four research documents answer four open questions that surface the moment a team's prototypes stop living in one place: some in Figma, some in code, some as hosted AI-generated apps, some as static mockups and flow diagrams. Each document stands alone. This synthesis ties them into one model — a design lifecycle with explicit homes, review surfaces, gates, and guardrails — and names what the repo builds from it.

| Doc | Question | One-line verdict |
|---|---|---|
| [01 — Source of Truth: Figma vs. Code](01-source-of-truth-figma-vs-code.md) | Some prototypes are in Figma, some are not, code is more the truth — how do teams handle the back-and-forth, and which way is the field leaning? | Code is canonical for what ships, Figma for what is still being decided, tokens in a DTCG file both consume — and the *mapping layer* is the artifact teams actually maintain. Nobody credible round-trips. |
| [02 — Feedback on Code Prototypes & Flows](02-feedback-on-code-prototypes-and-flows.md) | How do you give good feedback on flows and prototypes that aren't laid out in Figma? | Rebuild the two things Figma gave for free — the anchor and the overview — then run the same critique discipline; comments are now agent inputs, so the format matters more. |
| [03 — Prototype Governance Outside the Codebase](03-prototype-governance-outside-the-codebase.md) | How are teams handling prototypes that aren't in the codebase: generated mockups, clickable prototypes, wireframes? | Every vendor ships prototype→PR in one click; the differentiating work is the ledger and the promotion gate. Reference crosses, code rarely does. |
| [04 — Small-Model Guardrails](04-small-model-guardrails.md) | How do you build guardrails so low-cost models execute consistently without looping? | Small models need a verifier, not a conscience; constrain selection, free the reasoning; the big model's job is to write the small model's prompt; bound every loop and measure pass^k. |

*Research conducted 2 September 2026 via four parallel web-research agents; roughly 290 sources fetched live across the four documents, with unverifiable items marked in each.*

---

## The composed model: a hardened design lifecycle

The four answers slot into one lifecycle. Each stage names the artifact, its canonical home, the surface where humans review it, the gate that ends the stage, and the guardrail that keeps cheap agents honest inside it. Templates referenced here ship in [02 §10](02-feedback-on-code-prototypes-and-flows.md) and [03 §10](03-prototype-governance-outside-the-codebase.md).

| Stage | Artifact | Canonical home | Review surface | Gate to next stage | Agent guardrail |
|---|---|---|---|---|---|
| **0 Frame** | Question, intent, flow sketch | Markdown/YAML spec + Mermaid flow in the repo (FigJam for workshops) | PR review on the spec and diagram; board comments during workshops | Spec names the question, the flow, the states, and the DS version | Spec is the planner's output; a big model writes it (04 §4) |
| **1 Explore** | Figma frames, Claude Design boards, Figma Make / v0 / Lovable prototypes, wireframes | The tool where it was made, **indexed by a ledger row** (03 §10a) | Tool-native comments (Claude Design, Make) or an exported contact sheet; I like / I wish / What if | Ledger row exists; DS package attached; 30–60-day expiry set | DS context object enforced per tool (org DS, Make kit, v0 DS, Lovable DS) — "no prototype without the DS package" |
| **2 Validate** | Working prototype (hosted or branch preview) | Hosted preview or sandbox repo; Figma exploration marked "reference" | Vercel / Netlify comments, artifact threads, Loom for sequence; **review-request template** (02 §10a) and **structured critique response** (02 §10b) | **Promotion checklist** (03 §10b) signed by design + eng: evidence, states, a11y floor, on-system, synthetic data | AI critique for coverage only, in the human triage format, severity as proposal (02 §6) |
| **3 Promote** | Handoff package: screens, states, decisions, DS version, evidence, README | Ticket with `PROTO-` id; prototype marked "superseded by PR #" | PR review | PR opened from the real stack; prototype code carried only for repo-connected polish | Planner emits tasks; `model: haiku` executors with hooks attached (04 ladder rungs 3, 10) |
| **4 Build** | Code, Storybook stories, tokens | Repo (code + DTCG tokens); Figma library regenerated from code on release | Storybook per-state stories, storycap sheet, screenshot hook | Format + token-drift gates on every edit; axe + screenshot on Stop | Schema-constrained construction files where >60–70% of screens are on-pattern ([prototype-construction](../prototype-construction/00-architecture-synthesis.md)); validator chain with max-2 repair and escalation (04 §3, §5) |
| **5 Review & ship** | The PR | The PR | Design-review subagent + human crit; unresolved-preview-comment check made required | Design review on PR (hooks recipe 5); comments converted to tracker with screenshot + anchor | Cross-model reviewer in fresh context (04 ladder rung 11); design-task eval set gates rule/skill changes (04 §6) |
| **Archive** | Everything not promoted | Ledger row kept; artifact expired; public links revoked; Figma page banner "reference — see PR #" | — | Expiry sweep | Drift audit monthly if agents generate UI (01 §3) |

Two rules make the table work in practice, and both are cheap:

1. **Everything gets an address.** A Figma pin had a coordinate for free. Outside Figma, a comment needs route + viewport + state (02 §8), a prototype needs a ledger id (03 §2), a construction-file node needs a stable id (prototype-construction 05), and a validator error needs a named location (04 §3). Every failure the four documents catalogue is, at bottom, an artifact without an address.
2. **No artifact is hand-maintained in two places.** If you catch yourself editing the same thing in Figma and in code, one side becomes generated (01 recommendations). The same rule governs prompts: the design system is served from a queryable registry, not pasted into three tools' guideline files (03 §3, 04 §7).

---

## Cross-cutting themes

These appeared independently in at least three of the four documents.

### 1. Gates, not pipes

The pipes are solved. Figma Make, v0, Lovable, Bolt, and Claude Design all open PRs; Vercel and Netlify convert comments to tickets; structured outputs guarantee valid JSON. What none of them ship is the *decision*: whether this prototype should become a ticket, whether this comment thread is resolved, whether this schema-valid output is semantically right. The promotion checklist, the required unresolved-comments check, the validator chain with a bounded repair budget, and the design-review-on-PR hook are the same object at four altitudes. The design leader's job moved from building pipelines to owning gates.

### 2. Pointers beat parsing; one-way beats round-trip

Doc 01 finds the field converging on Code Connect (a mapping, not a sync), story.to.design (code → Figma, regenerate on release), and one-shot code-to-canvas imports for review only. Doc 03 finds the promotion path is "keep the UX, rebuild the engine" — reference crosses the boundary, code mostly does not. The construction-file series reached the same conclusion from the engineering side before this research began ([05 §4](../prototype-construction/05-surgical-editing-iteration.md)): one-way generation with human re-adoption, never bidirectional parsing. Three streams, one invariant: *maintain the mapping; regenerate the copy; never edit the derived side by hand.*

### 3. External verifiers over self-assessment

Doc 04's strongest evidence is that models cannot self-correct without external feedback and that cross-family verification beats self-verification. Doc 02 finds the same shape in AI critique: detection is moderately reliable, severity judgments are not, so AI critique is a coverage tool whose severities are proposals for a human. Doc 01's drift story is the organizational version: teams that audit quarterly while agents generate weekly are trusting the generator to police itself. The pattern is consistent from token to team: **the thing that produced the artifact does not get to grade it.**

### 4. Inventory and version stamps are the missing metadata

No prototyping vendor stamps its output with the design-system version it was built against (03 §3). No platform anchors a comment to a UI *state* (02 §1). Only 5% of teams achieve bidirectional token sync and 60% have no pipeline at all (01 §2). The ledger row, the DS-version field, the construction-file manifest, and the eval set's on-system-rate score are all the team supplying metadata the tools omit. Inventory precedes policy; a team cannot govern, review, or measure what it has not listed.

### 5. Text is the record

Specs and ADRs in Markdown/YAML (01 pattern C), Mermaid flows as contracts in the repo (03 §5), Conventional Comments and the critique template as parseable feedback (02 §3), rules and skills under one screen (04 §4), construction files as diffable trees. Every stream lands on text because text is what git reviews, agents read, and hooks can grep. Canvases remain where humans decide; the record lives beside the code.

### 6. Context volume is a guardrail failure mode

Atlassian's DESIGN.md test (92% more tokens, worse adherence than a queryable MCP), Figma Make's own guidance that "more context isn't always better," Claude Code's "bloated CLAUDE.md" warning, and context-rot research all say the same thing for cheap models: the answer to inconsistency is rarely more instructions. It is a shorter rule, a queryable registry, three gold examples, and a validator.

---

## What this becomes in the repo

The four documents seed three new curated collections in [skill-resources/](../../../skill-resources/README.md), each verified live against the same bar as the existing five:

- **[review-and-feedback.md](../../../skill-resources/review-and-feedback.md)** — feedback surfaces for hosted prototypes and artifacts, annotation-to-agent tools, overview reconstruction (contact sheets, code-to-Figma capture), critique formats, feedback-to-agent loops, plus the review-request and critique-response templates and two hook recipes (contact-sheet-on-PR, unresolved-preview-comments gate).
- **[prototype-governance.md](../../../skill-resources/prototype-governance.md)** — the lifecycle and source-of-truth allocation tables, design-system context objects per tool, handoff paths, Figma↔code sync and drift tooling, process scaffolds, the ledger-row and promotion-checklist templates, and hook recipes (ledger-link gate, flow-diagram contract, expiry sweep).
- **[guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md)** — the guardrail ladder and two starter stacks, structured-output and constrained-decoding picks, verification and repair tooling, routing and escalation, eval harnesses, a `ui-executor` subagent recipe, a bounded validate-and-repair loop, and a minimal design-task eval set.

They extend rather than replace the existing chains: Chain C (design QA & review) gains the human feedback layer and the prototype-review loop; Chain B/D gain the sync and drift tooling; [skillchains §6](../../../skill-resources/skillchains.md) (determinism) gains the small-model ladder.

---

## Gaps and open questions

Consolidated from the four documents; each is a candidate for an original artifact or an experiment.

1. **State-anchored comments.** No review surface anchors a comment to an open menu, an error state, or a mid-animation frame; Figma Make's element screenshot is the closest (02 §1). A route + viewport + state addressing convention, emitted by the contact-sheet hook and consumed by the critique template, is buildable today.
2. **A Figma-against-code linter.** Figma's Check designs lints Figma against Figma; Chromatic diffs code against a baseline. The cross-side check — Figma variables vs. DTCG tokens in CI, `check-design-parity-figma` as a gate — is nascent (01 §3) and is a hook this repo can author.
3. **On-system-rate benchmark.** Still the field's biggest evaluation gap (foundational overview theme 4). The design-task eval set in 04 §6 is the practical starting point; the construction-file E-series is the rigorous one.
4. **Flow-level critique.** UXBench and the heuristic-evaluation studies are single-screen. No public benchmark measures sequence, dead ends, or state coverage (02 §6).
5. **Loops-per-task on design tasks for Haiku-class models.** The 20% correction-rate threshold is a practitioner heuristic, not a measurement (04 §1). The "small-model floor" experiment in prototype-construction 03 would settle it.
6. **DS version stamping.** Until vendors stamp outputs, the ledger is manual. A hook that writes the DS version into the handoff README from the ledger row is the interim.
7. **Where rationale lives.** Carried forward from the foundational research: when the spec is a prompt and the prototype is a PR, the "why" needs an explicit home. ADR-style design decision records (03 §5) are the closest existing pattern; no UX-specific standard exists.
8. **Schema migration for construction files** remains the one first-class component the prototype-construction series flagged and this stream did not close.

Gaps 3 and 5 — the on-system-rate benchmark and loops-per-task measurement — are where the [eval-tuning-loops stream](../eval-tuning-loops/00-synthesis.md) picks up: it turns the ladder's eval set into a grade → review → feed-back loop that improves the generator over time.

---

## Adoption order for a team

Sequenced so each step is useful on its own and produces the input the next step needs. Pairs with the [skillchains rollout order](../../../skill-resources/skillchains.md).

1. **Week 1 — inventory and allocation.** Stand up the ledger (a "Prototype" issue type is enough) and adopt the source-of-truth allocation table from 01. Tag every Figma library file with the code release it mirrors. This is metadata, not tooling, and it unblocks everything else.
2. **Week 2 — the review playbook.** Turn on Vercel or Netlify comments, adopt the review-request and critique-response templates, and make the unresolved-comments PR check required. Add the contact-sheet hook so reviewers see every route and state at once.
3. **Week 3 — the promotion gate.** Put the promotion checklist in the PR template and the ledger-link gate in a hook. Attach the DS context object in each prototyping tool and set expiry defaults.
4. **Month 2 — the guardrail starter stack.** Prune rules to one screen, install hooks recipes 1, 2, and 4, wire a registry MCP, create one `model: haiku` executor with its gates attached, and watch the correction rate. Above ~20%, move that task class up the ladder.
5. **Month 3 — measure.** Build the 20–50 task design eval set, score first-pass validity, on-system rate, axe = 0, and pass^3, and gate rule and skill changes on it. Only now is a cheap-first cascade justified by data rather than hope.

At each step the test is the one the repo already uses: did quality or reliability visibly improve? If a piece isn't earning its cost, remove it.
