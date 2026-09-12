# Recall Probe and Graph Techniques — What a Search-Blocked Stream Could Not Retrieve, and the Graph Problems It Did Not Name

**Scope:** Document 08 of the iteration-repair-and-rubrics stream, written after the other seven and in a different evidence mode. Docs [01](01-anatomy-of-a-miss.md)–[07](07-loop-economics-and-ownership.md) were researched under an egress policy that reached only GitHub and a handful of Anthropic hosts; their academic and survey layer is almost entirely `[search summary]`, and the [synthesis](00-synthesis.md) names the load-bearing claims that never got verified. This document does two things with that. **Job A** is a *recall probe*: it goes through the stream's named holes and says what the author's training data contains about each — most usefully for the central hole, where docs [05](05-practitioner-field-guide-x.md) and [06](06-community-practice-and-tooling.md) independently found no published measurement that writing a miss into a rule reduces its recurrence. **Job B** is generative: several of the stream's unsolved problems are graph problems that no sibling doc named as such — blast radius is reachability, the missing ledger join is a property-graph schema, rules-file bloat is a retrieval problem, collateral damage between generations is a tree diff — and this document surveys the relevant graph-engineering techniques, maps each onto the stream's open questions, costs it for a solo designer, and says where it is overkill. It cross-links the stream by relative path and restates nothing; it modifies no sibling document, though it does close one of doc 04's open items (the `@lapidist/design-lint` source repository, located this session) and adds two fields to doc 01's defect record.

**Out of scope, with owners:** the taxonomy of misses (doc 01), the repair decision (doc 02), criterion form (doc 03), criterion content (doc 04), practitioner venues (docs 05, 06), economics and cadence (doc 07). Grader mechanics and the grade record are [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md); the fix-altitude ladder is [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); construction-file patching is [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md).

Researched 12 September 2026. **This document does not meet the house standard of "every claim links a fetched source", by construction — read the warning immediately below.** Anything fetched this session is marked `[fetched]` and linked; everything else is graded recall or reasoning and carries a verification handle instead of a link.

---

## Evidence-class warning — read before citing anything below

> **This file is a recall probe. Its default evidence class is model memory, which is the weakest class this repo accepts. It is, by construction, the weakest document in the stream, and it must not be cited as verification for anything.** Its purpose is to generate *leads* — precise titles, authors, venues and search strings that a session with open egress can check in minutes — and *structure* — the graph framings in Part B, which are reasoning and are labelled as such. Not facts.
>
> Every claim carries exactly one grade:
>
> | Grade | Meaning |
> |---|---|
> | `[fetched]` | Retrieved and read this session, from `github.com`, `raw.githubusercontent.com` or `registry.npmjs.org` — the only hosts reachable. Linked inline. |
> | `[recall: high]` | The author would bet on the finding, the venue and the rough numbers. Still unverified here. |
> | `[recall: medium]` | Confident the work exists; unsure of specifics, numbers or attribution. |
> | `[recall: low]` | An impression. May be confabulated. Flagged where the title feels too convenient. |
> | `[reasoning]` | The author's own inference, not a memory of any source. |
>
> **No URL in this document was written from memory.** Recall-graded claims give a *verification handle* — title as recalled, first author, venue, year, and a search string — never a link. A precise handle is the deliverable; a plausible-looking URL would be damage. Numbers are the highest-risk item: where the direction of a finding is recalled but not its magnitude, the direction is stated and the magnitude is explicitly declined. The author's knowledge cutoff is June 2026; anything the stream cites from after that date is marked *post-cutoff* and not assessed.

---

## Table of Contents

**Part A — The recall probe**

