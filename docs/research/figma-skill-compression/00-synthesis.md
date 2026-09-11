# Can Figma's Skills Be Compressed? — Synthesis

**Question.** Figma's 14 official agent skills cost 209,893 bytes of `SKILL.md`, six of them gating specific MCP tool calls. Can they be made to use fewer tokens without losing capability?

**Answer.** Editing the files is the *weakest* of the available levers, and the one with the shortest shelf life. Compressible mass exists — roughly 9–10% is structurally movable and a further tranche of prose is genuinely redundant — but the artifact decays in under two weeks, the evidence that compression is safe does not transfer to this domain, and the largest real reduction observed in the wild was not achieved by editing prose at all. The two moves worth making require no file edits.

This document composes six research documents. Every number is either **measured** (re-derivable with [`scripts/census.py`](scripts/census.py) or cited to a file and byte range) or explicitly labelled **inferred**. Corpus: [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) @ `a5e7e04`, plugin v2.2.108, September 2026.

---

## The two metrics, reported separately

The study's governing rule was that static saving and end-to-end cost must never be collapsed into one number. They answer different questions and they disagree.

### Metric 1 — static saving (what you stop paying at load)

| Lever | Measured saving | Confidence |
|---|---|---|
| Progressive disclosure — move "how to execute" behind a routing sentence ([doc 04](04-progressive-disclosure.md)) | **18–22 KB of 211 KB (~9–10%)** | Movable bytes measured; net saving inferred (routing sentences cost 80–200 B each) |
| Redundant worked examples — e.g. `figma-code-connect` lines 129–328, one of three overlapping demos of the same five property types ([doc 02](02-token-census.md)) | 9,821 B in one skill | Measured span; safety unverified |
| Over-explained rationale — `figma-use-slides` L38–93 (8,763 B, 40% of file); `figma-implement-motion` L44–98 (9,869 B, 42%) | ~18.6 KB across two skills | Measured span; safety unverified |
| Class (h) waste — skills re-deriving a tool's own parameter contract | ~3,500 B corpus-wide | Measured |
| **Dedup** | **~0.3% cross-file; ~1% SKILL.md↔own references** | Measured — **this lever does not exist** |

The single largest block in the corpus is `figma-generate-design` lines 68–264 — **10,953 B, 33% of the file** — three near-identical discovery procedures for components, variables, and styles that could be one parameterised procedure. These ranges overlap; do not sum them.

### Metric 2 — end-to-end cost (what you actually pay)

From [doc 03](03-retry-risk.md), compression pays exactly when:

```
ΔL  >  N × [ Δp_hard·(R + Q)  +  Δp_silent·(1 − p_detect)·D ]
```

For a 25% cut to `figma-use` (ΔL ≈ 2,175 tokens, N = 10 calls, R ≈ 1,200 tokens):

- **Dev/Full seat:** break-even at **~18 points** of added hard-failure probability. A generous margin — most cuts clear it.
- **View/Collab seat (6 calls/month):** one wasted call is 16.7% of the monthly budget. Break-even collapses toward **zero**. No compression is defensible here without measurement. This is the report's strongest claim because it follows from Figma's published quota, not an invented rate.
- **Silent failures dominate.** At Δp_silent = 2%, p_detect = 0.5, D = 20,000 tokens, expected hidden cost is **~2,000 tokens — comparable to the entire saving**, from a probability an order of magnitude smaller than the hard-error case.

**The two metrics disagree, and metric 2 wins.** A component that looks correct with zero variable bindings is not a retry; it is a rebuild discovered at review, weeks later.

---

## Five findings

### 1. Dedup is dead; the mass is explanatory

Measured across the tree: cross-file duplicate paragraphs **0.3%**, `SKILL.md` restating its own references **~2,661 B (~1%)**. Figma factored these well. But of 168,887 bytes of prose, only **8% of sentences carry a hard directive**; 92% is rationale, context, and worked example. That is the surface — and whether it does work is empirical, not editorial.

