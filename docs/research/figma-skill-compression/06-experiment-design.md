# Q6 — A Falsifiable Experiment Roadmap for Figma Skill Compression

**Question:** Can Figma's 14 official agent skills (211 KB of `SKILL.md`, ~888 KB of references, `figma-use` alone a ~9,000-token mandatory preamble) be compressed without losing capability — and is it worth the engineering effort to find out?

**Governing constraint:** Dev/Full seats get 200 tool calls/day (15/min) on Professional, 600/day (20/min) on Organization; View/Collab on paid plans get 6/month. Reads count against quota; `add_code_connect_map`, `create_new_file`, `whoami` are exempt. Every experiment below is sized against this budget first, model spend second — a design that runs out of quota mid-experiment yields no result at all, while one that runs out of money just yields an expensive one. Ordering is cheapest-first with an explicit kill criterion at every stage, matching [00-architecture-synthesis.md](../../../docs/research/prototype-construction/00-architecture-synthesis.md)'s E0–E7 convention and its "what it unlocks" column.

Two metrics are reported separately throughout and must never be collapsed into one: **(1) static token count at load** (offline, zero quota) and **(2) end-to-end task cost including retries** (live, against quota). A compression that halves (1) while doubling (2) is a regression, not a win — (1) is a context-budget question, (2) is a quota-and-dollars question, and a single "efficiency" composite would hide exactly the failure mode this study exists to catch.

---

## E0 — The kill-shot: does compression even change tool-call behavior?

**Hypothesis:** shortening a `SKILL.md` (denser prose, fewer repeated warnings, one example instead of three) changes only its token count, not the tool calls the model actually emits — because those calls are driven by the *rules* the skill encodes (10-op ceiling, page-reset gotcha, variable rehydration), not by its prose length. If this already breaks on the single cheapest, most deterministic case, there's no reason to spend quota on the other 13 skills.

**Method (zero live calls):** take `figma-create-new-file` (3.9 KB, no references, one hard gate — the smallest skill, whose entire rule set fits in a paragraph) and hand-write one compressed variant at ~50% token count. Replay a **recorded transcript**: splice the compressed text into an existing session log at the point where the original skill produced a correct `create_new_file` call, and ask a model to produce the next tool call given the same preceding context. Diff it against the original call's parameters, n=5 at temperature 0 and n=5 at 0.7.

**Falsification criterion:** more than 1 of 10 completions produces a different call (wrong/missing parameter, or one that would fail validation) on this *easiest possible* case. Failing here means harder skills (`figma-use`, `figma-generate-library`) aren't worth the same method.

**Cost:** 0 Figma calls; ~$0.05–0.15 in model spend; ~1 analyst-hour. **Unlocks:** a negative result stops the programme for pennies — the explicit design goal after the prior week-of-credits incident. A positive result licenses E1 before any live quota is touched.

---

## The roadmap

