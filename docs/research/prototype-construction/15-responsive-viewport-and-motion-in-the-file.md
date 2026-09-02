# Responsive Viewport, Density, and Motion in the Construction File

**Scope:** How breakpoints, adaptive layout, density/platform, and motion intent get expressed in a construction file that forbids raw values and logic — so a deterministic builder can realize them. This doc builds on the architecture in [00](00-architecture-synthesis.md), the four-layer vocabulary and DTCG token layer in [01 §2, §4.5](01-primitive-codification.md), and the rules from [11](11-constraint-and-generative-layout.md) — *preset layout vocabulary over raw constraints*, *responsive behavior is a global builder policy per container type*, *spacing feel is a builder-owned badness function* — none of which is repeated. The motion-tooling landscape (GSAP, Motion AI Kit, Lottie Motion Copilot, Rive data binding, Keyframer) is covered in [foundational/05](../foundational/05-ai-motion-ixd-prototyping.md) and only extended here. Grading of responsive output is in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md); this doc checks that doc's "no open benchmark for responsive behavior" note. Out of scope: runtime interpreters, native (SwiftUI/Compose) *codegen* targets — native systems appear only as precedents. Verified live September 2026; fetch failures are marked.

## Table of Contents

1. [The question, and the rule it inherits](#1-the-question-and-the-rule-it-inherits)
2. [Responsive encoding precedents](#2-responsive-encoding-precedents)
3. [What the file should say: three options and the evidence](#3-what-the-file-should-say-three-options-and-the-evidence)
4. [Density and platform as a token axis](#4-density-and-platform-as-a-token-axis)
5. [Motion intent](#5-motion-intent)
6. [Fidelity implications and where the escape hatch sits](#6-fidelity-implications-and-where-the-escape-hatch-sits)
7. [Proposed vocabulary](#7-proposed-vocabulary)
8. [Tradeoffs](#8-tradeoffs)
9. [Open questions](#9-open-questions)
10. [Recommended experiments](#10-recommended-experiments)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. The question, and the rule it inherits

Doc 11 already settled the *default*: the builder owns responsive behavior as a per-container policy, the file stays spacing-silent, and any override is a sparse, source-recorded pin. What it did not settle is the *vocabulary* — what an LLM is allowed to write when a screen genuinely needs a different arrangement on a phone than on a desktop, when a data-dense admin surface needs compact density, or when a flow's feel depends on a screen transition. The constraint is the same one that governs everything else in the file: **no raw values, no logic**. So `"minWidth": 768` is out, `"if width < 600 then stack"` is out, and `"transition": "300ms cubic-bezier(...)"` is out. Everything below is a search for enums that carry those intents.

The precedents split cleanly into three encoding strategies, and every mature system uses at least two:

| Strategy | Who does it | What the author writes |
|---|---|---|
| **Per-class overrides** — sparse deltas keyed by a named window class | Builder.io, Plasmic, Webflow/Framer, Airbnb GP, Figma Sites | "at *small*, this container becomes X" |
| **Intrinsic presets** — containers that reflow from their own content and available space, no classes at all | Every Layout, CSS container queries, Compose `GridCells.Adaptive`, SwiftUI `ViewThatFits`, Figma auto-layout wrap/min-max | nothing; pick the container |
| **Adaptive pattern refs** — a named screen archetype whose per-class behavior is fully specified by the system | Material 3 canonical layouts / `ListDetailPaneScaffold`, Airbnb `SingleColumnLayout`/`MultiColumnLayout` | the pattern's name |

## 2. Responsive encoding precedents

### 2.1 Server-driven UI: layout per form factor is a *server enum*, not client CSS

Airbnb's Ghost Platform types the screen as `ScreenContainer { id, screenProperties, layout: LayoutsPerFormFactor }`, and the mobile layout as `SingleColumnLayout` with exactly three placements — `nav: SingleSectionPlacement`, `main: MultipleSectionsPlacement`, `floatingFooter: SingleSectionPlacement` — alongside a `MultiColumnLayout implements ILayout` for wide screens ([InfoQ summary](https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/); the original [Medium deep dive](https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5) returned 403, so the exact field names inside `LayoutsPerFormFactor` are not verified here). Three things matter for us: the layout is chosen from a *closed set of named layouts*; sections bind to *named placements*, not coordinates; and the per-form-factor choice lives in the payload as a keyed object — a sparse override keyed by form factor, at the *screen* level only. Sections themselves carry no responsive annotations.

Lyft's Canvas goes the other way — "a set of primitives like buttons, layouts and action callbacks defined in protobuf" — and its own engineer names the ceiling: "it's really hard to specify UI with fancy transition or branding animations, and it's really complex to model UI that has client-side state" (Kevin Fang, [Mobile Native Foundation discussion](https://github.com/MobileNativeFoundation/discussions/discussions/47)). That is the motion problem stated by an SDUI practitioner: a declarative payload can name a layout but cannot carry choreography.

Shopify's Polaris web components (the only UI-extension surface after API 2025-07, per [Shopify's migration note](https://shopify.dev/docs/api/customer-account-ui-extensions/2025-07/ui-components)) are the most interesting modern precedent because responsiveness is a *value syntax*, not a media query: `padding`, `gridtemplatecolumns` and `direction` accept `@container (inline-size > 500px) large, small`, resolved against the nearest `<s-query-container>`, with the rule that "the fallback value (when the condition is `false`) should work at the smallest size" ([Using Polaris web components](https://shopify.dev/docs/api/polaris/using-polaris-web-components)). It is container-relative, mobile-first, and still token-valued (`large`, `small`) — but it embeds a raw `500px` and a conditional in the value, which is exactly the "logic in the spec" that doc 06 warns against. Useful as a *builder output* target; not as file syntax.

### 2.2 Visual builders: per-breakpoint deltas, cascading, and their known failure

Builder.io's element type stores `responsiveStyles?: { large?, medium?, small?, xsmall? }` — a per-class CSS delta per node ([element.ts](https://raw.githubusercontent.com/BuilderIO/builder/main/packages/core/src/types/element.ts); the docs pages for default widths returned 404). Plasmic models breakpoints as a special global variant group called "Screen", warns that "Breakpoints are always cumulative. With the above two breakpoints, a screen that is 400px wide will match both", and cautions: "Generally avoid content overrides (changing text/images) on mobile and other breakpoint-triggered variants, since these will appear as flashes" ([Plasmic responsive design](https://docs.plasmic.app/learn/responsive-design/)). Webflow and Framer use the same cascading-from-a-primary-breakpoint model; their help pages returned 403/404 on fetch, so their default widths are not reported here.

The lesson is consistent: builders let authors put per-node deltas at every breakpoint, and the result is the per-node-annotation smear that doc 11 §4.3 identified as the CSS-pagination failure. Plasmic's "flashes" warning is the same smell from the other side — once breakpoints can change *content*, the file has grown a conditional.

### 2.3 Figma: min/max and wrap shipped; breakpoints did not

Figma's auto layout now lets you "Set minimum or maximum width and height to any auto layout frame and its children", and horizontal flows get Wrap, which "pushes any overflowing objects to the next line" ([Explore auto layout properties](https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties)). Grid auto layout (Config 2025) adds two-dimensional placement, but Nearform's audit lists what is missing: `fr` units, `auto-fit`/`auto-fill`, named areas, subgrid, and "Responsive breakpoint logic"; its "Auto" tracks export to Dev Mode as `minmax(0, 1fr)` ([Nearform](https://nearform.com/digital-community/figmas-new-grid-auto-layout-what-it-does-and-doesnt-yet-do/)). Figma Sites handles breakpoints by "matching the names of your breakpoints with your variant property values" so the right variant is inserted per breakpoint ([Figma help](https://help.figma.com/hc/en-us/articles/31242826664983-Create-a-responsive-component-that-automatically-adapts-to-each-breakpoint)) — i.e., a *variant swap keyed by class name*, which is a preset model, not a constraint model. (Forum reports that Sites beta only auto-switched at a single 1280px desktop breakpoint are search-derived and not verified.) Net: Figma's design surface has converged on intrinsic sizing (min/max, wrap, hug/fill) plus named-class variant swaps — the two strategies we want — and never shipped per-node breakpoint CSS.

### 2.4 Native presets: window size classes and canonical layouts

Android's window size classes are the cleanest *preset* vocabulary in the industry: compact `< 600dp` (99.96% of phones in portrait), medium `600–840dp` (93.73% of tablets in portrait), expanded `840–1200dp` (97.22% of tablets in landscape), plus large `1200–1600dp` and extra-large `≥ 1600dp` opt-ins; the guidance is to "Use window size classes to make high-level application layout decisions, such as deciding whether to use a specific canonical layout", and "Most apps can build an adaptive UI by considering only the width window size class" ([Android developers](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)). The pixel thresholds are *platform-owned*; app code only ever sees the enum.

Material's canonical layouts are the adaptive-pattern-ref strategy in production: list-detail shows one pane at compact/medium and both at expanded; supporting pane goes below-or-sheet at compact, 50/50 at medium, ~70/30 at expanded; feed uses `GridCells.Adaptive(minSize = 180.dp)`, which "displays as many columns as can fit in the available space" — each realized by a scaffold (`ListDetailPaneScaffold`, `SupportingPaneScaffold`) that "automatically handles pane logic based on window size classes" ([Canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts)). SwiftUI's `ViewThatFits` is the intrinsic version — it tries its children in order and uses the first that fits the proposed size (Apple's doc page is JS-rendered and returned only a title; third-party writeups returned 403/404 — behavior stated from prior knowledge, not verified live).

### 2.5 Builder-owned CSS mechanisms

These are what the builder *emits*; none of them should appear in the file.

| Mechanism | Status | Why it belongs to the builder |
|---|---|---|
| **Container queries** (`container-type`, `@container`, `cqi`) | 94.71% global support; Chrome 106, Safari 16.0, Firefox 110 ([caniuse](https://caniuse.com/css-container-queries), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)) | Lets a pattern reflow by its *slot's* width, so the same pattern instance works in a sidebar and a main column with no per-instance override |
| **Tailwind v4 variants** | `sm` 40rem … `2xl` 96rem; container variants `@3xs` 16rem … `@7xl` 80rem; "container queries are mobile-first in Tailwind CSS and apply at the target container size and up" ([Tailwind](https://tailwindcss.com/docs/responsive-design)) | A ready target vocabulary; the builder maps window classes → `md:`/`lg:` and slot presets → `@md:`/`@lg:` |
| **Fluid scales** (`clamp()`) | Utopia: "Define a type scale for a small screen, define a type scale for a large screen, tell the browser to interpolate between the two scales, based on the current viewport width" ([Utopia](https://utopia.fyi/blog/designing-with-fluid-type-scales/)) | Type/space tokens can be *fluid by definition* in the token file; the file only ever references `type.heading.md` |
| **Every Layout algorithmic containers** | Switcher: `flex-basis: calc((var(--threshold) - 100%) * 999)` so "breaks occur, implicitly, according to the available space rather than the viewport width", with a quantity query (`:nth-last-child(n+5)`) forcing vertical at 5+ children ([Switcher](https://every-layout.dev/layouts/switcher/)); Sidebar: `flex-basis: 20rem` plus `min-inline-size: 50%` on the content, "you can essentially do away with `@media` breakpoints" ([Sidebar](https://every-layout.dev/layouts/sidebar/)); Cluster/Grid/Cover are paywalled | The strongest candidate for the *intrinsic preset* vocabulary: each container has one or two token-typed parameters (threshold, sidebar width, min column width) and zero breakpoints |

## 3. What the file should say: three options and the evidence

### 3.1 The options

| Option | File carries | Builder does | Fails when |
|---|---|---|---|
| **A. Per-node window-class overrides** (Builder.io-style) | `overrides: { compact: {...}, expanded: {...} }` on any node | Emits media/container queries per node | LLM produces desktop-first happy path and never writes the `compact` delta; overrides smear across nodes; content overrides become conditionals (Plasmic's "flashes") |
| **B. Intrinsic presets only** (Every Layout / ViewThatFits) | A container preset + token-typed parameters | Owns reflow entirely | Screen-level *structure* must change (two panes → one pane with navigation); intrinsic containers cannot express "hide the supporting pane and put it in a sheet" |
| **C. Adaptive pattern refs** (M3 canonical layouts) | An archetype name (`list-detail`) | Realizes each class's arrangement from the catalog | The archetype does not exist; a novel arrangement hits the escape hatch |

The precedents say the answer is **C at the screen level, B inside patterns, and A only as a single enum-valued pin per node** — never per-node CSS. That matches doc 11's global-policy rule and Airbnb's `LayoutsPerFormFactor` (screen-level only, closed set of layouts).

### 3.2 What LLMs get wrong — practitioner and research evidence

The failure mode is not that models cannot write media queries; it is that they do not write them unless the viewport is in front of them. A 2026 practitioner write-up states it flatly: "Copilot, Cursor, and Claude optimize for the happy path. The generated code works on the viewport size visible in your IDE, usually a desktop screen" ([Bug0](https://bug0.com/blog/how-to-make-a-website-mobile-friendly-in-2026)). A Lovable troubleshooting guide lists the concrete symptoms — "Tailwind defaults apply desktop sizing unless overridden with `sm:` or `md:` prefixes", hardcoded pixel widths, and "A single element that is wider than the viewport — even by one pixel — creates a horizontal scrollbar on mobile" ([RapidDev](https://www.rapidevelopers.com/lovable-issues/fixing-layout-issues-in-lovable-on-mobile-devices)). Every one of these disappears by construction when the builder, not the model, chooses the CSS: intrinsic presets have no desktop default to forget.

On the research side, ReFLAIR (FSE 2026) is the first tool to detect "reflow issues that cause loss of information or functionality" dynamically, reporting "80.49% precision and 95.31% recall" over 24 pages, extended to "36 webpages across 28 distinct domains" and a tablet viewport, framed against WCAG SC 1.4.10 and the fact that "over 60 percent of global Internet traffic originating from mobile devices" ([He et al.](https://seal.ics.uci.edu/publications/2026_FSE.pdf)). It is a *detector* for the builder's gate, not a generation benchmark.

### 3.3 Is "no open benchmark for responsive behavior" still true?

Yes, as of September 2026. The 2025–2026 front-end generation benchmarks were checked for a responsiveness dimension: DesignBench evaluates "generation, edit, and repair" over "900 webpage samples" in React/Vue/Angular with no viewport dimension ([arXiv 2506.06251](https://arxiv.org/abs/2506.06251)); WebIGBench covers "103 complex webpages" and "871 distinct interactive actions" — interaction, not reflow ([arXiv 2606.00154](https://arxiv.org/abs/2606.00154)); ArtifactsBench's 1,825 tasks capture "dynamic behavior through temporal screenshots" and reach "94.4% ranking consistency with WebDev Arena", which makes it the first benchmark to score *motion*, but it has no viewport axis either ([arXiv 2507.04952](https://arxiv.org/abs/2507.04952)). A responsiveness rubric (1–5, no horizontal scroll, ≥44px targets) surfaced in search attributed to OpenSkillEval, but the paper's abstract audits agent skills across five categories and does not report such metrics ([arXiv 2605.23657](https://arxiv.org/abs/2605.23657)) — treat that rubric as unverified. The practical path is to build the gate from ReFLAIR-style detection plus Playwright projects (eval-tuning-loops/01 §1), and to publish the construction-file corpus as the missing benchmark (§10).

## 4. Density and platform as a token axis

Density and platform are the clearest case where the file should carry **one enum and nothing else**, because the design systems that solve this already encode the whole answer in the token layer.

- **Adobe Spectrum** stores platform scale *inside the token*: `component-height-100` is `{"sets": {"desktop": {"value": "32px"}, "mobile": {"value": "40px"}}}` under a `scale-set.json` schema, and `base-padding-horizontal-2x-large` is desktop `18px` / mobile `14px`; roughly 60–70 tokens in `layout.json` carry a desktop/mobile set ([spectrum-design-data layout.json](https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/tokens/src/layout.json); the repo moved from `adobe/spectrum-tokens` and now ships an MCP server, per the [redirect README](https://github.com/adobe/spectrum-tokens)). Note the two tokens move in *opposite* directions — heights grow on mobile for touch, padding shrinks — which is why scale cannot be a single multiplier the file could express; it has to be a token set the builder selects. (Spectrum's "platform scale" guidance page is JS-rendered and returned only a title; the 1:1.25 ratio is search-derived and consistent with 32→40px.)
- **Material density** is an integer scale where "The lower the density scale, the higher the component density", each step is 4px ("36px + 4px * (-3) => 24px"), "the density system only allows negative numbers", and applying density disables touch-target padding because "dense components should be optionally enabled and therefore do not have the same default accessibility requirements" ([MDC density README](https://github.com/material-components/material-components-web/blob/master/packages/mdc-density/README.md)). The named levels default/comfortable/compact are search-derived from Material guidance.
- **Print** has no token precedent in these systems; the honest position is that print is a builder *target* (a paged stylesheet) rather than a file axis, per doc 11 §4.3's CSS-pagination lesson.

So the file gets `density: "default" | "comfortable" | "compact"` and `platform: "web" | "web-mobile" | "native-ios" | "native-android"`, both at *screen or intent level*, both resolved by the builder to a token set. A per-node `density` pin is the one legitimate exception (a compact data table on a comfortable page), and it should be counted by the same telemetry as CustomBlock.

## 5. Motion intent

### 5.1 The token layer is now standardized — but stops at cubic-bezier

The DTCG Design Tokens Format Module 2025.10 was published as a "Final Community Group Report" on 28 October 2025, stating "This specification is considered stable", with three motion types: `duration` — "an object containing a numeric `value` … and a `unit` of milliseconds (`"ms"`) or seconds (`"s"`)"; `cubicBezier` — four numbers `[P1x, P1y, P2x, P2y]` with x restricted to `[0, 1]`; and `transition` — `{duration, delay, timingFunction}`, each a value or a reference ([DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/)). There is **no spring type** and no motion-specific `$extensions` guidance; the 30 July 2026 preview draft adds none ("Do not refer to this document directly, and do not implement anything in this document") ([DTCG drafts](https://www.designtokens.org/tr/drafts/format/)). That gap matters because the two most influential 2025 motion systems are spring-based:

| System | Encoding | Values (verbatim) |
|---|---|---|
| **IBM Carbon** | DTCG file (`$schema: https://tr.designtokens.org/format/`, `$type: duration` / `cubicBezier`) | Durations `fast.01` 70ms, `fast.02` 110ms, `moderate.01` 150ms, `moderate.02` 240ms, `slow.01` 400ms, `slow.02` 700ms; easings `standard.productive [0.2, 0, 0.38, 0.9]`, `standard.expressive [0.4, 0.14, 0.3, 1]`, `entrance.*`, `exit.*` ([motion.json](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/motion/src/dtcg/motion.json)) |
| **Material 3 Expressive** | Spring attributes (damping, stiffness), *spatial* vs *effects* × fast/default/slow | `motionSpringFastSpatial` 0.9 / 1400, `motionSpringDefaultSpatial` 0.9 / 700, `motionSpringSlowSpatial` 0.9 / 300; `…Effects` damping 1 at stiffness 3800 / 1600 / 800; standard easing `cubic-bezier(0.2, 0, 0, 1)`, emphasized-decelerate `(0.05, 0.7, 0.1, 1)`; durations short 50–200ms, medium 250–400, long 450–600, extra-long 700–1000 ([material-components-android Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)) |
| **Atlassian** | Semantic bundles — "Motion semantic tokens are named bundles that encode context, motion type, and tempo", e.g. `motion.popup.enter` | Interactions 50–150ms, transitions 150–400ms; `ease-out bold cubic-bezier(0, 0.4, 0, 1)`, `ease-in-out bold (0.4, 0, 0, 1)`, `ease-in practical (0.6, 0, 0.8, 0.6)`, `ease-out practical (0.4, 1, 0.6, 1)`; "Currently, when reduced motion is active, motion is off and instant"; still behind flag `platform-dst-motion-uplift` ([Atlassian motion](https://atlassian.design/foundations/motion)) |
| **Apple** | Two parameters: `spring(duration:bounce:)`, bounce −1.0…1.0; presets `.smooth`, `.snappy`, `.bouncy` at default duration 0.5 | "Apple has been refining a new way to configure springs that's easier to understand and to work with" ([WWDC23 notes](https://wwdcnotes.com/documentation/wwdc23-10158-animate-with-springs/), [GetStream reference](https://github.com/GetStream/swiftui-spring-animations)) |

Two design consequences. First, the *semantic* layer (Atlassian's `motion.popup.enter`, M3's spatial-vs-effects split) is the level the file should reference — it is the motion analogue of `action.bg` over `color.brand.600`. Second, springs must live in the token file as an `$extensions` object (or a `spring` type the builder understands) until DTCG catches up; Motion's CSS `linear()` spring generation (foundational/05 §1) is how the builder realizes them on the web.

### 5.2 Named transition patterns: the enum already exists

Material's four transition patterns are defined by *relationship*, which is exactly what an intent file knows: container transform — "Transitions between UI elements that include a container… creates a visible connection"; shared axis — "Transitions between UI elements that have a spatial or navigational relationship"; fade through — "Transitions between UI elements that do not have a strong relationship"; fade — "UI elements that enter or exit within the bounds of the screen" ([Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)). The m3.material.io pages themselves are JS-rendered and returned only titles. An LLM that knows a flow goes list → detail can write `transition: "container-transform"` without knowing a single millisecond; the builder maps it to the token scheme (`spatial.default` for the move, `effects.default` for the crossfade) and to the platform mechanism.

### 5.3 Web realization mechanisms are now viable builder targets

- **View Transitions API**: 90.86% global support, Chrome 111, Safari 18.0, Firefox 144 ([caniuse](https://caniuse.com/view-transitions)); elements opt in via `view-transition-name`, and the browser builds a `::view-transition-group()` / `-old()` / `-new()` pseudo-tree ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)). This is container-transform and shared-element as a *platform primitive*: the builder assigns `view-transition-name` from the construction file's stable node ids, which is the provenance system from doc 08 doing double duty.
- **`@starting-style`** (Baseline 2024, August 2024) "provide[s] starting styles for elements that do not have a previous state", i.e. enter animations from `display: none` with `transition-behavior: allow-discrete` ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)) — enough for every `enter: "fade-up"` pattern without JavaScript.
- **Motion variants** are the JSON-able declarative form for anything richer: "Variants are a set of named targets. These names can be anything", with orchestration via `when`, `delayChildren` and `stagger()` ([Motion docs](https://motion.dev/docs/react-animation)). Variants are the natural *builder output* for a `stagger: "children"` flag.
- **Reduced motion** is a builder rule, never a file field: `prefers-reduced-motion` has been Baseline since January 2020 ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)); WCAG 2.3.3 (AAA) requires that "Motion animation triggered by interaction can be disabled, unless the animation is essential" ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)); Motion's `MotionConfig reducedMotion="user"` gives the policy for free — "all `motion` components will automatically disable transform and layout animations, while preserving the animation of other values like `opacity` and `backgroundColor`" ([Motion accessibility](https://motion.dev/docs/react-accessibility)). That "spatial off, effects on" policy is the same split M3 tokens make.

### 5.4 Assets: Rive and Lottie are references with typed inputs

Rive state machines expose Boolean, Number and Trigger inputs that runtimes set ([Rive docs](https://rive.app/docs/runtimes/state-machines)); Rive also publishes an `llms.txt` ([rive.app/docs/llms.txt](https://rive.app/docs/llms.txt)). For the file, an animated asset is a `MotionAsset` ref plus a map from named inputs to sample-data fields — no timing, no logic — and the builder wires the runtime.

### 5.5 What is new in LLM motion generation since foundational/05

- **Verification loops work for motion the way schema loops work for structure.** MoVer (TOG / SIGGRAPH 2025) is "a motion verification DSL based on first-order logic that can check spatio-temporal properties of a motion graphics animation"; its LLM pipeline produces a correct animation for "58.8% of the test prompts without any iteration, this number raises to 93.6% with up to 50 correction iterations" ([MoVer](https://mover-dsl.github.io/)). A named-pattern enum sidesteps the 58.8% problem entirely for the common cases; MoVer-style checks belong on the custom-motion island.
- **Benchmarks now watch motion.** ArtifactsBench judges "temporal screenshots" of dynamic artifacts with an MLLM judge ([arXiv 2507.04952](https://arxiv.org/abs/2507.04952)) — the first grading precedent for "did the transition happen".
- **Figma shipped a motion tool with an agent.** Figma Motion (Config 2026): "Animation and timeline editing arrive natively on the canvas", exports to CSS, JSON, React, MP4, WebM, SVG, GIF ([CMSWire](https://www.cmswire.com/digital-experience/figma-launches-code-layers-motion-at-config-2026/)); presets "Fade, Rotate, Scale, Resize, and more", an agent prompt example "a glitchy type animation, staggering the shapes", with "smooth screen transitions" marked "Coming soon" ([figma.com/motion](https://www.figma.com/motion/)); Figma Make's pitch is "Describe transitions, delays, and easing in plain language—AI creates polished motion for your screens" ([Figma](https://www.figma.com/solutions/ai-animated-prototype-generator/)). The relevant fact is the *preset list* — Fade/Rotate/Scale/Resize is a tiny enum, and JSON export means a Figma-authored motion could be imported as a catalog motion pattern rather than re-described.

## 6. Fidelity implications and where the escape hatch sits

A **click-through prototype** needs exactly one motion decision per flow edge: the transition pattern. Everything else (button press feedback, hover, focus rings) is already inside the real components the builder instantiates. That is one enum per edge in `intent.yaml`'s flows, defaulting to `shared-axis` for sibling navigation and `container-transform` for list → detail, per Material's relationship rules.

A **feel prototype** — the hero moment, a custom loader, an onboarding sequence — needs choreography the enum cannot carry, and Lyft's Canvas engineer already told us why the payload will never carry it. This is where the escape hatch sits: a `MotionIsland` node, sibling to `CustomBlock`, that owns one subtree's animation code (Motion variants, GSAP, a Rive file) and is subject to three builder rules it cannot opt out of — reduced-motion policy, the token scheme for durations/easings it references, and the ArtifactsBench-style temporal-screenshot check in the gate. The island's usage rate is the motion catalog's health metric, exactly as CustomBlock's is for patterns (doc 01).

The doc 00 rule "motion-heavy work → route to the normal agent-writes-code path" still holds; the vocabulary below is meant to make *ordinary product motion* free, not to make the pipeline a motion tool.

## 7. Proposed vocabulary

### (a) Layout presets with intrinsic responsive behavior (no classes in the file)

| Preset | Token-typed parameters | Builder realization (web) | Precedent |
|---|---|---|---|
| `stack` | `gap` | flex column | Every Layout Stack |
| `cluster` | `gap`, `justify` | `flex-wrap` + `gap` | Every Layout Cluster; Figma Wrap |
| `switcher` | `threshold` (a `size.*` token), `gap` | flex-basis threshold trick + quantity query at 5 | Every Layout Switcher |
| `sidebar` | `side`, `sidebarWidth` (`size.*`), `contentMin` (`ratio.*`) | flex + `min-inline-size` | Every Layout Sidebar |
| `grid` | `minColumn` (`size.*`), `gap` | `repeat(auto-fit, minmax(min(var(--min), 100%), 1fr))` | Every Layout Grid; Compose `GridCells.Adaptive`; Figma Grid |
| `cover` | `minHeight` | full-height with centered principal | Every Layout Cover |
| `reel` | `itemWidth` | horizontal scroll snap | Every Layout Reel |
| `fits` | ordered children | container query picks first child that fits | SwiftUI `ViewThatFits` |

All parameters reference `size.*`/`space.*`/`ratio.*` tokens; the builder emits container queries (`container-type: inline-size`) so presets respond to their *slot*, not the viewport.

### (b) Window-class overrides — screen-level, enum-valued, sparse

Window classes are the Android set, thresholds owned by the builder's token file (`breakpoint.compact`, `breakpoint.medium`, `breakpoint.expanded`): `compact | medium | expanded` (with `large` / `xlarge` as opt-in aliases of `expanded`). The only legal per-class override is on a **screen archetype or a layout container**, and its value is another *preset name* — never CSS, never content:

```
"perClass": { "compact": { "layout": "single-pane", "nav": "bottom" } }
```

Content overrides are forbidden (Plasmic's "flashes"); visibility overrides are allowed only as `"hide": ["supporting"]` naming a *slot*, which the builder must relocate to a sheet rather than drop, per ReFLAIR's information-loss criterion.

### (c) Density and platform axis

| Field | Enum | Resolved by | Precedent |
|---|---|---|---|
| `density` | `default | comfortable | compact` | token set (spacing, control heights); touch targets re-enabled when `platform` is a touch class | Material density scale |
| `platform` | `web | web-mobile | native-ios | native-android` | Spectrum-style `sets.desktop` / `sets.mobile` selection; component-height and padding move independently | Spectrum `scale-set` |
| `print` | builder flag, not a file field | paged stylesheet | doc 11 §4.3 |

### (d) Motion pattern refs

| Field | Enum | Builder realization |
|---|---|---|
| `flow.transition` | `container-transform | shared-axis-x | shared-axis-y | fade-through | fade | none` | View Transitions with `view-transition-name` from node ids; falls back to Motion variants |
| `node.enter` / `node.exit` | `fade | fade-up | scale-in | slide-{start,end,top,bottom} | none` | `@starting-style` + `allow-discrete`; Motion variants when staggered |
| `node.stagger` | `none | children` | `delayChildren` + `stagger()` |
| `node.scheme` | `spatial | effects` (optional; default inferred: position/size → spatial, color/opacity → effects) | M3-style spring tokens; `effects` survives reduced motion, `spatial` does not |
| `node.tempo` | `fast | default | slow` | selects `motion.{scheme}.{tempo}` token |
| `node.motionAsset` | `{ ref: "asset.*", inputs: { name: "data.*" } }` | Rive/Lottie runtime; inputs bound to sample data |
| `MotionIsland` | escape hatch node | LLM-owned file; builder rules still applied |

### Example fragment

```json
{
  "screen": "orders",
  "archetype": "list-detail",
  "density": "compact",
  "platform": "web",
  "perClass": {
    "compact": { "layout": "single-pane", "nav": "bottom" },
    "medium":  { "layout": "single-pane", "nav": "rail" }
  },
  "flow": {
    "list->detail": { "transition": "container-transform" },
    "detail->list": { "transition": "container-transform" },
    "tab:*":        { "transition": "shared-axis-x" }
  },
  "slots": {
    "list": {
      "id": "orders.list",
      "pattern": "ObjectList",
      "layout": { "preset": "stack", "gap": "space.200" },
      "children": {
        "toolbar": { "id": "orders.toolbar", "pattern": "Toolbar",
                     "layout": { "preset": "cluster", "gap": "space.100" } },
        "rows":    { "id": "orders.rows", "pattern": "DataTable",
                     "density": "compact",
                     "enter": "fade", "stagger": "children", "tempo": "fast" }
      }
    },
    "detail": {
      "id": "orders.detail",
      "pattern": "ObjectHeader",
      "layout": { "preset": "sidebar", "side": "end",
                  "sidebarWidth": "size.sidebar.md", "contentMin": "ratio.half" },
      "children": {
        "summary": { "id": "orders.summary", "pattern": "KeyValueList" },
        "status":  { "id": "orders.status", "motionAsset":
                     { "ref": "asset.status-pulse", "inputs": { "level": "data.order.risk" } } },
        "hero":    { "id": "orders.hero", "type": "MotionIsland", "src": "islands/orders-hero.tsx" }
      }
    }
  }
}
```

Nothing in the fragment is a number, a unit, or a conditional; every value is an enum, a token path, an id, or a data path.

## 8. Tradeoffs

| Choice | Gain | Cost | Evidence |
|---|---|---|---|
| Intrinsic presets over per-node breakpoints | No desktop-first happy path to forget; presets respond to slot width | Cannot express structural change; needs (b) | Every Layout threshold trick; Bug0/RapidDev failure list |
| Android window classes as the only class enum | Platform-validated thresholds (99.96% / 93.73% / 97.22% device coverage) | Web designers think in Tailwind `md`/`lg`; builder must map | Android size classes; Tailwind defaults |
| Archetype-level overrides only | Matches Airbnb `LayoutsPerFormFactor`; no content conditionals | New arrangements require a catalog change (slow path) | Airbnb GP; Plasmic "flashes" warning |
| Density/platform as token-set selection | Independent movement of heights vs padding is representable | Requires the DS to ship Spectrum-style sets; most don't | Spectrum `scale-set` (32→40px vs 18→14px) |
| Relationship-named transitions | LLM decides by relationship it already knows; zero timing in the file | Only four+ patterns; feel is builder-uniform | M3 patterns; View Transitions 90.86% support |
| Springs via `$extensions` | Expressive/Apple-style motion representable now | Off-spec until DTCG adds a type; tooling won't round-trip it | DTCG 2025.10 has no spring; 2026-07 draft adds none |
| `MotionIsland` escape hatch | Feel prototypes possible without breaking the file | Island rate must be watched; islands bypass MoVer-style checks unless gated | Lyft Canvas ceiling; MoVer 58.8% first-pass |

## 9. Open questions

1. **Do LLMs pick the right intrinsic preset?** Sidebar vs Switcher vs Grid is a judgment about content shape; no benchmark measures it. If models default to `stack` everywhere, the gain over per-node overrides evaporates.
2. **Where does `fits` (ViewThatFits) stop being a preset and start being logic?** Ordered fallback children are declarative, but three-deep fallbacks are a conditional in disguise.
3. **Class thresholds: builder tokens or catalog constants?** Android bakes them into the platform; Tailwind exposes them as theme values. A DS that already ships breakpoint tokens should win, but two competing threshold sets (DS vs builder) is a drift source.
4. **Should `enter`/`exit` be per node at all**, or only per pattern in the catalog (the TeX position: authors cannot touch spacing)? The per-node fields above may be `\vspace`-class debt.
5. **Spring encoding.** `$extensions` today; if DTCG adds a `spring` type, migrate — which is the doc 09 migration gap again.
6. **Print.** Builder flag is the honest answer; whether anyone needs it for prototypes is unmeasured.

## 10. Recommended experiments

- **E7 — Reflow gate.** Run every screen at compact/medium/expanded Playwright projects and a ReFLAIR-style widget-presence diff; measure information-loss rate for intrinsic-only vs archetype-override builds. Success: zero horizontal overflow, zero lost interactive widgets across classes.
- **E8 — Preset-choice validity.** 30 screens with known content shapes; grade whether the LLM's `preset` matches a designer's pick (κ against two designers). If < 0.6, move preset choice into pattern defaults and remove it from the file.
- **E9 — Transition-enum sufficiency.** Tag every flow edge in the 10 E0/E1 screens with one of the six transitions; count edges that needed a `MotionIsland`. Target ≤ 10%.
- **E10 — Temporal grading.** Add ArtifactsBench-style temporal screenshots to the gate; check that the chosen transition actually fired (View Transitions pseudo-elements present) and that reduced-motion mode drops `spatial` and keeps `effects`.
- **E11 — Publish the corpus.** Release the construction-file screens with compact/medium/expanded gold renders as the responsive benchmark that §3.3 shows does not exist.

## 11. Candidate picks for skill-resources

- [Every Layout](https://every-layout.dev/layouts/) — the intrinsic-preset vocabulary (Switcher/Sidebar free; rest paid); the builder's layout algorithms in twelve pages.
- [Android window size classes](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes) — the class enum and device-coverage numbers to cite in the schema description.
- [Compose canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts) — per-class behavior tables for list-detail / supporting pane / feed archetypes.
- [Carbon `motion.json`](https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/motion/src/dtcg/motion.json) — a real DTCG motion token file to copy the shape from.
- [material-components-android Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md) — M3 Expressive spring values and the four transition-pattern definitions in one fetchable page.
- [DTCG Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) — stable `duration` / `cubicBezier` / `transition` types; the spring gap.
- [Spectrum design data](https://github.com/adobe/spectrum-design-data) — `scale-set` tokens (desktop/mobile) and an MCP server over the token set.
- [Shopify Polaris web components](https://shopify.dev/docs/api/polaris/using-polaris-web-components) — container-relative responsive values as a *builder output* target.
- [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design) — breakpoint and `@container` variant tables for the class → utility mapping.
- [Utopia](https://utopia.fyi/blog/designing-with-fluid-type-scales/) — fluid `clamp()` type/space scales that make tokens responsive by definition.
- [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) and [`@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style) — the platform primitives for container-transform and enter patterns.
- [Motion accessibility](https://motion.dev/docs/react-accessibility) — the reduced-motion policy (`reducedMotion="user"`) as a builder rule.
- [MoVer](https://mover-dsl.github.io/) — verification-DSL loop for the custom-motion island.
- [ReFLAIR (FSE 2026)](https://seal.ics.uci.edu/publications/2026_FSE.pdf) — dynamic reflow-issue detector for the responsive gate.
- [Rive `llms.txt`](https://rive.app/docs/llms.txt) — agent-readable docs for the motion-asset runtime.

## 12. Sources

- Airbnb SDUI summary (InfoQ): https://www.infoq.com/news/2021/07/airbnb-server-driven-ui/ · original deep dive (403 on fetch): https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5
- Lyft Canvas, Mobile Native Foundation discussion #47: https://github.com/MobileNativeFoundation/discussions/discussions/47
- Shopify: https://shopify.dev/docs/api/polaris/using-polaris-web-components · https://shopify.dev/docs/api/customer-account-ui-extensions/2025-07/ui-components · https://shopify.dev/docs/api/checkout-ui-extensions/latest/polaris-web-components
- Builder.io element type: https://raw.githubusercontent.com/BuilderIO/builder/main/packages/core/src/types/element.ts (docs pages 404)
- Plasmic responsive design: https://docs.plasmic.app/learn/responsive-design/
- Figma: https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties · https://help.figma.com/hc/en-us/articles/31242826664983-Create-a-responsive-component-that-automatically-adapts-to-each-breakpoint · Nearform on Grid auto layout: https://nearform.com/digital-community/figmas-new-grid-auto-layout-what-it-does-and-doesnt-yet-do/ · Figma Motion: https://www.figma.com/motion/ · Figma Make motion: https://www.figma.com/solutions/ai-animated-prototype-generator/ · Config 2026 (CMSWire): https://www.cmswire.com/digital-experience/figma-launches-code-layers-motion-at-config-2026/
- Android window size classes: https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes · canonical layouts: https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts
- SwiftUI ViewThatFits (JS-rendered, not verified): https://developer.apple.com/documentation/swiftui/viewthatfits
- Every Layout: https://every-layout.dev/layouts/ · https://every-layout.dev/layouts/switcher/ · https://every-layout.dev/layouts/sidebar/
- Tailwind: https://tailwindcss.com/docs/responsive-design · Utopia: https://utopia.fyi/blog/designing-with-fluid-type-scales/
- Container queries: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries · https://caniuse.com/css-container-queries
- ReFLAIR (FSE 2026): https://seal.ics.uci.edu/publications/2026_FSE.pdf
- Practitioner reports: https://bug0.com/blog/how-to-make-a-website-mobile-friendly-in-2026 · https://www.rapidevelopers.com/lovable-issues/fixing-layout-issues-in-lovable-on-mobile-devices
- Benchmarks: DesignBench https://arxiv.org/abs/2506.06251 · WebIGBench https://arxiv.org/abs/2606.00154 · ArtifactsBench https://arxiv.org/abs/2507.04952 · OpenSkillEval https://arxiv.org/abs/2605.23657 · CHI 2026 semantic accessibility gap (403 on fetch): https://dl.acm.org/doi/10.1145/3772363.3799364
- Spectrum: https://raw.githubusercontent.com/adobe/spectrum-design-data/main/packages/tokens/src/layout.json · https://github.com/adobe/spectrum-design-data · redirect README: https://github.com/adobe/spectrum-tokens · platform scale page (JS-rendered, not verified): https://spectrum.adobe.com/page/platform-scale/
- Material density: https://github.com/material-components/material-components-web/blob/master/packages/mdc-density/README.md
- DTCG: https://www.designtokens.org/tr/2025.10/format/ · https://www.designtokens.org/tr/drafts/format/ · announcement: https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/
- Carbon motion: https://raw.githubusercontent.com/carbon-design-system/carbon/main/packages/motion/src/dtcg/motion.json · https://github.com/carbon-design-system/carbon/blob/main/packages/motion/README.md
- Material 3 motion (Android docs): https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md · m3.material.io motion/transition pages (JS-rendered, not verified): https://m3.material.io/styles/motion/overview
- Atlassian motion: https://atlassian.design/foundations/motion
- Apple springs: https://wwdcnotes.com/documentation/wwdc23-10158-animate-with-springs/ · https://github.com/GetStream/swiftui-spring-animations · HIG motion (JS-rendered, not verified): https://developer.apple.com/design/human-interface-guidelines/motion
- View Transitions: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API · https://caniuse.com/view-transitions · @starting-style: https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
- Reduced motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion · WCAG 2.3.3: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html · Motion accessibility: https://motion.dev/docs/react-accessibility · Motion variants: https://motion.dev/docs/react-animation
- Rive: https://rive.app/docs/runtimes/state-machines · https://rive.app/docs/llms.txt
- MoVer: https://mover-dsl.github.io/ · https://arxiv.org/abs/2502.13372
