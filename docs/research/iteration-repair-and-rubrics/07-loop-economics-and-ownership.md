# Loop Economics and Ownership — is the patch-and-rubric loop worth running, who runs it, how often, and how you would know

**Scope:** This is document 07 of the *iteration repair and rubric refinement* stream, and it is the only one that asks whether the loop the other six describe should be run at all. It answers four questions for a deliberately small unit of production — **one designer, or a designer plus an engineering partner, with no eval platform, no DesignOps function, and no budget line**: what a round of iteration actually costs; who owns the rubric when the person who wrote the criterion is the person the criterion judges; what cadence a single practitioner can sustain and what they will drop first; and what measurement honestly proves the loop is working. It ends with a break-even table, a cadence table, a ten-minute weekly scorecard, and a stopping-rules list.

**What it builds on.** The sibling documents in this folder own the parts: the taxonomy of misses (doc 01), the mechanics of repair (doc 02), how to write a criterion and the bloat problem in the abstract (doc 03), what craft criteria actually contain (doc 04), and the tooling including the instruction-following evidence (doc 06). *Sibling docs are referenced by number rather than by link, because they are being written in parallel with this one and their filenames are not fixed at the time of writing.* Across streams, this document sits underneath [eval-tuning-loops 05](../eval-tuning-loops/05-loop-architecture-and-governance.md), which owns loop governance at organizational scale — eval-set versioning, CI gates, CODEOWNERS, canary marketplaces, the maturity model, and the generator-vs-grader failure modes. **Everything here is the same problem with the team removed**; where 05 answers "who signs off," this document answers "what do you do when the signer, the author, the builder and the tester are the same person on a Tuesday afternoon." It attaches to the prototype lifecycle and the promotion gate in [design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md), the guardrail ladder in [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md), the fix-altitude ladder in [eval-tuning-loops 03](../eval-tuning-loops/03-feeding-grades-back-text-level.md), and the token economics of patching versus regeneration in [prototype-construction 05 §7.1](../prototype-construction/05-surgical-editing-iteration.md).