| # | Experiment | Hypothesis | Method | Metric | Falsification criterion | Est. cost (Figma calls / model spend) | Unlocks |
|---|---|---|---|---|---|---|---|
| **E0** | Transcript replay, cheapest skill | Compression changes tokens, not tool-call behavior | Splice compressed `figma-create-new-file` into a recorded transcript; diff the next call | Call-match rate, 10 completions (temp 0 + 0.7) | >1/10 mismatches on the easiest skill | 0 calls / ~$0.10 | Stop, or proceed to E1 |
| **E1** | Offline diff sweep, all 14 skills | E0 generalizes across size/complexity | Same replay method, 14 skills × 2–3 transcripts each (42 pairs) | Call-match rate per skill vs. size/reference-depth | Any hard-gated skill (`figma-use`, `figma-design-to-code`, `create_new_file`, `generate_diagram`, `create_shader`, `create_generative_plugin`) < 90% match | 0 calls / ~$3–6 (≈420 completions) | Which skills need only prose-shrinking vs. structural rework; feeds E2 |
| **E2** | LLM-judge Q&A equivalence | Compressed skill still answers the questions the original resolves | 5–8 Q&A pairs per skill from original text; judge answers using only compressed text; grade vs. ground truth | % correct from compressed text alone | <95% on any hard-gated skill, or any wrong answer on the doc's named "most expensive failure" (unbound variables, page reset) | 0 calls / ~$5–10 | Cheapest proxy for the §3 silent-failure risk; gates E4 |
| **E3** | Static token accounting | Compression meaningfully cuts load tokens | Tokenize original vs. compressed `SKILL.md` + references, all 14 skills | Static token count — reported alone, never merged with live cost | Savings <20% (not worth the downside risk from E0–E2) | 0 calls / $0 | Go/no-go on whether metric (1) alone justifies live testing |
| **E4** | Read-path live pilot | Compression doesn't change `get_metadata`→`get_design_context` node-selection or trigger re-fetches | 1 seat/file, 5 read tasks × compressed vs. original, same session (§4) | Tool calls to completion (metric 2) | ≥1 extra `get_design_context` call on any task | ~20 calls / ~$2 | Confidence to run full suite in E6 |
| **E5** | Write-path live pilot | Compression doesn't raise 10-op violations, page-reset errors, or unbound-variable writes | 1 seat/file, 5 write tasks (≤10 ops, ≤3 properties) × compressed vs. original | Tool calls incl. retries + `boundVariables` check (§3) | Any unbound-variable write absent in the original run, or any 10-op retry | ~30 calls / ~$3 | Confidence for E6; establishes `boundVariables` as primary gate over axe/screenshot |
| **E6** | Full 10-task suite, 1 rep | Compression holds on the realistic mixed suite | 10 tasks (§2) × 2 variants, 1 rep, spread across 2–3 days | First-pass validity, on-system rate, calls-to-completion, static tokens (from E3, alongside not merged) | On-system rate drops >5 points, or mean calls-to-completion rises >15%, either path | ~80 calls / ~$8–12 | Go/no-go on compression at all; passing opens E7 |
| **E7** | Consistency check (budget-limited, not true pass³) | E6's result isn't a lucky run | Repeat E6's suite, compressed variant only, 2 more days (3 reps total) | Per-task pass rate across 3 reps (flag list, not a compound statistic — see §2) | Any task drops below 2/3 that the original skill historically passed reliably | ~120 calls / ~$10–15 | Final call: ship, ship with caveats, or don't |

**Total live quota across E4–E7 (the only experiments touching the server): ~250 tool calls** — comfortably inside a Professional seat's daily 200 plus a second day's headroom, with slack for retries. E0–E3 cost zero quota and under $20 combined. **Total model spend across the whole roadmap: $30–50** — a two-to-three-day, sub-$50, sub-300-call program if E0 passes, a one-hour $0.10 program if it doesn't.

---

## 2. Task suite design

**Read-path (5), covering `figma-use` orientation guidance + `figma-design-to-code`:**
1. Orient via `get_metadata` on an unfamiliar page, identify the target card, then `get_design_context` on it — tests whether the orient-before-fetch ladder survives compression instead of jumping straight to a full-page fetch.
2. `get_design_context` directly on a named, known small node — the mandatory-gate behavior on the simple case.
3. `get_screenshot` + `get_variable_defs` to validate a token value — tests the "validate, don't substitute" distinction.
4. A 2-frame consistency comparison — pressures the model toward 2 scoped calls vs. 1 oversized one, the token-cost differentiator.
5. A `search_design_system` + `get_libraries` lookup with no `get_design_context` needed — tests whether the "mandatory" gate can still be skipped when irrelevant.

**Write-path (5), covering `figma-use`:**
1. A single-node, ≤3-property edit — cheapest task, establishes the floor.
2. A ≤10-op multi-node create-and-parent on the current page — tests the 10-op ceiling survives compression.
3. A multi-page write requiring `setCurrentPageAsync` re-anchoring — tests the page-reset gotcha; the task most likely to reveal silent regression, since a failure here writes successfully to the *wrong* page rather than erroring.
4. Variable rehydration: read a variable's value in one call, bind a new node to it in a second — tests whether the skill still says rehydrate-by-ID rather than hardcode the resolved hex, the direct trigger for §3's silent-failure mode.
5. A batch `node.set({...})` update vs. sequential assignment — tests whether the batching guidance survives.

**Coverage rationale:** 10 tasks go deep on 2 of 14 skills (`figma-use`, `figma-design-to-code`) rather than shallow across 14, because the efficiency doc already establishes these two carry the hard MCP gates and the highest-stakes gotchas (10-op ceiling, page reset, variable rehydration, the "MUST call `get_design_context`" instruction). A compression method that survives these two skills' hardest tasks is worth extending to the other 12 via E1/E2's offline methods, not more live quota. Skills with no hard gate and shallow reference trees (`figma-swiftui`, `figma-use-motion`, `figma-shaders`) are not worth live-testing at all; E1's offline call-match rate is sufficient evidence for them.

