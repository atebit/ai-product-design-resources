# Q2 — Per-skill token census: where do the tokens go, and what class of content is each chunk?

Corpus: `skills/` (14 SKILL.md, Claude Code tree) vs `skills-figquery/` (Cursor tree), commit a5e7e04.

## Method

A structural pass (script, exact byte counts) split every SKILL.md body (frontmatter stripped) into fenced-code / table-row (`|`-leading) / blockquote (`>`-leading) / heading / plain-prose lines. That gives hard numbers for the *syntactic* shape of each file. On top of that I did a full manual read of all 14 files and hand-mapped headed sections to the semantic taxonomy below, using `sed -n '<range>p' | wc -c` to get exact byte counts for the sections I cite. Percentages built from section-to-class mapping are my **estimates** (I did not tag every sentence as the lead did for the MUST/NEVER pass) — flagged as such throughout. Byte counts for cited ranges are measured, not estimated.

## Taxonomy

- **(a) hard directive** — MUST/NEVER/always-do-X rules, often numbered
- **(b) workflow steps / ordering** — "Step 1 → Step 2", phase sequencing
- **(c) worked example / before-after code** — fenced code blocks demonstrating usage
- **(d) rationale & motivation** — "why this matters" prose
- **(e) API surface facts** — parameter shapes, return shapes, enums, node-type tables
- **(f) error recovery / gotchas** — "if X throws Y, do Z" tables and WRONG/CORRECT pairs
- **(g) cross-references & routing** — "load skill X", reference-doc tables, skillNames logging boilerplate
- **(h) restates what the tool description (or a co-loaded prerequisite skill) already owns** — the waste category
- **(i) ceremony / boilerplate / preamble** — headers, restated skill names, generic scene-setting

## Structural pass (measured, all 14 files, body bytes excl. frontmatter)

| Skill | Total B | Code B | Table B | Quote B | Prose+Head B |
|---|---:|---:|---:|---:|---:|
| figma-use | 34,645 | 4,120 (12%) | 5,614 (16%) | 858 (2%) | 23,432 (68%) |
| figma-generate-design | 33,487 | 7,536 (22%) | 391 (1%) | 1,154 (3%) | 23,472 (70%) |
| figma-code-connect | 26,669 | 6,594 (25%) | 3,152 (12%) | 778 (3%) | 15,819 (59%) |
| figma-generate-library | 23,435 | 1,893 (8%) | 3,860 (16%) | 457 (2%) | 16,416 (70%) |
| figma-implement-motion | 23,279 | 150 (1%) | 700 (3%) | 0 | 21,972 (94%) |
| figma-use-slides | 22,033 | 1,193 (5%) | 0 | 0 | 20,592 (93%) |
| figma-generate-diagram | 10,272 | 0 | 839 (8%) | 0 | 8,599 (84%) |
| figma-use-figjam | 6,943 | 99 (1%) | 0 | 390 (6%) | 6,206 (89%) |
| figma-use-motion | 6,910 | 0 | 435 (6%) | 0 | 6,143 (89%) |
| figma-shaders | 5,612 | 0 | 0 | 0 | 5,282 (94%) |
| figma-generative-plugins | 4,852 | 0 | 0 | 0 | 4,546 (94%) |
| figma-design-to-code | 4,983 | 0 | 0 | 0 | 4,385 (88%) |
| figma-swiftui | 4,049 | 0 | 629 (16%) | 0 | 2,722 (67%) |
| figma-create-new-file | 3,946 | 100 (3%) | 255 (6%) | 0 | 3,030 (77%) |

`figma-implement-motion`, `figma-use-slides`, `figma-shaders`, `figma-generative-plugins` are essentially **all prose** — almost no tables, almost no code. That matters for compressibility: prose is the cheapest thing to cut without losing executable information, and these are exactly the files with no code/table scaffolding to fall back on.

## Per-skill semantic census (estimated %, largest cuttable block measured)

### figma-use (34,645B — largest skill)
| Class | Est. % | Est. B |
|---|---:|---:|
| (c) worked examples | 17% | ~5,900 |
| (a) hard directive | 22% | ~7,500 |
| (f) gotchas/error recovery | 14% | ~4,800 |
| (g) routing/cross-ref | 13% | ~4,500 |
| (e) API surface facts | 12% | ~4,300 |
| (b) workflow steps | 12% | ~4,000 |
| **(h) self-restatement** | **8%** | **~2,700** |
| (i) ceremony | 1% | ~300 |