1. [The central hole: adjacent literatures where recurrence *has* been measured](#1-the-central-hole-adjacent-literatures-where-recurrence-has-been-measured)
2. [The load-bearing unverified claims, one by one](#2-the-load-bearing-unverified-claims-one-by-one)
3. [Rubrics, defect taxonomies and agreement statistics](#3-rubrics-defect-taxonomies-and-agreement-statistics)
4. [What recall cannot help with: the post-cutoff and unrecognised set](#4-what-recall-cannot-help-with-the-post-cutoff-and-unrecognised-set)

**Part B — Graph techniques for design**

5. [Blast radius is reachability: regression test selection and change-impact analysis](#5-blast-radius-is-reachability-regression-test-selection-and-change-impact-analysis)
6. [The missing join is a property-graph schema](#6-the-missing-join-is-a-property-graph-schema)
7. [Rules-file bloat is a retrieval problem](#7-rules-file-bloat-is-a-retrieval-problem)
8. [UI as a graph: trees, tree diffs and screen embeddings](#8-ui-as-a-graph-trees-tree-diffs-and-screen-embeddings)
9. [A design property graph: real construct or category error](#9-a-design-property-graph-real-construct-or-category-error)
10. [Provenance graphs for generation → defect → fix lineage](#10-provenance-graphs-for-generation--defect--fix-lineage)
11. [Causal graphs, and the design that answers "did the criterion cause it"](#11-causal-graphs-and-the-design-that-answers-did-the-criterion-cause-it)
12. [Graph metrics as rubric health](#12-graph-metrics-as-rubric-health)
13. [The rule-conflict graph](#13-the-rule-conflict-graph)

[Cross-cutting themes](#cross-cutting-themes) · [Recommendations: the verification queue and the graph-techniques map](#recommendations-the-verification-queue-and-the-graph-techniques-map) · [Candidate picks for skill-resources](#candidate-picks-for-skill-resources) · [Sources as verification handles](#sources-as-verification-handles)

---

# Part A — The recall probe

## 1. The central hole: adjacent literatures where recurrence *has* been measured

**What it is:** Docs 05 and 06 found no published measurement that writing a miss into a rules file, rubric line or review agent reduces the recurrence of that class of miss; the synthesis calls it the stream's central finding. This section asks whether the author's training data contains anything bearing on it — directly, or in the adjacent fields where a structurally identical question ("we found a defect, we added a durable countermeasure, did the class recur less?") has been studied for decades.

**Why it matters:** If the direct measurement exists and the search-limited agents merely could not reach it, the stream's headline is wrong. If the adjacent literatures are rich but the direct measurement is absent there too, the headline is *strengthened*: the gap is not an artifact of blocked hosts.

**Key findings:**

**The answer is the second one.** The adjacent literature is large and the author recalls it with reasonable confidence. None of it measures the specific thing the stream asks about, and — more interesting — the nearest analogues either measure the wrong variable or find null results when the countermeasure is only text.

| Adjacent literature | What it measured | Does it measure "durable line → recurrence fell"? | Grade |
|---|---|---|---|
| **IBM Defect Prevention Process** — Mays, Jones, Holloway, Studinski, *Experiences with Defect Prevention*, IBM Systems Journal, 1990 | Causal-analysis meetings after each defect, an action database, a "kickoff" step; reported reductions in defect rates over successive releases | **The closest analogue anywhere.** It is the ratchet at organisational scale: defect → root cause → preventive action → measured defect density later. But it is org-level, decades old, and does not isolate any single action's effect on its class. The magnitude is *not* recalled with confidence — the author has an impression of "roughly halved" and declines to state it | Existence `[recall: medium-high]`; numbers `[recall: low]` |
| **Defect Causal Analysis** — Card, *Learning from our mistakes with defect causal analysis*, IEEE Software, 1998; Kalinowski, Card, Travassos, *Evidence-based guidelines to defect causal analysis*, IEEE Software, 2012 | Same loop as DPP, formalised; the 2012 paper is a guideline synthesis | Same verdict: process-level defect density, not per-countermeasure recurrence | `[recall: medium-high]` / `[recall: medium]` |
| **Orthogonal Defect Classification** — Chillarege et al., IEEE TSE 18(11), 1992 | Defect *type* and *trigger* distributions over phases, used to diagnose process problems | Diagnostic instrument, not an intervention study. Doc 03 §2 already uses ODC correctly. It gives the ratchet a *vocabulary* for recurrence keys; it never measured a rule's effect | `[recall: high]` |
| **Static-analysis at scale** — Sadowski et al., *Tricorder*, ICSE 2015; Sadowski, Aftandilian, Eagle, Miller-Cushon, Jaspan, *Lessons from Building Static Analysis Tools at Google*, CACM 2018; Distefano, Fähndrich, Logozzo, O'Hearn, *Scaling Static Analyses at Facebook*, CACM 2019 | Developer response to warnings: click-through, "not useful" rate, fix rate; the Facebook line reports that surfacing findings *at diff time* produced high fix rates while batch reports produced near-zero | Measures whether a warning gets *acted on*, never whether the bug class later recurs less. Google retires analyzers whose "not useful" rate crosses a threshold (the author recalls ~10% as the bar) — which is doc 03 §6's retirement rule, measured on the analyzer rather than the defect. **Directly transferable lesson:** placement (diff time vs batch) decided the fix rate, not the rule text — the same shape as the `REVIEW.md`-placement claim in doc 06 §6.2 | Existence `[recall: high]`; the 10% and the diff-vs-batch magnitudes `[recall: medium]` |
| **Compile-time bug patterns** — Aftandilian et al., *Building Useful Program Analysis Tools Using an Extensible Java Compiler* (Error Prone), SCAM 2012 | A check that runs as a compile error | Here recurrence *does* go to zero — by construction, because the class becomes uncommittable. That is rung 0/1 of doc 03's verification ladder, and it is why nobody measured it: there is nothing to measure | `[recall: medium-high]` |
| **Why static analysis is ignored** — Johnson, Song, Murphy-Hill, Bowdidge, ICSE 2013; Habib & Pradel, *How Many of All Bugs Do We Find?*, ASE 2018 | Adoption barriers (false positives, workflow); and the fraction of real bugs three detectors found on Defects4J — the author recalls a small single-digit percentage | Establishes that deterministic checkers have low *recall* on real bugs even when perfect on precision. Relevant to doc 01 §4's catch-rate table as a calibration: "the gate was not running" and "the gate cannot see it" are both common | `[recall: high]` / percentage `[recall: medium]` |
| **Lint-rule adoption** — Tómasdóttir, Aniche, van Deursen, *Why and How JavaScript Developers Use Linters*, ASE 2017, and the TSE follow-up on ESLint adoption | Motivations, which rules teams enable, how configs evolve | No recurrence measurement. Confirms that configs are set once and rarely revisited — the same "added, never deleted" trajectory doc 07 §4.1 reports for instruction files | `[recall: high]` |
| **Recurring bug fixes** — Nguyen, Nguyen, Nguyen, Nguyen, *Recurring Bug Fixes in Object-Oriented Programs*, ICSE 2010; Kim, Pan, Whitehead, *Memories of Bug Fixes*, FSE 2006 | The fraction of fixes that are similar to earlier fixes in the same project — the author recalls a range of roughly a fifth to nearly half, project-dependent | **This bears on E0, not E3.** The stream's whole programme rests on miss classes repeating across independent artifacts; in *code*, a substantial minority of fixes measurably recur. It is a prior for E0's kill criterion, in a different artifact type | Existence `[recall: medium-high]`; range `[recall: medium]` |
| **Fixes that are themselves bugs** — Yin, Yuan, Zhou, Pasupathy, Bairavasundaram, *How Do Fixes Become Bugs?*, FSE 2011 | Fraction of fixes that are incorrect, across several large systems — recalled as roughly 15–25% | The *human* baseline for V2's "one patch in five breaks something". If the recalled range holds, the agent break-rates in doc 01 §3 are not far from the human ones, which changes the framing from "agents regress" to "patching regresses" | `[recall: high]` on existence and rough range |
| **Software inspection reading techniques** — Fagan, IBM Systems Journal 1976; Porter, Votta, Basili, *Comparing Detection Methods for Software Requirements Inspections: A Replicated Experiment*, TSE 1995; Basili et al., *The Empirical Investigation of Perspective-Based Reading*, ESE 1996; Thelin, Runeson, Wohlin, TSE 2003 | Defect-detection effectiveness of ad hoc vs checklist vs scenario/perspective-based reading | **The checklist result is the one to carry:** in the Porter–Votta–Basili line, checklist-based reading was *not* reliably better than ad hoc reading, while scenario-based reading was. A checklist handed to a reviewer did not measurably improve detection. This is the human-inspection analogue of the stream's claim that a sentence about a defect class can be worth nothing. None of these studies measured what happens to recurrence after an item is *added* | `[recall: high]` on the direction; effect sizes not recalled |
| **Checklist synthesis from defect data** — Chernak, *A Statistical Approach to the Inspection Checklist Formal Synthesis and Improvement*, TSE 1996 | Proposes deriving and updating inspection checklists from defect data | **This is the ratchet as a method**, thirty years ago. Whether it measured recurrence after the update the author does not recall; treat as a lead, and the most on-topic one in this table | `[recall: medium]` |
| **Post-mortems and retrospective action items** — Google SRE book ch. "Postmortem Culture" (2016); incident-study literature at Microsoft (Ghosh et al., *How to Fight Production Incidents?*, ~2022) | Action-item tracking; classification of "repair items" | The author does not recall any study that follows action items through to measured recurrence of the incident class. The practice is universal; its efficacy measurement is, as far as recalled, absent — the same shape as this stream's hole | `[recall: medium]` on existence; **absence claim is itself recall, not evidence** |
| **Medical and aviation checklists** — Haynes et al., NEJM 2009 (WHO Surgical Safety Checklist, eight hospitals; mortality and complications fell); Pronovost et al., NEJM 2006 (Keystone ICU, catheter infections fell sharply and stayed down); **Urbach et al., NEJM 2014 (Ontario: mandated checklist adoption across ~100 hospitals, no significant change in mortality or complications)**; Degani & Wiener, *Cockpit Checklists: Concepts, Design, and Use*, Human Factors 1993 | Outcome rates before/after checklist introduction | **The only literature that measured outcome change after adding a checklist — and it is split.** Haynes and Pronovost are positive with implementation programmes attached; Urbach is a null with mandated text alone. The reconciliation the field settled on is that the checklist is a *forcing function at a pause point with a second person*, and that the text without the practice does nothing. That is precisely doc 07 §6.1's Sign Out argument and the stream's "an instruction can be negative-valued" ordering, reached from a domain with mortality as the outcome | `[recall: high]` on all four; magnitudes deliberately not stated |
| **SPI / CMM maturity vs defect density** — Herbsleb et al., *Software Quality and the Capability Maturity Model*, CACM 1997; the SEI benefits reports of the mid-1990s | Organisation-level defect density against maturity level | Correlational, confounded, org-level. Not a recurrence measurement | `[recall: medium]` |
| **Regression-test-suite effectiveness** — Just et al., *Are Mutants a Valid Substitute for Real Faults?*, FSE 2014; Inozemtseva & Holmes, *Coverage Is Not Strongly Correlated with Test Suite Effectiveness*, ICSE 2014 | Whether suite metrics predict real-fault detection | Bears on doc 03 §2's "discrimination" test: a check's *existence* is weak evidence it catches the next instance. Neither measures recurrence after a regression test is added for a bug — which is the exact code analogue of the stream's question and is, as far as recalled, also unmeasured | `[recall: high]` |
| **CheckList for NLP** — Ribeiro, Wu, Guestrin, Singh, *Beyond Accuracy: Behavioral Testing of NLP Models with CheckList*, ACL 2020 | A methodology: found failure → capability → templated test | **The ratchet, in NLP, five years before the rules-file genre.** It measured that the method *finds* failures in commercial models; it did not measure whether capabilities stop regressing once tested. Worth citing because it is the best-known prior for "turn a miss into a durable, generalised check" and it has the same measurement gap | `[recall: high]` |

**The verdict, stated exactly.** The adjacent literature exists and is rich; the direct measurement does not. Three findings from it should travel into the stream:

1. **Where recurrence provably drops, it drops because the class became impossible, not because it was described** (Error Prone). That is doc 03's rung 0/1 and it needs no measurement.
2. **Where the countermeasure is text, the human-domain evidence splits on implementation, not content** (Haynes/Pronovost vs Urbach; Porter–Votta–Basili's null for checklists). The stream's "gate over sentence" ordering is not an AI-specific quirk; it is what checklists have always done.
3. **The only literatures that claim to have measured a root-cause → action → defect-rate loop are IBM's DPP and DCA from 1990–1998, at organisational grain.** If a wider-egress session wants one adjacent number to cite, Mays 1990 is the handle — and its magnitude should be read from the paper, not from this document.

**Open questions:** Chernak 1996 and Mays 1990 are the two leads most likely to contain an actual before/after on a checklist item. Whether the incident-postmortem literature has since produced a follow-through study (2023–2026) is outside confident recall.

---

## 2. The load-bearing unverified claims, one by one

**What it is:** The synthesis lists nine items to harden in priority order. For each, three questions: does the author recognise it, is the stream's characterisation right, and is there a better-known canonical source for the same finding.

**Why it matters:** These carry contradictions (a), (b) and (c) in the synthesis. A recall grade tells the next session where to spend its first hour.

**Key findings:**

| # | Claim as the stream has it | Recognised? | Characterisation | Canonical or adjacent source the author does recall | Grade |
|---|---|---|---|---|---|
| 1 | **W4A 2026, *Generated Inaccessible*** — six AI UI tools, 29.0% WCAG compliance, prompting for accessibility *decreased* compliance | **No.** The title, DOI and numbers do not match anything the author can recall. W4A 2026 would fall inside the cutoff window but at its edge | Cannot assess. **The direction has a precedent that partly cuts the other way:** Aljedaani et al., *Does ChatGPT Generate Accessible Code? Investigating Accessibility Challenges in LLM-Generated Source Code*, W4A 2024, found LLM-generated pages carried accessibility violations *and* that prompting with a specific violation got a large share of them fixed. That is "specific prompt helps", which does not contradict "generic prompt hurts" — different manipulations — but it means the claim's exact form matters. A second adjacent line: Mowar et al., *CodeA11y*, CHI 2025, a Copilot extension that nudged developers toward accessible code | Aljedaani 2024 `[recall: medium-high]`; Mowar 2025 `[recall: medium]`; the W4A 2026 finding itself **`[recall: none]`** | Search: `"Generated Inaccessible" W4A 2026`; `Aljedaani "Does ChatGPT generate accessible code" W4A 2024` |
| 2 | **Hodges et al. 1999** — experts scored worse than novices on binary checklists, better on global ratings | **Yes.** Hodges, Regehr, McNaughton, Tiberius, Hanson, *OSCE checklists do not capture increasing levels of expertise*, Academic Medicine, 1999 | Right. Three expertise levels, standardized-patient interviews, checklist scores fell with expertise while global ratings rose. One nuance the stream should carry: the station was a *psychiatric interview*, where expert efficiency is omission; the inversion is less clean for procedural skills | Companion: Regehr, MacRae, Reznick, Szalay, *Comparing the psychometric properties of checklists and global rating scales for assessing performance on an OSCE-format examination*, Academic Medicine 1998 (global ratings at least as reliable and more valid). And the paper whose title is the stream's thesis: Cunnington, Neville, Norman, *The risks of thoroughness: reliability and validity of global ratings and checklists in an OSCE*, Advances in Health Sciences Education, ~1997 | Hodges `[recall: high]`; Regehr `[recall: high]`; Cunnington `[recall: medium]` — the title is convenient enough to flag |
| 3 | **Ilgen 2015** — 45 studies; inter-rater ~0.81 vs ~0.78; inter-item GRS 0.92 vs checklist 0.66 | **Yes.** Ilgen, Ma, Hatala, Cook, *A systematic review of validity evidence for checklists versus global rating scales in simulation-based assessment*, Medical Education, 2015 | Direction right: inter-rater reliability comparable, inter-item (internal consistency) higher for GRS, and GRS carried better evidence for discriminating expertise. **The pooled values are recalled as the same order, not the same digits** — do not quote 0.92/0.66 from this document | — | Existence `[recall: high]`; numbers `[recall: medium]` |
| 4 | **CheckEval +0.45 agreement** (README fetched by doc 03) | **Yes.** Lee et al., *CheckEval*, arXiv 2403.18771, 2024 | Right; the README doc 03 fetched is the primary. Better-known neighbours saying the same thing: TICK (Cook et al., 2024, generated per-instruction checklists); InFoBench (Qin et al., 2024, Decomposed Requirements Following Ratio); FLASK (Ye et al., ICLR 2024, skill-decomposed evaluation) | InFoBench and FLASK `[recall: high]` | — |
| 5 | **40–73% regression accumulation** (arXiv 2607.01855) | **No — post-cutoff** (July 2026) | Cannot assess. Nearest recalled precedents: Laban et al. (fetched by doc 02); MINT (Wang et al., ICLR 2024) on multi-turn tool use; ConvCodeWorld (Han et al., ICLR 2025) on conversational code generation with feedback | `[recall: high]` for MINT; `[recall: medium]` for ConvCodeWorld | Search: `"Regression Accumulation" multi-turn programming arXiv 2607.01855` |
| 6 | **METR RCT** — 16 devs, 246 tasks, +19% time; forecast −24%, post-hoc −20% | **Yes.** Becker, Rush, Barnes, Rein, *Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity*, METR, July 2025, arXiv 2507.09089 | Design and point estimates right. **The confidence interval:** the author recalls the reported interval as *not* crossing zero on the slowdown side and being wide — consistent with doc 05's "+2% to +39%" — but will not vouch for the endpoints | The **February 2026 update** ("study design changing", the July result "likely outdated", selection effects from developers declining to work without AI): the author has a moderate memory that METR published such a note and that its follow-up estimate had an interval crossing zero. **The specific −18% / (−38%, +9%) figures are not recalled and may have been reconstructed by the search index** | RCT `[recall: high]`; CI endpoints `[recall: medium]`; Feb-2026 update existence `[recall: medium]`; its numbers `[recall: low]` |
| 7 | **Rubric reward hacking 85.8% / 78.4%** (arXiv 2605.12474) | **No** — May 2026, at the cutoff edge; not recognised | The phenomenon is well precedented: *Rubrics as Rewards* (Gunjal et al., Scale AI, 2025) and *Checklists Are Better Than Reward Models for Aligning Language Models* (Viswanathan et al., 2025) establish rubric/checklist RL; specification gaming is Skalse et al., *Defining and Characterizing Reward Gaming*, NeurIPS 2022 | Precedents `[recall: high]`; the numbers **`[recall: none]`** | — |
| 8 | **IFScale** — 500 instructions, ~68% for the best models, three decay shapes, primacy bias | **Yes.** Jaroslawicz et al., *How Many Instructions Can LLMs Follow at Once?*, 2025 (Distyl AI) | Right in shape and rough numbers | Precedents on instruction following: IFEval (Zhou et al., 2023), FollowBench (Jiang et al., 2023). **The "2026 Arize replication" and *Instruction Stacking Collapse* (arXiv 2608.02639) are unrecognised / post-cutoff** | IFScale `[recall: high]`; the other two `[recall: none]` |
| 9 | **CHI 2026 EA, *Looks Good, But Is It Usable?*** — 138 screens, three tools, low support on H10/H9/H7/H5 | **No.** Not recognised (CHI 2026 is inside the window; the EA track is large) | **A methodological caveat that matters for V6 regardless of verification:** a heuristic inspection of *static screens* structurally cannot observe H9 (error recovery), H5 (error prevention) or H7 (efficiency for experts) — these live in interaction, not in a screenshot. Low support on exactly those four heuristics is therefore partly a property of the instrument, not only of the generator. The finding may be true *and* over-read. Doc 04's conclusion ("the corpus polishes the visible half") survives this caveat; V6's stronger phrasing ("measurably fails on the functional half") should be softened until the paper's method is read | Adjacent, recalled: Duan et al., *Generating Automatic Feedback on UI Mockups with LLMs*, CHI 2024 (LLM feedback against Nielsen heuristics on Rico-derived mockups); Duan et al., *UICrit*, UIST 2024 (designer critiques with bounding boxes) — both `[recall: high]` | Finding `[recall: none]`; caveat `[reasoning]` |
| 10 | **Instruction-file growth +226%, deletions rare** (Chakrabarti, 1,867 repos) | Not recognised as a specific paper | The direction is consistent with *Agent READMEs* (doc 07 cites it) and with the lint-config literature above | `[recall: low]` |
| 11 | **Self-attribution bias, 5× approval of a compromised patch** (arXiv 2603.04582) | Not recognised (March 2026) | Precedents: Panickssery, Bowman, Feng, *LLM Evaluators Recognize and Favor Their Own Generations*, NeurIPS 2024; Wataoka et al., *Self-Preference Bias in LLM-as-a-Judge*, 2024. The mechanism doc 07 relies on (bias triggered by *where* the artifact sits in the conversation) is specific to the 2026 paper and cannot be corroborated from recall | Precedents `[recall: high]`; the 5× `[recall: none]` |
| 12 | **TDAD** (arXiv 2603.17973; 70% regression reduction) | The paper is not recalled, but the TS port's README, fetched this session, names it: Alonso, Yovine, Braberman, *TDAD: Test-Driven Agentic Development*, March 2026 ([tdad-ts README](https://github.com/fmguerreiro/tdad-ts) `[fetched]`) | The mechanism is textbook regression test selection with a scored edge model (Direct 0.95, Route 0.90, Transitive 0.70, Coverage 0.80, Imports 0.50 — from the README, `[fetched]`). See §5: this is the technique the stream needed for blast radius, already rebadged for agents | Mechanism `[fetched]`; the 70% `[search summary]` in doc 01, not upgraded here |

**One more claim, volunteered with a confabulation flag.** The author has a *low-confidence* impression of a 2025 empirical paper evaluating coding agents on benchmark tasks with and without `AGENTS.md`-style context files, finding that **LLM-generated context files gave little or negative benefit while human-written ones helped modestly**. If real, it is the closest thing to a direct measurement of "does the rules file help" that exists, and it bears on doc 06 §5.3 and doc 07 §4. The author cannot produce a title or author with confidence and **flags this as possibly confabulated**. Search: `AGENTS.md context files coding agents empirical evaluation SWE-bench 2025`; `"context files" "coding agents" LLM-generated versus human-written`. Grade: `[recall: low]`.

**Open questions:** Items 1, 5, 7, 9 and 11 are the ones recall cannot touch; they are also the ones carrying the stream's two most striking contradictions. The next session should open those five first, and should read the *method* section of item 9 before its results.

---

## 3. Rubrics, defect taxonomies and agreement statistics

**What it is:** The literatures doc 03 reached only through snippets: analytic vs holistic rubrics, rubric validity, ODC and IEEE 1044, inter-rater statistics, and the LLM-judge rubric line.

**Why it matters:** Doc 03's mechanics (atomic binary criteria, κ as the reporting metric, anchors, exemplars) are right in outline. Two corrections and one addition follow from recall, and they are the kind a snippet cannot carry.

**Key findings:**

**3.1 Rubric design has a published taxonomy of decisions, and doc 03 should name it.** Dawson, *Assessment rubrics: towards clearer and more replicable design, research and practice*, Assessment & Evaluation in Higher Education, 2017, decomposes a rubric into **fourteen design elements** — specificity, secrecy (is the rubric shown to the assessed?), exemplars, scoring strategy, evaluative criteria, quality levels, quality definitions, judgement complexity, users and uses, creators, quality processes, accompanying feedback information, presentation, and explanation. `[recall: high]` on the paper and the count; the element list is recalled with medium confidence and may be slightly off in wording. Its value here is that most rubric-literature disagreements dissolve once you say *which element* you are varying — and it gives doc 03's rubric change record a checklist of what a MINOR vs MAJOR bump actually changed. **Secrecy** is the element the stream has not discussed: a criterion shown to the generator is a reward; a criterion withheld is a test. The reward-hacking result in doc 03 §7 is a secrecy decision, not a rubric-quality decision.

**3.2 The canonical reviews say what doc 03 says, with one sharper line.** Jonsson & Svingby 2007 (75 studies) — `[recall: high]`, and doc 03's paraphrase is accurate. Reddy & Andrade, *A review of rubric use in higher education*, AEHE 2010 — `[recall: high]`; its finding worth adding is that rubric *validity* studies were rare and that students and instructors valued rubrics for transparency more than for measurement. Brookhart, *Appropriate criteria: key to effective rubrics*, Frontiers in Education 2018 — `[recall: medium-high]`; her line is that the quality of a rubric is almost entirely the quality of its *criteria selection*, and that "counting" criteria (did the essay have five paragraphs?) are the canonical bad ones. That is exactly the "checklist rewards the tooltip" failure the synthesis derives from Hodges, stated in the education literature independently.

**3.3 Defect taxonomies.** ODC as doc 03 has it is right: Chillarege et al. 1992, with defect type as a small closed set (the author recalls eight: function, interface, checking, assignment, timing/serialisation, build/package/merge, documentation, algorithm) and trigger as the orthogonal axis `[recall: high]`. IEEE 1044-2009, *Standard Classification for Software Anomalies*, is right as characterised; it supersedes the 1993 edition and its useful contribution is the attribute *pairs* — insertion activity vs detection activity, which is doc 01's `round_introduced` / `found_by` in standards vocabulary `[recall: high]`. The usability-defect taxonomy line (OSUDC and predecessors) is real and thin, as doc 03 says `[recall: medium]`.

**3.4 The agreement-statistics correction.** Doc 03 §6 says "report κ, and only κ" for binary criteria. Cohen's κ (1960) is right for two raters; Fleiss' κ (1971) for more; Krippendorff's α for missing data and mixed scales; Landis & Koch (1977) bands are the ones doc 03 cites, and McHugh, *Interrater reliability: the kappa statistic*, Biochemia Medica 2012, argues for stricter bands — all `[recall: high]`. **The correction:** a design rubric's binary criteria will have *skewed prevalence* — most artifacts pass most criteria most of the time, which is doc 03's own retirement signal — and under skew κ collapses even when raw agreement is very high. This is the first "kappa paradox" of Feinstein & Cicchetti, *High agreement but low kappa*, J Clin Epidemiol 1990 `[recall: high]`. The standard remedies are to report **positive and negative specific agreement** alongside κ (Cicchetti & Feinstein 1990), or a prevalence-adjusted coefficient — PABAK (Byrt, Bishop, Carlin 1993) or Gwet's AC1 (2008) `[recall: high]`. Practical consequence for doc 03: **a criterion that fires on 5% of artifacts can show κ ≈ 0.3 with 97% raw agreement; do not split it on that evidence.** Report κ *and* the fire rate *and* positive specific agreement, or use AC1. The "only κ" rule is right about not padding with correlated coefficients and wrong about κ being sufficient at low prevalence.

**3.5 The LLM-judge rubric line, canonical set.** For the next session's convenience, the works doc 03 cites from snippets are all recalled at `[recall: high]` as real and as characterised: G-Eval (Liu et al., EMNLP 2023); *Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena* (Zheng et al., NeurIPS 2023); *Large Language Models are not Fair Evaluators* (Wang et al., 2023 — position bias); Prometheus (Kim et al., ICLR 2024) and Prometheus 2 (2024); FLASK; TICK; *Who Validates the Validators?* (Shankar, Zamfirescu-Pereira, Hartmann, Parameswaran, Arawjo, UIST 2024 — criteria drift); LLM-Rubric (Hashemi et al., ACL 2024). Post-cutoff and unrecognised: RubricEval, AutoRubric, RuVerBench, the agreement-metrics paper (2606.00093), the 2026 rubric-granularity survey, and *Concerning Rubric Artifacts* (2609.02942 — dated September 2026, after cutoff). One addition doc 03 does not have: **length-controlled evaluation** (Dubois et al., *Length-Controlled AlpacaEval*, 2024, `[recall: high]`) — verbosity bias is the judge-side twin of the "checklist rewards the tooltip" problem, and the mitigation (regress the verdict on length and use the residual) transfers to UI as "regress on element count".

**Open questions:** Whether any of the human-rater psychometrics transfers to a judge whose "prevalence" is under the operator's control is unstudied; the κ-under-skew problem is certainly present in any log where 90% of criteria pass.

---

## 4. What recall cannot help with: the post-cutoff and unrecognised set

**What it is:** A plain list, so no later reader mistakes silence for corroboration.

**Key findings:** The author has **no usable memory** of: *Generated Inaccessible* (W4A 2026); *Looks Good, But Is It Usable?* (CHI 2026 EA); *Usable but Conventional* (arXiv 2605.15124); *Regression Accumulation in Multi-Turn LLM Programming Conversations* (2607.01855); *Instruction Stacking Collapse* (2608.02639); the Arize IFScale replication; *Reward Hacking in Rubric-Based RL* (2605.12474) and its companion; *Self-Attribution Bias* (2603.04582); DiffSpot (2605.29615); RubricEval, AutoRubric, RuVerBench; *Agreement Metrics for LLM-as-Judge* (2606.00093); *Concerning Rubric Artifacts* (2609.02942); *How Coding Agents Fail Their Users* (2605.29442); *From Prompting to Verification* (2605.24521); the Veracode 2026 report; GitClear's 2026 report; DORA 2025/2026 report bodies; the Stanford / Denisov-Blanch figures; ReFLAIR (FSE 2026); *Where Do AI Coding Agents Fail?* (2601.15195); the 2026 AI-code-review benchmark genre. For every one of these the stream's `[search summary]` label stands unchanged, and this document adds nothing.

Recognised and consistent with the stream's characterisation: Laban et al. (ICLR 2026, recalled from its 2025 preprint); NoLiMa (Modarressi et al., ICML 2025); *Lost in the Middle* (Liu et al., TACL 2024); Chroma's context-rot report (July 2025); ImpossibleBench (2025); Interaction2Code (2024/ASE 2025); WebGen-Bench (2025); Design2Code (2024); SWE-bench-Live (2025); the 333-bug LLM code taxonomy (2024); EffiBench (2024); Google's mutation-testing paper (Petrović et al., TSE 2021 — the "productive mutant" framing and suppression rules are right; the two conflicting percentages doc 03 flags cannot be resolved from recall); HealthBench (2025); WildBench (2024); the Replit July-2025 incident. All `[recall: high]` on existence; none upgraded on numbers.

---

# Part B — Graph techniques for design

*Everything in Part B is `[reasoning]` unless a specific sentence carries another grade. The tools named are `[fetched]` where linked.*

## 5. Blast radius is reachability: regression test selection and change-impact analysis

**What it is:** Doc 02 makes blast radius the unit of repair risk ("what else can this change reach") and offers no way to compute it; its scope-test (step 3 of the patch protocol) is a manual two-minute probe of a second route, breakpoint and theme. Software engineering has computed exactly this quantity on dependency graphs since the 1990s, under the names *regression test selection* (RTS), *change-impact analysis* (CIA) and *firewall analysis*.

**Why it matters:** The stream's step 10 ("component-scoped diff; only the region you touched should differ") and doc 07's re-verification cost term both assume you know which components a patch can reach. If that set is computed rather than guessed, re-verification after a patch becomes *selected* rather than total — which is the single largest term in doc 07 §1.3 — and the seam checks in doc 04 §6 get a principled candidate list.

**Key findings:**

**5.1 The technique, in three lines.** Build a graph whose nodes are units (files, classes, components) and whose edges are "depends on". Seed it with the units the change touched. The affected set is the *reverse* reachability closure — everything that can reach a changed node. Run only the checks that cover the affected set. The literature's contribution is the word **safe**: an RTS technique is safe if it never omits a test that could reveal a fault introduced by the change, which requires the graph to be *complete* with respect to the dependencies that actually exist at runtime.

| Technique | Grain and mechanism | Source | Grade |
|---|---|---|---|
| Safe RTS (DejaVu) | Control-flow-graph walk; selects tests traversing changed edges; proved safe under stated assumptions | Rothermel & Harrold, *A safe, efficient regression test selection technique*, ACM TOSEM 1997; the framework paper *Analyzing regression test selection techniques*, IEEE TSE 1996 | `[recall: high]` |
| Firewall analysis | Class-level: the "firewall" is the set of classes adjacent to changed classes in the dependency graph; retest inside it | Leung & White 1990 (integration-level regression); Kung et al., *Class firewall, test order, and regression testing of object-oriented programs*, JOOP 1995 | `[recall: medium-high]` |
| Chianti | Method-level change-impact analysis: decompose an edit into atomic changes, use call graphs from test executions to report which tests are affected by which atomic change | Ren, Shah, Tip, Ryder, Chesley, OOPSLA 2004 | `[recall: high]` |
| **Ekstazi** — dynamic file dependencies | Records, per test, which *files* (classes) it touched at runtime; on the next run, re-executes only tests whose recorded dependencies changed (by checksum). Dynamic, so runtime composition is captured | [gliga/ekstazi](https://github.com/gliga/ekstazi) `[fetched]` — Apache-2.0, 42★, README cites Gligoric, Eloussi, Marinov, ISSTA 2015 | Mechanism `[fetched]`; the paper's time-saving figure not recalled with confidence |
| **STARTS** — static class-level RTS | Static class dependency graph from bytecode; `starts:diff` / `starts:impacted` / `starts:select` — literally "types that changed → types that may be impacted → tests affected" | [TestingResearchIllinois/starts](https://github.com/TestingResearchIllinois/starts) `[fetched]` — 34★; README lists Legunsen et al., FSE 2016 and ASE Demo 2017 | `[fetched]` |
| Google-scale continuous testing | Dependency-distance heuristics at monorepo scale; the finding the author recalls is that the probability a test is affected falls with graph distance from the change, which licenses cutting off deep transitive closures | Memon et al., *Taming Google-Scale Continuous Testing*, ICSE-SEIP 2017 | `[recall: high]` on existence; distance finding `[recall: medium]` |
| Predictive test selection | Learned model over change features selects a small fraction of tests while catching most failures | Machalica, Samylkin, Porth, Chandra, *Predictive Test Selection*, ICSE-SEIP 2019 (Facebook) | `[recall: high]`; "less than a third of tests, over 95% of failures" `[recall: medium]` |
| Surveys | Yoo & Harman, *Regression testing minimization, selection and prioritization: a survey*, STVR 2012; Engström, Runeson, Skoglund, IST 2010; Bohner & Arnold, *Software Change Impact Analysis*, 1996 | — | `[recall: high]` / `[recall: medium-high]` / `[recall: high]` |
| **Monorepo build graphs** | `nx affected` — "caches what didn't change, runs only what's affected" — is RTS at project grain, from `git diff` plus the project graph | [nrwl/nx](https://github.com/nrwl/nx) `[fetched]` — MIT, 29,322★ | `[fetched]` |
| **TDAD** | RTS for agents: a static `test_map.txt` mapping source files to tests at risk, with scored edge types, which the agent greps after editing | [tdad-ts](https://github.com/fmguerreiro/tdad-ts) `[fetched]` | `[fetched]` — and already picked by doc 01 |
| Chromatic TurboSnap | Uses git changes plus the bundler dependency graph to snapshot only affected stories — RTS for visual tests | Chromatic docs; the [chromatic-cli README](https://github.com/chromaui/chromatic-cli) `[fetched]` does not describe it, so this stays recall | `[recall: medium]` |

**5.2 What transfers to a design/component graph.** Three edge lists, each obtainable in an afternoon:

1. **Component import graph** — `madge --json src` or `dependency-cruiser` emit it directly ([pahen/madge](https://github.com/pahen/madge) `[fetched]`, MIT, 10,160★; [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) `[fetched]`, MIT, 7,164★, which additionally validates rules and reports circular dependencies and orphans). Reverse-reach from the patched file gives every component and screen that *statically* includes it.
2. **Token reference graph** — design tokens alias each other (Style Dictionary's README shows `size.font.base` resolving through `size.font.medium` — [amzn/style-dictionary](https://github.com/amzn/style-dictionary) `[fetched]`; Tokens Studio's graph engine expresses tokens as expressions over other tokens, `{dimension.sm} * {dimension.scale}` — [tokens-studio/graph-engine](https://github.com/tokens-studio/graph-engine) `[fetched]`, MPL-2.0, 69★, self-described alpha, last push 2025-08-06). A token change reaches every token that references it and every component that references any of those.
3. **Route × component render map** — which components actually rendered on which route, at which state. This is the *dynamic* edge set, and it is the Ekstazi move: record it at runtime (a crawl that reads a `data-component` attribute per rendered component, or a `React.Profiler` hook that logs component names per route) rather than inferring it statically.

Given those, blast radius for a patch to component `C` is: routes that render `C` ∪ routes that render anything reachable from `C` in the import graph ∪, if a token changed, routes that render any consumer of any token reachable from it. Re-run the screenshot baseline and the seam checks on *that* set only.

**5.3 What breaks, and it breaks in ways the code literature already named.**

| Breakage | Why | The RTS analogue | What to do |
|---|---|---|---|
| **CSS cascade and inheritance** | `color`, `font`, `line-height` inherit down the DOM; a global stylesheet or an element selector is an edge to *everything*; specificity and source order make the dependency non-lexical. Utility-class systems (Tailwind) are local by design, but `@apply`, `@layer` and global resets are not | Global mutable state in RTS — the reason "safe" techniques treat globals conservatively | Treat any change outside a component's own scope as "affects all". The interesting fact is that this is *correct*: a token change on `:root` reaches everything by design, so RTS says "re-test everything" — and the recovery is doc 04 §6's **component-scoped diff**, which turns "everything changed" back into "these three neighbours changed *and should not have*" |
| **Runtime composition** — slots, children, render props, context consumers, portals, lazy routes | The static import graph misses them. TDAD's own README says so for its domain: "static `import` chains miss two recurring patterns… Next.js route resolution… and registry-based dispatch" ([tdad-ts](https://github.com/fmguerreiro/tdad-ts) `[fetched]`) | Exactly why Ekstazi went dynamic | The render map (5.2 item 3) is the fix; static edges alone are unsafe |
| **Layout is not a dependency; it is a constraint solve** | A change to one flex child's size moves its siblings. There is no import edge, no token edge, no render edge — only a *containing block* relationship | Nothing in RTS; this is closer to constraint-graph analysis | Add the containing-block subtree and siblings of every changed element to the affected set — which is precisely doc 04 §6's **neighbour-disagreement seam**, so the seam check and the blast-radius set are the same object |
| **Global state stores** | A store key read by many components | Global variables | Edge from store key → readers, if you have it; otherwise conservative |
| **Fonts, media queries, `prefers-*`** | Environment-scoped, not code-scoped | Configuration dependencies | Enumerate as viewports/themes, which the stream already does |

**5.4 Cost for a solo designer, and the verdict.** Static import graph plus reverse reachability: one `madge --json` call and twenty lines of script. Token graph: Style Dictionary or a `var(--x)` grep already gives the reference edges. Render map: a Playwright crawl writing `(route, state, component)` triples — half a day, and it doubles as doc 03's route-coverage gate. **Build the affected-set selection as a test-selection layer** — it directly cuts doc 07's re-verification term and it gives the seam checks their candidate list. **Do not build it as a risk score**: TDAD's weighted edge tiers are a reasonable heuristic for tests, but nothing in the design domain calibrates the weights, and an uncalibrated number is worse than a set. **Overkill:** dynamic tracing infrastructure, a graph database, any CPG-style unified graph (§9). The whole thing is three CSV edge lists and a breadth-first search.

**Open questions:** No published work applies RTS to UI screenshot suites beyond vendor features (TurboSnap). The safety condition for a design graph — what set of edge types makes reverse reachability complete — is unstudied; the list in 5.3 is the author's, not a result.

---

## 6. The missing join is a property-graph schema

**What it is:** Doc 06's gap list and the synthesis both say the thing nobody has built is the join between artifact, defect class, criterion, fix altitude and *whether it recurred*. That sentence is a graph schema, and "did it recur" is a query over it. This section specifies both — and then argues for storing the graph in a spreadsheet.

**Why it matters:** E0 (do classes recur across artifacts?) and E3 (repeat-offence rate) are the stream's two cheapest experiments and both are unrunnable without this join. Doc 01's defect record carries most of the fields; two are missing, and without them the repeat-offence rate in doc 07 §7.1 cannot be computed from the data — only remembered.

**Key findings:**

**6.1 The schema.** Nodes and the edges between them. Every node type already exists somewhere in the stream; the contribution is naming the edges and their time properties.

```
NODES
  Artifact      {id, version, commit, route_set, size_proxy}          (doc 01 artifact{})
  Generation    {id, at, model, skill_sha, catalog_version, prompt_sha,
                 rubric_version, gate_set_version}                     (doc 01 generator{} + 2 fields)
  Defect        {id, severity, round_found, round_introduced, found_by} (doc 01 defect/1)
  Class         {key}                                                  (doc 01 recurrence_key)
  Criterion     {id, type: judge|human, text, since, until}            (doc 03 rubric pack)
  Gate          {id, type: schema|hook|lint|assertion, since, until}   (doc 03 verification ladder)
  Fix           {id, move: patch|regenerate|rollback|escalate, altitude, commit}  (doc 02)
  RubricVersion {id, semver, at}                                       (doc 03 §8)

EDGES
  (Generation)  -PRODUCED->        (Artifact)
  (Artifact)    -DERIVED_FROM->    (Artifact)            rounds; the transcript is not a node
  (Generation)  -USED->            (RubricVersion)        what the generator saw
  (Defect)      -FOUND_IN->        (Artifact)
  (Defect)      -INSTANCE_OF->     (Class)
  (Defect)      -FOUND_BY->        (Gate | Human)
  (Defect)      -SHOULD_HAVE_BEEN_CAUGHT_BY-> (Gate | Criterion)   doc 01 cheapest_gate, as an edge
  (Class)       -COVERED_BY {since, until}-> (Criterion | Gate)    the ratchet, as an edge with a date
  (Fix)         -REPAIRS->         (Defect)
  (Fix)         -LANDED_AT->       (Criterion | Gate | Skill | Schema)  the fix-altitude ladder
  (Criterion)   -PROMOTED_FROM->   (Defect)
  (Criterion)   -DEMOTED_TO->      (Gate)                 doc 03 §6 "demote"
  (Criterion)   -RETIRED {at, reason}                      a property, not an edge
```

**6.2 Recurrence is a two-hop query with a date predicate.** A *repeat offence* is a defect whose class was already covered by some artifact at the moment its artifact was generated:

```
// property-graph form
MATCH (d:Defect)-[:INSTANCE_OF]->(k:Class)-[c:COVERED_BY]->(x),
      (d)-[:FOUND_IN]->(a:Artifact)<-[:PRODUCED]-(g:Generation)
WHERE c.since <= g.at AND (c.until IS NULL OR c.until > g.at)
RETURN d.id, k.key, x.id AS covering_artifact, g.rubric_version
```

```sql
-- the same query in the store a solo designer will actually have
SELECT d.defect_id, d.class_key, c.covering_id, g.rubric_version
FROM defect d
JOIN generation g ON g.artifact_id = d.artifact_id
JOIN coverage  c ON c.class_key = d.class_key
                AND c.since <= g.generated_at
                AND (c.until IS NULL OR c.until > g.generated_at);
```

The repeat-offence rate for a week is that result's row count over the week's defect count. E0's kill criterion ("under ~30% of misses fall into a class already seen in an earlier, unrelated prototype") is the same query with `coverage` replaced by `defect` self-joined on `class_key` and `artifact_id <> `.

**6.3 The concrete delta to doc 01's defect record: two fields.** Doc 01's record already has `recurrence_key`, `generator{}`, `cheapest_gate` and `found_by`. It cannot compute the query above because it does not know *what existed at generation time*. Add:

| Field | Where | Meaning | Why it is the load-bearing one |
|---|---|---|---|
| `generator.rubric_version` and `generator.gate_set_version` | `generator{}` block (copied, never re-derived — doc 01's rule) | The rubric pack and the gate set the artifact was generated and gated under | Without a version stamp on the *generation*, "the criterion existed" is a memory. This is the `USED` edge |
| `discovery.expected_catcher` | `discovery{}` block, next to `cheapest_gate` | The id of an **existing** criterion or gate that should have caught this, or `null` | `cheapest_gate` says what *should exist*; `expected_catcher` says what *did exist and failed*. A non-null value is a repeat offence by definition. Doc 07's falsification test becomes `COUNT(expected_catcher IS NOT NULL) / COUNT(*)` |

Everything else in the schema is either already in the record or derivable from git and the rubric pack's change records (doc 03 §8).

**6.4 The store: a graph is the schema, not the database.** At the stream's scale — one designer, 2–4 prototypes a week, twelve criteria, a dozen gates, a few hundred defects a year — the graph has hundreds of nodes and low thousands of edges. That is **three CSV files or one SQLite file**, and the queries are joins. The property-graph vocabulary earns its place because it names the edges and their dates correctly; a graph *database* earns nothing until there are recursive path queries over the `DERIVED_FROM` chain or the `DEMOTED_TO` chain, and those are a recursive CTE in SQLite when they arrive. **Verdict:** adopt the schema, add the two fields, keep the store flat. Overkill: Neo4j, Kùzu, any hosted graph service; also any ontology beyond the edge names above.

**Open questions:** Whether `expected_catcher` can be filled honestly by the same person who wrote the criterion is doc 07 §5.4's conflict; the field should be filled at the weekly review, not at the Sign Out, so it gets a day of distance.

---

## 7. Rules-file bloat is a retrieval problem

**What it is:** Doc 07 models adherence decay as a function of file length (`a(n) = a₀ − k(n−1)`); doc 05 finds a 949-line `AGENTS.md` against a six-bullet vendor doctrine; doc 06 §5.3 records that `.claude/rules/*.md` with `paths:` frontmatter is the only mechanism that defers load. All three are describing one fact: **the model is being handed every rule for every task, and most rules are irrelevant to most tasks.** That is a retrieval problem, and graph-structured retrieval is the family of techniques for it.

**Why it matters:** If only the task-relevant subgraph of rules is loaded, `n` in doc 07's model is the *loaded* count, not the *authored* count, and the bloat cap `n*` applies per task rather than per file. A 200-rule bank becomes affordable if any one task sees fifteen.

**Key findings:**

**7.1 What is already shipped, as graph structure.**

| Mechanism | The graph it is | Evidence | Grade |
|---|---|---|---|
| **Path-scoped rules** — `.claude/rules/*.md` with `paths:` globs | A bipartite graph rule ↔ path-glob; retrieval is "load rules whose glob matches a file the agent touched" | Doc 06 §5.3, from the fetched memory docs: "Path-scoped `.claude/rules/*.md` with `paths:` frontmatter is the only mechanism that genuinely defers load" | Cross-linked, not re-fetched |
| **Skills loaded on demand by description** | A one-hop index: task description → skill; the skill listing is the index, the body loads on invocation, capped at 5k tokens per skill / 25k total after compaction | Doc 02 §2, from the fetched context-window docs | Cross-linked |
| **Aider's repo map** | A file-dependency graph, ranked by a graph ranking algorithm, *personalised to the files in the chat*, trimmed to a token budget (default 1k) — "selecting the most important parts of the codebase which will fit into the active token budget… most relevant to the current state of the chat" | [Aider repomap.md](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/repomap.md) `[fetched]` | `[fetched]`; that the ranking is personalised PageRank over tree-sitter symbol references is `[recall: high]` from the linked blog post, not fetched |

**7.2 The GraphRAG family, and its evidence.**

| Technique | Mechanism | What it is for | Cost and status | Grade |
|---|---|---|---|---|
| **GraphRAG** (Microsoft) | LLM-extract an entity–relation graph from a corpus; cluster it (Leiden); write a summary per community; answer "global" questions by map-reduce over community summaries | Query-focused summarisation over a corpus too large to read — "what are the main themes across all these documents" | The README carries two warnings worth quoting: "GraphRAG indexing can be an expensive operation" and, as of this fetch, "This project is largely in maintenance mode, and won't be accepting new PRs or implementing new features" ([microsoft/graphrag](https://github.com/microsoft/graphrag) `[fetched]`, MIT, 35,952★). Paper: Edge et al., *From Local to Global: A Graph RAG Approach to Query-Focused Summarization*, 2024 — the README links arXiv 2404.16130 `[fetched]`; that its evaluation was LLM-judged pairwise on comprehensiveness and diversity is `[recall: high]` — i.e. the evidence class this stream distrusts | `[fetched]` + `[recall: high]` |
| **LightRAG** | Lighter entity/relation graph with dual-level (local/global) retrieval | Same job, cheaper indexing | [HKUDS/LightRAG](https://github.com/HKUDS/LightRAG) `[fetched]`, MIT, 39,592★, EMNLP 2025 per its README | `[fetched]` |
| **HippoRAG** | OpenIE knowledge graph + personalised PageRank from query entities; the README claims "significantly fewer resources for offline indexing compared to… GraphRAG, RAPTOR, and LightRAG" | Multi-hop retrieval and "sense-making" | [OSU-NLP-Group/HippoRAG](https://github.com/OSU-NLP-Group/HippoRAG) `[fetched]`, MIT, 3,999★, NeurIPS 2024 | `[fetched]` |
| **The comparative evidence** | Several 2025 evaluations found graph RAG helps on multi-hop and global-summary questions and *hurts or ties* on simple factual QA relative to plain retrieval | — | Han et al., *RAG vs. GraphRAG: A Systematic Evaluation and Key Insights*, 2025 is the handle the author recalls | `[recall: medium]` |

**7.3 Is graph retrieval over a rule graph sound? Yes in principle; and for this repo it is the wrong tool.** The kernel is sound: a rule that is not in context cannot degrade adherence to the rules that are, so retrieval sets `n` per task. But every GraphRAG-family technique exists to *discover* structure in unstructured text. A rule set is not unstructured: its author knows which rules concern spacing, which concern copy, which apply to `/checkout`, and which apply everywhere. **Entity extraction, community detection and embeddings are machinery for recovering a structure the rule author could simply have written down.** The right graph is a two-key index — `rule × path-scope` (shipped) and `rule × task-type` (not shipped) — and the missing primitive is the second key: "when the task is *repair a visual defect*, load the craft floor and the seam checks; when it is *generate a new screen*, load the state lattice and the anti-slop rules; when it is *write copy*, load the voice rules." That is a bipartite graph with perhaps ten task-type nodes, and it can be implemented today as one skill per task type with the relevant rules in its body, or as a `/repair`-style command that loads its rules on invocation (doc 02's candidate pick).

**7.4 Failure modes, which are the real content of this section.**

1. **Silent non-retrieval.** A gate that does not run is visible in CI; a rule that was not loaded fails silently — the miss looks exactly like a miss the rule would have caught. Retrieval converts a bloat tax into a recall risk, and nothing in the loop reports retrieval recall. Mitigation: log which rules were loaded per generation (a `rules_loaded` field on the Generation node in §6), so `expected_catcher` can distinguish "loaded and ignored" from "never loaded".
2. **Global rules do not benefit.** Voice, tokens, the state lattice apply to every task; retrieval cannot shrink them. The residual always-loaded set is the true `n`, and doc 07's cap applies to it.
3. **Index staleness.** The rule → task mapping is itself a maintained artifact; doc 07's "added, never deleted" trajectory applies to it too.
4. **Retrieval spends the budget it saves.** Aider bounds its map at 1k tokens for a reason; a rule index that costs a retrieval call and a listing per turn can cost more context than the rules it excludes.
5. **Conflict survives retrieval.** If *Instruction Stacking Collapse* is right that pairwise conflict rather than count drives collapse (doc 06 §5.3, `[search summary]`, unassessable here), two conflicting rules retrieved together still collapse. See §13.

**Verdict.** Graph-structured retrieval over rules is sound; **GraphRAG and kin are overkill by two orders of magnitude** for any rule set a designer maintains. Build the task-type key (an afternoon: ten skills or commands with their rules inside), log what was loaded, and measure `k` per doc 07's E2 on the *loaded* count. Do not embed, cluster or summarise nine rules.

**Open questions:** Whether task-type scoping measurably raises adherence versus a flat 200-line file is E2 with one more arm, and costs about the same $8.

---

## 8. UI as a graph: trees, tree diffs and screen embeddings

**What it is:** A rendered UI is several trees at once — the DOM, the CSSOM, the layout/render tree, the accessibility tree — and a body of HCI work treats screens as graphs for similarity, retrieval and generation. Two of the stream's open problems live here: detecting collateral damage between generations (doc 02 step 10, doc 04 §6) and composing an anchor set that spans the task mix (doc 03 §8).

**Why it matters:** Doc 04 §6 says the regression that matters after a patch "lives exactly at the boundary the local check never crosses", and proposes component-scoped screenshot diffs. A structural diff on the right tree is cheaper, deterministic, and — unlike a pixel diff — tells you *which node* changed.

**Key findings:**

**8.1 The trees, and which one to diff.**

| Tree | What it carries | Fit for collateral-damage detection |
|---|---|---|
| DOM | Everything, including noise (wrapper divs, hydration ids, class hashes) | Too noisy raw; fine after normalisation |
| Accessibility tree | Roles, names, states, structure — what the user can act on | **The right one.** Playwright exposes it as a YAML snapshot with `toMatchAriaSnapshot`, supports partial matching (omit attributes or children), regex names, and updates via `--update-snapshots` with a `patch` mode that emits a unified diff for `git apply` ([Playwright aria-snapshots.md](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/aria-snapshots.md) `[fetched]`). Doc 06 §7.1 already notes playwright-mcp is "accessibility-snapshot-first" |
| Layout tree / computed styles | Geometry and resolved values | Needed for the *value* half of doc 04's seams (spacing, radius, weight); pair it with the a11y tree for the *structure* half |
| Pixels | Everything and nothing | The last resort; owned by [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) |

**8.2 Tree diff algorithms, and why the classical one is overkill here.** Tree edit distance (Zhang & Shasha, SIAM J. Computing 1989 `[recall: high]`) gives the minimum-cost edit script between ordered labelled trees; APTED is the current state of the art and returns both the distance and the node mapping ([DatabaseGroup/apted](https://github.com/DatabaseGroup/apted) `[fetched]`, MIT, 132★, last push 2018; README cites Pawlik & Augsten, TODS 2015 and Information Systems 2016). GumTree does the same for ASTs with move/rename detection ([GumTreeDiff/gumtree](https://github.com/GumTreeDiff/gumtree) `[fetched]`, LGPL-3.0, 1,334★; Falleri et al., ASE 2014). General graph edit distance is NP-hard `[recall: high]`, which is why everyone works on trees. **For the collateral-damage question none of this is needed**, because the question is not "what is the minimal edit" but "did anything change *outside the declared scope*":

> **Merkle-hash the a11y tree.** Hash each node over (role, name, states, children's hashes). After a patch, every subtree whose hash changed is a changed subtree. Subtract the subtree the patch *declared* (the `BOUNDS` block of doc 02's minimal-diff prompt, mapped to a selector). **Anything left is collateral.** O(n), deterministic, and it names the node. Do the same over computed-style vectors per node for the value seams.

That is `[reasoning]`, it is about forty lines against a Playwright page, and it is a strictly better first implementation of doc 02's step 10 than a page-level pixel diff. React's reconciliation is itself a linear-time heuristic tree diff `[recall: high]`, so the framework already computes most of this and throws it away.

**8.3 Screens as graphs in the HCI literature.** For the next session's map, the line of work and how it bears on the stream:

| Work | What it is | Bears on | Grade |
|---|---|---|---|
| **Rico** — Deka et al., UIST 2017 | ~72k Android screens with view hierarchies and interaction traces; the corpus under most of the rest. The UIBert README confirms "72k mobile app UI data" ([google-research-datasets/uibert](https://github.com/google-research-datasets/uibert) `[fetched]`, archived) | The only large public corpus with *structure*, not just pixels | `[fetched]` for the count; `[recall: high]` for the rest |
| **Enrico** — Leiva, Hota, Oulasvirta, MobileHCI Adjunct 2020 | 1,460 Rico screens hand-classified into 20 design topics (Login 141, List 265, Form 103, Modal 67, Settings 90, …), with view hierarchies and semantic wireframes ([luileito/enrico](https://github.com/luileito/enrico) `[fetched]`, MIT, 75★) | **Directly useful for doc 03 §8's anchor-set composition**: its twenty topics are a ready-made stratification for "a minitest that mirrors your task mix" | `[fetched]` |
| **Learning Design Semantics for Mobile Apps** — Liu et al., UIST 2018 | Semantic annotation of Rico: ~25 component categories, text-button concepts, icon classes | The vocabulary behind Enrico's wireframes | `[recall: medium-high]` |
| **Screen2Vec** — Li et al., CHI 2021 | Screen embeddings from text, GUI class and layout, using the view hierarchy | Retrieval: "find screens like this" | `[recall: high]` |
| **UIBert** — Bai et al., 2021 (arXiv 2107.13731 per the README) | Multimodal UI representation; downstream tasks include similar-element retrieval across apps | Element-level similarity | `[fetched]` for existence |
| **ActionBert** (He et al., AAAI 2021); **Spotlight** (Li & Li, ICLR 2023, vision-only); **Screen Recognition** (Zhang et al., CHI 2021, Apple — inferring an a11y tree from pixels) | Successors; the last is the one that matters if the artifact has *no* DOM | Screen Recognition would let the a11y-tree diff run on a Figma export | `[recall: high]` |
| **LayoutGMN** — Patil et al., CVPR 2021 | Graph matching network for *structural layout similarity* — the literal "graph matching for screen comparison" | Similarity, not diff; learned, not exact | `[recall: medium-high]` |
| **Neural Design Network** — Lee et al., ECCV 2020 | GNN over layout constraints for generation | Generation; peripheral | `[recall: medium-high]` |
| **UICrit** — Duan et al., UIST 2024; **Duan et al., CHI 2024** on LLM heuristic feedback | Human critiques with bounding boxes on Rico screens; LLM heuristic evaluation | Already owned by [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) | `[recall: high]` |

**8.4 Verdicts.** (a) **For collateral damage**, use the a11y-tree Merkle diff plus a computed-style diff, scoped by the patch's declared bounds; tree edit distance is overkill and pixel diffs are the fallback. (b) **For screen similarity** — anchor-set composition, "have I seen this class of screen before" — GNN embeddings are overkill; Enrico's twenty topics as a manual label are enough, and the DiffSpot lesson ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) is that learned visual representations are exactly the wrong instrument for small CSS deltas. (c) **For grading**, the a11y tree is the input a judge should get *alongside* the screenshot — which is E7, asked one layer down.

**Open questions:** Whether an a11y-tree diff catches the seams doc 04 names (neighbour disagreement is a *value* seam, invisible to the role/name tree) is a question the computed-style diff answers; nobody has published a base rate for either.

---

## 9. A design property graph: real construct or category error

**What it is:** A *code property graph* merges the AST, control-flow graph and program-dependence graph of a program into one graph so that queries can traverse across the layers — the canonical use is taint tracking from an input source through control flow to a dangerous sink (Yamaguchi, Golde, Arp, Rieck, *Modeling and Discovering Vulnerabilities with Code Property Graphs*, IEEE S&P 2014 `[recall: high]`). Joern is the reference implementation: "a graph representation of code for cross-language code analysis… stored in a custom graph database… mined using search queries formulated in a Scala-based domain-specific query language" ([joernio/joern](https://github.com/joernio/joern) `[fetched]`, Apache-2.0, 3,489★). CodeQL is the same idea over a relational store with a Datalog-flavoured language `[recall: high]`. The question is whether a **design property graph** — tokens, components, states, routes, criteria, as one queryable graph — is a real construct.

**Why it matters:** §5, §6 and §8 each build a graph. If they are layers of one graph, cross-layer queries become possible: "which routes render a component that consumes a token whose resolved contrast fails at 390px in dark mode" is a four-layer traversal and is exactly the kind of question doc 04's craft floor answers today by running everything everywhere.

**Key findings:**

**9.1 It is not a category error, because the layers already exist as graphs — separately.**

| Layer | Exists today as | Evidence |
|---|---|---|
| Token alias graph | Style Dictionary reference resolution; Tokens Studio's graph engine (tokens as expressions over tokens); the DTCG format the tools converge on | [style-dictionary](https://github.com/amzn/style-dictionary), [graph-engine](https://github.com/tokens-studio/graph-engine), [design-tokens/community-group](https://github.com/design-tokens/community-group) — all `[fetched]` |
| Token → component consumption | **`@lapidist/design-lint`** describes itself as "a Design System Runtime… backed by a long-lived kernel daemon that holds the authoritative token graph in memory", built on its DTIF format, with an MCP server and a `DESIGN_SYSTEM.md` generator | [bylapidist/design-lint](https://github.com/bylapidist/design-lint) `[fetched]` — **this is the source repository doc 04 §1.10 could not locate**; found via the npm record's `repository` field ([registry](https://registry.npmjs.org/@lapidist/design-lint) `[fetched]`, MIT, 8.0.0, modified 2026-05-12). Star count not fetched. Whether "DSQL" is a graph query language is not stated in the README and stays unverified |
| Component import graph | madge, dependency-cruiser, Nx project graph | `[fetched]`, §5 |
| Route → component render map | Not a product; a crawl (§5.2) | `[reasoning]` |
| Component → states | The eight-state lattice, stories, or the construction file's `states` slot | Doc 04 §1.5; [prototype-construction/13](../prototype-construction/13-schema-evolution-and-migration.md) |
| Criterion → class → defect | §6 | `[reasoning]` |

**9.2 What CPG actually bought, and whether design gets the same.** CPG's value was not the merged storage; it was that a *single traversal* could cross from syntax into data flow into control flow, which made "source reaches sink" one query instead of three tools and a join. The design analogue needs a traversal that crosses at least three layers to be worth a join. The three that come up in this stream:

1. *Token change → affected routes* (token graph → consumption → render map): the blast-radius query, §5.
2. *Criterion → covered class → defects found in artifacts generated under a rubric version*: the recurrence query, §6.
3. *Route → component → token → resolved value → contrast at viewport/theme*: the craft-floor-as-query, which would let axe-style checks run *by selection* rather than by rendering every route at every viewport.

The first two are two-layer and the join is a SQL join. The third is the only genuinely CPG-shaped one, and it collapses in practice because **resolved CSS values are not a static property** — cascade, inheritance and media queries mean the value at a node is only known after layout at a given viewport. A design property graph that stores *resolved* values is a snapshot of one render, not a graph of the system; one that stores *unresolved* references cannot answer the contrast question without rendering. Code has the same problem with dynamic dispatch, and CPG lives with an approximation; design's approximation is worse because the cascade is global.

**9.3 Verdict.** A design property graph is a **real construct as a schema and a category error as a product** at this scale. Keep the layers as separate edge lists (token aliases, token consumption, imports, render map, coverage), each produced by the tool that already produces it, and join them in SQL when a query needs two of them. That gives every cross-layer question this stream has asked. The moment you find yourself writing a traversal language, stop: Joern needs a JDK and a custom graph database to answer questions about programs; nine rules and forty components do not need any of that. **Overkill:** a unified graph store, a DSL, anything that stores resolved styles as if they were static facts.

**Open questions:** Whether `@lapidist/design-lint`'s in-memory token graph exposes the consumption edges (component → token) through its MCP server would decide whether layer 2 is free; the README does not say and the docs site was not reachable.

---

## 10. Provenance graphs for generation → defect → fix lineage

**What it is:** The repo's ledger ([design-sdlc/03](../design-sdlc/03-prototype-governance-outside-the-codebase.md)), the grade record ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) and doc 01's defect record are all reaching toward provenance: *which generation, under which rubric, with which model, produced the artifact in which this defect was found and which fix repaired it.* There is a W3C standard for exactly that shape, and three industrial lineage models built on the same idea.

**Why it matters:** Provenance is the part of §6's schema that does not depend on the stream's vocabulary. Naming the edges with the standard's names costs nothing now and makes the ledger exportable, comparable and — if anyone ever publishes a defect-recurrence dataset — mergeable.

**Key findings:**

**10.1 PROV-DM in one table.** The W3C PROV data model (Recommendation, 2013 `[recall: high]`) has three node types — **Entity**, **Activity**, **Agent** — and a small closed set of relations. Mapping the stream onto it:

| PROV relation | Stream meaning | §6 edge |
|---|---|---|
| `wasGeneratedBy(Entity, Activity)` | Artifact was generated by a Generation run | `PRODUCED` (reversed) |
| `used(Activity, Entity)` | The Generation used a rubric version, a skill, a catalog | `USED` |
| `wasAssociatedWith(Activity, Agent)` | The Generation ran under a model; the fix was made by a designer | model id / `recorded_by` |
| `wasDerivedFrom(Entity, Entity)` — with subtype `wasRevisionOf` | Round *n* artifact derives from round *n−1* | `DERIVED_FROM` |
| `wasAttributedTo(Entity, Agent)` | The defect record was written by rater `r_42` | `provenance.recorded_by` |
| `wasInvalidatedBy(Entity, Activity)` | A criterion was retired by a rubric change | the `RETIRED` property, as an event |
| `wasInformedBy(Activity, Activity)` | The fix activity was informed by the discovery activity | `REPAIRS`, seen from the activity side |

The recurrence query in PROV terms: *a Defect entity `wasGeneratedBy` a discovery activity on an Artifact that `wasGeneratedBy` a Generation that `used` a RubricVersion which already contained a Criterion covering the Defect's class.* Same query, standard names.

**10.2 The industrial models, for comparison.** OpenLineage: "a generic model of run, job, and dataset entities… extensible by defining specific facets" ([OpenLineage](https://github.com/OpenLineage/OpenLineage) `[fetched]`, Apache-2.0, 2,654★, LF AI & Data) — run/job/dataset is Activity/plan/Entity with a different accent. ML Metadata: artifacts, executions and contexts for ML pipelines ([google/ml-metadata](https://github.com/google/ml-metadata) `[fetched]`, Apache-2.0, 685★). SLSA provenance and in-toto attestations do the same for software supply chains ([slsa-framework/slsa](https://github.com/slsa-framework/slsa) `[fetched]`); C2PA does it for media `[recall: high]`. Git itself is a provenance DAG over file trees, which is why doc 02's "the only checkpoint you should trust is a commit" is also a provenance statement.

**10.3 Verdict.** **Adopt the vocabulary, not the stack.** Name the ledger's columns and the §6 edges after PROV relations (`used`, `wasGeneratedBy`, `wasDerivedFrom`, `wasInvalidatedBy`); that is a five-minute renaming with a permanent payoff. **Do not** adopt PROV-O, RDF, SPARQL or a lineage server; OpenLineage's event model is closer to the stream's grain than PROV-O is, and even it is overkill for one designer's SQLite. The one place a standard would pay is if the repo ever publishes its defect ledger as the dataset the stream says nobody has: then PROV-named columns make it citable as provenance rather than as a spreadsheet.

**Open questions:** None that block adoption; the mapping above is `[reasoning]` and the relation names are `[recall: high]`.

---

## 11. Causal graphs, and the design that answers "did the criterion cause it"

**What it is:** Doc 07 §7.3 is explicit that its run chart is "a change-detector, not an experiment" and cannot prove the rubric caused a drop. The confounders it names are severe: the model changes under you, the brief gets smaller as you get better at briefing, the rubric's presence changes your own attention (Hawthorne on yourself), and regression to the mean after the bad week that prompted the rubric. Causal inference has a vocabulary and a design for exactly this: draw the DAG, find the backdoor paths, and pick a design that blocks them.

**Why it matters:** E3's stronger form — "give half the recurring classes a durable artifact and half nothing, and compare" — is the right instinct and, stated a little more carefully, it is a **stepped-wedge design across defect classes**, which is the one design that cancels the model-change confounder without a control group of people.

**Key findings:**

**11.1 The DAG.** Nodes: `Criterion added for class C` (the treatment), `Recurrence of C` (the outcome), `Model version`, `Brief size`, `Designer attention`, `Time`. Backdoor paths from treatment to outcome run through *time* — every confounder above is a function of calendar time, and so is the decision to add a criterion (you add it after a bad week). Blocking them requires a comparison that holds time fixed. Tooling to draw and check this: DAGitty, a browser DAG editor and R package that finds adjustment sets ([jtextor/dagitty](https://github.com/jtextor/dagitty) `[fetched]`, GPL-2.0, 349★; README cites Textor et al., IJE 2017). Pearl's backdoor criterion is `[recall: high]`.

**11.2 The designs, ordered by what they cost a solo designer.**

| Design | What it does | Handles the model-change confounder? | Cost | Handle | Grade |
|---|---|---|---|---|---|
| **Run chart with annotated median restarts** (doc 07) | Detects a level shift after an annotated change | No — it *restarts* at model changes, throwing away the comparison | Free | Perla, Provost, Murray, BMJ Qual Saf 2011 (doc 07's) | — |
| **Interrupted time series / segmented regression** | Fits level and slope before and after the intervention | Only if no other change coincides; a model swap in the window breaks it | A spreadsheet regression | Wagner, Soumerai, Zhang, Ross-Degnan, J Clin Pharm Ther 2002; Bernal, Cummins, Gasparrini, *Interrupted time series regression for the evaluation of public health interventions: a tutorial*, IJE 2017 | `[recall: high]` |
| **CausalImpact** (Bayesian structural time series with control series) | Predicts the counterfactual from control series unaffected by the intervention; the README's own caveat: "assumes that the outcome time series can be explained in terms of a set of control time series that were themselves not affected by the intervention" | **Yes, if the control series are other defect classes** — they see the same model swap | R or Python package; needs a dozen-plus points per series | [google/CausalImpact](https://github.com/google/CausalImpact) `[fetched]`, Apache-2.0, 1,860★; Brodersen et al., Annals of Applied Statistics 2015 (linked from the README) | `[fetched]` |
| **Difference-in-differences** | Change in treated classes minus change in untreated classes over the same window | **Yes** — the model swap hits both arms | A 2×2 table | Standard; Card & Krueger 1994 is the canonical citation | `[recall: high]` |
| **Stepped wedge across classes** | Every recurring class eventually gets its artifact, but at staggered, ideally randomised, times; each class is its own control until treated, and every calendar week contains both treated and untreated classes | **Yes, and it is the natural shape of the ratchet** — you were going to add criteria one at a time anyway; the design only asks that the *order* be randomised and the dates recorded | The §6 ledger, with `COVERED_BY.since` as the step date | Hussey & Hughes, *Design and analysis of stepped wedge cluster randomized trials*, Contemporary Clinical Trials 2007; Hemming, Haines, Chilton, Girling, Lilford, BMJ 2015 tutorial | `[recall: high]` |
| **Negative-control outcome** | A class that received *no* artifact should show no drop; if it drops too, something else moved | Detects the confounder rather than blocking it | Free — it is the untreated arm | Lipsitch, Tchetgen Tchetgen, Cohen, *Negative controls*, Epidemiology 2010 | `[recall: high]` |
| **Placebo / sham criterion** | Add a criterion for class C′ that is *non-actionable* (restates the class name with no failure condition); if C′ drops as much as C, the effect is attention, not content | Isolates Hawthorne-on-yourself | One line | Doc 07's canary criterion is already a placebo *for readership*; this is a placebo *for effect* | `[reasoning]` |
| **Full structural causal modelling** (DoWhy: model → identify → estimate → refute) | Explicit identification and refutation tests | Yes, given the DAG | Python; the refutation step is genuinely useful | [py-why/dowhy](https://github.com/py-why/dowhy) `[fetched]`, MIT, 8,316★ | `[fetched]` |
| Synthetic control | Weighted combination of untreated units as the counterfactual | Yes | Needs many donor units — more classes than the taxonomy has | Abadie, Diamond, Hainmueller, JASA 2010 | `[recall: high]` |

**11.3 The recommended design, stated so E3 can adopt it.** *Record `since` dates on every `COVERED_BY` edge; introduce criteria for recurring classes in a randomised order rather than worst-first; treat each class-week as an observation with a binary "covered" flag; estimate the covered-vs-uncovered difference in recurrence within each week and average across weeks.* That is a stepped wedge, it needs no library, and it cancels every confounder that is a function of calendar time — including the model swap — because both arms live in the same week. Its two costs: you must resist adding the criterion for the class that hurt most this week (randomise the order), and you need enough classes (doc 01's twelve is thin; the `wrong-v2` categories crossed with surface type gives more units). Its remaining weakness is spillover: a criterion for "empty state useful" plausibly improves error-state copy too, which contaminates the control arm toward the null — so a positive result is conservative.

**Verdict.** **Build the design, not the toolchain.** A stepped wedge over classes with a negative control and a placebo criterion is a spreadsheet and a coin. CausalImpact is the first library worth reaching for, and only once there are twenty-plus weekly points per class; DoWhy's refutation step is worth running once, for the record. Synthetic control and anything that fits a structural model to a dozen classes is overkill.

**Open questions:** The spillover structure between classes (which criteria plausibly affect which other classes) is itself a graph, and drawing it is what decides whether any class can serve as a control for another.

---

## 12. Graph metrics as rubric health

**What it is:** Doc 03 §6 drives the six rubric moves (add, split, merge, retire, tighten, demote) off six telemetry series, including inter-criterion correlation and fire rate, and says no platform surfaces them. Cast the telemetry as a **bipartite graph** — criteria on one side, defect classes (or artifacts) on the other, an edge per fire — and every one of doc 03's signals is a standard graph measure with a standard name.

**Why it matters:** Not because a graph library is needed — it is not — but because the graph vocabulary tells you exactly which pivot tables to build, and it exposes two signals doc 03 does not have (dominated criteria, and uncovered classes).

**Key findings:**

| Graph measure on the criterion–class bipartite graph | Meaning | Doc 03 move it licenses | How to compute it without a graph library |
|---|---|---|---|
| **Degree of a criterion** (edges over a window) | Fire count | Retire at zero over 20 artifacts (doc 07 rule 1) | `COUNT(*) GROUP BY criterion` |
| **Isolated criterion node** | Never fired | Retire, or it is documentation (doc 07 rule 2) | Left join against the criterion list |
| **Degree of a class node = 0** | A taxonomy class no criterion or gate has ever fired on | **Coverage gap** — the class is either not occurring (fine) or occurring and uncaught (the gate backlog in doc 01 §8) | Left join against the class list |
| **Jaccard similarity of two criteria's neighbourhoods** | They fire on the same artifacts | **Merge** when ≥ ~0.9 and no artifact separates them — the set-valued version of doc 03's Pearson r > 0.9 | Pivot: artifacts × criteria, then pairwise intersection over union |
| **Neighbourhood containment** — N(A) ⊆ N(B) | A never fires without B | **Dominated criterion**: A is redundant given B (a signal doc 03 lacks) | Same pivot; check subset |
| **Connected components of the criterion projection** | Clusters of criteria that co-fire | The halo effect of doc 03 §4, as structure | Union-find over the pairwise table |
| **Edge weight over time** — fires per criterion per week | Trend | Tighten if the class still escapes despite fires; demote when a gate reproduces the verdict | The run chart, per criterion |
| **Time-sliced degree since `COVERED_BY.since`** | Fires on a class *after* it was covered | **The repeat-offence rate, per criterion** — the §6 query, projected | The §6 SQL |

**Verdict.** This is a pivot table wearing graph vocabulary, and that is the point: build the pivot (artifacts × criteria, one boolean per cell — which the grade record in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) already carries), compute degrees, Jaccard and containment on it, and stop. Betweenness, PageRank and community detection on twelve criteria are decoration. **Overkill:** NetworkX is fine; anything heavier is not; a visualisation of the bipartite graph is pleasant and changes no decision.

**Open questions:** With prevalence skew (§3.4), Jaccard on rare criteria is unstable; require a minimum degree before a merge is licensed.

---

## 13. The rule-conflict graph

**What it is:** Doc 06's gap #2: no tool audits a rules file for pairwise conflict, though the vendor documents that contradictions are resolved arbitrarily and `/doctor` trims only *derivable* content. If *Instruction Stacking Collapse* (unassessable here) is right that conflict rather than count drives collapse, this is the highest-value missing tool in doc 06's survey. It is a graph problem: rules as nodes, an edge per detected contradiction.

**Why it matters:** It is the only technique in Part B that addresses a gap the stream ranked as potentially decisive, and it is cheap at the stream's scale.

**Key findings:**

- **Construction.** For `n` rules, `n(n−1)/2` pairs. At `n = 40` that is 780 pairs; at doc 07's median 80 statements, 3,160; at the 949-line file, into the hundreds of thousands — which is itself an argument the file is too long. Each pair gets a three-way label — *independent*, *reinforcing*, *conflicting* — from an NLI classifier or a small-model judge with a fixed prompt. Off-the-shelf NLI models do this for sentence pairs `[recall: high]` and a judge does it acceptably; both produce false positives that a human clears in minutes at `n ≤ 60`.
- **What the graph then gives.** Conflicting edges are the finding. Connected components of the conflict subgraph are rule *clusters that cannot all be satisfied*; a rule with high conflict degree is a candidate to delete or scope (path-scope it so it never co-loads with its antagonists — §7). Reinforcing edges with Jaccard-high phrasing are near-duplicates, the redundancy signal for rules that §12 gives for criteria.
- **The join with retrieval (§7).** Two rules that conflict only matter if they are *loaded together*. Path- and task-scoping can dissolve a conflict without deleting either rule; the conflict graph tells you which pairs need separate scopes. That is a legitimate reason to keep two "contradictory" rules — in different scopes — and the only principled one.
- **Cost.** One script, one model call per pair, run monthly and on every rule addition. Cents at `n = 40`. **Overkill:** a rules DSL with formal semantics; anything that tries to prove consistency rather than flag likely contradiction.

**Verdict.** Build it. It is the cheapest technique in this document, it targets a gap doc 06 ranks near the top, and it makes doc 07's `k` measurable *per conflict pair* rather than per line — which, if the conflict hypothesis holds, is the number that actually matters.

**Open questions:** Whether contradiction detection between imperative rules ("never use `#000`" vs "use pure black for print surfaces") is reliable enough without an explicit scope model is untested; the false-positive rate is the number to measure first.

---

## Cross-cutting themes

1. **The stream's headline survives a recall check and gets stronger.** The adjacent literatures — defect prevention, static analysis at scale, inspection checklists, medical checklists, regression testing — are rich, and none measures "durable line added → recurrence of the class fell". Where recurrence provably drops it is because the class became impossible (compile-time checks), and where the countermeasure is text the human evidence splits on implementation, not content (Haynes/Pronovost vs Urbach; Porter–Votta–Basili). The stream's "gate over sentence" ordering is not an AI quirk; it is what checklists have always done.
2. **Recall can vouch for the classics and not for the 2026 papers, and the 2026 papers carry the contradictions.** Hodges, Ilgen, IFScale, CheckEval, METR's RCT, ODC, PROV, RTS — recognised. W4A 2026, CHI 2026, regression accumulation, rubric reward hacking, self-attribution bias — not. The verification queue below is ordered accordingly.
3. **One methodological caveat is worth carrying even before verification:** a heuristic inspection of static screens cannot see error recovery, error prevention or expert efficiency, so V6's "measurably fails on the functional half" may be partly an instrument effect. Soften it until the CHI paper's method is read.
4. **Every graph problem in this stream is small.** Hundreds of nodes, thousands of edges, a designer's SQLite. The graph vocabulary is worth adopting because it names edges and dates correctly and tells you which pivots to build; graph *infrastructure* — databases, DSLs, GNNs, GraphRAG, structural causal models — is overkill at every point it was considered, and this document says so at each.
5. **Three of the stream's artifacts are the same object.** Doc 02's blast radius, doc 04's neighbour-disagreement seam, and doc 07's re-verification cost are all "the affected set of a patch", computable from three edge lists. Doc 01's `cheapest_gate`, doc 03's `COVERED_BY`, and doc 07's repeat-offence rate are all one two-hop query over the §6 schema, blocked today by two missing fields.
6. **Retrieval converts a bloat tax into a recall risk.** Scoping rules per task is the right fix for doc 07's `n`, and it creates a failure that nothing in the loop reports: a rule that was not loaded. Log what was loaded, or `expected_catcher` cannot distinguish "ignored" from "absent".
7. **The right experiment for E3 is a stepped wedge, and the ratchet already has that shape.** Criteria get added one at a time anyway; randomise the order and record the dates, and every week contains its own control. The model changing under you stops being a confounder because it hits both arms.

---

## Recommendations: the verification queue and the graph-techniques map

### Table 1 — Prioritised verification queue

Ordered by how much a verification would change. "Hardens" means a confirmation supports the doc's claim as written; "overturns" means the recall or caveat here suggests the doc's phrasing may need to change.

| # | Claim | Grade here | Verification handle (title · first author · venue · year · search string) | Stream doc it would harden or overturn |
|---|---|---|---|---|
| 1 | Prompting for accessibility *decreased* WCAG compliance (W4A 2026) | `[recall: none]`; adjacent precedent `[recall: medium-high]` | *Generated Inaccessible: Measuring WCAG Violations in AI UI Design Tools* · W4A 2026 · search `"Generated Inaccessible" W4A 2026`; and Aljedaani et al., *Does ChatGPT Generate Accessible Code?* · W4A 2024 | Hardens or overturns [01 §2.5](01-anatomy-of-a-miss.md), [03 §3](03-from-miss-to-rubric-line.md), synthesis contradiction (b). If the manipulation was a *generic* a11y prompt, the claim stands; if it was violation-specific, Aljedaani 2024 predicts the opposite and V-b needs rewording |
| 2 | CHI 2026 EA: low heuristic support concentrated on H10/H9/H7/H5 | `[recall: none]`; instrument caveat `[reasoning]` | *Looks Good, But Is It Usable?* · CHI 2026 EA · read the **method**: were screens static or interactive? | Softens [04 §2](04-design-craft-as-checkable-criteria.md) and V6 if the evaluation was on static screens |
| 3 | Hodges 1999 checklist inversion | `[recall: high]` | Hodges · *OSCE checklists do not capture increasing levels of expertise* · Academic Medicine 74(10) · 1999; companions Regehr 1998 (Acad Med), Cunnington/Norman ~1997 (*The risks of thoroughness*) | Hardens [03 §5](03-from-miss-to-rubric-line.md) and contradiction (a); add the psychiatric-interview caveat |
| 4 | Ilgen 2015 pooled reliabilities (0.92 vs 0.66) | Existence `[recall: high]`; digits `[recall: medium]` | Ilgen · *A systematic review of validity evidence for checklists versus global rating scales in simulation-based assessment* · Medical Education 49(2) · 2015 | Hardens [03 §5](03-from-miss-to-rubric-line.md); confirm the digits before quoting |
| 5 | METR: 19% slower; CI; Feb-2026 update numbers | RCT `[recall: high]`; CI `[recall: medium]`; update numbers `[recall: low]` | Becker, Rush, Barnes, Rein · METR · July 2025 · arXiv 2507.09089 Appendix D; and METR's February 2026 study-design note · search `METR uplift update February 2026 "developer productivity"` | Hardens [05 §6.1](05-practitioner-field-guide-x.md) and [07 §2.1](07-loop-economics-and-ownership.md); the −18% / (−38%, +9%) figures should not be repeated until read |
| 6 | Rubric reward hacking 85.8% / 78.4% | `[recall: none]`; precedents `[recall: high]` | arXiv 2605.12474; precedents Gunjal et al. *Rubrics as Rewards* 2025; Viswanathan et al. *Checklists Are Better Than Reward Models* 2025 | Hardens [03 §7](03-from-miss-to-rubric-line.md) |
| 7 | Regression accumulation 40–73%; Verification Gate | *post-cutoff* | arXiv 2607.01855 · July 2026 | Hardens [02 §1–2](02-patch-regenerate-or-restart.md), V2 |
| 8 | Self-attribution bias, 5× | `[recall: none]` | arXiv 2603.04582 · Khullar et al. · March 2026 | Hardens [07 §5.2](07-loop-economics-and-ownership.md) and the "grade in a fresh session" rung |
| 9 | IFScale vs Arize replication vs Instruction Stacking Collapse | IFScale `[recall: high]`; others `[recall: none]` | Jaroslawicz · *How Many Instructions Can LLMs Follow at Once?* · 2025; arXiv 2608.02639 · Aug 2026 | Decides [07 §4](07-loop-economics-and-ownership.md)'s `k` interpretation and whether §13 here is the highest-value tool |
| 10 | The κ-under-skew correction | `[recall: high]` | Feinstein & Cicchetti · *High agreement but low kappa* · J Clin Epidemiol 43(6) · 1990; Cicchetti & Feinstein (same volume) on specific agreement; Byrt, Bishop, Carlin 1993 (PABAK); Gwet 2008 (AC1) | **Corrects** [03 §6](03-from-miss-to-rubric-line.md)'s "report κ, and only κ" for rare-firing criteria |
| 11 | Porter–Votta–Basili: checklist reading not reliably better than ad hoc | `[recall: high]` on direction | Porter, Votta, Basili · *Comparing Detection Methods for Software Requirements Inspections: A Replicated Experiment* · IEEE TSE 21(6) · 1995 | Hardens synthesis contradiction (b) from the human-inspection side |
| 12 | Urbach 2014 null on mandated surgical checklists | `[recall: high]` | Urbach, Govindarajan, Saskin, Wilton, Baxter · *Introduction of Surgical Safety Checklists in Ontario, Canada* · NEJM 370 · 2014; contrast Haynes et al. NEJM 360 · 2009 | Hardens [07 §6.1](07-loop-economics-and-ownership.md)'s Sign Out argument and the "text alone does nothing" ordering |
| 13 | IBM Defect Prevention Process measured defect-rate reduction | Existence `[recall: medium-high]`; magnitude `[recall: low]` | Mays, Jones, Holloway, Studinski · *Experiences with Defect Prevention* · IBM Systems Journal 29(1) · 1990; Card · IEEE Software · 1998 | The one adjacent number the stream could cite for the hole; read the magnitude from the paper |
| 14 | Chernak 1996: checklists synthesised and updated from defect data | `[recall: medium]` | Chernak · *A Statistical Approach to the Inspection Checklist Formal Synthesis and Improvement* · IEEE TSE 22(12) · 1996 | The most on-topic lead for the ratchet-as-method; may contain a before/after |
| 15 | Recurring bug fixes 17–45% (code) | `[recall: medium]` | Nguyen et al. · *Recurring Bug Fixes in Object-Oriented Programs* · ICSE 2010; Kim, Pan, Whitehead · *Memories of Bug Fixes* · FSE 2006 | A prior for E0's kill criterion |
| 16 | Fixes that are bugs, 15–25% (human baseline) | `[recall: high]` | Yin et al. · *How Do Fixes Become Bugs?* · FSE 2011 | Reframes V2: patching regresses, not only agents |
| 17 | Context files: LLM-generated ones help little or hurt | `[recall: low]` — **possible confabulation** | search `AGENTS.md context files coding agents empirical evaluation 2025`; `"context files" LLM-generated human-written agent performance` | If real, the closest direct measurement of "does the rules file help" — bears on [06 §5.3](06-community-practice-and-tooling.md), [07 §4](07-loop-economics-and-ownership.md), and the hole itself |
| 18 | Facebook diff-time vs batch fix rates; Google "not useful" threshold | `[recall: medium]` | Distefano et al. · *Scaling Static Analyses at Facebook* · CACM 62(8) · 2019; Sadowski et al. · *Lessons from Building Static Analysis Tools at Google* · CACM 61(4) · 2018 | Hardens [06 §6.2](06-community-practice-and-tooling.md)'s placement-beats-text claim from a second domain |
| 19 | Dawson's fourteen rubric design elements | `[recall: high]` on the paper; element list `[recall: medium]` | Dawson · *Assessment rubrics: towards clearer and more replicable design, research and practice* · AEHE 42(3) · 2017 | Adds a "which element changed" field to [03 §8](03-from-miss-to-rubric-line.md)'s change record; introduces *secrecy* |
| 20 | `@lapidist/design-lint` source repository | `[fetched]` | [bylapidist/design-lint](https://github.com/bylapidist/design-lint) | **Closes** [04 §1.10](04-design-craft-as-checkable-criteria.md)'s "repo could not be located". Star count since verified by the orchestrator: **3 stars** — which settles the provisional flag below in the negative. It is a real, MIT-licensed tool with an interesting architecture, and it is far too small to meet the curated collection's bar |

### Table 2 — Graph-techniques map

| Technique | The stream's open question it addresses | Build cost for one designer | Verdict |
|---|---|---|---|
| **Reverse reachability over an import graph** (madge / dependency-cruiser) | Doc 02's uncomputed blast radius; doc 07's re-verification term | One command plus ~20 lines; an afternoon with the token edges | **Build** — as test selection, not as a risk score |
| **Dynamic render map** (route × state × component crawl — the Ekstazi move) | The static graph misses slots, context, portals, routes (TDAD's README says so for code) | Half a day; doubles as the route-coverage gate | **Build**, second — without it the static set is unsafe |
| Chromatic TurboSnap / Nx affected | Same, as products | Free if already on Storybook / a monorepo | Use if present; do not adopt a monorepo to get it |
| TDAD-style scored edge tiers | Same, with weights | Already picked (doc 01) | Use the *set*; ignore the weights until something calibrates them |
| **Property-graph schema + two fields on the defect record** (§6) | Doc 06 gap #5, E0, E3, doc 07's repeat-offence rate | Two fields, three CSVs or one SQLite, one join — an hour | **Build first.** Every other measurement in the stream is unrunnable without it |
| Graph database (Neo4j, Kùzu) for the ledger | — | Days, plus operations | **Overkill** at hundreds of nodes; recursive CTEs when path queries arrive |
| **Path- and task-type scoping of rules** (bipartite rule × scope) | Doc 07's `n`; doc 05's 949-line file | Ten skills/commands with rules inside — an afternoon; plus a `rules_loaded` log | **Build**; log what was loaded or the recall risk is invisible |
| Aider-style ranked repo map for rules | Same | Already exists for code in Aider; porting to rules is a weekend | Not needed below ~200 rules; the two-key index suffices |
| GraphRAG / LightRAG / HippoRAG over a rule corpus | Same | Days; indexing cost; GraphRAG itself is in maintenance mode | **Overkill by two orders of magnitude**; machinery for discovering structure the rule author already knows |
| **Merkle-hashed a11y-tree diff, scoped by declared patch bounds** (§8.2) | Doc 02 step 10; doc 04 §6 collateral damage | ~40 lines over Playwright's aria snapshot | **Build** — the first honest implementation of "only the region you touched should differ" |
| Computed-style diff per node | Doc 04's value seams (neighbour disagreement, token improvisation) | ~40 more lines; needs the pre-patch baseline doc 04 already requires | **Build** alongside the tree diff |
| Tree edit distance (APTED, Zhang–Shasha) | Minimal edit scripts between screens | A library call | Overkill for collateral detection; keep as a reference |
| GNN screen embeddings (Screen2Vec, UIBert, LayoutGMN) | Screen similarity; anchor-set composition | Model training or hosting | **Overkill and wrong-shaped** for small deltas; use Enrico's twenty topics as manual strata |
| Screen Recognition (a11y tree from pixels) | Running tree diffs on DOM-less artifacts (Figma exports) | Research model | Only if the pipeline has no DOM; otherwise irrelevant |
| **Separate edge lists joined in SQL** (§9) | Cross-layer queries (token → routes; criterion → defects) | The three edge lists above | **Build** — this *is* the design property graph, kept flat |
| Unified design property graph with a query DSL (Joern-shaped) | Same | Weeks | **Category error as a product** at this scale; resolved styles are not static facts |
| **PROV relation names on the ledger** (§10) | Exportable lineage; a citable dataset if one is ever published | Five minutes of renaming | **Adopt the vocabulary** |
| PROV-O / RDF / OpenLineage server | Same | Days | Overkill; OpenLineage only if a second team needs the events |
| **Stepped wedge across defect classes, with a negative control and a placebo criterion** (§11) | E3's causal question; the model-change confounder | A randomised order, dated `since` edges, a 2×2 per week — a spreadsheet | **Adopt as E3's design** |
| CausalImpact with other classes as control series | Same, once there are 20+ weekly points per class | An R/Python package | Reach for it second |
| DoWhy refutation | Sanity-checking the DAG's assumptions | One notebook | Run once, for the record |
| Synthetic control / full SCM | Same | Needs more units than the taxonomy has | Overkill |
| **Bipartite criterion × artifact pivot with degree, Jaccard, containment** (§12) | Doc 03's six moves; coverage gaps; dominated criteria | A pivot table; NetworkX at most | **Build** — it is doc 03's telemetry with two extra signals |
| Centrality / community detection on twelve criteria | — | — | Decoration |
| **Pairwise rule-conflict graph** (§13) | Doc 06 gap #2; the `k`-by-conflict hypothesis | One script, cents per run at `n ≤ 60` | **Build** — cheapest technique here against a potentially decisive gap |
| Formal rule semantics / consistency proofs | Same | Weeks | Overkill; flag, do not prove |

**The one to build first:** the two fields and the join (§6). Not because it is the most interesting graph — it is the least — but because E0, E3, the repeat-offence rate, the stepped wedge and every rubric-health metric read from it, and nothing in the stream can be measured until it exists. Second: the a11y-tree Merkle diff, because it turns doc 02's step 10 from advice into a check.

---

## Candidate picks for skill-resources

Graded against the bar in [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md); only `[fetched]` items are proposed.

| Name | URL | What it is | Verified this session | Category |
|---|---|---|---|---|
| Playwright aria snapshots | https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/aria-snapshots.md | `toMatchAriaSnapshot`: YAML accessibility-tree snapshots with partial matching, regex names, and `--update-snapshots` emitting a `git apply`-able patch — the substrate for the collateral-damage diff in §8 | `[fetched]` (docs source; playwright.dev itself blocked) | hooks / deterministic design checks |
| dependency-cruiser | https://github.com/sverweij/dependency-cruiser | Dependency graph extraction *with rule validation* (circular, orphan, forbidden edges); MIT, 7,164★, pushed 2026-09-12 | `[fetched]` | guardrails-and-evals |
| madge | https://github.com/pahen/madge | The simplest JSON dependency graph for the §5 reverse-reachability script; MIT, 10,160★ | `[fetched]` | guardrails-and-evals |
| Aider repo map (doc page) | https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/repomap.md | The reference design for budgeted, chat-personalised, graph-ranked context selection — the pattern §7 recommends for rules at the task-type key | `[fetched]` | rules (as a design reference) |
| bylapidist/design-lint | https://github.com/bylapidist/design-lint | Design System Runtime holding "the authoritative token graph in memory", with an MCP server and a `DESIGN_SYSTEM.md` generator; MIT, npm 8.0.0 (2026-05-12). **Resolves doc 04's unlocated-repo item.** Star count verified by the orchestrator at **3** — cite it as an architecture reference, not as a pick; DSQL semantics not verified | `[fetched]` README + npm record | deterministic design checks — *provisional* until stars and the token-consumption edge are checked |
| Enrico | https://github.com/luileito/enrico | 1,460 Rico screens in 20 hand-labelled design topics with view hierarchies; MIT, 75★, last push 2021 — a ready-made stratification for doc 03 §8's anchor set | `[fetched]` | guardrails-and-evals (reference dataset) |
| CausalImpact | https://github.com/google/CausalImpact | Counterfactual estimation from control series; the README's own assumption statement is the caution to carry; Apache-2.0, 1,860★ | `[fetched]` | *proposed:* measurement & instrumentation (doc 07 proposes the category) |
| DAGitty | https://github.com/jtextor/dagitty | Browser DAG editor and R package for adjustment sets; GPL-2.0, 349★ | `[fetched]` | measurement & instrumentation |

Not proposed: Joern, GraphRAG, LightRAG, HippoRAG, Ekstazi, STARTS, APTED, GumTree, DoWhy, OpenLineage, ML Metadata, Tokens Studio graph engine — all `[fetched]`, all real, all overkill for the reasons given in their sections; they are cited as references, not picks.

---

## Sources as verification handles

**Fetched this session** (the only evidence class above recall):

- https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/repomap.md — graph-ranked, chat-personalised repo map within a token budget
- https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/aria-snapshots.md — `toMatchAriaSnapshot`, partial matching, `--update-snapshots` patch mode
- https://github.com/microsoft/graphrag and its raw README — MIT, 35,952★; "indexing can be an expensive operation"; "largely in maintenance mode"; links arXiv 2404.16130
- https://github.com/HKUDS/LightRAG — MIT, 39,592★, EMNLP 2025 per README
- https://github.com/OSU-NLP-Group/HippoRAG — MIT, 3,999★, NeurIPS 2024; indexing-cost claim vs GraphRAG/RAPTOR/LightRAG
- https://github.com/joernio/joern — Apache-2.0, 3,489★; CPG description quoted
- https://github.com/gliga/ekstazi — Apache-2.0, 42★; cites Gligoric, Eloussi, Marinov, ISSTA 2015
- https://github.com/TestingResearchIllinois/starts — 34★; `diff`/`impacted`/`select`; cites Legunsen et al. FSE 2016, ASE Demo 2017
- https://github.com/nrwl/nx — MIT, 29,322★; "runs only what's affected"
- https://github.com/sverweij/dependency-cruiser — MIT, 7,164★ · https://github.com/pahen/madge — MIT, 10,160★
- https://github.com/amzn/style-dictionary — token aliasing example (star count not fetched)
- https://github.com/tokens-studio/graph-engine — MPL-2.0, 69★, alpha, last push 2025-08-06; token expressions over tokens
- https://github.com/design-tokens/community-group — DTCG charter and principles
- https://github.com/bylapidist/design-lint and https://registry.npmjs.org/@lapidist/design-lint — DSR "token graph in memory", MCP server, DTIF; MIT, 8.0.0, 2026-05-12
- https://github.com/OpenLineage/OpenLineage — Apache-2.0, 2,654★; run/job/dataset model · https://github.com/google/ml-metadata — Apache-2.0, 685★ · https://github.com/slsa-framework/slsa
- https://github.com/py-why/dowhy — MIT, 8,316★ · https://github.com/google/CausalImpact — Apache-2.0, 1,860★; assumption statement quoted; links Brodersen et al. 2015 · https://github.com/jtextor/dagitty — GPL-2.0, 349★; cites Textor et al. IJE 2017
- https://github.com/DatabaseGroup/apted — MIT, 132★, last push 2018; cites Pawlik & Augsten TODS 2015, IS 2016 · https://github.com/GumTreeDiff/gumtree — LGPL-3.0, 1,334★; cites Falleri et al. ASE 2014
- https://github.com/luileito/enrico — MIT, 75★; 1,460 UIs, 20 topics · https://github.com/google-research-datasets/uibert — archived, 48★; Rico "72k"; arXiv 2107.13731
- https://github.com/fmguerreiro/tdad-ts — MIT, 1★; edge-tier table; "static import chains miss… route resolution… registry-based dispatch"; names Alonso, Yovine, Braberman, arXiv 2603.17973
- https://github.com/chromaui/chromatic-cli — README fetched; does **not** document TurboSnap, so that claim stays recall

**Recall-graded handles — Part A** (no URLs; title · first author · venue · year; grade as in the text):

- Mays, Jones, Holloway, Studinski · *Experiences with Defect Prevention* · IBM Systems Journal · 1990 · `[recall: medium-high]` existence, numbers low
- Card · *Learning from our mistakes with defect causal analysis* · IEEE Software · 1998 · `[recall: high]`; Kalinowski, Card, Travassos · IEEE Software · 2012 · `[recall: medium]`
- Chillarege et al. · *Orthogonal Defect Classification* · IEEE TSE 18(11) · 1992 · `[recall: high]`
- Sadowski et al. · *Tricorder* · ICSE 2015; Sadowski et al. · *Lessons from Building Static Analysis Tools at Google* · CACM 2018; Distefano et al. · *Scaling Static Analyses at Facebook* · CACM 2019 · `[recall: high]` existence, thresholds medium
- Aftandilian et al. · Error Prone · SCAM 2012 · `[recall: medium-high]`
- Johnson, Song, Murphy-Hill, Bowdidge · ICSE 2013 · `[recall: high]`; Habib & Pradel · ASE 2018 · `[recall: high]`, percentage medium
- Tómasdóttir, Aniche, van Deursen · ASE 2017 and TSE follow-up · `[recall: high]`
- Nguyen et al. · ICSE 2010; Kim, Pan, Whitehead · FSE 2006 · `[recall: medium-high]`, ranges medium
- Yin et al. · *How Do Fixes Become Bugs?* · FSE 2011 · `[recall: high]`
- Fagan · IBM Systems Journal · 1976; Porter, Votta, Basili · TSE 1995; Basili et al. · ESE 1996; Thelin, Runeson, Wohlin · TSE 2003; Chernak · TSE 1996 · grades as in §1
- Ribeiro, Wu, Guestrin, Singh · *CheckList* · ACL 2020 · `[recall: high]`
- Haynes et al. · NEJM 2009; Pronovost et al. · NEJM 2006; Urbach et al. · NEJM 2014; Degani & Wiener · Human Factors 1993 · `[recall: high]`
- Herbsleb et al. · CACM 1997 · `[recall: medium]`
- Just et al. · FSE 2014; Inozemtseva & Holmes · ICSE 2014 · `[recall: high]`
- Hodges et al. · Academic Medicine 1999 · `[recall: high]`; Regehr et al. · Academic Medicine 1998 · `[recall: high]`; Cunnington, Neville, Norman · AHSE ~1997 · `[recall: medium]`; Ilgen et al. · Medical Education 2015 · existence high, digits medium
- Aljedaani et al. · W4A 2024 · `[recall: medium-high]`; Mowar et al. · CodeA11y · CHI 2025 · `[recall: medium]`
- Becker, Rush, Barnes, Rein · METR · July 2025 · arXiv 2507.09089 · `[recall: high]`; METR February 2026 note · existence medium, numbers low
- Jaroslawicz et al. · IFScale · 2025 · `[recall: high]`; Zhou et al. · IFEval · 2023; Jiang et al. · FollowBench · 2023 · `[recall: high]`
- Gunjal et al. · *Rubrics as Rewards* · 2025; Viswanathan et al. · *Checklists Are Better Than Reward Models* · 2025; Skalse et al. · NeurIPS 2022 · `[recall: high]`
- Panickssery, Bowman, Feng · NeurIPS 2024; Wataoka et al. · 2024 · `[recall: high]` / medium-high
- Duan et al. · CHI 2024 (LLM heuristic feedback); Duan et al. · UICrit · UIST 2024 · `[recall: high]`
- Dawson · AEHE 2017 · `[recall: high]`; Reddy & Andrade · AEHE 2010 · `[recall: high]`; Brookhart · Frontiers in Education 2018 · `[recall: medium-high]`; Jonsson & Svingby · ERR 2007 · `[recall: high]`
- IEEE 1044-2009 · `[recall: high]`
- Cohen 1960; Fleiss 1971; Krippendorff; Landis & Koch 1977; McHugh · Biochemia Medica 2012; Feinstein & Cicchetti · J Clin Epidemiol 1990; Cicchetti & Feinstein 1990; Byrt, Bishop, Carlin 1993; Gwet 2008 · `[recall: high]`
- Liu et al. · G-Eval · EMNLP 2023; Zheng et al. · NeurIPS 2023; Wang et al. · *LLMs are not fair evaluators* · 2023; Kim et al. · Prometheus · ICLR 2024; Ye et al. · FLASK · ICLR 2024; Cook et al. · TICK · 2024; Qin et al. · InFoBench · 2024; Shankar et al. · UIST 2024; Hashemi et al. · LLM-Rubric · ACL 2024; Dubois et al. · Length-Controlled AlpacaEval · 2024 · `[recall: high]`
- Possible confabulation, flagged: a 2025 empirical evaluation of coding agents with and without context files · `[recall: low]`

**Recall-graded handles — Part B:**

- Rothermel & Harrold · TOSEM 1997 and TSE 1996 · `[recall: high]`; Leung & White 1990; Kung et al. · JOOP 1995 · medium-high / medium; Ren et al. · Chianti · OOPSLA 2004 · high; Bohner & Arnold 1996 · high; Memon et al. · ICSE-SEIP 2017 · high, distance finding medium; Machalica et al. · ICSE-SEIP 2019 · high, numbers medium; Yoo & Harman · STVR 2012 · high; Engström, Runeson, Skoglund · IST 2010 · medium-high
- Chromatic TurboSnap · `[recall: medium]`
- Edge et al. · *From Local to Global* · 2024 (linked from the fetched README); LLM-judged evaluation · `[recall: high]`; Han et al. · *RAG vs. GraphRAG* · 2025 · `[recall: medium]`; Aider's personalised PageRank over tree-sitter references · `[recall: high]`
- Yamaguchi, Golde, Arp, Rieck · IEEE S&P 2014 · `[recall: high]`; CodeQL/QL · `[recall: high]`
- W3C PROV-DM · 2013 · `[recall: high]`; C2PA · `[recall: high]`
- Pearl's backdoor criterion · `[recall: high]`; Wagner et al. · J Clin Pharm Ther 2002; Bernal, Cummins, Gasparrini · IJE 2017; Hussey & Hughes · CCT 2007; Hemming et al. · BMJ 2015; Lipsitch, Tchetgen Tchetgen, Cohen · Epidemiology 2010; Card & Krueger 1994; Abadie, Diamond, Hainmueller · JASA 2010 · all `[recall: high]`
- Zhang & Shasha · SIAM J Comput 1989 · `[recall: high]`; graph edit distance NP-hardness (Zeng et al. · VLDB 2009) · `[recall: medium-high]`; React reconciliation as linear-time heuristic diff · `[recall: high]`
- Deka et al. · Rico · UIST 2017; Liu et al. · UIST 2018; Li et al. · Screen2Vec · CHI 2021; He et al. · ActionBert · AAAI 2021; Li & Li · Spotlight · ICLR 2023; Zhang et al. · Screen Recognition · CHI 2021; Patil et al. · LayoutGMN · CVPR 2021; Lee et al. · Neural Design Network · ECCV 2020 · grades as in §8.3
- NLI models for pairwise contradiction · `[recall: high]`

**Stream and repo cross-references (read locally, not re-derived):** [00](00-synthesis.md), [01](01-anatomy-of-a-miss.md), [02](02-patch-regenerate-or-restart.md), [03](03-from-miss-to-rubric-line.md), [04](04-design-craft-as-checkable-criteria.md), [05](05-practitioner-field-guide-x.md), [06](06-community-practice-and-tooling.md), [07](07-loop-economics-and-ownership.md); [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), [/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md), [/13](../prototype-construction/13-schema-evolution-and-migration.md); [design-sdlc/03](../design-sdlc/03-prototype-governance-outside-the-codebase.md); [skill-resources/guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md).

*Written 12 September 2026 as a recall probe. 31 raw fetches attempted, 26 succeeded, all from GitHub or the npm registry; two GitHub API searches for repository metadata. No other host was attempted. Nothing in Part A above `[recall: high]` should be quoted without opening the paper; nothing in Part B is a finding.*
