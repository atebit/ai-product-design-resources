# Pattern Harvesting and Catalog Growth — How the Catalog Discovers, Promotes, Retires and Measures Its Own Patterns

**Scope:** The pattern catalog is the load-bearing asset of construction-file prototyping, and the architecture only pays off when ">60–70% of screens are expressible in the pattern library" ([00 §Verdict](00-architecture-synthesis.md)). This doc answers how that condition is *reached and then maintained*: how new patterns are discovered from usage (frequent-subtree mining, clone detection, escape-hatch telemetry), how candidates are promoted through review into catalog vN+1, how stale patterns are deprecated and pruned, what bounds catalog size, and what a catalog health dashboard measures. It builds on the two-level grammar and the "80% `CustomRow`" signal in [01 §2](01-primitive-codification.md), the escape-hatch equilibrium and ">~1/3 custom share" stop-rule in [05 §7–8](05-surgical-editing-iteration.md), the node-group harvesting precedent in [10 §4](10-visual-programming-node-graphs.md) ("`CustomBlock`-frequency telemetry finds *missing* patterns; fragment mining finds *latent* ones"), and the catalog-side levers in [eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md) — none of which is repeated. Schema versioning and construction-file migration when a promoted pattern changes the schema are in [13 — Schema Evolution and Migration](13-schema-evolution-and-migration.md) and are only referenced here. Out of scope: grading itself ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) and the builder. Verified live 2 September 2026; every sourced claim links its source; anything that could not be fetched is marked.

## Table of Contents

