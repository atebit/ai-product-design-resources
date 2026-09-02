# Grading Generated Prototypes — What a Grade Is Made Of, How Each Part Is Produced, and How Far to Trust It

**Scope:** The first document in the eval-tuning-loops stream. The loop this stream studies is: every generated prototype gets a *grade* → the grade is reviewed by a machine and/or a human → the reviewed grade is fed back into the generator (a Claude Code skill with exemplars and rules, the repo's construction-file pipeline, or an API pipeline with its own prompts). This doc is only about the first step: what a grade for a generated screen or prototype should consist of, how each component is produced (deterministic check, LLM/VLM judge, human rubric score), and how reliable each component is according to published numbers. It builds on the guardrail ladder and one-shot evals in [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md) (§6–§7), the AI-critique evidence in [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) (§6), the arena/VLM-judge landscape in [foundational/03](../foundational/03-ai-ui-generation.md) (§5), and the validity layers in [prototype-construction/03](../prototype-construction/03-construction-file-generation.md) — none of which is repeated here. Review of grades (doc 02) and feeding grades back (doc 03) are out of scope. Verified live September 2026; every claim links its source; anything that could not be fetched is marked.

## Table of Contents

1. [Deterministic graders](#1-deterministic-graders)
2. [LLM/VLM judges on a rubric](#2-llmvlm-judges-on-a-rubric)
3. [Human rubric scores](#3-human-rubric-scores)
4. [Composite grades and provenance](#4-composite-grades-and-provenance)
5. [Grading prototypes, not screens](#5-grading-prototypes-not-screens)
6. [Cross-cutting themes](#cross-cutting-themes)
7. [Recommendations: a grading stack](#recommendations-a-grading-stack)
8. [The grade record](#the-grade-record)
9. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
10. [Sources](#sources)

---

## 1. Deterministic graders

**What it is:** Checks that need no judgment: a program inspects the artifact (construction file, DOM, rendered pixels, network/console log) and returns a number or a pass/fail that is identical on every run.

**Why it matters:** These are the only grade components that are cheap enough to run on every generation, stable enough to gate on, and legible enough that a generator can be told exactly what to fix. Anthropic's eval guidance calls them "code-based graders" — "fast and objective" — and pairs them with model-based and human graders as complementary layers ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). The failure mode is equally clear: they measure what they can parse, and a perfect deterministic score says nothing about whether the screen is any good.

**Key findings:**

| Dimension | Tooling | What it catches | What it misses |
|---|---|---|---|
| **Schema validity** (construction file parses, enums resolve, refs are live) | Provider structured outputs / Zod / Pydantic; the builder's semantic validator for containment and refs ([prototype-construction/03 §6](../prototype-construction/03-construction-file-generation.md)) | Hallucinated component types, invalid nesting, dangling ids | "Structurally valid, semantically wrong" — the wrong hierarchy or a missing empty state validates fine (same doc, error-mode table) |
| **On-system rate / token drift** (imports resolve to the registry; zero raw hex/px) | `eslint-plugin-tailwindcss` `no-arbitrary-value` — "Forbid using arbitrary values in classnames", off by default ([rule doc](https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-arbitrary-value.md)); Deslint's `no-arbitrary-colors`, `no-arbitrary-spacing`, `no-arbitrary-typography`, `no-arbitrary-border-radius`, `no-arbitrary-zindex` among 62 rules over Tailwind classes, HTML/JSX and TS ([Deslint rules](https://deslint.com/docs/rules)); `stylelint-declaration-strict-value` and the token-grep hook already in [design-sdlc/04 §7](../design-sdlc/04-small-model-guardrails.md) | Off-scale values, raw colors, un-registered imports | A token used in the *wrong role* (`--color-danger` on a primary button) — on-system but off-intent; no public benchmark exists for this rate ([foundational/00 theme 4](../foundational/00-overview.md)) |
| **Accessibility violations** | axe-core, MPL-2.0, "returns zero false positives (bugs notwithstanding)", WCAG 2.0/2.1/2.2 A–AAA plus best practices, with "incomplete" results flagged for manual review ([axe-core](https://github.com/dequelabs/axe-core)); Storybook's a11y addon runs axe per story with `parameters.a11y.test` set to `'off'`, `'todo'` (warn) or `'error'` (fail CI) ([Storybook docs](https://storybook.js.org/docs/writing-tests/accessibility-testing)) | Deque's study of 2,000+ audits, 13,000+ pages and ~300,000 issues found "57 percent of accessibility issues were completely covered by this automated testing" ([Deque](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/)) | The other 43% by volume: whether alt text is *meaningful*, focus order is logical, errors are helpful |
| **Lighthouse accessibility score** | Lighthouse CI | "a weighted average of all accessibility audits", weighted by axe user-impact; "Each accessibility audit is pass or fail" with no partial credit ([Chrome docs](https://developer.chrome.com/docs/lighthouse/accessibility/scoring)) | Matuzović's demonstration site scores 100 while `aria-hidden="true"` on `<body>`, keyboard input blocked, `opacity: 0.03` and `font-size: 1px`: "If Lighthouse tells us that our site is 100% accessible, it doesn't mean it is" ([matuzo.at](https://www.matuzo.at/blog/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/)). Use the raw axe violation list as the gate, not the score |
| **Pixel / perceptual diff vs a gold render** | Playwright `toHaveScreenshot` — `maxDiffPixels`, `maxDiffPixelRatio` (0–1, unset by default), `threshold` "perceived color difference in the YIQ color space … Defaults to 0.2", `animations: "disabled"`, `mask`, `stylePath` ([PageAssertions](https://playwright.dev/docs/api/class-pageassertions)); pixelmatch underneath — "accurate anti-aliased pixels detection", threshold 0.1 by default, returns the mismatched-pixel count ([pixelmatch](https://github.com/mapbox/pixelmatch)); SSIM via `skimage.metrics.structural_similarity` (Wang et al. 2004; pass `data_range` explicitly) ([scikit-image](https://scikit-image.org/docs/stable/api/skimage.metrics.html)); LPIPS, "deep features as a perceptual metric", where distances are relative — "higher means further/more different" — not absolute units ([PerceptualSimilarity](https://github.com/richzhang/PerceptualSimilarity)) | Regressions against a *known-good* render of the same screen; layout shifts; missing regions | Anything without a gold image (a new screen has no baseline); font/AA noise across OSes; SSIM "struggles with … non-structural changes such as color alterations" and LPIPS is a black box (survey summaries via search; not independently verified) |
| **Layout metrics vs a reference design** (Design2Code family) | Block-Match = "total sizes of all matched blocks divided by the total sizes of all blocks"; Text = character-level Sørensen–Dice on matched pairs; Position = `1 − max(|xq−xp|, |yq−yp|)` on normalized coordinates; Color = CIEDE2000 on matched text; CLIP cosine similarity with text regions inpainted ([Design2Code](https://arxiv.org/html/2403.03163)); [UIBenchKit](https://arxiv.org/abs/2605.13141) packages these as "a plug-and-play architecture to compare various methods under consistent settings" (abstract only; metric list not enumerated) | Element recall, placement, palette fidelity when a reference exists | Design2Code's own logistic regression on human preferences reached only "79.9% accuracy", and **text similarity had a "negative and least significant association"** with human judgment — block-match, position and color were the significant ones. Human inter-rater Fleiss' κ was 0.46 for pairwise and 0.32–0.26 for direct assessment (same paper) |
| **Responsive breakpoints** | Playwright `projects` with `devices['Desktop Chrome']`, `devices['iPhone 13']` etc.; "The viewport is included in the device but you can override it … with `page.setViewportSize()`" ([Emulation](https://playwright.dev/docs/emulation)) — run every deterministic check per project | Overflow, clipped text, horizontal scroll at each viewport (when asserted explicitly) | Whether the mobile layout is the *right* reflow; no open benchmark for responsive behavior ([foundational/00](../foundational/00-overview.md)) |
| **Console / page errors** | Override the `page` fixture, `page.on("pageerror")` into an array, `expect(errors).toHaveLength(0)` after `use(page)` ([Checkly](https://www.checklyhq.com/blog/track-frontend-javascript-exceptions-with-playwright/)); events documented on [Page](https://playwright.dev/docs/api/class-page) | Uncaught exceptions, failed hydration, broken imports | Silent logic errors that throw nothing |
| **State coverage** (empty / loading / error present) | No standard tool. Practitioner pattern: ui-craft's seven-state model — idle, loading, empty, error, partial, conflict, offline — as a "state-first pass" (`/unhappy`), plus a deterministic 0–100 UICraftScore combining 43 anti-slop rules, token discipline (raw hex, off-scale spacing) and five static a11y checks ([ui-craft](https://github.com/educlopez/ui-craft), MIT, 308 stars) | Whether a story/route/variant *exists* per state when states are enumerated in the construction file or Storybook | Whether the state is *designed* rather than stubbed — a judge or human call |

**Open questions:** Design2Code's metrics assume a reference render; the generator loop mostly lacks one. Which deterministic metric best predicts *human* preference when the reference is a design intent rather than a pixel-exact mock is unmeasured. State coverage has no open grader at all.

---

## 2. LLM/VLM judges on a rubric

**What it is:** A model reads the artifact (code, construction file, screenshot, or a Playwright trace) and scores it against a written rubric, absolutely (1–5, pass/fail per criterion) or comparatively (A vs B).

**Why it matters:** Judges are the only scalable way to grade hierarchy, consistency, copy and affordances — the things deterministic checks cannot see. But they are "fallible measurement instruments," and the UI-specific evidence is more pessimistic than the general LLM-judge literature, because the properties that separate good UI from bad (spacing, alignment, contrast) are exactly what current VLMs perceive worst.

**Key findings:**

- **Methodology baseline.** G-Eval — "chain-of-thoughts (CoT) and a form-filling paradigm" — reached "a Spearman correlation of 0.514 with human" on summarization and named "the potential issue of LLM-based evaluators having a bias towards the LLM-generated texts" ([arXiv 2303.16634](https://arxiv.org/abs/2303.16634)). MT-Bench established the four canonical biases — "position, verbosity, and self-enhancement biases, as well as limited reasoning ability" — alongside the ceiling: strong judges reach "over 80% agreement, the same level of agreement between humans" ([arXiv 2306.05685](https://arxiv.org/abs/2306.05685)). Anthropic's eval docs show 1–5 Likert and binary graders and note it is "Generally best practice to use a different model to evaluate than the model used to generate the evaluated output" ([Claude docs](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)).
- **Bias table for rubric judges specifically.**

| Bias | Evidence | Mitigation |
|---|---|---|
| Position bias *inside the rubric* | "rubric-based evaluation implicitly resembles a multiple-choice setting and therefore exhibits position bias: LLMs tend to prefer score options that appear at specific positions"; criteria ordering also shifts scores ([arXiv 2602.02219](https://arxiv.org/abs/2602.02219)) | "only a small number of random order permutations are sufficient to reduce the error" (same paper) |
| Self-preference | Across 20 models, capability shows "weak or even inverse relationships with reduced bias"; a structured multi-dimensional prompt "reduces SPB by 31.5% on average" ([arXiv 2604.22891](https://arxiv.org/abs/2604.22891)) | Judge with a different model family than the generator; decompose dimensions |
| Likert instability across judges | Likert scoring yields "low agreement and high rating variance across different evaluator models"; CheckEval's "decomposed binary questions" improved cross-evaluator agreement "by 0.45" and reduced variance ([arXiv 2403.18771](https://arxiv.org/abs/2403.18771)) | Prefer per-criterion yes/no checklists over a single 1–5 |
| Absolute scores vs rankings | VLM judges show "ranking-scoring decoupling": strong rank correlation but "wide, uninformative intervals"; prediction intervals cover ~40% of the score range for aesthetics and ~70% for chart reasoning, and clean multi-annotator data yields "4.5x narrower intervals" ([arXiv 2604.25235](https://arxiv.org/abs/2604.25235)) | Use pairwise/ranking for quality; treat absolute judge scores as intervals, not points |
| Reasoning that isn't evidence | Manipulated chain-of-thought "can inflate false positive rates of state-of-the-art VLM judges by up to 90%" with actions and observations unchanged; the fix is judges that "verify reasoning claims against observable evidence" ([arXiv 2601.14691](https://arxiv.org/abs/2601.14691)) | Evidence-first prompts: locate the element / quote the DOM before scoring; never grade a generator's self-report |
| Single large judge | A Panel of LLM evaluators "outperforms a single large judge, exhibits less intra-model bias due to its composition of disjoint model families … while being over seven times less expensive" ([arXiv 2404.18796](https://arxiv.org/abs/2404.18796)) | Jury of 3 small judges from different families; median or majority |

- **What VLMs cannot see in a screenshot.** DiffSpot mutates CSS properties across 13 operators and asks VLMs to spot the change: "even the best model identifies only 40.7% of true changes, with Hard-tier Recall below 23% for every model," and "neither pixel magnitude nor CLIP distance reliably predicts Recall" ([arXiv 2605.29615](https://arxiv.org/abs/2605.29615)). Together with the κ 0.50 detection / near-zero severity finding already in [design-sdlc/02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), the practical rule is: **a VLM may grade presence and gross layout; it may not grade spacing, alignment or contrast** — compute those from the DOM (bounding boxes, computed styles) and hand the numbers to the judge.
- **Where judge agreement is high — and why.** ArtifactsBench renders each artifact, captures "temporal screenshots," and has an MLLM judge "rigorously guided by a fine-grained, per-task checklist," reporting "94.4% ranking consistency with WebDev Arena … and over 90% pairwise agreement with human experts" ([arXiv 2507.04952](https://arxiv.org/abs/2507.04952)). Cookie-Bench separates "evidence accumulation from judgment across three stages" (static perception → agent-driven interaction with screen video → dynamic scoring) and reports the framework "aligns closely with expert human ratings" ([arXiv 2605.30000](https://arxiv.org/abs/2605.30000)). UXBench forces "coverage-gated browser exploration … before reporting" and scores actionability by "whether a fixed downstream repair agent can improve the interface based on the critique" ([arXiv 2606.16262](https://arxiv.org/abs/2606.16262)). The common ingredients: **per-task checklist, evidence gathered before judgment, ranking not scoring.**
- **Rubric-with-reference vs reference-free.** With a reference (screenshot-to-code), Design2Code-style metrics plus a VLM produce trustworthy *rankings*. Reference-free (intent-to-UI, the generator loop's normal case) is where the UICrit few-shot result matters: designer critiques with bounding boxes lifted feedback quality from 0.31 to 0.48 normalized, "a 55 percent increase," on six experts × six screens ([arXiv 2407.08850](https://arxiv.org/html/2407.08850v2)). Exemplar critiques are the reference-free judge's substitute for a gold render.
- **Rubrics practitioners actually use.** ui-craft's judgment-based UsabilityScore rates findings 1–5 against "Nielsen's 10 + 6 classic design laws" across five persona walkthroughs ([ui-craft](https://github.com/educlopez/ui-craft)); UXBench uses "seven rubric dimensions" (unnamed in the abstract); UICrit's raters scored aesthetics, usability and overall quality on 10-point scales, learnability and efficiency on 5-point ([GitHub](https://github.com/google-research-datasets/uicrit)). No published rubric covers the full set the stream needs — hierarchy, consistency, states, copy, affordances — so the grade record below names them as dimensions and leaves anchors to doc 02.
- **Benchmarks and datasets to grade against or train judges on.**

| Resource | What it holds | Use in this loop |
|---|---|---|
| [UICrit](https://github.com/google-research-datasets/uicrit) (CC-BY-4.0) | 11,344 critiques with bounding boxes and quality ratings on 1,000 RICO mobile UIs; one annotator per UI, Fleiss' κ 0.30–0.31 on critiques | Few-shot exemplars for reference-free judges; κ warns that critique text is noisy ground truth |
| [Design2Code](https://arxiv.org/abs/2403.03163) | 484 real webpages; low/high-level metrics; human κ 0.46 pairwise | Reference-based layout metrics; Design2Code-HARD (80 pages) |
| [Sketch2Code](https://arxiv.org/abs/2410.16232) | Sketch-to-webpage with multi-turn feedback; experts prefer "proactive question-asking over passive feedback" | Grading conversational generators |
| [DesignBench](https://github.com/webpai/designbench) | 900 samples, generate/edit/repair, HTML/React/Vue/Angular, compile tracking + `llm_judge_flag` | Edit and repair grading, not just generation |
| [WebSight](https://huggingface.co/datasets/HuggingFaceM4/WebSight) (CC-BY-4.0) | 1.92M synthetic screenshot–HTML pairs (v0.2) | Training data for judges/generators; synthetic |
| [Screen2Words](https://github.com/google-research-datasets/screen2words) | 112,085 summaries of 22,417 RICO screens; license not stated | Screen-description grounding |
| [UXBench](https://arxiv.org/abs/2606.16262) | Ten surface families, seven dimensions, repair-lift protocol | The model for actionability-graded critique |
| [ArtifactsBench](https://arxiv.org/abs/2507.04952) | 1,825 tasks, checklist-guided MLLM judge | Judge-agreement reference point |
| [UI-Bench](https://arxiv.org/abs/2508.20410) | "10 tools, 30 prompts, 300 generated sites, and 4,000+ expert judgments", TrueSkill with confidence intervals | Expert pairwise preference on text-to-app output |
| [Design Arena](https://www.designarena.ai/about) / [WebDev Arena](https://arena.ai/blog/webdev-arena) | Anonymous pairwise votes, Bradley–Terry (`Rating = 400 × log₁₀(strength)`; models under 50 comparisons filtered); WebDev Arena reported 80,000+ votes and a "26% tie ratio" often from compile failures | Preference data; measures taste, not adherence or a11y |

**Open questions:** No benchmark reports κ for a VLM judge *on the specific dimensions* the stream cares about (hierarchy, states, copy). Whether DOM-augmented judging (numbers plus pixels) closes the DiffSpot gap is untested.

---

## 3. Human rubric scores

**What it is:** A designer or reviewer scores the artifact on a rubric, or picks the better of two, and that score becomes the gold that calibrates judges and adjudicates disputes.

**Why it matters:** Humans are the reference every other grader is measured against, yet human agreement on UI quality is itself modest (Design2Code κ 0.46 pairwise; UICrit κ ≈ 0.30 on critiques). A rubric that does not reach acceptable agreement produces gold that is mostly noise — and a judge calibrated to it inherits the noise.

**Key findings:**

- **Reliability thresholds.** For Krippendorff's α, social scientists "rely on data with reliabilities α ≥ 0.800, consider data with 0.800 > α ≥ 0.667 only to draw tentative conclusions" ([Wikipedia](https://en.wikipedia.org/wiki/Krippendorff%27s_alpha)). McHugh's revision of Cohen's κ bands treats below 0.60 as inadequate, 0.60–0.79 moderate and 0.80–1.00 strong to almost perfect, criticizing the older convention because "accepting 0.40 to 0.60 as 'moderate' may imply the lowest value (0.40) is adequate agreement" ([McHugh 2012](https://www.biochemia-medica.com/en/journal/22/3/10.11613/BM.2012.031)). By either standard, every published UI-quality agreement number above is in the *tentative* zone.
- **Absolute vs comparative judgment.** Comparative judgment goes back to Thurstone's law of comparative judgment; Pollitt's adaptive variant reported reliability of "0.96" after 16 judgments per script and "0.93 … after about 9 judgements," though Bramley and Vitello caution "Whether adaptive comparative judgement genuinely increases reliability is not certain" ([Wikipedia: ACJ](https://en.wikipedia.org/wiki/Adaptive_comparative_judgement)). The UI-specific data agrees: Design2Code's raters hit κ 0.46 on pairwise but 0.32–0.26 on direct assessment ([Design2Code](https://arxiv.org/html/2403.03163)); UICrit's validation reached 0.55 on ranking preferences vs 0.29 on critique ratings ([UICrit](https://arxiv.org/html/2407.08850v2)). **Ask designers which of two is better; do not ask them for a 7 out of 10.**
- **Scale design.** Preston and Colman found 2–4-point scales "performed relatively poorly" with reliability rising "up to about 7" categories and test–retest falling above 10 (abstract via search; the [ScienceDirect page](https://www.sciencedirect.com/science/article/abs/pii/S0001691899000505) returned 403). A 2025 measurement-error analysis adds that when error grows with category count "there is a clear optimum," and converting a Likert item to a 0–100 slider "will result in a drastic decrease in reliability" ([arXiv 2502.02846](https://arxiv.org/abs/2502.02846)). Behaviorally anchored rating scales replace adjectives with observable behaviors per scale point and are the established route to higher inter-rater reliability (practitioner summaries via search; no primary source fetched). Translation for this stream: **binary checklists per dimension (the CheckEval result transfers to humans), a 5-point anchored scale only where a gradient is real, and pairwise for overall quality.**
- **Throughput and fatigue.** UICrit's seven annotators worked "full-time" for about two weeks to cover 1,000 screens and were assigned one per UI because the team "optimized for coverage" ([UICrit](https://arxiv.org/html/2407.08850v2)) — roughly 14 screens per annotator-day at critique depth, which is far below what a per-generation gate could afford. Fatigue literature (search only; no primary study fetched) reports attention declining with time on task. Under two minutes, a designer can reliably do three things: a pairwise pick, a short binary checklist (states present? primary action obvious? on-system?), and a bounding-box mark on the worst defect — which is exactly the UICrit annotation shape.
- **When may a judge stand in for the human?** The Alternative Annotator Test is "a novel statistical procedure" that "requires only a modest subset of annotated examples to justify using LLM annotations," evaluated on language and vision-language tasks ([arXiv 2501.10970](https://arxiv.org/abs/2501.10970)). This is the right formalism for deciding, per dimension, whether the human step in the loop can be sampled rather than exhaustive.

**Open questions:** No study measures designer agreement on the *stream's* dimensions with anchored rubrics; the Design2Code and UICrit numbers come from generic quality ratings. Whether pre-shown machine grades anchor human raters (raised in [design-sdlc/02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)) remains unmeasured.

---

## 4. Composite grades and provenance

**What it is:** How the three grader types are combined into one record that a reviewer can accept or override and a feedback step can consume, with enough provenance to trace the grade to the exact generator configuration.

**Why it matters:** A single weighted number hides the one fact that matters for tuning: *which* lever failed. Gates and scores answer different questions — "may this ship / enter the exemplar set?" vs "is the generator getting better?" — and mixing them makes both unanswerable.

**Key findings:**

- **Gates, then scores.** Deterministic checks with near-zero false positives (axe-core's stated design goal; schema validity; console errors) are hard floors: fail any and the artifact is rejected before a judge or human spends a token. ReLook's training loop encodes the same rule as "a strict zero-reward rule for invalid renders" so the policy cannot be rewarded for output that does not render ([arXiv 2510.11498](https://arxiv.org/abs/2510.11498)). Visual-SDPO goes further and traces "each detected defect back to the code statements responsible for the affected elements" — "overlapping elements, clipped text, broken alignment, low contrast, and overflow" — which is only possible if the grade records *locations*, not just totals ([arXiv 2606.10334](https://arxiv.org/abs/2606.10334)). Soft dimensions (hierarchy, copy, affordances) are scores with intervals, never gates.
- **Store components, not composites.** Design2Code's finding that text similarity correlates *negatively* with human preference while position and color correlate positively means any fixed weighting would have been wrong; keep the vector and fit the weighting later from human pairwise data (a Bradley–Terry model over grade vectors is the natural fit, since both arenas already use it).
- **Judge scores as intervals with identity.** Record the judge model, prompt hash, rubric version, criterion order (position bias), whether evidence was gathered first, and a confidence or interval — the conformal-interval recommendation in [arXiv 2604.25235](https://arxiv.org/abs/2604.25235). A jury records each member's vote.
- **Human overrides are first-class.** The human step may confirm, override, or add a defect; the record must keep both the machine value and the override so the calibration set for the judge (κ against humans) can be rebuilt from history.
- **Provenance to the generator.** Every grade names the task id, the skill/rules/exemplar-set version, the construction-file schema and catalog version, the model and prompt hash, and the seed/temperature — so doc 03 can attribute a regression to a rule edit. This mirrors "grade what the agent produced, not the path it took" while still recording what produced it ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Open questions:** Which dimensions should be gates vs scores is partly a policy choice; the proposal below is a starting point, not a finding. No public dataset pairs component-level grades with human pairwise preferences for generated UI, so the weighting cannot yet be fitted from published data.

---

## 5. Grading prototypes, not screens

**What it is:** Grading a multi-screen, stateful prototype: whether every route is reachable, every interactive element leads somewhere, states are covered, and the flow completes — from Playwright traces, route maps, or an agent walkthrough rather than a single screenshot.

**Why it matters:** Almost every benchmark above grades one screen. The generator loop produces flows, and a flow can be perfect screen-by-screen and still dead-end.

**Key findings:**

- **Functional test cases executed by an agent.** WebGen-Bench pairs each instruction with test cases where "a powerful web-navigation agent" executes operations and checks "the expected result after the operation"; the best agent scored "only 27.8% accuracy" on its 647 tests ([arXiv 2505.03733](https://arxiv.org/abs/2505.03733)). Vision2Web scales this to "193 tasks … 918 prototype images and 1,255 test cases" across static, "interactive multi-page frontend reproduction" and full-stack levels, using "a GUI agent verifier and a VLM-based judge" ([arXiv 2603.26648](https://arxiv.org/abs/2603.26648)). WebIGBench targets "interaction consistency between the generated and the reference webpages" with 871 interactive actions over 103 pages ([arXiv 2606.00154](https://arxiv.org/abs/2606.00154)). FronTalk uses "a web agent to simulate users and explore the website" and finds "a significant forgetting issue where models overwrite previously implemented features" across turns ([arXiv 2601.04203](https://arxiv.org/abs/2601.04203)) — the regression case that per-screen grading cannot see.
- **Deterministic flow checks that exist today.** Dead links: collect every `href` with `locator.all()`, normalize, `page.request.get()` each, soft-assert status so "Errors will be collected and displayed at the end" ([Checkly](https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/)). Route coverage: if the construction file or intent spec declares the route map, a crawl that records visited routes gives a coverage ratio; interactive elements with no handler or no navigation target are countable from the DOM. Per-route console errors and axe runs are the same fixtures as §1, executed on every route in the crawl.
- **Traces as the evidence layer.** Playwright's trace viewer records actions, DOM snapshots and network per step ([Trace viewer](https://playwright.dev/docs/trace-viewer)); UXBench's coverage gate and Cookie-Bench's "per-step screenshots" are the same idea applied to judges — the judge grades the *trace*, and the trace is the evidence the "Gaming the Judge" paper says to verify claims against.
- **What nobody has benchmarked.** No public benchmark grades *state coverage* (empty/loading/error per screen) or *navigation completeness* (every screen reachable, no dead ends, back paths sane) for generated prototypes; none reports judge-vs-human agreement on flow-level defects; none measures whether a flow-level grade predicts the usability findings a moderated session would surface. [design-sdlc/02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) asked for a flow-level critique benchmark; a year of search still finds none.

**Open questions:** Should a prototype grade be the min over screens (a dead end fails the flow), the mean, or a separate flow vector — and does that choice change what the generator learns? Untested.

---

## Cross-cutting themes

1. **Rank, don't score.** Humans (κ 0.46 vs 0.26–0.32), VLM judges ("can rank but cannot score") and arenas all agree: comparative judgment is the reliable primitive; absolute scores are intervals at best.
2. **Evidence before judgment.** Every high-agreement judge (ArtifactsBench, Cookie-Bench, UXBench) gathers evidence — screenshots over time, agent exploration, checklists — before scoring; every documented judge failure (DiffSpot, Gaming the Judge, severity κ ≈ 0) comes from scoring without it.
3. **Decompose to binaries.** CheckEval's +0.45 cross-judge agreement, axe's pass/fail rules, and BARS all point the same way: a grade is a vector of yes/no answers with locations, not a number.
4. **Automation coverage is a known fraction.** 57% of a11y issues by volume, ~41% of fine visual changes at best, 27.8% of functional tests passed — each figure is a reason the human step cannot be removed, only sampled.
5. **The reference problem.** Every strong deterministic metric needs a gold render; the loop rarely has one. Exemplar critiques (UICrit), per-task checklists (ArtifactsBench) and the construction file's own declared intent are the substitutes.

---

## Recommendations: a grading stack

| Dimension | Grader type | Tool | Reliability | Gate or score |
|---|---|---|---|---|
| Schema / catalog validity | Deterministic | Structured outputs + builder semantic validator | Exact | Gate |
| Console / page errors | Deterministic | Playwright `pageerror` fixture | Exact | Gate |
| axe violations | Deterministic | axe-core via Storybook `a11y.test: 'error'` or `@axe-core/cli` | Zero false positives by design; ~57% coverage | Gate (violations = 0) |
| On-system rate / token drift | Deterministic | Deslint `no-arbitrary-*`, `eslint-plugin-tailwindcss`, stylelint strict-value, registry import check | Exact for what it parses; misses wrong-role tokens | Gate (0 raw values) + score (rate) |
| Dead links / route coverage | Deterministic | Playwright crawl + `page.request.get()`; route map from intent spec | Exact | Gate (0 dead) + score (coverage) |
| State coverage | Deterministic (presence) + judge (quality) | Enumerated states in construction file / stories; ui-craft seven-state pass | Presence exact; quality tentative | Gate (presence) + score (quality) |
| Visual regression vs gold | Deterministic | Playwright `toHaveScreenshot` (pixelmatch), SSIM as secondary | High when baseline exists; noisy across OS/fonts | Score; gate only for regression tasks |
| Layout vs reference | Deterministic | Design2Code block-match / position / color (UIBenchKit) | Position/color significant; text not | Score |
| Spacing / alignment / contrast | Deterministic numbers → judge | DOM bounding boxes + computed styles fed to judge; never screenshot-only (DiffSpot) | Tentative | Score |
| Hierarchy, consistency, copy, affordances | Judge (jury of 3, evidence-first, binary checklist, permuted criteria) | Rubric anchored with UICrit-style exemplars | Ranking ≫ scoring; report interval | Score |
| Overall quality | Human pairwise + judge pairwise | Bradley–Terry over pairs; calibrate judge with alt-test | κ ≈ 0.46–0.55 human pairwise | Score (drives weighting) |
| Severity | Human only | Reviewer override in the record | Machine α ≈ 0 | Human field |

---

## The grade record

A sketch of the JSON a grader emits and doc 02/03 consume. Dimensions are a vector; every defect carries a location; every judge carries identity and an interval; the human block can override anything.

```json
{
  "grade_id": "g_01J9…", "task_id": "invite-teammate-sheet-007", "created_at": "2026-09-02T10:14:00Z",
  "artifact": { "kind": "prototype", "commit": "3f1c…", "routes": ["/settings", "/settings/invite"],
                "construction_file_sha": "ab12…", "screenshots": ["s3://…/invite@1280.png", "s3://…/invite@390.png"] },
  "generator": { "skill": "proto-builder@1.4.2", "rules_sha": "9e0d…", "exemplar_set": "ex-2026-08-30",
                 "catalog_version": "ds-core@7.2.0", "schema_version": "cf-1.3", "model": "<id>", "prompt_sha": "c7a1…",
                 "seed": 17, "temperature": 0 },
  "gates": { "schema_valid": true, "page_errors": 0, "axe_violations": 0, "raw_values": 0, "dead_links": 0, "passed": true },
  "dimensions": [
    { "name": "on_system_rate", "type": "deterministic", "value": 0.97, "evidence": "lint://report#L12" },
    { "name": "state_coverage", "type": "deterministic", "value": { "present": ["idle","loading","empty","error"], "missing": ["offline"] } },
    { "name": "route_coverage", "type": "deterministic", "value": 1.0 },
    { "name": "hierarchy", "type": "judge", "checklist": { "primary_action_obvious": true, "single_h1": true, "reading_order_matches_dom": false },
      "score": 0.67, "interval": [0.4, 0.9], "judges": [{ "model": "<id>", "prompt_sha": "e4f9…", "rubric": "hier-v3", "criteria_order_seed": 3 }],
      "evidence": ["dom://main/h2[2]", "screenshot://invite@1280.png#bbox=0.12,0.31,0.40,0.36"] },
    { "name": "copy", "type": "judge", "score": 0.8, "interval": [0.6, 1.0] },
    { "name": "overall_pairwise", "type": "human", "opponent_grade_id": "g_01J8…", "winner": "this", "rater": "r_42", "seconds": 84 }
  ],
  "defects": [
    { "id": "d1", "dimension": "hierarchy", "severity_machine": null, "severity_human": "major",
      "location": { "route": "/settings/invite", "selector": "form > h2:nth-of-type(2)", "bbox": [0.12, 0.31, 0.40, 0.36] },
      "message": "Secondary heading competes with primary action", "found_by": "judge" }
  ],
  "human": { "reviewer": "r_42", "reviewed_at": "2026-09-02T10:20:00Z",
             "overrides": [{ "dimension": "hierarchy", "from": 0.67, "to": 0.5, "reason": "reading order also wrong on mobile" }],
             "accepted_as_exemplar": false },
  "provenance": { "grader_version": "grader@0.9.1", "trace": "trace://…/invite.zip", "rubric_pack": "rubrics-2026-09" }
}
```

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| axe-core | https://github.com/dequelabs/axe-core | Zero-false-positive a11y rules engine, MPL-2.0; the a11y gate | fetched OK | guardrails-and-evals |
| Storybook accessibility tests | https://storybook.js.org/docs/writing-tests/accessibility-testing | axe per story with `a11y.test: 'off' \| 'todo' \| 'error'` | fetched OK | guardrails-and-evals |
| Playwright `toHaveScreenshot` | https://playwright.dev/docs/api/class-pageassertions | Pixel diff with `maxDiffPixelRatio`, `threshold`, `mask`, `animations` | fetched OK | guardrails-and-evals |
| pixelmatch | https://github.com/mapbox/pixelmatch | AA-aware perceptual pixel diff; threshold 0.1; returns mismatch count | fetched OK | guardrails-and-evals |
| Checkly page-error fixture | https://www.checklyhq.com/blog/track-frontend-javascript-exceptions-with-playwright/ | `pageerror` → `expect(errors).toHaveLength(0)` fixture; console-error gate | fetched OK | hooks |
| Checkly broken-link check | https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/ | Crawl hrefs, soft-assert status; dead-end gate | fetched OK | hooks |
| Deslint | https://deslint.com/docs/rules | 62 rules incl. `no-arbitrary-colors/spacing/typography`; token-drift lint for Tailwind/JSX | fetched OK (license not shown) | guardrails-and-evals |
| eslint-plugin-tailwindcss `no-arbitrary-value` | https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-arbitrary-value.md | Forbid arbitrary Tailwind values; off by default | fetched OK | rules |
| ui-craft | https://github.com/educlopez/ui-craft | Agent skill: seven-state `/unhappy` pass, deterministic UICraftScore, Nielsen 1–5 UsabilityScore; MIT, 308 stars | fetched OK | skills |
| UICrit dataset | https://github.com/google-research-datasets/uicrit | 11,344 designer critiques + bboxes + ratings, CC-BY-4.0; judge exemplars | fetched OK | guardrails-and-evals |
| CheckEval | https://arxiv.org/abs/2403.18771 | Checklist-decomposed LLM judging; +0.45 cross-judge agreement | fetched OK | guardrails-and-evals |
| PoLL (juries) | https://arxiv.org/abs/2404.18796 | Panel of small judges beats one large judge at ~1/7 cost | fetched OK | guardrails-and-evals |
| DiffSpot | https://arxiv.org/abs/2605.29615 | Benchmark proving VLMs miss fine CSS changes (≤40.7% recall) | fetched OK | guardrails-and-evals |
| UXBench | https://arxiv.org/abs/2606.16262 | Coverage-gated critique graded by repair-lift | fetched OK (code not located) | review-and-feedback |
| ArtifactsBench | https://github.com/Tencent-Hunyuan/ArtifactsBenchmark | Checklist-guided MLLM judge with temporal screenshots; >90% human agreement | paper fetched OK; repo not fetched | guardrails-and-evals |
| WebGen-Bench | https://arxiv.org/abs/2505.03733 | Agent-executed functional test cases for generated sites | fetched OK | guardrails-and-evals |
| Vision2Web | https://arxiv.org/abs/2603.26648 | GUI-agent verifier + VLM judge across static → multi-page → full-stack | fetched OK | guardrails-and-evals |
| UIBenchKit | https://arxiv.org/abs/2605.13141 | Unified design-to-code metric toolkit | fetched OK (abstract) | guardrails-and-evals |
| Design Arena | https://www.designarena.ai/about | Anonymous pairwise design votes, Bradley–Terry | fetched OK (methodology page 403) | guardrails-and-evals |
| UI-Bench | https://arxiv.org/abs/2508.20410 | 4,000+ expert pairwise judgments on text-to-app tools, TrueSkill | fetched OK | guardrails-and-evals |
| Alternative Annotator Test | https://arxiv.org/abs/2501.10970 | Statistical test for when a judge may replace human raters | fetched OK | *proposed:* grading-and-calibration |

---

## Sources

- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- https://arxiv.org/abs/2403.03163 · https://arxiv.org/html/2403.03163
- https://arxiv.org/abs/2605.13141
- https://arxiv.org/abs/2605.29615
- https://arxiv.org/abs/2604.25235
- https://arxiv.org/abs/2303.16634
- https://arxiv.org/abs/2306.05685
- https://arxiv.org/abs/2602.02219
- https://arxiv.org/abs/2604.22891
- https://arxiv.org/abs/2404.18796
- https://arxiv.org/abs/2403.18771
- https://arxiv.org/abs/2601.14691
- https://arxiv.org/abs/2501.10970
- https://arxiv.org/abs/2407.08850 · https://arxiv.org/html/2407.08850v2 · https://github.com/google-research-datasets/uicrit
- https://arxiv.org/abs/2606.16262
- https://arxiv.org/abs/2507.04952
- https://arxiv.org/abs/2605.30000
- https://arxiv.org/abs/2508.20410
- https://arxiv.org/abs/2410.16232
- https://github.com/webpai/designbench
- https://huggingface.co/datasets/HuggingFaceM4/WebSight
- https://github.com/google-research-datasets/screen2words
- https://www.designarena.ai/about (methodology page returned 403)
- https://arena.ai/blog/webdev-arena
- https://arxiv.org/abs/2505.03733
- https://arxiv.org/abs/2603.26648
- https://arxiv.org/abs/2606.00154
- https://arxiv.org/abs/2601.04203
- https://arxiv.org/abs/2510.11498
- https://arxiv.org/abs/2606.10334
- https://en.wikipedia.org/wiki/Krippendorff%27s_alpha
- https://en.wikipedia.org/wiki/Adaptive_comparative_judgement
- https://www.biochemia-medica.com/en/journal/22/3/10.11613/BM.2012.031
- https://www.sciencedirect.com/science/article/abs/pii/S0001691899000505 (returned 403; abstract via search)
- https://arxiv.org/abs/2502.02846
- https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/
- https://github.com/dequelabs/axe-core
- https://developer.chrome.com/docs/lighthouse/accessibility/scoring
- https://www.matuzo.at/blog/building-the-most-inaccessible-site-possible-with-a-perfect-lighthouse-score/
- https://storybook.js.org/docs/writing-tests/accessibility-testing
- https://playwright.dev/docs/api/class-pageassertions · https://playwright.dev/docs/emulation · https://playwright.dev/docs/api/class-page · https://playwright.dev/docs/trace-viewer
- https://github.com/mapbox/pixelmatch
- https://scikit-image.org/docs/stable/api/skimage.metrics.html
- https://github.com/richzhang/PerceptualSimilarity
- https://www.checklyhq.com/blog/track-frontend-javascript-exceptions-with-playwright/
- https://www.checklyhq.com/docs/learn/playwright/how-to-detect-broken-links/
- https://github.com/francoismassart/eslint-plugin-tailwindcss/blob/master/docs/rules/no-arbitrary-value.md
- https://deslint.com/docs/rules
- https://github.com/educlopez/ui-craft
