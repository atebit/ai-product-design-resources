# The Practitioner Field Guide — What Can Be Established About Generate → Iterate → Test → Miss → Patch When X Itself Is Unreachable

**Scope:** Document 05 of the iteration-repair-and-rubrics stream, and the one the repo owner asked for by name: *"Look on twitter because that's where everyone is at."* It answers one question — how are people on X/Twitter actually running the loop where AI builds it, they vibe-code a few rounds, they test, something was missed, and they patch — and a second question the first forces: how much of what X says about that is method and how much is marketing. It covers the workflows people describe, how they handle the miss specifically, the rules-file/rubric culture that has grown up around it, the places the timeline genuinely splits, and the viral claims that do not survive checking. It builds on the grading stack in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), the fix-altitude ladder in [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md), the surgical-patch mechanics in [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md), the guardrail ladder in [design-sdlc/04](../design-sdlc/04-small-model-guardrails.md) and the feedback surfaces in [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) — none of which is restated. Explicitly out of scope and owned elsewhere in this stream: the taxonomy of misses (doc 01), the mechanics of repair itself (doc 02), and non-X community venues plus the tooling landscape — Reddit, Hacker News, YouTube, newsletters-as-primary-sources, and the products — which belong to doc 06. **Read the verification ledger immediately below before anything else.** X/Twitter was completely unreachable from this session, so this document is not the field guide the brief asked for. It is the honest remainder: what practitioner practice can be established from the sources that *were* reachable (GitHub, and the Claude Code documentation), what the X-specific layer would add on top, and an explicit list of what a session with X access must go and re-verify. Verified live September 2026; every claim carries an evidence grade; nothing is quoted that was not seen rendered.

---

## ⚠ Verification ledger — read first

**What was attempted and what happened, today, 12 September 2026.**

| Host | Result |
|---|---|
| `x.com`, `twitter.com` | `EGRESS_BLOCKED` at the network proxy (`WebFetch`); no connection via `curl` |
| `nitter.net`, `xcancel.com`, `threadreaderapp.com`, `typefully.com` | Blocked / connection refused. **Every mirror route the brief anticipated failed.** |
| `reddit.com`, `news.ycombinator.com`, `hn.algolia.com`, `substack.com` | Blocked |
| `metr.org`, `arxiv.org`, `dora.dev`, `martinfowler.com`, `simonwillison.net`, `en.wikipedia.org`, `agents.md`, `www.anthropic.com` | Blocked |
| **`github.com`, `raw.githubusercontent.com`, `gist.github.com`** | **Reachable — read in full** |
| **`code.claude.com`** | **Reachable — read in full** |
| `WebSearch` | Works. Returns titles, URLs and an index-derived summary. **This is not page verification and is never treated as such below.** |

**Consequences, stated plainly:**

1. **The assignment as briefed — quote real posts verbatim, with dates and engagement — is not achievable in this session.** Not one X post in this document was read on x.com.
2. **No post date, like count, view count, repost count or reply is reported anywhere in this document.** None was observable.
3. Where an x.com URL is cited, the artefact I actually saw is a **search-result listing**: a URL paired with the title string the search index returned. X populates that title string from the post's opening text, so it is informative about wording — but it truncates (roughly 250–280 characters), it is the index's copy rather than the page, and I did not open the page. Every such citation is marked **[search result only]** and the reproduced text is presented as *the listing text*, not as a quotation from a post I read.
4. **No handle, quote, date or number in this document is invented or reconstructed.** Where I expected to find something and could not, §"What a session with X access must verify" names it.
5. **The pivot that saved the document:** the X discourse about this loop has a large, readable GitHub footprint — rules-file repos, workflow-template repos, review-agent prompts, and the issue threads where the same complaints are argued out. Those are *primary evidence of what practitioners do*, fetchable to the line, and they carry the weight of §3 and §4. The venue is not X, and that is named rather than hidden.

**Rough honest split of this document by evidence strength:** about 40% rests on fully fetched primary artifacts (GitHub repos and files, Claude Code docs); about 45% on search-result listings from x.com that were never opened; about 15% on search-engine summaries that establish nothing and are flagged as leads. Sections 3, 4 and the Recommendations table are the fetched core and are the parts to rely on. Sections 2, 5 and the practitioner table are the search-listing layer and should be re-verified. Section 6 is the weakest and says so.

---

## Table of Contents

