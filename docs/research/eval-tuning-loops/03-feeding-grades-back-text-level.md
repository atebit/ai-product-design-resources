# Feeding Grades Back Into the Generator — Text-Level Adaptation

**Scope:** How a *reviewed* grade on a generated prototype becomes a concrete, versioned change to what the generator **reads** — a hook, a rule, a skill instruction, an exemplar, a schema/catalog entry, or an optimized prompt — without touching model weights. Three generators are in scope: a **Claude Code skill** (SKILL.md + `references/` exemplars + CLAUDE.md rules + hooks), the repo's **construction-file pipeline** (Zod catalog → schema-valid JSON → deterministic builder), and an **API pipeline** with its own system prompt and few-shots. Grading itself (doc 01), grade review (doc 02), weight-level tuning (doc 04) and the end-to-end loop (doc 05) are sibling docs; this one answers a single question: *which lever should absorb which failure, and how is the change made, verified and versioned?* It builds on the guardrail evidence in [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md) (rule volume degrades adherence; exemplars are the strongest teacher; the big model writes the small model's prompt) and the altitude ladder in [skillchains §6](../../../skill-resources/skillchains.md), and does not repeat them. Verified live 2 September 2026; every sourced claim links its source; anything that could not be verified is marked.

## Table of Contents

1. [The altitude ladder for fixes](#1-the-altitude-ladder-for-fixes)
2. [Exemplar curation from graded outputs](#2-exemplar-curation-from-graded-outputs)
3. [Skill and rule self-improvement](#3-skill-and-rule-self-improvement)
4. [Automated prompt optimization](#4-automated-prompt-optimization)
5. [Tuning the construction-file pipeline](#5-tuning-the-construction-file-pipeline)
6. [Versioning and regression](#6-versioning-and-regression)
7. [Worked examples](#7-worked-examples)
8. [Cross-cutting themes](#cross-cutting-themes)
9. [Recommendations: the fix-altitude table](#recommendations-the-fix-altitude-table)
10. [Template: skill change record](#template-skill-change-record)
11. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
12. [Sources](#sources)

---

## 1. The altitude ladder for fixes

**What it is:** Given a failure class surfaced by a reviewed grade — off-token color, invented component, missing empty state, weak hierarchy, wrong copy tone, wrong layout pattern — the decision of *where* the fix lives. The levers, from most to least deterministic: a **hook** (fires on every event, cannot be reasoned around), a **schema/catalog change** (makes the failure unrepresentable), a **rule** (always-on, short, probabilistic-high-adherence), a **skill instruction** (procedural, loaded on demand), an **exemplar** (shows the shape rather than describing it), and a **prompt-optimizer run** (for residual gaps no human has articulated).

**Why it matters:** Every fix that lands at the wrong altitude either does not stick (a "never hardcode hex" rule that drifts) or costs adherence everywhere else (one more line in an already-long CLAUDE.md). The repo's determinism spectrum is the frame: hooks always fire; rules are "loaded every turn; adherence is good but degrades with rule volume and context length"; skills depend on description matching ([skillchains §6](../../../skill-resources/skillchains.md)). Anthropic's own docs say the same thing about the probabilistic tier: CLAUDE.md and auto memory are treated "as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead" ([Claude Code memory docs](https://code.claude.com/docs/en/memory)).

**Key findings:**

- **Rule volume is a measured cost, not a folk worry.** IFScale (500 keyword-inclusion instructions, 20 models) found "even the best frontier models only achieve 68% accuracy at the max density of 500 instructions," with "three distinct performance degradation patterns" and a "bias towards earlier instructions" ([arXiv 2507.11538](https://arxiv.org/abs/2507.11538)). Claude Code's guidance is now numeric: "target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence," and "if two rules contradict each other, Claude may pick one arbitrarily" ([memory docs](https://code.claude.com/docs/en/memory)). The small-model evidence is worse still ([design-sdlc/04 §4](../design-sdlc/04-small-model-guardrails.md)). Corollary: a rule is a scarce slot; a grade should only *add* a rule when it cannot be a hook, a schema constraint, or an exemplar.
- **Show beats tell, and the vendor guidance is specific.** Anthropic's prompting reference: "Include 3–5 examples for best results," examples should be "Diverse: Cover edge cases and vary enough that Claude doesn't pick up unintended patterns," and "Tell Claude what to do instead of what not to do" ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)). The construction-file research found exemplars of the exact output format to be "the strongest teacher" ([prototype-construction/02 §3.5](../prototype-construction/02-intent-spec-and-context.md)). Anthropic's skill-eval guidance adds the failure mode of over-telling: "If pass rates plateau despite adding more rules, the skill may be over-constrained — try removing instructions and see if results hold or improve," and "Reasoning-based instructions ('Do X because Y tends to cause Z') work better than rigid directives ('ALWAYS do X, NEVER do Y')" ([agentskills.io — Evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)).
- **Repeated procedural fixes should become scripts, not prose.** "If every test run independently wrote a similar helper script (a chart builder, a data parser), that's a signal to bundle the script into the skill's `scripts/` directory" ([agentskills.io](https://agentskills.io/skill-creation/evaluating-skills)). This is the skill-side equivalent of the pipeline's deterministic builder: move judgement-free work out of the model entirely.
- **Claude Code will now prune for you.** `/doctor` "trims checked-in CLAUDE.md files by cutting content Claude could derive from the codebase, and migrates the always-loaded guidance that remains into skills and nested CLAUDE.md files that load on demand," and "finds unused skills, MCP servers, and plugins versus their context cost" ([commands reference](https://code.claude.com/docs/en/commands)). It is an altitude-correction tool: it demotes always-on text to on-demand text.

| Failure class (from grade) | Best lever | Why that altitude |
|---|---|---|
| Off-token color / px literal | **Hook** (token-drift grep on PostToolUse) + builder ownership of styles | Must-never-happen; a rule alone drifts ([design-sdlc/04 §7](../design-sdlc/04-small-model-guardrails.md)) |
| Invented component / prop | **Catalog/schema** (enum-typed `type`, registry query) | Make it unrepresentable, not catchable |
| Missing empty / loading / error state | **Schema** (required `states` slot with defaults) for the pipeline; **rule + exemplar** for skills | Structural omission → structural requirement |
| Weak visual hierarchy | **Exemplar** (gold screen) + builder layout rule | Hard to state, easy to show |
| Wrong copy tone | **Rule** (short voice rule) + **contrast exemplar** ("not this") | Style is stated in one line, demonstrated in two |
| Wrong layout pattern for the intent | **Skill instruction** (pattern-selection procedure) + nearest-exemplar retrieval | Procedural judgement, loaded on demand |
| Residual, un-nameable gap | **Prompt-optimizer run** (GEPA-style, with textual feedback) | Lets the reflector find the words |

**Open questions:** No study isolates the *marginal* cost of one added rule on a design task; the IFScale curve is for keyword constraints. The point at which a skill instruction should become a hook is judged, not measured.

---

## 2. Exemplar curation from graded outputs

**What it is:** Turning top-graded outputs into a maintained **golden set** of few-shots — selected for diversity as well as quality, augmented with contrast ("not this") examples, kept in sync with the design-system version, and stored where each generator reads them (skill `references/`, the cached prompt prefix, or a retrieval index keyed by task type).

**Why it matters:** Exemplars are the lever with the strongest evidence and the lowest adherence cost, and grades are exactly the selection signal they need. The construction-file research already proposed the loop: "every time the pipeline fails and gets hand-fixed, the corrected pair is a candidate new exemplar. The example gallery is the pipeline's training loop, at zero fine-tuning cost" ([prototype-construction/02 §3.5](../prototype-construction/02-intent-spec-and-context.md)).

**Key findings:**

- **Selection beats quantity.** KATE showed that retrieving examples "semantically-similar to a test sample" consistently beats random selection, with gains of "41.9% on the ToTTo dataset" and "45.5% on the NQ dataset" ([arXiv 2101.06804](https://arxiv.org/abs/2101.06804)). But similarity alone under-covers structure: selecting "diverse demonstrations" that "collectively cover all of the structures required in the output program" substantially improved compositional generalization over nearest-neighbour selection ([arXiv 2212.06800](https://arxiv.org/abs/2212.06800)). For UI generation the practical rule is doc 02's: a small canonical gallery (list/detail, form, dashboard, multi-screen flow, one "weird parts" example), with the 1–2 nearest selected per task.
- **Order matters more than people assume.** The order of few-shot examples "can make the difference between near state-of-the-art and random guess performance"; a 13% relative gain came from ordering alone, and good orderings do not transfer between models ([arXiv 2104.08786](https://arxiv.org/abs/2104.08786)). Fix the order in the versioned exemplar set and re-evaluate when the model changes.
- **Contrast examples work, in small doses.** Contrastive in-context learning — "positive examples that illustrate the true intent, along with negative examples that show what characteristics we want LLMs to avoid" — "significantly improves performance compared to standard few-shot prompting" on preference-style tasks ([arXiv 2401.17390](https://arxiv.org/abs/2401.17390)); a 2025 follow-up uses negative samples mainly to *select* better positives ([arXiv 2507.23211](https://arxiv.org/abs/2507.23211)). Combined with Anthropic's "tell it what to do" guidance, the reading is: a graded *failure* is more valuable as a labelled contrast pair next to its corrected version than as a new prohibition in a rule file.
- **How many before they hurt.** Many-shot ICL reports "significant performance gains" from hundreds to thousands of shots on long-context models ([arXiv 2404.11018](https://arxiv.org/abs/2404.11018)), but design exemplars are large (a screen is thousands of tokens) and Anthropic's operational guidance is 3–5 ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)). DSPy's optimizer ladder gives the data-side numbers: `BootstrapFewShot` for "very few examples (around 10)," `BootstrapFewShotWithRandomSearch` for "50 examples or more," and `KNNFewShot` for retrieval-time selection ([DSPy optimizers](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md)). The repo's unmeasured "dosage curve" (0/1/2/4 exemplars) remains the right experiment ([prototype-construction/02](../prototype-construction/02-intent-spec-and-context.md)).
- **Where they live.** Skills: "Move detailed docs to references/… Keep SKILL.md under 5,000 words" ([Anthropic skills guide, PDF](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)); a loaded skill's body "stays in context across turns, so every line is a recurring token cost" ([Claude Code skills docs](https://code.claude.com/docs/en/skills)) — so exemplars belong in `references/` and are read on demand, not inlined. API pipelines: exemplars in the cached prefix, which on Haiku must exceed 4,096 tokens to cache at all ([design-sdlc/04 §4](../design-sdlc/04-small-model-guardrails.md)). Construction-file pipelines: exemplars are *construction files*, which is the decisive storage advantage — they can be re-rendered by the builder after any catalog change, whereas code exemplars silently go stale (doc 02's open question about "an old example teaching a deprecated pattern").
- **Rotation and versioning.** Tag every exemplar with the catalog/design-system version it was graded against, re-validate the set against the current schema in CI, and retire an exemplar when its grade would fall under the current rubric. The skill-creator's analyst pass gives the retirement signal for the *eval* side — "assertions that always pass regardless of skill (non-discriminating)" ([skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)) — and the same logic applies to exemplars that no longer discriminate.

**Open questions:** No published result on contrast examples for visual/design output; whether a "not this" screen teaches or merely anchors is untested. Exemplar retirement thresholds are policy, not evidence.

---

## 3. Skill and rule self-improvement

**What it is:** Mechanisms by which the *instructions* a generator reads are revised from its own graded outputs — Anthropic's skill-creator loop, Claude Code's auto memory and `/doctor`, agent "lessons learned" files, Reflexion-style episodic memory, evolving-context frameworks (ACE, Dynamic Cheatsheet, Voyager's skill library), self-editing agents (SICA), and automated rule synthesis from failure clusters (AutoSpec, AgentDebug).

**Why it matters:** This is where most teams' feedback loop actually lives today — a human reads a bad output and edits SKILL.md — and where the failure modes (rule bloat, contradictions, context collapse) accumulate silently.

**Key findings:**

- **skill-creator is a real eval-and-iterate loop, verified.** Test cases live in `evals/evals.json` (prompt, expected output, files, later `assertions`); for each case it spawns "two subagents in the same turn — one with the skill, one without"; when improving an existing skill it snapshots the old version and uses it as the baseline; `aggregate_benchmark` "produces benchmark.json and benchmark.md with pass_rate, time, and tokens for each configuration, with mean ± stddev and the delta"; an **analyst pass** surfaces "assertions that always pass regardless of skill (non-discriminating), high-variance evals (possibly flaky), and time/token tradeoffs"; and a separate description optimizer "splits the eval set into 60% train and 40% held-out test, evaluates the current description (running each query 3 times to get a reliable trigger rate), then calls Claude to propose improvements based on what failed… iterating up to 5 times" ([skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)). The announcement adds blind judging: "comparator agents for A/B comparisons: two skill versions, or skill vs. no skill. They judge outputs without knowing which is which" ([skill-creator announcement](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)); the Claude Code docs list it as a plugin with "Version comparison: runs a blind A/B between two versions of the skill" ([skills docs](https://code.claude.com/docs/en/skills)). Its own caution matters for design: "Subjective skills (writing style, design quality) are better evaluated qualitatively — don't force assertions onto things that need human judgment."
- **`/skill-doctor` could not be verified.** It does not appear in the Claude Code commands reference, the docs index, or the public CHANGELOG as of 2 September 2026; the name is used by several community skills (e.g. [amaljithkuttamath/skill-doctor](https://github.com/amaljithkuttamath/skill-doctor), search result only, not fetched). What *is* built in is `/doctor`, which prunes CLAUDE.md and migrates always-on guidance into skills ([commands reference](https://code.claude.com/docs/en/commands)). Treat "skill-doctor" as a community pattern, not a product feature, until documented. Claude Code's own in-product guidance (September 2026) describes an early-access `claude plugin eval` command — plugin eval suites with a JSON report, a sandbox, and CI use — and a `/skill-doctor` report; neither is in the public reference yet, so treat both as early-access features to re-check rather than as absent.
- **Auto memory is a built-in lessons-learned file — with a hard cap and no sharing.** Claude writes four note types (`user`, `feedback`, `project`, `reference`); "the first 200 lines of MEMORY.md, or the first 25KB, whichever comes first, are loaded"; Claude Code "reminds Claude to shorten it: keep one line per entry, move detail into topic files, and merge or drop stale entries"; and "Auto memory is machine-local" ([memory docs](https://code.claude.com/docs/en/memory)). So it is a per-designer adaptation channel, not the team's versioned generator — the `feedback` notes it accumulates are raw material for a reviewed CLAUDE.md or skill change, not a substitute for one.
- **Evolving-context research converges on the same design.** Reflexion agents "maintain their own reflective text in an episodic memory buffer" and reached 91% pass@1 on HumanEval ([arXiv 2303.11366](https://arxiv.org/abs/2303.11366)). Dynamic Cheatsheet keeps "concise, transferable snippets rather than entire transcripts" and took GPT-4o on Game of 24 from 10% to 99% ([arXiv 2504.07952](https://arxiv.org/abs/2504.07952)). Voyager grew "an ever-growing skill library of executable code" via "environment feedback, execution errors, and self-verification" ([arXiv 2305.16291](https://arxiv.org/abs/2305.16291)). ACE (ICLR 2026) names the two failure modes of naive rewriting — "brevity bias, which drops domain insights for concise summaries," and "context collapse, where iterative rewriting erodes details over time" — and fixes them with a generator/reflector/curator split and "structured, incremental updates," reporting +10.6% on agent benchmarks "without labeled supervision… by leveraging natural execution feedback" ([arXiv 2510.04618](https://arxiv.org/abs/2510.04618)). The transferable rule: *append structured deltas; never let a model rewrite the whole playbook.*
- **Self-editing agents and skill evolution have real numbers.** SICA, an agent that edits its own codebase, went "from 17% to 53% on a random subset of SWE Bench Verified" ([arXiv 2504.15228](https://arxiv.org/abs/2504.15228)). Most relevant to this repo: GEPA's gskill evolves a **SKILL.md** for a codebase using verifiable tasks as the signal — "Under 300 rollouts… a resolve rate of 82% on Jinja and 93% on Bleve" (from 55% and 24%), and when the learned skill is installed in Claude Code, Haiku 4.5 on Bleve went "from 79.3% to 98.3%" while "average duration dropped from 173s to 142s"; the authors caveat that "tasks generated are on the simpler side" ([GEPA blog](https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/)).
- **Rule synthesis from failure clusters exists, for rules with a verifier.** AutoSpec evolves expert-written rules from annotated traces by mining "false-positive and false-negative counterexamples" and using inductive logic programming to find discriminating predicates, reaching F1 0.98/0.93 and converging "within 4-5 iterations," with rules that stay "human-readable, auditable" ([arXiv 2606.24245](https://arxiv.org/abs/2606.24245)). AgentDebug's taxonomy (memory/reflection/planning/action/system) plus root-cause feedback gave "24% higher all-correct accuracy" ([arXiv 2509.25370](https://arxiv.org/abs/2509.25370)). For design, the analogue is clustering reviewed grades by rubric dimension and letting a reflector propose *one* rule or exemplar per cluster — then verifying it on the held-out set before merge.
- **Failure modes, named.** Rule bloat (IFScale; the 200-line guidance), contradictory rules ("Claude may pick one arbitrarily"), context collapse and brevity bias (ACE), and non-discriminating assertions that inflate pass rates (skill-creator analyst pass). Anthropic's remedy list is short: generalize from feedback rather than patching single cases, keep the skill lean, explain the why, bundle repeated work ([agentskills.io](https://agentskills.io/skill-creation/evaluating-skills)).

**Open questions:** No published self-improving-skill result uses a *design* grader; every number above comes from tasks with executable tests. Whether ACE-style incremental playbooks stay within the 200-line budget over months is unmeasured.

---

## 4. Automated prompt optimization

**What it is:** Tools that rewrite a prompt (or a set of prompts) against an eval set — from scalar-score optimizers (OPRO, Promptbreeder) through error-feedback search (PromptAgent, TextGrad) to DSPy's ladder (BootstrapFewShot, COPRO, MIPROv2, GEPA), plus product features (Promptim, AutoPrompt, promptfoo `optimize`, Anthropic's prompt improver, OpenAI's optimizer, MLflow, Braintrust Loop).

**Why it matters:** These are the "residual gap" lever — the tool for failures nobody has managed to phrase as a rule. Their signal requirements decide whether a reviewed grade is enough to drive them. The decisive development for this stream is GEPA's use of **textual feedback**, which is exactly what a reviewed grade with a rationale produces.

| Tool | Signal it needs | Labeled examples | Cost / gain reported | Multi-component? |
|---|---|---|---|---|
| [OPRO](https://arxiv.org/abs/2309.03409) | Scalar scores on a trajectory of prior prompts | Train set with scores | "up to 8% on GSM8K… up to 50% on Big-Bench Hard" | Single prompt |
| [Promptbreeder](https://arxiv.org/abs/2309.16797) | Fitness on a training set; self-evolving "mutation-prompts" | Train set | Beats CoT / Plan-and-Solve on reasoning benchmarks | Single prompt |
| [PromptAgent](https://arxiv.org/abs/2310.16427) | Error feedback per sample; MCTS over prompts | Sampled train set | "significantly outperforms strong Chain-of-Thought and recent prompt optimization baselines" on 12 tasks | Single prompt |
| [TextGrad](https://arxiv.org/abs/2406.07496) | LLM "textual gradients" through a computation graph | Small train set | GPQA 51%→55%; LeetCode-Hard "20% relative" | Yes — any variable in the graph |
| [DSPy BootstrapFewShot / RandomSearch](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) | Metric (score) | "around 10" / "50 examples or more" | "typical simple optimization run costs on the order of $2 USD and takes around ten minutes" | All predictors in a program |
| [DSPy MIPROv2](https://dspy.ai/api/optimizers/MIPROv2/) | Metric; bootstraps demos + data-aware instruction proposals + Bayesian optimization; `auto` light/medium/heavy | "200 examples or more" | GEPA paper: MIPROv2 trails GEPA by >10% | All predictors |
| [DSPy GEPA](https://dspy.ai/api/optimizers/GEPA/overview/) | **Score + textual feedback** (`ScoreWithFeedback`), optionally per predictor via `pred_name`/`pred_trace`; needs a reflection LM | Small; tutorial: haiku "from 78.1% to 90.1%" | "up to 35x fewer rollouts" than GRPO; beats GRPO "6% on average and by up to 20%" ([arXiv 2507.19457](https://arxiv.org/abs/2507.19457)) | Yes — round-robin over predictors and `dspy.Flex` code modules |
| [gepa-ai `optimize_anything`](https://github.com/gepa-ai/gepa) | Evaluator returning score + "actionable side information" | Task set | gskill SKILL.md: 55→82%, 24→93% | Yes — "prompts, code, configurations, SVGs"; ships as `.claude/skills/gepa-optimize-anything/` |
| [Promptim](https://github.com/hinthornw/promptimizer) | Dataset + custom evaluators + optional human feedback via LangSmith annotation queue | Train/dev/test splits | Not reported | Single prompt (one message index) |
| [AutoPrompt](https://github.com/Eladlev/AutoPrompt) | Human or LLM annotations on synthetic edge cases | Optional seed examples | "a few minutes at a cost of under $1" (GPT-4 Turbo) | Single prompt |
| [promptfoo `optimize`](https://www.promptfoo.dev/docs/usage/prompt-optimization/) | Existing eval assertions; "asks an optimizer model for revised prompt candidates using observed failures and prior scores" | Test cases; optional validation split ≤ 0.5 | Not reported; "only as good as the eval it searches against" | Single prompt/provider pair |
| [Anthropic prompt improver](https://claude.com/blog/prompt-improver) | Existing prompt + free-text feedback; examples | None required | "increased accuracy by 30%" (classification), "word count adherence up to 100%" | Single prompt |
| [OpenAI prompt optimizer](https://developers.openai.com/api/docs/guides/prompt-optimizer) | Good/Bad annotations + critiques + grader results | ≥3 rows recommended | "generally provides a strict improvement" | Single prompt |
| [MLflow `optimize_prompts`](https://mlflow.org/docs/latest/genai/prompt-registry/optimize-prompts/) | GEPA or metaprompting; scorers | Train data with expectations | Not quantified | Registered prompts (versioned) |
| [Braintrust Loop](https://www.braintrust.dev/docs/loop) | Playground annotations (reactions, comments) | None | Not quantified | Single prompt |

**Key findings:**

- **Textual feedback is the bridge from a reviewed grade to an optimizer.** GEPA's metric contract is literally `{'score': float, 'feedback': str}` per predictor ([GEPA overview](https://dspy.ai/api/optimizers/GEPA/overview/)); its tutorial shows feedback like "Don't reference the input season verbatim" driving instruction edits, and recommends "a larger model as the `reflection_lm`" when optimizing small executors ([GEPA tutorial](https://dspy.ai/getting-started/gepa-optimization/)) — the "big model writes the small model's prompt" finding from [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md), automated. A grade rubric with a rationale field (doc 01) is already a GEPA metric.
- **Only GEPA has been shown to work on multi-file skills.** gskill optimizes a SKILL.md end-to-end ([GEPA blog](https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/)); DSPy optimizers assume a program of predictors; everything else in the table targets one prompt string. For a skill with `references/` exemplars and hooks, the optimizer's candidate must be the *whole directory* — treat SKILL.md as the optimized variable and hold exemplars and hooks fixed per run.
- **Overfitting is the default, so split the graded set.** DSPy: "you can often get substantial value out of 30 examples, but aim for at least 300," and "we recommend an unusual split… 20% for training, 80% for validation… since prompt-based optimizers often overfit to small training sets" ([DSPy optimization overview](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/overview.md)). GEPA instead uses `trainset` for reflection and `valset` for Pareto selection ([GEPA tutorial](https://dspy.ai/getting-started/gepa-optimization/)). The skill-creator's 60/40 held-out description optimizer applies the same discipline inside Claude Code.
- **Anthropic's Console improver: verify before relying on it.** The 2024 launch post lists chain-of-thought insertion, example standardization and enrichment, rewriting, and "prefill addition" ([prompt improver](https://claude.com/blog/prompt-improver)). The docs page it linked (`prompting-tools`) now 307-redirects to the prompting best-practices page, so current Console availability could not be verified from live docs; and per the bundled claude-api skill, assistant prefill returns a 400 on current models, so at least that technique is stale. OpenAI's optimizer page notes its Evals platform "is being deprecated, becoming read-only on October 31, 2026" ([OpenAI prompt optimizer](https://developers.openai.com/api/docs/guides/prompt-optimizer)). Vendor one-click improvers are a starting draft, not a loop.
- **promptfoo now has `optimize`**, a single-pair search driven by existing assertions with an optional validation split ([promptfoo docs](https://www.promptfoo.dev/docs/usage/prompt-optimization/)); the older evolutionary-branching request ([issue #6824](https://github.com/promptfoo/promptfoo/issues/6824)) remains open. Since [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md) already recommends promptfoo as the eval harness, this is the lowest-friction API-pipeline optimizer for the repo.

**Open questions:** No optimizer has been reported on a UI-generation task with a design grader. Whether a VLM-judge score plus rationale is a stable enough GEPA metric (noise → Pareto churn) is untested.

---

## 5. Tuning the construction-file pipeline

**What it is:** How reviewed grades update the *pipeline's* readable surfaces: the Zod catalog (primitives, patterns), slot/nesting rules, field descriptions in the schema, the few-shot construction files, and the builder's layout rules — plus the migration problem those changes create.

**Why it matters:** This generator has the highest-altitude lever available — the schema — and a built-in health signal: the escape hatch. "The fraction of nodes using `CustomBlock`/overrides is the single best health metric of the catalog — rising usage = missing patterns; near-zero = catalog possibly over-fitted" ([prototype-construction/01 §7](../prototype-construction/01-primitive-codification.md)).

**Key findings:**

- **Grades map onto four schema surfaces.** (1) *Enum membership* — an invented component is a catalog gap or a naming gap; the fix is an entry, an alias, or a registry-derived enum, never a rule. (2) *Slot and nesting rules* — a semantic-lint failure ("card inside card", "action bar outside a page") becomes a Zod refinement or a slot whitelist, which then surfaces as a named validator error the model can fix in one round ([design-sdlc/04 §3](../design-sdlc/04-small-model-guardrails.md)). (3) *Field descriptions* — Zod's `.describe()`/`.meta()` are copied into the generated JSON Schema ("All metadata fields get copied into the resulting JSON Schema," [zod.dev](https://zod.dev/json-schema)), so a description is a prompt line that travels with the constraint; a "missing empty state" grade becomes `states: z.object({...}).describe("Every list must declare empty, loading and error states")`, which the checklist-as-descriptions pattern in doc 04 already anticipates. (4) *Builder layout rules* — weak hierarchy or spacing failures that recur across construction files are builder bugs, fixed once in the template and inherited by every prototype ([prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md): "systemic fixes applied once in templates").
- **CustomBlock clusters are pattern candidates.** Cluster escape-hatch islands by what they render; when a cluster recurs across briefs, promote it to a pattern with a typed contract and demote the islands. The stress test is already specified: "pick 5 briefs chosen to exceed the catalog… target: >70% of nodes from catalog" ([prototype-construction/01 §9](../prototype-construction/01-primitive-codification.md)). Grades give the priority order — promote the cluster whose islands grade worst on-system.
- **Few-shot construction files are the cheapest lever and the safest to version.** The corrected (intent → construction file) pair from a hand-fixed failure is the candidate exemplar ([prototype-construction/02 §3.5](../prototype-construction/02-intent-spec-and-context.md)); because it is data, it can be schema-validated in CI and re-rendered by the builder, so it never silently teaches a deprecated pattern. Store the grade id and catalog version in the exemplar's metadata.
- **Schema migration is the cost of the high-altitude lever.** Every catalog change invalidates or degrades old construction files *and* old exemplars. Borrow schema-registry discipline: backward compatibility ("all messages that conform to the previous version of the schema are also valid according to the new version"), forward, full, and transitive checks against all prior versions ([Confluent schema registry](https://www.confluent.io/blog/best-practices-for-confluent-schema-registry/)). In practice: additive optional fields with defaults are minor versions; renames and removals are major versions that ship with a migration script and a rebuilt exemplar set; a `schemaVersion` on every construction file lets the builder route to the right migrator. The drift rule from [prototype-construction/05 §4.2](../prototype-construction/05-surgical-editing-iteration.md) — regenerable files are never hand-edited — is what makes bulk migration safe, and "re-adopt" (lift a hand edit back into the construction file, verified by rebuild-and-diff) is how a human-corrected prototype becomes a valid exemplar rather than a drifted one.

**Open questions:** The rate at which catalog bumps invalidate the exemplar gallery is unmeasured; if it is high, exemplar maintenance dominates the loop's cost. Whether description text in the schema is actually read by constrained decoders (vs. only the grammar) should be checked per provider.

---

## 6. Versioning and regression

**What it is:** Treating every change to a skill, rule, exemplar set, prompt or catalog as a versioned release: eval before/after, held-out check for overfitting, changelog and PR review, rollback, A/B of two versions on the same tasks, and a decision on feedback latency (per-grade vs batched).

**Why it matters:** Without it the loop cannot tell a fix from a regression, and prompt-optimizer output is unreviewable. The skill-creator's own stop condition — keep going until "the feedback is all empty" or "you're not making meaningful progress" ([skill-creator SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)) — only works if each iteration is measured against the last.

**Key findings:**

- **Version the artifact like a plugin.** Claude Code plugins carry an explicit `"version"` in `plugin.json`; "Pushing new commits without bumping it has no effect"; and the docs prescribe semver plus "Document changes in a `CHANGELOG.md`" ([plugins reference](https://code.claude.com/docs/en/plugins-reference)). The skills guide's post-upload loop ends with "Update version in metadata" ([Anthropic skills guide, PDF](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)). A skill directory in git, a catalog package with semver, and a prompt registered with a commit id are the three generators' version units.
- **Before/after with a snapshot baseline and blind judging.** skill-creator snapshots the old skill and runs it as the baseline; benchmark deltas carry mean ± stddev; blind comparators judge "without knowing which is which" ([skill-creator announcement](https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills)). For API prompts, LangSmith gives commits, "Diff in the top-right corner," commit tags, and Staging/Production environments to promote between ([LangSmith prompts](https://docs.langchain.com/langsmith/manage-prompts)); Braintrust's GitHub Action posts a PR comment listing "improvements and regressions" per score ([braintrustdata/eval-action](https://github.com/braintrustdata/eval-action)); MLflow registers optimizer output as a new prompt version ([MLflow](https://mlflow.org/docs/latest/genai/prompt-registry/optimize-prompts/)).
- **Held-out sets and repetition are non-negotiable.** DSPy's 20/80 split, the skill-creator's 60/40 held-out description set run ×3, and pass^k rather than pass@k ([design-sdlc/04 §6](../design-sdlc/04-small-model-guardrails.md)) all say the same thing: a change that improves the graded examples it was derived from proves nothing. Keep a frozen held-out slice of *reviewed* grades that no lever is ever tuned on.
- **Rollback is a git operation if the artifact is text.** Revert the skill directory; pin the previous plugin version; demote the LangSmith environment to the prior commit; for the catalog, a major-version rollback also needs the exemplar set from the same tag — which is why exemplars and catalog should be versioned together.
- **Latency: deterministic levers per grade, probabilistic levers in batches.** A hook or a schema constraint can ship the moment a reviewed grade justifies it — it is verified by construction and by CI, and it cannot degrade adherence elsewhere. Rules, skill text, exemplar sets and optimized prompts should accumulate over a window (weekly is a reasonable default) so that one eval run covers the whole batch, contradictions are caught together, and the 200-line budget is spent deliberately. The research supports the split: ACE runs offline (system prompts) and online (agent memory) as distinct modes with incremental deltas ([arXiv 2510.04618](https://arxiv.org/abs/2510.04618)); AutoSpec converges in "4-5 iterations" of batched counterexamples ([arXiv 2606.24245](https://arxiv.org/abs/2606.24245)); Dynamic Cheatsheet's per-query updates work because its memory is self-pruned to snippets ([arXiv 2504.07952](https://arxiv.org/abs/2504.07952)).

**Open questions:** No tooling versions a *skill + exemplars + hooks* bundle as one release with an attached eval report; the change record below is a manual stand-in. Minimum eval-set size for a design regression gate to be statistically meaningful is unknown (skill-creator warns stddev is "only meaningful with multiple runs per eval").

---

## 7. Worked examples

**A. Skill — "invite-teammate sheet shipped without an empty state" (grade 0412, reviewed: human agrees, rubric dimension `states`).** Cluster check: 4 of the last 30 grades share the dimension → not a one-off. Lever: the failure is structural and must-never-happen, so a rule alone is wrong altitude; but a hook cannot see "empty state" in JSX. Change: (1) add one line to the skill's procedure ("Before finishing, declare empty/loading/error variants for every list or table"); (2) add the corrected sheet as `references/examples/sheet-with-states.tsx` and the ungraded original as a contrast pair; (3) add an assertion to `evals/evals.json` ("every list renders an explicit empty state"). Verify: skill-creator run with the pre-edit snapshot as baseline, ×3; the `states` assertion goes from 2/6 to 6/6 passes; held-out slice unchanged; token delta +900 per run. Record as v1.4.0 with the change record below; the `feedback` auto-memory note that first flagged it is retired.

**B. Construction-file pipeline — "model emitted `CustomBlock` for a stepper on 6 of 20 onboarding briefs" (grades 0501–0506, reviewed: machine flags escape-hatch rate 31% vs 9% baseline).** Lever: escape-hatch telemetry says catalog gap, so the fix is a **schema change**, not prompt text. Change: add a `Stepper` pattern (typed steps slot, current-step enum) to the Zod catalog as minor version 2.7.0; regenerate the prompt catalog and JSON Schema from source; add one corrected construction file using `Stepper` to the exemplar gallery with `catalogVersion: 2.7.0`; run the re-adopt flow on the six prototypes so their construction files use the new pattern. Verify: schema-valid rate unchanged; escape-hatch rate on the onboarding slice drops to 4%; the builder re-renders all exemplars without diff except the new one; held-out briefs show no regression in on-system rate. Because the change is additive, old construction files remain valid (backward compatible) and no migration script is needed.

**C. API pipeline — "dashboard copy reads like marketing, not product" (grades 0611–0619, reviewed: human, rubric `tone`; VLM judge agreed on 7/9).** Lever: tone is stateable in a line but has resisted three rule edits, so it is a **residual gap** → prompt-optimizer run. Change: export the 40 reviewed tone grades with rationales as a GEPA metric (`score`, `feedback`), 20/80 split with the frozen held-out slice excluded; reflection LM one tier above the executor; optimize only the system prompt's copy section, exemplars and schema held fixed. Verify: tone pass 61% → 84% on validation, 79% on held-out; no change on layout and a11y scores; cache-prefix ordering unchanged so cache reads are preserved. Register the new prompt as a LangSmith commit, promote to Staging, run the Braintrust PR check, then Production. Rollback path: re-tag the previous commit.

---

## Cross-cutting themes

1. **A grade should first try to become a constraint, then an example, and only then a sentence.** Hooks and schema changes are verified by construction and cost no adherence; exemplars carry the strongest teaching evidence; rules and skill text spend a scarce, measured budget (200 lines; IFScale's curve). Prompt optimizers are for what no one can phrase.
2. **Textual feedback is the currency of the loop.** Reflexion, ACE, TextGrad, PromptAgent and GEPA all outperform scalar-only signals; a reviewed grade with a rationale is directly consumable by the strongest current optimizer. Doc 01's rubric should be designed as a GEPA metric from the start.
3. **Never let a model rewrite the whole playbook.** Brevity bias and context collapse (ACE), silent drops past the 200-line cap (auto memory), and non-discriminating assertions all come from unbounded rewriting. Append structured deltas, prune deliberately, and version.
4. **Data exemplars beat code exemplars.** Construction files can be re-validated and re-rendered after every catalog change; code exemplars rot. This is a second, under-appreciated argument for the pipeline architecture.
5. **Split the graded set or learn nothing.** DSPy's 20/80, the skill-creator's 60/40 held-out, pass^k — every serious loop keeps a frozen slice that no lever touches, and every change ships with a before/after on it.

---

## Recommendations: the fix-altitude table

Evidence strength: **A** = measured in a peer-reviewed or vendor-published eval; **B** = vendor documentation or repeated practitioner reports; **C** = reasoned from adjacent evidence.

| Failure class | Lever | How the change is made | How it is verified | Evidence |
|---|---|---|---|---|
| Off-token color / spacing literal | Hook (+ builder owns styles) | PostToolUse grep/stylelint gate; pipeline: values only via tokens in the builder | Hook fires in `claude --debug`; token-drift count = 0 on eval set | B ([hooks.md](../../../skill-resources/hooks.md), [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md)) |
| Invented component / prop | Catalog / schema enum; registry query rule | Add or alias the entry; regenerate schema and prompt catalog from source | Schema-valid rate; zero unknown-type errors; escape-hatch rate | A ([design-sdlc/04 §2](../design-sdlc/04-small-model-guardrails.md)) |
| Missing empty / loading / error state | Schema slot with description (pipeline); rule + exemplar + eval assertion (skill/API) | `states` required in Zod with `.describe()`; one gold + one contrast exemplar | Assertion pass ×3; held-out unchanged | B ([zod.dev](https://zod.dev/json-schema), [agentskills.io](https://agentskills.io/skill-creation/evaluating-skills)) |
| Weak hierarchy / layout | Gold exemplar; builder layout rule | Top-graded screen into `references/` or gallery; template fix once | Blind A/B (skill-creator comparator); screenshot diff | A ([arXiv 2101.06804](https://arxiv.org/abs/2101.06804), [arXiv 2212.06800](https://arxiv.org/abs/2212.06800)) |
| Wrong copy tone | One-line rule + contrast exemplar; optimizer if it persists | Voice rule ≤ 2 lines; positive/negative pair; GEPA on the copy section | Tone rubric on validation and held-out | A/B ([arXiv 2401.17390](https://arxiv.org/abs/2401.17390), [GEPA](https://dspy.ai/api/optimizers/GEPA/overview/)) |
| Wrong pattern for intent | Skill procedure + nearest-exemplar retrieval | Pattern-selection step in SKILL.md; KNN over exemplar gallery | Pattern-match rate on eval set | B ([DSPy KNNFewShot](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md)) |
| Recurring `CustomBlock` cluster | New catalog pattern (minor version) | Promote cluster to typed pattern; re-adopt affected files | Escape-hatch rate on the slice; builder re-render diff | B ([prototype-construction/01](../prototype-construction/01-primitive-codification.md)) |
| Residual, unphrased gap | Prompt-optimizer run with textual feedback | GEPA / `optimize_anything` on one component; exemplars and hooks frozen | Validation gain + held-out gain; no regression on other rubric dimensions | A ([arXiv 2507.19457](https://arxiv.org/abs/2507.19457)) |
| Rule file over budget / contradictory | Prune and demote | `/doctor` trim; move procedures to skills; resolve conflicts | Adherence on eval set does not drop after removal | B ([memory docs](https://code.claude.com/docs/en/memory), [commands](https://code.claude.com/docs/en/commands)) |

---

## Template: skill change record

```md
# Change record — <skill|catalog|prompt name> v<from> → v<to>
Date: YYYY-MM-DD   Author: <name>   Reviewer: <name>
Motivating grades: <ids>  (rubric dimension: <dim>; cluster size: <n>/<window>)
Review status: human-confirmed | machine-only | disputed
Lever: hook | schema/catalog | rule | skill instruction | exemplar | optimizer run
Altitude rationale: <why not a lower-cost lever; why not a more deterministic one>
Diff summary: <files touched; +/- lines; exemplars added/retired with catalog version>
Eval before (baseline snapshot, ×3): pass <x>% ± <sd>; tokens <t>; time <s>
Eval after (×3):                     pass <x>% ± <sd>; tokens <t>; time <s>
Held-out slice (frozen, untouched):  before <x>% → after <x>%
Other rubric dimensions:             no regression | <dimension: delta>
Blind A/B vs previous version:       <wins/losses/ties>
Rollback: git revert <sha> | plugin pin v<from> | prompt commit <id>
Follow-ups: <grades still open; exemplar retirement due; next batch date>
```

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verification | Category |
|---|---|---|---|---|
| Anthropic skill-creator | https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md | Eval/benchmark/blind-A/B loop for skills; description optimizer with held-out set | fetched OK | skills |
| agentskills.io — Evaluating skills | https://agentskills.io/skill-creation/evaluating-skills | The eval-file format and iteration loop the skill-creator automates; "keep the skill lean" guidance | fetched OK | guardrails-and-evals |
| Claude Code `/doctor` | https://code.claude.com/docs/en/commands | Trims CLAUDE.md, migrates always-on guidance into skills, reports context cost of unused skills | fetched OK | rules |
| Claude Code auto memory | https://code.claude.com/docs/en/memory | Built-in lessons-learned notes (`feedback` type) with 200-line cap; machine-local | fetched OK | rules |
| gepa-ai/gepa `optimize_anything` | https://github.com/gepa-ai/gepa | Score + textual-feedback optimizer for any text artifact; installs as a Claude Code skill | fetched OK | *proposed:* prompt-and-skill optimization |
| GEPA gskill post | https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/ | Only published result evolving a SKILL.md end-to-end | fetched OK | *proposed:* prompt-and-skill optimization |
| DSPy optimizers guide | https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md | Optimizer ladder with example-count guidance and cost | fetched OK | guardrails-and-evals |
| promptfoo `optimize` | https://www.promptfoo.dev/docs/usage/prompt-optimization/ | Assertion-driven single-prompt optimizer with validation split | fetched OK | guardrails-and-evals |
| Braintrust eval-action | https://github.com/braintrustdata/eval-action | PR comment with per-score improvements/regressions | fetched OK | review-and-feedback |
| LangSmith prompt management | https://docs.langchain.com/langsmith/manage-prompts | Prompt commits, diffs, tags, Staging/Production promotion | fetched OK | prototype-governance |
| Promptim | https://github.com/hinthornw/promptimizer | Dataset + evaluators + human-feedback prompt optimizer | fetched OK | *proposed:* prompt-and-skill optimization |
| AutoPrompt (Eladlev) | https://github.com/Eladlev/AutoPrompt | Intent-based calibration on synthetic edge cases; human or LLM annotator | fetched OK | *proposed:* prompt-and-skill optimization |
| Claude Code plugins reference (versioning) | https://code.claude.com/docs/en/plugins-reference | Explicit `version`, semver, CHANGELOG guidance for plugins | fetched OK | prototype-governance |

Not selected: community "skill-doctor" repos (search results only; the built-in command they imply could not be verified); Anthropic Console prompt improver (docs page now redirects; launch-post features include prefill, which current models reject); OpenAI prompt optimizer (its Evals platform is scheduled read-only 31 October 2026).

---

## Sources

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/commands
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/llms.txt
- https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- https://claude.com/blog/improving-skill-creator-test-measure-and-refine-agent-skills
- https://agentskills.io/skill-creation/evaluating-skills
- https://claude.com/blog/complete-guide-to-building-skills-for-claude
- https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://claude.com/blog/prompt-improver
- https://developers.openai.com/api/docs/guides/prompt-optimizer
- https://arxiv.org/abs/2507.11538 — IFScale
- https://arxiv.org/abs/2101.06804 — KATE
- https://arxiv.org/abs/2212.06800 — Diverse demonstrations
- https://arxiv.org/abs/2104.08786 — Fantastically ordered prompts
- https://arxiv.org/abs/2401.17390 — Contrastive in-context learning
- https://arxiv.org/abs/2507.23211 — Negative samples for few-shot ICL
- https://arxiv.org/abs/2404.11018 — Many-shot ICL
- https://arxiv.org/abs/2303.11366 — Reflexion
- https://arxiv.org/abs/2504.07952 — Dynamic Cheatsheet
- https://arxiv.org/abs/2510.04618 — ACE
- https://arxiv.org/abs/2305.16291 — Voyager
- https://arxiv.org/abs/2504.15228 — Self-Improving Coding Agent
- https://arxiv.org/abs/2606.24245 — AutoSpec
- https://arxiv.org/abs/2509.25370 — Where LLM Agents Fail / AgentDebug
- https://arxiv.org/abs/2309.03409 — OPRO
- https://arxiv.org/abs/2309.16797 — Promptbreeder
- https://arxiv.org/abs/2310.16427 — PromptAgent
- https://arxiv.org/abs/2406.07496 — TextGrad
- https://arxiv.org/abs/2507.19457 — GEPA
- https://dspy.ai/api/optimizers/GEPA/overview/
- https://dspy.ai/getting-started/gepa-optimization/
- https://dspy.ai/api/optimizers/MIPROv2/
- https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md
- https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/overview.md
- https://github.com/gepa-ai/gepa
- https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/
- https://github.com/hinthornw/promptimizer
- https://github.com/Eladlev/AutoPrompt
- https://www.promptfoo.dev/docs/usage/prompt-optimization/
- https://github.com/promptfoo/promptfoo/issues/6824
- https://mlflow.org/docs/latest/genai/prompt-registry/optimize-prompts/
- https://www.braintrust.dev/docs/loop
- https://github.com/braintrustdata/eval-action
- https://docs.langchain.com/langsmith/manage-prompts
- https://zod.dev/json-schema
- https://www.confluent.io/blog/best-practices-for-confluent-schema-registry/
- https://github.com/amaljithkuttamath/skill-doctor — search result only, not fetched

*Not verifiable this pass:* a built-in Claude Code `/skill-doctor` command and a `claude plugin eval` command (absent from the commands reference, docs index and public CHANGELOG on 2 September 2026; only community repos use the name); the current feature set of Anthropic's Console prompt improver (its docs URL now redirects to the prompting best-practices page; features are cited from the 2024 launch post, and its "prefill addition" technique is incompatible with current models per the bundled claude-api skill); the Console eval-tool page (redirects to a programmatic test-development page that does not describe a Console UI). Repo-internal references: [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md), [prototype-construction/01](../prototype-construction/01-primitive-codification.md), [prototype-construction/02](../prototype-construction/02-intent-spec-and-context.md), [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md), [skillchains §4–6](../../../skill-resources/skillchains.md), [skills.md](../../../skill-resources/skills.md), [rules.md](../../../skill-resources/rules.md), [hooks.md](../../../skill-resources/hooks.md).

*Research conducted 2 September 2026 via live web search (~35 queries) and fetch; ~50 external URLs fetched and confirmed resolving.*
