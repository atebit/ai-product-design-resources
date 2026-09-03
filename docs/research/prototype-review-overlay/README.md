# Prototype Review Overlay: A Drop-In Package for Commenting, Grading, and Provenance

## The concept

Every design tool that generates a prototype — Claude Code, v0, Lovable, Bolt, Figma Make — hands back a page with no memory of itself. A reviewer commenting on it has no reliable way to point at an element that survives the next regeneration; a yes/no grade has nowhere to go that a tuning loop can read; and nothing in the page says which vibe-coding session, model, skill, or design-system version produced it. Four questions follow, asked directly by the repo owner:

1. **Commenting.** Controls for commenting on DOM elements, like Vercel Toolbar, with options for local storage, sending to GitHub as a sibling document, or elsewhere.
2. **Grading.** Yes/no plus comments on what was wrong, feeding back into a tuning system.
3. **Versioning.** Keeping the generation context (session, prompt, model, skill) across vibe-coding sessions so it reaches grading and tuning.
4. **What else** — an expansive survey of adjacent capabilities, scored for an MVP.

This stream answers each with live-verified research, then composes the answers into one package architecture: a single vanilla-JS core that works in a no-build single-file HTML artifact under Claude Code's strict CSP and in a Vite/React/Next dev app, for a small shared team of reviewers.

## The documents