**Explicitly out of scope, with owners:** the taxonomy of miss classes (doc 01); repair mechanics, rollback, and surgical patching (doc 02, and [prototype-construction 05](../prototype-construction/05-surgical-editing-iteration.md)); how to phrase a criterion (doc 03); what craft criteria contain (doc 04); tools and harnesses (doc 06); eval-set management, CI gating, and multi-person change control ([eval-tuning-loops 05](../eval-tuning-loops/05-loop-architecture-and-governance.md)); grading mechanics and judge calibration ([eval-tuning-loops 01](../eval-tuning-loops/01-grading-generated-prototypes.md) and [02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).

> **Verification note — read this before trusting any number below.** Verified live 12 September 2026. This session's outbound egress was restricted by organization policy: `metr.org`, `arxiv.org`, `dora.dev`, `x.com`, `hamel.dev`, `pmc.ncbi.nlm.nih.gov`, `survey.stackoverflow.co`, `gitclear.com`, `substack.com`, `news.ycombinator.com`, `reddit.com` and most journal and vendor domains all returned `403` at the CONNECT stage and could not be fetched. **Two pages were fetched in full** ([Claude Code cost docs](https://code.claude.com/docs/en/costs), [Google Cloud's 2025 DORA announcement](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)), and one first-party file was read from disk (the bundled `claude-api` skill's model/pricing table, cached 2026-06-24). **Every other claim below is marked `[search summary]` and rests on a search-result summary only — the underlying page did not load and was not independently verified.** Where a number matters to an argument, the argument is written so you can see what breaks if the number is wrong. Practitioner posts on X could not be retrieved at all: `x.com` is blocked and no thread-mirror domain resolved, so **no tweet is quoted in this document**, and the two practitioner claims that appear are marked as second-hand summaries of blog posts that were themselves only seen as search summarys.

## Table of Contents

1. [What a patch round actually costs](#1-what-a-patch-round-actually-costs)
2. [The field evidence on whether any of this pays](#2-the-field-evidence-on-whether-any-of-this-pays)
3. [Break-even arithmetic for promoting a miss into a durable check](#3-break-even-arithmetic-for-promoting-a-miss-into-a-durable-check)
4. [The bloat tax: why the cheapest criterion is not free](#4-the-bloat-tax-why-the-cheapest-criterion-is-not-free)
5. [Who owns the rubric when the designer is the reviewer](#5-who-owns-the-rubric-when-the-designer-is-the-reviewer)
6. [Cadence a single practitioner can sustain — and what goes first](#6-cadence-a-single-practitioner-can-sustain--and-what-goes-first)
7. [Knowing the loop works](#7-knowing-the-loop-works)
8. [Failure modes of the loop itself](#8-failure-modes-of-the-loop-itself)
9. [Stopping rules](#9-stopping-rules)
10. [Cross-cutting themes](#cross-cutting-themes)
11. [Recommendations: the ratchet budget](#recommendations-the-ratchet-budget--four-numbers-and-four-artifacts)
12. [Deliverable A — break-even table](#deliverable-a--break-even-table)
13. [Deliverable B — cadence table](#deliverable-b--cadence-table)
14. [Deliverable C — loop-health scorecard](#deliverable-c--loop-health-scorecard-weekly-under-ten-minutes)
15. [Deliverable D — stopping-rules list](#deliverable-d--stopping-rules-list)
16. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
17. [Sources](#sources)

---

## 1. What a patch round actually costs

**What it is:** A decomposition of one iteration — "that's not right, fix the empty state" → new build → look at it again — into the four budgets it spends: tokens, wall-clock, human attention, and re-verification of everything the patch might have broken.

**Why it matters:** The whole stream's premise is that a miss should become a durable rubric line so it stops recurring. That premise is only worth acting on if a recurrence is expensive. If a round costs a dollar and four minutes, a rubric that costs an hour to build and maintain needs a lot of recurrences to pay for itself. The arithmetic in §3 is only as good as this decomposition, so it is worth being precise about which term dominates. **It is not the one people optimize.**

**Key findings:**

### 1.1 Tokens are the smallest term, and the published numbers are unusually good

Anthropic publishes per-developer cost figures for Claude Code, which is the closest thing the field has to a public unit-economics number for agentic coding:

| Figure | Value | Source |
|---|---|---|
| Average cost per developer per **active day** | **≈ $13** | [Claude Code cost docs](https://code.claude.com/docs/en/costs) [fetched] |
| Average cost per developer per **month** | **$150–250** | same [fetched] |
| 90th percentile per active day | **below $30** | same [fetched] |
| Background/idle token use per session | **under $0.04** | same [fetched] |
| Agent teams vs a standard session | **≈ 7× tokens** (teammates in plan mode) | same [fetched] |

The docs also print a worked `/usage` sample that is more instructive than the averages:

```
Total cost:            $0.55
Total duration (API):  6m 20s
Total duration (wall): 6h 33m 10s
Usage by model:
   claude-sonnet-4-6:  1.2k input, 5.3k output, 940.0k cache read, 50.0k cache write ($0.55)
```
— [Claude Code cost docs](https://code.claude.com/docs/en/costs) [fetched]. This is an illustrative example in documentation, not a measurement of a real design session; treat the shape, not the digits.

Three things fall out of that shape. First, **cache reads dominate**: 940k cache-read tokens against 1.2k fresh input. The docs explain why — "Claude Code sends your full conversation with every request, and each time Claude uses tools it sends another request carrying that batch of tool results," so "a one-line question in a session that has been open all day still draws usage for the whole conversation" [fetched]. **The marginal cost of round *n* rises with *n*** even when the instruction is one sentence. Second, at list prices from the bundled `claude-api` skill's table (cached 2026-06-24) — Opus 5 $5/$25 per MTok, Sonnet 5 $2/$10, Haiku 4.5 $1/$5 — the generation itself is cheap: [prototype-construction 05 §7.1](../prototype-construction/05-surgical-editing-iteration.md) estimates a mid-complexity screen at 4–8k output tokens for a full regeneration and 0.05–0.3k for a construction-file patch, which is **$0.10–$0.20 against $0.001–$0.008** of output on Opus 5. Third, dividing the documented $13/active-day by a plausible 10–15 rounds in a working day gives **roughly $0.90–$1.30 of tokens per round**. That is arithmetic on a cited average, not a measured per-round cost, and it will be wrong for anyone whose day looks different.

### 1.2 Wall-clock and human attention are the terms that bite

In the sample above, API time is 6m 20s and wall time is 6h 33m. The gap is a session left open, not six hours of thinking — but it does illustrate that **the token clock and the human clock are not the same clock**, and only one of them is billed.

A round's human cost has three parts that are easy to estimate for yourself and hard to find published:

- **Instruction** — writing the patch request precisely enough that it does not cause a new miss. 30 s to 2 min.
- **Wait** — dead time, partly recoverable, mostly not, because the context you are holding decays.
- **Re-verification** — looking at the artifact again. This is proportional to **the number of things you check by hand**, which is exactly the rubric's hand-checked half. At 20 s per check, twelve hand-checked criteria is four minutes.

So a round is ≈ 6–9 minutes of attention against ≈ $1 of tokens. At any loaded rate between $50 and $150/hour that is **$6–$17 of human time per round against $1 of machine time** — a 6–17× ratio. Every number in that sentence is an assumption except the $1; the conclusion survives a wide range of them, which is the point of stating them.

### 1.3 The re-testing a patch triggers is the term nobody budgets

A patch does not only cost its own round. **It invalidates the manual verification you already did on the rest of the artifact**, unless the patch is provably scoped. Bounding that blast radius is precisely what [prototype-construction 05](../prototype-construction/05-surgical-editing-iteration.md) is about (patch verbs over regeneration, protected regions, schema validation as a hard gate), and it is why the choice of repair mechanism — doc 02's territory — is an economic choice, not only a reliability one.

The consequence for this document is a coupling that determines everything in §3:

> **Every criterion you check by hand makes every subsequent round more expensive, linearly. Every criterion you convert into a machine check makes every subsequent round cheaper. "Promoting a miss into a durable check" is only economically meaningful when the check lands on a rung that a machine executes.**

That is the [design-sdlc 04 guardrail ladder](../design-sdlc/04-small-model-guardrails.md) and the [eval-tuning-loops 03 fix-altitude ladder](../eval-tuning-loops/03-feeding-grades-back-text-level.md) restated as a cost model rather than a reliability model. A rubric that grows only in its hand-checked half is not a ratchet; it is a tax.

**Open questions:** No public dataset gives rounds-per-prototype or minutes-per-round for *design* work with an agent. The Claude Code figures are per developer-day, not per task; SWE-bench cost-per-instance figures exist but measure a different activity and the leaderboard numbers found in search were inconsistent across sources by an order of magnitude [search summary], so none are quoted here. **The single most useful measurement a practitioner could publish is a histogram of rounds-to-acceptance for their own prototypes.** It costs one integer per prototype (§7).

---

## 2. The field evidence on whether any of this pays

**What it is:** What the published record says about AI-assisted development's effect on speed, stability and rework — including the study most often cited in this debate, which its own authors have since withdrawn from the debate.

**Why it matters:** A rubric loop is a *quality control* investment. Its value depends entirely on whether AI-assisted generation actually produces more escaping defects than it saves in build time. If it does not, the loop is ceremony.

**Key findings:**

### 2.1 METR's RCT, and the fact that METR no longer stands behind it

The most-cited number in this area is METR's randomized controlled trial of experienced open-source developers:

| Item | Value |
|---|---|
| Design | RCT; each task randomly assigned to allow or disallow AI |
| Participants | **16** developers, moderate AI experience |
| Tasks | **246** real tasks in their own mature repositories (avg. 22k+ stars, 1M+ LOC), avg. **5 years** prior experience on those repos |
| Frontier tested | February–June 2025; typically Cursor Pro with Claude 3.5/3.7 |
| Forecast before | developers predicted **−24%** completion time |
| Belief after | developers estimated **−20%** completion time |
| **Measured** | **+19% completion time** — i.e. AI access made them *slower* |

All of the above is [search summary] — `metr.org` and `arxiv.org` were both blocked; the figures come from search-result summaries of [metr.org's July 2025 post](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) and [arXiv 2507.09089](https://arxiv.org/abs/2507.09089). **The confidence interval could not be retrieved** (the search summary points to the paper's Appendix D without reproducing it), so the effect size here is a point estimate with no reported precision.

The caveats matter more than the headline, and the strongest one is METR's own. In a February 2026 update, METR states the finding **"is now outdated"**, that "speedups now seem likely," and that their newer experiment's data is unreliable because of selection effects: a rising share of developers declined to participate rather than work without AI, **30–50% of developers reported not submitting some tasks** for that reason, the pay rate was cut from **$150/hr to $50/hr**, and time-on-task is unmeasurable for developers running several agents concurrently [search summary — [metr.org uplift update](https://metr.org/blog/2026-02-24-uplift-update/) and its [Substack mirror](https://metr.substack.com/p/2026-02-24-uplift-update), both blocked].

**How to use it honestly.** The 19% slowdown is not evidence that AI makes people slower in September 2026; its authors say so. What survives, and what is directly relevant to this document, is the *perception gap*: a 39-percentage-point spread between believed (−20%) and measured (+19%) speed, in an RCT, among experienced people working in their own code. **A practitioner's felt sense of whether the loop is working is not evidence.** That is the entire justification for §7.

### 2.2 DORA: throughput up, stability down, and the amplifier framing

The 2025 DORA report (nearly 5,000 respondents plus 100+ hours of qualitative data) reports [fetched, [Google Cloud announcement](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)]:

- **90%** of respondents use AI at work; **80%+** believe it increased their productivity; **30%** report little or no trust in AI-generated code.
- AI adoption has a **positive relationship with software delivery throughput** and with product performance — an improvement over 2024.
- AI adoption "continues to have a **negative relationship with software delivery stability**," because it accelerates change volume without the control systems (automated testing, version control, fast feedback) that absorb it.
- The central claim: "AI doesn't fix a team; it amplifies what's already there."

Secondary coverage of the same report adds that AI correlates with "more change failures, increased rework, and longer cycle times to resolve issues" and that AI is "exposing downstream bottlenecks in testing, code review, and quality assurance" [search summary]. DORA published a follow-up, *ROI of AI-assisted Software Development* (2026.01), whose landing page on cloud.google.com returned no usable content when fetched; its summarized thesis is that returns come from the surrounding system rather than the tools [search summary].

**This is the strongest argument in the document for running the loop at all**, and it is worth stating plainly: DORA's result says the *marginal* output of AI-assisted generation lands on an under-built verification step. A rubric that ratchets is exactly a verification step being built. DORA's result also says the loop will help a practitioner who already has structure and will not rescue one who does not.

### 2.3 Rework and duplication: the shape of what escapes

Two independent lines suggest what actually escapes into artifacts, both [search summary]:

| Signal | Number | Source |
|---|---|---|
| Duplicated code blocks (≥5 lines), 2024 | **8× increase** | [GitClear 2025 report](https://www.gitclear.com/ai_assistant_code_quality_2025_research), 211M lines analyzed |
| Moved lines (a refactoring proxy) | **−39.9%**; 25% of changed lines (2021) → under 10% (2024) → **3.8% YTD 2026** | GitClear [2025](https://www.gitclear.com/ai_assistant_code_quality_2025_research) / [2026](https://www.gitclear.com/the_ai_code_quality_maintainability_gap) |
| Copy/paste share of changed lines | 9.4% (2022) → **15.7%** (H1 2026) | GitClear 2026 |
| Block duplication per million changed lines | 40.3 (2023) → **73.0** (2026 YTD), +81%, "highest level on record" | GitClear 2026 |
| Developers whose top AI frustration is "solutions that are almost right, but not quite" | **66%** | [Stack Overflow 2025 survey](https://survey.stackoverflow.co/2025/ai) |
| Developers who say debugging AI-generated code is more time-consuming | **45%** | same |
| Developers who trust AI output | **29%**, down 11pp YoY; 46% actively distrust; 3% "high trust"; 84% use it anyway | same |

GitClear is a vendor with a product that measures exactly the thing its reports say is deteriorating; read the direction, not the magnitude. But "almost right, but not quite" at 66% is the miss class this whole stream exists to handle, and it is the most-reported frustration in a survey of that size.

### 2.4 The cost-of-late-defects claim you should not lean on

The reflexive justification for catching things earlier is Boehm's 1:10:100 cost-of-change curve. **Do not cite it.** The commonly reproduced "IBM Systems Sciences Institute" table has no published study behind it: the trail runs to Roger Pressman's textbook, which attributes it to internal 1981 course notes, and no dataset has ever been produced — the case is laid out in Laurent Bossavit's *[The Leprechauns of Software Engineering](https://books.google.com/books/about/The_Leprechauns_of_Software_Engineering.html?id=6LcpBgAAQBAJ)* [search summary]. The direction (late fixes cost more) is supported; the multipliers are folklore. **§3 therefore does not use a phase multiplier at all** — it uses only minutes you can time with a stopwatch, which is the point.

**Open questions:** Nobody has run METR's design on *design* work, where the artifact is judged by eye rather than by tests. Whether the perception gap is larger or smaller when the output is visual is unknown and would be a cheap study for a design org with ten designers.

---

## 3. Break-even arithmetic for promoting a miss into a durable check

**What it is:** An explicit model, with every assumption named, for deciding whether a given miss should become a durable check and at which rung.

**Why it matters:** "Add it to the rules file" is free at the moment of decision and expensive in aggregate. A model that anyone can re-run with their own numbers is the only defence against a rubric that grows monotonically because each individual addition looked obviously worthwhile.

### 3.1 The model

For a candidate check, define:

| Symbol | Meaning | Unit |
|---|---|---|
| `B` | one-off build cost — write it, test it, wire it in | human minutes |
| `m` | maintenance | human minutes / month |
| `R` | **recurrence rate of the miss class across your whole portfolio** | occurrences / month |
| `p` | probability the check catches the class when the class is present | 0–1 |
| `D` | human minutes saved per catch — notice + diagnose + the round you avoid | minutes |
| `f` | false-positive load — wrong fires per month × triage minutes each | minutes / month |
| `c` | recurring human cost of *running* the check (0 if automated; verification time if hand-checked) | minutes / month |

Monthly net saving: **`S = R·p·D − m − f − c`**
Payback: **`P = B / S`** months (the check never pays back if `S ≤ 0`)
Break-even recurrences, ignoring `m`, `f`, `c`: **`N = B / (p·D)`**

Two modelling choices deserve to be argued rather than assumed:

- **`R` counts across the portfolio, not within one prototype.** The same class — missing empty state, focus ring lost on the custom control, hard-coded hex — recurs because the *generator* has the habit, not because the artifact does. This single choice is what decides the throwaway-prototype question in §9.
- **`D` is stopwatch minutes, not a phase multiplier** (§2.4). If the miss escapes all the way to an engineer's ticket, `D` is genuinely large — a round trip through someone else's week — and that is why promotion-gate lines have absurdly good economics (Deliverable A, row 6).

### 3.2 Reading the result

The worked rows are in **[Deliverable A](#deliverable-a--break-even-table)**. Three conclusions fall out, and they are not the conclusions the practitioner consensus reaches:

1. **The prose rule wins on naive arithmetic — which is exactly why rubrics bloat.** Break-even at ~1–2 recurrences. Every individual decision to add a line is correct under this model. The model is incomplete; §4 completes it.
2. **A criterion you check by hand is the worst of both worlds.** It has a build cost *and* a recurring cost, and its recurring cost scales with how often you iterate. Base case (verify at session boundaries, ~15 sessions/month): break-even at about **1 recurrence/month**. Pathological case (verify after every round, ~180 rounds/month): break-even at about **10.5 recurrences/month**, which almost nothing reaches. **The largest single economy available in the whole loop is batching verification to session boundaries instead of round boundaries** — worth more than any tool choice.
3. **Visual-regression and LLM-judge criteria are the two things small teams most often over-buy.** Both need `R` above roughly 3–4 occurrences/month before they are net positive at all. This matches the only external corroboration available: test-automation ROI write-ups put typical enterprise break-even at **6–9 months**, falling to **3–4 months** for high-frequency regression on stable targets and rising to **12–18 months** for infrequent runs with high maintenance, with **execution frequency named as the single biggest driver** [search summary — vendor blogs; treat as folklore-grade, but the *direction* is consistent with the model].

**Open questions:** `p` for a prose criterion in a design rubric has no public measurement. Doc 06 owns the instruction-following evidence; §4 turns that gap into a one-afternoon experiment.

---

## 4. The bloat tax: why the cheapest criterion is not free

**What it is:** A model for the cost a prose criterion imposes on *the criteria already in the file*, and the observation that the three rules-of-thumb in circulation are one model at three parameter values.

**Why it matters:** Doc 03 discusses rubric bloat as a writing problem and doc 06 carries the instruction-following-decay evidence. Neither turns it into a number you can put in a break-even table. Without that number, §3's model says "always add the line," which is wrong.

**Key findings:**

### 4.1 The evidence that a criterion costs its neighbours something

| Finding | Number | Source |
|---|---|---|
| Best frontier models at maximum instruction density (500 keyword-inclusion instructions) | **68%** accuracy; distinct threshold / linear / exponential decay patterns by model | IFScale [arXiv 2507.11538](https://arxiv.org/pdf/2507.11538) [search summary] |
| 2026 replication | strongest frontier models near-perfect at N=500, holding accuracy "through N in the thousands" | Arize replication [search summary] — **this materially weakens the density argument for current models** |
| 24 verifier-checked instructions, three production models | follow rate falls from **~96% to as low as 20%**; one "output JSON" constraint jointly unsatisfiable with nine others | Instruction Stacking Collapse [arXiv 2608.02639](https://arxiv.org/abs/2608.02639) [search summary] |
| Instruction files in the wild: 1,867 repos, 247,694 instructions | median file **39 instructions**; instruction counts **+226% on average**; old rules **almost never deleted** | Chakrabarti, summarized in [wonderingaboutai](https://wonderingaboutai.substack.com/p/how-to-stop-your-claudemd-file-from) [search summary — second-hand] |
| 64 popular repos, 84 instruction files, 2,116 statements | evolution "driven mainly by small incremental additions rather than large-scale deletions"; 67.4% of context files edited in multiple commits | Agent READMEs [arXiv 2511.12884](https://arxiv.org/html/2511.12884v1) [search summary] |
| First-party guidance | "Aim to keep CLAUDE.md under 200 lines by including only essentials" | [Claude Code cost docs](https://code.claude.com/docs/en/costs) [**fetched**] |
| Practitioner folk number | "once you write more than 60 rules, Claude quietly starts ignoring them" | second-hand summary of blog posts [search summary — **unverified, no primary source loaded**] |

Note the tension, and do not paper over it: the Arize replication says density stopped being the binding constraint for frontier models, while the stacking-collapse result says *conflicting* constraints still collapse at n=24. **These are consistent if the tax is driven by interaction between criteria, not by count.** A design rubric of independent, positively-stated, artifact-level criteria should sit near the benign end; a rubric full of conditionals, exceptions and near-duplicates sits near the collapse end. That is a claim doc 03's phrasing guidance can act on.

### 4.2 One parameter, three rules of thumb

Model the tax as a per-criterion adherence penalty `k` applied across the file. With `n` prose criteria and baseline adherence `a₀`, let `a(n) = a₀ − k(n−1)` over the operating range. Expected criteria actually honored:

```
E(n) = n · a(n) = n·a₀ − k·n(n−1)
dE/dn = a₀ − k(2n − 1) = 0   →   n* = (a₀/k + 1) / 2
```

At `a₀ = 0.95`, the optimum rubric size is:

| `k` (adherence lost per added criterion, across the file) | `n*` (criteria at which adding one destroys more than it adds) | Matches the rule of thumb |
|---|---|---|
| 0.002 | **≈ 238** | Anthropic's "under 200 lines" [fetched] |
| 0.005 | ≈ 95 | — |
| 0.008 | **≈ 60** | the practitioner "~60 rules" claim [search summary, unverified] |
| 0.020 | **≈ 24** | the instruction-stacking collapse point [search summary] |

**The three numbers everyone quotes are the same model at three values of one parameter.** That reframing is the useful part: stop arguing about whether the cap is 60 or 200 and start measuring `k` for *your* rubric, because `k` is a property of how your criteria are written, not of the model.

Three corollaries:

- A **deterministic check has `k = 0`.** It does not occupy instruction budget at all. This is a bigger argument for the deterministic rung than reliability is, and it is the missing term in §3's row 1.
- `E(n)` is total criteria honored. Past `n*`, the new line still helps *itself* — which is exactly why the person adding it always feels right. The damage is distributed and invisible.
- **A canary criterion makes `k` observable for free.** Add one trivially verifiable, zero-value criterion to the rubric — e.g. "every generated file ends with the comment `<!-- rubric:v7 -->`" — and log whether it fires. When the canary stops firing, the rubric has passed the point where it is being read. This costs one line and one grep, needs no eval harness, and is the only bloat detector in this document a solo practitioner can actually run. *No published source proposes this; it is a construction from the evidence above and is untested.*

**Falsifiable in an afternoon:** generate the same prompt 10× against rubric sizes n = 5, 15, 30, 60 with the canary in each, count honored criteria, fit `k`. Cost at Opus 5 list prices: 40 generations × ~8k output ≈ 320k output tokens ≈ **$8**. Doc 06 owns the harness for it.

---

## 5. Who owns the rubric when the designer is the reviewer

**What it is:** Role definition for a unit of one, the evidence on self-review bias, and a ladder of separations ordered by what they cost.

**Why it matters:** [design-sdlc 00](../design-sdlc/00-synthesis.md)'s third theme is "the thing that produced the artifact does not get to grade it," and [eval-tuning-loops 05 §7](../eval-tuning-loops/05-loop-architecture-and-governance.md) resolves ownership by naming two people — an eval owner and a "quality dictator." **A solo practitioner cannot apply either rule literally.** What they can do is separate *contexts* rather than *people*, and the evidence says that is worth more than it sounds.

**Key findings:**

### 5.1 Four hats, one head

| Hat | Owns | Conflict it creates |
|---|---|---|
| **Generator** | the prompt, the rules file, the exemplars | wants the rubric to be satisfiable |
| **Repairer** | the patch round, the rollback decision | wants to stop iterating |
| **Grader** | the verdict on this artifact against the rubric | is looking at their own work |
| **Rubric owner** | which misses become criteria, and which criteria retire | wrote the criterion that is now judging them |

The dangerous pair is grader × generator. The dangerous *loop* is rubric owner × grader: the person who writes the criterion is the person who decides whether it was met, which means a criterion can be quietly redefined into satisfaction rather than failed. That is criteria drift, documented in EvalGen and already covered in [eval-tuning-loops 05 §6](../eval-tuning-loops/05-loop-architecture-and-governance.md) — not repeated here.

### 5.2 The evidence on judging your own work

| Finding | Number | Source |
|---|---|---|
| **Self-attribution bias in model monitors** — a model evaluating an action framed as *its own* under-reports risk and incorrectness relative to the same action presented fresh in a user turn. In one setting it made the monitor **5× more likely** to approve a code patch that followed a prompt injection. Reviewer severity in self-evaluation showed a **2.8-point mean spread** between strictest and most lenient reviewer, and the bias was mostly an across-the-board reviewer effect rather than agent-specific self-favouring | 5×; 2.8 points | [arXiv 2603.04582](https://arxiv.org/abs/2603.04582), Khullar, Hopkins, Wang, Roger, 4 Mar 2026 [search summary] |
| **IKEA effect** — labor raises valuation of one's own output; participants valued their amateur creations similarly to experts' work and expected others to agree. Effect disappears when the task is not completed | four studies | Norton, Mochon & Ariely, *J. Consumer Psychology* 22(3):453–460, 2012 [search summary] |
| **Blinding changes review outcomes measurably** — single-blind reviewers were **1.76×** more likely to recommend acceptance for famous authors and **1.67×** for top institutions; they also bid on **22% fewer** papers | 1.76× / 1.67× | Tomkins, Zhang & Heavlin, WSDM 2017 / [PNAS 2017](https://www.pnas.org/doi/10.1073/pnas.1707323114) [search summary] |
| **Code review bias is reported by practitioners** — 41.18% of respondents had experienced a biased code review (maintainers 43.14%, contributors 40.11%) | 41.18% | [arXiv 2504.18407](https://arxiv.org/pdf/2504.18407) [search summary] |
| **Observation inflates adherence (Hawthorne)** — hand-hygiene compliance under overt vs covert observation differed by **7–16pp before 2009 and 30–34pp after**; by role, **30pp** (nurses) vs 11pp (physicians); by setting, **41pp** (outpatient) vs 11pp (ICU); event rates ~**3× higher** within eyesight of an auditor | up to 34pp | multiple studies incl. [PubMed 25002555](https://pubmed.ncbi.nlm.nih.gov/25002555/), [PMC6090841](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6090841/) [search summary] |

The self-attribution result is the most directly actionable finding in this document, because of *how* the bias is triggered: the paper's mechanism is that the action "is presented in a previous or in the same assistant turn instead of being presented by the user in a user turn" [search summary]. That is not a property of who the reviewer is; it is a property of **where the artifact sits in the conversation**. Which means the fix is free.

### 5.3 Minimum viable separation — a ladder ordered by cost

| Rung | Separation | Cost | Evidence it helps | When to use |
|---|---|---|---|---|
| 0 | Grade in the same session that built it | — | **this is the failure mode**, not a rung | never |
| 1 | **Context separation** — open a fresh session, paste/point at the artifact only, never the build transcript, and ask for a verdict against the rubric | ~0; one command | self-attribution bias is triggered by same-turn/prior-turn attribution [search summary, 5× effect] | **every prototype** — this is the default |
| 2 | **Time separation** — grade tomorrow, or after a break long enough to lose the build context | a day of latency | IKEA effect is a valuation-of-own-labor effect [search summary]; no direct measurement for delay | anything you will show someone |
| 3 | **Artifact blinding** — grade screenshots or output with the round number, variant name and your own instructions stripped | 5 min of file hygiene | blinding measurably moves review outcomes (1.76×) [search summary] | A/B between generator versions; any time you have a favourite |
| 4 | **Anchor set** — 3–5 frozen past artifacts with known verdicts, re-graded at the start of every grading session, to detect your own drift | ~10 min/week | calibration practice; see [eval-tuning-loops 02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) which owns this | weekly |
| 5 | **Cross-family machine grader** — the judge model is from a different family than the generator | tokens | self-preference bias table in [eval-tuning-loops 01](../eval-tuning-loops/01-grading-generated-prototypes.md); ladder in [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) | when you have a judge at all |
| 6 | **Second pair of eyes, sampled** — one other human on 1-in-10 prototypes, and on **every** promotion candidate | someone else's 15 min | the only rung that breaks the single-observer loop | weekly-to-monthly |

**Rungs 1 and 3 are the whole answer for most solo practitioners.** Rung 1 costs nothing and addresses the only bias in the table with a measured effect size on exactly this task shape. Rung 6 is the only one that requires another person, and it is deliberately placed at a *sampled* rate rather than universal, because a separation you cannot sustain (§6) is worth less than one you can.

### 5.4 What to do about the rubric-owner conflict specifically

Three cheap rules, none of which need a second person:

1. **A criterion must be written before the artifact it will judge.** Criteria authored *after* seeing the output are the criteria-drift case; version-stamp the rubric and note which prototype each criterion was born from.
2. **A criterion's verdict must be recordable without judgement.** If you cannot decide whether it was met in under 10 seconds, it is not a criterion — it is a preference, and it belongs in doc 04's craft guidance, not in a checked rubric.
3. **Never edit a criterion in the same session in which it failed.** Log the failure, close the session, revisit at the weekly review. This is the single procedural rule that converts "the criterion judged me harshly so I softened it" into a decision with a day of distance on it.

**Open questions:** No study measures self-review bias for *design* artifacts by their designer. The IKEA effect and the self-attribution result are the nearest analogues, one from consumer psychology and one from model monitors, and neither is the case at hand.

---

## 6. Cadence a single practitioner can sustain — and what goes first

**What it is:** A schedule with a time budget, plus an evidence-based prediction of which parts will be abandoned and in what order.

**Why it matters:** Every process document ends with a cadence nobody keeps. The literature on procedural adherence in fields where non-compliance kills people is unusually specific about *which* step gets dropped, and it points at exactly the step this loop depends on.

**Key findings:**

### 6.1 What the adherence literature actually measured

| Finding | Number | Source |
|---|---|---|
| Pooled WHO Surgical Safety Checklist compliance across studies | **73%** (95% CI 62–85) | meta-analysis, [BMC Health Serv Res 2025](https://link.springer.com/article/10.1186/s12913-025-12569-0) [search summary] |
| By phase | Sign In **76%**, Time Out **61%**, Sign Out **62%** | same [search summary] |
| One academic centre, by phase | Team Time Out **96–100%**, Team **Sign Out 22%** | [PMC6419440](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6419440/) [search summary] |
| Effect of a targeted educational intervention | **58.4% → 78.1%** | [PMC12385942](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12385942/) [search summary] |
| Airline flight crews: unintentional SOP non-compliance | "slightly more often than **twice per flight**" | LOSA Collaborative / [ICAO Doc 9803](https://losacollaborative.com/wp-content/uploads/2021/02/ICAO-Document-9803-LOSA.pdf) [search summary] |
| Normalization of deviance in aviation, canonical example | "checklists being completed from memory instead of line by line" | [Flight Safety Foundation](https://flightsafety.org/asw-article/normalization-of-deviance/) [search summary] |

**Apply this carefully, not by analogy alone.** Surgery and aviation differ from solo prototyping in every way that matters for motivation: legal mandate, a second crew member, audit, and lethal consequences. What transfers is not the compliance *rate* but the **shape of the decay**: in both fields, adherence is highest at the step that gates starting work and lowest at the step that happens after the work is done, when the pressure that created the checklist has passed. In the WHO data that is Sign Out — 22% in one centre against 96–100% for Time Out in the same theatre, by the same people, minutes apart.

**The patch-and-rubric loop's Sign Out is the promotion of a miss into a criterion.** It happens after the prototype works, when the thing you wanted is done and the miss has already been fixed. It is structurally the step that decays, and it is the step the entire stream depends on. That is a prediction, not an observation, and it is falsifiable: log how many sessions end with a rubric decision versus how many end.

Two design consequences follow directly:

- **Make the Sign Out the cheapest step in the loop, not the most thorough one.** One line appended to a file. Classification, phrasing and rung-selection happen at the weekly review, when you are not mid-task. A step that costs 15 seconds survives; a step that costs 10 minutes at the exact moment you have finished is the 22% step.
- **Anything that must happen should not depend on you remembering.** Aviation's answer to twice-per-flight non-compliance is structural forcing, not exhortation. In this loop that means a stop hook or a session-end prompt — doc 06's territory, and recipe-shaped in the repo's [hooks collection](../../../skill-resources/hooks.md).

### 6.2 The schedule

Full table in **[Deliverable B](#deliverable-b--cadence-table)**. The totals: **≈ 2 hours a week** for a practitioner producing 2–4 prototypes a week, of which about 30 minutes is the weekly review and the rest is 15-second increments spread across sessions. The weekly-review budget is the same order as Husain's "review 10–20 traces weekly" and Kavcic's 1–2 week cross-functional review, both already cited in [eval-tuning-loops 05 §7](../eval-tuning-loops/05-loop-architecture-and-governance.md) — this document does not restate that guidance, it just notes that the small-scale number lands in the same place.

**A design constraint, asserted rather than evidenced:** if the loop costs more than about 5% of prototyping time, it will be abandoned. There is no measurement behind the 5%; it is a budget, stated so it can be argued with.

### 6.3 Predicted drop order under pressure

In order, first to go:

1. **The weekly review.** It is the only block that is not attached to a piece of work. It is also where retirement happens, so its loss is what causes bloat (§4) rather than what causes misses.
2. **The Sign Out** — logging the miss. The WHO Sign Out result is the direct precedent.
3. **Blind grading (rung 3)**, then **context separation (rung 1)**. These feel like ceremony precisely when you are confident, which is when they are most needed.
4. **Never: the deterministic gates**, because they run without you.

**The corollary is the most important scheduling advice in this document: put everything you actually need into the tier that runs without you.** The manual tiers will decay — the measured question is only how fast. Every criterion that survives at the prose or hand-checked rung is a criterion whose future adherence you are guessing at.

**Open questions:** Nobody has measured adherence decay for a personal engineering practice over weeks. The nearest available proxy is the instruction-file growth data (§4.1): rules are added and almost never deleted, which is what a practice with a live Sign In and a dead Sign Out looks like from the outside.

---

## 7. Knowing the loop works

**What it is:** The indicator set for *this* loop, which of them a hand can collect, the ways you will fool yourself, and the minimum honest measurement.

**Why it matters:** [eval-tuning-loops 05 §4](../eval-tuning-loops/05-loop-architecture-and-governance.md) already owns the generator's metric table — first-pass validity, on-system rate, pass^k, judge pass rate, human override rate, cost per accepted screen. Those measure whether the *generator* improved. **None of them tell you whether the rubric is doing anything**, and most require a grade store this practitioner does not have. The indicators below are about the rubric and the human loop, and three of them are integers you can write on a sticky note.

**Key findings:**

### 7.1 The indicator set

| Indicator | Definition | Lead/lag | Hand-collectable? | What it tells you that nothing else does |
|---|---|---|---|---|
| **Misses per prototype at first human test** | count of distinct misses the human finds on first real look | leading | **yes** — one integer | the headline series; everything else explains it |
| **Repeat-offence rate** | share of this week's misses whose class **already has a criterion** | leading | **yes** — one fraction | **the falsification test for the loop.** If a class has a criterion and still recurs, the criterion is not working. This is the single most informative number here |
| **Rounds to acceptance** | repair rounds before the prototype is shown to a human | leading | **yes** — one integer | the cost side; a rising median means the generator or the brief is wrong, not the rubric |
| **Misses per class** | the taxonomy histogram | leading | needs doc 01's taxonomy | where to spend the next hour of check-building |
| **Escape rate to the human test** | misses the automated tier did not catch ÷ total misses | lagging | only with logging | how much of the rubric is actually machine-enforced. General QA benchmarks put "escaped defects" under 10% as excellent and over 40% as a broken process [search summary — vendor KPI pages, folklore-grade; the *concept* is standard, the thresholds are not] |
| **Criterion hit rate** | times a criterion fired ÷ times it could have | leading | no | which criteria are load-bearing |
| **Criterion precision** | fired-and-correct ÷ fired | leading | partially | the false-positive load `f` in §3 |
| **Canary criterion fired?** | binary (§4.2) | leading | **yes** — one grep | whether the rubric is still being read at all |
| **Rubric size and churn** | criteria added / retired / net, per week | leading | **yes** | the ratchet is supposed to turn both ways |
| **Cost per accepted prototype** | tokens + minutes ÷ accepted | lagging | roughly | joins to [eval-tuning-loops 05](../eval-tuning-loops/05-loop-architecture-and-governance.md)'s cost-per-accepted-screen |

**The cheap set is items 1, 2, 3 and the canary: three integers and a grep, per prototype.** Everything else needs the tooling doc 06 covers. A practitioner who collects only the cheap set has a real measurement; a practitioner who waits for the full set has none.

### 7.2 The five ways you will fool yourself

| Trap | How it bites here | Evidence | Counter-move |
|---|---|---|---|
| **Regression to the mean** | You start the rubric the week after a disaster. The next week is better because extreme weeks are partly luck. In healthcare's Hospital Readmissions Reduction Program, improvement at initially below-mean hospitals was attributed primarily to **chance rather than quality change** [search summary, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3538092/)] | selecting on the extreme guarantees an apparent effect | Do not baseline on your worst week. Collect ≥8 pre-period points before changing anything, or accept the confound and **say so in writing** |
| **Under-powered eyeballing** | Three good prototypes feel like a trend | run-chart rules: a **shift is 6+ consecutive points on one side of the median**; you need **≥12, preferably 20+** points before shift rules apply; the 6-point rule signals on random data no more than ~5% of the time for n=12–20 | Perla, Provost & Murray, *BMJ Qual Saf* 2011; simulation study [PLOS ONE 2014](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0113825) [search summary] | Plot a run chart. Freeze the median from the first 12 points. Only call a change on a shift |
| **Changing the generator mid-measurement** | Model swaps and harness updates are frequent and not under your control. Anthropic gives **at least 60 days' notice** before retirement; Sonnet 3.5 was noticed 2025-08-13 and retired 2026-01-05 [search summary]; the bundled skill's local table shows Opus 4.1 retiring 2026-08-05 and Haiku 3 on 2026-04-19 [read locally] | every swap resets the baseline | Stamp model id, harness version and rubric version on every row. **Annotate the chart and restart the median at a swap** |
| **The rubric changing under you** | Criteria drift — grading teaches you what the criteria should have been | EvalGen, covered in [eval-tuning-loops 05 §6](../eval-tuning-loops/05-loop-architecture-and-governance.md) | Freeze the rubric for the measurement window, or version it and re-baseline. §5.4 rule 3 |
| **Hawthorne, on yourself** | Self-reported adherence is not adherence. Overt vs covert observation moved hand-hygiene compliance by up to **34 percentage points** [search summary] | you are never covertly observed, so your adherence is simply unmeasured | Derive adherence from artifacts — commit log, session log, the file's own git history — never from memory |

A sixth, specific to this loop and unsupported by any literature found: **denominator drift.** As you get better at briefing, prototypes get smaller and more scoped, so misses-per-prototype falls with no quality change at all. Record a crude size proxy (screens × states) next to the miss count.

### 7.3 The minimum honest measurement

> **Twelve points and a tally.** A run chart of *misses per prototype at first human test*, one point per prototype, median frozen from the first 12 points, annotated at every model/harness/rubric change; plus a running tally of the **repeat-offence rate** — how many of this week's misses were in classes that already had a criterion.

At 2–4 prototypes a week, twelve points takes **3–6 weeks**. Cost: two integers per prototype and about two minutes a week to plot.

**What it can prove:** that a non-random, sustained change in level occurred in your miss rate, and that it began after a specific annotated change. And separately, via the repeat-offence tally, that specific criteria are or are not preventing their class — which is a *direct* test of the loop's core claim and does not depend on the run chart at all.

**What it cannot prove:** that the rubric caused the shift (you ran no control arm and the generator changed under you); the size of the effect (the series is short and unblinded); that it generalizes to another model, another project or another person. A run chart is a change-detector, not an experiment. **Anyone who tells you their rules file made their prototypes 30% better on this evidence is reporting a feeling**, which §2.1's 39-point perception gap should have cured them of.

**Open questions:** Whether repeat-offence rate correlates with anything a team cares about (promotion rate, time-to-accepted) is unmeasured. It is the one number in this document that is both cheap and, as far as this research found, unpublished anywhere.

---

## 8. Failure modes of the loop itself

**What it is:** The ways this loop rots, each with a detection signal a solo practitioner can actually observe and a corrective move.

**Why it matters:** [eval-tuning-loops 05 §6](../eval-tuning-loops/05-loop-architecture-and-governance.md) covers the failure modes where the *generator* games the *grader* — Goodhart, judge gaming, eval-set overfitting, exemplar staleness, over-automation. **That table is not repeated here.** These are the failure modes where the loop consumes its own owner.

| Failure | Mechanism | Evidence | Detection signal | Corrective move |
|---|---|---|---|---|
| **Rubric bloat past the read threshold** | criteria accrete, nothing retires, adherence degrades across the file | instruction counts **+226%**, old rules "almost never deleted," median file 39 instructions [search summary]; evolution by "small incremental additions" [search summary]; stacking collapse 96%→20% at n=24 for conflicting constraints [search summary]; first-party "under 200 lines" guidance [fetched]. Extends doc 03's bloat discussion with the `k`-model in §4 and doc 06's decay evidence | **the canary criterion stops firing** (§4.2); older criteria' hit rate falls in the weeks after new ones are added; you catch yourself re-explaining a rule that is already in the file | Retire on the §9 rules; demote prose to deterministic (`k = 0`); split into on-demand skills so the always-loaded file stays small — [Claude Code cost docs](https://code.claude.com/docs/en/costs) make this argument first-party [fetched] |
| **Ritual without effect** | the rubric is run, nothing changes; it becomes a thing you do, like completing the checklist from memory | normalization of deviance in aviation [search summary]; Hawthorne gap up to 34pp [search summary] | **no criterion has fired in a month**; no criterion retired in 90 days; repeat-offence rate flat across 12+ points; the weekly review takes under 2 minutes | Kill every criterion that has never fired. Require each surviving criterion to name the prototype and date it was born from — an unattributable criterion is a preference |
| **Over-fitting the loop to one model** | criteria encode a specific model's habits ("always reminds it not to invent a `<Card>` variant"), then the model is retired | ≥60 days' notice is the *whole* warning; Sonnet 3.5 notified 2025-08-13, retired 2026-01-05 [search summary]; the local model table shows two more retirements inside 2026 [read locally] | after a model swap, the anchor set (§5.3 rung 4) produces a very different firing profile; criteria fire at ~0 or ~100% | Write criteria as **properties of the artifact**, never as instructions about the model's habits. Tag any unavoidably model-specific criterion with the model id **and an expiry date** |
| **Criteria that encode last month's bug** | over-specific: names a route, a component, a copy string that no longer exists | the mining data says this is the default trajectory, since deletion is rare [search summary] | criterion has 0 fires in 20 prototypes; its text names an artifact you cannot find | §9 retirement rule 1 and 5, enforced at the weekly review |
| **The loop costs more than the defects it prevents** | hand-checked criteria accumulate, per-round verification grows, `c` in §3 overtakes `R·p·D` | no public measurement exists for design rubrics; §3's model is the only thing available | time-in-loop rising while rounds-to-acceptance is flat; the hand-checked half of the rubric growing faster than the machine-checked half | Track the **ratio of machine-checked to hand-checked criteria** as a first-class number. If it is falling, the loop is becoming a tax |
| **False-positive fatigue** | a check that fires wrongly costs triage every build and trains you to ignore it — including when it is right | the `f` term in §3; the guardrail ladder in [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) treats precision as the gating property | triage minutes per week rising; you have started skipping a specific check's output | Any check whose false fires exceed its true fires in a month is retired or demoted to advisory, no exceptions |
| **Measuring the loop instead of running it** | the scorecard becomes the work | — | the scorecard takes longer than the weekly review it summarizes | The scorecard is capped at 10 minutes (Deliverable C). If it exceeds that twice, cut rows, not time |

**Open questions:** Every detection signal above except the canary requires the practitioner to look. There is no self-detecting failure mode in this list, which is itself a finding: a solo loop has no external observer, so the only robust detectors are the ones a hook can run.

---

## 9. Stopping rules

**What it is:** Explicit conditions for retiring a criterion, shipping a prototype, and declining to run the loop at all for a class of work.

**Why it matters:** §4 shows that a rubric without retirement is a rubric that degrades. §8 shows that every detection signal depends on someone deciding to act. Stopping rules are what turn "I should probably clean this up" into a decision with a trigger. The full list is **[Deliverable D](#deliverable-d--stopping-rules-list)**; the reasoning is here.

### 9.1 Retiring a criterion

The default should be **expiry, not permanence**. The mining data (§4.1) shows the field's revealed preference is the opposite — rules are added and almost never deleted — and §4's model shows what that costs. A criterion earns renewal by firing.

### 9.2 Stopping iteration on a prototype

The governing question is not "is it good" but "is it done being useful." [design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md)'s lifecycle already says this: stage 1 *Exploring* exits when the "question answered or abandoned." The additions here are economic:

- **Rounds-to-acceptance has exceeded your historical p75.** You are in a doom loop; the marginal round is no longer converging. Doc 02 owns what to do instead (roll back and re-brief rather than patch again).
- **The last two rounds have not reduced the miss count.** Two rounds of no movement is the cheapest reliable stopping signal available, and it needs one integer per round.
- **The remaining misses are all in classes marked "not for this prototype's question."** Which requires the classes to be markable — doc 01.

### 9.3 Abandoning the loop for a class of work: the throwaway-prototype argument

The brief asks this to be argued either way. Here is the argument in both directions, and then the resolution, which is arithmetic rather than taste.

**The case for no rubric on disposables.** A genuinely disposable prototype is generated once and discarded within 30 days ([design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md)'s Draft stage). Within that artifact, every miss class occurs at most once, so `R = 1`. §3's cheapest rung breaks even at `N ≈ 1.4` recurrences and every other rung is worse. **Under the model, no check of any kind pays back inside a single disposable prototype.** Carrying a rubric into throwaway work is therefore not merely optional — it is a negative-return activity, and the instinct that it feels virtuous is the IKEA effect (§5.2) applied to process instead of product.

**The case against.** The recurrence is not a property of the artifact. It is a property of the generator's habits, and those are constant across prototypes. If you build three prototypes a month and a class recurs in half of them, `R = 1.5/month`, and a 45-minute deterministic check pays back in about five months (Deliverable A, row 3). The disposable prototype is not the unit; **your practice is the unit**.

**The resolution.** Both are right about different objects, and the distinction is worth stating as a rule:

> **The unit of recurrence is the class × generator, not the prototype.** A disposable prototype should carry **no prototype-specific rubric** — writing criteria for an artifact you will delete is the negative-return case. It should, however, be covered by the **portfolio rubric**, which already exists and costs the disposable nothing marginal. And the floor items — accessibility, no real data, no public link — are not rubric lines at all: they belong to the **promotion gate** ([design-sdlc 03 §10b](../design-sdlc/03-prototype-governance-outside-the-codebase.md)), which a disposable never reaches. This is why Deliverable A row 6 (promotion-gate line) has the best economics in the table and row 2 (hand-checked rubric line) has the worst.

A corollary worth stating plainly, because it contradicts the reflexive answer: **most of the "quality" checklist items people want to apply to prototypes are promotion-gate items that have been misfiled as rubric items.** Moving them is free and it shrinks the rubric, which §4 says improves the criteria that remain.

### 9.4 What "good enough" means

| | **Disposable prototype** (Draft / Exploring) | **Promotion candidate** (Validated → Promoted) |
|---|---|---|
| Bar | The question it exists to answer is answerable from it | [design-sdlc 03 §10b promotion gate](../design-sdlc/03-prototype-governance-outside-the-codebase.md), in full |
| States | only the states the question needs | empty, loading, error, success, edge/long content, responsive |
| Rubric | portfolio rubric only; **no prototype-specific criteria** | full craft rubric (doc 04) |
| Grading separation | rung 1 (fresh context) | rungs 1, 3 and 6 — including a second pair of eyes |
| Data / links | synthetic, internal-only | gate item, signed |
| Accessibility | not a gate at this stage | gate item, signed |
| Misses | acceptable if they do not affect the answer | escape rate is a review item |
| Stop when | question answered, or two rounds with no miss reduction | gate checklist signed by design + eng |

**Open questions:** The claim that disposables should carry no prototype-specific rubric is derived from §3's model, not measured. It is falsifiable: track misses that escaped from a disposable into a *later* prototype of the same flow. If that number is large, the disposable was never disposable and the model was applied to the wrong object.

---

## Cross-cutting themes

1. **Human attention is the scarce resource; tokens are not.** At documented Claude Code rates, a round costs ~$1 of machine and 6–17× that in attention (§1.2). Every recommendation in this document is a way of spending fewer human minutes, and none of them is a way of spending fewer tokens.
2. **A criterion that stays human-checked is a recurring tax; a criterion that becomes machine-checked is a one-off investment.** The ladder in [design-sdlc 04](../design-sdlc/04-small-model-guardrails.md) and the altitude ladder in [eval-tuning-loops 03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) are cost gradients, not just reliability gradients (§1.3, §3).
3. **The rubric has a size optimum and nobody knows where theirs is.** `n* = (a₀/k + 1)/2`; the three rules of thumb in circulation (60, 200, 24) are one model at three values of `k` (§4.2). `k` is measurable for $8.
4. **Separation of concerns at solo scale is separation of *contexts*, not people** — and the one rung that costs nothing (grade in a fresh session, artifact only) is the one with a measured effect size behind it, 5× on approval of a compromised patch (§5.2–5.3).
5. **The step that decays is the step after the work is done.** Surgical Sign Out at 22% against Time Out at 96–100% in the same theatre predicts that promoting a miss into a criterion is what gets dropped. Design that step to cost 15 seconds, and give it a structural trigger (§6.1).
6. **Retirement is the half of the ratchet everyone omits.** Instruction counts grow 226% and deletions are rare in the wild (§4.1). A rubric with no expiry rule has a known trajectory.
7. **Your felt sense is not evidence, and the field has the receipts.** A 39-point gap between believed and measured speed in an RCT (§2.1), and up to 34 points between observed and unobserved compliance (§5.2). Twelve points and a tally is not bureaucracy; it is the minimum defence against both (§7.3).
8. **The honest verdict on whether the loop pays is: conditionally, and the condition is DORA's.** AI adoption correlates positively with throughput and negatively with stability [fetched]; the loop is the missing stability control. It will help a practice that already has structure and will not manufacture one.

---

## Recommendations: the ratchet budget — four numbers and four artifacts

A solo loop is fully specified by four numbers. Write them down, put them in the rubric's header, and revisit them quarterly.

| # | Number | Starting value | How you would change it |
|---|---|---|---|
| 1 | **`n*` — rubric cap**, criteria the generator must hold at once | **40**, with a hard ceiling of 60 prose criteria and no ceiling on deterministic checks (which cost `k = 0`) | measure `k` with the canary experiment (§4.2, ~$8); raise or lower `n*` from `(a₀/k + 1)/2` |
| 2 | **`R_min` — promotion threshold**, recurrences per month before a miss earns a deterministic check | **2/month** (≈ 5-month payback at `B = 45 min`, Deliverable A row 3) | recompute from your own `B` and `D` once you have timed them |
| 3 | **Weekly time box** | **2 hours**, of which 30 min is the review | if it exceeds 5% of prototyping time, cut rows from the scorecard before cutting the review |
| 4 | **Measurement window** | **12 points**, median frozen, restarted at every model/harness/rubric change | 20 points if you can get them; shift rules do not apply below 10 |

And the operating rule that connects them:

> **A miss becomes a prose criterion immediately (15 seconds, at the Sign Out). It becomes a deterministic check when its class recurs `R_min` times. It is retired when it has not fired in 20 prototypes. The rubric never exceeds `n*` prose criteria; when it would, something retires first.**

The four artifacts follow.

---

## Deliverable A — break-even table

**How to read this.** `N` is break-even recurrences ignoring running costs; `P` is payback in months at a stated recurrence rate including them. **Every `B`, `p`, `D` and `f` value below is an assumption, marked as such, chosen to be plausible rather than measured** — the table is a worked example of §3's model, not a finding. Substitute your own and the ranking may change; that is the point of showing the arithmetic. Base case assumes verification batched to **session boundaries (~15 sessions/month)**, not round boundaries.

| # | Durable check | `B` build (min) | `m` maint (min/mo) | `c` run cost (min/mo) | `p` catch prob | `D` saved/catch (min) | `f` false-pos (min/mo) | `N` break-even recurrences | `P` payback at stated `R` | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Prose line in the rules/rubric file** | 5 | 0 | 0 | 0.6 *(assumed; no public measurement for design rubrics — doc 06)* | 6 *(assumed)* | 0 | **1.4** | ~0.4 mo at `R`=3 | Cheapest by far — **and the naive winner that causes bloat.** Its real cost is the `k`-tax on every other criterion (§4), not the 5 minutes |
| 2 | **Hand-checked rubric line** (you eyeball it yourself each session) | 2 | 0 | **5** (20 s × 15 sessions) | 0.95 | 6 | 0 | 0.4 | 0.9 mo at `R`=1 — but `S ≤ 0` below `R`≈0.9/mo | Needs ~1 recurrence/month just to cover its running cost. **In the pathological per-round case (180 rounds/mo, `c`=60) it needs 10.5/month** and almost nothing reaches that. Batch verification to session boundaries |
| 3 | **Deterministic check** — lint rule, assertion, hook | 45 | 2 | 0 | 0.98 | 6 | 1 | **7.7** | **5.1 mo at `R`=2**; 2.2 mo at `R`=4 | The workhorse. `k = 0`, runs without you, survives your worst week. **This is what `R_min` = 2 is calibrated against** |
| 4 | **Visual / golden-screenshot regression** | 120 | 15 | 0 | 0.9 | 10 | 10 | 13.3 | net-negative below `R`≈2.8/mo; **4.1 mo at `R`=6** | Only for a stable surface you regenerate often. Matches test-automation ROI's "execution frequency is the biggest driver" and its 3–4 mo (high-frequency) / 12–18 mo (infrequent) spread [search summary] |
| 5 | **LLM-judge rubric criterion**, run per generation | 25 | 5 | 0 (tokens ≈ $0.01–0.05/run) | 0.7 *(assumed from UI-judge agreement; see [eval-tuning-loops 01](../eval-tuning-loops/01-grading-generated-prototypes.md))* | 6 | 12 (20% FP × 60 runs × 1 min) | 6.0 | net-negative below `R`≈4/mo; 5.3 mo at `R`=6 | Over-bought by small teams. The false-positive term dominates. Needs a validated judge before it is worth anything — [eval-tuning-loops 02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) owns that |
| 6 | **Promotion-gate checklist line** ([design-sdlc 03 §10b](../design-sdlc/03-prototype-governance-outside-the-codebase.md)) | 2 | 0 | 0.5 (15 s × 2 promotions/mo) | 0.9 | **45** *(a miss that reaches an engineer costs a round trip)* | 0 | **0.05** | pays back on the first catch | **The best economics in the table.** Most "quality" items people want in a prototype rubric belong here instead (§9.3) |
| 7 | **Anchor set of 3–5 frozen exemplars** (drift detector, §5.3 rung 4) | 30 | 10 | 0 | n/a — detects *your* drift, not the artifact's | n/a | 0 | n/a | n/a | Not a catch mechanism; it is the only cheap check on the grader. Budget it as fixed overhead, not as a check |

**The shape of the answer:** promotion-gate lines and prose lines are nearly free and should be used liberally *within the size cap*; deterministic checks are the real investment and pay at ~2 recurrences/month; visual regression and LLM judges need high, stable recurrence; and a criterion you check by hand every round is the only row in the table that can be permanently net-negative.

---

## Deliverable B — cadence table

| Cadence | What happens | Which hat (§5.1) | Time | Automatable? | Cost of skipping |
|---|---|---|---|---|---|
| **Per generation** | deterministic gates run — schema/build valid, on-system check, axe, render check | machine | **0 min** | yes — hooks ([skill-resources/hooks.md](../../../skill-resources/hooks.md)) | none; it does not depend on you, which is why it survives |
| **Per repair round** | one line in the round log: round *n*, what was asked, what regressed | repairer | **10 s** | partly (transcript) | you lose rounds-to-acceptance, the cheapest cost metric |
| **Per session — the "Sign Out"** | every miss the human found gets a class label and one of three decisions: *prose criterion now* / *candidate, tally it* / *not a class* | rubric owner | **15 s per miss** | trigger it with a stop hook | **this is the step the checklist literature predicts you will drop** (§6.1). Losing it kills the whole stream's premise |
| **Per prototype, before showing anyone** | grade in a **fresh session, artifact only, no build transcript** (§5.3 rung 1) | grader | **3–5 min** | no | self-attribution bias: 5× on approving a compromised patch [search summary] |
| **Per prototype** | plot one point: misses at first human test; note rounds-to-acceptance | rubric owner | **30 s** | partly | no run chart, no honest measurement (§7.3) |
| **Weekly** | the review: scorecard (Deliverable C); re-grade the anchor set; promote tallied candidates that hit `R_min`; **retire on the §9 rules**; check the canary | rubric owner | **30 min** | no | bloat (§4). This is where retirement lives, and it is the *first* thing dropped under pressure |
| **Weekly, sampled** | second pair of eyes on 1-in-10 prototypes | someone else | **15 min of theirs** | no | the single-observer loop never breaks |
| **Per promotion candidate** | full craft rubric (doc 04) + [promotion gate](../design-sdlc/03-prototype-governance-outside-the-codebase.md) + second pair of eyes, mandatory | designer + eng partner | **45–60 min** | no | this is the gate; skipping it is the thing governance exists to prevent |
| **Per model / harness swap** | re-run the anchor set; annotate and restart the run-chart median; review criteria tagged model-specific | rubric owner | **30–60 min** | no | your measurement silently becomes meaningless (§7.2) |
| **Quarterly** | re-derive the four ratchet-budget numbers; run the canary experiment if `k` is stale | rubric owner | **60 min** | no | the cap and the promotion threshold drift out of date |

**Weekly total at 2–4 prototypes/week: ≈ 2 hours**, of which 30 minutes is the only block not attached to a piece of work — and therefore the block at risk.

---

## Deliverable C — loop-health scorecard (weekly, under ten minutes)

```markdown
LOOP HEALTH — week of __________
rubric v___ · model ___________ · harness ___________ · (changed this week? Y / N)

THROUGHPUT
 1. Prototypes generated: ___     sessions: ___     promotion candidates: ___

THE HEADLINE SERIES  (plot these; median frozen from the first 12 points)
 2. Misses at first human test, per prototype:  ___  ___  ___  ___   median ___
 3. Size proxy (screens × states) per prototype: ___  ___  ___  ___   [denominator drift check]
 4. Rounds to acceptance, per prototype:        ___  ___  ___  ___   median ___
 5. Run chart: point(s) plotted? Y/N
    Shift signal — 6+ consecutive points on one side of the frozen median? Y/N
    If the model / harness / rubric changed this week: annotate the chart and RESTART the median.

THE FALSIFICATION TEST
 6. Of this week's misses, how many were in a class that ALREADY has a criterion?
       ___ of ___   →  repeat-offence rate ____%
    Name each repeat offender and its criterion:
       ______________________  →  criterion: ______________________
       ______________________  →  criterion: ______________________
    Any class repeating twice with a criterion in place: the criterion does not work.
       → demote to deterministic, rewrite, or retire. Pick one. Do not "emphasize" it.

IS THE RUBRIC STILL BEING READ?
 7. Canary criterion fired this week? Y / N
       If N: the rubric has passed its read threshold. STOP ADDING. Start cutting.
 8. Criteria that fired this week: _______________________________________
 9. Criteria with ZERO fires in the last 20 prototypes: __________________
       → retire at this review unless you can name the prototype that justifies keeping it.

THE RATCHET (both directions)
10. Criteria added: ___   retired: ___   net rubric size: ___ prose / ___ deterministic
       Cap is n* = ___ prose criteria.  Over cap? → retire before adding.
11. Machine-checked : hand-checked ratio — this week ___ : ___   (last week ___ : ___)
       Falling? The loop is becoming a tax (§8).
12. Candidates at or over R_min (___ /month) this week → promoted to a deterministic check? ___

SEPARATION
13. Graded in a fresh context (rung 1) for every prototype? Y / N
14. Blind-graded sample (rung 3) done? Y / N
15. Anchor set re-graded, verdicts unchanged? Y / N / drifted on: ___________
16. Second pair of eyes this week? Y / N   on which prototype: ___________

COST
17. Rough token spend this week: $___     hours in the loop: ___
       Loop time as % of prototyping time: ___%   (target: under 5%)

ONE DECISION
18. Decision: ______________________  owner: ______  by: __________
```

Eighteen rows, most of them integers you already have. If it takes longer than ten minutes twice in a row, delete rows 3, 11 and 17 first — they are diagnostics, not the core.

---

## Deliverable D — stopping-rules list

**Retire a criterion when any one of these is true.** No debate required; the trigger is the decision.

1. **Zero fires in the last 20 prototypes.** Renewal is earned by firing, not by being a good idea.
2. **It has never been the reason a patch was made.** A criterion that has never changed an artifact is documentation, not a check — move it to doc 04's craft guidance.
3. **Its class has not recurred in 90 days.**
4. **It has been superseded by a deterministic check for the same class.** Never keep both; the prose copy is pure `k`-tax.
5. **It names a model, tool, route, component or copy string that no longer exists.**
6. **Its false fires exceeded its true fires over a month.** Retire or demote to advisory. No exceptions, no "but when it's right it's important."
7. **The rubric is at its cap `n*` and a new criterion has better expected value.** The cap is real; something leaves.
8. **The canary stopped firing and the rubric needs to shrink by *X*.** Cut in order: rule 1 candidates, then rule 2, then lowest-`R` first.

**Stop iterating on a prototype and ship it when any one of these is true.**

9. **The question it exists to answer is answerable** ([design-sdlc 03](../design-sdlc/03-prototype-governance-outside-the-codebase.md) stage-1 exit). This is the primary rule; the rest are backstops.
10. **Two consecutive rounds have not reduced the miss count.** Roll back and re-brief rather than patch a third time — doc 02.
11. **Rounds-to-acceptance has passed your historical p75.** You are in a doom loop, not an iteration.
12. **The remaining misses are all in classes marked "not relevant to this prototype's question."**
13. **It is a promotion candidate and the [gate](../design-sdlc/03-prototype-governance-outside-the-codebase.md) is signed.** Then stop regardless of how it feels.

**Do not run the loop at all for this class of work when:**

14. **The artifact is genuinely disposable** — generated once, discarded inside the Draft/Exploring window, never regenerated. **No prototype-specific rubric.** The portfolio rubric still applies and costs nothing marginal (§9.3).
15. **The prototype is mostly novel** — if most of it is not expressible as existing patterns, the recurrence rate that justifies checks does not exist. [prototype-construction 05 §7.3](../prototype-construction/05-surgical-editing-iteration.md) makes the same argument for the construction-file system and puts the threshold at 60–70% pattern coverage.
16. **You produce fewer than ~2 prototypes a month.** You will not reach 12 run-chart points inside six months, so you cannot measure anything, and `R` is too low for any check above row 2 to pay back.
17. **The design system underneath is unstable.** You would be re-baselining criteria faster than they fire.
18. **The loop has exceeded 5% of prototyping time for two consecutive weeks** and rounds-to-acceptance has not fallen. Cut the loop to the deterministic tier plus the Sign Out, and nothing else, for a month.

---

## Candidate picks for skill-resources

Deliberately disjoint from the picks already in [eval-tuning-loops 05](../eval-tuning-loops/05-loop-architecture-and-governance.md) and [design-sdlc 03/04](../design-sdlc/03-prototype-governance-outside-the-codebase.md).

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| Claude Code — Manage costs effectively | https://code.claude.com/docs/en/costs | The only first-party per-developer cost figures in the field ($13/active day, $150–250/mo, 90% under $30/day), plus the cache-read explanation of why round *n* costs more than round 1, the 7× agent-team multiplier, and the "keep CLAUDE.md under 200 lines" rule | **fetched OK** | guardrails-and-evals / rules |
| DORA 2025 — State of AI-assisted Software Development | https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report | ~5,000 respondents: AI positively related to throughput, **negatively to delivery stability**; the amplifier framing. The strongest published argument that the verification step is the missing control | **fetched OK** | prototype-governance |
| METR — Early-2025 AI developer productivity RCT **and its 2026 retraction** | https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ · https://metr.org/blog/2026-02-24-uplift-update/ | 16 devs / 246 tasks / +19% completion time, against a believed −20% — **and METR's own statement that the finding is outdated.** Cite the pair, never the first alone | search summary only (domain blocked) | foundational |
| GitClear — AI code quality / maintainability gap | https://www.gitclear.com/the_ai_code_quality_maintainability_gap | Longitudinal duplication and refactoring series (moved code 25% → 3.8%; copy/paste 9.4% → 15.7%). Vendor-measured; use the direction | search summary only | foundational |
| Stack Overflow 2025 Developer Survey — AI section | https://survey.stackoverflow.co/2025/ai | "Almost right, but not quite" at 66% is this stream's miss class, named and sized | search summary only | foundational |
| Self-Attribution Bias: When AI Monitors Go Easy on Themselves | https://arxiv.org/abs/2603.04582 | The mechanism (same-turn / prior-turn attribution) that makes "grade in a fresh context" the cheapest governance move available; 5× effect on approving a compromised patch | search summary only | review-and-feedback |
| Instruction Stacking Collapse | https://arxiv.org/abs/2608.02639 | 24 verifier-checked instructions, follow rate 96% → 20%; identifies *conflicting* constraints rather than count as the driver — the key input to the `k` model | search summary only | rules |
| IFScale — How many instructions can LLMs follow at once? | https://arxiv.org/pdf/2507.11538 | 500-instruction density curve, three decay shapes; pair with the 2026 replication showing frontier models now hold accuracy far higher | search summary only | rules |
| Agent READMEs: An Empirical Study of Context Files for Agentic Coding | https://arxiv.org/html/2511.12884v1 | 64 repos / 2,116 statements: instruction files grow by small additions and are rarely cut — the empirical case for an expiry rule | search summary only | rules |
| Run-chart rules (IHI reference sheet; Perla/Provost/Murray lineage) | https://www.ihi.org/sites/default/files/lms/legacy/education/IHIOpenSchool/Courses/Documents/11_RunChartRulesReferenceSheet.pdf | Shift = 6+ points one side of the median; ≥12 points before the rules apply; ~5% false-signal rate. **The measurement discipline a solo practitioner can actually run** | search summary only | *proposed:* measurement & instrumentation |
| Run Charts Revisited (simulation study) | https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0113825 | The simulation behind the rule choices; what each rule's false-positive rate actually is | search summary only | measurement & instrumentation |
| The Leprechauns of Software Engineering (Bossavit) | https://books.google.com/books/about/The_Leprechauns_of_Software_Engineering.html?id=6LcpBgAAQBAJ | Why the 1:10:100 cost-of-defect curve should not appear in your business case | search summary only | foundational |

---

## Sources

**Fetched in full today (12 September 2026)**

- https://code.claude.com/docs/en/costs — [fetched]
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report — [fetched]

**Read from local disk**

- Bundled `claude-api` skill, model & pricing table (cached 2026-06-24) and `shared/models.md` deprecation table — [read locally]

**Attempted and failed**

- https://cloud.google.com/resources/content/dora-roi-of-ai-assisted-software-development — [fetch returned no usable content]
- https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ · https://metr.org/blog/2026-02-24-uplift-update/ · https://metr.substack.com/p/2026-02-24-uplift-update — [403 at CONNECT; egress policy]
- https://arxiv.org/abs/2507.09089 and all other `arxiv.org` URLs below — [403 at CONNECT]
- https://dora.dev/dora-report-2025/ · https://survey.stackoverflow.co/2025/ai · https://www.gitclear.com/* · `x.com` and all thread-mirror domains — [403 at CONNECT]

**Cost, productivity and delivery evidence** — all [search summary only] unless marked

- https://code.claude.com/docs/en/costs — [fetched]
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report — [fetched]
- https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/ — [search summary]
- https://metr.org/blog/2026-02-24-uplift-update/ — [search summary]
- https://arxiv.org/abs/2507.09089 — [search summary]
- https://www.gitclear.com/ai_assistant_code_quality_2025_research — [search summary]
- https://www.gitclear.com/the_ai_code_quality_maintainability_gap — [search summary]
- https://survey.stackoverflow.co/2025/ai — [search summary]
- https://stackoverflow.co/company/press/archive/stack-overflow-2025-developer-survey/ — [search summary]
- https://books.google.com/books/about/The_Leprechauns_of_Software_Engineering.html?id=6LcpBgAAQBAJ — [search summary]
- https://keploy.io/blog/community/test-automation-roi — [search summary, vendor]
- https://bug0.com/blog/test-automation-roi-board-2026 — [search summary, vendor]

**Rubric bloat and instruction following** — all [search summary only]

- https://arxiv.org/pdf/2507.11538 (IFScale) — [search summary]
- https://arxiv.org/abs/2608.02639 (Instruction Stacking Collapse) — [search summary]
- https://arxiv.org/html/2511.12884v1 (Agent READMEs) — [search summary]
- https://arxiv.org/pdf/2606.12231 (Rule Taxonomy and Evolution in AI IDEs) — [search summary]
- https://arxiv.org/html/2606.09090 (Context Rot in AI-Assisted Software Development) — [search summary]
- https://wonderingaboutai.substack.com/p/how-to-stop-your-claudemd-file-from — [search summary, second-hand summary of the Chakrabarti analysis]
- https://docs.bswen.com/blog/2026-04-23-prevent-claudemd-bloat/ — [search summary; source of the unverified "~60 rules" folk number]

**Self-review, blinding and reviewer bias** — all [search summary only]

- https://arxiv.org/abs/2603.04582 (Self-Attribution Bias) — [search summary]
- https://arxiv.org/abs/2604.22891 (Quantifying and Mitigating Self-Preference Bias of LLM Judges) — [search summary]
- https://www.pnas.org/doi/10.1073/pnas.1707323114 (Tomkins et al., single- vs double-blind) — [search summary]
- https://arxiv.org/abs/1702.00502 (WSDM 2017 companion) — [search summary]
- https://arxiv.org/pdf/2504.18407 (developer perception alignment in code reviews) — [search summary]
- https://arxiv.org/abs/2407.01407 (debiasing code review support) — [search summary]
- https://myscp.onlinelibrary.wiley.com/doi/abs/10.1016/j.jcps.2011.08.002 (IKEA effect) — [search summary]
- https://www.hbs.edu/ris/Publication%20Files/11-091.pdf (IKEA effect working paper) — [search summary]

**Procedural adherence and its decay** — all [search summary only]

- https://link.springer.com/article/10.1186/s12913-025-12569-0 (WHO SSC completeness meta-analysis) — [search summary]
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6419440/ (Swiss academic centre adherence by phase) — [search summary]
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12385942/ (before-and-after intervention, Croatia) — [search summary]
- https://losacollaborative.com/wp-content/uploads/2021/02/ICAO-Document-9803-LOSA.pdf (LOSA / ICAO Doc 9803) — [search summary]
- https://flightsafety.org/asw-article/normalization-of-deviance/ — [search summary]
- https://pubmed.ncbi.nlm.nih.gov/25002555/ (Hawthorne quantified by electronic monitoring) — [search summary]
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6090841/ (overt vs covert hand-hygiene observation) — [search summary]

**Measurement discipline** — all [search summary only]

- https://www.ihi.org/sites/default/files/lms/legacy/education/IHIOpenSchool/Courses/Documents/11_RunChartRulesReferenceSheet.pdf — [search summary]
- https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0113825 (Run Charts Revisited) — [search summary]
- https://publications.aap.org/hospitalpediatrics/article/14/1/e83/196276/A-Practical-Guide-to-QI-Data-Analysis-Run-and — [search summary]
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3538092/ (regression to the mean in composite quality indicators) — [search summary]
- https://www.iwh.on.ca/what-researchers-mean-by/regression-to-mean — [search summary]
- https://kpidepot.com/kpi/defect-escape-rate — [search summary, vendor KPI page; thresholds are folklore-grade]

**Model lifecycle** — [search summary] unless marked

- https://platform.claude.com/docs/en/about-claude/model-deprecations — [search summary]
- Bundled `claude-api` skill `shared/models.md` — [read locally]

**Repo cross-references (read locally)**

- `docs/research/eval-tuning-loops/05-loop-architecture-and-governance.md`, `01-grading-generated-prototypes.md`, `02-reviewing-grades-and-human-calibration.md`, `03-feeding-grades-back-text-level.md`
- `docs/research/design-sdlc/00-synthesis.md`, `03-prototype-governance-outside-the-codebase.md`, `04-small-model-guardrails.md`
- `docs/research/prototype-construction/05-surgical-editing-iteration.md`