### 2. The evidence that compression is safe does not transfer

[SkillReducer](https://arxiv.org/abs/2603.29919) is the only substantial prior art, and [doc 01](01-evidence-base.md) finds it much weaker than its abstract suggests:

- The headline "+2.8% quality" is **Cohen's d = 0.107**, averaging over **14.0% of skills that regressed**.
- Its benchmark cannot discriminate: **using no skill at all already passes 86 of 87 SkillsBench tasks.**
- Unreviewed preprint; its validation benchmark is a separate unreviewed preprint from another group.
- The authors flag their own circularity — one gate both tunes and scores the compression.
- **No Claude model was ever the executor** of a compressed skill.
- Every evaluated skill was text generation (PDF, spreadsheets, git commits) scored on textual output. None was stateful, schema-precise, or able to fail silently.

Their named failure mode is the one that matters here: **"example-as-specification"** — examples that implicitly define required behaviour get demoted to on-demand references and the behaviour disappears. Figma's skills are API-shaped and write-heavy, where example tool calls encode exact parameter conventions. This is the exact risk profile, and it is why finding #1's "92% is explanatory" must not be read as "92% is removable."

What does survive is the taxonomy — Core Rule 38.5%, Background 40.7%, Example 12.9%, Template 7.6%, Redundant 0.3% (15,107 items, 90 skills) — though with a silhouette of 0.393, the category boundaries are fuzzy.

### 3. The best compression in the corpus was not prose editing

[Doc 02](02-token-census.md) settles what the `skills-figquery/` tree actually proves, and the answer inverts the obvious reading. `figma-use` is 33% smaller there (34,645 → 23,354 B), but the reduction is mostly **a different tool surface doing work the prose used to do**. The figquery environment exposes a declarative `$fig` plan-builder that auto-flushes, auto-batches, auto-orders property assignment, and auto-imports library components. So the entire "Efficient APIs" section (6,387 B) and all 20 pre-flight checklist items are **deleted outright** rather than trimmed — most were footguns `$fig` no longer permits.

The tells that this is not a compression programme:
- **`figma-design-to-code` grew 32%** in the same tree (a new Gate Protocol).
- `figma-shaders` drops animated-shader guidance — a **capability** cut, not a wording cut.
- `figma-generate-library`'s rewrite converts ask-when-ambiguous into a mandatory per-phase gate — a **behaviour change**. The two trees are not behaviour-equivalent.

Only `figma-generate-library`'s phase-checklist rewrite (98 → 61 lines, 42% of that span, no information lost) is clean evidence that denser notation alone works.

**The lever this reveals is real but it is not yours:** API design absorbs prompt complexity far more effectively than prose editing. That is a lever on Figma, not on a downstream consumer.

**Consequence — and a correction.** The companion [figma-mcp-efficiency.md](../../../skill-resources/figma-mcp-efficiency.md) originally advised pointing Claude Code at `skills-figquery/` to get the smaller tree. **That advice was wrong and has been retracted.** The figquery `figma-use` states: *"Never use `figma.createFrame()`, `figma.createText()` or any `figma.create*` methods. They do not exist in this environment."* The default tree never mentions `$fig` — not once in 209,893 bytes — and teaches exactly the API those sentences forbid. Loading figquery against a standard environment instructs the agent to call a global that isn't there while avoiding the methods that are.

### 4. The artifact decays faster than you can maintain it

[Doc 05](05-maintenance-and-licensing.md), measured live against the GitHub API: **24 version-bump commits over 162 days — mean interval 7.0 days, median 3 days.** No GitHub Releases; versioning happens inside ordinary commits.

And churn concentrates precisely on value:

| Skill | Touched in | Why it matters |
|---|---|---|
| `figma-use` | **80% of syncs** | Mandatory preflight, highest traffic, biggest target |
| `figma-generate-library` | 56% | — |
| `figma-generate-design` | 44% | The most lopsided file; doc 04's top restructuring candidate |

Diffs range from 7 files to near-rewrites of 1,107 lines. **Staleness half-life for a static compressed artifact is under two weeks at median.** Upstream also states plainly that both trees are generated and *"Do not hand-edit either tree."*

There is also a hard structural limit: skills delivered over the MCP `skill://` resource path are served from Figma's remote server and have **no local substitution point at all**. Compression is only possible on the plugin-bundled path, which is clobbered on plugin update.

### 5. Publishing derivatives is the risky quadrant

`figma/mcp-server-guide` ships **no LICENSE**. The Developer Terms grant a purpose-bound licence — *"limited license to access and use the Developer Resources"* — with all rights not expressly granted reserved. The four-way split (not legal advice):

| Action | Risk |
|---|---|
| Privately modifying your own copy | Low — squarely "use" |
| Publishing a **transform** others run locally | Moderate, defensible — Figma's content is never redistributed |
| Publishing the **compressed files** | **Highest** — nothing grants redistribution |
| Publishing research with short excerpts | Low — standard practice |

---

## What to actually do

Ordered by value per unit of risk and effort.

1. **Control which skills load, and when.** Free, zero provenance risk, zero maintenance, unaffected by upstream churn, and it works on every delivery path including the remote resource. The 14 descriptions cost only ~1,800 tokens always-on; the cost is entirely in *triggered* loads. Not loading `figma-use-figjam` (142 KB of references) on a non-FigJam task saves more than any prose edit to it ever will.
2. **Defer the 42 tool schemas** if your client supports it. Larger than every compression lever in this study combined, and it is a client setting.
3. **Report the `$fig` finding upstream as an issue.** The generalisable result — API surface absorbing prompt complexity — is worth more to Figma than to you, and an issue costs nothing. Not a PR: the tree is a generated sync target.
4. **Only then consider file-level compression**, and only via a re-appliable transform re-run at each version bump, never a hand-fork. Start with `figma-generate-design` L68–264 (10,953 B, three procedures that want to be one).

**Do not** hand-fork the tree, and do not publish compressed derivatives.

---

## What would change this answer

[Doc 06](06-experiment-design.md) specifies E0–E7, ordered cheapest-first with kill criteria. The design point that matters: **the entire statistical power sits in the zero-quota offline proxies**, because a 200-call/day budget cannot support a real pass^k confidence interval on 10 tasks.

**E0 is the kill shot — $0.10 and one hour, zero Figma calls.** Take the smallest skill (`figma-create-new-file`, 3.9 KB), hand-compress it ~50%, splice it into a *recorded transcript* at the point the original produced a correct tool call, and ask a model for the next call. Diff the parameters, 10 completions. **Falsifies if more than 1 in 10 mismatches on the easiest possible case.** If compression breaks behaviour on the cheapest skill, it will not survive `figma-use`, and the programme stops for pennies.

E0–E3 are all zero-Figma-quota and total ~$10. Only E4 onward spends quota; the full programme is ~250 live calls and $30–50.

The write-path gate is deterministic, not a VLM judge: audit `boundVariables` on created nodes via the Plugin API. A screenshot cannot see the difference between a bound token and a hardcoded hex that resolves to the same colour — which is the whole problem.

---

## Honest limitations

- **No live runs.** Every end-to-end number is a break-even threshold or a sensitivity range, never a measured failure rate. The probabilities in doc 03 are placeholders sized to show the trade-off's shape.
- **Class percentages are estimated**, from a full manual read, not machine-classified. Structural byte counts are measured.
- **Findings are pinned to `a5e7e04`.** Given a 3-day median release interval, per-skill byte counts should be treated as expired on sight. The *classification* of what is cuttable is written to outlive the version; the numbers are not.
- **The `$fig` environment question is open.** Which clients get which execution environment was not tested — it costs a live write call and a quota unit.
- **One corpus, one vendor.** Whether any of this generalises beyond Figma's 14 skills is out of scope by design.

---

*Six research documents, ~17,000 words, September 2026. Measurements re-derivable via [`scripts/census.py`](scripts/census.py).*
