# 07 — Game Engine & Procedural Generation Patterns

**Purpose:** Game engines are the industry with the longest track record of the exact problem the construction-file architecture tackles: composing complex scenes out of reusable primitives, serializing those compositions in schema-constrained, diff-able files, expanding them deterministically at build time, and letting humans surgically adjust generated content without breaking regeneration. This document deep-dives six pattern families as they work in their home domain — prefab/scene composition, scene serialization formats and merge tooling, entity-component-systems, procedural generation (constraint- and grammar-based), asset pipelines, and level editors as the human-in-the-loop layer — then maps each pattern onto the construction-file prototyping pipeline defined in [00-architecture-synthesis.md](00-architecture-synthesis.md). Game engines have also already suffered the failure modes this architecture risks ("prefab hell," scene merge disasters, procgen sameness), so their scars are cheap lessons.

---

## Table of contents

1. [Prefabs & scene composition](#1-prefabs--scene-composition)
   - 1.1 Unity prefabs, variants, overrides
   - 1.2 Unreal: Blueprints-as-assets and data assets
   - 1.3 Godot: everything is a scene
2. [Scene graphs & serialization formats](#2-scene-graphs--serialization-formats)
   - 2.1 Unity YAML scenes and the merge problem
   - 2.2 UnityYAMLMerge (Smart Merge)
   - 2.3 Godot .tscn: designed diff-friendly
   - 2.4 USD: layered composition arcs (LIVRPS)
3. [ECS: composition over inheritance, data-driven design](#3-ecs-composition-over-inheritance-data-driven-design)
4. [Procedural generation](#4-procedural-generation)
   - 4.1 Wave function collapse: constraint-based assembly from a tile catalog
   - 4.2 Grammar-based generation: L-systems and CGA shape grammar
   - 4.3 Seeded randomness and reproducibility
   - 4.4 The 10,000 bowls of oatmeal problem
5. [Asset pipelines: import determinism, caching, hot reload](#5-asset-pipelines-import-determinism-caching-hot-reload)
6. [Level editors as the human-in-the-loop layer](#6-level-editors-as-the-human-in-the-loop-layer)
7. [Lessons for construction-file prototyping](#7-lessons-for-construction-file-prototyping)
8. [Failure stories & tradeoffs](#8-failure-stories--tradeoffs)
9. [Open questions](#9-open-questions)

---

## 1. Prefabs & scene composition

The prefab is the game industry's answer to "define once, instantiate many, customize locally" — the exact shape of the construction file's *pattern reference + slot customization* model. Three engines solve it three ways, and the differences are instructive.

### 1.1 Unity prefabs, variants, overrides

A Unity **prefab** is a serialized GameObject hierarchy stored as an asset (`.prefab`). Scenes contain *instances* of prefabs; each instance stores only a link to the prefab asset plus a list of **overrides** — property-level deltas from the asset's values. Unity's own manual on [Prefab Variants](https://docs.unity3d.com/Manual/PrefabVariants.html) describes the layering that emerged from this:

- **Base prefab** — provides all defaults.
- **Prefab Variant** — a separate asset that *inherits* a base prefab and stores only its property deltas. A variant can itself be based on another variant, forming chains ("Button" → "PrimaryButton" → "PrimaryButtonLarge").
- **Scene instance** — overrides on top of whichever asset it instantiates, again stored as deltas.

Resolution is bottom-up at load time: base values → variant deltas → instance deltas. Three properties of this system matter for us:

1. **Deltas are sparse and property-addressed.** An override is recorded as `(target file ID, property path, value)`. The instance never copies the whole prefab; it stores "for object X, property `m_FontSize` = 18." This is what keeps instances cheap and keeps upstream edits flowing through: change the base prefab and every non-overridden property on every instance updates for free.
2. **An override permanently detaches that property from the base.** Once a property is overridden, base edits to that property no longer reach the instance. Unity gives explicit verbs for reconciling: **Apply** (push the override up into the asset, making it the new default) and **Revert** (discard the local delta, re-attaching to the base). This apply/revert vocabulary is the interaction model of override-based systems, and any construction-file system with slot customization will need the same two verbs.
3. **Override resolution is fragile against structural change.** Overrides address targets by internal file IDs. If a layer of the chain fails to resolve — a missing base, a renamed/deleted child object, a stale file ID — the overrides stacked on top are silently discarded. Community bug archaeology ([Bugnet: prefab variant overrides being lost](https://bugnet.io/blog/fix-unity-prefab-variant-overrides-being-lost)) shows this is a persistent real-world pain: deltas are only as durable as the identity of the things they point at.

**Nested prefabs** (prefab A contains an instance of prefab B) shipped only in Unity 2018.3 — roughly *thirteen years* into Unity's life, after being the single most-requested feature for most of that time ([community history](https://discussions.unity.com/t/what-is-the-nested-prefab-problem/659499)). Before that, dragging prefab B into prefab A silently *flattened* B into a disconnected copy — the connection to B was lost and future improvements to B never propagated. The eventual fix keeps the nested instance live: edits to the inner instance made from inside prefab A are recorded as *A's overrides of B*, stored in A's file, without touching B's asset. The long delay is the cautionary tale: composition-with-live-references is dramatically harder to serialize and resolve than copy-paste, and engines that shipped copy-semantics first spent a decade paying for it. A construction-file system should get reference-semantics (pattern refs, not pattern copies) right from day one.

### 1.2 Unreal: Blueprints-as-assets and data assets

Unreal Engine reaches the same destination via class semantics rather than asset-delta semantics. A [Blueprint Class](https://dev.epicgames.com/documentation/unreal-engine/blueprint-class-assets-in-unreal-engine) is an asset that *defines a new Actor type* — components, default property values, and visual-scripted behavior — which is then placed as instances in levels; instances store per-property diffs from the class defaults, and the details panel exposes per-property "revert to default" arrows (the same apply/revert vocabulary as Unity, expressed as class-vs-instance).

Two Unreal ideas are especially relevant:

- **Data-Only Blueprints**: a Blueprint subclass that adds *no* new logic or structure — it only re-values inherited properties. Unreal treats these specially (a stripped-down editor UI showing just the tweakable properties). This is precisely a "variant = pure delta" formalized as a type: the system can *know* a variant is data-only and offer a safer, simpler editing surface. A construction-file schema could similarly distinguish "pattern instances that only fill slots" from "instances that restructure," and gate tooling on that distinction.
- **[Data Assets](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-assets-in-unreal-engine) and DataTables**: pure-data assets (an instance of a `UDataAsset` subclass, i.e., a schema-typed record) that gameplay code consumes. The design intent, well summarized in [unreal-garden's data-driven design guide](https://unreal-garden.com/tutorials/data-driven-design/), is to move everything a designer might tune out of code and into typed data that designers edit in a structured editor. That is the construction file's thesis stated in Unreal vocabulary: behavior lives in engineered systems; *what to build* lives in validated data.

- **Creating a Blueprint from selected level Actors**: Unreal lets a designer select several placed actors and convert them into a new reusable Blueprint asset, preserving property tweaks and spatial relationships. This is "harvest a pattern from an instance" — the reverse arrow our catalog needs when telemetry shows a recurring `CustomBlock` (doc 01's escape-hatch health metric): promote the recurring ad-hoc composition into a first-class pattern.

### 1.3 Godot: everything is a scene

Godot collapses the prefab/scene distinction entirely: a **scene** (`.tscn`) is a node tree, any scene can be instantiated as a subtree of another scene, and there is no separate prefab concept ([From Unity to Godot](https://alfredbaudisch.medium.com/from-unity-to-godot-game-objects-and-components-in-godot-84594874efdc)). Composition is uniform all the way down — a Button scene, a SettingsForm scene containing Button instances, and an App scene containing SettingsForm instances are all the same kind of thing. Two mechanisms complete the picture:

- **Instance property overrides**: when scene A instances scene B, A's file records only the properties of B's nodes that A changed. Everything else stays live-linked to B.
- **Inherited scenes**: a scene can declare another scene as its base and override/extend it — Godot's equivalent of prefab variants, but able to *add nodes*, not just re-value properties.

Comparisons ([Wayline: Godot scenes vs Unity prefabs](https://www.wayline.io/blog/godot-scenes-vs-unity-prefabs)) generally credit Godot's model with being simpler to reason about precisely because there is one composition primitive instead of three (scene/prefab/variant). The architectural lesson: **uniformity of the composition primitive is itself a feature.** Our construction files already lean this way — a "pattern" and a "screen" are both node trees over the same schema; keeping them the same kind of object (patterns are just construction-file fragments) avoids Unity's three-way ontology.

---

## 2. Scene graphs & serialization formats

Every engine above serializes its scene graph to files, and every one of them collided with version control. The format choices and repair tools are directly transplantable.

### 2.1 Unity YAML scenes and the merge problem

Unity serializes scenes and prefabs as YAML (when "Force Text" serialization is on — the recommended setting for teams). A `.unity` file is a stream of YAML documents, one per object, each headed by a class ID and a **file ID** (a local numeric anchor), with references expressed as `{fileID: 123456}` pairs. Structure that a human thinks of as a *tree* (the hierarchy) is stored as a *flat list of objects with pointer fields* — a Transform lists its children by fileID; order in the file is not meaningful.

This makes naive line-based git merges dangerous in well-documented ways ([Unity Learn: Working with YAMLMerge](https://learn.unity.com/tutorial/working-with-yamlmerge), [7wolves: Unity YAML merge workflows](https://7wolves.org/articles/unity-yaml-merge/)):

- Two people adding objects at the "end" of a scene both append documents with possibly colliding fileIDs → duplicated or corrupted anchors.
- A textual merge can succeed line-wise while producing a semantically broken graph: dangling `{fileID: ...}` references, orphaned children, a component attached to a deleted object. **Line-valid ≠ graph-valid.**
- Reordering noise: the serializer can rewrite large spans that didn't semantically change, generating phantom diffs.

Teams' standard mitigations became folklore: one-person-per-scene locks, splitting scenes into many small prefabs/additive subscenes so the conflict surface shrinks, and Smart Merge (next section). Each mitigation maps to a construction-file decision: small files over monoliths, per-screen construction files over one app-wide file, and a semantic merge tool over raw text merge.

### 2.2 UnityYAMLMerge (Smart Merge)

Unity's answer is a dedicated semantic merge tool, [UnityYAMLMerge](https://docs.unity3d.com/6000.3/Documentation/Manual/SmartMerge.html), shipped with the editor and pluggable into git/Perforce/PlasticSCM as a custom merge driver. Instead of merging lines, it:

1. Parses base/ours/theirs into object graphs.
2. Merges at the granularity of *objects and properties* — two branches each editing different properties of the same GameObject merge cleanly even if the edits are textually adjacent.
3. Applies configurable conflict policies from a `mergerules.txt` (e.g., for certain array-like properties, "union" instead of "conflict").
4. Falls back to launching the user's normal 3-way merge tool *only* for the residue it can't resolve.

Practitioner guides ([andreasjakl.com setup walkthrough](https://www.andreasjakl.com/resoving-unity-scene-merge-conflicts-unityyamlmerge-tortoisegit/)) note that it resolves *most* conflicts automatically, and the post-merge ritual is to open the scene and check for missing scripts and dangling references — i.e., even the smart merge is followed by a semantic validation pass.

The takeaway is a complete recipe: **custom merge driver that parses the format + property-level 3-way merge + domain merge rules + validation after merge.** Nothing about it is Unity-specific; it's exactly what a `construction-merge` tool would be (see §7.5).

### 2.3 Godot .tscn: designed diff-friendly

Godot, arriving later, designed its text format *for* version control rather than retrofitting. The [.tscn format documentation](https://docs.godotengine.org/en/stable/engine_details/file_formats/tscn.html) shows an INI-like structure:

```ini
[gd_scene load_steps=3 format=3 uid="uid://cecaux1sm7mo0"]

[ext_resource type="PackedScene" uid="uid://b0ldkbybqxdlp" path="res://Button.tscn" id="1_x7dqn"]

[node name="SettingsForm" type="VBoxContainer"]
custom_minimum_size = Vector2(320, 0)

[node name="SaveButton" parent="." instance=ExtResource("1_x7dqn")]
text = "Save changes"
```

Deliberate choices worth stealing:

- **Default-elision**: properties equal to their default value are *not serialized*. Files contain only intent — the deltas from defaults — so diffs show only what a human actually changed, and the file doubles as documentation of "what's customized here." (Contrast Unity, which serializes every property of every object.)
- **One node per section, human-readable names**: the diff of "SaveButton's text changed" is a one-line change under a section a human can read, versus a change to `m_Text` under fileID `816430994`.
- **Stable string UIDs**: Godot 4 introduced content-addressed-style `uid://` identifiers for resources so that *moving/renaming a file doesn't break references* — the reference points at the UID, and a path is kept only as a fallback hint. This decouples identity from location, the same job Unity's `.meta` GUIDs do (§5).
- **Instance-with-overrides is visible in the text**: `instance=ExtResource(...)` followed by only the overridden properties. The pattern-reference + local-delta model reads directly off the file.

Godot's format is arguably the closest existing artifact to what a good construction file should look like on disk: terse, default-elided, id-stable, reference-based, reviewable in a PR without tooling.

### 2.4 USD: layered composition arcs (LIVRPS)

Pixar's [Universal Scene Description](https://openusd.org/) generalizes overrides from a 2-3 level chain into an arbitrary algebra of layers, built to let entire departments (modeling, layout, animation, lighting) work on the *same scene* concurrently without touching each other's files.

Core concepts (see the [USD Glossary](https://graphics.pixar.com/usd/docs/USD-Glossary.html) and Remedy's excellent [USDBook LIVRPS explainer](https://remedy-entertainment.github.io/USDBook/terminology/LIVRPS.html)):

- **Opinions**: the atomic unit — one authored value for one property in one layer. A layer is a sparse bag of opinions; nothing forces a layer to be complete.
- **Composition arcs** connect layers/scene fragments: **subLayers** (stack layers like Photoshop layers), **references** (bring an external asset's tree in under a prim — the prefab-instance arc), **variantSets** (named switchable alternatives baked into an asset, e.g., `carPaint = red|blue`; the consumer selects one), **payloads** (lazy-loaded references), **inherits/specializes** (broadcast edits to all instances of a class).
- **Strength ordering — LIVRPS** (*Local, Inherits, VariantSets, References, Payloads, Specializes*): when multiple layers hold opinions about the same property, the composition engine resolves the winner by this fixed, universal precedence. Local (session/stronger sublayers) beats everything; references' internal opinions are weaker than anything the referencing scene says.

The workflow consequence is the important part: **non-destructive layering as an organizational protocol.** A lighting artist doesn't edit the modeling file; they author a sparse "lighting layer" whose opinions win over the model's defaults by strength ordering. The model file remains pristine and independently updatable; recomposition merges the new base with the standing overrides automatically. Sequences override shots, shots override assets — a whole studio's org chart expressed as layer precedence ([NVIDIA's strength-ordering tutorial](https://docs.nvidia.com/learn-openusd/latest/composition-basics/strength-ordering.html)).

USD is the strongest single analogy in this document for the builder/LLM split (mapped in §7.2): a deterministic base layer owned by the builder, with LLM- and human-authored opinions in strictly stronger, sparse layers — composition instead of mutation.

---

## 3. ECS: composition over inheritance, data-driven design

The **entity-component-system** pattern ([overview](https://en.wikipedia.org/wiki/Entity_component_system)) reorganized game object modeling around three moves:

1. **Entity = just an ID.** No behavior, no data, no class hierarchy — a stable identity to hang things off.
2. **Component = plain data.** `Position {x,y}`, `Health {hp}`, `Sprite {texture}` — schema-typed records with zero logic.
3. **System = logic over component queries.** A MovementSystem processes *every entity that has Position + Velocity*, regardless of what "kind" of thing it is.

The founding motivation was escaping inheritance-hierarchy hell: the classic diamond where `FlyingEnemy` and `SwimmingEnemy` exist and someone requests a flying-swimming enemy ([LeatherBee's inheritance-vs-composition history](https://leatherbee.org/index.php/2019/09/12/ecs-1-inheritance-vs-composition-and-ecs-background/)). Composition dissolves it: an entity's nature *is the set of components attached to it*, so any combination is legal by construction. Modern engines industrialized this — [Unity DOTS/ECS](https://unity.com/dots) for cache-coherent performance, Overwatch's server simulation, and Godot/Unity's classic object models are "ECS-lite" (GameObject + MonoBehaviour components) even without the data-oriented memory layout.

Two consequences matter more to us than the performance story:

- **Behavior defined by data tables, not code.** In a mature ECS pipeline, a new enemy type is *a row in a data file* — a list of components and their initial values — not a new class. Designers create content by authoring data against a component schema; engineers only get involved when a genuinely new *component or system* (new capability) is needed. This is exactly the construction-file contract: the LLM/designer authors data (component types + props) against a catalog schema; the builder and design system own all behavior; a new *capability* means extending the catalog, not the construction file.
- **Capability queries beat type taxonomies.** Systems ask "what has these components?" not "what inherits from X?". For our schema, the analogous move is defining slot compatibility and lint rules over *capabilities/traits* ("accepts-form-controls", "is-interactive", "is-inline") rather than over an inheritance tree of component types. A `slot: accepts=[interactive]` rule stays correct as the catalog grows, where an enumerated whitelist rots.

The React component model is itself descended from this insight (component + props data, composition over inheritance is literally in the old React docs), which is why the mapping feels frictionless: **a construction file is an entity-component data table for UI** — nodes are entities (stable IDs), pattern/primitive type + props are components, and the builder plus the design system's runtime are the systems.

---

## 4. Procedural generation

Procgen is the discipline of *generating* valid content from a catalog of parts plus rules — which is what stage 3 of our pipeline asks an LLM to do. Its two dominant families, constraint-based and grammar-based, bracket the design space, and its reproducibility discipline (seeds) and its signature failure (sameness) both transfer.

### 4.1 Wave function collapse: constraint-based assembly from a tile catalog

[Wave Function Collapse](https://github.com/mxgmn/WaveFunctionCollapse) (Maxim Gumin, 2016) is the most influential procgen algorithm of the last decade. Despite the quantum branding, it is a greedy constraint solver ([BorisTheBrave: WFC Explained](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/), and see [Model Synthesis](https://en.wikipedia.org/wiki/Model_synthesis), Paul Merrell's earlier formulation):

1. **Catalog + adjacency constraints.** Input: a set of tiles and rules for which tiles may sit next to which (declared explicitly in the "simple tiled model," or learned automatically from an example image in the "overlapping model").
2. **Superposition.** Every cell of the output grid starts with the full domain — every tile is still possible.
3. **Observe (minimum entropy).** Pick the *most constrained* undecided cell (fewest remaining possibilities, weighted by tile frequency) and collapse it to one concrete tile.
4. **Propagate.** Remove now-impossible tiles from neighbors' domains; cascade until stable (this is arc consistency / AC-3 from classic constraint programming).
5. **Repeat**; on contradiction (a cell's domain empties), backtrack or restart.

Why this is the deep analogy for construction-file generation:

- **Validity is enforced by construction, not by post-hoc checking.** WFC never places a tile that violates adjacency, because illegal options were already deleted from the domain. This is the same claim our architecture makes with enum-constrained structured outputs: a hallucinated component *cannot be emitted*. WFC extends the idea from "valid vocabulary" to "valid *arrangement*" — which our schema layer only partially does today (nesting/slot lint rules are the beginnings of adjacency constraints).
- **The catalog + constraint rules ARE the design system.** WFC's output quality is entirely determined by tileset quality and constraint completeness — the algorithm contributes nothing aesthetic. Likewise, construction-file output quality is bounded by catalog and slot-rule quality, not by model cleverness. Investment goes into the tile set.
- **Local constraints don't produce global structure.** BorisTheBrave's key criticism: because WFC only constrains *neighbors*, it "rarely generates large scale structures" — output is locally plausible, globally aimless. Games fix this by layering: a coarse pass (or hand-authored skeleton) decides global structure; WFC infills locally. Mapped to us: adjacency/slot rules will keep a screen locally legal but won't make it a *good screen* — global structure comes from the pattern layer (a `SettingsForm` pattern is a hand-authored "global structure" template) and from the intent spec. This independently re-derives doc 01's *pattern-first with atomic infill* conclusion: patterns are the global pass, primitives are the constraint-checked infill.
- **The most-constrained-first heuristic** is also a prompting insight: deciding the most constrained parts of a screen first (the parts with fewest legal options) and letting flexible regions adapt around them minimizes contradiction/rework — an argument for reasoning-first field ordering in the schema (doc 03) and for asking models to place fixed chrome before free-form content.

[Townscaper](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) (Oskar Stålberg) is the pattern's celebrity application and doubles as a §6 exhibit: the *user* clicks where buildings go (human intent), and WFC instantly solves which of the ~200 hand-made mesh tiles legally realize that intent on an irregular grid. Human chooses *what/where*; constraint solver guarantees *legal how* — the cleanest existing demo of "intent in, valid construction out."

### 4.2 Grammar-based generation: L-systems and CGA shape grammar

The other family generates by *rewriting rules* rather than constraint solving.

- **L-systems** (Lindenmayer, 1968): parallel string-rewriting grammars (`A → AB`, `B → A`) whose expansions, interpreted as turtle graphics, produce plants, and in Parish & Müller's landmark *CityEngine* paper (SIGGRAPH 2001), road networks.
- **CGA shape grammar** ([Esri CityEngine](https://doc.arcgis.com/en/cityengine/latest/get-started/get-started-about-cityengine.htm), Müller et al. 2006; [CGA manual](http://cehelp.esri.com/help/topic/com.procedural.cityengine.help/html/manual/cga/basics/toc.html)): a production system over *shapes*. A rule file iteratively refines a coarse mass into detail:

```
Lot --> extrude(height) Building
Building --> split(y){ 4 : GroundFloor | { ~3 : Floor }* }
Floor --> split(x){ ~1 : Wall | 2 : Window }*
Window --> i("window.obj")
```

  Attributes (`height`, style parameters) are exposed as knobs; changing one regenerates the whole building consistently. Entire cities of varied-but-coherent buildings come from a small rule file plus per-lot attributes.

The construction-file reading: **a builder is a shape grammar interpreter.** A pattern reference like `SettingsForm(sections: 3)` is a nonterminal; the builder's expansion of it into containers, primitives, and finally TSX is a derivation; primitives are terminals. Three grammar lessons transfer directly:

1. **Terse nonterminals, deterministic expansion.** CGA's power/economy ratio comes from the author writing only high-level productions while the interpreter does mechanical expansion. That is the 2K-token construction file vs 50K-token code claim, in 2006 clothing.
2. **Parameterized rules = pattern slots.** CGA rules take attributes; good rules expose *few, semantically meaningful* parameters (floor height, window style) rather than raw geometry. Same principle as designing pattern props: expose intent-level knobs, keep mechanics internal.
3. **Grammar authoring is expert work and the known bottleneck.** The CGA literature is frank that writing good rule files is hard, and the rules encode an architectural style the way our patterns encode a design language. The catalog *is* the product; generation is the cheap part. (This also flags the maintenance cost doc 01 addresses with catalog-from-source generation.)

### 4.3 Seeded randomness and reproducibility

Procgen's reproducibility discipline is absolute: a [map seed](https://en.wikipedia.org/wiki/Map_seed) plus a fixed generator version fully determines the world. Minecraft ships `/seed` so any multi-gigabyte world can be reconstructed from a short string; No Man's Sky derives 18 quintillion planets deterministically from seed arithmetic — the planet isn't stored, it's *recomputed identically on demand*. Engineering practices that make this hold:

- **Never share one global RNG across subsystems.** Any change in call order silently changes everything downstream. The standard fix is **hierarchical/hash-based seeding**: each region/feature derives its own stream, e.g. `seed_feature = hash(world_seed, chunk_x, chunk_y, "trees")`. Adding a new consumer can't perturb existing ones.
- **Same seed + different generator version = different world.** Determinism is a property of (data, code-version) pairs, not data alone. Unreal's PCG docs make the same caveat: a seed is deterministic *relative to a specific graph*; edit the graph and the seed means something else.

Doc 04 already pins seeded faker data; the game-engine refinements to adopt are (a) hashed per-node sub-seeds (`hash(project_seed, node_id)`) so fixture data is stable per node and inserting a new node never reshuffles every other node's sample data, and (b) recording the builder version in the generation manifest, because a seed without a generator version is not a reproducibility guarantee.

### 4.4 The 10,000 bowls of oatmeal problem

Kate Compton's [So you want to build a generator...](https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator) names procgen's signature failure: it is trivial to generate 10,000 *mathematically unique* bowls of oatmeal (every oat differently placed) that are all *perceptually identical*. "Perceptual uniqueness is the real metric," and her bar above it is *perceptual differentiation* — would you notice this one? (Her test: "would you write fanfic about it?") No Man's Sky at launch became the canonical cautionary tale — [18 quintillion bowls of oatmeal](https://www.vice.com/en/article/nz7d8q/no-mans-sky-review).

For construction-file prototyping the mapping is uncomfortable and worth stating plainly: **a pattern catalog is an oatmeal machine.** Every generated screen will be on-system, valid, and consistent — and the risk is that every prototype looks like the same competent settings page. Games mitigate with: hand-authored hero/landmark assets breaking up generated tissue (→ our `CustomBlock` escape hatch is a feature for *distinctiveness*, not just coverage); generators constrained toward meaningfully different *structure*, not just reshuffled parameters (→ pattern variety and layout-level alternatives matter more than prop permutations); and human curation as the final pass (→ the designer in the iteration loop is load-bearing, not vestigial). This is also the steelman for doc 05's caveat about expressive one-off work: oatmeal machines should not be used to cook the signature dish.

---

## 5. Asset pipelines: import determinism, caching, hot reload

A game asset pipeline is a deterministic builder at industrial scale: thousands of source assets (FBX, PNG, WAV) are *imported* — transformed into engine-ready representations — reproducibly, incrementally, and cacheably.

**Stable identity: Unity `.meta` files and GUIDs.** Every asset gets a sidecar `.meta` file at first import, containing a freshly minted **GUID** plus the asset's import settings ([Unity at Scale: meta files and GUIDs](https://unityatscale.com/unity-meta-file-guide/understanding-meta-files-and-guids/), [ITNEXT explainer](https://itnext.io/why-we-need-meta-files-in-unity-understanding-their-role-and-importance-3ce99622bf0a)). All cross-asset references are stored as GUIDs, never paths — so renames and moves are free (the `.meta` travels with the file), and identity survives any refactor. The system's two famous failure modes prove the design's importance in the negative: (1) failing to commit `.meta` files means teammates' Unity mints *different* GUIDs and every reference into those assets breaks; (2) duplicating a file with its `.meta` produces a GUID collision and nondeterministic reference resolution. Within a file, objects get **file IDs** (local IDs), so a full reference is `(GUID, fileID)` — global asset identity plus local object identity. Godot 4's `uid://` system is the same idea with a diff-friendlier surface (§2.3).

**Deterministic import + content-hash caching.** Unity's rebuilt Asset Import Pipeline ([Unity blog](https://blog.unity.com/technology/the-new-asset-import-pipeline-solid-foundation-for-speeding-up-asset-imports)) requires importers to be deterministic functions of *declared inputs*: source bytes, import settings, importer version, platform. The pipeline hashes all of these into a revision key; the [Cache Server / Accelerator](https://docs.unity3d.com/2020.1/Documentation/Manual/CacheServer.html) maps revision-key → import result, so an asset imported by anyone on the team is a download, not a recomputation, for everyone else. Corollaries: importers must *declare* their dependencies (hidden dependencies poison the cache — Unity ships an [import consistency checker](https://docs.unity3d.com/Manual/ImporterConsistency.html) that re-imports and diffs hashes to catch nondeterminism), and bumping an importer's version number is how you signal "all cached results of mine are now invalid."

Mapping: doc 04's generation manifest currently hashes *outputs* (for clobber detection). The pipeline pattern says also hash *inputs* — `hash(construction file, catalog version, builder version, template set)` — giving (a) incremental builds (only rebuild screens whose input hash changed), (b) shareable build caches, and (c) a precise staleness definition: a generated file is stale iff its recorded input hash ≠ current input hash. Builder nondeterminism can be caught exactly like Unity does: rebuild twice, diff hashes, fail CI on mismatch.

**Hot reload.** Every serious engine reloads changed *assets/data* into the running game without restart — Bevy's [asset hot-reloading](https://bevy-cheatbook.github.io/assets/hot-reload.html) watches files and re-loads through stable asset handles; [Defold's hot reload](https://defold.com/manuals/hot-reload/) targets live tweaking of gameplay parameters. The enabling architecture is indirection: game code holds *handles*, not data, so the pipeline can swap what a handle points to. Note the asymmetry: data hot-reloads trivially; *code* hot-reload (Unreal Live Coding) is far harder and flakier. Our architecture happens to sit on the easy side — the construction file is data, so "construction file changed → builder incrementally rebuilds → Vite HMR updates the preview" is a fully conventional data-hot-reload loop, and its latency budget (sub-second, like an engine's) is the right target for the iteration loop's feel.

---

## 6. Level editors as the human-in-the-loop layer

Game studios never chose between "procedural" and "hand-made"; the level editor is where the two coexist. The recurring mechanisms:

- **Parameters first, then instance overrides, then bake.** Unreal's [PCG framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-framework-in-unreal-engine) (node-graph scattering/generation living *inside* the level editor, live-updating in the viewport) shows the canonical ladder. First resort: adjust generator inputs (seed, density, spline shape) and regenerate — the edit lives *upstream* and survives regeneration forever. Second: post-process the output with exclusion volumes/filters — still declarative, still regeneration-proof. Last resort: **bake** ("Convert to Static Mesh Actors") — freeze the output into plain editable actors, accepting that the frozen part no longer regenerates. The bake is explicit, chunked, and chosen — never an accident.
- **Houdini HDAs: procedural assets with an artist-facing parameter contract.** A [Houdini Digital Asset](https://www.sidefx.com/docs/houdini/assets/) wraps an arbitrary procedural network behind a curated parameter interface; level artists place HDA instances in Unreal/Unity and tweak *exposed parameters only*, while the network stays regenerable and centrally upgradable. Non-destructive, art-directable pipelines are the whole sales pitch ([Devoted Studios on Houdini in game production](https://devotedstudios.com/the-houdini-generation-how-procedural-workflows-are-changing-game-development/)). The contract is the point: what's a parameter is *designed*, and everything not exposed is protected from well-meaning hand edits.
- **Townscaper inverts the loop**: instead of "generate, then let humans fix," the human continuously steers (click = intent) and the solver instantly re-satisfies constraints around each edit. Human edits are *inputs to* generation, not *patches over* it — so there is nothing to clobber.
- **Editor as validator**: engine editors refuse or visibly flag invalid states (missing refs shown in red, incompatible drops rejected) rather than letting invalid data exist quietly.

Mapping to doc 05's hybrid split: the ladder *upstream-edit → declarative override → explicit bake* is a more refined story than "builder-owned vs LLM-owned files." Concretely: (1) prefer edits to the construction file/pattern parameters over edits to output — tooling should make the upstream edit the easy path, exactly as PCG's live-regenerating viewport does; (2) instance overrides in the construction file are the middle rung — regeneration-proof because the builder replays them (USD-style) rather than preserving output text; (3) "ejecting" a screen or subtree to hand-owned code is the bake — legitimate, but explicit, per-subtree, and recorded in the manifest so nobody expects it to regenerate. And Townscaper is the north star for the eventual interactive editor: designer manipulations should be captured *as construction-file edits* (solver/builder re-runs instantly), never as mutations of generated output.

---

## 7. Lessons for construction-file prototyping

The compressed mapping table, then the load-bearing mappings in detail:

| Game-engine pattern | Home domain | Construction-file counterpart |
|---|---|---|
| Prefab instance + property overrides | Unity/Godot scenes | Pattern reference + slot/prop customization; store deltas only |
| Prefab variants / data-only Blueprints | Unity/Unreal | Named pattern variants as pure deltas over a base pattern |
| Apply / Revert verbs | Unity override UI | First-class "promote override into pattern" and "reset to pattern" ops |
| USD layers + LIVRPS strength ordering | Pixar/VFX pipelines | Builder base layer + LLM delta layer + human delta layer, composed not mutated |
| ECS entity/component/system | Engine architecture | Node ID / (type + props) / builder & runtime; capability-based slot rules |
| WFC adjacency constraints on a tile catalog | Procgen | Slot/nesting validity constraints in the schema; illegal arrangements unrepresentable |
| WFC's local-vs-global limit | Procgen | Patterns provide global structure; primitives are constraint-checked infill |
| Shape grammar (CGA) productions | CityEngine | Pattern expansion rules in the builder; few, intent-level parameters |
| Map seeds + hashed sub-seeds | Minecraft/NMS | `hash(project_seed, node_id)` per-node fixture data; builder version in manifest |
| `.meta` GUIDs / Godot `uid://` | Asset pipelines | Immutable node IDs minted at creation, never derived from position/content |
| Deterministic import + content-hash cache | Unity Accelerator | Input-hash manifest → incremental builds, staleness detection, CI determinism check |
| UnityYAMLMerge smart merge | Unity VCS workflow | Schema-aware construction-file merge driver + post-merge validation |
| Asset hot reload via handles | Bevy/Defold | Construction-file watch → incremental build → HMR preview |
| PCG parameter-edit → override → bake ladder | Unreal editor | Upstream edit → construction-file override → explicit per-subtree eject |
| 10,000 bowls of oatmeal | Procgen criticism | Catalog sameness risk; CustomBlock as distinctiveness valve; curation is load-bearing |

### 7.1 Prefab overrides → the slot customization model

The prefab systems converge on rules our schema should adopt wholesale: **(a) instances store sparse deltas, never copies** — a construction-file pattern instance should serialize only what differs from the pattern (Godot's default-elision), which keeps files small, makes diffs meaningful, and lets pattern improvements propagate to all uncustomized instances automatically; **(b) overrides need Apply/Revert as first-class operations** — "this instance's tweak should become the pattern default" (apply) and "re-sync this instance with the pattern" (revert) are the two verbs that keep an override-based system from silently forking, and both are cheap builder features; **(c) override addressing is the fragile joint** — Unity loses overrides when file IDs go stale; our deltas must target immutable node IDs (§7.4) and the semantic lint should hard-fail on danglers rather than silently dropping them; **(d) reference semantics from day one** — Unity's 13-year nested-prefab saga is the cost of shipping copy semantics first; nested pattern instances (a pattern whose slot contains another pattern instance) must stay live references with delta chains, and outer-instance customizations of inner instances belong to the *outer* instance's delta set, exactly as Unity 2018.3 finally serialized it; **(e) keep one composition primitive** — Godot's everything-is-a-scene uniformity beats Unity's scene/prefab/variant ontology; patterns, screens, and variants should all be construction-file trees over the same schema, with "variant" just meaning a tree that declares a base plus deltas.

### 7.2 USD layering → deterministic base + LLM-authored deltas

USD offers a cleaner formal model for stage 5 than in-place mutation of one construction file: hold the composed screen as a **stack of sparse layers with fixed strength ordering** — pattern/catalog defaults (weakest, builder-owned) ← LLM generation layer (the initial construction file) ← LLM iteration opinions ← human/designer opinions (strongest). Each iteration writes an *opinion* ("node `hdr-1`, prop `sticky` = true") into the appropriate layer instead of rewriting the file. What this buys, verbatim from the VFX experience: **upgrades compose instead of conflict** (a pattern's new default flows through unless a stronger layer holds an opinion — precisely the drift problem doc 05's manifest currently detects after the fact, prevented structurally instead); **provenance is free** (which layer holds the opinion answers "did the model or the human decide this?" — invaluable for the re-adopt flow and for debugging); **discard is surgical** ("throw away the model's iteration but keep mine" = drop one layer). The cost is real: LIVRPS-style resolution is USD's hardest concept, and full arc algebra is overkill. The pragmatic subset is 3–4 fixed sublayers with simple "stronger wins per property" — Photoshop layers, not the full liver-peas. Whether the extra machinery beats plain JSON Patch on one file is a genuine open question (§9), but the *conceptual* commitment is adoptable either way: **iteration output should be expressible as sparse opinions against stable IDs**, which is what makes patch-based editing, drift detection, and layer separation all possible.

### 7.3 WFC adjacency → layout validity constraints in the schema

WFC's core lesson is *where* to put validity: in the option space, before generation, not in a checker after. Concretely: **(a) encode slot compatibility as data in the catalog** — each pattern slot declares what it accepts (by capability/trait, per §3), each primitive declares its traits, and this adjacency table drives three consumers from one source: schema generation (where structured outputs can express it), the semantic linter (where they can't — JSON Schema can't say "FormField only inside Form"), and eventually editor UI (legal-drop highlighting); **(b) accept the constrained-decoding limit and layer the defense** — provider-native structured outputs enforce the *vocabulary* (enums) and local shape, the lint enforces *adjacency*, and the repair loop is the backtracking step — WFC's observe/propagate/backtrack loop is structurally identical to generate/validate/repair, which suggests repair prompts should work like propagation: report *which node's domain emptied and what the legal options were* ("slot `form-1.actions` accepts [Button, ButtonGroup]; found `Table`"), not just "invalid"; **(c) don't expect local rules to produce global quality** — adjacency keeps screens legal, patterns and intent make them good; this is the WFC-derived argument for pattern-first granularity (E2) and for never shipping an atomic-only catalog; **(d) most-constrained-first ordering** — in schema field ordering and few-shot examples, fix the most constrained regions (chrome, required slots) before free-form content.

### 7.4 `.meta` GUIDs → stable IDs for patch targeting

The asset-pipeline identity rules, transplanted: **mint an opaque ID for every node at creation time; never derive it from name, position, or content; never reuse it; address every patch, override, and cross-reference by it.** Unity's GUID system survives two decades of production because renames/moves are free when references bind to identity rather than location — the same property that lets JSON Patches survive tree reorganization (doc 05's id-keyed children) and lets override layers (§7.2) survive pattern refactors. The negative lessons transfer too: *uncommitted `.meta` files* → the ID must be minted once, in the construction file itself, at generation time — never assigned late or regenerated by the builder, or two builds mint different IDs and every patch breaks; *GUID collisions from file duplication* → duplicating a subtree in a construction file must re-mint IDs for the copy, and the linter should treat duplicate IDs as a hard error; *(GUID, fileID) two-level addressing* → the natural analog is `(screen/file id, node id)` so cross-screen references (nav targets, shared pattern instances) have a stable global form. Cheap to implement, catastrophic to retrofit — this belongs in the E1 vertical slice from the first line of schema.

### 7.5 UnityYAMLMerge → construction-file merge tooling

If construction files live in git and more than one actor edits them (two designers; a human and an agent; two agent sessions), Unity's history predicts the failure exactly: text-level merges of structured scene data produce graph-level corruption. The Smart Merge recipe is fully reusable because our format is simpler than Unity's: a `construction-merge` tool registered as a **git merge driver** for `*.construction.yaml` that (1) parses base/ours/theirs, (2) merges per-node-ID and per-property — both sides touching *different* nodes or different props of the same node auto-merges cleanly regardless of textual adjacency, (3) applies domain rules for the hard cases (id-keyed child lists make reorder-vs-insert tractable; same-property conflicts surface to the human/model with both values), and (4) *always* runs schema + semantic lint on the result — Unity practitioners' post-merge ritual, automated. Note the layered-composition dividend: in a §7.2 layer model, many merges disappear entirely, because two actors editing different layers never conflict at the file level. And Godot's contribution is that format design shrinks the problem before tooling starts: default-elided, stably-ordered, id-sectioned YAML (canonicalized by the builder, like pinned Prettier for code) makes even the raw git diff mostly trustworthy.

### 7.6 Editors and the bake ladder → iteration policy

From §6, restated as policy: every edit should land at the highest rung it can — **intent/parameter edit** (regenerates forever) > **construction-file override** (replayed by the builder forever) > **explicit eject/bake of a marked subtree** (stops regenerating, recorded in the manifest). The skill should implement the rungs as distinct tools, make the upstream rung the lowest-friction path (live rebuild-on-save, like PCG's viewport), and treat any hand edit to builder-owned output *without* an eject record as drift to flag — never to silently absorb.

---

## 8. Failure stories & tradeoffs

Game development's scar tissue, as applied warnings:

- **Prefab hell.** Deep variant/nesting chains where nobody can predict what changing a base will do; overrides silently lost when structure shifts under them; "unpacking" (severing the prefab connection — copy-semantics bail-out) used as a panic button, after which instances fork permanently. Warning: override chains are a *depth-budgeted* resource. Keep pattern inheritance shallow (one variant level is plenty for a prototype system), lint dangling overrides loudly, and make the eject/unpack operation explicit and recorded — the panic button gets pressed exactly when tooling hides what's overriding what.
- **The 13-year nested prefab gap.** Copy-semantics composition shipped first because it's easy to serialize; reference semantics took a decade-plus to retrofit. Shipping the E1 slice without live nested pattern references "for simplicity" would replay this — flattened patterns can't absorb catalog improvements, which quietly destroys the catalog's main maintenance dividend.
- **Scene merge disasters.** Teams that treated `.unity` files as ordinary text lost work to semantically-broken auto-merges and regressed to exclusive file locks — serializing collaboration to protect serialization. If construction files ever feel merge-dangerous, users will lock or fork them and the architecture loses its multi-actor story; §7.5's merge driver plus small per-screen files is the antidote, and it is much easier to provide from day one than to retrofit into user habits.
- **Procgen sameness.** No Man's Sky's launch (quintillions of planets, one vibe) and Compton's oatmeal formalize the ceiling: a generator's perceived variety is bounded by the *structural* variety of its catalog, not the combinatorics of its parameters. For a design-system-constrained UI generator, sameness is partly the point (consistency!) — but it caps the tool at "competent on-system screens." The honest framing for users: this tool makes oatmeal fast and flawlessly; the fanfic-worthy screen still gets hand-crafted (via CustomBlock or the normal agent-writes-code path), and the E6 escape-hatch experiment is really measuring where that boundary sits.
- **Determinism erosion.** Unity needed a consistency checker because importers *drift* into nondeterminism (hidden dependencies, iteration-order leaks, timestamps). Builders do too. The cheap insurance is Unity's own: a CI job that builds every fixture twice and diffs output hashes, from E1 onward.
- **The tradeoff ledger.** Prefab/override systems trade *write-time simplicity* for *read-time resolution complexity* — every layer of override indirection is one more thing a human must mentally compose to answer "what will this actually render as?" Engines mitigate with inspector UIs that show composed values with override badges; our equivalent (a "composed view" of a construction file with per-property provenance) should be considered part of the core tooling, not a luxury. Similarly, smart merge tools and layered composition both *reduce* conflicts but *raise* the floor of tooling users must trust; Godot's counter-position (make the raw format so clean that plain tools mostly work) is the right first investment, with the smart tooling layered above it.

---

## 9. Open questions

1. **Layers vs patches.** Is USD-style sublayering (builder base + LLM layer + human layer, composed at build time) worth its resolution complexity for prototypes, or is doc 05's single file + JSON Patch + manifest the right 90% solution? A concrete tiebreaker: run E5 (iteration economics) both ways and count drift incidents and "whose change was this?" confusions, not just tokens.
2. **How far can adjacency constraints go in the schema layer?** WFC's power assumes a solver that *enforces* constraints during placement; we only get vocabulary enforcement from structured outputs, with adjacency deferred to lint+repair. Is there a middle path — e.g., generating per-slot sub-schemas (each slot's `children` enum narrowed to its legal fill set) so more adjacency moves into the grammar the decoder enforces? Cost: schema size explosion; worth measuring against repair-loop frequency in E1.
3. **Should the builder ever run an actual constraint solver?** For layout specifically (grid placement, responsive breakpoint assignment), a WFC/CSP pass over builder-owned decisions could guarantee properties (no overflow, alignment consistency) the LLM can't. This blurs the "builder is dumb and deterministic" line — a solver is deterministic given a seed, but its output is less predictable to humans. Where is the predictability/quality frontier?
4. **Variant depth budget.** Unity supports unbounded variant chains and teams get lost past ~2–3 levels. What's the right *enforced* cap for pattern inheritance in the schema — is one level of variants plus instance overrides provably sufficient for a prototype-scale catalog?
5. **Bake granularity.** Engines bake at the actor/mesh level; doc 05 ejects at file level. Game experience suggests subtree-level ejection ("this hero section is hand-owned now, the rest of the screen regenerates") is what users actually want. Can the manifest track ejection per node ID without making drift detection quadratically fiddlier?
6. **Interactive-editor endgame.** Townscaper's model — human gestures become construction-file edits, builder re-solves instantly — is the strongest UX north star found in this research. Does the eventual Puck-style runtime interpreter (doc 04's phase 2) adopt this "editor writes the construction file, never the output" invariant from the start, and what latency does it require to feel Townscaper-grade (their bar is single-frame)?
7. **Sameness metrics.** Compton gives a vocabulary (perceptual uniqueness/differentiation) but no metric. For E2/E6, is there a cheap proxy for "these 10 generated screens are oatmeal" — e.g., structural-diff distance between construction files, or screenshot embedding dispersion — that could become a catalog-health dashboard alongside CustomBlock telemetry?

---

## Sources

**Prefabs & composition:** [Unity Manual: Prefab Variants](https://docs.unity3d.com/Manual/PrefabVariants.html) · [Game Dev Beginner: Prefabs explained](https://gamedevbeginner.com/how-to-use-prefabs-in-unity/) · [Unity Discussions: the nested prefab problem](https://discussions.unity.com/t/what-is-the-nested-prefab-problem/659499) · [Bugnet: prefab variant overrides being lost](https://bugnet.io/blog/fix-unity-prefab-variant-overrides-being-lost) · [Unreal: Blueprint Class Assets](https://dev.epicgames.com/documentation/unreal-engine/blueprint-class-assets-in-unreal-engine) · [Unreal: Data Assets](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-assets-in-unreal-engine) · [unreal-garden: Data-driven design](https://unreal-garden.com/tutorials/data-driven-design/) · [Wayline: Godot scenes vs Unity prefabs](https://www.wayline.io/blog/godot-scenes-vs-unity-prefabs) · [Alfred Baudisch: From Unity to Godot](https://alfredbaudisch.medium.com/from-unity-to-godot-game-objects-and-components-in-godot-84594874efdc)

**Serialization & merge:** [Unity Manual: Smart Merge](https://docs.unity3d.com/6000.3/Documentation/Manual/SmartMerge.html) · [Unity Learn: Working with YAMLMerge](https://learn.unity.com/tutorial/working-with-yamlmerge) · [andreasjakl.com: UnityYAMLMerge setup](https://www.andreasjakl.com/resoving-unity-scene-merge-conflicts-unityyamlmerge-tortoisegit/) · [7wolves: Unity YAML merge workflows](https://7wolves.org/articles/unity-yaml-merge/) · [Godot docs: TSCN file format](https://docs.godotengine.org/en/stable/engine_details/file_formats/tscn.html) · [USD Glossary](https://graphics.pixar.com/usd/docs/USD-Glossary.html) · [Remedy USDBook: LIVRPS](https://remedy-entertainment.github.io/USDBook/terminology/LIVRPS.html) · [NVIDIA: Composition arcs and strength ordering](https://docs.nvidia.com/learn-openusd/latest/composition-basics/strength-ordering.html) · [AOUSD: What is OpenUSD](https://aousd.org/blog/explainer-series-what-is-openusd/)

**ECS:** [Wikipedia: Entity component system](https://en.wikipedia.org/wiki/Entity_component_system) · [LeatherBee: Inheritance vs composition and ECS background](https://leatherbee.org/index.php/2019/09/12/ecs-1-inheritance-vs-composition-and-ecs-background/) · [Unity DOTS](https://unity.com/dots) · [Unity Learn: Data-oriented design](https://learn.unity.com/tutorial/part-1-understand-data-oriented-design)

**Procgen:** [Maxim Gumin: WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse) · [BorisTheBrave: Wave Function Collapse Explained](https://www.boristhebrave.com/2020/04/13/wave-function-collapse-explained/) · [Wikipedia: Model synthesis](https://en.wikipedia.org/wiki/Model_synthesis) · [Game Developer: How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making) · [Esri: CityEngine introduction](https://doc.arcgis.com/en/cityengine/latest/get-started/get-started-about-cityengine.htm) · [CGA shape grammar manual](http://cehelp.esri.com/help/topic/com.procedural.cityengine.help/html/manual/cga/basics/toc.html) · [Wikipedia: Map seed](https://en.wikipedia.org/wiki/Map_seed) · [Kate Compton: So you want to build a generator](https://galaxykate0.tumblr.com/post/139774965871/so-you-want-to-build-a-generator) · [Game Developer: Practical procedural generation](https://www.gamedeveloper.com/design/practical-procedural-generation-for-everyone-) · [Vice: 18 quintillion bowls of oatmeal](https://www.vice.com/en/article/nz7d8q/no-mans-sky-review)

**Pipelines & editors:** [Unity blog: The new Asset Import Pipeline](https://blog.unity.com/technology/the-new-asset-import-pipeline-solid-foundation-for-speeding-up-asset-imports) · [Unity Manual: Cache Server](https://docs.unity3d.com/2020.1/Documentation/Manual/CacheServer.html) · [Unity Manual: Importer consistency](https://docs.unity3d.com/Manual/ImporterConsistency.html) · [Unity at Scale: .meta files and GUIDs](https://unityatscale.com/unity-meta-file-guide/understanding-meta-files-and-guids/) · [ITNEXT: Why we need .meta files](https://itnext.io/why-we-need-meta-files-in-unity-understanding-their-role-and-importance-3ce99622bf0a) · [Unreal: PCG framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-framework-in-unreal-engine) · [SideFX: Houdini Digital Assets](https://www.sidefx.com/docs/houdini/assets/) · [Devoted Studios: Houdini in game production](https://devotedstudios.com/the-houdini-generation-how-procedural-workflows-are-changing-game-development/) · [Bevy cheatbook: Hot-reloading assets](https://bevy-cheatbook.github.io/assets/hot-reload.html) · [Defold: Hot reload manual](https://defold.com/manuals/hot-reload/)