**Repetitions and statistical honesty — the crux.** True pass³ (3 independent trials per task per variant, for a compound success probability with a usable confidence interval) on 10 tasks needs 10 × 2 × 3 × ~4 calls/task ≈ 240 calls *per day of testing*, before retries. That fits one day's Professional-seat quota — but buys only **n=3 per cell**, nowhere near enough to distinguish an 82%-per-trial skill from a 91%-per-trial one (the interval around 3/3 vs 2/3 is enormous). **Recommendation: do not report pass³ as a headline number.** E7 reports raw per-task pass/fail across 3 reps as a *flag list*, not a compound statistic, and the study leans on E0–E2's much-larger-n offline samples (420 completions in E1 alone) for anything needing statistical confidence. The offline proxies are where the power lives; live tests are a spot-check, not the evidence base. A 200-calls/day budget cannot support a live pass^k claim with a usable interval on a 10-task suite without burning 3+ days per compression variant, and each additional variant (compress A, then A+B, then A+B+C...) multiplies that — so test one compression strategy at a time, fully, before trying a second.

---

## 3. The silent-failure problem: catching "looks right, zero bindings"

The efficiency doc names the exact failure mode: an agent that doesn't know a variable handle is out of scope on the next call falls back to copying the *resolved* hex value into a JS constant and painting with it. The result renders identically to a properly bound component. A screenshot diff passes; a VLM judge asked "does this match the design" passes. The regression is invisible to every eval method this study would otherwise reach for, and it is the most expensive thing a compressed skill could do wrong — it fails silently in review and surfaces only when the design token changes and half the file doesn't update.

**A pass/fail eval on visual output cannot catch this by construction.** The Figma Plugin API exposes exactly the signal needed: every node with fills, strokes, corner radii, effects, or layout properties carries an optional `boundVariables` map (confirmed in `figma-use/references/plugin-api-standalone.d.ts`, e.g. `SolidPaint.boundVariables?.color`, `SceneNode.boundVariables?.cornerRadius`, and per-corner variants). A node that "looks right" but was painted with a hardcoded value simply has `boundVariables` undefined or missing the relevant key.

**Concrete deterministic check** (runs after every write-path task, as a `use_figma` call or a plugin script, zero additional read-quota cost since it reads the just-written node the agent already has open):

```js
// binding-audit.js — run once per write task, against the node(s) the task created/edited
function auditBindings(node) {
  const violations = [];
  const styleableProps = ['fills', 'strokes', 'cornerRadius',
    'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
    'itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
    'opacity', 'effects'];

  for (const prop of styleableProps) {
    if (!(prop in node)) continue;
    const value = node[prop];
    const bound = node.boundVariables?.[prop];
    // A styleable prop with a non-default, non-transparent value and NO binding
    // is a candidate hardcode. Fills/strokes need a per-paint check since the
    // array itself isn't bound — each SolidPaint's own .boundVariables.color is.
    if (prop === 'fills' || prop === 'strokes') {
      (value || []).forEach((paint, i) => {
        if (paint.type === 'SOLID' && !paint.boundVariables?.color) {
          violations.push({ node: node.id, name: node.name, prop: `${prop}[${i}].color`, resolvedValue: paint.color });
        }
      });
    } else if (value !== undefined && value !== null && !bound) {
      violations.push({ node: node.id, name: node.name, prop, resolvedValue: value });
    }
  }
  return violations;
}

// Walk only the subtree the task actually touched (never figma.root — see the
// efficiency doc's finding on findAll cost) and report a single boolean +
// itemized list: onSystemRate = 1 - (violations.length / propsChecked).
```

This becomes a sixth deterministic assertion alongside the existing eval-set pattern (`is-json`, on-system import check, `axe-zero`) — call it `binding-audit.js`, scored like the repo's existing `graders/on-system.js`, and it should be the **primary** gate for write-path tasks in E5–E7, ranked above visual/screenshot agreement: a task fails if `binding-audit` finds any violation, even with a pixel-identical screenshot. The check is Figma-quota-free once the node exists (it inspects state already returned by the write call), so it adds nothing to the roadmap's cost column — it rides inside the same `use_figma` call that performs the write, per the skill's own guidance to batch inspection rather than spend a second round trip.

