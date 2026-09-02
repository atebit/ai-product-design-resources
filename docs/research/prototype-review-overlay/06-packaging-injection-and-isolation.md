# Packaging, Injecting, and Isolating a Prototype Review Overlay (2026)

**Scope.** This document answers one question: how should a review overlay be built and distributed so that *one* package works in a no-build single-file HTML page (Claude Code artifacts, static mockups, construction-file builder output) and in a Vite/React/Next dev app, stays visually and behaviorally isolated from the prototype it reviews, and never ships to production? What the overlay *does* (pins, grades, generation context, the tuning-loop payload) is another document in this stream; the human review surfaces and critique formats are already in [02 — Feedback on code prototypes and flows](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) and the curated picks in [skill-resources/review-and-feedback.md](../../../skill-resources/review-and-feedback.md); the hook mechanics are in [skill-resources/hooks.md](../../../skill-resources/hooks.md); the builder that could inject the overlay is [04 — Deterministic assembly](../prototype-construction/04-deterministic-assembly.md). Those are linked, not repeated. Every claim below was checked against the live page, the npm tarball on jsDelivr, or the shipped bundle in September 2026; "fetched OK" means the page or file was loaded, "search-verified only" means it was seen in search results, and "not verified" means exactly that. Sizes are measured, not quoted. Section 8 (comparable architectures) is folded into the findings and the reference skeleton because the budget for this pass was cut before separate write-ups could be verified.

---

## Table of Contents

