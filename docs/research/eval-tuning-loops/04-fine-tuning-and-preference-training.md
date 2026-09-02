# Fine-Tuning and Preference Training on Graded Design Outputs — When Weights Beat Text

**Scope:** The weight-level branch of the eval-tuning loop: every generated prototype gets a grade, the grade is reviewed, and the reviewed grade flows back into the generator. Sibling docs cover grading (01), reviewing grades (02), text-level feedback into skills/prompts/catalogs (03) and loop architecture (05). This doc asks when *training on the graded outputs* — SFT, preference optimization, RL with verifiable or rubric rewards — beats prompt/skill/exemplar adaptation for UI and prototype generation, what a grade becomes as a training signal, what a run costs, and what is actually available for Claude versus open models in September 2026. It builds on the guardrails doc's GEPA-vs-GRPO, planner/executor and routing-cost findings ([design-sdlc 04](../design-sdlc/04-small-model-guardrails.md)), the evaluation and failure sections of the UI-generation overview ([foundational 03](../foundational/03-ai-ui-generation.md)) and the construction-file economics ([prototype-construction 03](../prototype-construction/03-construction-file-generation.md)). Verified live September 2026; every availability and price claim links a live vendor page, and anything that could not be re-fetched is marked as such.

## Table of Contents

1. [What a grade becomes as training signal](#1-what-a-grade-becomes-as-training-signal)
2. [The UI-generation training literature](#2-the-ui-generation-training-literature)
3. [Fine-tuning availability and cost, verified live](#3-fine-tuning-availability-and-cost-verified-live)
4. [When weights beat text](#4-when-weights-beat-text)
5. [Design-system specificity](#5-design-system-specificity)
6. [Decision framework](#6-decision-framework)
7. [Cross-cutting themes](#cross-cutting-themes)
8. [Recommendations: text-level vs weight-level decision table](#recommendations-text-level-vs-weight-level-decision-table)
9. [A minimal first training run](#a-minimal-first-training-run)
10. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
11. [Sources](#sources)

---

## 1. What a grade becomes as training signal

**What it is:** The mapping from the grades the loop already produces (schema-valid? on-system rate, axe violations, screenshot similarity, rubric scores, human or judge preferences) to the four data shapes a trainer can consume: demonstrations (SFT), preference pairs (DPO/IPO/KTO/ORPO), scalar rewards (PPO/GRPO) and verifiable or rubric rewards (RLVR, rubric-as-reward, checklist feedback).

**Why it matters:** The loop's grading layer is the expensive part; the training method decides how much of that grade survives. A pass/fail validator is a perfect RLVR signal but a poor DPO signal (no pair), a designer's pairwise preference is a perfect DPO signal but useless to a verifier, and a judge's Likert score is the most convenient and the most hackable.

**Key findings:**

| Signal from the loop | Training method | Data shape | Examples needed (reported) | Noise tolerance | Main risk |
|---|---|---|---|---|---|
| Top-graded outputs only | SFT / rejection-sampling distillation | `messages` JSONL of prompt → best output | LIMA: 1,000 curated examples on a 65B model, "without any reinforcement learning or human preference modeling" ([LIMA](https://arxiv.org/abs/2305.11206)); Bedrock accepted 32–10,000 lines ([AWS](https://aws.amazon.com/blogs/aws/fine-tuning-for-anthropics-claude-3-haiku-model-in-amazon-bedrock-is-now-generally-available/)); AWS guidance "50–100 rows of data is a reasonable start" ([AWS ML blog](https://aws.amazon.com/blogs/machine-learning/fine-tune-anthropics-claude-3-haiku-in-amazon-bedrock-to-boost-model-accuracy-and-quality/)) | Low — every kept example is imitated | Imitates the judge's blind spots; forgets untested behaviors (§4) |
| Human or judge pairwise comparisons | DPO / IPO / ORPO | `{prompt, chosen, rejected}` ([TRL DPO](https://huggingface.co/docs/trl/dpo_trainer)) | OpenAI: "thousands to tens of thousands" ([cookbook](https://developers.openai.com/cookbook/examples/fine_tuning_direct_preference_optimization_guide)); "What Matters in Data for DPO" finds chosen-response quality dominates and online DPO "effectively reduces to supervised fine-tuning on the chosen responses" ([arXiv 2508.18312](https://arxiv.org/abs/2508.18312)) | Robust-DPO gives a bound that degrades with flip rate ε; TRL exposes it as `loss_type="robust"` with `label_smoothing` ≈ 0.1 ([rDPO](https://arxiv.org/abs/2403.00409), [TRL](https://huggingface.co/docs/trl/dpo_trainer)) | Length/plausibility bias of the labeler is learned |
| Single thumbs-up/down | KTO | Unpaired binary signal — "only learning from a binary signal of whether an output is desirable" ([KTO](https://arxiv.org/abs/2402.01306)) | Same order as DPO | Moderate | Same as DPO, minus pair construction cost |
| Deterministic checks (schema valid, on-system rate, axe = 0, build passes, layout/style consistency) | RLVR via GRPO/PPO | Python reward functions returning floats; TRL sums or weights several ([TRL GRPO](https://huggingface.co/docs/trl/grpo_trainer)) | RFT guidance: "several dozen and a few hundred examples" to test usefulness ([OpenAI RFT](https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning)); UICoder's loop worked from ~100–200K *sampled* programs per round of which only 0.4% passed initially ([UICoder](https://arxiv.org/abs/2406.07739)) | High — the reward is the check itself | Reward is only as good as the check: WebRenderBench argues CLIP/feature-distance visual rewards are unreliable and proposes a rendered layout/style-consistency metric instead ([arXiv 2510.04097](https://arxiv.org/abs/2510.04097)) |
| Rubric / checklist scores | Rubric-as-reward, RLCF | Per-item checklist judged by a model or verifier program | RaR: up to 31% relative gain on HealthBench over Likert LLM-judge rewards and "better alignment for smaller judges" ([RaR](https://arxiv.org/abs/2507.17746)); RLCF on Qwen2.5-7B: +4 FollowBench, +6 InFoBench, +3 Arena-Hard ([Checklists](https://arxiv.org/abs/2507.18624)) | Medium | "Stronger verification reduces, but does not eliminate, verifier exploitation" — checkpoints can score higher on rubrics while baselines win on overall quality ([arXiv 2605.12474](https://arxiv.org/abs/2605.12474)); CHERRL reproduces and detects hacking onset ([arXiv 2606.04923](https://arxiv.org/abs/2606.04923)) |
| Trained reward/critic model | Best-of-N reranking or RL | Critic scores trajectories | OpenHands' critic (Qwen2.5-Coder-32B, TD learning on unit-test outcomes) took 60.6% → 66.4% with five attempts and beat prompt-based reranking ([OpenHands](https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model)); for UI, a 4B VLM critic trained with RL on ~10K pages with injected violations went from 36% → 84% micro-F1 across 19 WCAG/deceptive-design/perception principles and is offered as "a reward signal for design-aware code generation" ([arXiv 2607.20690](https://arxiv.org/abs/2607.20690)) | Depends on critic's training labels | Critic drift; needs its own eval |

- **Judge-graded data amplifies the judge.** Self-preference bias across 20 models is "uncorrelated, or even negatively correlated" with capability; structured multi-dimensional evaluation cut it ~31.5% ([arXiv 2604.22891](https://arxiv.org/abs/2604.22891)). Under self-play, a reference-free judge's reported pass rate rose 72% → 94% while true accuracy stayed at 20%; making the judge commit to its own answer first cut false positives 71.9% → 1.2% ([arXiv 2607.05904](https://arxiv.org/abs/2607.05904)). For design grades this argues for the doc-02 pattern: deterministic checks first, rubric items second, holistic judge score last and never alone.
- **On-policy beats off-policy for the same grades.** Thinking Machines' on-policy distillation matched RL at roughly one-tenth the cost (Qwen3 report: 67.6% AIME'24 via RL at 17,920 GPU-hours vs 74.4% via on-policy distillation at ~1,800) and recovered instruction-following lost to domain mid-training (IF-eval 85% → 45–79% → 83%) ([Thinking Machines](https://thinkingmachines.ai/blog/on-policy-distillation/)). The design-loop translation: grade the *executor's own* samples, not a frontier model's.

**Open questions:** No published study measures label-noise tolerance for design preferences specifically; the flip rate ε of a designer panel on UI pairs is unmeasured. Whether a rubric written for grading (doc 01) is safe to reuse verbatim as a reward is the central unknown (§1 hacking results say: not without held-out checks).

---

## 2. The UI-generation training literature

**What it is:** The papers that ran exactly this loop — generate UI code, grade it automatically, train on the graded result — and what they report against prompted frontier models.

**Why it matters:** The literature settles two things: the loop works on small open models (a 15.5B model going from 3% to 82% compile rate), and the gap to prompted frontier models has narrowed to a few points on screenshot-to-code benchmarks — while nobody has published the same loop for *design-system adherence*.

**Key findings:**

| Work | Base / size | Signal | Result vs baselines |
|---|---|---|---|
| **UICoder** (Apple, NAACL 2024) — the canonical instance | StarChat-Beta 15.5B | Swift compiler pass + CLIP relevance filter, 4 rounds, ~100–200K samples per round, 0.4% initially passing; DPO stage | Compile rate 0.03 → 0.79 (Filtered) / 0.82 (Top), CLIP 0.334 → 0.404; Elo 773 → 1099 vs GPT-4 1189 and GPT-3.5 1224; "UICoder-Top had a higher compilation rate than GPT-4"; the DPO variant did *not* beat SFT ([arXiv 2406.07739](https://arxiv.org/abs/2406.07739), [Apple ML](https://machinelearning.apple.com/research/uicoder)) |
| **Design2Code-18B** | CogAgent-18B, LoRA on 20% of WebSight (~164.6K) | Screenshot → HTML SFT | Matches Gemini 1.0 Pro Vision on all five automatic metrics (block 78.5 vs 80.2, text 96.4 vs 94.6, position 74.3 vs 72.3, color 67.0 vs 66.2, CLIP 85.8 vs 84.4) but trails GPT-4V (85.8 / 97.4 / 80.5 / 73.3 / 86.9); humans rated it level with Gemini direct prompting ([arXiv 2403.03163](https://arxiv.org/abs/2403.03163), [project page](https://salt-nlp.github.io/Design2Code/)) |
| **WebSight / Sightseer** | HF VLM, DoRA | 823K → 2M synthetic Tailwind pages + screenshots | Qualitative only in the blog; dataset is the reusable asset ([HF blog](https://huggingface.co/blog/websight), [arXiv 2403.09029](https://arxiv.org/abs/2403.09029)) |
| **Web2Code** (NeurIPS 2024 D&B) | MLLM instruction tuning | Webpage → code + QA pairs | Benchmark + dataset; "current MLLMs are surprisingly poor" at the task ([arXiv 2406.20098](https://arxiv.org/abs/2406.20098)) |
| **UI2Code^N** (2025–26) | 9B open model; CPT ~10M pairs → SFT ~80K → RL ~42K with RVPO (relative visual rankings of rendered candidates) | Execution + rendered visual feedback | Design2Code 88.6 vs GPT-5 89.7 / Gemini-2.5-Pro 89.5 / Claude-4-Sonnet-Thinking 81.2; Web2Code 92.5 vs 93.7 / 90.6 / 85.1; UI polishing 80.0 vs 85.0 / 74.0 / 78.0 ([arXiv 2511.08195](https://arxiv.org/abs/2511.08195)) |
| **AesCoder-4B** (Microsoft Research Asia) | 4B; SFT on AesCode-358K then GRPO-AR | Agentic reward: executability + static + interactive aesthetics | "surpasses GPT-4o and GPT-4.1" and matches 480B–685B open models on OpenDesign (840 real pages) ([arXiv 2510.23272](https://arxiv.org/abs/2510.23272), [repo](https://github.com/bangx7/code_aesthetics)) |
| **UniCoder** | 8B, RG-GRPO | Symbolic attribute alignment (hex colors, coordinates parsed from code) as dense reward + reference injection | Comparable to proprietary systems on Design2Code, ChartMimic, UniSVG, ScreenBench ([arXiv 2606.31732](https://arxiv.org/abs/2606.31732)) |
| **WebRenderBench / ALISA** | RL with layout-style consistency reward | 45.1K real portal pages | "significantly boosts generation performance"; argues vision-similarity rewards are unreliable ([arXiv 2510.04097](https://arxiv.org/abs/2510.04097)) |
| **Designer-feedback training** (Apple, CHI 2026) | "a series of LLMs" | 21 designers, 1,500 annotations via commenting, sketching, direct manipulation, with rationale | "outperform models trained with traditional ranking feedback and all tested baselines, including GPT-5" ([arXiv 2509.16779](https://arxiv.org/abs/2509.16779)) |
| **1D-Bench** (negative result) | Commercial + open MLLMs | Post-training with synthetic repair trajectories + RL | "limited and unstable gains that may stem from sparse terminal rewards and high-variance file-level updates" ([arXiv 2602.18548](https://arxiv.org/abs/2602.18548)) |

- **Pattern across the table:** the training signal that worked was always *rendered or compiled*, never text-only; the gains were largest on the weakest bases (UICoder 3% → 82%) and smallest against current frontier models (UI2Code^N within ~1 point of GPT-5 on Design2Code, 5 points behind on polishing). The Apple CHI paper is the only one where the *kind* of grade (rationale-bearing designer feedback vs rankings) is the variable — and the richer grade won.
- **What is missing:** none of these trains on design-system adherence (on-system component rate, token drift) as a reward. The closest are UniCoder's symbolic attributes and the WCAG-principle critic ([arXiv 2607.20690](https://arxiv.org/abs/2607.20690)). Benchmarks exist to build on — DesignBench (900 pages, React/Vue/Angular, generation/edit/repair, [arXiv 2506.06251](https://arxiv.org/abs/2506.06251)), UI-Bench (10 tools, 300 sites, 4,000+ expert pairwise judgments, [arXiv 2508.20410](https://arxiv.org/abs/2508.20410)), Design Arena ([leaderboard](https://www.designarena.ai/leaderboard), overall tab showed "Coming Soon" at fetch time).
- **Frontier prompting still wins polishing/editing.** 1D-Bench's RL failure on multi-round repair and UI2Code^N's 5-point gap on polishing both say the *iterate-on-feedback* step — the one designers spend their time in ([prototype-construction 03 §5.4](../prototype-construction/03-construction-file-generation.md)) — is where weight-level gains are weakest today.

**Open questions:** No paper isolates a small fine-tuned model against a frontier model *with the same rendered-feedback loop at inference* (the fairest comparison for this repo). Reported Elo/VLM scores use judges whose biases (§1) are not controlled.

---

## 3. Fine-tuning availability and cost, verified live

**What it is:** What you can actually train in September 2026, with what data shape, at what price — and the two vendor withdrawals that change the calculus.

**Why it matters:** The repo is Claude-first. The verified answer is that Claude weights are not a lever available to most teams, OpenAI is exiting managed fine-tuning, and the practical weight-level path for a design loop is an open 4–14B model (or a Gemini Flash tune) driven by Claude-generated grades.

**Key findings — proprietary:**

| Provider | Status (verified) | Methods & data format | Price (verified) |
|---|---|---|---|
| **Anthropic — Claude API** | "The Claude API does not currently offer fine-tuning, but ask your Anthropic contact if you are interested in exploring this option" ([Glossary](https://platform.claude.com/docs/en/about-claude/glossary)) | — | — |
| **Anthropic — Amazon Bedrock** | The Bedrock fine-tuning table lists exactly one Anthropic row: Claude 3 Haiku, `anthropic.claude-3-haiku-20240307-v1:0:200k`, us-west-2 ([AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/custom-model-fine-tuning.html)). That model is **retired on the Claude API (April 20, 2026)** ([deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations)) and Bedrock's model card lists **"Model EOL date: September 10, 2026"**, lifecycle "Legacy (certain regions)" ([Bedrock model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html)). No Claude 4.x/5 model is listed for customization, and the Messages-API Bedrock page mentions no customization ([Claude in Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)). | JSONL, `system` + `messages` (single/multi-turn); 32–10,000 training lines, ≤1,000 validation, <32K tokens per entry; inference requires Provisioned Throughput ([AWS](https://aws.amazon.com/blogs/aws/fine-tuning-for-anthropics-claude-3-haiku-model-in-amazon-bedrock-is-now-generally-available/)) | **Not verifiable** — the Bedrock pricing page returned no Claude customization prices ([Bedrock pricing](https://aws.amazon.com/bedrock/pricing/)). Historical vendor claims: classification 81.5% → 99.6% and 85% fewer tokens per query ([Anthropic, July 2024](https://claude.com/blog/fine-tune-claude-3-haiku)); TAT-QA F1 73.2 → 91.2 with 10,000 examples, output tokens −35% ([AWS](https://aws.amazon.com/blogs/machine-learning/best-practices-and-lessons-for-fine-tuning-anthropics-claude-3-haiku-on-amazon-bedrock/)) |
| **Anthropic — Google Cloud** | Google's Claude partner-model page lists prediction, batch and prompt caching only; no tuning ([Google Cloud](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/partner-models/claude)); Anthropic's page does not mention it ([Claude on Google Cloud](https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai)) | — | — |
| **OpenAI** | **Winding down.** "Creating fine-tuning jobs or training is not available to organizations that have not previously run fine-tuning" since May 7, 2026; orgs without fine-tuned-model inference in 60 days lose job creation July 2, 2026; all customers lose it January 6, 2027; Evals/graders read-only Oct 31, 2026, shutdown Nov 30, 2026 ([deprecations](https://developers.openai.com/api/docs/deprecations), [fine-tuning guide](https://developers.openai.com/api/docs/guides/fine-tuning)) | SFT/DPO on gpt-4.1 family, RFT on o4-mini; graders `string_check`, `text_similarity`, `score_model`, `python`, `multi` ([graders](https://developers.openai.com/api/docs/guides/graders)) | gpt-4.1-mini $5/M training, gpt-4.1 $25/M, o4-mini RFT $100/hour plus grader tokens ([pricing](https://developers.openai.com/api/docs/pricing)) |
| **Google Gemini** | Gemini API/AI Studio: "we no longer have a model available which supports fine-tuning" ([Gemini API](https://ai.google.dev/gemini-api/docs/model-tuning)). Agent Platform (Vertex): supervised tuning on Gemini 3.5 Flash, 3.1 Flash-Lite, 2.5 Pro/Flash/Flash-Lite; RL fine-tuning and preference tuning exist as documented offerings (page bodies are JS-rendered and could not be extracted — model lists taken from Google's indexed docs) ([SFT docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/supervised-tuning), [RL docs](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/reinforcement-tuning)) | JSONL; thinking budget set to 0 / MINIMAL for tuning | Training per 1K tokens: Gemini 3.5 Flash SFT and RL $0.01; 3.1 Flash-Lite $0.003; 2.5 Pro $0.025; 2.5 Flash SFT/preference $0.005; 2.5 Flash-Lite $0.0015. "starting from Gemini 3, tuned model endpoint prediction price will be 1.5 times of the base model" ([pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)) |

**Key findings — open models and tooling:**

- **Trainers.** TRL: `GRPOTrainer` takes a list of Python `reward_funcs` (sync or async, summed or `reward_weights`), vLLM colocate/server generation, PEFT/LoRA ([TRL GRPO](https://huggingface.co/docs/trl/grpo_trainer)); `DPOTrainer` supports sigmoid/IPO/robust/SimPO-style losses and LoRA at lr ≈1e-5 ([TRL DPO](https://huggingface.co/docs/trl/dpo_trainer)). Unsloth (75.5k stars): "2× faster with 70% less VRAM", GRPO/DPO/SFT; "Qwen3 (14B) fits comfortably in a Google Colab 16GB VRAM Tesla T4" ([Unsloth](https://github.com/unslothai/unsloth), [Qwen3 guide](https://unsloth.ai/docs/models/tutorials/qwen3-how-to-run-and-fine-tune)). LLaMA-Factory (74.5k): SFT/RM/DPO/KTO/ORPO/PPO/SimPO over 100+ models; VRAM table — 14B QLoRA-4bit 12 GB, LoRA-16bit 32 GB, full 240 GB ([LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory)). Axolotl (12.4k): SFT, DPO/IPO/KTO/ORPO, GRPO/GDPO, RM/PRM ([Axolotl](https://github.com/axolotl-ai-cloud/axolotl)). verl (23.3k) for multi-node PPO/GRPO/DAPO with function-based rewards ([verl](https://github.com/volcengine/verl)).
- **Serving.** vLLM serves many LoRA adapters on one base with `--enable-lora`, `--max-loras` and runtime `/v1/load_lora_adapter` ([vLLM](https://docs.vllm.ai/en/latest/features/lora.html)); LoRAX (3.8k, Apache-2.0) does the same with just-in-time adapter loading ([LoRAX](https://github.com/predibase/lorax)). Fireworks: "Serve fine-tuned models for the same price as base models", hundreds of LoRAs at ~90% of base throughput, but LoRA models run on dedicated deployments (H100 $8/hr from Sep 1, 2026) unless serverless-eligible ([Fireworks pricing](https://fireworks.ai/pricing), [multi-LoRA](https://fireworks.ai/blog/multi-lora)). Predibase's pricing page now redirects to Rubrik's product site and **could not be verified**.
- **Hosted training prices.** Together: SFT LoRA $0.48/M tokens ≤16B, $1.50 17–69B; DPO LoRA $0.54/M; full SFT $1.20/M; $4 minimum per job ([Together](https://www.together.ai/pricing), [docs](https://docs.together.ai/docs/fine-tuning-pricing)). Fireworks: LoRA SFT $0.50/M ≤16B, LoRA DPO $1.00/M, full 2× LoRA ([Fireworks](https://fireworks.ai/pricing)). Vertex managed SFT for open weights: Qwen 3 14B $8.46/M, Gemma 3 12B $1.82/M, Llama 3.1 8B $0.67/M ([Google pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)). GPU rental: RunPod H100 80GB $1.99 community / $2.89 secure per hour, L40S $0.79/$0.99, RTX 4090 $0.34/$0.74 ([RunPod](https://www.runpod.io/pricing)).

**Cost table — one realistic run.** Assumptions (stated, not sourced): 2,000 graded examples, ~3K tokens each (cached design-system prefix excluded from training tokens; construction file or DS-import TSX per [prototype-construction 03 §5](../prototype-construction/03-construction-file-generation.md)), 3 epochs → ~18M training tokens; DPO doubles tokens (chosen + rejected).

| Path | Model | Training cost | Serving | Source |
|---|---|---|---|---|
| Hosted LoRA SFT | Qwen3/Llama ≤16B | 18M × $0.48–0.50 ≈ **$9–10** | Together dedicated per-minute; Fireworks dedicated $8/hr H100 or serverless base rate | [Together](https://www.together.ai/pricing), [Fireworks](https://fireworks.ai/pricing) |
| Hosted LoRA DPO | same | 36M × $0.54–1.00 ≈ **$19–36** | same | same |
| Self-hosted QLoRA SFT | 14B on RTX 4090 / L40S (12 GB needed) | 1–3 GPU-hours ≈ **$1–3** (duration is an estimate; LLaMA-Factory VRAM table verified) | Same GPU ≈ $0.79–0.99/hr, ~$20–24/day flat | [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory), [RunPod](https://www.runpod.io/pricing) |
| Self-hosted GRPO/RLVR | 7–8B, TRL + vLLM colocate on 1×H100 | Rollout-dominated: cost is GPU-hours × steps, not tokens; rank-1 LoRA suffices for policy gradient ("even with ranks as low as 1") — budget **$20–60** for a few hundred steps at $2–3/hr (estimate) | as above | [TRL](https://huggingface.co/docs/trl/grpo_trainer), [LoRA Without Regret](https://thinkingmachines.ai/blog/lora/) |
| Vertex managed SFT (open weights) | Qwen 3 14B | 18M × $8.46/M ≈ **$152** | Vertex endpoint | [Google pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) |
| Gemini SFT | 2.5 Flash / 3.5 Flash | 18M × $5 / $10 per M ≈ **$90 / $180**; 3.5 Flash RL same per-token rate | Base price (2.5) / 1.5× base (3.x) | [Google pricing](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing) |
| OpenAI SFT (existing customers only) | gpt-4.1-mini | 18M × $5 ≈ **$90**; RFT $100/hr + grader tokens | $0.80/$3.20 per M | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| Claude 3 Haiku on Bedrock | — | **Unverifiable price; model EOL Sept 10, 2026** | Provisioned Throughput required | [AWS docs](https://docs.aws.amazon.com/bedrock/latest/userguide/custom-model-fine-tuning.html) |

**The prompted baseline it must beat** (Anthropic list prices, [claude-api skill cache](../design-sdlc/04-small-model-guardrails.md) §5): Haiku 4.5 $1/$5, Sonnet 5 $2/$10, Opus 5 $5/$25 per MTok, cache reads 0.1×; a screen with a 30K cached prefix + 2K in / 3K out ≈ $0.020 on Haiku, $0.100 on Opus 5. A flat $24/day L40S therefore breaks even with Haiku at ~1,200 screens/day *if* the tuned model's first-pass validity matches — which is the eval question, not a pricing one.

**Open questions:** Whether Anthropic's enterprise "ask your contact" path exists at any price for non-enterprise teams is undocumented. Google's RL-tuning reward types (rubric vs code) could not be read from the JS-rendered page.

---

## 4. When weights beat text

**What it is:** The head-to-head evidence between prompt optimization (GEPA, MIPROv2, few-shot curation) and weight optimization (SFT/DPO/GRPO), plus the operational costs that do not show up in benchmark tables.

**Why it matters:** The guardrails doc's headline — "the big model's job is to write the small model's prompt" ([design-sdlc 04 §4](../design-sdlc/04-small-model-guardrails.md)) — is a text-level answer. This section asks when that answer runs out.

**Key findings:**

- **GEPA vs GRPO, same task, same student.** GEPA beats GRPO by 6% on average and up to 20% with up to 35× fewer rollouts, and MIPROv2 by >10% (ICLR 2026 oral) ([arXiv 2507.19457](https://arxiv.org/abs/2507.19457), [gepa-ai/gepa](https://github.com/gepa-ai/gepa)). The reading for a design loop: a few hundred graded rollouts with *textual* validator feedback move a prompt further than the same rollouts move weights via a scalar reward — as long as the failure is *explainable in text*.
- **Both together beats either.** BetterTogether (EMNLP 2024): alternating prompt and weight optimization ("p → w → p" by default) beat weights-only by up to 60% and prompts-only by 6% on average across Mistral-7B, Llama-2-7B, Llama-3-8B ([arXiv 2407.10930](https://arxiv.org/abs/2407.10930), [DSPy](https://dspy.ai/api/optimizers/BetterTogether/)). DSPy's `BootstrapFinetune` is the distillation step: trace a teacher program, convert traces to training data, call `lm.finetune()` ([DSPy](https://dspy.ai/api/optimizers/BootstrapFinetune/)). The order matters — weights-only was the *worst* arm, which is the case against skipping text-level work.
- **The distillation pattern is the planner/executor split, frozen.** UICoder's models distilled from its data (MPT-7B++ compile 0.13 → 0.69, MPT-30B++ 0.14 → 0.78) did slightly worse than the iteratively self-trained model ([UICoder](https://arxiv.org/abs/2406.07739)); on-policy distillation (grade the student's own samples with the teacher per token) reached RL-level results at "9–30×" better compute efficiency ([Thinking Machines](https://thinkingmachines.ai/blog/on-policy-distillation/)). In this repo's terms: the Sonnet/Opus planner keeps writing the plan; the fine-tuned executor replaces Haiku-plus-prompt in the routing ladder ([design-sdlc 04 §5](../design-sdlc/04-small-model-guardrails.md)) only when the executor's job is narrow enough to be a distribution.
- **Legal boundary on distillation.** Anthropic's commercial terms: customers may not "access the Services to build a competing product or service, including to train competing AI models" ([Commercial Terms §D.4](https://www.anthropic.com/legal/commercial-terms)). Training an internal executor for your own product on Claude-graded data is a question for counsel, not for this doc; the paper trail (what was generated, what was graded, what was trained) should exist regardless.
- **Forgetting and regression.** "LoRA Learns Less and Forgets Less": at typical ranks LoRA "substantially underperforms full finetuning" but "better maintains the base model's performance on tasks outside the target domain" ([arXiv 2405.09673](https://arxiv.org/abs/2405.09673)). "LoRA Without Regret": LoRA matches full fine-tuning when applied to all layers and not capacity-constrained, at ~2/3 the FLOPs; optimal LR ≈10× full-FT ([Thinking Machines](https://thinkingmachines.ai/blog/lora/)). The IF-eval collapse (85% → 45–79%) after domain mid-training ([on-policy distillation](https://thinkingmachines.ai/blog/on-policy-distillation/)) is the concrete warning: a UI executor tuned on screens can lose the tool-calling or edit-format behavior the loop depends on. Doc 05's regression suite must include *untrained* task types.
- **What you own.** A prompt is a file: versioned in git, diffed, cached at 0.1× price, swapped per request. A fine-tuned model is an artifact with a serving dependency (dedicated GPU or per-deployment fee on Fireworks; base-model deprecation on OpenAI/Google ends inference; Claude 3 Haiku tunes die with the model on Sept 10, 2026), a re-training trigger every time the design system changes, and an eval that must be re-run per checkpoint. Multi-LoRA serving (vLLM, LoRAX, Fireworks) shrinks the marginal cost of *another* adapter but not the cost of the first GPU.

**Open questions:** No published GEPA-vs-fine-tune comparison exists on a UI task. The break-even between "GEPA on Haiku with cached prefix" and "LoRA'd 8B on a rented GPU" has not been measured on first-pass validity — it is the E-series experiment this repo already proposes ([prototype-construction 03 §8](../prototype-construction/03-construction-file-generation.md)).

---

## 5. Design-system specificity

**What it is:** Whether to bake *your* component library and tokens into weights, and whether that survives the system evolving.

**Why it matters:** The construction-file architecture's answer to off-system output is structural — "a hallucinated component name becomes *impossible*, not a bug to catch" ([architecture synthesis](../prototype-construction/00-architecture-synthesis.md)). Fine-tuning is the opposite bet: make on-system output *probable* by changing the prior.

**Key findings:**

- **Private-library evidence favors training for *usage*, retrieval for *facts*.** PriCoder shows that "simply providing API documentation isn't sufficient" for unfamiliar private libraries and that synthesized training data gives ">20% in pass@1" with little general regression ([arXiv 2603.15159](https://arxiv.org/abs/2603.15159)). But the API-evolution literature says the opposite about *versions*: models are "version-oblivious", structured documentation lifts executable output 42.55% → 66.36% and context-memory conflict persists when docs contradict trained knowledge ([arXiv 2604.09515](https://arxiv.org/abs/2604.09515)). A model tuned on last quarter's component API will fight this quarter's docs.
- **The image-model LoRA analogy holds — and cuts both ways.** Diffusers LoRA adapters are "a few hundred MBs", swappable per request, and a style adapter trains in ~5 hours on an 11 GB 2080 Ti ([Diffusers](https://huggingface.co/docs/diffusers/training/lora)). Brand-style adapters work because a *look* is stable and fuzzy. A component library is neither: it is a discrete, versioned enum, which is exactly what schemas and registries encode losslessly ([design-sdlc 04 §2, §7](../design-sdlc/04-small-model-guardrails.md)).
- **Preference data for UI is small and prompt-usable.** AlignUI collected 720 UI-control preferences from 50 users and used them *in the prompt*, not in weights, generalizing to six unseen tasks ([arXiv 2601.17614](https://arxiv.org/abs/2601.17614)). The designer-feedback paper trained on 1,500 annotations and beat rankings-trained models ([arXiv 2509.16779](https://arxiv.org/abs/2509.16779)). The dividing line is whether the preference is about *taste* (learnable, slow-changing) or *catalog membership* (enumerable, fast-changing).
- **Verdict:** the schema/registry approach dominates for *which* component and *which* token; weights are worth considering for *how* the system is composed — spacing rhythm, slot idioms, responsive patterns, the "house style" of a screen — precisely the things a validator cannot express and a rubric grades noisily. Even then, train on the *construction file* (500–1,800 tokens, [prototype-construction 03 §5.1](../prototype-construction/03-construction-file-generation.md)), not on TSX, so the adapter learns composition and the schema still forbids drift.

**Open questions:** No published measurement of how fast an adapter's on-system rate decays as a library changes; the sensible proxy — re-run the on-system validator on the adapter after each catalog release — is a doc-05 loop, not a research result.

---

## 6. Decision framework

**What it is:** The rule set for the loop: when the reviewed grade should go into text (skill, exemplar, catalog, GEPA'd prompt — doc 03) versus into weights (this doc).

**Why it matters:** Weight-level changes are slower to make, harder to inspect, and coupled to a serving stack; the cheapest sequence is the one that exhausts text first and treats training as a *product* of a stable eval set rather than a shortcut to one.

**Key findings — the flow:**

```
grade reviewed (doc 02)
  │
  ├─ failure explainable in text? ──yes──▶ rule / exemplar / catalog / GEPA (doc 03). Stop.
  │                                        (GEPA > GRPO with 35× fewer rollouts — arXiv 2507.19457)
  no
  ├─ eval set stable ≥ 1 release cycle AND ≥ ~1,000 graded items? ──no──▶ keep grading; stay text-level.
  yes                                        (LIMA 1K; DPO "thousands+"; RFT test at dozens–hundreds)
  ├─ task narrow & repetitive (one artifact type, one schema)? ──no──▶ stay text-level; planner/executor split.
  yes
  ├─ prompt-level gains plateaued on the eval (≥2 GEPA/MIPROv2 rounds, flat)? ──no──▶ another text round.
  yes
  ├─ volume/latency makes a flat GPU cheaper than per-token? (≈1,200 Haiku screens/day vs one L40S) ──no──▶ text-level.
  yes
  ├─ can you serve, version, re-train, and regression-test the model? ──no──▶ hosted LoRA (Together/Fireworks/Vertex) or stay text-level.
  yes
  └─ design system changes faster than you can retrain? ──yes──▶ text-level for catalog; weights only for composition.
                                                          no ──▶ TRAIN: SFT on top grades → DPO on reviewed pairs →
                                                                 RLVR only with deterministic rewards + held-out judge.
```

- **Signal ladder inside "TRAIN":** (1) rejection-sampled SFT from the loop's own best outputs (UICoder's recipe; cheapest, most robust); (2) DPO on *reviewed* pairs with `robust` loss and chosen-quality curation ([arXiv 2508.18312](https://arxiv.org/abs/2508.18312)); (3) GRPO with deterministic rewards (schema, on-system rate, axe, build) plus at most a small-weight rubric term, monitored with a held-out cross-family judge ([design-sdlc 04 §3](../design-sdlc/04-small-model-guardrails.md)) and a hacking-onset check ([arXiv 2606.04923](https://arxiv.org/abs/2606.04923)). UICoder's DPO stage did not beat its SFT stage; 1D-Bench's RL stage was unstable — the ladder is ordered by evidence, not by sophistication.
- **Model choice under Claude-first constraints:** Claude cannot be tuned (§3), so the executor is an open 4–14B model or Gemini Flash; Claude stays the planner, the reviewer and — via structured outputs and cached prefixes — the prompted baseline every checkpoint must beat.

**Open questions:** The "~1,000 graded items" and "1,200 screens/day" thresholds are derived from cited numbers (LIMA; list prices) not measured on design tasks; treat them as starting points for the E-series experiments.

---

## Cross-cutting themes

1. **The grade is the product; the trainer is a consumer.** Every method in §1 is only as good as the check behind it — compile rate, rendered consistency, axe, on-system rate. The 2025–26 hacking results (rubrics, self-play judges) say holistic judge scores must be the *last* reward term, never the only one.
2. **Rendered feedback is the common denominator.** Every UI paper that reported gains trained on something a browser or compiler produced (UICoder, UI2Code^N, UniCoder, AesCoder, WebRenderBench). Text-only grades did not appear in any winning recipe.
3. **Text first, weights as a frozen text result.** GEPA beats GRPO on rollouts; BetterTogether's worst arm is weights-only; DSPy's `BootstrapFinetune` literally converts a prompt program into weights. Training is how a *stable* prompt-level result gets cheaper, not how an unstable one gets better.
4. **Claude is the reviewer, not the trainee.** The Claude API offers no fine-tuning; Bedrock's single tunable Claude retires on Sept 10, 2026; Google offers none; OpenAI is exiting the business by January 2027. Managed fine-tuning is consolidating on Google (Gemini Flash) and on open-weight hosts.
5. **Enumerate what you can, train what you cannot.** Component and token membership belong in schemas and registries; composition, rhythm and taste are the only design properties where the evidence (designer-feedback training, aesthetics RL) shows weights adding something a validator cannot.

---

## Recommendations: text-level vs weight-level decision table

Evidence strength: **A** = peer-reviewed or vendor-published measurement; **B** = vendor docs or repeated practitioner reports; **C** = reasoned from adjacent evidence.

| Situation | Recommended lever | Why | Evidence |
|---|---|---|---|
| Off-system component or token names | Schema enum + registry MCP (text/structural) | Makes the failure impossible; adapters go stale as the catalog moves | A ([design-sdlc 04](../design-sdlc/04-small-model-guardrails.md), [arXiv 2604.09515](https://arxiv.org/abs/2604.09515)) |
| Wrong output shape / idiom, explainable in words | Exemplars, then GEPA on the executor prompt | Textual feedback beats scalar reward per rollout | A ([GEPA](https://arxiv.org/abs/2507.19457)) |
| Fewer than ~1,000 reviewed grades, eval still changing | Stay text-level; keep grading | Below the data floor for SFT/DPO; training would freeze a moving target | A ([LIMA](https://arxiv.org/abs/2305.11206)), B ([OpenAI cookbook](https://developers.openai.com/cookbook/examples/fine_tuning_direct_preference_optimization_guide)) |
| Prompt plateaued; one narrow artifact (e.g., construction file for one screen family); ≥1K top-graded outputs | Rejection-sampled SFT LoRA on an 8–14B open model, served alongside the prompted baseline | Cheapest weight-level step; UICoder's recipe; hosted run ≈ $10 | A ([UICoder](https://arxiv.org/abs/2406.07739)), B ([Together](https://www.together.ai/pricing)) |
| Reviewers disagree with the judge on *taste* (composition, rhythm, polish) | DPO/KTO on reviewed pairs with robust loss, rationale kept as training text | Designer-aligned feedback beat rankings; chosen-quality dominates | A ([arXiv 2509.16779](https://arxiv.org/abs/2509.16779), [arXiv 2508.18312](https://arxiv.org/abs/2508.18312)) |
| Deterministic checks exist and volume justifies rollouts | GRPO/RLVR with schema + on-system + axe rewards, rubric term small, held-out cross-family judge | Verifiable rewards resist hacking; rubric-only rewards do not | A ([RaR](https://arxiv.org/abs/2507.17746), [arXiv 2605.12474](https://arxiv.org/abs/2605.12474)) |
| Iterative polishing / multi-round editing | Frontier model + rendered feedback at inference (text-level) | Tuned small models trail most here; RL on repair trajectories was unstable | A ([UI2Code^N](https://arxiv.org/abs/2511.08195), [1D-Bench](https://arxiv.org/abs/2602.18548)) |
| Need Claude specifically to change behavior | Prompt, skills, structured outputs, cached prefix | No tuning path on the Claude API, Google, or (after Sept 10, 2026) Bedrock | B ([Glossary](https://platform.claude.com/docs/en/about-claude/glossary), [AWS](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html)) |
| High volume (≳1,200 screens/day) at Haiku-level quality | Self-hosted LoRA executor on one GPU behind vLLM; Claude as planner/reviewer | Flat GPU cost crosses per-token cost; multi-LoRA keeps variants cheap | C (list prices, [RunPod](https://www.runpod.io/pricing), [vLLM](https://docs.vllm.ai/en/latest/features/lora.html)) |
| Design system on a monthly release cadence | Text-level for catalog; retrain adapter only for composition, gated on the on-system validator | Adapters cannot track enums; validators can | C ([§5](#5-design-system-specificity)) |

---

## A minimal first training run

**Goal:** answer "does a tuned executor beat the prompted Haiku baseline on first-pass validity?" for one artifact type, in a week, for under $50.

1. **Data.** From the loop's log, take every construction file (not TSX) for one screen family that passed all deterministic checks *and* a reviewed grade ≥ threshold (doc 02). Target 1,000–2,000 items; deduplicate near-identical prompts. Keep the planner's plan as the prompt and the construction file as the completion. Hold out 100 prompts as the eval set and 50 untrained task types (edits, other screen families) as the regression set.
2. **Method.** Rejection-sampled SFT with LoRA on all layers (rank 16–32, LR ≈10× full-FT rule, 3 epochs) — UICoder's recipe, no DPO yet. Format: chat JSONL `{messages:[system, user(plan), assistant(construction file)]}`.
3. **Model.** Qwen3-8B or -14B (fits 12–16 GB in 4-bit; 14B trains on a free T4 per Unsloth). Trainer: TRL `SFTTrainer` via Unsloth, or Together LoRA SFT (≈$9 at $0.48/M for ~18M tokens).
4. **Cost.** Hosted ≈ $10; self-hosted ≈ 1–3 GPU-hours on an L40S/4090 ($1–3) plus $24/day if you keep the GPU up for serving.
5. **Serve.** vLLM with `--enable-lora`; same schema-constrained decoding (XGrammar/Outlines) the prompted path uses, so both arms have identical output-space constraints.
6. **Evaluate against the prompted baseline** on the 100 held-out prompts, five samples each: first-pass validity, on-system rate, axe = 0, pass^3 and loops-per-task ([design-sdlc 04 §6](../design-sdlc/04-small-model-guardrails.md)) for (a) Haiku 4.5 + cached prefix + current skill, (b) same after one GEPA round, (c) the LoRA. Then run the 50-item regression set on (c) to catch forgetting.
7. **Decide.** Ship (c) only if it beats (b) on first-pass validity *and* does not regress the untrained set; otherwise keep the data, keep grading, and retry after the next 1,000 reviewed items. Record the checkpoint, the data snapshot hash and the catalog version together — the adapter is invalid the day the catalog changes.

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| TRL GRPOTrainer | https://huggingface.co/docs/trl/grpo_trainer | Reward functions as Python callables, weighted, async, vLLM generation, LoRA | fetched OK | *proposed:* training & distillation |
| TRL DPOTrainer | https://huggingface.co/docs/trl/dpo_trainer | `{prompt, chosen, rejected}`; robust/IPO/SimPO losses; PEFT | fetched OK | training & distillation |
| Unsloth | https://github.com/unslothai/unsloth | 2× faster, 70% less VRAM SFT/DPO/GRPO; Qwen3-14B on 16 GB | fetched OK | training & distillation |
| LLaMA-Factory | https://github.com/hiyouga/LLaMA-Factory | Zero-code SFT/DPO/KTO/ORPO/PPO over 100+ models; VRAM table | fetched OK | training & distillation |
| Axolotl | https://github.com/axolotl-ai-cloud/axolotl | Config-driven SFT/DPO/IPO/KTO/ORPO/GRPO, RM/PRM | fetched OK | training & distillation |
| verl | https://github.com/volcengine/verl | Production RL (PPO/GRPO/DAPO) with function-based rewards, multi-node | fetched OK | training & distillation |
| DSPy BootstrapFinetune | https://dspy.ai/api/optimizers/BootstrapFinetune/ | Distill a prompt program into weights from traced teacher runs | fetched OK | training & distillation |
| DSPy BetterTogether | https://dspy.ai/api/optimizers/BetterTogether/ | Alternate prompt and weight optimization (`p -> w -> p`) | fetched OK | training & distillation |
| GEPA | https://github.com/gepa-ai/gepa | Reflective prompt/code optimizer; the text-level comparator | fetched OK | guardrails-and-evals |
| vLLM multi-LoRA | https://docs.vllm.ai/en/latest/features/lora.html | `--enable-lora`, runtime adapter load/unload | fetched OK | training & distillation |
| LoRAX | https://github.com/predibase/lorax | Multi-LoRA server, JIT adapter loading, Apache-2.0 | fetched OK | training & distillation |
| Together fine-tuning | https://www.together.ai/pricing | Hosted LoRA/full SFT+DPO, $0.48/M ≤16B, $4 minimum | fetched OK | training & distillation |
| Fireworks fine-tuning | https://fireworks.ai/pricing | Hosted LoRA SFT/DPO; fine-tuned served at base price | fetched OK | training & distillation |
| Gemini tuning (Agent Platform) | https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/supervised-tuning | SFT/RL/preference tuning on Gemini Flash; pricing verified | page JS-rendered; pricing page fetched OK | training & distillation |
| UICoder | https://arxiv.org/abs/2406.07739 | The canonical compile-and-CLIP-filter self-training loop for UI code | fetched OK | guardrails-and-evals |
| UI2Code^N | https://arxiv.org/abs/2511.08195 | 9B open UI-to-code model with rendered-feedback RL; code released | fetched OK | guardrails-and-evals |
| AesCoder / OpenDesign | https://github.com/bangx7/code_aesthetics | Aesthetic agentic reward + GRPO-AR; 840-page benchmark | fetched OK | guardrails-and-evals |
| UI-principle-violation critic | https://arxiv.org/abs/2607.20690 | 4B VLM critic over 19 WCAG/deceptive-design principles as reward | fetched OK | review-and-feedback |
| Designer-feedback training | https://arxiv.org/abs/2509.16779 | Comment/sketch/manipulation feedback beats rankings for UI models | fetched OK | review-and-feedback |
| DesignBench | https://github.com/webpai/designbench | 900 pages, React/Vue/Angular, generate/edit/repair | fetched OK (arXiv) | guardrails-and-evals |
| Rubrics as Rewards | https://arxiv.org/abs/2507.17746 | Checklist rubrics as RL reward; smaller judges align better | fetched OK | guardrails-and-evals |
| Reward hacking in rubric RL | https://arxiv.org/abs/2605.12474 | Failure modes and a verifier-free hacking diagnostic | fetched OK | guardrails-and-evals |

Not selected: Predibase (pricing page redirects to Rubrik; unverifiable), Claude 3 Haiku Bedrock tuning (model EOL Sept 10, 2026), OpenAI fine-tuning (closed to new orgs since May 7, 2026).

---

## Sources

- https://platform.claude.com/docs/en/about-claude/glossary
- https://platform.claude.com/docs/en/about-claude/model-deprecations
- https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
- https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
- https://docs.aws.amazon.com/bedrock/latest/userguide/custom-model-fine-tuning.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html
- https://aws.amazon.com/bedrock/pricing/
- https://aws.amazon.com/blogs/aws/fine-tuning-for-anthropics-claude-3-haiku-model-in-amazon-bedrock-is-now-generally-available/
- https://aws.amazon.com/blogs/machine-learning/best-practices-and-lessons-for-fine-tuning-anthropics-claude-3-haiku-on-amazon-bedrock/
- https://aws.amazon.com/blogs/machine-learning/fine-tune-anthropics-claude-3-haiku-in-amazon-bedrock-to-boost-model-accuracy-and-quality/
- https://claude.com/blog/fine-tune-claude-3-haiku
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/partner-models/claude
- https://www.anthropic.com/legal/commercial-terms
- https://developers.openai.com/api/docs/guides/fine-tuning
- https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/docs/pricing
- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/cookbook/examples/fine_tuning_direct_preference_optimization_guide
- https://ai.google.dev/gemini-api/docs/model-tuning
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/supervised-tuning
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tuning/reinforcement-tuning
- https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
- https://huggingface.co/docs/trl/grpo_trainer
- https://huggingface.co/docs/trl/dpo_trainer
- https://github.com/unslothai/unsloth
- https://unsloth.ai/docs/models/tutorials/qwen3-how-to-run-and-fine-tune
- https://github.com/hiyouga/LLaMA-Factory
- https://github.com/axolotl-ai-cloud/axolotl
- https://github.com/volcengine/verl
- https://docs.vllm.ai/en/latest/features/lora.html
- https://github.com/predibase/lorax
- https://www.together.ai/pricing
- https://docs.together.ai/docs/fine-tuning-pricing
- https://fireworks.ai/pricing
- https://fireworks.ai/blog/multi-lora
- https://www.runpod.io/pricing
- https://huggingface.co/docs/diffusers/training/lora
- https://dspy.ai/api/optimizers/BootstrapFinetune/
- https://dspy.ai/api/optimizers/BetterTogether/
- https://github.com/gepa-ai/gepa
- https://thinkingmachines.ai/blog/on-policy-distillation/
- https://thinkingmachines.ai/blog/lora/
- https://www.openhands.dev/blog/sota-on-swe-bench-verified-with-inference-time-scaling-and-critic-model
- https://machinelearning.apple.com/research/uicoder
- https://salt-nlp.github.io/Design2Code/
- https://huggingface.co/blog/websight
- https://github.com/bangx7/code_aesthetics
- https://www.designarena.ai/leaderboard
- https://arxiv.org/abs/2406.07739
- https://arxiv.org/abs/2403.03163
- https://arxiv.org/abs/2403.09029
- https://arxiv.org/abs/2406.20098
- https://arxiv.org/abs/2511.08195
- https://arxiv.org/abs/2510.23272
- https://arxiv.org/abs/2606.31732
- https://arxiv.org/abs/2510.04097
- https://arxiv.org/abs/2509.16779
- https://arxiv.org/abs/2602.18548
- https://arxiv.org/abs/2506.06251
- https://arxiv.org/abs/2508.20410
- https://arxiv.org/abs/2607.20690
- https://arxiv.org/abs/2601.17614
- https://arxiv.org/abs/2507.17746
- https://arxiv.org/abs/2507.18624
- https://arxiv.org/abs/2605.12474
- https://arxiv.org/abs/2606.04923
- https://arxiv.org/abs/2604.22891
- https://arxiv.org/abs/2607.05904
- https://arxiv.org/abs/2508.18312
- https://arxiv.org/abs/2403.00409
- https://arxiv.org/abs/2305.11206
- https://arxiv.org/abs/2402.01306
- https://arxiv.org/abs/2507.19457
- https://arxiv.org/abs/2407.10930
- https://arxiv.org/abs/2405.09673
- https://arxiv.org/abs/2603.15159
- https://arxiv.org/abs/2604.09515
