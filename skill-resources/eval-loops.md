# Eval Loops — Grading, Review, and Feeding Grades Back Into the Generator

The loop this file equips: every generated prototype gets a **grade** (deterministic checks, an LLM/VLM judge on a rubric, a human rubric score or pairwise pick) → the grade is **reviewed** by a machine when the check is exact enough and by a human when it is not → the reviewed grade becomes a **versioned change to the generator** — a Claude Code skill's rules and `references/` exemplars, the construction-file pipeline's catalog and schema, or an API pipeline's prompts — and, only when a stable eval set justifies it, to model weights. [guardrails-and-evals.md](guardrails-and-evals.md) owns the one-shot evals and the harnesses (promptfoo, the eval-set YAML, structured outputs, GEPA); this file owns what happens *after* a grade exists and *before* the next generator version ships.

Four findings from the research shape every pick. **Rank, don't score:** humans agree at κ ≈ 0.46 pairwise but 0.26–0.32 on direct ratings, and VLM judges can rank but cannot score, so the reliable primitive is "which of two is better" plus binary checklists — absolute scores are intervals. **Trust the check, sample the judge, own the taste:** deterministic graders auto-accept; judge scores are spot-checked by disagreement, repeat-run variance, and distance from the pass cut, never by the judge's stated confidence; severity and "would ship" stay human — on running web UIs the best judge reached 66% agreement against an 85% human ceiling (WebDevJudge). **A grade becomes a constraint, then an example, then a sentence:** hooks and schema changes are verified by construction and cost no adherence; exemplars carry the strongest teaching evidence; rules and skill text spend a scarce, measured budget; prompt optimizers are for what nobody can phrase. **Version everything the grade depends on, and don't let the vendor be the system of record:** model id, skill SHA, catalog version, prompt hash, rubric version, eval-set version on every record, in a store you own — OpenAI's hosted Evals platform goes read-only on 31 October 2026, and the free tiers of the hosted eval products retain traces for days.