**Largest cuttable block:** lines 118–270, "5. Efficient APIs — Prefer These Over Verbose Alternatives" (measured 6,387B, 18% of file). It teaches `node.query()`, `node.set()`, `figma.createAutoLayout()`, `node.placeholder`, `await node.screenshot()` each with a BEFORE/AFTER code pair. This is not hypothetically cuttable — the figquery diff (below) shows it **actually was deleted wholesale** because Cursor's `use_figma` exposes a different builder (`$fig`) that makes all five of these teaching points moot.

**(h) flag:** lines 340–364, "8. Pre-Flight Checklist" (2,715B) is a checkbox restatement of rules already stated in full in §1 Critical Rules and §2 Page Rules earlier in the *same file*. Every one of its ~20 bullets paraphrases a rule stated 300 lines earlier. This is intra-document duplication the lead's cross-skill dedup pass (0.3%) would not catch, since it's paraphrase, not identical paragraphs, and it's within one file, not across files.

### figma-generate-design (33,487B — 2nd largest)
| Class | Est. % | Est. B |
|---|---:|---:|
| (c) worked examples | ~38% | ~12,700 |
| (b) workflow steps | ~20% | ~6,700 |
| (a) hard directive | ~15% | ~5,000 |
| **(h) tool-mechanics restatement** | **~9%** | **~3,000** |
| (g) routing | ~8% | ~2,700 |
| (f) gotchas | ~6% | ~2,000 |
| (d) rationale | ~4% | ~1,300 |

**Largest cuttable block:** lines 68–264, Step 2 "Collect Component Keys, Variables, and Styles" (measured 10,953B — **33% of the entire file**, the single largest section found anywhere in the corpus). It re-derives, in prose, three parallel discovery procedures (components / variables / styles) that are structurally identical (inspect existing screen → else search_design_system → else build). The three could be one generic procedure parameterized by entity type instead of three full retellings.

**(h) flag, concrete and cross-file:** lines 112–131 spell out `get_libraries` → `search_design_system` mechanics (two-list return shape, `libraries_available_to_add_next_offset` pagination, `includeLibraryKeys` scoping) in ~1,700B. **This exact mechanic is independently re-explained, in different words, in `figma-generate-library` lines 190–207 (~1,200B).** Neither skill defers to the tool's own parameter description; each re-teaches the pagination contract from scratch. Combined ≈2,900B of duplicated tool-parameter documentation across two files — precisely the class-(h) waste the task asked to hunt for, and invisible to a duplicate-paragraph dedup pass because the wording differs.

### figma-code-connect (26,669B — only skill over Anthropic's 500-line guidance, 528 lines)
| Class | Est. % | Est. B |
|---|---:|---:|
| (c) worked examples | ~42% | ~11,200 |
| (e) API surface facts | ~20% | ~5,300 |
| (a) hard directive | ~14% | ~3,700 |
| (f) gotchas (Rules and Pitfalls) | ~12% | ~3,200 |
| (b) workflow steps | ~7% | ~1,900 |
| (g) routing | ~5% | ~1,300 |

**Largest cuttable block:** lines 129–328, the property-mapping walkthrough inside "Step 5: Create the Template File" (measured 9,821B, 37% of file). It gives a WRONG/CORRECT code pair for nearly every property type (TEXT, VARIANT, BOOLEAN, INSTANCE_SWAP, SLOT) and then a *second* full pass over the same ground in "Rules and Pitfalls" (lines 400–452, 3,550B) and a *third* pass in the "Complete Worked Example" (lines 454–521, 2,165B) that re-demonstrates the same Button component end-to-end. Three overlapping demonstrations of the same 5 property types is the concrete driver of this file crossing the 500-line line-count guidance — a single canonical worked example plus a lookup table would cover the same ground.

**(h):** none found — Code Connect's property-type table (TEXT/BOOLEAN/VARIANT/INSTANCE_SWAP/SLOT) is genuinely skill-owned domain knowledge (`get_context_for_code_connect`'s tool description would need to teach template-authoring API, which is out of scope for a tool description). This file's bloat is redundant *examples*, not tool-description duplication.

