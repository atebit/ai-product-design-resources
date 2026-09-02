# Small-Model Guardrails — Consistent One-Pass Output from Haiku-Class Models

**Scope:** How to get cheap models (Claude Haiku 4.5 and its peers) to produce consistent, on-design-system output in a single pass instead of looping. Two modes are treated as equally important and every recommendation is split by mode: **interactive** (a designer driving a cheap model in Claude Code / Cursor / Copilot — rules, hooks, skills, templates, verification loops) and **automated** (unattended CI jobs, batch generation, subagents, construction-file pipelines — schemas, validators, repair loops, evals, routing). The repo's construction-file architecture ([prototype-construction series](../prototype-construction/00-architecture-synthesis.md)) is this question's biggest single answer — constrain the output space so a small model cannot go off-system — and is referenced rather than re-derived; this doc goes wider into the general and practitioner evidence on making small models reliable. Verified live September 2026; every claim links its source; pricing and model facts come from Anthropic's live docs, not memory.

## Table of Contents

1. [Why small models loop — a failure taxonomy](#1-why-small-models-loop--a-failure-taxonomy)
2. [Output-space constraints](#2-output-space-constraints)
3. [Deterministic verification and repair](#3-deterministic-verification-and-repair)
4. [Prompt and context structure for small models](#4-prompt-and-context-structure-for-small-models)
5. [Model routing and escalation](#5-model-routing-and-escalation)
6. [Evals that measure one-shot success](#6-evals-that-measure-one-shot-success)
7. [Design-specific guardrails](#7-design-specific-guardrails)
8. [Guardrail frameworks](#8-guardrail-frameworks)
9. [Cross-cutting themes](#cross-cutting-themes)
10. [Recommendations: the guardrail ladder](#recommendations-the-guardrail-ladder)
11. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
12. [Sources](#sources)

---

## 1. Why small models loop — a failure taxonomy

**What it is:** The recurring reasons a cheap model produces output that fails, gets corrected, fails again — the retry spiral that eats the cost advantage.

**Why it matters:** A model that is 3–5× cheaper per token but needs three passes is not cheaper. Augment's routing guide states the practitioner rule of thumb plainly: "if Haiku output requires correction more than 20% of the time, re-prompting costs negate the 3x pricing advantage" ([Augment Code](https://www.augmentcode.com/guides/ai-model-routing-guide)). Anthropic's own framing is that agents need "'ground truth' from the environment at each step" and warns of "the potential for compounding errors" ([Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)).

**Key findings:**

| Failure | Evidence | Guardrail family (see §2–§7) |
|---|---|---|
| **No external verifier → the model grades itself** | Huang et al. (ICLR 2024): "LLMs struggle to self-correct their responses without external feedback, and at times, their performance even degrades after self-correction" ([arXiv 2310.01798](https://arxiv.org/abs/2310.01798)). A 2025 study across 37 models found "verification across model families is more effective than either self-verification or verification within the same family" ([arXiv 2512.02304](https://arxiv.org/abs/2512.02304)) | Deterministic validators, cross-model verifiers (§3) |
| **Unbounded output space** | Small 7–9B models hit "up to 85% task accuracy on GSM8K but 0% output accuracy" under naive prompting — correct but unusable ([arXiv 2605.02363](https://arxiv.org/abs/2605.02363)) | Schema/enum constraints (§2) |
| **Unbounded feedback path** | A static-analysis sweep of 6,549 agent repos confirmed 68 infinite-loop failures where "the feedback path is not effectively bounded" — retries, validator failures and tool re-requests without a cap ([arXiv 2607.01641](https://arxiv.org/abs/2607.01641)) | Retry budgets, Stop-hook caps (§3) |
| **Context too long or rotten** | Chroma tested 18 models: "model performance varies significantly as input length changes, even on simple tasks," and single distractors reduce accuracy ([Context Rot](https://www.trychroma.com/research/context-rot)). Anthropic: context is "a finite resource with diminishing marginal returns" ([Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)) | Short rules, JIT retrieval, `/clear` (§4) |
| **Instruction volume** | Claude Code docs: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!" and "after two failed corrections, `/clear` and write a better initial prompt" ([Best practices](https://code.claude.com/docs/en/best-practices)) | Rule pruning, hooks instead of rules (§4, §7) |
| **Underspecified task / missing examples** | The construction-file research found few-shot exemplars of the exact output format to be "the strongest teacher" ([doc 02](../prototype-construction/02-intent-spec-and-context.md)); Anthropic recommends 3–5 examples in `<example>` tags ([Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)) | Templates, exemplars (§4) |
| **Plan-and-execute collapsed into one small model** | Routine (structured plan handed to an executor) lifted Qwen3-14B tool-call accuracy from 32.6% → 83.3% and GPT-4o from 41.1% → 96.3% ([arXiv 2507.14447](https://arxiv.org/abs/2507.14447)) | Planner/executor split (§4, §5) |
| **"Consistent" is impossible by sampling alone** | Even at temperature 0, 1,000 Qwen3-235B completions produced 80 unique outputs until batch-invariant kernels were used ([Thinking Machines](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/)) | Verify the artifact, not the transcript (§3, §6) |
| **Lucky passes hide inconsistency** | 10.7% of passing SWE-agent trajectories were "Lucky Passes" (blind retries, missing verification), ranging 0.5–23.2% across backends ([AgentLens](https://arxiv.org/abs/2605.12925)) | pass^k, loops-per-task metrics (§6) |

Haiku 4.5's own numbers frame the opportunity: 73.3% SWE-bench Verified, "one-third the cost and more than twice the speed" of Sonnet 4, "90% of Sonnet 4.5's performance" on Augment's agentic eval, with Anthropic explicitly recommending that a Sonnet orchestrates "a team of multiple Haiku 4.5s to complete subtasks in parallel" ([Haiku 4.5 announcement](https://www.anthropic.com/news/claude-haiku-4-5)). NVIDIA's position paper generalizes it: agents "perform a small number of specialized tasks repetitively and with little variation," which is exactly where small models fit ([arXiv 2506.02153](https://arxiv.org/abs/2506.02153)).

**Open questions:** No public data isolates *loops-per-task* for Haiku-class models on design tasks specifically; the 20% correction-rate threshold is a practitioner heuristic, not a measurement.

---

## 2. Output-space constraints

**What it is:** Making invalid output impossible rather than catchable — schema-constrained decoding, enum-typed component names, typed SDK helpers.

**Why it matters:** This is the highest-leverage guardrail for automated mode, and the construction-file architecture is built on it: "a hallucinated component name becomes *impossible*, not a bug to catch" ([architecture synthesis](../prototype-construction/00-architecture-synthesis.md)).

**Key findings:**

- **Provider-native structured outputs.** Anthropic's structured outputs are GA (no beta header) on `claude-haiku-4-5-20251001` through Fable 5.1, via `output_config.format` (JSON Schema) or `strict: true` on tools; guarantees are "always valid… no retries needed for schema violations"; limits: `additionalProperties: false` required, no recursive schemas, no numeric/string-length constraints, enums of primitives only; compiled grammars are cached 24h ([Structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). SDK helpers: `client.messages.parse()` with Pydantic, `zodOutputFormat()` in TypeScript. OpenAI's guide describes "strict JSON schema constrained decoding" plus a programmatic `refusal` field, while cautioning that "Structured Outputs can still contain mistakes" ([OpenAI guide](https://developers.openai.com/api/docs/guides/structured-outputs)); the original announcement's 100%-vs-<40% eval, cited in [doc 03](../prototype-construction/03-construction-file-generation.md), returned HTTP 403 on re-fetch and could not be re-verified. Gemini's structured output docs explicitly say to "always validate values in your application" — schema-valid is not semantically valid ([Gemini docs](https://ai.google.dev/gemini-api/docs/structured-output)).
- **Self-hosted engines.** JSONSchemaBench (10K real schemas, six engines) is the reference benchmark ([arXiv 2501.10868](https://arxiv.org/abs/2501.10868)). XGrammar is the default backend in vLLM, SGLang and TensorRT-LLM ([XGrammar](https://github.com/mlc-ai/xgrammar)); llguidance runs at "approximately 50μs of single-core CPU time" per token and powers OpenAI's structured outputs, llama.cpp and vLLM ([llguidance](https://github.com/guidance-ai/llguidance)); Outlines (15.7k stars) covers JSON/regex/CFG across transformers, vLLM, Ollama and API providers ([Outlines](https://github.com/dottxt-ai/outlines)).
- **Does constraining hurt quality? The 2025–26 evidence is nuanced.** The 2024 dispute ("Let Me Speak Freely?" claimed "a significant decline in LLMs reasoning abilities under format restrictions" ([arXiv 2408.02442](https://arxiv.org/abs/2408.02442)); .dottxt re-ran it with fair prompts and found structured *beat* unstructured on GSM8K 0.77→0.78, Last Letter 0.73→0.77, Shuffle 0.41→0.44 ([Say What You Mean](https://blog.dottxt.ai/say-what-you-mean.html))) has newer, small-model-specific follow-ups. On Qwen3-8B, "structure snowballing" showed constrained decoding gives "near-perfect superficial syntactic alignment yet fail[s] to detect or resolve deeper semantic errors" in *reflection* tasks ([arXiv 2604.06066](https://arxiv.org/abs/2604.06066)). BAML documents a receipt-parsing case where constrained decoding returned quantity `1` instead of `0.46` and cites 93.63% vs 91.37% on BFCL for free-form vs constrained ([BAML blog](https://boundaryml.com/blog/structured-outputs-create-false-confidence)). The practical reading: **constrain the *selection* (enums, ids, slots), leave reasoning fields free-text, and keep a rationale field first** — the schema-design consensus already in [doc 03 §3.2](../prototype-construction/03-construction-file-generation.md).
- **Parse-and-repair alternatives.** Instructor (13.8k stars) validates with Pydantic and "failed validations are automatically retried with the error message" up to `max_retries` ([Instructor](https://github.com/567-labs/instructor)). BAML's Schema-Aligned Parsing extracts the intended structure from free-form output without retries ([BAML](https://github.com/BoundaryML/baml)). TypeChat uses TypeScript types as the schema and repairs "through further language model interaction" when validation fails ([TypeChat](https://github.com/microsoft/TypeChat)). Vercel AI SDK's `Output.object()` / `Output.choice()` throw `NoObjectGeneratedError` preserving the raw text for repair ([AI SDK docs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)).

**Interactive-mode translation:** the equivalent of an enum is a **registry the model must query** (Storybook MCP, shadcn registry — §7) plus a rule that names exact import paths; the equivalent of a schema is a **fill-in-the-slots template** in a skill.

**Open questions:** No published study measures Haiku 4.5 first-pass validity on a component-tree schema; the repo's E-series experiments ([doc 03 §8](../prototype-construction/03-construction-file-generation.md), "small-model floor") remain the right test.

---

## 3. Deterministic verification and repair

**What it is:** External checks the model cannot argue with — schema validators, linters, tests, axe, token-drift greps, screenshots — wired as gates with bounded repair budgets.

**Why it matters:** It is the direct answer to Huang et al.: small models cannot self-correct, but they *can* fix a named error. Anthropic's Claude Code guidance: "Give Claude a check it can run: tests, a build, a screenshot to compare. It's the difference between a session you watch and one you walk away from" ([Best practices](https://code.claude.com/docs/en/best-practices)).

**Key findings:**

- **Verifier-in-the-loop numbers.** OpenHands went from 60.6% (single trajectory) to 66.4% with five attempts plus a *trained* critic, and found the trained critic beat prompt-based reranking ([OpenHands](https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model)). SWE-RM, a 30B-total/3B-active reward model, lifted Qwen3-Coder-Flash from 51.6% → 62.0% on SWE-bench Verified via best-of-N ([arXiv 2512.21919](https://arxiv.org/abs/2512.21919)) — a *cheap* verifier over a *cheap* generator is a legitimate pattern. Aider's auto-lint/auto-test loop feeds "lint errors detected in edited files… back to the AI" after every edit, disabled only via `--no-auto-lint` ([Aider](https://aider.chat/docs/usage/lint-test.html)).
- **Actionable errors beat generic ones.** Doc 03's mitigation ladder ("validator-with-actionable-errors is the highest-leverage component") is echoed by Instructor's design (error message in the retry prompt) and TypeChat's (compiler errors as repair context). The 2026 agent-loop literature formalizes it: a loop spec needs a trigger, goal, verification step, stopping rule and memory, and 74% of real loops "explicitly name their terminal states" ([arXiv 2607.00038](https://arxiv.org/abs/2607.00038)).
- **Bound every loop.** Claude Code caps Stop-hook blocking: "Claude Code overrides the hook and ends the turn after 8 consecutive blocks"; `/goal` stops when there is "no tool use for several turns in a row" ([Best practices](https://code.claude.com/docs/en/best-practices), [/goal](https://code.claude.com/docs/en/goal)). Doc 03 recommends max 2 LLM self-repairs. IAL research shows unbounded feedback paths are the loop generator ([arXiv 2607.01641](https://arxiv.org/abs/2607.01641)).
- **Claude Code hooks as gates.** Five handler types now exist — `command`, `http`, `mcp_tool`, `prompt`, `agent`; on blockable events "exit 2 blocks whether or not you print JSON: even a JSON `permissionDecision` of `'allow'` can't override it"; PostToolUse exit 2 "shows stderr to Claude; the tool already ran"; Stop exit 2 "prevents Claude from stopping" ([Hooks reference](https://code.claude.com/docs/en/hooks)). The repo's five recipes ([hooks.md](../../../skill-resources/hooks.md)) — format-on-edit, token-drift guard, screenshot-on-change, axe-on-Stop, design-review-on-PR — are precisely the deterministic layer small models need; `/goal` is a session-scoped prompt-based Stop hook whose evaluator "defaults to Haiku" ([/goal](https://code.claude.com/docs/en/goal)) — a small model doing a narrow verification job.
- **Which check cuts loops most?** The evidence ranks: (1) schema/enum enforcement removes an entire failure class; (2) a linter/validator with named locations fixes most of the rest in one round (GenAIScript's Mermaid repair "usually fixed in one round," [doc 03 §4.4](../prototype-construction/03-construction-file-generation.md)); (3) tests/axe/screenshots catch semantic errors but cost seconds per run — make them Stop-scoped, not per-edit ([skillchains §6](../../../skill-resources/skillchains.md)).

**Open questions:** Screenshot-diff verification has no published pass-rate data on small models; whether a VLM judge on a cheap model is reliable enough to gate is untested.

---

## 4. Prompt and context structure for small models

**What it is:** The shape of what the small model sees — examples, templates, checklists, decomposition, caching, and who writes the plan.

**Why it matters:** For a cheap model, prompt structure *is* the capability. The strongest recent evidence is that an optimized prompt written by a strong model closes most of the gap: on 7–9B models, an iterative system-prompt optimizer using Claude Sonnet 4.5 as meta-agent raised JSON output accuracy from 0% (naive) to 84–87% on GSM8K, with 29/30 McNemar comparisons significant; using Claude 3 Haiku as the *optimizer* instead dropped accuracy to 61% with 21.8pp variance ([arXiv 2605.02363](https://arxiv.org/abs/2605.02363)). Big model writes the prompt; small model runs it.

**Key findings:**

| Lever | Evidence | Interactive implementation | Automated implementation |
|---|---|---|---|
| **Few-shot exemplars of exact output** | "Examples are one of the most reliable ways to steer Claude's output format… Include 3–5 examples," wrapped in `<example>` tags ([Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)); "curate a set of diverse, canonical examples" ([context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)); Cursor: "provide concrete examples" ([Cursor rules](https://cursor.com/docs/context/rules)) | Skill with 2–3 gold component/screen files as `references/` | Exemplar construction files in the cached prefix |
| **Structured plan → narrow executor** | Routine: explicit step structure + parameter passing lifted a 14B model 32.6% → 83.3% ([arXiv 2507.14447](https://arxiv.org/abs/2507.14447)); Aider's architect/editor split raised Claude 3.5 Sonnet 77.4% → 80.5% and o1-preview + cheap editor hit 85% ([Aider](https://aider.chat/2024/09/26/architect.html)) | Plan mode on Sonnet/Opus, implement with `model: haiku` subagents ([sub-agents](https://code.claude.com/docs/en/sub-agents)); `opusplan` alias ([model-config](https://code.claude.com/docs/en/model-config)) | Planner emits a task list/construction file; executors fill slots |
| **Short, specific rules** | "For each line, ask: 'Would removing this cause Claude to make mistakes?' If not, cut it" ([Best practices](https://code.claude.com/docs/en/best-practices)); Cursor: keep rules "under 500 lines" ([Cursor](https://cursor.com/docs/context/rules)); Atlassian's 19.8K-token DESIGN.md yielded only ~30% design-context availability vs ~80% for MCP/skill and used 92% more tokens ([Atlassian](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)) | CLAUDE.md < 1 screen; design detail in skills; `/doctor` to prune | System prompt = schema + exemplars + 10 rules, nothing else |
| **Tell it what to do, not what not to do** | Anthropic: "Tell Claude what to do instead of what not to do"; append "Before you finish, verify your answer against [test criteria]" — "this catches errors reliably" ([Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)) | Rules phrased as imports and values, plus the repo's self-verification ritual ([rules.md §7](../../../skill-resources/rules.md)) | Checklist rendered as schema `description`s |
| **Just-in-time context, not dumps** | Context rot: distractors are worst when similar-but-wrong ([Chroma](https://www.trychroma.com/research/context-rot)); Atlassian MCP: 52% accuracy gain, 26% fewer calls, 16% fewer tokens vs no context ([Atlassian](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)) | Registry/Storybook MCP query per component; subagents for exploration | Catalog index + on-demand retrieval ([doc 02 §3.4](../prototype-construction/02-intent-spec-and-context.md)) |
| **Prompt caching makes a big stable prefix cheap** | Haiku 4.5 cache reads $0.10/MTok vs $1 base; **minimum cacheable prompt on Haiku 4.5 is 4,096 tokens** — shorter prefixes silently do not cache ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)) | Claude Code caches automatically; keep stable content first | Put schema + exemplars ≥4K tokens in one cached prefix; volatile task last |
| **Prompt optimization** | GEPA beats GRPO by 6% avg (up to 20%) with 35× fewer rollouts and MIPROv2 by >10%; runs on Qwen3-8B-class students with a strong reflection LM ([arXiv 2507.19457](https://arxiv.org/abs/2507.19457), [DSPy GEPA](https://dspy.ai/api/optimizers/GEPA/overview/)) | Not practical per-session | Optimize the executor prompt against the design eval set (§6) with textual feedback from validators |

**Open questions:** The few-shot "dosage curve" for design artifacts (0/1/2/4 exemplars) is unmeasured ([doc 02 experiments](../prototype-construction/02-intent-spec-and-context.md)); GEPA has not been reported on UI-generation tasks.

---

## 5. Model routing and escalation

**What it is:** Cheap-first execution with escalation to a larger model when a validator fails or confidence is low; and static role assignment (planner/executor/verifier) across model sizes.

**Why it matters:** The cascade only pays when the cheap model's first-pass success rate is high enough — which is why §2–§4 come first.

**Key findings:**

- **Cascades and routers.** FrugalGPT's LLM cascade reports "up to 98% cost reduction" matching GPT-4 ([arXiv 2305.05176](https://arxiv.org/abs/2305.05176)); RouteLLM (ICLR 2025) claims "up to 85%" cost reduction at 95% of GPT-4 performance with routers that "generalize well to other strong and weak model pairs" ([RouteLLM](https://github.com/lm-sys/RouteLLM)). Not Diamond trains custom routers on your evals and claims 5%+ accuracy, 20% savings ([Not Diamond](https://www.notdiamond.ai/)); OpenRouter's Auto Router picks by community spend with `cost_tier` low→max ([OpenRouter](https://openrouter.ai/openrouter/auto)). Caveat: preference-trained routers optimize chat quality, not schema validity — for design pipelines a **validator-triggered escalation** is simpler and directly measurable.
- **Role specialization.** AgentCARD finds heterogeneous planner/executor/verifier teams "improve accuracy by up to 44% over cost-equivalent homogeneous teams" and match top homogeneous teams at "up to 12× lower per-task cost," with role bottlenecks that are domain-dependent ([arXiv 2606.20629](https://arxiv.org/abs/2606.20629)). Cross-family verification beats self-verification ([arXiv 2512.02304](https://arxiv.org/abs/2512.02304)).
- **Claude Code mechanics.** Subagent `model:` accepts `sonnet | opus | haiku | fable | <full id> | inherit`; resolution order is per-invocation → frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL` → session model; `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` overrides all ([sub-agents](https://code.claude.com/docs/en/sub-agents), [model-config](https://code.claude.com/docs/en/model-config)). Subagent frontmatter can carry its own `PreToolUse`/`Stop` hooks — a Haiku executor can ship with its gates attached. `CLAUDE_CODE_EFFORT_LEVEL` (`low`…`max`) is the other cost lever; Anthropic's guidance is to measure "the most capable model at lower effort" before building a cascade, because caches are model-scoped and a cheaper request that needs more retries "isn't cheaper" (claude-api skill guidance; the effort docs page was not fetched).
- **Cost math (Anthropic list prices, verified live).** Haiku 4.5 $1/$5, Sonnet 5 $2/$10, Sonnet 4.6 $3/$15, Opus 5 $5/$25 per MTok; cache reads 0.1× ([Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). For a screen-generation call with a 30K cached design-system prefix + 2K task in / 3K out: Haiku ≈ $0.003 + $0.002 + $0.015 = **$0.020**; Opus 5 ≈ $0.015 + $0.010 + $0.075 = **$0.100**. A Haiku-first cascade with first-pass validity *p* costs ≈ 0.020 + (1 − *p*) × 0.100; it beats Opus-first whenever *p* > 0.2 and beats Sonnet-5-first (≈ $0.040) whenever *p* > 0.5. At *p* = 0.85 the cascade is ≈ $0.035 — 65% below Opus-first — which is why lifting *p* via §2–§4 is worth more than any router.

**Open questions:** No public router is trained on design-system adherence; whether a Haiku verifier can gate a Haiku generator on design tasks (cross-family evidence suggests pairing with a different family) is untested.

---

## 6. Evals that measure one-shot success

**What it is:** A small regression suite of real design tasks scored on first-pass validity, on-system rate, a11y errors and loops-per-task — run in CI on every rules/skill/schema change.

**Why it matters:** Without it you cannot know *p* (§5) or whether a rule change helped. Anthropic: "20-50 simple tasks drawn from real failures is a great start"; grade "what the agent produced, not the path it took"; isolate each trial in a clean environment ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Key findings:**

- **The metric is pass^k, not pass@k.** "pass@k measures the likelihood that an agent gets at least one correct solution in k attempts"; "pass^k measures the probability that all k trials succeed" — at 75% per-trial, pass^3 ≈ 42% ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)). For one-pass consistency, report **first-pass validity**, **pass^3**, and **mean loops-per-task** (repair rounds before the validator passes). AgentLens's Lucky/Solid/Ideal tiers are the process-level complement ([AgentLens](https://arxiv.org/abs/2605.12925)).
- **Harnesses.** promptfoo (MIT; "now part of OpenAI") has deterministic assertions — `is-json`, `javascript`, `regex`, `latency`, `cost`, `trajectory:tool-used` — plus `llm-rubric`; assert-set `threshold` gives "X of Y" logic ([promptfoo](https://github.com/promptfoo/promptfoo), [assertions](https://www.promptfoo.dev/docs/configuration/expected-outputs/)). Inspect AI (UK AISI, MIT) provides tasks/solvers/scorers with 200+ prebuilt evals ([Inspect](https://github.com/UKGovernmentBEIS/inspect_ai)). Braintrust adds CI quality gates and production tracing ([Braintrust](https://www.braintrust.dev/)). LangSmith's `num_repetitions` runs each example N times and exposes standard deviation ([LangSmith](https://docs.langchain.com/langsmith/repetition)) — the pass^k primitive.
- **A design-task eval set, concretely.** 20–50 tasks: "add a destructive confirm dialog to the settings screen," "apply the new spacing token to the card grid," "build the invite-teammate sheet from this intent.yaml." Graders, all deterministic: schema-valid (construction file), on-system rate (imports resolve to the registry; zero raw hex/px via the token-drift grep or `stylelint-declaration-strict-value`), axe violations = 0 (`@axe-core/cli --exit`), Prettier-canonical diff size, and screenshot pixel-diff against a gold render. Repeat ×3 for pass^3.

**Open questions:** No public on-system-rate benchmark exists (still the field's biggest gap per the [foundational overview](../foundational/00-overview.md)); VLM-graded "looks right" scores lack calibration data.

---

## 7. Design-specific guardrails

**What it is:** The subset of guardrails that encode the design system itself — and which of them hold up on small models.

**Key findings:**

| Guardrail | Holds on small models? | Evidence |
|---|---|---|
| **Token-only styling (rule + grep/lint gate)** | Yes, when enforced by a hook/linter; as a rule alone it drifts | `stylelint-declaration-strict-value` enforces variables for `color`, `font-size` etc. with `autoFixFunc` ([plugin](https://github.com/AndyOGo/stylelint-declaration-strict-value)); repo [recipe 2](../../../skill-resources/hooks.md) |
| **Component registry as enum / queryable source** | Yes — the strongest design lever | Storybook MCP exposes `docs-list`, `docs-show`, `stories-find-by-component`, `test-run` and instructs agents "Never hallucinate component properties!… you MUST use the MCP tools to check" ([Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview)); shadcn MCP works "with any shadcn-compatible registry" via `registry.json` ([shadcn](https://ui.shadcn.com/docs/registry/mcp)); Atlassian's structured ADS MCP: 52% accuracy gain, 26% fewer calls ([Atlassian](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)) |
| **Code Connect / Dev Mode MCP as ground truth** | Yes for mapping; unmeasured for small models | Figma's MCP delivers component tree, variables and Code Connect mappings (repo [mcp-servers.md](../../../skill-resources/mcp-servers.md)); Atlassian notes prose context "tends to re-create ADS components" while structured context does not ([Atlassian DESIGN.md](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)) |
| **DESIGN.md size vs adherence** | Large prose files hurt small models most (context rot) | 80 KB / ~19,800 tokens → ~30% context availability, 7.21M tokens vs 3.75M for MCP, 2.7× run-to-run variance; model unspecified ([Atlassian](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)) |
| **Screenshot verification** | Deterministic capture yes; model judgment weaker | Recipe 3 hook + OneRedOak's Playwright-MCP review (3.9k stars) ([OneRedOak](https://github.com/OneRedOak/claude-code-workflows)); Anthropic: "take a screenshot of the result and compare it to the original. list differences and fix them" ([Best practices](https://code.claude.com/docs/en/best-practices)) |
| **On-system rate gate** | Yes if computed deterministically (imports + token grep) | No public benchmark; build it as the eval set in §6 |
| **Construction file instead of code** | Yes — designed for this | Enum-constrained `type`, slot rules, builder fail-safes ([doc 03 §6](../prototype-construction/03-construction-file-generation.md)); "small-model floor" is experiment 6 |

**Open questions:** Which registry surface (MCP query vs in-prompt enum) yields higher first-pass validity on Haiku is exactly the E-series ablation the repo should run.

---

## 8. Guardrail frameworks

**What it is:** Off-the-shelf middleware that intercepts inputs/outputs. Most are safety-oriented; a few do format validation.

| Framework | Relevant to design work? | Notes |
|---|---|---|
| [Guardrails AI](https://github.com/guardrails-ai/guardrails) (7.3k stars, Apache-2.0, Python + JS) | **Yes** | Composable output validators with `on_fail` actions; structured-data generation; Hub of prebuilt validators |
| [NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails) | Marginal | Five rail types (input/dialog/retrieval/execution/output) in Colang; targets safety and topical control, not artifact validity |
| [OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/) | Pattern, yes | Input/output tripwires; the documented pattern "run a guardrail with a fast/cheap model" in parallel is a small-model-as-verifier design |
| [Cloudflare AI Gateway Guardrails](https://developers.cloudflare.com/ai-gateway/features/guardrails/) | No | Flag/block harmful content across providers; no schema/format validation |
| [Vercel AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) | **Yes** | `Output.object/array/choice`, Zod schemas, `NoObjectGeneratedError` with raw text for repair |
| [Instructor](https://github.com/567-labs/instructor) / [BAML](https://github.com/BoundaryML/baml) / [TypeChat](https://github.com/microsoft/TypeChat) | **Yes** | Validate-and-reask, schema-aligned parsing, type-error repair respectively (§2) |
| Claude Code hooks ([reference](https://code.claude.com/docs/en/hooks)) | **Yes** — the interactive-mode framework | Command/HTTP/MCP/prompt/agent handlers on 30+ events |

**Open questions:** None of these ships design validators; the repo's token-drift grep and an on-system-rate script are the missing "design validator pack."

---

## Cross-cutting themes

1. **Small models need a verifier, not a conscience.** Every strand — Huang et al., cross-family verification, OpenHands' trained critic, SWE-RM, Aider's lint loop, Claude Code's "give Claude a check it can run" — says the same thing: external, named, machine-checkable feedback is what converts a retry spiral into one repair round.
2. **Constrain selection, free the reasoning.** Enums and schemas make hallucinated components impossible; the 2025–26 small-model evidence (structure snowballing, BAML's false-confidence cases) says over-constraining *reasoning* fields hurts. Rationale-first fields plus enum-typed choices is the stable design.
3. **The big model's job is to write the small model's prompt.** Optimized system prompts (Sonnet 4.5 as meta-agent → 0% to 84–87%), GEPA's reflection LM, Aider's architect, Routine's structured plans: capability moves upstream into the artifact the executor reads, which is then cached at 0.1× price.
4. **Context volume is a guardrail failure mode, not a guardrail.** Atlassian's DESIGN.md result, Chroma's context rot and Anthropic's "bloated CLAUDE.md" warning converge: for cheap models, shorter rules + queryable registries beat comprehensive prose.
5. **Bound everything, then measure pass^k.** Unbounded feedback paths are the loop generator; Claude Code's 8-block Stop cap and doc 03's 2-retry budget are the pattern. Consistency is a *measured* property (pass^3, loops-per-task on a 20–50 task set), never an assumed one — temperature 0 does not even make a single model deterministic.

---

## Recommendations: the guardrail ladder

Ordered cheapest → most robust. Evidence strength: **A** = measured in a peer-reviewed or vendor-published eval; **B** = vendor documentation or repeated practitioner reports; **C** = reasoned from adjacent evidence.

| # | Guardrail | Failure it prevents | Interactive (rule / hook / skill / template) | Automated (schema / validator / router / eval) | Evidence |
|---|---|---|---|---|---|
| 1 | Short, specific rules with exact imports/values | Ignored instructions, recreated components | CLAUDE.md ≤ ~40 lines; design detail in skills; prune with `/doctor` | System prompt = 10 rules + schema; nothing conditional | B ([Best practices](https://code.claude.com/docs/en/best-practices), [Atlassian](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)) |
| 2 | 3–5 gold exemplars of the exact output | Wrong shape, wrong idiom | Skill `references/` with 2–3 canonical component files | Exemplar construction files in the cached prefix | A ([doc 02](../prototype-construction/02-intent-spec-and-context.md), [Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)) |
| 3 | Fill-in-the-slots template / structured plan | Under-specified task, scope creep | Skill with numbered procedure + slots; plan mode on a big model first | Planner (Sonnet/Opus) emits task list; Haiku fills slots | A ([Routine](https://arxiv.org/abs/2507.14447), [Aider](https://aider.chat/2024/09/26/architect.html)) |
| 4 | Self-verification instruction | Unchecked claims of "done" | Rules §7 ritual: screenshot, compare, check console | Checklist rendered into schema descriptions | B ([Anthropic](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)) |
| 5 | Queryable registry instead of prose catalog | Hallucinated components/props | Storybook MCP / shadcn MCP / Figma MCP + "query before use" rule | Catalog index + retrieval; enum from registry | A ([Atlassian](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)), B ([Storybook](https://storybook.js.org/docs/ai/mcp/overview)) |
| 6 | Format + token-drift gate on every edit | Off-token values, noisy diffs | Hooks recipes 1–2 (Prettier, grep/stylelint, PostToolUse exit 2) | Stylelint strict-value + grep as validator step | B ([hooks.md](../../../skill-resources/hooks.md), [stylelint plugin](https://github.com/AndyOGo/stylelint-declaration-strict-value)) |
| 7 | Schema-constrained output with enum component types | Invalid/unknown structure | Not native in Claude Code; emulate via template + validator hook | `output_config.format` / `strict: true`; Zod/Pydantic; Outlines/XGrammar self-hosted | A ([Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [doc 03](../prototype-construction/03-construction-file-generation.md)) |
| 8 | Actionable-error repair loop, max 2 retries | Endless retry spirals | PostToolUse stderr feedback; Stop hook with `stop_hook_active` guard | Instructor-style reask; jsonrepair first; hard cap | A ([OpenHands](https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model)), B ([Instructor](https://github.com/567-labs/instructor)) |
| 9 | Completion gates: a11y + screenshot on Stop | Shipping WCAG failures / unseen renders | Recipes 3–4; `/goal "axe reports 0 violations"` | `@axe-core/cli --exit`, Playwright screenshot diff in CI | B ([axe CLI](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli), [/goal](https://code.claude.com/docs/en/goal)) |
| 10 | Cheap-first, escalate on validator failure | Paying big-model prices for easy tasks | `model: haiku` subagents with frontmatter hooks; main session on Sonnet/Opus | Haiku → validator → Sonnet/Opus retry; log escalation rate | A ([RouteLLM](https://github.com/lm-sys/RouteLLM), [AgentCARD](https://arxiv.org/abs/2606.20629)) |
| 11 | Cross-model reviewer | Self-graded errors | Adversarial review subagent in fresh context | Different-family verifier or trained critic on best-of-N | A ([arXiv 2512.02304](https://arxiv.org/abs/2512.02304), [SWE-RM](https://arxiv.org/abs/2512.21919)) |
| 12 | Design-task eval set, pass^3 + loops-per-task | Silent regressions when rules/skills change | Run `promptfoo` locally before committing rule changes | CI gate on first-pass validity, on-system rate, axe = 0 | B ([Demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)) |
| 13 | Prompt optimization against the eval set | Residual gap after 1–12 | — | GEPA/MIPROv2 on the executor prompt with validator feedback | A ([GEPA](https://arxiv.org/abs/2507.19457), [arXiv 2605.02363](https://arxiv.org/abs/2605.02363)) |

**Starter stack — interactive (one afternoon):** (1) prune CLAUDE.md to exact import paths, token names and the self-verification ritual; (2) install hooks recipes 1, 2 and 4; (3) add a `ui-build` skill containing a numbered procedure, 2–3 gold component files and the checklist; (4) wire Storybook or shadcn MCP and add the "query before use" rule; (5) create one `model: haiku` executor subagent with the token-drift hook in its frontmatter and let the main Sonnet/Opus session plan. Then watch the correction rate — above ~20%, move that task class up the ladder.

**Starter stack — automated (one sprint):** (1) Zod schema with enum component types → `output_config.format` on Haiku, exemplars + schema in a ≥4K-token cached prefix; (2) validator chain: jsonrepair → schema → semantic lint (slots, containment, token refs) → build → axe → screenshot, each with named errors; (3) repair loop capped at 2, then escalate to Sonnet 5 and record the escalation; (4) 20–50 task promptfoo suite scoring first-pass validity, on-system rate, axe = 0, pass^3, loops-per-task, gating CI; (5) once the suite is stable, run GEPA on the executor prompt.

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| Anthropic structured outputs | https://platform.claude.com/docs/en/build-with-claude/structured-outputs | GA schema enforcement (`output_config.format`, `strict: true`), Haiku 4.5 supported; Pydantic/Zod helpers | fetched OK | *proposed:* structured output & routing |
| Instructor | https://github.com/567-labs/instructor | Pydantic validate-and-reask across providers; `max_retries` | fetched OK | structured output & routing |
| BAML | https://github.com/BoundaryML/baml | Schema-aligned parsing, no-retry structured extraction; TS/Python/Go/C#/Java | fetched OK | structured output & routing |
| TypeChat | https://github.com/microsoft/TypeChat | TypeScript types as schema with compiler-error repair | fetched OK | structured output & routing |
| Vercel AI SDK structured data | https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data | `Output.object/choice` with Zod; `NoObjectGeneratedError` for repair | fetched OK | structured output & routing |
| Outlines | https://github.com/dottxt-ai/outlines | JSON/regex/CFG constrained generation, 15.7k stars | fetched OK | structured output & routing |
| XGrammar | https://github.com/mlc-ai/xgrammar | Default constrained-decoding backend in vLLM/SGLang/TRT-LLM | fetched OK | structured output & routing |
| llguidance | https://github.com/guidance-ai/llguidance | ~50μs/token grammar enforcement; used by OpenAI structured outputs | fetched OK | structured output & routing |
| RouteLLM | https://github.com/lm-sys/RouteLLM | Open-source strong/weak router, ICLR 2025 | fetched OK | structured output & routing |
| Not Diamond | https://www.notdiamond.ai/ | Custom routers trained on your evals | fetched OK | structured output & routing |
| OpenRouter Auto Router | https://openrouter.ai/openrouter/auto | Spend-weighted auto model selection with `cost_tier` | fetched OK | structured output & routing |
| DSPy GEPA | https://dspy.ai/api/optimizers/GEPA/overview/ | Reflective prompt optimizer with textual feedback | fetched OK | structured output & routing |
| promptfoo | https://github.com/promptfoo/promptfoo | CLI eval harness; deterministic + rubric assertions; CI | fetched OK | *proposed:* evals & verification |
| Inspect AI | https://github.com/UKGovernmentBEIS/inspect_ai | UK AISI eval framework (tasks/solvers/scorers) | fetched OK | evals & verification |
| Braintrust | https://www.braintrust.dev/ | Evals + tracing + CI quality gates | fetched OK | evals & verification |
| LangSmith repetitions | https://docs.langchain.com/langsmith/repetition | `num_repetitions` for pass^k-style consistency | fetched OK | evals & verification |
| Anthropic "Demystifying evals" | https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents | pass@k vs pass^k, 20–50-task starter sets, isolated trials | fetched OK | evals & verification |
| @axe-core/cli | https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli | Headless a11y audit; `--exit` returns 1 on violations | fetched OK | hooks |
| stylelint-declaration-strict-value | https://github.com/AndyOGo/stylelint-declaration-strict-value | Enforce tokens/variables for chosen CSS properties; autofix | fetched OK | hooks |
| Claude Code hooks reference | https://code.claude.com/docs/en/hooks | Five handler types; blocking semantics | fetched OK | hooks |
| Claude Code `/goal` | https://code.claude.com/docs/en/goal | Session-scoped Stop-hook evaluator (Haiku by default) | fetched OK | subagents-and-commands |
| Claude Code subagent `model:` | https://code.claude.com/docs/en/sub-agents | Per-agent model + frontmatter hooks | fetched OK | subagents-and-commands |
| Storybook MCP | https://storybook.js.org/docs/ai/mcp/overview | Component docs/stories/tests as agent tools; anti-hallucination directive | fetched OK | mcp-servers |
| shadcn registry MCP | https://ui.shadcn.com/docs/registry/mcp | Any shadcn-compatible registry as an MCP source | fetched OK | mcp-servers |
| Guardrails AI | https://github.com/guardrails-ai/guardrails | Output validators with `on_fail`; Hub | fetched OK | structured output & routing |
| OpenAI Agents SDK guardrails | https://openai.github.io/openai-agents-python/guardrails/ | Tripwire pattern; cheap-model guardrail in parallel | fetched OK | structured output & routing (pattern reference) |
| Cursor rules docs | https://cursor.com/docs/context/rules | Four rule types; "under 500 lines"; concrete examples | fetched OK | rules |
| OneRedOak/claude-code-workflows | https://github.com/OneRedOak/claude-code-workflows | Playwright-MCP design review (already curated) | fetched OK | subagents-and-commands |

Not selected: NeMo Guardrails and Cloudflare AI Gateway Guardrails (safety/topical only — fetched OK, out of scope for design validity).

---

## Sources

- https://www.anthropic.com/news/claude-haiku-4-5
- https://www.anthropic.com/engineering/building-effective-agents
- https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- https://code.claude.com/docs/en/best-practices
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/goal
- https://code.claude.com/docs/en/model-config
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://ai.google.dev/gemini-api/docs/structured-output
- https://arxiv.org/abs/2310.01798 — Huang et al., LLMs Cannot Self-Correct Reasoning Yet
- https://arxiv.org/abs/2512.02304 — When Does Verification Pay Off?
- https://arxiv.org/abs/2605.02363 — When Correct Isn't Usable (small-model structured output)
- https://arxiv.org/abs/2607.01641 — Infinite Agentic Loops
- https://arxiv.org/abs/2607.00038 — Loop engineering
- https://arxiv.org/abs/2507.14447 — Routine
- https://arxiv.org/abs/2606.20629 — AgentCARD role specialization
- https://arxiv.org/abs/2605.12925 — AgentLens lucky-pass problem
- https://arxiv.org/abs/2501.10868 — JSONSchemaBench
- https://arxiv.org/abs/2408.02442 — Let Me Speak Freely?
- https://blog.dottxt.ai/say-what-you-mean.html
- https://arxiv.org/abs/2604.06066 — Structure snowballing
- https://boundaryml.com/blog/structured-outputs-create-false-confidence
- https://arxiv.org/abs/2507.19457 — GEPA
- https://dspy.ai/api/optimizers/GEPA/overview/
- https://arxiv.org/abs/2305.05176 — FrugalGPT
- https://github.com/lm-sys/RouteLLM
- https://www.notdiamond.ai/
- https://openrouter.ai/openrouter/auto
- https://arxiv.org/abs/2506.02153 — Small Language Models are the Future of Agentic AI
- https://arxiv.org/abs/2512.21919 — SWE-RM
- https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model
- https://aider.chat/2024/09/26/architect.html
- https://aider.chat/docs/usage/lint-test.html
- https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/
- https://www.trychroma.com/research/context-rot
- https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice
- https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era
- https://www.augmentcode.com/guides/ai-model-routing-guide
- https://cursor.com/docs/context/rules
- https://github.com/567-labs/instructor
- https://github.com/BoundaryML/baml
- https://github.com/microsoft/TypeChat
- https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- https://github.com/dottxt-ai/outlines
- https://github.com/mlc-ai/xgrammar
- https://github.com/guidance-ai/llguidance
- https://github.com/guardrails-ai/guardrails
- https://github.com/NVIDIA-NeMo/Guardrails
- https://openai.github.io/openai-agents-python/guardrails/
- https://developers.cloudflare.com/ai-gateway/features/guardrails/
- https://github.com/promptfoo/promptfoo
- https://www.promptfoo.dev/docs/configuration/expected-outputs/
- https://github.com/UKGovernmentBEIS/inspect_ai
- https://www.braintrust.dev/
- https://docs.langchain.com/langsmith/repetition
- https://storybook.js.org/docs/ai/mcp/overview
- https://ui.shadcn.com/docs/registry/mcp
- https://github.com/AndyOGo/stylelint-declaration-strict-value
- https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli
- https://github.com/OneRedOak/claude-code-workflows

*Not re-verifiable this pass:* the OpenAI structured-outputs launch post (HTTP 403; its 100%-vs-<40% figure is cited via [doc 03](../prototype-construction/03-construction-file-generation.md)); Anthropic's effort-level docs page (guidance taken from the bundled claude-api skill, not fetched). Repo-internal references: [architecture synthesis](../prototype-construction/00-architecture-synthesis.md), [doc 02](../prototype-construction/02-intent-spec-and-context.md), [doc 03](../prototype-construction/03-construction-file-generation.md), [skillchains §6](../../../skill-resources/skillchains.md), [hooks.md](../../../skill-resources/hooks.md), [rules.md](../../../skill-resources/rules.md), [mcp-servers.md](../../../skill-resources/mcp-servers.md).

*Research conducted September 2026 via live web search and fetch; ~62 external sources fetched and confirmed resolving.*
