# Design-SDLC: Hardening the Design Process for an AI-Native Delivery Loop

## The concept

Once a team adopts AI tooling, its design artifacts scatter. Some screens live in Figma, some as code on a preview deployment, some as hosted apps from Claude Design, Figma Make, v0, or Lovable, some as generated wireframes and Mermaid flows. Code is increasingly "the truth," but it is not where exploration happens, and it is not where non-engineers can see a whole flow at once. Four process questions follow, and no existing handbook answers them together:

1. **Source of truth.** If some prototypes are in Figma and some are not, and code is canonical, how do teams handle the back-and-forth, and which direction is the field leaning?
2. **Feedback.** How do you give structured feedback on flows and prototypes that are not laid out on a canvas where you can see everything?
3. **Governance.** How are teams handling prototypes that are not in the codebase — where they live, how they are indexed, what has to be true before one becomes real work, and how they are retired?
4. **Guardrails.** How do you build guardrails so that low-cost models execute consistent results in one pass instead of looping?

This stream answers each with live-verified research and then composes the answers into one lifecycle model with explicit homes, review surfaces, gates, and guardrails per stage.

## The documents

- **[00 — Synthesis](00-synthesis.md)** — the four verdicts, the composed lifecycle table (stage → artifact → canonical home → review surface → gate → agent guardrail), six cross-cutting themes, consolidated gaps, and a five-step adoption order for a team.
- **[01 — Source of Truth: Figma vs. Code](01-source-of-truth-figma-vs-code.md)** — the "code is the source of truth" movement with survey evidence, per-artifact allocation (tokens, components, screens, copy, motion, flows, specs), sync mechanics and drift, four named process patterns with the teams on record, git-native alternatives, and a verdict on where the field is leaning. Ends with an opinionated allocation table.
- **[02 — Feedback on Code Prototypes & Flows](02-feedback-on-code-prototypes-and-flows.md)** — feedback surfaces for hosted prototypes and AI artifacts (with verified pricing and plan gating), rebuilding the "see all screens" overview, critique formats that work async and in text, feedback-to-tracker and feedback-to-agent pipelines, reviewing static mockups, what AI critique is and isn't good for, and published team practices. Ends with a playbook by artifact type and two templates.
- **[03 — Prototype Governance Outside the Codebase](03-prototype-governance-outside-the-codebase.md)** — lifecycle models, storage and indexing patterns, design-system context objects per tool, promotion criteria and per-tool handoff paths, wireframes and flow diagrams as inputs, risk and hygiene (with the security incidents that make inventory non-optional), and governance at scale. Ends with a lifecycle model, a ledger-row template, and a promotion checklist.
- **[04 — Small-Model Guardrails](04-small-model-guardrails.md)** — a failure taxonomy for why small models loop, output-space constraints, deterministic verification and repair, prompt and context structure, routing and escalation with real cost math, evals that measure one-shot success, design-specific guardrails, and guardrail frameworks. Every recommendation is split into interactive and automated modes. Ends with a 13-rung guardrail ladder and two starter stacks.

## Research brief: what we found

**The field has picked a direction on source of truth, and it is not "Figma-free."** Code is canonical for anything that ships, Figma for anything still being decided, tokens in a DTCG file both sides consume. Half of designers have shipped AI-generated code and 43% of companies expect working prototypes as design output, yet 97% of design-systems teams still use Figma. Leading teams do not round-trip: they run one-way generation with human re-adoption and maintain the *mapping* (Code Connect, MCP, skills, AGENTS.md) rather than an inverse transform — the same conclusion the repo's prototype-construction series reached independently.

**Feedback outside Figma is an addressing problem.** A Figma pin had a coordinate for free; a comment on a code prototype needs route + viewport + state, and the overview has to be rebuilt from contact sheets, Storybook, or a code-to-canvas capture. The surfaces now exist and are mostly free (Vercel comments, Netlify Drawer, Claude Code artifact threads), and since August 2026 they are agent inputs, which makes the critique format — problem and impact, not solution — matter more. AI critique detects issues moderately well and judges severity poorly; use it for coverage in the human triage format.

**The gate is the governance problem, not the pipe.** Every vendor ships prototype→PR in one click and none stamps outputs with the design-system version used, so the team's ledger must. The consensus promotion pattern is "keep the UX, rebuild the engine": the prototype crosses as a reference package, not as code, except for narrow repo-connected polish. Security research on exposed vibe-coded apps makes inventory step zero.

**Small models need a verifier, not a conscience.** Models cannot self-correct without external feedback, and cross-family verification beats self-verification. The biggest single lever is upstream: a strong model writing the small model's prompt and plan, cached and executed cheaply. Constrain selection with enums and schemas but leave reasoning free, bound every loop, and measure consistency as pass^k on a 20–50 task design eval set. Prose context volume is a failure mode for cheap models; shorter rules and a queryable registry beat a comprehensive guideline file.

**What emerges when composed:** two cheap rules that resolve most of the catalogued failures. *Everything gets an address* (a comment, a prototype, a construction-file node, a validator error), and *no artifact is hand-maintained in two places* — if it is, one side becomes generated.

## The templates

Four copy-paste templates ship in these documents and are carried into the curated collections:

- **Review request** and **structured critique response** — [02 §10](02-feedback-on-code-prototypes-and-flows.md)
- **Prototype ledger row** and **promotion checklist** — [03 §10](03-prototype-governance-outside-the-codebase.md)

## What this stream feeds

Three new curated collections in [skill-resources/](../../../skill-resources/README.md): [review-and-feedback.md](../../../skill-resources/review-and-feedback.md), [prototype-governance.md](../../../skill-resources/prototype-governance.md), and [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md). Each was re-verified live against the collection's standard rather than inherited from the research docs' candidate lists.

## Open threads

- A route + viewport + state addressing convention for comments, emitted by the contact-sheet hook and consumed by the critique template — nobody ships state-anchored comments.
- A Figma-against-code token linter as a CI gate; today Figma lints Figma and CI lints code, and the cross-side check is nascent.
- Loops-per-task measurements for Haiku-class models on design tasks; the "small-model floor" experiment in the prototype-construction series is the right test.
- A flow-level critique benchmark (sequence, dead ends, state coverage) — all published critique evaluation is single-screen.
- A UX-specific design decision record, so rationale has a home once the spec is a prompt and the prototype is a PR.
