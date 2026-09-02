# Loop Architecture, Metrics, and Governance — Running the Grade → Review → Feed-Back Loop as a System

**Scope:** The sibling documents in this stream cover the parts: how a generated prototype gets a grade (01), how a grade gets reviewed by a machine or a human (02), how text-level feedback reaches a skill or prompt (03), and when fine-tuning is worth it (04). This document is the whole: the closed loop in which every generated prototype is graded, the grade is reviewed, and the reviewed grade changes the generator — a Claude Code skill (SKILL.md + exemplars + rules), the repo's construction-file pipeline, or an API pipeline with its own prompts. It answers where grades live, how the eval set is managed and versioned, how a generator change is gated and rolled back, how you tell "the generator improved" from "the generator learned the grader," and who owns the loop at what cadence. It builds on the design-task eval set in [design-sdlc 04 §6](../design-sdlc/04-small-model-guardrails.md), attaches to the prototype ledger and lifecycle in [design-sdlc 03 §2/§9](../design-sdlc/03-prototype-governance-outside-the-codebase.md), and treats the E0–E6 roadmap in the [construction-file synthesis](../prototype-construction/00-architecture-synthesis.md) as the loop's first payload. Verified live 2 September 2026; every sourced claim links inline; Anthropic tooling facts come from live docs or the loaded `claude-api` skill, never memory; unverifiable items are marked.

## Table of Contents

