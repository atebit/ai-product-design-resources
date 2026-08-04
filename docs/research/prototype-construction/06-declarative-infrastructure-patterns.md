# Declarative Infrastructure Patterns: What "Spec → Deterministic Realization" Learned at Scale

**Scope:** The construction-file architecture — an LLM emits a small schema-validated spec, a deterministic builder expands it into a working prototype, iteration happens via surgical patches — is structurally identical to a problem infrastructure engineering has been solving for fifteen years: *take a declarative description of desired state and deterministically realize it against a messy, mutable world, then keep the two in sync*. Terraform, Kubernetes, Nix, Bazel, GitOps controllers, and CI/CD YAML systems each embody a hard-won answer to some slice of that problem — and each has publicly documented failure modes that are direct previews of failure modes our architecture will hit. This document deep-dives five pattern families in their home domain, then maps each pattern to a concrete decision in the construction-file pipeline (docs [00](00-architecture-synthesis.md)–[05](05-surgical-editing-iteration.md)), and closes with tradeoffs, failure stories, and open questions.

---

## Table of contents

1. [Why infrastructure is the right tangent](#1-why-infrastructure-is-the-right-tangent)
2. [Terraform and Infrastructure-as-Code](#2-terraform-and-infrastructure-as-code)
   - 2.1 HCL as a declarative spec
   - 2.2 Plan/apply separation
   - 2.3 The state file: a record of what was built
   - 2.4 Drift detection and reconciliation
   - 2.5 Import: adopting resources built outside the system
   - 2.6 Modules as composition
   - 2.7 Providers as pluggable backends
3. [Kubernetes](#3-kubernetes)
   - 3.1 Desired-state reconciliation loops
   - 3.2 Level-triggered vs edge-triggered
   - 3.3 Controllers and operators
   - 3.4 CRDs: extensible schemas
   - 3.5 Server-side apply and field ownership
   - 3.6 Admission webhooks and CEL policies as validation gates
4. [Nix, Bazel, and hermetic builds](#4-nix-bazel-and-hermetic-builds)
5. [GitOps: Argo CD and Flux](#5-gitops-argo-cd-and-flux)
6. [CI/CD YAML: when declarative specs become bad programming languages](#6-cicd-yaml-when-declarative-specs-become-bad-programming-languages)
7. [Lessons for construction-file prototyping](#7-lessons-for-construction-file-prototyping)
8. [Tradeoffs and failure stories](#8-tradeoffs-and-failure-stories)
9. [Open questions](#9-open-questions)

---

## 1. Why infrastructure is the right tangent

Every system in this document has the same skeleton:

```
declarative spec  →  [diff/plan engine]  →  deterministic realizer  →  live system
       ↑                                                                   │
       └────────────── record of what-was-built + drift detection ─────────┘
```

Swap the nouns and it is our pipeline: construction file → validator → builder → generated prototype, with a generation manifest closing the loop. The mapping is not metaphorical — the *problems* are isomorphic:

| Infrastructure problem | Construction-file equivalent |
|---|---|
| Cloud state mutated outside Terraform | Designer/LLM hand-edits generated code |
| Two controllers fighting over one field | Builder owns structure, LLM owns content, in the same file tree |
| Non-reproducible builds poison the cache | Non-deterministic builder makes diffs meaningless |
| YAML pipelines grow conditionals until unreadable | Construction files grow logic until they're a worse React |
| Reviewing a 400-resource apply blind | Rebuilding a prototype with no preview of what changes |
| Importing hand-built infra into Terraform | Adopting a hand-tweaked prototype back into the construction file |

Infrastructure got to these problems first because the stakes forced it: a bad realization deletes a production database. Our stakes are lower (a bad build is a broken prototype), which means we can afford *simpler* versions of these mechanisms — but we should copy the shapes, because the shapes are load-bearing.

---

## 2. Terraform and Infrastructure-as-Code

Terraform (HashiCorp, 2014; open-source fork [OpenTofu](https://opentofu.org/), 2023) is the canonical "declarative spec → deterministic realization" tool: you write HCL describing desired infrastructure, and `terraform apply` makes reality match. Its architecture decomposes into seven ideas, each of which maps onto our pipeline.

### 2.1 HCL as a declarative spec

HCL (HashiCorp Configuration Language) is deliberately *not* a general-purpose language. It is a structured configuration language with a constrained expression layer: interpolation, `count`, `for_each`, conditionals via ternary, `for` expressions — but no user-defined functions (until very recently via provider-defined functions), no loops with side effects, no recursion, no I/O. The design bet: **specs should describe *what*, and the small expression layer exists only to avoid repetition, not to compute**.

Key properties worth stealing:

- **Blocks are typed and schema-checked.** A `resource "aws_instance" "web" {...}` block is validated against the provider's schema before any plan. Unknown attributes are errors at parse time, not runtime surprises — the equivalent of our enum-constrained component types (doc 03).
- **References form an explicit DAG.** `aws_subnet.main.id` referenced inside an instance block creates a dependency edge; Terraform topologically sorts the graph to determine build order. There is no imperative "first do X then Y" — ordering is *derived* from data references. Our builder can do the same: derive render order and data-flow from `$ref`s between construction-file nodes rather than requiring the LLM to sequence anything.
- **HCL is JSON-isomorphic.** Every HCL file has a canonical JSON equivalent, so machines can generate/patch JSON while humans read HCL. This is precisely the "enforced JSON wire format + YAML review surface" split doc 03 landed on — Terraform validated that dual-syntax approach at massive scale.

The pain: HCL's expressiveness ceiling is real and famous. `count` vs `for_each` semantics trip up everyone (resources keyed by index vs by map key — the *positional vs id-keyed children* problem from doc 05, exactly); conditional resource creation is spelled `count = var.enabled ? 1 : 0`, a hack the community tolerates; and dynamic nested blocks (`dynamic {}`) are widely considered the point where HCL stops being pleasant. When teams outgrow HCL they reach for [Pulumi](https://www.pulumi.com/) (real languages driving the same engine model) or [CDK/CDKTF](https://encore.dev/articles/cdktf-guide) (real languages *compiling to* declarative output). Section 6 returns to this ceiling.

### 2.2 Plan/apply separation

The single most influential UX decision in Terraform is that **mutation is a two-phase operation**:

1. `terraform plan` — computes a diff between (config, state, refreshed reality) and prints a human-readable changeset: `+ create`, `~ update in-place`, `-/+ destroy and re-create`, `- destroy`. No side effects.
2. `terraform apply` — executes a previously reviewed plan (optionally an exact saved plan file, guaranteeing what you reviewed is what runs).

Why it matters:

- **The plan is a trust artifact.** Nobody sane applies infra changes without reading the plan. The plan turned "run this script and pray" into "review this diff like a PR." Whole products (Atlantis, [Spacelift](https://spacelift.io/blog/terraform-drift-detection), env0) exist to post plans as PR comments for review before apply.
- **Plans surface *cascade* effects.** The scariest Terraform moment is a one-line config change that plans as "destroy and re-create" of something stateful, because some attribute is immutable at the provider level. The plan makes second-order consequences visible *before* they happen.
- **Saved plans make apply deterministic.** `terraform plan -out=tfplan && terraform apply tfplan` guarantees zero divergence between review and execution.

This is the pattern our architecture is missing most conspicuously. Docs 04/05 have validate → build → screenshot, but nothing between "LLM emitted a new construction file / patch" and "builder rebuilt everything." Section 7 (Lesson 1) makes the case for a `plan` step for prototypes.

### 2.3 The state file: a record of what was built

Terraform's state file (`terraform.tfstate`, a JSON document) is the system's memory: it [maps config addresses to real-world resource IDs, caches resource attributes, and records dependency metadata](https://spacelift.io/blog/terraform-drift-detection). Every plan is a *three-way* comparison: **config (desired) vs state (last known) vs reality (refreshed)**. Without state, Terraform cannot know that `aws_instance.web` *is* `i-0abc123`, and would either duplicate or orphan resources.

Design lessons from a decade of state-file scar tissue:

- **State is the crown jewel and the single point of failure.** Corrupt or lose it and the tool is blind (see §8 failure stories). The ecosystem's response: remote backends (S3, GCS, Terraform Cloud) with **locking** (S3 native locking since Terraform 1.10) and **versioning** so any state can be rolled back.
- **State stores things config doesn't express** — actual IDs, computed attributes, resource *identity across renames* (`moved` blocks let you rename a resource in config without destroy/re-create, by telling the state "this is the same object").
- **Monolithic state doesn't scale.** The universal anti-pattern is one giant state for everything: every plan touches everything, blast radius is total, locking serializes all teams. The remedy is state *segmentation* per component/environment.
- **State should never be hand-edited**, and the tooling enforces this culturally: `terraform state mv/rm/show` exist so mutations go through commands that keep invariants.

Our generation manifest (doc 04: hash of each generated file, for clobber detection) is a nascent state file. The Terraform lesson is that it wants to be more than a hash list — see Lesson 2.

### 2.4 Drift detection and reconciliation

Drift = reality changed outside the tool (console click-ops, another script, an auto-scaler). Terraform's model is **point-in-time reconciliation**: [drift is only detected when someone runs `terraform plan` (implicit refresh) or `plan -refresh-only`](https://www.hashicorp.com/en/blog/detecting-and-managing-drift-with-terraform); between runs, drift accumulates silently. Remediation options are explicit and *directional*:

- **Revert reality to config:** `terraform apply` (stomps the manual change).
- **Adopt reality into config:** update the HCL to match what someone did by hand, then `plan` shows no changes.
- **Accept reality into state only:** `plan -refresh-only && apply -refresh-only` updates state without touching infra.
- **Ignore a field forever:** `lifecycle { ignore_changes = [...] }` — a per-field declaration that "something else owns this attribute now" (e.g., an autoscaler owns `desired_count`). This is field-level ownership, foreshadowing Kubernetes SSA (§3.5).

The whole [drift-detection product category](https://www.firefly.ai/academy/terraform-drift-detection-guide) (Spacelift, env0, Firefly, ControlMonkey scheduled nightly `plan` runs) exists because point-in-time detection isn't enough at org scale — which is exactly the gap GitOps controllers close with continuous loops (§5).

The transferable insight: **drift is not an error to prevent; it is a certainty to detect and offer directional resolutions for.** Terraform's four-option menu (revert / adopt / accept / ignore) is a complete taxonomy, and doc 05's "model-assisted re-adopt" is only one of the four.

### 2.5 Import: adopting resources built outside the system

Not everything starts inside the tool. [`terraform import`](https://developer.hashicorp.com/terraform/language/import) (CLI) and, since 1.5, declarative [`import` blocks](https://developer.hashicorp.com/terraform/language/import) bring hand-built resources under management: you point at a real resource ID, Terraform reads its attributes into state, and — crucially, with import blocks — **can generate the HCL config for you** (`plan -generate-config-out=generated.tf`). The workflow is: import → generate config → review/clean the generated config → plan shows no diff → the resource is now managed.

This solved IaC's biggest adoption blocker: brownfield. Nobody starts from an empty cloud account. The analogous blocker for us: nobody starts from an empty prototype — designers will have existing screens, or will hand-edit generated output past the point of patchability. Doc 05 punted on full code→construction round-tripping ("not worth building"); Terraform suggests the cheaper middle: a *semi-automated, review-mediated* import that generates a best-effort construction file from existing code and asks a human (or the LLM) to clean it up, rather than either a perfect parser or nothing.

### 2.6 Modules as composition

A [Terraform module](https://developer.hashicorp.com/terraform/language/modules/develop) is a reusable package of resources with typed inputs (`variable` blocks) and outputs (`output` blocks) — "a function from variables to infrastructure." The [official composition guidance](https://developer.hashicorp.com/terraform/language/modules/develop/composition) is directly relevant to our pattern-vs-atomic debate (doc 01):

- **Keep the module tree flat.** HashiCorp explicitly recommends *composition over deep nesting*: a root module wiring together shallow building-block modules beats modules-calling-modules-calling-modules. Deeply nested modules hide behavior, complicate provider plumbing, and make units un-reusable. This independently confirms doc 01's "flat lists generate more reliably than deep trees" and the two-level grammar (patterns at top, atoms in slots — and *not* patterns-inside-patterns-inside-patterns).
- **Modules should be "thin wrappers with opinions,"** not universal abstractions. The community's worst modules are the hyper-parameterized ones with 80 variables trying to serve every use case — they become a worse interface than the raw resources. Mirror: an over-parameterized `SettingsForm` pattern with 40 optional slots is worse than three specific patterns.
- **Registry + versioning.** Modules are published, semver-versioned, and pinned (`source = "...", version = "~> 3.1"`). Consumers upgrade deliberately. Our pattern catalog will need the same: construction files should record the catalog version they were written against, so a catalog upgrade doesn't silently re-interpret old files (see Lesson 8).

### 2.7 Providers as pluggable backends

Terraform Core never talks to AWS. It talks, [over gRPC to separate provider processes](https://developer.hashicorp.com/terraform/plugin/how-terraform-works), in a fixed protocol: *here is desired state, here is prior state — give me a plan; now apply it*. Providers own all domain knowledge (API calls, immutability rules, retries); Core owns the graph, the diff engine, and the lifecycle. [This separation](https://deepwiki.com/hashicorp/terraform/2.2-provider-plugin-system) is why one engine drives 3,000+ providers.

For us: the construction-file schema and diff/patch machinery should be **target-agnostic**, with the React/TSX emitter as merely the first "provider." Doc 04 chose codegen-first with a possible runtime interpreter later — the provider pattern says: define the builder-side contract (`expand(constructionFile, catalog) → fileTree`) precisely enough that a second backend (interpreter, React Native, Figma via `use_figma`, plain HTML) is a new provider, not a rewrite.

---

## 3. Kubernetes

Where Terraform is *point-in-time* reconciliation driven by a human running `plan`, Kubernetes is **continuous** reconciliation driven by an army of controllers. It is the deepest existing exploration of "many writers, one desired-state document, forever."

### 3.1 Desired-state reconciliation loops

Every Kubernetes object (`Deployment`, `Service`, …) has a **`spec`** (desired state, written by users/tools) and a **`status`** (observed state, written by controllers). A controller's job is a loop: *observe reality, compare against spec, act to converge, write back status*. [Chainguard's "Principle of Reconciliation"](https://www.chainguard.dev/unchained/the-principle-of-reconciliation) states the essence: "observe reality, compare it against an ideal, and act to align the two" — and because **systems will drift, reconciliation is not optional**. Divergence isn't a bug; it's *the reason the loop exists*.

Two properties make the loop robust:

- **Idempotency.** Reconciling an already-converged object is a cheap no-op, not an error. You can run the loop as often as you like.
- **Convergence over transaction.** No step needs to succeed atomically; partial progress is fine because the loop will come back. Failure handling degenerates to "requeue and retry."

The `spec`/`status` split itself is a lesson: Kubernetes strictly separates *what you asked for* from *what the system observed*, in the same document, with different writers. Our construction file is all `spec`; build results (which files were emitted, hashes, warnings, a11y results) are `status` — and they should live in the manifest, never be written back into the spec.

### 3.2 Level-triggered vs edge-triggered

The most-cited design principle in Kubernetes controller land ([James Bowes' "Level Triggering and Reconciliation in Kubernetes"](https://medium.com/hackernoon/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d) is the classic writeup):

- **Edge-triggered:** react to *changes* ("replica count went 3→5"). Efficient, but if you miss an event — network blip, restart, bug — your view of the world is permanently wrong, and you must replay history to recover.
- **Level-triggered:** react to *state* ("desired is 5; how many exist right now?"). You can miss any number of events and the next reconcile still converges, because you always re-read the whole current state.

Kubernetes is level-triggered by construction: [the controller workqueue holds *keys*, not events](https://www.golinuxcloud.com/kubernetes-reconcile-loop-explained/) — a watch event enqueues the object's key, and the reconciler ignores the event payload entirely, fetching the latest full object and reconciling from scratch. If 100 events hit one object in a second, the queue coalesces them into one key and one reconcile against current state. [Red Hat's operator best practices](https://www.redhat.com/en/blog/kubernetes-operators-best-practices) codify this as the golden rule: reconciliation must be idempotent and level-triggered.

This maps directly onto our patch-vs-rebuild question (doc 05). JSON Patch iteration is *edge-triggered*: each patch assumes the document is exactly as the previous patch left it; a missed/misapplied patch corrupts everything downstream. The builder must be *level-triggered*: `build(constructionFile)` regenerates the full output from the current spec, never incrementally mutating previous output based on what the patch said changed. Patches are an efficient way to *edit the spec*; they must never be the way the *builder* computes output. (Doc 04's full-expansion builder already has this right — this section is the argument for why it must stay that way even when incremental builds look tempting for speed.)

### 3.3 Controllers and operators

An **operator** is a controller plus a CRD: someone encoded human operational knowledge ("how to run PostgreSQL: failover, backups, upgrades") into a reconciler for a custom `PostgresCluster` resource. The pattern's insight: **the declarative surface stays small because expertise lives in the realizer, not the spec**. A `PostgresCluster` spec is 30 lines; the operator that realizes it is 30,000 lines of Go. Users state intent at high altitude; the controller owns the how.

That ratio — tiny spec, expert realizer — is our whole bet (2K-token construction file, rich deterministic builder). The operator ecosystem also demonstrates the failure mode: badly written operators that fight each other, reconcile-loop hot loops, and CRDs whose `spec` grew until it mirrored the underlying resources 1:1 (at which point the abstraction is a pass-through and you've gained nothing). A pattern in our catalog whose props mirror the underlying React component 1:1 has the same smell.

### 3.4 CRDs: extensible schemas

CustomResourceDefinitions let anyone add new typed objects to the API server. The parts that matter for us:

- **Structural schemas are mandatory.** A CRD carries an OpenAPI v3 schema; the API server rejects non-conforming objects *at admission*, and can prune unknown fields. Validation is at the door, not in the consumer.
- **Versioned schemas with conversion.** A CRD serves `v1alpha1`, `v1beta1`, `v1` simultaneously, with conversion webhooks translating between them and a designated storage version. Old clients keep working during migration. Our construction-file schema will evolve; a `schemaVersion` field plus explicit migration functions in the builder (not "the LLM will figure it out") is the CRD lesson.
- **Defaulting is part of the schema.** Omitted fields get schema-declared defaults *at admission time*, so every stored object is complete. For us: the builder (or validator) should materialize defaults into a normalized construction file, so diffs and patches operate on complete documents and "field absent" vs "field default" is never ambiguous.
- **`additionalProperties: false` discipline** — unknown fields are pruned/rejected, which is what keeps a hallucinated prop from silently riding along. Doc 03's layered defense already does this; CRDs confirm it should happen server-side (builder-side), not just at generation time.

### 3.5 Server-side apply and field ownership

This is the pattern most directly relevant to our builder-vs-LLM split. The problem it solved: multiple automated writers (kubectl users, CI, HPA autoscaler, operators) all updating *the same object*, overwriting each other's changes — "controller fights."

[Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/) (GA in 1.22) makes the API server track, per object, **which field manager owns which fields**, in `metadata.managedFields`. Mechanics:

- Every write names a **`fieldManager`** (e.g., `kubectl`, `hpa-controller`, `argo-cd`).
- When a manager applies a partial object, it claims ownership of exactly the fields it set. [Different managers own different fields of one object](https://podostack.com/p/server-side-apply-managed-fields-field-ownership), and the server merges their contributions.
- **Conflicts are first-class:** if manager B sets a field owned by manager A to a different value, the API server *rejects the write* with a conflict error naming the owner. B's options are explicit: back off, or `force=true` and *take ownership* (recorded — A will get a conflict next time it tries).
- **Ownership transfer by omission:** if a manager re-applies its config *without* a field it previously set, it relinquishes that field (the field reverts to default or another manager can claim it). Intent is inferred from the applied document itself.
- The unit of ownership is the *field path*, including keys of associative lists (list items are identified by declared merge keys — id-keyed, not positional — the exact choice doc 05 made for children arrays).

The mapping to our architecture is almost one-to-one, and it upgrades doc 05's design. Doc 05 chose ownership at *file granularity* (builder-owned files vs LLM-owned files) because in-file protected regions are fragile. SSA shows the mature endpoint: ownership at *field granularity in the spec*, tracked in metadata, with conflicts surfaced as structured errors rather than silent stomps. Concretely (Lesson 4): the manifest records a manager (`builder` | `llm` | `human`) per construction-file path; the patch gate rejects LLM patches that touch `builder`-owned structural fields unless the patch explicitly forces (which flips ownership and gets logged); a human hand-edit detected via drift check claims ownership of what it touched, and the "re-adopt" flow is exactly SSA's forced-ownership-transfer conversation.

### 3.6 Admission webhooks and CEL policies as validation gates

Nothing enters the Kubernetes API without passing an **admission chain**: authentication → authorization → *mutating* admission (webhooks that may rewrite the object: inject sidecars, set defaults) → schema validation → *validating* admission (webhooks/policies that accept or reject with a message). Two generations of the pattern:

1. **Webhooks** (OPA Gatekeeper, Kyverno): out-of-process HTTP callbacks. Maximally flexible; operationally heavy (latency, availability — a down webhook can block the whole API or fail open, both bad).
2. **[ValidatingAdmissionPolicy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)** (GA in 1.30): validation rules written in **CEL** (Common Expression Language), evaluated *in-process* in the API server — [no external dependency, no latency, declarative and parameterizable](https://www.armosec.io/blog/validating-admission-policies-kubernetes/). The trajectory is telling: Kubernetes moved from "call arbitrary code to validate" toward "express validations in a small, total, side-effect-free expression language embedded in the gate."

The lesson set for our validation layer (doc 03's schema → semantic-lint → repair pipeline):

- **Order matters: mutate (default/normalize) *before* validate.** Validation runs against the completed object. Our builder should default/normalize the construction file, then run semantic lint on the normalized form.
- **Rejections carry actionable messages** — admission responses include a human-readable reason, which is what makes repair loops (ours: feed the error back to the LLM) work.
- **The gate is the *only* door.** Nothing bypasses admission; equivalently, nothing should reach our builder except through validate. The builder can then *assume* validity — simplifying it enormously — because the invariant is enforced at one choke point.
- **Semantic rules want a constrained expression language, not code.** Our slot rules and nesting rules (doc 01/03) will multiply; encoding them as data (CEL-like expressions or a rules table the linter evaluates) keeps them enumerable, testable, and eventually LLM-inspectable — versus scattering them through builder code.

---

## 4. Nix, Bazel, and hermetic builds

Terraform and Kubernetes reconcile a *mutable* world. Nix and Bazel take the opposite route: make realization a **pure function**, and determinism follows by construction. This is the theory backing doc 04's "deterministic assembly."

### Nix: builds as pure functions

[Nix](https://nixos.org/)'s model: a package build is a function from *all* of its inputs (sources, compiler, flags, dependencies, environment) to an output. Every build is described by a **derivation** — a complete, serialized recipe. Store paths like `/nix/store/9f1zvhk…-openssl-3.0.7` are named by **hash**:

- **Input-addressed** (classic Nix): the hash covers the *recipe* — the derivation and all its input hashes, transitively. Same recipe ⇒ same path, so a path is a proof of *how* something was built.
- **[Content-addressed derivations](https://www.tweag.io/blog/2021-12-02-nix-cas-4/)** (newer, experimental): the hash covers the *output bytes*. This enables **early cutoff**: if a change to an input rebuilds to bit-identical output, everything downstream is skipped, because downstream only cares about content.

**Hermeticity** is enforced, not hoped for: builds run in a sandbox with no network, no clock access to speak of, no undeclared paths visible. If you didn't declare it, the build can't see it — so "works on my machine" is structurally impossible. (Caveat from the field: [the sandbox itself is a hidden input](https://fzakaria.com/2026/07/30/the-nix-sandbox-is-a-hidden-input) — kernel/sandbox differences can still leak in; and [full bit-for-bit NixOS reproducibility remains asymptotic](https://lobste.rs/s/jpoy4q/nixos_is_not_reproducible), though a [2025 large-scale study found the functional model does deliver reproducibility at scale](https://arxiv.org/pdf/2501.15919) — ~95%+ of packages bit-reproducible.)

**Binary caches** fall out for free: since a store path's hash fully identifies the artifact, [a cache is just a lookup table from hash → prebuilt output](https://nixos.wiki/wiki/Ca-derivations); the builder tries substitution first and only builds on miss. Determinism is what makes caching *trustworthy*.

### Bazel: the action graph

[Bazel](https://bazel.build/basics/hermeticity) applies the same idea at build-step granularity. The build decomposes into an **action graph** — a DAG of fine-grained actions (compile this file, link these objects), each with declared inputs and outputs. [Bazel assumes actions are hermetic](https://github.com/bazelbuild/bazel/blob/master/site/en/basics/hermeticity.md): same inputs ⇒ same outputs. That assumption powers:

- **Action cache:** hash(action definition + input digests) → output digests. Cache hit = skip the work.
- **Content-addressable store (CAS):** artifacts stored by content hash, shared *remotely across the whole organization* — one developer's build warms everyone's cache.
- **Correct incrementality:** only actions whose input digests changed re-run; everything else is provably reusable. No `make clean` culture, because there is nothing stale to fear.

The discipline cost is real: [keeping a Bazel project hermetic](https://www.tweag.io/blog/2022-09-15-hermetic-bazel/) means pinning toolchains, vendoring or hashing every dependency, and hunting down every nondeterminism source (timestamps, absolute paths, map iteration order, `$RANDOM`). Non-hermetic actions poison the cache with wrong results — worse than no cache.

### What this buys our builder

Doc 04 already specifies pinned Prettier and seeded fake data. Nix/Bazel say: go all the way to a *stated determinism contract* — `build(constructionFile, catalogVersion) → byte-identical file tree`, with every input named: construction file hash, catalog version, builder version, template versions, faker seed, formatter version. Then:

- The **manifest becomes content-addressed**: record `hash(inputs) → hash(each output file)`. Clobber detection (did a human edit generated code?) is a hash comparison; *no-op rebuild detection* (did this patch actually change anything?) is free; and caching pattern expansions across prototypes becomes possible exactly the way a binary cache works.
- **Determinism is testable**: CI builds every fixture construction file twice and byte-compares — the same "build it twice" check reproducible-builds.org uses. Any diff is a builder bug (unseeded randomness, unstable ordering, timestamps in headers).
- **Early cutoff applies**: if an LLM patch edits a description field that doesn't affect output, the rebuilt tree hashes identically and the preview/screenshot/a11y pipeline can be skipped.

---

## 5. GitOps: Argo CD and Flux

GitOps ([Argo CD](https://argo-cd.readthedocs.io/), [Flux](https://fluxcd.io/); principles codified by the CNCF [OpenGitOps](https://opengitops.dev/) project) composes the previous patterns into an operating model: **a git repository is the sole source of truth for desired state, and an in-cluster controller continuously reconciles the live system to match it.** Deployment stops being "a pipeline ran kubectl apply" and becomes "a commit merged; the reconciler noticed."

The four OpenGitOps principles, annotated for our purposes:

1. **Declarative** — the entire desired state is expressed declaratively. (Our construction file + intent.yaml.)
2. **Versioned and immutable** — state is stored in a way that enforces immutability and full version history. Git gives: review (PRs), attribution (commits), *rollback = revert*. A bad deploy is undone by reverting a commit — the realizer handles the rest.
3. **Pulled automatically** — agents pull desired state from the source rather than being pushed to (removes the "CI has god credentials to prod" problem).
4. **Continuously reconciled** — agents continuously observe and converge.

Operationally interesting mechanics:

- **Sync status as a first-class UI.** Argo CD's core screen shows, per application: `Synced`/`OutOfSync` (does live match git?) and `Healthy`/`Degraded` (is the live thing actually working?). Two orthogonal axes — *conformance* and *health* — always visible. [Drift is detected continuously via a watch-backed cluster cache](https://oneuptime.com/blog/post/2026-03-13-flux-cd-vs-argocd-drift-detection/view), not on demand.
- **Self-heal is a policy toggle, not an assumption.** Auto-sync + `selfHeal: true` means manual cluster edits are reverted within seconds. Teams *choose* per-application whether drift is auto-reverted or merely flagged for a human — because sometimes the manual hotfix at 3 a.m. was correct and git is what's stale.
- **Sync waves and hooks** — ordered phases (pre-sync, sync waves 0..n, post-sync) for realizations that need sequencing; the declarative model keeps an escape valve for ordering without becoming imperative.
- **Progressive delivery** — [Argo Rollouts and Flagger](https://www.harness.io/blog/comparison-of-argo-cd-vs-flux) extend reconciliation to *gradual* convergence: canary a new desired state to 10% of traffic, evaluate metrics, advance or roll back automatically. Desired state includes *how carefully* to converge.

For us, GitOps is less a new mechanism than a **source-of-truth discipline**: the construction file + intent.yaml live in git; every LLM patch is a commit (or PR); rollback of a bad iteration is `git revert` + rebuild — which our deterministic builder makes exact. The sync-status axes translate directly: a prototype is `Synced` (generated code matches manifest hashes) or `OutOfSync` (drift: someone hand-edited), and independently `Healthy` (builds, renders, passes a11y) or `Degraded`. A tiny status surface showing both axes answers the designer's two standing questions — *is what I see what the file says?* and *is it working?* — at a glance.

---

## 6. CI/CD YAML: when declarative specs become bad programming languages

The cautionary tale. CI configuration (Travis → GitHub Actions, GitLab CI, Azure Pipelines) began as genuinely declarative data — "run these steps on this trigger" — and then real-world needs (conditionals, matrices, reuse, dynamic behavior) arrived. Instead of admitting a programming language, the systems bolted program-shaped features onto YAML:

- **String-embedded expression languages:** GitHub Actions' `${{ }}` contexts — an untyped expression language *inside strings inside YAML*, with [its own context objects and interpolation rules, where a single character error requires waiting for a runner to spin up before discovering the mistake](https://www.iankduncan.com/engineering/2026-02-05-github-actions-killing-your-team/).
- **Data-shaped control flow:** `if:` conditions as strings, `strategy.matrix` as loop-substitute, `needs:` as manual DAG wiring. As one much-cited formulation puts it: [you're declaring things in a language that isn't powerful enough to express what you mean, so you end up building a Rube Goldberg machine out of YAML](https://lobste.rs/s/6n7rzd/some_data_should_be_code).
- **Reuse via copy-paste:** composite actions and `workflow_call` arrived late and awkwardly; in practice [configuration chunks are copy-pasted across repos and drift](https://medium.com/@vijeta004/for-years-yaml-has-been-the-default-language-of-ci-cd-pipelines-a92015df16fb).
- **Untestability:** no local execution story (community tools like `act` approximate it); the edit-push-wait-fail-read-logs loop is the debugging experience. YAML itself contributes footguns — the [Norway problem](https://go-tools.org/blog/yaml-norway-problem-and-json-yaml-differences) (`NO` → `false`), octal literals, duplicate-key silence.

And yet — every one of these systems ships the same escape hatch: **`run:`** — a shell script step. The declarative layer orchestrates; arbitrary computation happens in a real language inside a step. The systems that age best lean into this split hard: [Buildkite keeps YAML for pipeline *structure* only, with all logic in testable scripts, and supports dynamically generating the pipeline itself from a script at runtime](https://www.iankduncan.com/engineering/2026-02-05-github-actions-killing-your-team/). Dagger goes further — pipelines as real code invoking containerized functions. The general pattern across config-language history (see also Starlark: Bazel's answer — a deliberately *deterministic, hermetic* Python subset for build definitions; and [Pulumi's inversion](https://news.ycombinator.com/item?id=42794730) — full languages *producing* a declarative resource graph):

> **Declarative data at the coordination layer; a real language behind a named boundary; and if generation-time logic is needed, use a real language to *generate* the declarative data — never grow the data format into a language.**

This is the strongest single warning for our schema design. The construction file will face pressure to grow: "show this section only if the user is an admin" (conditionals), "repeat this card per item" (loops), "this padding is the header padding + 4" (expressions). Each is a step down the GitHub Actions path. The infrastructure verdict on where those belong:

- Conditional/repeated *rendering* is the **builder's and the component's** job (a `visibleWhen` data field bound to app state, or the pattern itself handling lists) — never an `if` evaluated at construction-file level.
- Computed *values* belong in the **token/catalog layer** (doc 01: styling by token reference only — the token system owns arithmetic).
- Genuinely novel logic belongs in the **escape hatch** — doc 01's `CustomBlock` is our `run:` step, and the CI lesson confirms both its necessity and its telemetry role: rising escape-hatch usage is the signal that the catalog (not the file format) needs to grow.
- If sophisticated *generation-time* logic ever becomes necessary, the answer is a real-language layer that *emits* construction files (the Pulumi/CDK move) — the LLM already is that layer.

---

## 7. Lessons for construction-file prototyping

The mapping table, then each lesson in detail.

| # | Infrastructure pattern | Architecture decision for us |
|---|---|---|
| 1 | Terraform plan/apply | A `plan` step: show designers a semantic diff preview before rebuilding |
| 2 | State file + drift detection | Upgrade the generation manifest into a real state file with directional drift resolution |
| 3 | Level-triggered reconciliation | Patches edit the spec; the builder always rebuilds from the full spec — never patch-driven incremental output |
| 4 | SSA field ownership | Builder/LLM/human split tracked as per-path field managers with structured conflicts |
| 5 | Admission chain | One validation choke point: normalize → validate → lint, with rules as data; builder assumes validity |
| 6 | Hermetic builds + CAS | A stated determinism contract; content-addressed manifest; build-twice CI test; early cutoff |
| 7 | GitOps | Git as source of truth for spec; revert=rollback; two-axis sync/health status surface |
| 8 | CRD versioning / module pinning | `schemaVersion` + `catalogVersion` recorded in every construction file, with explicit migrations |
| 9 | Terraform import | Semi-automated "adopt existing code" flow instead of no round-trip at all |
| 10 | YAML-programming pain | Hard rule: no logic in the construction file, ever; pressure routes to builder, tokens, or CustomBlock |

**Lesson 1 — Plan before apply.** Today's loop (doc 05) goes patch → validate → build → look at the result. Insert a plan: after a patch validates, the tool diffs old vs new *normalized* construction file and renders a semantic changeset in designer language — "Header: becomes sticky · ObjectList: 3 columns → 4 · **SettingsForm: will be re-created (pattern change) — slot contents preserved: 6/7, dropped: `helpText`**" — before anything is rebuilt. The Terraform experience says the highest-value line is the *cascade* warning (the `-/+ destroy and re-create` equivalent): pattern swaps that can't preserve all slot content should be called out before, not discovered after. Cheap to build (we own both trees and the id-keyed children make matching trivial) and it doubles as the LLM-facing confirmation surface: the model can read its own plan and catch unintended edits — trustcall-style corrective loops, but pre-apply.

**Lesson 2 — The manifest is a state file; treat it with state-file respect.** Doc 04's manifest (per-file hashes) is Terraform state minus the lessons. Upgrade it to record: input hashes (construction file, catalog version, builder version, seed), output hashes per file, the construction-file node(s) each output file derives from (the address→resource mapping), and per-path field managers (Lesson 4). Then adopt the state disciplines: the manifest is machine-written only; it is versioned alongside the code (git gives us locking-by-PR and rollback for free — we don't need remote backends at prototype scale); and drift resolution is a *menu*, not one behavior: on hash mismatch offer exactly Terraform's four options — **revert** (rebuild, stomp the hand-edit), **adopt** (model-assisted re-import of the edit into the construction file, doc 05's flow), **accept** (bless the current bytes: update manifest hash, mark the file human-owned), **ignore** (permanent `ignore_changes` on that file/path — it has left the system, stop warning).

**Lesson 3 — Rebuild from level, iterate by edge.** Keep two planes strictly apart. Spec plane: JSON Patches are how the *construction file* changes — cheap, reviewable, edge-style. Realization plane: the builder is always `build(fullSpec)` — level-triggered, idempotent, history-free. Never let the builder consume the patch ("the patch only touched the header, so only regenerate Header.tsx") as its source of truth; hermetic caching (Lesson 6) delivers the same speed win *safely*, because skipping is based on input hashes, not on trusting the edit description. This single rule is what makes the system immune to the corrupted-intermediate-state class of bugs: any wedged state is fixed by one full rebuild, the `make clean` that always works — except it's also always correct.

**Lesson 4 — Field ownership à la server-side apply.** Refine doc 05's file-granularity split with SSA semantics at the spec level. Manifest records a manager per construction-file path: structural fields (layout, pattern refs, container config) → `builder`-guarded (schema-level: only patch-gate-approved structural patches touch them); content fields (copy, sample data, island code) → `llm`; anything a human hand-edited and "accepted" → `human`. The patch gate becomes an apply endpoint: an LLM patch touching a `human`-owned field returns a structured conflict — *"`screens[2].children[hero].copy` is owned by `human` (accepted 2026-08-01); force to take ownership?"* — instead of silently stomping the designer's tweak. Forcing is allowed (SSA allows it) but recorded, so the next drift report can say who took what from whom. This is cheap to implement (it's bookkeeping over the same id-keyed paths the patches already use) and it converts the scariest failure mode of LLM iteration — silently undoing human work — into a visible, decidable event.

**Lesson 5 — One admission chain, and the builder assumes validity.** Order the gate exactly like Kubernetes admission: (1) *mutate*: normalize + materialize schema defaults into a canonical construction file (so diffs, plans, and ownership paths always operate on complete documents); (2) *schema-validate* (structural, enum-constrained); (3) *semantic lint* (slot rules, nesting rules) — expressed as a **rules table / CEL-style expressions, not builder code**, so rules are enumerable, unit-testable, and can be rendered into the LLM's context as documentation; (4) reject with actionable, path-addressed messages (the repair loop's fuel). Everything — first generation, every patch, every import — enters through this one door; the builder itself contains zero validation and can be simple and fast because invariants are guaranteed upstream. The ValidatingAdmissionPolicy trajectory (webhook code → embedded CEL) is a hint that even our "custom lint" wants to be data, not code.

**Lesson 6 — Sign the determinism contract.** Declare it in the builder's README and test it in CI: *identical (construction file, catalog version, builder version, seed) ⇒ byte-identical output tree.* Enforce with the reproducible-builds "build twice and byte-compare" test over all fixtures; known enemies are the Bazel/Nix list — timestamps, absolute paths, unstable map/object iteration order, unseeded random, formatter version skew (pin Prettier as already planned). Payoffs stack: clobber detection is exact; *no-op detection* is free (patch produced identical output ⇒ skip preview/screenshot/a11y); pattern-level expansion caching becomes possible (content-addressed: `hash(pattern node + catalog version) → expanded files`), which matters once many prototypes share one catalog; and "revert the commit, rebuild" is guaranteed to reproduce yesterday's prototype bit-for-bit.

**Lesson 7 — Git is the backend; show sync × health.** intent.yaml + construction file + manifest live in git; generated code is either committed (inspectable, diffable in PRs — probably right for prototypes) or treated as build output — but either way *the spec is authoritative and the commit history is the iteration history*. Each LLM iteration = one commit with the patch as the diff; a bad direction is `git revert` + rebuild, exact by Lesson 6. Surface two independent status axes in the preview UI, GitOps-style: **Synced/Drifted** (do generated files match manifest hashes?) and **Healthy/Degraded** (build ok, renders, a11y passes). Auto-revert of drift (self-heal) should be a per-prototype *toggle*, defaulting off — the Argo lesson is that sometimes the hand-edit is the truth and the spec is what's stale.

**Lesson 8 — Version everything, migrate explicitly.** Every construction file records `schemaVersion` and `catalogVersion` (module pinning + CRD versioning). Catalog upgrades never silently re-interpret old files: the builder either supports the old version, runs an explicit migration (CRD conversion-function style, deterministic, reviewable as a diff), or refuses with a clear message. Without this, the first catalog refactor breaks every existing prototype at rebuild time in undebuggable ways — the exact incident class Terraform provider-version upgrades are notorious for.

**Lesson 9 — Build the importer as adopt-and-review, not a parser.** Doc 05 rejected full code→construction round-tripping; Terraform's `import` + `-generate-config-out` shows the achievable middle: point the tool at an existing screen (hand-built or hand-drifted), let the LLM generate a *best-effort* construction file for it against the catalog, build it, and show a visual + code diff between the original and the regenerated version — the residue (what the catalog couldn't express) lands in `CustomBlock`s, and the designer/LLM reviews before adoption. Imperfect is fine; Terraform's config generation is also explicitly "review and edit before use." This turns brownfield screens from "outside the system forever" into "one supervised import away," and CustomBlock residue doubles as catalog-gap telemetry.

**Lesson 10 — Keep logic out of the construction file. Permanently.** The CI/CD section's rule, stated as a schema governance policy: the construction file admits **no conditionals, no loops, no expressions, no arithmetic, no string interpolation** — ever. Requests that feel like logic route to their proper layer: conditional visibility → a declarative `visibleWhen` *data* binding interpreted by the runtime/component; repetition → patterns that accept collections (the data, not the loop, lives in the file); computed style → the token layer; real logic → `CustomBlock`. If a class of request keeps not fitting, that is a catalog gap or a signal this screen belongs on the normal agent-writes-code path (doc 00, decision 6) — it is never a reason to add `{{ }}` to the schema. Every config system that broke this rule (Actions expressions, Helm's string-templated YAML, Jsonnet sprawl) became a worse programming language with no debugger; and our situation is *more* forgiving than theirs because we already have a real language upstream (the LLM emits the file) and downstream (the builder and React) — the declarative layer in the middle can therefore afford to be totally logic-free.

---

## 8. Tradeoffs and failure stories

What these patterns cost, and how they fail in the wild — each failure a preview of one of ours.

**Terraform state corruption / loss.** The classic incident shape: [a network timeout mid-apply leaves a partially written state — infrastructure half-updated, state recording resources that don't exist; nine hours to diagnose](https://aws.plainenglish.io/our-terraform-state-got-corrupted-and-no-one-knew-until-production-broke-539067c6e75b). Causes cluster around [concurrent applies without locking, manual state edits, and interrupted writes](https://scalr.com/learning-center/empty-terraform-state-file-recovery); consequences: the tool tries to re-create resources that exist, or forgets resources it owns. And the [monolithic-state postmortem](https://medium.com/@premchandak_11/we-corrupted-our-terraform-state-and-took-down-production-here-is-the-autopsy-9c5f55780f07): one 20 MB state for everything means total blast radius and serialized teams. *Our preview:* a corrupted or stale manifest makes drift detection lie — either stomping human edits it should have flagged or refusing builds it should allow. Mitigations are cheap at our scale (manifest is git-versioned next to the code; writes are atomic file replaces; one manifest per prototype = naturally segmented state) but only if built in from the start. Also inherit the recovery affordance: a `re-manifest` command that rebuilds the manifest from a trusted build, the equivalent of state recovery.

**Drift wars / controller fights.** Pre-SSA Kubernetes: HPA sets `replicas: 7`, a CI `kubectl apply` with `replicas: 3` in the manifest stomps it, HPA sets it back — an infinite silent tug-of-war. GitOps flavor: Argo self-heal reverts a 3 a.m. manual hotfix every 30 seconds while the on-call engineer swears at the cluster. *Our preview:* LLM patch regenerating copy a designer hand-tuned; auto-rebuild stomping it; designer re-fixing; repeat. Field ownership (Lesson 4) + self-heal-off-by-default (Lesson 7) are the specific antidotes.

**Hermeticity leaks.** Bazel/Nix teams report the long tail: a build that reads the system clock, a compiler that embeds absolute paths, [the sandbox itself differing across kernels](https://fzakaria.com/2026/07/30/the-nix-sandbox-is-a-hidden-input) — each leak poisons caches with plausible-but-wrong artifacts, the worst kind of bug. *Our preview:* one `new Date()` in a template or unseeded faker call and every rebuild diffs, making drift detection cry wolf until people ignore it — which kills the whole manifest mechanism socially, not just technically. The build-twice CI test (Lesson 6) exists to catch this before designers do.

**YAML sprawl.** [500–1000-line workflow files with matrix/conditional lattices nobody can read](https://news.ycombinator.com/item?id=37612420); copy-paste reuse drifting across repos; Helm charts templating YAML with text-level `{{ if }}` producing invalid YAML at render time. The meta-failure: each individual feature addition was reasonable; the sum is a language nobody would design. *Our preview:* every schema addition PR needs the question "is this logic wearing a data costume?" asked explicitly (Lesson 10). Sprawl arrives one justified field at a time.

**Abstraction inversion / expressiveness ceiling.** Teams fight HCL to express something trivial in any real language ([the Rube Goldberg complaint](https://lobste.rs/s/6n7rzd/some_data_should_be_code)), then either bolt on generators (Terragrunt templating HCL — templating a config language, the cycle repeating) or jump to Pulumi/CDK. *Our preview:* doc 00's honest caveat quantified — below ~60–70% pattern coverage, designers spend their time fighting the format, and the correct response is routing to the code path, not enriching the format. The infrastructure precedent adds: measure it (CustomBlock telemetry is our equivalent of counting `run:` steps and `local-exec` provisioners — the escape-hatch rate *is* the abstraction-health metric).

**Operational weight of validation gates.** Admission webhooks that are down blocking all deployments (fail-closed) or silently skipping policy (fail-open); the fix was moving validation in-process (CEL). *Our preview:* keep the validation chain in-process in the builder/skill — no networked validation service, ever, at prototype scale.

**Plan fatigue.** Terraform teams that auto-apply because plans got too long to read; the review safeguard decays when the diff surface is noisy. *Our preview:* the plan output (Lesson 1) must stay semantic and short — pattern/slot-level lines, not file diffs — or designers will click through it and the safety property evaporates.

---

## 9. Open questions

1. **How much state machinery is too much for prototypes?** Terraform's disciplines answer for systems that live years and cost money to break. A prototype might live two days. Which lessons (ownership tracking, versioned migrations) pay for themselves at 48-hour lifetimes, and which should activate only when a prototype "graduates" (doc 04's staging)? Candidate answer: manifest + determinism from day one (nearly free), ownership + migrations only past graduation — but this should be tested in E5.
2. **Is continuous reconciliation ever right for us?** Everything above assumes point-in-time (Terraform-style) reconciliation triggered by build/patch events. A live-preview editor (doc 04's later interpreter) is effectively a continuous reconciler — file-watcher → rebuild loop. Do the GitOps lessons (self-heal toggles, sync status) transfer wholesale, or does sub-second loop latency change the drift calculus (hand-edits get stomped before the designer's save finishes)?
3. **Field ownership granularity in practice.** SSA took Kubernetes three API revisions to get right (client-side apply annotations → SSA beta → GA), and `managedFields` noise is a persistent UX complaint (`kubectl` hides it by default). What is the *minimum* ownership model that prevents stomping without drowning the manifest in bookkeeping — per-file, per-node, or per-field? E5 (iteration economics) could measure stomp incidents under each.
4. **Can the plan step double as the LLM's self-check?** Terraform plans are for humans. Ours could be re-read by the generating model before apply ("does this changeset match the user's request?") — a cheap semantic verification pass that infrastructure never had because its planner and author were different species. Worth an experiment arm: apply-with-plan-reflection vs direct apply, measuring unintended-edit rate.
5. **Content-addressed pattern expansion cache — real win or premature?** Bazel-style caching pays off at organizational scale. At what number of prototypes/screens sharing one catalog does expansion caching beat the simplicity of always rebuilding (builds are already sub-second for prototype-sized trees)?
6. **Import fidelity threshold.** Terraform's config generation is "review before use" — acceptable because operators are experts. Is a designer reviewing an LLM-generated construction file for a hand-built screen a realistic quality gate, or does adopt-and-review (Lesson 9) need the visual-diff crutch (original vs regenerated screenshot comparison) to be trustworthy?
7. **Who watches the catalog's versioning?** CRD-style versioning (Lesson 8) assumes disciplined migration authorship. In a design-system context the catalog regenerates from source (doc 01) — potentially on every design-system release. Does automated catalog regeneration need its own plan/apply step (diff the catalog, flag breaking changes to patterns/props before republishing), i.e., is the catalog itself the *second* declarative system in this architecture that needs everything in this document applied to it?

---

## Sources

**Terraform / IaC:** [HashiCorp — Detecting and Managing Drift](https://www.hashicorp.com/en/blog/detecting-and-managing-drift-with-terraform) · [Spacelift — Terraform Drift Detection Guide](https://spacelift.io/blog/terraform-drift-detection) · [Firefly — Drift Detection Guide](https://www.firefly.ai/academy/terraform-drift-detection-guide) · [Terraform — Import](https://developer.hashicorp.com/terraform/language/import) · [Terraform — Module Composition](https://developer.hashicorp.com/terraform/language/modules/develop/composition) · [Terraform — How Terraform Works with Plugins](https://developer.hashicorp.com/terraform/plugin/how-terraform-works) · [DeepWiki — Provider Plugin System](https://deepwiki.com/hashicorp/terraform/2.2-provider-plugin-system) · [Scalr — Terraform Import Guide](https://scalr.com/learning-center/the-ultimate-guide-to-terraform-import)

**Kubernetes:** [Kubernetes — Server-Side Apply](https://kubernetes.io/docs/reference/using-api/server-side-apply/) · [Podostack — SSA and managedFields](https://podostack.com/p/server-side-apply-managed-fields-field-ownership) · [James Bowes — Level Triggering and Reconciliation in Kubernetes](https://medium.com/hackernoon/level-triggering-and-reconciliation-in-kubernetes-1f17fe30333d) · [Chainguard — The Principle of Reconciliation](https://www.chainguard.dev/unchained/the-principle-of-reconciliation) · [Red Hat — Kubernetes Operators Best Practices](https://www.redhat.com/en/blog/kubernetes-operators-best-practices) · [GoLinuxCloud — Kubernetes Reconcile Loop Explained](https://www.golinuxcloud.com/kubernetes-reconcile-loop-explained/) · [Kubernetes — Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/) · [ARMO — Validating Admission Policies in K8s 1.30](https://www.armosec.io/blog/validating-admission-policies-kubernetes/)

**Nix / Bazel:** [Tweag — Implementing a Content-Addressed Nix](https://www.tweag.io/blog/2021-12-02-nix-cas-4/) · [NixOS Wiki — CA Derivations](https://nixos.wiki/wiki/Ca-derivations) · [Zakaria — The Nix Sandbox is a Hidden Input](https://fzakaria.com/2026/07/30/the-nix-sandbox-is-a-hidden-input) · [Malka et al. — Functional Package Management Enables Reproducible Builds at Scale](https://arxiv.org/pdf/2501.15919) · [Bazel — Hermeticity](https://bazel.build/basics/hermeticity) · [Tweag — How to Keep a Bazel Project Hermetic](https://www.tweag.io/blog/2022-09-15-hermetic-bazel/) · [GoCodeo — How Bazel Works](https://www.gocodeo.com/post/how-bazel-works-dependency-graphs-caching-and-remote-execution)

**GitOps:** [OpenGitOps Principles](https://opengitops.dev/) · [Harness — Argo CD vs Flux](https://www.harness.io/blog/comparison-of-argo-cd-vs-flux) · [OneUptime — Flux vs Argo CD Drift Detection](https://oneuptime.com/blog/post/2026-03-13-flux-cd-vs-argocd-drift-detection/view) · [Plural — Argo CD vs Flux](https://www.plural.sh/blog/argo-cd-vs-flux/)

**CI/CD YAML pain:** [Ian Duncan — GitHub Actions Is Slowly Killing Your Engineering Team](https://www.iankduncan.com/engineering/2026-02-05-github-actions-killing-your-team/) · [Lobsters — Some Data Should Be Code](https://lobste.rs/s/6n7rzd/some_data_should_be_code) · [HN — GitHub Actions Could Be So Much Better](https://news.ycombinator.com/item?id=37612420) · [Go Tools — The YAML Norway Problem](https://go-tools.org/blog/yaml-norway-problem-and-json-yaml-differences) · [Encore — CDKTF Guide](https://encore.dev/articles/cdktf-guide) · [Pulumi YAML announcement](https://www.pulumi.com/blog/pulumi-yaml/)

**Failure stories:** [Prem Chandak — We Corrupted Our Terraform State (autopsy)](https://medium.com/@premchandak_11/we-corrupted-our-terraform-state-and-took-down-production-here-is-the-autopsy-9c5f55780f07) · [AWS in Plain English — Our Terraform State Got Corrupted](https://aws.plainenglish.io/our-terraform-state-got-corrupted-and-no-one-knew-until-production-broke-539067c6e75b) · [Scalr — Empty Terraform State File Recovery](https://scalr.com/learning-center/empty-terraform-state-file-recovery) · [Sainath Mitalakar — The State File That Remembered Too Much](https://medium.com/@sainathmitalakar/the-state-file-that-remembered-too-much-a-terraform-horror-story-9b02804550d8)
