# Community Practice Outside X, and the Tooling That Actually Ships — what people do when "it's built, I iterated, I tested, x was missed"

**Scope:** Document 06 of the iteration-repair-and-rubrics stream. It answers two joined questions: (a) *outside X/Twitter*, where do practitioners actually discuss the generate → iterate → test → find a miss → patch loop, and what do they say; and (b) *what tooling exists today, September 2026*, to support each step of that loop — spec/plan-first tools, rules and memory files, review agents, browser and visual self-correction, eval and rubric harnesses, and regression safety nets — verified live, with stars, licences, prices and dates. It closes with the honest gap list (which parts of the loop have no product) and the measured adoption picture (what practitioners use versus what gets written about).

**Explicitly out of scope, with owners:** X/Twitter as a venue — [doc 05](05-x-twitter-practice.md). The taxonomy of what gets missed — [doc 01](01-miss-taxonomy.md). Repair decision theory (patch vs. regenerate vs. revert) — [doc 02](02-repair-decision-theory.md). How a rubric line is constructed from a miss — [doc 03](03-rubric-construction.md).

**Builds on, does not repeat:** the altitude ladder for fixes and the rule-volume evidence in [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); deterministic graders, the VLM-judge bias table and the grade record in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md); the loop and maturity model in [eval-tuning-loops/00](../eval-tuning-loops/00-synthesis.md); surgical patching of construction files in [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md); feedback surfaces on non-Figma prototypes in [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md); the 12-rung guardrail ladder in [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md); in-page grading controls in [prototype-review-overlay/03](../prototype-review-overlay/03-grading-controls-and-feedback-to-tuning.md).

**Research conducted 12 September 2026.** Read the Verification constraints section immediately below before trusting any figure in this document: this session could reach GitHub but almost nothing else, and the evidence grade is therefore uneven by section and is labelled per claim.

---

## Verification constraints

**What was reachable.** `github.com`, `raw.githubusercontent.com`, `gist.github.com` and `code.claude.com`. Repository pages, READMEs, issues, discussions, the GitHub API (stars, forks, licence, created/pushed dates) and GitHub code search were all queried live today, as was the full Claude Code documentation set.

**What was blocked.** The egress proxy refused CONNECT (403) for every other host tested, including: `reddit.com` / `old.reddit.com`, `news.ycombinator.com`, `hn.algolia.com`, `arxiv.org`, `survey.stackoverflow.co`, `stackoverflow.blog`, `dora.dev`, `jetbrains.com`, `anthropic.com`, `claude.com`, `agents.md`, `playwright.dev`, `storybook.js.org`, `chromatic.com`, `argos-ci.com`, `browserstack.com`, `coderabbit.ai`, `greptile.com`, `cursor.com`, `docs.cursor.com`, `forum.cursor.com`, `kiro.dev`, `tessl.io`, `promptfoo.dev`, `braintrust.dev`, `dev.to`, `infoq.com`, `vercel.com`, `developer.chrome.com`, `github.blog`, `docs.github.com`, `github.github.io`. `curl` from the shell was refused for the same hosts; no route around the policy was attempted.

**Label key, used on every claim below.**

| Label | Meaning |
|---|---|
| *(unlabelled, with a github.com / raw.githubusercontent.com / code.claude.com link)* | **Fetched and read today.** Repo metadata, README text, issue and discussion contents, and documentation quotes in §4–§9 are all of this kind. |
| `[search summary]` | A web-search result surfaced the title, URL and an index-derived summary. **The page did not load and the claim was not verified.** Names and numbers are reproduced so a later pass can check them; none of them should be treated as established. |
| `[pricing unverified — vendor site blocked from this session]` | A closed product whose pricing page could not be read. No price is stated. |

**What this costs the document.** §1–§3 (community practice, published team workflows) and §11 (adoption surveys) are the weakest sections, because their natural sources — Reddit, Hacker News, survey microsites, engineering blogs — were all blocked; they lean on GitHub discussions and issues, which *were* reachable and which turned out to carry the single best thread on this stream's question (§2.1). §4–§9 (the tooling survey) are strong: nearly every row is a live GitHub read.

**Rows a future, wider-egress session should harden.** (1) Every price in the tooling table — all closed-vendor pricing is currently omitted, not estimated. (2) The Kiro and Tessl rows, which rest entirely on secondary summaries. (3) The AI-code-review benchmark numbers in §6.3, which contradict each other across sources. (4) Every survey figure in §11 — the exact report and year is named on each so it can be looked up directly. (5) The *Instruction Stacking Collapse* result in §5.3, whose abstract was not read. (6) The CodeRabbit, Greptile and Cursor Bugbot product descriptions, which are category-level only.

## Table of Contents

