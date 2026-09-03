# Prototype Review Overlay — Building Blocks for a Drop-In Comment, Grade, and Provenance Package

A generated prototype has no memory of itself: a comment on it has no reliable way to survive the next regeneration, a yes/no grade has nowhere a tuning loop can read it, and nothing in the page says which vibe-coding session, model, or design-system version produced it. This file curates the building blocks for a package that fixes all three — one vanilla-JS core that works inside a no-build single-file HTML artifact under Claude Code's strict CSP *and* inside a Vite/React/Next dev app, for a small shared team of reviewers. It is a **components list and architecture reference**, not a shipped package: nobody has built this exact overlay, so every pick here is a dependency, a standard to borrow, or a pattern to copy — not a finished product to install.

Six findings from the research shape every pick. **Every vendor solved one-third of the problem.** Vercel Toolbar solved comment placement, Sentry solved evidence capture, Langfuse solved keyless browser scoring — nobody combined an anchor, a grade, and a generation identity into one record, which is this overlay's actual job. **The single-file host is the design constraint that clarifies everything:** an artifact allows scripts from four CDN hosts, blocks every outbound request except to its own origin, and caps the page at 16 MiB — a vanilla zero-dependency IIFE in an open Shadow DOM survives that host and happens to be the right choice for the Vite host too. **Cooperation from the generator beats cleverness in the overlay** — a `data-testid` and a source stamp do more for anchor survival than fuzzy re-matching. **Binary verdict, eight-category taxonomy, one sentence on reject, write it to the repo** — no eval platform accepts a keyless browser write, fits a small team's free tier, and carries a located defect at the same time, so the repo's own `evals/grades/` sidecar is the destination, not a vendor. **Provenance is a stamp, not a lookup** — Claude Code, Cursor, Codex, and Copilot hooks hand over a session id and a tool-call id automatically, but none hands over a skill version, so the generation skill must declare it into the same JSON block used as the content-hash version key. **Numbers beat pixels for the agent** — a computed style, a bounding rect, and a token match are what a VLM cannot recover from a screenshot.

