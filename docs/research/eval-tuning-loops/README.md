# Eval-Tuning Loops: Turning Grades into a Better Generator

## The concept

A guardrail keeps one generation on-system. An eval set tells you how often it works. Neither makes the generator better next week. This stream studies the loop that does:

1. **Every generated prototype gets a grade** — deterministic checks (schema validity, on-system rate, accessibility violations, page errors, state presence, screenshot diffs), LLM or VLM judges on a rubric, and human rubric scores or pairwise picks.
2. **The grade is reviewed** — by a machine when the criterion is codified enough to trust, by a human when it is not, with the judge calibrated against a fixed set of blind human labels.
3. **The reviewed grade is fed back into the generator** — as a hook, a schema constraint, an exemplar, a rule, a skill instruction, or an optimizer run against the generator's text; and, when the evidence justifies it, as training signal for model weights.

The generators in scope are the three the repo already builds around: a Claude Code skill (SKILL.md, gold exemplars, CLAUDE.md rules, hooks), the construction-file pipeline (Zod catalog, schema-validated construction file, deterministic builder), and an API pipeline with its own prompts and few-shots.

## The documents

- **[00 — Synthesis](00-synthesis.md)** — the five verdicts, the composed loop as one table (step → what happens → rule → owner → doc), six invariants that make the loop converge rather than spin, how the stream extends the design-sdlc guardrail ladder, consolidated gaps, and a four-level adoption order.
- **[01 — Grading Generated Prototypes](01-grading-generated-prototypes.md)** — deterministic graders and what each misses, LLM/VLM judges with a bias table and the benchmarks to grade against, human rubric design and inter-rater reliability, composite grades and provenance, and grading flows rather than screens. Ends with a grading stack and a grade-record JSON schema.
- **[02 — Reviewing Grades and Human Calibration](02-reviewing-grades-and-human-calibration.md)** — trust tiers for machine grades, calibrating judges to humans with chance-corrected metrics and anchor sets, sampling what humans review, annotation tooling usable by designers, review UX and its measured biases, rubric refinement from overrides, and governance of the review step. Ends with a trust-tier table, a weekly ritual, and a two-minute grade review card.
- **[03 — Feeding Grades Back (Text-Level)](03-feeding-grades-back-text-level.md)** — the altitude ladder for fixes, exemplar curation from graded outputs, skill and rule self-improvement (skill-creator's loop, evolving-context research, rule synthesis), automated prompt optimization compared across fourteen tools, tuning the construction-file pipeline, versioning and regression, and three worked examples. Ends with a fix-altitude table and a skill change record.
- **[04 — Fine-Tuning and Preference Training](04-fine-tuning-and-preference-training.md)** — what a grade becomes as training signal, the UI-generation training literature, fine-tuning availability and cost verified live for Claude and open models, when weights beat text, design-system specificity, and a decision framework. Ends with a text-versus-weights decision table and a minimal first training run.
- **[05 — Loop Architecture and Governance](05-loop-architecture-and-governance.md)** — reference architectures compared, grade storage and provenance, eval-set management and statistical power, metrics and dashboards, gating and change control for skills, the loop's own failure modes with detection signals, and ownership and cadence. Ends with the reference loop diagram, a maturity model, and a weekly loop review template.

## Research brief: what we found

**Rank, don't score.** Humans, VLM judges, and preference arenas converge: pairwise judgment is the reliable primitive (human κ roughly 0.46–0.55 pairwise versus 0.26–0.32 on direct scores), absolute scores are intervals, and per-criterion binary checklists lift cross-judge agreement substantially. VLMs miss most fine visual changes, so spacing, alignment, and contrast are computed from the DOM and handed to the judge as numbers. Deterministic coverage is a known fraction — about 57% of accessibility issues, well under half of fine visual changes — which is why the human step can be sampled but never removed.

**Trust the check, sample the judge, own the taste.** On paired web apps, expert humans agree about 85% of the time and the best judge about 66%. Deterministic grades auto-accept; judge grades are spot-checked on multi-judge disagreement, repeat-run variance, and distance from the threshold, never on the judge's stated confidence; severity and taste stay human. Calibration is a loop anchored to a fixed, blind-labeled set, because grading outputs changes the criteria. The reviewer's interface is the reviewer's accuracy: blind-first, keyboard-driven, short sessions, rationale mandatory.

**A grade becomes a constraint, then an example, then a sentence.** Rule volume is a measured cost. Textual feedback is the currency of the loop: a reviewed grade with a rationale is directly consumable by the strongest current optimizer, and it is the only one shown to improve a whole skill file. Never let a model rewrite the whole playbook; append structured deltas, prune deliberately, version, and split the graded set so every change ships with a held-out before-and-after.

**Weights are a late lever, and Claude is the reviewer, not the trainee.** The Claude API offers no fine-tuning; the single tunable Claude on Bedrock retires in September 2026; OpenAI is winding down managed fine-tuning by January 2027. Managed tuning has consolidated on Gemini Flash and open-weight hosts. On open models the UI loop demonstrably works — compile rates from single digits to over 80% in the canonical study, a 9B model within a point of a frontier model on a design-to-code benchmark — and a 2,000-example LoRA run costs about ten dollars hosted. But every winning recipe trained on rendered or compiled rewards, rubric-only rewards get hacked, and prompt optimization beat reinforcement learning with far fewer rollouts. Training is how a stable text-level result gets cheaper, not how an unstable one gets better: enumerate catalog membership in schemas, train only composition and taste, and only after roughly a thousand reviewed grades exist.

**The loop is the scientific method with a ledger.** Every reference architecture describes the same five-step cycle and disagrees only on sequence: practitioners put human error analysis before any automated grader, vendors put online scoring first. The maturity model reconciles them by making automation a promotion earned against human labels. Deterministic graders gate, model graders inform, humans decide; version everything the grade depends on; keep the grade table in a store you own.

## The templates

Four copy-paste templates ship in these documents and are carried into the curated collection:

- **Grade record** (JSON schema) — [01](01-grading-generated-prototypes.md)
- **Grade review card** (two minutes per item) — [02](02-reviewing-grades-and-human-calibration.md)
- **Skill change record** — [03](03-feeding-grades-back-text-level.md)
- **Weekly loop review** — [05](05-loop-architecture-and-governance.md)

## What this stream feeds

One new curated collection: [skill-resources/eval-loops.md](../../../skill-resources/eval-loops.md), re-verified live against the collection's standard. It sits beside [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md), which owns one-shot evals and harnesses, and joins its grades to the ledger in [prototype-governance.md](../../../skill-resources/prototype-governance.md).

## Open threads

- Measure a VLM judge against anchored designer labels on the stream's own dimensions — hierarchy, state coverage, copy, affordances — using the anchor set the loop already requires.
- Test DOM-augmented judging: does supplying bounding boxes and computed styles close the gap on fine visual changes?
- Build the flow-level graders that exist nowhere: state coverage, dead ends, navigation completeness from a Playwright crawl.
- Run a prompt optimizer against a design grader and report whether judge noise destabilizes it.
- Tie the leading metric to the lagging outcome: on-system rate versus acceptance, from the repo's own experiment series.
