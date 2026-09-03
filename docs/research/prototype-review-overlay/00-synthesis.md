# Prototype Review Overlay Synthesis — One Package, Two Hosts, Three Jobs

**Purpose:** The [design-sdlc](../design-sdlc/00-synthesis.md) and [eval-tuning-loops](../eval-tuning-loops/00-synthesis.md) streams established *what* a good feedback and grading loop looks like — comments as agent input, rank-don't-score grading, textual feedback as the loop's currency, a ledger row as the shared address. Neither designed the thing a designer actually touches: a script dropped into every generated prototype that lets a small team comment on elements, grade them, and carry the generation's identity forward — working equally in a single-file Claude Code artifact under a strict CSP and in a Vite/React/Next dev app. This stream is that design. Six documents cover DOM anchoring, storage, grading, provenance, the wider feature landscape, and packaging; this synthesis composes them into one architecture, one data model, and one build order.

| Doc | Question | One-line verdict |
|---|---|---|
| [01 — DOM Anchoring and In-Page Commenting](01-dom-anchoring-and-in-page-commenting.md) | How does a comment survive regeneration? | **Layer the anchor and validate cross-layer.** Every shipping tool (Vercel, Lovable, Figma Make) picked one anchor and lives with its failure mode; Hypothesis solved this for text a decade ago with a nine-layer fallback chain validated by fingerprint or quote match. Ask the generator for `data-testid` and a source stamp — cooperation beats cleverness. |
| [02 — Storage, Sync, and Identity](02-storage-sync-and-identity.md) | Where do comments and grades live, and who is the reviewer? | **The agent is the best GitHub writer; the browser should not be.** Default: the overlay exports a JSONL/JSON sidecar (download, clipboard, or the Claude artifact `db`), the agent commits it beside the prototype. A five-tier decision table scales up to Supabase or Yjs only when live co-review is actually needed. |
| [03 — Grading Controls and Feedback to Tuning](03-grading-controls-and-feedback-to-tuning.md) | What does the grade control look like, and where does the grade go? | **Binary verdict, eight-category taxonomy, one sentence on reject — write it to `evals/grades/`.** No eval platform accepts a keyless browser write *and* fits a small team's free tier *and* carries a defect's location; the repo's own grade record does all three for free. |
| [04 — Versioning and Generation Provenance](04-versioning-and-generation-provenance.md) | How does the overlay know which generation it is looking at? | **Stamp every page with a content-hashed, ignore-unknown-keys JSON block; hash the bytes, not the DOM.** Claude Code hooks, Cursor, Codex, and Copilot all hand a session id and a working directory to something; none hands over a skill version — the generation skill has to declare it, mechanically, into the same stamp. |
| [05 — Feature Landscape and the MVP Cut](05-feature-landscape-and-mvp-cut.md) | What else belongs in the package, and what ships first? | **Numbers beat pixels for the agent.** Of 50 surveyed capabilities, the ones worth building first all attach a location, a number, or an address to a comment; screenshots and replay rank lower than intuition suggests because a VLM finds well under half of fine visual changes anyway. |
| [06 — Packaging, Injection, and Isolation](06-packaging-injection-and-isolation.md) | How does one package reach both hosts without becoming part of what it reviews? | **One vanilla, zero-dependency IIFE in an open Shadow DOM, gated twice.** Build-time exclusion for apps, runtime refusal for files with no build step; every shipping dev overlay (Vite, Next, Hypothesis) converges on the same custom-element-plus-shadow-root skeleton. |

*Research conducted 2 September 2026 via six parallel research agents under a tightened token budget; sources are marked "fetched OK," "search-verified only," or "not verified" throughout, and several sections were cut short by a mid-run budget reduction — read each document's closing note before treating an unflagged claim as fully verified.*

---

## The architecture, composed

Read this as the shape of the package doc 06 recommends, filled in by the other five documents.

