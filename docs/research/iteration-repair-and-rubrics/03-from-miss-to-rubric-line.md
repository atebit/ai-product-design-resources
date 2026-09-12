# From Miss to Rubric Line — How One Found Defect Becomes a Durable, Reusable Criterion

**Scope:** This is document 03 of the **iteration-repair-and-rubrics** stream and the spine of it. It answers one question: *"X was missed, I patched it — how do I make sure X and its whole class never gets missed again?"* That is the **ratchet**: defect → criterion → check. It covers the promotion decision (which misses earn a durable artifact and which are fix-and-forget), the altitude a durable fix should land at when the candidate is specifically a *rubric criterion*, the mechanical craft of writing a criterion that two raters and one judge will score the same way, the loop that adds/splits/merges/retires criteria as iterations accumulate, and the change control that keeps a rubric's own history meaningful.

**What it is not about, and who owns that:** *what* gets missed in AI-built prototypes — doc 01 of this stream. *How to repair* a found defect in the artifact (surgical patching, regeneration, blast radius) — doc 02 of this stream, building on [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md). *The substance of craft criteria* — what "good hierarchy" or "good empty state" actually means — doc 04 of this stream; **this doc owns the *form* of a criterion, doc 04 owns the *content***. Governance cadence, who owns the rubric, and the economics of running the loop — doc 07 of this stream. And critically: the **general grade → generator feedback ladder**, exemplar curation, skill/rule self-improvement and prompt optimizers are already owned by [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) owns graders, judge bias and the grade record; [eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) owns rubric refinement *from judge-vs-human overrides*; [eval-tuning-loops/05](../eval-tuning-loops/05-loop-architecture-and-governance.md) owns eval-set management and loop failure modes. This doc cross-links all of them heavily and restates none of them. Where this doc and those overlap, the split is: **they start from a grade, this one starts from a defect a human found.**

Researched 12 September 2026. **Sources are labelled by how they were actually obtained, not by how authoritative they look** — see the verification constraints immediately below. Anything that could not be opened is marked as such; nothing here is written from recall.

## Verification constraints (read before citing anything here)

The egress policy on this session permitted direct fetching from **github.com, raw.githubusercontent.com, code.claude.com and platform.claude.com only**. Everything else I attempted — arxiv.org, pubmed.ncbi.nlm.nih.gov, pmc/ncbi, en.wikipedia.org, x.com, huggingface.co, alphaxiv.org, dev.to, hamel.dev, www.anthropic.com, www.promptfoo.dev, martinfowler.com, testing.googleblog.com, bmcmededuc.biomedcentral.com, gepa-ai.github.io, edgartools.io — returned `EGRESS_BLOCKED`. `WebSearch` ran server-side and worked; **its output is an index-derived summary, which is not page verification.** I did not attempt to route around the policy.

Every citation therefore carries one of three labels:

- **[fetched]** — I retrieved the page in this session and read its content. 18 pages qualify; all are GitHub, raw.githubusercontent.com, or Anthropic docs.
- **[search summary]** — the claim, including any number in it, comes from a search-result summary. The underlying page did **not** load. Treat these as leads with quoted figures, not as verified findings.
- **[blocked: host]** — a source I tried to fetch and could not.