1. [How this was verified, and what that costs](#1-how-this-was-verified-and-what-that-costs)
2. [The workflows the timeline describes](#2-the-workflows-the-timeline-describes)
3. [How X handles the miss, specifically](#3-how-x-handles-the-miss-specifically)
4. [The rules-file and rubric culture, measured](#4-the-rules-file-and-rubric-culture-measured)
5. [Where the timeline genuinely splits](#5-where-the-timeline-genuinely-splits)
6. [Claims that do not survive checking](#6-claims-that-do-not-survive-checking)
7. [Signal-to-noise verdict](#7-signal-to-noise-verdict)
8. [Cross-cutting themes](#cross-cutting-themes)
9. [Recommendations: the de-marketed loop](#recommendations-the-de-marketed-loop)
10. [Practitioner table](#practitioner-table)
11. [What the timeline agrees on](#what-the-timeline-agrees-on)
12. [What the timeline disagrees on](#what-the-timeline-disagrees-on)
13. [What a session with X access must verify](#what-a-session-with-x-access-must-verify)
14. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
15. [Sources](#sources)

---

## 1. How this was verified, and what that costs

**What it is:** X/Twitter could not be fetched at all from this session, and neither could any of the standard mirrors. This section states exactly what that means for the rest of the document, and defines the evidence grade attached to every claim below.

**Why it matters:** The house standard is that a quote must be text seen rendered on a fetched page. Under that standard most of this document would be empty. The honest alternative is not to drop the evidence but to grade it, so a reader can discount each line by how it was obtained. An "80% confident, here is why" is worth more to this repo than a confident paraphrase of something nobody opened.

**Key findings:**

The blocked-host table is in the ledger at the top of this document and is not repeated. The consequence worth restating here is the one that shaped the research: **the platform resisted verification completely, and so did every secondary mirror.** What survived was GitHub and the Claude Code documentation — which turned out to be less crippling than it sounds, because *the artifacts X practitioners argue about are published on GitHub*. Their rules files, review agents and workflow repos are measurable to the line. The strongest parts of this document (§3 and §4) are strong precisely because they stopped being about what someone said and became about what someone shipped.

**The evidence grades used throughout.** Every citation below carries exactly one:

| Grade | What I actually saw | How much to trust it |
|---|---|---|
| **[fetched]** | The page was rendered and read in this session today. Quotation marks around text at this grade mean a genuine verbatim quote from that render. | Full — house standard met. |
| **[search result only]** | **A search-result listing: a URL paired with the title string the index returned.** The x.com page was never opened. X populates that title string from the post's opening text, so the wording is informative — but it is the index's copy, it truncates at roughly 250–280 characters, and it is not the page. Text reproduced at this grade is presented as *listing text*, never as a quotation from a post I read. | Moderate for the existence of the post and the gist of its opening; **zero** for anything past the truncation, for the date, for authorship beyond the handle in the URL, and for any engagement figure. |
| **[mirror-quoted]** | A quotation printed inside a third-party page that *was* fetched (in practice, a GitHub README), attributed there to a named handle with a link. | Medium — the mirror is a real fetched artifact, but its transcription is unverified and its curator is an interested party. |
| **[search-summary]** | Only the search engine's own paraphrase. No primary text of any kind. | Low — a lead, never a finding. Numbers at this grade are reported as *claimed*, never as established. |

**Three things this document therefore refuses to do.** It does not report a single engagement number (likes, views, reposts) for any post, because none was visible on any fetched page. It does not report a post date unless a fetched page stated one. And it does not attribute a position to a handle on the strength of a search engine's summary alone — where that is all there was, the finding says so and the claim is downgraded to "a lead".

**Open questions:** Whether an authenticated X session would materially change the picture is untestable here. My suspicion, from the shape of what the search index *did* return, is that it would add volume and engagement metrics but few new positions — the same dozen arguments recur under hundreds of handles, which is itself finding §7.

---

## 2. The workflows the timeline describes

**What it is:** The named, repeated loops people on X say they run. Seven recur often enough to be called patterns rather than posts.

**Why it matters:** The owner's question presumes a loop — build, vibe-code a few rounds, test, find a miss, patch. The timeline's workflows are best understood as different answers to *where in that loop the leverage is*: before generation (spec/plan), during (verification harness), or after (review pass). Almost every argument on X is really an argument about which of those three to invest in.

**Key findings:**

| Pattern | Canonical statement | Advocate | Grade | Critic / counterweight |
|---|---|---|---|---|
| **Plan-then-build** | "This is the loop that makes vibe coding actually work. It's how I build real products with Cursor and Claude Code: 1/ Load the full project context (PRD, Implementation Plan, etc.) 2/ Pick up a feature from the implementation plan 3/ Ask for different approaches first, not…" | [@PrajwalTomar_](https://x.com/PrajwalTomar_/status/1947272871967174720) | [search result only] | Anthropic's own docs: "Plan mode is useful, but also adds overhead… If you could describe the diff in one sentence, skip the plan" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)) [fetched] |
| **Spec-first** | "New course: Spec-Driven Development with Coding Agents… Vibe coding is fast, but often produces code that doesn't match what you asked for. This short course teaches you spec-driven development: write a detailed sp…" | [@AndrewYNg](https://x.com/AndrewYNg/status/2044449830605582629) | [search result only] | "technically actually a good post but the title 'spec is the new code' harks back to the 'all the code is assembly' idea which is WAYY far out. If you start behaving like you'll be able to ship and maintain production software without reading the code, you're in for a hard…" — [@dexhorthy](https://x.com/dexhorthy/status/2033392483674264044) [search result only] |
| **Checkpoint-and-restart-often** | "I run 5 Claudes in parallel in my…"; "10/ Use git worktrees… Worktrees are essential for doing lots of parallel work in the same repository. I have dozens of Claudes running at all times, and this is how I do it. Use `claude -w` to start a new session in a worktr…" | [@bcherny](https://x.com/bcherny/status/2038454353787519164) (creator of Claude Code) | [search result only] | Same author, same account: "My setup might be surprisingly vanilla! Claude Code works great out of the box, so I personally don't customize it much. There is no one correct way to…" ([@bcherny](https://x.com/bcherny/status/2007179832300581177)) [search result only] |
| **Test-first for agents** | The failing test is written *before* the fix; encoded as a rule file: "Write failing test that demonstrates the bug" ([`bug-fix.mdc`](https://raw.githubusercontent.com/steipete/agent-rules/main/project-rules/bug-fix.mdc)) | [@steipete](https://x.com/steipete/status/1933138957719556586) / `steipete/agent-rules` | **[fetched]** (the rule file); [search result only] (the post announcing the repo) | Covered in §5.3 — the "tests slow me down" camp exists but I could not locate a citable X statement of it; see the ledger |
| **Screenshot / browser-MCP self-correction** | "Seeing more Amp users adjust their codebase to streamline agentic automation. This entails smoothing the feedback loops the agent uses to validate progress on more complex tasks. Example: for UI work, use storybook and the playwright MCP server for a fast robust feedback loop." | [@beyang](https://x.com/beyang/status/1927829076192153746) (Sourcegraph / Amp) | [search result only] | The vendor's own framing is narrower — screenshots are *one* check among "a test suite, a build exit code, a linter, a script that diffs output against a fixture, or a browser screenshot compared against a design" [fetched] |
| **Subagent / adversarial review pass** | "Automated feedback on frontend PRs for UI and UX consistency and accessibility before merge" — [@AnandChowdhary](https://x.com/AnandChowdhary/status/1958306807899934738) on [@PatOakEllis](https://github.com/OneRedOak/claude-code-workflows)'s workflows | `OneRedOak/claude-code-workflows`, 3.9k stars, MIT | **[fetched]** (repo + agent file); [search result only] (the post) | Anthropic's warning, verbatim: "A reviewer prompted to find gaps will usually report some, even when the work is sound, because that is what it was asked to do. Chasing every finding leads to over-engineering" [fetched] |
| **Loop-until-clean ("Ralph")** | "The Ralph Wiggum loop or technique is basically putting an AI coding agent in an infinite loop, feed it its own mistakes on the go, and let it brute-force its way to completing the task at hand." — [@unclebigbay143](https://x.com/unclebigbay143/status/2015157068991258721) | Originated by [@GeoffreyHuntley](https://x.com/GeoffreyHuntley/status/2012082344921117182); reimplemented by [@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348) and [@nicopreme](https://x.com/nicopreme/status/2013784416234152452) | [search result only] | The reimplementations disagree with each other about the *definition* — see below |

**The Ralph disagreement is the most informative thing on the timeline about repair.** Two people who built the loop describe opposite mechanics:

- Rizèl Scarlett: "I just engineered a Ralph Wiggum loop for goose. After hearing Geoffrey Huntley talk about how the Claude Code version was not quite what he had in mind, I built a version that feels closer to the original idea, **where context resets every iteration instead of accumulating**" ([@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348)) [search result only].
- Nico Bailon: "Wrapped a simple 'Ralph Wiggum' inspired loop into a Pi coding agent extension that **makes the agent review its own code over and over until it stops finding bugs**. It sounds dumb but can confirm this trick consistently catches issues without causing regressions. Does not replace…" ([@nicopreme](https://x.com/nicopreme/status/2013784416234152452)) [search result only].

Those are different systems wearing one name. The first is *stateless retry* — the miss is repaired by a fresh agent that never saw the failed attempt. The second is *accumulating self-review* — the same agent keeps grinding. The timeline uses one label for both, which is exactly how a method becomes a meme. Whether either actually reduces regressions is unmeasured: Bailon's "can confirm" is an anecdote from one person about one extension, and nobody on the timeline has published a before/after.

**The vendor doctrine, for calibration.** Because Anthropic's best-practices page *was* fetchable in full, it is the one high-confidence text in this section, and it is notably more conservative than the timeline. Its organising claim is a constraint, not a technique: "Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills." Its top recommendation is not planning or rules but verification — "Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available, and you become the verification loop" ([best practices](https://code.claude.com/docs/en/best-practices)) [fetched]. Four escalating gate strengths are named: in-prompt, a `/goal` condition re-checked by a separate evaluator after every turn, a Stop hook that "blocks the turn from ending until it passes" (overridden "after 8 consecutive blocks"), and "a second opinion" from a verification subagent "so the agent doing the work isn't the one grading it." The timeline's screenshot loop is one instance of the first row of that ladder; the timeline mostly does not discuss the other three.

**Open questions:** No X-native workflow claim in this section has a published measurement behind it. The gap between "this is my loop" and "here is the defect rate before and after" is total. Doc 06 should check whether any tooling vendor has published one.

---

## 3. How X handles the miss, specifically

**What it is:** The owner's precise question — *I tested it and x was missed, so it needs a patch; what do people actually do?* This section reports the answers the timeline gives, and is blunt about which are observed practice versus slogans.

**Why it matters:** This is where the loop either ratchets or thrashes. The [fix-altitude ladder](../eval-tuning-loops/03-feeding-grades-back-text-level.md) says the right question is not "how do I fix this" but "at what altitude do I fix this" — prompt, rule, exemplar, schema, or harness. X mostly argues at one altitude at a time and rarely names the ladder.

**Key findings:**

**3.1 — The rollback camp is the dominant practical answer, and it is boring.** The most concrete statement of it I found in any form is not on X at all but on Threads, from the same handle family as the plan-then-build advocate: "7/ Commit often & revert when stuck… → Commit after every working feature → When AI breaks something badly, just revert. Faster than debugging everything. **Real example: AI refactored state, broke 3 features. Spent 20 mins debugging. Reverted. Took different approach. Done in 10 mins.** Git is your safety net" ([@builtbyprajwal on Threads](https://www.threads.com/@builtbyprajwal/post/DWOv7eyCZUj/commit-often-revert-when-stuck-vibe-coding-era-ai-codes-fast-fast-coding-can)) [search result only]. That 20-versus-10-minutes anecdote is the only *number* anyone on the timeline attaches to the revert-vs-debug choice, and it is n=1 self-reported. Treat it as a story, not a measurement — but note that it is the story everyone tells.

The vendor documentation states the same policy with more precision and, unusually, with a threshold: "If you've corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches. Run `/clear` and start fresh with a more specific prompt that incorporates what you learned. **A clean session with a better prompt almost always outperforms a long session with accumulated corrections**" ([best practices](https://code.claude.com/docs/en/best-practices)) [fetched]. The same page lists "correcting over and over" as a named failure pattern with the fix "After two failed corrections, `/clear` and write a better initial prompt incorporating what you learned." **Two corrections is the only published stopping rule I could verify anywhere.**

**3.2 — "Never let it fix its own bug in the same context" is real as a principle, but I could not verify it as a quotable X post.** What I *can* verify is the mechanism the principle rests on, from three independent directions:

- The context-degradation claim itself, from the research account that popularised the term: "Introducing our latest technical report: Context Rot - How Increasing Input Tokens Impacts LLM Performance. **Our results reveal that models do not use their context uniformly.**" ([@trychroma](https://x.com/trychroma/status/1944835468551708905)) [search result only]. The colloquial definition on the timeline predates the report: "'context rot' is when an LLM convo degrades from irrelevant context added over time that one might stick" ([@daniel_mac8](https://x.com/daniel_mac8/status/1935479269494505580)) [search result only], with agreement from an infrastructure builder: "'context rot' is a good term and something we've seen a lot with long-running agents" ([@sarahwooders](https://x.com/sarahwooders/status/1935485477563548015)) [search result only].
- The vendor's version, which is the same rule expressed as staffing rather than hygiene: a reviewer in a fresh subagent context "sees only the diff and the criteria you give it, not the reasoning that produced the change, so it evaluates the result on its own terms," and "a fresh context improves code review since Claude won't be biased toward code it just wrote" [fetched].
- The strongest operational version, from the loop reimplementation quoted in §2: context "resets every iteration instead of accumulating" ([@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348)) [search result only].

So the principle is well-supported; the pithy X formulation of it that I expected to find, I did not find. Said plainly: **I believe this norm exists on the timeline and I could not produce a citation that meets even the [search result only] bar.** See the ledger.

**3.3 — The failing-test-first norm is codified, not just tweeted.** `steipete/agent-rules` — 5,691 stars, MIT — ships a `bug-fix.mdc` rule whose implementation phase is, verbatim from the fetched file: reproduce the issue first, then "Write failing test that demonstrates the bug" *before* the fix, then verify the test passes, then run the complete test suite; finalise with `fix: <description> (#<issue-number>)` and a PR containing "Fixes #<issue-number>". Its stated principles are to keep "narrow focus on the specific problem," incorporate "regression tests," document behavioural changes, and account for "edge cases or interconnected issues" ([`bug-fix.mdc`](https://raw.githubusercontent.com/steipete/agent-rules/main/project-rules/bug-fix.mdc)) [fetched]. Anthropic's prompt-level version is the same shape: "write a failing test that reproduces the issue, then fix it" [fetched]. This is the single most consistent piece of advice across every source type in this document.

**3.4 — Adding the miss to a rules file has a published threshold, and it is `3`.** The same repo's `continuous-improvement.mdc` gives an explicit ratchet with triggers and a decision rule [fetched]:

> Create new rules when: "A new technology/pattern is used in 3+ files" · "Common bugs could be prevented by a rule" · "Code reviews repeatedly mention the same feedback" · "New security or performance patterns emerge" · "A complex task requires consistent approach"

> Analysis phase: `if pattern.frequency >= 3 and not documented(pattern): create_rule_draft(pattern)`

> Maintenance: "Review monthly for usage, conduct quarterly major updates, and perform annual deprecation reviews."

This is the closest thing the practitioner world has to the rubric ratchet this stream is about, and it is worth naming precisely what it gets right and wrong. Right: a frequency threshold, an explicit draft→test-on-existing-code→feedback→publish→monitor sequence, and a scheduled deprecation review — the last being the step almost nobody does. Wrong, or at least unmeasured: "monitor effectiveness" is named but no method is given, and the file offers no way to tell whether a rule ever changed behaviour. Contrast the versioned change record and regression set in [eval-tuning-loops/03 §6](../eval-tuning-loops/03-feeding-grades-back-text-level.md), which is what this rule is reaching for.

**3.5 — The best formal answer to "what do I do about the miss" on the entire internet is a slash command, not a post.** GitHub's `spec-kit` — **136,000 stars, MIT** [fetched] — ships `/speckit.converge`, whose behaviour I read in full [fetched]. It treats `spec.md`, `plan.md` and `tasks.md` as authoritative intent, inventories every Functional Requirement (`FR-###`) and Success Criterion (`SC-###`), inspects the codebase, and classifies each finding into one of four gap types — **`missing`, `partial`, `contradicts`, `unrequested`** — with severity `CRITICAL` (constitution violations or P1 blockers), `HIGH` (core functional gaps), `MEDIUM`/`LOW`. Then the part that matters:

> **If gaps exist:** appends a new `## Phase N: Convergence` section to `tasks.md` with zero-padded task IDs, each tracing back to its source requirement, ordered by severity.
> **If no gaps exist:** leaves `tasks.md` byte-for-byte unchanged and reports "✅ Converged — the implementation satisfies the spec, plan, and tasks."
> **Never modifies spec, plan, or application code** — only appends new tasks and reports findings.

That last line is the discipline the timeline lacks. The tool that finds the miss is structurally forbidden from patching it. The `unrequested` gap type is also worth stealing wholesale: it catches the class of miss this stream's doc 01 will call *scope drift* — the agent added something nobody asked for — which pure requirement-coverage checking misses by construction.

**3.6 — The design-side answer is a triage matrix.** `OneRedOak/claude-code-workflows` (3.9k stars, MIT) ships a design-review subagent whose fetched prompt specifies a "Live Environment First" methodology, seven phases (preparation → interaction → responsiveness at 1440/768/375px → visual polish → WCAG 2.1 AA accessibility → robustness/edge cases/error states → code health and design-token usage), and a four-level triage: **`[Blocker]` / `[High-Priority]` / `[Medium-Priority]` / `[Nitpick]`**. Its communication rule is "problems over prescriptions — describing impact rather than prescribing solutions," with screenshot evidence ([design-review-agent.md](https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md)) [fetched]. Compare the severity and location requirements in [eval-tuning-loops/01 §4](../eval-tuning-loops/01-grading-generated-prototypes.md): this agent records severity but not location, so its output cannot be traced back to the code statement responsible.

**Open questions:** Nobody publishes the *outcome* of these protocols. There is no public dataset of "miss found → repair attempted → did it regress something else." Given that the recurrence question is the owner's actual worry, this is the single largest hole in the practitioner literature.

---

## 4. The rules-file and rubric culture, measured

**What it is:** CLAUDE.md, AGENTS.md, `.cursorrules`, DESIGN.md, `.mdc` rule packs and design-review agents — the accumulated-criteria layer. This section measures it instead of describing it, because GitHub was fetchable and X was not.

**Why it matters:** This is the layer where a miss is supposed to become durable. If it works, the loop ratchets; if it does not, every session pays for the same lesson again. The timeline is loud about the first possibility and quiet about the evidence for the second.

**Key findings:**

**4.1 — The corpus, with numbers.** All figures read from GitHub today [fetched]:

| Repo | Stars | License | Status / dates | What it actually is |
|---|---|---|---|---|
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | **40,772** | — | created 2024-09-16, updated 2026-09-12 | Per-stack `.cursorrules` files; overwhelmingly framework boilerplate |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | **53,929** | — | created 2025-04-19, updated 2026-09-12 | Index of skills, agents, statuslines, tooling |
| [github/spec-kit](https://github.com/github/spec-kit) | **136,000** | MIT | 1,969 commits | Spec-driven workflow as slash commands |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | **25,029** | — | created 2025-07-30 | "100+ specialized Claude Code subagents" |
| [steipete/agent-scripts](https://github.com/steipete/agent-scripts) | **6,600** | MIT | 658 commits | Current canonical rules of a leading power user |
| [steipete/agent-rules](https://github.com/steipete/agent-rules) | **5,691** | MIT | **archived 2026-05-03** | Its predecessor — see 4.3 |
| [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) | **3,900** | MIT | 12 commits | Code review, security review, design review |
| [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) | **3,744** | MIT | created 2026-04-18 | "68 ready-to-use design system inspirations in DESIGN.md format" |
| [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books) | **2,763** | — | created 2026-04-16 | AGENTS.md rules derived from Clean Code / DDD / DDIA |
| [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) | **2,763** | — | created 2026-03-09 | "67 awesome DESIGN.md and SKILL.md design skill files" |
| [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) | **1,100** (143 forks, 39 commits) | — | launched 2026-04-17 | Unusually: curates X posts, video teardowns and criticism alongside prompts |

**4.2 — What is actually in them: mostly style, almost no process, and no repair.** Two measurements:

- The most-starred *design* rules format, DESIGN.md, is defined by its own curator as "a single plain-text markdown file that describes a brand's visual language in a format AI agents can actually act on," keeping "token, rule, and rationale in the same file," across nine fixed sections: Visual Theme & Atmosphere, Color Palette & Roles, Typography Rules, Component Stylings, Layout Principles, Depth & Elevation, Do's and Don'ts, Responsive Behavior, Agent Prompt Guide ([VoltAgent](https://github.com/VoltAgent/awesome-claude-design)) [fetched]. Eight of the nine are pure pre-generation style. One (Do's and Don'ts) is a rubric in embryo. **None is a review or repair step** — the fetched README "does not discuss iteration processes, fixing design misses, or review rubrics. It focuses on initial scaffold generation." That is the finding, stated flatly: the design rules-file ecosystem is almost entirely a *specification* culture, not a *correction* culture. This stream's subject is the part it skips.
- The most-starred *engineering* rule pack is the opposite and shows why the design side is thin by comparison. `steipete/agent-rules` ships 22 `.mdc` files, and their names are the taxonomy: `add-to-changelog`, `analyze-issue`, **`bug-fix`**, `check`, `clean`, `code-analysis`, `commit-fast`, `commit`, `context-prime`, **`continuous-improvement`**, `create-command`, `create-docs`, `cursor-rules-meta-guide`, **`five`** (five-whys), `implement-task`, `mcp-inspector-debugging`, `mermaid`, `modern-swift`, **`pr-review`**, `safari-automation`, `screenshot-automation`, `update-docs` [fetched]. By count, roughly **5 of 22 are craft/language style, 4 are repair or review (`bug-fix`, `five`, `pr-review`, `code-analysis`), 2 are meta-rules about the rules themselves, and the remaining 11 are process plumbing** (commits, changelogs, docs, context priming, tooling). That ratio — process dominant, craft minor, repair present but small — is the inverse of the design-side files.

**4.3 — The most important fact about rules files is that the flagship one was abandoned.** `steipete/agent-rules`, 5,691 stars, was **archived on 2026-05-03** with the author's note, fetched from the repo page: "**AI moves fast. This was old stuff I used mid 2025.**" Users are redirected to `agent-scripts` [fetched]. A rules corpus with a one-year useful life, retired by its own author while still gaining stars, is the strongest available evidence that these files are perishable operational notes and not durable rubrics. Any design of a ratcheting rubric should assume the same decay and build the deprecation review in from the start — which, to its credit, `continuous-improvement.mdc` does (§3.4).

**4.4 — Length: the doctrine and the practice are 10× apart.** Anthropic's guidance is explicit and quantitative in its logic if not its numbers: "keep it short and human-readable"; "Keep it concise. For each line, ask: *'Would removing this cause Claude to make mistakes?'* If not, cut it. **Bloated CLAUDE.md files cause Claude to ignore your actual instructions!**"; "If Claude keeps doing something you don't want despite having a rule against it, the file is probably too long and the rule is getting lost"; and — the sharpest line — "If Claude keeps skipping one instruction, add emphasis such as 'IMPORTANT' to that line alone. **If you emphasize many lines, none of them stands out**" ([best practices](https://code.claude.com/docs/en/best-practices)) [fetched]. The illustrative CLAUDE.md in that documentation is **six bullets**. The current canonical rules file of one of the most-followed Claude Code practitioners, `steipete/agent-scripts/AGENTS.MD`, is **949 lines** [fetched], spanning Communication, Core, Routing, Project Defaults, PR/CI, Runtime Safety and Git. Both of those things are true at once and nobody on the timeline reconciles them.

**4.5 — "The rules get ignored" is a documented, closed-as-not-planned bug.** [anthropics/claude-code#7777](https://github.com/anthropics/claude-code/issues/7777), opened 2025-09-17, labelled `bug`, `has repro`, `memory`, and **closed as not planned** [fetched]. The reporter's verbatim framing: "Claude consistently fails to systematically apply methodology instructions present in CLAUDE.md context, requiring manual user enforcement despite instructions being explicitly available in system context. **Demonstrates pattern of treating contextual instructions as advisory rather than mandatory process steps.**" The escalation, also verbatim: "Claude or Agents definitions need to follow the instructions, right now Claude.MD and Agents are useless." The resolution — not planned — is the substantive answer: instruction files are context, and context is advisory. The vendor's own remedy for anything that must happen is a different mechanism entirely: "Unlike CLAUDE.md instructions which are advisory, **hooks are deterministic and guarantee the action happens**" [fetched]. That is the same conclusion the [guardrail ladder](../design-sdlc/04-small-model-guardrails.md) reaches from the small-model side, arrived at independently.

**4.6 — The one design rubric on the timeline that is actually a rubric.** `rohitg00/awesome-claude-design` publishes a "Claude Design's default fingerprints (avoid)" table — eight recurrent generator tells, each with a counter-rule [fetched]:

| Fingerprint | Appearance | Counter-rule |
|---|---|---|
| Teal accent everywhere | Default `#16d5e6` on CTAs, headlines, focus rings, charts | Specify brand accent in DESIGN.md first |
| Blinking status dot | Animated green/lime dot top-right of nav signalling "live"/"AI" | "no animated status indicators" |
| Container soup | Pills wrapping cards wrapping cards; padding stacking 24/24/24 | "containers nest at most 2 levels" |
| Default serif headline | Tiempos/Source-Serif-adjacent paired with sans body | Specify font stack with weight + tracking |
| Accent bar left of every card | 4px colored rule regardless of meaning | Reserve left-rule for one role (e.g. severity) |
| Three-column feature grid in hero | Same section-2 layout on nearly every landing | "no three-column feature grid; choose marquee, alternating-row, or single-column" |
| Lucide icon stack | Default icon set across nav, buttons, empty states | Commit to one family or type-only |
| Generative hero ignores tokens | Image generation bypasses DESIGN.md colors | "regenerate hero using only `--bg`, `--accent`, `--text`" |

This is the structure this stream wants — an observed recurring miss paired with a durable counter-rule — and it is the only published example of it I found for design. Note what makes it work: each row names a *specific observable*, not a quality ("teal `#16d5e6` on focus rings", not "poor color choices"), which is precisely the binary-checklist property that [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md) found raises cross-evaluator agreement. Its weakness is that all eight counter-rules fire *before* generation; none is a post-hoc check, so nothing verifies the counter-rule was obeyed.

**4.7 — "Unit tests for English" is the best rubric framing anyone has published.** From spec-kit's fetched `checklist.md`: checklists are "**unit tests for requirements writing** — they validate the quality, clarity, and completeness of requirements in a given domain, not the correctness of implementation." Items are questions, tagged with a quality dimension in brackets — `[Completeness/Clarity/Consistency/Measurability/Coverage/Edge Cases]` — and a traceability reference `[Spec §X.Y]`, `[Gap]`, `[Ambiguity]`, `[Conflict]`, `[Assumption]`. The anti-pattern list is explicit and, for a design rubric, directly transferable [fetched]:

> ❌ Wrong (tests implementation): "Verify button clicks," "Test error handling works," "Confirm API returns 200"
> ✅ Correct (tests requirements quality): "**Are visual hierarchy requirements defined with measurable criteria?**" "**Is 'prominent display' quantified with sizing/positioning?**" "**Are edge cases defined when images fail to load?**"
> Forbidden language: Verify, Test, Confirm, Check (+ behavior); "displays correctly," "works properly," "functions as expected."

Two of those three "correct" examples are *design* criteria, in a general-purpose engineering tool. That is the strongest single piece of evidence in this document that the rubric problem this stream is solving is recognised and only half-built.

**Open questions:** No public data exists on rules-file *efficacy* — not one before/after on defect rate, instruction-following rate, or recurrence. The "~150–200 instructions before compliance drops" figure circulating in blog posts [search-summary] could not be traced to a primary source today and should not be repeated until it can.

---

## 5. Where the timeline genuinely splits

**What it is:** Four live disagreements, given with both sides and their evidence grade. They are not flattened into consensus because they are not consensus.

**Why it matters:** A reader deciding how to run their own loop needs to know which advice is contested. Round-ups that smooth these into a single "best practice" are the main way X misinforms.

**Key findings:**

**5.1 — Vanilla vs. maximal configuration.** This is the sharpest split, because both poles are occupied by people with standing. The creator of Claude Code: "My setup might be surprisingly vanilla! Claude Code works great out of the box, so I personally don't customize it much. **There is no one correct way to**…" ([@bcherny](https://x.com/bcherny/status/2007179832300581177)) [search result only]. Against it, an ecosystem whose flagship personal rules file runs 949 lines [fetched], whose most-starred index lists 53,929-stars' worth of skills and agents [fetched], and whose most-visible power user built a status bar specifically to display "how full the current context is in %" ([@steipete](https://x.com/steipete/status/1956465968835915897)) [search result only]. Both camps are describing real practice. The unstated variable is repo maturity: the vanilla advocate works inside one very well-known codebase; the configuration maximalist works across many. Nobody on X says this out loud.

**5.2 — One-shot vs. iterate.** The one-shot pole is now commercial: the DESIGN.md corpus markets itself as "Drop one in, **scaffold a full UI in one shot**" ([VoltAgent](https://github.com/VoltAgent/awesome-claude-design)) [fetched]. The iterate pole's clearest statement is the design critique take: "**HOT TAKE: Taste is not the moat in AI design. The critique loop is.** A designer with taste can still get mediocre output if the agent generates ten screens before anyone checks hierarchy, density, responsiveness, or product meaning. The strongest workflow is not: prompt →" ([@nyk_builderz](https://x.com/nyk_builderz/status/2077020269474894222)) [search result only]. The search index's summary of the remainder of that thread — an eight-stage loop of "intent → constraints → reference breakdown → one component → visual review → critique → revision → systemize", plus "define rejection criteria before generating" and "test the ugly states" — is [search-summary] and I did not see it rendered; it is reported here as a lead because it matches the shape of the verified material elsewhere in this document, not because it is verified.

There is also a third, quota-driven position that is easy to miss: iterate *by commenting*, not by re-prompting. The mirrored seven-tip list attributed to Ryan Mather ([@Flomerboy](https://x.com/Flomerboy/status/2045162321589252458)) [mirror-quoted] includes "**Comment, don't chat:** Inline canvas comments cost less and target faster than new chat turns" and "**Slow down at key moments:** Hero, pricing, empty states deserve more passes; less elsewhere." I could not independently verify the handle-to-person mapping or the post; the attribution is the mirror's.

**5.3 — Tests as the only gate vs. tests as overhead.** I found the pro-test side thoroughly and the anti-test side barely, and I want to be explicit that this is probably a *search artifact* rather than a real absence. Verified pro-test evidence: the `bug-fix.mdc` failing-test-first rule [fetched]; Anthropic's "write a failing test that reproduces the issue, then fix it" and "have one Claude write tests, then another write code to pass them" [fetched]; and the broader argument, from secondary sources only [search-summary], that if an agent writes tests after the code "the agent is effectively grading its own work." Against it I could verify nothing on X. The honest report is: **the anti-test position is loudly present in blog commentary and I could not source it to a citable X post today.** Do not read its absence here as evidence it does not exist on the timeline.

**5.4 — "AI can't do taste" vs. "taste is a prompt" vs. "taste isn't the problem".** Three positions, all citable:

| Position | Statement | Handle | Grade |
|---|---|---|---|
| Taste is absent from the model | "Why does every AI-built website look the same? Purple gradients. Inter font. Three boxes. Rounded corners. 😭 This isn't bad design - it's statistical average design. **LLMs don't have taste. They match patterns from training data.**" | [@Manixh02](https://x.com/Manixh02/status/2012387306683146646) | [search result only] |
| Taste is the operator's, and slop is an operator failure | "Here's my take on what AI Slop is… 1. AI slop is using AI to produce an objectively bad design (duh). 2. **AI slop is using AI to produce objectively good design through unopinionated prompting.**" | [@designcoursecom](https://x.com/designcoursecom/status/2080802781087089047) (Gary Simon) | [search result only] |
| Same, more bluntly | "AI slop doesn't exist because AI is bad it exists because **the people who create it have bad taste**" | [@daddy__broccoli](https://x.com/daddy__broccoli/status/2027090187361362259) | [search result only] |
| Taste is a fundable data layer | "We're excited to introduce Taste Labs. Our mission is to end AI slop. We're building the data and infrastructure layer to give AI models and agents taste… announcing our **$18.5M seed funding, co-led by @CRV and @AmplifyPartners**" | [@thaiscbranco_](https://x.com/thaiscbranco_/status/2066912871649574945) | [search result only] |
| Taste is the wrong variable entirely | "Taste is not the moat in AI design. **The critique loop is.**" | [@nyk_builderz](https://x.com/nyk_builderz/status/2077020269474894222) | [search result only] |

The fourth row is the one to watch: a venture-funded company whose product thesis is that taste is a data problem has an obvious incentive to keep "AI has no taste" in circulation, and the timeline does not label it.

**5.5 — And a genuine, verifiable split *about a method's definition*.** The Ralph loop (§2): context-resetting versus context-accumulating, same name, opposite mechanics, two builders each claiming fidelity to the original. This is the cleanest demonstration on the timeline that a widely-shared "technique" can be two incompatible things.

**Open questions:** Whether the vanilla-vs-configured split resolves by repo maturity is testable — measure instruction-following on the same task with a 6-line and a 949-line rules file — and nobody has done it publicly.

---

## 6. Claims that do not survive checking

**What it is:** Viral productivity and workflow claims where measurement and folklore disagree. Reported with their real numbers where obtainable, and with an honest statement of what could not be re-verified today.

**Why it matters:** This repo's best documents kill their own premises. The X timeline is the main transmission medium for AI-coding productivity folklore, and a field guide to it that did not audit the numbers would be part of the problem.

**Key findings:**

**6.1 — The METR result is real, is more uncertain than the meme, and has since moved.** The post everyone quotes exists and its opening text is verbatim recoverable: "We ran a randomized controlled trial to see how much AI coding tools speed up experienced open-source developers. The results surprised us: **Developers thought they were 20% faster with AI tools, but they were actually 19% slower** when they had access to AI than when they didn't" ([@METR_Evals](https://x.com/METR_Evals/status/1943360399220388093)) [search result only]. `metr.org` and `arxiv.org` were both `EGRESS_BLOCKED`, so everything below is [search-summary] and is reported as *claimed, not established*:

| Figure | Claimed value | Status today |
|---|---|---|
| Design | RCT, 16 experienced open-source developers, 246 tasks in their own mature repos (avg >22k stars, ~1M LoC) | [search-summary] |
| Headline effect | Tasks took **19% longer** with AI | [search-summary] |
| **Confidence interval** | **+2% to +39%** | [search-summary] — **this is the number the meme drops.** The interval nearly touches zero |
| Pre-study forecast | +24% speedup expected | [search-summary] |
| Post-hoc self-estimate | +20% speedup believed | [search-summary] |
| Tooling | Cursor Pro with Claude 3.5/3.7, Feb–Jun 2025 | [search-summary] |
| **2026 follow-up** | For the subset of original developers re-studied, METR now estimates **−18% with a CI of −38% to +9%** and describes the evidence for a change as "only very weak" because of selection effects ([METR, 2026-02-24](https://metr.org/blog/2026-02-24-uplift-update/), not fetchable) | [search-summary] |

Three things follow. (a) The perception gap — believing +20% while measuring −19% — is the finding that actually matters for this stream, because it is a claim about *self-assessment during the iterate-and-patch loop*, and it says practitioners are poor instruments for judging their own loop. (b) The effect size is not precise; a CI of +2% to +39% supports "not obviously faster," not "19% slower, period." (c) The follow-up's interval crosses zero, so as of 2026 METR's own updated estimate is **not statistically distinguishable from no effect**. Anyone citing "19% slower" as a settled fact in September 2026 is citing a fourteen-month-old point estimate that its authors have since widened past zero. **I could not open METR's pages to confirm these numbers and they must be re-verified before being repeated.**

**6.2 — The productivity number that best matches this stream's question is about rework, and it is also unverified.** Stanford research presented by Yegor Denisov-Blanch, reportedly covering ~100,000 developers, is claimed to break down as [all figures search-summary; the primary source could not be fetched]: greenfield/low-complexity +30–40%, greenfield/high-complexity +10–15%, brownfield/low-complexity +15–20%, **brownfield/high-complexity +0–10%**; with "roughly half of AI's gross productivity gains consumed by rework — fixing bugs, correcting hallucinated logic, and matching codebase conventions," netting a median +10–15%. If that holds, it is the most decision-relevant number in this document: **the patch-the-miss half of the loop is where about half the value goes**, and it is worst exactly where mature design systems and conventions live. It should be treated as a hypothesis to test, not a citation, until the primary source is reachable.

**6.3 — DORA 2025 says the loop's problem is stability, not speed.** Claimed figures [search-summary; `dora.dev` not attempted after the pattern of blocks]: AI adoption at 90% (+14 points year over year); AI adoption now positively correlated with throughput, reversing 2024's finding of roughly −1.5% throughput per +25% adoption; **but still negatively correlated with delivery stability — "more change failures, increased rework, and longer cycle times to resolve"**; 30% of respondents report little or no trust in AI-generated code while >80% believe it raised their productivity. That last pair is the METR perception gap again, in a different population, which is the closest thing to independent corroboration available.

**6.4 — Folklore drift in the term "vibe coding" itself.** The origin post is recoverable verbatim: "There's a new kind of coding I call 'vibe coding', where you **fully give in to the vibes, embrace exponentials, and forget that the code even exists**. It's possible because the LLMs (e.g. Cursor Composer w Sonnet) are getting too good. Also I just talk to Composer with SuperWhisper" ([@karpathy](https://x.com/karpathy/status/1886192184808149383)) [search result only]. The definition is *not reading the code*. Everything in §2 of this document — plan mode, specs, failing tests, review agents, convergence checks — is the opposite of that. The timeline now routinely calls the disciplined workflow "vibe coding," which drains the term of the one property that defined it. Secondary sources date the post to 2 February 2025 and claim 4.5M+ views [search-summary]; neither was verifiable and the view count should not be repeated.

**6.5 — "Ralph loops catch issues without causing regressions."** Asserted as personal confirmation by the person who built one ([@nicopreme](https://x.com/nicopreme/status/2013784416234152452)) [search result only]. No measurement, no control, n=1, and the author of the technique is separately reported to have said the Claude Code implementation "was not quite what he had in mind" ([@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348)) [search result only]. Treat as untested.

**6.6 — A terminological warning.** "Doom loop" is used on X for at least two unrelated things: an agent stuck re-prompting itself, and a decoding pathology where a reasoning model repeats a token until context fills. The latter has actual numbers — Liquid AI reports doom-loop rates falling from 10.2%→1.4% on an early LFM2.5-2.6B checkpoint and 22.9%→1% on Qwen3.5-4B ([@liquidai](https://x.com/liquidai/status/2074494130126811473)) [search result only]. Those numbers describe token repetition, **not** an agent thrashing on a bug, and searching the phrase will hand you the wrong literature.

**Open questions:** Every headline number in this section is [search-summary]. A follow-up pass from a session with open egress to `metr.org`, `arxiv.org` and `dora.dev` should replace §6.1–§6.3 wholesale. Until then this section is a map of what to check, not a set of established facts.

---

## 7. Signal-to-noise verdict

**What it is:** An honest estimate of how much X content on this subject is method and how much is marketing, and which subset is worth following.

**Why it matters:** The owner's instinct — "that's where everyone is at" — is correct about *reach* and, on this evidence, mostly wrong about *method density*. Knowing the ratio is what makes the channel usable.

**Key findings:**

**The composition, from what the search index surfaced.** Across roughly twenty targeted searches, results clustered into five kinds, in descending volume: (1) **listicle and repackaging content** — "7 tips", "5 secret updates", "Top 60 Claude Skills", threads summarising someone else's thread; (2) **launch and vendor announcements** — product posts, funding posts, feature posts; (3) **setup and configuration** — worktrees, status bars, hooks, MCP servers; (4) **genuine workflow argument** — the material in §2, §3 and §5; (5) **measurement** — almost nothing. Category 5 is so thin that of the six numeric claims in §6, **five originate off-platform** (METR, Stanford, DORA, Chroma, Liquid AI) and reached X as announcements. X is where measurement is *distributed*, not where it is *produced*.

**Three reliable smells for noise,** each with an example from this document:

1. **A number with no interval.** "19% slower" travels; "+2% to +39%" does not. The interval is the first thing stripped in transmission, and its absence is the most reliable marker that you are reading folklore rather than a result (§6.1).
2. **A named technique with no definition test.** If two builders implement "the Ralph loop" with opposite context semantics and both claim fidelity (§2, §5.5), the name is a meme carrying at least two methods. Ask what the loop does with context between iterations; the answer separates them.
3. **An incentive that is not disclosed.** "AI has no taste" is a true-ish observation and also the thesis of an $18.5M-funded company (§5.4). Not disqualifying — just never labelled on the timeline.

**And two reliable smells for signal:**

1. **The post points at a file.** Every claim in this document that reached [fetched] grade did so because someone published an artifact — a rule file, an agent prompt, a slash command. The practitioners worth following are the ones whose threads are announcements of repos, because the repo can be audited and the thread cannot.
2. **The author states a threshold.** "After two failed corrections, `/clear`" [fetched]. "`if pattern.frequency >= 3`" [fetched]. "Containers nest at most 2 levels" [fetched]. Thresholds are falsifiable; adjectives are not. On a platform where nothing else is checkable, a number is the cheapest available honesty signal.

**The verdict, stated plainly.** For the specific question this stream asks — what to do when the test finds a miss — **X is a discovery channel and a poor evidence channel.** It reliably surfaces *that* a practice exists and *who* to read; it almost never establishes that the practice works. The reliable subset is small and has a common property: it is the set of accounts whose posts are pointers to auditable artifacts — the Claude Code team's own accounts and documentation, the maintainers of `spec-kit`, `agent-rules`/`agent-scripts` and `claude-code-workflows`, the eval-and-error-analysis voices who publish method rather than results ([@HamelHusain](https://x.com/HamelHusain/status/1926100947874247056): "When you know how to do error analysis for AI, it gives you an unreasonable advantage" [search result only]), and the research accounts whose posts link a report ([@trychroma](https://x.com/trychroma/status/1944835468551708905)). **Follow the artifact, not the thread.** Everything in §4 of this document — the strongest section — was obtained by doing exactly that.

**Open questions:** Whether the ratio differs inside authenticated X (replies, quote-tweets and Communities are invisible to a search index) is untestable here, and the real technical argument may well live in replies this method cannot see. That is a genuine limitation, not a hedge.

---

## Cross-cutting themes

1. **The timeline's implicit ladder is the same one this repo derived independently, minus the top rungs.** X argues about prompts, rules files and review agents. It rarely reaches hooks, schemas, exemplar sets or versioned regression suites — the upper altitudes in [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md). The one exception is the vendor documentation's hooks-are-deterministic-and-rules-are-advisory distinction [fetched], which is the ladder's central claim stated in one sentence.
2. **Everybody's fix for the miss is fresh context; nobody's fix is a durable record.** Restart, `/clear`, worktree, subagent, context-reset loop — five mechanisms, one idea. The complementary move, writing the miss down so it cannot recur, exists in exactly one published rule (`continuous-improvement.mdc`, §3.4) and one published rubric table (the eight fingerprints, §4.6). The asymmetry is the gap this stream exists to fill.
3. **Design rules files specify; engineering rules files repair.** Nine DESIGN.md sections, none about review (§4.2); 22 `.mdc` rules of which four are repair or review. A design rubric that ratchets has to borrow its repair half from the engineering side — which is why spec-kit's checklist anti-patterns, whose own examples are design criteria (§4.7), are the most portable artifact found.
4. **Every strong finding here is measured; every weak one is asserted.** The sections backed by GitHub are specific to the line count and the star; the sections backed by X are specific to a truncated sentence. That difference is not about the people — it is about which medium retains evidence.
5. **The perception gap is the most under-discussed result on the timeline.** Believing +20% while measuring −19% (§6.1), and 30% distrusting AI code while >80% report a productivity gain (§6.3), both say the same thing: practitioners cannot self-assess this loop. That is an argument for the instrumented grade record in [eval-tuning-loops/01 §4](../eval-tuning-loops/01-grading-generated-prototypes.md) that no X thread makes.

---

## Recommendations: the de-marketed loop

A decision table for the owner's exact situation — prototype built, a few rounds of vibe-coding done, testing found a miss. Each row states what to do, the strongest verified backing, and the evidence grade of that backing. **Nothing here rests on a [search-summary] claim.**

| Situation | Do this | Because | Grade |
|---|---|---|---|
| Miss found, first attempt at a fix | Fix in the current context, but **have the agent write a failing test that reproduces the miss first** | `bug-fix.mdc`: "Write failing test that demonstrates the bug"; Anthropic: "write a failing test that reproduces the issue, then fix it" | [fetched] ×2 |
| Fix attempted twice, still wrong | **Stop. Revert, `/clear`, re-prompt** with what you learned — do not correct a third time | "If you've corrected Claude more than twice on the same issue in one session, the context is cluttered with failed approaches… A clean session with a better prompt almost always outperforms a long session with accumulated corrections" | [fetched] |
| Fix looks right, needs checking | **Review in a fresh context you did not implement in** — subagent, second session, or `/code-review` | "a fresh context improves code review since Claude won't be biased toward code it just wrote"; reviewer "sees only the diff and the criteria you give it, not the reasoning that produced the change" | [fetched] |
| Reviewer returns a long list | **Only act on findings that affect correctness or stated requirements**; treat the rest as optional | "A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering" | [fetched] |
| Need to know whether the *whole* feature matches intent, not just this bug | Run a **converge pass**: classify every gap as `missing` / `partial` / `contradicts` / `unrequested`, assign severity, and **append tasks — do not let the checker patch** | `speckit.converge`: "Never modifies spec, plan, or application code — only appends new tasks and reports findings" | [fetched] |
| The miss is visual | Run a **live-environment design review**: 1440/768/375px, interaction states, WCAG 2.1 AA, edge/error states, token usage; triage `[Blocker]`/`[High-Priority]`/`[Medium-Priority]`/`[Nitpick]`; report **problems, not prescriptions**, with screenshot evidence | `design-review-agent.md` | [fetched] |
| The same class of miss has now happened three times | **Write the rule.** `if pattern.frequency >= 3 and not documented(pattern): create_rule_draft(pattern)`; draft with examples → test on existing code → gather feedback → refine → publish → monitor | `continuous-improvement.mdc` | [fetched] |
| Writing that rule | Make it an **observable, not an adjective** — "containers nest at most 2 levels", not "avoid clutter"; and phrase rubric items as requirement-quality questions, never "verify X works" | Eight-fingerprint counter-rule table; spec-kit checklist anti-patterns | [fetched] ×2 |
| The rules file has grown past a screen | **Prune it, and move anything that must always happen into a hook** | "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"; "Unlike CLAUDE.md instructions which are advisory, hooks are deterministic and guarantee the action happens"; and the empirical warning of a 949-line file and a closed-as-not-planned "rules ignored" bug | [fetched] ×3 |
| Every quarter | **Deprecate.** Review rules for usage; assume a one-year half-life | `continuous-improvement.mdc` maintenance phase; `agent-rules` archived 2026-05-03 with "AI moves fast. This was old stuff I used mid 2025." | [fetched] ×2 |
| Judging whether the loop is working | **Do not trust your own sense of speed.** Instrument it | METR's +20%-believed / −19%-measured gap, and DORA's 30%-distrust / 80%-productivity-gain pair | [search-summary] — flagged as the one place this table leans on unverified numbers, because the alternative is silence on a real risk |

---

## Practitioner table

Who to follow, what they advocate, and how good the evidence is. **Handles are reproduced as they appeared in fetched search results or fetched mirror pages; x.com itself was not reachable, so no profile was confirmed and no engagement number is reported.**

| Person / account | Handle + link | What they advocate | Evidence quality |
|---|---|---|---|
| Boris Cherny (created Claude Code) | [@bcherny](https://x.com/bcherny/status/2007179832300581177) | Vanilla setup; parallel Claudes; git worktrees (`claude -w`); "there is no one correct way" | [search result only] ×3, and corroborated by the vendor docs he is describing [fetched] |
| Peter Steinberger | [@steipete](https://x.com/steipete/status/1933138957719556586) · [agent-rules](https://github.com/steipete/agent-rules) · [agent-scripts](https://github.com/steipete/agent-scripts) | Accumulated rule packs; failing-test-first bug fixes; frequency-≥3 rule creation; long-running resume loops; context-percentage instrumentation | **Highest in this document.** Both repos fetched; rule files read in full; 5,691 and 6,600 stars; archive note and 949-line AGENTS.MD both verified |
| "PatOakEllis" / OneRedOak | [repo](https://github.com/OneRedOak/claude-code-workflows) · surfaced via [@AnandChowdhary](https://x.com/AnandChowdhary/status/1958306807899934738) | Automated design review on frontend PRs via Playwright MCP; 7-phase review; 4-level triage; problems-over-prescriptions | Repo and agent prompt [fetched], 3.9k stars MIT; the X post [search result only] |
| Geoffrey Huntley | [@GeoffreyHuntley](https://x.com/GeoffreyHuntley/status/2012082344921117182) | The "Ralph" loop — run the agent repeatedly until done | [search result only] for his own post; his *definition* is only known secondhand, and two reimplementers disagree about it |
| Rizèl Scarlett | [@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348) | Ralph with **context reset each iteration**, not accumulation | [search result only]; the single clearest statement of the restart camp found |
| Nico Bailon | [@nicopreme](https://x.com/nicopreme/status/2013784416234152452) | Ralph as repeated **self-review until no bugs found**; claims no regressions | [search result only]; the claim is unmeasured (§6.5) |
| Beyang Liu (Sourcegraph/Amp) | [@beyang](https://x.com/beyang/status/1927829076192153746) | Shape the codebase so the agent has fast feedback loops; Storybook + Playwright MCP for UI | [search result only]; the most precise statement of the screenshot-loop pattern found |
| Dex Horthy | [@dexhorthy](https://x.com/dexhorthy/status/2033392483674264044) | Spec-driven scepticism: you still have to read the code | [search result only]; the best-articulated dissent on the timeline |
| Andrew Ng | [@AndrewYNg](https://x.com/AndrewYNg/status/2044449830605582629) | Spec-driven development as a teachable discipline | [search result only]; a course announcement, i.e. marketing that happens to state a position |
| Prajwal Tomar | [@PrajwalTomar_](https://x.com/PrajwalTomar_/status/1947272871967174720) · [Threads](https://www.threads.com/@builtbyprajwal/post/DWOv7eyCZUj/commit-often-revert-when-stuck-vibe-coding-era-ai-codes-fast-fast-coding-can) | Full-context plan-then-build loop; commit often, revert when stuck | [search result only]; the revert anecdote (20 min debugging vs 10 min redo) is the only such number found, n=1 |
| Hamel Husain | [@HamelHusain](https://x.com/HamelHusain/status/1926100947874247056) | Error analysis on real traces as the prerequisite to any eval; "the most important part of the eval workflow is finding issues" | [search result only] ×3; method-first, and the closest thing to a rigorous voice on the timeline |
| Chroma (research) | [@trychroma](https://x.com/trychroma/status/1944835468551708905) | Context Rot — "models do not use their context uniformly" | [search result only]; the report itself was not fetchable |
| Sarah Wooders (Letta) | [@sarahwooders](https://x.com/sarahwooders/status/1935485477563548015) | Context rot is real in long-running agents; rewrite context blocks asynchronously | [search result only]; vendor-adjacent |
| Addy Osmani | [@addyosmani](https://x.com/addyosmani/status/1864503312978202650) | The "70% problem" — the last 30% (edge cases, integration, security) is where the work is | [search result only] for the announcement post only; the article itself was not fetchable, so the 70/30 framing is reported as his term, not as a measurement |
| Nyk | [@nyk_builderz](https://x.com/nyk_builderz/status/2077020269474894222) | "Taste is not the moat in AI design. The critique loop is." Define rejection criteria before generating | [search result only] for the opening; the eight-stage loop attributed to the rest of the thread is [search-summary] only |
| Gary Simon | [@designcoursecom](https://x.com/designcoursecom/status/2080802781087089047) | Slop is unopinionated prompting, not bad AI | [search result only] |
| Manish Kumar | [@Manixh02](https://x.com/Manixh02/status/2012387306683146646) | "LLMs don't have taste. They match patterns from training data." Statistical-average design | [search result only] |
| Thais Castello Branco (Taste Labs) | [@thaiscbranco_](https://x.com/thaiscbranco_/status/2066912871649574945) | Taste as a fundable data/infrastructure layer; $18.5M seed co-led by CRV and Amplify | [search result only]; **commercial interest in the "AI has no taste" premise** |
| "Ryan Mather" | [@Flomerboy](https://x.com/Flomerboy/status/2045162321589252458) | System-first; comment-don't-chat iteration; slow down on hero/pricing/empty states; skillify what works | **[mirror-quoted] only** — via [rohitg00/awesome-claude-design](https://raw.githubusercontent.com/rohitg00/awesome-claude-design/main/README.md); handle-to-person mapping unverified |
| Aakash Gupta | [@aakashgupta](https://x.com/aakashgupta/status/2038146639303512255) | Prompt optimisation as a scored loop: "one edit per round, tests it, keeps winners, reverts losers" | [search result only]; the clearest X statement of a ratcheting loop |

---

## What the timeline actually agrees on

Six items. Each appears in at least two independent sources of different kinds, and each is either [fetched] or [search result only] on both sides.

1. **Context length degrades output, and the practical response is to reset rather than to push through.** ([@trychroma](https://x.com/trychroma/status/1944835468551708905), [@daniel_mac8](https://x.com/daniel_mac8/status/1935479269494505580), [@sarahwooders](https://x.com/sarahwooders/status/1935485477563548015), and the vendor's "performance degrades as it fills" [fetched].)
2. **Give the agent something it can run to check itself** — a test, a build, a linter, a screenshot compared against a target. ([@beyang](https://x.com/beyang/status/1927829076192153746); Claude Code best practices [fetched]; every review agent in §3.)
3. **Do not let the thing that wrote the code be the only thing that grades it.** (Fresh-context subagent review [fetched]; `converge` never patching what it checks [fetched]; the design-review agent as a separate agent [fetched].)
4. **Write the failing test before the fix.** (`bug-fix.mdc` [fetched]; Anthropic's debugging prompt pattern [fetched].)
5. **Commit before you prompt, and revert rather than argue.** (Git-as-checkpoint is universal; the `/clear`-after-two-corrections rule is its documented form [fetched].)
6. **Rules files decay and must be pruned.** (Anthropic's "bloated CLAUDE.md files cause Claude to ignore your actual instructions!" [fetched]; `continuous-improvement.mdc`'s quarterly/annual deprecation reviews [fetched]; `agent-rules` archived with "AI moves fast" [fetched].)

## What the timeline disagrees on

| Question | Camp A | Camp B | Is it resolvable? |
|---|---|---|---|
| Configure heavily or stay vanilla? | 949-line AGENTS.MD; 40,772-star `.cursorrules` corpus; skills, subagents, hooks | The tool's creator: "surprisingly vanilla… I don't customize it much" | Probably — the hidden variable is repo maturity and task breadth. Untested publicly |
| One-shot the UI or critique-loop it? | "Drop one in, scaffold a full UI in one shot" (DESIGN.md marketing) | "Taste is not the moat… the critique loop is" | Yes, cheaply — the measurement is pass^k on a fixed task set ([design-sdlc/04 §6](../design-sdlc/04-small-model-guardrails.md)). Nobody has run it |
| Spec-first or read-the-code? | Spec-driven development as a discipline (Ng, spec-kit) | "If you start behaving like you'll be able to ship and maintain production software without reading the code, you're in for a hard…" (Horthy) | Not as posed — the two are describing different risk tolerances, not different facts |
| Are tests the gate or the overhead? | Failing-test-first is codified in rule packs and vendor docs | **Not verifiable on X from this session** — the anti-test position appears only in secondary commentary | Open; and note this is partly a limitation of my method, not necessarily a real absence |
| Do rules files work? | 40k–136k stars' worth of ecosystem; frequency-≥3 ratchet rules | Closed-as-not-planned bug #7777: instructions are "advisory rather than mandatory"; the flagship rules repo archived at one year old | **Mostly resolved, and the answer is nuanced**: rules shift probabilities, hooks guarantee behaviour. Use rules for preference, hooks for invariants |
| Can AI do taste? | "LLMs don't have taste — statistical average design" | "Slop is unopinionated prompting" / "the people who create it have bad taste" / "taste is not the moat, the critique loop is" | Unresolvable as stated — the word is doing four jobs. Replace it with the eight-fingerprint table's observables and the question becomes testable |
| What *is* a Ralph loop? | Context resets every iteration | Agent accumulates and self-reviews until clean | Resolvable by definition, and the fact that it hasn't been is the best evidence in this document that X circulates names faster than methods |

---

## What a session with X access must verify

The ledger at the top of this document says what was blocked. This section says what to *do* about it: the precise, ordered list a follow-up session with open egress should re-verify or newly obtain. It is written so the next researcher does not have to re-derive the gaps.

**Tier 1 — replaces unverified numbers with facts (do these first):**

1. **METR.** Open [metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) and [arXiv 2507.09089](https://arxiv.org/abs/2507.09089). Confirm or correct: 16 developers, 246 tasks, −19% with CI **+2% to +39%**, forecast +24%, post-hoc self-estimate +20%, tooling Cursor Pro with Claude 3.5/3.7 Feb–Jun 2025. Then open the [2026-02-24 update](https://metr.org/blog/2026-02-24-uplift-update/) and confirm the follow-up estimate **−18%, CI −38% to +9%**, and METR's own characterisation of the evidence as weak. §6.1 should be rewritten from those pages, not from this document.
2. **Stanford / Yegor Denisov-Blanch.** Locate the primary presentation or paper and confirm the four-quadrant figures (greenfield-low +30–40%, greenfield-high +10–15%, brownfield-low +15–20%, brownfield-high +0–10%) and the "roughly half of gains consumed by rework" claim. If it holds, it is the most decision-relevant number in this stream and belongs in doc 00's synthesis.
3. **DORA 2025.** Open [dora.dev/insights/balancing-ai-tensions](https://dora.dev/insights/balancing-ai-tensions/) and confirm the adoption, throughput, stability and trust figures in §6.3.
4. **Martin Fowler, ["TDD inside the agent loop — theater or actual value?"](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html)** — the single most valuable unfetched source for this stream, and the likely resolution of the §5.3 gap.

**Tier 2 — turns [search result only] into real citations:**

5. **Open every x.com URL in the Sources list** and replace each listing string with the actual post text, author display name, and date. Priority order, by how much weight this document puts on them: [@bcherny](https://x.com/bcherny/status/2007179832300581177) (the vanilla-setup position, which anchors §5.1), [@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348) and [@nicopreme](https://x.com/nicopreme/status/2013784416234152452) (the two incompatible Ralph definitions, which anchor §5.5), [@nyk_builderz](https://x.com/nyk_builderz/status/2077020269474894222) (the critique-loop position and the eight-stage loop attributed to the rest of that thread, currently [search-summary]), [@beyang](https://x.com/beyang/status/1927829076192153746), [@dexhorthy](https://x.com/dexhorthy/status/2033392483674264044).
6. **Read the replies, not just the posts.** Every [search result only] citation here is a thread *opening*. The technical argument on X lives in replies and quote-posts, which a search index does not expose at all. Expect the disagreements in §5 to be sharper and better-evidenced there than this document can show.
7. **Verify the [mirror-quoted] four** — [@claudeai](https://x.com/claudeai/status/2045156267690213649), [@petergyang](https://x.com/petergyang/status/2045527271650558383), [@brewmarkets](https://x.com/brewmarkets/status/2045175784554283228), [@Flomerboy](https://x.com/Flomerboy/status/2045162321589252458) — against the posts themselves, and confirm or drop the "Ryan Mather / Anthropic insider" identification, which is the mirror's claim and not mine.

**Tier 3 — three things I looked for and could not establish at all. State them as open, not as absent:**

8. **A citable X post stating "never let the model fix its own bug in the same context."** The principle is well-supported from three other directions (§3.2) but its X formulation eluded me. If it does not exist, say so — it would mean the norm is vendor-doctrine that the timeline absorbed without ever arguing.
9. **Any citable X statement of the tests-slow-me-down position** (§5.3). Its absence here is very likely a search artifact, and the disagreements table is lopsided until it is found.
10. **Any published measurement, anywhere, that a rules file or a review agent reduces recurrence of a class of miss.** I found none. If a follow-up also finds none, that absence is itself a headline finding for this stream, and the strongest argument for building the instrumented grade record in [eval-tuning-loops/01 §4](../eval-tuning-loops/01-grading-generated-prototypes.md).

**Tier 4 — coverage gaps created by the GitHub pivot.** Practitioner coverage in this document is uneven *by construction*: the Claude Code and rules-file communities are well represented because they publish repos; Cursor, Codex, v0/Vercel and Lovable/Bolt practitioners are thin for the mirror-image reason — their artifacts are hosted products, not fetchable files. A session with X access should deliberately over-sample those four communities to correct the bias. Doc 06 owns the tooling side of that gap.

---

## Candidate picks for skill-resources

| Resource | Why it earns a place |
|---|---|
| [github/spec-kit](https://github.com/github/spec-kit) — 136k ★, MIT | `converge.md` is the best published protocol for "what do I do when the implementation missed something": four gap types, severity ordering, and a hard rule that the checker never patches. `checklist.md`'s "unit tests for English" framing and its forbidden-language list are directly reusable as a design-rubric authoring standard |
| [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) — 3.9k ★, MIT | A complete, readable design-review subagent: live-environment-first, 7 phases, three viewports, four-level triage, problems-over-prescriptions. The closest published thing to this repo's review overlay, in agent form |
| [steipete/agent-rules](https://github.com/steipete/agent-rules) — 5.7k ★, MIT, archived | `continuous-improvement.mdc` is the only published miss→rule ratchet with a numeric threshold; `bug-fix.mdc` is the failing-test-first norm in 20 lines. Archive it as a historical artifact *and* as a cautionary one — its own author retired it at one year |
| [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) — 1.1k ★ | The eight-fingerprint counter-rule table is the only published design rubric that pairs an observed recurring miss with a durable counter-rule. Also unusual for curating criticism alongside promotion, which makes it a useful model for how this repo should cite X at all |
| [Claude Code best practices](https://code.claude.com/docs/en/best-practices) | The one fully-fetchable authoritative text on this loop. Source of the two-correction stopping rule, the four-strength verification gate ladder, the advisory-vs-deterministic distinction, and the adversarial-reviewer over-engineering warning |
| [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) — 3.7k ★, MIT | Useful as the *negative* example: 68 DESIGN.md files, nine sections, zero review or repair guidance. It defines the shape of the pre-generation half so this stream can build the missing half against it |

---

## Sources

**Fetched today (rendered and read):**
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices) [fetched]
- [Claude Code overview](https://code.claude.com/docs/en/overview) [fetched]
- [github/spec-kit](https://github.com/github/spec-kit) [fetched]
- [spec-kit `templates/commands` listing](https://github.com/github/spec-kit/tree/main/templates/commands) [fetched]
- [spec-kit `checklist.md`](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/checklist.md) [fetched]
- [spec-kit `converge.md`](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/converge.md) [fetched]
- [OneRedOak/claude-code-workflows](https://github.com/OneRedOak/claude-code-workflows) [fetched]
- [OneRedOak `design-review-agent.md`](https://raw.githubusercontent.com/OneRedOak/claude-code-workflows/main/design-review/design-review-agent.md) [fetched]
- [steipete/agent-rules](https://github.com/steipete/agent-rules) [fetched]
- [agent-rules `project-rules` listing](https://github.com/steipete/agent-rules/tree/main/project-rules) [fetched]
- [agent-rules `continuous-improvement.mdc`](https://raw.githubusercontent.com/steipete/agent-rules/main/project-rules/continuous-improvement.mdc) [fetched]
- [agent-rules `bug-fix.mdc`](https://raw.githubusercontent.com/steipete/agent-rules/main/project-rules/bug-fix.mdc) [fetched]
- [steipete/agent-scripts](https://github.com/steipete/agent-scripts) and its 949-line `AGENTS.MD` [fetched]
- [rohitg00/awesome-claude-design README](https://raw.githubusercontent.com/rohitg00/awesome-claude-design/main/README.md) [fetched]
- [VoltAgent/awesome-claude-design](https://github.com/VoltAgent/awesome-claude-design) [fetched]
- [anthropics/claude-code issue #7777](https://github.com/anthropics/claude-code/issues/7777) [fetched]
- [anthropics/claude-code](https://github.com/anthropics/claude-code) [fetched]
- Repo metadata via GitHub search API for [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules), [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code), [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents), [ciembor/agent-rules-books](https://github.com/ciembor/agent-rules-books), [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills) [fetched]

**X posts — [search result only] (opening text recovered from a search-result title today; x.com not fetchable; no date or engagement data):**
- [@METR_Evals](https://x.com/METR_Evals/status/1943360399220388093) · [@karpathy](https://x.com/karpathy/status/1886192184808149383) · [@bcherny](https://x.com/bcherny/status/2007179832300581177), [thread intro](https://x.com/bcherny/status/2038454336355999749), [worktrees](https://x.com/bcherny/status/2038454353787519164), [parallel Claudes](https://x.com/bcherny/status/2007179833990885678) · [@steipete](https://x.com/steipete/status/1933138957719556586), [resume loop](https://x.com/steipete/status/1922269949084713227), [status bar](https://x.com/steipete/status/1956465968835915897) · [@beyang](https://x.com/beyang/status/1927829076192153746) · [@PrajwalTomar_](https://x.com/PrajwalTomar_/status/1947272871967174720) · [@dexhorthy](https://x.com/dexhorthy/status/2033392483674264044) · [@AndrewYNg](https://x.com/AndrewYNg/status/2044449830605582629) · [@GeoffreyHuntley](https://x.com/GeoffreyHuntley/status/2012082344921117182) · [@blackgirlbytes](https://x.com/blackgirlbytes/status/2011200705709949348) · [@nicopreme](https://x.com/nicopreme/status/2013784416234152452) · [@unclebigbay143](https://x.com/unclebigbay143/status/2015157068991258721) · [@trychroma](https://x.com/trychroma/status/1944835468551708905) · [@daniel_mac8](https://x.com/daniel_mac8/status/1935479269494505580) · [@sarahwooders](https://x.com/sarahwooders/status/1935485477563548015) · [@HamelHusain](https://x.com/HamelHusain/status/1926100947874247056), [automating evals](https://x.com/HamelHusain/status/2074242605634949306), [office hours](https://x.com/HamelHusain/status/1871224349321224576) · [@addyosmani](https://x.com/addyosmani/status/1864503312978202650) · [@nyk_builderz](https://x.com/nyk_builderz/status/2077020269474894222) · [@designcoursecom](https://x.com/designcoursecom/status/2080802781087089047) · [@Manixh02](https://x.com/Manixh02/status/2012387306683146646) · [@daddy__broccoli](https://x.com/daddy__broccoli/status/2027090187361362259) · [@thaiscbranco_](https://x.com/thaiscbranco_/status/2066912871649574945) · [@AnandChowdhary](https://x.com/AnandChowdhary/status/1958306807899934738) · [@aakashgupta](https://x.com/aakashgupta/status/2038146639303512255), [CLAUDE.md](https://x.com/aakashgupta/status/2042755527835537814) · [@jlehman_](https://x.com/jlehman_/status/1910466216520819015) · [@liquidai](https://x.com/liquidai/status/2074494130126811473) · [@builtbyprajwal on Threads](https://www.threads.com/@builtbyprajwal/post/DWOv7eyCZUj/commit-often-revert-when-stuck-vibe-coding-era-ai-codes-fast-fast-coding-can)

**X posts — [mirror-quoted] (quoted inside the fetched `rohitg00/awesome-claude-design` README; not independently verified):**
- [@claudeai](https://x.com/claudeai/status/2045156267690213649) · [@petergyang](https://x.com/petergyang/status/2045527271650558383) · [@brewmarkets](https://x.com/brewmarkets/status/2045175784554283228) · [@Flomerboy](https://x.com/Flomerboy/status/2045162321589252458)

**[search-summary] only — leads, not findings; every number below is unverified and the page could not be opened:**
- [METR, Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) and [arXiv 2507.09089](https://arxiv.org/abs/2507.09089) — `EGRESS_BLOCKED`
- [METR, We are Changing our Developer Productivity Experiment Design (2026-02-24)](https://metr.org/blog/2026-02-24-uplift-update/) — `EGRESS_BLOCKED`
- Stanford / Yegor Denisov-Blanch greenfield-brownfield and rework figures — no primary source reachable
- [DORA, Balancing AI tensions](https://dora.dev/insights/balancing-ai-tensions/) — not fetched
- [Addy Osmani, The 70% problem](https://addyo.substack.com/p/the-70-problem-hard-truths-about) — not fetched
- [Martin Fowler, TDD inside the agent loop — theater or actual value?](https://martinfowler.com/articles/exploring-gen-ai/tdd-in-the-agent-loop.html) — `EGRESS_BLOCKED`; flagged as the most valuable single unfetched source for §5.3