1. [Reference architectures for eval-driven development](#1-reference-architectures-for-eval-driven-development)
2. [Infrastructure: where grades live](#2-infrastructure-where-grades-live)
3. [Eval set management](#3-eval-set-management)
4. [Metrics and dashboards](#4-metrics-and-dashboards)
5. [Gating and change control](#5-gating-and-change-control)
6. [Failure modes of the loop itself](#6-failure-modes-of-the-loop-itself)
7. [Ownership and cadence](#7-ownership-and-cadence)
8. [Cross-cutting themes](#cross-cutting-themes)
9. [Recommendations: the reference loop](#recommendations-the-reference-loop)
10. [Maturity model](#maturity-model)
11. [Template: weekly loop review](#template-weekly-loop-review)
12. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
13. [Sources](#sources)

---

## 1. Reference architectures for eval-driven development

**What it is:** The published loop shapes from Anthropic, OpenAI, the evals-practitioner school (Husain, Shankar, Yan), the observability vendors, and the one UI generator that has written up its own loop in detail (Vercel v0).

**Why it matters:** Every one of these sources describes the same five-step cycle with different vocabulary; the disagreements are about *where humans sit* and *how much automation to trust*, which is exactly the governance question.

**Key findings:**

| Source | Loop shape | Distinctive position | Where it disagrees with the others |
|---|---|---|---|
| Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (Jan 2026) | Task → trial → grader → suite; "20-50 simple tasks drawn from real failures is a great start"; source tasks from "the manual checks you run during development" and "your bug tracker and support queue" | Grade outcome/state, not path; pass^k for consistency; "An eval at 100% tracks regressions but provides no signal for improvement"; "dedicated evals teams to own the core infrastructure, while domain experts and product teams contribute most eval tasks"; "read the transcripts" | Most explicit on ownership split; treats saturation as a first-class signal |
| Hamel Husain, [Evals FAQ](https://hamel.dev/blog/posts/evals-faq/) and [evals-skills](https://hamel.dev/blog/posts/evals-skills/) (Mar 2026, updated Aug 2026) | Error analysis first ("the most important activity in evals"): open coding → axial coding → taxonomy → counts; then binary judges validated against human labels | A single "benevolent dictator" domain expert owns quality labels; binary pass/fail over Likert; review "at least 30 traces yourself", aim for "at least 100"; label "100 to 200 examples for each failure mode" and split train 10–20% / dev 40–45% / test 40–45% before trusting a judge (TPR/TNR); CI sets of "100+ examples" favoring "assertions or other deterministic checks over LLM-as-judge"; "review 10-20 traces weekly, focusing on outliers" | Warns against "fully automated evals before you've looked at your data" — the opposite emphasis from vendor "online scoring first" playbooks |
| Shankar et al., [Who Validates the Validators? (EvalGen)](https://arxiv.org/abs/2404.12272) | Humans grade a subset while the tool proposes grader implementations; select the grader that aligns with human grades | **Criteria drift**: "users need criteria to grade outputs, but grading outputs helps users define criteria"; some criteria are "dependent on the specific LLM outputs observed (rather than independent criteria that can be defined a priori)" | Rubrics cannot be frozen before the first review round — a direct constraint on how doc 01's rubric is versioned |
| Eugene Yan, [An LLM-as-Judge Won't Save the Product](https://eugeneyan.com/writing/eval-process/) (Apr 2025) | "Building product evals is simply the scientific method in disguise": observe, annotate, hypothesize, experiment, measure | "Having automated evaluators doesn't remove the need for human oversight"; teams must "periodically sample and annotate data" | Process over tooling; the loop is a practice, not a product |
| OpenAI, [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) | "Evaluate early and often. Write scoped tests at every stage"; "Evaluation is a continuous process"; continuous evaluation "on every change" | Three grader classes (metric, human with consensus voting, LLM-as-judge); data from "typical cases, edge cases, and adversarial cases" | **The hosted OpenAI Evals platform "will become read-only for existing users on October 31, 2026, and the platform is scheduled to shut down on November 30, 2026"** — a reminder not to make a vendor's eval UI the system of record |
| Vercel, [Eval-driven development](https://vercel.com/blog/eval-driven-development-build-better-ai-faster) (Oct 2024), [How we made v0 an effective coding agent](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent) (Jan 2026), [AI agent evaluation frameworks](https://vercel.com/i/ai-agent-evaluation-frameworks-production) (Jul 2026), [Evals primer](https://vercel.com/i/what-are-llm-evals-developers-primer) (Jul 2026) | Production traces → failures become evals ("we add new, failing prompts to the eval set"); "Every GitHub pull request that impacts the output pipeline includes eval results"; checks ordered by cost (deterministic → exact match → semantic → LLM judge → domain metrics); "Every production failure gets converted into a cheaper failure to catch next time" | The only UI generator with a published headline metric: "the percentage of generations that produce a working website in v0's preview instead of an error or a blank screen"; deterministic + "a small, fast, fine tuned model trained on data from a large volume of real generations" autofixers gave "a double-digit increase in success rates"; "Twenty well-chosen test cases that cover your core use cases are worth more than 200 examples scraped at random"; "An eval suite needs automated enforcement to work as an engineering control" | Most automated; human review is a sampled remainder rather than the first step |
| Braintrust, [eval improvement loop](https://www.braintrust.dev/foundations/understanding-the-eval-improvement-loop) and [eval feedback loops](https://www.braintrust.dev/blog/eval-feedback-loops) (Apr 2024) | Find a problem in production → create a dataset from logs (failing, borderline *and* passing cases) → baseline → one change at a time → compare; "New failure cases get sampled into datasets for the next iteration" | "Run online scores, ideally the same scores you do offline evals on, and find low scoring examples" | Vendor-shaped: online LLM scoring is the discovery mechanism, which Husain explicitly ranks after human error analysis |
| LangSmith, [Evaluation concepts](https://docs.langchain.com/langsmith/evaluation-concepts) | Datasets (examples, splits, auto-versions with tags) → experiments → evaluators returning `key`/`score`/`comment` feedback; annotation queues; offline (with references) vs online (production runs, "no reference outputs") | Splits and versions are first-class; annotation queues support pairwise and multi-reviewer | Neutral on human-first vs automation-first |
| Figma Make — [GPT-5.6 in Figma Make](https://www.figma.com/blog/gpt-5-6-is-now-available-in-figma-make/) (Jul 2026) | Only a glimpse: Figma "regularly" runs an eval that tests "the model's ability to go from 0-1 in creating a stock tracking app with a dark, gothic aesthetic" | Confirms model-swap evals exist for a design generator; no loop details | **Not verified as a loop** — no published grade→feedback account; Lovable likewise has only a public "Engineer – Agents & Evals" role (search-verified only) |

**The common shape.** Every source agrees on: (1) failures come from real traffic, not invented prompts; (2) graders are ordered by cost with deterministic first; (3) the eval set is the regression suite and grows from production; (4) a change is compared against a baseline on the same set; (5) a human reads outputs, not just scores. The disagreements are about sequence — Husain/Shankar/Yan put the human annotator *before* any automated grader exists; Vercel/Braintrust put online scoring first and the human on the sampled remainder — and about the *unit of ownership* (a single expert vs a platform team plus domain contributors).

**Open questions:** No UI generator other than v0 has published a loop with a metric; whether Figma Make, Lovable or Claude Design run per-generation grades that feed their prompts is unknown from public sources.

---

## 2. Infrastructure: where grades live

**What it is:** The store for traces, grades, human overrides and eval-set versions; the join to the prototype ledger; and the provenance fields that make a grade attributable to a generator version.

**Why it matters:** Design-sdlc's synthesis found that "inventory and version stamps are the missing metadata" ([00-synthesis](../design-sdlc/00-synthesis.md)); a grade without the generator version, catalog version and eval-set version that produced it cannot be fed back into anything.

**Key findings — the vendor field (all verified live):**

| Platform | Grade/score model | Attach point | Export / feed-back path | Self-host | Entry pricing |
|---|---|---|---|---|---|
| [Langfuse](https://github.com/langfuse/langfuse) (34.1k stars; "MIT licensed, except for the `ee` folders") | [Score](https://langfuse.com/docs/evaluation/evaluation-methods/custom-scores): `name`, `value`, `dataType` (`NUMERIC`/`CATEGORICAL`/`BOOLEAN`/`TEXT`), `comment`, `configId` validated against a `ScoreConfig`; idempotent by `id`+`name`+date | trace, observation, or session (`traceId` + optional `observationId`; `sessionId`; `datasetRunId`) | REST `POST /api/public/scores`; prompt versions linked to generations give per-version "Median score value", cost, latency ([link-to-traces](https://langfuse.com/docs/prompt-management/features/link-to-traces)) | "open source and you can self-host it for free" | [Hobby $0 (50k units), Core $29 (100k units), Pro $199, Enterprise $2,499](https://langfuse.com/pricing) |
| [Braintrust](https://www.braintrust.dev/) | `scores: {name: 0–1}` on experiment and log events; BTQL SQL endpoint ([API](https://www.braintrust.dev/docs/reference/api/Datasets)) | experiment rows and production log events | Datasets "Versioned: Every change is tracked, so experiments can pin to specific versions"; "Promote traces from logs" into dataset rows ([datasets](https://www.braintrust.dev/docs/platform/datasets)); [eval-action](https://github.com/braintrustdata/eval-action) (MIT) posts PR comments with regressions vs baseline | Enterprise only ("on-prem or hosted") | [Starter $0 (1 GB, 10k scores, 14-day retention), Pro $249 (5 GB, 50k scores, 30-day)](https://www.braintrust.dev/pricing) |
| [LangSmith](https://docs.langchain.com/langsmith/evaluation-concepts) | Feedback dict: `key`, `score`/`value`, `comment` | runs (offline: example + run; online: run only) | Dataset versions "automatically created when examples change", taggable and targetable in CI; annotation queues | Enterprise ("Self-hosted and hybrid") | [Developer $0 (5k base traces), Plus $39/seat (10k)](https://www.langchain.com/pricing); base = 14-day, extended = 400-day retention |
| [Arize Phoenix](https://github.com/Arize-ai/phoenix) (11.3k stars; Elastic License 2.0; "built on top of OpenTelemetry") | [Annotation](https://arize.com/docs/phoenix/tracing/tutorial/annotations-and-evaluations): `name`, `label`, `score`, `explanation`, with `annotator_kind` ∈ {HUMAN, LLM, CODE} | span (also trace) | "filter by annotation values, export to datasets, and compare across annotators" | "open-source and self-hosted" (Docker, Helm) | Self-host free; cloud pricing not fetched |
| [W&B Weave](https://github.com/wandb/weave) (Apache-2.0; 1.1k stars) | [Feedback](https://docs.wandb.ai/weave/guides/tracking/feedback): reactions, notes (≤1024 chars), structured `add(label, object)`; human annotation scorers with typed schemas | calls | `client.get_feedback(...)` queries; [Evaluation](https://docs.wandb.ai/weave/guides/core-types/evaluations) = dataset + scorers → evaluation run | Not verified | Not fetched |
| [MLflow](https://github.com/mlflow/mlflow) (Apache-2.0; 27.8k stars) | [Assessments/feedback](https://mlflow.org/docs/latest/genai/eval-monitor/): "Feedbacks are attached to traces and recorded with metadata, including user, timestamp, revisions" | traces | `mlflow.genai.evaluate()` with Evaluation Datasets as "a centralized repository for managing test cases" | Yes ("Self-Hosting") | Free (OSS) |
| [OpenTelemetry GenAI semconv](https://github.com/open-telemetry/semantic-conventions-genai) | Event `gen_ai.evaluation.result`: required `gen_ai.evaluation.name`; conditionally `gen_ai.evaluation.score.value` / `score.label`; recommended `gen_ai.evaluation.explanation`, `gen_ai.response.id` ([events](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-events.md)) | span or response id | Vendor-neutral wire format; status **Development** (not stable); conventions moved out of the main semconv repo ([notice](https://opentelemetry.io/docs/specs/semconv/gen-ai/)) | n/a | n/a |

- **The grade record as a first-class table, joined to the ledger.** None of the platforms knows what a "prototype" is. The ledger row from [design-sdlc 03 §10a](../design-sdlc/03-prototype-governance-outside-the-codebase.md) (id, question, tool, link, DS version, owner, status) should gain a one-to-many `grades` relation: `ledger_id`, `trace_id`, `grader` (name + version), `annotator_kind` (Phoenix's HUMAN/LLM/CODE is the right enum), `score`, `label`, `explanation`, `human_override` (bool + reviewer + reason), `generator_version`, `eval_set_version`. Langfuse's `ScoreConfig` and LangSmith's `key`/`score`/`comment` map onto it directly; if the team already runs OpenTelemetry, emit `gen_ai.evaluation.result` events and let the backend be swappable.
- **Provenance fields.** Every trace must carry: model id (`gen_ai.request.model` in the OTel conventions, per the [OTel blog](https://opentelemetry.io/blog/2026/genai-observability/)); the skill/plugin version — Claude Code resolves it as "Explicit `version` field… Resolved commit SHA… Archive digest… Command output hash" ([plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)); the catalog/design-system version (the DS-version stamp the governance doc already requires); the prompt hash or Langfuse/LangSmith prompt version (LangSmith pulls by tag, e.g. `client.pull_prompt("joke-generator:production")`, which resolves to a commit hash — [manage prompts](https://docs.langchain.com/langsmith/manage-prompts)); and the eval-set version (Braintrust `max_xact_id`, LangSmith dataset tag, or a git SHA over `evals/evals.json`).
- **Reproducibility is verify-the-artifact, not fix-the-seed.** On current Claude models the sampling parameters are gone — `temperature`/`top_p`/`top_k` return 400 on Fable 5/5.1, Opus 5 and Sonnet 5 (claude-api skill, cached 2026-06-24) — so there is no seed to pin, and [design-sdlc 04 §1](../design-sdlc/04-small-model-guardrails.md) already showed that even temperature 0 is not deterministic. Reproducibility therefore means: pin model id, skill SHA, catalog version and eval-set version; run k trials; report pass^k with error bars (§3).
- **Prompt caching interacts with generator versions.** Anthropic's cache invalidates hierarchically (`tools` → `system` → `messages`): any byte change to a skill or exemplar file that sits in the cached prefix invalidates everything after it; cache reads cost 0.1× base input (0.025× on Fable 5.1), 5-minute writes 1.25×, 1-hour writes 2×; minimum cacheable prefixes are 512 tokens on Opus 5/Fable 5, 1,024 on Sonnet 5, 4,096 on Haiku 4.5 ([prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). Practical consequence: a generator-version change shows up as a cost spike in the first cache window, and cost-per-screen comparisons across versions must exclude the warm-up window or normalize on `cache_read_input_tokens`.

**Open questions:** No platform joins scores to an external ledger id natively — the join is a metadata field the team supplies; whether OTel's evaluation event stabilizes in 2026 is unknown (no release as of the repo notice).

---

## 3. Eval set management

**What it is:** How the 20–50-task starter set from [design-sdlc 04 §6](../design-sdlc/04-small-model-guardrails.md) becomes a versioned, stratified, contamination-controlled asset that can detect a real change.

**Why it matters:** The eval set is the loop's memory. If exemplars leak into it, the grader grades the generator's own training material; if it is too small, the loop chases noise.

**Key findings:**

- **Build from real failures; keep passing cases too.** Anthropic: source from "your bug tracker and support queue" ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). Braintrust's loop explicitly includes "clear failures, borderline cases, and passing cases" in each dataset ([improvement loop](https://www.braintrust.dev/foundations/understanding-the-eval-improvement-loop)) so a fix can be checked for collateral damage. Vercel: prefer "Twenty well-chosen test cases" over "200 examples scraped at random" ([primer](https://vercel.com/i/what-are-llm-evals-developers-primer)).
- **Stratify by task type and difficulty; tag it as metadata.** LangSmith splits are "named subsets of a dataset used to segment examples" and support "category-based grouping, or staged rollout" ([concepts](https://docs.langchain.com/langsmith/evaluation-concepts)); Braintrust records carry `metadata` and `tags` for "filtering and grouping" ([datasets](https://www.braintrust.dev/docs/platform/datasets)). For design tasks the strata are the ones the construction-file series already uses: new screen vs edit, on-pattern vs off-catalog (E6), component count, and states required (empty/error/loading).
- **Held-out vs development splits — and the judge needs its own.** Husain's split (train 10–20% / dev 40–45% / test 40–45%, with "30 to 50 Pass examples and 30 to 50 Fail examples in both dev and test sets") is for validating the *judge*, not the generator ([Evals FAQ](https://hamel.dev/blog/posts/evals-faq/)). The generator needs a second split: a development set the skill author may look at while editing SKILL.md, and a held-out set only the CI gate sees.
- **Contamination is structural in this stream.** The exemplars in a skill's `references/` and the exemplar construction files in the cached prefix are, by design, the best answers to the most common tasks — which makes them the most likely eval items. Two controls exist in the wild: LiveBench replaces questions monthly and scores "according to objective ground-truth values" without an LLM judge ([LiveBench](https://arxiv.org/abs/2406.19314)); open-design-system-bench keeps prompts "intent-level and never name the expected component" and runs a linter against each system's catalog to enforce it ([bench](https://christophhellmuth.com/open-design-system-bench/)). Adopt both: a CI check that no eval prompt or gold output is byte-identical (or near-duplicate) to any file under the skill's `references/`, and a rotation rule.
- **Rotation and refresh cadence.** Husain: re-run error analysis on "significant changes: new features, prompt updates, model switches, or major bug fixes", review "at least 100+ fresh traces each review cycle" and "10-20 traces weekly" between ([FAQ](https://hamel.dev/blog/posts/evals-faq/)). Anthropic: watch for saturation — a 100% eval "tracks regressions but provides no signal for improvement". agentskills.io's guidance for skills: "Remove or replace assertions that always pass in both configurations" and investigate ones that always fail ([evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)). A retired item goes to a frozen regression tier, not the bin.
- **Dataset versioning options.** In-platform: Braintrust pins experiments to a dataset version; LangSmith auto-versions and tags. In-repo: DVC keeps "simple metafiles… in Git in lieu of large files" with the data in remote storage, giving "a single history for data, code, and ML models" ([DVC](https://doc.dvc.org/use-cases/versioning-data-and-models)); every Hugging Face dataset "is a Git repository" ([HF Hub](https://huggingface.co/docs/hub/en/datasets-overview)). For a 20–200-task set of YAML intents and gold construction files, plain git plus a tag per eval-set version is enough; DVC only when gold renders/screenshots get large.
- **Minimum size to detect a change.** Miller's [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) gives the tools: for binary scores `SE = √(s̄(1−s̄)/n)`; "report the standard error of the mean alongside (beneath) the mean"; clustered standard errors when items are related "can be over 3X larger than naive standard errors"; power analysis `n = (z_α/2 + z_β)² (ω² + σ²_A/K_A + σ²_B/K_B) / δ²`, and detecting a 3% difference at 80% power needs "at least 1,000 questions"; resampling helps until `E[σ²_i]/K ≪ Var(x)`. Applying the Bernoulli formula: at n = 30 and p = 0.8 the SE is ≈ 0.07, so a 95% interval spans roughly ±14 points; at n = 50 it is ≈ ±11. **A 20–50-task set can confirm a large regression or a large win; it cannot resolve a 5-point change.** Use it as a smoke gate, use paired per-task deltas (same task, old vs new generator) rather than aggregate rates, and let the held-out set grow toward 100+ (Husain's CI number) before trusting small deltas. pass^k needs k trials per task, which multiplies cost by k — [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) recommends k = 3.
- **Living vs frozen.** Keep two tiers: a *living* development set that rotates monthly (LiveBench replaces roughly a sixth per month, per its [GitHub description](https://github.com/livebench/livebench)) and a *frozen* regression tier (Vercel's "failing prompts" that must never regress). Version both; report them separately.

**Open questions:** No published eval set exists for design-system adherence beyond open-design-system-bench's four-system audit (898 graded generations, composite 52.2–63.4); its task style (intent-level, linted) is the best public template for the repo's set.

---

## 4. Metrics and dashboards

**What it is:** The numbers the loop reports, how they trend per generator version, and which of them lead versus lag.

**Why it matters:** Kavcic's warning for design-system teams applies to the loop: "Most teams over-index on outputs and completely miss outcomes" ([AI evals for design systems](https://learn.thedesignsystem.guide/p/ai-evals-for-design-systems)); an eval "without good criteria is a ruler with no units".

**Key findings:**

| Metric | Definition | Grader | Type | Source / precedent |
|---|---|---|---|---|
| First-pass validity | Construction file/schema valid on trial 1, before any repair | CODE | Leading | [design-sdlc 04 §6](../design-sdlc/04-small-model-guardrails.md); E1 target ≥90% ([synthesis](../prototype-construction/00-architecture-synthesis.md)) |
| Working-preview rate | Output renders without error or blank screen | CODE | Leading | v0's headline metric ([Vercel](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent)) |
| On-system rate | Imports resolve to registry; zero raw hex/px | CODE | Leading | Bench's "Imports", "API Fidelity", "Token Discipline", "Engagement Rate" ([open-design-system-bench](https://github.com/christophhdesign/open-design-system-bench)) |
| axe = 0 rate | Zero axe violations on built output | CODE | Leading | Bench "a11y Static"; [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) |
| pass^k (k = 3) | All k trials pass every deterministic gate | CODE | Leading | [Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |
| Loops-per-task | Repair rounds before gates pass (cap 2) | CODE | Leading | [design-sdlc 04 §3](../design-sdlc/04-small-model-guardrails.md) |
| Judge pass rate | LLM rubric pass on held-out set | LLM | Leading (but gameable, §6) | Bench "Judgment: per-task rubrics judged by a separate model" |
| Human override rate | % of machine grades a reviewer flipped | HUMAN | Lagging, and a judge-health signal | Husain's TPR/TNR alignment; Phoenix "compare across annotators" |
| Acceptance rate | % of graded prototypes promoted past the [design-sdlc 03 §9](../design-sdlc/03-prototype-governance-outside-the-codebase.md) checklist | HUMAN | Lagging (outcome) | Ledger status transitions |
| Cost per accepted screen | Σ tokens (cache-normalized) ÷ accepted screens | CODE | Lagging | Repo-defined; no external precedent found |
| Time-to-accepted | Ledger `created` → `promoted` | CODE | Lagging | Repo-defined |
| Lift | Guided vs bare compliance for the same tasks | CODE+LLM | Diagnostic | Bench "Lift" of +6.3 to +26.1 points depending on model |

- **Trend per generator version, not per day.** Langfuse aggregates "Median score value", cost and latency per linked prompt version ([link-to-traces](https://langfuse.com/docs/prompt-management/features/link-to-traces)); Braintrust and LangSmith compare experiments side by side. The x-axis of every chart is the skill/plugin version SHA plus catalog version, with the model id as a series. agentskills.io's `benchmark.json` shape — `pass_rate`, `time_seconds`, `tokens` as mean ± stddev, plus a `delta` between with-skill and baseline — is the minimal per-version record ([evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)).
- **Report error bars.** Miller's paper; agentskills.io notes stddev "is only meaningful with multiple runs per eval".
- **Leading vs lagging.** The CODE-graded rates move within a CI run and gate merges; override rate, acceptance rate, cost-per-accepted and time-to-accepted move weekly and answer "is the loop improving the *product*?" — Kavcic's outcome layer. A dashboard that shows only the first group is the classic Goodhart setup (§6).
- **What a weekly review looks at:** the per-version trend of the four CODE rates; the override rate and its top three reasons; new failure clusters from the 10–20 traces read; cost per accepted screen; saturation candidates (items always-pass in both arms). Template at the end.

**Open questions:** No public benchmark ties on-system rate to downstream acceptance; the correlation is the one number the repo's E-series could add.

---

## 5. Gating and change control

**What it is:** How a change to a skill, prompt, exemplar set or catalog is proposed, tested, approved, rolled out, and rolled back.

**Why it matters:** [design-sdlc 00](../design-sdlc/00-synthesis.md)'s theme is "gates, not pipes"; the generator's own edits need the same gates as the prototypes it produces.

**Key findings:**

- **CI gate on eval regression.** Braintrust's [eval-action](https://github.com/braintrustdata/eval-action) (MIT) runs evals in GitHub Actions and posts "improvements and regressions compared to baseline results" as a PR comment; Vercel makes "Every GitHub pull request that impacts the output pipeline" carry eval results and states that results must "automatically block merges when failures occur" ([frameworks](https://vercel.com/i/ai-agent-evaluation-frameworks-production)); LangSmith targets tagged dataset versions from CI ([concepts](https://docs.langchain.com/langsmith/evaluation-concepts)). promptfoo and Inspect (already picked in [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md)) are the vendor-free harnesses. The gate: frozen regression tier must not regress on any CODE metric; held-out pass^3 must not drop beyond the paired-delta SE; cost per screen must not rise more than an agreed budget.
- **PR review of skill edits.** Skills are files: "Project skills: Commit `.claude/skills/` to version control" ([skills](https://code.claude.com/docs/en/skills)). GitHub CODEOWNERS makes owners "automatically requested for review when someone opens a pull request that modifies code that they own", and branch protection can "require review from Code Owners" — noting "an approval from *any* of the owners is sufficient" ([GitHub docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)). Put `skills/**`, `evals/**` and the catalog under CODEOWNERS with the eval owner (§7) as a required reviewer.
- **Skill-level evals before the PR.** Anthropic's skill-creator (announced [3 March 2026](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)) runs `evals/evals.json` test cases in isolated subagents, writes `grading.json` with `text`/`passed`/`evidence`, aggregates `benchmark.json` for with-skill vs baseline, and runs "a blind A/B between two versions of the skill so you can confirm an edit is an improvement before committing it" ([Claude Code skills docs](https://code.claude.com/docs/en/skills); [SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). Its instruction "GENERATE THE EVAL VIEWER *BEFORE* evaluating inputs yourself" is the human-in-the-loop rule stated as code. Husain's [evals-skills](https://github.com/hamelsmu/evals-skills) (eight skills: evals-start, eval-audit, error-discovery, generate-synthetic-data, write-judge-prompt, validate-evaluator, evaluate-rag, build-review-interface) covers the error-analysis and judge-validation half that skill-creator does not.
- **Versioning and distribution of skills in practice (verified).** Plugin version resolution: explicit `version` in `plugin.json` (wins over the marketplace entry) → commit SHA → archive `sha256` → command-output hash; "Setting `version` pins the plugin. Users only receive updates when you change this field"; sources include GitHub/git with `ref` + `sha`, `git-subdir`, npm with `version` and private `registry`, zip with `sha256`; release channels are "separate marketplaces pointing to different refs"; a `renames` map migrates users; dependencies take semver ranges; `claude plugin validate .` checks manifests and "Version consistency" ([plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [plugins reference](https://code.claude.com/docs/en/plugins-reference)). Plugin skills are namespaced `plugin-name:skill-name` ([skills](https://code.claude.com/docs/en/skills)).
- **Feature flags for skills.** Org-wide: `managed-settings.json` with `extraKnownMarketplaces` + `enabledPlugins`, and `strictKnownMarketplaces` / `blockedMarketplaces` allowlists; project-level `.claude/settings.json` does the same per repo ([plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)). Per skill: `disable-model-invocation: true` keeps a skill user-only, and `skillOverrides` in settings hides or restricts skills without editing them — "Plugin skills are not affected by `skillOverrides`. Manage those through `/plugin` instead" ([skills](https://code.claude.com/docs/en/skills)). For API pipelines: Langfuse prompt labels (`production`, `latest`, custom; rollback "by setting the `production` label to that previous version"; protected labels editable only by admins/owners — [prompt versioning](https://langfuse.com/docs/prompt-management/features/prompt-version-control)); LangSmith commits with `staging`/`production` tags and "Owners only" promotion ([manage prompts](https://docs.langchain.com/langsmith/manage-prompts)); LaunchDarkly AgentControl treats prompts and model settings as a flag-like "single resource" with targeting rules, progressive traffic shifting, experiments, and aggregated "evaluation scores" — changes "take effect immediately without requiring you to redeploy" ([LaunchDarkly](https://launchdarkly.com/docs/home/ai-configs)).
- **Canary / A-B on live tasks.** For skills: two marketplaces (`stable`, `canary`) and a small cohort with `canary` enabled, comparing the ledger-joined grade table by generator version. For pipelines: label-based split (Langfuse `prod-a`/`prod-b`, LaunchDarkly percentage rollout). Grade the canary with the same graders as the eval set — Braintrust's "ideally the same scores you do offline evals on".
- **Rollback and changelog.** Pinned `version` + `sha` in the marketplace entry makes rollback a one-line revert; `renames` handles retirement; the PR that bumps the version carries the `benchmark.json` delta as its changelog entry. **Unverified:** Claude Code's own agent descriptions reference a `claude plugin eval` command with JSON reports and CI use under early access, but no public docs page for it resolved during this research; `claude plugin validate` is the documented command.
- **Approval roles.** Skill/prompt PR: author + eval owner (required via CODEOWNERS) + one designer for exemplar changes. Catalog/schema PR: design-system owner + eval owner, because it invalidates exemplars (§6). Eval-set PR: eval owner + the "benevolent dictator" domain expert. Grader/rubric PR: eval owner + designer, with judge re-validation against the human-labeled dev/test split.

**Open questions:** Whether a plugin marketplace can express a percentage rollout natively is not documented; cohort-by-marketplace is the workaround.

---

## 6. Failure modes of the loop itself

**What it is:** The ways a well-instrumented loop makes the numbers go up while the generator gets no better — or worse.

**Why it matters:** [design-sdlc 00](../design-sdlc/00-synthesis.md)'s third theme is "the thing that produced the artifact does not get to grade it"; a closed loop is where that rule is most likely to be broken accidentally.

| Failure | Mechanism | Evidence | Detection signal |
|---|---|---|---|
| **Goodhart / metric gaming** | The CODE metrics become the target; the generator satisfies the checker rather than the design | EvalSafetyGap (373 studies, 2018–2026) frames it as "a shared proxy-target divergence problem under optimization pressure" and recommends reporting capability, robustness and disclosure "as separate evidence layers rather than collapsed into a single safety score" ([arXiv 2606.30219](https://arxiv.org/abs/2606.30219)) | Leading metrics rise while acceptance rate, override rate or time-to-accepted do not improve; on-system rate up but engagement rate (real components vs hand-rolled) flat |
| **Judge gaming** | The generator learns the LLM judge's stylistic preferences | GPT-4 as judge "exhibits a significant degree of self-preference bias" and "LLMs assign significantly higher evaluations to outputs with lower perplexity than human evaluators" ([arXiv 2410.21819](https://arxiv.org/abs/2410.21819)); a judge with r = 0.47 global correlation "captured only 21%" of achievable best-of-4 improvement, pairwise judging raised recovery "from 21.1% to 61.2%" ([arXiv 2603.12520](https://arxiv.org/abs/2603.12520)) | Judge pass rate rises faster than CODE rates; human override rate on judge-passed items rises; judge and generator share a model family (cross-family verification, [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md)) |
| **Overfitting to the eval set** | Skill edits target the dev set; exemplars drift toward eval items | Contamination is "a well-documented obstacle" ([LiveBench](https://arxiv.org/abs/2406.19314)); the design-bench linter exists because prompts leak component names ([bench](https://christophhellmuth.com/open-design-system-bench/)) | Dev-set gain not matched on held-out; near-duplicate check between `references/` and `evals/` fires; live-task grades diverge from eval grades |
| **Rubric drift** | Criteria change as reviewers see outputs; old grades stop being comparable | "Criteria drift" — grading "helps users define criteria"; participants "even going back to change previous grades" ([EvalGen](https://arxiv.org/abs/2404.12272)) | Override rate jumps after a rubric edit without a generator change; version the rubric and re-grade a sample of old outputs on rubric bumps |
| **Exemplar staleness after a DS change** | Catalog or token change makes gold exemplars silently off-system | Governance doc: vendors do not stamp DS versions; drift audits lag generation ([design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md), [01 §3](../design-sdlc/01-source-of-truth-figma-vs-code.md)) | On-system rate drops on a catalog bump with no skill change; a hook that re-runs the token-drift grep over `references/` on every catalog PR |
| **Feedback loops that amplify judge bias** | Judge-selected outputs become the next exemplars, which train the next judge prompt | "LLM-based judgments influence both system development and evaluation", risking "bias reinforcement" ([LLM-Evaluation Tropes](https://arxiv.org/abs/2504.19076)) | Exemplar provenance shows judge-only selection; require HUMAN `annotator_kind` on anything promoted to `references/` |
| **Reward-hacking analogues in prompt optimization** | GEPA/MIPROv2-style optimizers exploit grader loopholes | Reward hacking "manifests as verbosity bias, sycophancy, hallucinated justification, benchmark overfitting, and evaluator manipulation" per the [reward-hacking survey](https://arxiv.org/html/2604.13602v1) (search-verified summary); the optimizer path is rung 13 of the [guardrail ladder](../design-sdlc/04-small-model-guardrails.md) | Optimized prompt wins on the optimizer's metric but loses the blind human A/B; skill length balloons; run the optimizer against CODE graders only, then human-review |
| **Over-automation** | Reviewers rubber-stamp machine grades | Human assessors shown an LLM judgment first "are significantly more likely to conform to the model's assessment" (search summary of the Tropes paper); overreliance is "relying on LLMs beyond their capabilities" with "cognitive deskilling" ([arXiv 2509.08010](https://arxiv.org/abs/2509.08010)); the Dagstuhl framework notes oversight roles "remain unclear" ([arXiv 2605.16278](https://arxiv.org/abs/2605.16278)) | Override rate trends to zero while acceptance rate does not rise; median review time per item collapses; fix by grading blind (agentskills.io's blind comparison), showing the human the output before the machine grade, and Yan's periodic annotation |

**Open questions:** No study measures judge gaming on UI artifacts specifically; the best available proxy is the human override rate on judge-passed items, tracked per generator version.

---

## 7. Ownership and cadence

**What it is:** Who runs the loop, how often, with what budget, and how it attaches to the design SDLC.

**Why it matters:** Every source that names an owner names a different one; the loop dies when it has none.

**Key findings:**

- **Two roles, not one.** Anthropic's split — an infrastructure owner plus domain experts who "contribute most eval tasks" ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)) — and Husain's "benevolent dictator" who "becomes the definitive voice on quality standards" ([FAQ](https://hamel.dev/blog/posts/evals-faq/)) are complementary. For a design generator: the **eval owner** (DesignOps or the design-system team) owns the store, the eval-set versions, the CI gate and the dashboard; the **quality dictator** (a senior product designer) owns the rubric, labels the judge-validation set, and adjudicates overrides. Kavcic's cadence — "cross-functional reviews every 1–2 weeks" and "monthly review sessions" ([design-systems evals](https://learn.thedesignsystem.guide/p/ai-evals-for-design-systems)) — matches Husain's weekly 10–20 traces / per-cycle 100+.
- **Review budget.** Weekly: 10–20 traces read by the dictator (≈1 hour). Per generator release or model swap: 100+ fresh traces plus re-grading of the frozen tier. Per rubric bump: re-label enough of the dev/test split to re-validate the judge (Husain's 30–50 pass and 30–50 fail per split).
- **Attachment to the SDLC.** In the [design-sdlc lifecycle table](../design-sdlc/00-synthesis.md), the loop attaches at stage 4 (Build: every generated screen gets CODE grades from the hooks recipes), stage 5 (Review & ship: the design-review subagent's verdict and the human crit become HUMAN/LLM grades on the same ledger row), and the Archive sweep (grades stay with the ledger row for audit). The promotion checklist in [03 §10b](../design-sdlc/03-prototype-governance-outside-the-codebase.md) is the acceptance event that turns a leading grade into a lagging outcome.
- **Scaling from one skill to a portfolio.** One skill: `evals/evals.json` beside SKILL.md, skill-creator's loop, grades in a repo JSON or Langfuse Hobby. Several skills and a pipeline: one store, one grade table keyed by `generator_version`, shared graders as a versioned package, CODEOWNERS per skill, a marketplace with `stable` and `canary`. Portfolio: per-skill dashboards roll up to the lifecycle metrics; catalog PRs fan out re-grades to every skill whose exemplars reference the changed components.

**Open questions:** No public DesignOps role description includes eval ownership; this is a proposal, not a documented practice.

---

## Cross-cutting themes

1. **The loop is the scientific method with a ledger.** Yan's "scientific method in disguise", Braintrust's one-change-at-a-time baseline, and Miller's error bars are the same discipline; the repo's contribution is joining it to the prototype ledger so a grade has an address.
2. **Humans first, then automate what they agreed on.** Husain, Shankar and Yan put annotation before automation; Vercel and Braintrust automate first and sample humans. The reconciliation is maturity (below): automate a grader only after it has been validated against human labels, and keep reading transcripts.
3. **Deterministic graders gate; model graders inform; humans decide.** The cost ordering from Vercel and [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) is also a trust ordering. Only CODE grades block a merge; LLM grades feed dashboards and triage; HUMAN grades change the rubric and the exemplars.
4. **Version everything the grade depends on.** Model id, skill SHA, catalog version, prompt version, eval-set version, rubric version, grader version. Every failure mode in §6 is detectable only when these are on the record.
5. **Do not let the vendor be the system of record.** OpenAI's Evals platform sunset, Braintrust's 14–30-day retention on non-enterprise tiers, and LangSmith's 14-day base traces all argue for a self-owned grade table (git, Postgres, or self-hosted Langfuse/Phoenix/MLflow) with vendors as views.
6. **Watch the loop's own vital signs.** Override rate, dev-vs-held-out gap, judge-vs-CODE divergence and review time per item are the loop's health metrics, distinct from the generator's.

---

## Recommendations: the reference loop

```
             ┌──────────────────────────────────────────────────────────────────────┐
             │  GENERATOR vN  (skill SHA · catalog vC · model id · prompt hash)      │
             └───────────────┬──────────────────────────────────────────────────────┘
                             │ generates
                             ▼
   [1] PROTOTYPE ──────── ledger row (PROTO-id, DS version, owner) + trace_id
                             │
                             ▼
   [2] GRADE (CODE) ────── schema-valid · on-system · axe=0 · preview renders · loops   ── blocks repair loop (max 2)
                             │
                             ▼
   [3] GRADE (LLM) ─────── rubric vR pass/fail + explanation (cross-family judge)       ── informs, never gates
                             │
                             ▼
   [4] REVIEW (HUMAN) ──── 10–20 traces/week, blind to machine grade → override + reason
                             │                         │
                             │                         └──► rubric vR+1 (criteria drift logged)
                             ▼
   [5] GRADE TABLE ─────── ledger_id · trace_id · grader · annotator_kind · score · override · versions
                             │
             ┌───────────────┼──────────────────────────────┐
             ▼               ▼                              ▼
   [6] EVAL SET vE+1   [7] EXEMPLARS/RULES edit      [8] DASHBOARD per generator version
       (failures →          (only HUMAN-graded              (leading vs lagging, error bars)
        living tier;         outputs may become
        contamination        references/)
        lint)                    │
                                 ▼
   [9] PR: skill/prompt/catalog change ── CODEOWNERS review ── CI gate (frozen tier no-regress,
                                                                held-out pass^3 within SE, cost budget)
                                 │
                                 ▼
   [10] CANARY (stable/canary marketplace or prompt label) ── same graders on live tasks ── promote or roll back
                                 │
                                 └──────────────► GENERATOR vN+1  (loop)
```

| Stage | Artifact | Store | Owner | Cadence | Gate |
|---|---|---|---|---|---|
| 1 Generate | Prototype + trace with provenance fields | Sandbox repo / vendor workspace; trace in Langfuse/Phoenix/OTel | Designer / pipeline | Per task | Ledger row exists ([03 §9](../design-sdlc/03-prototype-governance-outside-the-codebase.md)) |
| 2 CODE grade | Validator + hook outputs | Grade table (CODE) | Eval owner (automation) | Per generation | Pass or bounded repair; escalate after 2 |
| 3 LLM grade | Rubric verdict + explanation | Grade table (LLM) | Eval owner | Per generation (sampled in prod) | None — informs triage |
| 4 HUMAN review | Override + reason; new failure notes | Grade table (HUMAN); annotation queue | Quality dictator | Weekly 10–20; 100+ per release | Override rate reviewed weekly |
| 5 Grade table | Joined record keyed by ledger id and versions | Git/Postgres or self-hosted platform | Eval owner | Continuous | Schema-checked |
| 6 Eval set | `evals/` living + frozen tiers, versioned | Git tag (DVC if large) or platform dataset version | Eval owner + dictator | Monthly rotation; frozen never shrinks | Contamination lint vs `references/` |
| 7 Exemplars/rules | SKILL.md, `references/`, rules, catalog | Git | Skill author + designer | Per PR | Only HUMAN-graded outputs promoted |
| 8 Dashboard | Per-version trends with SE | Platform or notebook | Eval owner | Weekly review | Leading and lagging shown together |
| 9 Change PR | Diff + `benchmark.json` delta | Git + CI | Author, eval owner (CODEOWNERS) | Per change | Frozen no-regress; held-out within SE; cost budget |
| 10 Canary | Cohort grades by generator version | Grade table | Eval owner | 1–2 weeks | Promote by version bump; roll back by pinned `sha` |

---

## Maturity model

| Level | Name | Entry criteria | What exists |
|---|---|---|---|
| 0 | No grades | — | Prototypes generated; quality judged in conversation; nothing recorded |
| 1 | Ledger + deterministic grades | Ledger row per prototype; hooks recipes 1–4 installed; grades written to the row | CODE grades (schema, on-system, axe, render) on every generation; no eval set |
| 2 | Eval set + human error analysis | 20–50 real-failure tasks in `evals/`; ≥30 traces read and coded by a named quality dictator; rubric v1 written *after* reading | Skill-creator or promptfoo runs on demand; `benchmark.json` per skill version; human review notes stored |
| 3 | Gated loop | Held-out split; CI gate on frozen tier + held-out delta with SE; CODEOWNERS on skills/evals/catalog; pinned plugin versions; grade table joined to ledger | Every skill/prompt/catalog PR carries a delta; rollback is a revert; dashboard per generator version |
| 4 | Automated loop with human audit | LLM judge validated on labeled dev/test split (TPR/TNR recorded); online grading on live tasks; canary cohort; override rate, dev-vs-held-out gap and judge-vs-CODE divergence on the dashboard | Failures auto-sampled into the living tier; weekly human audit is blind and budgeted; rubric versions trigger re-validation; catalog bumps fan out re-grades |

Promotion between levels is itself gated: do not turn on online LLM grading (level 4) until the judge's agreement with human labels is measured (level 3 exit), and do not gate CI on a held-out delta (level 3) until the set is large enough that the delta clears its standard error (level 2 exit).

---

## Template: weekly loop review

```
Loop review — week of ____   generator versions in play: ____ (stable) / ____ (canary)

1. Leading (CODE) per version, with SE:  first-pass ___  on-system ___  axe=0 ___  pass^3 ___  loops/task ___
2. Lagging: acceptance rate ___  cost/accepted screen ___ (cache-normalized)  time-to-accepted ___
3. Judge health: LLM pass ___  human override rate ___  top 3 override reasons: ___ / ___ / ___
4. Traces read this week (10–20, blind): new failure modes? ___  existing modes changed? ___
5. Eval set: items always-pass in both arms (retire → frozen): ___   contamination lint hits: ___
   living-tier additions from this week's failures: ___   held-out size ___ (target ≥100)
6. Loop vitals: dev-vs-held-out gap ___  judge-vs-CODE divergence ___  median review time/item ___
7. Change control: PRs merged with benchmark delta: ___   canary verdict: promote / extend / roll back
8. Catalog or rubric bumps this week? ___ → exemplar re-grade scheduled? ___ → judge re-validation scheduled? ___
9. Decisions (one line each, owner, due): ___
10. Next release re-analysis (100+ fresh traces) due: ____
```

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| Anthropic "Demystifying evals for AI agents" | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents | Eval components, pass^k, saturation, ownership split, "read the transcripts" | fetched OK | guardrails-and-evals |
| Hamel Husain Evals FAQ | https://hamel.dev/blog/posts/evals-faq/ | Error analysis first; binary labels; judge validation splits; CI vs monitoring cadence | fetched OK | guardrails-and-evals |
| hamelsmu/evals-skills | https://github.com/hamelsmu/evals-skills | Eight Claude Code skills for error discovery, judge writing and validation, review interfaces | fetched OK (blog); repo search-verified | skills |
| skill-creator (Anthropic) | https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md | `evals/evals.json` → grading → benchmark → blind A/B for skill versions | fetched OK | skills |
| agentskills.io — Evaluating skills | https://agentskills.io/skill-creation/evaluating-skills | The eval file format and iteration loop the Claude Code docs point to | fetched OK | guardrails-and-evals |
| open-design-system-bench | https://github.com/christophhdesign/open-design-system-bench | MIT benchmark: guided vs bare compliance, token discipline, API fidelity, a11y, LLM judge; intent-level prompt linter | fetched OK | guardrails-and-evals |
| Adding Error Bars to Evals (Miller) | https://arxiv.org/abs/2411.00640 | SE, clustered SE, power analysis for eval sizes | fetched OK | guardrails-and-evals |
| Who Validates the Validators? (EvalGen) | https://arxiv.org/abs/2404.12272 | Criteria drift; align graders to human labels | fetched OK | review-and-feedback |
| Langfuse | https://github.com/langfuse/langfuse | MIT (ex-`ee`) self-hostable tracing + typed scores + prompt labels with per-version metrics | fetched OK | *proposed:* observability & eval infrastructure |
| Arize Phoenix | https://github.com/Arize-ai/phoenix | ELv2 self-hosted OTel tracing; annotations with HUMAN/LLM/CODE `annotator_kind` | fetched OK | observability & eval infrastructure |
| MLflow GenAI | https://mlflow.org/docs/latest/genai/eval-monitor/ | Apache-2.0; `mlflow.genai.evaluate`, feedback on traces, evaluation datasets | fetched OK | observability & eval infrastructure |
| W&B Weave | https://github.com/wandb/weave | Apache-2.0; Evaluation = dataset + scorers; feedback and human annotation scorers | fetched OK | observability & eval infrastructure |
| Braintrust | https://www.braintrust.dev/docs/platform/datasets | Versioned datasets pinned to experiments; logs → dataset rows; online scoring | fetched OK | observability & eval infrastructure |
| braintrustdata/eval-action | https://github.com/braintrustdata/eval-action | MIT GitHub Action: evals on PR with regression comment vs baseline | fetched OK | hooks |
| LangSmith evaluation concepts | https://docs.langchain.com/langsmith/evaluation-concepts | Datasets/splits/versions, experiments, annotation queues, online vs offline | fetched OK | observability & eval infrastructure |
| OpenTelemetry GenAI semconv (evaluation event) | https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-events.md | `gen_ai.evaluation.result` event; Development status | fetched OK | observability & eval infrastructure |
| Claude Code plugin marketplaces | https://code.claude.com/docs/en/plugin-marketplaces | Version resolution, pinning, release channels, managed allowlists, `claude plugin validate` | fetched OK | subagents-and-commands |
| Claude Code skills (evals section) | https://code.claude.com/docs/en/skills | `disable-model-invocation`, `skillOverrides`, plugin namespacing, skill-creator loop | fetched OK | skills |
| Langfuse prompt version control | https://langfuse.com/docs/prompt-management/features/prompt-version-control | Labels as deploy pointers; protected labels; rollback by relabel | fetched OK | prototype-governance |
| LangSmith manage prompts | https://docs.langchain.com/langsmith/manage-prompts | Commits, `staging`/`production` tags, owners-only promotion | fetched OK | prototype-governance |
| LaunchDarkly AgentControl | https://launchdarkly.com/docs/home/ai-configs | Prompts/models as flag-like configs with targeting, rollouts, evaluation-score metrics | fetched OK | prototype-governance |
| GitHub CODEOWNERS | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners | Required reviewers for `skills/**`, `evals/**`, catalog | fetched OK | prototype-governance |
| DVC data versioning | https://doc.dvc.org/use-cases/versioning-data-and-models | Git metafiles + remote storage for large eval assets | fetched OK | guardrails-and-evals |
| LiveBench | https://arxiv.org/abs/2406.19314 | Monthly-refreshed, ground-truth-scored benchmark — the "living tier" precedent | fetched OK | guardrails-and-evals |
| Vercel eval-driven development series | https://vercel.com/i/ai-agent-evaluation-frameworks-production | The only published UI-generator loop with a headline metric | fetched OK | guardrails-and-evals |
| Self-Preference Bias in LLM-as-a-Judge | https://arxiv.org/abs/2410.21819 | Judge-gaming evidence (perplexity preference) | fetched OK | review-and-feedback |
| When LLM Judge Scores Look Good but Best-of-N Decisions Fail | https://arxiv.org/abs/2603.12520 | Why pointwise judges fail as selectors; use pairwise | fetched OK | review-and-feedback |
| AI evals for design systems (Kavcic) | https://learn.thedesignsystem.guide/p/ai-evals-for-design-systems | Output vs outcome framing; review cadence for DS teams | fetched OK | prototype-governance |

---

## Sources

- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills
- https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- https://agentskills.io/skill-creation/evaluating-skills
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/plugin-marketplaces
- https://code.claude.com/docs/en/plugins-reference
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://hamel.dev/blog/posts/evals-faq/
- https://hamel.dev/blog/posts/evals-skills/
- https://github.com/hamelsmu/evals-skills
- https://arxiv.org/abs/2404.12272 — Shankar et al., Who Validates the Validators?
- https://eugeneyan.com/writing/eval-process/
- https://developers.openai.com/api/docs/guides/evaluation-best-practices
- https://vercel.com/blog/eval-driven-development-build-better-ai-faster
- https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent
- https://vercel.com/i/ai-agent-evaluation-frameworks-production
- https://vercel.com/i/what-are-llm-evals-developers-primer
- https://www.figma.com/blog/gpt-5-6-is-now-available-in-figma-make/
- https://www.braintrust.dev/foundations/understanding-the-eval-improvement-loop
- https://www.braintrust.dev/blog/eval-feedback-loops
- https://www.braintrust.dev/docs/platform/datasets
- https://www.braintrust.dev/docs/reference/api/Datasets
- https://www.braintrust.dev/pricing
- https://github.com/braintrustdata/eval-action
- https://docs.langchain.com/langsmith/evaluation-concepts
- https://docs.langchain.com/langsmith/manage-prompts
- https://www.langchain.com/pricing
- https://github.com/langfuse/langfuse
- https://langfuse.com/docs/evaluation/evaluation-methods/custom-scores
- https://langfuse.com/docs/prompt-management/features/prompt-version-control
- https://langfuse.com/docs/prompt-management/features/link-to-traces
- https://langfuse.com/pricing
- https://github.com/Arize-ai/phoenix
- https://arize.com/docs/phoenix/tracing/tutorial/annotations-and-evaluations
- https://github.com/wandb/weave
- https://docs.wandb.ai/weave/guides/core-types/evaluations
- https://docs.wandb.ai/weave/guides/tracking/feedback
- https://github.com/mlflow/mlflow
- https://mlflow.org/docs/latest/genai/eval-monitor/
- https://opentelemetry.io/blog/2026/genai-observability/
- https://opentelemetry.io/docs/specs/semconv/gen-ai/
- https://github.com/open-telemetry/semantic-conventions-genai
- https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-events.md
- https://launchdarkly.com/docs/home/ai-configs
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- https://doc.dvc.org/use-cases/versioning-data-and-models
- https://huggingface.co/docs/hub/en/datasets-overview
- https://arxiv.org/abs/2411.00640 — Miller, Adding Error Bars to Evals
- https://arxiv.org/abs/2406.19314 — LiveBench
- https://github.com/livebench/livebench
- https://arxiv.org/abs/2410.21819 — Self-Preference Bias in LLM-as-a-Judge
- https://arxiv.org/abs/2603.12520 — When LLM Judge Scores Look Good but Best-of-N Decisions Fail
- https://arxiv.org/abs/2606.30219 — EvalSafetyGap
- https://arxiv.org/html/2604.13602v1 — Reward Hacking in the Era of Large Models (search-verified summary only)
- https://arxiv.org/abs/2504.19076 — LLM-Evaluation Tropes
- https://arxiv.org/abs/2509.08010 — Measuring and Mitigating Overreliance
- https://arxiv.org/abs/2605.16278 — Keeping an Eye on AI (Dagstuhl human-oversight framework)
- https://christophhellmuth.com/open-design-system-bench/
- https://github.com/christophhdesign/open-design-system-bench
- https://learn.thedesignsystem.guide/p/ai-evals-for-design-systems
- https://lovable.dev/careers/engineer-agents-and-evals-9f4963 (search-verified only)