### figma-generate-library (23,435B)
| Class | Est. % | Est. B |
|---|---:|---:|
| (a) hard directive | ~24% | ~5,600 |
| (b) workflow / phase ceremony | ~22% | ~5,100 |
| (c) worked examples/scripts | ~16% | ~3,700 |
| (g) routing (reference-doc + script tables) | ~14% | ~3,300 |
| **(h) restates figma-use + tool mechanics** | **~10%** | **~2,300** |
| (f) gotchas/anti-patterns | ~9% | ~2,100 |
| (d) rationale | ~5% | ~1,200 |

**Largest cuttable block:** lines 16–142 combined — "1. The One Rule That Matters Most" (communication contract: post a `Phase N Checklist`, post `Working on Phase N.X`, post a `Phase N Summary`, "Stable Task IDs" format `P{phase}.{step}`) plus the four Phase 0–4 checklists written as `- [ ]` bullet lists. This is confirmed, not just estimated, as the largest cut: the figquery diff below shows Figma's own authors collapsed this exact span from 98 lines to 61 by replacing three redundant restatements of the same phase plan (prose contract + task-ID rules + per-phase `- [ ]` checklists) with one ASCII-art block.

**(h) flag:** lines 113–121, "Critical Rules … Plugin API basics (from use_figma skill — enforced here too)" restates 5 of figma-use's Critical Rules almost verbatim ("Use `return` to send data back…", "`figma.notify()` throws — never use it", "Colors are 0–1 range, not 0–255", font-loading rule) even though line 11 already says "The `figma-use` skill MUST also be loaded." This is a co-loaded-prerequisite-skill restatement, a variant of class (h) worth calling out separately from tool-description duplication: **when skill A declares skill B as a mandatory co-load, repeating B's rules inside A is the same waste as restating a tool description**, just one level removed.

### figma-implement-motion (23,279B, 94% prose — the "purest prose" file in the corpus)
| Class | Est. % | Est. B |
|---|---:|---:|
| (a)/(f) critical rules + gotcha cross-refs | ~30% | ~7,000 |
| (b) workflow steps (5-step Required Workflow) | ~27% | ~6,300 |
| (d) rationale ("why merge this way") | ~20% | ~4,700 |
| (g) routing (6 reference docs, repeatedly cited inline) | ~13% | ~3,000 |
| (e) API/response-shape facts | ~10% | ~2,300 |

**Largest cuttable block:** lines 44–98, "Required Workflow" Steps 1–3 (measured 9,869B — **42% of the file**). Step 3 "Merge static and motion context" alone is one giant paragraph-after-paragraph explanation of id-matching precedence (exact id vs `fallbackNodeId` vs name/screenshot fallback) repeated with slightly different framing four separate times (once as a bulleted rule, once inside "Componentized child motion usually matches by fallback", once in "Handling interleaved transforms", once implicitly in the Critical Rules restatement at line 115). This is rationale-heavy, explanatory prose (class d) about a genuinely tricky merge algorithm — a case where the complexity is real, but the same explanation is given from 3–4 angles rather than once with a diagram/pseudocode.

**(h):** none — `get_motion_context`/`get_design_context` are read tools with no authoring contract to delegate to; this skill's job (merging two JSON responses into JSX) is inherently skill-owned. This is one of the cleanest files re: tool-description duplication, but the worst re: repeating its own explanation.

### figma-use-slides (22,033B, unchanged between variants except for one diff — see below)
| Class | Est. % | Est. B |
|---|---:|---:|
| (d) rationale (design-thinking, speaker-notes philosophy) | ~30% | ~6,600 |
| (a) hard directive (6 Critical Rules) | ~18% | ~4,000 |
| (b) workflow (2-phase deck-building) | ~16% | ~3,500 |
| (c) worked examples (inspection scripts) | ~10% | ~2,200 |
| (g) routing (6 reference docs) | ~9% | ~2,000 |
| (f) gotchas | ~17% | ~3,700 |

**Largest cuttable block:** lines 38–93, "Design Thinking" + "New deck design process" + "Reading a reference file" (measured 8,763B, **40% of the file**). This is almost entirely class (d) rationale — four numbered paragraphs on "why decks need a signature," "how closely to follow a reference," etc. It is well-written prose but is advisory/motivational rather than mechanical; a design-conscious model plausibly needs a fraction of this to produce the same behavior (e.g., "match the deck's existing palette/type/spacing when editing; take a strong point of view when building from scratch" compresses ~80% of this into two sentences).

