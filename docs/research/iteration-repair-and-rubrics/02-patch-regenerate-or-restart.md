# Patch, Regenerate, or Restart — Choosing the Repair Move After a Miss

**Scope:** Document 02 of the iteration-repair-and-rubrics stream. The loop this stream studies is *generate → vibe-code a few rounds → test → find a miss → repair → make the miss stop recurring*. This doc owns exactly one decision in that loop: **once a miss has been found, what is the best mechanical way to fix it** — patch in place, regenerate the unit, roll back to a checkpoint and re-run, or escalate the fix up a level so the next generation is right. It covers the four moves and their measured tradeoffs, the context-state variable that silently decides which of them can work, the rollback and checkpointing machinery as it actually ships in September 2026 (and precisely what each tool does *not* restore), diff discipline and the regression guards that make a patch safe, and the special case this repo lives in: a defect that is visual or interaction-level rather than a stack trace.

Out of scope, with owners named: **the taxonomy of what gets missed** belongs to doc 01 of this stream; **turning a fix into a durable rubric line** belongs to doc 03; **practitioner anecdotes and the X/Twitter field record** belong to docs 05 and 06. Surgical editing *of construction files* — JSON Patch vs merge patch vs domain verbs, id-keyed addressing, fast-apply models, the drift rule — is owned by [prototype-construction/05](../prototype-construction/05-surgical-editing-iteration.md) and is cross-linked here rather than repeated; this doc owns the *general* repair decision, including for ordinary code. Where the durable fix should *live* (hook → schema → rule → skill → exemplar → optimizer) is the fix-altitude ladder in [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md); this doc only decides *when* to reach for it. Deterministic graders, VLM-judge limits and the grade record are [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md). Anchoring a comment to a DOM element is [prototype-review-overlay/01](../prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md).

Researched September 2026. Every claim links its source, but **not every claim was verified by fetching that source** — read the verification note immediately below before trusting a number.

## Verification constraints (read this first)

This session's network egress policy blocked direct fetching of most hosts. What that means for the evidence in this document:

- **Reachable and personally fetched** (content read, quotes taken from the page): `code.claude.com`, `platform.claude.com`, `github.com`, `raw.githubusercontent.com`, `www.microsoft.com`. These are marked **[fetched]**.
- **Blocked by the proxy with a 403**, attempted and refused: `arxiv.org`, `anthropic.com`, `trychroma.com` / `research.trychroma.com`, `aider.chat`, `cursor.com`, `docs.cursor.com`, `code.visualstudio.com`, `playwright.dev`, `git-scm.com`, `x.com`, `huggingface.co`, `en.wikipedia.org`, `understandlegacycode.com`, `dev.to`, `software-lab.org`, `addyosmani.com`, `simonwillison.net`, `developer.chrome.com`, `github.blog`. These are marked **[blocked: \<host\>]**.
- **Search-derived only.** `WebSearch` runs server-side and returns titles, URLs and an index-derived summary. That is *not* page verification. Anything resting on it is marked **[search summary]**, including every practitioner quote and every arXiv figure.
- **Workaround used, and its limits.** Where a canonical page was blocked but the project publishes its sources on GitHub, the underlying file was fetched instead and is cited as such: Aider's website markdown and its raw leaderboard data file, Playwright's `docs/src/*.md`, and git's own `Documentation/*.adoc`. These are genuine primary sources — the same text the blocked page renders — and are marked **[fetched]** with the blocked canonical URL named alongside.

**Claims a future session with wider egress should harden first,** in priority order: (1) the *Regression Accumulation* figures (542 tasks / 6 models / 26,016 turns; 40–73%; the Verification Gate result) — this is the paper this document leans on hardest and it is search-derived; (2) the SWE-bench-Live patch-size curve (48% for sub-five-line single-file fixes, <10% above three files or a hundred lines); (3) Chroma's context-rot report body, including the "18 models" figure; (4) Cursor's and VS Code's checkpoint documentation, where the exclusion lists are load-bearing for §3; (5) Anthropic's context-engineering essay; (6) the NoLiMa model count, where the fetched README (12 models, ten below 50%) and the search-derived abstract (13 models, 11 below 50%) disagree.

Rough balance: the mechanics in §3 and §4's edit-format numbers rest on fetched primary sources; the research in §2 and the practitioner layer are predominantly search-derived. Call it two-thirds verified, one-third indexed.

## Table of Contents

