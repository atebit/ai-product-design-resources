# Design Craft as Checkable Criteria — What "Craft" Decomposes Into, and Which Parts a Lint Rule, a Judge, or a Human Has to Check

**Scope:** Document 04 of the iteration-repair-and-rubrics stream. The owner's phrase is "design craft." This doc owns the **content** of design criteria: what craft actually decomposes into, which of those parts are computable from the DOM/CSS, which need a judge, which need a person, and what the published rule sets already cover. It is the raw material a rubric is made of. **Doc 03 of this stream owns the *form* of a rubric** — criterion wording, scoring shape, weighting, versioning, how a miss becomes a durable line — and nothing here re-decides those. Also out of scope and owned elsewhere: the grading stack, the VLM-judge bias table and the deterministic-grader inventory ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)); judge calibration and human-agreement numbers ([eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)); feeding grades back into a generator ([eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)); colour mathematics, OKLCH mutation and contrast-preserving reversal ([theming/](../theming/00-theming-architecture.md)); surgical patch mechanics ([prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md)); practitioner anecdotes and X/Twitter reality (docs 05 and 06 of this stream). Researched September 2026. **Every claim links its source, and every source carries a confidence label — `[fetched]` means the file or page was downloaded and read in this session, `[search summary]` means it came only from a search index and was never opened, `[blocked: host]` means a fetch was attempted and refused.** Read the verification note below before trusting any number.

> ### Verification constraints (read this first)
>
> This session's egress policy blocked most of the design-canon web. Confirmed by probing and by `curl -sS "$HTTPS_PROXY/__agentproxy/status"`: `arxiv.org`, `dl.acm.org`, `nngroup.com`, `lawsofux.com`, `w3.org`, `m3.material.io`, `fluent2.microsoft.design`, `developer.mozilla.org`, `baymard.com`, `refactoringui.com`, `x.com`, `medium.com`, `web.dev`, `deque.com`, `stylelint.io`, `eslint.org`, `playwright.dev` and `storybook.js.org` all answered `403` at the proxy. Blocked hosts were probed once and not retried.
>
> **What was reachable, and therefore what this document is built on:** `github.com` and `raw.githubusercontent.com` (genuine primary sources — I downloaded and parsed rule files, scorers, reference docs and standards text), and `registry.npmjs.org` (package metadata: version, licence, publish date). Everything else is `WebSearch`, which runs server-side and returns titles, URLs and an index-derived summary — **that is not page verification** and is labelled `[search summary]` wherever it appears.
>
> Two consequences worth naming. First, the strongest material here — the enumerated anti-slop rules, the severity counts, the scorer defect, the typography census, the WCAG thresholds, the AIM metric list — is *primary*, read out of the source files, because GitHub was open. WCAG normative text came from the `w3c/wcag` repository's own `understanding/` HTML, which is the same content at its source. Second, the weakest material is the academic and platform layer: the two studies that measure the slop phenomenon (§2) and every platform guideline (Material, HIG, Fluent) are search-derived or unverified.
>
> **What a future session with open egress should harden, in priority order:** (1) the two empirical studies in §2 — *Usable but Conventional* (arXiv 2605.15124) and *Looks Good, But Is It Usable?* (CHI 2026 EA) — because the second is the load-bearing claim of this whole document; (2) the Laws of UX licence (CC BY-NC-ND 4.0), which decides a reuse question in §3; (3) Apple HIG's 44×44pt target guidance and Material's motion duration tokens, neither of which is verified here and neither of which is relied on; (4) NN/g's canonical wording of the ten heuristics.
>
> Same-stream docs (03, 05, 06) are referenced by number rather than by link because their filenames are not fixed yet.

## Table of Contents