### figma-generate-diagram (10,272B)
Largest cuttable block: lines 59–71, "Step 4: Garbage in, garbage out" (measured, ~1,300B est.) — five bullet points on "useful sources of context" (source code, user documents, existing Figma files, other MCP tools, asking the user) that read as generic good-agent-practice advice not specific to Mermaid/FigJam diagramming; could be a single sentence ("ground the diagram in real sources — code, docs, or the user — never invented entities").
Class mix (est.): (b) workflow 35%, (a) directive (universal constraints, 9 numbered rules) 25%, (g) routing to 6 type-specific reference docs 20%, (d) rationale 15%, (f) gotchas 5%.
**(h):** none of note — routing to Mermaid-syntax constraints is skill-owned since `generate_diagram`'s tool description can't reasonably encode "don't use `\n` in labels" for every Mermaid diagram type.

### figma-use-figjam (6,943B)
Class mix (est.): (g) routing (12-entry reference-doc list, ToolSearch batching advice) 35%, (a) directive (FigJam-only-API warnings) 25%, (f) gotchas (`get_metadata` doesn't work, `console.log` not returned) 20%, (c) example (ToolSearch batching snippet) 10%, (d) rationale 10%.
Largest cuttable block: lines 24–37, "Loading Reference Docs Efficiently" + "Deferred Tools — Batch-Load Schemas" (measured ~1,000B est.) — generic ToolSearch-batching advice duplicated near-verbatim in figma-use itself (line 13: "batch-load all their schemas in a single `ToolSearch` call") and in most other Figma skills' intros. This ToolSearch-batching paragraph is a good candidate for cross-skill dedup (it appears with near-identical wording in figma-use, figma-use-figjam, and is implied in others) — a case the lead's 0.3% duplicate-paragraph number likely already captured, since this one genuinely is close to verbatim.
**(h):** none.

### figma-use-motion (6,910B)
Class mix (est.): (e) API surface facts (exposed motion API list) 25%, (d) rationale/procedure ("Verifying the animation" cost-planning prose) 30%, (a) directive 20%, (g) routing 15%, (f) gotchas 10%.
Largest cuttable block: lines 53–67, "Verifying the animation" (measured ~1,900B est.) — three numbered sub-steps of screenshot/render-cost planning ("Pick the moments first," "Size to what you must read," "Set fps just high enough") that read as generic cost-conscious-tool-use advice rather than motion-specific fact; could compress to "render 4–6 key frames at low res/fps first, raise only if detail is needed."
**(h):** none.

### figma-shaders (5,612B) / figma-generative-plugins (4,852B) — near-identical structure, near-identical diffs
Class mix (est., both): (a) directive (create/update workflow numbered steps) 35%, (b) workflow 25%, (f) gotchas (build-error retry-once rule) 20%, (g)/(i) Completion-URL construction 20%.
**Largest cuttable block (both, confirmed by diff, not estimated):** the "Completion" section's `try-tool-resource-content-id` URL-construction paragraph — figma-shaders lines 48–56 (measured, part of the file's tail) and figma-generative-plugins lines 47–53. Both are **entirely deleted** in figquery (see below) — this is the strongest "measured, not estimated" cuttable-block evidence in the small-file group, since the authors independently reached the same conclusion for both files.

### figma-swiftui (4,049B)
Class mix (est.): (g) routing (direction-picker table + reference table) 30%, (e) API/mapping facts (SF Symbols, HIG color tokens) 35%, (a) directive 15%, (d) rationale 20%.
**(h) flag:** lines 24 ("`get_design_context` is the read tool for Figma… URL → tool args: `figma.com/design/:fileKey/:fileName?node-id=:nodeId`…") restates the exact same fileKey/nodeId URL-parsing mechanic as figma-code-connect's Step 1 table and figma-implement-motion's Prerequisites — the third of at least three near-identical restatements of one URL-parsing fact across the corpus (~150–200B each, ~500B combined). None of the three defer to `get_design_context`'s own tool description for this, even though it is exactly the kind of "parameter mechanics" the task says `figma-design-to-code` correctly delegates.