---

## 4. The control problem: isolating compression from noise

Three confounds threaten any A/B result here, and each needs an explicit control:

**Model nondeterminism.** Even at temperature 0, tool-call selection varies run to run on ambiguous tasks. Control: every live comparison (E4–E7) runs **both variants on the same task in the same session**, back to back, with task order randomized per session (compressed-first on odd sessions, original-first on even) to cancel within-session drift. This within-subject design is also the only way to afford a comparison at all — a between-subject design (separate sessions per variant) would double the call cost for the same power.

**Is same-session A/B valid?** Yes, with one caveat: by the second variant's turn the model has already seen the file structure once, so its attempt may benefit from familiarity unrelated to the skill text. Mitigate by alternating which variant goes first across tasks (task 1: compressed then original; task 2: reversed; …) so the "goes second" advantage cancels across the suite, and use two structurally-matched but distinct nodes per task rather than the identical node twice, so the second variant can't recall the first's resolved values from context.

**Prompt caching distorts token accounting.** The second variant tested in a session reads at ~0.1× the token cost of a cold load if its text overlaps the cached prefix — likely, since compressed and original skills share boilerplate. This corrupts any live "tokens consumed" measurement, so **static token count (E3) is measured completely offline from a plain tokenizer, never from a live API usage report**, and live experiments (E4–E7) report cost only in tool calls, never tokens. Force the cache cold between variants where feasible (vary a no-op preamble token) rather than ever quoting a live token number as evidence of savings.

**Ordering effects across days.** The server, rate limiter, and model can drift day to day. E6 spreads its repetition across 2–3 different days and E7's 3 repetitions land on 3 different days, so a same-day anomaly doesn't read as a compression effect. Record date, model version, and server version (via the quota-exempt `whoami`) with every run.

---

## 5. Cheap proxies — maximizing what costs zero Figma quota

This is where most of the roadmap's evidentiary weight should sit, given the hard 200/day ceiling:

- **Static token counts (E3).** Tokenize every skill's `SKILL.md` and eagerly-loaded references, original vs. compressed, with Anthropic's tokenizer. Zero quota, zero spend — the repo's own methodology (`figma-mcp-efficiency.md`'s size table was built this way).
- **Offline diff analysis (E1).** Structural diff of compressed vs. original text against a checklist of the specific gotchas the efficiency doc names (10-op ceiling, page-reset, variable rehydration, asset TTL, `findAll` cost, batch-set guidance) — does the compressed text still state each rule, actionably? Minutes of human or LLM-judge time, before ever touching the replay method.
- **Transcript replay (E0, E1).** Splicing a compressed skill into a recorded session's context and checking whether the next tool call still matches. The highest-value zero-quota method here because it directly measures the thing that matters — tool-call behavior — without spending a tool call.
- **LLM-as-judge Q&A equivalence (E2).** Ask a judge model factual questions the original text answers ("max ops per `use_figma` call?", "does `figma.currentPage` persist between calls?", "what happens to a variable handle across calls?") using only the compressed skill as context, graded against ground truth. Run this *before* E4 as a gate — a compressed skill that fails on the page-reset or variable-rehydration question shouldn't reach live testing, since E5's tasks 3–4 are built to catch exactly that failure at 10×+ the cost.
- **Skill-tree comparison as a free control group.** The corpus already ships a second, independently-authored, smaller `figma-use` (`skills-figquery/figma-use/SKILL.md`, 23.4 KB vs. 34.6 KB — a real compression Figma itself already shipped for a different client). Running E0–E2's methods on this pair costs nothing and validates the methodology itself: if the offline proxies correctly characterize the documented differences between the two trees, that's evidence they'll catch a real regression before any live quota is spent trusting them.

**Bottom line:** every load-bearing claim should be established offline first (E0–E3, E2) for roughly $10–20 and zero Figma quota. Live testing (E4–E7) only confirms the offline signal survives contact with a real server and file, on the two skills carrying the actual hard gates and silent-failure risk — capped at ~250 tool calls and $10–15, comfortably inside one Professional seat's daily allowance with slack for retries. If E0 fails, none of E1–E7 need run.