It attaches to the prototype ledger in [prototype-governance.md](prototype-governance.md) (every grade carries a `PROTO-` id; a promoted prototype is the lagging outcome the leading grades predict), to Chain C and Chain F in [skillchains.md](skillchains.md) (the design-review subagent's verdict and the human crit are the LLM and HUMAN grades on the same ledger row), and to the determinism spectrum in [skillchains.md §6](skillchains.md) — only CODE grades gate. Curated and verified live 2 September 2026; model names and prices come from Anthropic's live docs via the `claude-api` skill, never memory.

---

## The loop at a glance

```
GENERATOR vN (skill SHA · catalog vC · model id · prompt hash) ── generates ──▼
[1] PROTOTYPE ── ledger row (PROTO-id, DS version, owner) + trace_id
   ▼
[2] GRADE / CODE ── schema-valid · on-system · axe=0 · preview renders · states present   ── gates; bounded repair (max 2)
   ▼
[3] GRADE / LLM ─── rubric vR binary checklist + explanation, cross-family judge         ── informs, never gates
   ▼
[4] REVIEW / HUMAN ─ 10–20 traces a week, blind first → override + one-line reason ──► rubric vR+1 (drift logged)
   ▼
[5] GRADE TABLE ──── ledger_id · trace_id · grader · annotator_kind · score · override · every version
   ├──► [6] EVAL SET vE+1 (failures → living tier; frozen tier never shrinks; contamination lint vs references/)
   ├──► [7] EXEMPLARS / RULES / CATALOG edit (only HUMAN-graded outputs may enter references/)
   └──► [8] DASHBOARD per generator version (leading vs lagging, with error bars)
              ▼
[9] PR ── CODEOWNERS review ── CI gate: frozen tier no-regress · held-out delta within SE · cost budget
              ▼
[10] CANARY (stable/canary marketplace or prompt label) ── same graders on live tasks ── promote or roll back ──► vN+1
```

**Maturity model.** Promotion between levels is itself gated: no online LLM grading until the judge's agreement with human labels is measured; no CI gate on a held-out delta until the set is large enough for the delta to clear its standard error (at n = 30 and p = 0.8 the 95% interval is roughly ±14 points; at n = 100, about ±8).

| Level | Name | Entry criteria | What exists |
|---|---|---|---|
| 0 | No grades | — | Prototypes generated; quality judged in conversation; nothing recorded |
| 1 | Ledger + CODE grades | Ledger row per prototype; hooks.md recipes 1–4 installed; Recipe A below writes a grade record per generation | Schema, on-system, axe, render, state-presence grades on every generation; no eval set |
| 2 | Eval set + human error analysis | 20–50 real-failure tasks in `evals/`; ≥ 30 traces read and coded by a named quality owner; rubric v1 written *after* reading | skill-creator or promptfoo runs on demand; `benchmark.json` per skill version; review cards stored |
| 3 | Gated loop | Frozen + held-out splits; Recipe C in CI; CODEOWNERS on skills, evals, catalog; pinned plugin versions; grade table joined to the ledger | Every skill/prompt/catalog PR carries a delta; rollback is a revert; dashboard per generator version |
| 4 | Automated loop, human audit | Judge validated on a labeled split (TPR/TNR recorded); online grading; canary cohort; override rate, dev-vs-held-out gap and judge-vs-CODE divergence on the dashboard | Failures auto-sampled into the living tier; weekly blind audit; rubric bumps trigger re-validation; catalog bumps fan out re-grades |

---

## The grading stack

Evidence grade as in guardrails-and-evals.md: **A** measured in a peer-reviewed or vendor-published eval, **B** vendor docs or repeated practitioner reports, **C** reasoned from adjacent evidence.

| Dimension | Grader | Tool | Reliability | Gate or score |
|---|---|---|---|---|
| Schema / catalog validity | CODE | Structured outputs + builder semantic validator (guardrails picks 1–3) | Exact | Gate |
| Console / page errors | CODE | Playwright `page.on("pageerror")` fixture, `expect(errors).toHaveLength(0)` | Exact | Gate |
| axe violations | CODE | `@axe-core/cli --exit` (guardrails pick 6) or Storybook `parameters.a11y.test: 'error'` per story (Storybook 10.6, Vitest addon or test-runner) | Zero false positives by design; ~57% of issues by volume (A) | Gate (= 0) |
| On-system rate / token drift | CODE | hooks.md recipe 2; `stylelint-declaration-strict-value` (guardrails pick 7); open-design-system-bench imports/API-fidelity checks | Exact for what it parses; misses a token in the wrong role | Gate (0 raw) + score (rate) |
| Dead links / route coverage | CODE | Playwright crawl of every `href` → `page.request.get()`, soft-assert status; route map from the intent spec | Exact | Gate (0 dead) + score |
| State coverage | CODE presence + LLM quality | ui-craft seven-state pass; enumerated `states` in the construction file or stories | Presence exact; quality tentative | Gate (presence) + score |
| Visual regression vs gold | CODE | Playwright `toHaveScreenshot` (pixelmatch); mismatch count and ratio | High with a baseline; noisy across OS and fonts | Score; gate only on edit/regression tasks |
| Spacing / alignment / contrast | CODE numbers → LLM | DOM bounding boxes + computed styles handed to the judge — never screenshot-only (best VLM finds ≤ 41% of fine CSS changes, A) | Tentative | Score |
| Hierarchy, consistency, copy, affordances | LLM | Jury of 3 from different model families; evidence first; binary checklist; criteria order permuted; UICrit-style exemplar critiques in the prompt | Ranking ≫ scoring; report an interval | Score |
| Overall quality | HUMAN pairwise (+ LLM pairwise) | Bradley–Terry over pairs; both orders; judge admitted only after the alt-test | κ ≈ 0.46–0.55 human pairwise (A) | Score — fits the weighting |
| Severity | HUMAN | Reviewer override in the grade record | Machine α ≈ 0 (A) | Human field |

**Trust tiers** — what the review step does with each component.

| Grade component | Tier | Human sampling rule | What an override does |
|---|---|---|---|
| Schema-valid / build passes | Auto-accept | 0% — fix the validator if wrong | Bug ticket on the check |
| On-system rate | Auto-accept | 0% | Same |
| axe = 0 | Auto-accept | 1–2% random for false-positive audit | Allowlist entry with rationale |
| Screenshot diff vs gold | Spot-check | Every diff within ±X of threshold; every judge-vs-diff conflict | Threshold or gold render replaced; new anchor |
| Judge: layout / hierarchy / spacing (0–3) | Spot-check | 100% of jury or repeat-run disagreements; 10% stratified by task type × skill version; every score within 0.5 of the cut | Replaces the score; blind-labeled items join the anchor set; ≥ 3 overrides on one criterion → rubric edit |
| Judge: copy / states (pass/fail) | Spot-check | As above, plus every "pass" on a task class with a known failure mode | Same |
| Severity ranking | Always human | 100% of blocking calls before they gate | Human severity is the record; judge severity logged for κ |
| Taste / would-ship / direction | Always human | 100% of anchor-set items; weekly production sample | Human only; feeds the pairwise "v2 beats v1?" ranking |

---

## The picks

### Graders and judges

#### 1. Playwright `toHaveScreenshot` + pixelmatch

[playwright.dev/docs/test-snapshots](https://playwright.dev/docs/test-snapshots) · official · [mapbox/pixelmatch](https://github.com/mapbox/pixelmatch) 6.9k★ · ISC · v7.2.0 (Apr 2026), pushed Jul 2026

**What it does.** `expect(page).toHaveScreenshot()` diffs the live page against a committed baseline through pixelmatch. Verified defaults: `threshold` 0.2 ("perceived color difference in the YIQ color space"), `animations: "disabled"`, `caret: "hide"`, `scale: "css"`; `maxDiffPixels` and `maxDiffPixelRatio` (0–1) set the tolerance, `mask` paints volatile locators `#FF00FF`, `stylePath` injects a stylesheet that hides dynamic regions, `--update-snapshots` re-baselines. pixelmatch itself is `pixelmatch(img1, img2, output, width, height, options)` with threshold 0.1, anti-aliasing detection on by default, returning the mismatched-pixel count.

**Where it sits in the loop.** The visual-regression grader for edit and repair tasks — a *score* in the grade record (count + ratio per viewport `project`), a *gate* only where a gold render exists. Run it per breakpoint so mobile reflow regressions are caught.

**Caveats.** The docs are blunt that rendering "can vary based on the host OS, version, settings, hardware… headless mode" — generate baselines in the same container CI runs in. A new screen has no baseline, so this grades nothing on first drafts; pixel noise is not a design regression; for spacing and alignment, extract bounding boxes and computed styles from the DOM and hand the numbers to the judge instead.

#### 2. open-design-system-bench

[github.com/christophhdesign/open-design-system-bench](https://github.com/christophhdesign/open-design-system-bench) · 34★ · MIT · pushed 31 Aug 2026

**What it does.** Runs coding agents against *your* React + TypeScript component library and grades the output on six weighted dimensions: Imports (10%, only system/React/local), API Fidelity (25%, no hallucinated components or props), Token Discipline (15%, no raw hex or arbitrary values), A11y Static (10%), Compilation (10%), Judgment (30%, a separate model on per-task rubrics). Ten domain-neutral starter tasks; profiles `smoke` (2 cells, ~5 min), `small` (weekly), `full` (90 cells, quarterly). Tasks are intent-level and a prompt-leak check fails validation if the hidden expected component is named in the prompt.

**Where it sits in the loop.** The closest thing to a ready-made on-system grader stack, and the precedent for Recipe B's contamination lint — the "never name the component" rule is what keeps `references/` from leaking into `evals/`. Its mechanical checks are the CODE rows of the stack table; its "lift" (guided vs bare) is the diagnostic for whether a skill is earning its context.

**Caveats.** One author, small; React/TS only; ten tasks is a smoke set, not a regression suite. Judgment is 30% of a *composite* — reuse the check code, record the components, never gate on the blended number.

#### 3. ui-craft

[github.com/educlopez/ui-craft](https://github.com/educlopez/ui-craft) · 308★ · MIT · pushed 31 Aug 2026 · CLI, Claude Code plugin, or `npx skills add`; also wires into Cursor, Codex, Gemini CLI, OpenCode

**What it does.** Three things this loop needs: the `/unhappy` pass that designs the seven non-happy states (idle, loading, empty, error, partial, conflict, offline) before the happy path; **UICraftScore**, a deterministic 0–100 composite of 43 anti-slop rules, token discipline and static a11y (A ≥ 90 … F < 60); and **UsabilityScore**, a judged companion on Nielsen's ten heuristics plus six design laws.

**Where it sits in the loop.** The only grader here for **state coverage** — the dimension no public benchmark measures. Record state *presence* per screen as a CODE grade; treat UsabilityScore as an LLM grade under the spot-check tier.

**Caveats.** A composite hides which rule failed — log rule ids into the grade record, not the letter grade. The anti-slop rules encode one taste; if it fights your direction, keep the graders and skip the generation guidance. Overlaps frontend-design ([skills.md](skills.md) pick 1) as a *skill*; install it for `/unhappy` and the scorer.

#### 4. ArtifactsBench — the checklist-judge pattern (with UICrit for exemplar critiques)

[github.com/Tencent-Hunyuan/ArtifactsBenchmark](https://github.com/Tencent-Hunyuan/ArtifactsBenchmark) · 278★ · CC-BY-4.0 · last push Dec 2025 · [google-research-datasets/uicrit](https://github.com/google-research-datasets/uicrit) · CC-BY-4.0 · **archived Nov 2024**

**What it does.** ArtifactsBench renders each of 1,825 generated artifacts, captures three temporal screenshots, and has an MLLM judge score against a fine-grained per-task checklist; the README claims 94.4% agreement with human votes at 100% automation, with judge scripts for Gemini and Qwen2.5-VL-72B. UICrit is 11,344 designer critiques on 1,000 RICO mobile UIs, each with normalized bounding boxes plus aesthetics, usability and design-quality ratings.

**Where it sits in the loop.** The *shape* of a trustworthy UI judge: evidence gathered before judgment, one checklist per task, binary items. CheckEval's decomposed yes/no questions raised cross-judge agreement by 0.45 versus Likert ([arXiv 2403.18771](https://arxiv.org/abs/2403.18771), no code), which is why the stack table says "binary checklist" and the grade record stores a `checklist` object. UICrit's critiques are the few-shot exemplars a reference-free judge needs in place of a gold render — the paper reports a 55% lift in feedback quality from designer critiques in the prompt.

**Caveats.** The repo has been quiet since December 2025 and its judges are Gemini/Qwen — take the capture and checklist code, not the model. UICrit is archived, mobile-only, one annotator per UI (κ ≈ 0.3): exemplars, not gold.

#### 5. WebDevJudge — the calibration ceiling

[arXiv 2510.18560](https://arxiv.org/abs/2510.18560) · [lcy2723/WebDevJudge](https://github.com/lcy2723/WebDevJudge) · 13★ · pushed Mar 2026 (README: labels refined, scaling past 1k instances)

**What it does.** The only controlled meta-evaluation of LLM and MLLM judges on *running* web implementations: paired apps with human preference labels, static and interactive assessment, plus a "WebDevJudge Unit" split driven by a GUI agent. The paper reports human experts agreeing 84.82% pairwise while the best evaluator (Claude-4-Sonnet, pairwise) reached 66.06%, failing on functional equivalence, task feasibility, and position bias.

**Where it sits in the loop.** Sets the expectation before anyone calibrates: a UI judge at two-thirds of the human ceiling is *normal*. Use pairwise judging, run both orders, fit a Bradley–Terry model over the pairs (twenty lines of scipy; the `choix` library does it but has been quiet since Sept 2025), and admit the judge into the spot-check tier only after evals-skills' `validate-evaluator` reports TPR/TNR on your own labels.

**Caveats.** Research code with an OpenAI-SDK-style config; the numbers are from paper v1 and the scaled dataset may move them; general web apps, not one design system.

### Review and annotation

#### 6. Langfuse — annotation queues and the score table

[github.com/langfuse/langfuse](https://github.com/langfuse/langfuse) · 34.1k★ · MIT except `ee/` · v4.27.0 (1 Sep 2026), pushed today · self-host free

**What it does.** Scores carry `name`, `value`, `dataType` (`NUMERIC` | `CATEGORICAL` | `BOOLEAN` | `TEXT`), `comment`, and a `configId` validated against a score config; they attach to a trace, an observation, a session, or a dataset run via `POST /api/public/scores`, idempotent on `id` + `name` + date. Annotation queues are fully keyboard-driven (arrows to move, `1`–`9` to pick, `Cmd/Ctrl+Enter` to complete, `?` for the cheatsheet). Pricing verified: Hobby free (2 users, 1 queue, 30-day access), Core $29 (3 queues), Pro $199 and Enterprise (unlimited); audit logs are Enterprise-only.

**Where it sits in the loop.** Stages 4 and 5 in one self-hosted box: the judge's score and the reviewer's override live on the same trace, so κ per criterion is a query, and the `comment` is the rationale field the review card requires.

**Caveats.** No judge-vs-human agreement view was found on the docs pages fetched — compute κ/TPR/TNR yourself. Nothing shows a screenshot beside its rubric anchor; the review card below is a custom view over this store. Swap: [Opik](https://github.com/comet-ml/opik) (21.8k★, Apache-2.0 for the full platform including the backend, 2.2.48 released today) if you need Apache on the server or a distraction-free SME queue — its annotators must be workspace members.

#### 7. LangSmith Align Evals

[docs.langchain.com/langsmith/improve-judge-evaluator-feedback](https://docs.langchain.com/langsmith/improve-judge-evaluator-feedback) · Developer free (1 seat, 5k base traces), Plus $39/seat; the live pricing page lists annotation queues on every tier

**What it does.** An *alignment score* — the percentage of human-labeled examples the evaluator agrees with — over a set the docs say should start at 20 balanced examples; an Evaluator Playground where you edit the judge prompt, hit Start Alignment, and compare against a saved baseline; works offline (datasets) and online (traces).

**Where it sits in the loop.** The packaged version of "re-run the anchor set on the new judge before merging" — the baseline comparison is the step most teams skip. Its pairwise queues are the right form for "did skill v2 beat v1?".

**Caveats.** Raw agreement, not chance-corrected — an imbalanced label set flatters it (report per-class counts). Hosted; export labels to your own grade table rather than leaving the anchor set inside a vendor.

#### 8. evals-skills — `validate-evaluator`, `build-review-interface`, `error-discovery`

[github.com/ai-evals-course/evals-skills](https://github.com/ai-evals-course/evals-skills) · 522★ · pushed 31 Aug 2026 · no LICENSE file · `npx skills add https://github.com/ai-evals-course/evals-skills` (also ships `.claude-plugin` and `.codex-plugin`)

**What it does.** Eight Claude Code skills from Husain and Shankar's evals course: `error-discovery` (clusters a JSONL/CSV of outputs, builds an HTML review app, runs the open-coding loop until failure modes stop appearing), `validate-evaluator` (calibrates a judge against human labels with data splits, TPR/TNR and bias correction), `build-review-interface` (a single-file HTML annotation tool served by Python's stdlib), plus `write-judge-prompt`, `eval-audit`, `generate-synthetic-data`, `evaluate-rag`, and a router. The method behind them is Husain's judge recipe (Oct 2024): one principal domain expert, binary pass/fail plus a critique, ~30 examples to discover failure modes, ~100 per failure mode (never fewer than 60) to validate, TPR and TNR reported separately; Honeycomb reached over 90% agreement in three iterations.

**Where it sits in the loop.** The bridge from level 2 to level 3: `error-discovery` on the first 30 traces produces rubric v1; `build-review-interface` is the review card as a tool; `validate-evaluator` is the number that admits a judge to the spot-check tier.

**Caveats.** No license file at time of review. The review interface is generic — add the screenshot and the rubric anchor. RAG parts are irrelevant here.

### Feeding back

Which lever absorbs which failure — the altitude table from [doc 03](../docs/research/eval-tuning-loops/03-feeding-grades-back-text-level.md), tightened:

| Failure class in the grade | Lever | Why that altitude |
|---|---|---|
| Off-token color / px literal | Hook (hooks.md recipe 2) + builder owns styles | Must never happen; a rule alone drifts |
| Invented component or prop | Catalog / schema enum, registry query | Make it unrepresentable, not catchable |
| Missing empty / loading / error state | Required `states` slot with `.describe()` (pipeline); rule + exemplar + eval assertion (skill) | Structural omission → structural requirement |
| Weak hierarchy or layout | Gold exemplar in `references/`; builder layout rule | Hard to state, easy to show |
| Wrong copy tone | One-line voice rule + a labeled contrast pair | Stated in one line, demonstrated in two |
| Wrong pattern for the intent | Skill procedure + nearest-exemplar retrieval (pick 10) | Procedural judgement, loaded on demand |
| Residual, unphrased gap | Optimizer run with textual feedback (pick 11; guardrails pick 15) | Lets the reflector find the words |

Deterministic levers ship per grade; rules, exemplars and prompts accumulate for a weekly batch so one eval run covers the batch and contradictions surface together.

#### 9. skill-creator — evals, benchmark, blind A/B

[anthropics/skills — skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) · 173k★, pushed 1 Sep 2026 · `/plugin install skill-creator@claude-plugins-official`

**What it does.** Test cases in `evals/evals.json` (`id`, `prompt`, `expected_output`, `files`, later `assertions`); a grader subagent writes `grading.json` with `text` / `passed` / `evidence` per assertion; `python -m scripts.aggregate_benchmark` emits `benchmark.json` and `.md` with `pass_rate`, time and tokens as mean ± stddev plus the delta against a baseline — the old skill snapshotted with `cp -r` when improving an existing one. An analyst pass flags non-discriminating assertions ("always pass regardless of skill") and high-variance evals; a blind comparator judges two versions "without telling it which is which"; the description optimizer splits 60/40, runs each query three times, iterates up to five rounds and selects by held-out score. The rule in capitals: generate the eval viewer *before* evaluating outputs yourself.

**Where it sits in the loop.** Recipe C's numbers for skill changes; `benchmark.json` is the before/after block of the change record. The analyst pass is the retirement signal for assertions — and, by the same logic, for exemplars that no longer discriminate.

**Caveats.** Its own warning applies to this repo: "Subjective skills (writing style, design quality) are better evaluated qualitatively — don't force assertions onto things that need human judgment." Assertions are model-graded unless you script them ("write and run a script rather than eyeballing"). No human-review step. `claude plugin eval` and `/skill-doctor` are not in the public marketplaces or skills docs as of today — early-access at best.

#### 10. DSPy few-shot optimizers — `BootstrapFewShot`, `KNNFewShot`

[dspy — optimizers guide](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/learn/optimization/optimizers.md) · [KNNFewShot](https://dspy.ai/api/optimizers/KNNFewShot/) · 37.7k★ · MIT · 3.3.1 (21 Aug 2026)

**What it does.** `LabeledFewShot(k, trainset)` samples demos; `BootstrapFewShot` has a teacher generate complete demonstrations, for "very few examples (around 10)"; `BootstrapFewShotWithRandomSearch` for "50 examples or more"; `KNNFewShot(k, trainset, vectorizer)` retrieves the k nearest examples *at forward time* and hands them to `BootstrapFewShot`. "A typical simple optimization run costs on the order of $2 USD and takes around ten minutes."

**Where it sits in the loop.** Exemplar *selection* from graded outputs. The trainset is the set of HUMAN-graded, gate-passing outputs from the grade table; KNN by task type gives the 1–2 nearest exemplars per generation instead of a fixed gallery. For a Claude Code skill, run it offline and write the chosen set into `references/` with the grade ids in a manifest.

**Caveats.** Committing to DSPy's program model for a selection step; design exemplars are thousands of tokens, so k = 1–2. Order matters and does not transfer across models (doc 03) — fix the order in the versioned set and re-check on a model swap.

#### 11. promptfoo `optimize`

[promptfoo.dev/docs/usage/prompt-optimization](https://www.promptfoo.dev/docs/usage/prompt-optimization/) · promptfoo 24.8k★ · MIT · pushed today

**What it does.** `promptfoo optimize` runs your existing suite as a baseline, asks an optimizer model for revised prompt candidates from the observed failures and scores, evaluates them, and returns the strongest; `--prompt-index` / `--provider-index` pick the pair, `--validation-split` (0–0.5) holds out tests for candidate selection; needs explicit `tests` with assertions.

**Where it sits in the loop.** The residual-gap lever for the API pipeline, with zero new tooling: the guardrails eval set is the search target. One prompt, one provider per run.

**Caveats.** Only as good as the assertions it searches against — drive it with the deterministic graders, then confirm with a blind human pairwise pass; keep the frozen tier out of the split entirely. Young feature; re-read the CLI reference before wiring it into CI.

#### 12. ACE — structured-delta playbooks

[github.com/ace-agent/ace](https://github.com/ace-agent/ace) · 1.3k★ · Apache-2.0 · pushed 24 Aug 2026 · official code for [arXiv 2510.04618](https://arxiv.org/abs/2510.04618), ICLR 2026

**What it does.** A generator, a reflector that extracts lessons from execution feedback, and a curator that turns them into *delta* updates to a playbook — bullets with ids, helpful/harmful counters and sections such as strategies, formulas and common mistakes — merged deterministically with de-duplication and pruning. Named failure modes of naive rewriting: brevity bias and context collapse. Reported +10.6% on agent tasks and +8.6% on finance, with 82% lower adaptation latency.

**Where it sits in the loop.** The shape a self-improving SKILL.md should take: reviewed overrides become *candidate* bullets with counters, appended, never rewritten wholesale; an entry whose helpful counter stalls is the retirement signal. It is also the structure for the "lessons" a reflector proposes from a cluster of overrides before a human turns one into a rule or an exemplar.

**Caveats.** Research code (12 commits); benchmarks are AppWorld and finance, not design. Playbooks grow — hold them to the same line budget as rules and prune with `/doctor`.

**When the delta should be *learned*, not appended:** [gepa-ai/gepa](https://github.com/gepa-ai/gepa) (6.4k★, MIT, pushed 1 Sep 2026) now optimizes any text artifact through `optimize_anything`, ships as `.claude/skills/gepa-optimize-anything/`, and its gskill post evolved a whole SKILL.md from ~300 verifiable tasks per repo — a gpt-5-mini agent went 55% → 82% on Jinja and 24% → 93% on Bleve, and Claude Haiku 4.5 inside Claude Code went 79.3% → 98.3% on Bleve with mean duration 173 s → 142 s. The authors' caveats: tasks are "on the simpler side" and gains concentrate on weaker baselines. It extends guardrails pick 15 and is not re-curated here; the design-grader version of it is untested.

### Loop infrastructure

#### 13. Arize Phoenix + the OpenTelemetry `gen_ai.evaluation.result` event

[github.com/Arize-ai/phoenix](https://github.com/Arize-ai/phoenix) · 11.3k★ · Elastic License 2.0 · v20.5.0 (1 Sep 2026) · [semantic-conventions-genai](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-events.md) · 325★ · Apache-2.0 · pushed today

**What it does.** Phoenix annotations carry `name`, `label`, `score`, `explanation` and an `annotator_kind` of `HUMAN`, `LLM` or `CODE`, attach to spans, and propagate into dataset example metadata on export. The OTel event `gen_ai.evaluation.result` requires `gen_ai.evaluation.name` and recommends `gen_ai.evaluation.score.value`, `score.label` (`pass` / `fail` …), `gen_ai.evaluation.explanation` and `gen_ai.response.id`, parented to the operation span; status **Development**.

**Where it sits in the loop.** The vendor-neutral grade table. `annotator_kind` *is* the trust-tier column; emitting graders as OTel events means Langfuse, Phoenix or MLflow are views and the record is yours. The grade record below is a superset of both.

**Caveats.** ELv2 is not OSI-approved. The OTel event is not stable — pin the semconv version in `provenance`. The ledger join is a metadata field you add; no platform knows what a prototype is. Swap: [MLflow 3](https://mlflow.org/docs/latest/genai/eval-monitor/) (27.8k★, Apache-2.0) if you already run it — feedback on traces with user, timestamp and revisions, evaluation datasets, `mlflow.genai.evaluate()`.

#### 14. Claude Code plugin marketplaces — pinning, channels, rollback

[code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) · [skills](https://code.claude.com/docs/en/skills) · official

**What it does.** Version resolution is explicit `version` → commit SHA → archive sha256 → command-output hash, and "users only receive updates when the version string changes" (a `version` in `plugin.json` silently overrides the marketplace entry). Release channels are separate marketplaces pointing at different `ref`s; a `renames` map (with `null` to remove) migrates users; managed settings offer `extraKnownMarketplaces`, `enabledPlugins`, `strictKnownMarketplaces` (owner wildcards from v2.1.223) and `blockedMarketplaces`; `claude plugin validate .` catches version mismatches and bad frontmatter. Per skill, `disable-model-invocation: true` and `skillOverrides` (`"off"`, `"user-invocable-only"`) are kill switches — plugin skills are managed through `/plugin` instead.

**Where it sits in the loop.** Stage 10: a `stable` and a `canary` marketplace, a cohort with the canary plugin enabled, the grade table filtered by generator version, rollback by reverting the pinned `version`/`sha`. Plugin skills are namespaced `plugin-name:skill-name`, so two versions cannot collide.

**Caveats.** No native percentage rollout — cohort by marketplace. Bumping `version` is a human discipline; make Recipe C fail when the skill diff has no version bump.

#### 15. GitHub CODEOWNERS

[docs.github.com — about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) · official

**What it does.** A file in `.github/`, the root, or `docs/` with gitignore-style patterns (no `!`, no `[ ]`) mapping paths to users or teams; owners are auto-requested on non-draft PRs, and branch protection can "Require review from Code Owners" — with the note that "an approval from *any* of the owners is sufficient."

**Where it sits in the loop.** `.claude/skills/**`, `evals/**` and the catalog owned by the eval owner and a designer; a required review is the only deterministic gate a *text* change gets.

**Caveats.** The any-one-owner rule means a two-role sign-off needs two patterns or a ruleset. Paths are case-sensitive.

### Training and distillation

Weights are the last lever, and the vendor situation, verified live today, narrows it. Anthropic's [glossary](https://platform.claude.com/docs/en/about-claude/glossary): "The Claude API does not currently offer fine-tuning, but ask your Anthropic contact if you are interested." Amazon Bedrock's [customization table](https://docs.aws.amazon.com/bedrock/latest/userguide/custom-model-fine-tuning.html) lists exactly one Anthropic model — Claude 3 Haiku — whose [model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-3-haiku.html) shows **Model EOL date: September 10, 2026** and lifecycle "Legacy". OpenAI's [deprecations page](https://developers.openai.com/api/docs/deprecations): fine-tuning closed to organizations that had never run it on 7 May 2026, to those without recent fine-tuned inference on 2 July 2026, and to everyone on 6 January 2027; its Evals platform goes read-only on 31 October 2026 and shuts down 30 November 2026. So Claude is the planner, the reviewer and the prompted baseline every checkpoint must beat, and the trainee is an open 4–14B model. The decision table from [doc 04](../docs/research/eval-tuning-loops/04-fine-tuning-and-preference-training.md), tightened:

| Situation | Lever | Why |
|---|---|---|
| Off-system component or token names | Schema enum + registry (text) | Makes the failure impossible; adapters go stale as the catalog moves |
| Wrong shape or idiom, explainable in words | Exemplars, then GEPA on the executor prompt | Textual feedback beats a scalar reward per rollout (GEPA vs GRPO: up to 35× fewer rollouts) |
| Fewer than ~1,000 reviewed grades, eval still changing | Stay text-level; keep grading | Below the SFT/DPO data floor; training freezes a moving target |
| Prompt plateaued; one narrow artifact; ≥ 1k top-graded outputs | Rejection-sampled SFT LoRA on an 8–14B open model, served beside the prompted baseline | UICoder's recipe; a hosted run is ~$10 |
| Reviewers disagree with the judge on taste (composition, rhythm) | DPO/KTO on reviewed pairs, `robust` loss, rationale kept | Designer-aligned feedback beat rankings; chosen-quality dominates |
| Deterministic checks exist and volume justifies rollouts | GRPO with schema + on-system + axe rewards, small rubric term, held-out cross-family judge | Verifiable rewards resist hacking; rubric-only rewards do not |
| Iterative polishing, multi-round editing | Frontier model + rendered feedback at inference | Tuned small models trail here; RL on repair trajectories was unstable |
| Need *Claude* to change behavior | Prompts, skills, structured outputs, cached prefix | No tuning path on the Claude API, Google, or Bedrock after 10 Sept 2026 |
| Design system on a monthly cadence | Text for the catalog; retrain only for composition, gated on the on-system validator | Adapters cannot track enums; validators can |

#### 16. TRL — `GRPOTrainer` and `DPOTrainer`

[huggingface.co/docs/trl/grpo_trainer](https://huggingface.co/docs/trl/grpo_trainer) · [dpo_trainer](https://huggingface.co/docs/trl/dpo_trainer) · 19.2k★ · Apache-2.0 · v1.12.0 (26 Aug 2026)

**What it does.** GRPO reward functions are plain Python callables `(prompts, completions, completion_ids, …, **kwargs) -> list[float]`, sync or async, combined with `reward_weights`; generation through vLLM in `colocate` or `server` mode; LoRA via `peft_config`. DPO takes `{prompt, chosen, rejected}` in standard or conversational form; `loss_type` includes `"robust"` (Robust DPO, with `label_smoothing` as the label-flip probability, typical 0.1) alongside `sigmoid`, `ipo`, `sft` and multi-loss combinations; adapters train at a higher LR (≈ 1e-5).

**Where it sits in the loop.** The loop's deterministic graders become reward functions verbatim — schema-valid, on-system rate, axe = 0, preview renders — and reviewed human pairs become DPO rows with the rationale kept as text. `robust` is the answer to a designer panel whose pairwise κ is ≈ 0.5.

**Caveats.** A GPU and an MLOps surface. Rubric-as-reward is hackable — keep the judge term small and a cross-family judge held out (doc 04 §1). Swap: [Unsloth](https://github.com/unslothai/unsloth) (75.5k★, Apache-2.0, pushed today; "2× faster with 70% less VRAM", SFT/DPO/GRPO, free-Colab notebooks) for one GPU, [Axolotl](https://github.com/axolotl-ai-cloud/axolotl) (12.4k★, Apache-2.0) for config-driven runs.

#### 17. Together AI fine-tuning — hosted LoRA on open models

[together.ai/pricing](https://www.together.ai/pricing) · [fine-tuning pricing docs](https://docs.together.ai/docs/fine-tuning-pricing) · verified today

**What it does.** Per-token training with LoRA SFT at $0.48 per 1M tokens for models up to 16B ($1.50 for 17–69B), DPO LoRA at $0.54/M, full fine-tuning at $1.20/M; `total_tokens = epochs × training tokens + evals × validation tokens`; $4.00 minimum per job; cancelled jobs pay for completed steps, failed jobs are refunded; hosting is billed separately per minute.

**Where it sits in the loop.** The no-GPU path for doc 04's minimal first run: ~2,000 graded construction files × ~3k tokens × 3 epochs ≈ 18M tokens ≈ **$9–10** for LoRA SFT — cheap enough to be an experiment, which is the point.

**Caveats.** Serving is the real cost, and the adapter is invalid the day the catalog changes — record checkpoint, data snapshot hash and catalog version together. The prompted baseline it must beat, from the `claude-api` skill: Haiku 4.5 at $1/$5 per MTok with cache reads at 0.1× — about $0.02 per screen with a 30k cached prefix.

#### 18. UICoder — the reference training loop for UI code

[arXiv 2406.07739](https://arxiv.org/abs/2406.07739) · Apple, NAACL 2024 · with [DSPy `BootstrapFinetune`](https://dspy.ai/api/optimizers/BootstrapFinetune/) and [`BetterTogether`](https://dspy.ai/api/optimizers/BetterTogether/)

**What it does.** The canonical instance of this loop on weights: generate SwiftUI, filter by compiler pass and a CLIP relevance score, fine-tune on the survivors, repeat; a DPO stage on top. The paper reports compile rate 0.03 → 0.79–0.82 and Elo 773 → 1099 against GPT-4's 1189 — and that the DPO variant did not beat SFT. DSPy packages the distillation step: `BootstrapFinetune` traces a teacher program into training data and calls the LM's finetune; `BetterTogether` alternates prompt and weight optimization with default strategy `"p -> w -> p"` (Databricks case: +4.8 combined vs +2.1 prompts-only and +1.9 weights-only).

**Where it sits in the loop.** The order of the ladder inside "train": rejection-sampled SFT from gate-passing outputs first, DPO on reviewed pairs second, RL with verifiable rewards last — ordered by evidence, not sophistication. `BetterTogether`'s worst arm being weights-only is the case against skipping text-level work.

**Caveats.** 2024, StarChat-Beta 15.5B, Swift; no design-system-adherence reward in any published loop. Frontier prompting still wins iterative polishing (UI2Code^N trails GPT-5 by five points there; 1D-Bench's RL on repair trajectories was unstable — doc 04 §2). Distilling from Claude output for your own product is a question for counsel: Anthropic's commercial terms bar using the service "to train competing AI models".

---

## Recipes

Each is *authored here*: mechanisms verified against the official hooks, promptfoo and GitHub docs today; scripts untested in your stack — adjust paths, ports and graders.

### Recipe A — Grade-on-generate (Stop / SubagentStop hook → grade record) · *untested*

Protects: **level 1** — every generation leaves a CODE grade with provenance, without anyone remembering to run anything. Advisory (always exits 0); the gate is Recipe C.

`.claude/hooks/grade-on-stop.sh` (`chmod +x`):

```bash
#!/bin/bash
# Runs the deterministic graders on files touched this turn and appends a grade record.
input=$(cat); [ "$(echo "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
files=$(git diff --name-only HEAD -- 'src/**' 'app/**' '*.css' 2>/dev/null); [ -z "$files" ] && exit 0
proto=$(git branch --show-current | grep -oE 'PROTO-[0-9]{4}-[0-9]{3}' || echo "PROTO-unassigned")
raw=0; for f in $files; do n=$(grep -E '#[0-9a-fA-F]{3,8}\b|:\s*[0-9]+px' "$f" 2>/dev/null | grep -vc token-ok); raw=$((raw+n)); done
axe=$(npx --yes @axe-core/cli "${GRADE_URL:-http://localhost:3000}" --stdout 2>/dev/null | jq '[.[].violations[]] | length' 2>/dev/null || echo null)
schema=$(ls construction/*.json >/dev/null 2>&1 && npx --yes ajv-cli validate -s schema/construction-file.json -d 'construction/*.json' >/dev/null 2>&1 && echo true || echo false)
mkdir -p evals/grades
jq -n --arg id "$proto" --arg agent "$(echo "$input" | jq -r '.agent_type // "main"')" \
   --arg skill "$(git log -1 --format=%h -- .claude/skills 2>/dev/null)" --arg repo "$(git rev-parse --short HEAD)" \
   --arg catalog "$(jq -r '.version // "unknown"' package.json 2>/dev/null)" --argjson raw "$raw" --argjson axe "$axe" --argjson schema "$schema" \
   '{grade_id: ("g_" + (now|todate)), task_id: $id, created_at: (now|todate),
     generator: {skill_sha: $skill, repo_sha: $repo, catalog_version: $catalog, agent: $agent},
     gates: {schema_valid: $schema, raw_values: $raw, axe_violations: $axe, passed: ($schema and $raw == 0 and $axe == 0)},
     dimensions: [], defects: [], human: null, provenance: {grader_version: "grade-on-stop@0.1"}}' \
   > "evals/grades/${proto}-$(date +%Y%m%dT%H%M%S).json"
echo "Grade record written for $proto (raw=$raw axe=$axe schema=$schema)"; exit 0
```

Wiring — in `settings.json`, or in a subagent's frontmatter where `Stop` becomes `SubagentStop`:

```json
{ "hooks": { "Stop": [ { "hooks": [ { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/grade-on-stop.sh", "timeout": 90 } ] } ] } }
```

How it works: the hook reads the Stop input from stdin (`stop_hook_active` is the loop guard from guardrails pick 9; `agent_type` is present on SubagentStop), grades only files changed this turn, and writes one JSON record per generation with the provenance the grade table needs — skill SHA, repo SHA, catalog version. The `PROTO-` id comes from the branch name, which the ledger-link gate in prototype-governance.md already enforces on PRs. Add graders as you install them: state presence from the construction file's `states`, the screenshot diff from pick 1, route coverage from a crawl. Ship the records to Langfuse or Phoenix in a nightly job; the file is the system of record.

### Recipe B — Exemplar promotion gate + contamination lint · *untested*

Protects: **the exemplar set** — only human-graded, gate-passing outputs reach `references/`, and nothing in `evals/` is a near-copy of an exemplar. Two parts: a PreToolUse hook that denies direct writes, and the script that is the only door.

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Edit|Write", "hooks": [ { "type": "command",
  "command": "f=$(jq -r '.tool_input.file_path // empty'); case \"$f\" in *.claude/skills/*/references/*) jq -n '{hookSpecificOutput:{hookEventName:\"PreToolUse\",permissionDecision:\"deny\",permissionDecisionReason:\"references/ is promote-only: run scripts/promote-exemplar.sh <grade.json>\"}}' ;; esac" } ] } ] } }
```

`scripts/promote-exemplar.sh <grade.json> <artifact> <skill>`:

```bash
#!/bin/bash
set -e; g="$1"; art="$2"; skill="$3"; dest=".claude/skills/$skill/references"
jq -e '.gates.passed == true and .human.reviewer != null and .human.accepted_as_exemplar == true' "$g" >/dev/null \
  || { echo "Refused: needs gates.passed, a human reviewer, and accepted_as_exemplar=true" >&2; exit 1; }
python3 - "$art" evals <<'PY'
import sys, hashlib, difflib, pathlib
art = pathlib.Path(sys.argv[1]).read_text(); h = hashlib.sha256(art.encode()).hexdigest()
for p in pathlib.Path(sys.argv[2]).rglob("*"):
    if p.is_file() and p.suffix in {".json", ".yaml", ".md", ".tsx", ".txt"}:
        t = p.read_text(errors="ignore")
        if hashlib.sha256(t.encode()).hexdigest() == h: sys.exit(f"Contamination: {p} is byte-identical to the exemplar")
        if difflib.SequenceMatcher(None, art, t).ratio() > 0.9: sys.exit(f"Contamination: {p} is a near-duplicate (ratio > 0.9)")
PY
mkdir -p "$dest"; cp "$art" "$dest/"; printf '%s  %s  %s\n' "$(basename "$art")" "$(jq -r .grade_id "$g")" "$(jq -r .generator.catalog_version "$g")" >> "$dest/MANIFEST"
echo "Promoted $(basename "$art") into $dest (grade $(jq -r .grade_id "$g"))"
```

How it works: the hook's JSON `permissionDecision: "deny"` blocks the write and tells Claude why; the script checks the grade record's `human` block (Recipe A leaves it `null` until a reviewer fills it), lints the eval set for byte-identical and near-duplicate copies, and appends grade id and catalog version to a `MANIFEST` so every exemplar is attributable and retireable. Run the lint alone in CI (`promote-exemplar.sh --lint-only`, trivially added) so a hand-added eval task cannot quietly mirror an exemplar — the open-design-system-bench prompt-leak rule, generalized.

### Recipe C — Skill-change CI gate (frozen no-regress + held-out delta within SE) · *untested*

Protects: **level 3** — no change to a skill, exemplar set, rule file or catalog merges without a before/after on a set no lever was tuned on. Uses the promptfoo suite from guardrails-and-evals.md split into `evals/frozen.yaml` (must never regress) and `evals/heldout.yaml` (delta must clear its standard error).

```yaml
# .github/workflows/skill-gate.yml
on: { pull_request: { paths: ['.claude/skills/**', 'CLAUDE.md', 'evals/**', 'catalog/**'] } }
jobs:
  gate:
    runs-on: ubuntu-latest
    env: { ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }} }
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: git diff --quiet origin/main -- .claude/skills || git diff origin/main -- .claude/skills | grep -qE '^\+.*"?version"?:' || { echo "skill changed without a version bump"; exit 1; }
      - run: scripts/promote-exemplar.sh --lint-only
      - run: npx promptfoo@latest eval -c evals/frozen.yaml --repeat 3 -o frozen.json || { echo "frozen tier regressed"; exit 1; }
      - run: npx promptfoo@latest eval -c evals/heldout.yaml --repeat 3 -o pr.json
      - run: git worktree add ../base origin/main && cp -r evals ../base/ && (cd ../base && npx promptfoo@latest eval -c evals/heldout.yaml --repeat 3 -o "$GITHUB_WORKSPACE/base.json")   # PR's eval set, main's skills
      - run: python3 scripts/paired_delta.py base.json pr.json   # exits 1 if mean delta + 1.96·SE < 0
```

`scripts/paired_delta.py`, the whole of it:

```python
import json, sys, statistics as st
def pass_rate(path):
    r = json.load(open(path))["results"]["results"]; per = {}
    for x in r: per.setdefault(json.dumps(x["vars"], sort_keys=True), []).append(1.0 if x["success"] else 0.0)
    return {k: sum(v)/len(v) for k, v in per.items()}
base, pr = pass_rate(sys.argv[1]), pass_rate(sys.argv[2]); tasks = sorted(set(base) & set(pr))
d = [pr[t] - base[t] for t in tasks]; mean = st.mean(d); se = (st.pstdev(d) / len(d) ** 0.5) if len(d) > 1 else 1.0
print(f"paired delta over {len(d)} tasks: {mean:+.3f} ± {1.96*se:.3f} (95%)")
sys.exit(1 if mean + 1.96 * se < 0 else 0)
```

How it works: the frozen tier is a pass/fail smoke gate (promptfoo exits non-zero on failures); the held-out tier is compared *per task*, old generator versus new, so the standard error is of the paired differences — Miller's recommendation in [Adding Error Bars to Evals](https://arxiv.org/abs/2411.00640) — and a PR fails only on a regression its own noise cannot explain. With `--repeat 3` each task's score is its pass rate over three trials, which is the pass^3 spirit without the multiplication. For skills evaluated by skill-creator, feed `benchmark.json`'s `with_skill` versus baseline pass rates into the same script. Braintrust's `eval-action` (MIT, 20★, pushed yesterday) posts the equivalent regression comment if you already use Braintrust (guardrails pick 13).

---

## Templates

### Grade record (what Recipe A writes, what the review card reads)

```json
{
  "grade_id": "g_01J9…", "task_id": "PROTO-2026-041", "created_at": "2026-09-02T10:14:00Z",
  "artifact": { "kind": "prototype", "commit": "3f1c…", "routes": ["/settings", "/settings/invite"],
                "construction_file_sha": "ab12…", "screenshots": ["…/invite@1280.png", "…/invite@390.png"] },
  "generator": { "skill": "proto-builder@1.4.2", "skill_sha": "9e0d…", "exemplar_set": "ex-2026-08-30",
                 "catalog_version": "ds-core@7.2.0", "schema_version": "cf-1.3", "model": "<model id>", "prompt_sha": "c7a1…" },
  "gates": { "schema_valid": true, "page_errors": 0, "axe_violations": 0, "raw_values": 0, "dead_links": 0, "passed": true },
  "dimensions": [
    { "name": "on_system_rate", "kind": "CODE", "value": 0.97, "evidence": "lint://report#L12" },
    { "name": "state_coverage", "kind": "CODE", "value": { "present": ["idle","loading","empty","error"], "missing": ["offline"] } },
    { "name": "hierarchy", "kind": "LLM", "checklist": { "primary_action_obvious": true, "single_h1": true, "reading_order_matches_dom": false },
      "score": 0.67, "interval": [0.4, 0.9], "judges": [{ "model": "<model id>", "prompt_sha": "e4f9…", "rubric": "hier-v3", "criteria_order_seed": 3 }],
      "evidence": ["dom://main/h2[2]", "screenshot://invite@1280.png#bbox=0.12,0.31,0.40,0.36"] },
    { "name": "overall_pairwise", "kind": "HUMAN", "opponent_grade_id": "g_01J8…", "winner": "this", "rater": "r_42", "seconds": 84 }
  ],
  "defects": [ { "id": "d1", "dimension": "hierarchy", "severity_machine": null, "severity_human": "major",
                 "location": { "route": "/settings/invite", "selector": "form > h2:nth-of-type(2)", "bbox": [0.12, 0.31, 0.40, 0.36] },
                 "message": "Secondary heading competes with primary action", "found_by": "LLM" } ],
  "human": { "reviewer": "r_42", "reviewed_at": "2026-09-02T10:20:00Z", "blind": true,
             "overrides": [ { "dimension": "hierarchy", "from": 0.67, "to": 0.5, "reason": "reading order also wrong on mobile" } ],
             "accepted_as_exemplar": false },
  "provenance": { "grader_version": "grader@0.9.1", "rubric_version": "rubrics-2026-09", "eval_set_version": "evals@v12", "trace": "trace://…/invite.zip" }
}
```

Dimensions are a vector, every defect carries a location, every judge carries identity and an interval, the human block can override anything, and `kind` is the trust tier. There is no seed field: current Claude models reject sampling parameters (`temperature` returns 400 on Opus 5, Sonnet 5 and Fable 5.1 per the `claude-api` skill), so reproducibility is pinned versions plus k trials, not a seed.

### Grade review card (under two minutes; blind first on anchor-set items)

```markdown
## Grade review — <PROTO-id> · <task class> · skill <version> · judge <version> · rubric <version>
**Screenshot(s):** <viewport@breakpoint> · **CODE:** schema ✓/✗ · on-system ✓/✗ · axe <n> · states <present/missing>
**Judge:** <criterion> = <score> [interval] (repeat-run agreement <k/n>; second judge <score>)
**Evidence the judge cited:** <selector / token / region> · **Rubric anchor for this level:** <link to exemplar>

### Your call (pick one)
- [ ] Agree   - [ ] Override → new score: <score>   - [ ] Cannot judge from this evidence (needs live prototype)
**Why (one sentence: anchor + problem + impact):** <"Card grid › row 2: 12px gap vs 16px token; breaks rhythm with header — fails L2 anchor">
**Severity (human only):** blocking / high / medium / nit
**Rubric feels wrong here?** no / yes → what it should say: <one line>
**Add as anchor example?** no / positive / negative      **Promote to references/?** no / yes (runs Recipe B)
_Reviewer:_ <name> · _Blind?_ yes/no · _Time:_ <mm:ss>
```

### Skill change record (the PR body for any generator change)

```md
# Change record — <skill | catalog | prompt> v<from> → v<to>
Date: YYYY-MM-DD   Author: <name>   Reviewer (CODEOWNERS): <name>
Motivating grades: <ids>  (rubric dimension: <dim>; cluster size: <n>/<window>)   Review status: human-confirmed | machine-only | disputed
Lever: hook | schema/catalog | rule | skill instruction | exemplar | optimizer run
Altitude rationale: <why not a lower-cost lever; why not a more deterministic one>
Diff summary: <files touched; +/- lines; exemplars added/retired with catalog version>
Eval before (baseline snapshot, ×3): pass <x>% ± <sd>; tokens <t>; time <s>
Eval after (×3):                     pass <x>% ± <sd>; tokens <t>; time <s>
Frozen tier: no regression ✓/✗     Held-out (paired): <delta> ± <1.96·SE>     Other dimensions: no regression | <dim: delta>
Blind A/B vs previous version: <wins/losses/ties>     Contamination lint: clean ✓/✗
Rollback: git revert <sha> | plugin pin v<from> | prompt label <name> → <previous version>
Follow-ups: <grades still open; exemplar retirement due; canary end date>
```

### Weekly loop review (about 90 minutes: one reviewer, one alternate)

```
Loop review — week of ____   generator versions in play: ____ (stable) / ____ (canary)
1. Leading (CODE) per version, with SE:  first-pass ___  on-system ___  axe=0 ___  pass^3 ___  loops/task ___
2. Lagging: acceptance rate ___  cost/accepted screen ___ (cache-normalized)  time-to-accepted ___
3. Judge health: LLM pass ___  human override rate ___  top 3 override reasons: ___ / ___ / ___
4. Traces read this week (10–20, blind): new failure modes? ___  existing modes changed? ___
5. Eval set: always-pass items (retire → frozen): ___  contamination lint hits: ___  living-tier additions: ___  held-out size ___ (target ≥ 100)
6. Loop vitals: dev-vs-held-out gap ___  judge-vs-CODE divergence ___  median review time/item ___
7. Change control: PRs merged with a delta: ___   canary verdict: promote / extend / roll back
8. Catalog or rubric bumps? ___ → exemplar re-grade scheduled? ___ → judge re-validation scheduled? ___
9. Decisions (one line each, owner, due): ___          10. Next release re-analysis (100+ fresh traces) due: ____
```

---

## Evaluated but not selected

- **[Opik](https://github.com/comet-ml/opik)**, **[MLflow](https://github.com/mlflow/mlflow)**, **[Unsloth](https://github.com/unslothai/unsloth)**, **[Axolotl](https://github.com/axolotl-ai-cloud/axolotl)**, **[gepa-ai/gepa](https://github.com/gepa-ai/gepa)** — all live and good; carried as swap lines under picks 6, 13, 16 and 12 rather than separate entries, because each duplicates a pick's role in the loop.
- **[Argilla](https://github.com/argilla-io/argilla)** (5.1k★, Apache-2.0, active) — a dataset-curation UI, not per-artifact grade review; nothing renders a screenshot beside a rubric anchor. **[Label Studio](https://github.com/HumanSignal/label-studio)** (28.2k★, Apache-2.0, active) — general-purpose labeling; LLM-judge alignment is Enterprise-only. **Prodigy** — paid, engineer-driven, no judge alignment. **W&B Weave** — feedback API but no review queue. **Humanloop** — shut down September 2025.
- **[promptimizer](https://github.com/hinthornw/promptimizer)** (898★) — last push April 2025; promptfoo `optimize` and GEPA cover it.
- **[Design2Code](https://github.com/NoviScl/Design2Code)** (598★, MIT) — last push November 2024, and its metrics need a reference render the loop rarely has; the paper's finding that *text* similarity correlates negatively with human preference is why the grade record keeps components, not a weighted sum. **UIBenchKit** ([arXiv 2605.13141](https://arxiv.org/abs/2605.13141)) — paper only; no repository located.
- **[choix](https://github.com/lucasmaystre/choix)** (203★, MIT) — correct Bradley–Terry inference, quiet since September 2025; a BT fit is short enough to write.
- **Storybook accessibility tests** — real and verified (`parameters.a11y.test: 'error'`, Storybook 10.6); it is a row in the grading stack rather than a pick because `@axe-core/cli` is already guardrails pick 6.
- **[Braintrust eval-action](https://github.com/braintrustdata/eval-action)** (20★, MIT, active) — mentioned in Recipe C; Braintrust itself is guardrails pick 13. **LaunchDarkly AgentControl** — prompts-as-flags with rollouts; Langfuse/LangSmith prompt labels and marketplace channels do the job without another vendor. **DVC** — right only when gold renders outgrow git.
- **Claude 3 Haiku fine-tuning on Bedrock** — the only Claude customization row, EOL 10 September 2026. **OpenAI fine-tuning** — closed to new organizations since 7 May 2026. **Anthropic Console prompt improver** — its docs URL now redirects, and its launch-post techniques include assistant prefill, which current models reject. **Community "skill-doctor" repos** — the built-in command they imply is not in the public docs.

---

*Verified 2 September 2026 against live repos, docs, pricing pages and the `claude-api` skill. Research behind this file: [01 grading](../docs/research/eval-tuning-loops/01-grading-generated-prototypes.md) · [02 review and calibration](../docs/research/eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) · [03 feeding back at the text level](../docs/research/eval-tuning-loops/03-feeding-grades-back-text-level.md) · [04 fine-tuning and preference training](../docs/research/eval-tuning-loops/04-fine-tuning-and-preference-training.md) · [05 loop architecture and governance](../docs/research/eval-tuning-loops/05-loop-architecture-and-governance.md). Sibling collection: [guardrails-and-evals.md](guardrails-and-evals.md).*