### figma-design-to-code (4,983B) — the reference "good pattern"
This is the smallest fully-formed workflow skill and the one the task specifically flags as doing it right: line 11 states outright, "Parameter mechanics (nodeId/fileKey/branchKey extraction, URL parsing, `format`/`query` options, response shape) live on the `get_design_context` tool description itself — follow them there." It does not restate the URL table that figma-code-connect, figma-implement-motion, and figma-swiftui each restate independently.
Class mix (est.): (a) directive 40% (heavy MUST/MUST NOT density — this is the file the lead's 8%-of-sentences MUST-rate would show as an outlier on the high side), (b) workflow 25%, (f) error recovery 15%, (g) 10% (explicit delegation to tool description, i.e. *anti*-(h)), (d) 10%.
**(h):** essentially zero — this file is the corpus's negative control for the waste category.

### figma-create-new-file (3,946B)
Class mix (est.): (b) workflow (planKey decision tree, 3 steps) 35%, (a) directive 20%, (e) API/return-shape facts 20%, (g) routing (hand-off to figma-use, cross-link to figma-use-slides gotcha) 15%, (d) 10%.
Largest cuttable block: lines 74–81, "Editor-specific notes → Slides — newly created files have an empty grid" (measured ~700B est.) — a Slides-only gotcha bolted onto a generic file-creation skill; it duplicates content that logically belongs in (and is cross-linked to) `figma-use-slides → slide-grid.md`. Borderline (h)-adjacent: it pre-empts a gotcha owned by another skill's reference doc rather than just linking to it (it does link, but also restates the mechanic in ~3 sentences first).

## Cross-cutting class-(h) findings (beyond individual skills)

1. **fileKey/nodeId URL-parsing recipe** is independently restated, in different wording, in at least **figma-code-connect** (Step 1 table), **figma-implement-motion** (Prerequisites), and **figma-swiftui** (Shared context #1) — roughly 150–250B each, ~600B combined. `figma-design-to-code` is the one skill that correctly delegates this to the `get_design_context` tool description instead. This is a textbook case of the task's target waste category: several skills re-derive a tool's own parameter contract because none of them trust the tool description to carry it, except the one skill explicitly held up as the good pattern.
2. **`get_libraries`/`search_design_system` pagination and scoping mechanics** are fully re-explained in both `figma-generate-design` (~1,700B) and `figma-generate-library` (~1,200B) — different wording, same content (two-list return shape, `libraries_available_to_add_next_offset` pagination, `includeLibraryKeys` scoping). ≈2,900B of duplicated tool-parameter documentation that a single shared reference (or the tool description itself) could carry once.
3. **figma-use's own Critical Rules are restated by a co-loaded prerequisite skill**: `figma-generate-library` repeats ~5 of figma-use's rules (return convention, `figma.notify()` ban, 0–1 color range, font-loading) even though it mandates loading figma-use first. This is class (h) one level removed — restating a *skill's* contract instead of a *tool's* — and is the same fix (trust the already-loaded dependency, cross-reference instead of re-teach).
4. **ToolSearch schema-batching advice** ("load all Figma MCP tool schemas in one `select:` call") appears near-verbatim in `figma-use` and `figma-use-figjam`, and is functionally implied wherever a skill lists multiple Figma MCP tools. This is close enough to identical wording that it likely falls inside the lead's measured 0.3% cross-skill duplicate-paragraph figure already.

## skills/ vs skills-figquery/: what actually changed (8 differing skills)

Diff sizes: figma-use 616 lines, figma-generate-design 462, figma-generate-library 255, figma-design-to-code 84, figma-shaders 35, figma-use-slides 25, figma-generative-plugins 12, figma-use-figjam 11.

**The single biggest finding: figma-use's and figma-generate-design's size drop is substantially confounded by a different underlying tool surface, not pure prompt editing.** The figquery variant's `use_figma` exposes a declarative plan-builder global, `$fig` (`$fig.autoLayout(...)`, `$fig.text(...)`, `$fig.query(...).set(...)`, `$fig.instance(componentKey, {props})`), that auto-flushes, auto-batches mutations, auto-orders `layoutMode` before other props, auto-imports library components/variables/styles from a `search_design_system` key with no separate `importComponentByKeyAsync` step, and returns created/updated IDs without an explicit `return`. Because of this, the entire "5. Efficient APIs" section of `skills/figma-use` (`node.query`/`node.set`/`createAutoLayout`/`placeholder`/`.screenshot()`, 6,387B) is **deleted outright** rather than trimmed, along with the "Page Rules," "Pre-Flight Checklist" (all 20 items — most were about raw-API footguns `$fig` no longer allows), and the entire error-message table keyed to `safeToRetryWithoutCanvasRead` (a flag that doesn't appear in the figquery version at all). What replaces it is a "copy these patterns" cookbook of ~10 short `$fig` snippets plus a renumbered, much shorter Critical Rules list (19 items, but each is 1–3 lines instead of a paragraph). Net: 34,645B → 23,354B (−33%), but the reduction is mostly *because there is genuinely less to teach*, not because the same lessons were said more tersely. This means figma-use is **not** a clean natural experiment in prompt compression — it's a natural experiment in **API design absorbing prompt complexity**, which is a distinct and arguably more important lever than anything achievable by editing prose alone.

`figma-generate-design`'s diff shows the same confound propagating downstream: Step 3 and Step 4's entire imperative `figma.createAutoLayout()` + manual `appendChild()` + manual `x`/`y` positioning code (the exact pattern `figma-use-slides` Rule 2 warns is an "intermittent bug" — see the appendChild-before-x/y footgun) is replaced by `$fig.autoLayout({...}, [children])` with `placeholder: true` sections that "auto-flush" — eliminating an entire class of bugs the original skill spent prose warning about. Separately, `figma-generate-design` also drops two purely prose-level things without a tool-surface reason: the "Componentize repeated and reusable elements (required)" section (~700B) and the entire "Assert the font family is correct" sub-section + its `discover-product-font.md` cross-reference (~700B) — these are genuine editorial cuts, not tool-driven, and are lower-confidence wins (dropping font-family verification looks like a capability loss, not compression, unless figquery's environment guarantees font fidelity some other way not visible in this diff).

**figma-generate-library is the cleanest pure-compression example in the set.** Its diff (255 lines) replaces the "1. The One Rule That Matters Most" prose contract + "Stable Task IDs" naming rules + four separate `- [ ]` Phase-0–4 checklists (98 lines, ~4,650B) with one ASCII-art block enumerating the same five phases and their checkpoints in 61 lines (~2,700B) — a 42% cut of that specific span with no loss of the phase/step/exit-criteria information, achieved purely by picking a denser notation. It also collapses "6. Decision Forks" (a 3-row table plus rationale) into "6. User Checkpoints" (a 6-row table), converting an ask-only-when-ambiguous policy into a mandatory-gate-per-phase policy — this is a **behavioral change**, not just compression (more user-facing checkpoints, not fewer bytes for the same behavior), worth flagging since it means the two variants are not behavior-equivalent.

**figma-design-to-code is a counter-example: it grew (4,983B → 6,554B, +32%)**, not shrank. figquery added an explicit "Gate Protocol" (G1/G2-G4/G5 checkpoints, each requiring quoted evidence before proceeding) layered on top of the existing MUST-rules. This shows the corpus isn't under uniform compression pressure — the same authors added ceremony to one skill in the same commit family they cut ceremony from in others, suggesting the size differences are per-skill editorial judgment calls, not a single consistent "make Cursor's version leaner" policy.

**figma-shaders and figma-generative-plugins** show the smallest, cleanest cuts: both drop the "Completion" section's `try-tool-resource-content-id` deep-link URL-construction paragraph (~500–700B each) entirely — likely because Cursor's UI doesn't support opening a new Figma file via that URL scheme the way Claude Code's does, i.e., a platform-capability difference again, not a prose-density difference. figma-shaders additionally removes the entire `isAnimated`/`usesMouse` metadata-authoring guidance and replaces it with a flat "shaders must be static" constraint — a real *capability* cut (Cursor's shader tool apparently doesn't support animated shaders), not a wording compression.

**figma-use-slides** cuts the "Choosing How to Build a Slides Deck" `generate_deck`-vs-`use_figma` comparison section (16 lines, ~700B) outright — plausible confound: Cursor's environment may not expose a `generate_deck` tool at all, making the comparison moot rather than compressible.

### Bottom line for the natural experiment

Of the 8 differing skills, only **figma-generate-library** and the small `try-tool-resource-content-id` cuts in **figma-shaders/figma-generative-plugins** are clean prompt-compression evidence (same tool, same capability, denser prose/notation). **figma-use** and **figma-generate-design** — the two largest size drops — are majority explained by a different tool surface (`$fig`) doing work the prose used to do, which is a real and important compression lever but is *not* something achievable by rewriting the same MCP tool's SKILL.md alone; it requires changing the tool. **figma-design-to-code** moved the opposite direction. Any headline "figquery proves skills can be cut by N%" claim needs to separate these two mechanisms, or it overstates what pure prompt/prose editing can achieve.
