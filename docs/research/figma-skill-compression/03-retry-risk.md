# Q3 — The Retry-Risk Side of the Ledger

**Evidence status.** The failure-mode catalogue below is **measured** in the sense that every entry is transcribed or paraphrased from skill text that exists at the cited path — real, documented failure modes the authors spent tokens preventing. How *often* each fires in production is not measured; that's **asserted** by the docs' emphasis or **inferred** from the API's shape (e.g., "no error is thrown" follows from the code path, not a log). The cost model in §4 is explicitly **illustrative** — named variables with placeholder magnitudes, not a fit to observed data, since no live runs exist for this study.

## 1. Why retry risk is a separate ledger

Load cost is deterministic: count tokens in the `SKILL.md` + `references/*.md` files a task pulls in. Retry cost is a random variable depending on (a) how often cut content was the thing standing between the agent and a mistake, and (b) how expensive that mistake is. The corpus is unusually explicit about (b): every `use_figma` error carries `safeToRetryWithoutCanvasRead` (`figma-use/SKILL.md` §7, `references/validation-and-recovery.md`) — a binary recovery-cost signal already built into the tool. That's a proxy for exactly what this ledger needs, and it matters for how a future live measurement should be instrumented (§4).

## 2. Failure-mode catalogue

Mined from `figma-use/SKILL.md`, `figma-use/references/gotchas.md` (1,013 lines — richest source), `figma-use/references/validation-and-recovery.md`, `figma-use/references/variable-patterns.md`, `figma-generate-library/references/error-recovery.md` (the 20–100+ call build recovery protocol), and `figma-design-to-code/SKILL.md`.

| # | Failure mode | Manifestation | Recovery cost | Rule length |
|---|---|---|---|---|
| 1 | `figma.notify()` for output | Hard error: "not implemented" | One self-diagnosing retry | Short |
| 2 | Sync `figma.currentPage = page` | Hard error: setter unsupported | One retry | Short |
| 3 | Page context silently resets to page 1 every call | **Silent wrong output** — script runs against the wrong page, returns "nothing found," agent may conclude the file is empty | Undetected-until-review; risk of unnecessary rebuild | Long (SKILL.md §2, ~40 lines + fan-out protocol) |
| 4 | Looping `setCurrentPageAsync` instead of parallel fan-out | No error — silently correct but reloads the file once per page | Wasted latency/tokens; risk of a timeout on large files | Long (~35 lines, explicit "one message, N calls" instruction) |
| 5 | >~10 logical ops in one call | Timeout / hard error, sometimes with a partial mutation already applied | Must inspect what landed before resuming — not a clean retry | Long workflow philosophy; the numeric ceiling is one line |
| 6 | Variable/paint objects don't survive between calls; only `return`ed IDs do — lost handles get replaced with hardcoded hex | **Silent, zero-error.** Pixel-identical to a bound component; zero variable bindings; invisible to screenshot review, only a metadata/audit pass catches it | Undetected until a token change fails to propagate; recovery is re-binding across every affected component | Short rule ("return IDs, keep state outside the file") + long apparatus (state ledger, idempotency, explicit "unresolved bindings audit" checklist item) |
| 7 | `setBoundVariableForPaint`/`ForEffect` return a **new** object; original untouched if discarded | **Silent no-op** — no error, binding never applied | Caught only by checking `boundVariables`, not a screenshot | Short + one example |
| 8 | `fills`/`strokes` mutated in place | **Silent no-op** — read-only array write is swallowed | Same — invisible unless diffed | Short + one example |
| 9 | `HUG`/`FILL` set outside a valid structural context | Hard error, but 4 distinct error strings depending on which rule broke | Multiple blind retries likely without the rule table | Long (table + 4 examples, ~90 lines) |
| 10 | New `TEXT` node left at default autoresize while `FILL` is set | **Silent wrong output** — no error; collapses to a near-zero-width, thousand-px-tall thread; doc calls it "easy to miss until you screenshot" | Targeted per-node fix if caught; ships broken if not | Long (~25 lines) |
| 11 | `resize()` called after setting `HUG`/`AUTO` | **Silent wrong output** — resets both sizing modes to `FIXED`, locking a throwaway size (e.g. 1px), zero error | Same as #10 — invisible without a property check | Long, flagged "especially dangerous" |
| 12 | `combineAsVariants` doesn't auto-arrange | **Silent wrong output** — variants stack at (0,0); set size = one variant's size | Needs a follow-up layout script | Long, full grid-math example |
| 13 | `detachInstance()` implicitly re-IDs its parent | Hard error next call: node ID no longer exists | One retry, if agent knows to re-discover from a stable ancestor | Short + rationale |
| 14 | `findAll`/`figma.root.findAll` full-subtree scans | Fine on small files; timeout/hard error on large ones plus a hidden token tax always | Split into scoped, indexed lookups | Long (two sections) |
| 15 | Sequential `await` instead of `Promise.all` | Same profile as #14 — slow, not wrong, risks the time limit | Same | Long, several examples |
| 16 | Text mutation without font-load recipe | Hard error, largely self-diagnosing from the message | One retry typically; but also covers a non-self-diagnosing edge case (unpreloaded `FONT_FAMILY` variable per mode) | Medium; repeated across 3 skills because it recurs |
| 17 | `addComponentProperty` return value treated as an object | Hard error one level removed (`'0'` → "property not found") | One retry once traced | Short + example |
| 18 | `componentPropertyDefinitions` read from a variant `COMPONENT` | Hard error; optional chaining does not protect against it | One retry | Medium, repeated in 3 files |
| 19 | Icon rebuilt from rotated primitives instead of SVG import | **Silent wrong output** — renders visibly broken, no error | Full re-creation via SVG import; caught only by screenshot | Medium |
| 20 | Figma asset URL embedded directly as `<img src>` in committed code | **Silent, delayed failure** — works at commit time, breaks ~7 days later when the URL expires | Discovered only in production, arbitrarily downstream — worst detection latency in the set | **One sentence** — highest leverage-per-token rule in the corpus |
| 21 | No state ledger / idempotency across a 20–100+ call build that gets interrupted | Silent until resumed: duplicate nodes, or a full restart | **Catastrophic** — doc frames this as "roll back or restart," redoing dozens of prior calls | Very long — the entire 381-line file exists mainly for this |
| 22 | Variable-collection modes exceed plan tier (Free=1, Pro=4, Org=40+) | Hard error on `addMode`; if hit late, requires redesigning the whole collection architecture | Cheap early, expensive late — bimodal | Short rule, bimodal recovery cost |