1. [The four repair moves, compared](#1-the-four-repair-moves-compared)
2. [Context state is the hidden variable](#2-context-state-is-the-hidden-variable)
3. [Rollback and checkpointing, as they ship in September 2026](#3-rollback-and-checkpointing-as-they-ship-in-september-2026)
4. [Making the patch minimal and safe](#4-making-the-patch-minimal-and-safe)
5. [Repairing a design defect specifically](#5-repairing-a-design-defect-specifically)
6. [When the patch is the wrong answer entirely](#6-when-the-patch-is-the-wrong-answer-entirely)
7. [Cross-cutting themes](#cross-cutting-themes)
8. [Recommendations: the repair-decision table and the patch protocol](#recommendations-the-repair-decision-table-and-the-patch-protocol)
9. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
10. [Sources](#sources)

---

## 1. The four repair moves, compared

**What it is:** A miss has been found — the confirmation step has no error state, the card grid breaks at 375px, the primary button is the wrong blue. Four mechanically distinct things can be done about it, and they are usually treated as one ("just tell it to fix it"):

- **(a) Surgical patch** — the smallest possible diff, applied by an edit tool or a search/replace block, in the session you are already in.
- **(b) Regenerate the unit** — throw away the component, file, or screen and re-emit it from an updated spec, keeping everything around it.
- **(c) Roll back and re-run** — restore a checkpoint (or a branch) from before the rounds that produced the miss, and run again with a better prompt.
- **(d) Escalate the fix up a level** — change the spec, schema, skill, rule or template so the *next* generation is right, and let the artifact be re-derived.

**Why it matters:** The four moves have different blast radii, different costs, and — critically — different *preconditions*. (a) requires that the model still holds an accurate picture of the file; (c) requires that a checkpoint exists and that the good work since it is cheap to redo; (d) requires that the miss is a class, not an instance. Choosing by habit rather than by signal is how a session goes from one small defect to a screen nobody trusts. The measured background is unforgiving: across six models and 542 multi-turn programming tasks, **40% to 73% of tasks lost previously-correct behaviour over the course of the conversation**, with the largest early losses at turn 2 or turn 3 ([*Regression Accumulation in Multi-Turn LLM Programming Conversations*](https://arxiv.org/abs/2607.01855), arXiv 2607.01855 — **[search summary]** **[blocked: arxiv.org]**). Repair is where that regression is introduced.

**Key findings:**

| Move | Wins when | What it costs | What it risks | Evidence |
|---|---|---|---|---|
| **(a) Surgical patch** | Blast radius is one element or one prop; the unit has a test or a measurable assertion; the session is still short and the model has read the file recently | Cheapest by an order of magnitude — a patch is tens to hundreds of output tokens against thousands for a rewrite ([prototype-construction/05 §7.1](../prototype-construction/05-surgical-editing-iteration.md)) | The model patches its *memory* of the file rather than the file; a wrong search string silently no-ops or matches twice; in a degraded session the patch encodes the same misunderstanding that produced the miss | Patch-vs-regenerate token and quality economics in [prototype-construction/05 §2.2](../prototype-construction/05-surgical-editing-iteration.md); success rate falls sharply as a fix spans more files and lines (§4 below) |
| **(b) Regenerate the unit** | The unit is small, self-contained and *specified* (a component, a construction-file node, a screen with a written intent); the defect is structural rather than a one-line value; the model is weak at precise addressing | Re-rolls every decision inside the unit, including ones a human already approved; needs the spec to actually cover the detail | Silent loss of authored detail — the copy, the one-off animation, the edge-case styling nobody wrote down | Measured: on Aider's polyglot leaderboard, the one model run under both formats scored **16.4% with whole-file rewrites vs 8.0% with search/replace** ([leaderboard data](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml), **[fetched]**) — below a capability threshold, regenerating the unit beats patching it |
| **(c) Roll back and re-run** | You have corrected the same thing twice; the context is long or polluted; the work since the checkpoint is small; the miss looks like a consequence of an early wrong assumption | Throws away everything after the restore point, including good work; side effects outside the file system survive the rollback | False confidence — every checkpoint system restores strictly less than users assume (§3); a half-rollback (code but not conversation) leaves the transcript describing files that no longer exist | Vendor guidance is explicit: "If you've corrected Claude more than twice on the same issue in one session … A clean session with a better prompt almost always outperforms a long session with accumulated corrections" ([Claude Code best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**). Models "make assumptions in early turns … when LLMs take a wrong turn in a conversation, they get lost and do not recover" ([Laban et al., ICLR 2026](https://www.microsoft.com/en-us/research/publication/llms-get-lost-in-multi-turn-conversation/), **[fetched]**) |
| **(d) Escalate a level** | The same defect appears on a second screen, a second breakpoint, a second theme, or a second generation; the miss is an *absence* in the spec rather than an error in the code | Slowest; does not fix the artifact in your hand — must be paired with (a), (b) or (c) for the current instance | Over-escalation: a new rule for a one-off, spending a scarce always-on context slot on an instance-level fact | Spec Kit's Living Spec model: "When intended behavior changes, revise the existing `spec.md` first", then rerun plan and tasks ([spec-kit evolving-specs](https://github.com/github/spec-kit/blob/main/docs/guides/evolving-specs.md), **[fetched]**). Where the fix lands is the ladder in [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md) |

Three things about this table are worth stating plainly.

**The moves compose; they are not exclusive.** The common correct answer to a real miss is *(c) then (a) then (d)*: roll the artifact back to the last state you trusted, apply one minimal patch from a clean context, and write the spec line so the next generation does not repeat it. Treating them as a menu of one is the mistake.

**The patch is the default, and the default is often right.** Nothing in the evidence says patching is bad; it says patching is bad *in a degraded context* and *at scale*. A one-line token fix in a session five turns old, with a test that fails before and passes after, is the whole job.

**(b) and (d) are not the same move.** Regenerating the unit from the spec you already had fixes an execution failure. Escalating rewrites the spec because the spec was wrong or silent. Confusing them produces the most common spec-driven-development failure: regenerating repeatedly from a spec that never contained the missing requirement, and blaming the model.

**Open questions:** No public benchmark compares the four moves head-to-head on the same defect set. [DesignBench](https://github.com/webpai/designbench) is the closest available instrument — 900 webpage samples across 11 topics, 9 edit types and 6 issue categories, with separate **generate / edit / repair** task families and 15 models evaluated (README **[fetched]**) — but its README publishes no head-to-head numbers and its paper was not reachable here. Building that comparison on DesignBench's repair split is the obvious experiment; it is cheap and nobody has published it.

---

## 2. Context state is the hidden variable

**What it is:** Whether the move you choose can work at all depends on a variable that is invisible in the diff and rarely inspected: how much accumulated, partly-wrong conversation the model is reasoning through when it makes the fix.

**Why it matters:** Every practitioner has met the pattern — the third fix attempt is worse than the first, and the model starts "fixing" things nobody complained about. This is not a vibe. It has three measured mechanisms, and they stack.

**Key findings:**

**Mechanism 1 — long context degrades before it overflows.** Chroma's *Context Rot* work is the reference: a toolkit and technical report (July 2025) covering three experiments — a NIAH extension with controlled needle–question similarity, LongMemEval, and a repeated-words replication task — whose headline is that "model performance varies significantly as input length changes, even on simple tasks" ([chroma-core/context-rot](https://github.com/chroma-core/context-rot), README **[fetched]**; the report itself at `research.trychroma.com/context-rot` is **[blocked: research.trychroma.com]**, and the widely-cited "18 models" figure is **[search summary]**). The independent, peer-reviewed version is NoLiMa (ICML 2025), which removes literal lexical overlap between question and needle so models must infer the association. Its published results table (from the [adobe-research/NoLiMa README](https://github.com/adobe-research/NoLiMa), **[fetched]**): **12 models** claiming ≥128K support, of which **ten fall below 50% of their short-context baseline at 32K**; GPT-4o drops from a 99.3% base to 69.7% at 32K with an *effective length of 8K*; Llama 3.3 70B from 97.3% to 59.5% with an effective length of **2K**; Claude 3.5 Sonnet from 87.6% to 45.7%, effective length 4K. (A search snippet of the arXiv abstract reports 13 models and 11 below 50% — likely a later revision; the fetched README's numbers are the ones quoted here.) The operative number for repair work is *effective length*, not window size: a model advertising 128K–1M tokens may be reasoning reliably over a few thousand.

**Mechanism 2 — multi-turn conversation degrades independently of length.** Laban et al., *LLMs Get Lost In Multi-Turn Conversation* (ICLR 2026), simulated 200,000+ conversations and found an **average 39% performance drop** from single-turn to multi-turn across six generation tasks. The decomposition is the important part: **aptitude fell only ~15%, while unreliability rose ~112%** — the models did not get dumber, they got erratic — and the paper's conclusion is the sentence this whole document is organised around: models "make assumptions in early turns and prematurely attempt to generate final solutions, on which they overly rely", and "when LLMs take a wrong turn in a conversation, they get lost and do not recover" ([Microsoft Research publication page](https://www.microsoft.com/en-us/research/publication/llms-get-lost-in-multi-turn-conversation/), **[fetched]**).

**Mechanism 3 — the model treats its own prior output as ground truth.** The specific programming case is *Regression Accumulation in Multi-Turn LLM Programming Conversations*: 542 tasks, six models, 26,016 turn instances; **40–73% of tasks lose previously-correct behaviour** over the conversation; the dominant failure class is named *Cross-Turn Conflict* — new requirements integrated in a way that breaks earlier-turn requirements — and of the mitigations tested, a **Verification Gate was the only one yielding consistent gains across both stronger and weaker models**. The paper's framing is the right one for this stream: "conversational code generation should be treated as an evolving maintenance process rather than a sequence of isolated prompt outcomes" (arXiv 2607.01855 — **[search summary]** **[blocked: arxiv.org]**). This is a 2026 paper measuring precisely the loop the owner described, and it says the loop leaks by default.

**What practitioners and vendors do about it.** The four available interventions are not equivalent, and the differences are mechanical:

| Intervention | What it actually does | What it loses | Source |
|---|---|---|---|
| `/compact` (or auto-compact) | Replaces conversation history with a structured summary; system prompt, project-root CLAUDE.md, auto memory and the plan are re-injected from disk; up to five most-recently-modified files are re-read; invoked skill bodies are re-injected **capped at 5,000 tokens per skill and 25,000 total, oldest dropped first** | The skill *listing* is not re-injected; a re-read file over 5,000 tokens returns as a path reference, not content; path-scoped rules reload only when a matching file is next read; conversation-only instructions are gone | [Context window — what survives compaction](https://code.claude.com/docs/en/context-window) **[fetched]** |
| `/clear` | Empty context, previous conversation saved and resumable; costs nothing (compaction, by contrast, "reads the conversation it summarizes, so compacting a large context is itself a large request") | Everything not written down | [Manage sessions](https://code.claude.com/docs/en/sessions), [Manage costs](https://code.claude.com/docs/en/costs) (both fetched) |
| Partial summarize via `/rewind` | **Summarize from here** condenses forward from a chosen message; **Summarize up to here** condenses everything before it and keeps recent messages in full; both accept guiding instructions | Files on disk are unchanged — this is a context operation, not a repair | [Checkpointing](https://code.claude.com/docs/en/checkpointing) **[fetched]** |
| API-level context editing | `clear_tool_uses_20250919` clears the oldest tool results once input passes a **100,000-token trigger**, keeping the last **3 tool uses**, replacing each cleared result with a placeholder; pairs with the memory tool, which warns the model to write down what matters before clearing | Tool *results* (file contents, search output) vanish from history; the model must have externalised anything it still needs | [Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) **[fetched]** |

Vendor guidance now states the degradation as the *organising constraint* rather than a caveat: "Most best practices are based on one constraint: Claude's context window fills up fast, and performance degrades as it fills" — and names two of this document's failure modes explicitly, "the kitchen sink session" and "correcting over and over", with the same remedy for both: `/clear` and a better prompt ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**). Anthropic's context-engineering essay adds the architectural version — compaction, structured note-taking, sub-agent isolation and just-in-time retrieval, under the principle of finding "the smallest set of high-signal tokens that maximize the likelihood of your desired outcome" (**[search summary]** **[blocked: anthropic.com]**).

Practitioner practice on X converges on the same rules, expressed more bluntly. "If you use any coding agents: > new session for new tasks > if Claude makes a mistake, REWIND, don't correct > compact early with a direction '/compact focus on' > prefer /clear over /compact" (@Hesamation, **[search summary]** **[blocked: x.com]**). "A pro-tip is to actively clear context yourself using /clear or /compact rather than waiting for auto-compact to happen mid-task, which can hurt performance" (@avthar, **[search summary]**). The single most repeated tip in the 2026 Claude Code tip genre is Esc+Esc rather than a corrective prompt, on the stated reasoning that "correcting mistakes mid-conversation doesn't always work, because the model carries the context of those mistakes forward" (@svpino and others, **[search summary]**). Docs 05 and 06 of this stream own this material; it is summarised here only because it is the practitioner answer to §2's question. The one convergence worth keeping: **nobody's advice is "explain it better in the same thread."**

**Re-anchoring: the rule that makes a restart safe.** A cleared session is only an improvement if the model re-derives its picture from *artifacts* rather than from a summary of a conversation that was already wrong. The mechanics support this directly — compaction re-reads files from disk and re-injects CLAUDE.md and the plan, but summarises the conversation — so the practical discipline is: put the durable facts where a reload will find them (the spec file, the failing test, CLAUDE.md, the construction file) and let the transcript be disposable. Anthropic's own recommended flow for larger features ends with exactly this handoff: interview, "write a complete spec to SPEC.md", then "start a fresh session to execute it. The new session has clean context focused entirely on implementation, and you have a written spec to reference" ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**).

**Open questions:** **No public measurement exists** comparing "fix forward in the polluted session" against "`/clear`, re-anchor on the file, re-prompt" on the same defect set — the exact question this stream asks. The two nearest data points are the recap mitigation in the lost-in-conversation work (GPT-4o-mini improving from 50.4% to 66.5% when made to restate accumulated information before answering, **[search summary]**) and the Verification Gate result above. Both support the restart, neither measures it. This is the single most valuable experiment available to this repo, and it is a weekend's work: take 20 real misses, fix each twice (in-session vs cleared-and-re-anchored), grade blind with the rubric from [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md).

---

## 3. Rollback and checkpointing, as they ship in September 2026

**What it is:** The undo layer under vibe coding: agent-native checkpoints in the harness, and git underneath.

**Why it matters:** Every rollback affordance restores *less* than its name implies, and the gap is where people lose work. The pattern is identical across four vendors: **the checkpoint covers what the edit tool wrote, and nothing else.** Everything an agent does through a shell — and shells are how agents scaffold, install, move, generate and migrate — is outside it.

**Key findings:**

| Mechanism | What it restores | What it does **not** restore | Source |
|---|---|---|---|
| **Claude Code `/rewind` / Esc+Esc** | A checkpoint per prompt that starts a turn; restore code, conversation, or both; **100 most recent checkpoints** per session; checkpoints saved with the conversation so rewind survives a resume; a `/resume <session-id> (previous session)` entry lets you rewind past a `/clear` in the same process (v2.1.191+) | Files modified by **bash** commands (`rm`, `mv`, `cp`) — "These file modifications cannot be undone through rewind"; **subagent edits** (except a foreground forked skill) — "Use git to revert them"; external and concurrent-session edits; **messages that joined a running turn** (no checkpoint, not listed); **symlinked and hard-linked paths**, which are skipped with a `Restored the code, but skipped N files` warning (pnpm hard-links, dotfile-manager symlinks); snapshots deleted in the ~30-day retention sweep, after which restore fails with `No files were restored` | [Checkpointing](https://code.claude.com/docs/en/checkpointing) **[fetched]** |
| **Claude Code `/branch`, `--fork-session`** | Copies the transcript to a new session id and switches you into it; the original is unchanged on disk and stays in the picker; "Allow for this session" grants carry over in-process | Nothing on disk — this branches the *conversation*, not the working tree | [Manage sessions](https://code.claude.com/docs/en/sessions) **[fetched]** |
| **Claude Code `claude -w` / `--worktree`** | Starts the session in its own git worktree and branch, so parallel attempts do not collide | Not a rollback at all — an isolation primitive | [CLI reference](https://code.claude.com/docs/en/cli-reference) **[fetched]** |
| **Cursor checkpoints** | Snapshot per agent message; click a checkpoint in the chat timeline to preview and restore files; stored locally, separate from git | Files changed by **terminal commands the agent ran**, and your own manual edits; restoring reverts files but does not remove conversation messages; it is all-or-nothing across tracked files | Cursor docs **[search summary]** **[blocked: cursor.com, docs.cursor.com]** |
| **VS Code / GitHub Copilot chat checkpoints** | Snapshot of affected files before each chat request; `chat.checkpoints.enabled`, on by default; restore, and redo the undone restore | Confirmed open bug: **agent memory files are not reverted** when restoring a checkpoint or editing an earlier message, producing what the reporter calls a "logic persistence loop" where the agent keeps using information from the discarded branch ([microsoft/vscode#307617](https://github.com/microsoft/vscode/issues/307617), opened 3 Apr 2026, labelled Bug, open — fetched). Restoring mid-request can leave the agent still generating edits (**[search summary]**, microsoft/vscode#285271) | Issue **[fetched]**; docs page **[search summary]** **[blocked: code.visualstudio.com]** |
| **OpenAI Codex CLI** | No first-class undo at time of writing | [openai/codex#9203, "Please make `/undo` back"](https://github.com/openai/codex/issues/9203) is **open** (Jan 2026), filed after the tool "unintentionally deleted untracked files or modified uncommitted changes"; a later request, [#16784](https://github.com/openai/codex/issues/16784) (4 Apr 2026), was closed as a duplicate of it. The stated obstacle, per the issue text, is that shell, `unified_exec` and MCP tools mutate files without leaving a structured mutation record (**[search summary]** for that line) | Both issues fetched |
| **`git worktree`** | "Manage multiple working trees attached to the same repository … allowing you to check out more than one branch at a time"; `git worktree add ../hotfix` creates and checks out a branch; **`git worktree add -d <path>`** makes a throwaway detached-HEAD worktree for "experimental changes or … testing without disturbing existing development"; `remove`/`prune` clean up | Nothing is automatic — worktrees prevent collisions, they do not undo anything | [git/git `Documentation/git-worktree.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-worktree.adoc) (**[fetched]**; **[blocked: git-scm.com]**) |
| **`git revert`** | "revert the changes that the related patches introduce, and record some new commits that record them" — forward-only undo, safe on shared history. "This requires your working tree to be clean" | Does not touch uncommitted work; the doc explicitly points at `git reset --hard` and `git restore` for that, warning both "will discard uncommitted changes in your working directory" | [`git-revert.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-revert.adoc) **[fetched]** |
| **`git stash`** | "record the current state of the working directory and the index, but … go back to a clean working directory"; list, `show`, and `apply` — "potentially on top of a different commit" | Untracked files unless asked for; it is a shelf, not a history | [`git-stash.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-stash.adoc) **[fetched]** |

**The burn list — what actually costs people work, in rough order of frequency:**

1. **Anything a shell wrote.** The largest hole, and identical across vendors. Claude Code documents it; Cursor documents it; Codex's missing undo is blamed on it. There is a live Claude Code bug report of `/rewind` *silently* failing on bash-edited files under auto mode ([anthropics/claude-code#87575](https://github.com/anthropics/claude-code/issues?q=is%3Aissue+rewind+bash+not+restored), open, 18 Aug 2026 — issue list fetched, individual issue body not).
2. **Untracked files.** Nothing in git protects a file git has never seen; the Codex undo request was filed over exactly this. `git add -A` before an experiment, or `git stash -u`, is the cheap defence.
3. **Agent memory.** Confirmed reverted-nothing in VS Code (#307617). In Claude Code, auto memory lives at `~/.claude/projects/<project>/memory/`, outside the repository, is shared across all worktrees of the repo, and is **explicitly excluded from the retention sweep** — it "stays until you or Claude edits or deletes them" ([memory docs](https://code.claude.com/docs/en/memory), **[fetched]**). The docs do not state whether checkpoints cover it; treat a rollback as **not** unlearning what the agent wrote down, and check `/memory` after a big rewind. Flagged as an open question, not a finding.
4. **Side effects with no file.** Migrations run, packages installed, deploys, API calls, pushed commits, rows written. No checkpoint system claims these, and the honest summary is that rewind is for local files only.
5. **Snapshot expiry.** Claude Code keeps 100 checkpoints per session and sweeps snapshots ~30 days after the session last saved one; `cleanupPeriodDays` extends it. A month-old session is not a rollback target.
6. **Symlinks and hard links.** Skipped silently-ish (a warning, not a failure) — which bites hardest in pnpm workspaces and dotfile-managed config.
7. **The half-rollback.** Restoring code but not conversation leaves a transcript asserting the existence of changes that are gone; restoring conversation but not code leaves files nobody in the session remembers writing. Both are context poison. Restore both unless you have a specific reason.

**The rule that follows:** *the only checkpoint you should trust for a repair is a git commit.* Agent checkpoints are excellent for the thirty-second oops and are explicitly documented as "not a replacement for version control". Before a repair attempt of any size: commit (or stash with `-u`), and for anything speculative, branch or `git worktree add -d`. Branch-per-attempt and worktree-per-attempt are the same idea at different isolation strengths, and Claude Code's `-w` flag makes the second one a one-liner.

**Open questions:** Whether agent-written memory should be checkpoint-scoped is unsettled across all four vendors — VS Code calls it a bug, Claude Code does not document it either way. Nobody publishes a measured rate of "rollback did not restore what the user expected", which would be the most useful reliability number in this whole area.

---

## 4. Making the patch minimal and safe

**What it is:** Once (a) is the chosen move, two questions remain: how small can the diff be made, and what stops it damaging what already worked.

**Why it matters:** Diff size is the cheapest available proxy for risk, and it is a proxy the operator controls. The evidence is that fix success collapses as a change spreads: on SWE-bench-Live, a single-file patch changing fewer than five lines is resolved roughly **48%** of the time, while patches touching three or more files, or spanning more than a hundred lines, fall **below 10%** (*SWE-bench Goes Live!*, arXiv 2505.23419 — **[search summary]** **[blocked: arxiv.org]**; the [SWE-bench-Live repo](https://github.com/microsoft/SWE-bench-Live) was fetched and confirms the dataset — 1,077 instances across 431 repositories and 8 languages as of August 2026 — but publishes no patch-size numbers in its README). The counter-caution is equally measured: small does not mean correct. Studies of SWE-bench Verified report that limited test coverage lets a share of "plausible" patches pass while failing full developer suites, and that a substantial fraction of plausible patches diverge behaviourally from human ground truth (**[search summary]**). **Smallest *correct* diff** is the rule; "smallest diff" alone optimises for the wrong thing.

**Key findings — the measured case on edit formats.** Aider's benchmarks remain the canonical published measurement of how the *shape* of an edit changes model behaviour. `aider.chat` is blocked to this session, so the numbers below were read from the source markdown of those same pages in the Aider repository, and from the leaderboard's raw data file:

- **The laziness benchmark** (89 Python refactoring tasks designed to provoke elision): `gpt-4-1106-preview` scored **20% with search/replace blocks and 61% with unified diffs**, with lazy comments dropping from 12 tasks to 4; `gpt-4-0613` went **26% → 59%**, against a hard ceiling of 72% because 28% of tasks exceeded its 8K window ([unified-diffs.md](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/unified-diffs.md), **[fetched]**). The stated mechanism is worth repeating because it generalises to design work: "With unified diffs, GPT acts more like it's writing textual data intended to be read by a program, not talking to a person."
- **The negative result on prompt folklore, from the same run:** "It's worse to add a prompt that says the user is blind, has no hands, will tip \$2000 and fears truncated code trauma. Widely circulated 'emotional appeal' folk remedies produced worse benchmark scores for both the baseline SEARCH/REPLACE and new unified diff editing formats." Format beats incantation; this is one of very few places where the folk-prompting genre has been measured and falsified.
- **No format wins everywhere.** Aider ships `whole`, `diff` (search/replace), `diff-fenced` (for Gemini models, "which often fail to conform to the fencing approach specified in the diff format"), `udiff`, and `editor-diff`/`editor-whole` for architect mode, because "Different models work better or worse with different edit formats" ([edit-formats.md](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/more/edit-formats.md), **[fetched]**).
- **The well-formedness tax, computed from the raw leaderboard data** ([polyglot_leaderboard.yml](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml), fetched 12 Sep 2026; 69 runs dated 2024-12-21 → 2025-10-03):

  | Edit format | Runs | Median % cases well-formed | Mean | Min | Runs below 90% well-formed | Best pass rate |
  |---|---|---|---|---|---|---|
  | `diff` (search/replace) | 47 | 94.2 | 92.2 | 64.4 | **9 of 47** | 88.0 (gpt-5 high) |
  | `whole` | 15 | 99.6 | 98.3 | 92.9 | **0 of 15** | 49.3 |
  | `diff-fenced` | 4 | — | 97.3 | 92.4 | 0 of 4 | 83.1 |
  | `architect` | 3 | 100.0 | 100.0 | 100.0 | 0 of 3 | 78.2 |

  Read carefully: this is an aggregate across different models and dates, **not** a controlled comparison — strong models are run on `diff` and weak ones on `whole`, so the pass-rate column mostly reflects model quality. The *well-formedness* column is the honest signal, and it says search/replace costs you roughly 5 points of median well-formedness and produces the entire tail of badly-formed runs. The single controlled pair in the file is `Qwen2.5-Coder-32B-Instruct`: **8.0% pass / 71.6% well-formed with `diff`, versus 16.4% pass / 99.6% well-formed with `whole`.** Below a capability threshold, asking for a surgical patch *is* the bug.
- **Staleness, stated:** the leaderboard data file on `main` contains no entries after 3 October 2025, so the canonical measured source on edit formats is roughly eleven months old as of this writing, even though the project itself is active (its release notes list Claude Opus 4.5/4.6/4.7 and GPT-5.1–5.4 model support). Treat the numbers as directional for 2026 frontier models.

**Key findings — how to force minimality in practice.**

| Lever | Mechanism | Note |
|---|---|---|
| **Explicit scope instruction** | State the allowed blast radius in the prompt: one file, one symbol, no refactors, no dependency changes, no file moves. The prompt shape is in the Recommendations section | The practitioner formulation circulating in 2026 is "Fix this with the smallest safe change. No unrelated refactors. No dependency changes. No file moves unless absolutely necessary" (**[search summary]**) |
| **Edit-only tooling** | Prefer a search/replace or structured-edit tool over "rewrite this file"; in Aider, `--edit-format` forces it; in a construction-file pipeline, the five-verb patch API does it structurally ([prototype-construction/05 §2.1](../prototype-construction/05-surgical-editing-iteration.md)) | With a weak model, invert this — see the Qwen pair above |
| **Plan before patch, for anything non-obvious** | "If you could describe the diff in one sentence, skip the plan"; otherwise plan mode separates exploration from execution and keeps the exploration out of the edit ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**) | A one-sentence describable diff is also the definition of a good patch |
| **Diff review as a gate** | Read the diff, not the summary. `git add -p` forces per-hunk consent | The reviewer is the only stage that sees collateral damage the tests do not cover |
| **Pre-commit / PostToolUse hooks** | Deterministic gates that cannot be reasoned around — lint, typecheck, token-drift grep, a11y. The guardrail ladder is [design-sdlc/04 §7](../design-sdlc/04-small-model-guardrails.md) and the recipes are in [hooks.md](../../../skill-resources/hooks.md) | Vendor line: hooks "are deterministic and guarantee the action happens", CLAUDE.md instructions "are advisory" |
| **Blast-radius diff check** | After the patch, pixel-diff the affected screen against the previous build: only the region you touched should differ; a large diff elsewhere is the signal to revert ([prototype-construction/05 §5](../prototype-construction/05-surgical-editing-iteration.md)) | The cheapest collateral-damage detector that exists for UI |

**Key findings — guarding against collateral damage.**

The discipline that matters most is **writing the guard before the patch**, not after. Three forms, in increasing specificity:

- **Characterization / golden-master tests.** Named by Michael Feathers in *Working Effectively with Legacy Code* (2004): a test that records what the code currently does and fails if a later change alters that recorded behaviour, used to build a regression net around code you are about to change (**[search summary]** **[blocked: understandlegacycode.com, en.wikipedia.org]**). The operational rule practitioners attach to it is the one that matters for agents: **re-baselining must be an explicit, reviewed, human action, never an automatic "update baseline on failure"** — otherwise the agent launders its own regression into the new baseline (**[search summary]**).
- **Snapshot / visual tests.** Playwright's `toHaveScreenshot()` writes the golden on first run and compares thereafter; goldens are updated only with `--update-snapshots`, and the docs carry an explicit warning that rendering varies with "host OS, version, settings, hardware, power source (battery vs. power adapter), headless mode", so baselines must be generated in the environment that will compare them ([playwright `docs/src/test-snapshots-js.md`](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/test-snapshots-js.md), **[fetched]**; **[blocked: playwright.dev]**). Thresholds, `maxDiffPixels`, pixelmatch and SSIM/LPIPS tradeoffs are owned by [eval-tuning-loops/01 §1](../eval-tuning-loops/01-grading-generated-prototypes.md) and not repeated.
- **The failing-test-first loop, applied to a design defect.** The general version is vendor-endorsed: "write a failing test that reproduces the issue, then fix it", and more broadly "Give Claude a check it can run… Claude stops when the work looks done. Without a check it can run, 'looks done' is the only signal available" ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**). For a *visual* defect the test must assert a **measurement**, not an impression — computed gap equals the token value, contrast ratio ≥ 4.5:1, no horizontal overflow at 375px, the error state renders for route X in state Y. §5 covers how to derive those numbers.

Two reinforcements worth naming because they are measured or explicitly documented. First, the Verification Gate was the **only** mitigation that improved regression accumulation consistently across strong and weak models (arXiv 2607.01855 — **[search summary]** **[blocked: arxiv.org]**); a gate is not hygiene, it is the intervention. Second, a fresh-context adversarial reviewer — a subagent that "sees only the diff and the criteria you give it, not the reasoning that produced the change" — is the documented way to get a second opinion without paying the same context rot, with the caveat printed alongside it: "A reviewer prompted to find gaps will usually report some, even when the work is sound… Chasing every finding leads to over-engineering" ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**).

**Open questions:** The Aider edit-format evidence has not been refreshed for 2026 frontier models, and no one has published the equivalent measurement for *design* edits (CSS/token/layout changes), where the failure modes differ from Python refactors. Whether the well-formedness tax of search/replace has closed with newer models is, right now, unmeasured in public.

---

## 5. Repairing a design defect specifically

**What it is:** The repair case this repo actually lives in. The defect has no stack trace: a human looked at a screen and said the spacing is off, the hierarchy is wrong, the empty state is missing, the hover does nothing.

**Why it matters:** Everything in §1–§4 assumes you can *name* the defect precisely enough to bound a patch. For a design defect you usually cannot, and the model cannot see it either. The evidence for that is unambiguous and is owned by [eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md): DiffSpot mutates CSS properties across 13 operators and finds that "even the best model identifies only 40.7% of true changes, with Hard-tier Recall below 23% for every model". A VLM handed a screenshot and "the spacing looks wrong" is guessing. Repair quality therefore depends almost entirely on how well you convert a human impression into an addressed, measured, bounded defect before any of the four moves is chosen.

**Key findings:**

**Localise down the ladder: element → component → token → rule.** The diagnostic question is not "what is wrong here" but **"if this were fixed correctly, what else would change?"**

| Evidence | Level the defect lives at | Move |
|---|---|---|
| Appears on one instance of one screen only | Element / instance | (a) patch the instance |
| Appears on every instance of one component, on every screen | Component | (a) patch the component once — never the instances |
| Appears across unrelated components (all the "wrong blue", all the off-scale gaps) | Token / theme | (a) patch the token, then re-render everything and diff — a systemic fix applied once ([theming/00](../theming/00-theming-architecture.md), [prototype-construction/05 §4.1](../prototype-construction/05-surgical-editing-iteration.md)) |
| Appears in every newly generated screen, including ones generated after the fix | Rule / skill / schema | (d) escalate — the ladder in [eval-tuning-loops/03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md), and doc 03 of this stream for the rubric line |
| Appears only in one breakpoint, theme or state | Instance of a *missing case*, not a wrong value | usually (b) regenerate the unit with the case specified, because the case was never authored |

The cheapest way to run this test is mechanical: check the same element on a second route, a second breakpoint, and the opposite theme before touching anything. Two minutes there routinely turns a patch into a one-line token change.

**Hand the model what it cannot see.** A design defect report that works is a set of *numbers and addresses*, not adjectives. The components, and where each is already specified in this repo:

- **An address that survives regeneration.** Use the layered anchor record from [prototype-review-overlay/01 §9](../prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md) — `route`, `testId`, `source` (`data-src="file:line:col"`), `role` + accessible name, `quote`, `css`, `xpath`, `bbox`, `fingerprint`, `state`, `screenshot`. The two layers that matter most for repair are `source` (it points the agent at the file and line, collapsing localisation to a read) and `state` (route, theme, viewport, interaction — without it the agent fixes the wrong variant).
- **Measurements, not impressions.** `getBoundingClientRect()` for geometry and `getComputedStyle()` for the resolved values, captured for the element *and its parent*, so the model sees the gap, the padding and which one produced it. The reason to compute rather than describe is DiffSpot: the model's perception of the screenshot is the weakest link in the chain, and numbers route around it.
- **The expected value, named.** "gap is 14px, should be `--space-3` (12px)" is a patchable defect. "spacing looks off" is a research project.
- **The console and network.** Claude Code's Chrome integration exists for this: "read console errors and DOM state directly, then fix the code that caused them", plus screenshot-and-compare design verification ([Chrome integration](https://code.claude.com/docs/en/chrome), **[fetched]**; requires the Claude in Chrome extension ≥ 1.0.36 and a direct Anthropic plan). The vendor-neutral equivalent is [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) (README **[fetched]**), which gives any MCP client performance traces, network requests, screenshots, and "browser console messages (with source-mapped stack traces)" over Puppeteer — the source-mapped part is what turns a console error into a file and line.
- **An annotated screenshot.** UICrit's measured result — designer critiques *with bounding boxes* lifted feedback quality 0.31 → 0.48 normalized, a 55% increase — is the reason to draw on the image rather than attach it plain ([eval-tuning-loops/01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md) owns this citation).

**A defect report shape that produces a minimal patch:**

```md
Defect: <one sentence, observable>
Where:  route <url> · state <theme/viewport/auth/step> · element <testId or data-src file:line>
Seen:   <measured> e.g. computed row-gap 14px; button background #2563EB
Want:   <measured, named> e.g. row-gap var(--space-3) = 12px; background var(--color-primary)
Scope:  <checked routes/breakpoints/themes and the result> e.g. only /checkout at ≥1024px; /cart is correct
Proof:  <screenshot path> <computed-styles dump> <console excerpt>
Bounds: change only <file/symbol>. Do not restyle siblings, rename props, or touch the layout container.
Check:  <the assertion that must pass after> e.g. expect(gap).toBe('12px') at 1280px and 375px
```

**Why "make it look better" is the worst possible patch prompt.** It fails on all four of the things a patch prompt has to supply. It names no **address**, so the model chooses the blast radius and will choose a large one. It names no **expected value**, so there is no way to be right. It supplies no **evidence**, so the model falls back on the perception channel that DiffSpot shows is ~40% reliable. And it defines no **check**, so the loop cannot close — "Claude stops when the work looks done", and "looks done" is exactly the signal that produced the miss in the first place. Anthropic's own documentation uses this precise prompt as its counterexample: the Before column reads *"make the dashboard look better"*, and the After column reads *"[paste screenshot] implement this design. take a screenshot of the result and compare it to the original. list differences and fix them"* ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**). The cost doc adds the mechanism: "Vague requests like 'improve this codebase' trigger broad scanning" ([Manage costs](https://code.claude.com/docs/en/costs), **[fetched]**). In a design context the damage is worse than wasted tokens — an unbounded aesthetic instruction invites the model to revise things a designer already approved, and there is no test that will catch it.

**Open questions:** Whether handing a VLM computed DOM numbers alongside the screenshot closes the DiffSpot gap is untested (also flagged in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md)). No public dataset pairs a natural-language design complaint with the minimal correct diff that resolved it — which is the dataset this stream would need to make any of §5 measurable rather than merely reasoned.

---

## 6. When the patch is the wrong answer entirely

**What it is:** The cases where patching is not a smaller version of the right move but a different, wrong one.

**Why it matters:** Patching has a strong pull — it is fast, it is cheap, it feels responsive, and it produces a visible change immediately. The failure mode is a screen held together by fourteen point fixes that no spec describes and no test covers.

**Key findings — the six cases:**

1. **The miss is an absence in the spec, not an error in the code.** Nobody wrote down that the confirmation step needs an error state, so the generator did not produce one. A patch invents the missing requirement silently, in code, where nothing will read it back. Spec Kit's Living Spec model is the discipline: "When intended behavior changes, revise the existing `spec.md` first", then rerun plan and tasks, and "Run `/speckit.analyze` before implementation resumes to catch gaps between the spec, plan, and tasks" — starting "from a clean working tree or a dedicated branch so every generated change is reviewable" ([evolving-specs.md](https://github.com/github/spec-kit/blob/main/docs/guides/evolving-specs.md), **[fetched]**). Its Flow-Back rule is the anti-drift clause and the one most often broken in practice: "Do not leave a lower-level change in `tasks.md` or code if `spec.md` still says something different and the spec is meant to remain trustworthy."
2. **The third attempt.** After two failed corrections on the same issue, the context is the problem, not the prompt. Roll back, `/clear`, re-anchor on the file and the failing check, re-prompt once with everything you learned (§2).
3. **The defect recurs across units.** Patching each instance is O(n), drifts, and guarantees that the eleventh screen is wrong. Fix the token, the template, or the schema once and re-render — the quiet superpower of a deterministic builder ([prototype-construction/05 §4.1](../prototype-construction/05-surgical-editing-iteration.md)).
4. **The file is builder-owned.** In any pipeline with generated output, hand-editing regenerable files is the drift bug: the source now lies and the next build silently reverts the change. "Regenerable files are never hand-edited; hand-editable files are never regenerated" ([prototype-construction/05 §4.2](../prototype-construction/05-surgical-editing-iteration.md), which also covers detection and the re-adopt flow).
5. **The patch would exceed the unit's review budget.** Three or more files, or more than a hundred lines, is where measured fix success falls below 10% (§4). At that size the "patch" is a rewrite wearing a patch's clothes, and it gets none of a rewrite's hygiene — no fresh spec, no regenerated tests, no clean review.
6. **There is no check and no way to write one.** If you cannot express what "fixed" means as something a machine can evaluate — a test, an assertion on a computed value, a screenshot diff, at minimum a written acceptance line — then stop and get one before patching. "If you can't verify it, don't ship it" ([best practices](https://code.claude.com/docs/en/best-practices), **[fetched]**).

**The honest counter-case, because the spec-driven argument oversells.** "Never patch, always update the spec and regenerate" is a strong claim and it is **not measured**. No public benchmark compares regenerate-from-updated-spec against a minimal patch on the same defect set; DesignBench has the task families to do it and publishes no head-to-head in its README. And the claim has a real failure mode: regeneration re-rolls everything the spec does not pin, which in design work is most of what a human actually cares about — the copy, the one-off component, the deliberate off-pattern accent, the microcopy a writer edited by hand. A spec complete enough to make regeneration lossless is a spec that took longer to write than the screen. The defensible version of the rule is narrower, and it is the one this document recommends: **regenerate the unit when the defect is structural and the unit's authored detail is either trivial or itself captured in the spec; patch when the defect is a value and the unit carries approved detail.** Escalate to the spec in both cases, because that is what stops the next generation repeating it — but escalating the spec and regenerating the artifact are two decisions, not one.

**Open questions:** The cost curve of spec completeness — how much specification is needed before regeneration stops losing approved detail — is unmeasured, and it is the number that decides whether spec-driven development is economical for design prototypes specifically. [prototype-construction/16](../prototype-construction/16-spec-authorship-ux.md) covers the authorship side of the same question.

---

## Cross-cutting themes

1. **Blast radius is the unit of risk, not diff size.** A five-line change to a shared token is riskier than a hundred-line change inside one unexported component. Every signal in the decision table is ultimately a proxy for "what else can this change reach".
2. **The session has a half-life; the file does not.** Three independent measurement lines — context rot at length, multi-turn unreliability (+112%), regression accumulation (40–73% of tasks) — all say the same thing: the conversation is the least durable object in the loop. Repairs should be anchored on artifacts that survive a reset (the spec, the failing test, the construction file, CLAUDE.md), and the transcript should be treated as disposable.
3. **Every rollback tool rolls back less than its name implies, and the exclusions are identical across vendors.** What the edit tool wrote comes back; what the shell wrote does not. Git is the only checkpoint with no asterisks, and even it does not cover untracked files or external side effects.
4. **The gate, not the prompt, is the intervention.** The only mitigation that improved multi-turn regression consistently across model strengths was a verification gate; the only vendor advice repeated in every document fetched here is "give the agent a check it can run". Prompt craft matters, but Aider's measured falsification of emotional-appeal prompting is a useful reminder of its ceiling.
5. **Repair altitude and fix altitude are two decisions made at one moment.** "How do I fix this artifact" and "where does the durable fix live" have different answers, and answering only the first is how the same miss returns next week. [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) owns the second; doc 03 of this stream owns the rubric line that records it.
6. **A design defect must be turned into numbers before any move is chosen.** Localisation (element → component → token → rule) and measurement (`getBoundingClientRect`, `getComputedStyle`, console, annotated screenshot) are not repair steps — they are the inputs that make the repair decision answerable at all.

---

## Recommendations: the repair-decision table and the patch protocol

### The repair-decision table

Keyed on signals you can observe *before* choosing. Read top to bottom; the first row that matches wins. Evidence strength: **A** = measured in a published eval; **B** = vendor documentation or repeated practitioner report; **C** = reasoned from adjacent evidence.

| # | Observable signal | Move | Why | Ev. |
|---|---|---|---|---|
| 1 | You have already corrected the same thing **twice** in this session | **(c) roll back + `/clear` + re-prompt**, then (a) | Context is polluted with failed approaches; models "get lost and do not recover"; vendor guidance names this exact threshold | A/B |
| 2 | Session is long or auto-compact has fired, and the model's description of the file no longer matches the file | **(c) re-anchor**: `/clear`, re-read the file, restate the defect from measurements — then (a) | Effective context length is far below window size (NoLiMa); compaction drops the skill listing, truncates skill bodies, and returns >5K-token files as path references | A/B |
| 3 | Defect appears on a second screen, breakpoint, theme or generation | **(d) escalate** (token → template → schema → rule), then re-render | Systemic fixes applied once; per-instance patching is O(n) and drifts | B |
| 4 | The behaviour was never specified anywhere | **(d) write the spec line, then (b) regenerate the unit** | A patch encodes a requirement where nothing will read it back; Living Spec: revise the spec first | B |
| 5 | File is builder-owned / regenerable | **(b) patch the source and rebuild** — never hand-edit the output | Drift rule; the next build silently reverts a hand edit | B |
| 6 | Fix plausibly spans ≥3 files or >100 lines | **(b) or (c)**, not (a) | Measured fix success falls below 10% at that spread | A |
| 7 | Unit is small, self-contained, and the defect is structural (missing state, wrong hierarchy) | **(b) regenerate the unit** from the updated spec | Structural changes are cheaper to re-derive than to surgically restructure | B/C |
| 8 | Model is small/weak, or search/replace edits keep failing to apply | **(b) whole-unit rewrite**, not a patch | Qwen2.5-Coder-32B: 16.4% whole vs 8.0% diff; 9 of 47 `diff` runs below 90% well-formed vs 0 of 15 `whole` runs | A |
| 9 | Blast radius is one value or one prop, context is clean, and a check exists (or can be written in minutes) | **(a) surgical patch** | Cheapest by 10–30×; measured success is highest for single-file, sub-five-line changes | A |
| 10 | Blast radius is one value but there is **no** check and none can be written | **Stop.** Write the assertion first, then (a) | "Looks done" is the signal that produced the miss | B |
| 11 | The repair is speculative or you want to compare two approaches | **(c) as isolation**: `git worktree add -d` / `claude -w` / branch-per-attempt, then (a) or (b) inside it | Worktrees give each attempt its own working tree and branch off one object store | B |
| 12 | Agent ran shell commands, migrations, installs or deploys during the bad rounds | **Do not rely on `/rewind`** — use git, and repair side effects by hand | Every vendor's checkpoint excludes shell-written files; Codex has no undo at all | B |

### The patch protocol

From found-miss to merged fix, without losing what already worked. Steps 1–4 are non-negotiable; they cost about five minutes and they are what makes the rest safe.

1. **Freeze the evidence before you touch anything.** Screenshot with the element annotated, route + state (theme, viewport, auth, step), `getBoundingClientRect()` and `getComputedStyle()` for the element and its parent, console excerpt. If you have the review overlay, this is one comment record ([prototype-review-overlay/01 §10](../prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md)).
2. **Commit or stash the current state.** `git add -A && git commit -m "wip: before repair"` — or `git stash -u`. Untracked files are the most commonly lost thing in this whole document. Agent checkpoints are a convenience, not the checkpoint.
3. **Scope-test the defect.** Check the same element on a second route, a second breakpoint, and the opposite theme. Record which of the four it appears in. This determines row 3 of the decision table and frequently converts a patch into a token change.
4. **Write the check first.** The assertion that fails now and must pass after: a unit test, a Playwright assertion on a computed value, a screenshot baseline, or at minimum an acceptance line in the defect report. Re-baselining an existing snapshot is a reviewed human action, never an automatic one.
5. **Pick the move** from the decision table. Write it down in one line, including which files are in scope. If the answer is (c) or (d), do that first and return to step 5.
6. **Reset context if row 1 or 2 matched.** `/clear` (or a new session), then re-anchor from artifacts: read the target file, read the spec, paste the defect report. Do not paste the old conversation.
7. **Issue the minimal-diff prompt** (shape below). One defect per prompt. Never batch three unrelated misses into one repair turn — that is how a two-line fix becomes a nine-file diff.
8. **Read the diff, not the summary.** `git diff` or `git add -p`. Anything outside the declared scope is a revert, not a discussion.
9. **Run the check, plus the regression net.** The new assertion, the existing suite, lint/typecheck, and a pixel diff of the affected screen against the previous build. Only the region you touched should have changed.
10. **If the check fails twice, stop patching.** Go to row 1: roll back to step 2's commit and re-enter at step 5 with a different move. Do not spend a third correction.
11. **Have a fresh context review the diff.** A subagent that sees only the diff and the acceptance criteria, instructed to flag only gaps that affect correctness or the stated requirement — not style preferences, which is how reviewer-driven over-engineering starts.
12. **Commit the fix with the defect report in the message**, and record the miss for doc 03's rubric ratchet — what class it was, which move fixed it, and whether it should have been caught by an existing rule. If step 3 found the defect on more than one surface, open the escalation now, while you still have the evidence.

### The minimal-diff prompt shape

Copy-pasteable. The five slots correspond to the five things §5 says a patch prompt must supply: address, evidence, expected value, bounds, and check.

```text
Fix one defect. Make the smallest correct change.

DEFECT
<one observable sentence>

WHERE
file: <path>   symbol/element: <component name or data-testid or data-src file:line>
route: <url>   state: <theme / viewport / auth / step>

EVIDENCE (measured, not described)
current: <computed values, bounding boxes, console lines>
expected: <the named value or token, with its number>

BOUNDS
- Change only <file/symbol>. Do not edit any other file.
- No refactors, no renames, no reordering, no dependency changes, no file moves.
- Do not reformat code you are not changing.
- If the correct fix requires touching anything outside these bounds, STOP and tell me
  what it would take instead of doing it.

CHECK
Run: <command>
It must fail before your change and pass after. Show me the output of both runs.
After it passes, show me `git diff --stat` and explain any line that is not part of the fix.
```

Two deliberate details. The **STOP clause** converts an out-of-scope fix from a silent nine-file diff into a question, which is the single highest-value line in the block. And **"show me the output of both runs"** enforces evidence over assertion — reviewing evidence is faster than re-running the verification yourself, and it works for turns you did not watch.

---

## Candidate picks for skill-resources

| Pick | What it is | Why it belongs in the collection |
|---|---|---|
| [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Google-maintained MCP server + CLI giving an agent a live Chrome: performance traces, network, screenshots, and console messages **with source-mapped stack traces**, over Puppeteer | The vendor-neutral way to hand a model the evidence a design defect consists of; source-mapped console output turns an error into a file and line. Slots into the MCP stack in [mcp-servers.md](../../../skill-resources/mcp-servers.md) |
| [github/spec-kit](https://github.com/github/spec-kit) — specifically [`docs/guides/evolving-specs.md`](https://github.com/github/spec-kit/blob/main/docs/guides/evolving-specs.md) | The Living Spec / Flow-Back models and the `clarify → plan → tasks → analyze` regeneration sequence | The clearest published statement of when to stop patching and revise the spec, with an explicit anti-drift clause. Pairs with [prototype-governance.md](../../../skill-resources/prototype-governance.md) |
| [Aider-AI/aider](https://github.com/Aider-AI/aider) — the edit-format docs and `polyglot_leaderboard.yml` | The only published, reproducible measurement of how edit encoding changes model behaviour, plus per-run well-formedness data | The evidence base for "when to patch vs rewrite the unit", and a falsification of emotional-appeal prompt folklore. Note the data is stale after Oct 2025 |
| [adobe-research/NoLiMa](https://github.com/adobe-research/NoLiMa) | ICML 2025 long-context benchmark with published effective-length figures per model | Turns "context rot" from a vibe into a number you can budget against. License is research-only — cite, do not bundle |
| [chroma-core/context-rot](https://github.com/chroma-core/context-rot) | Replication toolkit for the NIAH-extension, LongMemEval and repeated-words experiments | The harness to answer this doc's open question — fix-forward vs cleared-and-re-anchored — on your own model and prompts |
| [webpai/designbench](https://github.com/webpai/designbench) | 900 webpage samples; separate generate / edit / **repair** task families; 11 topics, 9 edit types, 6 issue categories, 15 models | The only benchmark shaped like this document's question. Already listed in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) for grading; listed here for the repair split |
| A `/repair` command or skill for this repo | The patch protocol and minimal-diff prompt above, packaged | The protocol is twelve steps of which four are habitually skipped; a command is the mechanism that stops them being skipped. Belongs in [subagents-and-commands.md](../../../skill-resources/subagents-and-commands.md) |

---

## Sources

**Vendor documentation — fetched 12 September 2026**

- [Claude Code — Checkpointing](https://code.claude.com/docs/en/checkpointing) [fetched] — `/rewind`, Esc+Esc, 100-checkpoint limit, retention sweep, and the full limitations list (bash, subagents, external edits, mid-turn messages, symlinks/hard links, "not a replacement for version control")
- [Claude Code — Best practices](https://code.claude.com/docs/en/best-practices) [fetched] — the two-correction rule, course-correction, `/clear` vs `/compact`, verification targets, adversarial review subagent, failure patterns, the "make the dashboard look better" counterexample
- [Claude Code — Manage sessions](https://code.claude.com/docs/en/sessions) [fetched] — `/branch`, `--fork-session`, resume-from-summary, `/clear` semantics, transcript storage
- [Claude Code — Explore the context window](https://code.claude.com/docs/en/context-window) [fetched] — the what-survives-compaction table, skill-body caps (5K per skill / 25K total), the five-file re-read, auto-compact controls
- [Claude Code — Manage costs effectively](https://code.claude.com/docs/en/costs) [fetched] — why usage climbs in a long session, `/compact` cost vs `/clear`, "vague requests trigger broad scanning"
- [Claude Code — How Claude remembers your project](https://code.claude.com/docs/en/memory) [fetched] — auto memory location and retention, CLAUDE.md as context not enforced configuration, post-compaction instruction loss
- [Claude Code — CLI reference](https://code.claude.com/docs/en/cli-reference) [fetched] — `--worktree`/`-w`, `--fork-session`, `--continue`, `--resume`
- [Claude Code — Use Claude Code with Chrome](https://code.claude.com/docs/en/chrome) [fetched] — live debugging, DOM/console reading, design verification, plan-mode read-only browser calls
- [Claude API — Context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) [fetched] — `clear_tool_uses_20250919`, 100K trigger, keep-3 default, memory-tool pairing
- Anthropic, *Effective context engineering for AI agents* [search summary] [blocked: anthropic.com] — compaction, structured note-taking, sub-agents, just-in-time retrieval
- Cursor — Checkpoints [search summary] [blocked: cursor.com, docs.cursor.com]
- VS Code — Revert changes with checkpoints and editing requests [search summary] [blocked: code.visualstudio.com]

**Tool and repository sources — fetched**

- [git `Documentation/git-worktree.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-worktree.adoc) [fetched] · [`git-revert.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-revert.adoc) [fetched] · [`git-stash.adoc`](https://raw.githubusercontent.com/git/git/master/Documentation/git-stash.adoc) [fetched] — git 2.43.0 locally; canonical pages **[blocked: git-scm.com]**, so these are the upstream sources of the same text
- [Aider — `unified-diffs.md`](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/unified-diffs.md) [fetched] — 89-task laziness benchmark, 20%→61% and 26%→59%, the emotional-appeal negative result
- [Aider — `more/edit-formats.md`](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/docs/more/edit-formats.md) [fetched] — `whole`, `diff`, `diff-fenced`, `udiff`, `editor-*`
- [Aider — `_data/polyglot_leaderboard.yml`](https://raw.githubusercontent.com/Aider-AI/aider/main/aider/website/_data/polyglot_leaderboard.yml) [fetched] — 69 runs, 2024-12-21 → 2025-10-03; the well-formedness table and the Qwen `diff`-vs-`whole` pair were computed from this file
- [Playwright — `docs/src/test-snapshots-js.md`](https://raw.githubusercontent.com/microsoft/playwright/main/docs/src/test-snapshots-js.md) [fetched] — golden generation, `--update-snapshots`, the environment-variance warning; canonical page **[blocked: playwright.dev]**
- [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) [fetched] — traces, network, screenshots, source-mapped console
- [github/spec-kit — `docs/guides/evolving-specs.md`](https://github.com/github/spec-kit/blob/main/docs/guides/evolving-specs.md) [fetched] — Living Spec, Flow-Back, clean-working-tree rule
- [webpai/designbench](https://github.com/webpai/designbench) [fetched] — 900 samples, generate/edit/repair, 15 models
- [microsoft/SWE-bench-Live](https://github.com/microsoft/SWE-bench-Live) [fetched] — 1,077 instances, 431 repos, 8 languages as of Aug 2026
- [adobe-research/NoLiMa](https://github.com/adobe-research/NoLiMa) [fetched] — ICML 2025; 12 models, ten below 50% of baseline at 32K; GPT-4o 99.3→69.7 (effective length 8K), Llama 3.3 70B 97.3→59.5 (2K), Claude 3.5 Sonnet 87.6→45.7 (4K)
- [chroma-core/context-rot](https://github.com/chroma-core/context-rot) [fetched] — three experiments, July 2025 report; report page **[blocked: research.trychroma.com]**
- [microsoft/vscode#307617](https://github.com/microsoft/vscode/issues/307617) [fetched] — agent memory files not reverted on checkpoint restore; open, 3 Apr 2026
- [openai/codex#9203](https://github.com/openai/codex/issues/9203) [fetched] — "Please make `/undo` back", open, Jan 2026, filed over deleted untracked files
- [openai/codex#16784](https://github.com/openai/codex/issues/16784) [fetched] — `/undo`+`/redo` request, closed as duplicate of #9203, 4 Apr 2026
- [anthropics/claude-code issue search: rewind + bash](https://github.com/anthropics/claude-code/issues?q=is%3Aissue+rewind+bash+not+restored) **[fetched, list only]** — #87575 `/rewind` silently fails on bash-edited files (open, 18 Aug 2026); #14002, #20671, #15403, #72125

**Research**

- Laban, Hayashi, Zhou, Neville, *LLMs Get Lost In Multi-Turn Conversation*, ICLR 2026 — [Microsoft Research publication page](https://www.microsoft.com/en-us/research/publication/llms-get-lost-in-multi-turn-conversation/) [fetched]; 39% average multi-turn drop, aptitude −15% / unreliability +112%, "get lost and do not recover"
- *Regression Accumulation in Multi-Turn LLM Programming Conversations*, arXiv 2607.01855 [search summary] [blocked: arxiv.org] — 542 tasks, 6 models, 26,016 turn instances; 40–73% of tasks lose previously-correct behaviour; Cross-Turn Conflict; Verification Gate the only consistent mitigation
- *SWE-bench Goes Live!*, arXiv 2505.23419 [search summary] — single-file sub-five-line patches resolved ~48%; ≥3 files or >100 lines below 10%
- *Are "Solved Issues" in SWE-bench Really Solved Correctly?*, ICSE 2026 [search summary] [blocked: software-lab.org] — plausible-but-wrong patches under limited test coverage
- NoLiMa, arXiv 2502.05167 / PMLR v267 — abstract figures (13 models, 11 below 50%) [search summary]; the fetched README figures are used in the text instead
- DiffSpot (arXiv 2605.29615), UICrit (arXiv 2407.08850), DesignBench (arXiv 2506.06251) — cited via [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), which owns them
- Michael Feathers, *Working Effectively with Legacy Code* (2004) — characterization / golden-master testing [search summary] [blocked: en.wikipedia.org, understandlegacycode.com]

**Practitioner (all [search summary] [blocked: x.com]; and docs 05/06 of this stream own this material)**

- @Hesamation — "new session for new tasks / if Claude makes a mistake, REWIND, don't correct / compact early with a direction / prefer /clear over /compact"
- @avthar — actively clear context yourself rather than waiting for auto-compact mid-task
- @svpino — Esc+Esc as "free undo"; treat rewind as the response to a tangent
- @DataChaz — context at 98%, `/clear` as the fix
- The "smallest safe change / no unrelated refactors / no dependency changes / no file moves" prompt formulation, and the "code size is not risk, blast radius is risk" framing, both circulating on dev.to in 2026 [blocked: dev.to]

**Neighbouring documents in this repo (not re-derived here)**

- [prototype-construction/05 — Surgical Editing and the Iteration Loop](../prototype-construction/05-surgical-editing-iteration.md) — construction-file patch formats, id-keyed addressing, fast-apply, the drift rule, the validation ladder
- [eval-tuning-loops/03 — Feeding Grades Back](../eval-tuning-loops/03-feeding-grades-back-text-level.md) — the fix-altitude ladder and table
- [eval-tuning-loops/01 — Grading Generated Prototypes](../eval-tuning-loops/01-grading-generated-prototypes.md) — deterministic graders, VLM-judge limits, pixel-diff thresholds
- [prototype-review-overlay/01 — DOM Anchoring and In-Page Commenting](../prototype-review-overlay/01-dom-anchoring-and-in-page-commenting.md) — the layered anchor and re-anchoring order
- [design-sdlc/04 — Small-Model Guardrails](../design-sdlc/04-small-model-guardrails.md) — deterministic verification and repair, the guardrail ladder
- [design-sdlc/02 — Feedback on Code Prototypes and Flows](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) — critique formats and feedback surfaces
