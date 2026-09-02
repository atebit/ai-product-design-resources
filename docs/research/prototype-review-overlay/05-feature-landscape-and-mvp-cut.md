# Feature Landscape and the MVP Cut for a Prototype Review Overlay (2026)

**Scope.** This document answers one question: *beyond commenting, grading, and versioning, what capabilities do the best adjacent tools ship inside the page, which of them matter for designers and design engineers reviewing AI-generated prototypes, and what is the right MVP cut?* Element-level commenting with storage, yes/no grading that feeds a tuning loop, and session versioning are the subject of the sibling documents in this stream and are treated here only as the three fixed pillars everything else must attach to. Out of scope: server-side review pipelines, the tuning loop itself, and the critique *formats* — those live in [design-sdlc/02 — Feedback on code prototypes and flows](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), [eval-tuning-loops/02 — Reviewing grades and human calibration](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md), and the curated shortlists in [skill-resources/review-and-feedback.md](../../../skill-resources/review-and-feedback.md), [skill-resources/hooks.md](../../../skill-resources/hooks.md), and [skill-resources/guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md). Two host targets constrain every recommendation: a single-file HTML artifact with no build step (including Claude Code artifacts, which are served under a strict CSP), and a Vite/React/Next dev app. Verification was partial: this pass fetched the browser-platform primitives, the CSP and Shadow DOM rules, the artifact sandbox constraints, and a handful of libraries directly; vendor toolbar feature lists that were verified in design-sdlc/02 in September 2026 are cited to that document; everything else is marked **not verified in this pass** and should be treated as a survey hypothesis, not a finding.

---

## Table of Contents

