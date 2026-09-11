# Figma Skill Compression — Research Stream

**Can Figma's 14 official agent skills be made to use fewer tokens without losing capability?**

Short answer: editing the files is the weakest available lever and the one with the shortest shelf life. Start with the **[synthesis](00-synthesis.md)**.

The compressible mass is real — ~9–10% is structurally movable, and specific prose blocks are genuinely redundant (the largest single one is 10,953 bytes, 33% of `figma-generate-design`). But three things undercut acting on it: upstream ships a new version every **3 days at median** and touches `figma-use` in **80%** of them; the published evidence that compression is safe comes from a benchmark where **using no skill at all passes 86 of 87 tasks**; and the biggest real-world reduction in the corpus turned out not to be prose editing at all, but a **different tool surface absorbing the complexity the prose used to carry**.

Research-only stream. No tool was built and no live Figma calls were spent — by design. What it produces instead is an evidence base, a cost model with both metrics kept separate, and a falsifiable experiment roadmap whose first step costs **$0.10 and one hour** and can kill the whole programme.

## The documents

| # | Document | What's in it |
|---|---|---|
| — | **[00-synthesis.md](00-synthesis.md)** | **Start here.** Both metrics reported separately, five findings, what to actually do, and what would change the answer |
| 01 | [Evidence base](01-evidence-base.md) | SkillReducer read skeptically: the cut/keep taxonomy, and why "+2.8% quality" (d = 0.107, 14% of skills regressed) does not transfer to API-shaped write-heavy skills. The **"example-as-specification"** failure mode |
| 02 | [Token census](02-token-census.md) | Per-skill content classification across nine classes, the largest cuttable block in each file, and the finding that settles what `skills-figquery/` actually proves |
| 03 | [Retry risk](03-retry-risk.md) | 22 failure modes, the never-cut list, and the break-even model — including why silent failures dominate the arithmetic |
| 04 | [Progressive disclosure](04-progressive-disclosure.md) | What moves behind a routing sentence, the resident-vs-fetchable rule and where it breaks, and the over-disclosure balance point |
| 05 | [Maintenance & licensing](05-maintenance-and-licensing.md) | Measured release cadence, per-skill churn, substitution points, and the four-way permissibility split |
| 06 | [Experiment design](06-experiment-design.md) | E0–E7, cheapest-first with kill criteria, and the deterministic `boundVariables` gate for silent failures |
| — | [`scripts/census.py`](scripts/census.py) | Re-derives every tree-level measurement against any skill directory |

## The five findings in one line each

1. **Dedup is dead** — 0.3% cross-file, ~1% SKILL.md↔references. The mass is explanatory prose: only 8% of sentences carry a hard directive.
2. **The evidence doesn't transfer** — unreviewed preprints, a benchmark with a severe ceiling, no Claude executor, and every evaluated skill was text generation rather than stateful canvas work.
3. **The best compression in the corpus wasn't prose editing** — `figma-use` is 33% smaller in the figquery tree because a declarative `$fig` builder deleted whole sections of hand-taught API mechanics. In the same tree, `figma-design-to-code` *grew* 32%.
4. **The artifact decays faster than you can maintain it** — median 3 days between releases; the highest-value targets are the highest-churn files; and the MCP `skill://` delivery path has no local substitution point at all.
5. **Publishing derivatives is the risky quadrant** — no LICENSE upstream; a transform others run locally is defensible, the compressed files themselves are not.

## A correction this stream forced

The companion [figma-mcp-efficiency.md](../../../skill-resources/figma-mcp-efficiency.md) originally advised pointing Claude Code at `skills-figquery/` to get the smaller tree. **That was wrong and has been retracted.** The two trees describe *different execution environments* — figquery states that `figma.create*` methods "do not exist in this environment" and mandates a `$fig` global that the default tree never mentions once. Swapping them is a guaranteed-failure configuration, not a saving. See [doc 02](02-token-census.md) and finding 3 of the [synthesis](00-synthesis.md).

## Related

- [skill-resources/figma-mcp-efficiency.md](../../../skill-resources/figma-mcp-efficiency.md) — the companion cost model: three budgets, the 42-tool surface, verified rate limits
- [skill-resources/guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md) — the eval-harness picks E0–E7 build on
- [skill-resources/eval-loops.md](../../../skill-resources/eval-loops.md) — the grade → review → feed-back loop this would plug into

---

*Corpus: [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) @ `a5e7e04`, plugin v2.2.108. September 2026. Per-skill byte counts are pinned to that commit and should be treated as expired on sight — the classification of what is cuttable is written to outlive the version; the numbers are not.*