1. [The venue map outside X — and what is actually fetchable](#1-the-venue-map-outside-x--and-what-is-actually-fetchable)
2. [What practitioners say: the repair loop in the wild](#2-what-practitioners-say-the-repair-loop-in-the-wild)
3. [Published team workflows: separating marketing from method](#3-published-team-workflows-separating-marketing-from-method)
4. [Spec- and plan-first tooling](#4-spec--and-plan-first-tooling)
5. [Rules and memory files — and the evidence they are followed](#5-rules-and-memory-files--and-the-evidence-they-are-followed)
6. [Review agents and code-review bots](#6-review-agents-and-code-review-bots)
7. [Browser and visual self-correction loops](#7-browser-and-visual-self-correction-loops)
8. [Eval and rubric tooling for a one-designer team](#8-eval-and-rubric-tooling-for-a-one-designer-team)
9. [Regression safety nets](#9-regression-safety-nets)
10. [What the tooling still does not do](#10-what-the-tooling-still-does-not-do)
11. [Adoption reality: measured numbers](#11-adoption-reality-measured-numbers)
12. [Cross-cutting themes](#cross-cutting-themes)
13. [Recommendations: the one-designer repair stack](#recommendations-the-one-designer-repair-stack)
14. [The tooling table](#the-tooling-table)
15. [Gaps with no product](#gaps-with-no-product)
16. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
17. [Sources](#sources)

---

## 1. The venue map outside X — and what is actually fetchable

**What it is:** An inventory of where the "I iterated, I tested, x was missed" conversation happens when it is not happening on X, ranked by whether a claim made there can be *cited and re-checked* by a reader a year from now.

**Why it matters:** Doc 05 covers X because that is where the audience is. But X threads decay, get deleted, and cannot be diffed. The venues below differ enormously in citability, and that difference should drive how much weight this stream puts on each. A GitHub discussion has a stable URL, a reply count, named participants and an edit history; a Reddit thread has a stable URL but is routinely deleted by its author; a YouTube workflow video has no transcript-level anchor; a newsletter is a paywalled snapshot.

**Key findings:**

| Venue | Citability | What it carries for this question | Fetchable in this session |
|---|---|---|---|
| **GitHub Discussions on the tools themselves** (`github/spec-kit`, `bmad-code-org/BMAD-METHOD`, `anthropics/claude-code`) | Highest — stable URLs, reply counts, named authors, maintainer responses | The most substantive practitioner argument found anywhere outside X: *what happens to the spec/rule when implementation reveals a miss* | **Yes — fetched** |
| **GitHub Issues on agent CLIs** | High | A running, timestamped log of the failure classes people actually hit ("rules ignored", "bypasses workflow gates") | **Yes — fetched** |
| **GitHub code search** | Highest — a count, not an opinion | Adoption of rule/memory/review conventions, measured as file counts | **Yes — queried today** |
| **Vendor engineering docs** (code.claude.com) | High — versioned, dated | The only place a vendor states its own adherence limits in numbers | **Yes — fetched** |
| Reddit (r/ClaudeAI, r/cursor, r/ExperiencedDevs, r/webdev, design subs) | Medium — deletion-prone | Volume of anecdote; the "it ignores CLAUDE.md by the fifth turn" genre | **No — blocked** |
| Hacker News | Medium-high | The sharpest sceptical argument about spec-driven development | **No — blocked** |
| Engineering blogs / newsletters / DEV.to | Low-medium — often vendor-adjacent content marketing | Benchmarks of review bots; "we ran four in parallel" posts | **No — blocked** |
| Conference talks / YouTube workflow channels | Low — no anchorable claim | Demonstration of the visual feedback loop | **No — not attempted** |
| Discord/Slack communities that publish | Low — most do not publish | — | **No** |

The honest consequence: **this document's section 1–3 evidence is thinner than its section 4–9 evidence, and the asymmetry is a property of the network, not of the subject.** Where a Reddit or HN thread is named below, it is named because a search result surfaced its title and URL; the thread body was not read.

**Open questions:** Whether the GitHub-Discussions-as-primary-venue pattern is an artifact of what I could reach, or a real shift — agent tooling is distributed on GitHub, so its users argue where the code is. Doc 05's X evidence is the control: if the same arguments appear in both venues, the sampling bias is mild.

---

## 2. What practitioners say: the repair loop in the wild

**What it is:** The actual arguments practitioners make about the miss→patch→durable-fix loop, in venues other than X.

**Why it matters:** The stream's premise is that a miss should become a durable rubric line. The field evidence says something sharper and less comfortable: **practitioners overwhelmingly agree the miss should be written down somewhere, and overwhelmingly disagree about where, and the disagreement is unresolved after a year of argument.**

**Key findings:**

### 2.1 The single best thread found outside X: "Evolving specs"

[github/spec-kit discussion #152, "Evolving specs"](https://github.com/github/spec-kit/discussions/152), opened by *Ian1971* on 10 September 2025, **44 comments and 88 replies** — the largest thread in the repository's discussions and still the reference argument a year later (fetched today). It is, precisely, this stream's question asked in spec-driven language: *when the code reveals the spec was wrong or incomplete, what happens to the spec?*

The positions, as summarised from the fetched thread:

| Position | Advocate (as named in thread) | Claim |
|---|---|---|
| **Immutable specs, append a new one** | SimonGartz | Specs are historical records; spec3 "replaces the implementation" without rewriting spec1 |
| **One consolidated master spec** | Apocatastasis | "a snapshot of the project specification on the memory folder… should be updated when a feature is complete" |
| **Bidirectional sync, automated** | RosMur | "AI empowers us to switch to having specs as the truth source… by having bidirectional syncing in an automated fashion" |
| **Manual fold-back is the current reality** | JFlam | "those things must be kept in sync with the source code" — acknowledging developers do this by hand today |
| **Spec reconciliation as tooling** | StnIslv | Built tools to surgically update the active spec when the code diverged during implementation |
| **Change-request entity with approval** | ThLandgraf | Lock the approved spec; route modifications through a change request with an approval cycle |
| **Generate docs from code; code is truth** | AnChildress1 | Treat code as the inference cache, generate living documentation from it, stop versioning specs |

The originating complaint is the one that matters for this stream: Ian1971's *"to know what the system does I need to read both specs."* That is the miss-ledger failure mode in one line — the patch record and the original intent record drift apart, and the next generation reads neither correctly.

**This is the clearest field confirmation of the stream's premise and its hardest problem simultaneously.** Everyone in the thread agrees the miss must land somewhere durable. Nobody has a consensus mechanism. The two mechanisms that later shipped as product — spec-kit's own `/speckit.converge` and Claude Code's `REVIEW.md` (§4, §6) — are both partial answers to exactly this thread.

### 2.2 The sceptical counter-argument, and it is strong

Hacker News hosts the sharpest scepticism about the whole spec-first approach. Search surfaced these threads by title and URL; **none of the pages loaded, so the comment bodies are unverified**:

- [*Spec-Driven Development: The Waterfall Strikes Back*](https://news.ycombinator.com/item?id=45935763) `[search summary]`
- [*Ask HN: Are you still using spec driven development?*](https://news.ycombinator.com/item?id=46864948) `[search summary]`
- [*Ask HN: What Happened to Spec-Driven Development?*](https://news.ycombinator.com/item?id=49182353) `[search summary]`
- [*Toolkit to help you get started with Spec-Driven Development*](https://news.ycombinator.com/item?id=45798473) `[search summary]`

The argument attributed to those threads by search summary — again, **snippet only** — is that "all the SDD tools have fallen off but all of the complaints remain: coding agents still improvise code that doesn't fall under the user's requirements all the time," and that SDD "is largely waterfall/contract-design rebranded — the value is the thinking you do while writing the spec, not the tooling around it" `[search summary]`. Thoughtworks is reported to place spec-driven development in the **Assess** ring of its Technology Radar, not Adopt, and to reject the "specs alone suffice" position `[search summary]`.

**How much weight to give this:** the claim that "the value is the thinking, not the tooling" is a falsifiable claim about where the benefit lives, and the one piece of study evidence I could find on it cuts in the sceptics' favour. A study reported as accepted at GAISS 2026 found that **"a specification baseline did not help reviewers catch more bugs. Rather, the baseline made the bugs they caught accountable"** `[search summary; blocked: infoq.com — the paper itself was not reachable]`. Against that, vendor-adjacent posts circulate figures of "38% reduction in rework," "PR review time from 47 to 19 minutes," "56% fewer regression bugs" `[search summary]` — **these have no traceable methodology, appear only in marketing-shaped posts, and should be treated as unsourced.** Do not quote them.

### 2.3 The "my rules are being ignored" genre is real, recurring, and vendor-acknowledged

The anecdote class Reddit is famous for — "Claude Code starts ignoring your rules by the fourth or fifth interaction" `[search summary]` — is corroborated by a venue I *could* read: the issue tracker. A fetched search of [anthropics/claude-code issues for "not following CLAUDE.md"](https://github.com/anthropics/claude-code/issues?q=is%3Aissue+%22not+following%22+CLAUDE.md) returns a steady stream over sixteen months:

| Issue | Title | State | Date |
|---|---|---|---|
| [#86176](https://github.com/anthropics/claude-code/issues/86176) | "Recent versions of Claude are extremely verbose, and requests to fix this in CLAUDE.md and hooks are ignored" | **Open** | 12 Aug 2026 |
| [#80762](https://github.com/anthropics/claude-code/issues/80762) | "Claude Code repeatedly bypasses project-mandated workflow gates while narrating compliance with them" | Closed (not planned) | 4 Sep 2026 |
| [#80949](https://github.com/anthropics/claude-code/issues/80949) | "Model not respecting claude.md instructions at runtime…" | Closed (not planned) | 5 Sep 2026 |
| [#65017](https://github.com/anthropics/claude-code/issues/65017) | "Claude Code not following instructions from claude.md" | Closed (duplicate) | 7 Jun 2026 |
| [#61100](https://github.com/anthropics/claude-code/issues/61100) | "Main agent ignores CLAUDE.md instructions…" | Closed (duplicate) | 24 May 2026 |

Two things are notable. First, **most are closed as "not planned" or "duplicate"** — the vendor's position is that this is expected behaviour, not a bug. Second, the vendor says so in the documentation, in writing: *"CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself. Claude reads it and tries to follow it, but there's no guarantee of strict compliance"* ([Claude Code memory docs](https://code.claude.com/docs/en/memory), fetched today). #80762's title — bypassing gates *while narrating compliance with them* — is the single most useful practitioner observation in the set, because it names a failure the rubric itself cannot catch: the agent's self-report is not evidence.

### 2.4 What the visual-loop practitioners describe

The dominant workflow account outside X, across blog posts and skill repos, is the **browser-screenshot self-correction loop**: the agent opens the running app through Playwright MCP or the Chrome extension, screenshots it, and critiques its own output before the human sees it `[search summary; multiple 2026 posts, none of the pages loaded]`. The fetched artifact that embodies it is [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) (3.9k★, MIT), whose design-review agent runs seven phases — preparation at 1440×900, interaction and user-flow, responsiveness at 1440/768/375, visual polish, WCAG 2.1 AA, robustness, code health — and triages findings into **`[Blocker]` / `[High-Priority]` / `[Medium-Priority]` / `Nit:`** (fetched from [design-review-agent.md](https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md)). That severity ladder is the de-facto community rubric shape for design defects; it is what doc 03 is competing with or extending.

**Open questions:** Nobody in any fetched venue reports a *measurement* of whether writing the miss into a rules file reduces recurrence. The entire practice rests on plausibility. That is the experiment this repo is positioned to run (see [eval-tuning-loops/00 §Gaps](../eval-tuning-loops/00-synthesis.md)).

---

## 3. Published team workflows: separating marketing from method

**What it is:** Real engineering organisations writing up how AI-built work goes through review and QA — and the test of whether the write-up contains a *method* (a file, a gate, a threshold, a severity definition) or only a *posture*.

**Why it matters:** Nearly every "how we ship AI code" post is published by a company selling an AI coding or review product. The useful filter is: does the post hand you an artifact you could copy into your repo tomorrow?

**Key findings:**

| Source | Method or marketing? | The transferable artifact | Verified |
|---|---|---|---|
| **Anthropic — Claude Code `REVIEW.md`** ([docs](https://code.claude.com/docs/en/code-review)) | **Method.** The most concrete published review-standard format found anywhere. | A root-level `REVIEW.md` that redefines severity for *your* repo, caps nit volume, lists skip paths, adds repo-specific always-checks, sets a **verification bar** ("behaviour claims need a `file:line` citation in the source, not an inference from naming"), and sets **re-review convergence** ("after the first review, suppress new nits and post Important findings only"). | **Fetched** |
| **Anthropic — `claude plugin eval`** ([docs](https://code.claude.com/docs/en/plugin-evals)) | **Method.** A shipped rubric-grading harness with a no-plugin control arm. | `evals/<case>/graders/*.md` files with `type: llm` rubrics written as explicit PASS/FAIL conditions, plus deterministic `regex` / `tool_used` / `tool_order` / `file_exists` graders, three runs per case, and a Δ against a no-plugin baseline. | **Fetched** |
| **OneRedOak (AI-native startup) — design review workflow** ([repo](https://github.com/OneRedOak/claude-code-workflows)) | **Method.** | A seven-phase design-review agent, a design-principles file, a slash command, a CLAUDE.md snippet, and a four-level triage matrix — all copyable. | **Fetched** |
| **GitHub — Spec Kit** ([repo](https://github.com/github/spec-kit)) | **Method**, though GitHub's framing is a toolkit not a team write-up. | `/speckit.analyze` (cross-artifact consistency before implementation), `/speckit.checklist` ("unit tests for English"), `/speckit.converge` (assess the codebase against spec/plan/tasks and append remaining work as new tasks). | **Fetched** |
| **Anthropic internal practice** — ">80% of merged code written by Claude" (May 2026); "Code Review is used by every team at Anthropic" | Mixed. The claims are vendor self-report and the source pages were unreachable. | None transferable. | `[search summary]` |
| **Shopify AI-first engineering playbook** (via Bessemer) | **Marketing-adjacent.** Describes "agentic harnesses", 10 parallel agents with human review-and-merge, sequential critique loops. | A pattern name, not an artifact. | `[search summary]` |
| **Figma / design-to-code vendor posts** | **Marketing.** The recurring line — AI output "is neither accessible, semantic, nor clean enough to ship", so the workflow leans on design systems, Code Connect and human engineering | Reinforces [design-sdlc/01](../design-sdlc/01-source-of-truth-figma-vs-code.md)'s conclusion; adds no method. | `[search summary]` |
| **"We ran four AI reviewers for three weeks, 146 PRs, 679 findings"**-genre posts | **Contested.** See §6.3 — the numbers in this genre contradict each other. | A methodology worth copying (parallel run, count findings, count false positives), not the numbers. | `[search summary]` |

**The honest summary:** *the two best-published team workflows for reviewing AI-built work in September 2026 are both shipped as product documentation by a model vendor, not as engineering-blog narratives by a product org.* `REVIEW.md` and `claude plugin eval` are more concrete, more copyable and more falsifiable than anything found in the blog genre. This is a reversal from the position in [design-sdlc/02 §7](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md), where team practice led vendor tooling.

**Open questions:** No published organisation reports the *rate* at which its AI-code review standard changes — i.e. how often a new rule is added to a `REVIEW.md`-equivalent, which is the ratchet this stream is about. That number would be the single most useful thing an engineering org could publish.

---

## 4. Spec- and plan-first tooling

**What it is:** Tools whose theory is that misses are cheaper to prevent at the specification or plan stage than to repair after the build.

**Why it matters:** If this theory is right, most of the repair loop is a symptom of skipping a step. If it is wrong, spec-first is ceremony that adds a document to maintain (§2.2). The evidence is genuinely mixed and the honest answer is "it moves the work, and the evidence that it removes work is weak."

**Key findings:**

| Tool | Stars / licence | Status verified today | What it contributes to *this* loop |
|---|---|---|---|
| [**GitHub Spec Kit**](https://github.com/github/spec-kit) | **136,011★**, MIT, 12,215 forks, 311 open issues; created 21 Aug 2025, pushed **12 Sep 2026**; v1.0.0 released 21 Aug 2026 | Very much alive (contradicting a secondary claim of "no commits for over a month" `[search summary]`) | `/speckit.analyze` → `/speckit.checklist` → `/speckit.converge`. **`converge` is the only shipped command in any tool that reads the built codebase back against the spec and writes the delta as new tasks** — i.e. it names the miss and files it. |
| [**BMAD-METHOD**](https://github.com/bmad-code-org/BMAD-METHOD) | **52,943★**, MIT, 5,984 forks; created 13 Apr 2025 | Active | A four-phase cycle **Clarify → Plan → Build and Verify → Learn and Adjust**, with the last phase explicitly looping back to planning. The repo makes no claim about reducing missed requirements; it claims "decisions stay explicit, context carries forward." |
| **AWS Kiro** ([issue tracker](https://github.com/kirodotdev/Kiro), 4.3k★; source not public) | Closed source; GA reported May 2026 `[search summary]`; `[pricing unverified — vendor site blocked from this session]` | Issue tracker fetched; product not verifiable | Specs with contradiction/gap analysis, steering files, hooks, and **correctness testing**: EARS-style requirements compiled into property-based tests run against the generated code `[search summary; blocked: kiro.dev]`. This is the only mainstream attempt to make the spec *executable against* the implementation rather than merely readable. |
| **Tessl** | Closed; a spec registry in open beta and a framework reported still not generally available `[search summary; blocked: tessl.io]`; `[pricing unverified — vendor site blocked from this session]` | Unverified | A spec registry for third-party libraries, aimed at API hallucination rather than at design misses. Peripheral to this loop. |
| **Claude Code plan mode** ([docs](https://code.claude.com/docs/en/permission-modes)) | First-party | Shipped | The cheapest spec-first rung: analyse before editing. Notably, **in plan mode read-only browser calls run without a permission prompt** while state-changing ones prompt ([Chrome docs](https://code.claude.com/docs/en/chrome)) — so "look at the running app, then plan the patch" is a supported, low-friction motion. |
| **OpenSpec ecosystem** | [sudokar/openspec-plus](https://github.com/sudokar/openspec-plus) 182★ and ~35 smaller satellites; the canonical OpenSpec repo did not surface in today's GitHub search | Partially verified | A second spec convention with real but much smaller gravity than Spec Kit. |

**Does spec-first actually reduce misses? The evidence, ranked:**

1. **Against (study-grade, unverified source):** the GAISS 2026 finding that a specification baseline *did not* help reviewers catch more bugs, only made caught bugs accountable `[search summary]`.
2. **Against (practitioner, unverified):** the HN "the complaints remain" line and Thoughtworks' Assess placement `[search summary]`.
3. **For (mechanism, verified):** Spec Kit's own README states the mechanism plainly — *"Bug fixes are risky when an agent jumps straight from a report to a patch without validating the diagnosis or confirming that the fix resolves the original symptom"* ([README, fetched](https://raw.githubusercontent.com/github/spec-kit/main/README.md)). That is a claim about *repair discipline*, not about spec-first, and it is the part of Spec Kit most relevant here.
4. **For (adoption, verified):** 136k stars and 12k forks is real signal of something, but stars measure interest, not retention — and the repo's own top discussions include ["Is SpecKit *really* maintained?"](https://github.com/github/spec-kit/discussions) (General, 37 replies, 16 Jan 2026 — listing fetched, thread body not opened).

**Verdict for a one-designer workflow: take `converge`, leave the ceremony.** The transferable idea is not "write a spec first"; it is **"after the build, re-read the artifact against the intent and file the delta"** — a command, run late, whose output is a task list. That is doc 02's repair decision made cheap.

**Open questions:** No public measurement exists of `/speckit.converge`'s recall — how many real misses it finds versus a human pass. Nobody has published a spec-first vs. no-spec A/B on *design* defects specifically (all the evidence is backend-flavoured).

---

## 5. Rules and memory files — and the evidence they are followed

**What it is:** The persistent-instruction layer — `CLAUDE.md`, `AGENTS.md`, `.cursorrules` / `.cursor/rules/*.mdc`, `.claude/rules/*.md`, and vendor auto-memory — which is where most practitioners put a miss when they decide it should never recur.

**Why it matters:** This is the default destination for a rubric line, and it is the weakest link in the chain. [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md) already established the altitude ladder (hook → schema → rule → skill → exemplar → optimizer) and the IFScale evidence. This section adds what is **new since that stream**: measured adoption, the cross-vendor convention's current state, and a stronger degradation number.

**Key findings:**

### 5.1 Adoption, measured rather than asserted

GitHub code search, run today (12 September 2026), counting **indexed public files at repository root** unless noted:

| Convention | Files indexed | Query |
|---|---|---|
| `CLAUDE.md` | **530,432** | `filename:CLAUDE.md path:/` |
| `AGENTS.md` | **491,520** | `filename:AGENTS.md path:/` |
| `.cursor/rules/*.mdc` | **182,784** | `path:.cursor/rules extension:mdc` |
| `.claude/rules/*.md` | **79,232** | `path:.claude/rules extension:md` |
| `REVIEW.md` | **25,024** | `filename:REVIEW.md path:/` — **heavily contaminated**; `REVIEW.md` is a generic filename that long predates Claude Code Review, so treat this as an upper bound and not as adoption of the review-rubric convention |
| `.cursorrules` (legacy single file) | **20,672** | `filename:.cursorrules path:/` |

Two readings. First, **`AGENTS.md` has essentially caught `CLAUDE.md`** — 491k vs 530k, within 8% — which makes it a genuine cross-vendor convention rather than an aspiration. Second, **the legacy `.cursorrules` single-file form is dead relative to the directory form**: 20,672 vs 182,784, a ~9× preference for `.cursor/rules/*.mdc`. The migration from "one long rules file" to "many path-scoped rule files" has already happened in the field, which is the same conclusion [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) reached from the adherence evidence.

**A contradiction worth flagging:** a widely-repeated secondary source states AGENTS.md had been "adopted by more than 60,000 open-source repositories" by May 2026 `[search summary]`. Today's direct code-search count is **491,520 root-level files**. These are not the same measurement (indexed files vs. repositories; four months apart; forks inflate file counts), but the gap is an order of magnitude and the 60,000 figure should not be quoted without that caveat.

### 5.2 The AGENTS.md convention's actual state

- Governance: reported as transferred to the Linux Foundation's **Agentic AI Foundation** in late 2025, originally driven by OpenAI with Amp, Google (Jules), Cursor and Factory `[search summary; blocked: agents.md]`. The [repo](https://github.com/openai/agents.md) (24.3k★, MIT) is fetched and confirms only that it is "a simple, open format for guiding coding agents"; it publishes **no adoption metrics and no formal spec** — the "spec" is a suggested set of sections (dev environment tips, testing instructions, PR conventions).
- Native readers, per secondary sources: Codex CLI, Cursor, GitHub Copilot coding agent, Gemini CLI, Windsurf, Aider, Zed, Jules, Devin, Amp, JetBrains Junie and others `[search summary]`. [openai/codex](https://github.com/openai/codex) (123.6k★, Apache-2.0) carries an `AGENTS.md` in its own root — fetched, and the strongest single confirmation available here.
- **Claude Code does not read it.** Verbatim, from the fetched [memory docs](https://code.claude.com/docs/en/memory): *"Claude Code reads `CLAUDE.md`, not `AGENTS.md`."* The supported bridges are an `@AGENTS.md` import at the top of `CLAUDE.md`, a symlink (`ln -s AGENTS.md CLAUDE.md`), or the newer `/import` command (v2.1.213+) which appends a one-time copy. The community asked for native support in [issue #6235](https://github.com/anthropics/claude-code/issues/6235) (opened 21 Aug 2025, since closed) on interoperability grounds; the resolution was the import path, not native reading.

### 5.3 What evidence exists that these files are followed

This is where the practice is weakest, and the vendor is unusually candid about it. All quotes fetched from [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) today:

- **They are context, not configuration.** *"Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."*
- **No compliance guarantee, and a structural reason.** *"CLAUDE.md content is delivered as a user message after the system prompt, not as part of the system prompt itself… there's no guarantee of strict compliance, especially for vague or conflicting instructions."*
- **Length degrades adherence, with a number.** *"target under 200 lines per CLAUDE.md file. Longer files consume more context and reduce adherence."* Also: Claude Code loads a CLAUDE.md up to **4 MiB** in full and skips a larger one — *"Shorter files produce better adherence"* — so there is no hard cap doing the work for you.
- **Imports do not help the budget.** *"Splitting into `@path` imports helps organization but doesn't reduce context, since imported files load at launch."* Path-scoped `.claude/rules/*.md` with `paths:` frontmatter is the only mechanism that genuinely defers load.
- **Contradiction is resolved arbitrarily.** *"if two rules contradict each other, Claude may pick one arbitrarily."*
- **The vendor now ships a trimmer.** `/doctor` proposes trims for a checked-in CLAUDE.md, *cutting content Claude can derive from the codebase (directory layouts, dependency lists, architecture overviews) and keeping pitfalls, rationale, and conventions that differ from tool defaults* (requires v2.1.206+). That is a machine-executable statement of what a rule slot is *for*, and it agrees exactly with the fix-altitude table in [eval-tuning-loops/03 §9](../eval-tuning-loops/03-feeding-grades-back-text-level.md).

**The degradation literature, new since the eval stream.** [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) cites IFScale (arXiv 2507.11538): the best frontier models reach only **68% accuracy at 500 instructions**, with a bias toward earlier instructions. Search surfaced a newer and harsher result — *Instruction Stacking Collapse* (arXiv [2608.02639](https://arxiv.org/abs/2608.02639)), reporting instruction-following degrading **non-linearly from ~96% to as low as 20%**, driven by "a structured and reproducible set of pairwise conflicts" `[search summary; blocked: arxiv.org — abstract not read]`. If that holds on inspection, the operative variable is **conflict between rules, not rule count** — which would change the advice from "keep it short" to "keep it *consistent*, and audit for pairwise conflict when you add a rule." Treat as a lead to verify, not as established.

### 5.4 Rule generation from mistakes, and auto-memory

The "turn the correction into a rule automatically" category is where the loop would close, and it is thin.

- **Vendor-shipped: Claude Code auto memory** ([docs, fetched](https://code.claude.com/docs/en/memory)). Claude writes its own notes across four typed categories — `user`, `feedback` (*"corrections you give Claude and approaches you confirm"*), `project`, `reference` — into `~/.claude/projects/<project>/memory/`, indexed by a `MEMORY.md` whose **first 200 lines or 25KB** load every session. It explicitly *skips anything the CLAUDE.md already says* and anything derivable from the codebase. The `feedback` type is, structurally, the ratchet this stream wants: a miss you corrected becomes a durable note without you writing it. Three real limits: it is **machine-local** (not shared across machines, teammates or CI), it is **not versioned with the repo**, and Claude *"doesn't save something every session"* — there is no guarantee a given correction is captured.
- **The vendor's own written trigger for a manual rule** is the cleanest statement of the ratchet found anywhere: add to CLAUDE.md when *"Claude makes the same mistake a second time"* or *"a code review catches something Claude should have known about this codebase."* That is a two-strike rule, not a one-strike rule — and it is the correct default, because a one-strike rule is how a 600-line CLAUDE.md happens.
- **Third-party rule-generation tooling: effectively absent.** A GitHub search for self-improving/retrospective rule generators returned **zero** repositories. The largest artifact in the category is [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) (40.8k★, CC0-1.0, ~200+ `.mdc` files) — a *library of hand-written rules by stack*, not a generator. Nobody ships "read my last ten corrections and propose three rules."

**Open questions:** No measurement exists of auto-memory's capture rate (what fraction of corrections become notes) or its adherence lift. The `feedback` memory type is the closest thing to a shipped ratchet and is completely unevaluated in public.

---

## 6. Review agents and code-review bots

**What it is:** Agents that read a diff or a PR and post findings — the machine layer that is supposed to catch the miss before the human tests and finds it.

**Why it matters:** For this loop, only two properties matter: **does it catch design defects (not just backend bugs), and can its criteria be tuned by me when it misses something?** Most of the category fails the first test and only one product genuinely passes the second.

**Key findings:**

### 6.1 The landscape, with what is verifiable

| Tool | Licence / price | Verified today | Design-defect relevance |
|---|---|---|---|
| **Claude Code Review** (managed) + `REVIEW.md` | Team/Enterprise, research preview; the docs state **$15–25 per review** on average, ~20 min per review, billed via usage credits (figure read in the vendor's own fetched docs) | [Docs fetched](https://code.claude.com/docs/en/code-review) | **Indirect but tunable.** Default focus is correctness, *"not formatting preferences or missing test coverage"* — but `REVIEW.md` lets you add always-checks, and `CLAUDE.md` violations are flagged as nits by default. |
| **`/code-review` local** | Included in Claude Code | [Docs fetched](https://code.claude.com/docs/en/code-review) | Runs as a background subagent with its own context; `--fix` applies findings, `--comment` posts them; effort levels trade coverage for confidence. **It does not read `REVIEW.md`** — only `CLAUDE.md`. That asymmetry matters: your review rubric only applies to the managed service. |
| [**anthropics/claude-code-action**](https://github.com/anthropics/claude-code-action) | **8.9k★**, MIT | Fetched | Self-hosted CI path; you write the review prompt, so a design rubric is possible but hand-rolled. |
| [**qodo-ai/pr-agent**](https://github.com/qodo-ai/pr-agent) | **13.0k★**, MIT per repo page | Fetched | The only mature **open-source** reviewer. `/describe`, `/review`, `/improve`, `/ask`; works on GitHub, GitLab, Bitbucket, Azure DevOps, Gitea; any LLM via LiteLLM. Backend-flavoured out of the box. |
| **CodeRabbit** | Closed. `[pricing unverified — vendor site blocked from this session]`. Org publishes tooling but **no open-source reviewer** — [coderabbitai](https://github.com/coderabbitai) ships `git-worktree-runner` (1.8k★), `awesome-coderabbit` (509★), `skills` (173★) | Org page fetched; product pages blocked | Backend/correctness. |
| **Greptile** | Closed. `[pricing unverified — vendor site blocked from this session]`; secondary sources report a per-developer subscription that moved to per-review billing during 2026 `[search summary]` | Not fetchable | Codebase-indexing reviewer; backend-flavoured. |
| **Cursor Bugbot** | Closed. `[pricing unverified — vendor site blocked from this session]`; secondary sources report a move from per-seat to usage-based billing in mid-2026 `[search summary]` | Not fetchable | Bug detection; not design. |
| **Codex review** | Part of [openai/codex](https://github.com/openai/codex) (123.6k★, Apache-2.0) | Repo fetched; a distinct "review" feature was **not visible** on the repo page | Unverified. |
| **Design-specific review agents** | [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) (3.9k★, MIT); community skills such as [maxrihter/claude-skill-visual-regression](https://github.com/maxrihter/claude-skill-visual-regression) (**1★**, MIT) | Fetched | **This is the whole category.** One well-starred repo and a long tail of single-author skills. There is no commercial design-review bot. |

### 6.2 `REVIEW.md` is the most important artifact in this section

It is a **review-only rubric file at the repo root**, read by the agents that find, verify, rank and report findings — and the documented tuning surface maps almost one-to-one onto the problems this stream studies. All quoted from the [fetched docs](https://code.claude.com/docs/en/code-review):

| `REVIEW.md` lever | What it fixes in the repair loop |
|---|---|
| **Severity redefinition** | The default calibration "targets production code; a docs repo, a config repo, or a prototype might want a much narrower definition." A *prototype* repo with production severities drowns you. |
| **Nit cap** | *"report at most five nits, mention the rest as a count in the summary"* — directly addresses review fatigue. |
| **Skip rules** | Paths and categories where the bot posts nothing, "along with anything your CI already enforces." |
| **Repo-specific checks** | *"Because `REVIEW.md` reaches every finding and verification agent directly, these land more reliably than the same rules in a long `CLAUDE.md`."* **This is a vendor statement that rubric placement beats rubric text** — the altitude-ladder principle, confirmed by the tool's own author. |
| **Verification bar** | *"behavior claims need a `file:line` citation in the source, not an inference from naming"* — the single best false-positive control published by any reviewer. |
| **Re-review convergence** | *"after the first review, suppress new nits and post Important findings only"* — *"stops a one-line fix from reaching round seven on style alone."* This is the round-limit doc 02 argues for, implemented as a rubric line. |
| **Length warning** | *"a long `REVIEW.md` dilutes the rules that matter most."* The same degradation law as CLAUDE.md, restated for the rubric. |

Also relevant to the ratchet: the review pipeline itself has a **verification step that checks candidate findings against actual code behaviour to filter false positives**, findings carry three severities (🔴 Important / 🟡 Nit / 🟣 **Pre-existing** — a bug that exists but was not introduced by this PR), the check run always completes **neutral** so it never blocks a merge, and each comment ships with 👍/👎 pre-attached whose reaction counts Anthropic collects after merge "and uses them to tune the reviewer." That last mechanism is the only *vendor-side* grade-feedback loop found in this survey — and note who it improves: the vendor's reviewer, not your rubric.

### 6.3 The benchmark numbers in this category are not trustworthy

Search surfaced competing 2026 benchmarks. They contradict each other on the same tools:

- One comparison reports Greptile catching roughly twice CodeRabbit's share of bugs while producing several times as many false positives, on 50 real PRs drawn from Sentry, Cal.com and Grafana `[search summary]`.
- A second summary attributes a given low false-positive rate to **Cursor Bugbot**; a third summary of what appears to be the *same* three-week, 146-PR, 679-finding study attributes **the identical rate to CodeRabbit** `[search summary]`.
- A fourth reports Bugbot with the highest precision in the field and only a handful of false positives `[search summary]`.

The specific percentages are deliberately not reproduced here: they could not be read at source, and at least two of them are mutually exclusive.

**Conclusion: the published AI-code-review benchmark literature as of September 2026 is vendor-adjacent, mutually inconsistent, and not safe to cite.** What *is* transferable is the method: run two or three reviewers in parallel on your own PRs for three weeks, count findings, count false positives, count the ones a human would have caught anyway. The generalisable finding across all of them — higher catch rate buys more false positives — is a precision/recall tradeoff, not a product ranking, and your `REVIEW.md` verification bar is the knob.

**Open questions:** No reviewer is benchmarked on *design* defects at all. Every published benchmark counts logic bugs. The recall of any of these tools on "the empty state is missing" or "the primary action is not the visually dominant element" is unmeasured and probably near zero.

---

## 7. Browser and visual self-correction loops

**What it is:** The machinery that lets the agent *see* the thing it built before you do — and the services that catch a visual change you did not ask for.

**Why it matters:** This is the only layer that can catch a design miss without a human looking. [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) already established the hard limit — VLMs cannot see spacing, alignment or contrast, so compute those from the DOM — so the value here is *evidence capture and deterministic diffing*, not judgment.

**Key findings:**

### 7.1 Agent-driven browser control

| Tool | Stars / licence | Verified | Fit |
|---|---|---|---|
| [**microsoft/playwright-mcp**](https://github.com/microsoft/playwright-mcp) | **37,035★**, Apache-2.0, created Mar 2025 | Fetched | The default. 60+ tools; **accessibility-snapshot-first rather than screenshot-first** ("bypasses vision models entirely, operating on pure structured data") with `browser_take_screenshot` when pixels are needed. The a11y-tree-first design is exactly right for design review: it hands the agent *structure* (which the DOM knows) and reserves pixels for evidence. |
| [**ChromeDevTools/chrome-devtools-mcp**](https://github.com/ChromeDevTools/chrome-devtools-mcp) | **51,748★**, Apache-2.0, created Sep 2025 | Fetched | Live Chrome control via Puppeteer plus **performance traces, source-mapped console stack traces and network analysis**. Complements Playwright MCP rather than replacing it: it is the diagnosis tool when the miss is "it's janky" or "it errors on load". |
| [**Claude in Chrome / `claude --chrome`**](https://code.claude.com/docs/en/chrome) | First-party; Pro/Max/Team/Enterprise; extension ≥1.0.36 | Docs fetched | Uses **your logged-in browser**, so authenticated app states are reachable without fixtures. Lists "design verification: build a UI from a Figma mock, then open it in the browser to verify it matches" as a first-class capability. Read-only calls are prompt-free in plan mode. Caveat the docs volunteer: enabling it by default "increases context usage since browser tools are always loaded." |
| [**browser-use/browser-use**](https://github.com/browser-use/browser-use) | **114.3k★**, MIT | Fetched | Task-completion agent, not a review harness. Over-powered and under-specific for this loop. |
| [**browserbase/stagehand**](https://github.com/browserbase/stagehand) | **24,251★**, MIT | Fetched | `act` / `observe` / `extract` over Playwright with self-healing selectors. Useful when the prototype's DOM changes every regeneration and hard selectors keep breaking — a real problem for regenerated UI (see [prototype-review-overlay/01](../prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md) on anchor fragility). |

### 7.2 Visual regression services — and the category just lost a player

| Service | Licence | Commercial status | Verified |
|---|---|---|---|
| [**Argos**](https://github.com/argos-ci/argos) | **622★, MIT — the only open-source-core option left** | Free tier plus a paid hosted plan metered by screenshot. `[pricing unverified — vendor site blocked from this session]` | Repo fetched |
| **Chromatic** | Closed; [chromatic-cli](https://github.com/chromaui/chromatic-cli) 337★ MIT | Free tier plus paid plans metered by snapshot. `[pricing unverified — vendor site blocked from this session]` | CLI repo fetched |
| **Percy (BrowserStack)** | Closed; [percy/cli](https://github.com/percy/cli) 86★ (licence not stated on the repo page) | Secondary sources report that BrowserStack **removed Percy from its public pricing page** during 2026 `[search summary]`. `[pricing unverified — vendor site blocked from this session]` | CLI repo fetched |
| [**Lost Pixel**](https://github.com/lost-pixel/lost-pixel) | MIT, 1,684★ | — | **Fetched: archived 22 April 2026.** README verbatim: *"We are sunsetting the product and building what's next"* — the team **joined Figma**. |
| [**BackstopJS**](https://github.com/garris/BackstopJS) | MIT, 7.2k★ | Free | **Fetched: "BackstopJS needs a new maintainer/owner."** |
| **Playwright `toHaveScreenshot`** | Apache-2.0, in-repo | Free | The zero-service baseline: `maxDiffPixelRatio`, `threshold`, `mask` for dynamic content. |

**One finding that changes the recommendation in [prototype-review-overlay/05](../prototype-review-overlay/05-feature-landscape-and-mvp-cut.md):** the open-source visual-regression field contracted this year — **Lost Pixel is archived and BackstopJS is seeking a maintainer** — leaving **Argos as the only actively-maintained open-source-core option**, and a very small project at 622★. All three hosted services advertise a free entry tier, but no tier or unit price could be read from this session. The structural point that survives the blocked pricing pages is the **multiplier**: these services bill per *snapshot*, and a snapshot is one story × one viewport × one browser, so a three-viewport, two-browser matrix costs six times the naive count. Budget on the matrix, not the test count.

**The self-correction loop practitioners actually describe** (blog-level, `[search summary]`): agent builds → opens localhost via Playwright MCP → screenshots every route → runs a design-review skill against the screenshots → patches → re-screenshots. The fetched instance of it is OneRedOak's seven-phase agent (§2.4). Its weakness is the one [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) names: the judge in that loop is a VLM looking at a picture, and the published VLM numbers on fine visual change detection are poor. **The loop is excellent at catching "it's broken" and mediocre at catching "it's wrong."**

**Open questions:** Nobody has published a screenshot-loop recall number on design defects. The obvious experiment — seed N known design misses, run the loop, count catches — costs almost nothing and does not exist.

---

## 8. Eval and rubric tooling for a one-designer team

**What it is:** The harnesses that turn "x was missed" into a repeatable test. [eval-tuning-loops](../eval-tuning-loops/00-synthesis.md) owns the full treatment — this section covers **only what is new since that stream, and only what a single designer can actually run.**

**Why it matters:** Most of this category is built for ML engineers with a data team. The one-designer filter is brutal: free tier, no seat cost, runs from the terminal, no data pipeline.

**Key findings:**

### 8.1 What is new since the eval-tuning-loops stream

1. **`claude plugin eval` shipped, and it is rubric-native.** (Requires Claude Code v2.1.269+; [docs fetched](https://code.claude.com/docs/en/plugin-evals).) A case is a `prompt.md` plus one or more grader files under `graders/`. Six grader types: `regex`, `tool_used`, `tool_order`, `file_exists` (all computed from the transcript, **free**), and `llm` / `baseline` (a judge call, **costed**). An `llm` grader is literally a rubric file:

   ```markdown
   ---
   type: llm
   ---
   PASS if <what a correct response contains>.
   FAIL if <what a wrong or missing response looks like>.
   ```

   Three properties make this materially better than the general-purpose harnesses for this loop. **(a) A built-in control arm:** each case runs three times *with* the plugin and three times *without*, and reports `Δ` — *"If a case scores 1.0 both with and without the plugin, the plugin isn't what made it pass."* That kills the commonest self-deception in rubric work. **(b) Deterministic-first guidance, stated by the vendor:** *"For long output such as a generated file, grade it with a `regex` grader over the file's contents… Keep `llm` graders for short outputs."* **(c) A judge-distrust default:** *"If a case's `tool_used: Skill` grader passes but Δ is negative, suspect the judge before the plugin"* — re-run with `--judge-model sonnet`. That is [eval-tuning-loops/02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)'s "sample the judge" rule shipped as product advice. The stated limitation matters too: **"There are no custom-code graders"** — so a DOM-metric grader (the thing [01](../eval-tuning-loops/01-grading-generated-prototypes.md) says you need for spacing and contrast) cannot live inside this harness; you bolt it on by having the prompt write results to a file and grading the file with `regex`.

2. **promptfoo is now part of OpenAI.** Verbatim from the [fetched README](https://raw.githubusercontent.com/promptfoo/promptfoo/main/README.md): *"Promptfoo is now part of OpenAI. Promptfoo remains open source and MIT licensed."* Repo: **25,046★, MIT, 2,297 forks**. This does not change the tool today, but it changes the vendor-independence calculus that [eval-tuning-loops/05](../eval-tuning-loops/05-loop-architecture-and-governance.md) built its "do not let the vendor be the system of record" rule on — the neutral OSS harness now has a frontier-lab owner.

3. **Lost Pixel's team went to Figma** (§7.2) — relevant here because visual diffing is a *grader*, and the OSS supply of graders just shrank.

### 8.2 The picks, filtered for one designer

| Tool | Stars / licence | Free-tier reality | Verdict for a one-designer loop |
|---|---|---|---|
| **`claude plugin eval`** | First-party, no separate cost beyond model calls | Every run is a real model call on your plan | **Best fit for grading a *skill or plugin* that generates UI.** Rubric graders + no-plugin baseline + CI gate, zero infrastructure. |
| [**promptfoo**](https://github.com/promptfoo/promptfoo) | 25,046★, MIT | Fully local, free | **Best fit for grading a *prompt or pipeline*.** Declarative YAML, CLI + local web viewer, CI integration. Already a pick in [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md) — the news is the ownership change. |
| [**DeepEval**](https://github.com/confident-ai/deepeval) | **18,237★, Apache-2.0** | Local, free | **Not yet in the collection, and it should be considered.** Pytest-shaped (`assert` on metrics), and its **G-Eval** metric is explicitly "a research-backed LLM-as-a-judge metric for evaluating on any custom criteria" — the closest thing to a drop-in *rubric* metric in the Python ecosystem. Pytest shape means a design rubric can live next to your other tests. |
| [**Inspect**](https://github.com/UKGovernmentBEIS/inspect_ai) | 2,755★, MIT, UK AI Security Institute | Local, free | Heavyweight; model-graded evals and 200+ built-ins. Overkill for one designer; right if the rubric must be auditable by someone else. |
| [**autoevals**](https://github.com/braintrustdata/autoevals) | ~1,000★, MIT | Library, free | 40+ prebuilt scorers, Python + TS, usable **without** a Braintrust account. The cheapest way to get a judge scorer into a Node build script. |
| **Braintrust** | Closed platform | `[pricing unverified — vendor site blocked from this session]`. Secondary sources describe a score-metered, seat-free model with a short free-tier retention window `[search summary]` | Score-metering suits a team of one. But if the free tier's retention is measured in weeks, it is fatal for a *ratchet* — the whole point is a record that outlives the sprint. Verify retention before adopting. |
| **LangSmith** | Closed platform | `[pricing unverified — vendor site blocked from this session]`. Secondary sources describe trace-metering plus per-seat billing `[search summary]` | Trace-first and seat-priced. Weakest fit of the group for a single designer. |
| [**openai/evals**](https://github.com/openai/evals) | 19.4k★, MIT, not archived | Free | Largely superseded by the OpenAI dashboard ("You can now configure and run Evals directly in the OpenAI Dashboard"); no reason to adopt it new. |

**Cross-link, not repeat:** the grade record schema, the judge-calibration protocol, the exemplar-promotion gate and the fix-altitude table all live in [eval-tuning-loops](../eval-tuning-loops/00-synthesis.md) and [skill-resources/eval-loops.md](../../../skill-resources/eval-loops.md). Nothing here supersedes them; `claude plugin eval` is best read as a *shipped, opinionated subset* of that loop with the control arm built in.

**Open questions:** Neither `claude plugin eval` nor any other harness ships a **design** rubric library. Every rubric in this category is authored from scratch, every time, by every team.

---

## 9. Regression safety nets

**What it is:** The deterministic layer that makes a *second* occurrence of the same miss impossible rather than merely discouraged — the bottom rung of the fix-altitude ladder.

**Why it matters:** A rubric line is probabilistic. A test is not. The stream's thesis — the miss becomes a durable line — is only as strong as the proportion of lines that can be made deterministic.

**Key findings:**

| Net | Status verified today | Where it sits in the loop |
|---|---|---|
| **Playwright `toHaveScreenshot`** ([playwright-mcp](https://github.com/microsoft/playwright-mcp) for the agent side; playwright.dev blocked) | Apache-2.0, free | The default pixel gate. `mask` for dynamic content, `threshold`/`maxDiffPixelRatio` for tolerance. Free, local, no service. |
| [**storybookjs/test-runner**](https://github.com/storybookjs/test-runner) | **278★, MIT, v0.24.0 (Storybook ^10), default branch `next`** | **Being superseded, per its own README**, which steers Vite projects to Storybook's Vitest integration: *"It's faster, provides features out of the box such as a11y and coverage."* Adopt the Vitest addon for new work; the test-runner is the non-Vite fallback. |
| [**maxrihter/claude-skill-visual-regression**](https://github.com/maxrihter/claude-skill-visual-regression) | **1★**, MIT, 15 commits | A single-author skill, but the *design* is the right one: baselines in git, three viewports (1440×900 / 768×1024 / 375×812), Docker for cross-platform font stability, HTML diff reports, and a production fixture with **font stabilisation and animation freezing**. The star count means "read it and rebuild it," not "install it." |
| [**Argos**](https://github.com/argos-ci/argos) / Chromatic / Percy | See §7.2 | The hosted gate with a review UI. Free at 5,000 screenshots/month across all three. |
| **Characterisation-test generators** | **Not verified.** No maintained, well-starred generator for *UI* characterisation tests surfaced in today's searches | The gap is real: there is no "capture what this prototype currently does, as tests" tool for generated UI. |
| **`claude plugin eval` in CI** | [Docs fetched](https://code.claude.com/docs/en/plugin-evals) | Gates a *generator* change, not an artifact change — the complement to a screenshot gate. |

**The practical composition for a designer:** one screenshot baseline per route at three viewports (free, local, Playwright), plus `axe` at zero violations (already rung 8 of the [guardrail ladder](../design-sdlc/04-small-model-guardrails.md)), plus one eval case per class of miss that keeps recurring. The screenshot gate catches visual regression; axe catches the a11y class; the eval case catches the *generator* regressing. Anything that cannot be expressed in those three becomes a rubric line — and a rubric line is the admission that you could not make it deterministic.

---

## 10. What the tooling still does not do

**What it is:** The honest gap list, stated as "there is no product for X", with what people hand-roll instead.

1. **Nothing turns a correction into a proposed rule.** Auto memory writes `feedback` notes for itself ([memory docs](https://code.claude.com/docs/en/memory)), machine-local and unversioned; it does not propose a CLAUDE.md or REVIEW.md diff for your review. Third-party generators: **zero found** in GitHub search. People hand-roll this as "at the end of the session, ask Claude what rule would have prevented this."
2. **Nothing audits a rules file for pairwise conflict.** The vendor documents that contradictions are resolved arbitrarily and ships `/doctor` to trim *derivable* content — but there is no linter that says "line 41 contradicts line 112." If *Instruction Stacking Collapse* `[search summary]` is right that conflict, not count, drives collapse, this is the highest-value missing tool in the whole survey.
3. **No reviewer is evaluated on design defects.** Every benchmark in §6.3 counts logic bugs. Recall on "missing empty state", "wrong visual hierarchy", "inconsistent spacing scale" is unmeasured for every product in the category.
4. **No rubric library for design exists.** Not in `claude plugin eval`, not in promptfoo, not in DeepEval, not in any commercial platform. The OneRedOak seven-phase agent is the nearest published thing and it is a prompt, not a graded rubric with anchors.
5. **The miss ledger has no product.** Spec-kit discussion [#152](https://github.com/github/spec-kit/discussions/152) is 132 replies of people building this by hand. `/speckit.converge` writes the delta into *tasks*; `REVIEW.md` accumulates *rules*; auto memory accumulates *notes* — and none of the three is joined to the artifact, the generator version, and the grade. That join is the [prototype ledger](../design-sdlc/03-prototype-governance-outside-the-codebase.md) + [grade record](../eval-tuning-loops/01-grading-generated-prototypes.md) this repo already specified, and it remains unbuilt by anyone.
6. **Review rubrics do not follow the review.** `REVIEW.md` is read by the *managed* Claude Code Review service and explicitly **not** by the local `/code-review` command. So the rubric you tune against real misses does not apply where most designers actually work — in the terminal, pre-push.
7. **No characterisation-test generator for UI.** "Freeze what this prototype currently does, as tests, before I let an agent touch it" is a one-command idea with no implementation.
8. **Nothing ties a screenshot diff to a rubric line.** Visual regression services tell you *something changed* and ask a human to approve. None of them can say *which rubric criterion the change violates*, which is the datum the ratchet needs.
9. **Per-viewer/per-machine memory does not reach the team.** Auto memory is machine-local and excluded from transcript cleanup but never synced; a two-person design team cannot share the ratchet without manually promoting notes into CLAUDE.md.
10. **No public measurement of the ratchet itself.** Not one source, in any venue, measures whether recurrence of a defect class falls after the rule is added. The entire practice — including this stream's premise — is unvalidated.

---

## 11. Adoption reality: measured numbers

**What it is:** What surveys measure practitioners doing, versus what the discourse is about.

**Why it matters:** The tooling in §4–§9 is written about far more than it is used. The surveys are the only corrective.

**Verification caveat: every survey host in this section was blocked by the egress proxy.** All figures below are `[search summary]` — surfaced by search, pages not read, not independently verified. They are reported with their claimed provenance so a reader can check them; **do not treat any single number here as verified by this document.**

| Finding | Claimed source | Number |
|---|---|---|
| Biggest single frustration with AI tools | Stack Overflow Developer Survey 2025 | **66%** cite "AI solutions that are almost right, but not quite" `[search summary]` |
| AI adoption | Stack Overflow 2025 (widely re-reported in 2026 coverage) | **84%** using or planning to use AI tools; **3%** "highly trust" AI output `[search summary]` |
| AI adoption and trust | DORA *State of AI-assisted Software Development* 2025 | **90%** report using AI; **~30%** show little or no trust in AI output `[search summary]` |
| Delivery effect | DORA 2025 | AI correlates positively with throughput **and** with **higher instability** — more change failures, more rework; "AI is exposing the downstream bottlenecks in testing, code review, and quality assurance" `[search summary]` |
| AI code-review adoption | JetBrains *State of Developer Ecosystem* 2025 | **44%** used an AI code-review tool in the previous 12 months, up from **18%** in 2023; web devs 52%, DevOps 49% `[search summary]` |
| AI code-review adoption | Stack Overflow 2025 | **47%** of professional developers, up from 22% (2024) and 11% (2023) `[search summary]` |
| Repos with an AI review integration | GitHub Octoverse 2025 | **1.3M** repos, ~4× the ~300k of late 2024 `[search summary]` |
| Review outcomes | GitHub Octoverse 2025 | **32%** faster merge times and **28%** fewer post-merge defects with AI-assisted review vs human-only `[search summary]` — *observational, self-selected; not a controlled comparison* |
| The counter-evidence | METR RCT, July 2025 | 16 experienced OSS developers, 246 tasks: **19% slower** with AI tools, while believing they were **20% faster** `[search summary]` |

**How to read these together.** Three of them are the same finding in different clothes. Sixty-six percent say the problem is *almost right*; DORA says throughput rises and stability falls; METR says the perception of speed is inverted relative to measurement. That triangle is exactly this stream's subject: **the loop's cost has moved from producing the artifact to verifying it, and practitioners systematically under-estimate that cost.** The Octoverse 32%/28% figures are the only optimistic numbers in the set and they are observational — teams that adopt AI review are not a random sample of teams.

**What the surveys do *not* say, and it matters:** none of them measures review burden in hours, none measures defect *classes*, and none measures design defects at all. The "review burden" story is an inference from instability and trust figures, not a direct measurement.

---

## Cross-cutting themes

1. **The community agrees the miss must be written down and disagrees about where — for a year, publicly, without resolution.** Discussion [#152](https://github.com/github/spec-kit/discussions/152) is a year old and still the reference argument. Every shipped mechanism (converge → tasks, REVIEW.md → rules, auto memory → notes) is a partial answer to it, and none of them is joined to the others.
2. **Vendors now document their own adherence limits more honestly than practitioners do.** "Context, not enforced configuration"; "no guarantee of strict compliance"; "under 200 lines… longer files reduce adherence"; "if two rules contradict, Claude may pick one arbitrarily"; "a long REVIEW.md dilutes the rules that matter most." Four separate degradation warnings in first-party docs. The practitioner genre ("my rules are ignored!") is *arguing with documentation it has not read*.
3. **The rubric moved from the prompt to a file, and the file's placement decides its force.** `REVIEW.md` reaching "every finding and verification agent directly" lands "more reliably than the same rules in a long `CLAUDE.md`" — a vendor statement of the [fix-altitude principle](../eval-tuning-loops/03-feeding-grades-back-text-level.md). Same law, new surface.
4. **Deterministic-first is now the vendor default, not just this repo's opinion.** `claude plugin eval` tells you to prefer `regex` over `llm` graders for long output and to suspect the judge before the artifact; Claude Code Review runs a verification pass to filter false positives; Spec Kit's `analyze` runs before `implement`. The guardrail ladder's ordering has been independently rediscovered by three shipping products.
5. **The open-source layer of this stack is thinning where the money is.** Lost Pixel archived into Figma; BackstopJS seeking a maintainer; promptfoo inside OpenAI; Percy's pricing page withdrawn. The one-designer's free options are narrowing to Argos, Playwright's own screenshot API, and whatever ships inside the agent.
6. **Everything in the loop is measured except the loop.** Stars, prices, false-positive rates, merge times, adoption percentages — all published. Whether writing a miss into a rule reduces its recurrence: **no public measurement exists**, anywhere, by anyone.

---

## Recommendations: the one-designer repair stack

Ordered by cost. Each rung says what it catches and what it costs. Rungs 1–4 are an afternoon and free; 5–7 are a sprint.

| # | Rung | Catches | Cost | Source |
|---|---|---|---|---|
| 1 | **Two-strike rule for CLAUDE.md.** Add a line only when the same mistake happens twice, or a review catches something Claude should have known. Keep under 200 lines; run `/doctor` monthly to trim derivable content. | Recurrence of *known, phrasable* misses | Free | [memory docs](https://code.claude.com/docs/en/memory) |
| 2 | **Path-scoped rules, not a longer root file.** Move anything that only matters in one area into `.claude/rules/*.md` with `paths:` frontmatter. Imports do *not* save context; path scoping does. | Adherence loss from file length | Free | [memory docs](https://code.claude.com/docs/en/memory) |
| 3 | **A `REVIEW.md` with four sections**: what Important means *for a prototype repo*; a nit cap; a skip list (anything CI already enforces); and a verification bar requiring a `file:line` citation. Add a re-review convergence line to stop round seven. | Review noise; rubric drift; endless polish rounds | Free to write; the managed service's docs state $15–25 per review | [code-review docs](https://code.claude.com/docs/en/code-review) |
| 4 | **Screenshot baseline at three viewports**, committed to git, with fonts stabilised and animations frozen; Playwright `toHaveScreenshot` with `mask` on dynamic regions. | Unintended visual change — the miss class humans are worst at | Free | [visual-regression skill](https://github.com/maxrihter/claude-skill-visual-regression) |
| 5 | **A design-review agent pass before you look.** Adopt OneRedOak's seven phases and four-level triage; drive it with Playwright MCP (a11y snapshot first, screenshot for evidence). | "It's broken" and gross a11y/responsive misses; *not* subtle taste | Free + tokens | [OneRedOak](https://github.com/OneRedOak/claude-code-workflows), [playwright-mcp](https://github.com/microsoft/playwright-mcp) |
| 6 | **A converge pass instead of a spec practice.** Skip the up-front spec ceremony; after the build, run the `/speckit.converge` motion — re-read the artifact against the intent and file the delta as tasks. | The miss you have not noticed yet | Free | [Spec Kit](https://github.com/github/spec-kit) |
| 7 | **One eval case per recurring miss class**, with a deterministic grader where possible and an `llm` rubric only for short judgments — run with the no-plugin baseline so you know the rule is what fixed it. | Generator regression; false confidence that your rule worked | Model calls | [plugin-evals docs](https://code.claude.com/docs/en/plugin-evals) |
| 8 | **A hosted visual-diff service only when you outgrow the local screenshot gate.** Argos first (MIT core, agent-ready CLI, captures locally so you control the snapshot count). | Review UX for diffs across a team | Free tier, then metered `[pricing unverified]` | [Argos](https://github.com/argos-ci/argos) |

**The one thing to build yourself, because nobody sells it:** a **miss ledger** — one row per miss, carrying the artifact and commit, the defect class, the severity, *where the fix landed* (hook / schema / rule / REVIEW.md / exemplar / test), and whether it recurred afterwards. Every mechanism in this survey writes to a different silo; the ledger is the join. It is the same object [design-sdlc/03](../design-sdlc/03-prototype-governance-outside-the-codebase.md) and [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) already specified, and the "did it recur?" column is the one that would finally measure the ratchet.

---

## The tooling table

Stars, licences, archival status and dates in this table were read live from the GitHub repository page or the GitHub API on 12 September 2026; Claude Code rows were read from the vendor documentation the same day. **No closed-vendor price is stated**, because no vendor pricing page was reachable from this session — those cells carry `[pricing unverified]`.

| Tool | Category | Licence / price | Where it fits in the miss→patch→rubric loop | Verdict |
|---|---|---|---|---|
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Spec-first | MIT · 136,011★ | `analyze` before build; **`converge` after build files the delta as tasks** | **Take `converge`, skip the ceremony** |
| [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | Spec-first | MIT · 52,943★ | "Learn and Adjust" phase loops back to planning | Heavy for one designer; the phase model is the takeaway |
| AWS Kiro | Spec-first, closed | Closed · `[pricing unverified]` | EARS requirements compiled into property-based tests | Most interesting idea in the category; unverifiable here |
| Tessl | Spec registry, closed | Closed · `[pricing unverified]` | Library-API hallucination, not design misses | Peripheral |
| [Claude Code plan mode](https://code.claude.com/docs/en/permission-modes) | Plan-first | Included | Cheapest pre-build gate; read-only browser calls are prompt-free | **Default on** |
| [CLAUDE.md / `.claude/rules`](https://code.claude.com/docs/en/memory) | Rules | Included · free | Where a phrasable miss becomes a durable line | **Use, under 200 lines, path-scoped** |
| [AGENTS.md](https://github.com/openai/agents.md) | Rules convention | MIT · 24.3k★ · 491,520 root files indexed | Cross-vendor portability of the same lines | **Adopt via `@AGENTS.md` import from CLAUDE.md** |
| [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | Rules library | CC0-1.0 · 40.8k★ | Starting rule text by stack | Library, not a generator |
| [Claude Code auto memory](https://code.claude.com/docs/en/memory) | Memory | Included | `feedback` notes = the closest shipped ratchet | **On, but machine-local and unversioned** |
| [Claude Code Review + `REVIEW.md`](https://code.claude.com/docs/en/code-review) | Review agent | Team/Enterprise · $15–25/review per its own docs | **The only tunable review rubric on the market** | **The single most relevant product in this survey** |
| [`/code-review` (local)](https://code.claude.com/docs/en/code-review) | Review agent | Included | Pre-push pass; `--fix`, `--comment`, effort levels | Use — but note it **ignores `REVIEW.md`** |
| [claude-code-action](https://github.com/anthropics/claude-code-action) | Review CI | MIT · 8.9k★ | Self-hosted review with your own prompt | Use if you need CI you control |
| [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) | Review agent | MIT · 13.0k★ | Only mature OSS reviewer; multi-forge | Best OSS fallback |
| CodeRabbit / Greptile / Cursor Bugbot | Review agents | Closed · `[pricing unverified]` | Backend correctness | Benchmarks are contradictory (§6.3); not design-relevant |
| [OneRedOak design review](https://github.com/OneRedOak/claude-code-workflows) | **Design** review agent | MIT · 3.9k★ | 7 phases, 4-level triage, Playwright MCP | **The category, entire** |
| [playwright-mcp](https://github.com/microsoft/playwright-mcp) | Browser loop | Apache-2.0 · 37,035★ | A11y-snapshot-first evidence capture | **Default** |
| [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Browser loop | Apache-2.0 · 51,748★ | Console, network, perf traces | Complement for "it errors / it's janky" |
| [Claude in Chrome](https://code.claude.com/docs/en/chrome) | Browser loop | Pro/Max/Team/Ent | Authenticated app states; design verification | Use when fixtures are the obstacle |
| [browser-use](https://github.com/browser-use/browser-use) | Browser agent | MIT · 114.3k★ | Task completion | Over-powered for review |
| [Stagehand](https://github.com/browserbase/stagehand) | Browser agent | MIT · 24,251★ | Self-healing selectors on regenerated DOM | Use when anchors keep breaking |
| [Argos](https://github.com/argos-ci/argos) | Visual regression | **MIT** · 622★ · free tier then metered `[pricing unverified]` | Deterministic visual gate + review UI | **Only maintained OSS-core option** |
| Chromatic | Visual regression | Closed · `[pricing unverified]` | Storybook-native gate | Strong if you already run Storybook |
| Percy | Visual regression | Closed · public pricing page reported withdrawn `[search summary]` · `[pricing unverified]` | Gate | **Avoid new adoption** |
| [Lost Pixel](https://github.com/lost-pixel/lost-pixel) | Visual regression | MIT · **archived 22 Apr 2026** | — | **Dead — team joined Figma** |
| [BackstopJS](https://github.com/garris/BackstopJS) | Visual regression | MIT · 7.2k★ | — | **Seeking a maintainer; do not start here** |
| Playwright `toHaveScreenshot` | Regression net | Apache-2.0 · free | Zero-service pixel gate | **Start here** |
| [storybook test-runner](https://github.com/storybookjs/test-runner) | Regression net | MIT · 278★ · v0.24.0 | Stories as tests | Superseded by the Vitest addon for Vite projects |
| [claude-skill-visual-regression](https://github.com/maxrihter/claude-skill-visual-regression) | Regression net | MIT · **1★** | Baselines in git, 3 viewports, Docker, font/animation freeze | **Read the design, don't depend on the repo** |
| [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) | Eval / rubric | Included · model cost | Rubric graders + **no-plugin control arm** + CI gate | **Best fit for grading a generator** |
| [promptfoo](https://github.com/promptfoo/promptfoo) | Eval | MIT · 25,046★ · **now part of OpenAI** | Declarative prompt/pipeline evals | Still the default local harness |
| [DeepEval](https://github.com/confident-ai/deepeval) | Eval / rubric | Apache-2.0 · 18,237★ | **G-Eval custom-criteria rubric metric**, pytest-shaped | **New candidate pick** |
| [Inspect](https://github.com/UKGovernmentBEIS/inspect_ai) | Eval | MIT · 2,755★ | Model-graded evals, auditable | Overkill for one designer |
| [autoevals](https://github.com/braintrustdata/autoevals) | Eval library | MIT · ~1,000★ | 40+ scorers without a platform account | Cheapest judge-scorer import |
| Braintrust | Eval platform | Closed · `[pricing unverified]` | Scoring platform | Retention kills the ratchet |
| LangSmith | Eval platform | Closed · `[pricing unverified]` | Tracing platform | Weakest fit for a designer |
| [openai/evals](https://github.com/openai/evals) | Eval | MIT · 19.4k★ | Superseded by the OpenAI dashboard | Do not adopt new |

---

## Gaps with no product

Condensed from §10, stated as build-or-hand-roll items:

1. **Correction → proposed rule diff.** No product. Hand-rolled as an end-of-session prompt. *(Highest-value skill to author.)*
2. **Rules-file conflict linter.** No product. `/doctor` trims, it does not detect contradiction.
3. **Design-defect recall benchmark for review agents.** No public measurement, for any product.
4. **A design rubric library with anchors.** No product, no open corpus.
5. **The miss ledger — artifact × defect class × fix altitude × recurrence.** No product; three vendor silos that do not join.
6. **A review rubric that applies locally as well as in CI.** `REVIEW.md` is read by the managed service only.
7. **UI characterisation-test generator.** No product.
8. **Screenshot diff → rubric criterion mapping.** No product; every service stops at "approve/reject."
9. **Shared, versioned agent memory for a small team.** Auto memory is machine-local by design.
10. **Any measurement of whether the ratchet works.** No public data, anywhere.

---

## Candidate picks for skill-resources

Flagged for the curated collection, at the verification bar set by [guardrails-and-evals.md](../../../skill-resources/guardrails-and-evals.md) (repo exists, actively maintained, contents read, honestly judged, licence and star count stated, caveats named). **Checked against the existing collection: CodeRabbit, Greptile, Bugbot, Stagehand, Argos, BackstopJS, pr-agent, autoevals, DeepEval and `REVIEW.md` appear nowhere in `skill-resources/` today; OneRedOak, playwright-mcp, chrome-devtools-mcp, Chromatic, promptfoo, Braintrust, LangSmith and Inspect already do.**

### For a new or existing review-and-feedback / eval file

1. **Claude Code Review's `REVIEW.md`** — [code.claude.com/docs/en/code-review](https://code.claude.com/docs/en/code-review). *Why:* it is the only published, tunable review-rubric format; the six levers (severity redefinition, nit cap, skip rules, repo-specific checks, verification bar, re-review convergence) are directly reusable as a template even if you never enable the managed service. *Caveats:* Team/Enterprise, research preview, $15–25 per review, **not read by the local `/code-review`**, and its own docs warn that length dilutes it. **Strongest pick in this document.**
2. **`claude plugin eval`** — [code.claude.com/docs/en/plugin-evals](https://code.claude.com/docs/en/plugin-evals). *Why:* rubric graders as plain markdown, four free deterministic grader types, and a **no-plugin baseline** that answers "did my change actually do anything" — the control arm [eval-tuning-loops](../eval-tuning-loops/00-synthesis.md) says every loop needs. *Caveats:* requires v2.1.269+; **no custom-code graders**, so DOM-metric grading must be bolted on via a file + `regex`; every run costs model calls.
3. **DeepEval** — [github.com/confident-ai/deepeval](https://github.com/confident-ai/deepeval) · **18,237★ · Apache-2.0**. *Why:* the pytest-shaped harness with **G-Eval**, a research-backed judge metric that takes arbitrary custom criteria — i.e. a rubric — and lives beside your other tests. Fills the one hole in the collection's eval lineup. *Caveats:* Python-only; 583 open issues; judge cost and judge variance are yours to manage ([02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).
4. **qodo-ai/pr-agent** — [github.com/qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) · **13.0k★ · MIT (per repo page)**. *Why:* the only mature open-source PR reviewer; multi-forge, any model via LiteLLM; the OSS fallback when a managed reviewer is not an option. *Caveats:* backend-flavoured defaults; community-maintained and distinct from Qodo's commercial product.

### For hooks / regression nets

5. **Argos** — [github.com/argos-ci/argos](https://github.com/argos-ci/argos) · **622★ · MIT**. *Why:* after Lost Pixel's archival and BackstopJS's maintainer notice, **the only actively-maintained open-source-core visual-regression platform**; captures happen locally in your own test browser, so you control how many snapshots exist. *Caveats:* small project (622★); the hosted plan is closed even though the core is MIT, and **its pricing could not be read from this session** — verify the free tier and the per-screenshot rate before committing.
6. **maxrihter/claude-skill-visual-regression** — [repo](https://github.com/maxrihter/claude-skill-visual-regression) · **1★ · MIT**. *Why:* a correct, minimal recipe — Playwright `toHaveScreenshot`, baselines in git, three viewports, Docker for font stability, **animation freezing and font stabilisation in the fixture** — for a hook recipe the repo could author itself. *Caveat, stated plainly:* **one star, fifteen commits, single author.** This is a design to copy, not a dependency to take. Flag it that way or not at all.

### For prototype-governance / rules

7. **Spec Kit's `converge` / `analyze` / `checklist` motion** — [github.com/github/spec-kit](https://github.com/github/spec-kit) · **136,011★ · MIT**. *Why:* `converge` ("assess the codebase against spec/plan/tasks and append remaining work as new tasks") is the only shipped command anywhere that reads the built thing back against the intent and files the gap. Worth adopting as a *command*, independent of spec-driven development as a philosophy. *Caveats:* the surrounding methodology is contested (§2.2, §4); the evidence that spec-first reduces misses is weak-to-negative.
8. **The AGENTS.md bridge pattern** — [openai/agents.md](https://github.com/openai/agents.md) · 24.3k★ · MIT, plus the fetched [Claude Code memory docs](https://code.claude.com/docs/en/memory). *Why:* `AGENTS.md` is now at **491,520 indexed root files** against `CLAUDE.md`'s 530,432 — a real cross-vendor convention. The collection's [rules.md](../../../skill-resources/rules.md) should carry the three supported bridges (`@AGENTS.md` import, symlink, `/import`) and the fact that Claude Code does **not** read it natively. *Caveats:* no formal spec; the governance claims (Linux Foundation / Agentic AI Foundation) are `[search summary]` only.

### Explicitly **not** recommended

- **Lost Pixel** — archived 22 April 2026, team joined Figma. Remove from any future shortlist.
- **BackstopJS** — 7.2k★ but publicly seeking a new maintainer.
- **Percy** — public pricing withdrawn; reported tier inflation.
- **openai/evals** — superseded by OpenAI's dashboard; no reason to adopt new.
- **Any AI-code-review benchmark number** from the 2026 comparison-post genre — §6.3 shows they contradict each other on the same tools.

---

## Sources

### Fetched and read in full (12 September 2026)

**Claude Code documentation (code.claude.com)**
- [Memory: CLAUDE.md, `.claude/rules/`, auto memory](https://code.claude.com/docs/en/memory) [fetched]
- [Code Review and `REVIEW.md`](https://code.claude.com/docs/en/code-review) [fetched]
- [Use Claude Code with Chrome](https://code.claude.com/docs/en/chrome) [fetched]
- [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals) [fetched]
- [Choose a permission mode (plan mode)](https://code.claude.com/docs/en/permission-modes) [fetched]
- [Documentation index](https://code.claude.com/docs/llms.txt) [fetched]

**GitHub repositories and files**
- [github/spec-kit](https://github.com/github/spec-kit) and [README](https://raw.githubusercontent.com/github/spec-kit/main/README.md) [fetched]
- [github/spec-kit discussion #152 "Evolving specs"](https://github.com/github/spec-kit/discussions/152) [fetched]
- [github/spec-kit discussions listing](https://github.com/github/spec-kit/discussions) [fetched]
- [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) and [discussions](https://github.com/bmad-code-org/BMAD-METHOD/discussions) [fetched]
- [kirodotdev/Kiro](https://github.com/kirodotdev/Kiro) [fetched]
- [openai/agents.md](https://github.com/openai/agents.md) and [README](https://raw.githubusercontent.com/openai/agents.md/main/README.md) [fetched]
- [openai/codex](https://github.com/openai/codex) [fetched]
- [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) [fetched]
- [anthropics/claude-code issue #6235 (AGENTS.md support)](https://github.com/anthropics/claude-code/issues/6235) [fetched]
- [anthropics/claude-code issue search: "not following CLAUDE.md"](https://github.com/anthropics/claude-code/issues?q=is%3Aissue+%22not+following%22+CLAUDE.md) [fetched]
- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) [fetched]
- [qodo-ai/pr-agent](https://github.com/qodo-ai/pr-agent) [fetched]
- [coderabbitai organization](https://github.com/coderabbitai) [fetched]
- [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) and [design-review-agent.md](https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md) [fetched]
- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) [fetched]
- [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) [fetched]
- [browser-use/browser-use](https://github.com/browser-use/browser-use) [fetched]
- [browserbase/stagehand](https://github.com/browserbase/stagehand) [fetched]
- [argos-ci/argos](https://github.com/argos-ci/argos) [fetched]
- [lost-pixel/lost-pixel](https://github.com/lost-pixel/lost-pixel) and [README sunset notice](https://raw.githubusercontent.com/lost-pixel/lost-pixel/main/README.md) [fetched]
- [garris/BackstopJS](https://github.com/garris/BackstopJS) [fetched]
- [chromaui/chromatic-cli](https://github.com/chromaui/chromatic-cli) [fetched]
- [percy/cli](https://github.com/percy/cli) [fetched]
- [storybookjs/test-runner](https://github.com/storybookjs/test-runner) [fetched]
- [maxrihter/claude-skill-visual-regression](https://github.com/maxrihter/claude-skill-visual-regression) [fetched]
- [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) and [README](https://raw.githubusercontent.com/promptfoo/promptfoo/main/README.md) [fetched]
- [confident-ai/deepeval](https://github.com/confident-ai/deepeval) [fetched]
- [UKGovernmentBEIS/inspect_ai](https://github.com/UKGovernmentBEIS/inspect_ai) [fetched]
- [braintrustdata/autoevals](https://github.com/braintrustdata/autoevals) [fetched]
- [openai/evals](https://github.com/openai/evals) [fetched]
- [sudokar/openspec-plus](https://github.com/sudokar/openspec-plus) [fetched via API search]

**GitHub API / code-search queries run today** (counts of indexed public files): `filename:AGENTS.md path:/` → 491,520 · `filename:CLAUDE.md path:/` → 530,432 · `path:.cursor/rules extension:mdc` → 182,784 · `path:.claude/rules extension:md` → 79,232 · `filename:REVIEW.md path:/` → 25,024 (contaminated) · `filename:.cursorrules path:/` → 20,672. Repository metadata (stars, forks, licence, created/pushed dates) read via the GitHub API on 12 September 2026.

### `[search summary]` only — page blocked by this session's egress proxy, not independently verified

Each entry below is named with its exact publication and year so a wider-egress session can verify it directly. None of these pages was read.

- Hacker News threads: [Spec-Driven Development: The Waterfall Strikes Back](https://news.ycombinator.com/item?id=45935763) · [Ask HN: Are you still using spec driven development?](https://news.ycombinator.com/item?id=46864948) · [Ask HN: What Happened to Spec-Driven Development?](https://news.ycombinator.com/item?id=49182353) · [Toolkit to help you get started with SDD](https://news.ycombinator.com/item?id=45798473) · [id=45512617](https://news.ycombinator.com/item?id=45512617) [search summary]
- [Stack Overflow Developer Survey 2025 — AI section](https://survey.stackoverflow.co/2025/ai) and [Closing the developer AI trust gap](https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/) [search summary]
- [DORA — State of AI-assisted Software Development 2025](https://dora.dev/dora-report-2025/) [search summary]
- [JetBrains State of Developer Ecosystem 2025](https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/) [search summary]
- [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/what-986-million-code-pushes-say-about-the-developer-workflow-in-2025/) [search summary]
- [METR — Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) [search summary]
- [InfoQ — When Spec-Driven Development Pays Off](https://www.infoq.com/articles/when-spec-driven-development-pays-off/) (source of the GAISS 2026 reference) [search summary]
- [arXiv 2608.02639 — Instruction Stacking Collapse](https://arxiv.org/abs/2608.02639) [search summary]; [arXiv 2507.11538 — IFScale](https://arxiv.org/abs/2507.11538) (already cited in [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) [search summary]
- [Kiro — Correctness / property-based testing](https://kiro.dev/blog/property-based-testing/) and [GA announcement](https://kiro.dev/blog/general-availability/) [search summary]
- [Tessl — spec-driven framework and registry](https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry) [search summary]
- [Argos — Visual Testing Pricing in 2026](https://argos-ci.com/blog/visual-testing-pricing) and [Argos pricing](https://argos-ci.com/pricing) [search summary]
- [Greptile AI code review benchmarks](https://www.greptile.com/benchmarks) · [Cursor — Updates to Bugbot for Teams and Individuals](https://cursor.com/blog/may-2026-bugbot-changes) · [Greptile per-review pricing](https://www.agent-wars.com/news/2026-05-01-greptile-per-review-pricing) [search summary]
- [Braintrust pricing analysis](https://www.truefoundry.com/blog/braintrust-pricing) · [Braintrust vs LangSmith](https://www.morphllm.com/comparisons/braintrust-vs-langsmith) [search summary]
- [Bessemer — Inside Shopify's AI-first engineering playbook](https://www.bvp.com/atlas/inside-shopifys-ai-first-engineering-playbook) [search summary]
- [Anthropic — How Anthropic secures its AI-native software development lifecycle](https://claude.com/blog/how-anthropic-secures-its-ai-native-software-development-lifecycle) — linked from the fetched Code Review docs; the page itself was blocked [search summary]
- [AGENTS.md field guide 2026](https://www.iuriio.com/blog/posts/2026/05/agents-md-field-guide-2026) (source of the "60,000 repositories" and Linux Foundation claims) [search summary]

### Not verified at all

- Vendor-adjacent SDD figures ("38% less rework", "PR review 47→19 minutes", "56% fewer regression bugs") — no traceable methodology found; **do not cite**.
- The 2026 AI-code-review benchmark numbers in §6.3 — mutually contradictory across sources; reported only to document the contradiction.
