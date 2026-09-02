# Reviewing Grades — Machine Trust, Human Calibration, and the Annotation Loop

**Scope:** Doc 01 in this stream covers how a generated prototype gets a grade (deterministic checks, LLM/VLM judges on a rubric, human rubric scores). This document covers what happens *after* the grade exists: when a machine-produced grade can be accepted as-is, when a human must look, how judges are calibrated against humans and kept calibrated, which items humans should review and with what tooling, what a designer-facing review card looks like, how overrides turn into rubric and judge edits, and who owns the review step. It builds on the AI-critique reliability evidence in [design-sdlc 02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), the external-verifier and eval sections of [design-sdlc 04 §3/§6](../design-sdlc/04-small-model-guardrails.md), and the open questions in [foundational 06 §3](../foundational/06-ai-ux-research-ia-process.md). Verified live September 2026; every claim links its source; vendor features and prices come from the vendors' live pages, not memory. Things that could not be verified are marked.

## Table of Contents

1. [Trust tiers for machine grades](#1-trust-tiers-for-machine-grades)
2. [Calibrating judges to humans](#2-calibrating-judges-to-humans)
3. [Sampling what humans review](#3-sampling-what-humans-review)
4. [Annotation and review tooling](#4-annotation-and-review-tooling)
5. [Designer-facing review UX](#5-designer-facing-review-ux)
6. [Rubric refinement from overrides](#6-rubric-refinement-from-overrides)
7. [Governance of the review step](#7-governance-of-the-review-step)
8. [Cross-cutting themes](#cross-cutting-themes)
9. [Recommendations: trust tiers and a review workflow](#recommendations-trust-tiers-and-a-review-workflow)
10. [Template: grade review card](#template-grade-review-card)
11. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
12. [Sources](#sources)

---

## 1. Trust tiers for machine grades

**What it is:** A published rule for each grade component saying whether it is auto-accepted, spot-checked, or always routed to a human — plus the signals that move an item between tiers.

**Why it matters:** The loop only closes if most grades flow back into the generator without a human, and it only stays honest if the right minority is read by one. Anthropic's eval guidance draws the three grader types with their tradeoffs — code-based ("Fast," "Cheap," "Objective," "Reproducible" but "Brittle to valid variations"), model-based ("Flexible," "Scalable" but "Non-deterministic"), human ("Gold standard quality" but "Expensive," "Slow") — and states the tiering principle directly: "LLM-as-judge graders should be closely calibrated with human experts to gain confidence that there is little divergence" ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Key findings:**

- **Deterministic checks are the only auto-accept tier.** Schema validity, token-drift greps, `axe` violation counts, import-resolves-to-registry — the validators in [design-sdlc 04 §3](../design-sdlc/04-small-model-guardrails.md) — are exact and reproducible; the residual risk is a wrong *check*, not a wrong *grade*, which is a code-review problem. Braintrust's hybrid ordering is the same: "Deploy deterministic scorers first," then LLM judges for scale, then "Reserve human review for cases that resist automation," then "Convert human findings back into automated test cases" ([Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)).
- **Judge scores are a spot-check tier, and their own confidence is not the signal.** The verbalized-confidence literature is blunt: "the reliability of these scores strongly depends on how the model is asked," and well-calibrated scores are achievable only "with certain prompt methods" ([arXiv 2412.14737](https://arxiv.org/abs/2412.14737)). Better signals are external:
  - *Multi-judge agreement.* A Panel of LLM evaluators from "disjoint model families" outperformed a single large judge, was "over seven times less expensive," and "exhibits less intra-model bias" ([PoLL, arXiv 2404.18796](https://arxiv.org/abs/2404.18796)). Braintrust's operational version: run "two or three judges with different scoring prompts… When they disagree, the output gets routed to a human reviewer" ([Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)).
  - *Variance across repeated runs.* On pairwise tasks GPT-4o-mini "preferences flipped on average 13.6% across runs, with 28% of questions exceeding a 20% flip rate"; "11 repeated trials are needed for a majority vote to recover the 50-trial reference verdict with 95% probability… rising to 15 for high-variance questions"; two OpenAI judges agreed only 76% (κ = 0.51) ([Coin Flip Judge, arXiv 2606.13685](https://arxiv.org/abs/2606.13685)). A grade whose repeats disagree is a grade to review. LangSmith's `num_repetitions` (already curated in [design-sdlc 04 §6](../design-sdlc/04-small-model-guardrails.md)) is the cheap way to measure this.
  - *Stability is not validity.* Across 21 judges, 9 providers and ~541k judgments, "high test–retest reliability (>0.95)" coexisted with "severe position bias (>0.10)," and judge rankings shifted "by up to 14 positions" across benchmarks ([Reliability without Validity, arXiv 2606.19544](https://arxiv.org/abs/2606.19544)). A consistent judge can be consistently wrong; only human comparison detects that.
  - *Distance from the decision threshold.* Score gaps in pointwise judging are small — "0.19–0.36 on a 10-point scale" between outputs that the same judges declared clear winners pairwise ([arXiv 2606.13685](https://arxiv.org/abs/2606.13685)) — so items within the noise band of a pass/fail cut are the ones to sample.
- **Taste and severity always need a human.** The UI-specific evidence is consistent: GPT-4o heuristic evaluation reached κ 0.50 on *detection* but Krippendorff's α near zero on *severity* ([arXiv 2512.04262](https://arxiv.org/abs/2512.04262), discussed in [design-sdlc 02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)); WebDevJudge, an ICLR 2026 oral, found that on 654 paired web apps human experts agreed 84.82% pairwise while "the top-performing evaluator, Claude-4-Sonnet under the pairwise paradigm, attains an agreement rate of only 66.06%," failing on "functional equivalence," "task feasibility," and position bias ([arXiv 2510.18560](https://arxiv.org/html/2510.18560v1), [ICLR page](https://iclr.cc/virtual/2026/oral/10010880)). MLLMs judging 30 UI screenshots "approximate human preferences on some dimensions but diverge on others" ([arXiv 2510.08783](https://arxiv.org/abs/2510.08783)).
- **Escalation rules teams actually publish.** Braintrust: "track the agreement rate over time. When agreement drops below your threshold, inspect the disagreements" ([Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)). Galileo: "Recalibrate immediately after any judge model swap or vendor version bump" ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)). Hamel Husain: re-run error analysis on "new features, prompts, model switches, bug fixes" and otherwise "review 10-20 traces weekly focusing on outliers and anomalies" ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Open questions:** Nobody has published a per-rubric-criterion trust map for UI generation (which criteria a VLM judge is reliable on, which it is not). The "consistency-bias paradox" suggests teams should report judge *bias* alongside agreement, but no vendor dashboard exposes position-bias by default.

---

## 2. Calibrating judges to humans

**What it is:** Building a small human-labeled set, measuring judge agreement against it with chance-corrected metrics, editing the judge (prompt, examples, or weights) until agreement is acceptable, and repeating on a cadence.

**Why it matters:** The foundational finding is that criteria are not fixed before you look at outputs. Shankar et al. (UIST 2024) built EvalGen, which "asks humans to grade a subset of LLM outputs" and uses that feedback "to select implementations that better align with user grades," and named *criteria drift*: "users need criteria to grade outputs, but grading outputs helps users define criteria" ([arXiv 2404.12272](https://arxiv.org/abs/2404.12272)). Calibration is therefore a loop, not a setup step.

**Key findings:**

- **The reference recipe (prompted judge).** Hamel Husain's method: pick "one (maybe two) key individuals whose judgment is crucial"; have them give a binary pass/fail plus a critique "a new employee could understand"; label ~30 examples until no new failure modes appear; for validating a judge aim for ~100 per failure mode with balanced classes (below 60 total "confidence intervals are often too wide"); put expert critiques into the judge prompt as few-shot examples; iterate until agreement — Honeycomb reached ">90% agreement" in three iterations; report TPR and TNR separately because "raw agreement can be misleading when classes are imbalanced" ([Hamel](https://hamel.dev/blog/posts/llm-judge/)). The same authors' `validate-evaluator` skill packages this as "Calibrate LLM judges against human labels using data splits, TPR/TNR, and bias correction" ([ai-evals-course/evals-skills](https://github.com/ai-evals-course/evals-skills); the older [hamelsmu/evals-skills](https://github.com/hamelsmu/evals-skills) was archived 16 Aug 2026 and points there).
- **Meta-evaluation: evaluate the evaluator with chance-corrected metrics.** Raw agreement overstates: "kappa deflation between exact match and Cohen's kappa is universal (33–41 pp on MT-Bench)," and the authors propose a "Minimum Viable Validation Protocol" ([arXiv 2606.19544](https://arxiv.org/abs/2606.19544)). Worse, "protocol choice alone moves reported accuracy from 0.551 to 0.899 and carries κ across zero, without altering a single verdict" — scale, case retention, abstention handling and verdict pooling must be documented ([arXiv 2606.00093](https://arxiv.org/abs/2606.00093)). Judge's Verdict scores 54 models by z-score against human inter-rater variation; 27 reached "human-like" or "super-consistent" tiers, and "judge excellence is not solely dependent on model size" ([arXiv 2510.09738](https://arxiv.org/abs/2510.09738)). Arize's guide: ~100 examples gives roughly ±10 pp, ~400 gives ±5 pp; "Count examples per class, not only total"; and "avoid relying on universal thresholds such as '0.6 is good'" ([Arize](https://arize.com/blog/measuring-human-llm-judge-alignment/)).
- **Prompted judge vs trained judge.** Fine-tuned open judges "achieve high performance on in-domain test sets, even surpassing GPT-4" but generalize poorly because they "function as task-specific classifiers" ([arXiv 2403.02839](https://arxiv.org/abs/2403.02839)). For a design team whose rubric changes monthly, a prompted judge with human-anchored examples is the calibratable option; a trained reward model is only worth it once the rubric is stable and labels are plentiful (the SWE-RM pattern in [design-sdlc 04 §3](../design-sdlc/04-small-model-guardrails.md)).
- **Pairwise vs absolute.** Pairwise is easier to *calibrate* — MT-Bench's original >80% GPT-4/human agreement was pairwise ([arXiv 2306.05685](https://arxiv.org/abs/2306.05685)), LangSmith ships pairwise annotation queues ([changelog](https://changelog.langchain.com/announcements/pairwise-annotation-queues-for-comparing-agent-outputs)), and it is the right form for "did the skill v2 beat v1?" — but it inherits position bias (72% A-majority in one study, "Response B" chosen 60–69% of the time in another) and must be run in both orders ([arXiv 2606.13685](https://arxiv.org/abs/2606.13685), [CIP](https://www.cip.org/blog/llm-judges-are-unreliable)). Gates need absolute scores; CIP argues for pointwise for that reason. Use pairwise to rank generator versions, absolute (low-precision: pass/fail or 0–3, per [Braintrust](https://www.braintrust.dev/articles/human-in-the-loop-evals-for-llm-apps)) to gate.
- **Calibration decays, and the judge may be what drifted.** "Every drift alarm is ambiguous between a worse product and a changed judge"; the fix is a "fixed, human-labeled anchor set that the current judge periodically re-scores" with an anytime-valid test — it caught silent judge version bumps in 60/60 runs with zero false attributions, where rolling z-tests "false-alarmed on 75% of drift-free data" ([arXiv 2606.15474](https://arxiv.org/abs/2606.15474)). Galileo's cadence: weekly "stratified canary calibration," monthly "full calibration cycle with SME annotation and a gold-set kappa check," quarterly expert spot-checks ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)).
- **Published agreement for UI/design judging** is thin: WebDevJudge (above) is the only controlled meta-evaluation of judges on running web UIs; UI-Bench collected "4,000+ expert judgments" pairwise over 300 generated sites but did not compare an automated judge ([arXiv 2508.20410](https://arxiv.org/abs/2508.20410)); DesignBench's abstract reports no human-agreement study ([arXiv 2506.06251](https://arxiv.org/abs/2506.06251)).

**Open questions:** The 80% "human-level" bar comes from chatbot text; WebDevJudge shows the human ceiling for UIs is ~85% and judges are ~66%. Whether an anchored-example VLM judge closes that gap on *single-system* prototypes (one design system, one rubric) is untested.

---

## 3. Sampling what humans review

**What it is:** Rules for which grades get human eyes: disagreement, uncertainty, strata, and a fixed budget.

**Why it matters:** Human review is roughly "100x more expensive per output" than judging (Braintrust's figures: LLM judging 10,000 outputs "$5-15" vs human review of 500 "$800-1,800") ([Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)), and reviewer quality decays inside a session (§5). The budget has to be spent on the items that change the rubric.

**Key findings:**

- **Disagreement sampling first.** Judge-vs-deterministic conflicts (judge says pass, `axe` says fail) and judge-vs-judge splits are the cheapest high-yield stratum ([PoLL](https://arxiv.org/abs/2404.18796), [Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)). Hamel: after the first round, "focus on error cases rather than random sampling, while maintaining some random sampling for validation" ([Hamel](https://hamel.dev/blog/posts/llm-judge/)).
- **Uncertainty sampling without logprobs.** A 2026 method predicts which LLM ratings will disagree with humans from embedding-space geometric consistency, with "higher AUC… than probability-based baselines," so flagged items "can be sent for re-rating" ([arXiv 2605.12422](https://arxiv.org/abs/2605.12422)). Repeat-run variance (§1) is the simpler proxy available in every harness.
- **Stratify by task type and generator version.** Braintrust's sampling ladder: random baseline, then priority toward "low automated scores, high latency, or user-reported issues," then "stratified sampling across trace types and user segments," then edge cases via topic clustering; start at "50-100 traces per week" ([Braintrust](https://www.braintrust.dev/articles/human-in-the-loop-evals-for-llm-apps)). For a prototype generator the strata are task class (new screen / edit / repair — DesignBench's split), skill version, and model.
- **Review the grade, not just the artifact — carefully.** Showing the reviewer the machine grade speeds review but anchors it. In a 2,784-participant experiment, "requiring corrections for flagged AI errors reduced engagement and increased the tendency to accept incorrect suggestions," and attitude toward AI was "the strongest predictor of performance" ([Bias in the Loop, arXiv 2509.08514](https://arxiv.org/abs/2509.08514)); anchoring rises under time pressure and a "time allocation strategy with explanation can effectively de-anchor" ([arXiv 2010.07938](https://arxiv.org/abs/2010.07938)). Galileo's rule for the *calibration* set: the workflow "hides the judge's verdict," annotators "must score independently" ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)). Practical split: blind scoring for the anchor set; grade-visible review with mandatory rationale for the production sample.
- **Budgets and diminishing returns.** Discovery saturates: Hamel's "Start with 100 diverse traces and annotate at least the first 30 yourself" until new traces stop revealing failure modes ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)); validation needs 50–100 labels per scoring dimension ([Braintrust](https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals)); precision beyond ±5 pp costs ~400 labels ([Arize](https://arize.com/blog/measuring-human-llm-judge-alignment/)). *Not verified:* no source gives minutes-per-item for UI grade review; the two-minute target in §5 is a design constraint, not a measurement.

**Open questions:** Disagreement sampling over-represents hard cases and can bias the rubric toward edge cases; the right random:targeted ratio for a design rubric is unmeasured.

---

## 4. Annotation and review tooling

**What it is:** The platforms where a human sees an output, scores it against a rubric, optionally overrides or comments on a machine score, and where that feedback is retrievable by code.

**Why it matters:** The override has to land somewhere a script can read it, or it never reaches the skill's exemplars. Hamel's counter-position — "Build a custom annotation tool. This is the single most impactful investment" ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)) — is the alternative to everything below.

**Key findings (all verified against vendor pages, September 2026):**

| Tool | What the reviewer sees | Rubric scoring | Override / feed-back path | Pricing tier (human review) | Designer-usable? |
|---|---|---|---|---|---|
| [Braintrust](https://www.braintrust.dev/docs/annotate/human-review) | Review modal per row; score visibility filterable by reviewer/group | Categorical (0–100% per option), continuous slider, free-form to `metadata`/`expected` | Human scores sit beside automated to "validate automated scores"; corrections become `expected` in golden datasets ([blog](https://www.braintrust.dev/blog/human-review-golden-datasets)); scorers "versioned automatically" ([docs](https://www.braintrust.dev/docs/evaluate/write-scorers)) | Starter $0: 10k scores, 14-day retention, unlimited users, **1 human-review score per project**; Pro $249/mo: unlimited ([pricing](https://www.braintrust.dev/pricing)) | Yes — unlimited seats, but one rubric dimension on free |
| [LangSmith](https://docs.langchain.com/langsmith/annotation-queues) | Single-run or pairwise side-by-side queue; instructions + rubric | Feedback configs: continuous / categorical / freeform; required or optional per queue | Align Evals: "alignment score is the percentage of examples where the evaluator's judgment matches that of the human expert," needs "at least 20 examples," Evaluator Playground with saved baseline ([docs](https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback)); full SDK (`create_feedback_config`, `create_annotation_queue`) ([SDK](https://docs.langchain.com/langsmith/annotation-queues-sdk)) | Developer $0: 1 seat, "Annotation queue (human feedback)" **N/A**; Plus $39/seat ([pricing](https://www.langchain.com/pricing-langsmith)) | Plus only; per-seat cost |
| [Langfuse](https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues) | Keyboard-driven queue ("arrow keys to navigate, number keys to pick"); "Annotate" on every trace | Score configs: `NUMERIC, CATEGORICAL, BOOLEAN, TEXT`; configs editable since 2025-09 with "All current scores remain unchanged" ([changelog](https://langfuse.com/changelog/2025-09-29-score-config-updates)) | Scores section has "agreement metrics… to check how well an automated LLM judge agrees with your human annotators" ([product-teams guide](https://langfuse.com/resources/engineering/langfuse-for-product-teams)); scores via API | Hobby $0: 2 users, 1 queue; Core $29: 3 queues; Pro $199: unlimited ([pricing](https://langfuse.com/pricing)); self-host OSS includes queues and human annotation, audit logs enterprise-only ([self-host](https://langfuse.com/pricing-self-host)); MIT except `ee` ([GitHub](https://github.com/langfuse/langfuse)) | Yes — best non-engineer story |
| [Arize Phoenix](https://arize.com/docs/phoenix/tracing/concepts-tracing/annotations-concepts) (OSS, ELv2 [license](https://arize.com/docs/phoenix/self-hosting/license)) / [Arize AX](https://arize.com/docs/ax/evaluate/human-review) | Phoenix: annotate on span with "hotkey support"; AX: labeling queues let an SME "label spans without seeing the full traces view" | Categorical / continuous / freeform (1,500 chars on AX); annotator kinds human / LLM / code | Annotated datasets "build human-preference calibrated judges using… DSPy and Zenbase"; REST `POST /v1/span_annotations` ([cookbook](https://arize.com/docs/phoenix/cookbook/human-in-the-loop-workflows-annotations/using-human-annotations-for-eval-driven-development)) | Phoenix free self-host; AX Free 25k spans/15 days, Pro $50/mo ([pricing](https://arize.com/pricing)) | AX queues yes; Phoenix needs an engineer |
| [W&B Weave](https://docs.wandb.ai/weave/guides/tracking/feedback) | "Show feedback" panel on a call; Annotations column in traces | Human annotation scorers: boolean / integer / number / enum | Feedback API by `annotation_spec_ref`; scorer edits are versioned; **no review queue documented** | Free: 1 GB Weave ingestion, 5 seats; Pro from $60/mo ([pricing](https://wandb.ai/site/pricing/)) | Partial — no queue |
| [Opik](https://www.comet.com/docs/opik/evaluation/annotation_queues) (Apache-2.0, [GitHub](https://github.com/comet-ml/opik)) | "Distraction-free" SME queue, "No technical jargon," instructions shown, progress indicators | Categorical / numerical feedback definitions; optional "reason" | Multi-annotator scores shown separately with the average; Python/TS SDK for queues and scores ([docs](https://www.comet.com/docs/opik/tracing/annotate_traces)) | Open source self-host; SMEs must be workspace members | Yes |
| [Argilla](https://github.com/argilla-io/argilla) (Apache-2.0) | Dataset-centric annotation UI; free on Hugging Face Spaces or Docker ([docs](https://docs.argilla.io/latest/)) | Label/text questions and dataset-level feedback | Python SDK; built for dataset curation, not trace review | Free | For labeling projects, not per-prototype review |
| [Label Studio](https://humansignal.com/pricing/) | Templates incl. LLM evaluation, side-by-side comparison ([blog](https://labelstud.io/blog/new-llm-evaluation-templates-for-label-studio/)) | Any template; pairwise supported | Enterprise adds "Run LLM-as-a-Judge" and "Integrated Human Supervision" | Community free; Starter Cloud $99/mo + $49/user (≤12 users); Enterprise custom | Community yes, LLM-judge alignment Enterprise |
| [Prodigy](https://prodi.gy/buy) | Scriptable Python annotation app; "model as annotator" recipes ([Explosion](https://explosion.ai/blog/prodigy-2023-updates)) | Recipe-defined | Local SQLite/DB; no judge-alignment feature | Personal $390 lifetime; Company $490/seat in packs of 5, 12 months of upgrades | Engineer-driven |
| [Latitude](https://latitude.so/pricing) | Human-in-the-loop evaluations on logs; Aligned / Partially / Misaligned labelling in the blog workflow ([blog](https://latitude.so/blog/align-llm-evaluators-human-annotations)) | Binary and rating | Blog targets "80–90% alignment" before deploying the evaluator; *docs page for HITL not located (404)* | Starter $0: 20K credits, unlimited seats; Pro $99/mo; MIT self-host | Unverified |
| Humanloop | — | — | — | **Shut down 8 September 2025** after acquisition by Anthropic ([W&B migration note](https://wandb.ai/wandb_fc/product-announcements-fc/reports/Humanloop-is-Sunsetting-Migrate-to-Weights-Biases-as-an-alternative--VmlldzoxMzk4ODc1Nw)) | — | — |

"Cove" as an eval platform could not be located; the nearest match is [Coval](https://www.coval.ai/products), a voice-agent QA product with human review — out of scope. For a Claude Code skill, Anthropic's [skill-creator plugin](https://claude.com/plugins/skill-creator) has Executor / Grader / Comparator / Analyzer agents with "variance analysis," but its page does not describe a human review step; a public docs page for `claude plugin eval` was not found in the [Claude Code docs index](https://code.claude.com/docs/llms.txt) at time of writing.

**Open questions:** None of these render a *screenshot beside a score with an anchor image* natively; every designer-facing card in §5 is a custom view over one of these stores (Hamel's `build-review-interface` skill exists for exactly this).

---

## 5. Designer-facing review UX

**What it is:** The screen a designer sees for one graded prototype: screenshot(s), the grade with its evidence, the rubric anchor it was scored against, and an override + rationale control — finished in under two minutes.

**Why it matters:** Reviewer quality is a function of the interface. Fraser et al.'s CritiqueKit (UIST 2017) classified feedback in real time as Specific / Actionable / Justified and nudged reviewers toward all three ([dblp record](https://dblp.org/rec/conf/uist/FraserNWDK17.html)); Hamel's teams with custom tools "iterate approximately 10x faster" than on generic platforms ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)).

**Key findings:**

- **Grade next to artifact, evidence next to grade.** Anthropic: "the transcript tells you whether the agent made a genuine mistake or whether your graders rejected a valid solution" ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)) — for a prototype the "transcript" is the screenshot at the viewport the check ran on, the failing selector or token, and the anchor example the rubric level points to. UXBench's requirement that critique be grounded in browser exploration ([design-sdlc 02 §6](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)) applies to the *evidence* field: a judge score without a pointer is not reviewable.
- **Scoring vs critiquing — the design-crit literature.** Dannels & Martin's genre analysis of studio critiques found feedback socializes designers into "autonomous decision-making identities" rather than verdicts ([JBTC 2008](https://journals.sagepub.com/doi/10.1177/1050651907311923); abstract via search, page returned 403). "Ask Me or Tell Me?" found "presenting feedback as questions followed by statements leads to better design revisions" than either alone ([arXiv 2101.06143](https://arxiv.org/abs/2101.06143)). Designers given GPT-4 feedback on mockups found it "useful for catching subtle errors, improving text, and considering UI semantics" but its utility "decreased… over iterations" ([arXiv 2403.13139](https://arxiv.org/abs/2403.13139)). Reading: a *score* is what the loop needs, but a *critique* is what the designer can produce reliably — so the card asks for pass/fail plus one sentence, following Hamel's "binary decision forces everyone to consider what truly matters" ([Hamel](https://hamel.dev/blog/posts/llm-judge/)) and Braintrust's "low-precision scales, such as 0 to 3 or pass/fail" ([Braintrust](https://www.braintrust.dev/articles/human-in-the-loop-evals-for-llm-apps)). The critique formats in [design-sdlc 02 §3](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) (anchor + problem + impact) are the rationale field.
- **Fatigue is measurable and fast.** Annotator agreement "declined dramatically — by more than 32 percentage points — across eight batches" with run-length drift "consistent with autopilot labeling," and items labeled within a minute reached κ = 0.98 vs 0.65 a day apart ([arXiv 2605.27239](https://arxiv.org/abs/2605.27239)). Interface affordances that block invalid labels and surface documentation lowered cognitive load without increasing time ([CAL, arXiv 2403.07762](https://arxiv.org/abs/2403.07762)). Design consequences: short sessions, mixed strata, keyboard flow (Langfuse's "?" cheatsheet model), and a visible run-length warning.
- **Anchoring control.** Show the machine grade *after* the reviewer commits a first impression on the calibration set; on production samples show it but require a rationale on override ([arXiv 2509.08514](https://arxiv.org/abs/2509.08514), [Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)).
- **Rationale is the training signal.** Galileo: "High-confidence disagreements, where the judge was confident but wrong, become negative anchors," preserving "the SME's rationale as the reasoning pattern" ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)); Braintrust: never leave `expected` blank ([blog](https://www.braintrust.dev/blog/human-review-golden-datasets)). An override without a sentence is a vote, not a lesson.

**Open questions:** No study measures whether a designer reviewing a *grade* (versus a design) is faster or more accurate; the two-minute budget is a target to instrument, not a finding.

---

## 6. Rubric refinement from overrides

**What it is:** The path from a batch of human overrides to a change in the rubric text, the judge prompt, or the exemplar set — and the versioning that keeps old grades comparable.

**Why it matters:** Criteria drift (§2) is permanent; the rubric will change. Untracked change makes the eval history meaningless — every experiment must be pinnable to the rubric version that graded it.

**Key findings:**

- **Three destinations for an override.** (1) *Rubric edit* — Galileo: when "a criterion consistently generates disagreement, tighten its definition before adding more examples"; (2) *judge-prompt edit* — LangSmith: "add instructions to your evaluator prompt so the LLM knows about" the failure mode ([docs](https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback)); (3) *anchor example* — positive anchors from high-confidence agreement, negative from confident-but-wrong, with a cap because too many examples "can crowd the prompt and blur the decision boundary" ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)). For a Claude Code skill these map to `SKILL.md` rule text, the grader prompt in the eval harness, and the `references/` exemplars — the same three files [design-sdlc 04 §4](../design-sdlc/04-small-model-guardrails.md) identifies as the small model's teachers.
- **Cadence.** Early on, edit freely: "keep the rubric editable while reviewers work and let the first label pass correct it. That early drift is the team learning what the rubric should have said" ([LangChain](https://langchain.com/articles/llm-evals)). After the anchor set exists, batch edits to the monthly calibration cycle ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)), and re-run the alignment score against the saved baseline before adopting a change ([LangSmith](https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback)).
- **Versioning so old grades stay comparable.** Langfuse's score configs are now mutable but "All current scores remain unchanged when you update a config" and old configs can be archived, not deleted ([changelog](https://langfuse.com/changelog/2025-09-29-score-config-updates), [FAQ](https://langfuse.com/faq/all/manage-score-configs)); Braintrust versions scorers automatically ([docs](https://www.braintrust.dev/docs/evaluate/write-scorers)). The anchor-set approach ([arXiv 2606.15474](https://arxiv.org/abs/2606.15474)) is the comparability mechanism: any rubric/judge version can be re-run on the fixed human-labeled set, so scores are compared *through* the anchor set rather than across versions directly. Record `rubric_version` and `judge_version` on every grade.

**Open questions:** No published guidance on when to *retire* an anchor example that the generator no longer fails; stale negatives may over-constrain a skill.

---

## 7. Governance of the review step

**What it is:** Who reviews, how often, what conflicts are disallowed, what gets logged, and what a grade becomes after it is overridden.

**Why it matters:** Judges "favor outputs matching their own stylistic patterns" — GPT-4 "exhibits a significant degree of self-preference bias," explained by lower perplexity on familiar text ([arXiv 2410.21819](https://arxiv.org/abs/2410.21819)); MT-Bench named it "self-enhancement" bias ([arXiv 2306.05685](https://arxiv.org/abs/2306.05685)). The human analogue — a skill author grading their own skill's output — has no direct study, but the same incentive exists, and the reviewer's *attitude toward AI* predicted error detection more than any demographic ([arXiv 2509.08514](https://arxiv.org/abs/2509.08514)).

**Key findings:**

- **Who.** Hamel: "appointing a single domain expert as a 'benevolent dictator' is the most effective approach" for small teams; with multiple annotators, measure Cohen's κ, discuss disagreements, relabel, and let the expert decide with documented reasoning ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). Anthropic: eval health needs "ongoing attention and clear ownership" ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Tooling supports separation: Braintrust restricts score visibility by "team members or permission groups"; LangSmith has reviewer reservations and "Needs Review → Needs Others' Review → Completed"; AX queues let SMEs label "without seeing the full traces view."
- **Conflicts of interest.** Two rules follow from the evidence: the judge model should not share a family with the generator (PoLL's disjoint families; "never use the same model family as generator and judge" is the practitioner consensus, [PoLL](https://arxiv.org/abs/2404.18796)); and the person who edited the skill in this cycle should not be the sole reviewer of that cycle's calibration set — they may review production samples, but anchor-set labels come from the designated expert (reasoned from [arXiv 2410.21819](https://arxiv.org/abs/2410.21819) and [arXiv 2509.08514](https://arxiv.org/abs/2509.08514); not directly measured).
- **Cadence.** Weekly 10–20 outlier traces ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)) or 50–100 sampled items ([Braintrust](https://www.braintrust.dev/articles/human-in-the-loop-evals-for-llm-apps)); monthly gold-set κ check; immediate re-calibration on any judge model change ([Galileo](https://galileo.ai/blog/calibrate-llm-judge-human-annotations)).
- **Audit trail.** Every grade carries `rubric_version`, `judge_version`, `generator_version`, and, if overridden, `reviewer`, `rationale`, and timestamp; Langfuse gates audit logs to Enterprise ([self-host pricing](https://langfuse.com/pricing-self-host)), so on free tiers the trail lives in the score comment and your own export.
- **What happens to a grade after override.** The override (a) replaces the machine score for *this* artifact's feedback to the generator; (b) joins the anchor set if the expert labeled it blind; (c) is aggregated — a criterion with repeated overrides triggers a rubric edit, a judge with falling κ triggers a prompt edit or re-anchoring, and only a stable rubric with hundreds of labels justifies training a reward model ([arXiv 2403.02839](https://arxiv.org/abs/2403.02839)). "Both" is the normal answer; "retrain the judge" is the rare one.

**Open questions:** No public example of a design team's review charter exists; the closest analogues are ML annotation guidelines. Whether designers accept a single "benevolent dictator" for taste calls is a team-culture question, not an evidence question.

---

## Cross-cutting themes

1. **Trust the check, sample the judge, own the taste.** Deterministic checks auto-accept; judge scores are spot-checked using disagreement, repeat variance, and threshold distance — never the judge's stated confidence; severity and taste stay human. WebDevJudge's 66% vs 85% gap is the quantitative reason for UI work specifically.
2. **Calibration is a loop with a fixed anchor.** Criteria drift means the rubric will change; a blind-labeled anchor set re-scored on a cadence is what makes judge drift, rubric drift, and generator drift distinguishable.
3. **Report chance-corrected, per-class, per-criterion.** Raw agreement can move 35 points on protocol alone; κ/TPR/TNR with per-class counts is the minimum, and 100 / 400 labels buy ±10 / ±5 pp.
4. **The interface is the reviewer's accuracy.** Fatigue, anchoring and autopilot are measured effects; keyboard flow, short sessions, blind-first on calibration items, and a mandatory one-line rationale are the counters.
5. **An override is only useful if it lands in a file the generator reads.** Rubric text, judge prompt, or exemplar — versioned, with the old grade kept comparable through the anchor set.

---

## Recommendations: trust tiers and a review workflow

| Grade component | Tier | Sampling rule for human review | What an override does |
|---|---|---|---|
| Schema-valid construction file / build passes | **Auto-accept** | 0% (fix the validator if wrong) | Bug ticket on the check, not the grade |
| On-system rate (imports resolve, zero raw hex/px) | **Auto-accept** | 0% | Same |
| `axe` violations = 0 | **Auto-accept** | 1–2% random for false-positive audit | Adds an allowlist entry with rationale |
| Screenshot diff vs gold render | **Spot-check** | All diffs within ±X of threshold; all judge-vs-diff conflicts | Adjusts threshold or replaces gold render; new anchor |
| VLM judge: layout / hierarchy / spacing (rubric 0–3) | **Spot-check** | 100% of multi-judge or repeat-run disagreements; 10% stratified by task type × skill version; every score within 0.5 of the pass cut | Replaces score for this artifact; blind-labeled ones join anchor set; ≥3 overrides on one criterion → rubric edit |
| VLM judge: copy / states coverage (pass/fail) | **Spot-check** | Same as above plus every "pass" on a task class with a known failure mode | Same |
| Judge severity ranking of issues | **Always human** | 100% of blocking-severity calls before they gate | Human severity is the record; judge severity logged for κ tracking |
| Taste / "would ship" / direction fit | **Always human** | 100% of anchor-set items; production sample per weekly budget | Human score only; feeds pairwise "v2 beats v1?" ranking |

**Weekly ritual (about 90 minutes, one designated reviewer, one alternate):** (1) Pull the queue: all disagreements from the week, plus a stratified random 30–50; keep sessions under an hour and rotate strata. (2) Blind-score the five items flagged for the anchor set before seeing any machine grade. (3) Grade-visible review of the rest, rationale mandatory on override, using the card below. (4) Compute κ and TPR/TNR per criterion against the anchor set; note any criterion with ≥3 overrides. (5) File rubric / judge-prompt / exemplar edits as a PR with `rubric_version` bumped; re-run the anchor set on the new judge before merging. (6) On any judge model change, run the full anchor set immediately. Monthly: expand the anchor set toward 100 per failure mode and re-check per-class counts.

---

## Template: grade review card

```markdown
## Grade review — <artifact id> · <task class> · skill <version> · judge <version> · rubric <version>

**Screenshot(s):** <viewport@breakpoint link> · **Deterministic:** schema ✓/✗ · on-system ✓/✗ · axe <n>
**Judge grade:** <criterion> = <score> (repeat-run agreement <k/n>; second judge <score>)
**Evidence the judge cited:** <selector / token / region> · **Rubric anchor for this level:** <link to exemplar>

### Your call (pick one)
- [ ] Agree
- [ ] Override → new score: <score>
- [ ] Cannot judge from this evidence (needs live prototype / more context)

**Why (one sentence, anchor + problem + impact):** <e.g. "Card grid › row 2: 12px gap vs 16px token; breaks rhythm with header — fails L2 anchor">

**Severity (human only):** blocking / high / medium / nit
**Rubric feels wrong here?** no / yes → what it should say: <one line>
**Add as anchor example?** no / positive / negative

_Reviewer:_ <name> · _Blind?_ yes/no · _Time:_ <mm:ss>
```

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| ai-evals-course/evals-skills | https://github.com/ai-evals-course/evals-skills | Shankar/Husain skills: `validate-evaluator` (TPR/TNR, bias correction), `build-review-interface`, `error-discovery` | fetched OK (522★; predecessor archived 2026-08-16) | skills |
| Hamel Husain — LLM-as-a-Judge guide | https://hamel.dev/blog/posts/llm-judge/ | The pass/fail + critique calibration recipe with sample sizes and TPR/TNR | fetched OK | guardrails-and-evals |
| Hamel Husain — Evals FAQ | https://hamel.dev/blog/posts/evals-faq/ | Benevolent-dictator annotator model, 30/100-trace budgets, weekly 10–20 review | fetched OK | guardrails-and-evals |
| Who Validates the Validators? (EvalGen) | https://arxiv.org/abs/2404.12272 | Criteria drift; human-graded subset selects evaluator implementations | fetched OK | guardrails-and-evals |
| Who Drifted: the System or the Judge? | https://arxiv.org/abs/2606.15474 | Anchor-set re-scoring to attribute drift to judge vs product | fetched OK | guardrails-and-evals |
| Reliability without Validity | https://arxiv.org/abs/2606.19544 | 21-judge meta-evaluation; kappa deflation; Minimum Viable Validation Protocol | fetched OK | guardrails-and-evals |
| WebDevJudge | https://arxiv.org/abs/2510.18560 | Only controlled meta-eval of judges on running web UIs (66% vs 85%) | fetched OK | guardrails-and-evals |
| Galileo — Calibrate your LLM judge | https://galileo.ai/blog/calibrate-llm-judge-human-annotations | Weekly/monthly/quarterly cadence; blind SMEs; anchor selection rules | fetched OK | guardrails-and-evals |
| Arize — Measuring human-LLM judge alignment | https://arize.com/blog/measuring-human-llm-judge-alignment/ | Metric chooser and sample-size table | fetched OK | guardrails-and-evals |
| Langfuse annotation queues | https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues | Keyboard-driven review, score configs, judge-vs-human agreement analytics; OSS self-host | fetched OK | review-and-feedback |
| LangSmith Align Evals | https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback | Alignment score + Evaluator Playground over human labels | fetched OK (Align Evals on Plus tier at fetch; annotation queues themselves are listed on every tier per the live pricing page) | review-and-feedback |
| Braintrust human review | https://www.braintrust.dev/docs/annotate/human-review | Categorical/continuous/free-form review writing to `expected`; already a pick for evals | fetched OK | guardrails-and-evals (existing pick; extend entry) |
| Opik annotation queues | https://www.comet.com/docs/opik/evaluation/annotation_queues | Apache-2.0 SME queue designed for non-technical reviewers | fetched OK | review-and-feedback |
| Arize Phoenix annotations | https://arize.com/docs/phoenix/tracing/concepts-tracing/annotations-concepts | Human/LLM/code annotators, hotkeys, DSPy/Zenbase judge calibration; ELv2 | fetched OK | review-and-feedback |
| Grade review card (this doc) | — | ≤25-line designer review template | authored here | *proposed:* eval-tuning-loops |

Not selected: Label Studio and Prodigy (general-purpose labeling; judge alignment is Enterprise-only or absent), Argilla (dataset curation, not per-artifact review), W&B Weave (no review queue), Latitude (HITL docs page could not be fetched), Humanloop (shut down).

---

## Sources

- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://arxiv.org/abs/2404.12272 — Shankar et al., Who Validates the Validators? (EvalGen)
- https://arxiv.org/abs/2606.19544 — Reliability without Validity
- https://arxiv.org/abs/2510.09738 — Judge's Verdict
- https://arxiv.org/abs/2606.13685 — The Coin Flip Judge
- https://arxiv.org/abs/2412.14737 — On Verbalized Confidence Scores for LLMs
- https://arxiv.org/abs/2306.05685 — MT-Bench / Judging LLM-as-a-Judge
- https://arxiv.org/abs/2510.18560 — WebDevJudge (https://arxiv.org/html/2510.18560v1; https://iclr.cc/virtual/2026/oral/10010880)
- https://arxiv.org/abs/2510.08783 — MLLM as a UI Judge
- https://arxiv.org/abs/2508.20410 — UI-Bench
- https://arxiv.org/abs/2506.06251 — DesignBench
- https://arxiv.org/abs/2512.04262 — GPT-4o heuristic evaluation reliability (via design-sdlc 02)
- https://arxiv.org/abs/2403.13139 — Generating Automatic Feedback on UI Mockups with LLMs
- https://arxiv.org/abs/2404.18796 — Panel of LLM Evaluators (PoLL)
- https://arxiv.org/abs/2410.21819 — Self-Preference Bias in LLM-as-a-Judge
- https://arxiv.org/abs/2403.02839 — Fine-tuned Judge Model is not a General Substitute for GPT-4
- https://arxiv.org/abs/2606.15474 — Who Drifted: the System or the Judge?
- https://arxiv.org/abs/2605.12422 — Predicting Disagreement with Human Raters
- https://arxiv.org/abs/2606.00093 — Agreement Measurement for Rubric-based LLM Judges
- https://arxiv.org/abs/2509.08514 — Bias in the Loop
- https://arxiv.org/abs/2010.07938 — Rastogi et al., anchoring and time allocation
- https://arxiv.org/abs/2605.27239 — Temporal Simultaneity Predicts Annotation Quality
- https://arxiv.org/abs/2403.07762 — CAL: affordances for labeling conversational data
- https://arxiv.org/abs/2101.06143 — Ask Me or Tell Me? (design feedback)
- https://dblp.org/rec/conf/uist/FraserNWDK17.html — CritiqueKit (UIST 2017)
- https://journals.sagepub.com/doi/10.1177/1050651907311923 — Dannels & Martin, Critiquing Critiques (403 on fetch; abstract via search)
- https://www.cip.org/blog/llm-judges-are-unreliable
- https://hamel.dev/blog/posts/llm-judge/
- https://hamel.dev/blog/posts/evals-faq/
- https://github.com/ai-evals-course/evals-skills
- https://github.com/hamelsmu/evals-skills
- https://galileo.ai/blog/calibrate-llm-judge-human-annotations
- https://arize.com/blog/measuring-human-llm-judge-alignment/
- https://www.braintrust.dev/articles/llm-as-a-judge-vs-human-in-the-loop-evals
- https://www.braintrust.dev/articles/human-in-the-loop-evals-for-llm-apps
- https://www.braintrust.dev/blog/human-review-golden-datasets
- https://www.braintrust.dev/docs/annotate/human-review
- https://www.braintrust.dev/docs/evaluate/write-scorers
- https://www.braintrust.dev/pricing
- https://docs.langchain.com/langsmith/annotation-queues
- https://docs.langchain.com/langsmith/annotation-queues-sdk
- https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback
- https://www.langchain.com/blog/introducing-align-evals
- https://changelog.langchain.com/announcements/pairwise-annotation-queues-for-comparing-agent-outputs
- https://www.langchain.com/pricing-langsmith
- https://langchain.com/articles/llm-evals
- https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues
- https://langfuse.com/resources/engineering/langfuse-for-product-teams
- https://langfuse.com/faq/all/manage-score-configs
- https://langfuse.com/changelog/2025-09-29-score-config-updates
- https://langfuse.com/pricing
- https://langfuse.com/pricing-self-host
- https://github.com/langfuse/langfuse
- https://arize.com/docs/phoenix/tracing/concepts-tracing/annotations-concepts
- https://arize.com/docs/phoenix/self-hosting/license
- https://arize.com/docs/phoenix/cookbook/human-in-the-loop-workflows-annotations/using-human-annotations-for-eval-driven-development
- https://arize.com/docs/ax/evaluate/human-review
- https://arize.com/pricing
- https://docs.wandb.ai/weave/guides/tracking/feedback
- https://wandb.ai/site/pricing/
- https://wandb.ai/wandb_fc/product-announcements-fc/reports/Humanloop-is-Sunsetting-Migrate-to-Weights-Biases-as-an-alternative--VmlldzoxMzk4ODc1Nw
- https://www.comet.com/docs/opik/evaluation/annotation_queues
- https://www.comet.com/docs/opik/tracing/annotate_traces
- https://github.com/comet-ml/opik
- https://github.com/argilla-io/argilla
- https://docs.argilla.io/latest/
- https://humansignal.com/pricing/
- https://labelstud.io/blog/new-llm-evaluation-templates-for-label-studio/
- https://prodi.gy/buy
- https://explosion.ai/blog/prodigy-2023-updates
- https://latitude.so/pricing
- https://latitude.so/blog/align-llm-evaluators-human-annotations
- https://www.coval.ai/products
- https://claude.com/plugins/skill-creator
- https://code.claude.com/docs/llms.txt