```
pr-overlay (one vanilla-TS core, two build outputs: IIFE + ESM)
├── core/boot.ts     — queue-stub global, shouldMount() gate, idempotent mount guard         (06 §5, §9)
├── core/host.ts     — <pr-overlay> custom element, open Shadow DOM, adoptedStyleSheets      (06 §3)
├── core/hit.ts      — capture-phase picker, elementFromPoint/composedPath, own-subtree skip  (06 §3)
├── core/anchor.ts   — layered anchor: data-src → data-testid → role+name → quote → css →     (01 §9)
│                       xpath → bbox → fingerprint → state → screenshot; re-anchor in that order
├── core/state.ts    — freeze (pause animations), snapshot ancestor chain, route+viewport+theme (01 §4)
├── core/grade.ts     — binary verdict + 8-category taxonomy + rationale-on-reject control     (03 §4, Recs)
├── core/provenance.ts — reads the generation stamp, computes content_sha256 with stamp masked (04 §1, §3)
├── core/exclude.ts  — excludeSelectors() for axe/Playwright/html2canvas/rrweb, navigator.webdriver self-hide (06 §4)
├── core/a11y.ts     — inert management, APG dialog focus, reduced-motion/forced-colors        (06 §7)
├── core/store.ts    — per-host persistence: window.claude.db | localStorage+download | dev-endpoint (02 §9)
├── adapters/vite.ts, adapters/next.tsx, adapters/react.ts, adapters/storybook/                (06 §6, §9)
└── tools/inject.mjs — appends the IIFE before </body>; called by a generation skill/hook      (06 §10, 04 §10)
```

Three cross-doc facts hold this together:

1. **The picker is the one shared root object.** Doc 01's layered anchor, doc 03's defect location, and doc 05's "numbers beat pixels" all start from "which element, and what do I know about it" — one `core/anchor.ts`, reused by comments, grades, and the on-system-rate inspector doc 05 ranks as the single highest-agent-value feature in the whole 50-item survey.
2. **The stamp is the join key across all three jobs.** A comment's `route`+`content_sha256` (doc 01 §4, doc 04 §3), a grade's `artifact.content_sha256` (doc 03 Templates), and the ledger's `current_version` column (doc 04 §7) are the same value, computed the same way, by the same masking rule.
3. **The host decides the tier, never the feature set.** A Claude Code artifact has `db`, `downloads`, and `artifact.publish` and nothing else (doc 02 §1); a Vite app can reach a dev-server endpoint or a hosted backend (doc 02 §3–§5). The overlay's core is identical; only `core/store.ts` branches.

---

## The record, composed

One JSON shape underlies all three of the owner's original asks — comment, grade, provenance — because doc 04's stamp, doc 03's human grade record, and doc 01's comment record all reuse the same `generator`/`wasGeneratedBy` block and the same content-hash key. Composed:

| Field group | Comment (doc 01 §10) | Human grade (doc 03 Templates) | Page stamp (doc 04 §10) |
|---|---|---|---|
| Version key | `ext:artifactVersion` | `artifact.version`, `artifact.commit` | `subject.digest.sha256`, `git.blob` |
| Anchor | `target.selector[]` (layered) | `defects[].anchor` (selector, bbox, state) | — (the stamp *is* the anchor target) |
| Generation identity | — (inherits page stamp) | `generator` block (skill, model, prompt_sha) | `wasGeneratedBy`, `used` (session, prompt, tool-call, skill@version, rules_sha, catalog_version) |
| Human | `creator`, `ext:status` | `rater` (id, blind, seconds), `verdict`, `checklist`, `rationale` | — |
| Evidence | `ext:evidence.screenshot` | `artifact.screenshot` | — |
| Lineage | — | `pairwise.opponent` | `wasRevisionOf` (previous hash) |

A comment and a grade are both annotations *on* a stamped page; neither needs to re-declare what the page already says about itself. This is why doc 02's sidecar layout nests all three under one `docs/prototypes/review/<PROTO-id>/` directory (doc 04 §7, doc 02 §10) rather than three separate stores.

---

