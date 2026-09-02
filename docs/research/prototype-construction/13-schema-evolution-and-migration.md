# Schema Evolution and Migration — What Happens to Hundreds of Construction Files When the Catalog Changes

**Scope:** The one gap the synthesis flagged and no earlier doc closed: *"there is no construction-file migration story when pattern schemas evolve"* ([00 §Cross-domain lessons](00-architecture-synthesis.md)). This doc answers, with live-verified evidence, what should happen to existing construction files when a pattern is renamed, a slot is split, a prop enum gains or loses values, a pattern is deprecated, a token is retired, or a layout preset changes — and what tooling and policy make that survivable at the scale of hundreds of files. It builds on, and does not repeat: the protobuf `reserved`/stable-id rules and `buf breaking` recommendation in [08 §6.1 and §8.4](08-compiler-ir-build-patterns.md); Unity GUID / Godot `uid://` identity in [07 §7.4](07-game-engine-patterns.md); Terraform state, `moved` blocks and CRD versioning in [06 §2.3 and §3.4](06-declarative-infrastructure-patterns.md) (Lesson 8 there stated the requirement; this doc designs it); the codemod-vs-LLM-vs-normalization question in [04 §10 Q4](04-deterministic-assembly.md); drift and re-adopt in [05 §4.2–4.3](05-surgical-editing-iteration.md); MDE's lifecycle warning L9 in [09](09-model-driven-engineering.md); and exemplar-gallery staleness in [02 §8 Q5](02-intent-spec-and-context.md). Out of scope: migrating *generated code* between framework versions (that is ordinary codemod work on builder output, which is regenerable), and Figma-side library migration except as a UX precedent. Verified live 2026-09-02; fetch failures are marked inline.

## Table of Contents