1. [The coverage condition is a measurement problem](#1-the-coverage-condition-is-a-measurement-problem)
2. [Mining recurring structure](#2-mining-recurring-structure)
3. [Escape-hatch telemetry and island clustering](#3-escape-hatch-telemetry-and-island-clustering)
4. [The promotion pipeline](#4-the-promotion-pipeline)
5. [Deprecation, pruning, and the size bound](#5-deprecation-pruning-and-the-size-bound)
6. [The catalog health dashboard](#6-the-catalog-health-dashboard)
7. [LLM-assisted harvesting: library learning as precedent](#7-llm-assisted-harvesting-library-learning-as-precedent)
8. [Recommended harvesting loop](#8-recommended-harvesting-loop)
9. [Tradeoffs](#9-tradeoffs)
10. [Open questions](#10-open-questions)
11. [Recommended experiments](#11-recommended-experiments)
12. [Candidate picks for skill-resources](#12-candidate-picks-for-skill-resources)
13. [Sources](#13-sources)

---

## 1. The coverage condition is a measurement problem

**What it is:** The series states its own kill-criterion three ways: the hybrid pays "if >60–70% of a typical prototype screen is expressible as existing patterns + component instances" ([05 §7.3](05-surgical-editing-iteration.md)); the E2 stress test stops the project "if custom/override share > ~1/3" ([05 §8](05-surgical-editing-iteration.md)); and the escape-hatch stress test targets ">70% of nodes from catalog" ([01 §8](01-primitive-codification.md)). None of those three numbers is the same metric — one is per-screen expressibility, one is node share, one is override share — and none says how the number is *moved*. Doc 00's answer is a direction, not a mechanism: "mine recurring construction-file subtrees for pattern candidates instead of designing the catalog top-down" ([00 §Cross-domain lessons](00-architecture-synthesis.md)).

**Why it matters:** Coverage is not a property of the catalog; it is a property of the catalog *against the stream of briefs it receives*, and that stream drifts. Design-system practice already learned this the hard way: fewer than "16% of teams track metrics" while measurement "correlat[es] with success" (2022 Sparkbox survey, via [Omlet's practitioner roundup](https://omlet.dev/blog/data-driven-design-systems-in-practice/)), and the average internal adoption of a design system is "only 30%" (same source, citing designstrategy.guide). The 2026 zeroheight report finds design-system platforms are used by only "19% of teams for analytics and adoption measurement" ([Design Systems Report 2026](https://report.zeroheight.com/), via search; report body not fetched). The catalog will not stay above 70% by being well designed once; it stays there by a loop that finds the gap, fills it, and retires what stopped earning its context cost.

**Key findings:**

- The three repo metrics should be made explicit and separately tracked (§6): **screen coverage** (fraction of screens with zero islands), **node coverage** (catalog nodes ÷ all nodes), and **island rate** (islands per screen). Doc 05's "~1/3" rule is node-share; doc 00's "60–70%" is screen-share; they can disagree on the same corpus (one big island on every screen gives high node coverage and zero screen coverage).
- Coverage numbers from production design systems are lower than the repo's threshold and rise slowly: Mews defines adoption as `designSystemElements.length / totalElements.length * 100` measured on the live DOM and reports "53% (steady 0.5% monthly increase)" on its complex product and "60%" on its guest app ([Mews Developers](https://developers.mews.com/design-system-adoption-metric-building/)). Prototypes generated against a closed catalog should sit far above that because the generator is *constrained* to the catalog — which is exactly why the residual (islands) is such a clean signal.

---

## 2. Mining recurring structure

**What it is:** Finding *latent* patterns — subtrees that recur across construction files with varying leaf values but the same shape — and *near-duplicate* islands — `CustomBlock` bodies that are clones of one another. The construction file is a labelled, ordered tree with id-keyed children ([05 §2](05-surgical-editing-iteration.md)), which puts it squarely in the input class of a thirty-year-old algorithm family.

**Why it matters:** Doc 10 already observed the node-graph precedent ("select a working composition, collapse it, promote a chosen subset of internal parameters") and flagged that "repeated-subtree detection is easy; choosing *which parameters to promote* is the design act" ([10 §4, §10](10-visual-programming-node-graphs.md)). This section establishes that the "easy" half is genuinely off-the-shelf, and that the UI research community and the design-system tooling market have both built the adjacent pieces.

**Key findings:**

| Technique | What it finds | Off-the-shelf status | Fit for construction files |
|---|---|---|---|
| **Frequent subtree mining** (FREQT, TreeMiner, SLEUTH, CMTreeMiner) | "all patterns in a given database whose support is over a given threshold," where support counts distinct trees containing the subtree ([Wikipedia](https://en.wikipedia.org/wiki/Frequent_subtree_mining)) | Zaki's TreeMiner (2002) uses depth-first string encoding with "-1" return markers and scope-lists; FREQT is the "rightmost path expansion" lineage; SLEUTH mines "frequent, unordered, embedded subtrees" ([survey via search](https://www.researchgate.net/publication/220031813_Frequent_tree_pattern_mining_A_survey); [subgraph survey](https://cgi.csc.liv.ac.uk/~frans/PostScriptFiles/ker-jct-6-May-11.pdf)) | Very good. Two choices matter: **induced** subtrees (parent–child preserved) are what a pattern is; **embedded** subtrees (ancestor–descendant only) over-generate. **Ordered** mining matches slot order; use unordered only for slots declared order-free. The construction file's closed `type` enum makes labels clean, and doc 10's "trees not DAGs" decision means the general "NP-complete" subgraph case never arises. |
| **Code-clone detection** (SourcererCC, NiCad, Deckard) | Type-1/2/3 clones — exact, renamed, and "near-miss" fragments with statements added/removed | SourcererCC is a "token-based clone detector" using "an optimized inverted-index," scaled to "250MLOC" on a workstation ([arXiv 1512.06448](https://arxiv.org/abs/1512.06448)); NiCad and SourcererCC both default to minimum 6 lines and "70% similarity," NiCad as a "dissimilarity threshold of 0.3" ([cross-language reuse study](https://link.springer.com/article/10.1007/s44443-025-00362-2), via search); Deckard "computes characteristic vectors" of AST subtrees and groups them with locality-sensitive hashing ([Gitor, arXiv 2311.08778](https://arxiv.org/pdf/2311.08778), via search) | Good for the *island* corpus (TSX bodies of `CustomBlock`s), where structure varies too much for exact subtree mining. Deckard's vector+LSH idea is the bridge to the embedding approach in §3. |
| **UI dataset mining** (Rico, ENRICO, Screen2Vec) | Layout/topic clusters over view hierarchies | Rico: "9.3k Android apps spanning 27 categories," "66k unique UI screens," "3M UI elements," with a "64-dimensional" autoencoder layout embedding for "example-based search" ([interactionmining.org/rico](http://interactionmining.org/rico)). ENRICO: "1460 UIs and 20 design topics," a screenshot classifier at "75% (a random classifier achieves 5%)" and "95% AUC" ([ENRICO](https://userinterfaces.aalto.fi/enrico/)). Screen2Vec combines a 768-d component embedding, a "64-dimensional layout embedding," and app-description text ([arXiv 2101.11103](https://arxiv.org/abs/2101.11103)). A 2025–26 paper mines "design topics" from "66,261 RICO screens" with "MiniBatch K-Means clustering (K=20)" ([ResearchGate](https://www.researchgate.net/publication/401214634_AI-Driven_Mobile_UI_Pattern_Recognition_and_Design_Topic_Mining_on_RICO_Semantic_Clustering_and_Screenshot-Based_Topic_Classification), search result only; not fetched) | Establishes that screen-level pattern discovery from hierarchies works at scale, but its granularity is *topic* (login, settings, list) — coarser than a slot-bearing pattern. Useful as a prior for the screen-archetype layer of the catalog ([01 §2.1](01-primitive-codification.md)), not for slot design. |
| **Figma library analytics** | Insertions and detachments per component | A component is "inserted" when someone "Drags a component from the Assets panel," swaps an instance, or "Adds content to a slot within an instance"; a detach is logged "any time someone uses the Detach instance setting"; windows of 30/60/90 days or a rolling year; Organization and Enterprise only, REST API "Enterprise plan only" ([Figma help](https://help.figma.com/hc/en-us/articles/360039238353-View-library-analytics)) | The closest commercial analogue of escape-hatch telemetry. Google Material's button "showed unusually high detachment rates relative to usage," revealing "the master component was overly complex" ([Figma, 2019](https://www.figma.com/blog/introducing-design-system-analytics/)); athenahealth's "If someone in our organization is detaching a component, I want to know why," at "approximately 100,000 component insertions per month" ([Figma, Design Systems 104](https://www.figma.com/blog/design-systems-104-making-metrics-matter/)). The limit is also instructive: a February 2026 request notes "There is no way to capture the *qualitative reason* behind a detachment" and asks for a native "why?" prompt ([Figma forum](https://forum.figma.com/suggest-a-feature-11/trigger-plugin-widget-hooks-on-component-instance-detach-51297), 0 replies). A Figma "suggested components"/"Autocomponent" feature could **not be verified**; what exists is AI asset search that maps "error state" to components tagged "alert," "warning," "validation-error" ([Precision AI Academy roundup](https://precisionaiacademy.com/blog/figma-ai-features-2026), secondary). |
| **Code-side adoption tooling** | Component and prop usage in repos | **react-scanner** (657 stars) extracts instances, props, import source, and file:line, with `count-components`, `count-components-and-props`, and `raw-report` processors ([GitHub](https://github.com/moroshko/react-scanner)); Productboard runs it daily from GitLab into Looker, tracking "instances of deprecated components" and "usage of props" ([Productboard](https://www.productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard/)). **Omlet** (by the Zeplin team) is live and, per its blog index, "going open source — all of it, under an MIT license" (28 April 2026 post; index fetched, post URL not resolved); it reports "Prop utilization data to surface unused properties," "Similar component detection," and "Component deprecation impact" ([omlet.dev](https://omlet.dev/)). **zeroheight** sells "Package adoption," "Token usage… where raw values are sneaking in," and search analytics: "Every failed search is a gap in your system worth closing" ([zeroheight measurement](https://zeroheight.com/measurement/)). **Storybook telemetry** collects only aggregates ("Story count," view layer, builder), no per-story usage ([Storybook docs](https://storybook.js.org/docs/configure/telemetry)); Chromatic offers no component-usage analytics (search only). | Omlet's "similar component detection" and zeroheight's failed-search metric are the two ideas to copy directly: near-duplicate detection across islands, and *catalog queries that returned nothing* as a gap signal when the catalog is served by retrieval ([02](02-intent-spec-and-context.md)). |

The sharpest critique of naive adoption counting comes from Murphy Trueman: "The design system is being used. But is it being reused? That's the distinction I think we're missing." His proposed metrics are ours in different clothes — prop-shape variation ("a long tail of one-off configurations"), wrapper count, and structural similarity ("Code that looks like a component in the design system, but doesn't import from it") — and he notes the AI-specific acceleration: "When AI writes the code, the cost of getting there drops considerably" ([Every fork looks like adoption](https://blog.murphytrueman.com/every-fork-looks-like-adoption/)). In construction-file terms: a pattern whose slot infill keeps re-deriving the same sub-structure is a *fork inside the catalog*, and frequent-subtree mining inside slots is how it is caught.

**Open questions:** Minimum support for subtree mining is a policy choice; §8 proposes one. Whether ordered-induced mining over slot contents produces candidates a designer would recognise as patterns, rather than accidental co-occurrence, is untested on real construction files.

---

## 3. Escape-hatch telemetry and island clustering

**What it is:** Instrumenting every `CustomBlock` (and every slot-level override) so that islands can be grouped into pattern candidates, and clustering those islands by what they render rather than by how they are coded.

**Why it matters:** Doc 01 made island frequency the catalog's health metric and doc 03 of the eval stream made the cluster the unit of promotion: "Cluster escape-hatch islands by what they render; when a cluster recurs across briefs, promote it to a pattern with a typed contract and demote the islands" ([eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md)). What was not specified is the record and the clustering method. The Figma detach story shows the failure of counting without context (the missing "why"); Uber's flag-cleanup tooling shows what a telemetry-driven weekly pipeline looks like when it works.

**Key findings:**

- **What to log per island.** The record that makes an island clusterable and promotable: (1) `nodePath` — the JSON-Pointer path and the parent pattern + slot it sits in (a stepper inside `SettingsSection.rows` is a different candidate from one inside `WizardShell.body`); (2) `intent` — the brief sentence or `intent.yaml` field that produced it; (3) `structure` — a normalised skeleton of the island's body (element tree with text/values stripped, in the style of NiCad's "blind identifier normalization"); (4) `structureHash` and a `tokensUsed` list; (5) `catalogVersion` and `builderVersion`; (6) `reason` — a one-line model-authored justification captured *at generation time* ("no catalog pattern for multi-step progress"), which is the qualitative field Figma users are asking for and cannot get; (7) the grade id from the eval loop so island quality can be joined later ([eval-tuning-loops/01 §The grade record](../eval-tuning-loops/01-grading-generated-prototypes.md)). Overrides get the same record minus body, plus the overridden prop path.
- **Two clustering routes, and the summarise-then-cluster one is better precedented.** Route A embeds the normalised body with a code-embedding model and clusters with a density method — the same "embed code templates… and perform clustering in the embedding space with density-based methods (DBSCAN)" approach used for cross-style template discovery ([functional-consistency benchmark](https://www.sciencedirect.com/science/article/abs/pii/S0957417425031380), via search). Route B is Anthropic's Clio pipeline: extract "facets" per item with a model, cluster, then have the model give each cluster "a descriptive title and summary," and organise clusters "into a multi-level hierarchy," with "a minimum threshold for the number of unique users or conversations" before a cluster is surfaced ([Clio](https://www.anthropic.com/research/clio)). Route B fits islands better because two islands that render the same *thing* (a stepper) can have very different code, and the model-written facet ("horizontal multi-step progress with current-step emphasis") is exactly the text the promotion proposal needs. Use Route A as a cheap pre-filter and Route B as the grouping that humans see.
- **The tool-side precedent is feature-flag debt.** Uber's Piranha treats flags "unmodified in the flag management system for more than a specific period (e.g., 8 weeks) as stale," runs "periodically (in our case, weekly)," generates a diff "in less than 3 minutes," assigns it to the flag's author, and nags via "PiranhaTidy"; it has removed "around two thousand stale feature flags and their related code" ([Uber Engineering](https://www.uber.com/blog/piranha/)). The published deployment paper reports diffs for "1381 flags (17% of total flags), with 65% of diffs landing without changes" and "over 85% compiling and passing tests" ([IEEE, via search](https://ieeexplore.ieee.org/document/9276556/); not fetched). The transferable shape is: a *staleness heuristic + weekly automated proposal + owner assignment + reminder bot*, applied both to islands (promote) and to patterns (retire, §5).
- **Long-tail analysis of usage is where the promotion budget comes from.** GitHub's design-system team "tracked how often developers bypass components for flexibility," and other teams count "the number of times linting rules suggesting Design System usage were overridden" ([Omlet roundup](https://omlet.dev/blog/data-driven-design-systems-in-practice/)). The oft-repeated "roughly 60% of design system components see regular usage, while the remaining 40% experience minimal adoption" is attributed only to "Industry surveys" with no citation ([The component adoption gap](https://blog.murphytrueman.com/p/the-component-adoption-gap-understanding)) — treat it as folklore, not evidence, and measure your own distribution (§6).

**Open questions:** Whether the generation-time `reason` field is honest or post-hoc rationalisation is unmeasured; it should be compared against reviewer-assigned reasons on a sample. Clustering thresholds (DBSCAN ε, minimum cluster size) have no UI-specific prior.

---

## 4. The promotion pipeline

**What it is:** The path from a mined candidate to a shipped pattern: candidate → proposal (name, slots, exemplar, doc draft) → review → A/B against the current catalog → merge as catalog vN+1 with a version bump and, when the schema changes shape, a migration ([13](13-schema-evolution-and-migration.md)).

**Why it matters:** Design-system teams have run this pipeline for a decade for human contributions; the harvesting loop only changes who files the proposal. Their governance also settles a question the repo has not: patterns and components are governed differently, and a *pattern* proposal is judged on user goal, not API.

**Key findings:**

- **The contribution definition.** Nathan Curtis: a contribution is "any proposal, design, code, documentation, or design asset of a new feature, enhancement, or fix completed by someone not on the system core team and released through the system for other people to reuse," and a thriving system "must model and foster a federated community" ([Defining Design System Contributions](https://medium.com/eightshapes-llc/defining-design-system-contributions-eb48e00e8898); [Contributions to Design Systems](https://medium.com/eightshapes-llc/contributions-to-design-systems-89261a9363d8) — both returned 403; quoted via search results; eightshapes.com mirror failed DNS). His criteria piece ("I made this. Does it go in the system?") is the right template for the review checklist but could not be fetched ([Medium](https://medium.com/eightshapes-llc/i-made-this-does-it-go-in-the-system-3b67b9894531), 403). A harvested candidate is a contribution *by the corpus*: the "contributor" is N briefs that independently needed the same thing, which is a stronger reuse signal than any single team's request.
- **Patterns are proposed as goals, with mockups, in an issue.** Carbon's pattern contribution starts with a GitHub issue that must "Define your pattern and explain the rationale," "Include mockups and/or prototypes of any fidelity," and say whether it uses "existing components, new components, or both"; patterns are "best practice solutions for how a user achieves a goal" showing "reusable combinations of components and templates" ([Carbon v10 contributing](https://v10.carbondesignsystem.com/contributing/pattern/)). Community patterns "are not supported by the core Carbon team" until approved by "the Carbon governance board" ([Carbon community patterns](https://carbondesignsystem.com/community/patterns/), via search). Substantial API changes go through RFCs with a "final comment period lasting 3 calendar days," after which a merged RFC becomes "active" — acceptance meaning "the core team has agreed to it in principle," not a delivery commitment ([carbon-design-system/rfcs](https://github.com/carbon-design-system/rfcs)). Atlassian's contribution page returned empty content (**not verified**).
- **Lifecycle statuses are the promotion ladder.** Primer uses **Experimental** ("proof-of-concept or work in progress"), **Ready** ("significantly mature and usage is strongly encouraged, with long-term support expected"; breaking changes bump a major version with "a migration path"), and **Deprecated** ([Primer component lifecycle](https://primer.style/contribute/component-lifecycle/); [status](https://primer.style/guides/status/)). A harvested pattern should enter the catalog as *experimental* — visible to the generator but flagged in its description so the model prefers stable patterns when both fit, and excluded from the coverage denominator until promoted.
- **A/B the pattern before promotion, on the corpus that motivated it.** The eval stream already prescribes the mechanism: skill-creator snapshots the old version as baseline and runs "blind" comparators that "judge outputs without knowing which is which" ([eval-tuning-loops/03 §6](../eval-tuning-loops/03-feeding-grades-back-text-level.md)). For a pattern the test is concrete: re-run the briefs whose islands formed the cluster, plus a frozen held-out slice, with catalog vN vs vN+1; accept if first-pass schema validity is unchanged, the island rate on the motivating slice falls, on-system rate does not fall elsewhere, and blind quality judgement is no worse. Worked example B in that doc is the target shape: island rate "31% vs 9% baseline" on the onboarding slice dropping to "4%" after a `Stepper` pattern shipped as minor version 2.7.0, with "no migration script" because the change was additive ([eval-tuning-loops/03 §7](../eval-tuning-loops/03-feeding-grades-back-text-level.md)).
- **What ships with the pattern.** Per [01 §2.2](01-primitive-codification.md): props with enums and defaults, slots with allowed children and cardinality, constraints, a "use when / never use for" description, one canonical example and one anti-example. Two harvesting-specific additions: the cluster's *variance analysis* decides which values become props (doc 10's "design act," now grounded in data — a value that varied across ≥ N instances is a prop; one that never varied is baked in), and the exemplar is a *construction file* re-adopted from the best-graded island, so it re-renders on every catalog change ([eval-tuning-loops/03 §2](../eval-tuning-loops/03-feeding-grades-back-text-level.md)).

**Open questions:** Whether a machine-filed proposal gets the same review scrutiny as a human one, or is rubber-stamped because the numbers look good. Who "owns" a harvested pattern — Google's deprecation chapter (§5) says unowned things rot.

---

## 5. Deprecation, pruning, and the size bound

**What it is:** Retiring patterns that usage no longer justifies, and keeping the *in-context* catalog under the size at which the model's selection degrades. This is the half of catalog health that design-system practice under-invests in and that LLM tool-use research now quantifies.

**Why it matters:** The catalog is served to the model as an enum plus descriptions; every pattern is, functionally, a tool. Tool-selection research gives hard numbers on what happens as the tool list grows, and those numbers bound catalog growth more tightly than any design argument.

**Key findings:**

| Source | Finding | Number |
|---|---|---|
| Anthropic tool-search docs | Accuracy "degrades once you exceed 30–50 available tools"; a typical multi-server setup consumes "~55k tokens in definitions"; tool search reduces this "by over 85 percent, loading only the 3–5 tools Claude needs"; recommended when "10 or more tools" or definitions ">10k tokens"; search returns "up to 5 by default" ([Tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)) | 30–50 tools; 3–5 loaded; 5 per search |
| Anthropic engineering | "Opus 4 improved from 49% to 74%, and Opus 4.5 improved from 79.5% to 88.1% with Tool Search Tool enabled"; context "from approximately 77K tokens to 8.7K" ([Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)) | +25 pts / +8.6 pts |
| RAG-MCP | Retrieval "more than triples tool selection accuracy (43.13% vs 13.62% baseline)" and "cuts prompt tokens (e.g., by over 50%)" ([arXiv 2505.03275](https://arxiv.org/abs/2505.03275)) | 13.62% → 43.13% |
| MCP-Zero | Hierarchical routing over "308 MCP servers and 2,797 tools"; "98% reduction in token consumption on APIBank while maintaining high accuracy" ([arXiv 2506.01056](https://arxiv.org/abs/2506.01056)) | 2,797 tools; −98% tokens |
| Chance-corrected depth | Adaptive depth reached "90.3±2.4% coverage at K=7.4±2.5" vs fixed K=50's 90.8% on BFCL (370 tools); with Claude Sonnet 4.6, "93.1% tool selection accuracy" adaptive vs 87.1% at fixed K=5, widening to "76.8% vs 60.9%" on medium queries ([arXiv 2605.24660](https://arxiv.org/html/2605.24660v1)) | ~7 candidates ≈ 50 |
| 99% Success Paradox | Selectivity "collapses when the expected coverage ratio exceeds 3-5"; systems at ">99% success at K=100" show "random-level selectivity at that depth" ([arXiv 2605.18857](https://arxiv.org/abs/2605.18857)) | present ≤ 3–5× the relevant set |
| BiasBusters (ICLR 2026) | Models are "either fixating on a single provider or disproportionately favoring tools that appear earlier in the context"; "Semantic alignment between user queries and tool metadata is the strongest driver of selection"; fix is "filters tools to a relevant subset and then samples uniformly" ([arXiv 2510.00307](https://arxiv.org/abs/2510.00307)) | position + description bias |
| Looking Is Not Picking | On 198 real failures "the gold tool is the most-attended segment on 80% of failures (vs. 21% chance)" — the model *sees* the right tool and still mis-selects ([arXiv 2606.16364](https://arxiv.org/html/2606.16364)) | readout, not attention |
| Secondary summaries | "~50 tools… 84-95% accuracy; ~200 tools… 41-83%; ~740 tools… 0-20%" and middle-position accuracy "22-52%" at 741 tools ([vLLM Semantic Router blog](https://vllm-sr.ai/blog/semantic-tool-selection/); [MLM guide](https://machinelearningmastery.com/the-complete-guide-to-tool-selection-in-ai-agents/)) — **primary paper not located**; the blog "does not cite the specific source" | treat as indicative only |

Implications for the catalog, in order of force:

1. **The in-context catalog has a ceiling around 30–50 entries**, consistent with doc 02's "≤~20–30 primitives" in-context rule ([02](02-intent-spec-and-context.md)). Beyond it, the catalog must be *retrieved*, and doc 10's "blessed small subset in-context, long tail retrieved" becomes mandatory, not optional. Anthropic's own defaults (3–5 hot tools non-deferred; 5 results per search) and the chance-corrected result (~7 candidates match K=50) suggest the retrieval slice per slot should be single digits.
2. **Growth without pruning is self-defeating.** Every harvested pattern that enters the hot set displaces selection accuracy for every other pattern. Promotion must therefore be paired with a retirement rule and a hot/cold split: hot = top-N by reuse and recency; cold = retrievable by description. BiasBusters' "semantic alignment… is the strongest driver" means pattern *descriptions* are the retrieval index and must be written for the query, not the implementation — the AutoDoc lesson in §7.
3. **Near-duplicate patterns are worse than missing ones.** Semantically similar tools drive both the fixation and the position effects above; Omlet's "Similar component detection" exists for the same reason on the code side. Harvesting must run its duplicate check against *existing* patterns before proposing (a candidate that is a variant of `SettingsSection` should become a prop, not a sibling).

Deprecation practice from mature systems supplies the process:

- Google's chapter starts from "code is a liability, not an asset," distinguishes **advisory** deprecation ("Hope is not a strategy") from **compulsory** deprecation with deadlines and a staffed migration, requires warnings that are "actionable" and "relevant" to avoid alert fatigue, names process owners as essential, and lists the tooling: discovery, migration automation, and "backsliding prevention" ([SWE at Google, ch. 15](https://abseil.io/resources/swe-book/html/ch15.html)).
- Polaris: "A month before the next major version release ensure that deprecations have been announced and any migrations needed are documented/available," with the same four-step ladder for components, props, prop values and tokens — flag (`@deprecated`, `console.warn()` in dev, `stylelint-polaris` for tokens) → automated migration → document → remove in the next major ([Polaris deprecation guidelines](https://github.com/Shopify/polaris-react/blob/main/documentation/Deprecation%20guidelines.md)). Primer's deprecated status requires that "a warning is shown to the consumer" ([Primer](https://primer.style/contribute/component-lifecycle/)); the "at least one month" removal notice attributed to Primer in search results was **not present on the fetched page**. Procore's CORE holds deprecations for "one full major version" ([CORE](https://core.procore.com/11.22.0/web/releases/deprecation-strategy/), via search).
- For the construction-file catalog the analogue is mechanical: a deprecated pattern stays in the *schema* (so old construction files validate) but leaves the *prompt catalog* and the retrieval index (so nothing new uses it), the builder emits a warning naming the replacement, a codemod-style migrator rewrites old files on the next re-adopt ([13](13-schema-evolution-and-migration.md)), and removal happens at the next major. "Backsliding prevention" is free: the enum no longer contains the name.

**Open questions:** No published curve for *pattern* (vs tool) selection accuracy against catalog size on a UI task; the tool numbers are the best proxy but the analogy is imperfect (patterns are chosen per slot with schema constraints, tools per turn without them). Whether retrieval per slot — the "context-sensitive palette" of [10 §3](10-visual-programming-node-graphs.md) — removes the ceiling entirely is untested.

---

## 6. The catalog health dashboard

**What it is:** The metrics a catalog owner reads weekly, computed from three sources already in the pipeline — the construction-file corpus, the island telemetry (§3), and the grade records ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)) — modelled on design-system adoption dashboards and on software-catalog scorecards.

**Why it matters:** The repo's kill-criterion is a number nobody is currently computing. Productboard's pipeline (react-scanner → daily GitLab job → Looker, scoped by team across a "200+ project monorepo" ([Productboard](https://www.productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard/))) and Mews's New Relic probe ("runs every 10 seconds, results batched" ([Mews](https://developers.mews.com/design-system-adoption-metric-building/))) show that the dashboard is cheap once the extractor exists — and the construction file *is* the extractor's output, so this is cheaper still. Backstage's Tech Insights plugin supplies the scorecard shape: define "facts (data points) and checks (rules) that can be used to evaluate the state of an entity in the catalog," with a `JsonRulesEngineFactChecker` that "calculates boolean facts from JSON rules" and an optional maturity module that "introduces maturity rankings and categories into your checks" ([backstage/community-plugins tech-insights](https://github.com/backstage/community-plugins/tree/main/workspaces/tech-insights)); Cortex's scorecard docs returned 404 (**not verified**; commercial scorecard-first portals described only via search).

| Metric | Definition | Source | Threshold / action | Precedent |
|---|---|---|---|---|
| **Screen coverage** | % screens whose construction file has zero `CustomBlock`s and zero overrides | corpus | Green ≥ 70%; amber 60–70%; red < 60% → harvesting sprint or, if persistent across product areas, doc 05's "use the agent directly" exit | [00](00-architecture-synthesis.md), [05 §7.3](05-surgical-editing-iteration.md) |
| **Node coverage** | catalog nodes ÷ all nodes, per screen and rolling | corpus | ≥ 70% per doc 01's stress-test target; watch divergence from screen coverage | [01 §8](01-primitive-codification.md); Mews DOM ratio |
| **Island rate** | islands per screen, and islands per 100 nodes, sliced by parent pattern + slot | telemetry | Rising slope over 4 weeks on one slot = candidate; any slot > 25% island share is a gap | Figma detach rate; Material button |
| **Cluster backlog** | number and size of island clusters ≥ minimum support with no open proposal | §3 | Each cluster ≥ minsup gets an owner within a week (Piranha cadence) | Piranha weekly pipeline |
| **Pattern reuse distribution** | instances per pattern; Gini or share of instances in the top 20% of patterns; count of patterns with < 3 instances in 90 days | corpus | Long tail is expected; the *change* in tail length after each promotion is the signal (Trueman's "long tail of one-off configurations") | Omlet usage; [Every fork](https://blog.murphytrueman.com/every-fork-looks-like-adoption/) |
| **First-pass validity per pattern** | % construction files referencing the pattern that pass schema + semantic lint on first generation | validator logs | Any pattern below the catalog median by > 10 pts gets its description/exemplar reviewed (BiasBusters: description drives selection) | [03 §Layered defense](03-construction-file-generation.md) |
| **Quality per pattern** | mean reviewed grade of screens using the pattern, vs screens not using it, on the same rubric dimensions | grade records | Pattern-level quality below island-level quality on the same intent = the pattern is worse than the escape hatch; fix or retire | [eval-tuning-loops/01 §4](../eval-tuning-loops/01-grading-generated-prototypes.md) |
| **Staleness** | builds since last instance; days since last instance | corpus | Piranha analogue: unused for 8 weeks *and* not in the last 200 builds → deprecation candidate; auto-file a retirement proposal | [Uber Piranha](https://www.uber.com/blog/piranha/) |
| **Exemplar freshness** | catalog version the exemplar was graded against vs current; whether it re-renders without diff | exemplar metadata | Re-validate in CI on every catalog bump; retire any exemplar whose grade would fall under the current rubric | [eval-tuning-loops/03 §2](../eval-tuning-loops/03-feeding-grades-back-text-level.md) |
| **Hot-set size and retrieval misses** | count of patterns in the in-context catalog; % slots where retrieval returned nothing usable | prompt builder, retrieval logs | Hot set ≤ 30–50; a retrieval miss is zeroheight's "failed search… gap worth closing" | [Anthropic tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool); [zeroheight](https://zeroheight.com/measurement/) |
| **Prop utilisation** | per pattern, % instances setting each prop away from default | corpus | Never-varied props are baked-in candidates (simplify); always-overridden defaults are wrong defaults | Omlet "unused properties" |

Two design rules from the precedents. First, Mews's caveat — "components have different complexity… a simple tag is much less complex than a datepicker, but in many metrics, they're counted the same" ([Mews](https://developers.mews.com/design-system-adoption-metric-building/)) — argues for weighting node coverage by *rendered* node count (what the builder emits), not construction-file node count. Second, Trueman's warning that dashboards can show "usage trending upward while actual reuse degrades" argues for reporting the reuse distribution and prop-shape variance next to coverage, never coverage alone.

**Open questions:** Which single metric best predicts the human "this catalog feels complete" judgement is unknown; the dashboard should log that judgement monthly so it can be correlated. Gini over a small catalog (< 50 patterns) is noisy; the 3-instance floor may be a better tail metric.

---

## 7. LLM-assisted harvesting: library learning as precedent

**What it is:** Using the model to name a candidate pattern, write its slot schema and exemplar, and draft its documentation — and the evidence from program-synthesis "library learning" on whether machine-proposed abstractions help or hurt the generator that must then use them.

**Why it matters:** This is the strongest academic precedent for bottom-up catalog growth, and it contains a warning the design-system literature does not: an undocumented abstraction can make the generator *worse*.

**Key findings:**

- **The loop exists and works.** DreamCoder "alternately extends the language with new symbolic abstractions and trains the neural network on imagined and replayed problems"; concepts "are built compositionally from those learned earlier" ([arXiv 2006.08381](https://arxiv.org/abs/2006.08381)). Stitch made the compression step practical — "3-4 orders of magnitude faster" and "2 orders of magnitude less memory" than DreamCoder's, choosing abstractions that "maximally capture shared structures in the corpus" under a "compressivity" objective ([arXiv 2211.16605](https://arxiv.org/abs/2211.16605)). Compressivity is precisely the objective for pattern candidates: the subtree whose promotion most shrinks the corpus of construction files.
- **LILO is the closest analogue to this doc's loop** — "iteratively synthesizes, compresses, and documents code," combining an LLM synthesizer with Stitch and an **AutoDoc** step that "infers natural language names and docstrings based on contextual examples of usage" ([arXiv 2310.19791](https://arxiv.org/abs/2310.19791)). Results: REGEX "93.20%" vs DreamCoder's "45.60%" and an LLM-only solver's "90.00%"; LOGO "73.87%" vs "36.94%" and "41.44%"; CLEVR "99.03%" vs "97.09%" ([arXiv HTML](https://arxiv.org/html/2310.19791)). The ablation is the finding that matters here: **without AutoDoc**, "Providing the LLM with abstractions did not help—and in some cases, significantly hurt—downstream synthesis performance" — "-30.60" points on REGEX — and documentation turned that into "+9.73." A harvested pattern shipped without a query-shaped description is a net negative for the generator, which matches BiasBusters' "semantic alignment… is the strongest driver" from the tool side.
- **The named failure mode is bad naming, not bad structure.** LILO's AutoDoc gave some abstractions "relatively uninformative names that emphasize their implementation (looping move and rotate) but not their behavior (drawing polygons)," and sequential documentation produced descriptions "ambiguous in fn_31 (which angle?) and incorrect in fn_34"; the authors recommend "self-consistency and verification techniques" ([arXiv HTML](https://arxiv.org/html/2310.19791)). For patterns: name by user goal (`Stepper`, `ObjectHeader`), never by composition (`StackWithBadgeRow`); generate the description from several instances, not one; and verify by having a *second* model pick the pattern from the description for each motivating brief before it ships.
- **Over-abstraction risk is real but has a data cure.** Compression-driven learners can propose abstractions that fit the corpus and generalise poorly; LILO's offline test (library frozen, no language guidance) still held "71.40%" vs "42.00%" on REGEX, which is the kind of check to run here — does the new pattern get selected correctly on briefs it was *not* mined from? The variance analysis of §4 is the structural guard: a candidate whose instances never vary is a one-off that happened to repeat, and a candidate whose every value varies is not a pattern but a container.
- **What the model should and should not draft.** Should: the name and "use when / never use for" description (with the LILO verification), the slot list with allowed children inferred from observed children, the prop enums inferred from observed values, the exemplar (re-adopted from the best-graded instance), and the deprecation notice for any islands it supersedes. Should not: decide promotion — the review in §4 stays human, because the numbers that look best (compressivity) are not the numbers that matter (selection accuracy after promotion, §5).

**Open questions:** No library-learning result covers a *visual* domain judged by humans; LILO's tasks have executable checkers. Whether compressivity correlates with designer-judged "this is a real pattern" is the experiment to run.

---

## 8. Recommended harvesting loop

Seven steps; cadence weekly (Piranha's), with promotion batched to catalog releases. Thresholds are marked by evidence strength: **A** measured in a published eval, **B** vendor/practitioner documented, **C** reasoned from adjacent evidence.

1. **Instrument.** Every build writes one record per node type used and one island record per `CustomBlock`/override with the fields in §3 (`nodePath`, parent pattern + slot, `intent`, normalised `structure`, `structureHash`, `reason`, versions, grade id). Store next to the construction file, not in chat. *(B — Figma analytics; Piranha; [01 §7](01-primitive-codification.md))*
2. **Mine.** Weekly, over the last 90 days of construction files: ordered-induced frequent-subtree mining inside slots with **minsup = 3 distinct projects/briefs** (the smallest support that is not coincidence; consistent with Curtis-style "used by several teams" contribution norms, unverified) and a minimum size of 3 nodes; token-normalised clone detection over island bodies at **70% similarity** (NiCad/SourcererCC defaults). *(A for algorithms; C for minsup)*
3. **Cluster.** Embed island structures as a pre-filter; then Clio-style: model-written facet per island → cluster → model-written cluster title and summary → hierarchy; surface only clusters at or above minsup. Run a duplicate check of every cluster against *existing* pattern descriptions before it becomes a candidate; if the nearest pattern is a near-match, the proposal is a prop or variant, not a new entry. *(B — Clio; Omlet similar-component detection; C for the duplicate rule)*
4. **Propose.** The model drafts name, description, slots, prop enums from observed variance, exemplar from the best-graded instance, and docs; a second model must select the pattern from its description for ≥ 90% of the motivating briefs before the proposal is filed (the LILO AutoDoc verification). File as an issue with the Carbon pattern template: rationale, mockups (the rendered instances), existing vs new components. *(A — LILO; B — Carbon)*
5. **Review.** Human owner assigned within a week; **3-day final comment period** once a decision is proposed (Carbon); enters the catalog as **experimental** (Primer), excluded from the coverage denominator and flagged in its description. *(B)*
6. **Promote.** Blind A/B, catalog vN vs vN+1, on the motivating slice plus the frozen held-out set: accept only if first-pass validity is not lower, the island rate on the slice drops (worked-example target: from ~30% to single digits), no other rubric dimension regresses, and blind quality is not worse. Ship additive patterns as a minor version; anything that changes an existing pattern's shape goes through [13](13-schema-evolution-and-migration.md) with a migrator. Re-adopt the motivating prototypes so their islands become instances. Move to **Ready** after one release with ≥ minsup organic instances. *(B — skill-creator A/B; [eval-tuning-loops/03 §7](../eval-tuning-loops/03-feeding-grades-back-text-level.md))*
7. **Measure and prune.** Dashboard of §6 weekly. Retirement proposals auto-filed for patterns unused for **8 weeks and 200 builds** (Piranha's staleness heuristic, adapted); deprecated patterns leave the prompt catalog and retrieval index immediately, stay in the schema with a builder warning naming the replacement, and are removed at the next major. Keep the in-context hot set at **≤ 30–50 patterns** and retrieve the rest with **≤ 5–7 candidates per slot**. *(B — Anthropic thresholds; A — chance-corrected depth; C — the 200-build floor)*

---

## 9. Tradeoffs

| Choice | Option A | Option B | Verdict |
|---|---|---|---|
| Candidate source | Island clusters (missing patterns) | Frequent subtrees inside slots (latent patterns) | Run both; islands have the stronger signal (the model *had* to leave the catalog), subtrees catch forks-inside-the-catalog that coverage metrics hide |
| Clustering | Code embeddings + DBSCAN (cheap, structural) | Summarise-then-cluster (Clio; semantic, produces the proposal text) | Embeddings as pre-filter, Clio-style for the groups humans see |
| Promotion trigger | Compressivity (corpus shrinkage) | Post-promotion selection accuracy and island-rate drop on A/B | Compressivity ranks candidates; the A/B decides |
| Catalog growth policy | Grow freely, rely on retrieval | Cap the hot set, retire aggressively | Cap + retrieve; tool-selection numbers make free growth a measured accuracy loss |
| Deprecation style | Advisory (flag it, hope) | Compulsory (deadline, migrator, removal at major) | Compulsory — the enum is the enforcement; "Hope is not a strategy" |
| Who writes the pattern | Human authors from the cluster | Model drafts, human reviews | Model drafts with AutoDoc-style verification; unverified machine descriptions can make generation worse (LILO −30.6) |
| Experimental status | Skip it; ship as Ready | Two-stage (experimental → ready) | Two-stage; keeps un-proven patterns out of the coverage denominator and lets the generator prefer stable ones |
| Coverage metric | One number (node share) | Screen coverage + node coverage + island rate + reuse distribution | The set; a single adoption number "collapses nuance" and forks look like adoption |

---

## 10. Open questions

1. **Does pattern-selection accuracy degrade with catalog size the way tool selection does?** Slots constrain the choice set per position; the tool numbers may overstate the effect. Needs a curve on a UI task (experiment 3).
2. **Minimum support.** Three briefs is a guess; on a low-volume team it may never trigger, on a high-volume one it may flood review.
3. **Is compressivity a proxy for designer-recognised patterns?** No library-learning result covers a human-judged visual domain.
4. **Honesty of the generation-time `reason` field.** Post-hoc rationalisation vs actual gap; compare against reviewer reasons.
5. **Ownership of harvested patterns.** Google's chapter says unowned deprecations stall; a pattern proposed by a pipeline has no natural owner.
6. **Catalog churn vs exemplar rot.** Every promotion invalidates some exemplars ([eval-tuning-loops/03 §5](../eval-tuning-loops/03-feeding-grades-back-text-level.md) open question); a fast harvesting loop may make exemplar maintenance the dominant cost.
7. **Retrieval-per-slot as a ceiling remover.** If the "context-sensitive palette" ([10 §3](10-visual-programming-node-graphs.md)) holds accuracy at 200+ patterns, pruning becomes a token-cost question only.

---

## 11. Recommended experiments

- **H1 — Telemetry-only baseline (2 days).** Add the island record to the E1 vertical slice ([00](00-architecture-synthesis.md)); run the 10 briefs plus the 5 over-catalog briefs of E6; report screen coverage, node coverage, island rate per slot. Establishes whether the three coverage metrics disagree in practice.
- **H2 — Mining precision (3 days).** Run frequent-subtree mining (minsup 2/3/5) and island clustering on the H1 corpus; have two designers label each candidate "real pattern / variant of existing / noise." Measures candidate precision by threshold and by source (subtree vs island).
- **H3 — Catalog-size curve (1 week).** Same 10 briefs against catalogs of 10, 30, 60, 120 patterns (pad with real but irrelevant patterns); measure first-pass validity, correct-pattern selection, and quality; repeat with per-slot retrieval of ≤ 7 candidates. Directly tests §5's ceiling and §10 Q1/Q7.
- **H4 — AutoDoc effect (2 days).** Promote the same candidate three ways: no description, implementation-named description, goal-named description verified by a second model; measure selection rate on motivating and held-out briefs. Replicates LILO's ablation in the UI domain.
- **H5 — Promotion A/B (3 days).** Full §8 steps 4–6 on the best H2 candidate; report island-rate drop on the slice, validity, held-out regressions, blind quality — the worked-example-B shape with real numbers.
- **H6 — Retirement replay (2 days).** Deprecate two low-use patterns; replay all H1 construction files through the migrator ([13](13-schema-evolution-and-migration.md)); count breakages, warnings, and any generation that tries to use the removed name.

---

## 12. Candidate picks for skill-resources

| Name | URL | Why | Verification |
|---|---|---|---|
| react-scanner | https://github.com/moroshko/react-scanner | Static extraction of component instances + props; the code-side analogue of construction-file usage counting; custom processors | fetched OK |
| Omlet | https://omlet.dev/ | Component analytics with unused-prop, similar-component and deprecation-impact reports; going MIT open source (Apr 2026 post on blog index) | site + blog index fetched; post URL 404 |
| Figma Library Analytics docs | https://help.figma.com/hc/en-us/articles/360039238353-View-library-analytics | Exact insert/detach definitions; the detach metric is the design-side escape-hatch signal | fetched OK |
| Uber Piranha | https://github.com/uber/piranha | Weekly staleness-driven cleanup pipeline with owner assignment and reminders; template for both island promotion and pattern retirement | blog fetched; repo via search |
| Backstage Tech Insights | https://github.com/backstage/community-plugins/tree/main/workspaces/tech-insights | Facts + JSON-rule checks + scorecards + maturity module; the shape of the catalog health dashboard | fetched OK |
| Anthropic tool search tool | https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool | The 30–50 tool ceiling, `defer_loading`, 3–5 hot tools; the retrieval mechanism for a cold pattern catalog | fetched OK |
| LILO (paper + code) | https://arxiv.org/abs/2310.19791 | Compress → document → re-synthesise loop; AutoDoc ablation is the strongest evidence for description-first promotion | fetched OK |
| Stitch | https://arxiv.org/abs/2211.16605 | Fast compressivity-driven abstraction finder; candidate ranking objective | fetched OK |
| Clio (Anthropic) | https://www.anthropic.com/research/clio | Summarise → cluster → name → hierarchy with minimum thresholds; the island-clustering recipe | fetched OK |
| Carbon RFCs + pattern contribution | https://github.com/carbon-design-system/rfcs · https://v10.carbondesignsystem.com/contributing/pattern/ | 3-day final comment period; pattern proposal template (rationale, mockups, existing vs new components) | fetched OK |
| Polaris deprecation guidelines | https://github.com/Shopify/polaris-react/blob/main/documentation/Deprecation%20guidelines.md | Flag → codemod → document → remove-at-major, per component/prop/value/token | fetched OK |
| SWE at Google, ch. 15 Deprecation | https://abseil.io/resources/swe-book/html/ch15.html | Advisory vs compulsory, warnings must be actionable, backsliding prevention | fetched OK |
| Mews adoption metric | https://developers.mews.com/design-system-adoption-metric-building/ | Element-level coverage formula and the complexity-weighting caveat | fetched OK |
| Every fork looks like adoption | https://blog.murphytrueman.com/every-fork-looks-like-adoption/ | Reuse vs use; prop-shape long tail and structural-similarity metrics | fetched OK |

Not selected: Nathan Curtis's contribution series (Medium 403, eightshapes.com DNS failure — cite once verified); Cortex/OpsLevel scorecards (404 / search only); Atlassian contribution page (empty response); the Rico topic-mining paper (ResearchGate only); the secondary "50/200/740 tools" accuracy table (primary paper not located).

---

## 13. Sources

- https://en.wikipedia.org/wiki/Frequent_subtree_mining
- https://www.researchgate.net/publication/220031813_Frequent_tree_pattern_mining_A_survey — search result only
- https://cgi.csc.liv.ac.uk/~frans/PostScriptFiles/ker-jct-6-May-11.pdf — search result only
- https://arxiv.org/abs/1512.06448 — SourcererCC
- https://link.springer.com/article/10.1007/s44443-025-00362-2 — clone thresholds, search result only
- https://arxiv.org/pdf/2311.08778 — Gitor (Deckard description), search result only
- http://interactionmining.org/rico
- https://userinterfaces.aalto.fi/enrico/
- https://arxiv.org/abs/2101.11103 — Screen2Vec
- https://www.researchgate.net/publication/401214634_AI-Driven_Mobile_UI_Pattern_Recognition_and_Design_Topic_Mining_on_RICO_Semantic_Clustering_and_Screenshot-Based_Topic_Classification — search result only
- https://help.figma.com/hc/en-us/articles/360039238353-View-library-analytics
- https://www.figma.com/blog/introducing-design-system-analytics/
- https://www.figma.com/blog/design-systems-104-making-metrics-matter/
- https://forum.figma.com/suggest-a-feature-11/trigger-plugin-widget-hooks-on-component-instance-detach-51297
- https://precisionaiacademy.com/blog/figma-ai-features-2026 — secondary, search result only
- https://github.com/moroshko/react-scanner
- https://www.productboard.com/blog/how-we-measure-adoption-of-a-design-system-at-productboard/
- https://developers.mews.com/design-system-adoption-metric-building/
- https://omlet.dev/
- https://omlet.dev/blog/ — index; open-source post dated 28 April 2026
- https://omlet.dev/blog/data-driven-design-systems-in-practice/
- https://zeroheight.com/measurement/
- https://report.zeroheight.com/ — search result only
- https://storybook.js.org/docs/configure/telemetry
- https://blog.murphytrueman.com/every-fork-looks-like-adoption/
- https://blog.murphytrueman.com/p/the-component-adoption-gap-understanding
- https://www.anthropic.com/research/clio
- https://www.sciencedirect.com/science/article/abs/pii/S0957417425031380 — search result only
- https://www.uber.com/blog/piranha/
- https://ieeexplore.ieee.org/document/9276556/ — Piranha paper, search result only
- https://medium.com/eightshapes-llc/defining-design-system-contributions-eb48e00e8898 — returned 403; quoted via search
- https://medium.com/eightshapes-llc/contributions-to-design-systems-89261a9363d8 — returned 403; quoted via search
- https://medium.com/eightshapes-llc/i-made-this-does-it-go-in-the-system-3b67b9894531 — returned 403
- https://v10.carbondesignsystem.com/contributing/pattern/
- https://carbondesignsystem.com/community/patterns/ — search result only
- https://github.com/carbon-design-system/rfcs
- https://primer.style/contribute/component-lifecycle/
- https://primer.style/guides/status/
- https://github.com/Shopify/polaris-react/blob/main/documentation/Deprecation%20guidelines.md
- https://core.procore.com/11.22.0/web/releases/deprecation-strategy/ — search result only
- https://abseil.io/resources/swe-book/html/ch15.html
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- https://www.anthropic.com/engineering/advanced-tool-use
- https://arxiv.org/abs/2505.03275 — RAG-MCP
- https://arxiv.org/abs/2506.01056 — MCP-Zero
- https://arxiv.org/html/2605.24660v1 — How Many Tools Should an LLM Agent See?
- https://arxiv.org/abs/2605.18857 — The 99% Success Paradox
- https://arxiv.org/abs/2510.00307 — BiasBusters
- https://arxiv.org/html/2606.16364 — Looking Is Not Picking
- https://vllm-sr.ai/blog/semantic-tool-selection/ — secondary; does not cite its source
- https://machinelearningmastery.com/the-complete-guide-to-tool-selection-in-ai-agents/ — secondary, search result only
- https://github.com/backstage/community-plugins/tree/main/workspaces/tech-insights
- https://arxiv.org/abs/2006.08381 — DreamCoder
- https://arxiv.org/abs/2211.16605 — Stitch
- https://arxiv.org/abs/2310.19791 · https://arxiv.org/html/2310.19791 — LILO

*Not verifiable this pass:* a Figma "suggested components"/"Autocomponent" feature (no primary source found; only AI asset search is documented in secondary sources); Atlassian Design System's contribution process (page returned empty); Cortex scorecard documentation (404); the primary paper behind the widely repeated "50 → 200 → 740 tools" accuracy table; Primer's "at least one month" removal notice (in search snippets, absent from the fetched lifecycle and status pages); Nathan Curtis's contribution-criteria article (403). Repo-internal references: [00](00-architecture-synthesis.md), [01 §2, §7–8](01-primitive-codification.md), [02](02-intent-spec-and-context.md), [03](03-construction-file-generation.md), [05 §7–8](05-surgical-editing-iteration.md), [10 §3–4, §10](10-visual-programming-node-graphs.md), [13](13-schema-evolution-and-migration.md), [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md).

*Research conducted 2 September 2026 via live web search (~30 queries; session search budget exhausted at the end) and ~45 fetches; failures are marked inline.*