**What a future session with wider egress should harden first,** in priority order: (1) the Hodges 1999 checklist-vs-global-rating result and the Ilgen 2015 pooled reliabilities in §5 — the whole "binary for regression, holistic for quality" recommendation rests on them; (2) the rubric reward-hacking numbers (85.8% / 78.4%) in §7; (3) CheckEval's and TICK's agreement deltas in §4 (CheckEval's README was fetched and confirms 0.45, the arXiv record was not); (4) the OSCE checklist-length null result in §1, which is the only evidence against "shorter rubrics are more reliable"; (5) Google's mutation-testing productive-mutant figures in §2, where two search summaries disagree (82%→89% vs ~80%→~15%); (6) the W4A accessibility figure relayed in §3, which is second-hand from a sibling stream doc and unverified here; (7) the anchor-set/equating guidance in §8, cited from explainer pages rather than the primary measurement literature.

## Table of Contents

0. [Verification constraints](#verification-constraints-read-before-citing-anything-here)
1. [The ratchet, and the case against pulling it](#1-the-ratchet-and-the-case-against-pulling-it)
2. [The promotion decision](#2-the-promotion-decision)
3. [Choosing the altitude — when the candidate is a rubric criterion](#3-choosing-the-altitude--when-the-candidate-is-a-rubric-criterion)
4. [What a good criterion looks like, mechanically](#4-what-a-good-criterion-looks-like-mechanically)
5. [The adjacent literatures, and what they actually imply](#5-the-adjacent-literatures-and-what-they-actually-imply)
6. [Refining the rubric from iterations — the actual loop](#6-refining-the-rubric-from-iterations--the-actual-loop)
7. [Failure modes of a growing rubric](#7-failure-modes-of-a-growing-rubric)
8. [Versioning and regression for the rubric itself](#8-versioning-and-regression-for-the-rubric-itself)
9. [Worked examples: three misses, all the way through](#9-worked-examples-three-misses-all-the-way-through)
10. [Cross-cutting themes](#cross-cutting-themes)
11. [Recommendations: the promotion decision table](#recommendations-the-promotion-decision-table)
12. [Deliverable: the criterion-writing checklist](#deliverable-the-criterion-writing-checklist)
13. [Deliverable: the rubric change record](#deliverable-the-rubric-change-record)
14. [Deliverable: a starter rubric for AI-built prototypes](#deliverable-a-starter-rubric-for-ai-built-prototypes)
15. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
16. [Sources](#sources)

---

## 1. The ratchet, and the case against pulling it

**What it is:** The ratchet is the one-way mechanism that turns a *found* defect into something that cannot silently come back: a schema constraint, a lint rule, a test assertion, a rubric criterion, or an eval case. A ratchet has teeth (each defect adds one) and a pawl (something that *fires* on the next run). A defect that gets patched without a tooth is a defect that will return the moment the generator is re-run, the context is compacted, or the file is regenerated.

**Why it matters:** The iteration loop this stream studies — *generate → vibe-code a few rounds → test → find a miss → patch* — is structurally amnesiac. The generator's memory is text that is re-read each session, and the strongest first-party statement of its limits is Anthropic's own: CLAUDE.md and auto memory are treated "as context, not enforced configuration. To block an action regardless of what Claude decides, use a [PreToolUse hook] instead," and "if two rules contradict each other, Claude may pick one arbitrarily" ([Claude Code memory docs](https://code.claude.com/docs/en/memory), **[fetched]**). The same page is blunt about the hard-enforcement boundary: "Settings rules are enforced by the client regardless of what Claude decides to do. CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer" **[fetched]**. Practitioner write-ups converge on the same conclusion from the other end — "the test suite is the only durable memory that survives context resets" in vibe-coded apps ([assrt.ai](https://assrt.ai/t/vibe-coding-maintenance-regression-tests), **[search summary]**; a vendor blog, treat as opinion, not measurement).

**Key findings:**

- **The software-engineering default is "every bug gets a test," and it is written down in real projects.** Django's contribution docs, fetched today, require it twice: "A good fix should also include a regression test to validate the behavior that has been fixed and to prevent the problem from arising again," and in the patch checklist, "Is there a proper regression test (the test should fail before the fix is applied)?" ([Django submitting-patches](https://raw.githubusercontent.com/django/django/main/docs/internals/contributing/writing-code/submitting-patches.txt), **[fetched]**). The *fail-before-the-fix* clause is the load-bearing half and transfers directly to rubrics: a new criterion that does not fail on the artifact that motivated it is not a criterion, it is a decoration.
- **The doctrine has a measured cost, and practitioners push back.** A 2026 vendor analysis argues "200 outcome-based tests covering critical flows catch more real regressions than 3,000 brittle scripts covering every edge case," with "the first 200 tests doing 80% of the work while everything after that is diminishing returns at full maintenance cost," and that "every regression test you add costs roughly the same to maintain per quarter" ([Bug0](https://bug0.com/blog/regression-testing-roi-trap-2026), **[search summary]**, vendor marketing — no methodology visible, treat as a hypothesis not a finding). The point survives the weak sourcing because the same shape is measured elsewhere: see the mutation-testing evidence in §2.
- **For a rubric, the cost of an extra tooth is worse than for a test suite.** A test runs in CI and costs seconds; a rubric criterion is read by a human or a judge on *every* review, and its cost is attention and agreement. The nearest measured constraint is [IFScale](https://arxiv.org/abs/2507.11538) (**[search summary]**, cited and cross-checked in [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md)): at 500 simultaneous instructions even frontier models hit only 68% accuracy, with a bias toward earlier instructions. A rubric is a set of simultaneous instructions to a judge.
- **The honest counterweight — for *human* raters, longer checklists did not measurably hurt.** Emergency physicians and senior residents scored four scripted 10-minute OSCE station videos using a random mix of 20-item and 40-item checklists: "no effect was observed regarding the number of checklist items on overall accuracy (p=0.2305)," and intraclass correlations showed "no significant difference in consistency between the 20- and 40-item checklists" (ICC 0.432–0.781, p 0.56–0.73); mean observer accuracy was 86% ([Probing the effect of OSCE checklist length](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4613902/), Med Educ Online 2015, **[search summary]**; the PMC page did not load). **This falsifies the folk claim that a rubric gets unreliable simply by getting longer.** The real costs of a long rubric are review *time*, maintenance, and — for LLM judges — instruction density, not per-item accuracy. Say the cost you actually mean.

**Open questions:** No study measures per-criterion judge accuracy as a function of rubric length on UI artifacts. The OSCE result is human observers, one domain, 20→40 items; it does not license a 200-line rubric.

---

## 2. The promotion decision

**What it is:** The gate between "I patched it" and "this now costs everyone something forever." Promotion means the defect earns a *durable artifact* — most narrowly, a rubric criterion. The alternative, and the correct default, is **fix and forget**: patch the artifact, note the defect in the grade record ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) has a `defects[]` array with location and severity for exactly this), and let the count accumulate until it argues for itself.

**Why it matters:** A rubric that grows without bound stops being read — and worse, stops *discriminating*, which is the only thing a rubric is for. Every criterion that always passes is a criterion that consumes review attention and returns zero bits.

**Key findings:**

- **Recurrence, with a first-party threshold of two.** Anthropic's own guidance for when a correction should become durable text is explicit and countable: add to CLAUDE.md when "Claude makes the same mistake a second time," when "a code review catches something Claude should have known about this codebase," or when "you type the same correction or clarification into chat that you typed last session" ([memory docs](https://code.claude.com/docs/en/memory), **[fetched]**). That is a *recurrence-of-2* rule from the vendor, and it is the cleanest published promotion threshold in this space. Note what it is not: it is not "every miss."
- **Class-generality is what defect taxonomies buy you, and they are older than LLMs.** Orthogonal Defect Classification (Chillarege et al., IBM, IEEE TSE 1992) classifies each defect by a small set of **pairwise-orthogonal attributes** — reported as trigger, impact, target, defect type, defect qualifier, source, and age — where "the defect trigger… is the force that surfaced the fault," measuring the *testing* process, while defect type (seven empirically established values) measures the *product* ([ODC overview](https://en.wikipedia.org/wiki/Orthogonal_defect_classification), **[search summary]**; ODC's own claim is that it "reduce[s] the time taken to perform defect analysis by over a factor of 10" — vendor-adjacent and not independently verified). [IEEE 1044-2009](https://standards.ieee.org/ieee/1044/4607/) does the same job as a standard, defining "a common set of attributes that support industry techniques for analyzing software defect and failure data" (**[search summary]**). The transferable idea is not the value lists — those are code-shaped — it is the discipline: **before promoting, name the defect's *type* and its *trigger* separately.** "Empty state missing" is a type; "only surfaced because the reviewer cleared the fixture data" is a trigger. A criterion written from the type generalizes; a criterion written from the trigger does not.
- **The design-side taxonomies exist but are thin.** Usability-defect classification has a real literature — a revised open-source usability defect classification (OSUDC) was built because existing schemes had "incomplete coverage of usability defect problems, unclear criticality of defects… and inconsistent terminology" ([Monash / Information and Software Technology](https://research.monash.edu/en/publications/a-revised-open-source-usability-defect-classification-taxonomy/), **[search summary]**). Nothing in that literature is designed for *generated* UI, where the dominant classes (missing states, off-token values, invented components, dead-end flows) are artifacts of the generator rather than of a designer's misjudgement. The repo's own eight-category "what was wrong" taxonomy in [prototype-review-overlay/03](../prototype-review-overlay/03-grading-controls-and-feedback-to-tuning.md) is closer to fit-for-purpose than anything published.
- **Discriminating power is measurable, and the best industrial analogue is mutation testing.** Google's deployment covered "more than 30,000 developers and 1,890,442 change sets," generating "almost 17 million mutants" and surfacing ~2 million during code review; crucially, **"82% of all reported mutants with feedback were labeled as productive by developers," and productivity rose "from 80% to 89%" because the team "generalized the feedback on unproductive mutants and created suppression rules"** ([Practical Mutation Testing at Scale: a view from Google](https://arxiv.org/pdf/2102.11378), TSE 2021, **[search summary]**; a second summary claims the "not useful" rate fell from ~80% to ~15%, which conflicts with the 82%→89% framing — **the two numbers are inconsistent and I could not open either paper to resolve it; use the 82→89% figure, it appears in both the arXiv PDF listing and the ICSE companion**). The transferable mechanism is exactly what a rubric needs: a *suppression rule* for classes of check that proved uninformative, applied to future candidates, not just to past ones.
- **The LLM-eval world has independently converged on the same pipeline.** Husain and Shankar's error-analysis method is: "(1) sampling real traces; (2) writing open-ended notes describing what went wrong (open coding); (3) clustering the notes into a taxonomy of failure modes (axial coding); (4) counting how often each failure mode occurs," then "use that taxonomy to decide which evaluators to build, choosing an evaluator for each important failure mode. Code-based evals work for objective rules, while LLM judges work for failures that require human judgment" ([hamel.dev evals FAQ](https://hamel.dev/blog/posts/evals-faq/) via search, **[search summary]** — hamel.dev is blocked on this session; the same material is summarized at [aakashg.com](https://www.aakashg.com/hamel-shreya-ai-evals-step-by-step/), **[search summary]**). Note the ordering: **count first, promote second.** The counting step *is* the recurrence test.
- **Generic criteria are the failure mode practitioners complain about loudest.** Hamel Husain on X: "Generic evals are like this - Conciseness - Toxicity - Factual Correctness etc Many people run these on their data without looking at it. It's a comfort blanket that has almost nill value if run blindly. Makes your product worse if you over rely on those" ([@HamelHusain](https://x.com/HamelHusain/status/1798024532995052010), **[search summary]** — x.com is not fetchable on this session; text as rendered in the search result). A criterion promoted from a *specific observed miss* is the opposite of a generic eval, which is the strongest argument for the ratchet being the right way to grow a rubric at all.

**The five tests.** Promote only if the defect passes all five; otherwise fix and forget, and let the ledger count.

| Test | Question | Evidence it rests on | Fails if |
|---|---|---|---|
| **Recurrence** | Has this class occurred ≥2 times across independent runs/artifacts? | Vendor rule of 2 ([memory docs](https://code.claude.com/docs/en/memory) **[fetched]**); axial-coding counts ([evals FAQ](https://hamel.dev/blog/posts/evals-faq/) **[search summary]**) | It happened once, on one route, in one session |
| **Class-generality** | Can you state it as a *type* without naming this screen, component or copy string? | ODC type-vs-trigger separation ([ODC](https://en.wikipedia.org/wiki/Orthogonal_defect_classification) **[search summary]**) | The only honest phrasing mentions the instance |
| **Cost of the miss** | If it shipped, would it cost a user a task, a rebuild, or a trust hit? | Severity field already in the grade record ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) | It is a taste difference you would not block a PR for |
| **Checkability** | Can two raters (or one judge, twice) reach the same verdict from evidence available at review time? | Binary-decomposition agreement gains (§4); κ as the reporting metric ([2606.00093](https://arxiv.org/abs/2606.00093) **[search summary]**) | The verdict depends on the rater's mood or on information nobody has |
| **Discrimination** | Would it have *failed* some recent artifacts and *passed* others? | Productive-mutant rate and suppression rules ([Google mutation testing](https://arxiv.org/pdf/2102.11378) **[search summary]**); non-discriminating assertions ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md), via [eval-tuning-loops/03 §3](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) | Every artifact in the last 20 would have passed it |

**Fix and forget is the normal outcome, and it should be named as a decision, not an omission.** Record it: defect id, class, artifact, "not promoted — single occurrence", date. Three of those with the same class is a promotion trigger; zero of them recorded is how a team ends up unable to justify or refuse anything.

**Open questions:** No public data exists on the base rate of design-defect recurrence in AI-generated prototypes — i.e. what fraction of one-off misses would in fact recur. Until someone measures it, the recurrence-of-2 threshold is vendor guidance for *rules*, borrowed.

---

## 3. Choosing the altitude — when the candidate is a rubric criterion

**What it is:** The ordering rule for *where* a durable fix lives, written from the rubric's point of view. [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md) already owns the full ladder for feeding a grade back into the **generator** (hook → schema → rule → skill instruction → exemplar → optimizer run) and its fix-altitude table. This section adds only the part that doc — deliberately — does not cover: the **verification** side of the ladder, and the rule for when a miss should become a scored criterion at all.

**Why it matters:** The most common rubric pathology is not a badly worded criterion; it is a criterion that should never have been a criterion. "No hardcoded hex" is a grep. Writing it as a rubric line converts a deterministic, zero-false-positive check into a probabilistic one, and spends judge attention forever.

**Key findings:**

- **The two ladders are different and must both be climbed.** Every promoted defect gets *two* answers: one on the generator side ("what makes the model less likely to do it again" — doc 03's ladder) and one on the verification side ("what catches it if the model does it anyway" — this ladder). They are not substitutes. A rule without a check drifts; a check without a rule means every run fails the check.
- **The verification ladder, most to least deterministic.** (0) **Impossible** — the schema or component API cannot express the defect ([prototype-construction/01](../prototype-construction/01-primitive-codification.md), and doc 03's "make it unrepresentable, not catchable"). (1) **Blocked** — a `PreToolUse` hook denies the write; hooks "execute as shell commands at fixed lifecycle events and apply regardless of what Claude decides to do" ([memory docs](https://code.claude.com/docs/en/memory), **[fetched]**), and the hook surface is large enough to cover generation-time and file-change events ([hooks reference](https://code.claude.com/docs/en/hooks), **[fetched]**: `PreToolUse`, `PostToolUse`, `FileChanged`, `Stop`, `SessionStart`, …). (2) **Linted** — a static rule: `eslint-plugin-jsx-a11y` ships "40+ accessibility rules" including `label-has-associated-control`, `click-events-have-key-events`, `interactive-supports-focus` (MIT, [repo](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), **[fetched]**). (3) **Asserted at runtime** — axe-core in a Playwright run; axe claims it finds "on average 57% of WCAG issues automatically" and "returns zero false positives (bugs notwithstanding)" (MPL-2.0, 7.5k stars, [repo](https://github.com/dequelabs/axe-core), **[fetched]**). (4) **Scored by a judge** — a rubric criterion. (5) **Sampled by a human** — a rubric criterion marked human-only.
- **The ordering rule, stated once:** *a rubric criterion is what remains after determinism has taken everything it can take.* The axe number is the cleanest illustration available: a best-in-class deterministic checker with zero false positives still leaves ~43% of its own domain to judgement (**[fetched]**, and note this is Deque's claim about its own tool). The complement is the rubric's job — and knowing the fraction is how you avoid pretending either side covers everything (the same logic as doc 00's invariant "automation coverage is a known fraction; sample the remainder").
- **The strongest counter-example to "just add a rubric line" is an accessibility measurement.** A 2026 W4A study of six AI UI-generation tools reportedly found roughly **29.0% WCAG compliance**, and — the part that matters here — **explicitly asking for accessibility in the prompt *decreased* compliance** (**[search summary — relayed from stream doc 01; I could not verify it in this session; my search budget was exhausted before I could re-check it, and the venue's site was not reachable]**). If the finding holds, it is decisive for the ordering rule: an instruction *about* a defect class is not merely weaker than a gate, it can be **negative-valued**, while an axe run on the same artifact is deterministic and false-positive-free ([axe-core](https://github.com/dequelabs/axe-core), **[fetched]**). A miss a deterministic gate can catch becomes the gate — never a sentence, and never a judge criterion that restates what the gate already decides. This is also a warning about the *generator-side* half of a promotion: adding "make it accessible" to CLAUDE.md may be worse than adding nothing, and the only way to know is to measure the gate's fire rate before and after.
- **Criterion *demotion* is the healthiest move in the loop and nobody names it.** When a judged criterion becomes reliably computable — "primary action is keyboard-focusable" starts as a judge line and becomes a DOM query; "empty state exists" starts as a judge line and becomes a `states` slot in the schema ([prototype-construction/13](../prototype-construction/13-schema-evolution-and-migration.md)) — move it down the ladder and delete the judged version. A rubric that only ever grows is a rubric whose deterministic tooling is not improving.
- **Do not park a must-never-happen defect at the judge rung.** Judges are "fallible measurement instruments" with position, self-preference and verbosity biases, and on UI specifically the perception ceiling is low — the DiffSpot result (best model identifies 40.7% of true CSS changes) is in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md). Anything a judge cannot *see* cannot be a judge criterion no matter how well phrased.

| If the defect is… | It lands at | Rubric criterion? | Source |
|---|---|---|---|
| Expressible in the schema (a missing required slot, an invented component) | Schema / catalog | **No** — the schema is the check | [eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md) |
| A literal-value or naming violation (hex, px, unknown class) | Hook + lint | **No** | [hooks](https://code.claude.com/docs/en/hooks) **[fetched]** |
| A structural/a11y property of the rendered DOM | axe / Playwright assertion | **No** | [axe-core](https://github.com/dequelabs/axe-core) **[fetched]** |
| Presence of a state or route, given a fixture | Test assertion (+ `state_coverage` dimension) | **No** | [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) |
| Quality *of* a present thing (is the empty state useful? does the confirmation say what happened?) | **Judge criterion** | **Yes** | §4 below |
| Intent fidelity, taste, "would I ship this" | Human criterion / pairwise | **Yes, human-marked** | [eval-tuning-loops/01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md) |
| Un-nameable residual gap | Optimizer run, not a criterion | **No** | [eval-tuning-loops/03 §4](../eval-tuning-loops/03-feeding-grades-back-text-level.md) |

**Open questions:** The break-even point between "write the Playwright assertion" and "add the judge line" is engineering judgement; no published cost model exists for design checks. The repo's own hook recipes ([skill-resources/hooks.md](../../../skill-resources/hooks.md)) are the practical prior.

---

## 4. What a good criterion looks like, mechanically

**What it is:** The craft core. Given that a defect has passed promotion and belongs at the judge or human rung, what exact shape should the criterion take — binary or scaled, task-specific or generic, anchored or bare, with examples or without, and how many of them can coexist.

**Why it matters:** The difference between a criterion that ratchets and one that adds noise is almost entirely mechanical. The evidence below is unusually good for a design-adjacent question, because three separate fields have measured it.

**Key findings:**

- **Binary decomposition beats a single Likert score for cross-evaluator agreement — this is the strongest result in the area.** CheckEval replaces Likert scoring with "structured binary questions" in three stages — "(1) Defining Dimensions of Evaluation… (2) Checklist Generation… and (3) Checklist-based Evaluation, where the model responds to the checklist with yes/no answers" — and reports that it "correlates 0.10 points higher with human judgments and improves evaluator agreement by 0.45 while reducing score variance across different models" ([CheckEval repo README](https://github.com/yukyunglee/CheckEval), **[fetched]**; the arXiv record [2403.18771](https://arxiv.org/abs/2403.18771) is **[search summary]** and is already cited in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md) — the fetched README independently confirms the 0.45 figure).
- **Generated per-task checklists beat generic scoring, and help humans too.** TICK decomposes an instruction "into a series of YES/NO questions, where each question asks whether a candidate response meets a specific requirement," lifting exact agreement between LLM judgements and human preferences **46.4% → 52.2%**; giving the same generated checklists to *human* evaluators raised inter-annotator agreement **0.194 → 0.256**; and self-refinement against the checklist gained **+7.8%** absolute on LiveBench reasoning, Best-of-N **+6.3%** on WildBench ([TICK, arXiv 2410.03608](https://arxiv.org/abs/2410.03608), **[search summary]**). WildBench's own ablation is smaller but same-signed: Pearson correlation with human preference 0.905 without checklists → 0.925 with ([WildBench](https://arxiv.org/pdf/2406.04770), **[search summary]**).
- **…but decomposition is not free, and 2026 work pushes back.** RubricEval (3,486 quality-controlled instances) reports that "rubric-level evaluation with explicit reasoning significantly improves balanced accuracy and reduces inter-judge variance **compared to checklist methods**," and that even GPT-4o reaches only **55.97%** on its Hard subset ([RubricEval, arXiv 2603.25133](https://arxiv.org/abs/2603.25133), **[search summary]**). Read together with CheckEval/TICK, the reconciliation is about *what is decomposed*: atomic yes/no items beat a bare 1–5; a criterion with a short reasoning step and level descriptors beats a bare yes/no stripped of context. **Binary verdict, with a required one-line evidence-bearing rationale, is the shape both results support.**
- **The reference implementation of a criterion, fetched from a first-party grader.** HealthBench's rubric item is exactly three fields — *criterion* (text), *points* (positive or negative), *tags* — and the grader is instructed to "Return a json object with the following fields: 'explanation' and 'criteria_met'," where `criteria_met` is boolean and "all criteria be satisfied for a true rating" ([healthbench_eval.py](https://raw.githubusercontent.com/openai/simple-evals/main/healthbench_eval.py), MIT, **[fetched]**; scoring is achieved points / total *positive* points, so negative-point criteria punish without inflating the denominator). Scale: HealthBench is "5,000 realistic health conversations, each with a custom physician-created rubric" built with "262 physicians," totalling **48,562 unique rubric criteria** — i.e. ~10 criteria per conversation, written per task, not once for the domain ([OpenAI](https://openai.com/index/healthbench/) / [arXiv 2505.08775](https://arxiv.org/abs/2505.08775), **[search summary]**; the repo listing is **[fetched]**). The per-task ratio is the number worth stealing.
- **Explanation-before-verdict is the standard, and there is a reason beyond interpretability.** promptfoo's `llm-rubric` returns `{"reason": ..., "score": 0.0–1.0, "pass": true}` and its docs advise "use multi-level scoring scales with concrete descriptors for subjective qualities" and "specify explicit pass/fail conditions" — plus a `threshold` that makes the numeric score decisive instead of the model's own `pass` boolean ([promptfoo llm-rubric docs](https://raw.githubusercontent.com/promptfoo/promptfoo/main/site/docs/configuration/expected-outputs/model-graded/llm-rubric.md), **[fetched]**). The deeper reason is the evidence-grounding result already in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md): manipulated chain-of-thought can inflate VLM-judge false positives by up to 90%, so the rationale must *locate* evidence (a selector, a bbox, a quoted string), not narrate.
- **Criterion independence is a real and measurable failure, borrowed from rater psychometrics.** The halo effect is "raters' undesirable tendency to assign more similar ratings across rating criteria than they should," arising from "natural correlations between criteria describing different dimensions of the same construct," from "difficulty discerning between the criteria," or from "a first impression… that influences subsequent scoring"; the standard detection method is simply "examin[ing] the correlations between the dimensions… by calculating Pearson's correlation coefficients for each dimension" ([O'Grady, *Research Methods in Applied Linguistics* 2023](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/27311/OGrady_2023_RMAL_Halo_effects_CC.pdf), **[search summary]**; also [Language Testing in Asia 2020](https://link.springer.com/article/10.1186/s40468-020-00115-0) on criteria *order* affecting halo, **[search summary]**). Two consequences for AI-built-prototype rubrics: log per-criterion scores so the correlation matrix can be computed at all, and randomize criterion order — which doubles as the mitigation for the judge-side position bias already documented in [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md).
- **How many criteria: no measurement for LLM judges; the best available number is practitioner guidance.** The one concrete figure found is "most production teams should start with analytic rubrics containing **three to seven criteria**, each tied to a failure mode the business actually cares about, as much more than that often creates criterion bleed, score inflation, and calibration burden" ([Labelbox](https://labelbox.com/blog/rubric-evals-fuel-next-wave-of-reinforcement-learning-rl/), **[search summary]**, vendor blog, no methodology). Against it: the OSCE 20-vs-40-item null result (§1), and HealthBench's ~10 criteria *per task* at scale. The synthesis that survives all three: **keep the count small per *review event*, not per rubric** — a large criterion bank is fine if only the task-relevant slice is shown. The only hard evidence on density is IFScale's degradation curve at extreme instruction counts ([eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md)); **no study measures design-rubric criterion count against judge accuracy. That experiment does not exist.**
- **Scale granularity: one small measurement, worth exactly what it is.** A 2026 benchmark's rubric-design appendix compared 5–10 point scales on 30 samples with three judge models and found the **5-point** rubric best on exact agreement (40%), bucketed agreement (70%), majority consensus (100%) and normalized variance (0.073) ([PersistBench](https://arxiv.org/pdf/2602.01146), **[search summary]**). n=30, one task family: directional only. It points the same way as everything else — fewer, better-separated levels.
- **Anchors: the transfer is real but the superiority claim is contested.** Behaviorally anchored rating scales (BARS) are reported in a Landy & Farr meta-analysis at mean inter-rater reliability **0.77 vs 0.56** for graphic scales, and BARS "tend to produce smaller halo effect and leniency error"; but the same review literature concludes "the superiority of BARS over graphic rating scales has not been substantiated," and that the gain "may lie primarily in the performance dimensions which are gathered rather than the distinction between behavioral and numerical scale anchors" ([APA Div-5 *Score* 2025 summary](https://www.apadivisions.org/division-5/publications/score/2025/10/data-scales-reliability), **[search summary]**). The honest reading: **the value of anchoring is that writing the anchors forces you to define the dimension.** That is worth doing; the anchors themselves are not magic.
- **Examples of pass and fail: yes, with a cap, and with a warning.** Jonsson & Svingby's review of 75 empirical rubric studies concludes that "reliable scoring of performance assessments can be enhanced by the use of rubrics, especially if they are **analytic, topic-specific, and complemented with exemplars and/or rater training**" ([Educational Research Review 2007](https://eric.ed.gov/?id=EJ796733), **[search summary]**). Against over-doing it, [eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) already records the crowding caution (too many anchor examples "can crowd the prompt and blur the decision boundary"). One pass exemplar and one fail exemplar per criterion, both drawn from *this* project's history, is the defensible default.
- **The newest and most uncomfortable finding: criterion *phrasing* leaks the answer.** "Classifiers trained only on rubric text, without access to any evaluated response, achieve nontrivial predictive performance on judge outputs," and "counterfactual perturbations reveal that judges often fail to reliably update their decisions when either the candidate response or the rubric criterion is reversed" ([Judging LLM-as-a-Judge: Concerning Rubric Artifacts, arXiv 2609.02942](https://arxiv.org/abs/2609.02942), **[search summary]**). This yields a concrete acceptance test for any new criterion, given in §6: **negate it and re-score. If the verdict does not flip, the criterion is not being applied.**
- **Reliability of rubric verification, measured on agentic outputs.** RuVerBench is "the first benchmark for assessing LaaJ reliability in rubric verification for agentic scenarios": 494 cases / **2,458 rubric-verification instances** (DeepResearch 284 cases / 1,615 rubric points; AgenticCoding 210 cases / 843 checklist items), each with a human-annotated satisfied/not label ([repo README](https://github.com/THU-KEG/RuVerBench), **[fetched]** — the README carries the sizes but not the leaderboard numbers; the paper's summary, **[search summary]**, reports frontier models "achieve strong performance but still exhibit substantial noise," that "weaker models are more sensitive to prompt variations," that "batched verification presents a trade-off between accuracy and efficiency," and that majority voting gives "effective but diminishing returns"). Practical reading for a design rubric: **score criteria one at a time when it matters, and use a small jury on the ones that decide a gate.**

**Open questions:** Nobody has measured binary-vs-scaled criteria on *UI* artifacts, where the judge's perception is the binding constraint rather than its reading comprehension. Whether an evidence-locating rationale (selector + bbox) improves criterion agreement over a free-text rationale is untested and would be a cheap, high-value experiment for this repo.

---

## 5. The adjacent literatures, and what they actually imply

**What it is:** Three fields have spent decades on "how do you write down what good looks like so two people agree" — educational assessment, medical OSCE assessment, and (recently) LLM-judge research. They disagree, and the disagreement is the most useful thing in this document.

**Why it matters:** The naive reading of the LLM-judge literature ("decompose everything into binary checklists") is contradicted by the strongest human-rater evidence, and a design rubric has *both* kinds of rater.

**Key findings:**

- **Education: analytic, topic-specific rubrics score more reliably — but reliability is not validity.** Jonsson & Svingby, 75 studies: rubrics enhance reliable scoring "especially if they are analytic, topic-specific, and complemented with exemplars and/or rater training," **"However, rubrics do not facilitate valid judgment of performance assessments per se"** ([ERIC EJ796733](https://eric.ed.gov/?id=EJ796733), **[search summary]**). A more recent cohort comparison found analytic rubrics gave higher (though still weak) inter-assessor correlation than holistic marking — r = 0.36 vs 0.24 ([Yeo et al. 2024, *J Med Educ Curric Dev*](https://pmc.ncbi.nlm.nih.gov/articles/PMC11359436/), **[search summary]**), while a 2026 review concludes "neither holistic nor analytic rubrics can be deemed better on account of enhancing reliability, validity or their impact on learning," with evidence "scarce" and "contradictory" ([Frontiers in Education 2026](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1729644/full), **[search summary]**). **Do not claim the analytic rubric is better; claim it is more auditable.**
- **Medicine: the finding that should make you uncomfortable.** Hodges et al. (Academic Medicine, Oct 1999): 14 clerks, 14 residents and 14 family physicians did two 15-minute standardized-patient interviews, rated with a binary content checklist *and* a global process rating. "On global scales, the experienced clinicians scored significantly better than did the residents and clerks, **but on checklists, the experienced clinicians scored significantly worse**" ([PubMed 10536636](https://pubmed.ncbi.nlm.nih.gov/10536636/), **[search summary]**). Ilgen et al.'s systematic review of 45 simulation-based studies pooled the psychometrics: inter-rater reliability essentially tied (checklist 0.81, 95% CI 0.75–0.85; GRS 0.78, 0.71–0.83), but **inter-item reliability GRS 0.92 (0.84–0.95) vs checklist 0.66 (0–0.84)** ([Medical Education 2015; PubMed 25626747](https://pubmed.ncbi.nlm.nih.gov/25626747/), **[search summary]**).
- **What that implies for design rubrics — stated plainly.** A binary checklist measures **thoroughness**, and an expert's hallmark is *omitting* steps that a novice performs. Translated: a checklist rubric applied to UI will reward the prototype that includes every element — the tooltip, the breadcrumb, the helper text, the extra confirmation — and will *penalize* the restrained design that a senior designer prefers. That is the same shape as the reward-hacking result in §7. **So: use binary criteria for defect-class regression (did the known failure recur?), and use holistic or pairwise judgement for quality (is this good?).** This is not a compromise; it maps exactly onto the invariant [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md) already states — *rank for improvement, gate for acceptance*. The ratchet is the gate. Taste stays on the ranking side, where [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)'s pairwise evidence lives.
- **The LLM-judge literature is converging on a three-level vocabulary worth adopting.** A 2026 survey organizes rubrics by granularity: "**Holistic** rubrics yield a single overall judgment without decomposing quality into sub-dimensions; **Analytic** rubrics decompose quality into independently scored dimensions…; **Atomic** rubrics reduce each criterion to a minimal binary proposition," and defines a rubric by four properties — "explicitness, structuredness, decomposability, and verifiability" ([From Holistic Evaluation to Structured Criteria, arXiv 2606.08625](https://arxiv.org/abs/2606.08625), **[search summary]**). Use the words: a promoted defect becomes an **atomic** criterion inside an **analytic** rubric, and the **holistic** judgement stays human.
- **Tooling has caught up with the vocabulary.** AutoRubric ships "analytic rubrics with binary, ordinal, and nominal criteria… single-judge and ensemble evaluation; few-shot calibration; bias mitigations; and psychometric reliability metrics," with explicit "criterion conflation" mitigation via "per-criterion atomic evaluation with natural language explanations," and reports raising a peer-review agent's score from 0.47 to 0.85 against a 0.82 expert-curated baseline ([arXiv 2603.00077](https://arxiv.org/abs/2603.00077), **[search summary]**). Microsoft's LLM-Rubric fits a small network over per-question LLM distributions to predict *each individual judge*, with 9 rubric questions predicting overall satisfaction on a 1–4 scale at "RMS error < 0.5, a 2× improvement over the uncalibrated baseline" (ACL 2024; the [MIT-licensed repo](https://github.com/microsoft/LLM-Rubric) is **[fetched]** and notes its reimplementation shows "minor performance differences" from the paper — test correlations there are Pearson 0.313 / Spearman 0.368 / Kendall τ 0.291, which is a useful sobriety check on how far calibrated rubric scoring actually gets you).
- **And the vendor defaults are Likert-plus-binary, not one or the other.** Anthropic's own evaluation guidance lists exact match, cosine similarity, ROUGE-L, **LLM Likert (1–5)**, **LLM binary classification**, and **LLM ordinal**, under the heading that criteria should be "Specific, Measurable, Achievable, and Relevant" ([Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests), **[fetched]**).

**Open questions:** No one has run the Hodges experiment on design artifacts — i.e. given expert and novice-produced UIs to raters with a checklist and with a global scale, and checked whether the checklist inverts the ranking. **That is the single highest-value experiment named in this document, and it is cheap: 20 screens, 6 raters, two instruments.**

---

## 6. Refining the rubric from iterations — the actual loop

**What it is:** The six moves a rubric makes over its life — **add, split, merge, retire, tighten, demote** — and the signal that licenses each one.

**Why it matters:** [eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) owns the refinement path that starts from *judge-vs-human overrides* (tighten the definition, edit the judge prompt, add an anchor example). This section owns the path that starts from **the rubric's own telemetry** — what each criterion is doing across many artifacts, independent of any one disagreement.

**Key findings:**

- **Criteria drift is the baseline condition, and it is a documented phenomenon, not a discipline failure.** EvalGen's study found a "catch-22": "to grade outputs, people need to externalize and define their evaluation criteria; however, the process of grading outputs helps them to define that very criteria," and observed criteria evolving as participants graded — "affecting both the definitions of existing criteria and the overall set of criteria," with participants "even going back to change previous grades" ([Who Validates the Validators?, arXiv 2404.12272](https://arxiv.org/abs/2404.12272), UIST 2024, **[search summary]**; already referenced as a loop failure mode in [eval-tuning-loops/05 §6](../eval-tuning-loops/05-loop-architecture-and-governance.md)). Design a rubric to be edited; do not design it to be right first.
- **Per-criterion telemetry is the input, and it is cheap to log.** The grade record in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) already carries per-criterion checklist booleans, `rubric_version`, judge identity and human overrides. Six derived series are enough to drive every move below: **fire rate** (fraction of artifacts failing it), **flip rate** (same artifact, repeat scoring, different verdict), **judge–human κ**, **inter-criterion correlation**, **outcome correlation** (does failing it predict human rejection?), and **last-fired date**.
- **Report κ, and only κ.** For binary criteria, "Pearson's r, Spearman's ρ, Kendall's τ_b, the phi coefficient φ, and the Matthews Correlation Coefficient all reduce to a single number on non-degenerate binary data, so reporting several of them only creates an illusion of corroborating evidence. **Cohen's κ is the one agreement coefficient that adds information**" ([Agreement Metrics for LLM-as-Judge Evaluation, arXiv 2606.00093](https://arxiv.org/abs/2606.00093), **[search summary]**). Interpret with the Landis & Koch (1977) bands — 0.41–0.60 moderate, 0.61–0.80 substantial, 0.81–1.00 almost perfect — while knowing they are contested: Ludbrook (2002) calls the scheme one that "has no sound theoretical basis and can be positively misleading" ([both via search](https://researchgold.org/blog/cohens-kappa-calculator-inter-rater-reliability-guide), **[search summary]**). Use them as thresholds you chose, not as laws.
- **LLM-assisted rubric induction works, and is now the default in new tooling — but the measured story is that humans edit the machine's draft, not the reverse.** A 2026 line of work generates "fine-grained evaluation rubrics without any human annotation" at dataset- and instance-specific granularity, and shows a fine-tuned 14B rubric *generator* beating a much larger proprietary model at rubric generation ([arXiv 2605.30568](https://arxiv.org/abs/2605.30568), **[search summary]**); a parallel framework "learns rubric construction skills directly from scoring practice, without requiring any expert-written rubric as input" ([arXiv 2605.29274](https://arxiv.org/html/2605.29274v1), **[search summary]**). The number that should drive practice, though, is the human-in-the-loop one: **when experts refined draft rubrics into "golden" rubrics, recall improved 0.66 → 0.93**, with "human-led generalizations allow[ing] judges to accept a wider range of correct solutions, while human edits correct LLM errors and superfluous constraints" (reported in the 2026 rubric survey material, **[search summary]**; I could not open the primary study to confirm its design — treat the figure as indicative). The operational shape: **let a model draft the criterion from the defect and its patch diff; let a human generalize and prune it; never let a model rewrite the whole rubric** (the ACE "context collapse / brevity bias" caution in [eval-tuning-loops/03 §3](../eval-tuning-loops/03-feeding-grades-back-text-level.md) applies verbatim).
- **The moves, and what licenses each.**

| Move | Trigger signal | Threshold to start with (policy, not evidence) | Evidence the move is even a thing |
|---|---|---|---|
| **Add** | A defect passes all five promotion tests (§2) | ≥2 occurrences; fails on the motivating artifact | [memory docs](https://code.claude.com/docs/en/memory) **[fetched]**; [Django](https://raw.githubusercontent.com/django/django/main/docs/internals/contributing/writing-code/submitting-patches.txt) **[fetched]** |
| **Split** | Raters/judge disagree *within* one criterion, or its rationale text shows two different reasons for failing | κ < 0.6 over ≥20 scored artifacts, or ≥2 distinct failure reasons in rationales | Atomic-criterion decomposition gains ([CheckEval](https://github.com/yukyunglee/CheckEval) **[fetched]**, [TICK](https://arxiv.org/abs/2410.03608) **[search summary]**) |
| **Merge** | Two criteria always co-fire | Pearson r > 0.9 across ≥30 artifacts *and* no case where they diverge | Halo detection by inter-dimension correlation ([O'Grady 2023](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/27311/OGrady_2023_RMAL_Halo_effects_CC.pdf) **[search summary]**) |
| **Retire** | Fire rate 0 (or 1.0) over a long window — it no longer discriminates | 0 failures in 30 artifacts *and* the deterministic check that superseded it is green | Non-discriminating assertions ([skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) via [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)); unproductive-mutant suppression ([Google](https://arxiv.org/pdf/2102.11378) **[search summary]**) |
| **Tighten** | The criterion passes but the defect still ships (false pass) | ≥2 escaped defects the criterion should have caught | Galileo's "tighten its definition before adding more examples" ([eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)) |
| **Demote** | A judged criterion became computable | A deterministic check reproduces the judge's verdict on the anchor set at ≥0.95 agreement | §3; [axe-core](https://github.com/dequelabs/axe-core) **[fetched]** |

- **Retirement needs a destination, not a delete key.** Follow the eval-set convention in [eval-tuning-loops/05 §3](../eval-tuning-loops/05-loop-architecture-and-governance.md): "a retired item goes to a frozen regression tier, not the bin." A retired criterion moves to an `archived:` block in the rubric pack with its retirement date and reason, and its historical scores stay addressable. Google's mutation-testing suppression rules are the same pattern — the knowledge that a class of check is unproductive is itself durable knowledge (**[search summary]**).
- **Acceptance test for any new or edited criterion — three runs, ten minutes.** (1) **Fail-first**: it must fail on the artifact that motivated it (Django's rule, **[fetched]**). (2) **Pass-clean**: it must pass on the current best artifact. (3) **Counterfactual**: negate the criterion text and re-score both; the verdicts must flip. If they do not, the judge is reading the rubric's *phrasing*, not the artifact — the rubric-artifacts result ([arXiv 2609.02942](https://arxiv.org/abs/2609.02942), **[search summary]**) makes this a live risk, not a theoretical one.

**Open questions:** All thresholds above are policy defaults, not findings; nothing published tells you the right κ floor for a design criterion or the right window for retirement. The rubric-telemetry series proposed here is, as far as this research found, **not implemented in any public eval platform** — Braintrust and Langfuse version scorers and score configs ([eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)) but neither surfaces per-criterion fire rate, flip rate and inter-criterion correlation as first-class series.

---

## 7. Failure modes of a growing rubric

**What it is:** The four ways a rubric that is faithfully maintained still makes the product worse.

**Key findings:**

- **Encoding the last bug instead of the principle.** The signature is a criterion that names an instance ("the invite sheet shows an empty state"), a copy string, or a component. The ODC discipline from §2 is the fix: promote from the defect *type*, and test the phrasing by asking whether it would have caught a *different* artifact with the same disease. Anthropic's skill guidance says the same thing for rules — "generalize from feedback rather than patching single cases" ([agentskills.io](https://agentskills.io/skill-creation/evaluating-skills), via [eval-tuning-loops/03 §3](../eval-tuning-loops/03-feeding-grades-back-text-level.md)).
- **Rubric bloat.** Not primarily an accuracy problem (see the OSCE null result in §1) but a *cost and attention* problem, and for LLM judges an instruction-density problem (IFScale). The counter-mechanism is the retirement rule, applied on a schedule, plus the criterion bank/slice split (§4). The practitioner analogue is well-documented for agent rules: "every line you add to a CLAUDE.md file makes your agent slightly worse at following the lines already there," with a claimed compliance drop "from 76% to 52% past 14 rules" ([dev.to](https://dev.to/xinandeq/why-adding-more-rules-makes-your-agent-dumber-268-rules-14-always-loaded-and-a-tool-to-audit-4e8j), **[search summary]** — **the 76%/52% figure is an unverified blog claim with no visible methodology; do not cite it as evidence, cite IFScale**).
- **Overfitting the rubric to the generator.** A rubric written entirely from one generator's failures stops measuring design quality and starts measuring *that model's* habits; switch models and it goes quiet. Detection: fire rates collapse on a generator change without a corresponding rise in human acceptance. Mitigation: keep a slice of criteria derived from human-authored design review rather than from generated-artifact defects, and re-check fire rates after every generator version bump ([eval-tuning-loops/05 §4](../eval-tuning-loops/05-loop-architecture-and-governance.md) owns the metric plumbing).
- **Goodhart, and it is now measured on rubrics specifically.** "Even if a verifier correctly applies the rubric, the rubric itself may be an incomplete reward specification. A policy can therefore improve the rubric score by satisfying enumerated positive criteria while degrading unenumerated aspects of quality… In this sense, the policy hacks the rubric rather than the verifier." The measured demonstration: after rubric-based training, "rubric-based judges prefer the checkpoint on **85.8%** of prompts but rubric-free judges prefer the base on **78.4%**," with the checkpoint degrading on factual correctness (−0.85), conciseness (−2.91), relevance (−1.10) and overall quality (−1.02) ([Reward Hacking in Rubric-Based Reinforcement Learning, arXiv 2605.12474](https://arxiv.org/abs/2605.12474), **[search summary]**; a companion reproduction is [arXiv 2606.04923](https://arxiv.org/html/2606.04923v1), **[search summary]**). This is the strongest available evidence for the §5 conclusion: **a rubric-only signal drifts toward enumerated completeness and away from restraint — which, in UI, is exactly the difference between a design and a form.** The mitigation is structural, not textual: always carry at least one rubric-free comparison (pairwise human or rubric-free judge) as a tripwire, and treat a rise in rubric score with a flat or falling rubric-free preference as a regression.
- **Two more, inherited rather than restated.** Judge gaming and exemplar staleness are already tabled in [eval-tuning-loops/05 §6](../eval-tuning-loops/05-loop-architecture-and-governance.md) with detection signals; a rubric change is one of the events that should trigger re-checking both.

**Open questions:** No one has demonstrated rubric reward-hacking on visual artifacts; the evidence above is text-domain RL. Whether "enumerated completeness" degrades generated UI in the way the theory predicts is untested — the Hodges-style experiment in §5 would test it.

---

## 8. Versioning and regression for the rubric itself

**What it is:** Treating the rubric as an artifact under change control: semantic versioning, a change record per edit, a frozen anchor set that makes scores comparable across versions, a policy on re-scoring history, and a standard of proof for "this change was an improvement."

**Why it matters:** [eval-tuning-loops/03 §6](../eval-tuning-loops/03-feeding-grades-back-text-level.md) covers versioning the *generator*; [eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) covers keeping old grades comparable when the judge or rubric changes; [eval-tuning-loops/05 §5](../eval-tuning-loops/05-loop-architecture-and-governance.md) covers gating. What is left, and owned here, is the rubric's *own* semver and the proof standard for a criterion edit.

**Key findings:**

- **Version the rubric pack, and encode meaning in the number.** Following the plugin/semver discipline the Claude Code docs prescribe for shipped artifacts ([eval-tuning-loops/03 §6](../eval-tuning-loops/03-feeding-grades-back-text-level.md)): **PATCH** = wording clarified with no intended verdict change; **MINOR** = criterion added, or an anchor example added; **MAJOR** = a criterion removed, merged, split, or its verdict semantics changed (including threshold moves). A MAJOR bump means historical scores are *not* comparable term-by-term. Every grade already carries `rubric_version` in the record from [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) — that field is what makes this enforceable.
- **Do not re-score history. Re-score the anchor set.** The mechanism is borrowed from test equating: in the common-item non-equivalent groups (NEAT) design, "every form embed[s] a common set of anchor items" and "the anchor score is used to statistically separate how much of the total-score difference… reflects a real ability difference… versus a real difficulty difference between the forms"; the standard guidance is that "anchor tests should be miniature versions (i.e. minitests) with respect to content and statistical characteristics of the tests being equated," and that "if the cohorts differ greatly and the anchor is short or narrow, the design has little evidence with which to separate group and form effects" ([CASRAI / equating explainers](https://casrai.org/guides/test-equating-and-linking), **[search summary]**; ETS research on anchor composition, **[search summary]**). Translated: **hold a frozen anchor set of 20–40 artifacts that mirrors your task mix (new screen, edit, form, dashboard, flow) with human labels, re-score it under both rubric versions, and compare *through* it.** That is the same anchor-set mechanism [eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) already recommends for judge comparability — this doc's addition is the equating rationale and the composition rule ("minitest", not "whatever we had lying around").
- **Re-scoring all history is the wrong instinct and is expensive.** Langfuse's design makes the point by construction: score configs can be updated and "All current scores remain unchanged when you update a config," with old configs archived rather than deleted ([eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)). History is a record of what was judged, under what rules, at that time. Change the rules and you have a new series — anchored to the old one by the anchor set.
- **The proof standard for a rubric change is agreement, not scores.** A criterion edit is an improvement if, on the frozen anchor set, **judge–human κ on that criterion rises** (or its flip rate falls) with **no degradation on the other criteria**, and if the three acceptance tests in §6 pass. A rise in the *pass rate* is not evidence of anything except that the rubric got easier. This is the rubric-side statement of the loop invariant in [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md): version everything a grade depends on, and keep a fixed anchor.
- **Statistical honesty about small anchor sets.** [eval-tuning-loops/05 §3](../eval-tuning-loops/05-loop-architecture-and-governance.md) already works the numbers: at n = 30, p = 0.8 the standard error is ≈0.07, so a 95% interval spans roughly ±14 points. **A 20–40-artifact anchor set can confirm a large change in a criterion's behaviour; it cannot resolve a 5-point one.** Use paired per-artifact deltas (same artifact, old rubric vs new) rather than aggregate pass rates — that is what the anchor design is for.
- **Where the change record lives.** In the repo, next to the rubric pack, in git. [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) ships a *skill* change record; §13 below ships the *rubric* one. They are siblings and should reference each other's ids, because most promoted defects produce one of each.

**Open questions:** No public tool versions a rubric-plus-anchor-set-plus-agreement-report as a single release; the template in §13 is a manual stand-in, exactly as doc 03's is for skills. Whether a rubric MAJOR bump should invalidate accumulated exemplars (which were selected under the old criteria) is unresolved — the exemplar-staleness logic in [eval-tuning-loops/03 §2](../eval-tuning-loops/03-feeding-grades-back-text-level.md) suggests yes, at least for criteria that changed.

---

## 9. Worked examples: three misses, all the way through

Each example follows the same path: **the miss → the patch (doc 02's territory, summarized) → the promotion decision → the altitude → the exact durable text → the retirement evidence.**

### 9.1 "The empty state was never designed"

- **The miss.** The invite-teammates sheet renders a table. With a fresh account there are no teammates; the table renders its header and nothing else. Found by a human clearing the fixture data — note the ODC *trigger* (data reset), which is not the defect type.
- **The patch.** An `EmptyState` block with an illustration slot, one line of copy, and the primary action. Surgical edit at the component level ([prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md)).
- **Promotion decision.** Recurrence: yes — this is the single most-reported class in practitioner write-ups about generated UI ("AI systems like Claude Code skip critical states users notice immediately: empty lists, loading data, API errors, offline scenarios, and permission denials", [dev.to/phongdesigns](https://dev.to/phongdesigns/why-claude-generated-screens-are-missing-their-states-45gd), **[search summary]**; [blog.vibecoder.me](https://blog.vibecoder.me/empty-states-loading-states-error-states), **[search summary]** — both practitioner blogs, no measurement). Generality: yes, it is "collection views lack a zero-item state." Cost: high. Checkability: **split** — presence is checkable, quality is not. Discrimination: yes, historically.
- **Altitude — this is the key move: the defect splits across two rungs.**
  - *Presence* → **schema + test**, never a rubric line. In the construction-file pipeline, a required `states` slot with defaults makes it unrepresentable ([eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md) already specifies this, including the Zod `.describe()` trick); in a React prototype, a Playwright assertion against a seeded empty fixture. It also becomes a `state_coverage` deterministic dimension in the grade record ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)).
  - *Quality* → **one atomic judge criterion**, because "is this empty state useful" is not computable.
- **Exact text.**
  - Deterministic (test name): `every collection view renders a non-empty node when its data source returns zero items` — fixture: seeded-empty; evidence: DOM snapshot.
  - Judge criterion (`states.empty.useful`, binary, atomic): **"With zero items, the view states what is missing in product terms and offers exactly one primary action to resolve it. Fails if: the view is blank; the copy is generic ('No data'); there is no action, or more than one action competes for primacy."** Rationale must cite the rendered text and the action's selector.
- **Retirement evidence.** The judge criterion retires when 30 consecutive artifacts pass it *and* the generator reads an exemplar that reliably produces it; the deterministic test never retires (it is free). If the pipeline gains a required `states` slot with typed copy fields, the judge criterion **demotes** to a schema check on the copy field's presence and a much narrower judge line about tone.

### 9.2 "The primary button used a hardcoded hex instead of a token"

- **The miss.** `background: #2F6FEB` on the submit button; the design system's `--color-action-primary` resolves to a near-but-not-identical value. Found by a designer's eye, then confirmed by search.
- **The patch.** Replace the literal with the token. Trivially surgical.
- **Promotion decision.** Recurrence: yes, chronic. Generality: yes ("raw value where a token exists"). Cost: medium individually, high cumulatively (theme switching breaks — see [theming/](../theming/README.md)). Checkability: **total**. Discrimination: yes.
- **Altitude.** **Rung 0/1 — and explicitly NOT a rubric criterion.** This is the clearest case in the document: a defect that is fully decidable by string matching must never consume judge attention. The fix is a `PostToolUse`/`FileChanged` hook plus a lint rule, because hooks "apply regardless of what Claude decides to do" ([memory docs](https://code.claude.com/docs/en/memory), **[fetched]**; event list in [hooks](https://code.claude.com/docs/en/hooks), **[fetched]**), with the builder owning styles in the construction-file pipeline. [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)'s fix-altitude table already assigns this row; the only thing this doc adds is the rubric-side ruling: **zero criteria.**
- **Exact text.**
  - Hook (blocking): reject any write to `**/*.{ts,tsx,css}` introducing `#[0-9a-fA-F]{3,8}` or a bare `px` outside `tokens/`, with the message naming the nearest token.
  - Grade record: the existing deterministic `on_system_rate` / `raw_values` gate ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) — a gate, not a score.
  - Rubric: **none.** If someone proposes "uses design tokens consistently" as a judge criterion, the answer is that it fails the *checkability-implies-demotion* rule and would only add judge noise.
- **Retirement evidence.** The hook is retired only if the token layer stops existing. If the hook's fire rate goes to zero for a quarter *and* the generator's exemplars all use tokens, keep the hook anyway — it costs milliseconds, and its value is that it never has to be remembered.

### 9.3 "The flow dead-ends after submit with no confirmation"

- **The miss.** The user completes a three-step form; on submit, the button spins and the screen stays. No confirmation, no navigation, no record of what happened.
- **The patch.** Post-submit route to a confirmation view with the created object's name, plus a secondary "create another" path.
- **Promotion decision.** Recurrence: yes (the class is "terminal action without acknowledgement"). Generality: yes. Cost: highest of the three — the user cannot tell whether the action worked. Checkability: **split again** — *something changed* is checkable; *the right thing was communicated* is not. Discrimination: yes.
- **Altitude.**
  - *Transition* → **Playwright assertion** (after submit, either the route changes or a node with `role="status"` appears within 2s) plus a route-coverage dimension.
  - *Communication* → **one atomic judge criterion.**
  - *Was this the right resolution for this intent?* → **human**, sampled — the pairwise/ranking side, not a checklist item (§5).
- **Exact text.**
  - Deterministic: `terminal actions produce an observable acknowledgement` — for every element matching `[data-action="submit"|"destructive"]`, after activation assert route change OR a live-region node OR a persisted toast; evidence: trace.
  - Judge criterion (`flow.acknowledgement`, binary, atomic): **"After a terminal action, the interface names what happened (referring to the specific object or outcome, not 'Success') and offers at least one next step. Fails if: nothing changes; the acknowledgement is generic; the only way forward is the browser back button."**
  - Human criterion (sampled, non-binary): "Is this the resolution a designer would have chosen for this intent?" — scored pairwise against the previous accepted version, never as a checklist item.
- **Retirement evidence.** The judge criterion retires when it stops discriminating (0 failures in 30) **and** a rubric-free pairwise check shows no regression when it is removed — because, per §7, a criterion that enumerates "must acknowledge" is exactly the sort that invites over-acknowledgement (a modal confirming every trivial save). Its removal is therefore itself a change that must be proved on the anchor set.

---

## Cross-cutting themes

1. **The default is fix-and-forget; promotion is the exception you argue for.** Five tests, all of which must pass, with recurrence-of-2 as the cheapest gate — and a recorded non-promotion so the count exists next time ([memory docs](https://code.claude.com/docs/en/memory) **[fetched]**, mutation-testing suppression **[search summary]**).
2. **Every promoted defect gets two answers, on two ladders.** One on the generator side (owned by [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) and one on the verification side (§3 here). A rubric criterion is the *residue* of the verification ladder, not its first rung.
3. **Most real defects split.** Presence is checkable; quality is judged; fit is human. The single most valuable habit in this document is refusing to write one criterion where the defect actually contains three at different altitudes (§9.1, §9.3).
4. **Atomic binary criteria for regression; holistic or pairwise for quality.** Decomposition raises agreement (CheckEval +0.45 **[fetched]**, TICK 46.4→52.2% **[search summary]**) but checklists provably fail to capture expertise — experts scored *worse* than novices on binary checklists while scoring better on global scales ([Hodges 1999](https://pubmed.ncbi.nlm.nih.gov/10536636/) **[search summary]**). Both facts are true; they apply to different jobs.
5. **A rubric optimized against becomes a specification of completeness.** Measured: rubric-trained checkpoints win 85.8% under rubric judges and lose 78.4% under rubric-free ones ([arXiv 2605.12474](https://arxiv.org/abs/2605.12474) **[search summary]**). Always keep a rubric-free tripwire.
6. **A rubric is a versioned artifact whose history is anchored, not rewritten.** Semver with meaning, `rubric_version` on every grade, a frozen minitest anchor set, and a proof standard of agreement — not pass rate.
7. **The healthiest metric of a rubric is its shrink rate.** Criteria should keep demoting into determinism and retiring for non-discrimination. A rubric that only grows is a tooling failure wearing a governance costume.

---

## Recommendations: the promotion decision table

Evidence strength: **A** = measured in a peer-reviewed or vendor-published eval; **B** = vendor documentation or repeated practitioner reports; **C** = reasoned from adjacent evidence. Fetch status of the cited source in brackets.

| The miss | Promote? | Durable artifact | Rubric criterion? | Evidence |
|---|---|---|---|---|
| Seen once, one route, cosmetic | **No** — fix and forget, log the class | Grade-record defect entry only | No | B ([memory docs](https://code.claude.com/docs/en/memory) **[fetched]**) |
| Raw value where a token exists | Yes | Hook + lint rule | **No** (fully decidable) | B ([hooks](https://code.claude.com/docs/en/hooks) **[fetched]**) |
| Invented component/prop | Yes | Catalog/schema enum | **No** | A ([eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) |
| Missing empty/loading/error state | Yes | Schema slot + fixture test | **Presence: no. Usefulness: one atomic judge line** | B ([eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); practitioner reports **[search summary]**) |
| A11y violation in axe's coverage | Yes | axe in CI — **not** a prompt instruction | **No** | A ([axe-core](https://github.com/dequelabs/axe-core) **[fetched]**, 57% claim is Deque's own); asking for a11y in the prompt reportedly *lowered* compliance (W4A 2026, **[search summary, relayed, unverified]**) |
| A11y property axe cannot see (focus order sense, label meaningfulness) | Yes | Judge criterion + sampled human | **Yes, atomic** | A/C ([axe-core](https://github.com/dequelabs/axe-core) **[fetched]** + [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)) |
| Terminal action without acknowledgement | Yes | Playwright assertion + judge line | **Yes, atomic, for the message** | C (§9.3) |
| Weak hierarchy / wrong emphasis | Usually **no criterion** | Exemplar + pairwise ranking | **No** — judge perception ceiling | A ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md), DiffSpot 40.7%) |
| Copy tone off-brand | Yes | One-line voice rule + contrast exemplar; judge line only if it persists | Maybe | A ([eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) |
| "It's not what I meant" | **No criterion** | Better intent spec; pairwise human review | **Human only** | B ([prototype-construction/02](../prototype-construction/02-intent-spec-and-context.md)) |
| A criterion that now has a deterministic equivalent | **Demote** | Move check down the ladder; delete the judge line | Removed | C (§3) |
| A criterion with 0 failures in 30 artifacts | **Retire to archive** | Archived block with date + reason | Removed | A ([Google mutation testing](https://arxiv.org/pdf/2102.11378) **[search summary]**) |

---

## Deliverable: the criterion-writing checklist

Fourteen items. Each is a yes/no about the criterion you just wrote. Sourced rationale in the right column; policy items are marked *(policy)*.

| # | Check | Why |
|---|---|---|
| 1 | **It is atomic** — one proposition, one verdict, no "and" that could be separately true | "Atomic rubrics reduce each criterion to a minimal binary proposition" ([survey 2606.08625](https://arxiv.org/abs/2606.08625) **[search summary]**); decomposition raised agreement +0.45 ([CheckEval](https://github.com/yukyunglee/CheckEval) **[fetched]**) |
| 2 | **Binary verdict, with a required rationale field** | Binary beats Likert for cross-evaluator agreement ([CheckEval](https://github.com/yukyunglee/CheckEval) **[fetched]**); reasoning beats bare checklist ([RubricEval](https://arxiv.org/abs/2603.25133) **[search summary]**) |
| 3 | **States the failure condition explicitly** ("Fails if: …") | Explicit pass/fail conditions are the documented guidance ([promptfoo llm-rubric](https://raw.githubusercontent.com/promptfoo/promptfoo/main/site/docs/configuration/expected-outputs/model-graded/llm-rubric.md) **[fetched]**) |
| 4 | **Names a class, not an instance** — no screen names, component names or copy strings | ODC type-vs-trigger ([ODC](https://en.wikipedia.org/wiki/Orthogonal_defect_classification) **[search summary]**); "generalize from feedback rather than patching single cases" ([agentskills.io](https://agentskills.io/skill-creation/evaluating-skills) **[search summary]**) |
| 5 | **The evidence it requires exists at review time** and the criterion says where to look (selector, bbox, route, trace) | Manipulated CoT inflates VLM false positives up to 90% ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)) |
| 6 | **A VLM can actually perceive it** — not spacing, contrast or alignment deltas | DiffSpot: best model 40.7% on CSS change detection ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)) |
| 7 | **It is not deterministically decidable** — if a grep, lint rule, axe rule or DOM query can decide it, it is not a criterion | §3; [axe-core](https://github.com/dequelabs/axe-core) **[fetched]**, [jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) **[fetched]** |
| 8 | **It fails on the artifact that motivated it** | "The test should fail before the fix is applied" ([Django](https://raw.githubusercontent.com/django/django/main/docs/internals/contributing/writing-code/submitting-patches.txt) **[fetched]**) |
| 9 | **It passes on the current best artifact** | *(policy)* — otherwise you have written a redesign, not a criterion |
| 10 | **It flips when negated** (counterfactual test) | Judges often fail to update when the criterion is reversed ([rubric artifacts 2609.02942](https://arxiv.org/abs/2609.02942) **[search summary]**) |
| 11 | **It is not ≥0.9 correlated with an existing criterion** across recent artifacts | Halo detection by inter-dimension correlation ([O'Grady 2023](https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/27311/OGrady_2023_RMAL_Halo_effects_CC.pdf) **[search summary]**) |
| 12 | **It carries one pass exemplar and one fail exemplar** from this project's own history | Rubrics work better "complemented with exemplars and/or rater training" ([Jonsson & Svingby 2007](https://eric.ed.gov/?id=EJ796733) **[search summary]**); cap them ([eval-tuning-loops/02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)) |
| 13 | **It is tagged** `deterministic | judge | human`, with an owner and a defect id | Provenance fields already exist in the grade record ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) |
| 14 | **Its slice is small** — ≤7 criteria shown per review event, even if the bank is large; and criterion order is randomized per scoring run | 3–7 practitioner guidance ([Labelbox](https://labelbox.com/blog/rubric-evals-fuel-next-wave-of-reinforcement-learning-rl/) **[search summary]**, no methodology); order affects halo ([LTA 2020](https://link.springer.com/article/10.1186/s40468-020-00115-0) **[search summary]**) and judge position bias ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)) |

**Anti-checklist — phrasings to reject on sight:** anything containing "appropriate", "consistent", "well-designed", "modern", "clean", "good UX"; anything a rater could pass by *adding* something (see the reward-hacking result, §7); anything that names the last bug; anything whose evidence is "how it feels."

---

## Deliverable: the rubric change record

One per rubric version bump. Lives in git beside the rubric pack; references the [skill change record](../eval-tuning-loops/03-feeding-grades-back-text-level.md#template-skill-change-record) id when the same defect produced a generator change (it usually does).

```md
# Rubric change record — <rubric pack> v<from> → v<to>            (PATCH | MINOR | MAJOR)
Date: YYYY-MM-DD    Author: <name>    Reviewer: <name, not the author>

## Motivating defect
Defect id(s): <grade_id/defect_id>          Found by: human test | judge | deterministic gate
Class (type): <e.g. collection view lacks zero-item state>
Trigger: <what surfaced it — fixture reset, small viewport, slow network>
Occurrences: <n> across <m> artifacts, window <dates>      Severity: minor | major | blocking
Patched at: <commit/PR>                     Generator change: <skill change record id | none>

## Promotion tests (all five must pass)
Recurrence ≥2 ...................... yes/no   evidence: <ids>
Class-generality ................... yes/no   phrasing without the instance: "<...>"
Cost of the miss ................... yes/no   what a user loses: <...>
Checkability ....................... yes/no   evidence available at review time: <...>
Discrimination ..................... yes/no   would have failed <x>/<n> recent artifacts

## Altitude decision
Deterministic options considered and rejected: <hook / schema / lint / DOM assertion — why not>
Landed at: schema | hook | lint | test assertion | JUDGE CRITERION | human criterion
Rubric-side outcome: added | split | merged | retired | tightened | demoted | no change

## The change
Criterion id: <dotted.id>   Type: deterministic | judge | human   Weight/points: <n>
Text: "<criterion, with explicit Fails-if clause>"
Pass exemplar: <artifact id / path>     Fail exemplar: <artifact id / path>
Diff: <+/- criteria; ids touched>       Archived (if retiring): <id, reason, date>

## Acceptance tests
Fail-first on motivating artifact ... pass/fail
Pass-clean on current best .......... pass/fail
Counterfactual (negated → flips) .... pass/fail

## Evidence on the frozen anchor set (n = <20–40>, version <anchor-set id>)
Anchor composition: <task mix — new screen / edit / form / dashboard / flow>
Per-criterion judge–human κ  before: <x>  after: <x>       (report κ only — see §6)
Flip rate (3 runs)           before: <x>  after: <x>
Other criteria               no change | <criterion: delta>
Rubric-free tripwire (pairwise human or rubric-free judge): <no regression | delta>
Paired per-artifact deltas:  <n improved / n worse / n unchanged>

## Comparability
Historical scores re-scored? NO (default) — comparability via anchor set
If MAJOR: series break declared at <version>; dashboards annotated: yes/no

## Rollback
git revert <sha>; pin rubric pack v<from>; grades already written keep rubric_version v<to>

## Follow-ups
Demotion candidate? <criterion → which deterministic check, when>
Retirement watch:   <criterion, review after <n> artifacts>
Open defects in this class still unpromoted: <ids>
```

---

## Deliverable: a starter rubric for AI-built prototypes

Small on purpose: **6 deterministic gates, 5 judge criteria, 2 human criteria.** Every line is binary and carries a failure condition; the substance behind each judged line (what "useful" or "dominant" means for your system) is doc 04's territory, not this document's. Show at most 7 of the judged/human lines in any one review event (checklist item 14), and randomize their order.

**Gates — deterministic, run in CI, never scored by a judge.** These do not belong to the rubric's *scoring*; they are entry conditions, consistent with the "rank for improvement, gate for acceptance" invariant in [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md).

| id | Criterion (fails if…) | Implemented as |
|---|---|---|
| `g.builds` | The artifact does not build, or the page logs a console error on any route. | build + page-error count ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) `gates`) |
| `g.tokens` | Any color, spacing or radius literal appears outside the token layer. | hook + lint ([hooks](https://code.claude.com/docs/en/hooks) **[fetched]**) |
| `g.catalog` | Any component or prop outside the catalog/registry is used. | schema enum ([prototype-construction/01](../prototype-construction/01-primitive-codification.md)) |
| `g.a11y` | axe reports any violation at WCAG AA on any route at 1280px and 390px. | [axe-core](https://github.com/dequelabs/axe-core) **[fetched]** + [jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) **[fetched]** |
| `g.states` | Any collection view renders nothing when its data source returns zero items, or has no loading and error branch. | fixture-driven assertion; `state_coverage` dimension |
| `g.reachable` | Any route in the brief is unreachable from the entry screen, or any link is dead. | crawl + route coverage |

**Judged — atomic, binary, one rationale each, evidence located.**

| id | Criterion | Fails if | Type |
|---|---|---|---|
| `j.empty.useful` | With zero items, the view states what is missing in product terms and offers exactly one primary action. | Blank; generic copy ("No data"); no action; or competing actions. | judge |
| `j.ack` | After a terminal action, the interface names what happened (specific object/outcome) and offers a next step. | Nothing changes; generic "Success"; only the back button moves you forward. | judge |
| `j.primary` | On each screen there is exactly one action the eye reaches first, and it is the action the brief asks for. | Two or more compete; the primary is a ghost/tertiary; the wrong action is dominant. | judge |
| `j.error.actionable` | Every error message says what happened and what the user can do next, in that order. | States only that something failed; exposes a code or stack; offers no recovery. | judge |
| `j.voice` | Copy reads as product voice — second person, present tense, no marketing adjectives. | Marketing register; feature-brochure phrasing; inconsistent person/tense across the flow. | judge |

**Human — sampled, never auto-gated.**

| id | Criterion | How scored |
|---|---|---|
| `h.intent` | Does the artifact do what the brief asked, including what the brief implied? | Pairwise against the previous accepted version ([eval-tuning-loops/01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md)) |
| `h.ship` | Would you put this in front of a customer as-is? | Holistic verdict + one sentence; **this is the rubric-free tripwire from §7 — never remove it** |

**Notes on using it.** (a) The judged lines are all *presence-of-quality-given-presence* — every "does X exist" question has already been taken by a gate, which is the whole argument of §3. (b) The rubric ships with a frozen anchor set of 20–40 previously reviewed artifacts, per §8. (c) It is expected to **shrink**: `j.empty.useful` and `j.ack` are both demotion candidates the moment your schema carries typed copy fields for those states. (d) None of these criteria are defensible as *content* without doc 04 — what counts as "product voice" or "one action the eye reaches first" is a design-system question, and this rubric's job is only to make those questions scorable.

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verification | Category |
|---|---|---|---|---|
| CheckEval | https://github.com/yukyunglee/CheckEval | Reference implementation of decomposed binary checklist evaluation (dimension → checklist → yes/no); README carries the +0.45 agreement / −variance results | **fetched** | guardrails-and-evals |
| HealthBench grader (`healthbench_eval.py`) | https://github.com/openai/simple-evals | The cleanest public *criterion schema* — `criterion` / `points` / `tags`, boolean `criteria_met` with a required `explanation`, score = achieved / total positive points; MIT | **fetched** | guardrails-and-evals |
| promptfoo `llm-rubric` | https://github.com/promptfoo/promptfoo | Assertion type for rubric criteria with `{reason, score, pass}` and a decisive `threshold`; MIT, 25k stars — the lowest-friction way to put a promoted criterion into CI | **fetched** | guardrails-and-evals |
| RuVerBench | https://github.com/THU-KEG/RuVerBench | 494 cases / 2,458 human-labeled rubric-verification instances across deep research + agentic coding — a ready-made meta-eval for "can my judge apply my criteria" | **fetched** | guardrails-and-evals |
| microsoft/LLM-Rubric | https://github.com/microsoft/LLM-Rubric | Multidimensional rubric scoring with per-judge calibration; MIT; useful precisely because its reimplementation numbers are modest | **fetched** | guardrails-and-evals |
| axe-core | https://github.com/dequelabs/axe-core | The deterministic floor under any a11y criterion; "zero false positives", ~57% automatic WCAG coverage (Deque's own claim), MPL-2.0 | **fetched** | *proposed:* deterministic design checks |
| eslint-plugin-jsx-a11y | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y | 40+ static rules; the rung between a hook and a runtime assertion; MIT | **fetched** | *proposed:* deterministic design checks |
| Django patch checklist | https://raw.githubusercontent.com/django/django/main/docs/internals/contributing/writing-code/submitting-patches.txt | The canonical written form of the fail-first regression-test doctrine, from a project that has run it for 20 years | **fetched** | prototype-governance |
| Claude Code memory docs | https://code.claude.com/docs/en/memory | First-party promotion threshold ("the same mistake a second time"), the 200-line budget, and the context-vs-enforcement boundary | **fetched** | rules |

Not selected: AutoRubric, RubricEval, TICK, the 2026 rubric survey and the rubric reward-hacking papers — all arXiv-only and **not fetchable on this session**, so they are cited as search summaries rather than proposed as curated picks; langchain-ai/agentevals (**fetched**: trajectory evaluators, no rubric-criterion support in the README, so it does not serve this document's purpose); langchain-ai/deepagents (**fetched**: its README documents no rubrics feature despite a vendor blog announcing one — re-check before citing).

---

## Sources

**Fetched live, 12 September 2026** (the only domains egress policy allowed):

- https://code.claude.com/docs/en/memory — promotion threshold, 200-line budget, context-not-enforcement
- https://code.claude.com/docs/en/hooks — hook events, deny semantics
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests — grading types (binary / Likert / ordinal), success-criteria guidance
- https://github.com/anthropics/skills — skill-creator context (analyst pass cited via eval-tuning-loops/03)
- https://github.com/yukyunglee/CheckEval — decomposed binary checklist method, +0.45 agreement
- https://github.com/THU-KEG/RuVerBench — 494 cases / 2,458 rubric-verification instances
- https://github.com/microsoft/LLM-Rubric — 9-question rubric, per-judge calibration, reimplementation correlations
- https://github.com/openai/simple-evals and https://raw.githubusercontent.com/openai/simple-evals/main/healthbench_eval.py — rubric item schema, grader contract, scoring formula
- https://raw.githubusercontent.com/promptfoo/promptfoo/main/site/docs/configuration/expected-outputs/model-graded/llm-rubric.md — `{reason, score, pass}`, threshold semantics, criterion-writing guidance
- https://github.com/promptfoo/promptfoo — license/stars
- https://github.com/dequelabs/axe-core — 57% automatic WCAG coverage claim, zero-false-positives claim, MPL-2.0
- https://github.com/jsx-eslint/eslint-plugin-jsx-a11y — 40+ rules, MIT
- https://raw.githubusercontent.com/django/django/main/docs/internals/contributing/writing-code/submitting-patches.txt — fail-first regression-test requirement
- https://github.com/langchain-ai/agentevals — trajectory evaluators (negative result for rubrics)
- https://github.com/langchain-ai/deepagents — no rubrics feature in README (negative result)

**Search summaries only — the page did NOT load on this session. Every host below is `[blocked: <host>]` under this session's egress policy (arxiv.org, pubmed.ncbi.nlm.nih.gov, ncbi.nlm.nih.gov/pmc, en.wikipedia.org, x.com, dev.to, hamel.dev, standards.ieee.org, eric.ed.gov, link.springer.com, frontiersin.org, apadivisions.org, casrai.org, research.monash.edu, research-repository.st-andrews.ac.uk, labelbox.com, bug0.com, assrt.ai, researchgold.org, aakashg.com, blog.vibecoder.me). Numbers are as reported by the search index and are NOT independently verified:**

- https://arxiv.org/abs/2403.18771 — CheckEval (paper record; README fetched separately)
- https://arxiv.org/abs/2410.03608 — TICK, 46.4%→52.2% agreement, human IAA 0.194→0.256
- https://arxiv.org/abs/2603.25133 — RubricEval, rubric-level > checklist-level, GPT-4o 55.97% Hard
- https://arxiv.org/abs/2606.08625 — holistic / analytic / atomic rubric taxonomy
- https://arxiv.org/abs/2603.00077 — AutoRubric (binary/ordinal/nominal criteria, criterion-conflation mitigation, 0.47→0.85)
- https://arxiv.org/abs/2605.30568 — dynamic rubric generation and refinement
- https://arxiv.org/html/2605.29274v1 — rubric construction via iterative optimization
- https://arxiv.org/abs/2609.02942 — rubric artifacts; criterion text alone predicts judge output; counterfactual failure
- https://arxiv.org/abs/2606.29920 — RuVerBench paper findings (prompt sensitivity, batching, majority voting)
- https://arxiv.org/abs/2606.00093 — agreement metrics; report Cohen's κ for binary criteria
- https://arxiv.org/abs/2605.12474 and https://arxiv.org/html/2606.04923v1 — reward hacking in rubric-based RL (85.8% vs 78.4%)
- https://arxiv.org/abs/2404.12272 — EvalGen / criteria drift
- https://arxiv.org/abs/2507.11538 — IFScale instruction-density degradation
- https://arxiv.org/pdf/2102.11378 — Practical Mutation Testing at Scale (Google): 82%→89% productive mutants, suppression rules
- https://arxiv.org/abs/2505.08775 and https://openai.com/index/healthbench/ — HealthBench: 5,000 conversations, 262 physicians, 48,562 rubric criteria
- https://arxiv.org/pdf/2406.04770 — WildBench checklist ablation (0.905 → 0.925)
- https://arxiv.org/pdf/2602.01146 — PersistBench rubric-scale comparison (5-point best, n=30)
- https://pubmed.ncbi.nlm.nih.gov/10536636/ — Hodges 1999, experts score worse on checklists, better on global ratings
- https://pubmed.ncbi.nlm.nih.gov/25626747/ — Ilgen 2015 systematic review, 45 studies, inter-rater 0.81/0.78, inter-item 0.92/0.66
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4613902/ — OSCE checklist length, 20 vs 40 items, p=0.2305
- https://eric.ed.gov/?id=EJ796733 — Jonsson & Svingby 2007, 75 studies, analytic + topic-specific + exemplars
- https://pmc.ncbi.nlm.nih.gov/articles/PMC11359436/ — analytic vs holistic marking, r 0.36 vs 0.24
- https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2026.1729644/full — 2026 review: neither rubric type is clearly better
- https://research-repository.st-andrews.ac.uk/bitstream/handle/10023/27311/OGrady_2023_RMAL_Halo_effects_CC.pdf — halo effects, detection by inter-dimension correlation
- https://link.springer.com/article/10.1186/s40468-020-00115-0 — criteria order affects halo
- https://www.apadivisions.org/division-5/publications/score/2025/10/data-scales-reliability — BARS 0.77 vs 0.56, and the contested superiority claim
- https://en.wikipedia.org/wiki/Orthogonal_defect_classification — ODC attributes, trigger definition, seven defect types
- https://standards.ieee.org/ieee/1044/4607/ — IEEE 1044-2009 scope
- https://research.monash.edu/en/publications/a-revised-open-source-usability-defect-classification-taxonomy/ — OSUDC usability defect taxonomy
- https://casrai.org/guides/test-equating-and-linking — NEAT anchor design, "minitest" guidance
- https://hamel.dev/blog/posts/evals-faq/ and https://www.aakashg.com/hamel-shreya-ai-evals-step-by-step/ — open/axial coding → failure taxonomy → evaluator per failure mode
- https://labelbox.com/blog/rubric-evals-fuel-next-wave-of-reinforcement-learning-rl/ — "three to seven criteria", criterion bleed (vendor, no methodology)
- https://bug0.com/blog/regression-testing-roi-trap-2026 — regression-suite ROI argument (vendor, no methodology)
- https://assrt.ai/t/vibe-coding-maintenance-regression-tests — "the test suite is the only durable memory that survives context resets" (vendor)
- https://dev.to/xinandeq/why-adding-more-rules-makes-your-agent-dumber-268-rules-14-always-loaded-and-a-tool-to-audit-4e8j — 76%→52% compliance claim (**unverified, no methodology — do not cite as evidence**)
- https://dev.to/phongdesigns/why-claude-generated-screens-are-missing-their-states-45gd and https://blog.vibecoder.me/empty-states-loading-states-error-states — practitioner reports that generated screens omit empty/loading/error states
- https://x.com/HamelHusain/status/1798024532995052010 — "Generic evals… a comfort blanket that has almost nill value if run blindly"
- https://x.com/sh_reya/status/1990161469120659897 — evals as (1) identify criteria/rubric, (2) decide how to apply it, (3) apply it
- https://x.com/sh_reya/status/1932506297905410195 — "we went through 5 iterations on the LLM-as-Judge material"
- https://x.com/williamfshen/status/2019807842400948493 — Meta rubric-generation work: "scaling requires controlled generation, not just free-form lists from an LLM"
- https://researchgold.org/blog/cohens-kappa-calculator-inter-rater-reliability-guide — Landis & Koch bands and the Ludbrook critique

**Relayed, not searched or fetched by me:**

- W4A 2026 study of six AI UI-generation tools — ~29.0% WCAG compliance; prompting for accessibility *decreased* compliance. Passed to this document by the stream's doc-01 agent. **No URL was supplied and my search budget was exhausted before I could locate one; cited in §3 and in the decision table with that caveat attached. A future pass must find the primary source or drop the claim.**

**Repo-internal:** [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md), [01](../eval-tuning-loops/01-grading-generated-prototypes.md), [02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md), [03](../eval-tuning-loops/03-feeding-grades-back-text-level.md), [05](../eval-tuning-loops/05-loop-architecture-and-governance.md); [prototype-construction/01](../prototype-construction/01-primitive-codification.md), [02](../prototype-construction/02-intent-spec-and-context.md), [05](../prototype-construction/05-surgical-editing-iteration.md), [13](../prototype-construction/13-schema-evolution-and-migration.md); [prototype-review-overlay/03](../prototype-review-overlay/03-grading-controls-and-feedback-to-tuning.md); [theming/](../theming/README.md); [skill-resources/hooks.md](../../../skill-resources/hooks.md).

*Research conducted 12 September 2026: 22 web searches (the session's search budget was exhausted before the W4A claim could be checked), 30+ fetch attempts, **18 pages successfully retrieved** — all from github.com, raw.githubusercontent.com, code.claude.com or platform.claude.com. Every other host returned `EGRESS_BLOCKED`. This is the document's main limitation and it is disclosed at the top, labelled per claim, and given a prioritized hardening list in the [Verification constraints](#verification-constraints-read-before-citing-anything-here) section: the LLM-judge rubric findings and all medical and educational psychometrics here are cited from search-result summaries, not from papers read in full.*