- **[00 — Synthesis](00-synthesis.md)** — the architecture composed from all six documents: the module skeleton, the one JSON record shape that underlies comments, grades, and the page stamp, where each of the owner's four questions landed, six cross-cutting themes, and a four-stage build order from a one-week MVP to backend-requiring later tiers.
- **[01 — DOM Anchoring and In-Page Commenting](01-dom-anchoring-and-in-page-commenting.md)** — how Vercel, Netlify, Lovable, Figma Make, Liveblocks, Velt, and Cord anchor a comment and what breaks when the DOM changes; the open-source click-to-annotate tools built for agents (Agentation, react-grab, Drawbridge, Pointa); the W3C Web Annotation selector model and Hypothesis's fuzzy re-anchoring as the reference algorithm; addressing route, viewport, theme, and UI state; capturing evidence in the browser with no server; and which export format an agent should receive. Ends with a nine-layer anchor record and a re-anchoring order.
- **[02 — Storage, Sync, and Identity](02-storage-sync-and-identity.md)** — what a Claude Code artifact's runtime (`db`, `downloads`, `artifact.publish`) can and cannot do; GitHub as a backend from the browser versus from the agent; hosted lightweight backends (Supabase, Cloudflare Workers, PocketBase) with verified free-tier limits; CRDT sync (Yjs, Automerge, Liveblocks) and when it is overkill; identity without an auth server; and a data model that never conflicts across reviewers. Ends with a five-tier storage decision table and the sidecar-file schema.
- **[03 — Grading Controls and Feedback to Tuning](03-grading-controls-and-feedback-to-tuning.md)** — what ChatGPT, Claude.ai, Gemini, and the AI-builder tools ask after a thumbs-down; the feedback SDKs (Langfuse, LangSmith, Braintrust, Phoenix, Opik) that accept a human score from the browser and why none of them carry a located defect; annotation-tool patterns (Prodigy, Argilla, Label Studio) worth copying for a two-minute review; the human grade record and an eight-category "what was wrong" taxonomy mapped to fix levers; where the grade should go, resolved directly; and the measured biases (acquiescence, order, halo, freshness) a grading control must design against.
- **[04 — Versioning and Generation Provenance](04-versioning-and-generation-provenance.md)** — stamping a page at generation time with a structured JSON block; what Claude Code, Cursor, Codex, and Copilot hooks hand over automatically versus what a generation skill must declare; content-addressed versioning with `crypto.subtle.digest` as the comment and grade key; provenance standards worth borrowing (PROV-O, in-toto, SLSA, the kernel's `Assisted-by:` trailer) and the ones that are overkill (C2PA, AI-BOMs); comparing two generations in the browser; and how review state from one vibe-coding session reaches the next. Ends with a stamp template, working hook scripts, and a sidecar-file layout.
- **[05 — Feature Landscape and the MVP Cut](05-feature-landscape-and-mvp-cut.md)** — an expansive survey of over 50 capabilities across platform dev toolbars (Vercel, Netlify, Storybook), AI-builder preview toolbars (Lovable, Figma Make, Claude Design), session-capture SDKs, design-QA overlays (contrast, on-system rate, CVD simulation, pseudo-locale), state and scenario controls, and review-session tooling — scored on reviewer value, agent value, and build cost, then cut into an MVP, a v1, a later tier, and a skip list.
- **[06 — Packaging, Injection, and Isolation](06-packaging-injection-and-isolation.md)** — how Vercel Toolbar, Netlify Drawer, Sentry, and Storybook inject their overlays; build outputs that serve both a `<script src>` host and an `import` host from one source; Shadow DOM isolation with measured pitfalls (inheritance, `composedPath`, stacking contexts); excluding the overlay from the very screenshots, axe scans, and replay tools it coexists with; gating so the overlay never reaches production; and framework adapters that stay thin. Ends with a packaging decision table, a reference module skeleton, and working loader/hook templates.

## Research brief: what we found

**Every vendor solved one-third of the problem, and nobody combined the three.** Vercel Toolbar solved comment placement with a CSS-path anchor and a CLI an agent can script; Sentry solved evidence capture with a loader-stub pattern; Langfuse and LangSmith solved keyless browser scoring. None of them anchors a comment to a *state*, none carries a defect's *location* in its score schema, and none stamps a page with what *generated* it. The overlay's job is the composition, not any one piece.

**The single-file host is the design constraint that clarifies everything.** A Claude Code artifact allows scripts from four CDN hosts, blocks every outbound request except to its own origin and Google Fonts, and caps the page at 16 MiB. Every choice that survives that host — a vanilla zero-dependency IIFE in an open Shadow DOM, a content-hashed version key computed with `crypto.subtle.digest`, a sidecar export instead of a direct GitHub write — also turns out to be the right choice for the Vite host. Building for the harder constraint first, not building two overlays, is the throughline across all six documents.

**Cooperation from the generator beats cleverness in the overlay.** A `data-testid`, a `data-src` stamp, and openable state kept in the URL do more for a comment's survival across regeneration than any fuzzy-matching algorithm — the same lesson Hypothesis learned for text annotation over a decade of production use, and the same lesson the repo's own prototype-construction stream reached independently for markup generation.

**Grading converges on binary-plus-taxonomy, and the destination question has one clean answer.** Every mainstream product (ChatGPT, Claude.ai, Gemini) stops at a five-item category list after a thumbs-down; none anchors the complaint to a *part* of the output, which for a UI is the whole point. No eval platform accepts a keyless browser write, fits a small shared team's free tier, and carries a located defect at the same time — the repo's own `evals/grades/` sidecar does all three for nothing, which resolves the one question this stream's research was explicitly asked to settle.

**Provenance has to be a stamp, because nothing else exists to query.** Claude Code, Cursor, Codex, and Copilot hooks all hand over a session id and a working directory; three of the four hand over a turn id; none hands over a skill version. The generation skill has to declare its own identity into the same JSON block that a `PostToolUse` hook uses to compute the page's content-hash key — the stamp is simultaneously the provenance record and the version key that makes a comment survive an unchanged regeneration and orphan on a changed one.

**What emerges when composed:** one record, not three. A comment, a human grade, and the page's own provenance stamp share a `generator`/`wasGeneratedBy` block and a content-hash version key, so a reviewer's yes/no, their anchored complaint, and the session that produced the page all join without a mapping layer — the same "everything gets an address" principle the design-sdlc stream named as the resolving idea for feedback outside Figma, applied one layer lower, to the DOM itself.

## The templates

Four authored templates ship across these documents and are carried into the curated collection:

- **Layered comment record** (Web-Annotation-compatible JSON) and its markdown rendering — [01 §10](01-dom-anchoring-and-in-page-commenting.md)
- **Sibling review document** (`page.review.json`/`.md`) and the per-reviewer JSONL layout — [02 §10](02-storage-sync-and-identity.md)
- **Human grade record** and the eight-category "what was wrong" taxonomy — [03 Templates](03-grading-controls-and-feedback-to-tuning.md)
- **Provenance stamp block**, the Claude Code hooks that write it, and the per-prototype sidecar layout — [04 §10](04-versioning-and-generation-provenance.md)

## What this stream feeds

One new curated collection is proposed in [skill-resources/](../../../skill-resources/README.md): `prototype-review-overlay.md`, to be re-verified live against the collection's standard rather than inherited from the research docs' "fetched OK." It sits beside [review-and-feedback.md](../../../skill-resources/review-and-feedback.md) (the hosted comment surfaces this overlay complements), [eval-loops.md](../../../skill-resources/eval-loops.md) (whose grade record this stream's human grade is a subset of), and [prototype-governance.md](../../../skill-resources/prototype-governance.md) (whose ledger row gains the `current_version` and `review_sidecar` columns doc 04 proposes).

## Open threads

- No re-anchoring order has been tested against an actual prototype regeneration — the nine-layer chain in doc 01 is a synthesis of Hypothesis's text-anchoring precedent, not a measurement.
- Whether reviewers use an unprompted compare-with-previous control is untested; "rank, don't score" depends on the UI actually surfacing the comparison.
- Whether a generation skill reliably implements a state-hook convention (`data-proto-state`) is unmeasured; the construction-file stream's schema-first approach is the strongest existing lever to test it against.
- Several claims in docs 05 and 06 are marked "not verified in this pass" because of a mid-stream token-budget cut (session-capture SDK details, tsup and jsDelivr `/+esm` specifics) — re-verify these specifically before citing them as curated picks.