It sits beside [review-and-feedback.md](review-and-feedback.md) (the hosted comment *surfaces* — Vercel, Netlify, Claude Code artifact threads — this overlay complements rather than replaces), [eval-loops.md](eval-loops.md) (whose grade record this overlay's human grade is a subset of), and [prototype-governance.md](prototype-governance.md) (whose ledger row gains the `current_version` and `review_sidecar` columns this stream proposes). Grounding research: [docs/research/prototype-review-overlay/](../docs/research/prototype-review-overlay/00-synthesis.md). Curated 2 September 2026; core building-block claims (license, stars, mechanism) were re-verified live against the current page at curation time — the research documents' own "search-verified only" and "not verified" flags are preserved below where a fact was not re-checked.

---

## The architecture at a glance

```
pr-overlay (one vanilla-TS core → IIFE for <script src>, ESM for import)
├── boot     — queue-stub global, dev/preview gate, idempotent mount guard
├── host     — <pr-overlay> custom element, open Shadow DOM, adoptedStyleSheets
├── hit      — capture-phase picker, elementFromPoint / composedPath, skips its own subtree
├── anchor   — layered selector: data-src → data-testid → role+name → text quote → css → xpath → bbox → fingerprint
├── state    — freeze animations, snapshot ancestor chain, route + viewport + theme
├── grade    — binary verdict + 8-category taxonomy + mandatory rationale on reject
├── provenance — reads/writes the generation stamp; computes the stamp-masked content hash (the version key)
├── exclude  — excludeSelectors() for axe / Playwright / html2canvas / rrweb; navigator.webdriver self-hide
├── store    — per-host persistence: Claude artifact db → sidecar file (agent-committed) → hosted backend
└── adapters — vite.ts, next.tsx, react.ts (component name + source path when a fiber is present), storybook/
```

One JSON record underlies comments, grades, and the page stamp: all three share a `generator`/`wasGeneratedBy` block and a content-hash version key, so a reviewer's verdict, their anchored complaint, and the session that produced the page join without a mapping layer. See the four templates below.

---

## The picks

### Anchoring, selectors, and evidence capture

#### 1. Web Annotation Data Model (W3C Recommendation)

[w3.org/TR/annotation-model](https://www.w3.org/TR/annotation-model/) · W3C Recommendation, 2017 · re-verified live

**What it is.** The standard vocabulary for a layered anchor: `CssSelector`, `XPathSelector`, `TextQuoteSelector` (`exact` plus `prefix`/`suffix`), `TextPositionSelector`, `FragmentSelector`, `SvgSelector`, `RangeSelector`, and `DataPositionSelector` — nine selector types in total, confirmed live. A selector "MAY be `refinedBy` 1 or more other Selectors," and when more than one is given "they are considered to be alternatives that will result in the same selection" — exactly the multi-selector-with-fallbacks shape a regeneration-resilient anchor needs.

**Where it fits.** The envelope for the comment record's `target.selector[]` array (see Templates). It is verbose and nobody writes it by hand, but it is the only format with a standard slot for both a selector chain and a `state`, and it is what Hypothesis, Apache Annotator, and the `dom-anchor-*` packages already read and write.

#### 2. Hypothesis client — fuzzy anchoring reference implementation

[github.com/hypothesis/client](https://github.com/hypothesis/client) · Apache-2.0 · `src/annotator/anchoring/html.ts`

**What it is.** The production reference for re-anchoring a selector after the underlying document changes. It stores three selectors per annotation (a range, a text position, a text quote with 32-character prefix/suffix) and re-anchors in passes — range, then position, then context-first fuzzy matching on the quote, then quote-only fuzzy matching — validating the cheap structural anchors against the quote before trusting them. Annotations that fail every pass become **orphans**, shown in a dedicated tab rather than silently dropped.

**Where it fits.** The re-anchoring *order* to copy directly: try cheap and structural first, validate against something semantic (a quote, a fingerprint, a role+name match), and file unmatched comments as visible orphans rather than losing them.

#### 3. @medv/finder

[github.com/antonmedv/finder](https://github.com/antonmedv/finder) · MIT · 1.5k★ · re-verified live

**What it is.** A unique CSS selector generator, 1.5 KB minified and gzipped, with a `root` option to bound generation to a container, `seedMinLength`/`optimizedMinLength` tuning, and predicate filters on id/class/tag/attribute — the filter is what lets the overlay reject hashed Tailwind/CSS-module class names and prefer `data-testid`, `id`, and semantic classes.

**Where it fits.** The `core/anchor.ts` CSS-selector layer. Small enough to inline directly into the IIFE; the `root` parameter is what keeps generated selectors scoped to the app container instead of `<body>`.

#### 4. snapdom

[github.com/zumerlab/snapdom](https://github.com/zumerlab/snapdom) · MIT · 8.1k★ · re-verified live

**What it is.** A dependency-free DOM-to-image engine positioned as the modern replacement for html2canvas — exports SVG/PNG/JPG/WebP/canvas/blob, supports Shadow DOM, pseudo-elements, and font embedding, and reports 10–100× faster capture than html2canvas in its own benchmarks. Exclusion is declarative (`data-capture="exclude"` skips a node and its children).

**Where it fits.** The screenshot-crop evidence layer (comment record's `ext:evidence.screenshot`, grade record's `artifact.screenshot`). Every image in a Claude Code artifact is already a data URI, so the cross-origin failure mode that limits html2canvas-family libraries in general use does not apply inside the artifact host — load it from jsDelivr's `/npm/` path (cdnjs and unpkg are not both viable; check the current artifact CDN allowlist before pinning a host).

#### 5. pixelmatch

[github.com/mapbox/pixelmatch](https://github.com/mapbox/pixelmatch) · ISC · re-verified live (6.9k★, no dependencies)

**What it is.** A small, dependency-free pixel-level image comparison library with anti-aliased-pixel detection and a perceptual (not literal RGB) difference metric; it runs in Node or the browser on raw image data and returns a mismatched-pixel count.

**Where it fits.** In-browser version comparison — diffing two generations of the same prototype (v1+ feature; doc 06's "later" tier) or diffing a new grade's screenshot against the one stored with the last grade. Already a repo pick in [eval-loops.md](eval-loops.md) for CI visual regression; this is the same library used client-side.

#### 6. code-inspector-plugin

[github.com/zh-lx/code-inspector](https://github.com/zh-lx/code-inspector) · MIT · 3.0k★

**What it is.** A build-time source-location stamper across webpack, Vite, Rspack/Rsbuild, Farm, esbuild, Turbopack, and Mako, for React/Next, Vue, Preact, Solid, Qwik, Svelte, and Astro. It injects a `data-insp-path="{file}:{line}:{column}"` attribute per element and a `hideDomPathAttr` option keeps it out of DevTools inspection.

**Where it fits.** The compile-time replacement for React's fiber-based source location, which React 19 removed (`_debugSource` deleted in PR #28265 — react-dev-inspector, locatorjs, and click-to-component all broke as a result). This is the durable anchor layer for the Vite/Next host; artifacts get the equivalent by having the generation skill write `data-src` directly since there is no build step to inject it.

#### 7. Agentation (format reference, not a dependency)

[github.com/benjitaylor/agentation](https://github.com/benjitaylor/agentation) · PolyForm Shield 1.0.0 · 4.6k★

**What it is.** A React-only click-to-annotate tool for localhost that emits markdown with a CSS selector, classes, position, text content, and a note — already a curated pick in [review-and-feedback.md](review-and-feedback.md). Its "pause all animations to capture a state" idea is the state-freezing technique to copy (`document.getAnimations().forEach(a => a.pause())` plus patching `requestAnimationFrame` and pausing media, per the Web Animations API — this is the general technique, not confirmed against Agentation's own source).

**Where it fits.** Borrow the markdown export shape and the animation-pause idea; do not depend on the code — it requires React 18+ and is not licensed for redistribution inside another package.

---

### Storage, sync, and identity

#### 8. GitHub REST Contents API + Trees API

[docs.github.com/en/rest/repos/contents](https://docs.github.com/en/rest/repos/contents) · official

**What it is.** CORS-open endpoints (`PUT /repos/{owner}/{repo}/contents/{path}` for a single file; the Trees API for a multi-file commit) that let a browser with a token commit directly to a repository. The Contents API caps a request at "1 MB or smaller" for full functionality and requires the file's current `sha` on update, so concurrent writers 409.

**Where it fits.** The mechanics reference for *why* the overlay should not write to GitHub from the browser in the single-file host (the artifact CSP blocks `api.github.com` outright) and should route through the agent instead in the Vite host, where the CSP does not apply but a browser-held token still would.

#### 9. GitHub MCP server

[github.com/github/github-mcp-server](https://github.com/github/github-mcp-server) · official

**What it is.** The agent-side write path — `create_or_update_file`, `push_files`, `issue_write`, `discussion_comment_write`, `pull_request_review_write` — that lets Claude Code commit the overlay's exported sidecar without any credential ever touching the reviewed page.

**Where it fits.** The default write path in the recommended Tier 2 storage model: the overlay exports a JSON/JSONL file (download, clipboard, or the Claude artifact's own `downloads` capability), and the agent — already authenticated — commits it beside the prototype on its next turn. Already curated in [mcp-servers.md](mcp-servers.md); this is the same server used as the review-data write path.

#### 10. Supabase (Realtime + Row Level Security)

[supabase.com/pricing](https://supabase.com/pricing) · re-verified live

**What it is.** The default hosted backend for a team that outgrows async review: free tier confirmed at 500 MB database, 1 GB file storage, 50,000 monthly active users, 200 peak Realtime connections, a limit of 2 active projects, and **free projects pause after 1 week of inactivity** (all re-verified live at curation time, current as of the check). Row Level Security is mandatory on any exposed table — an anon key with no RLS is "readable and writable by any role with a grant on it."

**Where it fits.** Tier 4 in the storage decision table: live co-review across a Vite/Next team, gated behind whatever preview-auth mechanism already exists, with the agent exporting to the Tier 2 sidecar nightly so the vendor is never the sole system of record.

#### 11. Cloudflare Workers + D1

[developers.cloudflare.com/workers/platform/pricing](https://developers.cloudflare.com/workers/platform/pricing/) · official

**What it is.** A one-file backend on the same host that can double as an OAuth token-exchange proxy: Workers free tier at 100,000 requests/day, D1 at 100,000 rows written/day and 5 GB total storage — ample for a comment-and-grade store at team scale.

**Where it fits.** The "one file, no separate vendor" option for a team already on Cloudflare, and the natural host for a GitHub OAuth exchange Worker (the `sveltia-cms-auth` pattern below) if reviewers must commit from the browser without an agent in the loop.

#### 12. sveltia-cms-auth

[github.com/sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) · MIT

**What it is.** A minimal, single-file Cloudflare Workers script that performs the GitHub OAuth code-for-token exchange server-side, so a browser never needs the client secret — the standard workaround for "GitHub requires a server for authentication" (Decap CMS's own docs state the same constraint).

**Where it fits.** The reference implementation if a team decides browser-committed GitHub writes (Tier 3) are worth the infrastructure; use a dedicated, low-privilege repository, never a personal access token pasted into a prototype's own page.

---

### Grading and feedback to tuning

#### 13. Langfuse browser SDK (`@langfuse/browser`)

[langfuse.com/docs/observability/features/user-feedback](https://langfuse.com/docs/observability/features/user-feedback) · official

**What it is.** One of only two eval platforms verified to accept a human score directly from client-side JavaScript with no secret key — `langfuse.score({ traceId, name, value, dataType, comment })`, safe because it uses a public key only. Free tier: roughly 50k units, **two users**, 30-day retention.

**Where it fits.** An optional secondary sink for a team already tracing generation through Langfuse — never the primary destination, because its schema has no field for a *located* defect (selector, bbox, state), which is the whole point of a UI grade.

#### 14. Prodigy keymap (pattern, not a dependency)

[prodi.gy/docs/api-web-app](https://prodi.gy/docs/api-web-app) · commercial (pattern is free to copy)

**What it is.** The single-keystroke annotation convention professional labeling tools converge on: `a` accept, `x` reject, `space` ignore, `backspace` undo, with three states (not two) so "cannot judge" is distinct from "reject."

**Where it fits.** The overlay's grading control keymap directly: `a`/`x`/`u` (unsure)/`s` (skip), number keys toggle checklist items, verdict enabled only once every checklist item is answered. Argilla's pending/draft/discarded/submitted states and Label Studio's `lead_time`/`was_cancelled` fields are the same family of convention, cited in the grading doc for the same reason.

#### 15. axe-core

[github.com/dequelabs/axe-core](https://github.com/dequelabs/axe-core) · MPL-2.0 · already a repo pick

**What it is.** The zero-false-positive accessibility rules engine, already curated in [guardrails-and-evals.md](guardrails-and-evals.md) for CI. The in-page variant loads from cdnjs (on the artifact allowlist) and renders violations as pins directly on the picked element; its `context.exclude` option (not an attribute — there is no `data-axe-ignore`) is how the overlay keeps itself out of its own audit.

**Where it fits.** A v1 feature (doc 05's ranking places it among the highest reviewer-and-agent-value items): axe violations become grade defects in the `a11y` taxonomy category with an anchor already attached.

---

### Provenance and versioning

#### 16. Claude Code hooks reference

[code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) · official · re-verified live

**What it is.** The documented hook input fields: every hook receives `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `agent_id`/`agent_type` (in subagents); `prompt_id` (v2.1.196+) is present on every hook *after* the first user input but absent on `SessionStart`; `PostToolUse` additionally carries `tool_name`, `tool_input.file_path` (always absolute), and `tool_use_id`. `SessionStart`'s `hookSpecificOutput.additionalContext` is injected before the first prompt and is the mechanism for carrying review state into a new session.

**Where it fits.** The automatic half of the provenance stamp's `generator` block, and the injection point for the cross-session review digest. A `PostToolUse` hook matching `Write|Edit` on `.html` files is the stamping point; note it does not fire when a `Bash` command rewrites the same file, so builder output needs a `FileChanged` hook instead.

#### 17. in-toto attestation Statement

[github.com/in-toto/attestation](https://github.com/in-toto/attestation/blob/main/spec/v1/statement.md) · Apache-2.0

**What it is.** A minimal, standard envelope for "this artifact was produced by that process": `{"_type": "...Statement/v1", "subject": [{"name", "digest": {"sha256": "…"}}], "predicateType": "<URI>", "predicate": {}}`. Subjects are matched purely by content digest — the same content-hash key the overlay uses as its version identity.

**Where it fits.** The wrapper shape for the page-generation stamp (see Templates), so that a signed attestation at promotion time is a wrapper around the existing unsigned stamp, not a rewrite. Borrow the envelope; skip DSSE signing until a prototype is actually promoted to production.

#### 18. W3C PROV-O (relation vocabulary only)

[w3.org/TR/prov-o](https://www.w3.org/TR/prov-o/) · W3C Recommendation

**What it is.** The standard relation names for provenance: `wasGeneratedBy`, `wasAttributedTo`, `wasDerivedFrom`, `wasRevisionOf`, `used`, `wasAssociatedWith`.

**Where it fits.** Field names inside the stamp's predicate, not the RDF/OWL machinery around them — `wasRevisionOf` is specifically the field that carries the previous content hash forward across a regeneration, which is what makes "changes since your last comment" possible without a git-archaeology query.

#### 19. OpenTelemetry GenAI semantic conventions

[github.com/open-telemetry/semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md) · CNCF, Development stability

**What it is.** Standard attribute names — `gen_ai.conversation.id`, `gen_ai.agent.name`/`.version`, `gen_ai.tool.call.id`, `gen_ai.request.model`, `gen_ai.request.seed`/`.temperature`, `gen_ai.prompt.name`/`.version` — that map directly onto Claude Code's hook fields (`session_id` → `conversation.id`, `prompt_id` → the turn, `tool_use_id` → the write) and onto Langfuse's and LangSmith's trace fields.

**Where it fits.** Naming the stamp's `generator` fields with these attribute names is what lets an API-pipeline trace and a Claude Code hook-written stamp join on the same schema without a translation table — already the naming convention this stream's templates use.

#### 20. `Assisted-by:` commit trailer (Linux kernel convention)

[docs.kernel.org/process/coding-assistants.html](https://docs.kernel.org/process/coding-assistants.html) · policy, not code

**What it is.** The emerging commit-level convention for naming an AI contributor without claiming authorship: `Assisted-by: AGENT_NAME:MODEL_VERSION`, explicitly distinct from `Signed-off-by` ("AI agents MUST NOT add Signed-off-by tags").

**Where it fits.** Alongside the existing `Co-Authored-By` trailer this repo already uses, add `Assisted-by: Claude:<model-id>` and a `Prototype: PROTO-YYYY-NNN` trailer that the ledger-link gate in [prototype-governance.md](prototype-governance.md) can check for directly.

---

### Packaging and isolation

#### 21. Shadow DOM (MDN reference)

[developer.mozilla.org/.../Using_shadow_DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) · web platform

**What it is.** The isolation primitive every shipping dev overlay converges on: "page CSS does not affect nodes inside the shadow DOM" and vice versa, though `dir`/`lang` and CSS custom properties still cross the boundary. Vite's own error overlay, Next.js's dev overlay, and the Hypothesis annotator all use an open shadow root on a custom element for exactly this reason.

**Where it fits.** `core/host.ts` — one `<pr-overlay>` custom element, `mode: "open"` (so axe and Playwright can still see inside; `closed` "should not be considered a strong security mechanism" per MDN), styles applied via `adoptedStyleSheets`, and `:host { all: initial }` plus explicit font/color/line-height to stop inheritance leaks.

#### 22. Sentry loader pattern

[docs.sentry.io/platforms/javascript/install/loader](https://docs.sentry.io/platforms/javascript/install/loader/) · reference pattern

**What it is.** A one-line `<script src=… crossorigin>` whose stub buffers calls (`captureException`, `addBreadcrumb`) in a queue array until the real SDK loads lazily, triggered by first use. The same queue-stub shape appears in Intercom's and PostHog's loaders.

**Where it fits.** `core/boot.ts` — `window.prOverlay = window.prOverlay || { q: [] }` lets a generator configure the overlay (project id, shortcut key) in an inline script before the IIFE itself has loaded from a CDN, without race conditions.

#### 23. Claude Code artifacts — host constraints

[code.claude.com/docs/en/artifacts](https://code.claude.com/docs/en/artifacts) · official · re-verified as the binding constraint throughout this stream

**What it is.** The single hardest, most load-bearing constraint in the whole stream: scripts load only from cdnjs, jsDelivr `/npm/`, the Tailwind and jQuery CDNs; `fetch`/XHR/WebSocket reach only the page's own origin and Google Fonts; the page is capped at 16 MiB; the runtime additionally exposes `window.claude.db` (a shared, realtime, last-writer-wins document store, 5,000-document cap, 256 KiB per document) and `window.claude.downloads` — capabilities documented in the tool contract served to this session, not on the public docs page as of this research.

**Where it fits.** Every packaging, storage, and delivery decision in this stream traces back to this page. Re-check it before shipping — the `db`/`downloads`/`user` capability set is explicitly called out across the research as likely to change as it reaches more plan tiers.

---

## Templates

Four records, one shared shape (`generator`/`wasGeneratedBy` block, content-hash version key) — full JSON in the research documents linked below.

### (a) Layered comment anchor (sketch; full record in [01 §10](../docs/research/prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md))

```json
{
  "target": {
    "source": "https://…/checkout?step=payment",
    "selector": [
      { "type": "ext:SourceSelector", "value": "src/checkout/Promo.tsx:46:19" },
      { "type": "ext:TestIdSelector", "value": "promo-input" },
      { "type": "ext:RoleSelector", "role": "textbox", "name": "Promo code" },
      { "type": "TextQuoteSelector", "exact": "Promo code", "prefix": "Discount ", "suffix": " Apply" },
      { "type": "CssSelector", "value": "[data-testid=\"promo-input\"]" }
    ],
    "state": { "viewport": { "w": 1280, "h": 800 }, "theme": "dark", "fingerprint": "sha1:…" }
  }
}
```

### (b) Human grade record — verdict, taxonomy, rationale (full record and full taxonomy in [03 Templates](../docs/research/prototype-review-overlay/03-grading-controls-and-feedback-to-tuning.md))

Verdict ∈ `accept` / `reject` / `unsure` / `skip`. Reject requires ≥1 anchored defect and a rationale sentence. Taxonomy: `wrong-intent`, `off-system`, `hierarchy`, `layout`, `missing-state`, `interaction`, `copy`, `a11y`, `other` — each mapped to a default fix lever (hook, exemplar, skill instruction, or rule) from the eval-tuning-loops altitude ladder.

### (c) Provenance stamp — written by a `PostToolUse` hook, read by the overlay (full stamp and working hook scripts in [04 §10](../docs/research/prototype-review-overlay/04-versioning-and-generation-provenance.md))

```html
<html data-proto-version="sha256:9f2c…e1a0" data-proto-id="PROTO-2026-041">
<script type="application/json" id="proto-provenance">
{ "_type": "https://in-toto.io/Statement/v1",
  "subject": [{ "name": "invite-sheet.html", "digest": { "sha256": "9f2c…e1a0" } }],
  "predicate": { "wasGeneratedBy": { "gen_ai.conversation.id": "…", "prompt.id": "…" },
                 "used": { "gen_ai.agent.name": "proto-builder", "gen_ai.agent.version": "1.4.2" } } }
</script>
```

Hash rule: computed over the file bytes with the stamp `<script>` and the overlay's own `<script>` masked to empty strings, so re-stamping never changes the version key.

### (d) Sidecar layout (full layout in [02 §10](../docs/research/prototype-review-overlay/02-storage-sync-and-identity.md) and [04 §10](../docs/research/prototype-review-overlay/04-versioning-and-generation-provenance.md))

```text
docs/prototypes/review/PROTO-2026-041/
├── review.json      # merged — written only by the agent
├── review.md        # human digest for the PR diff
├── open.json         # unresolved comments, each with a full selector chain
├── grades/*.json      # human grade records
└── shots/*.png         # masked screenshot evidence
```

---

## Evaluated but not selected

- **Liveblocks Comments** and **Velt** — the mature ceiling for what a comment layer becomes (mentions, presence, cursors, Loom-style recordings), but both are backend-bound and React-first; neither runs in a single-file artifact, and Liveblocks's free tier caps at 200 comments/month. Reference for the feature ceiling, not a dependency.
- **InstantDB** — sunsetting: new signups closed, cloud apps shut down 31 August 2027.
- **Deno KV** — still `--unstable-kv`, and Deno Deploy Classic (its host) shuts down; avoid for anything meant to last a year.
- **PocketBase** — its own docs say "NOT recommended for production critical applications yet"; fine for a team that already runs a VPS, not a default.
- **Automerge** — the right CRDT model, but its reference sync server is explicitly "an unsecured Express app… for demonstration purposes."
- **html2canvas** — 31.9k★ but effectively frozen at v1.4.1 with 975 open issues; does not support modern CSS (container queries, `backdrop-filter`, OKLCH). snapdom and html-to-image are the current picks.
- **stagewise** — pivoted from a browser toolbar to "an open source agentic IDE" (AGPLv3); its earlier toolbar-injection docs 404 as of this research. Revisit once its current shape is verified.
- **GitHub OAuth device flow from a browser** — no evidence found that the device-flow endpoints support CORS from a page with no server; treat as unusable without a proxy until verified otherwise.
- **Cord** — its hosted service shut down in August 2024; the SDK is open source but its documentation now lives on a relocated domain that returned a server error during research.

---

Grounding research, with full source lists and "fetched OK"/"search-verified only"/"not verified" markings for every claim: [docs/research/prototype-review-overlay/](../docs/research/prototype-review-overlay/00-synthesis.md).
