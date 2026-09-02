# DOM Anchoring and In-Page Commenting for a Prototype Review Overlay (2026)

**Scope.** This document answers one question: how should a drop-in review overlay let a reviewer comment on elements of a running prototype — the way Vercel Toolbar comments do — so that the comment survives the prototype being regenerated, and what is the current state of the art for doing that. The overlay under consideration must ship as a single JS file that works in (a) no-build HTML artifacts (Claude Code artifacts, static mockups, construction-file builder output) where the CSP allows external scripts only from a handful of CDNs and blocks outbound `fetch`/XHR/WebSocket except to the page's own origin, and (b) Vite/React/Next dev apps, for a small shared team of reviewers. Out of scope: the hosted comment products themselves as *products* (pricing, plan gating, issue-tracker sync) — that is covered in [02 — Feedback on Code Prototypes and Flows](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), and the curated picks for Agentation, Casso, and MarkuprPlus already live in [skill-resources/review-and-feedback.md](../../../skill-resources/review-and-feedback.md). This document goes underneath those: what each layer stores as an anchor, what breaks when the DOM changes, which anchoring and selector libraries exist, how to capture state and evidence in the browser without a server, and which export format an agent should receive. Every claim was checked against the live page in September 2026; sources are marked "fetched OK" or "search-verified only" in the picks table and the closing note.

---

## Table of Contents

