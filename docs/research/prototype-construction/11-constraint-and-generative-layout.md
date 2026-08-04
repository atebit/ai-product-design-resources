# Constraint Solvers, Parametric Design, and Generative Layout

**Scope:** This report surveys the domains where designers *state intent or constraints* and a deterministic solver produces the concrete artifact — constraint-based UI layout (Cassowary/Auto Layout through CSS Grid), parametric CAD (OpenSCAD, Grasshopper, feature-tree modelers, constraint sketching), shape grammars (Stiny, CityEngine CGA), document layout engines (TeX's box-and-glue, Typst, CSS pagination, InDesign), diagrams-as-code auto-layout (Graphviz, Mermaid, D2, ELK), and goal-driven generative design (Autodesk generative design, topology optimization). Each of these fields spent decades learning where the "human states *what*, machine decides *how/where*" split works, where it collapses, and what its failure modes feel like to practitioners. Those lessons map with unusual precision onto our construction-file architecture — where an LLM emits a small schema-validated intent file and a deterministic builder expands it into a working prototype — because that architecture *is* a parametric design system with an LLM at the parameter-authoring seat. The closing sections translate each domain's scars into concrete design rules for the construction-file pipeline.

---

## Table of contents

1. [Constraint-based UI layout: Cassowary → Auto Layout → the retreat to simpler models](#1-constraint-based-ui-layout)
2. [Parametric CAD: code-as-geometry, graphs, and feature trees](#2-parametric-cad)
3. [Shape grammars and rule-based design](#3-shape-grammars-and-rule-based-design)
4. [Document layout engines: encoding "feel" as an objective function](#4-document-layout-engines)
5. [Diagrams-as-code: layout fully owned by the solver](#5-diagrams-as-code-auto-layout)
6. [Generative and optimization-driven design](#6-generative-and-optimization-driven-design)
7. [Lessons for construction-file prototyping](#7-lessons-for-construction-file-prototyping)
8. [Failure stories and tradeoffs](#8-failure-stories-and-tradeoffs)
9. [Open questions](#9-open-questions)

---

## 1. Constraint-based UI layout

### 1.1 Cassowary: the solver that started it

The [Cassowary algorithm](https://en.wikipedia.org/wiki/Cassowary_(software)) (Badros, Borning & Stuckey, ~1997–2001) is an **incremental linear arithmetic constraint solver** designed specifically for interactive UI layout. Its model:

- The layout is a system of **linear equalities and inequalities** over variables (view edges, centers, sizes): `button.left = label.right + 8`, `panel.width ≥ 320`.
- Constraints carry **strengths**: some are *required*, others *preferred* at varying priority. The solver finds an assignment satisfying all required constraints while minimizing weighted violations of the preferred ones (a hierarchy of soft objectives layered on a dual-simplex LP core — see the [theory docs](https://cassowary.readthedocs.io/en/latest/topics/theory.html)).
- The killer feature is **incrementality**: adding/removing one constraint, or nudging an "edit variable" during a drag, repairs the existing solution rather than re-solving from scratch — this is what made it fast enough for interactive use in the late 90s.

Cassowary is a genuinely elegant piece of work, and it spread widely: Apple's Auto Layout, GTK's Emeus, the Rust `cassowary-rs` crate (used by early tui-rs/Ratatui terminal layout), JS ports (kiwi.js), Grid Style Sheets (an attempted Cassowary-for-the-web by The Grid). It is the *maximal* point on the expressiveness axis for declarative layout: any linear relationship between any two boxes, in any direction, at any priority.

The rest of this section is the industry spending fifteen years discovering that maximal expressiveness was the problem.

### 1.2 Apple Auto Layout: constraints at industrial scale, and why developers struggled

Auto Layout (macOS Lion 2011, iOS 6 2012) put Cassowary underneath UIKit. Every view's position/size is derived from a constraint system. Apple's own [Auto Layout Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/AnatomyofaConstraint.html) is a case study in how much conceptual machinery the model requires:

- **Constraint anatomy**: `item1.attribute = multiplier × item2.attribute + constant`, with a relation (=, ≥, ≤) and a **priority 1–1000** (1000 = required).
- **Intrinsic content size**, translated into four generated constraints per view via **content-hugging priority** (resist growing) and **compression-resistance priority** (resist shrinking) — two extra priority dials per axis per view that most developers never fully internalized.
- **Two distinct global failure modes**, each with its own [error taxonomy](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/TypesofErrors.html):
  - **Unsatisfiable layouts** — required constraints conflict. At runtime UIKit does *not* crash; it prints the infamous wall of `NSAutoresizingMaskLayoutConstraint` console spam, **picks a constraint to break at random**, and carries on with a layout that may or may not look broken. The error is global (a solver-wide contradiction), but the developer must map it back to which local intent was wrong.
  - **[Ambiguous layouts](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/AmbiguousLayouts.html)** — the system is under-constrained (or has equal-priority optional constraints tied in conflict) and has *multiple valid solutions*; Auto Layout silently chooses one. Apple's docs concede that Interface Builder cannot detect all ambiguities and "many errors can be found only through testing."

**Why practitioners revolted** (a consistent story across a decade of blog posts, conference talks, and the migration behavior Apple itself responded to):

1. **Non-local reasoning.** A constraint system has no reading order. To predict where one view lands you must mentally run the solver over every constraint that transitively touches it. Debugging means reading a *global* contradiction report and guessing the *local* culprit. This is the same cognitive failure mode as Prolog and spreadsheet dependency webs.
2. **Priorities as a second-order system.** When optional constraints conflict, the solver breaks the lowest-priority one; equal priorities are ambiguous. Developers ended up doing arithmetic on magic numbers (749 vs 750 vs 751) to steer tie-breaking — encoding intent in a side channel.
3. **Verbosity.** A trivially centered label needed multiple constraint objects; whole DSL ecosystems (SnapKit, Masonry, Cartography, PureLayout) existed purely to compress the API — a strong signal the abstraction was at the wrong altitude.
4. **Performance cliffs.** Solving is fast for small systems but degrades badly with deeply nested `UIStackView`s (which compile to constraints); community measurements found nested-stack layouts a large constant factor slower than manual frame math, and Apple engineers spent WWDC sessions ("High Performance Auto Layout", WWDC 2018) teaching developers how not to trigger pathological churn (constraint removal/re-addition per frame).
5. **The feedback-loop trap.** Because constraints are bidirectional and continuous, it was easy to create layouts that oscillate or thrash between solutions across passes.

Apple's own trajectory is the verdict: first **stack views** (2015) — a box-model container abstraction *on top of* constraints so most developers could stop writing constraints — then SwiftUI (2019), which abandoned the constraint solver entirely.

### 1.3 SwiftUI's proposal/response protocol: the deliberate simplification

SwiftUI replaced global constraint solving with a **one-pass, tree-shaped negotiation** — now exposed publicly as the [Layout protocol](https://swiftui-lab.com/layout-protocol-part-1/) (iOS 16):

1. Parent **proposes** a size to each child (`ProposedViewSize`, a pair of optional CGFloats — a proposal can even be nil/unspecified, meaning "your ideal size").
2. Child **responds** with the size it wants (`sizeThatFits`), consulting its own children recursively.
3. Parent **places** each child (`placeSubviews`) within the bounds it was given.

Properties worth naming, because they are exactly what Auto Layout lacked:

- **Local reasoning**: information flows strictly down (proposals) and up (responses) along the view tree. There is no global system; nothing on the other side of the screen can move your view.
- **No unsatisfiability, no ambiguity**: a child can respond with any size — the parent then decides what to do about overflow. There is no solver to fail; every negotiation terminates with *some* answer, deterministically.
- **Two methods, value types**: the entire layout contract is `sizeThatFits` + `placeSubviews` — versus the constraint anatomy + priorities + hugging/compression machinery.

The tradeoff is real: cross-hierarchy alignment (align this label with a field in a *different* branch of the tree) needs explicit escape mechanisms (alignment guides, preference keys) instead of just drawing a constraint between them. SwiftUI accepted that loss of expressiveness to purchase predictability. This is the single most important precedent in this whole report: **the platform that owned the world's best constraint solver retreated to a simpler compositional protocol, on purpose.**

### 1.4 CSS Flexbox and Grid: the declarative DSLs that won the web

The web never adopted general constraints (Grid Style Sheets tried, briefly, and died). What won instead are two **specialized layout DSLs** with fixed, well-understood algorithms:

- **Flexbox** — one-dimensional distribution: main axis, cross axis, `grow`/`shrink`/`basis`. A tiny vocabulary encoding the 90% case of "row or column of things sharing space."
- **CSS Grid** — two-dimensional track-based placement, with `fr` units, `minmax()`, `auto-fit`/`auto-fill` giving *bounded* flexibility inside a fixed structural model.

Both are technically constraint systems inside the browser engine, but the *authoring surface* exposes no solver: you pick a container behavior from a small enum-like vocabulary, and the resolution algorithm is fully specified and deterministic. Notably, Flexbox is still considered confusing enough that Subform's founders wrote ["Why not flexbox?"](https://medium.com/subform/why-not-flexbox-ddbe60396163) — "the concepts in flexbox can be hard to learn and behave surprisingly" — and built an even smaller uniform model (every element: space-before / size / space-after per axis; parents position parent-directed children in a stack or grid). The direction of travel across the whole industry is monotonic: **smaller layout vocabularies, stronger guarantees.**

#### grid-template-areas: a mini construction-DSL hiding in CSS

[`grid-template-areas`](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_template_areas) deserves special attention as a design precedent for construction files:

```css
grid-template-areas:
  "header header"
  "nav    main"
  "footer footer";
```

- It is an **ASCII-art picture of the layout that is also the layout program** — "the CSS itself is a diagram of the layout" ([CSS-Tricks](https://css-tricks.com/almanac/properties/g/grid/grid-template-areas/)). Named regions; children bind by name (`grid-area: header`), not by coordinates.
- It has **validity rules a machine can check trivially**: every named area must form a rectangle; a non-rectangular (L-shaped) area makes the whole declaration invalid and it is rejected wholesale — fail loudly, not partially.
- Rebinding content to a different region is a one-word change; restructuring the layout means redrawing a tiny picture, and nothing about the children needs to change.

This is almost exactly the shape of a good construction-file layout node: a compact, human-diffable, schema-checkable declaration of *regions*, with content attached to region names rather than positions. It's the strongest existing proof that "declarative region map + name-bound slots" is both LLM-friendly (tiny token count, enum-checkable) and human-reviewable at a glance.

---

## 2. Parametric CAD

CAD is the oldest and largest industry built on "human writes parameters and operations; deterministic kernel regenerates geometry." It has three distinct authoring models, each with lessons.

### 2.1 OpenSCAD: the programmers' CAD (code → geometry)

[OpenSCAD](https://openscad.org/) is a functional, declarative language whose programs *are* the model: primitives (`cube`, `cylinder`, `sphere`) composed with CSG booleans (`union`, `difference`, `intersection`) and transforms, compiled into a CSG tree and rendered deterministically ([history](https://novedge.com/blogs/design-news/design-software-history-openscad-revolutionizing-cad-with-script-based-3d-modeling-for-precision-and-automation)).

What matters for us:

- **Source of truth is the text.** The rendered geometry is a pure function of the script — the exact property our builder gives construction files. Version control, diffing, code review, and parameter sweeps all come for free; this is why OpenSCAD dominates open-source hardware (Thingiverse "Customizer" is literally a form UI over OpenSCAD parameters — one script, N artifacts).
- **The escape hatch is total but the ergonomics are brutal.** You can express anything, but there is no direct manipulation: HCI research on OpenSCAD users ([Gonzalez et al., 2024](https://arxiv.org/pdf/2408.01796)) documents the core pain — users constantly perform *spatial reasoning through code*, editing numbers and waiting for re-render to see if a hole lines up. Follow-on research on [bidirectional programming for CSG CAD](https://arxiv.org/pdf/2408.01801) tries to let users tweak the rendered output and write the change back into the program — exactly our "surgical patch + source-of-truth" problem, and evidence that round-tripping direct manipulation back into a generative program is a research-grade problem, not a weekend feature. (Our doc 05 reached the same conclusion from the other direction: don't build full code→construction round-tripping.)
- **Determinism enables caching.** OpenSCAD caches CSG subtree evaluations; unchanged subtrees don't recompute. Pure function + tree structure = incremental rebuild — same recipe as Typst (§4.2) and same one our manifest/builder should exploit.

### 2.2 Grasshopper: parametric graphs for people who don't code

[Grasshopper](https://www.rhino3d.com/features/#grasshopper) (Rhino) is the same idea with a **dataflow graph** instead of text: nodes are operations, wires are data, sliders are parameters; the geometry regenerates live as you drag ([overview](https://novedge.com/blogs/design-news/design-software-history-grasshopper-shaping-the-future-of-parametric-design-in-architecture-through-visual-programming-and-computational-innovation)). Instead of drawing a wall, "you describe how the wall should be generated" as a chain of operations.

- It proved that **non-programmers will happily author generative programs** when the representation matches their mental model (visible dataflow, instant feedback) — Zaha Hadid Architects, facade engineering, pavilion design all run on it.
- **Instant re-execution is the product.** The value of parametric design is realized at the moment a slider drags and the whole model updates in real time. A construction-file pipeline whose rebuild takes 30 seconds loses the property that makes parametric authoring feel magical; builder speed is a UX feature, not an implementation detail.
- Grasshopper definitions also exhibit the pathology: real-world graphs grow into thousand-node "spaghetti canvases" that only their author can navigate. Vocabulary without curation produces the same mess as code — which supports our catalog-governance stance (patterns curated, escape-hatch usage monitored).

### 2.3 Feature trees / history-based modeling: our patch-invalidation problem, 30 years early

SolidWorks, PTC Creo, Autodesk Fusion, CATIA are **history-based parametric modelers**: a part is an *ordered list of features* (sketch → extrude → cut → fillet → pattern), each referencing geometry produced by earlier features. Edit an upstream feature and the kernel **regenerates** everything downstream.

This is structurally identical to our patch model (construction file = ordered/derived structure; builder = regeneration), and CAD's chronic disease is therefore required reading:

- **Rebuild errors** are the canonical failure: "most rebuild failures come from the parametric parent/child relationship — you edited, deleted, or replaced geometry used by later features" ([Mechanitec](https://mechanitec.ca/how-to-fix-rebuild-errors-solidworks/), [TriMech](https://store.trimech.com/blog/understand-solidworks-modeling-errors-and-fix-them-with-no-difficulty)). A fillet references an edge; an upstream cut removes that edge; the fillet's reference *dangles* and the feature fails — along with everything downstream of it.
- The reference problem has a name — **topological naming**: features refer to faces/edges by internal IDs that the kernel may reassign when upstream topology changes, so even a *successful* regeneration can attach a feature to the *wrong* face. FreeCAD's decade-long "topological naming problem" saga is the open-source community rediscovering how hard stable references are.
- The **debugging workflow is instructive**: SolidWorks rebuilds top-down, marks the first failing feature in the tree, and users drag a *rollback bar* to just before the failure to isolate it ([forum practice](https://forum.solidworks.com/thread/93282)). Failures are *ordered, localized, and attributed* — the tree tells you which feature broke and why (dangling reference, "cut has nothing to cut," "up-to-surface has no surface"). Painful, but vastly better than a global constraint-solver contradiction.
- The industry's mitigations are a design checklist for us: **stable IDs over positional/topological references** wherever possible; **resilient modeling** disciplines (reference early, stable geometry — datum planes — rather than late derived geometry); Onshape's cloud rewrite invested specifically in better deterministic regeneration and reference healing; **direct modeling** (history-free push-pull) emerged as the escape hatch when history editing got too brittle, and hybrid systems (Fusion) let you switch per-body.

Our architecture already chose id-keyed children over positional arrays (doc 05). CAD says: that's necessary but not sufficient — you also need *dangling-reference detection at patch time* (does this patch's target id still exist? do downstream nodes reference anything this patch deletes?) and a *rollback-bar-equivalent* error report: "patch invalidated node `settings-form.actions` because its slot parent was removed."

### 2.4 Constraint sketching: the one place UI-style constraints thrived

Inside every feature-tree modeler is a 2D **sketcher** where geometry is dimension-driven: you draw roughly, then add constraints (coincident, parallel, tangent, dimension = 25mm) and a geometric constraint solver positions everything. This is the same math family as Auto Layout — and it *succeeded* with a mass audience. Why?

- **Degrees-of-freedom accounting is surfaced constantly.** The sketcher reports remaining DOF; a sketch is *under-constrained* (DOF > 0, geometry shown in one color and draggable), *fully constrained* (DOF = 0, locks solid, changes color), or *over-constrained* (solver rejects the new constraint immediately and offers which conflicting one to remove) ([FreeCAD solver docs](https://free-cad.sourceforge.net/SrcDocu/d9/d9b/classSketcher_1_1Sketch.html), [Hendoi explainer](https://www.hendoi.in/blog/geometric-constraint-solvers-explained)). Compare Auto Layout, which discovers conflicts at runtime and breaks a constraint silently.
- **The domain is small and visual**: constraints between a few dozen curves in one plane, with immediate visual feedback per added constraint, not hundreds of views across a dynamic screen.
- Recent research ([Aligning Constraint Generation with Design Intent in Parametric CAD](https://arxiv.org/html/2504.13178v1), 2025) is directly on-point for us: LLMs generating sketch constraints produce plausible-looking but intent-violating constraint sets unless trained/steered with solver feedback — i.e., even in a mature constraint domain, **generation needs a validate-and-repair loop against the deterministic solver**, which is exactly our layered-defense stage 3.

The lesson is not "constraints bad" but "constraints work when the system continuously reports its constraint-state (under/fully/over) and rejects contradictions at *edit time*, in a bounded visual domain."

---

## 3. Shape grammars and rule-based design

### 3.1 Stiny's shape grammars

George Stiny and James Gips introduced **shape grammars** in 1971 ("Shape Grammars and the Generative Specification of Painting and Sculpture"), formalized through [Stiny 1980]: a grammar is a set of rules `A → B` where A and B are *shapes*; generation starts from an initial shape and repeatedly finds a rule whose left side matches (under transformation) part of the current shape and replaces it. Landmark results showed small rule sets generating entire *families* of coherent designs: Palladian villa plans (Stiny & Mitchell 1978), Frank Lloyd Wright prairie houses (Koning & Eizenberg 1981), Mughal gardens, Queen Anne houses.

The deep claims relevant to us:

- **A style is a grammar.** A coherent design language can be captured as a finite vocabulary + rules, and everything the grammar derives is "in the style" *by construction*. This is the theoretical backbone of our claim that a pattern catalog + composition rules yields on-system prototypes by construction rather than by review.
- **Generative power vs. analyzability tradeoff**: parametric shape grammars (rules with parameters) are far more expressive but much harder to implement and verify; most practical systems retreated to **set grammars** — rules over labeled symbolic objects rather than raw geometry — because matching arbitrary sub-shapes is computationally nasty. Practicality lives at the symbolic level. Our construction files are firmly set-grammar: rules over named pattern instances, not pixels.

### 3.2 CityEngine CGA: shape grammars industrialized

Esri's [CityEngine](https://www.esri.com/en-us/arcgis/products/arcgis-cityengine/overview) implements **CGA (Computer Generated Architecture)** shape grammar (Müller et al., ["Procedural Modeling of Buildings"](https://www.researchgate.net/publication/220183823_Procedural_Modeling_of_Buildings), SIGGRAPH 2006; [CGA reference](https://doc.arcgis.com/en/cityengine/2019.0/cga/cityengine-cga-introduction.htm)). A CGA rule file progressively refines shapes: a footprint extrudes into a mass, splits into floors, floors split into facade tiles, tiles into window/wall/door — a **derivation tree** from coarse to fine:

```
Lot --> extrude(height) Building
Building --> comp(f) { front: Facade | side: Wall }
Facade --> split(y) { groundHeight: GroundFloor | ~1: UpperFloors }
UpperFloors --> repeat split(y) { floorHeight: Floor }
Floor --> repeat split(x) { tileWidth: Tile }
Tile --> split(x){ ~1: Wall | windowWidth: Window | ~1: Wall }
```

Properties worth stealing:

- **Attributes at the top, rules below**: `attr height`, `attr tileWidth` are exposed as sliders; one rule file × attribute ranges = a whole city of varied-but-coherent buildings. This is precisely "one construction file → N variants" (§6).
- **Relative + absolute splits** (`~1` floating vs fixed sizes) — the same flexible/rigid split vocabulary as flexbox `fr`/`px`, independently reinvented, because it's the minimal vocabulary for distributing space.
- **Context-sensitive rules and occlusion queries** keep generated detail *valid*: windows check they're not intersecting an adjacent wall; doors snap to street level. Semantic lint rules, in-grammar.
- **Stochastic rules with seeds**: CGA rules may choose among alternatives probabilistically, but generation is seeded — variety is reproducible. (Matches our seeded-faker stance for sample data.)
- Applied at scale for real exploration — e.g., [generating alternative massing proposals for the Louvre](https://www.researchgate.net/publication/279680888_Generating_alternative_proposals_for_the_Louvre_using_procedural_modeling) and [master planning](https://www.researchgate.net/publication/226887344_Using_Shape_Grammars_for_Master_Planning); the pattern-to-grammar lineage runs straight back to [Stiny's formal work](https://www.sciencedirect.com/science/article/pii/S2095263520300662).

**The direct analogy:** a construction file is a *derivation record* in a UI grammar. Patterns = non-terminals ("SettingsForm"), primitives in slots = terminals, slot rules = the grammar's context conditions. CGA's success shows that a two-level scheme — human/LLM authors the *top-level derivation choices and attributes*; grammar machinery owns *everything below the tile level* — produces both high validity and high perceived design quality. CGA's authoring pain (rule files are genuinely hard to write; only specialists author them, everyone else adjusts attributes) also foreshadows our division of labor: catalog authors are few and skilled, construction-file authors (the LLM) only pick from the menu.

---

## 4. Document layout engines

### 4.1 TeX: the "spacing feel" encoded as math

TeX (Knuth, 1978) remains the canonical proof that **aesthetic judgment can be compiled into a deterministic objective function**. The model ([Knuth & Plass, "Breaking Paragraphs into Lines," 1981](https://gwern.net/doc/design/typography/tex/1981-knuth.pdf)):

- Content is a sequence of **boxes** (rigid: characters, words), **glue** (flexible space with natural size + *stretchability* + *shrinkability*), and **penalties** (numeric costs for breaking at a point; negative = encouraged, 10000 = forbidden).
- Line breaking minimizes total **badness** — roughly the cube of how far each line's glue is stretched/shrunk from natural — plus penalties (hyphenation, consecutive hyphens, visual incompatibility between adjacent lines' tightness) via **dynamic programming over the whole paragraph** ([algorithm overview](https://en.wikipedia.org/wiki/Knuth%E2%80%93Plass_line-breaking_algorithm)): a globally optimal, fully deterministic solve. Change nothing → get byte-identical output, forever (Knuth froze TeX at version π-converging).
- The same box/glue/penalty machinery handles vertical layout: page breaking, `\vfill`, widow/orphan penalties (`\clubpenalty`, `\widowpenalty`), math spacing. Every typographic "feel" judgment — how bad is a loose line, how bad is a lone line atop a page — is a *number in a cost model* that the optimizer trades off.

Why this matters enormously for us: TeX demonstrates that "make the spacing feel right" does not require taste at generation time — it requires taste **once**, at engine-authoring time, encoded as rules/weights, after which a deterministic optimizer applies it uniformly forever. Authors write `\section{...}`; they do not, and cannot, hand-adjust inter-word spacing. The design system's spacing scale, density rules, and rhythm are our badness function; the builder is our optimizer; the construction file should be as spacing-silent as a `.tex` source. (LaTeX's ecosystem adds the cautionary half: when users *do* fight the optimizer — `\vspace` hacks, `\\` forced breaks scattered through a document — the document rots; overrides that bypass the model are debt.)

### 4.2 Typst: the modern rebuild — and the incremental-compilation lesson

[Typst](https://typst.app/) (Mädje & Haug, 2019–, [architecture doc](https://github.com/typst/typst/blob/main/docs/dev/architecture.md)) is a ground-up TeX successor: clean markup, real programming language, same commitment to engine-owned layout. Its headline engineering achievement is **incremental compilation** via [comemo](https://laurmaedje.github.io/posts/comemo/) ("constrained memoization"):

- Layout, evaluation, and parsing are **pure functions**, memoized with *tracked* inputs: a memoized function records which parts of its context it actually touched, so a cached result is reused whenever *those parts* are unchanged — even if the rest of the document changed.
- The reparser is incremental (only the edited span reparses); evaluation memoizes at module/closure granularity; layout memoizes subtrees.
- Result: edits recompile in **milliseconds** — the associated thesis ([Fast Typesetting with Incremental Compilation](https://www.researchgate.net/publication/364622490_Fast_Typesetting_with_Incremental_Compilation)) measured incremental edits 3.4×–9895× faster than LaTeX, with the explicit goal that **preview refresh time is proportional to edit size, not document size**.

That last sentence is a design requirement for our builder, verbatim. A patch-based iteration loop only *feels* like iteration if rebuild cost scales with the patch. The recipe is available to us cheaply because we already have the prerequisites: deterministic pure expansion + a manifest of per-node/per-file hashes → rebuild only files whose construction-file inputs changed. Typst also validates the two-layer authority split: users style via `set`/`show` rules (declarative intent); the layout engine owns line/page breaking absolutely.

### 4.3 CSS pagination and fragmentation: what half-owned layout looks like

The web's continuous-scroll model never fully absorbed *paged* layout. The [CSS fragmentation](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fragmentation) and [paged media](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_paged_media) modules define how content breaks across pages/columns (`break-before/after/inside`, `orphans`, `widows`, `@page` margins) — but support is chronically patchy: advanced `@page` features (margin boxes, named strings, bleed/marks) are unimplemented in browsers, and fragmentation "has to be specified and implemented for each layout method" separately (how does a grid fragment? flexbox? tables?), which stalled for years ([state of print stylesheets](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/)). The ecosystem's answer is [Paged.js](https://www.pagedmedia.org/) — a JS polyfill that re-implements pagination *on top of* the browser — and professional print workflows mostly use dedicated engines (Prince, Antenna House) instead.

The structural lesson: pagination fails on the web because **breaking is a global optimization but CSS's layout authority is distributed** across independent per-element properties and per-layout-mode algorithms. TeX succeeds because one optimizer owns the whole page-break decision with a unified cost model. When responsibility for a global concern (page flow / responsive reflow) is smeared across local declarations, you get the CSS-print swamp. In our terms: responsive behavior must be a *builder-global policy* (per container type, from the catalog), never per-node construction-file annotations that the builder tries to reconcile.

### 4.4 InDesign smart text reflow: bounded automation inside a manual tool

Adobe InDesign is the opposite pole from TeX — designers place frames by hand — but [Smart Text Reflow](https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/set-up-smart-text-reflow.html) shows how a manual tool buys back automation: with threaded primary text frames, InDesign automatically **adds pages when the story oversets and deletes pages that empty out**, flowing text through the frame chain. The automation is deliberately narrow — it only manages *page count and flow through pre-designed frames*; it never moves a frame or restyles anything. Scoped, predictable automation inside a human-owned structure is what makes it trusted. (The equivalent for us: the builder may freely re-flow slot contents within a pattern as data grows/shrinks — add rows, wrap chips, paginate a table — but never restructures the pattern itself.)

---

## 5. Diagrams-as-code auto-layout

This domain is the **extreme end** of "author states what, system decides where": the source file contains *zero* geometry.

### 5.1 Graphviz and the layered (Sugiyama) algorithm

[Graphviz](https://graphviz.org/) `dot` is the reference implementation of the **Sugiyama method** (Sugiyama, Tagawa & Toda 1981): rank nodes into layers → order within layers to minimize crossings (heuristic — optimal is NP-hard) → assign coordinates → route edges as splines. Input is pure topology (`a -> b`); every visual decision is the solver's. Forty years on it remains the default for DAGs because for *hierarchical* structures, the algorithm's built-in aesthetics (uniform flow direction, minimized crossings) match human expectations well enough.

[ELK (Eclipse Layout Kernel)](https://eclipse.dev/elk/) is the modern industrial descendant ([paper](https://arxiv.org/pdf/2311.00533)): its flagship [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) algorithm exposes **~140 layout options** (port constraints, compound/nested graphs, label placement, spacing regimes...) to tune the same Sugiyama pipeline. ELK's option explosion is itself a data point: when one algorithm must serve every diagram style, configuration surface metastasizes — the solver's vocabulary problem mirrors the catalog-granularity problem.

### 5.2 Mermaid / PlantUML: intent-only, and where users hit the wall

[Mermaid](https://mermaid.js.org/) (dagre-based, ELK optional) and PlantUML (Graphviz-based) made diagrams-as-code mainstream by being *radically* intent-only — and their issue trackers document exactly where that breaks:

- The [request for manual layout control](https://github.com/mermaid-js/mermaid/issues/2483) and [node-position designation](https://github.com/mermaid-js/mermaid/issues/270) are among the longest-running Mermaid threads. Users report the engine is "chaotic — tiny changes can radically change the whole layout," producing whack-a-mole editing (add one node, whole diagram rearranges).
- Mermaid's drag-to-reposition experiments hit the fundamental trap: manually moved positions **aren't recorded in the source markup**, so the arrangement can't be reproduced from the code — the moment you allow untracked manual overrides, you've forked the source of truth ([issue discussion](https://github.com/Mermaid-Chart/issue-tracker/issues/237)).
- Community practice converged on *indirect steering*: invisible edges, subgraph grouping, direction hints — users smuggling layout intent through topology because the language has no layout vocabulary.

**When is auto-layout quality acceptable?** The observed line: acceptable when the diagram is (a) genuinely hierarchical/flow-shaped, (b) small-to-medium, and (c) *disposable or frequently regenerated* (docs-as-code, generated architecture views). Humans demand overrides when the diagram is (a) non-hierarchical (peer architectures, network maps), (b) semantically spatial (this box *means* something by being left of that one), or (c) presentation-grade, where a specific arrangement carries communication intent.

### 5.3 D2 and TALA: the graduated-control answer

[D2](https://d2lang.com/) (Terrastruct) is the most thoughtful current position on the control question:

- Multiple pluggable engines (dagre for speed, ELK for hierarchy, [TALA](https://d2lang.com/tour/tala/) for software architecture). TALA is a general orthogonal engine, "not constrained to one type like hierarchies" — built to lay out like "a human would on a whiteboard": symmetry preference, first-class containers, per-container direction, dynamic label placement ([TALA repo](https://github.com/terrastruct/TALA)).
- Crucially, D2 added **in-language, source-tracked overrides**: `near` (anchor an object to a canvas position or another object), per-container `direction`, and — TALA-only — explicit `top`/`left` coordinates that *lock* selected nodes while the solver arranges the rest. Overrides live in the `.d2` source, so reproducibility survives; you pin the 5% you care about and the solver keeps owning the other 95%.
- Honest determinism caveat: even TALA is documented as "more random than other layout engines — a small change to a label can cascade into an entirely different layout," and it uses seeds for its stochastic search. Layout-solver instability under small input changes is a *general* phenomenon, not a Mermaid bug — any construction-file pipeline that re-runs global layout on every patch will exhibit it unless layout is either trivially local (flex/grid) or explicitly pinned.

The D2 design — **solver owns layout by default; sparse, source-recorded pins for the exceptions** — is the best available template for how a construction file should handle the designer who says "no, the summary card goes on the right."

---

## 6. Generative and optimization-driven design

### 6.1 Autodesk generative design: goals + constraints → candidate space → human curation

[Autodesk Fusion generative design](https://www.autodesk.com/solutions/generative-design/manufacturing) inverts CAD authoring: the engineer specifies **preserve geometry** (where bolts attach), **obstacle geometry** (keep-out zones), loads, materials, manufacturing methods, and objectives (minimize mass, target safety factor) — and the system generates *dozens to hundreds* of design candidates, each already simulation-validated. The workflow is explicitly **generate → evaluate → evolve** ([Autodesk University on codifying design intent](https://medium.com/autodesk-university/geometry-systems-for-aec-generative-design-codify-design-intents-into-the-machine-9bd9ccec8def)): geometry systems create a large solution space, analysis scores every candidate, an optimizer searches — and then a *human* browses a filterable gallery of outcomes (by mass, cost, manufacturability) and **curates**. The machine explores; the human chooses.

Autodesk is careful to distinguish this from [topology optimization](https://www.autodesk.com/products/fusion-360/blog/topology-optimization-is-not-generative-design/): topology optimization is a single-answer refinement (carve material out of one given design), while generative design is many-answer exploration from intent. Both, though, share the property that matters here: **the spec is small and the artifact space is large**, so exploring N alternatives costs almost nothing beyond compute.

### 6.2 The UI-layout version already exists in research

[GRIDS (Dayama et al., CHI 2020)](https://arxiv.org/pdf/2001.02921) applies the same shape to interface layout: mixed-integer linear programming over a grid system generates diverse, aligned wireframe layouts from element lists + preferences, presented as candidate galleries for the designer to pick from. Together with CGA's attribute-sweep cities and Thingiverse's Customizer, the pattern generalizes: **any deterministic build step downstream of a small parametric spec makes multi-variant generation nearly free** — vary the spec's free parameters (ordering of sections, density token, container preset, theme), rebuild N times, show a gallery.

For our pipeline this is a first-class product feature hiding in the architecture: one construction file + a builder flag → 3–5 layout/density/ordering variants, screenshot each, let the designer point. That converts the LLM's *uncertainty* about ambiguous intent (which the constraint-sketching research in §2.4 shows is real) from a defect into an exploration UI. The curation lesson matters too: Autodesk ships **filters and rankings** with the gallery because unranked candidate dumps overwhelm users. Cheap generation demands cheap triage — our a11y/lint gate and screenshot diffing should rank variants, not just enumerate them.

---

## 7. Lessons for construction-file prototyping

The mapping, compressed:

| Precedent | What happened there | Rule for the construction-file architecture |
|---|---|---|
| Cassowary → Auto Layout revolt → SwiftUI | Maximal constraint expressiveness → non-local reasoning, silent ambiguity, priority arithmetic; platform retreated to proposal/response | **Layout vocabulary = small enum of container presets** (Stack, Grid, Split + gap/align tokens), never raw inter-element constraints. If the catalog ever grows a `constraint:` node, that's the alarm bell |
| Auto Layout error UX vs sketcher DOF display | Runtime console spam + random constraint-breaking vs live under/fully/over-constrained state at edit time | Validate at **patch time, not render time**; report validity state with the artifact. Never "pick a solution silently" — schema/lint rejection with actionable local messages |
| CSS `grid-template-areas` | ASCII region map that is simultaneously human-diagram, machine-checkable program, and name-bound slot system | Model construction-file layout nodes as **named region maps with name-bound children**; adopt its rejection semantics (invalid region map → whole node invalid, loudly) |
| SolidWorks/Creo rebuild errors, topological naming | Downstream features reference upstream geometry; upstream edits dangle references; kernel may silently re-bind wrong faces | **Patch semantics must fail loudly and locally**: before applying, check every id a patch touches exists and nothing downstream references what it deletes; on failure, emit the feature-tree equivalent — *which node broke, which upstream edit broke it*. Stable ids (already chosen) + a reference-integrity linter |
| OpenSCAD bidirectional-editing research | Round-tripping direct manipulation back into a generative program is research-grade hard | Confirms doc 05: don't build code→construction round-trip; use manifest drift detection + model-assisted re-adopt |
| Grasshopper live regen; Typst comemo | Parametric authoring is only magical when rebuild latency ≈ 0; Typst achieves ms rebuilds via memoized pure functions with tracked inputs | **Builder must be incremental**: pure per-node expansion + manifest hashes → rebuild only changed subtrees. Target: preview refresh proportional to patch size, not screen count |
| TeX box/glue/badness | Spacing/rhythm "feel" encoded once, in the engine, as a deterministic cost model; authors can't and needn't touch it | **Design-system feel lives in the builder**, not the construction file: spacing scale, density rules, breakpoint behavior are builder-owned rules keyed by tokens. Construction files stay spacing-silent. `\vspace`-style per-node overrides are debt — route them to the escape hatch where telemetry sees them |
| CSS pagination failure | Global layout concern (page/reflow) smeared across local per-element properties → decades of swamp | **Responsive behavior is a global builder policy per container type**, never per-node annotations the LLM emits |
| Mermaid/D2 | Intent-only layout wins for regenerable artifacts; users need overrides for the semantic 5%; untracked manual moves fork the source of truth | Builder owns responsive layout 100% by default (LLM states structure + intent only). If overrides are ever needed, do it **D2-style: sparse pins recorded in the construction file**, never in generated code |
| CGA shape grammars | Two-level authoring (specialists write rules, everyone adjusts attributes); context rules keep output valid; seeded variation | Validates pattern-first + slot-rule lint; catalog authorship is the skilled role, construction-file authorship is menu-picking — which is exactly what LLMs are reliable at |
| Autodesk generative design / GRIDS | Small spec + deterministic evaluation → cheap candidate galleries; humans curate ranked, filtered sets | Ship **multi-variant build mode**: one construction file, vary free parameters (density, ordering, container presets), N screenshots, ranked by the existing gate. Turns intent-ambiguity into an exploration feature |

Three cross-cutting meta-lessons:

1. **Every mature field converged on the same authority split.** TeX: author owns content/structure, engine owns spacing. CGA: designer owns attributes/derivation choices, grammar owns detail. D2: author owns topology, solver owns position. SwiftUI: parent owns proposal, child owns response — *locally*. CAD sketcher: user owns dimensions, solver owns coordinates. Nobody sustainable lets the two authorities interleave on the same values. Our builder-owns-structure / LLM-owns-content split (doc 05) is the same invariant; the enforcement mechanism (file-granularity ownership) is sound precisely because interleaved ownership is where every one of these systems bled.
2. **Expressiveness of the *authoring surface* is the risk dial, not expressiveness of the engine.** The engine may run a simplex solver, a DP optimizer, a stochastic search — fine, as long as the *input language* is a small vocabulary with checkable validity. Systems failed when the input language exposed the solver's full power (Auto Layout) and succeeded when a rich engine sat behind a tiny grammar (Grid, TeX, dot).
3. **Determinism is the enabling property for everything else** — incremental rebuilds (Typst, OpenSCAD caching), reproducible variation (CGA seeds), meaningful diffs, trust in the gallery. Every stochastic element (layout search, fake data, candidate generation) must be seeded, and layout algorithms whose output is unstable under small input changes (TALA-class global solvers) should be kept out of the default path entirely.

---

## 8. Failure stories and tradeoffs

**The Auto Layout decade.** From 2012–2019, iOS developers were handed the most theoretically capable layout system ever shipped to a mass platform — and community sentiment curdled into an entire genre: constraint-DSL wrappers (SnapKit et al.) to hide the API, conference talks on debugging `UIViewAlertForUnsatisfiableConstraints`, teams (notably in the games/perf community) publicly reverting to manual frame math for performance, Apple shipping stack views as an apology layer, then replacing the paradigm wholesale in SwiftUI. Root cause, in one sentence: **the authoring model demanded global reasoning about a solver, and its failure modes (silent constraint-breaking, ambiguity discovered only at runtime) taxed exactly the people least equipped to debug an LP.** For us: an LLM is a *worse* global reasoner over a soup of interacting constraints than a human, and a *better* menu-picker — the vocabulary choice does more for reliability than any repair loop.

**Parametric regeneration hell.** Every CAD veteran carries scars: the model where renaming a sketch broke forty downstream features; the imported part whose feature tree resembled archaeology; FreeCAD's topological-naming saga; the "resilient modeling" methodologies invented purely to defend against reference fragility. The industry's dual answer — better references (stable IDs, datum-based modeling) *and* an escape hatch that abandons history (direct modeling) — maps onto ours: id-keyed patches + integrity linting for the main path, "regenerate from scratch" as the legitimate fallback when a restructure invalidates too much (doc 05's patch-vs-regen choice, now with a principled trigger: regen when the patch would dangle more than a threshold of references).

**The Grid Style Sheets cautionary footnote.** The Grid's GSS project (2014) brought literal Cassowary to CSS — briefly celebrated, quickly abandoned. The web already had the lesson iOS was still learning.

**Tradeoffs we are consciously accepting**, stated honestly:

- *Expressiveness ceiling.* A preset-based layout vocabulary cannot express every design; asymmetric editorial layouts, overlap, magazine-style art direction will hit the escape hatch. All precedents say accept this: the systems that tried to be universal (Auto Layout, parametric shape grammars over raw shapes) lost to the ones that were 90%-sufficient and predictable. The CustomBlock telemetry (doc 01) is the pressure valve and measurement.
- *Builder-owned feel means opinionated output.* TeX documents look like TeX. Builder output will have a recognizable house rhythm — which is precisely the point for design-system prototyping, but means "make it feel different" is a *catalog/builder* change (slow path), not a construction-file change (fast path). Governance must make the slow path actually traversable, or users will smuggle style through the escape hatch like LaTeX users smuggle `\vspace`.
- *Curated variation vs. serendipity.* Grammar-constrained generation produces families, not surprises. For divergent early-phase exploration, generative-design-style parameter sweeps recover breadth *within* the system; genuinely off-grammar exploration should be routed to the normal agent-writes-code path, per the doc 00 "when NOT to use this" rule.

---

## 9. Open questions

1. **Where exactly is the layout-vocabulary sweet spot?** Subform bet on an even smaller model than flexbox; CSS ships two coordinated DSLs; CGA needed splits + repeats + component-splits. Is Stack/Grid/Split + gap/align/density tokens enough for the target 60–70% pattern coverage, or does a `regions:` ASCII-map node (grid-template-areas-style) earn its complexity? → fold into experiment E2 as a third arm.
2. **Do we ever need D2-style pins?** The precedents predict a minority of prototypes where a designer insists on a specific arrangement the presets can't express. Is a sparse `pin:` mechanism (recorded in the construction file, builder-honored) worth its schema cost, or is that exactly what CustomBlock is for? Instrument for the demand before building it.
3. **How far to take incremental building?** Manifest-hash file-level rebuilds are cheap to implement; Typst-grade tracked memoization is a large investment. At what screen count does file-level granularity stop feeling instant? (Likely answer: file-level is enough for prototypes; measure in E5.)
4. **Can the badness function be made explicit?** TeX's power came from *numeric* quality scoring. Our current gate is boolean (schema + lint + a11y pass/fail). A scored gate (spacing-rhythm heuristics, density coherence, alignment counts — GRIDS-style objectives) would enable ranked multi-variant galleries and give the repair loop a gradient. What's the minimal scoring model that correlates with designer judgment?
5. **Seeded variation as a first-class field?** CGA seeds stochastic rules per shape; should a construction file carry an explicit `seed` + declared free parameters (`explore: [density, section-order]`) so variant generation is part of the format rather than a builder flag?
6. **Patch-invalidation thresholds.** CAD suggests "regen when too many references dangle" — what's the threshold, and can the builder *propose* the regen automatically with a diff preview (the rollback-bar UX, translated)?
7. **LLM-in-the-loop constraint findings.** The 2025 parametric-CAD result ([arXiv 2504.13178](https://arxiv.org/html/2504.13178v1)) shows LLM-generated constraints need solver-feedback loops to match design intent even when syntactically valid. Our semantic-lint layer covers syntax-valid-but-wrong composition; do we also need an intent-check (screenshot → VLM judgment against intent.yaml) in the default gate, or only in CI?

---

**Key sources:** [Cassowary theory](https://cassowary.readthedocs.io/en/latest/topics/theory.html) · [Cassowary (Wikipedia)](https://en.wikipedia.org/wiki/Cassowary_(software)) · [Apple Auto Layout Guide: constraint anatomy](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/AnatomyofaConstraint.html), [ambiguous layouts](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/AmbiguousLayouts.html), [error types](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/TypesofErrors.html) · [SwiftUI Layout protocol (SwiftUI Lab)](https://swiftui-lab.com/layout-protocol-part-1/) · [grid-template-areas (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Grid_template_areas) · [Subform: Why not flexbox?](https://medium.com/subform/why-not-flexbox-ddbe60396163) · [OpenSCAD history (Novedge)](https://novedge.com/blogs/design-news/design-software-history-openscad-revolutionizing-cad-with-script-based-3d-modeling-for-precision-and-automation) · [OpenSCAD user challenges (arXiv)](https://arxiv.org/pdf/2408.01796) · [Bidirectional CSG programming (arXiv)](https://arxiv.org/pdf/2408.01801) · [Grasshopper history (Novedge)](https://novedge.com/blogs/design-news/design-software-history-grasshopper-shaping-the-future-of-parametric-design-in-architecture-through-visual-programming-and-computational-innovation) · [SolidWorks rebuild errors (Mechanitec)](https://mechanitec.ca/how-to-fix-rebuild-errors-solidworks/) · [Geometric constraint solvers explained (Hendoi)](https://www.hendoi.in/blog/geometric-constraint-solvers-explained) · [LLM constraint generation in CAD (arXiv 2504.13178)](https://arxiv.org/html/2504.13178v1) · [CGA reference (Esri)](https://doc.arcgis.com/en/cityengine/2019.0/cga/cityengine-cga-introduction.htm) · [Müller et al., Procedural Modeling of Buildings](https://www.researchgate.net/publication/220183823_Procedural_Modeling_of_Buildings) · [Knuth & Plass 1981 (PDF)](https://gwern.net/doc/design/typography/tex/1981-knuth.pdf) · [Knuth–Plass (Wikipedia)](https://en.wikipedia.org/wiki/Knuth%E2%80%93Plass_line-breaking_algorithm) · [Typst architecture](https://github.com/typst/typst/blob/main/docs/dev/architecture.md) · [comemo blog post](https://laurmaedje.github.io/posts/comemo/) · [CSS fragmentation (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fragmentation) · [Print stylesheets (Smashing)](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/) · [InDesign Smart Text Reflow (Adobe)](https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/set-up-smart-text-reflow.html) · [ELK paper (arXiv 2311.00533)](https://arxiv.org/pdf/2311.00533) · [ELK Layered reference](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) · [Mermaid manual-layout issue #2483](https://github.com/mermaid-js/mermaid/issues/2483) · [D2 TALA](https://d2lang.com/tour/tala/) · [TALA repo](https://github.com/terrastruct/TALA) · [Autodesk: topology optimization ≠ generative design](https://www.autodesk.com/products/fusion-360/blog/topology-optimization-is-not-generative-design/) · [Codifying design intent (Autodesk University)](https://medium.com/autodesk-university/geometry-systems-for-aec-generative-design-codify-design-intents-into-the-machine-9bd9ccec8def) · [GRIDS: layout via integer programming (arXiv)](https://arxiv.org/pdf/2001.02921)