1. [The problem, sized: a taxonomy of catalog changes](#1-the-problem-sized-a-taxonomy-of-catalog-changes)
2. [Schema-versioning disciplines](#2-schema-versioning-disciplines)
3. [Migration execution: codemods, document migrators, engine upgraders](#3-migration-execution-codemods-document-migrators-engine-upgraders)
4. [LLM-assisted migration: the evidence](#4-llm-assisted-migration-the-evidence)
5. [Policy: windows, reservations, expand/contract, CI, idempotency, drift](#5-policy-windows-reservations-expandcontract-ci-idempotency-drift)
6. [Designer-facing UX](#6-designer-facing-ux)
7. [Recommended migration architecture, with a worked example](#7-recommended-migration-architecture-with-a-worked-example)
8. [Tradeoffs](#8-tradeoffs)
9. [Open questions](#9-open-questions)
10. [Recommended experiments](#10-recommended-experiments)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. The problem, sized: a taxonomy of catalog changes

Construction files are small JSON trees of pattern references, id-keyed children and token references, validated against a Zod-derived schema (docs 01/03). The catalog regenerates from design-system source (doc 01), so a design-system release can change the schema *without anyone authoring a schema change on purpose* — [06 §Open question 7](06-declarative-infrastructure-patterns.md) already asked whether the catalog is "the *second* declarative system" that needs its own plan/apply. It is. The change classes, ranked by how mechanically they migrate:

| Catalog change | Analogue | Mechanically migratable? | Failure if ignored |
|---|---|---|---|
| Pattern/prop **renamed** | Unreal `PropertyRedirects`, Unity `FormerlySerializedAs`, Terraform `moved` | Yes — pure alias table | Old files fail enum validation; every file with the pattern is dead |
| Prop enum **gains** a value | Protobuf "Adding additional values to an enum is safe" ([protobuf.dev](https://protobuf.dev/programming-guides/proto3/)) | No migration needed (backward-compatible); only an *older builder* reading a *newer file* breaks | None for existing files |
| Prop enum **loses/replaces** values | Buf `ENUM_VALUE_NO_DELETE` | Yes if a value map is declared; otherwise a judgment call | Silent semantic drift if a new value is guessed |
| **Slot split** (one slot → two) | Cambria `hoist`/`wrap`; K8s conversion webhook with custom logic | Partly — a routing rule covers the common case; ambiguous children are residual | Children land in the wrong slot |
| Pattern **deprecated/removed** | GraphQL `@deprecated` → remove; K8s beta window | Yes if a replacement pattern + prop map is declared | Files reference a pattern that no longer builds |
| Token **retired** | DTCG `$deprecated` + alias | Yes if an alias is published | Off-system value or missing style |
| Layout preset **changes meaning** | USD versioned schema identifier (`SphereLight_2`) | Only if the old preset is kept under a versioned name; never change semantics in place | Every screen re-lays-out silently — the parametric-CAD regeneration failure from [11](11-constraint-and-generative-layout.md) |

Two observations shape everything below. First, five of seven rows are fully mechanical *provided the catalog change carries its own migration metadata* (alias, value map, replacement, routing rule). The policy problem is therefore mostly "force catalog authors to declare intent at change time," which is exactly what protobuf `reserved`, Terraform `moved`, and Unity `FormerlySerializedAs` do. Second, the residual (ambiguous slot splits, semantic preset changes, enum values with no map) is small, local, and describable — the right shape for an LLM pass with human review, not for an LLM pass over everything.

---

## 2. Schema-versioning disciplines

### 2.1 Kubernetes: served versions, one storage version, hub-and-spoke conversion

The most mature precedent for "many versions of one schema, all live at once." A CRD lists versions with two independent flags: "One and only one version must be marked as the storage version," while any number may be served; "custom resource objects must sometimes be converted between the version they are stored at and the version they are served at," and the doc promises "It is safe for clients to use both the old and new version before, during and after upgrading the objects to a new stored version" ([Versions in CustomResourceDefinitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/)). Kubebuilder's implementation pattern is to "mark one version as the 'hub', and all other versions just define conversion to and from the hub," which "cuts down on the number of conversion functions to define" from quadratic to linear ([Kubebuilder — conversion concepts](https://book.kubebuilder.io/multiversion-tutorial/conversion-concepts)). Rewriting what is already stored is a separate tool: the storage version migrator "migrates stored data in etcd to the latest storage version" ([kube-storage-version-migrator](https://github.com/kubernetes-sigs/kube-storage-version-migrator); last push 2023-10-20 per GitHub API — a KEP-driven auto-trigger has since moved into core, not verified here).

The deprecation policy is the strictest published: "Rule #1: API elements may only be removed by incrementing the version of the API group"; "Rule #2: API objects must be able to round-trip between API versions" — "an object can be written as v1 and then read back as v2 and converted to v1, and the resulting v1 resource will be identical to the original"; GA versions "must not be removed within a major version of Kubernetes"; beta versions are "deprecated no more than 9 months or 3 minor releases after introduction (whichever is longer), and are no longer served 9 months or 3 minor releases after deprecation" ([Kubernetes Deprecation Policy](https://kubernetes.io/docs/reference/using-api/deprecation-policy/)). The round-trip rule is the one that matters for us: it forces a *lossless* representation of old fields in the new version (the policy's own example renames a deprecated `magnitude` to `deprecatedMagnitude` rather than dropping it), which is the price of being able to serve both.

**For us:** construction files are documents, not API objects, so we do not need to *serve* v1 — but we do need the hub idea. The builder should accept exactly one version (the hub = current), and every migrator converts *toward* it. Lossless round-trip is optional: prototypes rarely need to be downgraded, and Cambria's experience (§3.2) shows bidirectionality is where the complexity lives.

### 2.2 Protobuf and Buf: reservations enforced in CI

[08 §6.1](08-compiler-ir-build-patterns.md) covered field numbers and `reserved`. What that doc did not spell out is *why* protobuf treats reuse as a security issue, and how Buf turns the rules into a PR gate. protobuf's guide lists the consequences of decoding a field under a different definition: "Developer time lost to debugging, A parse/merge error (best case scenario), Leaked PII/SPII, Data corruption" ([Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)). Buf's `breaking` command groups rules into four categories, "FILE" (default; "Detects changes that move generated code between files"), "PACKAGE", "WIRE_JSON" ("Because JSON is common across many transports, this is the recommended minimum level") and "WIRE"; representative rules are `FIELD_NO_DELETE_UNLESS_NUMBER_RESERVED` ("reusing these numbers in the future is likely to result wire incompatibilities if the type differs"), `FIELD_NO_DELETE_UNLESS_NAME_RESERVED` ("the JSON equivalent of reserving the number, since JSON uses field names instead of numbers"), `ENUM_VALUE_NO_DELETE`, `FIELD_SAME_TYPE`, and `RESERVED_MESSAGE_NO_DELETE` ("Deleting a reserved value means that future versions of your Protobuf schema could use names or numbers in those ranges") ([Buf — breaking rules](https://buf.build/docs/breaking/rules/)).

**For us:** the construction-file schema is JSON, so `FIELD_NO_DELETE_UNLESS_NAME_RESERVED` is the exact rule: a pattern name, prop name, enum value or token name, once shipped, either still exists or appears in a `reserved` list with a redirect. A `catalog breaking` CI step (§5.4) is a ~200-line diff of two Zod-derived JSON Schemas — not a research problem.

### 2.3 Avro / Schema Registry: compatibility modes as a vocabulary

Confluent's registry names the modes precisely: BACKWARD ("consumers using the new schema can read data produced with the last schema"; default), FORWARD ("data produced with a new schema can be read by consumers using the last schema"), FULL ("both backward **and** forward compatible"), each with a `_TRANSITIVE` variant that "ensures compatibility between X-2 <==> X-1 and X-1 <==> X and X-2 <==> X"; non-transitive modes check "against the latest version" only. The modes prescribe upgrade order: BACKWARD means "upgrade all consumers before you start producing new events," FORWARD means "upgrade all producers" first, FULL lets both "upgrade independently" ([Schema Evolution and Compatibility](https://docs.confluent.io/cloud/current/sr/fundamentals/schema-evolution.html); the Platform-docs URL returned only navigation chrome — Cloud docs used instead).

**For us:** the builder is the consumer, the LLM is the producer, and files are the messages. The only mode we can practically promise is **BACKWARD_TRANSITIVE toward the hub**: any file ever emitted can be read by the current builder (via the migrator chain). FORWARD (an old builder reading a new file) is worth *one* rule — unknown fields are preserved, not dropped (protobuf 3.5 unknown-field retention, [08 §6.1](08-compiler-ir-build-patterns.md)) — and otherwise a clear refusal: "file is schemaVersion 3, this builder supports ≤2."

### 2.4 OpenAPI 2→3, GraphQL, JSON Schema `$id`

OpenAPI's answer to a breaking format change was a converter, not a version field: swagger2openapi rewrites `host/basePath/schemes` to `servers`, `definitions` to `components.schemas`, body parameters to `requestBody`, with `--patch` to "fix small errors in source definitions", and was tested against "a corpus of 34,679 real-world Swagger 2.0 definitions" ([swagger2openapi README](https://github.com/APIs-guru/swagger2openapi); that GitHub fork's last push was 2017-11 per the API — the maintained copy lives in the Mermade `oas-kit` monorepo, not fetched). This is the "support forever via normalization" option from [04 §10 Q4](04-deterministic-assembly.md): one deterministic converter, run at load time. It works because the 2→3 mapping was total; it stops working the moment a change needs a judgment call.

GraphQL's discipline is additive-only. The spec defines `directive @deprecated(reason: String! = "No longer supported")` on fields, arguments, input fields, enum values and directives, and adds a constraint that is directly relevant to required props: "The `@deprecated` directive must not appear on required (non-null without a default) arguments or input object field definitions … To deprecate a required argument or input field, it must first be made optional" ([GraphQL spec, Type System — @deprecated](https://github.com/graphql/graphql-spec/blob/main/spec/Section%203%20--%20Type%20System.md); spec.graphql.org and graphql.org both returned 403 — the GitHub source was used, and the graphql.org "Versioning" best-practice text is *not verified* here). Apollo's operational loop is the missing half: mark `@deprecated`, then "the Clients & Operations table … can provide insight into what clients might still be using the deprecated fields," then "schema checks will check any changes pushed … against a recent window of operation tracing data to ensure that a deprecated field rollover can be completed without causing any breaking changes" ([Apollo — Schema deprecations](https://www.apollographql.com/docs/graphos/schema-design/guides/deprecations)). Usage telemetry, not a calendar, decides removal.

JSON Schema itself gives only an addressing convention: "it's recommended that you always use an absolute URI when declaring a base URI with `$id`" ([Structuring a complex schema](https://json-schema.org/understanding-json-schema/structuring)); versioning-in-the-`$id`-path is community practice, not spec. For us `$id: …/construction/v2/schema.json` plus a `schemaVersion: 2` field in each file is enough; the field is what the migrator reads, the `$id` is what editors use for validation.

### 2.5 Stripe: per-version transforms and a rollback window

Stripe's model is a migrator chain run *at request time*, in reverse. Versions are "rolling versions that are named with the date they're released (for example, `2017-05-24`)"; each backwards-incompatible change is encapsulated "in a *version change module* which defines documentation about the change, a transformation" and the API "walks back through time and applies each version change module that finds along the way until that target version is reached." Stripe has "maintained compatibility with every version of our API since the company's inception in 2011," and the post is candid about the cost: "every new version is more code to understand and maintain … dozens of checks on version changes that can't be encapsulated cleanly will be littered throughout the project" ([Stripe — APIs as infrastructure, Brandur Leach, 2017-08-05](https://stripe.com/blog/api-versioning)). (Third-party writeups describe the mechanism as "gates"; the term does not appear in the Stripe post itself — not verified.) The current upgrade policy adds two details worth copying: "Each monthly release includes only backward-compatible changes … Each major release, such as Basil, includes changes that aren't backward-compatible," and "For 72 hours after you've upgraded your API version, you can safely roll back" ([Stripe — API upgrades](https://docs.stripe.com/upgrades)).

**For us:** Stripe's chain runs *backward* (current → old) because the core lives in the present and old clients must keep working. Ours runs *forward* (old → current) because files are the persisted thing. Same module shape (description + transformation + affected types); opposite direction; and the "monthly = compatible, major = breaking" cadence maps onto catalog releases cleanly.

### 2.6 Design tokens: DTCG `$deprecated`

The first stable DTCG spec (2025.10) reserves `$deprecated`, accepting `true`, a string reason, or `false` "to override group defaults"; a group's `$deprecated` "extends to all child tokens" unless overridden; and "Tool makers *MAY* augment the string when it contains aliases," i.e. a deprecation reason can name the replacement token and tools may link it ([Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/)). This gives the token row of §1 a standard carrier: retire `{color.brand.primary}` by keeping it as an alias of the replacement with `$deprecated: "Use {color.accent.default}"`, and the construction-file migrator reads the same field to rewrite references — the token pipeline and the migrator share one source of truth.

---

## 3. Migration execution: codemods, document migrators, engine upgraders

### 3.1 Code codemods and versioned migration files

The mechanics differ; the *conventions* converge on: versioned, ordered, immutable-once-shipped, dry-runnable, and chained.

- **jscodeshift** (10,039 stars, last push 2026-09-01, MIT per GitHub API) offers `--dry` to "Preview changes without modifying files" and reports "ok, skipped, and error" counts per run ([jscodeshift](https://github.com/facebook/jscodeshift)). Codemod.com's 2026 post calls it "legacy" ("last meaningful update was years ago") ([npx codemod ai](https://codemod.com/blog/npx-codemod-ai)) — the repo's push date contradicts that; treat the claim as vendor positioning.
- **ast-grep** (15,732 stars) rewrites via `--rewrite` or a YAML `fix` field with metavariables (`pattern: $X = $Y` / `fix: $Y = $X`), and `--interactive` "prompts you to approve or reject individual changes" with `--update-all` to skip confirmation ([ast-grep — Rewrite code](https://ast-grep.github.io/guide/rewrite-code.html)). The interactive mode is the right default for anything touching designer-owned files.
- **Angular `ng update`** is the reference for *chained* migrations: "every entry-point targets a specific Angular CDK or Angular Material version," "The upgrade data for migrations is separated based on the target version. This is necessary in order to allow migrations run sequentially," and for an app on v5, `ng update` "only installs V7 and runs the V6 and V7 migrations *in order*" ([angular/components — update-schematic.md](https://github.com/angular/components/blob/main/src/cdk/schematics/ng-update/update-schematic.md)). Upgrade data is declarative per category — "Property name changes, Attribute selectors, Class names, CSS selectors" — which is precisely the alias-table shape our rename rows need.
- **Rails** fixes the bookkeeping: files named `YYYYMMDDHHMMSS_create_products.rb`, applied versions recorded "through the `schema_migrations` table," and the rule "editing existing migrations that have been already committed to source control is not a good idea … you should write a new migration" ([Active Record Migrations](https://guides.rubyonrails.org/active_record_migrations.html)).
- **Prisma 8** has moved to a migration *graph*: "A migration is a directory under `migrations/app/`, named with a timestamp and a slug," each recording "the schema hash it starts `from` [and] the schema hash it moves `to`," with per-operation precheck/execute/postcheck ([Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate)). The from/to *hash* is the detail to steal: a migrator that checks the input's schema hash cannot be run against the wrong version by accident.
- **Atlas** names the hybrid we want: versioned migrations describe "how to reach the state," declarative ones give "the desired state … as input to the migration engine, which plans and executes"; Atlas's "versioned migration authoring" keeps both — "Users still declare their desired state and use the Atlas engine to plan a safe migration … plans are instead written into normal migration files which can be checked-in to source control" ([Atlas — Declarative vs Versioned](https://atlasgo.io/concepts/declarative-vs-versioned)). For us: the *catalog diff* (old schema vs new) is the declarative input; the migrator file is the reviewable, versioned output.

### 3.2 JSON-document migrators and Cambria lenses

The npm ecosystem has small chain-of-`up`-functions libraries; the current best-shaped one is **json-up** (18 stars, last push 2026-09-02, MIT): "type-safe migrations for JSON" with "Zod schema validation at every step," a version number + Zod schema + `up` per migration, and an automatic `_version` key ([json-up](https://github.com/Nano-Collective/json-up)). That is a 200-line pattern, not a dependency to adopt — but "Zod schema per step" is the right invariant: every migration's output is validated against the schema *of that version* before the next step runs, so a broken migrator fails at the step that broke, not at the builder.

**Cambria** (Ink & Switch, essay October 2020) is the important precedent and the important warning. It "maintains a graph of data schemas, connected by bidirectional lenses that translate data between them," and — the part relevant to a patch-based pipeline — "Cambria lenses operate on patches in the JSON Patch standard," so a lens can convert an *edit* made under one schema into an edit under another ([Project Cambria](https://www.inkandswitch.com/cambria/)). The essay demonstrates operators including `rename`, `convert`, `head`, `in`, `hoist`, `remove`, `wrap`, `add` (the full operator list was not extracted; `plunge`/`map` are *not verified*). Status, verified via the GitHub API: not archived, 696 stars, last push 2024-06-14, and the README still says "⚠ Cambria is still immature software, and isn't yet ready for production use" ([cambria-project](https://github.com/inkandswitch/cambria-project)). The essay's open problems are the honest list of where bidirectionality hurts: no mechanism for "augmenting data" a new schema needs, recursive schemas unexplored, cross-document migrations unresolved, and for scalar↔array conversions "there is no ideal solution." **Verdict:** adopt Cambria's *operator vocabulary* (it is exactly §1's change taxonomy expressed as data) and its insight that migrations should be expressible over JSON Patch; do not adopt bidirectionality — a forward-only chain to the hub avoids every open problem on that list.

### 3.3 Engine asset upgraders: aliases at load time

Game engines solved "rename without breaking a million assets" with *load-time redirect tables* rather than batch rewrites:

- Unity's `[FormerlySerializedAs("oldName")]` exists to "rename a field without losing its serialized value"; the documented workflow is add attribute → rename → re-save assets → optionally remove the attribute ([Unity — FormerlySerializedAsAttribute](https://docs.unity3d.com/ScriptReference/Serialization.FormerlySerializedAsAttribute.html)).
- Unreal's Core Redirects "enable remapping classes, enums, functions, packages, properties, and structs at load time," with `ClassRedirects`, `StructRedirects`, `EnumRedirects` ("Remaps obsolete UENUM types and/or obsolete values within an enumerated type"), `FunctionRedirects`, `PropertyRedirects`, `PackageRedirects`, configured as e.g. `+PropertyRedirects=(OldName="MyActor.OldProperty",NewName="NewProperty")` — and a caveat that substring redirects should have assets "resaved immediately … and that the Core Redirect be deleted" because they "can impact startup times" ([Unreal — Core Redirects](https://dev.epicgames.com/documentation/unreal-engine/core-redirects-in-unreal-engine)). Note `EnumRedirects` remaps *values*, not just types — the §1 "enum loses values" row, solved as data.
- Blender's policy is the most complete statement of migrator-chain discipline: on read, "Unknown data is ignored. Missing data is initialized with default values. A versioning code is executed, which incrementally applies all required conversion processes from the initial version of the .blend file to the current version"; conversion code has "no hard 'end of life'" — "Blender 4.0 can still open .blend files from over 20 years ago" — though "conversion code may be removed after that the related feature has been deprecated for at least two years"; and "Critical forward compatibility breakages are only allowed every two years, when the major release cycle number is increased" ([Blender developer handbook — Blend File Compatibility](https://developer.blender.org/docs/handbook/guidelines/compatibility_handling_for_blend_files/); the rendered site returned a Cloudflare challenge twice — the Markdown source was fetched from the `blender-developer-docs` repo on projects.blender.org).
- USD versions the *schema identifier*: "'SphereLight_2' is version 2 of the SphereLight schema," all versions share a "schema family," and "a composed prim definition will not be allowed to contain multiple versions of the same applied API schema family" ([Schema Versioning in USD](https://openusd.org/release/wp_schema_versioning.html)); the shipped `UsdSchemaRegistry` exposes `SchemaInfo{type, identifier, family, version, kind}`, `FindSchemaInfosInFamily()` "ordered from highest version to lowest," and a `VersionPolicy` filter ([UsdSchemaRegistry API](https://openusd.org/release/api/class_usd_schema_registry.html)). USD's answer to "preset changes meaning" is: *don't* — ship `Split_1` beside `Split`, never mutate `Split`.

Terraform's `moved` block is the same idea for state, with the sharpest retention rule: "We strongly recommend that you retain all historical `moved` blocks … Removing a `moved` block is a breaking change because any configurations that refer to the old address will plan to delete the existing object instead of move it," and chained moves compose ("Terraform treats the existing object as if it had been originally created as `aws_instance.c`") ([Terraform — Refactoring](https://developer.hashicorp.com/terraform/language/modules/develop/refactoring)).

### 3.4 Storybook automigrate and Figma: "detect + offer fix" as product

Storybook's upgrade flow is the closest developer-tool model for what a designer should see: automigrate "runs a set of standard configuration checks, explains what is potentially out-of-date, and offers to fix it for you automatically," `--dry-run` "Checks for available migrations without applying them," `--yes` applies without prompting, and `doctor` runs a post-upgrade health check; scope is bounded — "Our automigrations usually only transform and migrate files inside of your .storybook directory and your story and mdx files" ([Upgrading Storybook](https://storybook.js.org/docs/releases/upgrading), [CLI options](https://storybook.js.org/docs/api/cli-options)). The `automigrate/fixes` directory listed 27 fixes (e.g. `renderer-to-framework`, `remove-essentials`, `consolidated-imports`) before the GitHub page errored mid-load — count *not fully verified*. Each fix is check → explain → link → ask → apply: a migration is a *conversation*, not a batch job.

Figma is the designer-side precedent, and its behaviour is a cautionary one. Identity is by id: "Every component has a unique id. Figma uses this id to maintain the connection between the main component and any instances," and copy-paste breaks it — "Figma treats the pasted component as a new component"; during a move, "Instances will stay linked to deleted components in the origin file until you review and accept updates" ([Move published components](https://help.figma.com/hc/en-us/articles/4404848314647-Move-published-components)). Library swap, by contrast, matches *by name*: "Figma looks for assets with matching names between the two participating libraries … If a matching asset isn't found in the selected library, Figma won't swap them and they'll remain connected to the original library," and "If you've deleted assets or recreated them with different names, Figma won't recognize or match these assets" ([Swap style and component libraries](https://help.figma.com/hc/en-us/articles/4404856784663-Swap-style-and-component-libraries)). Practitioners report that renaming a library component orphans instances into local copies, recoverable only via "Restore component" (Figma Community Forum threads — *not help-center verified*). The lesson is the same as protobuf's: id-keyed links survive renames; name-keyed links do not. Construction files must reference patterns by a stable catalog id with the display name as sugar, or every rename becomes Figma's orphan problem at file scale.

---

## 4. LLM-assisted migration: the evidence

The numbers cluster into two regimes. **Structured, tool-verified pipelines with human review** deliver most of the edits; **unassisted LLMs on migration benchmarks** fail most of the time.

| Source | Setup | Result |
|---|---|---|
| Google, 39 migrations ([Ziftci et al., FSE 2025 industry track](https://arxiv.org/abs/2504.09691)) | "change location discovery" + LLM edit; 3 developers, 12 months | "595 code changes with 93,574 edits … 74.45% of the code changes and 69.46% of the edits were generated by the LLM"; "estimated a 50% reduction on the total time spent" |
| Google Ads 32→64-bit IDs ([arXiv 2501.06972](https://arxiv.org/html/2501.06972)) | expert finds locations (Code Search, Kythe, scripts) → LLM toolkit "produces verified changes that only contain code that passes unit tests" → expert review → owner review | "80% of the code modifications in the landed CLs were fully AI-authored"; "reduced by an estimated 50%"; manual estimate "hundreds of software engineering years" |
| Amazon Q Developer Java 8/11→17 ([AWS DevOps blog, 2024-08-01](https://aws.amazon.com/blogs/devops/amazon-q-developer-just-reached-a-260-million-dollar-milestone)) | build in source JDK → transform → "verify and accept the changes in your IDE" via diff ([Q docs](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/code-transformation.html)) | "tens of thousands of production applications"; "over 4,500 years of development work"; "$260 million dollars in annual cost savings"; per Jassy, "Developers used 79 percent of Amazon Q's auto-generated code reviews without changes" ([The Decoder](https://the-decoder.com/amazons-ai-assistant-saves-4500-years-of-development-time-ceo-andy-jassy-says/)) — vendor-reported, no independent audit |
| Codemod AI, LLM *writes the codemod* ([Codemod blog, 2024-05, updated 2026-02](https://codemod.com/blog/iterative-ai-system)) | before/after examples → draft codemod → TypeScript compiler + jscodeshift runner + diff feed back | "Vanilla GPT-4o: 45.29%" → "58.82%" → "61.76%" → "75.29%" after 1/2/3 refinement iterations |
| AIMigrate ([Rosenfeld, Kerr, Lundin, arXiv 2511.00160](https://arxiv.org/abs/2511.00160)) | dependency-version migration with *diffs* as context | "correctly identified 65% of required changes in a single run, increasing to 80% with multiple runs, with 47% of changes generated perfectly" |
| CODEMENV benchmark ([arXiv 2506.00894](https://arxiv.org/abs/2506.00894)) | 922 examples, 19 Python/Java packages, no tooling loop | "average pass@1 rate of 26.50%, with GPT-4O achieving the highest score at 43.84%"; models "sometimes exhibit logical inconsistencies by identifying function changes irrelevant to the intended migration" |

Three readings. (1) Every high number comes from a pipeline where a deterministic step *found the locations* and a verifier *gated the edit* — Google's "verified changes that only contain code that passes unit tests," Amazon's source-JDK build, Codemod's compiler loop that lifts 45%→75%. The unassisted benchmark (26.5%) is the number for "let the model migrate the files." (2) The best current commercial split is Codemod's: the AI "decides *when* and *what* to transform, then writes the transformation logic," while the transformation itself runs as a deterministic AST program — "6,000+ files scanned in ~5 seconds" with "12 test suites, 58 assertions" ([npx codemod ai](https://codemod.com/blog/npx-codemod-ai)). GritQL survives as an engine (Honeycomb acquired Grit 2025-04-09; "GritQL … will remain open source," the product is being sunset ([Honeycomb](https://www.honeycomb.io/blog/honeycomb-acquires-grit)); `biomejs/gritql` 4,588 stars, last push 2026-08-30). (3) For *our* documents the LLM is a worse fit than for code in one way and a better fit in another: worse, because a 2K-token JSON file gives the model no compiler or tests to fail against; better, because the files are tiny, schema-validated, and the builder+screenshot+a11y gate already exists (doc 05 §5) — a migrated file that validates, builds, and pixel-matches its pre-migration screenshot is verified more strongly than most code migrations are.

**Policy that follows:** *deterministic where a rule exists; LLM only for the residual; every LLM output re-validated and visually diffed; never let the model touch a file the deterministic pass handled cleanly.* This is the hybrid from [04 §10 Q4](04-deterministic-assembly.md), with the ordering now evidence-backed.

---

## 5. Policy: windows, reservations, expand/contract, CI, idempotency, drift

### 5.1 Deprecation windows

Kubernetes' beta rule ("9 months or 3 minor releases … whichever is longer") and Blender's "deprecated for at least two years" are for artifacts with decade lifetimes; prototypes are shorter-lived, but *exemplar galleries and pattern docs* are not ([02 §8 Q5](02-intent-spec-and-context.md)). Recommended: a deprecated pattern/prop/token stays *accepted by the migrator forever* (Blender: "no hard 'end of life'" for conversion code — it is cheap data) but is *rejected by generation* immediately (removed from the LLM-facing catalog and schema enum), and removed from the served schema after **two catalog majors**. Removal is gated on usage, Apollo-style: the builder already records pattern usage per build (doc 01's escape-hatch telemetry); a deprecated pattern with non-zero usage in the last N builds blocks the contract step.

### 5.2 Reserved and never-reused identifiers (extending 07/08)

[08 §8.4](08-compiler-ir-build-patterns.md) reserved *node* ids inside construction files. Schema evolution needs the same rule one level up, for *catalog* identifiers, and Buf tells us which: reserve **names**, because JSON has no field numbers. Concretely, `catalog.reserved.json` lists every retired pattern name, prop name, enum value and token path with the release that retired it and, where one exists, the redirect. Reuse of a reserved name is a CI failure (Buf `RESERVED_MESSAGE_NO_DELETE` says even the *reservation* must not be deleted). Unreal's rule about deleting substring redirects after resave does *not* transfer: Terraform's "retain all historical `moved` blocks" does, because a construction file may sit un-migrated in a branch for months.

### 5.3 Expand / migrate / contract

The pattern is Sato's Parallel Change: "expand," where "you augment the interface to support both the old and the new versions"; "migrate," where "you update all clients … This can be done incrementally"; "contract," "once all usages have been migrated … remove the old version" ([Fowler bliki — ParallelChange, Danilo Sato, 2014](https://martinfowler.com/bliki/ParallelChange.html); credited to Kerievsky 2006). Applied to a catalog release: **expand** = new pattern/prop ships beside the old, old one marked deprecated with redirect metadata; **migrate** = the migrator runs on each construction file at next build (or in bulk via CI); **contract** = old name moves to `reserved`. The GraphQL constraint applies verbatim: a *required* prop cannot be deprecated in place — make it optional (with a default the builder fills) first.

### 5.4 Compatibility CI for the catalog

Because the catalog regenerates from source (doc 01), the breaking-change check is the only place a human sees that a design-system PR broke construction files. `catalog breaking --against main` diffs the two Zod-derived JSON Schemas and classifies each change with §1's taxonomy. Rules: (a) pattern/prop/enum/token *removed* without a `reserved` entry → fail; (b) removed *with* a redirect → pass, migrator step auto-generated; (c) enum value added, optional prop added → pass (backward-compatible); (d) prop type changed, required prop added, preset semantics changed → fail unless a migration file with the matching from/to schema hash is in the PR. This is Buf's `WIRE_JSON` category applied to a design-system, and it answers [06 §Open question 7](06-declarative-infrastructure-patterns.md): yes, the catalog needs its own plan/apply, and this is the plan.

### 5.5 `schemaVersion`, the migrator chain, idempotency

Every construction file carries `schemaVersion: <int>` (and `catalogVersion`, already required by 06 Lesson 8). The builder's first step is `migrate(file)`: while `file.schemaVersion < CURRENT`, apply migration `n→n+1`, validate the result against schema `n+1` (json-up's per-step Zod invariant), then continue — Blender's "incrementally applies all required conversion processes," Angular's "run in order." Migrations are pure functions of (file, catalog metadata) with Prisma's from/to hash check so a migrator cannot be applied to the wrong input; a migration that is a no-op for a given file (pattern not present) still bumps the version. Idempotency is by construction: running the chain on an already-current file is the identity. Migrations are *immutable once shipped* (Rails). Where a step needs a precondition, express it as JSON Patch `test` ops — "The 'test' operation tests that a value at the target location is equal to a specified value" — so that failure aborts atomically: "application of the entire patch document SHALL NOT be deemed successful" ([RFC 6902](https://www.rfc-editor.org/rfc/rfc6902)). Cambria's insight extends this: the same lens that migrates a *file* can migrate a *pending JSON Patch* authored against the old schema, which matters when a designer's iteration branch is older than the catalog on main.

### 5.6 Drift × migration

[05 §4.2](05-surgical-editing-iteration.md) defined drift as hand-edited builder-owned output, detected via manifest hashes. Migration interacts with drift in one ugly way: migrating the construction file and rebuilding will *clobber* drifted output, and the drift might have been the designer's workaround for exactly the thing the catalog just fixed. Rule: **migration refuses to rebuild a screen whose manifest shows drift**; it presents the three-way situation (old file, migrated file, drifted output) and offers 06's menu — re-adopt the drift into the *migrated* file (LLM-assisted, verified by rebuild), discard the drift, or eject the screen. Migrations never run silently on drifted screens, ever; the Terraform corrupted-state stories in [06 §8](06-declarative-infrastructure-patterns.md) are what a silent path produces.

---

## 6. Designer-facing UX

The three precedents agree on shape: show the change, let the person choose scope, and never mutate without consent.

- **Terraform plan** (06 §2.2): a diff of what *would* change, verb-tagged, before anything changes. For a migrated file the plan lists each node touched with the change class from §1 and whether it was mechanical or residual.
- **Storybook automigrate**: per-fix explanation with a documentation link and a yes/no; `--dry-run` for CI; `doctor` afterwards. Our equivalents: `construction migrate --plan` (dry run), `--apply`, `--yes` for CI, and the existing validate → build → screenshot → a11y gate as `doctor`.
- **Figma library updates**: "the Libraries icon … will display a blue badge," a review modal with "a Side by side view of the change" or an "Overlay view, which places the updated component … on top of the current instance," and the choice of "Update selected instance" versus "Update all" ([Review and accept library updates](https://help.figma.com/hc/en-us/articles/360039234193-Review-and-accept-library-updates)). Side-by-side/overlay of *pre- and post-migration screenshots* per screen is the single most designer-legible verification available — and it is free, since the builder already screenshots every build.

Exemplar galleries ([02 §8 Q5](02-intent-spec-and-context.md)) are construction files, so they migrate with the same chain — but they must be *re-validated against the generation schema*, not just the migrator, because a migrated exemplar that now shows a deprecated-but-accepted pattern is "actively harmful" as a teacher. Policy: every exemplar is built and screenshot-diffed on each catalog release; any exemplar that hits the residual path is removed from the few-shot set until a human re-accepts it. Storybook's post-upgrade `doctor` is the model: the gallery is the *first* consumer migrated, and its health check gates the release.

---

## 7. Recommended migration architecture, with a worked example

**Architecture in one paragraph.** Each construction file carries `schemaVersion`. The catalog ships as versioned releases; each breaking release carries one migration module (`from`, `to`, from/to schema hashes, description, ordered steps, `reserved` additions). Steps are drawn from a small operator vocabulary — `renamePattern`, `renameProp`, `mapEnum`, `splitSlot`, `mergeSlots`, `aliasToken`, `replacePattern`, `setDefault`, `remove` — Cambria's lens vocabulary made forward-only. The builder runs the chain on load, validates per step, and is the *hub*: it accepts only the current version. A CI gate (`catalog breaking`) refuses design-system PRs that change the schema without either a redirect entry or a migration module. A step may declare a `residual` predicate; nodes matching it are not migrated mechanically but handed to an LLM pass *with the migration's description as instruction*, whose output must validate, build, and pass screenshot review before it is accepted. Drifted screens are excluded from automatic rebuild. The designer sees a plan first, then per-screen before/after.

**Example: v1 → v2.** The design system renames `DetailHeader` to `PageHeader`, splits its `actions` slot into `primaryAction` (max one) and `secondaryActions`, and replaces `emphasis: 'low' | 'high'` with `tone: 'subtle' | 'standard' | 'strong'`.

```ts
// catalog/migrations/0002-page-header.ts
export default defineMigration({
  from: 1, to: 2,
  fromHash: 'sha256:3f1c…', toHash: 'sha256:9ab0…',           // Prisma-style guard
  description: 'DetailHeader → PageHeader; split actions; emphasis → tone',
  steps: [
    renamePattern('DetailHeader', 'PageHeader'),                 // Unreal ClassRedirect
    renameProp('PageHeader', 'emphasis', 'tone'),                // Unity FormerlySerializedAs
    mapEnum('PageHeader.tone', { low: 'subtle', high: 'strong' }),// Unreal EnumRedirect
    splitSlot('PageHeader', 'actions', ['primaryAction', 'secondaryActions'], {
      route: (kids) => ({ primaryAction: kids.slice(0, 1), secondaryActions: kids.slice(1) }),
      residual: (kids) => kids.filter(k => k.props?.variant === 'primary').length !== 1,
      residualHint: 'Pick the single primary action; demote the others to secondary.',
    }),
  ],
  reserved: { patterns: ['DetailHeader'], props: ['PageHeader.emphasis'], enums: ['emphasis.low', 'emphasis.high'] },
});
```

```jsonc
// before (schemaVersion 1)                         // after (schemaVersion 2)
{ "id": "hdr1", "pattern": "DetailHeader",          { "id": "hdr1", "pattern": "PageHeader",
  "props": { "emphasis": "high" },                    "props": { "tone": "strong" },
  "slots": { "actions": [                             "slots": {
    { "id": "b1", "pattern": "Button",                  "primaryAction":    [ { "id": "b1", "pattern": "Button", "props": { "variant": "primary" } } ],
      "props": { "variant": "primary" } },              "secondaryActions": [ { "id": "b2", "pattern": "Button", "props": { "variant": "ghost" } } ] } }
    { "id": "b2", "pattern": "Button",
      "props": { "variant": "ghost" } } ] } }
```

```text
$ construction migrate --plan screens/
screens/invoice-detail.json   v1 → v2
  ~ hdr1  DetailHeader → PageHeader                       rename      (mechanical)
  ~ hdr1  props.emphasis "high" → props.tone "strong"     enum map    (mechanical)
  ~ hdr1  slots.actions[2] → primaryAction[1] + secondaryActions[1]   (mechanical)
screens/settings.json         v1 → v2
  ! hdr7  actions has 2 buttons with variant "primary"    residual    → LLM proposal attached, needs your review
Plan: 11 files migrate cleanly · 1 needs review · 2 skipped (drift detected; see `construction drift`)
Nothing is rebuilt until you run `--apply`. Screenshots: before/after per screen in .cf/plan/.
```

Node ids (`hdr1`, `b1`, `b2`) survive untouched — the point of [07 §7.4](07-game-engine-patterns.md) — so manifests, provenance maps and any pending JSON Patches keyed by id remain valid across the migration.

---

## 8. Tradeoffs

| Strategy | What it buys | What it costs | Verdict for construction files |
|---|---|---|---|
| **Normalize forever at load** (OpenAPI 2→3, K8s served versions) | No file ever changes; zero designer involvement | Only works for total mappings; every old shape lives in the builder forever (Stripe: "more code to understand and maintain") | Use for *compatible* changes only (added optional props, defaults) |
| **Versioned forward migrator chain** (Blender, Rails, Angular, json-up) | Deterministic, reviewable, idempotent, testable per step; files converge on one hub version | Someone must write each migration; residual cases need a second mechanism | **Primary mechanism** |
| **Bidirectional lenses** (Cambria) | Old and new tooling coexist; patches migrate too | Immature ("isn't yet ready for production use"); scalar↔array and data-augmentation have "no ideal solution" | Borrow the operator vocabulary and patch-migration idea; skip bidirectionality |
| **LLM pass over every file** | Handles semantic changes; no migration authoring | 26.5% unassisted pass@1 on migration benchmarks; non-deterministic; unreviewable at scale | Residual only, gated by validate → build → screenshot |
| **Regenerate from `intent.yaml`** | Always current-catalog output | Loses every iteration since generation; designer's edits are the prototype | Last resort; equivalent to "start over" |
| **Alias/redirect tables at load** (Unreal, Unity, Terraform `moved`) | Renames cost nothing; instant | Covers renames and enum maps only; tables accumulate forever (Terraform: keep them) | Fold into the chain as the first, auto-generated steps |

---

## 9. Open questions

1. **Who writes the migration when the catalog is auto-extracted?** Doc 01 regenerates the catalog from DS source; a rename in a React prop type appears as delete+add. Can the extractor infer redirects (same type, same position, similar name — Unity's rename-refactoring plugins do this) with acceptable precision, or does every DS PR need a human-authored `reserved`/redirect entry? ([06 Q7](06-declarative-infrastructure-patterns.md) posed the meta-question; this is its concrete form.)
2. **Residual rate.** What fraction of nodes hit the residual path on a realistic DS release? If it is >10%, the LLM step dominates cost and review load, and the answer shifts toward normalize-forever for that change class.
3. **Version granularity.** One integer per catalog release (Blender's file version) vs per-pattern versions (USD's `_2` suffix)? The former is simpler and matches the hub model; the latter lets a pattern evolve without forcing a global bump. A hybrid (global `schemaVersion`; pattern identifiers carry a family+version only when a preset's semantics change) is proposed above but untested.
4. **Do prototypes need migration at all?** [08 §10 Q5](08-compiler-ir-build-patterns.md) asked where the "prototype vs long-lived" line is. Exemplar galleries, pattern docs, and any prototype that became a spec clearly cross it; throwaway explorations may not. Should `schemaVersion` be mandatory or should unversioned files simply be treated as "regenerate or eject"?
5. **Patch migration.** Cambria migrates JSON Patches, not just documents. Is a designer's stale iteration branch (patches against v1, catalog now v2) common enough to justify implementing lens-over-patch, or is "rebase by re-applying patches to the migrated file and re-validating" sufficient?

## 10. Recommended experiments

- **M0 — Change-class census.** Take 6–12 months of a real design system's git history; classify every component API change with §1's taxonomy. Output: the empirical residual rate and which operators the migrator needs first.
- **M1 — Migrator chain on the E1 vertical slice.** After E1 ([00](00-architecture-synthesis.md)) has ~30 construction files, ship a deliberately breaking catalog v2 (the §7 example is a fine choice). Measure: mechanical coverage, files hitting residual, screenshot-diff pass rate, designer minutes per file in plan review.
- **M2 — LLM residual quality.** For the residual set, compare (a) LLM with only the schema, (b) LLM with the migration description + `residualHint`, (c) LLM with a before/after exemplar pair. Gate on validate + build + screenshot review; report first-pass acceptance. Expectation from §4: (b)/(c) ≫ (a).
- **M3 — `catalog breaking` in CI.** Run the schema diff on the DS's historical commits from M0; count true/false positives against the human classification.
- **M4 — Gallery staleness.** Migrate the exemplar gallery with M1's chain; measure schema-valid rate of LLM generations before vs after re-validated exemplars, to quantify the "stale exemplar is actively harmful" claim from doc 02.

## 11. Candidate picks for skill-resources

| Resource | URL | Why |
|---|---|---|
| Kubernetes CRD versioning + deprecation policy | https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/ · https://kubernetes.io/docs/reference/using-api/deprecation-policy/ | Hub/storage version model and the round-trip rule; the most complete published policy |
| Buf breaking rules | https://buf.build/docs/breaking/rules/ | The rule list to port to a JSON-schema `catalog breaking` check (`*_NO_DELETE_UNLESS_NAME_RESERVED`) |
| Stripe — APIs as infrastructure | https://stripe.com/blog/api-versioning | Version-change-module shape and the honest cost accounting |
| Blender — Blend File Compatibility | https://developer.blender.org/docs/handbook/guidelines/compatibility_handling_for_blend_files/ | Clearest statement of forever-chain versioning policy; 20-year backward compatibility |
| Cambria (Ink & Switch) | https://www.inkandswitch.com/cambria/ · https://github.com/inkandswitch/cambria-project | Lens operator vocabulary over JSON Patch; read for the open-problems list as much as the idea |
| json-up | https://github.com/Nano-Collective/json-up | Minimal Zod-per-step JSON migration chain — the reference shape, small enough to reimplement |
| Angular `ng-update` schematic guide | https://github.com/angular/components/blob/main/src/cdk/schematics/ng-update/update-schematic.md | Per-version upgrade data, ordered chain execution |
| Unreal Core Redirects | https://dev.epicgames.com/documentation/unreal-engine/core-redirects-in-unreal-engine | Redirect table covering classes, properties *and enum values* — the alias-step spec |
| Terraform refactoring (`moved`) | https://developer.hashicorp.com/terraform/language/modules/develop/refactoring | Retention rule for redirects; plan-shows-the-move UX |
| DTCG Format Module 2025.10 (`$deprecated`) | https://www.designtokens.org/tr/drafts/format/ | Standard carrier for token retirement + alias |
| Storybook upgrade / automigrate | https://storybook.js.org/docs/releases/upgrading | Detect → explain → link → ask → apply; `--dry-run`; `doctor` |
| ast-grep | https://ast-grep.github.io/guide/rewrite-code.html | YAML `fix` rules + `--interactive`; usable for the *generated-code* side and as a JSON structural-rewrite fallback |
| Migrating Code at Scale with LLMs at Google | https://arxiv.org/abs/2504.09691 | The deterministic-locate + LLM-edit + verify pipeline with real percentages |
| CODEMENV | https://arxiv.org/abs/2506.00894 | The unassisted baseline (26.5%) to cite whenever "just let the model migrate it" comes up |
| Codemod — iterative AI codemod generation | https://codemod.com/blog/iterative-ai-system | 45%→75% with compiler-in-the-loop; LLM writes the migrator, deterministic engine runs it |

## 12. Sources

- Kubernetes — Versions in CustomResourceDefinitions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes — Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubebuilder — Hubs, spokes, and other wheel metaphors: https://book.kubebuilder.io/multiversion-tutorial/conversion-concepts
- kube-storage-version-migrator: https://github.com/kubernetes-sigs/kube-storage-version-migrator
- protobuf — Language Guide (proto3): https://protobuf.dev/programming-guides/proto3/
- Buf — Breaking change rules and categories: https://buf.build/docs/breaking/rules/
- Confluent — Schema Evolution and Compatibility (Cloud docs): https://docs.confluent.io/cloud/current/sr/fundamentals/schema-evolution.html
- Stripe — APIs as infrastructure: future-proofing Stripe with versioning: https://stripe.com/blog/api-versioning
- Stripe — API upgrades: https://docs.stripe.com/upgrades
- swagger2openapi: https://github.com/APIs-guru/swagger2openapi
- GraphQL spec — Type System (§@deprecated), source: https://github.com/graphql/graphql-spec/blob/main/spec/Section%203%20--%20Type%20System.md
- Apollo — Schema deprecations: https://www.apollographql.com/docs/graphos/schema-design/guides/deprecations
- JSON Schema — Structuring a complex schema: https://json-schema.org/understanding-json-schema/structuring
- Design Tokens Format Module 2025.10: https://www.designtokens.org/tr/drafts/format/
- jscodeshift: https://github.com/facebook/jscodeshift
- ast-grep — Rewrite code: https://ast-grep.github.io/guide/rewrite-code.html
- Angular components — ng-update schematic: https://github.com/angular/components/blob/main/src/cdk/schematics/ng-update/update-schematic.md
- Rails — Active Record Migrations: https://guides.rubyonrails.org/active_record_migrations.html
- Prisma — Prisma Migrate: https://www.prisma.io/docs/orm/prisma-migrate
- Atlas — Declarative vs Versioned migrations: https://atlasgo.io/concepts/declarative-vs-versioned
- json-up: https://github.com/Nano-Collective/json-up
- Ink & Switch — Project Cambria: https://www.inkandswitch.com/cambria/
- cambria-project: https://github.com/inkandswitch/cambria-project
- Unity — FormerlySerializedAsAttribute: https://docs.unity3d.com/ScriptReference/Serialization.FormerlySerializedAsAttribute.html
- Unreal — Core Redirects: https://dev.epicgames.com/documentation/unreal-engine/core-redirects-in-unreal-engine
- Blender developer handbook — Blend File Compatibility: https://developer.blender.org/docs/handbook/guidelines/compatibility_handling_for_blend_files/ (source: https://projects.blender.org/blender/blender-developer-docs)
- OpenUSD — Schema Versioning in USD (proposal): https://openusd.org/release/wp_schema_versioning.html
- OpenUSD — UsdSchemaRegistry API: https://openusd.org/release/api/class_usd_schema_registry.html
- Terraform — Refactoring (`moved`): https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Storybook — Upgrading: https://storybook.js.org/docs/releases/upgrading
- Storybook — CLI options: https://storybook.js.org/docs/api/cli-options
- Storybook — automigrate fixes directory: https://github.com/storybookjs/storybook/tree/next/code/lib/cli-storybook/src/automigrate/fixes
- Figma — Move published components: https://help.figma.com/hc/en-us/articles/4404848314647-Move-published-components
- Figma — Swap style and component libraries: https://help.figma.com/hc/en-us/articles/4404856784663-Swap-style-and-component-libraries
- Figma — Review and accept library updates: https://help.figma.com/hc/en-us/articles/360039234193-Review-and-accept-library-updates
- Ziftci et al. — Migrating Code At Scale With LLMs At Google: https://arxiv.org/abs/2504.09691
- Google — How is Google using AI for internal code migrations?: https://arxiv.org/html/2501.06972
- AWS DevOps Blog — Amazon Q Developer just reached a $260 million milestone: https://aws.amazon.com/blogs/devops/amazon-q-developer-just-reached-a-260-million-dollar-milestone
- Amazon Q Developer — Upgrading Java versions: https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/code-transformation.html
- The Decoder — Amazon's AI assistant saves 4,500 years of development time: https://the-decoder.com/amazons-ai-assistant-saves-4500-years-of-development-time-ceo-andy-jassy-says/
- Codemod — Automated codemod creation through an iterative AI system: https://codemod.com/blog/iterative-ai-system
- Codemod — npx codemod ai: https://codemod.com/blog/npx-codemod-ai
- Codemod Studio docs: https://docs.codemod.com/platform/codemod-studio
- Honeycomb acquires Grit: https://www.honeycomb.io/blog/honeycomb-acquires-grit
- biomejs/gritql: https://github.com/biomejs/gritql
- Rosenfeld, Kerr, Lundin — What a diff makes: automating code migration with LLMs (AIMigrate): https://arxiv.org/abs/2511.00160
- CODEMENV — Benchmarking LLMs on Code Migration: https://arxiv.org/abs/2506.00894
- RFC 6902 — JavaScript Object Notation (JSON) Patch: https://www.rfc-editor.org/rfc/rfc6902
- Fowler bliki — ParallelChange (Danilo Sato): https://martinfowler.com/bliki/ParallelChange.html
