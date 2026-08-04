# 09 — Model-Driven Engineering & Low-Code: The Cautionary Tale

**Purpose:** Our construction-file architecture — a schema-validated model as source of truth, a deterministic builder that expands it into code, surgical edits to the model rather than the artifact — is *structurally identical* to what the software industry spent 25 years attempting under the names CASE, MDA, MDE, executable UML, language workbenches, and finally low-code. Most of those attempts failed; a few found durable niches; one (the spreadsheet) became arguably the most successful programming system ever built. This document is the post-mortem of that lineage: why model-as-source-of-truth failed at universal scale, what the survivors did differently, and which of those hard-won lessons bind on our design. It closes with an honest assessment of whether "prototypes within one design system" is narrow enough to be on the winning side of history, and which historical failure modes an LLM in the loop actually changes.

**Contents**

1. [Why this doc exists: the structural resemblance](#1-why-this-doc-exists-the-structural-resemblance)
2. [MDA and UML: history and post-mortem](#2-mda-and-uml-history-and-post-mortem)
3. [What survived: DSL workbenches and projectional editing](#3-what-survived-dsl-workbenches-and-projectional-editing)
4. [EMF and Eclipse Modeling: the mature generated/handwritten split](#4-emf-and-eclipse-modeling-the-mature-generatedhandwritten-split)
5. [Low-code platforms: MDA's commercial descendants](#5-low-code-platforms-mdas-commercial-descendants)
6. [Spreadsheets and illustrative programming](#6-spreadsheets-and-illustrative-programming)
7. [The domain-narrowness thesis](#7-the-domain-narrowness-thesis)
8. [Lessons for construction-file prototyping](#8-lessons-for-construction-file-prototyping)
9. [Open questions: what does LLM-in-the-loop actually change?](#9-open-questions-what-does-llm-in-the-loop-actually-change)
10. [Sources](#10-sources)

---

## 1. Why this doc exists: the structural resemblance

Line up the OMG's 2001 Model-Driven Architecture against our pipeline and the correspondence is uncomfortable:

| MDA (2001) | Construction-file prototyping (us) |
|---|---|
| PIM — Platform-Independent Model (UML) | Construction file (JSON tree of pattern refs) |
| PSM — Platform-Specific Model | (collapsed — we go straight to code) |
| Model-to-code transformation (QVT, templates) | Deterministic builder (templates + ts-morph) |
| Metamodel (MOF) constraining valid models | Zod schema / JSON Schema constraining valid files |
| CASE tool / modeling IDE | LLM + agent skill |
| "Model is the source of truth; code is derived" | Same claim, verbatim (doc 05) |
| Round-trip engineering to sync model ↔ code | Explicitly **rejected**; manifest + re-adopt instead |
| UML profiles to specialize the universal language | One design system's pattern catalog (not universal) |

The resemblance is not a reason to stop — it is a reason to know precisely why the ancestors died. The one-line summary of the next four sections: **model-driven approaches fail when the abstraction is universal, the tooling is a separate world, the model can't be diffed, and the last 20% has no home; they succeed when the domain is narrow, feedback is instant, the model is ordinary text in git, and escape hatches are first-class.** Our architecture (docs 01–05) already embodies several of the survivor traits — this doc checks the design against the full failure catalog and flags the places where we're still exposed.

---

## 2. MDA and UML: history and post-mortem

### 2.1 The vision

UML emerged from the "method wars" of the early 1990s, when Rational hired Grady Booch, James Rumbaugh, and Ivar Jacobson and merged their competing OO notations (OOAD, OMT, OOSE) into a unified standard, handed to the OMG in 1997. Hillel Wayne's history ["Why UML 'Really' Died"](https://buttondown.com/hillelwayne/archive/why-uml-really-died/) documents that this merger was partly driven by CASE-tool vendor pressure — the standard was born already coupled to a tooling business model, and inherited the combined complexity of three predecessor methods.

In 2001 the OMG launched [Model Driven Architecture](https://www.omg.org/mda/): developers author a **Platform-Independent Model** (PIM) in UML; standardized transformations produce a **Platform-Specific Model** (PSM) for J2EE, .NET, or CORBA; further transformation produces code. The promise was the same one CASE tools made in the 1980s and the same one we are making now: raise the abstraction level, generate the mechanical parts, and let humans work at the level of intent. The most committed wing was **Executable UML** (Mellor & Balcer, 2002): fully specify behavior in UML state machines plus an action language, and *never look at the generated code at all* — the model is the program.

Martin Fowler's contemporaneous framework of [three UML modes](https://martinfowler.com/bliki/UmlMode.html) — **sketch** (informal communication), **blueprint** (complete design handed to coders), **programming language** (model compiles to the system) — is the right lens for the post-mortem, because the three modes died separately: UML-as-programming-language failed early, UML-as-blueprint died with the CASE tools it depended on, and UML-as-sketch quietly degenerated into non-standard whiteboard doodles (which is the only mode still alive).

### 2.2 The failure catalog

The failure was overdetermined; the retrospectives agree on a recurring set of mechanisms. Each one is a live risk for us, so they're worth enumerating carefully.

**(a) The abstraction didn't abstract.** Fowler's core objection in [ModelDrivenArchitecture](https://martinfowler.com/bliki/ModelDrivenArchitecture.html) and [UmlAsProgrammingLanguage](https://martinfowler.com/bliki/UmlAsProgrammingLanguage.html): UML's notation was designed for *sketching*, and when pressed into service as a programming language it was not actually higher-level than code. For structure (class diagrams → class skeletons) it saved little; for behavior it was actively worse — "I can't see that drawing sequence diagrams or activity diagrams is as good, let alone better, than writing code." Graphical notation was assumed to be inherently more productive than text; three decades of graphical-programming failures say it isn't, because diagrams are slower to author, harder to search, and don't compose. Commercial MDA tools in practice generated database schemas and getter/setter skeletons — the parts that were never the hard 20% ([Methods & Tools retrospective](https://www.methodsandtools.com/archive/archive.php?id=5)). *An abstraction only pays when expressing the same intent takes meaningfully fewer decisions than the code does. This is the bar our token-economics argument (5–10× fewer tokens per screen) must actually clear in experiment E1 — and note the MDA people also had plausible-sounding multiplier claims.*

**(b) The 80% problem.** Model-driven generation reliably covered 60–80% of an application ([Voelter's MD*/DSL best practices](https://voelter.de/data/pub/DSLBestPractices-2011Update.pdf); [JOT 2009 paper](https://www.jot.fm/issues/issue_2009_09/column6.pdf)); the remaining fraction — integrations, odd UI behaviors, performance-critical paths, the actually-differentiating logic — had no good home. Teams either contorted the modeling language to express it (metamodel bloat, "stereotype soup"), dropped into generated code and lost regeneration, or maintained awkward extension points. The tools treated the escape to code as a failure condition rather than a designed-for path, and the 20% is where projects went to die. *Doc 01's `CustomBlock` island and doc 05's LLM-owned files are our designed-for path; the historical lesson is that escape-hatch ergonomics decide adoption, because every real project hits the hatch.*

**(c) Round-trip engineering broke, always.** Blueprint-mode tools (Rational Rose, Together, Rhapsody) promised bidirectional sync: edit the model or the code, and the other side updates. In practice reverse-engineering code changes back into model semantics is only tractable for structural trivia (class names, fields); design intent expressed in code has no unique model representation. Sync degraded, developers edited whichever artifact was under their cursor, and the model drifted until it was abandoned. Wayne's blunt summary: UML models "rotted too quickly to be useful." [Hailpern & Tarr's IBM Systems Journal paper, "Model-driven development: the good, the bad, and the ugly"](https://dl.acm.org/doi/10.1147/sj.453.0451) (2006) — written by insiders at a company selling MDD tooling — identifies the same core problems: redundancy across model and code views, the consistency-maintenance burden growing with every additional artifact, and debugging that forces users through the abstraction layer they were promised they could ignore. *This is the single strongest historical endorsement of doc 05's decision: never build code→construction-file round-trip; do one-way generation, detect drift via the manifest, and re-adopt explicitly. Every system that promised round-trip failed to deliver it; the survivors (EMF, low-code, spreadsheets) are all one-way systems.*

**(d) Model-code drift as the default state.** Corollary of (b) and (c): the moment a deadline arrives, someone patches the generated artifact directly, and from then on the model lies. A model that lies is worse than no model — it costs maintenance and misleads readers. Drift wasn't an edge case in MDA; it was the steady state of every project that lived past its first release. *We cannot prevent drift (the generated React is right there, and any agent or human can edit it); we can only make drift cheap to detect (manifest hashes) and cheap to reconcile (re-adopt). Budget for drift as the normal case, not the exception.*

**(e) Tooling lock-in and the interchange that never worked.** UML notionally had a standard interchange format (XMI), but vendors implemented it incompatibly — diagrams could not actually move between tools, and there was no canonical *textual* representation at all. Wayne highlights this: with neither text nor a reliable data format, users were locked to a vendor, and when IBM bought Rational in 2003 and froze the tooling, mindshare decline followed. The tools were also priced per-seat at enterprise rates, which selected for exactly the buyers (large process-heavy organizations) least able to make the practice succeed. *Our counter-position is structural: the construction file is plain JSON/YAML in the user's git repo, the schema is Zod in the user's codebase, and the generated artifact is ordinary React that survives ejection (doc 04's "degrades gracefully"). Anything we add that weakens those three properties re-creates the lock-in.*

**(f) "Platform independence" was a malapropism.** MDA's headline benefit — model once, target any platform — was, in Fowler's words, a [PlatformIndependentMalapropism](https://martinfowler.com/bliki/PlatformIndependentMalapropism.html): you don't escape platform commitment, you transfer it to the modeling tool, which is itself a platform (and a smaller, riskier one than Java or .NET). Almost nobody actually retargeted a PIM to a second platform. *Watch for the same self-deception in our story: "the construction file is framework-independent, we could target Vue later" is a claim we should not spend a single design decision on until a real second target exists. Mitosis (doc 04) shows multi-target JSON-IR is possible, but for prototypes-in-one-design-system it is speculative generality.*

**(g) Cultural rejection: developers experienced it as ceremony.** Alex Bell's ["Death by UML Fever"](https://queue.acm.org/detail.cfm?id=984495) (ACM Queue, 2004, written from inside Boeing) catalogs the pathologies: modeling for modeling's sake, diagrams produced to satisfy process gates rather than to build anything, and organizational inability to self-diagnose. MDA adoption was frequently management-driven — bought at the executive level, imposed on developers who could see it slowed them down. The tools inserted a compile-the-model step between intent and running software, destroying the tight edit-run loop developers already had. *Our user is a designer, not a resisting developer, and the loop (edit patch → rebuild → preview) must be seconds, not minutes — see §6. But the deeper warning stands: if using the construction file feels slower than "just ask the agent to edit the code," users will route around it, and they'll be right to. That's exactly what experiment E0/E1 is designed to test.*

**(h) The economic substrate shifted.** Wayne's closing thesis: CASE/UML tooling was built for and sold to 1990s enterprise IT — big organizations, long projects, waterfall governance. The industry's center of gravity moved to product companies and startups that were never the CASE vendors' market, and agile made the heavyweight up-front model a liability. The practice didn't lose an argument; its buyer disappeared. *Worth remembering when sizing our bet: the buyer for construction-file prototyping is the AI-assisted designer, a buyer that barely existed three years ago. New-buyer markets are where new toolchains win — it's the same dynamic that let low-code succeed with "citizen developers" (§5).*

### 2.3 What executable UML's survival proves

Executable UML did not vanish — it survived in telecom, aerospace, and embedded control systems (xtUML/BridgePoint lineage), exactly the domains where behavior is state-machine-shaped, requirements are long-lived, and certification rewards a formal model. That is the pattern to internalize: **model-driven approaches survive precisely where the domain semantics genuinely match the modeling formalism.** State machines model telecom protocols well, so modeling them works. UML class diagrams do not model "an enterprise application" well, so MDA failed. The question for us — held until §7 — is whether "screens composed from one design system's patterns" matches a JSON component tree as well as protocols match state machines. (Spoiler: it's one of the best matches available, because the design system itself *is* the metamodel, discovered from real usage rather than invented by a standards committee.)

---

## 3. What survived: DSL workbenches and projectional editing

When MDA collapsed, the serious practitioners didn't abandon models — they abandoned *universality*. The surviving school, led by people like Markus Voelter, rebuilt the idea as **domain-specific languages**: small languages with precise semantics for narrow domains, built inside "language workbenches" ([Fowler's 2005 essay](https://martinfowler.com/bliki/LanguageWorkbench.html) named the category).

### 3.1 JetBrains MPS and projectional editing

[MPS](https://www.jetbrains.com/mps/) is the most radical workbench: a **projectional editor**. There is no parser and no source text — the user edits the AST directly, and what's on screen is a *projection* of the tree (textual, tabular, graphical, mathematical). See Fowler's [ProjectionalEditing](https://martinfowler.com/bliki/ProjectionalEditing.html). This matters to us for a precise reason: **projectional editing is the other honest solution to the round-trip problem.** If users only ever manipulate the model through projections, there is no second artifact to drift — parsing, grammar ambiguity, and reverse engineering are eliminated *by construction*, and languages compose without grammar conflicts. It's the intellectually complete version of what Puck/Plasmic-style visual editors do for UI (the editor manipulates the JSON model directly; code is a projection).

The definitive field report is [Voelter et al., "Lessons learned from developing mbeddr"](https://voelter.de/data/pub/voelterEtAl2017-buildingMbeddr.pdf) (SoSyM 2019) — 10 person-years building 81 composable languages (34 C extensions) for embedded development on MPS, used in real industrial projects. Verdict, compressed:

- **The core idea worked.** Modular language extension at scale is real; mixed notations (text + tables + math + diagrams) worked; analyses (model checking, verification) integrated cleanly. The 80% problem is genuinely solvable when the base language (C) is *inside* the model and extensions compose onto it — mbeddr's escape hatch was "just write C," seamlessly, in place.
- **Editor friction never fully went away.** Projectional editing "feels almost textual," but selection, copy-paste, and cursor behavior differ from text in ways that continually tax users. Adoption required training and tolerance.
- **Infrastructure isolation was the tax.** No plain-text files means git diff/merge needs MPS-aware tooling; CI, code review, grep, and every other text-native tool needs adapters. mbeddr had to build and maintain that bridge itself.
- **Total platform lock-in.** Everything lives in MPS's persistence format; if MPS goes away or breaks compatibility, the investment is stranded.

The net: projectional editing solves drift by making the model the *only* artifact — and pays for it by exiting the entire text-tool ecosystem. **Our architecture takes the opposite deal deliberately** (construction file is plain text in git; generated code is ordinary React), which means we keep the ecosystem and must therefore manage drift explicitly. There is no third option; MDA's fatal pretense was claiming both.

### 3.2 Textual workbenches: Xtext, Spoofax, Langium

The textual workbenches — [Xtext](https://eclipse.dev/Xtext/) (Eclipse/EMF-based, the industrial workhorse), [Spoofax](https://dl.acm.org/doi/10.1145/1932682.1869497) (declarative language definitions), and [Langium](https://langium.org/) (Xtext's spiritual successor on TypeScript + Language Server Protocol) — kept plain text and got the IDE experience via generated tooling. Where they won tells us where DSLs actually pay: [a decade of Spoofax DSLs at Oracle for graph analytics](https://www.sciencedirect.com/science/article/abs/pii/S0167642325001169); Xtext DSLs across automotive, finance, and insurance; internal configuration and domain languages everywhere. The [language workbench comparison literature](https://homepages.cwi.nl/~storm/publications/lwc13-comlan.pdf) and Meinte Boersma's honest ["Are language workbenches dead?"](https://medium.com/@dslmeinte/are-language-workbenches-dead-4b05d1698d3c) ("they aren't dead, they just smell funny") converge on the same adoption post-mortem: workbenches thrive in **well-bounded technical domains with a dedicated language-owning team**, and stall in the mainstream because (1) building a good DSL requires rare language-engineering skill, (2) most projects can justify only one or two small DSLs — too little to amortize the tooling, and (3) workbenches historically demanded their own IDE world instead of integrating into existing workflows (LSP is fixing this; Langium exists because of it).

Two of those three adoption blockers are precisely what an LLM changes for us: the construction-file "language" is defined by schema (Zod) rather than grammar engineering, and the "editor" for it is the model itself — the designer never types construction-file syntax. The third blocker (integrate into existing workflows) remains fully our problem: git, React, Vite, agent skills — never a new IDE. Boersma's growth prediction — workbench-like power reaching mainstream tools — arguably arrived as "JSON schema + LLM + agent tooling," i.e., the stack we're using.

### 3.3 Voelter's distilled best practices (the ones that transfer)

From the [MD*/DSL best-practices corpus](https://voelter.de/data/pub/DSLBestPractices-2011Update.pdf) and the [MDSD book](https://voelter.de/data/books/mdsd-en.pdf), the rules that map directly onto our stages:

- **Derive the language from the domain, not from a universal metamodel** — build the DSL from *existing exemplars* (for us: the catalog is generated from the real component source, doc 01; never hand-invent primitives the design system doesn't have).
- **Viewpoints**: separate concerns into separate model files with defined dependencies (our intent.yaml vs construction file vs fixtures split).
- **Never modify generated code**; design the generated/handwritten interface deliberately (→ §4).
- **Teams accept generated code they can read and would have written similarly** — generate idiomatic code, not machine sludge (doc 04's templates-from-exemplar-screens; also exactly where OutSystems' detachment story falls down, §5).
- **Care about the whole lifecycle** — versioning the language itself, migrating existing models when the schema evolves. *This is a gap in docs 01–05: we version the catalog, but have no story yet for migrating existing construction files when a pattern's schema changes. Flagged in §9.*

---

## 4. EMF and Eclipse Modeling: the mature generated/handwritten split

The [Eclipse Modeling Framework](https://help.eclipse.org/latest/topic/org.eclipse.emf.doc/references/overview/EMF.html) is MDA's most successful open-source residue and the longest-running production system for exactly our "builder-owned vs human-owned" problem. From an **Ecore** metamodel (itself pragmatically small — EMF deliberately implemented the useful subset of MOF, an early domain-narrowing move), EMF generates Java model code, and its answer to hand-edits is instructive because it's the *in-file marker* approach at industrial maturity:

- Every generated method carries an `@generated` Javadoc tag. On regeneration, **JMerge** rewrites only elements still tagged `@generated`; delete the tag (or use `@generated NOT`) and the element becomes human-owned and is preserved.
- This works — EMF has run this loop for two decades — but the [community record](https://www.eclipse.org/forums/index.php/t/1086954/) and the [comparative literature on integrating handwritten and generated code](https://arxiv.org/pdf/1509.04498) document the chronic costs: ownership state is invisible metadata scattered through files; a colleague (or formatter, or refactoring tool) that touches a tag silently flips ownership; merges in generated files are noisy; and once many methods are de-tagged, regeneration confidence collapses — you're back to drift.
- The community's corrective was the **[generation gap pattern](https://en.wikipedia.org/wiki/Generation_gap_(pattern))** (Vlissides, 1996): put generated and handwritten code in *separate classes/files* (handwritten subclass extends generated base), so generated files are 100% clobberable and handwritten files are 100% safe — see [EMF Loophole](https://github.com/mbarbero/emf-loophole) and the [Xtext-era discussions](https://emfmodeling.blogspot.com/2011/10/generation-gap-pattern-vs-protected.html) that recommend generation gap over protected regions.

The 25-year arc of this subfield ends at a one-line conclusion: **ownership boundaries belong at file granularity, not marker granularity.** Protected regions and `@generated` tags are the tempting fine-grained option and they rot; whole-file ownership survives because it's enforceable by a hash and legible in a directory listing. This is direct historical validation of doc 05's choice (builder-owned files vs LLM-owned files, manifest hashes for clobber detection) — and a warning never to "improve" it with in-file protected regions later, no matter how convenient a `// KEEP` comment looks in the moment.

---

## 5. Low-code platforms: MDA's commercial descendants

### 5.1 Same technology, different packaging

Jordi Cabot's analysis ([Low-code vs model-driven: are they the same?](https://modeling-languages.com/low-code-vs-model-driven/); [MODELS 2020 positioning paper](https://modeling-languages.com/wp-content/uploads/2020/10/Models2020_LowCodeWorkshop-2.pdf)) makes the continuity explicit: "I haven't seen any notation, concept, model type or generation technique in a low-code tool that I couldn't find similarly in the model-driven world." OutSystems, Mendix, Appian, Retool, and Salesforce's platform are MDA machinery — metamodel, visual model, generator/interpreter — that succeeded commercially where MDA failed. Cabot's reasons why, plus the ones visible in the platforms themselves:

1. **Narrow domain.** Low-code targets *data-intensive CRUD web/mobile apps* — forms, tables, workflows, dashboards — not "software." The metamodel matches the domain, so the 80% is genuinely covered *for that domain* (see §7).
2. **They own the entire stack.** Model, editor, generator/interpreter, runtime, deployment, hosting — one vendor. There is no round-trip problem because there is no second surface: you *cannot* edit "the code" of a Mendix app outside Mendix. Drift is prevented the projectional way — by removing the other artifact.
3. **Instant feedback.** Change the model, click run, see the app in seconds. No compile-the-model ceremony (see §6).
4. **Positioning.** "Less code" spoke to a buyer with a developer shortage; "modeling" spoke to nobody (Cabot: "code is self-explanatory; model is ambiguous").
5. **The escape hatch is productized, not shameful.** Mendix Java/JavaScript actions, OutSystems C#/JS extensions, Retool JS transformers everywhere, Salesforce Apex/Lightning components — every surviving platform ships a first-class drop-to-code mechanism with a defined boundary, because they all know the 80% problem is undefeated even in a narrowed domain.

### 5.2 Where MDA's diseases still show through

The MDA failure modes didn't disappear in low-code; they moved to the edges, and each one is a preview of a wound we could re-open:

**Versioning and merging visual models is still the open wound.** The internal model formats were built for the runtime, not for humans in git. Mendix stores apps as a model file synced to git, but [diffs of its metadata are effectively unreadable and teams manage "merge-hell" by coordination](https://www.superblocks.com/blog/mendix-vs-outsystems) rather than tooling; classic OutSystems serialized to a binary `.oml` with single-publisher locking. [Retool's source control](https://retool.com/blog/git-branching-with-source-control) serializes each app to JSON/YAML in the repo and is the best of the breed — PRs show *mostly* human-readable diffs of app configuration — and even there, position coordinates, generated UUIDs, and serialization noise pollute reviews ([practitioner guides](https://retoolers.io/blog-posts/retool-source-control-explained-for-teams) recommend process discipline to compensate). Salesforce is the cautionary extreme: metadata as monolithic XML where two developers touching different fields of one object collide in one file, list-element ordering is non-deterministic between retrievals (spurious diffs), and an entire ecosystem of [structure-aware merge drivers](https://github.com/jayree/sfdx-md-merge-driver) and the [SFDX source-format decomposition](https://gearset.com/blog/salesforce-source-format-vs-metadata-format/) exists purely to make the model diffable. The pattern across all four: **any part of the model that is not stable, canonical, human-readable text in small files becomes a collaboration tax.** For us: canonical key ordering, id-keyed children (doc 05), no coordinates or derived state in the construction file, seeded/stable ids, pinned serialization — these aren't polish, they're the difference between reviewable PRs and Mendix-style merge-hell.

**Lock-in moved from tool to platform.** OutSystems [markets "no lock-in"](https://www.outsystems.com/evaluation-guide/standard-architecture-with-no-lock-in/) because it generates standard .NET; critics document that [code detachment is a paid, account-manager-mediated process and the detached code is not maintainable by normal standards](https://lowcode-experts.com/more-about-lowcode/what-is-outsystems-vendor-lock-in/) ([see also](https://novatasolutions.com.au/news-and-happenings/technical-articles/outsystems-vendor-lock-in)) — teams discover this *after* detaching. The honest metric is: **what do you hold the day you stop using the tool, and would you willingly maintain it?** Our doc-04 commitment (generated code is idiomatic React on the team's own design system, in the team's repo, buildable without us) is the strongest anti-lock-in position in this entire lineage — provided the generated code stays genuinely idiomatic, which is a template-quality bar to hold, not a property that comes free.

**The interpreter/codegen fork reappears here too.** Mendix runs an interpreter over the model at runtime; OutSystems compiles to .NET/React; Retool interprets the JSON at render time. Interpreters give the platforms their live-editing speed and total consistency (and deepen lock-in — no artifact exists without the vendor runtime); codegen gives ejectability. That the *commercial* platforms chose interpretation for iteration and offer compilation only as an exit ramp supports doc 04's hybrid staging (interpret while iterating, compile on graduation) — with the caveat that we must keep the exit ramp free and always-on, which is exactly what they didn't.

### 5.3 The verdict on low-code

Low-code proves the core bet of our architecture is commercially and technically viable: *a constrained model plus a deterministic expander beats hand-coding inside a well-chosen domain.* It also proves the costs never go away — they concentrate at four boundaries: model↔git (diffing/merging), model↔code (escape hatch), platform↔exit (lock-in), and domain↔reality (the edges of the metamodel). A design is judged by what happens at those four boundaries. Ours answers, respectively: canonical text in the user's repo; CustomBlock + LLM-owned files with telemetry; idiomatic ejectable codegen; and the >60–70% coverage threshold with routing away from the tool below it (doc 00). Those answers are right on paper; every platform in this section also had right-on-paper answers until usage pressure found the gaps.

---

## 6. Spreadsheets and illustrative programming

The most successful model-driven system in history was not built by the OMG: it's the spreadsheet — hundreds of millions of users maintaining live computational models. Fowler's [IllustrativeProgramming](https://martinfowler.com/bliki/IllustrativeProgramming.html) names the property that makes it work: the user primarily sees **the evaluated result** (the numbers), not the program (the formulas). The example execution *is* the editing surface; every edit re-illustrates instantly.

Decomposed, the spreadsheet's winning properties — and their status in our pipeline:

| Spreadsheet property | Why it matters | Our status |
|---|---|---|
| **The model is the artifact** — nothing is generated, so nothing can drift | Eliminates rounds-trip/drift entirely | Not ours — we generate code. Drift management (manifest + re-adopt) is the price of ejectability |
| **Instant, always-on feedback** — no compile step, no run button | Errors surface at the moment of the edit that caused them; users build a causal mental model | Must-have: the patch→build→preview loop needs to feel continuous (seconds). This is also doc 04's argument for the runtime-interpreter stage |
| **Concrete data in the foreground** — you program against real-looking values, not abstractions | Non-programmers can operate it; mistakes are visible as wrong *content*, not stack traces | Directly mirrored: doc 02's sample-data-as-fixture means the preview always renders realistic content; the designer judges the illustration, not the model |
| **Incremental, local edits** — change one cell, one formula | Low blast radius per action | Mirrored in JSON Patch iteration (doc 05) |
| **No new-language ceremony** — formulas are learned one cell at a time | Adoption without training | For us, the LLM absorbs the language entirely; the designer speaks intent |

And its two chronic diseases, per Fowler, which are ours to dodge: **structure rot** (illustration-first environments breed uncontrolled copy-paste and tangled dependencies, because the medium never pushes back on structure — the design system's constraints and the schema's slot/nesting lint are our pushback, and they must stay strict precisely *because* the feedback loop is permissive) and **weak custom abstraction** (spreadsheets can't grow new abstractions cleanly; our equivalent failure would be a frozen pattern catalog — hence doc 01's telemetry loop where recurring CustomBlock islands are promoted into new patterns).

The strategic reading: MDA optimized for *model correctness ceremony* and died; spreadsheets optimized for *feedback immediacy* and conquered the world. When any design decision trades preview latency for validation thoroughness, the historical record says: take the latency win, run the validation asynchronously (doc 05's hooks: validate → build → screenshot → a11y as a post-edit gate, not a pre-edit ceremony).

---

## 7. The domain-narrowness thesis

Arrange the whole lineage on one axis — breadth of the domain the model claims to cover:

```
UNIVERSAL ──────────────────────────────────────────────────────── NARROW
MDA/UML          EMF-based       low-code CRUD      xtUML in      spreadsheets   config
"all software"   in-house DSLs   (OutSystems,       telecom/      "grid-shaped   DSLs
                 (one domain     Mendix, Retool)    embedded      calculation"
     ✗ died      per DSL)  ✓         ✓ thriving     ✓ niche       ✓ conquered    ✓
```

The correlation is almost embarrassingly clean: **every survivor narrowed the domain until the metamodel could genuinely cover its 80%, and every casualty claimed universality.** Voelter's DSL school made narrowness the explicit methodology; low-code made it the business model; executable UML survived only in the niche its formalism actually fit.

So is "UI prototypes within one design system" narrow enough? The honest case, both directions:

**Arguments that we're on the narrow (winning) end:**

1. **The metamodel is discovered, not invented.** MDA's metamodel was a committee's guess at all software. Ours is extracted from a production design system — components, variants, tokens that already describe this team's real screens (doc 01's generated catalog). A design system *is* a domain model of the org's UI, pre-validated by every shipped screen. This is the single strongest narrowness argument: the hard part of DSL engineering (finding the right abstractions) was already paid for by the design-system team.
2. **Prototype semantics slash the hard 20%.** The classically ungeneratable residue — real integrations, auth, performance, edge-case business logic — is *out of scope by definition* for a prototype with seeded fake data. Our 20% is only novel visuals and bespoke interactions, and those have a designed home (CustomBlock, LLM-owned files).
3. **Composition is closed.** Screens are trees of pattern instances with token-constrained styling — a domain where a JSON tree isn't an approximation of the artifact but literally its shape (which is why the entire modern SDUI industry independently converged on it — doc 00).
4. **Failure is cheap and visible.** MDA failures were discovered in year two of an enterprise program. A bad generated prototype is discovered in the preview, thirty seconds in, and regenerating costs ~2K tokens. Low stakes per artifact is itself a form of domain narrowing — it caps the cost of every abstraction leak.

**Arguments that we're wider than we look:**

1. **"Within one design system" is doing heroic work.** The claim holds only for teams whose design system is mature and whose screens mostly instantiate it. Doc 00's own caveat — below 60–70% pattern coverage the escape hatch dominates — *is* the domain-narrowness thesis stated quantitatively, and coverage is an empirical property of each team, not of our architecture. For an early-stage product exploring novel UI, we are MDA: a model language that can't say what the user means.
2. **Prototype iteration is divergent by nature.** Low-code CRUD converges on known shapes; design exploration deliberately seeks off-catalog territory ("what if this was a completely different layout?"). The domain is narrow per screen but the *trajectory* of a design session tests the boundary constantly. E6 (escape-hatch pressure) measures exactly this.
3. **Interaction and motion are inside user expectations but outside the tree.** A JSON tree of pattern refs captures structure; prototype-feel (gestures, transitions, scroll behavior) lives awkwardly in it. That's a known thin edge of the metamodel (doc 00 routes motion-heavy work away), but users won't always pre-sort their requests.

Net honest position: the domain is narrow enough *conditionally* — conditional on catalog coverage above the threshold, and that condition varies per team and per project phase. Which means the architecture must ship with its own domain-fit detector (coverage telemetry, CustomBlock rate) and a graceful "this project isn't a fit, use the plain agent path" answer. MDA never said "don't use MDA for this"; being able to say it is our structural advantage. The experiments (E0/E1/E6) are the domain-narrowness thesis operationalized — that's the falsifiability MDA never subjected itself to.

---

## 8. Lessons for construction-file prototyping

The distilled rules, each with its historical warrant and its binding on our design:

**L1 — Never promise round-trip. One-way generation + explicit re-adopt.**
Warrant: every bidirectional-sync system in this lineage failed to deliver it (Rational-era blueprint tools, §2.2c; Hailpern & Tarr's consistency-burden analysis); the survivors are all one-way (EMF, low-code compilers) or single-artifact (MPS, spreadsheets). Binding: doc 05's choice is correct and *load-bearing* — no future feature may quietly assume code→model parsing. Drift is the normal state to be detected (manifest hashes) and reconciled (model-assisted re-adopt), never silently "synced."

**L2 — Keep the abstraction shallow: the construction file describes component instances, not a meta-meta-model.**
Warrant: MDA's tower (MOF → UML → profile → PIM → PSM → code) leaked at every floor, and users had to understand *all* floors to debug (§2.2a,g). EMF's success came from implementing the pragmatic subset of MOF; low-code models are one thin layer above the runtime widgets. Binding: exactly two levels (patterns ⊃ primitives, doc 01), fields named after props designers already know, no transformation pipeline stages between file and code. If explaining an output ever requires explaining a model *of* the model, we've rebuilt the tower. A designer should be able to read a construction file and predict the screen.

**L3 — The 80% problem is undefeated; budget the whole design around the escape hatch.**
Warrant: 60–80% generation coverage was the ceiling across 25 years (§2.2b), and every surviving platform ships productized drop-to-code (§5.1). Binding: CustomBlock and LLM-owned files aren't edge-case handling, they're a co-equal half of the system — ergonomics of the hatch (how gracefully the model uses it, how visibly it's reported, how island-to-pattern promotion works) deserve as much design and testing (E6) as the happy path. A tool that shames or buries its escape hatch trains users to abandon the tool at the first off-catalog request.

**L4 — Instant feedback beats correctness ceremony.**
Warrant: the ceremony pole of this lineage (MDA) died; the feedback pole (spreadsheets, low-code live preview) won (§6). Binding: the edit→preview loop is the sacred budget — target seconds; run validation as post-edit gates, not pre-edit ceremony; prefer the interpreter path for live iteration if codegen latency ever threatens the loop (doc 04's hybrid). Every proposed pipeline stage must answer "what does this add to loop latency?"

**L5 — The model must be canonical, diffable text in the user's git, or collaboration dies.**
Warrant: UML had no textual form and incompatible XMI — lock-in and rot (§2.2e); MPS paid a decade of custom diff/merge infrastructure (§3.1); Mendix merge-hell, Salesforce's merge-driver ecosystem, Retool's serialization noise (§5.2). Binding: canonical serialization (pinned key order, stable seeded ids, no derived/positional state in the file), small files (per-screen, mirroring SFDX's decomposition lesson), id-keyed children, and a hard rule that a construction-file PR diff must be reviewable by a human without tooling. This is a test to write, not a hope to hold.

**L6 — Ejection must be free, immediate, and produce code the team would willingly maintain.**
Warrant: "no lock-in" claims decided by detachment reality (OutSystems' paid, cumbersome, unidiomatic detachment, §5.2); Voelter's rule that teams accept generated code they'd have written themselves (§3.3). Binding: generated output is idiomatic React on the team's own design system in the team's own repo at all times — not on demand. The test: delete the builder and the schema from a project, and what remains is a normal codebase mid-feature, not a crime scene. Template quality is a permanent bar, not launch polish.

**L7 — Ownership boundaries at file granularity; never in-file markers.**
Warrant: EMF's `@generated`/JMerge is the marker approach at maximum maturity and it still rots (invisible ownership state, silent flips, collapse of regeneration confidence); its own community converged on generation-gap file separation (§4). Binding: doc 05's builder-owned/LLM-owned file split is historically vindicated; resist every future convenience argument for `// KEEP` regions inside generated files.

**L8 — Integrate into the existing toolchain; never require a new world.**
Warrant: CASE tools and workbenches demanded their own IDE-world and stalled (§2.2e, §3.2); the workbench field's own survivors invested in Eclipse/LSP/git integration; low-code's web-based zero-install onboarding was half its victory (§5.1). Binding: our delivery form is an agent skill plus scripts in a normal repo with git, Vite, and the team's existing framework — the user's environment, not ours. Any feature that requires a bespoke editor should be treated as a red flag.

**L9 — Version the language; plan model migration from day one.**
Warrant: Voelter's lifecycle warning (§3.3); schema evolution stranded models in every long-lived MDE deployment; design systems change monthly. Binding: this is our *known gap* — the catalog is versioned (doc 01) but there's no construction-file migration story when a pattern's schema changes. Minimum viable answer: schema version stamped in every construction file + a model-assisted migration step (same machinery as re-adopt). Needs a design pass.

**L10 — Stay falsifiable.**
Warrant: CASE and MDA ran for decades on asserted productivity multipliers that were never benchmarked against the boring alternative (§2.2a); the practitioners who noticed (Fowler) were right early. Binding: E0 — the plain agent-edits-code baseline — is the most important experiment in the roadmap, and the kill criteria in doc 00 (beat E0 on tokens + violations or stop) are the discipline MDA never had. Protect them from erosion.

---

## 9. Open questions: what does LLM-in-the-loop actually change?

Our architecture is not MDA-with-better-marketing; it has one genuinely new element the entire 25-year record lacked: a general-purpose model that reads and writes both the modeling language and the target language fluently. Which historical failure modes does that fix, and which does it worsen?

**Plausibly fixed:**

- **The model-authoring bottleneck.** The quiet killer of MDA and workbenches alike: humans found authoring models slower and less pleasant than writing code (§2.2a,g), and DSL construction required rare skills (§3.2). In our loop *no human ever authors or reads the construction file under duress* — the LLM writes it from intent, the designer judges the rendered illustration (§6). The abstraction's ergonomic cost, historically the decisive cost, is paid by the machine. This is the single strongest reason to believe the old post-mortems don't simply apply verbatim.
- **The rigidity of transformations.** MDA transformations were brittle programs; when the model was slightly off, generation failed opaquely. Our generation step is a *repair loop* (doc 03): schema errors and lint findings go back to a model that can actually understand and fix them.
- **Reverse engineering, cheaply and honestly.** Full code→model parsing was impossible (§2.2c), but an LLM can do *assisted, human-confirmed* re-adoption of drifted code at useful quality — not a guarantee, but an affordance no MDA tool had. Open question: what's the real-world success rate of re-adopt on organically drifted prototypes? (Extend E5 to measure it.)
- **Domain-fit detection.** MDA couldn't tell you it was the wrong tool. An LLM can notice "this request is mostly off-catalog" and route to the plain-code path (doc 00, decision 6) — if we design that self-limiting behavior in deliberately. Open question: will it actually route out, or gamely emit garbage CustomBlocks? (E6.)

**Plausibly worsened or newly created:**

- **Drift becomes easier than ever.** The same agent that writes construction files can — and in any mixed session, will — edit the generated React directly, because that's its strongest prior. MDA's drift required a human choosing to bypass the model; ours requires only a moment of the model following its training distribution. The manifest gate and skill instructions must actively fence this, and E5's drift count is the metric to watch.
- **Schema-conformance is not semantic correctness.** Constrained decoding makes invalid files impossible (doc 03) — a real advance — but it also *launders* misunderstanding into perfectly valid, wrong models. MDA's failures were at least loudly broken; ours will be quietly plausible. The illustration-first loop (§6) is the countermeasure: wrongness must be visible in the preview within seconds.
- **Two languages in one context.** The model knows React far better than it knows our construction-file dialect (thin pretraining distribution — the classic DSL problem in new form). Few-shot examples carry the load (doc 02); open question: how stable is dialect quality as sessions lengthen and context rots, and does patch-based iteration (tiny emissions) mitigate or mask it?
- **The catalog treadmill gains a consumer.** Historically, stale metamodels degraded slowly as humans routed around them. An LLM consumes the catalog literally and at scale — staleness converts instantly into confidently wrong output. Catalog generation from source (doc 01) must be continuous, not periodic.
- **Nondeterminism enters the toolchain.** MDA's transformations were at least deterministic; our generator is stochastic upstream of a deterministic builder. The architecture contains this correctly (all nondeterminism upstream of the schema gate), but iteration reproducibility ("same patch request, different patch") is a new UX question with no historical precedent to consult.

**The question the history can't answer:** every failed system in this lineage was judged against *humans writing code by hand*. Ours will be judged against *an LLM writing code directly* — a baseline that is itself excellent and improving monthly. The 25-year record says constrained models beat unconstrained authoring inside narrow domains; it says nothing about whether that holds when the unconstrained author is also a machine with the full design system in context. That is precisely E0 vs E1, and it is genuinely open.

---

## 10. Sources

**MDA/UML post-mortems**
- Fowler, [ModelDrivenArchitecture](https://martinfowler.com/bliki/ModelDrivenArchitecture.html) · [UmlAsProgrammingLanguage](https://martinfowler.com/bliki/UmlAsProgrammingLanguage.html) · [UmlMode](https://martinfowler.com/bliki/UmlMode.html) · [PlatformIndependentMalapropism](https://martinfowler.com/bliki/PlatformIndependentMalapropism.html) · [ModelDrivenSoftwareDevelopment](https://martinfowler.com/bliki/ModelDrivenSoftwareDevelopment.html) · [UnwantedModelingLanguage](https://martinfowler.com/bliki/UnwantedModelingLanguage.html)
- Hillel Wayne, [Why UML "Really" Died](https://buttondown.com/hillelwayne/archive/why-uml-really-died/) (+ [HN discussion](https://news.ycombinator.com/item?id=26956298), [Garbarino's "Has UML died without anyone noticing?" thread](https://news.ycombinator.com/item?id=26934577))
- Bell, [Death by UML Fever](https://queue.acm.org/detail.cfm?id=984495), ACM Queue 2004
- Hailpern & Tarr, [Model-driven development: the good, the bad, and the ugly](https://dl.acm.org/doi/10.1147/sj.453.0451), IBM Systems Journal 2006
- OMG, [MDA](https://www.omg.org/mda/) · [Methods & Tools, Understanding MDA](https://www.methodsandtools.com/archive/archive.php?id=5)

**DSL workbenches**
- Voelter et al., [Lessons learned from developing mbeddr](https://voelter.de/data/pub/voelterEtAl2017-buildingMbeddr.pdf), SoSyM 2019
- Voelter, [MD*/DSL Best Practices (2011 update)](https://voelter.de/data/pub/DSLBestPractices-2011Update.pdf) · [Best Practices for DSLs and MDD](https://www.jot.fm/issues/issue_2009_09/column6.pdf), JOT 2009 · [MDSD book](https://voelter.de/data/books/mdsd-en.pdf)
- Fowler, [LanguageWorkbench](https://martinfowler.com/bliki/LanguageWorkbench.html) · [ProjectionalEditing](https://martinfowler.com/bliki/ProjectionalEditing.html) · [IllustrativeProgramming](https://martinfowler.com/bliki/IllustrativeProgramming.html)
- Erdweg et al., [Evaluating and Comparing Language Workbenches](https://homepages.cwi.nl/~storm/publications/lwc13-comlan.pdf), COMLAN 2015
- Boersma, [Are language workbenches dead?](https://medium.com/@dslmeinte/are-language-workbenches-dead-4b05d1698d3c)
- [Spoofax at Oracle: a decade of DSLs for graph analytics](https://www.sciencedirect.com/science/article/abs/pii/S0167642325001169), SCP 2025 · [Spoofax](https://dl.acm.org/doi/10.1145/1932682.1869497), OOPSLA 2010

**EMF / generated-code integration**
- [EMF overview](https://help.eclipse.org/latest/topic/org.eclipse.emf.doc/references/overview/EMF.html) · [Generation gap pattern](https://en.wikipedia.org/wiki/Generation_gap_(pattern)) · [EMF Loophole](https://github.com/mbarbero/emf-loophole) · [Generation gap vs protected regions in Xtext MDD](https://emfmodeling.blogspot.com/2011/10/generation-gap-pattern-vs-protected.html)
- Greifenberg et al., [A Comparison of Mechanisms for Integrating Handwritten and Generated Code](https://arxiv.org/pdf/1509.04498)

**Low-code**
- Cabot, [Low-code vs model-driven: are they the same?](https://modeling-languages.com/low-code-vs-model-driven/) · [Positioning of the low-code movement within MDE](https://modeling-languages.com/wp-content/uploads/2020/10/Models2020_LowCodeWorkshop-2.pdf), MODELS 2020
- [Retool: Introducing Source Control](https://retool.com/blog/git-branching-with-source-control) · [Retool source-control best practices](https://docs.retool.com/education/coe/customer-resources/source-control) · [Retoolers: source control explained](https://retoolers.io/blog-posts/retool-source-control-explained-for-teams)
- [Mendix vs OutSystems (version control comparison)](https://www.superblocks.com/blog/mendix-vs-outsystems)
- [OutSystems "no lock-in" architecture claim](https://www.outsystems.com/evaluation-guide/standard-architecture-with-no-lock-in/) · critiques: [lowcode-experts](https://lowcode-experts.com/more-about-lowcode/what-is-outsystems-vendor-lock-in/), [Novata](https://novatasolutions.com.au/news-and-happenings/technical-articles/outsystems-vendor-lock-in)
- Salesforce metadata diff/merge: [Gearset, source format vs metadata format](https://gearset.com/blog/salesforce-source-format-vs-metadata-format/) · [sfdx-md-merge-driver](https://github.com/jayree/sfdx-md-merge-driver) · [sf-git-merge-driver](https://github.com/scolladon/sf-git-merge-driver)

---

*Previous: [05 — Surgical Editing & Iteration](05-surgical-editing-iteration.md) · Series index: [00 — Architecture Synthesis](00-architecture-synthesis.md)*