1. [How the shipping overlays are injected](#1-how-the-shipping-overlays-are-injected)
2. [Build outputs for dual hosts](#2-build-outputs-for-dual-hosts)
3. [Isolation](#3-isolation)
4. [Not interfering with what it measures](#4-not-interfering-with-what-it-measures)
5. [Gating and safety](#5-gating-and-safety)
6. [Framework adapters](#6-framework-adapters)
7. [Theming and accessibility of the overlay itself](#7-theming-and-accessibility-of-the-overlay-itself)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Recommendations](#9-recommendations)
10. [Templates](#10-templates)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. How the shipping overlays are injected

### What it is
The delivery mechanism each production overlay uses to get its code onto someone else's page: platform-side injection at deploy time, a loader stub plus CDN script, a framework component, a bundler plugin, a browser extension, or a proxy.

### Why it matters
The injection path decides three things at once — whether the overlay can reach a page with no build step, whether it can be kept out of production without discipline, and how much the host page must trust it (CSP, cookies, DOM writes).

### Key findings
- **Vercel Toolbar has four injection paths, and only one is "in the bundle".** It "is enabled by default for all preview deployments" and can be disabled at team, project, or session level ([Vercel Toolbar](https://vercel.com/docs/vercel-toolbar), fetched OK). For production or localhost the `@vercel/toolbar` package exposes `mountVercelToolbar()` (returns a cleanup function), a `VercelToolbar` component from `@vercel/toolbar/next` that "will use `next/script`", a `withVercelToolbar` Next plugin that runs a local dev server on port 43214 to watch the git branch, and an `enableInProduction` option defaulting to `false` (package README, fetched OK via jsDelivr). The docs say "Vercel recommends conditionally injecting the toolbar. Otherwise, all visitors will be prompted to log in" ([add to production](https://vercel.com/docs/vercel-toolbar/in-production-and-localhost/add-to-production), fetched OK). Vite-based frameworks get `vercelToolbar()` from `@vercel/toolbar/plugins/vite` plus `mountVercelToolbar` from `@vercel/toolbar/vite`. The npm entry `dist/index.js` is a 242-byte shim; the UI is fetched at runtime from `vercel.live` — the CSP page lists `script-src https://vercel.live`, `frame-src https://vercel.live`, `connect-src https://vercel.live wss://ws-us3.pusher.com`, and `style-src https://vercel.live 'unsafe-inline'` ([managing toolbar](https://vercel.com/docs/vercel-toolbar/managing-toolbar), fetched OK). The Chrome/Firefox extension "enables the toolbar to detect when you are logged in" and lets any team member use it on "any website hosted on Vercel that your team(s) own" ([browser extension](https://vercel.com/docs/vercel-toolbar/browser-extension), fetched OK). Two kill switches matter for us: the `x-vercel-skip-toolbar` request header ("presence of the header itself triggers Vercel to disable the toolbar") and `VERCEL_PREVIEW_FEEDBACK_ENABLED=0` per branch.
- **Netlify Drawer is injected by the platform, not by you.** It is "enabled for Deploy Previews" by default, must be enabled separately for branch deploys, does not work on deploy permalinks, and "requires a closing `</body>` tag" ([overview](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/), fetched OK). Escape hatches: `?ntl-drawer-state=hidden|visible` (stored per tab) and the `⌘\` toggle; a CSP with `default-src`/`frame-src`/`child-src` needs `app.netlify.com` allowed, which tells you the drawer UI is an iframe ([troubleshooting](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/troubleshoot-the-netlify-drawer/), fetched OK). Netlify staff confirm "CDP is not available on manual deploys" ([forum](https://answers.netlify.com/t/how-to-add-the-netlify-drawer-to-custom-deploy-preview-build/38334), fetched OK); the loader URL `netlify-cdp-loader.netlify.app/netlify.js` is search-verified only.
- **Loader stubs are the no-build pattern that works everywhere.** Sentry's loader is one `<script src="https://js.sentry-cdn.com/<key>.min.js" crossorigin="anonymous">` whose stub buffers `captureException`/`captureMessage`/`addBreadcrumb` until the SDK loads lazily "triggered by … an unhandled error"; `data-lazy="no"` forces it, SRI hashes are published, and CSP needs `script-src https://browser.sentry-cdn.com https://js.sentry-cdn.com` ([Sentry loader](https://docs.sentry.io/platforms/javascript/install/loader/), fetched OK). Intercom's is the same shape — `i.q=[]; i.c=function(args){i.q.push(args)}; w.Intercom=i` then an async script from `widget.intercom.io/widget/APP_ID` ([Intercom](https://developers.intercom.com/installing-intercom/web/installation), fetched OK); PostHog's `!function(t,e){…e._i=[],e.init=…}` queue ([PostHog](https://posthog.com/docs/web-analytics/installation/html-snippet), fetched OK, snippet truncated) and Crisp's "`$crisp.push()` async-safe methods" ([Crisp](https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/), fetched OK) too. Hotjar was not checked. The shared skeleton: a global queue that accepts calls before the real script arrives.
- **Storybook addons register on the manager side, not the preview.** `addons.register(ADDON_ID, () => addons.add(TOOL_ID, { type: types.TOOL, match, render }))` in `manager.ts`, entries declared under `bundler.managerEntries`/`previewEntries` in `package.json`, and users list the package in the `addons` array of `.storybook/main.js` ([writing addons](https://storybook.js.org/docs/addons/writing-addons), [install addons](https://storybook.js.org/docs/addons/install-addons), both fetched OK). The manager runs in a different frame from stories — Storybook is the reference case for iframe isolation.
- **stagewise moved from toolbar to IDE.** The repo now describes "an open source agentic IDE" under AGPLv3, 6.8k stars ([GitHub](https://github.com/stagewise-io/stagewise), fetched OK); the earlier `npx stagewise` flow that "starts a CLI proxy on port 3100 and injects a toolbar into your running app" is search-verified only ([DEV](https://dev.to/bluehotdog/ai-coding-tools-that-actually-see-your-browser-2026-2hoc)) and the quickstart docs returned 404. The proxy-injection idea (wrap the dev server, rewrite HTML) is still worth stealing: nothing enters the app's source tree.
- **Agentation is a React component with portals, no shadow DOM.** `npm install agentation -D`, mount `<Agentation />` beside the app root, React 18+, "Zero dependencies", PolyForm Shield 1.0.0, 4.6k stars ([GitHub](https://github.com/benjitaylor/agentation), fetched OK). The shipped `dist/index.js` (v3.0.2) contains `createPortal` twice, no `attachShadow`, a `data-agentation-root`/`data-agentation-theme` attribute scheme, `pointer-events: none` on 57 rules, and z-indices between 99994 and 100002 (bundle grep, fetched OK). The README gives no dev-only guidance; `-D` plus a conditional render is the implied gate.
- **react-grab is the cleanest dual-host example.** MIT, 7.6k stars, installed either as `<Script src="//unpkg.com/react-grab/dist/index.global.js">` wrapped in `process.env.NODE_ENV === "development"`, or `if (import.meta.env.DEV) { import("react-grab") }` in Vite ([GitHub](https://github.com/aidenybai/react-grab), README fetched OK). The global build uses `attachShadow` (five occurrences), reads `_debugStack`, `_debugOwner`, `_debugSource`, and `__reactFiber` via [bippy](https://github.com/aidenybai/bippy) (fetched OK), which "may break production apps" and notes "Production builds may omit source information". Its `exports` map has `.`, `./core`, `./primitives`, and `./styles.css`; `package.json` fetched OK.
- **code-inspector-plugin and lovable-tagger are compile-time taggers.** code-inspector supports "webpack, vite, rspack/rsbuild, farm, esbuild, turbopack, mako", frameworks from Vue 2 to Astro, MIT, 3.0k stars, hotkeys `Option+Shift` ([GitHub](https://github.com/zh-lx/code-inspector), fetched OK); its core (v2.0.8) writes a `data-insp-path` attribute and has a `hideDomPathAttr` option (dist grep, fetched OK). `lovable-tagger` v1.3.3 (MIT) is "a Vite plugin that automatically adds `data-component-id` attributes to JSX/TSX components", `enforce: "pre"` (README and dist via jsDelivr, fetched OK); the `mode === 'development' && componentTagger()` gate is what Lovable-generated repos ship (search-verified only). How Lovable's toolbar enters its preview iframe is **not verified**.
- **Claude Code artifacts are the hardest host, by design.** "Claude Code wraps the file you publish in an HTML document shell and serves it under a strict Content Security Policy"; scripts load only from "cdnjs, the Tailwind and jQuery CDNs, and selected paths on jsDelivr such as `/npm/`", typefaces from Google Fonts, "the CSP blocks every external image and all other external scripts, stylesheets, and fonts, and lets `fetch`, XHR, and WebSocket calls reach only the page's own origin and the Google Fonts hosts"; pages must be "16 MiB or smaller"; the viewer runs on "a sandboxed `*.claudeusercontent.com` origin"; comments need org sharing ([artifacts docs](https://code.claude.com/docs/en/artifacts), fetched OK). `data-theme="dark|light"` stamping and the `window.claude.*` runtime capabilities (`db`, `user`, `assets`) come from the Artifact tool contract in Claude Code, not the public docs page — treat as tool-verified, not page-verified. Consequence: the overlay must be **inlined** or loaded from jsDelivr `/npm/`, and any "carry context back" channel has to be the artifact's own comment threads or `window.claude` state, not a fetch.

### Open questions
- Vercel's toolbar is an iframe-plus-script hybrid loaded from a first-party host; can a small team afford the same split, or is a single inlined script the only realistic shape?
- The proxy-injection model (stagewise v1) keeps the app clean but needs a running process; is that acceptable for reviewers who only get a URL?

---

## 2. Build outputs for dual hosts

### What it is
Which bundle formats, `exports` conditions, CDN routes, and size budgets let one npm package serve `<script src>` on a static page and `import` in a bundled app.

### Why it matters
A second build for the no-build case is where drift starts. One source, two formats, one version number.

### Key findings
- **Ship IIFE for `<script src>` and ESM for `import`; skip UMD.** Vite library mode takes `build.lib.{entry,name,fileName,formats}` with formats `es`, `umd`, `cjs`, `iife`, and UMD/IIFE need `name` plus `globals` for externals ([Vite build](https://vite.dev/guide/build.html), fetched OK). esbuild's `format: iife` "is intended to be run in the browser", `globalName` "sets the name of the global variable", `platform: browser` (the default) picks IIFE when bundling and adds the `browser` export condition ([esbuild API](https://esbuild.github.io/api/), fetched OK). tsup's options were **not verified** (its docs page returned no content). react-grab's `dist/index.global.js` is exactly this IIFE-for-CDN pattern.
- **`exports` map: types first, `default` last, and order is law.** Node: "key order is significant… earlier entries have higher priority"; `"types"` "should always be included first"; `"browser"`, `"development"`, `"production"` are community conditions and `development`/`production` "must always be mutually exclusive" ([Node packages](https://nodejs.org/api/packages.html), fetched OK). Agentation's shape — `"."` with `import`/`require` each carrying `types` + `default` — is the minimal correct one (package.json fetched OK). A `"development"` condition is tempting for "overlay exists only in dev builds", but bundler support is uneven; the gating in section 5 is more reliable.
- **jsDelivr is the free path to a static page; cdnjs is a gate.** jsDelivr serves `/npm/package@version/file`, ranges like `pkg@3`, or `latest` ("discouraged for production"); static versions are "cached effectively forever", `latest` for 7 days; it resolves `jsdelivr` → `browser` → `main` fields, auto-generates `.min` with source maps, and limits packages to 150 MB and GitHub files to 20 MB ([jsDelivr README](https://github.com/jsdelivr/jsdelivr), fetched OK). The `/+esm` endpoint is **not verified** in this pass. cdnjs requires "800 downloads or more per month" on npm or "normally 200 stars" on GitHub, "at the discretion of cdnjs maintainers", and only libraries that auto-update from npm or git tags ([cdnjs/packages CONTRIBUTING](https://github.com/cdnjs/packages/blob/master/CONTRIBUTING.md), fetched OK). A new small overlay will not clear that bar; on artifacts, jsDelivr `/npm/` is the only CDN we can count on, and inlining is the only path that works offline.
- **Comparable overlays are heavier than you think; the shells are not.** Measured from jsDelivr tarballs (gzip -6): Agentation `dist/index.js` 709 KB raw / **120.5 KB gz**; react-grab `dist/index.global.js` 309 KB / **99.3 KB gz**; Preact 10.29.8 `preact.min.js` 11.3 KB / **4.8 KB gz**; solid-js `dist/solid.js` (unminified) 52 KB / 12.4 KB gz; `lit/index.js` is a re-export and could not be measured this way. Both shipping review tools weigh roughly 100–120 KB gzipped, most of it UI and hit-testing, not a framework. A budget of **≤ 40 KB gz inlined** for our core is realistic if the UI layer is Preact-sized or vanilla, and it leaves room under the 16 MiB artifact cap even with data-URI screenshots.
- **Zero-dependency vs. a small runtime.** Agentation is zero-dependency React (peer only); react-grab bundles bippy and its own renderer into the global build. For a package that must run where React may not exist (a static HTML mockup), the UI runtime has to be inlined or vanilla — a peer dependency on React disqualifies the single-file case.
- **Inlining at generation time is the artifact answer.** Because the artifact CSP allows inline scripts (the page itself is inline JS) but blocks unknown hosts, the generator — a Claude Code skill or the section-10 hook — appends the IIFE as a `<script>` before `</body>`. Netlify's "closing `</body>` tag" requirement is the same constraint from the other side.

### Open questions
- Should the IIFE embed its CSS as a string (one file, works inline) or ship `styles.css` separately (cacheable, but a second request and a stylesheet-host CSP problem on artifacts)? The artifact CSP answers this: embed.

---

## 3. Isolation

### What it is
Keeping the overlay's styles, DOM, events, focus, and shortcuts from leaking into the prototype — and the prototype's from leaking into the overlay.

### Why it matters
A review overlay that inherits the prototype's `button` styles, or whose modal traps the prototype's keyboard, is reviewing itself.

### Key findings
- **Shadow DOM, open mode, one host element.** MDN: "The page CSS does not affect nodes inside the shadow DOM" and "shadow DOM styles don't affect elements in the rest of the page"; only `dir` and `lang` are inherited from the host; closed mode merely returns `null` from `shadowRoot` and "you should not consider this a strong security mechanism" ([Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM), fetched OK). Open mode keeps axe-core and Playwright able to see inside (section 4). Styles go in via `adoptedStyleSheets = [sheet]` after `sheet.replaceSync(css)` — parsed once, shared across hosts. Inherited properties (`color`, `font`) still cross the boundary, so the root inside the shadow needs an explicit reset.
- **Every shipping dev overlay uses a custom element hosting an open shadow root.** Vite: `overlayId = 'vite-error-overlay'`, `this.root = this.attachShadow({ mode: 'open' })`, `z-index: 99999` on `:host` and `.backdrop`, `position: fixed`, closes on Escape and outside click, guarded by `if (customElements && !customElements.get(overlayId))` ([overlay.ts](https://github.com/vitejs/vite/blob/main/packages/vite/src/client/overlay.ts), fetched OK). Next.js: `shadow-portal.tsx` does `return createPortal(children, shadowRoot)`, with the shadow root created in `dev-overlay.browser.tsx` under a `nextjs-portal` element (file located by code search; contents partially read). Hypothesis puts its annotator UI in a shadow root via `createShadowRoot`, loads `annotator.css` into it, and works around `@property` not registering inside shadow trees by copying those declarations to a top-level `CSSStyleSheet` ([shadow-root.ts](https://raw.githubusercontent.com/hypothesis/client/main/src/annotator/util/shadow-root.ts), fetched OK) — a real gotcha if the overlay uses registered custom properties. react-grab attaches shadow roots; Agentation does not and instead scopes with `data-agentation-*` attributes and very high z-indices.
- **Reset inside the shadow, but not with `all: initial`.** `all` resets every property "except `unicode-bidi`, `direction`, and CSS Custom Properties"; `initial` makes a block element inline and its color black, `unset` keeps inherited values, `revert` "rolls back the cascade to the user level… as if no author-level rules were specified" ([MDN `all`](https://developer.mozilla.org/en-US/docs/Web/CSS/all), fetched OK). Inside a shadow root, page author rules do not apply anyway; the only leak is inheritance, so the practical reset is `:host { all: initial; display: contents }` on the host plus explicit `font`/`color`/`line-height` on the overlay root — not `all: initial` on every node.
- **Custom properties leak through on purpose.** Because `all` leaves custom properties alone, the host page's `--color-*` tokens are readable inside the shadow — useful for theming (section 7), dangerous if the overlay's own `--ov-*` names collide. Prefix everything.
- **Stacking: one fixed host at the end of `<body>`, `z-index` at the ceiling, and a note that it is not enough.** Vite uses 99999; Agentation 99994–100002. A prototype that creates its own stacking context with `transform` or `filter` on `body` can still bury a fixed overlay; the mitigation is to append the host to `document.documentElement` when `body` has a transform, and to use the top layer (`<dialog>.showModal()` or `popover`) for modal surfaces, since "modal `<dialog>`s generated with `showModal()` escape inertness" and sit in the top layer ([MDN inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert), fetched OK).
- **Hit-testing without stealing clicks.** Agentation's 57 `pointer-events: none` rules and react-grab's `pointer-events:none` canvas show the pattern: the highlight layer is transparent to the pointer; the overlay listens for `pointermove`/`click` at the *document* in capture phase only while "select mode" is on, calls `preventDefault()`/`stopPropagation()` for that one click, and uses `document.elementFromPoint` or the event's `composedPath()[0]` to find the target. `composedPath()` "does not include nodes in shadow trees if the shadow root was created with its `ShadowRoot.mode` closed" ([MDN composedPath](https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath), fetched OK) — another reason for the *overlay* to be open and for the prototype's own closed shadow roots to be treated as opaque anchors.
- **Focus and keyboard: `inert` on the page, APG rules in the panel.** `inert` elements "cannot be focused", "do not have `click` events fired", are "not searchable via browser find-in-page" and "hidden from assistive technologies"; Baseline "since April 2023" (MDN, fetched OK). Set `inert` on the prototype's root(s) — not on `body`, or the overlay host goes inert too — while a comment dialog is open. The dialog itself follows APG: Tab "moves focus to the next tabbable element inside the dialog… If focus is on the last tabbable element… moves focus to the first", Escape closes, "When a dialog opens, focus moves to an element inside the dialog", and on close "focus returns to the element that invoked the dialog" ([APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), fetched OK). Keyboard shortcuts: use a chord the host is unlikely to own (Netlify chose `⌘\`, code-inspector `Option+Shift`), make it configurable (Vercel lets users record shortcuts), and never bind single letters.
- **React inside a shadow root works since React 17 — because delegation moved.** React 17 "will no longer attach event handlers at the `document` level. Instead, it will attach them to the root DOM container into which your React tree is rendered" ([React 17 RC](https://legacy.reactjs.org/blog/2020/08/10/react-v17-rc.html), fetched OK). With `createRoot(nodeInsideShadow)` the listeners sit inside the boundary, so retargeting is a non-issue; the older `react-shadow-dom-retarget-events` workaround (search-verified only) predates this. [ReactShadow](https://github.com/Wildhoney/ReactShadow) (fetched OK) wraps this with a `styleSheets` prop of `CSSStyleSheet` instances. Next.js's `ShadowPortal` is the same idea with `createPortal`.
- **The iframe alternative: overlay outside, prototype inside.** Hypothesis renders the sidebar app in an `<iframe>` (`createSidebarIframe` in `sidebar.tsx`, fetched OK) and keeps only the thin annotator in-page; Netlify's drawer is an `app.netlify.com` frame; Storybook's manager drives the preview frame. Cross-origin frames cannot read the prototype's DOM, so element selection must run *inside* the frame and report over `postMessage` — "Always specify an exact target origin, not `*`" and "always verify the sender's identity using the `origin`" ([MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage), fetched OK). For our hosts this is the wrong default: an artifact *is* already a sandboxed frame on `*.claudeusercontent.com` and cannot host a second app, and a dev server serves same-origin HTML that a shadow root isolates well enough. Reserve the iframe design for reviewing third-party URLs.

### Open questions
- `@property` registrations inside shadow trees (the Hypothesis workaround) — does the overlay need registered properties at all, or can it avoid them?
- Which surfaces should use the top layer (`popover`) versus the shadow host? The top layer sidesteps z-index wars but complicates focus return.

---

## 4. Not interfering with what it measures

### What it is
Making sure screenshots, accessibility audits, session replay, and DOM diffs see the prototype and not the overlay.

### Why it matters
Grades and captures that include the review chrome are wrong, and the tuning loop learns from them.

### Key findings
- **One root, one attribute, many excluders.** Every capture tool has a hook; give the overlay host a stable id (`#pr-overlay`), a class (`rr-block`), and a data attribute (`data-html2canvas-ignore`), and the exclusions become one-liners:

| Tool | Mechanism | Verified |
|---|---|---|
| html2canvas | `ignoreElements: (el) => …` predicate, or `data-html2canvas-ignore` attribute | [fetched OK](https://html2canvas.hertzen.com/configuration) |
| modern-screenshot | `filter?: (el: Node) => boolean` — "Excluding node means excluding its children as well" | [fetched OK](https://raw.githubusercontent.com/qq15725/modern-screenshot/main/src/options.ts) |
| Playwright | `page.screenshot({ mask: [locator], maskColor, style })` — `maskColor` since v1.34, `style` (CSS applied during capture) since v1.41 | [fetched OK](https://playwright.dev/docs/api/class-page#page-screenshot) |
| axe-core | context `{ exclude: '#pr-overlay' }`; `fromShadowDom` / `fromFrames` selectors; "works on the virtual DOM and open Shadow DOM" | [fetched OK](https://github.com/dequelabs/axe-core/blob/develop/doc/API.md) |
| rrweb | `blockClass` (default `rr-block`) — "will replay as a placeholder with the same dimension"; `blockSelector`; `ignoreClass`; `maskTextClass` | [fetched OK](https://github.com/rrweb-io/rrweb/blob/master/guide.md) |
| Vercel Toolbar (own precedent) | `x-vercel-skip-toolbar` header for E2E; Netlify `?ntl-drawer-state=hidden` | fetched OK |

- **No `data-axe-ignore` exists.** axe-core's exclusion is the `context` argument, not an attribute; the overlay should expose `getExcludeSelectors()` so the audit hook in [hooks.md](../../../skill-resources/hooks.md) (Recipe 4) passes them.
- **Playwright `style` beats `mask` for our case.** `mask` paints a box over the region; `style: '#pr-overlay{display:none!important}'` removes it. Pair with the overlay's own URL flag (section 5) so automation never loads it at all — the Vercel header model.
- **DOM diff and selector generation must skip the subtree.** Whatever generates anchors (CSS path, `data-insp-path`, `data-component-id`) must ignore nodes whose `composedPath()` includes the overlay host; open shadow roots make that check cheap.

### Open questions
- Should the overlay self-hide on `document.visibilityState` changes or `navigator.webdriver === true`? The latter is a strong "automation is running" signal and costs nothing.

---

## 5. Gating and safety

### What it is
Every switch that decides whether the overlay loads: build-time constants, deployment environment, URL and storage flags, hostname allowlists, a kill switch, and the CSP/SRI/Trusted Types rules it must survive.

### Why it matters
"Never ships to production" is not one check; it is a build-time exclusion *and* a runtime refusal, because the single-file path has no build step to exclude anything.

### Key findings
- **Build-time: `import.meta.env.DEV`, `process.env.NODE_ENV`, Vite `apply: 'serve'`.** Vite's `DEV` is "always the opposite of `import.meta.env.PROD`" and `MODE` follows `--mode` ([Vite env](https://vite.dev/guide/env-and-mode.html), fetched OK); a plugin with `apply: 'serve'` never runs in `vite build` ([plugin API](https://vite.dev/guide/api-plugin.html), fetched OK). Next.js "automatically assigns `development` when running the `next dev` command, or `production` for all other commands", and only `NEXT_PUBLIC_` variables are inlined for the browser ([Next env](https://nextjs.org/docs/app/guides/environment-variables), fetched OK). react-grab's `if (import.meta.env.DEV) import("react-grab")` and Vercel's `process.env.NODE_ENV === 'development' || isUserEmployee` are the canonical forms.
- **Deployment environment: preview yes, production no.** Vercel exposes `VERCEL_ENV` as `production`, `preview`, or `development` (and `VERCEL_TARGET_ENV` for custom environments) at build and runtime ([system env vars](https://vercel.com/docs/environment-variables/system-environment-variables), fetched OK); Netlify's `CONTEXT` is `production`, `deploy-preview`, `branch-deploy`, or `dev` ([Netlify env](https://docs.netlify.com/build/configure-builds/environment-variables/), fetched OK). Vercel's own toolbar decision is a dashboard toggle per environment (Preview/Production, team default with project override) plus the branch variable — the overlay should read one build-time boolean (`__PR_OVERLAY__`) derived from these, not sniff hostnames at runtime.
- **Runtime: URL flag, storage flag, allowlist, kill switch.** Vercel's toolbar "is sleeping" until clicked; Netlify persists `ntl-drawer-state` "within the browser's storage for this tab only". The same layering works for us: `?review=1` arms, `sessionStorage` remembers, a hostname allowlist (`localhost`, `*.vercel.app`, `*.netlify.app`, `*.claudeusercontent.com`) is the default, and a `window.__PR_OVERLAY_DISABLE__ = true` or `<meta name="pr-overlay" content="off">` is the kill switch a generator can set. Sentry's `enabled: false` "doesn't prevent all overhead" and the docs prefer conditionally calling `Sentry.init` ([Sentry options](https://docs.sentry.io/platforms/javascript/configuration/options/), fetched OK) — same lesson: the strongest gate is not loading.
- **CSP: no `eval`, no inline handlers, nonce or hash for inline, SRI for CDN.** With `script-src` set, "inline JavaScript will not be allowed… unless extra measures are taken", `eval()` is blocked, `'unsafe-inline'` "defeats much of the purpose", a `nonce` is "the recommended approach", "if a directive contains nonce or hash expressions, then the `unsafe-inline` keyword is ignored", and `'strict-dynamic'` lets a nonced loader inject further scripts ([MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP), fetched OK). SRI: `integrity="sha384-…"` with `crossorigin="anonymous"` mandatory for cross-origin, generated with `openssl dgst -sha384 -binary | openssl base64 -A` ([MDN SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity), fetched OK). Vercel's toolbar needs `style-src … 'unsafe-inline'`; ours should not — `adoptedStyleSheets` are not subject to `style-src` inline restrictions the way `<style>` text is (**not verified** in this pass; test it).
- **Trusted Types will bite string-built DOM.** `require-trusted-types-for 'script'` makes `innerHTML` "only accept non-spoofable, typed values… and reject strings", is "Baseline 2026 — Newly available… since February 2026" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for), fetched OK); Intercom's widget broke under it in March 2025 (search-verified only). Build the overlay DOM with `createElement`/`textContent` or a tiny `h()` helper, never `innerHTML` — the same rule Trusted-Types-clean sites impose on everyone.

### Open questions
- Is a hostname allowlist a false comfort once the overlay is inlined into a static file that can be copied anywhere? The kill-switch meta tag and a "this page is a review build" banner may matter more.

---

## 6. Framework adapters

### What it is
What a React/Vue/Svelte wrapper adds beyond the vanilla core, what survives production builds, and how dev-only injection hooks look in Vite and Next.

### Why it matters
Component names and source paths are the difference between "the blue button" and `src/components/Checkout/PayButton.tsx:42` in the tuning-loop payload — and they are exactly what production builds and React 19 strip.

### Key findings
- **React 19 removed `_debugSource`; every source-mapping tool broke.** Issue #32574: removed in PR #28265, "`_debugStack` isn't a viable replacement… cannot parse for path on filesystem", affected tools include react-dev-inspector, locatorjs, code-inspector, and click-to-component; the earlier request #31981 "received no response from the React team" ([#32574](https://github.com/facebook/react/issues/32574), [#29092](https://github.com/facebook/react/issues/29092), both fetched OK; #29092 closed as not planned). react-grab reads `_debugStack`/`_debugOwner`/`_debugSource` all three (bundle grep) to cover versions; bippy warns "Production builds may omit source information".
- **Therefore: tag at compile time, read at runtime.** The three taggers agree: react-dev-inspector's babel/swc plugin writes `data-inspector-line/column/relative-path` and its `<Inspector/>` reads them ([GitHub](https://github.com/zthxxx/react-dev-inspector), fetched OK); code-inspector writes `data-insp-path`; lovable-tagger writes `data-component-id`. Component *names* in production are minified unless a displayName plugin restores them (search-verified only); the React Compiler is "stable" and its docs say nothing about renaming components ([React Compiler](https://react.dev/learn/react-compiler/introduction), fetched OK) — but it is a build step, and review builds should not be production builds anyway. Fiber walking is a dev-only bonus, not the anchor.
- **Vite adapter = `transformIndexHtml` with `apply: 'serve'`.** The hook returns `HtmlTagDescriptor[]` — `{ tag, attrs, children, injectTo: 'head' | 'body' | 'head-prepend' | 'body-prepend' }`, default `head-prepend`; `order: 'pre'` if the injected script must go through Vite's pipeline (Vite plugin API, fetched OK). That is the whole Vite adapter; the tagger (lovable-tagger or code-inspector) is a second, optional plugin.
- **Next adapter = `next/script` in the root layout, client-gated.** Strategies: `beforeInteractive` (must be in a root layout, "always be injected inside the `head`"), `afterInteractive` (default), `lazyOnload` ("chat support plugins, social media widgets"), `worker` (experimental, pages only); `onLoad`/`onReady` are client-component-only ([next/script](https://nextjs.org/docs/app/api-reference/components/script), fetched OK). Vercel's own `VercelToolbar` uses `next/script` behind a `'use client'` `StaffToolbar` in a `<Suspense>` in `app/layout.tsx` — copy that shape with `process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview'`.
- **Stay framework-agnostic at the core.** The core takes a DOM root and an optional `describe(el) => { name?, source? }` resolver; React/Vue/Svelte adapters only supply the resolver (from data attributes first, fiber/`__vue__`/component metadata second) and a mount helper. Vue and Svelte equivalents of the taggers exist in code-inspector's matrix (fetched OK); their runtime internals were not researched.

### Open questions
- With the React 19 gap unresolved, is it worth carrying fiber code at all, or should the React adapter be tagger-only?

---

## 7. Theming and accessibility of the overlay itself

### What it is
The overlay's own appearance and operability across light/dark, forced colors, reduced motion, keyboard, and screen readers.

### Why it matters
The overlay is used by the same small team that grades prototypes for accessibility; it cannot be the least accessible thing on the page.

### Key findings
- **Theme from the host, twice.** Artifacts stamp `data-theme` on the root when the viewer chooses, and rely on `prefers-color-scheme` otherwise (tool contract; not on the public docs page). Inside the shadow root, `:host-context([data-theme="dark"])` is not universally supported; the portable way is to read `document.documentElement.dataset.theme` and `matchMedia('(prefers-color-scheme: dark)')` in JS, set `data-theme` on the overlay host, and key the shadow CSS off `:host([data-theme="dark"])`. Agentation ships a `data-agentation-theme` attribute for exactly this (bundle grep).
- **Forced colors: opt out only where it breaks.** Under `forced-colors: active` "the browser provides the color palette… through the CSS system color keywords"; `forced-color-adjust: none` restores author styles and disables the text backplate ([MDN forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors), fetched OK). Pins and highlight boxes should use `Highlight`/`CanvasText` in that mode rather than opting out wholesale.
- **Reduced motion.** `@media (prefers-reduced-motion: reduce)` overrides "with the same specificity but coming later in the CSS source order" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), fetched OK); the highlight lerp react-grab animates (`lerpFactor` in its bundle) should collapse to a snap.
- **ARIA for pins and the panel.** The panel is a `role="dialog"` with `aria-modal="true"` and `aria-labelledby` (APG, fetched OK); each pin is a `<button>` whose accessible name is "Comment 3 on <element name>", grouped in a `role="list"`; the page root gets `inert` while the dialog is open so the prototype's focus order is untouched (section 3). Netlify's drawer and Vercel's toolbar both expose a keyboard toggle; ours should expose one that also announces state via `aria-pressed`.

### Open questions
- Screen-reader users reviewing a prototype need the overlay *and* the page in the tree at once; `inert` on the page during a dialog is right, but should pins be reachable without opening a dialog?

---

## 8. Cross-cutting themes

1. **Inline is the lowest common denominator.** Artifacts allow inline JS and four CDNs; static mockups have no build; Netlify needs a `</body>`. An IIFE appended before `</body>` reaches every host; everything else (ESM, plugins, components) is an adapter over it.
2. **The gate must exist twice.** Build-time exclusion (`apply: 'serve'`, `NODE_ENV`, `VERCEL_ENV`) for apps; runtime refusal (hostname, flag, kill switch) for files that have no build. Vercel, react-grab, and lovable-tagger each only do one of these; we need both.
3. **Open shadow root, custom element, top-of-body host — the shared skeleton.** Vite, Next, react-grab, and Hypothesis converge on it; Agentation's attribute-scoped alternative shows what you pay without it (z-index arithmetic and hundreds of `pointer-events` rules).
4. **Anchors come from compile-time tags, not runtime internals.** React 19 settled it; `data-*` written by a Vite/babel plugin is the durable anchor, fiber names are decoration.
5. **Be invisible to instruments by construction.** One root, one class, one attribute; expose the exclude selectors; respect `navigator.webdriver`.
6. **Weight is a choice.** The two shipping review tools are ~100–120 KB gz; a Preact-sized or vanilla core can be a quarter of that, which matters when it is inlined into every generated file.

---

## 9. Recommendations

- **Build one vanilla-TypeScript core** with an `h()` DOM helper (no `innerHTML`, Trusted-Types-safe), a custom element `<pr-overlay>` hosting an open shadow root, `adoptedStyleSheets` with embedded CSS, and a queue-stub global `window.prOverlay = window.prOverlay || { q: [] }` so pages can configure before the script loads (the Sentry/Intercom pattern).
- **Emit two formats from one source** with Vite library mode or esbuild: `dist/pr-overlay.iife.js` (`globalName: 'PrOverlay'`, CSS embedded) and `dist/index.js` ESM, with `exports` `{ types, import, require/default }` and `"jsdelivr": "dist/pr-overlay.iife.js"` so `https://cdn.jsdelivr.net/npm/pr-overlay@X.Y.Z` resolves to the global build. Pin versions; never `latest`; publish SRI hashes in the README. Do not apply to cdnjs until the 800-downloads/200-stars bar is met.
- **Gate twice:** `__PR_OVERLAY__` compile-time constant (true only under `vite serve`, `next dev`, `VERCEL_ENV=preview`, `CONTEXT=deploy-preview`) and a runtime `shouldMount()` that checks `navigator.webdriver`, the meta kill switch, the hostname allowlist, and `?review=1`/`sessionStorage`.
- **Isolate with `inert`, the top layer, and open shadow;** expose `PrOverlay.excludeSelectors()` for axe, Playwright `style`, html2canvas, and rrweb (`rr-block` on the host).
- **Adapters are thin:** a Vite plugin (`apply: 'serve'`, `transformIndexHtml`), a Next `<Script strategy="lazyOnload">` client component in the root layout, and a React resolver reading `data-component-id`/`data-insp-path` before fibers.
- **For artifacts and builder output, inline at generation** via the skill/hook in section 10; size-budget the IIFE at ≤ 40 KB gz.

### Packaging decision table

| Host | Delivery | Gating | Isolation |
|---|---|---|---|
| Claude Code artifact (single HTML, strict CSP) | IIFE inlined before `</body>` by the generating skill/hook; or `<script src="https://cdn.jsdelivr.net/npm/pr-overlay@X.Y.Z" integrity crossorigin>` | Runtime only: meta kill switch, `data-theme` read, `window.claude` presence as "review build" signal; never fetches | Open shadow root; `inert` on `#app`; comments persist via artifact threads or `window.claude` state |
| Static mockup / construction-file builder output | IIFE appended by the builder ([04-deterministic-assembly](../prototype-construction/04-deterministic-assembly.md) already proposes a query-param-toggled prototype chrome) | `?review=1` + hostname allowlist; builder writes `<meta name="pr-overlay" content="off">` for export builds | Same |
| Vite app (dev) | Vite plugin `transformIndexHtml` injecting `<script type="module">` from `node_modules`, `apply: 'serve'` | `import.meta.env.DEV`; plugin absent from build | Same; optional lovable-tagger/code-inspector tagger for anchors |
| Next.js app (dev + preview) | `'use client'` component rendering `<Script strategy="lazyOnload">` in `app/layout.tsx` inside `<Suspense>` | `NODE_ENV === 'development' \|\| NEXT_PUBLIC_VERCEL_ENV === 'preview'`; `x-pr-overlay-skip` header honored by middleware for E2E | Same |
| Vercel/Netlify preview (any framework) | Same script, or defer to the platform toolbar for comments and ship only the grading panel | `VERCEL_ENV=preview` / `CONTEXT=deploy-preview` at build | Same; coexist with Vercel Toolbar by leaving 99999+ to them and using the top layer |
| Storybook | Addon: `manager.ts` tool + `preview.ts` decorator mounting the core in the story frame | Storybook is dev-only by nature | Story iframe already isolates |

### Reference skeleton

| Module | Responsibility | Precedent |
|---|---|---|
| `core/boot.ts` | Queue stub, `shouldMount()`, kill switch, hostname/flag checks, idempotent mount (`customElements.get` guard) | Sentry loader, Vite overlay guard |
| `core/host.ts` | `<pr-overlay>` custom element, open shadow root, `adoptedStyleSheets`, theme attribute sync, top-layer dialogs | Vite/Next dev overlays, Hypothesis annotator |
| `core/hit.ts` | Capture-phase pointer listeners in select mode, `elementFromPoint`/`composedPath`, `pointer-events: none` highlight canvas, skip own subtree | react-grab, Agentation |
| `core/anchor.ts` | Selector + `data-*` tag reader, stable anchor `{ selector, tagPath, componentId?, route, viewport, state }` | code-inspector, lovable-tagger, react-dev-inspector |
| `core/a11y.ts` | `inert` management, APG dialog focus, shortcuts registry, reduced-motion/forced-colors flags | APG, MDN |
| `core/exclude.ts` | `excludeSelectors()`, `rr-block`/`data-html2canvas-ignore` on host, `navigator.webdriver` self-hide | axe/Playwright/rrweb/html2canvas |
| `core/store.ts` | Persistence strategy per host: `window.claude.db`, `localStorage`, or posted to a dev-server endpoint | Artifact runtime, `@vercel/toolbar` dev server |
| `adapters/vite.ts` | `apply: 'serve'` + `transformIndexHtml` | Vite plugin API |
| `adapters/next.tsx` | Client component + `next/script` | `@vercel/toolbar/next` |
| `adapters/react.ts` | Resolver: data attributes → fiber names (dev only) | bippy, react-grab |
| `adapters/storybook/` | manager tool + preview decorator | Storybook addon API |
| `tools/inject.mjs` | Appends the IIFE before `</body>`; used by the skill, the hook, and the builder | Netlify `</body>` requirement |

---

## 10. Templates

### (a) Minimal loader for the single-file case

```html
<!-- before </body>; the IIFE is either inlined here by the generator or loaded from jsDelivr with SRI -->
<meta name="pr-overlay" content="on">
<script>
  window.prOverlay = window.prOverlay || { q: [] };
  window.prOverlay.config = { project: "checkout-v3", theme: "auto", shortcut: "Alt+Shift+R" };
  window.prOverlay.q.push(["mount"]);          // queued until the real script defines mount()
</script>
<script src="https://cdn.jsdelivr.net/npm/pr-overlay@0.1.0/dist/pr-overlay.iife.js"
        integrity="sha384-REPLACE_WITH_PUBLISHED_HASH" crossorigin="anonymous" defer></script>
```

The IIFE's own guard: refuse if `navigator.webdriver`, if `meta[name=pr-overlay][content=off]`, if `location.hostname` is not in the allowlist and `?review=1` is absent, or if `customElements.get('pr-overlay')` already exists.

### (b) Vite dev-only injection plugin

```ts
// vite-plugin-pr-overlay.ts
import type { Plugin } from 'vite';
export function prOverlay(opts: { src?: string } = {}): Plugin {
  return {
    name: 'pr-overlay',
    apply: 'serve',                                   // never part of `vite build`
    transformIndexHtml() {
      return [{
        tag: 'script',
        attrs: { type: 'module', src: opts.src ?? '/node_modules/pr-overlay/dist/index.js' },
        injectTo: 'body',
      }];
    },
  };
}
// vite.config.ts: plugins: [react(), prOverlay(), mode === 'development' && componentTagger()].filter(Boolean)
```

### (c) Claude Code hook and skill line that append the overlay at generation

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{
        "type": "command",
        "if": "Write(*.html)",
        "command": "f=$(jq -r '.tool_input.file_path // empty'); [ -n \"$f\" ] && node \"$CLAUDE_PROJECT_DIR/tools/inject.mjs\" \"$f\" --inline"
      }]
    }]
  }
}
```

Skill (`.claude/skills/prototype-with-review/SKILL.md`, frontmatter `name` + `description`, optional `disable-model-invocation: true`): "After writing any single-file prototype HTML, run `node tools/inject.mjs <file> --inline` so the review overlay IIFE is appended before `</body>` with `<meta name="pr-overlay" content="on">`; for export or production builds pass `--off` instead." Hook payload shape (`tool_input.file_path`, matcher `Write|Edit`, `if` filter) per the [hooks reference](https://code.claude.com/docs/en/hooks) (fetched OK); skill layout per the [skills docs](https://code.claude.com/docs/en/skills) (fetched OK).

---

## 11. Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| react-grab | https://github.com/aidenybai/react-grab | MIT overlay with IIFE-from-CDN and ESM builds, shadow root, `import.meta.env.DEV` gating; the dual-host reference | fetched OK (README, package.json, bundle) | review & feedback tooling; architecture reference |
| Agentation | https://github.com/benjitaylor/agentation | React review overlay (portals, attribute scoping); already a pick in review-and-feedback.md | fetched OK (README, bundle) | review & feedback tooling (existing) |
| code-inspector-plugin | https://github.com/zh-lx/code-inspector | Multi-bundler dev plugin writing `data-insp-path`; click-to-source | fetched OK | skills dependency for anchors |
| lovable-tagger | https://www.npmjs.com/package/lovable-tagger | Vite plugin adding `data-component-id` to JSX | fetched OK via jsDelivr | skills dependency for anchors |
| react-dev-inspector | https://github.com/zthxxx/react-dev-inspector | babel/swc tagger + `<Inspector/>` + launch-editor middleware | fetched OK | architecture reference |
| @vercel/toolbar | https://vercel.com/docs/vercel-toolbar/in-production-and-localhost/add-to-production | Conditional mount, Next/Vite plugins, CSP list, skip header, per-branch env var | fetched OK | review & feedback tooling (gating precedent) |
| Netlify Drawer troubleshooting | https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/troubleshoot-the-netlify-drawer/ | `ntl-drawer-state`, `</body>` requirement, CSP frame-src | fetched OK | review & feedback tooling |
| Vite `overlay.ts` | https://github.com/vitejs/vite/blob/main/packages/vite/src/client/overlay.ts | Canonical custom-element + open shadow root overlay | fetched OK | architecture reference |
| Hypothesis client | https://github.com/hypothesis/client | Annotator-in-shadow + sidebar-in-iframe; `@property` workaround | fetched OK (source files) | architecture reference |
| Sentry loader script | https://docs.sentry.io/platforms/javascript/install/loader/ | Queue-stub loader with SRI and CSP guidance | fetched OK | rules (loader pattern) |
| Claude Code artifacts page constraints | https://code.claude.com/docs/en/artifacts | CDN allowlist, CSP, 16 MiB, sandboxed origin | fetched OK | rules |
| cdnjs/packages CONTRIBUTING | https://github.com/cdnjs/packages/blob/master/CONTRIBUTING.md | 800 downloads/200 stars bar; auto-update requirement | fetched OK | rules |
| jsDelivr README | https://github.com/jsdelivr/jsdelivr | npm URL scheme, caching, field resolution, limits | fetched OK | rules |
| rrweb guide | https://github.com/rrweb-io/rrweb/blob/master/guide.md | `blockClass`/`blockSelector` exclusions | fetched OK | hooks (replay exclusion) |
| Spotlight | https://github.com/getsentry/spotlight | Sidecar + overlay (ESM + UMD exports) dev tool; script-tag setup not verified | partially fetched | architecture reference |
| stagewise | https://github.com/stagewise-io/stagewise | AGPLv3 agentic IDE; proxy-injection history search-verified only | fetched OK (README) | evaluated, not selected |
| Section-10 templates (this doc) | — | Loader, Vite plugin, hook + skill line | authored | proposed: templates |

---

## 12. Sources

- https://code.claude.com/docs/en/artifacts
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/skills
- https://vercel.com/docs/vercel-toolbar
- https://vercel.com/docs/vercel-toolbar/in-production-and-localhost/add-to-production
- https://vercel.com/docs/vercel-toolbar/managing-toolbar
- https://vercel.com/docs/vercel-toolbar/browser-extension
- https://cdn.jsdelivr.net/npm/@vercel/toolbar/README.md
- https://vercel.com/docs/environment-variables/system-environment-variables
- https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/
- https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/troubleshoot-the-netlify-drawer/
- https://answers.netlify.com/t/how-to-add-the-netlify-drawer-to-custom-deploy-preview-build/38334
- https://docs.netlify.com/build/configure-builds/environment-variables/
- https://docs.sentry.io/platforms/javascript/install/loader/
- https://docs.sentry.io/platforms/javascript/configuration/options/
- https://developers.intercom.com/installing-intercom/web/installation
- https://posthog.com/docs/web-analytics/installation/html-snippet
- https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/dollar-crisp/
- https://storybook.js.org/docs/addons/writing-addons
- https://storybook.js.org/docs/addons/install-addons
- https://github.com/stagewise-io/stagewise
- https://dev.to/bluehotdog/ai-coding-tools-that-actually-see-your-browser-2026-2hoc
- https://github.com/benjitaylor/agentation
- https://github.com/aidenybai/react-grab
- https://github.com/aidenybai/bippy
- https://github.com/zh-lx/code-inspector
- https://inspector.fe-dev.cn/en/guide/start.html
- https://www.npmjs.com/package/lovable-tagger
- https://github.com/zthxxx/react-dev-inspector
- https://github.com/facebook/react/issues/32574
- https://github.com/facebook/react/issues/29092
- https://react.dev/learn/react-compiler/introduction
- https://legacy.reactjs.org/blog/2020/08/10/react-v17-rc.html
- https://github.com/Wildhoney/ReactShadow
- https://github.com/vitejs/vite/blob/main/packages/vite/src/client/overlay.ts
- https://github.com/vercel/next.js/blob/canary/packages/next/src/next-devtools/dev-overlay/components/shadow-portal.tsx
- https://github.com/hypothesis/client
- https://raw.githubusercontent.com/hypothesis/client/main/src/annotator/util/shadow-root.ts
- https://raw.githubusercontent.com/hypothesis/client/main/src/annotator/sidebar.tsx
- https://web.hypothes.is/help/embedding-hypothesis-in-websites-and-platforms/
- https://github.com/getsentry/spotlight
- https://github.com/cdnjs/packages/blob/master/CONTRIBUTING.md
- https://github.com/jsdelivr/jsdelivr
- https://nodejs.org/api/packages.html
- https://vite.dev/guide/build.html
- https://vite.dev/guide/api-plugin.html
- https://vite.dev/guide/env-and-mode.html
- https://esbuild.github.io/api/
- https://nextjs.org/docs/app/api-reference/components/script
- https://nextjs.org/docs/app/guides/environment-variables
- https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM
- https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- https://developer.mozilla.org/en-US/docs/Web/CSS/all
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
- https://playwright.dev/docs/api/class-page#page-screenshot
- https://github.com/dequelabs/axe-core/blob/develop/doc/API.md
- https://html2canvas.hertzen.com/configuration
- https://raw.githubusercontent.com/qq15725/modern-screenshot/main/src/options.ts
- https://github.com/rrweb-io/rrweb/blob/master/guide.md

*Research conducted September 2026 via live fetches, jsDelivr tarball inspection, and bundle greps. Not verified in this pass: tsup option names (docs page empty), jsDelivr `/+esm`, Netlify's loader URL, stagewise's proxy-injection flow (docs 404), Lovable's preview-iframe injection, Spotlight's script-tag setup, `adoptedStyleSheets` behaviour under `style-src` without `'unsafe-inline'`, the `nextjs-portal` creation code (file located, not read), the displayName-restoring build plugins, and the Trusted-Types breakage of Intercom (search only). Bundle sizes are gzip -6 of the published dist files, not Bundlephobia (its pages returned no data).*