### The silent-failure category, isolated

Rows 3, 6, 7, 8, 10, 11, 12, 19, 20 share one property: **the call returns success.** No exception, no `safeToRetryWithoutCanvasRead` flag — nothing for the error-recovery branch to catch. The only nets are `get_metadata` and `get_screenshot`, and the corpus itself says neither is cast every time ("Do NOT reach for `get_screenshot` every time — it is expensive"). Rows 6 and 20 are the worst of this set: row 6 passes *both* a casual screenshot and a naive metadata check (node exists, right color) and fails only a targeted "audit every fill for a `boundVariables` entry" pass — a check an eval harness is unlikely to run unless someone thought to build it. Row 20 fails **outside the session entirely**, in production, days later, where no eval will ever see it. These two are the load-bearing evidence for the study's governing principle: a compression trimming either could look completely cost-free in every measurement this study can take.

## 3. Risk-weighted cut list

**Safe to cut:** content restating a rule already stated tersely elsewhere, or guarding a fully self-diagnosing hard error with no silent variant — the redundant examples for rows 1, 2, 17; the `node.query`/`node.set` convenience-API prose (performance sugar, not failure prevention — the verbose form still works); the grid-math derivation for row 12 once the one-line "manually re-layout after `combineAsVariants`" rule is stated (the *fact* layout doesn't happen is load-bearing, the worked arithmetic is not).

**Load-bearing, do not cut absent live measurement:** every short rule guarding a silent or delayed failure — row 20's asset-expiry sentence, row 6's "return IDs, keep state outside the file," rows 7/8's "capture the return value," the `safeToRetryWithoutCanvasRead` protocol itself (cheap to keep, expensive to lose), and the state-ledger/idempotency apparatus behind row 21 (cutting 381 lines to save load tokens is a bad trade if it reopens the possibility of restarting a 100-call build). Also load-bearing: the page-reset rule and fan-out instruction (row 3–4) — wrong-by-default, cheap to trigger, expensive to notice.

**Genuinely uncertain — the honest answer for most of the corpus:** whether extensive WRONG/CORRECT examples (rows 9, 10, 11, 14, 15, 19) lower error rates versus a bare rule plus the runtime's own error text — a model-capability-dependent question this corpus can't settle alone. Whether the `findAll`/`Promise.all` guidance (14–15) prevents real timeouts or only shaves latency depends on the file-size distribution the skill runs against, which isn't in the corpus. Whether repeating the row-18 narrowing rule in three files reduces failures or is redundant spend is likewise unmeasured. Treat all of these as sensitivity ranges, not point estimates, until a live harness exists.

## 4. Cost model

Per skill, per session:

- **`load_tokens` (L):** tokens loading `SKILL.md` + pulled references — directly measurable.
- **`N`:** `use_figma` calls in a session relying on the skill.
- **`p_hard`:** probability a call hard-errors (trips `safeToRetryWithoutCanvasRead`). Cheapest term to eventually measure live — the tool already emits the boolean.
- **`p_silent`:** probability a call *succeeds* but is wrong (§2's silent list). Hard to estimate — requires an audit beyond what the agent would normally run, since these don't self-report.
- **`p_detect`:** probability a silent failure is caught before it ships, rather than after.
- **`retry_tokens` (R):** cost of one hard-error cycle — failed call + (if canvas-read required) a read + the fix.
- **`rebuild_tokens` (D):** cost of recovering from an *undetected* silent failure once finally caught — potentially a whole build phase (row 21), an order of magnitude or more above `R`.
- **`quota_cost` (Q):** the rate-limit dimension. Dev/Full seats: 200 calls/day (Professional) or 600/day (Organization); View/Collab paid seats: 6 calls/**month**. A wasted call costs near-zero tokens directly but has an opportunity cost scaling with proximity to the cap — ~0.5% of a 200/day budget vs. ~16.7% of a 6/month budget.

Expected-cost formula for cutting a skill from `L` to `L − ΔL`, where the cut raises hard-failure probability by `Δp_hard` and silent-failure probability by `Δp_silent`, over an `N`-call session:

```
E[cost] = (L − ΔL) + N·Δp_hard·(R + Q) + N·Δp_silent·(1 − p_detect)·D
```

Compression pays exactly when:

```
ΔL  >  N × [ Δp_hard·(R + Q)  +  Δp_silent·(1 − p_detect)·D ]
```

Isolating the break-even added failure probability — the term the study actually needs, since `ΔL`, `N`, `R`, `Q` are far easier to pin down than any failure rate:

```
Δp_hard*  =  ΔL / [ N × (R + Q) ]        (hard-error-only case)
```

### Worked arithmetic for `figma-use` (~8,700 load tokens) — ILLUSTRATIVE, NOT MEASURED

Take a hypothetical 25% cut: `ΔL ≈ 2,175` tokens. Assume `N = 10` calls per session, `R ≈ 1,200` tokens per hard-error cycle (failed call + canvas read + fix).

- **Dev/Full seat, Q ≈ 0 (quota not binding):** `Δp_hard* = 2,175 / (10 × 1,200) ≈ 0.18`. Compression only stops paying past an ~18-point rise in per-call failure probability — a generous margin, favoring cuts to self-diagnosing content **unless** it sits on a near-every-call path (e.g. the font-load recipe).

- **View/Collab seat (6/month), Q dominates:** one wasted call is ~16.7% of the *entire month's* budget — for a user near the cap it may be effectively unrecoverable this period. Treating `Q` as very large collapses `Δp_hard*` toward 0: essentially no added failure probability is worth the savings for this seat class. This follows directly from the stated quota numbers, not an invented rate — the strongest claim in this report.

- **Silent-failure term:** row 6 with a conservative `Δp_silent = 0.02`, `p_detect = 0.5` (coin-flip whether a screenshot-only review catches a visually-identical unbound component), `D = 20,000` tokens (redoing one build phase, per row 21's scope). Over `N = 10`: `10 × 0.02 × 0.5 × 20,000 = 2,000` tokens of expected hidden cost — already comparable to the full `ΔL` savings, from a failure probability an order of magnitude smaller than the hard-error case. Small `p`, huge `D`, `p_detect` nowhere near 1: the arithmetic argument for weighting silent-failure content well above its line count.

None of the probabilities above are measured; they're placeholders sized to make the trade-off's shape visible. The one non-guessed number here is the rate-limit schedule itself (200/600 per day, 6 per month) — reason enough to report `Q` as its own variable rather than folding it into a generic "retry cost," and to segment any future live measurement by seat type before averaging.