1. [Decomposing "craft" into eleven checkable dimensions](#1-decomposing-craft-into-eleven-checkable-dimensions)
2. [AI slop as a diagnosable phenomenon](#2-ai-slop-as-a-diagnosable-phenomenon)
3. [Existing heuristics and rubrics, evaluated for reuse](#3-existing-heuristics-and-rubrics-evaluated-for-reuse)
4. [What is measurable without judgment](#4-what-is-measurable-without-judgment)
5. [What genuinely requires a human, and how to sample it](#5-what-genuinely-requires-a-human-and-how-to-sample-it)
6. [Craft criteria for the specific case of a patch](#6-craft-criteria-for-the-specific-case-of-a-patch)
7. [Cross-cutting themes](#cross-cutting-themes)
8. [Recommendations: the craft dimension table and the craft floor](#recommendations-the-craft-dimension-table-and-the-craft-floor)
9. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
10. [Sources](#sources)

---

## 1. Decomposing "craft" into eleven checkable dimensions

**What it is:** Turning the word "craft" into a finite list of dimensions, each with (a) an *observable* — the thing in the artifact that carries the property — and (b) a *check* that returns something other than an adjective.

**Why it matters:** "Make it feel more crafted" is unactionable for a model and unfalsifiable for a reviewer. Every durable improvement in this stream's loop depends on the miss being nameable, and a rubric line can only be written about something that has an observable. The decomposition below is also the join between this doc and doc 03: doc 03 decides how these become criteria; this section decides *what there is to make criteria about*.

**Key findings:**

The honest starting point is that **there is no published, peer-reviewed decomposition of UI craft into measurable dimensions.** What exists is three separate literatures that each cover a slice, plus one recent genre of practitioner artifact — agent skills with machine-checkable rule sets — that is currently the densest source of concrete numbers anywhere:

- **Computational aesthetics** (Aalto Interface Metrics) measures pixel-level properties: clutter, colourfulness, grid quality, white space, predicted attention.
- **Accessibility standards** (WCAG, axe-core) measure a floor that overlaps craft heavily — contrast, target size, reflow, focus — with zero-false-positive rules.
- **Usability heuristics** (Nielsen, Shneiderman) name interaction qualities but define no measurement at all.
- **Agent design skills** ([ui-craft](https://github.com/educlopez/ui-craft), [Hallmark](https://github.com/Nutlope/hallmark), [open-design](https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md)) supply thresholds — ratios, millisecond bands, character counts, percentage footprints — because an agent cannot act on an adjective either.

The eleven dimensions below are the union of those four, deduplicated. Each row names what already exists to check it and splits the check by who can perform it. The cross-cutting constraint on all of them is the one established in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md): **a VLM looking at a screenshot may grade presence and gross layout and may not grade spacing, alignment or contrast** — DiffSpot's best model recalls only 40.7% of true CSS changes, Hard-tier recall below 23% for every model. That is not re-derived here; it is the reason every "measurable" column below routes through the DOM and computed styles rather than through pixels-plus-a-model.

### 1.1 Visual hierarchy

**Observable:** the rank order in which elements are noticed, and whether that order matches the intended one.

Published material is thinner than any other dimension. The two concrete handles are (a) the *squint test* — blur the render and check that one element dominates, which ui-craft grounds in the visual system's low-pass spatial-frequency filter and operationalises as `filter: blur(8px)` in DevTools ([layout.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/layout.md), fetched) — and (b) *saliency prediction*, which automates exactly that: AIM's `m9` runs UMSI (Unified Model of Saliency and Importance) to produce "the predicted human attention on different design classes and natural images, visualized as a heatmap," and `m30` runs MD-EAM, a multi-duration element attention model; both carry AIM's highest relevance rating (5/5) ([metrics.json](https://raw.githubusercontent.com/aalto-ui/aim/aim2/metrics.json), fetched and parsed).

Thresholds that exist: adjacent hierarchy levels must differ by **≥1.5×** in at least one signal (size, weight, contrast, surface area, position) — "a 1.2x difference reads as an accident, not a decision"; four levels is the practical maximum; navigation/footer/sidebar must sit *below* content in perceived weight (ui-craft `layout.md` and Finish Bar Pass 1, fetched). Hallmark's pre-emit self-critique makes hierarchy one of six 1–5 axes, defined as "Can a reader tell, in 2 seconds, what's primary, secondary, tertiary?" ([slop-test.md](https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/references/slop-test.md), fetched).

| Measurable from DOM/CSS | Needs judgment |
|---|---|
| Count of distinct computed `font-size` values in viewport; ratio between the two largest; single `<h1>`; heading order (axe `heading-order`, Moderate, best-practice); DOM reading order vs visual order via `getBoundingClientRect` | Whether the element that dominates is the *right* one for the user's goal; whether the saliency heatmap's peak is the primary action |

### 1.2 Spatial system — spacing scale, optical alignment, density

**Observable:** every `margin`, `padding`, `gap`, and the geometric relationship between element edges.

The invariant that practitioner rule sets converge on is **space within a group < space between groups < space between sections**, checked at three nesting levels minimum, with section breaks ≥2× the inter-block spacing (ui-craft `layout.md` + Finish Bar Pass 4, fetched). Hallmark's gate 24 is the blunt version: "Is any padding / gap / margin a value that isn't on the named spacing scale (`--space-3xs` … `--space-5xl`, multiples of 4 px)? Arbitrary `padding: 17px` is a tell."

Alignment has a real metric: AIM's `m21` **Grid quality** — "the internal alignment of the various components or identifiable regions of the GUI with respect to each other" — returns *number of alignment points*, *number of visual GUI blocks*, and *number of block sizes*, with and without children (evidence 4/5, relevance 4/5). AIM's `m22` **White space** returns the proportion of white space (relevance 4/5). Optical alignment — the ±1–2px nudges that geometry cannot supply — remains judgment: icon-leading buttons need ~2px trimmed on the icon side, triangular glyphs need a nudge toward their visual mass, and the durable fix for a persistently off-balance SVG is to correct its `viewBox` rather than compensate per instance (ui-craft `layout.md`, fetched).

| Measurable from DOM/CSS | Needs judgment |
|---|---|
| Every spacing value ∈ scale (histogram of computed `padding`/`margin`/`gap`, flag off-scale); scale-adherence rate; alignment-point count (AIM m21); white-space ratio (AIM m22); concentric-radius arithmetic (`outer = inner + gap`) | Whether density is right for the surface type (a console legitimately compresses); whether an optical nudge is needed; whether a broken rhythm is deliberate |

### 1.3 Typography — scale, measure, leading, weight contrast

**Observable:** the set of computed `font-size`, `font-weight`, `line-height`, `font-family` values actually rendered, and the character count per line.

This is the dimension with the best *measured* practitioner evidence found anywhere. ui-craft's `typography.md` reports a census of four reference surfaces at 2120×1143 and derives three checkable rules from it (fetched):

| | A | B | C | D |
|---|---|---|---|---|
| distinct sizes rendered in the fold | 9 | 4 | 5 | 4 |
| sizes below 14px | 4 | 0 | 2 | 2 |
| display size | 64 | 64 | 48 | 64 |
| next size used below it | 20 | 24 | 16 | 16 |
| the jump | 3.2× | 2.7× | 3.0× | 4.0× |
| weight of the display type | 510 | 450–500 | 400 | 500 |
| distinct weights | 3 | 3 | 3 | 2 |

Rules: **four to six steps, not nine** (`type/crowded-ladder` fires at 8+ distinct sizes); **the display step sits 2.5×–4× above the step below it** (`type/display-not-separated` fires below 2.0×); **display type is not bold** (`type/bold-display` fires at ≥40px and weight ≥700). The stated rationale is the one that matters for AI output: "Emitting most of a modular scale produces a gradient of sizes where every step is 1.2x the last — legible, forgettable, and the single loudest tell of a surface built by an agent rather than designed."

Measure has two independent authorities: WCAG 1.4.8 Visual Presentation states "Lines should not exceed 80 characters or glyphs (40 if CJK)" ([w3c/wcag understanding/20/visual-presentation.html](https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/visual-presentation.html), fetched); Hallmark gate 25 narrows it to 45–75ch — "under 45 ch is choppy, over 75 ch loses the eye." Weight ceiling: ≤3 font weights in the viewport (Finish Bar Pass 2); ≤3 font families with the outlier face used in at most two slots (Hallmark gates 37–38). Hallmark gate 55 adds a real typographic failure that only shows on wrap: all-caps display with `line-height` < 1.0 causes cap-tops of line N+1 to collide with line N — floor 1.0, recommended 1.02–1.08.

| Measurable from DOM/CSS | Needs judgment |
|---|---|
| Distinct size count; largest/next ratio; display weight; distinct family count; line length in `ch` from container width ÷ average glyph advance; `line-height` on uppercase display; sizes below 14px | Whether the typeface fits the brand; whether the ladder's *floor* suits the product type (dense console vs marketing) |

### 1.4 Colour and contrast

**Observable:** every `(color, background-color)` pair as computed, plus the palette's structure.

This is the most fully solved dimension and the one that should never appear in a judge rubric. WCAG 1.4.3 sets 4.5:1 and 3:1 as threshold values, explicitly not rounded — "4.499:1 would not meet the 4.5:1 threshold" ([understanding/20/contrast-minimum.html](https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html), fetched). axe-core's `color-contrast` rule (Serious, `wcag2aa`, `wcag143`) and `color-contrast-enhanced` (AAA) implement it; axe-core is MPL-2.0 and at **4.13.0, published 2026-09-10** ([npm](https://registry.npmjs.org/axe-core), fetched; rule list from [doc/rule-descriptions.md](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md), fetched).

The failures that automated contrast checking *misses* are the interesting ones, and Hallmark's gates 40–41 name them precisely: text inside a card that inherits `color` while the card switched `background`; a focus ring that clears 3:1 against its element but not against the page; and the black-on-black bug — "if the computed text colour and fill are within 5 % lightness AND 0.05 chroma in OKLCH, fail." Also: "any section / panel whose `background-color` is OKLCH lightness < 50 % must also swap its text colour." These are computable and are *not* what axe reports, because axe reports the pair it can resolve, not the inheritance mistake that produced it.

Beyond the floor, colour craft is palette structure: accent footprint ≤~5% of a viewport by area (Hallmark gate 23), neutrals tinted toward the anchor hue rather than zero-chroma (gate 22), no pure `#000`/`#fff` as a base. AIM supplies population-level colour measures — colourfulness (Hasler & Süsstrunk, `m15`), colour harmony (`m20`), dynamic clusters (`m12`), and a colour-blindness simulation (`m23`, relevance 5/5). Everything about *which* hue is right belongs to [theming/](../theming/00-theming-architecture.md), not here.

### 1.5 State completeness and transitions

**Observable:** whether a designed rendering exists for each state a data-touching component can be in.

The best-specified lattice is ui-craft's **eight** states — Idle, Loading, Empty, Error, Partial, Success, Conflict, Offline — each with a "what to design" and a named common mistake ([state-design.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/state-design.md), fetched). *(Correction to a neighbouring doc: [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md) describes this as a "seven-state model — idle, loading, empty, error, partial, conflict, offline." The current lattice has eight; **Success** is missing from that list. Finish Bar Pass 6 also says "all eight states.")*

Numbers attached to states: skeleton "shown after ~200ms to avoid flash on fast connections"; skeleton geometry must match the final layout; empty state = one line of explanation + exactly one primary action; partial = unknown values render as em-dash, "never `null`, `N/A`, or `0` for a value that isn't actually zero"; error = inline and actionable, never a modal for a recoverable field error.

State *presence* is deterministic if the states are enumerated somewhere (stories, construction file, route map) — see [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md), which already classifies state coverage as "presence exact; quality tentative." ui-craft's `state/missing-empty-or-error` rule approximates it statically: a file with data-fetching but no error/empty branch rendered.

An important structural idea from the same repo, worth importing into doc 03: ui-craft separates the **completeness axis** (does this screen have the parts screens of its kind need) from the **distinction axis** (is this designed), reports them side by side, and refuses to score completeness at all — "No score, no count, no percentage. '6 of 8' makes `not-needed` read as a failure and turns a review into a grade… Coverage never gates" ([coverage.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/coverage.md), fetched). Its five markers are present / partial / missing / not-needed (requires a stated reason) / unknown.

### 1.6 Motion — duration, easing, purpose

**Observable:** every `transition`, `animation`, and keyframe, plus the absence of one where a visually significant change occurs.

Motion has hard numeric bands and they are consistent across sources. ui-craft's `motion.md` (fetched) gives perception bands — under 100ms reads as instant; 100–250ms is a transition that doesn't slow the user; 250–400ms is a screen-level event; 400ms+ is "deliberate and slow… Productive UI has no business here" — and a five-token scale (120/200/280/400/600ms) with the instruction "Never `transition: 153ms`. Never `200ms` on one button and `220ms` on another for the same state. A bespoke duration is a finding." Finish Bar Pass 7 bounds UI transitions to 100–400ms.

Easing rules that are checkable as string matches: no `ease-in` for UI arrivals; no `linear` for spatial motion (opacity fades, loading bars and continuous rotation excepted); no bounce/elastic on functional UI; no different easings on entrance vs exit of the same element. Both rule sets independently ban animating layout properties (`width`, `height`, `top`, `left`, `margin`, `padding`) and `transition: all` — ui-craft as `transition-all` (critical) and `left-top-animation` (critical), Hallmark as gates 10 and 14. Hallmark gate 15 adds one almost nobody writes down: "Does the focus ring transition into existence (fade in)? (Focus rings must appear instantly.)" And gate 27: every `transform`/`animation` keyframe must have a `@media (prefers-reduced-motion: reduce)` fallback; ui-craft's reduced-motion contract collapses durations to ≤80ms or removes entrance animation.

The one genuinely hard part is the **motion gap** — a state change that *snaps* where a transition is expected. That requires knowing which changes are visually significant, which is judgment, though it can be narrowed deterministically: enumerate interactive elements, diff computed styles between states, and flag pairs whose `opacity`/`transform`/`background` differ with no `transition-property` covering them.

### 1.7 Copy and voice

**Observable:** every visible string.

Three classes of check, in descending objectivity. **Placeholder detection** is pure string matching and both rule sets gate on it: ui-craft `copy/placeholder-shipped` (critical) for lorem ipsum, TODO, fake names; Hallmark gate 19 for "Jane Doe / John Smith" and startup clichés ("Acme, Nexus, Seamless, Unleash"). **Structural copy rules** are near-deterministic: an error message has three parts in order — what happened + why + what to do, so "'Something went wrong' has none. 'Invalid input' has only the first"; an empty state contains exactly one primary action; CTAs name the outcome (`generic-cta`, major); no em-dash flood (3+ em dashes in text nodes); no caps "OR" divider; no eyebrow flood (4+ uppercase tracked labels). **Voice consistency** is judgment with a tool: the check is "extract every visible string… read each one out of context — stripped of layout and visual hierarchy. Each should still communicate clearly and sound like the same product" (Finish Bar Pass 8). [Vale](https://github.com/errata-ai/vale) (MIT, 6.1k stars, fetched) is the existing engine for the machine-checkable half — YAML rules for banned words, terminology substitution, and readability — and `textlint` (MIT, 15.8.0, published 2026-08-01) and `alex` (MIT, 11.0.1, 2023-08-18) cover related ground ([npm](https://registry.npmjs.org/textlint), fetched).

Honest verdict: whether the copy is *right* — not merely present, grammatical and on-terminology — is the single least automatable dimension in the list. See §5.

### 1.8 Affordance and feedback

**Observable:** whether interactive things look interactive, and whether acting on them produces a perceptible response.

This is where accessibility and craft are the same check. axe-core covers the semantic half at zero false positives: `label` (Critical), `nested-interactive` (Serious), `focus-order-semantics` (Minor, experimental), `label-content-name-mismatch` (Serious), `aria-hidden-focus` (Serious). The craft half is state completeness *per control*: Hallmark gate 26 requires at least default + hover + `:focus-visible` + `:active` + `:disabled` present in code for every interactive element; ui-craft's `no-focus-visible` (major) fires on a file with `:hover` but no `:focus-visible` pairing, and `a11y/outline-none-no-replacement` (critical) on `outline: none` without a replacement.

The input-state gate (Hallmark 39) is the most specific published statement of "almost-right" craft I found, and every clause is computable: border-width must not shift between states; the focus ring must be an `outline`, not a `border`; input height must equal adjacent button height on the same form (44px floor) — "38 px input + 44 px button is the most common form-tuning slop"; the helper-text slot must reserve `min-height: 1lh` so an appearing error doesn't push the page down; disabled needs three channels (`opacity: 0.55` AND `cursor: not-allowed` AND the `disabled` attribute or `aria-disabled`).

Target size is normative: WCAG 2.5.8 requires targets "at least 24 by 24 CSS pixels in size," with five exceptions including the spacing exception — undersized targets pass if a 24px-diameter circle centred on each bounding box does not intersect another target's circle ([understanding/22/target-size-minimum.html](https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html), fetched). axe implements it as `target-size` (Serious, `wcag22aa`, `wcag258`). Apple's 44×44pt guidance is widely quoted but `developer.apple.com`'s content is JS-rendered and the documentation JSON endpoint returned 404, so it is **not verified here**.

### 1.9 Error prevention and recovery

**Observable:** whether destructive and irreversible actions are guarded, and whether a failed action leaves a path forward.

Nielsen's H5 (Error Prevention) and H9 (Recognise, Diagnose, Recover) name it; nothing in the standards measures it. The practitioner rule sets supply proxies: `dark-pattern/destructive-no-confirm` (critical — delete/remove verbs in buttons with no confirmation dialog in the file), `dark-pattern/confirmshaming` (critical), `forms/autocomplete-missing` (major), `forms/placeholder-as-label` (critical), `a11y/streaming-no-live-region` (critical — streaming content with no `aria-live`). The CHI 2026 evidence in §2 says this is exactly where generated UI is weakest, which makes it the highest-value dimension to encode as a hard gate rather than a judge line.

### 1.10 Consistency with the design system

**Observable:** the ratio of token references to raw values, and whether a token is used in its intended role.

Token discipline is fully deterministic and already inventoried in [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md) (Deslint's `no-arbitrary-*` rules, `eslint-plugin-tailwindcss` `no-arbitrary-value`, `stylelint-declaration-strict-value`). Two additions verified today: **`@lapidist/design-lint`** — "Design System Runtime — DSR kernel, DSQL, and lint surface for design token governance," MIT, **8.0.0, modified 2026-05-12** ([npm](https://registry.npmjs.org/@lapidist/design-lint), fetched; its GitHub repo could not be located at the two obvious paths, both 404) — and ui-craft's own token-discipline dimension, a flat −2 per finding for raw hex, off-scale radius, off-scale spacing, off-scale z-index ([score.mjs](https://raw.githubusercontent.com/educlopez/ui-craft/main/evals/quality/score.mjs), fetched). Hallmark gate 48 states the generation-time version: "Did Hallmark introduce any colour value or `font-family` declaration *outside* the design tokens defined in `:root`… the model picked the theme, then forgot it and freestyled."

The part that stays judgment is unchanged from [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md): a token used in the *wrong role* (`--color-danger` on a primary button) is on-system and off-intent, and no public benchmark measures that rate.

### 1.11 Restraint

**Observable:** the amount of stuff, and whether each piece earns its place.

Restraint is the dimension people mean when they say a generated screen "looks AI." It has more measurement behind it than expected. AIM's Perceptual Fluency category is essentially a restraint battery: **Feature congestion** (`m8`, "makes use of extensive modeling of what makes items in a display visually salient"), **Contour density** (`m4`, ratio of contour pixels to all pixels, evidence 4/5), **Contour congestion** (`m6`, "the mental effort needed to differentiate spatially proximal lines"), **Subband entropy** (`m7`), and **White space** (`m22`). Rule-set proxies: accent ≤5% of viewport by area; ≤3 font weights; ≤3 families; icon families = 1; "no element has more than one hover effect at the same time" (Hallmark 13); "Does the hero contain a decorative element… that has no semantic anchor in the content?" (Hallmark 45). Hallmark makes restraint a named self-critique axis: "Have you removed everything that isn't earning its place?"

**Open questions:** No study correlates any AIM metric with expert judgments of *craft* specifically (the underlying papers correlate them with aesthetics impressions and visual-complexity ratings). Nobody has published a per-dimension reliability figure for these eleven — i.e. which of them two designers agree on. The motion-gap check has no open implementation. And "optical alignment" has no measurement at all: the only published handle is a human at 200% zoom.

---

## 2. AI slop as a diagnosable phenomenon

**What it is:** The claim that AI-generated UI has a recognisable signature, and the conversion of that signature from complaint into criteria.

**Why it matters:** If slop is a *distribution* rather than a *defect*, then no accessibility gate and no usability heuristic will catch it — a purple-gradient centred-hero emoji-grid page can pass WCAG AA, score 100 on Lighthouse, and satisfy all ten Nielsen heuristics. The rubric line that catches it has to be written about the signature itself.

**Key findings:**

**The phenomenon is measured, twice, and both measurements say the same thing: pragmatically fine, hedonically flat.**

- *Usable but Conventional: An Empirical Study on the UX of AI-Generated Interface Prototypes* — 92 participants evaluated AI-generated and human-created prototypes without being told which was which, measured with UEQ-S across pragmatic and hedonic dimensions. Result: "positive evaluations in pragmatic aspects, such as usability and efficiency, and neutral or negative evaluations in hedonic aspects, including originality and innovation," with the conclusion that GenAI "tends to reinforce visual and structural patterns that affect perceptions of originality." ([arXiv 2605.15124](https://arxiv.org/abs/2605.15124) — **[search summary]; [blocked: arxiv.org]**, abstract and author list via search.)
- *Looks Good, But Is It Usable? Evaluating Usability in AI-Generated Mobile User Interfaces*, CHI 2026 Extended Abstracts — 138 mobile UI screens from three tools (Figma, Banani, Stitch) evaluated against Nielsen's ten heuristics by expert inspection. Low Heuristic Support Rates concentrated on **H10 (Help and Documentation), H9 (Error Recovery), H7 (Efficiency of Use) and H5 (Error Prevention)**, described as "a significant performance gap between visual and functional usability," with the authors calling for "heuristic-aware generative models." ([10.1145/3772363.3799002](https://dl.acm.org/doi/full/10.1145/3772363.3799002) — **[search summary]; [blocked: dl.acm.org]**.)

That second result is the most directly usable finding in this document: **generated UI fails on the support-and-recovery half of the heuristic set, not the visual half.** A craft rubric weighted toward visual polish will therefore report improvement while the actual gap stays open.

**The convergence has a named default, and it is not a conspiracy — it is a dependency.** The single most-installed component set in the generated-UI stack, [shadcn/ui](https://github.com/shadcn-ui/ui), stands at **123.6k stars, MIT**, describing itself as "Composable, accessible components with thoughtful defaults" [fetched]. Those defaults are good, which is precisely the problem: a model that reaches for the most probable component library, its most probable icon set and its most probable accent lands every build in the same place, and each artifact of that landing is individually defensible. This is why the slop rule sets below are written as *bans on defaults* rather than as quality rules — open-design's first cardinal sin is the exact hex list `#6366f1 #4f46e5 #4338ca #3730a3 #8b5cf6 #7c3aed #a855f7`, and its rationale is "Indigo is the textbook AI tell," not "indigo is bad." No published work measures how much of the observed homogenisation is attributable to shared component defaults versus to model priors; it is a clean, cheap experiment nobody has run.

The general homogenisation literature (PNAS "Echoes in AI," which introduces a "Sui Generis score" to quantify plot diversity in LLM output; several 2026 arXiv papers on structural convergence) supports the mechanism but none of it is about interfaces — **[search summary]**, and none should be cited as UI evidence.

**The practitioner rule sets are the real corpus, and they are large and converging.**

| Rule set | Verified today | Size and shape | Licence |
|---|---|---|---|
| [ui-craft](https://github.com/educlopez/ui-craft) | **325 stars**, MIT, 265 commits, last commit **2026-09-03** [fetched] | **Exactly 43 rules** in `scripts/detect/rules.mjs` — counted by parsing the file: 14 `critical`, 25 `major`, 2 `minor`, 2 `warn`. Plus token-discipline and five static a11y checks feeding a deterministic 0–100 UICraftScore | MIT |
| [Hallmark](https://github.com/Nutlope/hallmark) (Together AI) | **28.5k stars, 1.5k forks**, MIT, 138 commits [fetched] | **58 gates** in `references/slop-test.md` (the README says "fifty-seven"; the file header and SKILL.md both say 58 — a real off-by-one in its own docs), plus a six-axis pre-emit self-critique scored 1–5 | MIT |
| [open-design `craft/anti-ai-slop.md`](https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md) | Apache-2.0 (badge in README); rule file read raw [fetched] | 7 "cardinal sins" auto-enforced at P0 by a `lint-artifact` linter, 4 P1 soft tells, 3 P2 polish tells, each flagged inline "(guidance, not auto-checked)" where it is not enforced. Adapted from `referodesign/refero_skill` (MIT) | Apache-2.0 |
| `LeoStehlik/no-slop-ui`, `miqdadbadjuber/anti-slop`, `wholiver/swiftui-design-skill` | Surfaced by search; `no-slop-ui` README 404'd on raw, the other two fetched but add no rules the three above lack | — | — |

**ui-craft's 43 rules, enumerated by id and severity** (from the parsed registry, which is the authoritative list — the README's prose grouping is lossy):

`transition-all` · `bounce-elastic-easing` · `animate-bounce` · `purple-cyan-gradient` · `uppercase-heading` · `left-top-animation` · `dark-pattern/confirmshaming` · `dark-pattern/destructive-no-confirm` · `a11y/icon-only-button-no-label` · `a11y/modal-without-dialog` · `forms/placeholder-as-label` · `a11y/outline-none-no-replacement` · `a11y/streaming-no-live-region` · `copy/placeholder-shipped` **(the 14 critical)** — `gradient-text-metric` · `emoji-feature-icon` · `pure-black-text` · `generic-cta` · `absolute-zindex` · `setTimeout-animation` · `aria-label-emoji` · `no-focus-visible` · `pixel-radius-inconsistency` · `dataviz/categorical-rainbow` · `state/missing-empty-or-error` · `a11y/heading-order-skip` · `layout/image-height-from-attribute` · `tables/no-overflow-handling` · `forms/autocomplete-missing` · `type/crowded-ladder` · `css/duplicate-declaration` · `perf/image-no-dimensions` · `copy/or-divider-caps` · `auth/brand-flood-panel` · `layout/eyebrow-flood` · `copy/scroll-cue` · `copy/section-number-eyebrow` · `copy/duplicate-cta-intent` · `copy/em-dash-flood` **(the 25 major)** — `inline-any-style` · `unit-mixing` **(warn)** — `type/display-not-separated` · `type/bold-display` **(minor)**.

**A verified defect worth knowing before adopting the score.** `evals/quality/score.mjs` defines `anti_slop: { critical: 8, major: 4, warn: 1 }` and branches on exactly those three strings. Two rules — `type/display-not-separated` and `type/bold-display` — carry `severity: "minor"`, which matches no branch. **Those two rules therefore contribute zero penalty to UICraftScore.** Both are typography-ladder rules, i.e. two of the three rules derived from the repo's own measured type census are currently scored free. (Both files fetched and cross-read today; this is not inferred from documentation.)

**Converting the signature into criteria.** The table below is the deliverable: each marker, the rule that catches it, where the rule comes from, and an honest objectivity call. "Objective" means a program returns the same answer every run and reasonable people would not dispute it. "Conventional" means the threshold is a defensible convention, not a fact. "Taste" means the rule encodes a preference.

| Slop marker | Checkable rule | Source | Objectivity |
|---|---|---|---|
| Purple→cyan / indigo→pink hero gradient | No gradient whose stops span the purple–cyan hue arc; also ban exact Tailwind indigo literals `#6366f1 #4f46e5 #4338ca #3730a3 #8b5cf6 #7c3aed #a855f7` as a solid accent | ui-craft `purple-cyan-gradient` (critical; reads hue from hex/rgb/hsl/oklch, not just class names); open-design sin 1 | **Objective** (literal match) / conventional (hue arc) |
| Gradient text on a headline or metric | `background-clip: text` + `text-transparent` on large text → fail | ui-craft `gradient-text-metric`; Hallmark gate 2 ("No genre allows gradient text") | **Objective** |
| Centred-everything hero | Eyebrow + title + lede + CTA all on one centred vertical axis, or `min-height: 100vh` with everything centred → fail; at most two centred elements | Hallmark gate 6 | Conventional |
| Three-up icon-above-heading feature grid | 3-equal-column card grid with icon-above-heading tiles → fail | Hallmark gate 3 | Conventional |
| Emoji as feature icons | Emoji glyph inside `<h*>`, `<button>`, `<li>`, `class*="icon"`, or as a feature/step/pricing-tier icon → fail | ui-craft `emoji-feature-icon` (major) + `aria-label-emoji`; Hallmark gate 30b; open-design sin 3 | **Objective** |
| Icon soup / mixed libraries | More than one icon library on a page → fail; one family, stroke weight matched to type weight (1.5px @ 400, 2px @ 500) | Hallmark gate 30a; ui-craft Finish Bar Pass 5 | **Objective** (count) / conventional (stroke match) |
| Uniform 16px everything | Every `padding`/`gap`/`margin` ∈ named scale; rhythm invariant within < between < section at three nesting levels; section break ≥2× inter-block | Hallmark gate 24; ui-craft Finish Bar Pass 4 | **Objective** (scale membership) / conventional (rhythm) |
| Uniform border-radius on every element | Buttons, cards and inputs must not share one radius; mixing `rounded-*` tokens with raw `border-radius: Npx` is a separate finding | ui-craft Finish Bar Pass 9 ("the single most recognizable signal of generated UI"), `pixel-radius-inconsistency` (major) | Taste (uniformity) / **objective** (token+raw mixing) |
| Twelve-step type gradient | ≥8 distinct font sizes → fail; largest/next ratio < 2.0 → fail; display ≥40px at weight ≥700 → fail | ui-craft `type/crowded-ladder`, `type/display-not-separated`, `type/bold-display` | **Objective** (all three are counts/ratios) |
| Inter-for-everything / system-default display | Display font ∈ {Inter, Roboto, Open Sans, Poppins, Lato, system default} → fail on marketing surfaces | Hallmark gate 1 | Taste |
| Bounce on hover, `transition: all` | `transition: all`, `animate-bounce`, overshoot cubic-beziers on UI state changes, animating layout properties, >1 simultaneous hover effect | ui-craft `transition-all`/`bounce-elastic-easing`/`animate-bounce`/`left-top-animation` (all critical); Hallmark 10–14 | **Objective** |
| Stagger-animate everything on load | Entrance stagger on unrelated element groups; decorative motion gating input | ui-craft README anti-pattern list; `motion.md` "Never block interaction while a stagger plays" | Conventional |
| Aurora blobs / mesh gradient background | Abstract background > one accent colour, > ~5% footprint, or animated mesh on the whole page → fail | Hallmark gate 29 | Conventional |
| Fake browser / phone / terminal chrome | Hand-built URL pill + traffic-light dots, notch frames, mock IDE tabs → fail; use a real screenshot or nothing | Hallmark gate 47 | **Objective** (pattern) / conventional (ban) |
| Invented metrics ("10× faster", "99.9% uptime") | Any quantitative claim the user did not supply and no source backs → fail; replace with `—` + labelled placeholder | Hallmark gate 46; open-design sin 6 | **Objective** given the brief; otherwise judgment |
| Lorem ipsum / John Doe / TODO shipped | String match on placeholder markers and cliché names | ui-craft `copy/placeholder-shipped` (critical); Hallmark 19; open-design sin 7 | **Objective** |
| Generic CTA ("Learn more", "Get started") | Button/link text ∈ generic phrase list → fail; also two CTAs with the same intent in different words | ui-craft `generic-cta`, `copy/duplicate-cta-intent` | **Objective** (list) / judgment (intent duplication) |
| Eyebrow flood / numbered section labels | ≥4 uppercase tracked labels; zero-padded ordinal + separator + word; eyebrow beside (not above) a heading | ui-craft `layout/eyebrow-flood`, `copy/section-number-eyebrow`; Hallmark gate 54 | **Objective** (counts) |
| Em-dash flood | ≥3 em dashes in visible text nodes | ui-craft `copy/em-dash-flood` | **Objective** |
| Scroll cue ("Scroll to explore ↓") | Text/arrow scroll prompt present → fail | ui-craft `copy/scroll-cue` | Taste |
| `z-index: 9999` | Any z-index outside the semantic scale (10/20/30/40/50/60) | ui-craft `absolute-zindex`; `layout.md` scale | **Objective** |
| Default nav / default footer fingerprint | Wordmark-left + 4–5 inline links + button-right + hairline border + white bg → fail unless justified; 4-column Product/Company/Resources/Legal footer + social row → fail | Hallmark gates 42–43 | Taste (but mechanically checkable) |
| Hero → 3 features → CTA → footer skeleton | Macrostructure must differ from the last output in the project (stamp recorded in CSS + `.hallmark/log.json`) | Hallmark gate 8; open-design P1 | Conventional; **the only marker anyone checks across generations** |
| Pure `#000` text / pure `#fff` base | `color: #000`/`text-black` → fail; pure white base allowed only in modern-minimal | ui-craft `pure-black-text` (major); Hallmark gate 7 | Conventional |

**What the slop corpus is missing.** Almost every rule is a *visual* or *string* tell. Against the CHI 2026 finding — that generated UI actually fails on help, error recovery, efficiency and error prevention — the slop rule sets are aimed at the wrong half of the problem. ui-craft's `state/missing-empty-or-error`, `dark-pattern/destructive-no-confirm`, `forms/*` and `a11y/streaming-no-live-region` are the only rules in the whole corpus pointed at recovery, and there is nothing anywhere about help, undo, keyboard shortcuts, or progressive disclosure for experts.

**Open questions:** No one has measured whether removing these markers changes a human preference score — the arenas in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md) would be the natural instrument and nobody has run it. No published work measures the false-positive rate of any anti-slop rule on human-designed pages, which is the number that would tell you whether "purple gradient" is a defect or a style. And the diversification gates (Hallmark 8, 32) are the only rules in the corpus that are *stateful across generations* — whether that is the right shape for the rest is untested.

---

## 3. Existing heuristics and rubrics, evaluated for reuse

**What it is:** A reuse audit — for each published set, what it covers, what it misses for AI-generated work specifically, and whether you can legally put it in your rubric.

**Why it matters:** Reusing a named set buys shared vocabulary and reviewer familiarity. It also imports the set's blind spots, and in two cases imports a licence that forbids the adaptation a rubric requires.

**Key findings:**

| Set | What it covers | What it misses for AI-generated work | Licence / reusability |
|---|---|---|---|
| [Nielsen's 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) (1994) | Interaction qualities: status visibility, real-world match, control/freedom, consistency, error prevention, recognition over recall, flexibility, minimalist design, error recovery, help | Zero visual-craft coverage — no spacing, type, colour, motion. Defines no measurement, so two reviewers can score the same screen differently with no adjudication. **CHI 2026 shows generated UI fails H5/H7/H9/H10 specifically** — the heuristics diagnose the gap but cannot gate it | **[search summary]; [blocked: nngroup.com]**; NN/g asserts copyright on its articles. The *names* are unprotectable facts; verbatim definitions are not. ui-craft restates all 10 with a 1–5 anchored rubric under MIT ([heuristics.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/heuristics.md), fetched) — that is the reusable rendering |
| Shneiderman's 8 golden rules (1986, *Designing the User Interface*) | Consistency, shortcuts, informative feedback, dialogue closure, error handling, easy reversal, locus of control, reduce memory load | Same gaps as Nielsen plus heavier desktop-era framing; "shortcuts for frequent users" is the only one Nielsen lacks | Textbook; canonical source is the book. All fetchable renderings today were third-party **[search summary]**. Paraphrase, do not quote |
| **WCAG 2.2** | A real floor with normative numbers: 1.4.3 contrast 4.5:1 / 3:1 (threshold values, not rounded); 1.4.8 line length ≤80 chars (40 CJK); 1.4.10 reflow at 320 CSS px (256 vertical); 2.5.8 target size 24×24 CSS px with five exceptions | Deliberately a floor, not craft — a screen can be AA-perfect and slop. Automation covers ~57% of a11y issues by volume ([eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md)) | W3C Software and Document Notice and Licence — free to use and quote with attribution. **The most reusable thing in this table.** Normative text fetched from `w3c/wcag` raw, since `w3.org` was blocked |
| Gestalt principles | Proximity, similarity, common region, continuity, closure — the perceptual basis for *why* spacing is the primary grouping signal | Descriptive, not prescriptive. Yields one usable rule ("use spacing before structure — before reaching for a card, background or divider, try creating the group with spacing alone") | Public-domain psychology; the ui-craft restatement is MIT (fetched) |
| [Refactoring UI](https://refactoringui.com/) (Wathan & Schoger) | The closest thing to a craft canon: hierarchy by size/weight/colour, spacing first, design without colour first, layered shadows, accent as accent | Paid book, no machine-readable rule list, no numbers you can cite. Its rules have largely been absorbed into the agent skills above | **Commercial, all rights reserved.** Not licensable for a rubric. **[search summary]; [blocked: refactoringui.com]**; a third-party summary exists at [erikuus/good-ui](https://github.com/erikuus/good-ui) |
| [Laws of UX](https://lawsofux.com/) (Yablonski) | Fitts, Hick, Miller, Jakob, Doherty, Tesler, Von Restorff, serial position, aesthetic-usability effect | Psychology laws, not design criteria — they explain, they do not check. Fitts and Hick are the only two with a numeric form you could compute | **CC BY-NC-ND 4.0** per lawsofux.com/info **[search summary]; [blocked: lawsofux.com]**. NonCommercial *and* NoDerivatives — you may not adapt the content into a rubric for commercial work. Use the underlying laws (public science), not the site's text. ui-craft implements six of them as a MIT-licensed audit with pass/fail per law |
| Material 3 / Apple HIG / Fluent 2 review checklists | Platform-normative numbers: motion duration/easing token sets, touch targets, type ramps, elevation | Platform-scoped and brand-scoped; a Material checklist will fail a correct non-Material design. None ships as a machine-readable rule set | `m3.material.io` and `fluent2.microsoft.design` blocked; `developer.apple.com` reachable but JS-rendered and its doc JSON 404'd — **no platform guidance is verified in this document.** Treat all platform numbers here as unverified |
| Baymard research checklists | ~700 e-commerce UX guidelines from moderated testing — the only large body of *empirically derived* interface criteria | E-commerce-scoped; no visual-craft coverage; behind a paywall | **[search summary]; [blocked: baymard.com]**. Commercial subscription; not redistributable |
| Team-published design-review checklists | Searched for and **not found**. No major product team publishes a machine-checkable design review checklist; what turns up is hardware/PCB review, generic code-review templates, and blog reconstructions of Stripe/Linear/Vercel aesthetics | — | The gap the agent-skill rule sets have filled |
| [ui-craft](https://github.com/educlopez/ui-craft) / [Hallmark](https://github.com/Nutlope/hallmark) / [open-design](https://github.com/nexu-io/open-design) | The only sets with thresholds, severities, and a runnable detector. Covered in §2 | Visual-tell heavy; weak on help/recovery/efficiency; no published validation against human preference; rules encode one house style | **MIT / MIT / Apache-2.0** — the only freely adaptable rule sets in this table |

**The reuse verdict.** Build the rubric's *floor* from WCAG (free, normative, numeric) and its *anti-slop* section from the MIT rule sets (free, adaptable, already tuned on generated output). Use Nielsen's ten as **section headings for the judge rubric only**, never as scoring anchors, and write your own anchors — the CheckEval and BARS evidence in [eval-tuning-loops/01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md) says decomposed binaries beat adjectival scales anyway. Do not import Laws of UX text (ND) or Refactoring UI text (commercial); import the underlying laws instead.

**Open questions:** Nobody has measured whether a rubric built on Nielsen headings produces higher inter-rater agreement than one built on the craft dimensions in §1. Given the CHI 2026 result, a hybrid — Nielsen for function, §1 for craft — is the obvious experiment and it has not been run.

---

## 4. What is measurable without judgment

**What it is:** The craft checks that are lint rules. These should never appear in a judge rubric, because putting a computable fact in front of a probabilistic judge converts a certainty into a noisy estimate.

**Why it matters:** [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) establishes the general rule (gates first, then scores). This section supplies the specific craft list, with the tool or the computation for each, so doc 03 can move these out of the rubric entirely.

**Key findings:**

| Craft check | How it is computed | Tool, or the computation |
|---|---|---|
| **Contrast ratio** | WCAG relative-luminance formula on every resolved `(color, background-color)` pair | `axe-core` 4.13.0 (MPL-2.0, 2026-09-10) rules `color-contrast` / `color-contrast-enhanced`; `@axe-core/playwright` 4.13.0 |
| **Inheritance contrast bugs axe misses** | For each element: compare computed `color` to computed `background-color` of the nearest painted ancestor; fail if OKLCH ΔL < 5% and ΔC < 0.05. Separately: any subtree whose background OKLCH L < 0.5 must set a light `color` in the same rule | Hallmark gates 40–41, implementable in ~20 lines over `getComputedStyle` + a colour library |
| **Tap-target size** | `getBoundingClientRect()` ≥ 24×24 CSS px, or the 24px-circle spacing exception | `axe-core` `target-size` (`wcag22aa`); WCAG 2.5.8 text fetched above |
| **Spacing-scale adherence** | Histogram every computed `padding*`, `margin*`, `gap`; `adherence = |values ∈ scale| / |values|` | ~10 lines over `document.querySelectorAll('*')`; or `@lapidist/design-lint` 8.0.0 (MIT) / Deslint `no-arbitrary-spacing` / `stylelint-declaration-strict-value` 1.12.1 at source level |
| **Token coverage vs raw values** | Count raw hex/rgb/px in authored CSS and class strings vs `var(--*)` references | `eslint-plugin-tailwindcss` 4.4.0 `no-arbitrary-value`; Deslint `no-arbitrary-colors`; ui-craft token-discipline scanner |
| **Type-scale adherence** | Set of distinct computed `font-size` in viewport; fail at ≥8. Ratio largest ÷ second-largest; fail below 2.0 | ui-craft `type/crowded-ladder`, `type/display-not-separated` — but note the scoring defect in §2 |
| **Weight and family counts** | Distinct computed `font-weight` (≤3) and `font-family` (≤3, outlier used in ≤2 slots) | Finish Bar Pass 2; Hallmark 37–38 |
| **Line length (measure)** | For each prose block: `getBoundingClientRect().width ÷ (measured advance width of "0" at that font)` → target 45–75ch; WCAG ceiling 80 | 5 lines with a canvas `measureText`; thresholds from WCAG 1.4.8 + Hallmark 25 |
| **Alignment-grid deviation** | Cluster left/right/top/bottom edges of rendered blocks; count alignment points and distinct block sizes | AIM `m21` Grid quality (MIT, evidence 4/5); or cluster `getBoundingClientRect()` edges within ±1px |
| **White space / clutter / congestion** | Pixel-level measures over a screenshot | AIM `m22` (white space), `m8` (feature congestion), `m4` (contour density), `m6` (contour congestion), `m7` (subband entropy) |
| **Predicted attention (squint test, automated)** | Saliency/importance heatmap over the render; check the peak coincides with the primary action's bbox | AIM `m9` UMSI, `m30` MD-EAM (both relevance 5/5) |
| **Colour-blind safety** | Simulate protanopia/deuteranopia/tritanopia and re-run contrast | AIM `m23` (evidence 4/5, relevance 5/5) |
| **Z-index sanity** | Every computed `z-index` ∈ semantic scale; no value ≥999 | ui-craft `absolute-zindex`; scale 10/20/30/40/50/60 |
| **Overflow at breakpoints** | `document.documentElement.scrollWidth > clientWidth` at 320/375/414/768/1280/1920 | Playwright projects per viewport (cross-link [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md)); Hallmark gate 34 also mandates `overflow-x: clip` on `html` *and* `body` — `clip`, not `hidden`, to preserve descendant `position: sticky`/`fixed` |
| **Two-line clickable text** | For each button/nav/CTA: `getClientRects().length > 1` at any tested width | Hallmark gate 49 — ~6 lines |
| **Animation duration range** | Parse every `transition-duration` / `animation-duration`; fail outside 100–400ms for interactive state changes; fail any bespoke value not on the token scale | Finish Bar Pass 7; `motion.md` 5-token scale |
| **Easing sanity** | String-match `transition-timing-function`: no `linear` on transform/position; no `ease-in` on entrances; no overshoot cubic-bezier on UI | `motion.md` "Never" list; Hallmark 12 |
| **`transition: all`, layout-property animation** | Direct string match | ui-craft `transition-all`, `left-top-animation` (both critical); Hallmark 10, 14 |
| **`prefers-reduced-motion` coverage** | Every keyframe/transform rule has a matching `@media (prefers-reduced-motion: reduce)` rule | Hallmark gate 27; ui-craft `no-reduced-motion` a11y check |
| **`:focus-visible` presence** | For each interactive element, assert a `:focus-visible` rule exists and that `outline: none` is never unreplaced; assert the focus ring does not have a `transition` | ui-craft `no-focus-visible`, `a11y/outline-none-no-replacement`; Hallmark 15, 26 |
| **Control-state completeness** | Presence of rules for default / hover / focus-visible / active / disabled per control; border-width constant across states; input height == sibling button height | Hallmark gates 26, 39 |
| **Heading order, labels, nested interactives, live regions** | Static/DOM a11y rules | `axe-core` `heading-order`, `label`, `nested-interactive`, `aria-hidden-focus`; `pa11y` 10.0.0 (LGPL-3.0) as an alternative runner |
| **Placeholder and banned copy** | String and regex match over text nodes | ui-craft `copy/placeholder-shipped`; `Vale` (MIT, 6.1k stars) for terminology/banned-word rules; `textlint` 15.8.0; `alex` 11.0.1 |
| **Readability level** | Flesch-Kincaid etc. over extracted prose | `text-readability` 1.1.1 (ISC) |
| **Images without dimensions (CLS)** | `<img>` lacking `width`+`height` or `aspect-ratio` | ui-craft `perf/image-no-dimensions`; `layout/image-height-from-attribute` |

**The rule this section implies:** everything above is a **gate or a metric, never a rubric line**. A judge asked "is the spacing consistent?" will answer worse than four lines of JavaScript, and the DiffSpot result says it will answer worse *confidently*. Hand the judge the numbers instead — that is the "evidence before judgment" pattern already established in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md).

**Open questions:** AIM is Python 2.7-era in its legacy path and 64 stars; nobody has packaged its grid-quality and white-space metrics as a JS/DOM library, which is the missing piece for putting alignment measurement in a CI loop. No published work correlates AIM scores with craft judgments on *generated* UI. And nothing measures the false-positive rate of the spacing-scale check on legitimately dense surfaces.

---

## 5. What genuinely requires a human, and how to sample it

**What it is:** The residue — the craft properties no check and no judge can settle — and the sampling discipline that makes a scarce human signal go far.

**Why it matters:** The temptation with a long deterministic list is to conclude craft is solved. It isn't: everything in §4 is *hygiene*, and hygiene ties at the top. ui-craft says this about its own coverage axis — hygiene axes "tie at the top, so a coverage number would read 100 for most surfaces while hiding the distinction signal underneath it" — and the same is true of the whole deterministic battery.

**Key findings:**

**Four things stay human.**

1. **Taste and distinction** — whether the screen looks like *this product* or like a template. Hallmark's operational definition is the best published one: "If a reviewer screenshots the artifact and someone outside the project can identify which product it's from — you have soul. If not, you shipped a template" (open-design, same lineage). No metric approximates this; AIM's NIMA aesthetic model (`m18`) carries AIM's *lowest* evidence and relevance ratings (2/5, 2/5), which is a fair statement of how far computational aesthetics gets.
2. **Brand fit** — a token can be verified as on-system deterministically; whether the *system* is right for the brief cannot. See [theming/](../theming/00-theming-architecture.md) for the token architecture this rests on.
3. **Whether the hierarchy serves the user's actual goal** — a saliency model can tell you what dominates; only a person who knows the job the screen is doing can say whether the right thing dominates.
4. **Whether the copy is right, not merely present** — the §1.7 checks catch placeholders, generic CTAs, structural errors and banned terms. They cannot catch copy that is grammatical, on-voice, and *wrong*: the ui-craft self-audit's own examples are "forced cleverness," "mock-poetic labels ('Field notes', 'On our desks', 'Loose plates' for a testimonials section)," and "performative humility ('Quietly trusted by…')" — each of which passes every automated check.

**How reliably do experts agree here?** Poorly, and the numbers are already in [eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) and [eval-tuning-loops/01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md) — human pairwise κ ≈ 0.46 (Design2Code) and 0.55 (UICrit ranking) against 0.26–0.32 on direct assessment; UICrit critique ratings κ ≈ 0.29–0.31; WebDevJudge human experts agreeing 84.82% pairwise while the best judge reached 66.06%; machine severity ratings at Krippendorff's α ≈ 0. Those are not re-derived here. Three consequences for craft specifically:

- **Ask which of two, never how many out of ten.** The gap between pairwise and direct assessment is the largest single reliability lever available.
- **Even human "gold" on taste is tentative.** By McHugh's bands every published UI-quality agreement figure sits below the adequate threshold, so a craft rubric's taste section should be treated as a *ranking signal for tuning*, not a gate.
- **Severity is a human field, full stop.**

**Sampling discipline** (the mechanics belong to [eval-tuning-loops/02 §3](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md); what is craft-specific is *what* to put in front of the human):

- A designer has roughly 90 seconds of reliable attention per artifact. Spend it on: one **pairwise pick** (this build vs the last one), one **bounding-box mark on the worst defect**, and one **sentence of rationale**. That is the UICrit annotation shape and it is the highest-value 90 seconds available.
- **Sample by stratum, not at random alone.** The strata that matter for craft: (a) every artifact where the deterministic battery is clean but the judge scored low — that is where taste lives; (b) every *patched* artifact (§6); (c) a fixed random 10% for calibration.
- **Stop asking humans anything a lint rule answers.** Every question in §4 asked of a person is a question that could have been asked of the artifact, and the fatigue evidence in [eval-tuning-loops/02 §5](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) (agreement falling >32 percentage points across eight batches) means those questions are not free — they cost you the answers to the questions only the human can give.

**Open questions:** No study measures designer agreement on *distinction* ("does this look like a template?") — the one judgment the whole anti-slop enterprise rests on. Whether Hallmark's "someone outside the project can identify which product it's from" test has any inter-rater reliability at all is unmeasured, and it would be cheap to measure.

---

## 6. Craft criteria for the specific case of a patch

**What it is:** The craft checks that only make sense *after* a fix — the ones that compare the patched thing to its neighbours and to its own previous self, rather than judging it standalone.

**Why it matters:** This is the stream's actual question. A patch is a local edit evaluated globally. Every check in §1–§4 run on a patched screen will pass if the patched component is internally fine, while the regression that matters — the component no longer agreeing with the two beside it — lives exactly at the boundary the local check never crosses. The generic version of this failure is documented: FronTalk found "a significant forgetting issue where models overwrite previously implemented features" across turns ([eval-tuning-loops/01 §5](../eval-tuning-loops/01-grading-generated-prototypes.md)).

**Key findings:**

Craft regressions from a patch fall into five seams. Each has a check that is a *comparison*, not an absolute.

| Seam | What goes wrong | The seam-level check |
|---|---|---|
| **Neighbour disagreement** | The patched component's padding, radius, border weight, shadow or type step no longer matches its siblings in the same container | For each changed element, compare its computed spacing/radius/weight/type values against its **siblings and against other instances of the same component elsewhere in the build**. Any value that is on-scale but *different from every sibling* is a finding. This is the check that no standalone rule can express |
| **New-state divergence** | The added state (an error message, a disabled variant, a loading skeleton) has different padding, a different border-width, a different transition than the states that existed before | Diff computed styles **across states of the same element**: border-width must be constant across default/hover/focus/error (Hallmark 39); helper-text slot must have reserved height so the new error does not shift layout; the new state's transition duration must be the one the sibling states already use |
| **Voice drift** | The added error message, empty state or CTA reads like a different author — different verb form, different formality, different punctuation habits | Extract *only the strings the patch added*, read them against the existing string set: verb form consistent with sibling actions; error structure = what + why + what next; no em-dash/middle-dot habits the rest of the surface does not have; terminology matched. `Vale` with a project terminology list is the mechanised half |
| **Token improvisation under repair** | Fixing a visual bug by reaching for a raw value — the fastest way to fix "this looks wrong" is `padding: 17px` | Run the token-coverage check **as a delta**: `raw_values_after − raw_values_before` must be ≤ 0. A patch may never increase the raw-value count. This is the single highest-yield seam check and it is a two-line diff |
| **Cross-screen fingerprint drift** | The patch fixes one screen into a shape the rest of the flow no longer shares — or, in a multi-generation project, produces the same macrostructure as every other screen | Hallmark is the only rule set that checks anything across generations: gate 8 requires the build's macrostructure to differ from the last (read from `.hallmark/log.json` or a CSS stamp), and gate 32 requires a different variation knob when reusing an archetype. The patch analogue: record a per-screen craft fingerprint (type ladder, spacing histogram, radius set, motion tokens, accent footprint) and assert the patched screen's fingerprint stays within the flow's existing distribution |

**Three procedural rules that make the seam checks work.**

1. **Every craft check runs on the pre-patch build too.** Seam checks are deltas; a delta needs a baseline. The grade record in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) already carries per-dimension values and defect locations, which is the baseline — this is a reason to keep it rather than only the composite.
2. **Component-scoped visual diff, not page-scoped.** A page-level pixel diff after a patch is all signal, no information: the patch changed the page. Per-component snapshots isolate the neighbours that should *not* have moved. The maintained options verified today: `chromatic` 18.8.1 (MIT, published 2026-09-11), `@percy/cli` 1.32.9 (MIT, 2026-09-11), `reg-suit` 0.14.5 (MIT, 2025-08-26). `backstopjs` 6.3.25 (MIT) has not published since **2024-09-07** and `loki` 0.35.1 since **2024-08-27** — treat both as unmaintained ([npm](https://registry.npmjs.org/chromatic), fetched).
3. **The patch's own evidence gate.** ui-craft's three bars are the right discipline for a repair agent and cost nothing to adopt: cite the rule the issue violates ("'This feels off' is not a citation"); prove the path from the code you changed to the pixels the user sees ("grep proximity is not proof"); propose exactly one concrete fix. Plus the falsification pass — "actively try to disprove it" — and the scope rule: "A review or audit pass fixes what it found — it does not refactor unrelated code, swap libraries or frameworks, or add ARIA and abstraction layers where native semantics already solve the problem. The smallest change that resolves the finding is the correct one."

**A reporting shape worth stealing for the patch case.** ui-craft requires a **Craft Report** after every pass, *including a pass that changed nothing*, with five sections of which two are mandatory: **Checked** (which rule sets actually ran, over what scope — "Never imply coverage broader than what actually ran"), **Passed**, **Changed** (each with a file reference and the rule it serves), **Left alone** ("this is what separates 'didn't notice' from 'noticed, chose not to touch'"), **Verdict**. For a patch loop this is the artifact that makes the next iteration cheap, because "left alone, deliberately" is precisely the knowledge the next agent lacks.

**Open questions:** No public benchmark measures craft regression at the seam — DesignBench grades edit and repair tasks but reports no cross-component consistency metric ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)). Nobody has published the base rate: what fraction of patches introduce a neighbour disagreement. That number is measurable today with the delta checks above and would be the most useful single experiment in this stream.

---

## Cross-cutting themes

1. **Craft is mostly hygiene, and hygiene is mostly a lint rule.** Of the eleven dimensions, nine have a deterministic core. What is left after the battery runs — taste, brand fit, goal-serving hierarchy, copy rightness — is small, and is exactly what a person should spend 90 seconds on.
2. **The corpus is aimed at the wrong half.** Practitioner anti-slop rules are overwhelmingly visual tells; the only measured study of generated UI usability says the failures are in help, error recovery, efficiency and error prevention. A craft rubric built only from the slop corpus will improve the thing that was already adequate.
3. **Thresholds beat adjectives, and the good rule sets know it.** Every rule worth reusing carries a number: 24×24px, 4.5:1, 45–75ch, 100–400ms, ≥2.5× display jump, ≤3 weights, ≤5% accent, ≥1.5× hierarchy delta, 200ms skeleton delay. A criterion without a number is a criterion two reviewers will score differently.
4. **Compare, don't score.** This holds at every level: pairwise for humans (κ 0.46 vs 0.26), ranking for judges, and *delta* for patches (raw-value count, sibling agreement, fingerprint distance). The absolute number is the least reliable form at all three.
5. **Coverage and distinction are different axes and must not be summed.** ui-craft's refusal to score coverage at all — because "hygiene axes tie at the top" — is the most transferable structural idea in the corpus, and doc 03 should decide explicitly whether the rubric reports one number or two.
6. **Verify the rule set you adopt, at the file level.** Two of ui-craft's 43 rules are scored as free because of a severity-string mismatch; Hallmark's README and its own gate file disagree on 57 vs 58. Both are MIT, both are excellent, and both would have been misreported from documentation alone.

---

## Recommendations: the craft dimension table and the craft floor

### A. The craft dimension table

Dimension → observable → how checked → who checks → source. This is the map doc 03 turns into criteria: everything marked **Det.** leaves the rubric and becomes a gate; **Judge** rows need evidence supplied first; **Human** rows need a pairwise or bbox-and-sentence form.

| # | Dimension | Observable | How checked | Det. / Judge / Human | Source |
|---|---|---|---|---|---|
| 1 | Visual hierarchy | Distinct type sizes; largest/next ratio; single h1; heading order; saliency peak vs primary action bbox | Count + ratio from computed styles; axe `heading-order`; AIM `m9`/`m30` heatmap | **Det.** (counts) + **Human** (is the right thing dominant) | [ui-craft layout.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/layout.md); [AIM metrics.json](https://raw.githubusercontent.com/aalto-ui/aim/aim2/metrics.json) |
| 2 | Spatial system | Every computed padding/margin/gap; block edge positions; white-space ratio | Scale-membership histogram; rhythm invariant at 3 nesting levels; AIM `m21` alignment points, `m22` white space | **Det.** + **Judge** (density appropriateness) | Hallmark gate 24; ui-craft Finish Bar Pass 4; AIM |
| 3 | Typography | Distinct sizes/weights/families; largest÷next; display weight; line length in ch; uppercase display line-height | Counts, ratios, canvas `measureText`; WCAG 1.4.8 ceiling | **Det.** | ui-craft `type/*` + measured census; Hallmark 25, 37–38, 55; [WCAG 1.4.8](https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/visual-presentation.html) |
| 4 | Colour & contrast | Resolved fg/bg pairs; accent area share; neutral chroma | axe `color-contrast`; OKLCH ΔL/ΔC pair check; dark-section ink swap; accent-footprint area sum | **Det.** | [WCAG 1.4.3](https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html); [axe rule list](https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md); Hallmark 22–23, 40–41 |
| 5 | State completeness | Existence of a rendering per lattice state; skeleton geometry; empty-state action count | Presence check against enumerated states; `state/missing-empty-or-error` statically | **Det.** (presence) + **Judge** (designed vs stubbed) | [ui-craft state-design.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/state-design.md) (8 states) |
| 6 | Motion | Duration and easing values; reduced-motion coverage; snap-without-transition | Range + token-membership check; string match on easings; `@media` pairing; state-diff for motion gaps | **Det.** (values) + **Judge** (motion gap significance) | [ui-craft motion.md](https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/motion.md); Hallmark 10–15, 27 |
| 7 | Copy & voice | Every visible string | Placeholder/banned-word match (Vale, textlint); error-structure check; CTA specificity list | **Det.** (presence/structure) + **Human** (is it right) | ui-craft `copy/*`, copy.md; [Vale](https://github.com/errata-ai/vale) |
| 8 | Affordance & feedback | Per-control state rules; labels; target sizes; input/button geometry | axe (`label`, `nested-interactive`, `target-size`); five-state presence; border-width constancy; height parity | **Det.** | [WCAG 2.5.8](https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html); Hallmark 26, 39 |
| 9 | Error prevention & recovery | Guards on destructive actions; error message structure; autocomplete; live regions | Static pattern rules; error 3-part structure | **Det.** (proxies) + **Human** (is recovery actually possible) | ui-craft `dark-pattern/*`, `forms/*`; CHI 2026 gap **[search summary]** |
| 10 | Design-system consistency | Token references vs raw values; role correctness | Raw-value count; import-registry check; role check has no tool | **Det.** (coverage) + **Judge** (role) | Deslint / `@lapidist/design-lint` 8.0.0; Hallmark 48 |
| 11 | Restraint | Element/effect counts; accent footprint; clutter measures | Counts; AIM `m4`/`m6`/`m7`/`m8`/`m22` | **Det.** (proxies) + **Human** (does each piece earn its place) | AIM; Hallmark 13, 23, 45 |

### B. The slop-marker → rule table

Delivered in full in [§2](#2-ai-slop-as-a-diagnosable-phenomenon) — 24 markers, each with the rule that catches it, the rule set it comes from, and an objective / conventional / taste call.

### C. The craft floor — the minimum that must hold before anyone looks

Twenty checks, all deterministic, all runnable in CI on every generated screen. If any fails, no human and no judge should see the artifact: the review budget is spent on a defect a program could have named. Ordered by cost to fix.

**Correctness floor (any failure = reject)**
1. Zero axe-core violations at WCAG 2.2 AA, including `color-contrast` and `target-size`.
2. No unresolved contrast pair: no text within 5% OKLCH lightness and 0.05 chroma of its own background; every subtree with background L < 0.5 sets a light `color`.
3. No horizontal scroll at 320 / 375 / 414 / 768 / 1280 / 1920 px.
4. No console errors; no dead links (cross-link [eval-tuning-loops/01 §5](../eval-tuning-loops/01-grading-generated-prototypes.md)).
5. Every interactive element has `:focus-visible`; no unreplaced `outline: none`; the focus ring has no transition.
6. No placeholder copy shipped: no lorem ipsum, TODO, `John Doe`/`Jane Doe`, `Acme`/`Nexus`.
7. No fabricated quantitative claim the brief did not supply.

**System floor (any failure = reject)**
8. Zero raw colour values and zero off-scale spacing, radius or z-index outside the token block.
9. No `z-index` ≥ 999.
10. Every `padding`/`margin`/`gap` on the named scale.
11. ≤3 font families; ≤3 font weights in the viewport; the outlier face in ≤2 slots.
12. ≤7 distinct font sizes; display step ≥2.5× the step below it; display weight < 700.
13. Prose measure between 45 and 75 characters (hard ceiling 80 per WCAG 1.4.8).

**Behaviour floor (any failure = reject)**
14. No `transition: all`; no animation of `width`/`height`/`top`/`left`/`margin`/`padding`.
15. Every interactive transition between 100 and 400 ms and on the duration token scale; no bespoke values.
16. No bounce/elastic easing on functional UI; no `linear` on spatial motion; no `ease-in` on entrances.
17. Every keyframe/transform has a `prefers-reduced-motion: reduce` fallback.
18. Every data-touching component has an explicit loading, empty and error rendering (the three of the eight-state lattice that are non-negotiable).
19. Every control has default + hover + focus-visible + active + disabled; border-width constant across states; input height equals sibling button height.
20. No button, nav link or CTA label wraps to two lines at any tested width.

**And for a patch, three deltas on top:** raw-value count must not increase; no changed element may hold an on-scale value that differs from every sibling; the added strings must pass the same voice checks as the existing ones.

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified today | Category |
|---|---|---|---|---|
| Hallmark | https://github.com/Nutlope/hallmark | 58-gate slop test + six-axis pre-emit self-critique + 21 themes; MIT, 28.5k stars, 1.5k forks | page fetched; `SKILL.md` and `references/slop-test.md` fetched and read | skills / rules |
| ui-craft (re-verify) | https://github.com/educlopez/ui-craft | 43-rule detector + deterministic UICraftScore + 10-pass Finish Bar + 8-state lattice + coverage archetypes; MIT, **325 stars** (was 308 in eval-tuning-loops/01), last commit 2026-09-03 | page fetched; `rules.mjs` and `score.mjs` parsed; 15 reference files fetched | skills / rules |
| ui-craft Finish Bar | https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/finish-bar.md | 10 ordered finishing passes, each with measurable criteria, a verification method, and a "when it doesn't apply" clause — the closest published thing to a craft rubric | fetched | review-and-feedback |
| ui-craft coverage model | https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/coverage.md | completeness-vs-distinction split; present/partial/missing/not-needed/unknown markers; explicit "no score, no gate" contract | fetched | review-and-feedback |
| open-design anti-AI-slop rules | https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md | 7 linter-enforced P0 sins + soft tells, each flagged where it is *not* auto-checked; Apache-2.0 | fetched | rules |
| Aalto Interface Metrics (AIM) | https://github.com/aalto-ui/aim | 26 computational GUI metrics with evidence/relevance ratings — grid quality, white space, feature congestion, UMSI saliency, colour-blindness simulation; MIT, 64 stars | page fetched; `metrics.json` fetched and parsed | guardrails-and-evals |
| WCAG understanding docs (via w3c/wcag) | https://github.com/w3c/wcag | Normative craft-floor numbers fetchable as raw HTML when w3.org is unreachable: 4.5:1/3:1, 80 chars, 320 CSS px reflow, 24×24 px targets | 4 files fetched | rules |
| Vale | https://github.com/errata-ai/vale | Markup-aware prose linter with YAML rules for banned words, terminology and readability — the machine-checkable half of voice; MIT, 6.1k stars | page fetched | hooks / guardrails-and-evals |
| @lapidist/design-lint | https://www.npmjs.com/package/@lapidist/design-lint | Design-token governance lint surface; MIT, 8.0.0, modified 2026-05-12 (source repo not located — both obvious GitHub paths 404) | npm record fetched | guardrails-and-evals |
| Chromatic / Percy / reg-suit | https://registry.npmjs.org/chromatic | Component-scoped visual diff for seam checks; MIT; 18.8.1 / 1.32.9 / 0.14.5, all published 2025–2026. **BackstopJS (2024-09-07) and Loki (2024-08-27) are stale** | npm records fetched | guardrails-and-evals |
| Usable but Conventional | https://arxiv.org/abs/2605.15124 | 92 participants, UEQ-S: AI prototypes score positive on pragmatic, neutral/negative on hedonic (originality) | **[search summary]; [blocked: arxiv.org]** | guardrails-and-evals |
| Looks Good, But Is It Usable? | https://dl.acm.org/doi/full/10.1145/3772363.3799002 | CHI 2026 EA: 138 AI-generated mobile screens vs Nielsen's 10; low support for H10/H9/H7/H5 | **[search summary]; [blocked: dl.acm.org]** | guardrails-and-evals |

---

## Sources

**Fetched today (primary files, parsed or read in full)**

- https://github.com/educlopez/ui-craft — stars 325, MIT, 265 commits [fetched]
- https://github.com/educlopez/ui-craft/commits/main — last commit 2026-09-03 [fetched]
- https://raw.githubusercontent.com/educlopez/ui-craft/main/scripts/detect/rules.mjs — 43 rule ids; 14 critical / 25 major / 2 minor / 2 warn [fetched, parsed]
- https://raw.githubusercontent.com/educlopez/ui-craft/main/evals/quality/score.mjs — UICraftScore weights; no `minor` branch [fetched]
- https://raw.githubusercontent.com/educlopez/ui-craft/main/skills/ui-craft/references/{typography,layout,motion,color,tokens,state-design,heuristics,finish-bar,copy,review,principles-catalog,coverage,responsive,accessibility,modern-css}.md [all fetched]
- https://github.com/Nutlope/hallmark — 28.5k stars, 1.5k forks, MIT, 138 commits [fetched]
- https://raw.githubusercontent.com/Nutlope/hallmark/main/README.md [fetched]
- https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/SKILL.md [fetched]
- https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/references/slop-test.md — 58 gates + six-axis self-critique [fetched]
- https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/references/{anti-patterns,layout-and-space,motion,typography}.md [fetched]
- https://github.com/nexu-io/open-design/blob/main/craft/anti-ai-slop.md · https://raw.githubusercontent.com/nexu-io/open-design/main/craft/anti-ai-slop.md [fetched]
- https://raw.githubusercontent.com/dequelabs/axe-core/develop/doc/rule-descriptions.md — axe 4.13 rule table [fetched]
- https://raw.githubusercontent.com/w3c/wcag/main/understanding/22/target-size-minimum.html — 24×24 CSS px + five exceptions [fetched]
- https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/contrast-minimum.html — 4.5:1 / 3:1 as unrounded thresholds [fetched]
- https://raw.githubusercontent.com/w3c/wcag/main/understanding/20/visual-presentation.html — 80 characters / 40 CJK [fetched]
- https://raw.githubusercontent.com/w3c/wcag/main/understanding/21/reflow.html — 320 / 256 CSS px [fetched]
- https://github.com/aalto-ui/aim — MIT, 64 stars [fetched]
- https://raw.githubusercontent.com/aalto-ui/aim/aim2/metrics.json — 26 metrics, categories, evidence/relevance [fetched, parsed]
- https://raw.githubusercontent.com/aalto-ui/aim/aim2/backend/aim/metrics/m1/m1_png_file_size.py — metric-module format and citations [fetched]
- https://github.com/errata-ai/vale — MIT, 6.1k stars [fetched]
- https://github.com/shadcn-ui/ui — 123.6k stars, MIT [fetched]
- https://github.com/erikuus/good-ui — third-party Refactoring UI summary; `README.md` fetched (671 bytes) but no claim in this document rests on it [fetched, unused]
- npm registry records [all fetched]: https://registry.npmjs.org/axe-core (4.13.0, MPL-2.0, 2026-09-10) · /@axe-core/playwright (4.13.0) · /eslint-plugin-tailwindcss (4.4.0, MIT, 2026-08-24) · /stylelint-declaration-strict-value (1.12.1, MIT, 2026-08-24) · /@lapidist/design-lint (8.0.0, MIT, 2026-05-12) · /pa11y (10.0.0, LGPL-3.0-only) · /textlint (15.8.0, MIT, 2026-08-01) · /alex (11.0.1, MIT, 2023-08-18) · /text-readability (1.1.1, ISC) · /chromatic (18.8.1, MIT, 2026-09-11) · /@percy/cli (1.32.9, MIT, 2026-09-11) · /reg-suit (0.14.5, MIT, 2025-08-26) · /backstopjs (6.3.25, MIT, 2024-09-07) · /loki (0.35.1, MIT, 2024-08-27)

**Search summary only — never opened; the host refused the fetch. Not independently verified.**

- https://arxiv.org/abs/2605.15124 — *Usable but Conventional* (92 participants, UEQ-S) [arxiv.org 403 at proxy; abstract via search]
- https://dl.acm.org/doi/full/10.1145/3772363.3799002 — *Looks Good, But Is It Usable?* CHI 2026 EA (138 screens, H10/H9/H7/H5) [dl.acm.org 403; summary via search]
- https://www.nngroup.com/articles/ten-usability-heuristics/ — Nielsen's 10 [nngroup.com 403]
- https://lawsofux.com/ and /info/ — CC BY-NC-ND 4.0 licence claim [lawsofux.com 403]
- https://refactoringui.com/ — commercial, no machine-readable rules [refactoringui.com 403]
- https://baymard.com/ — research guidelines, paywalled [baymard.com 403]
- https://m3.material.io/styles/motion/easing-and-duration/tokens-specs and https://fluent2.microsoft.design/ — platform motion/target numbers [403; **no platform guidance is verified in this document**]
- https://developer.apple.com/design/human-interface-guidelines/buttons — reachable but JS-rendered; documentation JSON endpoint 404 [44×44pt guidance **not verified**]
- https://www.pnas.org/doi/10.1073/pnas.2504966122 — "Echoes in AI", Sui Generis diversity score (text, not UI) [pnas.org not fetched]
- X/Twitter practitioner posts on the slop signature **[search summary]; [blocked: x.com]** — the quoted strings below were rendered inside search results and the posts themselves were never opened: [@Manixh02](https://x.com/Manixh02/status/2012387306683146646) — "Purple gradients. Inter font. Three boxes. Rounded corners… This isn't bad design - it's statistical average design"; [@itsolelehmann](https://x.com/itsolelehmann/status/2037215657649983917) — "purple gradient, inter font, same hero layout every single time"; [@Hartdrawss](https://x.com/Hartdrawss/status/2027768326852681798) — "90% of apps look vibe coded: same purple gradients, same default fonts, same AI slop"; [@designcoursecom](https://x.com/designcoursecom/status/2080802781087089047) — slop as "objectively good design through unopinionated prompting". Practitioner reality on X is owned by docs 05/06 of this stream; these are included only as evidence that the slop signature is a shared, specific description
- https://github.com/LeoStehlik/no-slop-ui — surfaced by search; raw README returned 404, repo state unverified

**Neighbouring docs cross-linked (not re-derived)**

- [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) — deterministic graders, DiffSpot (40.7% / <23% recall), VLM-judge bias table, grade record, axe 57% coverage, flow-level grading
- [eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) — human/judge agreement numbers, WebDevJudge 84.82% vs 66.06%, annotator fatigue, sampling and escalation
- [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) — the fix-altitude ladder, exemplar curation
- [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md) — the guardrail ladder and design-specific guardrails
- [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md) — patch formats and surgical edits
- [theming/00](../theming/00-theming-architecture.md) — three-tier token model; all colour mathematics