## Where the owner's three asks landed

**1. Commenting, with local / GitHub / other storage.** Doc 01 supplies the anchor; doc 02 supplies the decision the owner was undecided on. The verdict is not "pick one of local, GitHub, or other" — it is a five-tier ladder where Tier 2 ("browser writes a file, the agent commits it") is the default for both hosts, Tier 1 (the Claude artifact's own `db`) is the artifact-only upgrade, and Tiers 3–5 (browser-writes-to-GitHub, a hosted backend, CRDT sync) are opt-in additions for teams that outgrow async review. No tier requires a secret in the page.

**2. Grading, yes/no plus what was wrong, feeding a tuning system.** Doc 03 answers both halves. The control is a binary verdict (accept/reject/unsure/skip) over a checklist, never a slider, ordered to counter four measured biases (acquiescence, order, halo-from-polish, freshness). The taxonomy is eight fixed categories plus `other`, each mapped to a specific fix lever from the eval-tuning-loops stream's altitude ladder. The destination the owner left open is answered directly: write to the repo's own `evals/grades/` — no eval platform accepts a keyless browser write, fits a small team's free tier, and carries a located defect at the same time.

**3. Versioning so vibe-coding sessions keep context.** Doc 04 is the fullest answer: a content-hashed stamp (in-toto Statement shape, PROV-O relation names, OTel GenAI attribute names) written by a `PostToolUse` hook in Claude Code or a `transformIndexHtml` plugin in Vite, injected at `SessionStart` as a ≤10,000-character digest so the *next* session knows what was reviewed and what is still open — because Claude Code, like Cursor, Codex, and Copilot, hands a session id and a tool-call id to hooks automatically but never a skill version, so the generation skill has to declare that part of its own identity.

**4. What else — the expansive answer.** Doc 05 surveyed over 50 adjacent capabilities across platform toolbars, AI-builder previews, session-capture SDKs, design-QA overlays, state controls, and review-session tooling, scored each on reviewer value, agent value, and build cost, and cut an MVP: the three pillars above, plus an element picker with a stable selector, state-snapshot-in-URL, a provenance banner, a console/error ring buffer, keyboard-only mode, and blind-first grading with a session timer — everything else (on-system-rate inspector, contrast, axe, pseudo-locale, CVD simulation) is a fast-following v1, and anything needing a backend or a second delivery vehicle (session replay, pixel diff, AI critique invocation) is explicitly deferred.

---

## Cross-cutting themes across all six documents

1. **Every vendor solved one-third of the problem.** Vercel solved comment placement; Sentry solved evidence capture; Langfuse solved the score schema; nobody combined an anchor, a grade, and a generation identity into one record. That gap is this stream's actual contribution.
2. **Cooperation from the generator is cheaper than cleverness in the overlay.** A `data-testid`, a source stamp, and state-in-the-URL, all things a generation skill can be instructed to emit, do more for anchor survival than any fuzzy re-matching algorithm — the same conclusion Hypothesis reached for text and the construction-file stream reached for markup.
3. **The single-file host is the design constraint that clarifies everything.** No network beyond same-origin, four CDN hosts, no server-side identity, a 16 MiB cap. Every recommendation that survives that host — Shadow DOM isolation, content-hash keys, sidecar export, IIFE delivery — also happens to be the right choice for the Vite host; the reverse is not true.
4. **Numbers are for the agent; pixels are for the human, and neither substitutes for the other.** Doc 05's ranking and doc 01's evidence-capture findings agree: a computed style, a bounding rect, and a token match are what a VLM cannot recover from a screenshot, but a screenshot crop is still the anchor that never orphans.
5. **Regeneration and versioning are the same problem wearing different names.** Doc 01's re-anchoring order and doc 04's content-hash-keyed version comparison are two views of one mechanism — carry forward what matches, file the rest as an orphan against the old key, never drop silently.
6. **Provenance is a stamp, not a database lookup.** Nothing the overlay needs — model, skill version, prompt identity, session — exists anywhere the page can query at review time; it has to be written into the page when the page is written, or it is gone.

---

## Build order

Sequenced so each step produces something reviewable before the next one starts, following doc 05's MVP/v1/later cut and doc 06's packaging recommendation.

1. **Week 1 — the core and the MVP pillars.** `core/boot.ts`, `core/host.ts` (open Shadow DOM, custom element), `core/hit.ts` (picker), `core/anchor.ts` (selector + testid + role, not yet the full nine-layer chain), a minimal comment record, a minimal grade control (binary + taxonomy, no compare-with-previous yet), the provenance banner reading a stamp the generation skill is told to write by hand. Ship as one IIFE, inlined into artifacts by a Claude Code skill, loaded via `<script src>` in Vite through a dev-only plugin. This is doc 05's MVP row set plus the three pillars.
2. **Week 2–4 — provenance automation and the sidecar.** The `PostToolUse` hook that stamps HTML automatically (doc 04 §10), the sidecar directory layout (`docs/prototypes/review/<id>/`), the `SessionStart` digest injection, and the `evals/grades/` write path wired to the repo's existing grade-record schema ([eval-loops.md](../../../skill-resources/eval-loops.md)).
3. **Month 2 — v1 features that need the numbers.** The on-system-rate inspector, contrast on the picked element, axe-core lazy-loaded from cdnjs, the layered re-anchoring chain in full, state-in-URL plus the generator's state-hook convention, the React adapter enriching addresses with component name and source path.
4. **Later, only if the team outgrows async review.** Live co-review via Supabase or a Cloudflare Worker (doc 02 Tier 4), DOM-to-image screenshot diffing against the last grade, session replay, an extension build for reviewing third-party previews the team does not control.

---

## What this becomes in the repo

One new curated collection is proposed: `skill-resources/prototype-review-overlay.md`, holding the building-block libraries (`@medv/finder`, snapdom, pixelmatch, axe-core), the standards worth borrowing (W3C Web Annotation, in-toto Statement, PROV-O relation names, OTel GenAI attributes), the storage and identity picks by tier, and the four authored templates (comment record, human grade record, provenance stamp, sidecar layout) — re-verified live rather than trusted from the research docs' "fetched OK," matching the repo's standard curation bar. It joins [review-and-feedback.md](../../../skill-resources/review-and-feedback.md) (which owns the hosted comment *surfaces* this overlay complements, not replaces), [eval-loops.md](../../../skill-resources/eval-loops.md) (whose grade record this stream's human grade is a subset of), and [prototype-governance.md](../../../skill-resources/prototype-governance.md) (whose ledger row gains the `current_version` and `review_sidecar` columns doc 04 proposes).

---

## Gaps and open questions

Carried forward from the six documents, the ones with the widest blast radius if wrong:

1. **No re-anchoring validator was tested against a real regeneration.** Doc 01's nine-layer order is a synthesis of Hypothesis's text-anchoring precedent, not a measurement on generated UI; the first thing to build after the MVP is a test harness that regenerates a prototype and counts what survives.
2. **Whether reviewers will actually use compare-with-previous unprompted is untested** (doc 03 §1) — the pairwise control that "rank, don't score" depends on is a UI bet, not a finding.
3. **The state-hook convention (`data-proto-state`) depends entirely on generator cooperation** (doc 05 §5) — nobody has measured whether a generation skill reliably implements it, and the construction-file stream's schema-first approach is the strongest existing lever to test it against.
4. **Doc 05's capability scores are the author's judgement, explicitly flagged as needing re-scoring** after a month of real panel-open telemetry — treat the MVP cut as a hypothesis to instrument, not a settled backlog.
5. **Several load-bearing library and platform claims across all six docs were marked "not verified in this pass"** because of the mid-stream budget cut (notably in doc 05's session-capture and design-QA sections, and doc 06's tsup/jsDelivr `/+esm` details) — re-verify these specifically before the curated collection cites them as picks, not just the ones already caught by search-verified flags.