1. [How the shipping comment layers anchor and render](#1-how-the-shipping-comment-layers-anchor-and-render)
2. [Open-source click-to-annotate tools for agents](#2-open-source-click-to-annotate-tools-for-agents)
3. [Anchor robustness: selectors, re-anchoring, and source locations](#3-anchor-robustness-selectors-re-anchoring-and-source-locations)
4. [Addressing beyond the element: route, viewport, theme, and UI state](#4-addressing-beyond-the-element-route-viewport-theme-and-ui-state)
5. [Capturing evidence in the browser without a server](#5-capturing-evidence-in-the-browser-without-a-server)
6. [Comment UX patterns and overlay hygiene](#6-comment-ux-patterns-and-overlay-hygiene)
7. [Export formats an agent can consume](#7-export-formats-an-agent-can-consume)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Recommendations: the layered anchor and the re-anchoring order](#9-recommendations-the-layered-anchor-and-the-re-anchoring-order)
10. [Templates](#10-templates)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. How the shipping comment layers anchor and render

### What it is
The commenting layers that already sit on top of running web UIs — platform toolbars (Vercel, Netlify), AI-builder comment modes (Lovable, Figma Make), embeddable comment SDKs (Liveblocks, Velt, Cord), and feedback widgets (Sentry, Hotjar) — and, specifically, what each one stores to remember *where* a comment was placed.

### Why it matters
Whatever the overlay stores as the anchor determines what survives a regeneration. A CSS path dies when the agent rewrites the markup; a screenshot survives everything but can no longer be clicked; an explicit ID survives only if the generator preserves it. Knowing which of these each vendor chose, and how each degrades, is the shortest route to a design that degrades gracefully instead of silently.

### Key findings
- **Vercel Toolbar stores a page path plus a CSS element path, and captures the session, not the state.** Reviewers "click on the page or highlight text to place your comment" ([Vercel Comments overview](https://vercel.com/docs/comments)); the `c` key enters placement mode ([Using Comments](https://vercel.com/docs/comments/using-comments)). The clearest evidence of the stored anchor is in the CLI: `vercel comments inspect` prints the page path (`/checkout — 'Acme Site — Checkout'`) and an element selector of the form `body > main > form > div.promo-container` ([changelog, 20 Aug 2026](https://vercel.com/changelog/manage-vercel-toolbar-comments-from-the-cli)) — a structural CSS path, exactly the kind Playwright warns "can break when the DOM structure changes" (section 3). Per-comment session data is a JSON object with `browserInfo` (UA, browser, engine, OS), `screenWidth`, `screenHeight`, `devicePixelRatio`, and `deploymentUrl` ([Managing Comments](https://vercel.com/docs/comments/managing-comments)); `inspect --context` adds "framework and device details" ([CLI reference](https://vercel.com/docs/cli/comments)). Two documented gaps: "Comments left on pages with query params in the URL may not appear on the page when you visit the base URL," and "Rewrites can cause the recorded path to differ from the browser URL." Nothing in the docs describes re-anchoring when the element path no longer resolves; when a new deployment lands, the toolbar shows a "refresh your view" prompt and comments continue to be listed by page path in the Inbox. Screenshots are optional attachments, and the drag-to-screenshot-a-region gesture needs the browser extension.
- **Netlify Drawer does not anchor to the DOM at all.** Reviewers "take screenshots and add visual or text-based annotations, create screen recordings, and share comments," and the Drawer "appends their browser metadata to their feedback comments or issues" ([Netlify docs](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/)). The anchor is a raster; the comment thread syncs to the PR. This survives any regeneration and can never be re-located programmatically.
- **Lovable pins to the clicked element and documents its own failure mode honestly.** "Each comment pin is anchored to the element you clicked on"; when layouts shift "the pin may lose its reference or attach to the wrong element," and if the element is removed "the comment pin will remain but display an indicator that the original element could not be found" ([Lovable project comments](https://docs.lovable.dev/features/project-comments)). Sending a thread to the agent transmits "the page, the element, and all comments" as structured feedback. This is the only vendor page that spells out the orphan behaviour — copy it.
- **Figma Make anchors to element + version and freezes state as a screenshot.** Clicking an element "captures a screenshot of the element's current state and attaches it to your comment"; every code change is a new version, so the sidebar splits comments into "Current version" and "Other versions"; "while in comment mode, you currently can't interact with the app"; and "some visual details may not appear precisely as shown" because of browser screenshot limits ([Figma help](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make)). The version split is the vendor answer to regeneration: they do not re-anchor, they partition.
- **Liveblocks Comments makes anchoring your problem and gives you a metadata bag.** Thread metadata can hold "any `string`, `boolean`, or `number`" with up to 50 properties of 4,000 characters each ([metadata docs](https://liveblocks.io/docs/ready-made-features/comments/metadata)); `useThreads({ query: { metadata: { ... }, resolved: false } })` filters on it, and "Returned threads must match the entire query" ([React API](https://liveblocks.io/docs/api-reference/liveblocks-react#useThreads)). Their overlay example positions pins from x/y stored in metadata (search-verified only; the example page returned 404 when fetched). There is no built-in element anchor or re-anchoring. Also note the client talks to Liveblocks servers over WebSocket, which the artifact CSP blocks — Liveblocks cannot be the storage layer for case (a).
- **Velt anchors to explicit IDs you put on the element.** Popover comments use `<VeltCommentTool targetElementId="cell-id-1" />`, or the element carries both `id` and `data-velt-target-comment-element-id` "with the same value" ([Velt popover setup](https://velt.dev/docs/async-collaboration/comments/setup/popover)); freestyle mode pins "on any elements on the page or draw area comments" and text mode leaves "text highlights" ([overview](https://velt.dev/docs/async-collaboration/comments/overview)). The stable-ID contract is the same one testing-library and Playwright recommend, and it is the one a generator can be told to honour.
- **Cord's hosted service shut down in August 2024; the SDK is open source and its docs now live on a ThoughtSpot domain.** "In August 2024, as Cord's hosted service folded, the team decided to open source the entire codebase" ([getcord/cord](https://github.com/getcord/cord), Apache-2.0, 108 stars). The documentation is now served from `docs.commentapp.thoughtspot.cloud` (search-verified only; the Location page returned 503 when fetched, and `docs.cord.com` no longer resolves). Cord's anchoring model is worth keeping: a *location* is a flat object of string keys with string/number/boolean values, and an annotation target is any element carrying `data-cord-annotation-location` with a stable serialization of that object; the SDK "remembers the Location object alongside the annotation, and uses it when it's time to render the annotation pin" (search-verified only).
- **Sentry's feedback widget is screenshot-first and uses the screen-capture API.** `enableScreenshot` defaults to `true`, the widget has highlight/hide tools before submission ([configuration](https://docs.sentry.io/platforms/javascript/user-feedback/configuration/)), and screenshot capture "uses `navigator.mediaDevices.getDisplayMedia()` to capture the window" ([Electron guide](https://docs.sentry.io/platforms/javascript/guides/electron/user-feedback/)). That means a browser permission prompt on every capture and no mobile support — relevant to section 5.
- **Hotjar-style widgets are area-selection screenshots.** Hotjar's feedback widget lets users "use the area selection tool to highlight specific elements on the page" and attaches a screenshot (search-verified only). No DOM anchor; nothing to re-anchor.

| Layer | Anchor stored | Survives regeneration? | Re-anchoring | Verified |
|---|---|---|---|---|
| Vercel Toolbar | page path + CSS element path + text selection; session JSON; optional screenshot | Only while the path resolves | Not documented | fetched OK |
| Netlify Drawer | screenshot / recording + browser metadata | Yes (raster) | n/a | fetched OK |
| Lovable | clicked element (mechanism undocumented) | Degrades; shows "could not be found" indicator | None; orphan indicator | fetched OK |
| Figma Make | element + version + element-state screenshot | Partitioned by version | None; version filter | fetched OK |
| Liveblocks | your metadata (string/number/boolean) | Whatever you store | Yours to build | fetched OK |
| Velt | explicit `targetElementId` / data attribute | Yes if IDs preserved | ID lookup | fetched OK |
| Cord (OSS) | flat location object in `data-cord-annotation-location` | Yes if attribute preserved | ID lookup | search-verified |
| Sentry feedback | screenshot via `getDisplayMedia` | Yes (raster) | n/a | fetched OK |

### Open questions
- Vercel's element path is a structural CSS path; does the toolbar fall back to text or position when it fails, or does the pin just vanish? The docs are silent, and the CLI exposes only the stored string.
- Lovable and Figma Make both refuse to re-anchor and instead flag or partition. Is that the right UX for a small team, or does it push every regenerated comment into a "stale" bucket that nobody reopens?

---

## 2. Open-source click-to-annotate tools for agents

### What it is
Tools that let a human click an element in a running app and hand an AI coding agent a machine-readable pointer — Agentation and its ports, react-grab, Drawbridge, stagewise, Pointa, Vibe Annotations, browser-annotations, agentation-vanilla, Redline, ui-annotator-mcp, and Cursor's Design Mode — with attention to what data they emit and how they are loaded.

### Why it matters
These tools have converged on a *payload* in the last eighteen months: selector, bounding box, computed styles, component tree, source file and line. That payload is the de-facto anchor record for agent-bound feedback, and whichever of them can be loaded from a script tag under the artifact CSP is the natural base for case (a).

### Key findings
- **Agentation (React 18+, 4.6k stars, PolyForm Shield 1.0.0)** captures "class names, selectors, and element positions so AI agents can `grep` for the exact code you're referring to," supports click, text selection, drag multi-select, and area selection of "even empty space," and pauses "all animations (CSS, JS, videos) to capture specific states" ([README](https://github.com/benjitaylor/agentation)). Elements "are named by their most identifying feature: text content, alt attributes, or class names"; output has four modes — Compact (selector + note), Standard (+ position, selected text), Detailed (+ bounding boxes, nearby context), Forensic ("everything, including computed styles") ([benji.org/agentation](https://benji.org/agentation)). The product site lists "CSS selectors to grep your codebase, Source file paths to jump directly to the right line, React component tree to understand the hierarchy, Computed styles," and four delivery paths: copy markdown, MCP ("your agent already sees what you're pointing at"), webhooks, API ([agentation.com](https://www.agentation.com/)). A published sample of the markdown (from a third-party write-up, fetched OK):

  ```
  ## Annotation
  - Selector: .sidebar > button.primary
  - Classes: btn, btn-primary, submit-action
  - Position: x: 245, y: 180, width: 120, height: 40
  - Text content: "Submit"
  - Note: "Make this darker and add hover animation"
  ```
  The same write-up says v2.0 added React component detection so output reads `ProductCard > ActionButton` instead of `.css-1a2b3c > div > button` ([Substack](https://reactdevelopment.substack.com/p/how-agentation-cut-claude-code-ui)). Constraint for this stream: React only, desktop only, no script-tag build; the license permits internal use and requires a commercial license for redistribution.
- **Ports fill the framework gaps.** [agentation-vanilla](https://github.com/mearnest-dev/agentation-vanilla) (MIT, 9 stars) loads from a single jsDelivr `gh/` script tag, has "zero dependencies," and captures selector, classes, text, computed styles, and an intent tag (bug/style/feature/content) — the only no-build candidate in this family, though tiny. Svelte 5 ports exist from [Frank-III](https://github.com/Frank-III/agentation-svelte) (15 stars, PolyForm Shield), [mares29](https://github.com/mares29/agentation) (with MCP), [svelteuidev](https://github.com/svelteuidev/agentation), and [sv-agentation](https://github.com/SikandarJODD/sv-agentation) (search-verified only beyond Frank-III).
- **react-grab (7.6k stars, MIT) is the source-location tool.** Hover, `⌘C`, and the clipboard holds `[<a class="ml-auto inline-block text-sm" href="#">Forgot your password?</a> in LoginForm (at components/login-form.tsx:46:19)]` — the element's HTML plus the component stack with file:line:column ([README](https://github.com/aidenybai/react-grab)). It installs via `npx grab@latest init` or a `<Script src="//unpkg.com/react-grab/dist/index.global.js">` tag. Under the hood it uses the author's [bippy](https://github.com/aidenybai/bippy) (1.4k, MIT), which "hacks into React internals" by hooking `__REACT_DEVTOOLS_GLOBAL_HOOK__`, and whose `getOwnerStack` "Returns the symbolicated stack of components that created a Fiber's JSX" — this is how it recovers source locations on React 19 (section 3). Note: unpkg is *not* on the artifact CDN allowlist; the same file is available on jsDelivr `/npm/`.
- **Drawbridge (962 stars, custom source-available license)** is a Chrome extension: "Press C… click an element and leave a note"; each note captures "selector data, element context, bounding boxes, and screenshots"; output is `.moat/moat-tasks.md`, `.moat/moat-tasks-detail.json`, and `.moat/screenshots/`, written into the project folder for Cursor, Claude Code, Codex, and Windsurf to read ([README](https://github.com/breschio/drawbridge)). Redistribution needs a commercial license.
- **stagewise has pivoted.** The repo now describes itself as "The Open Source Agentic IDE" (6.8k stars, AGPLv3) with "Select DOM elements as agent context" as one feature; the fetched docs and README no longer document the toolbar's payload or framework plugins ([repo](https://github.com/stagewise-io/stagewise), [docs](https://docs.stagewise.io/)). The `@stagewise/toolbar` npm page returned 403. Treat the toolbar as unverified for this stream.
- **Pointa (MIT)** — Chrome extension plus `npx pointa serve` local server; each annotation captures "Element CSS selector, Current CSS properties, Source file reference, Annotation text, Optional screenshot," stored in `~/.pointa`, read by the agent over MCP; bug mode adds console errors, network failures, DOM state ([dev.to, 24 Feb 2026](https://dev.to/julien_berthomier_33cb099/i-built-a-chrome-extension-that-lets-you-annotate-localhost-and-have-ai-fix-everything-309m); repo [AmElmo/pointa](https://github.com/AmElmo/pointa), search-verified).
- **Vibe Annotations (source-available, 1,000 users, updated 11 Jul 2026)** — "Every pin captures the exact DOM selector, the React (or Vue) component and source file behind it," plus "styles, positioning and viewport" and auto-screenshots; delivery by clipboard or `npx vibe-annotations-server` MCP ([Chrome Web Store](https://chromewebstore.google.com/detail/vibe-annotations-visual-f/gkofobaeeepjopdpahbicefmljcmpeof), [site](https://www.vibe-annotations.com/)).
- **browser-annotations (9 stars)** — a DevTools extension installed as a Claude skill (`npx skills add wiebekaai/browser-annotations`) that captures "selector, position, size, viewport, and device info" and links to React, Svelte, and Solid source ([repo](https://github.com/wiebekaai/browser-annotations)).
- **Redline** — a Claude Code skill whose overlay is "roughly 600 lines of vanilla JavaScript" loaded from a dev-only `<script>` tag with Fabric.js from a CDN; each annotation records "the CSS selector, the comment… the tag name, classes, and a text preview" to a JSON file the user saves, then `/redline filename.json` ([twiceD, 9 Mar 2026](https://twiced.de/en/articles/visual-ui-feedback-redline-skill/)). Repository and license were not on the page.
- **ui-annotator-mcp (16 stars, MIT)** takes the opposite approach — a reverse proxy on port 7077 that "fetches your page, injects a lightweight annotation script, and serves it back," exposing `get_elements()` and `highlight_element(name)` to the agent ([repo](https://github.com/mcpware/ui-annotator-mcp)). Zero extension, zero build, but a proxy cannot front an artifact URL.
- **Cursor Design Mode is the best-specified payload.** Selecting an element adds "the xpath, the component, attributes, computed styles, and props from the fiber tree" plus a screenshot of "the layout, surrounding elements, and the exact page state"; drawing annotations sit "over a frozen frame of the viewport, so the agent sees the exact page state you were responding to"; multi-select "helps when the change depends on a relationship between elements" ([Cursor docs](https://cursor.com/docs/agent/design-mode)). Not open source, but the shape — identity signal + spatial signal, frozen — is the target.
- **Adjacent, not competitors.** [mesurer](https://github.com/ibelick/mesurer) (474 stars, MIT, React) is rulers, guides, and screenshot regions — measurement feedback, not threads. [element-source](https://github.com/aidenybai/element-source) (447 stars, MIT) is a library, not a tool: `resolveElementInfo(element)` returns tag, component name, file/line/column, and the component stack for React, Preact, Vue, Svelte, and Solid — the building block a framework-agnostic overlay should use. [Plannotator](https://github.com/backnotprop/plannotator) (8.4k, Apache/MIT) annotates plans, diffs, and rendered HTML artifacts (`--render-html`) but is a review surface for agent output, not an in-app overlay. Casso is a desktop screenshot annotator and is already curated.

| Tool | Loads as | Emits | Source loc | Screenshot | License | Verified |
|---|---|---|---|---|---|---|
| Agentation | React component | selector, classes, bbox, text, computed styles, component tree, note | yes (paths) | no (pause instead) | PolyForm Shield | fetched OK |
| agentation-vanilla | script tag (jsDelivr gh) | selector, classes, text, computed styles, intent | no | no | MIT | fetched OK |
| react-grab | script tag / npm | HTML + component stack file:line:col | yes (fiber) | via MCP | MIT | fetched OK |
| Drawbridge | Chrome ext | selector, context, bbox, screenshot → md + JSON | no | yes | source-available | fetched OK |
| Pointa | Chrome ext + local server + MCP | selector, CSS props, source ref, note, screenshot | yes | optional | MIT | search-verified |
| Vibe Annotations | Chrome ext + MCP | selector, component, source file, viewport, screenshot | yes | auto | source-available | fetched OK |
| browser-annotations | DevTools ext + skill | selector, position, size, viewport, device, source | React/Svelte/Solid | optional | not stated | fetched OK |
| Redline | script tag + Fabric.js | selector, tag, classes, text preview, note → JSON | no | canvas drawing | not stated | fetched OK |
| Cursor Design Mode | Cursor app | xpath, component, attributes, computed styles, props + frozen screenshot | yes | yes | proprietary | fetched OK |

### Open questions
- Every tool above targets localhost. None persists annotations *in* the page for a second reviewer to see; the "small shared team" requirement is unserved by all of them.
- The extension-based tools (Drawbridge, Pointa, Vibe, browser-annotations) sidestep the CSP by living outside the page. Is a shared-team review flow better served by an extension than by an injected script, given the artifact constraints?

---

## 3. Anchor robustness: selectors, re-anchoring, and source locations

### What it is
The formal vocabulary for anchors (W3C Web Annotation selectors), the working re-anchoring algorithms (Hypothesis, Apache Annotator), the selector-choice doctrine from testing (Playwright, testing-library), the unique-selector libraries, and the compile-time source-location stamps that let an anchor point at a file and line instead of a DOM path.

### Why it matters
"Survives regeneration" is a re-anchoring problem, and it was solved for text a decade ago. Comments on generated UIs can borrow the multi-selector-with-fallbacks model wholesale, then add the one thing text annotation never had: a source-location anchor that survives because the agent edits the same file.

### Key findings
- **The W3C Web Annotation Data Model already defines the selector set.** `FragmentSelector`, `CssSelector`, `XPathSelector`, `TextQuoteSelector` (`exact`, optional `prefix`/`suffix`), `TextPositionSelector` (`start`/`end`), `DataPositionSelector`, `SvgSelector`, and `RangeSelector` (`startSelector`/`endSelector`). Selectors compose: "A Selector MAY be `refinedBy` 1 or more other Selectors," and "Multiple Selectors SHOULD select the same content, however some Selectors will not have the same precision as others" ([W3C](https://www.w3.org/TR/annotation-model/#selectors)). The model also has a `State` ("the intended state of a resource as applied to the particular Annotation… the information needed to retrieve the correct representation") with `TimeState` and `HttpRequestState`, processed *before* selectors — an under-used hook for section 4.
- **Hypothesis's fuzzy anchoring is the reference implementation of layered fallback.** It stores three selectors per annotation — `RangeSelector` (XPath pairs with offsets), `TextPositionSelector` (global character offsets), `TextQuoteSelector` (exact text plus 32-character prefix and suffix) — and re-anchors in four passes: range, position, "context-first fuzzy matching" on prefix/suffix, then "selector-only fuzzy matching" on the exact text, using "a modified version of the google-diff-match-patch library, which uses the Bitap matching algorithm" ([Hypothesis blog](https://web.hypothes.is/blog/fuzzy-anchoring/)). The current client tries `RangeSelector → TextPositionSelector → TextQuoteSelector` and, for the first two, asserts `range.toString() === quote.exact` and throws on mismatch — so the cheap structural anchors are *validated by the quote* before being trusted ([client source](https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/html.ts)). Annotations that fail every pass become "orphans," shown in a dedicated sidebar tab since client 1.2.0 rather than hidden ([Hypothesis](https://web.hypothes.is/blog/showing-orphaned-annotations/)). The supporting npm packages `dom-anchor-text-quote` and `dom-anchor-text-position` remain published (search-verified only).
- **Apache Annotator is archived.** The incubator repo (Apache-2.0, 778 commits) "was archived on August 13, 2025 and is now read-only" ([repo](https://github.com/apache/incubator-annotator)); its docs URL redirects to the incubator status page and the `@apache-annotator/dom` npm page returned 403. It still documents the cleanest API shape — matchers and describers per selector type, composed with `makeRefinable` — but do not depend on it.
- **Testing doctrine: prefer contracts over structure.** Playwright: "XPath and CSS selectors can be tied to the DOM structure or implementation. These selectors can break when the DOM structure changes"; prefer `getByRole`, `getByText`, `getByLabel`, and `getByTestId` (attribute configurable via `testIdAttribute`) ([locators](https://playwright.dev/docs/locators)); codegen "figure[s] out the best locator, prioritizing role, text and test id locators" and, on ambiguity, "improve[s] the locator… that uniquely identif[ies] the target element" ([codegen](https://playwright.dev/docs/codegen)). testing-library's priority is the same — role first, test IDs "only… for cases where you can't match by text" (search-verified). For a generated prototype the practical translation is: role + accessible name is the most regeneration-proof selector you can compute without cooperation, and `data-testid` is the most regeneration-proof one you can *ask the generator for*.
- **Unique-selector generators are commodity; choose by API, not algorithm.** [@medv/finder](https://github.com/antonmedv/finder) (1.5k stars, MIT, "1.5kb minified & gzipped") generates the shortest unique selector with `root`, `idName`/`className`/`tagName`/`attr` predicates, `seedMinLength` (3) and `optimizedMinLength` (2), and a `timeoutMs` (1000). [css-selector-generator](https://github.com/fczbkk/css-selector-generator) (597 stars, MIT) adds a `blacklist`/`whitelist` of regexes and functions, `selectors` priority order (`id`, `class`, `tag`, `attribute`, `nthchild`, `nthoftype`), and multi-element targeting. [unique-selector](https://github.com/ericclemmons/unique-selector) (272 stars, MIT) is older, with `selectorTypes` and `excludeRegex`. Two properties matter for regeneration: a predicate/blacklist to reject hashed class names (`css-1a2b3c`, Tailwind arbitrary values) and to exclude the overlay's own DOM, and a `root` so selectors are computed against the app container, not `<body>`.
- **Source-location stamping is the anchor that survives a rewrite, and React 19 broke the free version.** React 19 removed `_debugSource` from fibers (PR #28265), which broke react-dev-inspector, locatorjs, code-inspector, click-to-component, and vite-plugin-react-click-to-component; the issues asking for its return ([#32574](https://github.com/facebook/react/issues/32574), [#31981](https://github.com/facebook/react/issues/31981)) are open, and stack-trace approaches "only contain the line number and not exact location." Two workarounds exist:
  - *Compile-time attributes.* [code-inspector-plugin](https://github.com/zh-lx/code-inspector) (3k stars, MIT) injects `data-insp-path` at build time across webpack, vite, rspack/rsbuild, farm, esbuild, turbopack, and mako for Vue, React/Next, Preact, Solid, Qwik, Svelte, and Astro; `pathType` is relative by default, `pathFormat` defaults to `{file}:{line}:{column}`, `hideDomPathAttr` hides it in DevTools, `escapeTags` skips elements, and `server: 'close'` keeps the attribute in a production build ([advanced config](https://inspector.fe-dev.cn/en/api/advance.html)). [react-dev-inspector](https://github.com/zthxxx/react-dev-inspector) (1.3k, MIT) does the same with `data-inspector-relative-path`, `data-inspector-line`, `data-inspector-column` via a Babel/SWC plugin (search-verified for the attribute names; the docs site confirms Vite/Next/Webpack/Rspack/Umi/CRA integrations). [LocatorJS](https://www.locatorjs.com/) uses fiber `_debugSource` or Babel-injected `data-id` for React and the native `data-source` attributes Vue, Svelte, and Solid emit in dev.
  - *Runtime owner stacks.* On React 19 the owner chain (`_debugOwner`) carries creation-site frames; bippy's `getOwnerStack` walks it, and react-grab / element-source ride on that ([bippy](https://github.com/aidenybai/bippy)). bippy's own README warns "This project may break production apps and cause unexpected behavior" and "Production builds may omit source information."
- **Next.js `data-nextjs-source` could not be verified.** Searches for `data-nextjs-source` and `__nextjs_source` returned nothing authoritative; Next.js's own click-to-source uses its dev overlay, not a documented DOM attribute. Do not design around it.
- **URL Text Fragments are a portable text anchor.** `#:~:text=[prefix-,]textStart[,textEnd][,-suffix]` mirrors `TextQuoteSelector` and is supported by Chrome 81+, Edge 83+, Safari 16.1+, and Firefox 131+ (94% global) ([MDN](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments), [caniuse](https://caniuse.com/url-scroll-to-text-fragment)); they fire "only on user-initiated navigations," so they are a share-link format, not a runtime API.

### Open questions
- Hypothesis validates structural anchors against the quote. What is the equivalent validator for a non-text element — tag + role + accessible name, or a hash of the element's outerHTML with volatile attributes stripped?
- Compile-time stamps need the generator's cooperation in case (a). Is it cheaper to make every generator skill emit `data-testid` and a `data-src` attribute than to build fuzzy re-anchoring?

---

## 4. Addressing beyond the element: route, viewport, theme, and UI state

### What it is
Everything a comment must record besides the element: the route, the viewport and breakpoint, the theme, and the transient UI state (open menu, hover, error, mid-animation) that the reviewer was looking at — and whether any shipping tool restores that state rather than merely photographing it.

### Why it matters
[02 — Feedback on Code Prototypes](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) concluded that "none of the platform surfaces anchor a comment to a state." A regenerated prototype rarely breaks the element; it breaks the *way to get to the state*. If the overlay cannot express "with the dropdown open, at 375px, dark theme, after the validation error," the reviewer's comment is unreproducible for the agent that has to act on it.

### Key findings
- **Confirmed: nobody re-enters state. Two tools freeze it, one degrades, the rest ignore it.** Figma Make "captures a screenshot of the element's current state" and forbids interaction in comment mode ([Figma](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make)); Cursor Design Mode annotates "over a frozen frame of the viewport" ([Cursor](https://cursor.com/docs/agent/design-mode)); Vercel records screen size and DPR but not state ([Vercel](https://vercel.com/docs/comments/managing-comments)); Lovable pins to the element and flags loss ([Lovable](https://docs.lovable.dev/features/project-comments)). No fetched page from any vendor describes storing or replaying the interaction that produced the state. The earlier finding stands, with the refinement that *freezing* state (screenshot) is now common and *restoring* it is not.
- **Agentation's animation pause is the one state-capture primitive in the OSS tools.** The README promises to "Freeze all animations (CSS, JS, videos)"; the mechanism is not documented in the fetched pages, but the standard technique is `document.getAnimations().forEach(a => a.pause())` on the Web Animations API, which covers CSS animations and transitions ([cassidoo](https://cassidoo.co/post/pause-css-animation/), search-verified as the general technique, not confirmed against Agentation's source). Freezing JS-driven animation and video requires overriding `requestAnimationFrame` and pausing media elements — do the same three things and the "mid-animation" state becomes annotatable.
- **State-in-URL is the mature pattern for *restoring* state, and the generator can be told to use it.** [nuqs](https://github.com/47ng/nuqs) (10.8k stars, MIT) is "Like `useState`, but stored in the URL query string" for Next.js, React SPA, Remix, React Router, and TanStack Router, with typed parsers (`parseAsString`, `parseAsInteger`, `parseAsBoolean`, `parseAsJson`, `parseAsArrayOf`); modals and tabs as `?modal=…&tab=…` mean "hitting Back closes the modal" (search-verified usage). Storybook has done this for years: `?args=style:rounded;size:100`, limited to "alphanumeric characters, spaces, underscores, and dashes," with `!hex(...)`, `!date(...)` escapes, and "Args specified through the URL will extend and override any default values" ([Storybook](https://storybook.js.org/docs/writing-stories/args)). Note that Vercel's own docs warn comments on URLs with query params "may not appear" at the base URL — the anchor must store the *full* URL including search and hash, and the inbox must match on it.
- **DOM snapshots capture state without cooperation.** [rrweb-snapshot](https://github.com/rrweb-io/rrweb/blob/master/packages/rrweb-snapshot/README.md) serializes the live DOM, "Inline[s] some DOM states into HTML attributes" (input values), turns `<script>` into `<noscript>`, inlines stylesheets, absolutizes URLs, and gives "an id to each Node"; it "can be used on its own to provide a static HTML based 'screenshot'" (search-verified phrasing). A snapshot of the annotated element's ancestor chain is a state record the agent can read as HTML, and it is the only technique that records `:hover`-driven and JS-driven state faithfully without a raster.
- **Viewport and theme are cheap and should always be recorded.** `innerWidth`/`innerHeight`, `devicePixelRatio`, `matchMedia('(prefers-color-scheme: dark)')`, the root element's `data-theme`/`class`, and the active breakpoint name (from the design system, if it exposes one). Vercel records the first three; nobody records theme.
- **The W3C `State` slot is the right place for all of this.** A `SpecificResource` may carry `state` alongside `selector`; the spec's `HttpRequestState` and `TimeState` are the only defined subclasses, but the extension point exists, and an `ext:UiState` with `url`, `viewport`, `theme`, `interactions`, and `snapshot` fits it without inventing a new envelope.

### Open questions
- Recording the interaction sequence (click *this*, hover *that*) is a mini-Playwright trace. Is a recorded sequence of role/name locators worth the complexity, or is "URL + rrweb snapshot + screenshot" enough for a small team?
- When a generator is told to put UI state in the URL, how much of the prototype's state actually fits there — and does the reviewer's comment now break when the *parameter names* are regenerated?

---

## 5. Capturing evidence in the browser without a server

### What it is
Client-side screenshotting of DOM nodes (`html2canvas`, `html-to-image`, `modern-screenshot`, `snapdom`, `dom-to-image-more`) and the real-pixel capture APIs (`getDisplayMedia`, Region Capture, Element Capture), with their limits on cross-origin assets and CSS features under the artifact CSP.

### Why it matters
A screenshot crop is the anchor that never orphans and the evidence the agent's vision model reads. In case (a) there is no server to render one, and outbound requests are blocked, so the capture library must be self-contained and must not need a proxy.

### Key findings
- **DOM-to-image is the only route that works everywhere without a permission prompt, and snapdom is the current best.** [snapdom](https://github.com/zumerlab/snapdom) (8.1k stars, MIT, "dependency-free") exports SVG/PNG/JPG/WebP/canvas/blob, supports shadow DOM, pseudo-elements, `@font-face` embedding (`embedFonts`), backdrop filters, and iframes with caveats; its benchmarks claim 17.5 ms vs html2canvas 178 ms vs html-to-image 429 ms for a 1200×800 view, and 171 ms vs 1,800 ms at 4000×2000 (vendor numbers). Exclusion is declarative — `data-capture="exclude"` "skips a node and its children," `data-capture="placeholder"` swaps in an empty box — plus programmatic `exclude`/`filter` options (search-verified for the attribute names; FEATURES.md). Cross-origin images "require CORS headers" or `useProxy`, and WebKit bug 219770 makes `embedFonts` slow on Safari.
- **html-to-image and its fork remain solid fallbacks.** [html-to-image](https://github.com/bubkoo/html-to-image) (7.2k, MIT) clones the node, copies computed styles including pseudo-elements, inlines fonts and images, wraps in `<foreignObject>`, and rasterizes; a `filter` function excludes nodes; tainted canvases fail; very large DOMs hit data-URI limits. [modern-screenshot](https://github.com/qq15725/modern-screenshot) (2.1k, MIT, "Fork from html-to-image") adds a reusable context and web worker for rapid repeat captures, and admits "Partial embedding will fail due to CORS" and that CSS counters do not clone. [dom-to-image-more](https://github.com/1904labs/dom-to-image-more) (680, MIT, v3.10.1) adds `styleCaching` and flattens open shadow roots, and warns "Safari applies a stricter security model to SVG `<foreignObject>` and has flaky image-decode timing."
- **html2canvas is effectively frozen.** 31.9k stars, 975 open issues, and the latest release is v1.4.1 (the releases page shows 22 January; npm history places it in 2022 — search-verified). It "does not make an actual screenshot, but builds the screenshot based on the information available on the page," needs "a proxy to get the content to the same origin" for cross-origin content, and "each CSS property needs to be manually built," so modern CSS (container queries, `backdrop-filter`, OKLCH) is unsupported; `data-html2canvas-ignore` excludes nodes ([README](https://github.com/niklasvh/html2canvas), [issue #464](https://github.com/niklasvh/html2canvas/issues/464)). Do not pick it for a 2026 overlay.
- **Real-pixel capture is Chrome-only and prompts every time.** Element Capture (`RestrictionTarget.fromElement` + `track.restrictTo`) "is available from Chrome 132 on desktop only," requires `getDisplayMedia({ preferCurrentTab: true })` with a user prompt, only self-capture, and the element must be "eligible": a stacking context (`isolation: isolate`), flattened (`transform-style: flat`), not `display:none`, rectangular ([Chrome](https://developer.chrome.com/docs/web-platform/element-capture), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture)). Region Capture (`CropTarget`/`cropTo`) is Chrome/Edge 104+, Opera 90+, no Firefox (through 158) or Safari, 27% global ([caniuse](https://caniuse.com/wf-region-capture)); it crops by bounding box, so "overlapping content [can be] shown over the top." Sentry accepts the prompt cost because its users capture once; a reviewer placing ten comments will not.
- **The artifact CSP changes the calculus in your favour.** Artifacts "load typefaces from Google Fonts, and scripts from four public CDN hosts: cdnjs, the Tailwind and jQuery CDNs, and selected paths on jsDelivr such as `/npm/`. The CSP blocks every external image and all other external scripts, stylesheets, and fonts, and lets `fetch`, XHR, and WebSocket calls reach only the page's own origin and the Google Fonts hosts" ([Claude Code artifacts](https://code.claude.com/docs/en/artifacts)). Consequences: (1) `useProxy`-style workarounds are impossible; (2) but every image in an artifact is already a data URI, so the cross-origin failure mode of DOM-to-image libraries does not arise; (3) fonts are the residual risk — Google Fonts are same-policy-allowed, so `embedFonts` works; (4) the capture library must come from cdnjs or jsDelivr `/npm/` — snapdom's README points at unpkg, which is blocked, so use the jsDelivr mirror; (5) `localStorage` works and is per-artifact-origin, and same-origin `fetch` is allowed, which is the only persistence path in case (a).

| Library | Stars / license | Mechanism | Exclude own DOM | Cross-origin | Notes | Verified |
|---|---|---|---|---|---|---|
| snapdom | 8.1k / MIT | foreignObject, plugin exporters | `data-capture="exclude"`, `exclude`/`filter` | CORS or `useProxy` | fastest; shadow DOM, pseudo, fonts | fetched OK |
| html-to-image | 7.2k / MIT | foreignObject | `filter(node)` | fails on tainted canvas | stable, slower | fetched OK |
| modern-screenshot | 2.1k / MIT | foreignObject + worker | `filter` (inherited) | "fail due to CORS" | fast repeats | fetched OK |
| dom-to-image-more | 680 / MIT | foreignObject | `filter(node)` | proxy or fail | Safari caveats | fetched OK |
| html2canvas | 31.9k / MIT | CSS re-render to canvas | `data-html2canvas-ignore` | proxy | frozen since v1.4.1 | fetched OK |
| Element Capture | web API | real pixels, self-tab | n/a (captures subtree only) | n/a | Chrome 132+ desktop, prompt | fetched OK |
| Region Capture | web API | real pixels, bbox crop | n/a | n/a | Chrome/Edge 104+, 27% global | fetched OK |

### Open questions
- Figma Make admits its element screenshots are imperfect for "live, interactive content." Is a DOM-to-image crop plus an rrweb snapshot a better evidence pair than a pixel-true screenshot that needs a prompt?
- snapdom v2 introduced plugins and lazy exporters (search-verified); does its jsDelivr build stay CSP-clean, or does it lazy-load exporters from unpkg?

---

## 6. Comment UX patterns and overlay hygiene

### What it is
The interaction vocabulary of in-page commenting — pin, highlight, drag-select, area, text selection; single comment vs. thread; keyboard modes — and the hygiene rules that stop the overlay from polluting the thing it reviews: its own DOM in screenshots, in axe scans, and in the selectors it generates.

### Why it matters
A reviewer who cannot select text, or who accidentally comments on the overlay, produces noise. An overlay that appears in its own screenshots or in the a11y audit corrupts the evidence and the agent's reading of it.

### Key findings
- **Four gestures cover every shipping tool; text selection is the one most overlays skip.** Vercel: click element *or* highlight text, `c` to enter mode, drag to screenshot a region (extension only) ([Vercel](https://vercel.com/docs/comments/using-comments)). Agentation: click, select text, drag multi-select, drag an empty area ([README](https://github.com/benjitaylor/agentation)). Cursor: select, multi-select, draw over a frozen frame ([Cursor](https://cursor.com/docs/agent/design-mode)). Velt: pin, area, text highlight, page-level ([Velt](https://velt.dev/docs/async-collaboration/comments/overview)). Netlify and Hotjar: area on a screenshot. The union — element click, text range, area drag, multi-select, and page-level — is the target; text range is what makes copy feedback anchorable with a `TextQuoteSelector`.
- **Threads are the norm; every vendor starts a thread from one placement.** "Every new comment placed on a page begins a thread" (Vercel); Lovable and Figma Make thread; Liveblocks and Velt are thread-native. Single-shot annotations are the *agent-tool* convention (Agentation, Drawbridge, Pointa) because the consumer is a model, not a person. A shared-team overlay needs threads with `resolved` state; the agent export can flatten them.
- **Keyboard-driven mode switching is expected.** `c` (Vercel, Drawbridge), `⌘C` copy (react-grab), `Option+Shift` / `Alt+Shift` (code-inspector), `Option+Click` (click-to-component). Reserve one key to enter comment mode, `Esc` to leave, and never intercept keys while a form control in the app is focused.
- **Comment mode must not block the app, unlike Figma Make.** "While in comment mode, you currently can't interact with the app" is Figma Make's most-cited limitation; it exists because a click-to-place layer and a click-to-open-menu app compete for the same click. The practical compromise from Cursor and Agentation is freeze-then-annotate: reach the state normally, then enter comment mode, which pauses animations and captures.
- **Hide the overlay from screenshots declaratively and programmatically.** Put the overlay root in a Shadow DOM host so page CSS cannot restyle it and its styles cannot leak (the widget-isolation pattern; search-verified best-practice articles) and mark the host `data-capture="exclude"` (snapdom), `data-html2canvas-ignore` (html2canvas), and pass a `filter` that rejects it (html-to-image family). For agent-run Playwright captures, `page.screenshot({ mask: [...], style: '...', animations: 'disabled' })` masks elements, injects CSS, and freezes animations ([Playwright](https://playwright.dev/docs/api/class-page#page-screenshot)) — the overlay should expose a stable host selector for `mask` or a `style` string that hides it.
- **Hide the overlay from axe and from assistive tech.** axe's context accepts `exclude: '.selector'` and `exclude: { fromShadowDom: ['host', 'inner'] }` for shadow trees ([axe API](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md)). Mark the overlay host `inert` while comment mode is off — `inert` removes an element from focus, clicks, find-in-page, text selection, and "the accessibility tree," and is Baseline since April 2023 ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)); when comment mode is on, the overlay's controls must themselves be accessible (buttons with names), and `aria-hidden` must not be used on anything focusable (axe rule `aria-hidden-focus`, search-verified).
- **Exclude the overlay from selector generation and from event capture.** Use the selector library's `root` (finder) or `blacklist` (css-selector-generator) to bound generation to the app container; hit-test with `document.elementsFromPoint` and skip nodes inside the overlay host; in Shadow DOM, `event.composedPath()` tells you whether a click originated inside the overlay. Reject hashed and utility class names in the predicate so the stored `CssSelector` prefers `[data-testid]`, `id`, role, and semantic classes.

### Open questions
- Should text-range comments store both a `TextQuoteSelector` and the enclosing element's anchor, so the same pin can re-anchor either way?
- Is a "review-only" build of the page (overlay auto-enabled, animations paused) a better shared-team surface than toggling inside the working prototype?

---

## 7. Export formats an agent can consume

### What it is
The formats a comment record can be exported in — Agentation's markdown, W3C Web Annotation JSON-LD, Conventional Comments, and Vercel's `vercel comments --json` — and which one the overlay should emit.

### Why it matters
The consumer is now a coding agent as often as a person ([02 — Feedback](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), theme 2). An export that is simultaneously greppable by the agent, parseable by a script, and readable by a reviewer avoids maintaining three.

### Key findings
- **Agentation markdown is the agent-native lingua franca.** `## Annotation` blocks with `Selector`, `Classes`, `Position`, `Text content`, `Note` lines (section 2) — greppable, no schema, four verbosity levels. Every port and most competitors (agentation-vanilla, Redline, Drawbridge's `moat-tasks.md`, browser-annotations "Copy as markdown") emit a cousin of it. Weakness: no identity, no thread, no status, no version — it is a one-shot handoff, not a record.
- **Web Annotation JSON-LD is the only format with a standard for the anchor.** Required: `@context: "http://www.w3.org/ns/anno.jsonld"`, `id`, `type: "Annotation"`, `target`; optional `body`, `motivation` (`commenting`, `questioning`, `assessing`, `highlighting`, `replying`…) ([W3C](https://www.w3.org/TR/annotation-model/)). Targets carry `source`, `selector` (with `refinedBy`), and `state`; replies are annotations with `motivation: replying` targeting the parent. It is verbose and unfamiliar to agents, but it is the shape Hypothesis, Apache Annotator, and the `dom-anchor-*` packages already read and write.
- **Conventional Comments supplies the label vocabulary, not the envelope.** `<label> [decorations]: <subject>` with `praise / nitpick / suggestion / issue / todo / question / thought / chore / note` and `(blocking) / (non-blocking) / (if-minor)` ([spec](https://conventionalcomments.org/)) — the repo's preferred critique labels; the overlay's UI can offer them as chips and store them as `motivation`-adjacent fields.
- **Vercel's JSON is the reference for a *thread* export.** `vercel comments --json` returns `{ scope, filters, pagination: { nextCursor }, threads[] }`; `inspect --json` returns the thread with a full `messages[]` array; `reply`/`edit` return the message object; `resolve` returns `{ thread, replied }`; errors are `{ error: { code, message } }` ([CLI reference](https://vercel.com/docs/cli/comments)). Per thread the text view shows id, age, author, page path, element selector, excerpt, and reply summary. Vercel's changelog prompt — "Process the comments I left on the site. Run `vercel comments` to get started" — is the workflow the export should enable offline.
- **Recommendation: one JSON record, two renderings.** Store a Web-Annotation-compatible JSON object (section 10) because it is the only shape with a standard `selector`/`state` slot and a reply model; render it to Agentation-style markdown for the agent prompt and to a Vercel-like `{ threads[] }` list for scripts. Label with Conventional Comments. Never make markdown the source of truth — it cannot carry the layered anchor.

### Open questions
- Should the markdown rendering include the rrweb snapshot inline (large) or a path to it? Agents read HTML well, but context windows are finite.
- Vercel's CLI cannot *create* threads. If the overlay writes the same JSON shape, could the agent's fixes be replayed back into the overlay as replies without a server?

---

## 8. Cross-cutting themes

1. **The anchor is a stack, and every vendor picked one layer.** Vercel picked CSS path, Netlify picked raster, Velt picked explicit IDs, Figma Make picked screenshot + version, Liveblocks picked "whatever you store." Hypothesis showed in 2013 that the answer is all of them, tried in order and cross-validated.
2. **Regeneration is the new "document changed."** Text annotation solved orphaning with fuzzy matching and an orphans tab. Generated UIs add a lever text never had: the generator can be *instructed* to emit stable hooks (`data-testid`, source stamps, state in URL). Cooperation is cheaper than cleverness.
3. **Source location is the anchor that survives a rewrite — when you can get it.** React 19 took away the free path; compile-time stamps (code-inspector) and owner stacks (bippy) restore it in dev apps; artifacts have neither unless the generator writes `data-src`.
4. **State is frozen, never restored.** Figma Make and Cursor screenshot the frozen frame; nobody replays the path to the state. URL-encoded state and rrweb snapshots are the two mature techniques the overlay can borrow.
5. **The CSP is a constraint and a gift.** It kills proxies and WebSockets, so no hosted SDK; it also guarantees every image is inline, so DOM-to-image capture just works. Persistence collapses to `localStorage` plus export.
6. **Agent tools converged on the payload; none converged on the record.** Selector + bbox + styles + component + source is universal; identity, thread, status, version, and anchor fallbacks are missing from all of them. That gap is the overlay's job.
7. **Hygiene is a feature.** Shadow DOM isolation, `inert`, `data-capture="exclude"`, axe `fromShadowDom` exclusion, and a bounded selector `root` are the difference between an overlay that reviews the page and one that becomes part of it.

---

## 9. Recommendations: the layered anchor and the re-anchoring order

- **Store a layered anchor per comment, computed at placement time, in Web Annotation shape.** Traceable to: W3C `refinedBy`/multiple-selector guidance (§3), Hypothesis's three-selector store (§3), Vercel's single-path fragility (§1), Lovable's honest orphan indicator (§1).
- **Ask every generator skill for three cooperative hooks:** `data-testid` on interactive and landmark elements (Playwright/testing-library doctrine, Velt's ID contract); a `data-src="file:line:col"` stamp in dev builds (code-inspector's `data-insp-path` for Vite/Next; the generator writes it directly in single-file artifacts); UI state in the URL for modals/tabs/steps (nuqs, Storybook args). Traceable to §3 and §4.
- **Freeze before you place:** pause `document.getAnimations()`, patch `requestAnimationFrame`, pause media; take a snapdom crop with the overlay excluded; take an rrweb-style outerHTML snapshot of the element and its ancestor chain with input values inlined. Traceable to Agentation's pause, Cursor's frozen frame, rrweb-snapshot (§4, §5).
- **Load capture and selector libraries only from cdnjs or jsDelivr `/npm/`, or inline them.** Traceable to the artifact CSP (§5). Prefer snapdom (jsDelivr build) and @medv/finder (1.5 kB, inlineable).
- **Isolate the overlay in a Shadow DOM host marked `inert` when idle and `data-capture="exclude"` always; bound selector generation to the app root; blacklist hashed classes.** Traceable to §6.
- **Export one JSON record; render markdown for the agent and a thread list for scripts; label with Conventional Comments.** Traceable to §7.
- **Show orphans instead of hiding them**, with the screenshot crop as the fallback rendering and a one-click "re-pin here" that rewrites the anchor stack. Traceable to Hypothesis's orphans tab and Lovable's indicator.

**The layered anchor record** (what to compute at placement, in order of cost):

| Layer | Field | How computed | Regeneration resilience | Cost |
|---|---|---|---|---|
| 1 | `route` | full `location.href` incl. search/hash + normalized path | High if state is in URL | trivial |
| 2 | `testId` | nearest `[data-testid]` on element or ancestor, plus child path from it | High if generator preserves it | trivial |
| 3 | `source` | `data-src` / `data-insp-path` / element-source resolution | Highest in dev apps; absent unless stamped | low |
| 4 | `role` | ARIA role + accessible name (+ nth among same role/name) | High (semantic) | low |
| 5 | `quote` | `TextQuoteSelector` of selected text or element text, 32-char prefix/suffix | High for copy; fuzzy-matchable | low |
| 6 | `css` | finder-style shortest unique selector, hashed classes blacklisted, rooted at app container | Medium | low |
| 7 | `xpath` | positional XPath from app root | Low (Vercel-style) | trivial |
| 8 | `bbox` | `getBoundingClientRect()` + scroll offsets + viewport size + DPR | Positional fallback only | trivial |
| 9 | `fingerprint` | hash of outerHTML with volatile attributes stripped; tag; child count | Validator, not locator | low |
| 10 | `state` | theme, viewport, breakpoint, paused animations, rrweb-style snapshot of ancestor chain, interaction notes | Evidence + partial restore | medium |
| 11 | `screenshot` | snapdom crop (element + padding) with overlay excluded, data URI | Absolute (raster) | medium |

**Re-anchoring order** (stop at the first hit that passes validation; validation = fingerprint match *or* role+name match *or* quote match):

| Step | Try | Validate with | On failure |
|---|---|---|---|
| 1 | `route` match (path; then query/hash) | — | Show comment in inbox as "other page"; do not pin |
| 2 | `source` stamp lookup (`[data-src="…"]`) | fingerprint or role/name | continue |
| 3 | `testId` lookup + child path | fingerprint or role/name | continue |
| 4 | `role` + accessible name (+ nth) | fingerprint or quote | continue |
| 5 | `css` selector (unique match only) | fingerprint or quote | continue |
| 6 | `quote` exact, then context-first fuzzy (prefix/suffix), then quote-only fuzzy (Hypothesis order) | — | continue |
| 7 | `xpath` | fingerprint | continue |
| 8 | `bbox` — element at stored point within same viewport bucket | fingerprint or role/name; else mark "approximate" | continue |
| 9 | Orphan: render pin from `screenshot` in an orphans list with "re-pin" | — | keep thread open |

---

## 10. Templates

### (a) Comment record (JSON, Web-Annotation-compatible)

```json
{
  "@context": ["http://www.w3.org/ns/anno.jsonld", { "ext": "https://example.org/review-overlay#" }],
  "id": "urn:uuid:5d0c9f0e-…",
  "type": "Annotation",
  "motivation": "commenting",
  "ext:label": "issue (blocking)",
  "created": "2026-09-02T14:03:11Z",
  "creator": { "name": "Reviewer A" },
  "ext:status": "open",
  "ext:artifactVersion": "v7",
  "body": { "type": "TextualBody", "value": "Promo field loses focus after apply.", "format": "text/plain" },
  "target": {
    "source": "https://…/checkout?step=payment&promo=open",
    "selector": [
      { "type": "ext:SourceSelector", "value": "src/checkout/Promo.tsx:46:19" },
      { "type": "ext:TestIdSelector", "value": "promo-input", "ext:childPath": "" },
      { "type": "ext:RoleSelector", "role": "textbox", "name": "Promo code", "nth": 0 },
      { "type": "TextQuoteSelector", "exact": "Promo code", "prefix": "Discount ", "suffix": " Apply" },
      { "type": "CssSelector", "value": "[data-testid=\"promo-input\"]" },
      { "type": "XPathSelector", "value": "/main[1]/form[1]/div[2]/input[1]" },
      { "type": "FragmentSelector", "conformsTo": "http://www.w3.org/TR/media-frags/", "value": "xywh=412,318,240,40" }
    ],
    "state": {
      "type": "ext:UiState",
      "viewport": { "w": 1280, "h": 800, "dpr": 2, "breakpoint": "lg" },
      "theme": "dark",
      "animationsPaused": true,
      "fingerprint": "sha1:9b1c…",
      "snapshot": "<form …><div …><input data-testid=\"promo-input\" value=\"SAVE10\" …></div></form>",
      "interactions": ["click [data-testid=promo-apply]"]
    }
  },
  "ext:evidence": { "screenshot": "data:image/png;base64,…", "crop": [396, 302, 272, 72] },
  "ext:replies": []
}
```

### (b) Agent-facing markdown rendering (one block per open thread)

```markdown
## Comment 5d0c9f0e — issue (blocking) — open — v7
- Route: /checkout?step=payment&promo=open  (1280×800 @2x, lg, dark)
- Source: src/checkout/Promo.tsx:46:19
- Test id: promo-input
- Role: textbox "Promo code"
- Selector: [data-testid="promo-input"]
- Text: "Promo code"
- Box: x 412, y 318, w 240, h 40
- State: animations paused; after `click [data-testid=promo-apply]`
- Note: Promo field loses focus after apply.
- Evidence: ./review/5d0c9f0e.png · snapshot inline below
```

### (c) Generator contract (add to the prototype-generation skill's rules)

```markdown
- Put `data-testid` on every interactive control, form field, landmark, and repeated card.
- Emit `data-src="<file>:<line>:<col>"` on every JSX/HTML element in dev builds (code-inspector-plugin for Vite/Next; write it directly in single-file artifacts).
- Keep openable UI state in the URL (`?modal=`, `?tab=`, `?step=`) so a comment's route restores it.
- Never rename a `data-testid` when regenerating; add new ones instead.
```

---

## 11. Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| Web Annotation Data Model (selectors, state) | https://www.w3.org/TR/annotation-model/ | Standard vocabulary for layered anchors and reply threads | fetched OK | rules / templates (comment-record schema) |
| Hypothesis fuzzy anchoring + client `anchoring/html.ts` | https://web.hypothes.is/blog/fuzzy-anchoring/ · https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/html.ts | Reference re-anchoring order with quote validation and orphans | fetched OK | proposed: review & feedback tooling (design reference) |
| @medv/finder | https://github.com/antonmedv/finder | 1.5 kB unique-selector generator with root/predicate options | fetched OK | proposed: review & feedback tooling (overlay dependency) |
| css-selector-generator | https://github.com/fczbkk/css-selector-generator | Selector generator with blacklist/whitelist and priority order | fetched OK | proposed: review & feedback tooling (alternative) |
| code-inspector-plugin | https://github.com/zh-lx/code-inspector | Build-time `data-insp-path` source stamps for Vite/Next/webpack, React/Vue/Svelte/Solid | fetched OK | hooks / rules (dev-app source anchoring) |
| element-source | https://github.com/aidenybai/element-source | Runtime source resolution for React/Preact/Vue/Svelte/Solid | fetched OK | proposed: review & feedback tooling (overlay dependency) |
| react-grab | https://github.com/aidenybai/react-grab | Hover + ⌘C copies element + component stack with file:line:col | fetched OK | proposed: review & feedback tooling |
| snapdom | https://github.com/zumerlab/snapdom | Fast DOM-to-image with `data-capture="exclude"`; MIT | fetched OK | proposed: review & feedback tooling (overlay dependency) |
| html-to-image | https://github.com/bubkoo/html-to-image | Stable foreignObject capture with `filter` | fetched OK | proposed: review & feedback tooling (fallback) |
| rrweb-snapshot | https://github.com/rrweb-io/rrweb/tree/master/packages/rrweb-snapshot | Serialize DOM with inlined input state as a "static HTML screenshot" | fetched OK | proposed: review & feedback tooling (state capture) |
| nuqs | https://github.com/47ng/nuqs | Type-safe URL state for React frameworks — generator contract for restorable state | fetched OK | rules (generator contract) |
| Storybook URL args | https://storybook.js.org/docs/writing-stories/args | Precedent for state-in-URL encoding rules | fetched OK | rules (reference) |
| agentation-vanilla | https://github.com/mearnest-dev/agentation-vanilla | Script-tag, zero-dependency annotate-to-markdown for no-build pages | fetched OK | proposed: review & feedback tooling (no-build baseline) |
| Drawbridge | https://github.com/breschio/drawbridge | Chrome extension; selector + bbox + screenshot → `.moat` md + JSON | fetched OK | proposed: review & feedback tooling |
| Pointa | https://github.com/AmElmo/pointa | Chrome extension + local MCP; selector, CSS, source ref, screenshot; MIT | search-verified only (article fetched OK) | mcp-servers |
| Vibe Annotations | https://www.vibe-annotations.com/ | Chrome extension + MCP; selector, component, source, viewport, screenshot | fetched OK | mcp-servers |
| browser-annotations | https://github.com/wiebekaai/browser-annotations | DevTools extension installed as a Claude skill; selector, size, viewport, device, source | fetched OK | skills |
| Cursor Design Mode | https://cursor.com/docs/agent/design-mode | Best-specified element payload (xpath, component, props, styles + frozen screenshot) | fetched OK | reference only (proprietary) |
| Vercel `comments` CLI JSON shapes | https://vercel.com/docs/cli/comments | Thread/message JSON envelope to mirror | fetched OK | already curated; cite shape |
| axe context `exclude` / `fromShadowDom` | https://github.com/dequelabs/axe-core/blob/develop/doc/API.md | Exclude the overlay from a11y scans | fetched OK | rules (overlay hygiene) |
| Playwright `screenshot` mask/style/animations | https://playwright.dev/docs/api/class-page#page-screenshot | Hide overlay and freeze animations in agent captures | fetched OK | hooks (capture recipe) |
| Element Capture / Region Capture | https://developer.chrome.com/docs/web-platform/element-capture · https://caniuse.com/wf-region-capture | Real-pixel capture APIs; Chrome-only, permission-prompted | fetched OK | reference (not recommended) |
| Section-10 templates (this doc) | — | Comment record JSON, markdown rendering, generator contract | authored | proposed: templates |

---

## 12. Sources

- https://vercel.com/docs/comments
- https://vercel.com/docs/comments/using-comments
- https://vercel.com/docs/comments/managing-comments
- https://vercel.com/docs/comments/how-comments-work
- https://vercel.com/docs/cli/comments
- https://vercel.com/changelog/manage-vercel-toolbar-comments-from-the-cli
- https://vercel.com/blog/introducing-commenting-on-preview-deployments
- https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/
- https://docs.lovable.dev/features/preview-toolbar
- https://docs.lovable.dev/features/project-comments
- https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make
- https://liveblocks.io/docs/ready-made-features/comments/concepts
- https://liveblocks.io/docs/ready-made-features/comments/metadata
- https://liveblocks.io/docs/api-reference/liveblocks-react#useThreads
- https://liveblocks.io/docs/ready-made-features/comments
- https://velt.dev/docs/async-collaboration/comments/overview
- https://velt.dev/docs/async-collaboration/comments/setup/popover
- https://github.com/getcord/cord
- https://docs.commentapp.thoughtspot.cloud/reference/location
- https://docs.sentry.io/platforms/javascript/user-feedback/configuration/
- https://docs.sentry.io/platforms/javascript/guides/electron/user-feedback/
- https://www.hotjar.com/updates/en/get-specific-relevant-feedback-with-embedded-widgets
- https://github.com/benjitaylor/agentation
- https://benji.org/agentation
- https://www.agentation.com/
- https://reactdevelopment.substack.com/p/how-agentation-cut-claude-code-ui
- https://github.com/mearnest-dev/agentation-vanilla
- https://github.com/Frank-III/agentation-svelte
- https://github.com/mares29/agentation
- https://github.com/svelteuidev/agentation
- https://github.com/SikandarJODD/sv-agentation
- https://github.com/aidenybai/react-grab
- https://github.com/aidenybai/bippy
- https://github.com/aidenybai/element-source
- https://github.com/breschio/drawbridge
- https://github.com/stagewise-io/stagewise
- https://docs.stagewise.io/
- https://dev.to/julien_berthomier_33cb099/i-built-a-chrome-extension-that-lets-you-annotate-localhost-and-have-ai-fix-everything-309m
- https://github.com/AmElmo/pointa
- https://chromewebstore.google.com/detail/vibe-annotations-visual-f/gkofobaeeepjopdpahbicefmljcmpeof
- https://www.vibe-annotations.com/
- https://github.com/wiebekaai/browser-annotations
- https://twiced.de/en/articles/visual-ui-feedback-redline-skill/
- https://github.com/mcpware/ui-annotator-mcp
- https://cursor.com/docs/agent/design-mode
- https://github.com/ibelick/mesurer
- https://github.com/backnotprop/plannotator
- https://www.w3.org/TR/annotation-model/
- https://web.hypothes.is/blog/fuzzy-anchoring/
- https://web.hypothes.is/blog/showing-orphaned-annotations/
- https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/html.ts
- https://www.npmjs.com/package/dom-anchor-text-quote
- https://github.com/apache/incubator-annotator
- https://playwright.dev/docs/locators
- https://playwright.dev/docs/codegen
- https://testing-library.com/docs/queries/about/
- https://github.com/antonmedv/finder
- https://github.com/fczbkk/css-selector-generator
- https://github.com/ericclemmons/unique-selector
- https://github.com/zh-lx/code-inspector
- https://inspector.fe-dev.cn/en/api/advance.html
- https://github.com/zthxxx/react-dev-inspector
- https://www.npmjs.com/package/@react-dev-inspector/babel-plugin
- https://www.locatorjs.com/
- https://github.com/ArnaudBarre/vite-plugin-react-click-to-component
- https://github.com/facebook/react/issues/32574
- https://github.com/facebook/react/issues/31981
- https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
- https://caniuse.com/url-scroll-to-text-fragment
- https://cassidoo.co/post/pause-css-animation/
- https://github.com/47ng/nuqs
- https://storybook.js.org/docs/writing-stories/args
- https://github.com/rrweb-io/rrweb/blob/master/packages/rrweb-snapshot/README.md
- https://github.com/zumerlab/snapdom
- https://github.com/zumerlab/snapdom/blob/main/FEATURES.md
- https://github.com/bubkoo/html-to-image
- https://github.com/qq15725/modern-screenshot
- https://github.com/1904labs/dom-to-image-more
- https://github.com/niklasvh/html2canvas
- https://github.com/niklasvh/html2canvas/releases
- https://github.com/niklasvh/html2canvas/issues/464
- https://developer.chrome.com/docs/web-platform/element-capture
- https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Element_Region_Capture
- https://developer.mozilla.org/en-US/docs/Web/API/RestrictionTarget
- https://caniuse.com/wf-region-capture
- https://code.claude.com/docs/en/artifacts
- https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- https://playwright.dev/docs/api/class-page#page-screenshot
- https://conventionalcomments.org/

*Research conducted September 2026 via live web search and page fetches. Search-verified only (not fetched, or fetch failed): Cord's relocated docs on the ThoughtSpot domain (503) and `docs.cord.com` (DNS failure); Liveblocks overlay example (404); `@stagewise/toolbar` and `@apache-annotator/dom` npm pages (403); Pointa's GitHub repo (article fetched); react-dev-inspector attribute names (npm page via search); Hotjar area-selection behaviour; `dom-anchor-text-quote`; snapdom `data-capture` attribute names (FEATURES.md via search); html2canvas release year; Agentation's animation-pause implementation; the Svelte ports other than Frank-III. Not verified at all: a Next.js `data-nextjs-source` attribute.*
