# Eval-Tuning Loops Synthesis — Turning Grades into a Better Generator

**Purpose:** The [design-sdlc stream](../design-sdlc/00-synthesis.md) ends its guardrail ladder at "measure pass^k on a 20–50 task eval set." This stream covers what happens next: **every generated prototype gets a grade → the grade is reviewed by a machine when the criteria are codified enough, and by a human when they are not → the reviewed grade becomes a versioned change to the generator** — a Claude Code skill (SKILL.md, exemplars, rules), the repo's construction-file pipeline (catalog, schema, builder), or an API pipeline's prompts — and, when the evidence justifies it, to model weights. Five documents cover the loop's stages; this synthesis composes them into one loop with the invariants that make it converge rather than spin.

| Doc | Stage | One-line verdict |
|---|---|---|
| [01 — Grading Generated Prototypes](01-grading-generated-prototypes.md) | Grade | **Rank, don't score.** A grade is a vector of binary checks with locations, plus pairwise preference for quality; absolute scores are intervals. VLMs cannot see spacing, alignment, or contrast — compute those from the DOM and hand the judge numbers. |
| [02 — Reviewing Grades and Human Calibration](02-reviewing-grades-and-human-calibration.md) | Review | **Trust the check, sample the judge, own the taste.** Expert humans agree on pairwise UI judgments about 85% of the time; the best judge reaches about 66%. Deterministic grades auto-accept, judge grades are spot-checked on disagreement and repeat variance (never on the judge's stated confidence), severity and taste stay human. Calibration is a loop anchored to a fixed, blind-labeled set. |
| [03 — Feeding Grades Back (Text-Level)](03-feeding-grades-back-text-level.md) | Feed back | **A grade should first try to become a constraint, then an example, and only then a sentence.** Textual feedback is the currency of the loop; GEPA is the only optimizer shown working on a whole SKILL.md. Never let a model rewrite the whole playbook; split the graded set or learn nothing. |
| [04 — Fine-Tuning and Preference Training](04-fine-tuning-and-preference-training.md) | Feed back (weights) | **Claude is the reviewer, not the trainee; text first, weights as a frozen text result.** The Claude API offers no fine-tuning and the one tunable Claude on Bedrock retires in September 2026; OpenAI is exiting managed fine-tuning by January 2027. Training pays only on open models, on rendered or compiled rewards, for one narrow artifact, after prompt-level gains plateau — a 2,000-example LoRA run costs about ten dollars hosted. Enumerate catalog membership in schemas; train only composition and taste. |
| [05 — Loop Architecture and Governance](05-loop-architecture-and-governance.md) | Run the loop | **The loop is the scientific method with a ledger.** Humans first, then automate what they agreed on; deterministic graders gate, model graders inform, humans decide; version everything the grade depends on; do not let the vendor be the system of record. A five-level maturity model gates its own promotions. |

*Research conducted 2 September 2026 via five parallel web-research agents; roughly 250 sources fetched live, with unverifiable items marked in each document.*

---

## The loop, composed

Doc 05's reference loop is the backbone; the other documents supply the rules at each step. Read the table as one pass around the loop for a single generated screen.

| Step | What happens | Rule from the stream | Owner | Doc |
|---|---|---|---|---|
| 1 Generate | Generator vN emits a prototype; the ledger row records skill SHA, catalog version, model id, prompt hash, seed | Provenance on every artifact, or nothing downstream can be attributed | Designer / pipeline | 05 §2, [design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md) |
| 2 Deterministic grade | Schema validity, on-system rate, axe, page errors, dead links, state presence, screenshot diff where a gold render exists | These are gates. Fail any and stop before spending a judge or human token; a bounded repair loop (max 2) runs here | Automation | 01 §1, [design-sdlc 04 §3](../design-sdlc/04-small-model-guardrails.md) |
| 3 Judge grade | Jury of small judges from a different model family, evidence-first, per-criterion binary checklist with permuted order, DOM metrics supplied as numbers | Judges inform, never gate. Record identity, rubric version, interval, and evidence anchors | Automation | 01 §2, 02 §1 |
| 4 Human review | Weekly 10–20 traces: all judge-vs-check and judge-vs-judge disagreements, repeat-variance outliers, a stratified random sample; blind-first on anchor-set items; one-line rationale mandatory on override | The reviewer sees the output before the machine grade; the skill's author of this cycle does not label the anchor set | Quality dictator | 02 §3–§7 |
| 5 Grade table | One record per artifact: gates, dimension vector, defects with locations, judge identities, human overrides, generator provenance | Store components, not composites; self-owned store with vendors as views | Eval owner | 01 §4, 05 §2 |
| 6 Eval set | Failures join the living tier; a frozen tier never shrinks; held-out split untouched by any lever; contamination lint against `references/` | 20–50 tasks is a smoke gate with ±11–14 point intervals, not a 5-point detector; grow held-out to 100+ | Eval owner | 05 §3 |
| 7 Choose the lever | Off-token → hook; invented component → catalog enum; missing state → schema slot or rule + exemplar; weak hierarchy → gold exemplar; wrong tone → one-line rule + contrast pair; residual gap → optimizer with textual feedback | Constraint before example before sentence; a rule is a scarce slot under a 200-line budget | Skill author | 03 §1 |
| 8 Make the change | Exemplars promoted only from human-graded, all-gates-pass outputs; structured deltas appended to skills; catalog bumps as minor versions with re-adopt; GEPA on one component with exemplars and hooks frozen | Never let a model rewrite the whole playbook | Skill author | 03 §2–§5 |
| 9 Gate the change | PR with the skill change record; CI: frozen tier no-regress, held-out delta within its standard error, cost budget; CODEOWNERS on skills, evals, catalog | Every change ships with a before/after on the held-out slice | Eval owner | 03 §6, 05 §5 |
| 10 Canary and promote | Generator vN+1 on a live cohort with the same graders; promote by version bump or roll back by pinned SHA | Watch the loop's own vital signs, not just the generator's | Eval owner | 05 §5, §7 |
| 11 Consider weights | Only when the eval set is stable, ≥1,000 reviewed grades exist, the task is one narrow artifact family, text-level gains have plateaued, and the team can serve and version an open model — Claude itself cannot be tuned | Rewards must be rendered or compiled checks with the rubric term last; stay text-level while the design system changes faster than you can retrain | Eval owner + engineering | 04 §3–§6 |

Two objects hold the loop together, and both are the team's to build because no vendor provides them: the **grade record** (01) with provenance and defect locations, joined to the **prototype ledger** ([design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md)) so every grade has an address.

---

## Invariants that make the loop converge

These appeared independently in at least three of the five documents. A loop that violates one of them produces rising numbers and a generator that is not getting better.

### 1. Rank for improvement, gate for acceptance

Pairwise judgment is the reliable primitive for humans (κ 0.46–0.55) and judges alike; absolute scores are intervals that cover 40–70% of the scale. So the loop uses two currencies: **deterministic gates** to decide whether an artifact may proceed or enter the exemplar set, and **pairwise ranking** (human and judge, Bradley–Terry over versions) to decide whether generator vN+1 beats vN. A single weighted composite answers neither question and hides which lever failed.

### 2. The thing that produced the artifact does not grade it

Carried from the design-sdlc stream and sharpened here at three levels: the judge is from a different model family than the generator (self-preference bias; cross-family verification beats self-verification); the reviewer sees the output before the machine grade (showing the grade first increases acceptance of wrong suggestions); and the person who edited the skill this cycle does not label this cycle's anchor set. The loop's most dangerous shortcut is letting judge-selected outputs become exemplars that shape the next judge prompt — bias amplification with no human in the circuit. Only human-graded outputs are promoted to `references/`.

### 3. Constraint, then example, then sentence

Rule volume is a measured cost: instruction-following degrades past a few hundred rules, contradictory rules are picked arbitrarily, and cheap models suffer most. A reviewed grade should therefore try to become a hook or a schema constraint (verified by construction, zero adherence cost), then a gold or contrast exemplar (the strongest teaching evidence), and only then a line of rule or skill text. Prompt optimizers are for the residual gap nobody can phrase — and they need textual feedback, which is exactly what a reviewed grade with a rationale provides.

### 4. Version everything the grade depends on, and keep a fixed anchor

Model id, skill SHA, catalog version, prompt hash, rubric version, judge version, grader version, eval-set version. Criteria drift is permanent (grading outputs changes the criteria), so the rubric will change; a blind-labeled anchor set that every judge version re-scores is what makes judge drift, rubric drift, and generator drift distinguishable. Without the versions, every alarm is ambiguous; without the anchor, every comparison across rubric versions is invalid.

### 5. Automation coverage is a known fraction; sample the remainder, don't skip it

Automated a11y checks catch about 57% of issues by volume; the best VLM spots about 41% of fine visual changes; agent-executed functional tests pass under 30% on generated apps. Each number is a reason the human step can be *sampled* but never removed. The maturity model encodes the same rule as a promotion gate: turn on online judge grading only after the judge's agreement with human labels is measured.

### 6. Watch the loop's own vital signs

Override rate, dev-versus-held-out gap, judge-versus-check divergence, and review time per item are the loop's health metrics, distinct from the generator's. Leading metrics rising while acceptance rate and time-to-accepted stay flat is the Goodhart signature; override rate trending to zero while acceptance does not rise is the over-automation signature. A dashboard that shows only the generator's numbers cannot see either.

---

## How this stream extends the guardrail ladder

The [design-sdlc guardrail ladder](../design-sdlc/04-small-model-guardrails.md) stops at rung 12 (a design-task eval set scored on pass^3) and rung 13 (prompt optimization against it). This stream expands those two rungs into a system: rung 12's eval set becomes a versioned, tiered dataset with an anchor set and contamination lint (05 §3); rung 13's optimizer run becomes one lever among six, chosen by failure class (03 §1), fed by textual feedback from reviewed grades (03 §4), and gated by a held-out delta (03 §6). The "big model writes the small model's prompt" finding becomes GEPA's reflection model; the "verifier, not a conscience" finding becomes the deterministic-gates-first ordering of every reference architecture in 05 §1.

---

## What this becomes in the repo

One new curated collection, [eval-loops.md](../../../skill-resources/eval-loops.md), verified live against the same bar as the existing eight: the reference loop and maturity model, the grading stack and trust tiers, picks for graders and judges, review and annotation tooling, feeding-back mechanisms, loop infrastructure, and training and distillation; three authored recipes (grade-on-generate hook, exemplar promotion gate with contamination lint, skill-change CI gate); and four templates carried from the research — the **grade record** (01), the **grade review card** (02), the **skill change record** (03), and the **weekly loop review** (05).

It attaches to [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md) (which owns one-shot evals and the harnesses) and to [prototype-governance.md](../../../skill-resources/prototype-governance.md) (whose ledger row is the address every grade joins to).

---

## Gaps and open questions

1. **No judge-versus-human agreement on the stream's own dimensions.** WebDevJudge measures pairwise app quality; nothing measures a VLM judge on hierarchy, state coverage, copy, or affordances against anchored designer labels. The anchor set this stream recommends is the dataset that would settle it.
2. **DOM-augmented judging is untested.** Whether feeding bounding boxes and computed styles closes the DiffSpot gap (VLMs missing most fine visual changes) is the single most useful experiment for grading quality.
3. **Flow-level grading has no benchmark.** State coverage, dead ends, and navigation completeness for generated prototypes are ungraded by any public benchmark; a second year of search finds none. Deterministic crawl checks (dead links, route coverage, per-route axe) are buildable now.
4. **No prompt optimizer has been run against a design grader.** GEPA's skill results use executable tests; whether a VLM-judge score plus rationale is a stable enough metric (noise causing Pareto churn) is unknown.
5. **Retiring anchor examples.** No guidance exists on when to drop a negative exemplar the generator no longer fails; stale negatives may over-constrain a skill.
6. **On-system rate versus acceptance.** No public number ties the leading metric to the lagging outcome; the repo's E-series experiments could add it.
7. **A designer-facing review UX.** Every annotation tool was built for ML engineers; the two-minute review card is a design constraint, not a measured throughput.

---

## Adoption order for a team

Sequenced to the maturity model in 05; each level's exit criterion is the next level's entry.

1. **Level 1 — ledger plus deterministic grades (weeks 1–2).** Every generated prototype has a ledger row; hooks recipes 1–4 run on every generation and their results are written to the row as gates. No eval set yet. Exit: a month of grade records with provenance.
2. **Level 2 — eval set plus human error analysis (weeks 3–6).** Build 20–50 tasks from real failures; a named quality dictator reads at least 30 traces and codes them *before* writing rubric v1; adopt pairwise for overall quality and binary checklists per dimension. Run skill-creator or promptfoo on demand and keep `benchmark.json` per skill version. Exit: a rubric that reached tentative agreement between two reviewers, and an anchor set of blind-labeled items.
3. **Level 3 — the gated loop (month 2–3).** Held-out split; CI gate on the frozen tier and a held-out delta within its standard error; CODEOWNERS on skills, evals, and catalog; the skill change record on every PR; grade table joined to the ledger in a self-owned store. Exit: three consecutive generator versions promoted or rolled back on evidence.
4. **Level 4 — automated loop with human audit (month 4+).** Validate the judge against the anchor set with per-criterion TPR/TNR; turn on sampled online grading; canary cohorts; failures auto-sampled into the living tier; weekly blind audit with override rate on the dashboard. Only now run GEPA on residual gaps, and only now consider training on graded outputs — when the eval set is stable, the task narrow, and text-level gains have plateaued.

At each level the test is the one the repo already uses: did the generator's *outcomes* — acceptance rate, time-to-accepted, cost per accepted screen — improve, not just its leading numbers? If a piece of the loop isn't earning its cost, remove it.