1. [Platform dev toolbars](#1-platform-dev-toolbars)
2. [AI-builder preview toolbars](#2-ai-builder-preview-toolbars)
3. [Session and context capture](#3-session-and-context-capture)
4. [Design QA overlays](#4-design-qa-overlays)
5. [State and scenario controls](#5-state-and-scenario-controls)
6. [Review-session tooling](#6-review-session-tooling)
7. [Guardrails on the overlay itself](#7-guardrails-on-the-overlay-itself)
8. [Pruning against the audience](#8-pruning-against-the-audience)
9. [Build approaches](#9-build-approaches)
10. [The MVP cut](#10-the-mvp-cut)
11. [Cross-cutting themes](#cross-cutting-themes)
12. [Recommendations](#recommendations)
13. [Templates](#templates)
14. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
15. [Sources](#sources)

---

## 1. Platform dev toolbars

### What it is
The floating toolbars that hosting platforms and component workbenches inject into preview deployments: Vercel Toolbar, Netlify Drawer, Storybook's toolbar and addons, and the Storybook alternatives (Ladle, Histoire). They are the closest existing analogue to "a drop-in package included in every prototype."

### Why it matters
These toolbars have already solved the two problems the overlay faces — how to inject a UI that does not fight the host page, and which controls reviewers actually reach for — at scale, with telemetry the builder cannot get. Their feature sets are the baseline expectation of anyone who has reviewed a Vercel preview.

### Key findings
- **Vercel Toolbar's commenting, CLI, and MCP surface are the reference for "comment becomes agent input."** Comments are element- or text-anchored, free on every plan, convertible to Linear/Jira/GitHub issues, readable from a `vercel comments --json` CLI (20 Aug 2026) and from MCP tools (`list_toolbar_threads`, `reply_to_toolbar_thread`, `change_toolbar_thread_resolve_status`) — all verified in [design-sdlc/02 §1](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md). The brief lists further Vercel tools — feature-flag overrides, draft mode, a layout-shift tool, interaction timing, an accessibility audit, visual editing, share links, INP — and their existence is consistent with Vercel's documentation index, but **their individual behaviour was not verified in this pass**. What *is* verified is that every one of them has a browser primitive an overlay can use directly: layout shifts via `PerformanceObserver({type: "layout-shift"})`, whose entries carry `value`, `hadRecentInput`, and `sources` with `node`, `previousRect`, and `currentRect` — Chromium-only, "not Baseline" ([MDN LayoutShift](https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift)); interaction timing via `PerformanceObserver({type: "event", durationThreshold: 16})` with `interactionId`, which MDN describes as "particularly useful for measuring the Interaction to Next Paint" and which became Baseline in December 2025 ([MDN PerformanceEventTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming)). Google's `web-vitals` wraps both in "a tiny (~3K, brotli'd)" Apache-2.0 library loadable from a CDN as an IIFE, with an attribution build "about 1.5K" larger; it notes CLS is Chromium-only and that metrics cannot be measured inside iframes ([web-vitals](https://github.com/GoogleChrome/web-vitals)).
- **Netlify Drawer is the richest reviewer capture at zero cost** — screenshots with visual or text annotations, screen recordings, comments synced to the PR, issue export to seven trackers, free Reviewer role ([design-sdlc/02 §1](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)). Cloudflare Pages has no in-page surface at all (same source). The Shopify theme inspector and Hydrogen subrequest profiler were **not verified in this pass**.
- **Storybook's toolbar is the canonical "scenario control" surface** — viewport, backgrounds, measure, outline, controls/args, actions, interactions, a11y — and Storybook 9 folded the pseudo-states addon into the monorepo: the `chromaui/storybook-addon-pseudo-states` repository was archived on 7 May 2025 with its functionality merged upstream ([addon repo, fetched OK](https://github.com/chromaui/storybook-addon-pseudo-states)). Its mechanism matters for build cost: it "rewrites all document stylesheets to add a class name selector to any rules that target a pseudo-class (:hover, :focus, etc.)" and toggles those classes on the story root; consequently "it won't render any of the default user agent (browser) styles." That is the only known way to force `:hover` from page JavaScript, and it is a stylesheet walk an overlay can copy in under a hundred lines. Per-addon behaviour of viewport/measure/outline/backgrounds in Storybook 9/10, Chromatic's in-Storybook diff, and the Ladle and Histoire toolbars were **not verified in this pass**; Chromatic's component-level UI Review and its plan gating are covered in design-sdlc/02 §1.
- **Every platform toolbar ships a share/link capability.** Vercel's sharable preview links and Storybook's args-in-URL are the two patterns worth copying (Storybook's is **not verified in this pass**; Vercel's is cited in design-sdlc/02). The overlay's equivalent is "link-with-state" (§6).

### Open questions
- Vercel's non-comment tools are gated to Vercel-hosted previews; which of them does a small team actually open? No usage data was found.
- Storybook's toolbar is per-story; a page-level prototype has no story boundary, so which controls survive the move from component to page?

---

## 2. AI-builder preview toolbars

### What it is
The select/edit/annotate/comment layers that Lovable, v0, Bolt, Figma Make, Claude Design, Replit, Base44, Google Stitch, Anima, Builder.io Fusion, Onlook and Tempo put over their generated previews — the tools whose *output* the overlay is meant to review.

### Why it matters
These are the only toolbars designed for the overlay's exact audience: people looking at AI output and deciding what to tell the model next. What they let a reviewer do without leaving the page is the most direct evidence of demand.

### Key findings
- **Verified in design-sdlc/02 §1 (September 2026):** Lovable's toolbar has four modes — select, edit text, draw annotation, add comment — with comments that "stay attached to the element you pinned them to" and a thread that can be sent to the agent as a task; Figma Make comments are element-anchored *with a screenshot of the element's state*, sorted by version, and block interaction while in comment mode; Claude Design ships inline element comments and "adjustment knobs" with a documented bug where inline comments sometimes do not appear; v0 and Bolt document sharing but no commenting. Claude Code artifacts have comment threads, **Send to Claude**, and per-publish versions with viewer pinning ([Claude Code artifacts docs, fetched OK](https://code.claude.com/docs/en/artifacts)).
- **The common shape is select → highlight → act.** Across the verified tools the reviewer's first gesture is always an element pick with a visible highlight, after which the action fans out (comment, edit text, style knob, send to agent). The overlay should treat the picker as the root object and every other capability as a verb on the picked element (§8).
- **Two capabilities the builders ship that a generic overlay can replicate cheaply:** inline text editing (Lovable "edit text"; Figma Make point-and-edit) maps onto `document.designMode = "on"` or per-element `contentEditable`, a standardized HTML property ([MDN designMode](https://developer.mozilla.org/en-US/docs/Web/API/Document/designMode)), from which the overlay can diff the text and emit "change copy from X to Y" as a structured comment; and the element-state screenshot (Figma Make) maps onto in-page DOM-to-image capture (§3).
- **Two the overlay should not attempt:** style knobs that write back to source (Lovable visual edits, Onlook's design mode on real code, Builder.io Fusion) require a compiler-level source map from DOM to file; `react-dev-inspector` shows the shape of that machinery — a Babel/build plugin injecting source paths, an `<Inspector/>` component, and dev-server middleware to open the IDE (MIT, 1.3k stars) ([react-dev-inspector, fetched OK](https://github.com/zthxxx/react-dev-inspector)). That is a Vite-host-only feature and belongs to the agent, not the reviewer. Replit, Base44, Google Stitch, Anima, Builder.io Fusion, Onlook and Tempo feature lists were **not verified in this pass**.
- **Claude Code artifacts explicitly endorse "copy as prompt" as a pattern:** the docs suggest a triage-board artifact with a "Copy as prompt" button "that gives me the final ordering to paste back here," and say a page can act as "a lightweight editor for a decision you then hand back to Claude" ([artifacts docs](https://code.claude.com/docs/en/artifacts)). The overlay's copy-as-agent-prompt (§6) is that pattern applied to feedback.

### Open questions
- Figma Make's "screenshot of the element's state" is the only state-anchored comment verified anywhere; nobody has published whether reviewers find it sufficient for interaction feedback.
- Lovable bills "send thread to agent" as chat usage; what does the equivalent cost when the agent is Claude Code reading a JSON file?

---

## 3. Session and context capture

### What it is
The reproduction bundle: console and error capture, network capture, breadcrumbs, performance marks, DOM snapshots, and full session replay (rrweb and the products built on it — OpenReplay, PostHog, LogRocket, Sentry Replay, Highlight).

### Why it matters
A comment that says "the modal jumped" is useless to an agent without the console error, the layout-shift entry, and the state the page was in. The repo's evidence is unambiguous that feedback must be an *agent input* ([design-sdlc/02 §8](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)), and agents act on evidence, not adjectives.

### Key findings
- **The zero-dependency primitives are all Baseline.** `window.onerror` and `unhandledrejection`, a `console.*` wrapper writing to a ring buffer, `fetch`/`XMLHttpRequest` wrappers for network breadcrumbs, `PerformanceObserver` for layout shifts and event timing (§1), `getComputedStyle(el, pseudo)` returning resolved values — Baseline since 2015 ([MDN getComputedStyle](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)) — and `Element.getBoundingClientRect`. None needs a library. The specific masking, plugin and size details of rrweb, OpenReplay, PostHog, LogRocket, Sentry Replay and Highlight were **not verified in this pass**; the design consequence that *is* certain is that replay is a heavyweight, backend-shaped feature and does not belong in an MVP whose single-file host cannot reach a backend.
- **The single-file host has no network.** Claude Code artifacts are served under a CSP that "lets `fetch`, XHR, and WebSocket calls reach only the page's own origin and the Google Fonts hosts," allows scripts only from cdnjs, jsDelivr `/npm/`, the Tailwind CDN and jQuery CDN, and blocks every external image; the page "can't store data submitted through a form" and its only outside channel is calling MCP connectors declared at publish time, which run through the *viewer's* account ([artifacts docs](https://code.claude.com/docs/en/artifacts)). So for that host, "session capture" means: capture into memory, serialize to JSON, and get it out via clipboard, a connector, or the artifact's own storage capability — never a direct GitHub API call.
- **`localStorage` is unreliable on `file:` URLs.** MDN: "the requirements for `localStorage` behavior are undefined and may vary among different browsers," each `file:` URL "seems to have its own unique local-storage area," and a `SecurityError` can be thrown when "the origin uses the `file:` or `data:` schemes" ([MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)). A prototype opened by double-clicking an `.html` file therefore needs an explicit export path (copy/download JSON) as the durable store, with `localStorage` as a convenience only.
- **In-page screenshots are the one hard capture.** The candidate mechanisms are DOM-to-image serialization (html2canvas and its successors such as snapdom) or `getDisplayMedia`; their maintenance status, sizes and fidelity were **not verified in this pass**. The cheap alternative that *is* verified is to capture the *description* of the element instead of its pixels — bounding rect, computed styles, text, selector — which is also what the judge literature says a VLM needs anyway ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md): "compute those from the DOM and hand the judge numbers").
- **Breadcrumbs are cheap and disproportionately useful.** A capped list of `{t, type: click|input|nav|key, selector}` entries reconstructs "what the reviewer did before the comment" — the sequence information design-sdlc/02 §1 says only Loom captures today.

### Open questions
- What is the minimum reproduction bundle an agent needs to fix a *visual* bug versus a *behavioural* one? No study; the repair-lift framing of UXBench ([design-sdlc/02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)) is the right way to measure it.

---

## 4. Design QA overlays

### What it is
Overlays that make invisible properties visible: accessibility audits (axe, Accessibility Insights), contrast checkers, spacing/grid/baseline overlays, token inspectors and "on-system rate," font and color inventories, pixel-perfect image overlays, responsive emulators, and media-feature toggles (reduced motion, forced colors, dark mode, RTL, pseudo-locale, DPR).

### Why it matters
This is the family where the repo's own research says the human is irreplaceable *and* under-equipped: VLMs "cannot see spacing, alignment, or contrast" and those must be "computed from the DOM" ([eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md)); humans catch what judges miss only if the overlay shows them the numbers.

### Key findings
- **What page JavaScript can and cannot emulate.** Chrome DevTools' Rendering panel emulates `prefers-color-scheme`, print media, `forced-colors`, `prefers-contrast`, `prefers-reduced-motion`, `prefers-reduced-transparency` and `color-gamut` ([Chrome DevTools](https://developer.chrome.com/docs/devtools/rendering/emulate-css)); Playwright's `page.emulateMedia` takes `media`, `colorScheme`, `reducedMotion`, `forcedColors` and `contrast` ([Playwright](https://playwright.dev/docs/api/class-page#page-emulate-media)). None of these media features can be forced by script running *inside* the page — they are user-agent state. An overlay can only (a) toggle a host-app convention (`data-theme`, a `.reduced-motion` class, `dir="rtl"`), (b) approximate (inject `* { animation: none !important; transition: none !important }`, or pause running animations as Agentation does — [design-sdlc/02 §5](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)), or (c) hand the request to the agent's Playwright run. Forced-colors and `prefers-contrast` are therefore "agent-side only"; dark mode and reduced motion are "host convention or approximation"; RTL is trivial.
- **Vision-deficiency simulation is a page-wide SVG filter.** Chromium's own implementation applies `feColorMatrix` filters for achromatopsia, deuteranopia, protanopia and tritanopia "based on a physiologically accurate color vision deficiency simulation model by Machado, Oliveira, and Fernandes," conceptually "an overlay covering the entire page" ([Chromium CVD](https://developer.chrome.com/docs/chromium/cvd)). DaltonLens publishes SVG filters usable via CSS `filter: url(#id)` — Viénot 1999 for protan/deutan, Brettel 1997 "required for accurate tritanopia simulation" — with reference code in libDaltonLens (license not stated on the page) ([DaltonLens](https://daltonlens.org/cvd-simulation-svg-filters/)). This is a copy-paste feature: an inline `<svg>` with four filters and a `filter` on `:root`.
- **Contrast is arithmetic on computed styles.** With `getComputedStyle` for foreground and the first opaque ancestor background, WCAG 2 contrast is a few lines; APCA is a published algorithm (its package details were **not verified in this pass**). The verified edge case is the `EyeDropper` API for sampling a rendered pixel — secure context only, requires a user gesture, Chromium-only and "not Baseline" ([MDN EyeDropper](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API)) — useful for gradients and images, not a dependency.
- **Font and color inventories are free.** `document.fonts` is an iterable `FontFaceSet` exposing `family`, `weight`, `status`, Baseline since January 2020 ([MDN document.fonts](https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts)); a computed-style walk of every element yields the color, font-size and spacing inventory that CSS Stats and Chrome's CSS Overview panel show (those two **not verified in this pass**).
- **"On-system rate" is the one QA overlay nobody ships and the repo most wants.** The repo already grades token drift statically — `eslint-plugin-tailwindcss` `no-arbitrary-value`, Deslint's `no-arbitrary-*` rules, the token-drift hook ([eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md), [hooks.md Recipe 2](../../../skill-resources/hooks.md)) — but no in-page indicator. The runtime version is tractable: read `:root` custom properties once, then for each element compare computed `color`, `background-color`, `font-size`, `padding`, `margin`, `gap`, `border-radius` against the token values and report the fraction that match, highlighting the misses. This is the overlay feature with the highest agent value in the whole survey, because it turns "feels off-brand" into a list of selectors and values. No existing runtime token linter was verified in this pass; treat it as build-it-yourself.
- **Spacing, outline, grid, baseline, measure.** All are `getBoundingClientRect` and computed-style overlays drawn into an absolutely positioned layer; Pesticide-style outlines and Storybook's measure/outline addons are the reference (**not verified in this pass**). Pixel-perfect image overlay is an `<img>` with opacity and arrow-key nudging. Tab-stop visualisation is a query for focusable elements in DOM order plus numbered badges — Accessibility Insights' "Tab stops" is the reference (**not verified in this pass**).
- **Responsive emulation needs an iframe.** Viewport width, DPR and `prefers-*` are document-level; the Storybook pattern is to render the story in an iframe and resize the iframe. In the single-file host the page can iframe *itself* (`srcdoc` or `src=location.href`), which also solves the Shadow DOM inheritance leak below. Polypane, Responsively and Sizzy are the desktop-app references (**not verified in this pass**).
- **Pseudo-locale and text expansion have a published scale.** W3C reproduces IBM's guidance: text up to 10 characters expands 200–300%, 11–20 by 180–200%, 21–30 by 160–180%, 31–50 by 140–160%, 51–70 by 151–170%, over 70 by 130%, with the rule that "the smaller the source message, the higher the likely translation length" ([W3C](https://www.w3.org/International/articles/article-text-size)). A text-node walk that pads strings by that table (and optionally swaps to accented characters) is a fifty-line feature that catches the truncation and wrapping failures generated layouts are prone to.
- **axe-core in-page.** The repo already runs axe from a Stop hook ([hooks.md Recipe 4](../../../skill-resources/hooks.md)); the in-page variant loads `axe-core` from cdnjs (an allowed host in the artifact CSP) and renders violations as pins. Its size and `exclude` API were **not verified in this pass**.

### Open questions
- How much of the "designer's eye" is covered by numbers? The DiffSpot finding (best VLM finds 40.7% of CSS changes) says humans are needed; nobody has measured whether a spacing overlay makes human review faster or more consistent.
- Should the on-system rate be computed against the host's own tokens (read at runtime) or against a shipped token file? Runtime is zero-config; a shipped file is auditable.

---

## 5. State and scenario controls

### What it is
Controls that put the prototype into a state the reviewer needs to see: mock-state switchers (empty/loading/error/offline), fixture pickers, feature-flag toggles, seeded data, time-travel, guided task lists, keyboard-only mode, screen-reader simulation.

### Why it matters
The repo's grading rubric checks *state coverage* (empty, loading, error present — [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md)), and design-sdlc/02's review-request template asks the author to list "States covered" and "States NOT covered." A reviewer who cannot reach the error state cannot review it.

### Key findings
- **Almost all of these need the host's cooperation.** A mock-state switch, fixture picker, flag override or seeded dataset only works if the prototype was built to read a control signal. MSW, Mirage, Storybook globals, PostHog/LaunchDarkly/GrowthBook toolbars and Redux/TanStack devtools were **not verified in this pass**, and the verdict does not depend on their details: the overlay cannot invent state the app does not expose. What the overlay *can* do is define a two-line convention the generator is told to honour — e.g. `data-proto-state="empty|loading|error|offline"` on the root, or a `window.__proto.setState(name)` hook — and a skill/rule that makes every generated prototype implement it. That moves the feature from "impossible" to "a prompt-engineering task," which is where this repo's leverage is ([guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md)).
- **Offline and slow-network are the exceptions.** Wrapping `fetch` to reject, delay, or return a canned error needs no host cooperation and exercises the loading and error states most generated prototypes stub.
- **Keyboard-only mode is trivial and high-value.** Inject `* { cursor: none !important }` plus a `pointer-events: none` shield on the document (not the overlay), so the reviewer must tab; pair with the tab-stop visualiser (§4). Screen-reader simulation needs an extension or a real screen reader (no verified in-page option); the honest in-page proxy is an accessible-name inspector on the picked element (`aria-*`, `alt`, label association from computed accessibility properties).
- **Guided task lists are a reviewer-experience feature, not a state feature.** Driver.js and Shepherd.js are the usual tour libraries (**not verified in this pass**); the overlay needs only a checklist panel bound to routes, which is also the vehicle for the review-request template already in the repo (§13).
- **Time-travel and flag toggles are Vite-host, later-tier.** They require framework devtools hooks and are covered adequately by existing devtools; the overlay should link out, not reimplement.

### Open questions
- Will a generator reliably implement a state-hook convention? The repo's schema-first construction work ([prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md)) suggests enumerated states in the construction file are the right place to source the switcher from.

---

## 6. Review-session tooling

### What it is
The features around a *session* rather than a single comment: present/share mode, link-with-state, contact sheets and visual diff, review checklists and timeboxing, comment heatmaps, assignment and reactions and resolve, export to tracker, send-to-agent, AI critique, voice notes.

### Why it matters
Review quality is a property of the session, and the repo's evidence is specific: annotator agreement "declined dramatically — by more than 32 percentage points — across eight batches," items labelled within a minute reached κ = 0.98 vs 0.65 a day apart, and the design consequences are "short sessions, mixed strata, keyboard flow … and a visible run-length warning" ([eval-tuning-loops/02 §5](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).

### Key findings
- **Copy-as-agent-prompt is the most valuable cheap feature in the survey.** Agentation's markdown-with-selectors, Casso's numbered boxes, MarkuprPlus' one-screenshot-per-mark and Vercel's `vercel comments --json` all converge on "serialize feedback with an address the agent can act on" ([design-sdlc/02 §5, §4](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)); the artifacts docs recommend the same "Copy as prompt" gesture. The overlay's version should emit both markdown (for pasting) and JSON (for a file the agent reads), and every entry must carry the address: route, viewport, state snapshot id, stable selector, bounding rect, and the *computed numbers* for spacing/colour/type — because those numbers are what a VLM cannot recover from a screenshot.
- **Stable selectors are a solved sub-problem.** `@medv/finder` generates the "shortest" unique CSS selectors, is "1.5kb (minified & gzipped)," MIT, ESM, with `seedMinLength`, `optimizedMinLength` and attribute/class filters ([finder, fetched OK](https://github.com/antonmedv/finder)). Filter out framework-generated class names (Tailwind utilities, CSS-modules hashes) and prefer `data-testid`/`id`/ARIA attributes; that is a five-line configuration and is the difference between a selector that survives a regeneration and one that does not.
- **Link-with-state is the overlay's answer to "everything gets an address."** The repo's synthesis names this as the root failure across four documents ([design-sdlc/00 §8](../design-sdlc/00-synthesis.md)). Serializing the state snapshot (route, scroll, viewport, `localStorage` keys the app owns, form values, open dialogs, active state-hook) into the URL hash gives every comment a resumable address without a backend; Storybook's args-in-URL and Vercel's sharable links are the precedents (Storybook's **not verified in this pass**).
- **Export to tracker depends on the host.** In a Vite app, the page can call the GitHub or Linear API with a user token; in a Claude Code artifact the CSP blocks every external fetch, so export is "copy markdown" or a declared MCP connector action, which "goes through the account of whoever selects the control" ([artifacts docs](https://code.claude.com/docs/en/artifacts)). Design the export as a serializer with pluggable transports (clipboard, download, connector, REST) rather than as a GitHub feature.
- **Timeboxing and a run-length warning are ten lines.** A session timer with a soft stop at 20–25 minutes and a counter of consecutive identical grades implements eval-tuning-loops/02's "visible run-length warning." Blind-first (hide prior grades until the reviewer commits) is the same document's anchoring control and costs nothing.
- **Contact sheets and visual diff belong to the agent.** shot-scraper multi, storycap, Playwright screenshots and montage are already curated ([review-and-feedback.md Recipe A](../../../skill-resources/review-and-feedback.md)); an in-page crawler cannot open other routes of a single-file prototype and cannot compare against a previous deploy without stored images. Lost Pixel, Argos, BackstopJS were **not verified in this pass**. The one in-page diff worth having is "diff against the screenshot stored with the last grade" — a canvas pixel diff of two data URLs — and it is a v1+ feature.
- **Reactions, assignment, heatmaps, resolve.** Resolve/unresolve is a state on the comment record and belongs in the commenting doc; assignment and reactions matter at team scale (Chromatic assigns default reviewers, Figma has reactions — design-sdlc/02 §1) and not for "a small shared team"; a comment heatmap is a density render of pins already on the page and is cheap once pins exist.
- **Commercial comment SDKs show the ceiling and the cost.** Liveblocks Comments provides "mentions, thread resolution, text annotations, video annotations," "internal notes and team-only threads," and "CSS variables, dark mode, localization," via `@liveblocks/react` and `@liveblocks/react-ui` with a Liveblocks backend ([Liveblocks, fetched OK](https://liveblocks.io/docs/ready-made-features/comments)); Velt ships "Leave a comment anywhere," presence, cursors, "Loom-style audio, video & screen recording with AI transcription," huddles and AI text enhancement, for React and web components, on Velt's backend ([Velt docs, fetched OK](https://velt.dev/docs/)). Both are backend-bound and React-first; neither fits a single-file host, but their feature lists are the mature reference for what a comment layer grows into.
- **AI critique and voice notes.** An in-page "critique this screen" button needs a model call; in an artifact that means a declared connector, in a Vite app a local endpoint. The repo already has the critique command and the OneRedOak design-review agent ([hooks.md Recipe 5](../../../skill-resources/hooks.md)), so the overlay should *invoke* those, not host a prompt. Voice notes via the Web Speech API were **not verified in this pass**; treat as later-tier.

### Open questions
- Does a blind-first review UI reduce the anchoring that pre-review AI critique introduces (design-sdlc/02 §6 open question)? The overlay is the instrument to measure it.
- What is the schema for a feedback item that both a tracker and an agent accept? The repo asked this in design-sdlc/02 §5; the JSON in §13 is a proposal.

---

## 7. Guardrails on the overlay itself

### What it is
The rules that keep the overlay from contaminating what it reviews: dev-only gating, no-op in production, excluding itself from screenshots, axe and analytics, a size budget, a kill switch, privacy masking, telemetry opt-in, and CSP compatibility.

### Why it matters
An overlay that shows up in a screenshot, adds axe violations, shifts layout, or breaks under the host's CSP produces false findings — and false findings are grades that poison the tuning loop.

### Key findings
- **Shadow DOM gives style isolation, not inheritance isolation.** MDN: "The page CSS does not affect nodes inside the shadow DOM" and "shadow DOM styles don't affect elements in the rest of the page," but the shadow tree inherits `dir` and `lang` from its host and inherited properties flow in; `closed` mode only hides `shadowRoot` and "should not [be] consider[ed] a strong security mechanism" ([MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)). Practical rule: the overlay's root sets `all: initial` and its own `font`, `color`, `direction` and `color-scheme`, and uses `open` mode so tests and the agent can inspect it.
- **CSP is the single-file host's hard constraint.** Under a `script-src`/`default-src` policy "inline JavaScript will not be allowed to execute unless extra measures are taken," inline scripts are allowed "if they are protected by a nonce or a hash," and "if a directive contains nonce or hash expressions, then the `unsafe-inline` keyword is ignored" ([MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)). Claude Code artifacts wrap the file and serve it under a strict CSP that allows scripts only from four CDN hosts ([artifacts docs](https://code.claude.com/docs/en/artifacts)); the overlay must therefore be either inlined into the artifact by the generator or published on cdnjs/jsDelivr, must inject styles via constructable stylesheets or `<style>` inside its shadow root rather than `style=""` attributes where `style-src` is strict, and must never `eval`.
- **Self-exclusion is a set of markers, not a feature.** Give the host element a fixed id and `data-` attribute, set `aria-hidden` on it while a capture or audit runs, pass it to axe's `exclude` context, add the class names replay tools block on, and make the screenshot function hide the host before capture (axe/replay option names **not verified in this pass**; the MDN/CSP facts above are). Storybook's addon shows the mirror problem: rewritten stylesheets must skip the overlay's own rules.
- **Gating.** In Vite/Next, `import.meta.env.DEV` / `process.env.NODE_ENV` plus an explicit opt-in attribute on the script tag; in a single file, a query parameter or hash flag (`#review`) and a `localStorage` "off" flag that survives reloads where storage works (§3). Never mount on `production` hostnames by default. Vercel's exact gating rules and the `size-limit` tool were **not verified in this pass**.
- **Size budget.** Lit is "around 5 KB (minified and compressed)" ([lit.dev](https://lit.dev/)) and its own guidance is not to bundle library code into published components and to prefer npm over CDN for deduplication ([Lit publishing](https://lit.dev/docs/tools/publishing/)); `web-vitals` is ~3 KB brotli'd; `finder` 1.5 KB gzipped. A realistic budget for an MVP that inlines its own picker, comment store, snapshot and serializer is 15–25 KB gzipped with zero runtime dependencies, growing to ~40 KB with an inlined selector generator and pseudo-locale table; axe-core should stay a lazy CDN load.
- **Privacy and telemetry.** Default to no network at all; the artifact host enforces it anyway. Any telemetry is opt-in with an environment variable, following the Storybook/Next convention (**not verified in this pass**). Mask text in the JSON export behind a flag so that fixtures with real data can be reviewed without leaking them into a tracker.

### Open questions
- Should the overlay refuse to run when it detects it is inside a screenshot harness (Playwright's `navigator.webdriver`)? Convenient, but it would hide the overlay from agent-driven review runs that *want* the pins rendered.

---

## 8. Pruning against the audience

### What it is
Scoring every capability above on three axes — reviewer value, agent value (does it make the feedback more actionable for Claude Code?), and build cost in a single-file zero-dependency package — against the specific audience: a small team of designers and design engineers reviewing AI-generated prototypes.

### Why it matters
The repo's findings set the weights. VLM judges cannot see spacing, alignment or contrast, so numbers computed in the page are agent gold ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)). Humans agree ~85% pairwise and judges ~66%, so the human's time is the scarce resource and the overlay must protect it from fatigue and anchoring ([eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)). Feedback must be an agent input, and "everything gets an address" ([design-sdlc/00](../design-sdlc/00-synthesis.md)).

### Key findings
- **Agent value dominates the ranking.** Features that add a *number* or an *address* to a comment (selector, rect, computed styles, state snapshot, console error, layout-shift source) score high even when reviewers would not ask for them, because they are what turns "the button feels cramped" into a patch. Features that add *pixels* (screenshots, replay) score lower than intuition suggests: a VLM finds 40.7% of CSS changes at best, and the description beats the image.
- **Reviewer value concentrates in reachability and rhythm.** Reviewers need to *reach* states (state hooks, offline, keyboard-only, RTL, pseudo-locale, CVD filter) and to *keep their judgement calibrated* (blind-first, timer, run-length warning, checklist). Aesthetic inspectors (font inventory, pixel-perfect overlay) are nice-to-have for this audience because they are not comparing against a Figma file — they are judging a generated screen against a design system, which is what the on-system rate measures directly.
- **Build cost is dominated by iframes and backends.** Anything that needs the page in an iframe (viewport switching), a backend (replay, tracker sync, AI critique), or the host's cooperation (mock states, flags) is a tier boundary. Everything drawn from `getBoundingClientRect` and `getComputedStyle` is a day of work.
- **Skip list.** Screen-reader simulation, style knobs that write back to source, time-travel, feature-flag overrides, visual editing, reviewer assignment and reactions, comment heatmaps, huddles/presence — either impossible without a backend, redundant with existing devtools, or irrelevant to a small team.

The full matrix is in [Recommendations](#recommendations).

### Open questions
- The scores are the author's judgement calibrated to the repo's findings; they should be re-scored after the first month of use with a count of which panel each reviewer opened.

---

## 9. Build approaches

### What it is
Five ways to ship the overlay: (a) a vanilla zero-dependency IIFE using Shadow DOM; (b) a Web Component/Lit package; (c) a React component with a vanilla fallback; (d) a Chrome extension or bookmarklet instead of an in-page package; (e) wrapping an existing OSS project (Agentation, stagewise, react-grab, or a comment widget).

### Why it matters
The two hosts pull in opposite directions: a single-file artifact under a strict CSP with no build step, and a Vite/React/Next app with a bundler and source maps. Only one approach serves both without a second codebase.

### Key findings
- **(a) Vanilla IIFE + Shadow DOM serves both hosts and is the only one that survives the artifact CSP unmodified.** It can be inlined by the generator or loaded from cdnjs/jsDelivr, needs no framework, and Shadow DOM handles style isolation ([MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)). Costs: no reactivity model (state must be hand-rolled), and testing without a framework is more manual. Size: smallest.
- **(b) Lit/Web Component adds ~5 KB and a CDN-vs-npm tension.** Lit's own publishing guidance says "don't bundle" and recommends building from npm to deduplicate, and warns that CDN loading "can result in users loading more code than necessary" ([Lit publishing](https://lit.dev/docs/tools/publishing/)); the single-file host has no npm. React 19 does now pass properties (when defined on the class) and supports `on`-prefixed custom events for custom elements ([react.dev](https://react.dev/reference/react-dom/components#custom-html-elements)), so a Web Component integrates cleanly into the Vite host. Verdict: viable, but it buys reactivity at the cost of a bundling decision the single-file host cannot make.
- **(c) React component with vanilla fallback is two codebases.** The React version can read fiber internals for component names and source locations (react-dev-inspector's approach — [fetched OK](https://github.com/zthxxx/react-dev-inspector)), which is genuinely more useful to the agent in the Vite host; the fallback still has to exist for artifacts. Verdict: build (a) first and add a thin React adapter that *enriches* the address with component name and source path when a fiber is present — one codebase, an optional plug-in.
- **(d) Extension or bookmarklet moves the problem to the reviewer's browser.** Content scripts run in "a private execution environment that isn't accessible to the page," can read and modify the DOM and inject CSS, cannot access page JavaScript variables without `postMessage`, and enforce a CSP that "prevents the use of `eval()` as well as loading external scripts" ([Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)). That means the extension can annotate anything — including third-party builders' previews — but cannot read the app's state hooks or fibers without an injected bridge. Bookmarklets are worse: Firefox treats them as inline scripts under CSP (Bugzilla 1077064, "RESOLVED DUPLICATE" of 866522 since 2014) while, per a commenter there, "Chrome does not neuter bookmarklets" ([Bugzilla, fetched OK](https://bugzilla.mozilla.org/show_bug.cgi?id=1077064)); the vimium and bullshit.js issue trackers report the same breakage on GitHub-hosted pages (search-verified only). Verdict: an extension is the right *second* delivery vehicle for reviewing previews the team does not control; it cannot be the package that ships inside every generated prototype, and it cannot see the generator's provenance or state hooks.
- **(e) Wrapping an OSS project buys the picker and the markdown, and inherits a framework.** Agentation is React 18+ under the PolyForm Shield license, overlays localhost, pauses animations, and emits markdown with selectors ([design-sdlc/02 §5](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)); stagewise and react-grab were **not verified in this pass**. Liveblocks and Velt are backend-bound and React-first (§6). None runs in a single-file artifact without React on the page. Verdict: borrow Agentation's output format and animation-pause idea, not its code; revisit stagewise/react-grab for the Vite-host adapter once verified.

| Approach | Single-file artifact (CSP, no build) | Vite/React/Next dev app | Size | Reactivity/testing | Verdict |
|---|---|---|---|---|---|
| (a) Vanilla IIFE + Shadow DOM | Inline or CDN; works | Script tag or import; works | Smallest | Hand-rolled | **Build this** |
| (b) Lit / Web Component | CDN only; Lit discourages | Clean, React 19 props/events OK | +5 KB | Good | Viable second choice |
| (c) React + vanilla fallback | Fallback only | Best address enrichment (fibers, source path) | Two builds | Good in React | Adapter on top of (a) |
| (d) Extension / bookmarklet | Extension yes; bookmarklet CSP-fragile | Yes, but blind to page JS without a bridge | n/a | Extension tooling | Second vehicle, not the package |
| (e) Wrap Agentation / stagewise / react-grab / Liveblocks / Velt | No (React or backend required) | Yes | Inherits | Inherits | Borrow formats, not code |

### Open questions
- Would a Preact-sized (≈3–4 KB) renderer inside the IIFE be worth it once panels multiply? Defer until the v1 panel count is known.

---

## 10. The MVP cut

### What it is
Three tiers — MVP (week one), v1 (month one), later — with the two or three cheap, disproportionately valuable features named.

### Why it matters
The three pillars (comment, grade, version) are fixed; the question is which of the forty-plus capabilities make those pillars *work* for an agent on day one, and which can wait.

### Key findings
- **MVP = pillars + address + export + guardrails.** Element picker with breadcrumb and stable selector; state snapshot and link-with-state; provenance banner; console/error ring buffer and breadcrumbs; copy-as-agent-prompt (markdown + JSON); keyboard-only and RTL toggles; blind-first grading with a session timer; kill switch, dev gating, self-exclusion markers, Shadow DOM isolation. Everything here is `getBoundingClientRect`, `getComputedStyle`, a few event listeners and a serializer — one week for one design engineer.
- **v1 = the numbers the judge cannot see, and the states the reviewer cannot reach.** On-system rate and token inspector; contrast on the picked element; spacing/measure, outline, tab-stop and landmark overlays; pseudo-locale expansion; CVD filters; animation pause; offline/slow-fetch; state-hook convention plus generator rule; axe-core lazy-loaded from cdnjs; inline copy edit; layout-shift and INP pins; iframe viewport switcher; review checklist panel; export transports (download, connector, REST for the Vite host); React adapter enriching addresses with component and source path.
- **Later = anything with a backend or a second party.** rrweb-style replay; DOM-to-image screenshots and pixel diff against the last grade; contact sheet (agent-side, already curated); AI critique invocation; voice notes; comment heatmap; extension delivery for third-party previews; reactions and assignment if the team grows.
- **The three cheap, disproportionately valuable features:** (1) **copy-as-agent-prompt with computed numbers** — it is the bridge from human judgement to a patch and the single feature every adjacent tool converged on; (2) **state snapshot + link-with-state** — it gives every comment and grade an address, which the repo's synthesis identifies as the root cause of every failure it catalogued; (3) **provenance banner** — `<meta name="generator">` is a standard metadata name ("The identifier of the software that generated the page" — [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name)); the overlay reads it plus a `data-proto-*` block (model, skill version, construction-file hash, artifact version or git SHA, generated-at) and stamps every exported feedback item with it, so the tuning loop can stratify grades by generator version without a database ([eval-tuning-loops/02 §3](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) asks for exactly this stratification).

### Open questions
- Which v1 panel gets opened first will decide v2; instrument panel-open counts locally (no telemetry) and read them at the month-one retro.

---

## Cross-cutting themes

1. **The picker is the root object; every capability is a verb on it.** Comment, grade, measure, contrast, copy, edit, token-check all start from "which element" — a single picker with a stable selector is the shared substrate, and `finder`-style selector generation with framework-class filtering is the one dependency worth inlining.
2. **Numbers beat pixels for the agent.** Computed styles, rects, layout-shift sources and token matches are what a VLM cannot recover from a screenshot; the overlay's job is to *compute* what the reviewer sees and attach it to what the reviewer says.
3. **The single-file host sets the floor.** No network, CDN-only scripts, unreliable `localStorage` on `file:`, strict CSP — a design that works there works everywhere, and everything backend-shaped moves to a transport plug-in or to the agent's own Playwright run.
4. **Media preferences cannot be forced from inside the page.** Dark mode, reduced motion, forced colours and contrast are user-agent state; the overlay offers host conventions and approximations and hands the rest to Playwright's `emulateMedia`.
5. **States need a convention, not a feature.** The overlay cannot invent empty/loading/error states; a two-line hook the generator is instructed to implement can.
6. **Protect the reviewer's judgement.** Blind-first, a timer, a run-length warning and a checklist are ten lines each and are the only defence against the measured 32-point agreement decay.
7. **Guardrails are markers.** A fixed id, `aria-hidden` during capture, `all: initial`, no `eval`, no network by default — the overlay must be invisible to the very audits it hosts.

---

## Recommendations

### Capability matrix

Reviewer value / agent value: **H**igh, **M**edium, **L**ow. Build cost in a single-file zero-dependency package: **S** (hours), **M** (a day or two), **L** (a week), **X** (needs iframe, backend, extension, or host cooperation). Tier: MVP, v1, Later, Skip.

| # | Capability | Reviewer | Agent | Cost | Tier | Notes |
|---|---|---|---|---|---|---|
| 1 | Element picker: hover highlight, breadcrumb, stable selector | H | H | M | MVP | `finder`-style selector, filter framework classes |
| 2 | Copy-as-agent-prompt (markdown + JSON with address and computed numbers) | H | H | M | MVP | Schema in Templates |
| 3 | State snapshot (route, scroll, viewport, storage keys, form values, dialogs, state hook) | M | H | M | MVP | Serialized with each comment/grade |
| 4 | Link-with-state (snapshot in URL hash) | H | H | S | MVP | Resumable address, no backend |
| 5 | Provenance banner (meta generator + `data-proto-*`) | M | H | S | MVP | Stratifies grades by generator version |
| 6 | Console/error ring buffer | M | H | S | MVP | `onerror`, `unhandledrejection`, console wrap |
| 7 | Breadcrumbs (click/input/nav trail) | M | H | S | MVP | Sequence context for interaction feedback |
| 8 | Keyboard-only mode | H | M | S | MVP | Cursor hidden, pointer shield on document |
| 9 | RTL toggle (`dir`) | M | L | S | MVP | Trivial |
| 10 | Blind-first grading + session timer + run-length warning | H | M | S | MVP | eval-tuning-loops/02 §5 |
| 11 | Kill switch, dev gating, self-exclusion markers, Shadow DOM `all: initial` | H | H | S | MVP | Guardrails; non-negotiable |
| 12 | Network breadcrumbs (`fetch`/XHR wrap) | L | M | S | v1 | Only when prototype fetches |
| 13 | On-system rate + token inspector on picked element | H | H | M | v1 | Highest agent value in the survey |
| 14 | Contrast on picked element (WCAG 2; APCA optional) | H | H | S | v1 | Computed fg/bg; EyeDropper as Chromium extra |
| 15 | Spacing/measure overlay between elements | H | H | M | v1 | Rects and computed margins/padding |
| 16 | Outline overlay (all boxes) | M | L | S | v1 | Pesticide-style |
| 17 | Grid/baseline overlay | M | L | S | v1 | Configurable columns, 4/8 px baseline |
| 18 | Tab-stop visualiser | H | M | S | v1 | Focusable query in DOM order |
| 19 | Landmark/heading outline; accessible-name inspector | M | M | S | v1 | Proxy for screen-reader review |
| 20 | axe-core audit (lazy CDN) with violation pins | H | H | M | v1 | cdnjs is an allowed artifact host |
| 21 | Pseudo-locale / text expansion by W3C-IBM table | M | M | S | v1 | Catches truncation and wrapping |
| 22 | CVD simulation (SVG feColorMatrix on root) | M | L | S | v1 | Copy DaltonLens/Chromium filters |
| 23 | Animation pause / reduced-motion approximation | M | M | S | v1 | `getAnimations().pause()` or injected CSS (primitive not re-verified) |
| 24 | Dark-mode / theme toggle via host convention | M | L | S | v1 | Cannot force `prefers-color-scheme` |
| 25 | Offline / slow / failing fetch simulation | H | M | S | v1 | Exercises loading and error states |
| 26 | State-hook convention (`data-proto-state`) + generator rule | H | H | S+rule | v1 | Overlay cannot invent states |
| 27 | Inline copy edit → text diff comment | H | H | S | v1 | `designMode`/`contentEditable` |
| 28 | Layout-shift pins (sources rects) | M | H | S | v1 | Chromium only |
| 29 | INP / slow-interaction pins | L | M | S | v1 | Baseline Dec 2025 |
| 30 | Iframe viewport/DPR switcher | H | M | X (iframe) | v1 | Self-iframe in single file |
| 31 | Review checklist / review-request panel | H | M | S | v1 | Hosts design-sdlc/02 template |
| 32 | Export transports: download JSON, connector action, REST (Vite host) | M | H | M | v1 | Serializer + plug-ins |
| 33 | React adapter: component name + source path in address | M | H | M | v1 | Fiber read; Vite host only |
| 34 | Font/colour inventory panel | M | M | S | v1 | `document.fonts` + style walk |
| 35 | Pixel-perfect image overlay | L | L | S | Later | Not comparing against Figma |
| 36 | DOM-to-image screenshot of picked element | M | M | M | Later | Library maintenance not verified |
| 37 | Pixel diff vs screenshot stored with last grade | M | M | M | Later | Needs 36 |
| 38 | Session replay (rrweb-class) | M | M | X (backend) | Later | Not for single-file host |
| 39 | Contact sheet / screenshot-all-routes | H | M | X (agent) | Later | Already curated agent-side |
| 40 | AI critique invocation | M | M | X (connector/endpoint) | Later | Invoke existing critique command |
| 41 | Voice note → transcript | L | M | X | Later | Web Speech not verified |
| 42 | Comment heatmap | L | L | S | Later | Density of existing pins |
| 43 | Guided task list / tour | M | L | M | Later | Checklist panel covers it |
| 44 | Present/share mode (hide chrome) | M | L | S | Later | One toggle |
| 45 | Feature-flag override, fixture picker, seeded data | M | L | X (host) | Skip | Existing devtools |
| 46 | Time-travel / state devtools | L | L | X (host) | Skip | Existing devtools |
| 47 | Forced-colours / `prefers-contrast` emulation | M | L | X (DevTools/Playwright) | Skip in-page | Hand to agent's `emulateMedia` |
| 48 | Screen-reader simulation | M | L | X (extension) | Skip | Use a real screen reader |
| 49 | Style knobs writing back to source | M | L | X | Skip | Agent's job, not reviewer's |
| 50 | Reactions, assignment, presence, huddles | L | L | X (backend) | Skip | Not for a small team |

### Approach comparison
See the table in [§9](#9-build-approaches). Decision: **(a) vanilla IIFE with Shadow DOM**, published as one file inlinable into artifacts and loadable from cdnjs/jsDelivr, with an optional React adapter (c) for the Vite host and an extension build (d) later for third-party previews.

### MVP / v1 / later

| Tier | Contents | Justification |
|---|---|---|
| **MVP (week one)** | Rows 1–11 plus the three pillars (comment, grade, version) | Every item is an address, an export, or a guardrail; all are `getBoundingClientRect`/`getComputedStyle`/listeners; the agent can act on day-one output |
| **v1 (month one)** | Rows 12–34 | The numbers a judge cannot see (13–15, 20, 28), the states a reviewer cannot reach (25–26, 30), and the reviewer-protection and host-specific enrichments |
| **Later** | Rows 35–44 | Each needs a backend, an iframe crawler, a library whose maintenance was not verified, or a second delivery vehicle |
| **Skip** | Rows 45–50 | Redundant with devtools, impossible in-page, or irrelevant at team size |

Cheap and disproportionately valuable: **row 2 (copy-as-agent-prompt), row 3+4 (state snapshot and link-with-state), row 5 (provenance banner)** — and, as a fourth, row 8 (keyboard-only mode), which costs an hour and forces the review the a11y checklist keeps asking for.

---

## Templates

### (a) Feedback item schema (what copy-as-agent-prompt emits)

```json
{
  "id": "fb_2026-09-02T10:14:03Z_07",
  "kind": "comment | grade | copy-edit | a11y | token-drift | layout-shift",
  "severity": "blocker | high | medium | nit",
  "text": "Card gutters look cramped at this width.",
  "grade": { "pass": false, "reason": "spacing" },
  "address": {
    "route": "/checkout/address",
    "viewport": { "w": 1280, "h": 800, "dpr": 2 },
    "state": "default | empty | loading | error | offline",
    "snapshotId": "snap_1a2b",
    "selector": "[data-testid=address-card] > .card-body",
    "component": "AddressCard (src/components/AddressCard.tsx:42)",
    "rect": { "x": 312, "y": 188, "w": 640, "h": 212 }
  },
  "computed": {
    "padding": "12px 12px", "gap": "8px", "font-size": "14px",
    "color": "#1f2937", "background-color": "#ffffff",
    "contrast": 12.6, "tokens": { "padding": null, "gap": "--space-2", "color": "--text-primary" }
  },
  "evidence": { "console": ["TypeError: … at AddressCard.tsx:57"], "breadcrumbs": ["click [data-testid=edit-address]", "input #postcode"], "layoutShift": null },
  "provenance": { "generator": "claude-code", "model": "…", "skill": "proto-builder@1.4.0", "constructionHash": "…", "version": "artifact v7 | git abc123", "generatedAt": "2026-09-02T09:58:00Z" }
}
```

### (b) Review-session checklist (overlay panel; pairs with the review-request template in design-sdlc/02 §10)

```markdown
Session: <feature> · version <v> · reviewer <name> · started <time> · budget 25 min
[ ] Read the review request; note "feedback wanted" and "not wanted"
[ ] Default state at 1280 / 768 / 375 (iframe switcher)
[ ] Empty · loading · error · offline (state hook / fetch simulation)
[ ] Keyboard-only pass; tab-stop order sane; focus visible
[ ] axe: 0 serious/critical; contrast on primary text and buttons
[ ] On-system rate ≥ target; token misses reviewed
[ ] Pseudo-locale: no truncation or overflow
[ ] Reduced-motion approximation and CVD filter glance
[ ] One problem per comment; grade blind; rationale on every fail
[ ] Export: copy-as-agent-prompt / download JSON; link-with-state pasted into the thread
```

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| Claude Code artifacts — page constraints and connectors | https://code.claude.com/docs/en/artifacts | CSP/CDN allowlist, no backend, connector calls via viewer account, versions, comments | fetched OK | review-and-feedback (host constraints) |
| `@medv/finder` | https://github.com/antonmedv/finder | Shortest unique CSS selector generator, 1.5 KB gzipped, MIT | fetched OK | proposed: overlay building blocks |
| `web-vitals` (attribution build, IIFE) | https://github.com/GoogleChrome/web-vitals | ~3 KB CLS/INP/LCP with attribution; CDN script tag | fetched OK | proposed: overlay building blocks |
| MDN LayoutShift / PerformanceEventTiming | https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift · https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming | Zero-dependency layout-shift and interaction-timing primitives | fetched OK | proposed: overlay building blocks |
| Chromium CVD simulation + DaltonLens SVG filters | https://developer.chrome.com/docs/chromium/cvd · https://daltonlens.org/cvd-simulation-svg-filters/ | Page-wide colour-vision-deficiency filters via feColorMatrix | fetched OK | proposed: overlay building blocks |
| W3C text size in translation | https://www.w3.org/International/articles/article-text-size | IBM expansion table for pseudo-locale | fetched OK | rules (pseudo-locale rule for generated copy) |
| storybook-addon-pseudo-states (archived, merged into Storybook) | https://github.com/chromaui/storybook-addon-pseudo-states | Stylesheet-rewrite technique to force `:hover`/`:focus` | fetched OK | proposed: overlay building blocks |
| react-dev-inspector | https://github.com/zthxxx/react-dev-inspector | Click element → source file via build plugin + middleware (MIT) | fetched OK | proposed: Vite-host adapter reference |
| MDN Shadow DOM / CSP / content scripts | https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM · https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP · https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts | Isolation and delivery constraints for approaches (a)/(d) | fetched OK | rules (overlay guardrails) |
| Liveblocks Comments · Velt | https://liveblocks.io/docs/ready-made-features/comments · https://velt.dev/docs/ | Backend-bound comment SDKs; feature ceiling reference | fetched OK | evaluated but not selected |
| Feedback item schema + session checklist (this doc) | — | JSON emitted by copy-as-agent-prompt; overlay checklist | authored | proposed: templates |

---

## Sources

- https://code.claude.com/docs/en/artifacts
- https://developer.mozilla.org/en-US/docs/Web/API/LayoutShift
- https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEventTiming
- https://github.com/GoogleChrome/web-vitals
- https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- https://developer.mozilla.org/en-US/docs/Web/API/Document/designMode
- https://developer.mozilla.org/en-US/docs/Web/API/Document/fonts
- https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name
- https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/devtools/rendering/emulate-css
- https://developer.chrome.com/docs/chromium/cvd
- https://daltonlens.org/cvd-simulation-svg-filters/
- https://playwright.dev/docs/api/class-page#page-emulate-media
- https://www.w3.org/International/articles/article-text-size
- https://github.com/antonmedv/finder
- https://github.com/zthxxx/react-dev-inspector
- https://github.com/chromaui/storybook-addon-pseudo-states
- https://lit.dev/
- https://lit.dev/docs/tools/publishing/
- https://react.dev/reference/react-dom/components#custom-html-elements
- https://bugzilla.mozilla.org/show_bug.cgi?id=1077064
- https://bugzilla.mozilla.org/show_bug.cgi?id=866522 (search-verified only)
- https://github.com/philc/vimium/issues/4331 (search-verified only)
- https://github.com/hail2u/color-blindness-emulation (search-verified only)
- https://liveblocks.io/docs/ready-made-features/comments
- https://velt.dev/docs/
- Repo-internal, previously verified September 2026: [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) (Vercel, Netlify, Cloudflare, Chromatic, Lovable, Figma Make, Claude Design, v0, Bolt, Agentation, Casso, MarkuprPlus, shot-scraper, storycap), [design-sdlc/00](../design-sdlc/00-synthesis.md), [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md), [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), [eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md), [skill-resources/hooks.md](../../../skill-resources/hooks.md), [skill-resources/review-and-feedback.md](../../../skill-resources/review-and-feedback.md), [skill-resources/guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md).

*Research conducted September 2026. This pass was budget-cut before the four family surveys returned; the following were **not verified in this pass** and are carried as survey hypotheses: Vercel Toolbar's non-comment tools (flags, draft mode, layout-shift tool, interaction timing, a11y audit, visual editing, INP), Netlify Drawer sub-features beyond design-sdlc/02, Shopify theme inspector and Hydrogen profiler, Storybook 9/10 essentials, Chromatic in-Storybook features, Ladle, Histoire, v0/Bolt/Replit/Base44/Google Stitch/Anima/Builder.io Fusion/Onlook/Tempo toolbars, rrweb and all replay SDKs (OpenReplay, PostHog, LogRocket, Sentry Replay, Highlight), html2canvas/snapdom, axe-core size and `exclude` API, Accessibility Insights, APCA package, Pesticide, VisBug, Polypane, Responsively, Sizzy, CSS Stats, Chrome CSS Overview, MSW, Mirage, Storybook args-in-URL, flag toolbars, faker, Driver.js, Shepherd.js, Lost Pixel, Argos, BackstopJS, stagewise, react-grab, Web Speech API, `document.getAnimations`, `size-limit`, Storybook telemetry conventions.*
