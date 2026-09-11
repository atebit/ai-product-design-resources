# Q5 — Durability and Permissibility of a Compressed Figma Skills Fork

Corpus: `figma/mcp-server-guide` @ `a5e7e04` (v2.2.108). GitHub API queried live on 2026-09-11.

## HALF A — MAINTENANCE

### 1. Release cadence (measured, not estimated)

The repo has **70 commits total** (initial commit `bf73d23`, 2025-08-05, through `a5e7e04`, 2026-09-10 — a 13-month history) and, critically, **only 1 git tag** (`v2.2.96-figquery.1`) and **0 GitHub Releases**. Versioning is NOT done through GitHub's release mechanism at all — it is done through the plugin's own `version` field (currently `2.2.108`, mirrored across `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.github/plugin/plugin.json`, `gemini-extension.json`, and `server.json`), bumped inside ordinary commits with messages like "Skills v2.2.107" or "Sync figma-plugin skills to v2.2.12". Anyone tracking this repo for staleness must watch commit messages, not the Releases tab.

I identified 24 explicit version-bump ("skills sync") commits between `b20d5bb` (v2.0.6, 2026-03-30) and `f74a51c` (v2.2.108, 2026-09-08) — a 162-day window:

- **Mean interval between syncs: ~7.0 days**
- **Median interval: 3 days**
- **Range: 0–36 days** (several same-day double-bumps; one 36-day lull)

This is a genuinely fast-moving upstream. A fork's realistic **staleness half-life is under two weeks** at the median, and even the slowest observed gap was ~5 weeks. A "set it and forget it" compression pass will visibly drift from upstream within one release cycle at typical cadence, and within a month at worst case.

**Churn concentration.** Sampling 25 commits with file-level diffs (9 fetched at full detail, 16 more via the commits API), the skill directories touched were:

| Skill | Commits touched (of 25 sampled) |
|---|---|
| `figma-use` | 20 (80%) |
| `figma-generate-library` | 14 (56%) |
| `figma-generate-design` | 11 (44%) |
| `figma-use-figjam` | 8 (32%) |
| `figma-use-slides` | 7 (28%) |
| `figma-generate-diagram` | 5 (20%) |
| `figma-code-connect` | 4 (16%) |
| all others | ≤3 each |

`figma-use` (the mandatory-preflight skill loaded before every `use_figma` call) is the single largest, highest-churn file in the entire tree, and it is exactly the skill a compression effort would most want to touch. It is also — by the churn data — the skill upstream edits almost every release. Diff sizes vary wildly: some syncs are trivial (7 files, <30 lines changed, e.g. `c80480b`), others are large rewrites (`ef474d1`: 24 files, 1,107 lines touched, 814 deletions — essentially a rewrite of `figma-code-connect` and `figma-generate-library`). There is no steady-state "small diff" assumption to lean on.

One structural commit, `a5e7e04` (the corpus's HEAD), shows upstream itself just introduced a second copy of the entire skill tree (`skills-figquery/`, +34,786 lines) purely to serve a different client (Cursor) a differently-allow-listed variant. This tells you upstream's own maintenance burden is increasing, and any local fork now has two trees to track, not one.

### 2. Viable strategies given "do not hand-edit"

**(a) Hand-maintained fork.** Clone, compress, keep as a divergent branch. *Pros:* full control, no dependency on upstream's willingness to cooperate. *Cons:* the churn data above means re-merging is not a rare event — it's a weekly-to-biweekly chore. Every upstream sync commit is a potential merge conflict against your compression edits, concentrated exactly in `figma-use`, the file you're most likely to have rewritten most aggressively. This scales linearly with how many skills you compress and inversely with how disciplined upstream's diff hygiene is (not very — see `ef474d1`). Realistic for a solo maintainer only with automation (see b) and a tolerance for periodic breakage.

**(b) Re-appliable transform/patch pipeline run at each upstream release.** Write the compression as a script/patch set (e.g., a Python pass that strips redundant prose, dedupes examples, normalizes headers) and re-run it against each new upstream commit, rather than hand-editing the compressed output once. *Pros:* survives upstream churn structurally — you're re-deriving, not re-merging; the transform can be versioned and tested independently of any particular upstream snapshot; failures are loud (transform throws or produces a diff you can inspect) rather than silent merge conflicts. *Cons:* upfront engineering cost is higher than a one-off edit; the transform itself needs maintenance if upstream changes structure (e.g., the new `skills-figquery/` split is exactly the kind of structural change that would break a naive transform). This is the strongest option **if** the goal is a durable, republishable artifact rather than a one-time exercise — it converts "maintenance" into "re-running a script," which is the only strategy that scales against a 3-to-7-day release cadence.

**(c) Overlay on the installed copy.** Leave the upstream plugin files untouched in the plugin's install location; layer compressed versions on top locally (e.g., a second directory the client is pointed at, or a post-install hook that swaps files after `claude plugin install`/`update`). *Pros:* never touches the upstream repo or its provenance; trivially reversible; matches the spirit of "do not hand-edit either tree" by not editing the tree at all — you edit a copy. *Cons:* every `claude plugin update` (or Cursor/Copilot equivalent) will silently overwrite your overlay unless the overlay step is re-run as part of the update flow; this is really strategy (b) wearing a different hat — it still needs to be re-applied every ~7 days on average, it's just applied post-install instead of pre-commit.

**(d) Upstreaming the compression as a PR to figma/mcp-server-guide.** *Pros:* zero ongoing maintenance if accepted — you inherit upstream's own release cadence for free. *Cons:* the README is explicit that this directory is a generated sync target ("Contents are generated by the `mcp-sync-skills` skill in `figma/figma` ... Do not hand-edit either tree"). A PR against the generated output would almost certainly be rejected or silently overwritten at the next sync, because the source of truth lives in a different, non-public repo (`figma/figma`). The realistic version of this strategy is not "PR the compressed files" but "propose the compression as feedback/an issue directed at Figma's internal skill-authoring process" — a much slower, non-guaranteed path, but the only one that doesn't fight upstream's own tooling.

**(e) Don't touch the files; control which skills load and when.** Use the client's own skill-selection surface (per-project enable/disable, `sync_allowlist.json`-style filtering as `figma-plugin-fig-query` already demonstrates, or simply not invoking the heavier skills) rather than compressing content. *Pros:* zero merge burden, zero provenance risk, zero permissibility risk (nothing is modified or redistributed) — this is the only strategy fully compatible with "do not hand-edit" as written. It also directly attacks a real cost driver: if `figma-use` is loaded on every `use_figma` call regardless of task, gating *when* it loads may save more tokens in practice than compressing its prose. *Cons:* it doesn't produce a "compressed skill" artifact — it produces a policy for invoking existing skills more sparingly, which may not satisfy a goal of demonstrably smaller skill files.

**Recommendation.** Given the measured cadence (median 3 days, mean 7 days between syncs, churn concentrated in the exact file most worth compressing), any strategy that treats the compressed output as a static artifact — (a) or a naive (c) — will be fighting upstream every 1–2 weeks. The defensible combination is **(e) first** (control invocation — free, safe, no provenance conflict) **plus (b) as a transform pipeline** if compressed *files* are still wanted, re-run at each detected version bump rather than hand-merged. (d) is worth a low-cost attempt (an issue, not a PR) but shouldn't be load-bearing. (a) alone is not recommended at this cadence.

### 3. Substitution points in the delivery path

There are **two structurally different delivery paths**, and they have different substitutability:

- **Plugin-bundled local files** (the `skills/` and `skills-figquery/` trees in this repo). Discovery is manifest-driven and does differ by client:
  - Claude Code: `.claude-plugin/plugin.json` has no `skills` field, so it **defaults to `skills/`**.
  - Cursor: `.cursor-plugin/plugin.json` sets `"skills": "./skills-figquery/"`, explicitly overriding the default and pointing only Cursor at the second tree.
  - GitHub Copilot: reads via `.github/plugin/plugin.json` (in `github/awesome-copilot`), also defaulting to `skills/`.
  - Gemini CLI: `gemini-extension.json` declares **no skills field at all** — it only registers the remote MCP server (`https://mcp.figma.com/mcp` with OAuth) and gets skill content, if any, purely through MCP resources.

  Because these are just markdown files dropped into a plugin's install directory by the client's plugin manager, a user *can* physically substitute them post-install (edit the files in place, or symlink a compressed tree over the installed path) — this is exactly overlay strategy (c) above. But it is intentionally undocumented and antagonistic to the update mechanism: the plugin manager owns that directory and will overwrite it on the next `plugin update`/re-sync, and it is precisely the "hand-edit" the README asks you not to do to the canonical repo (a local override of an installed copy is a materially different act, but the file layout offers no first-class "load skills from here instead" hook — no environment variable or config key was found in any of the four manifests).

- **MCP resource path** (`skill://` URIs, served by `get_figma_skill` / `read_skill_uri` tools on the **remote, Figma-hosted** MCP server at `https://mcp.figma.com/mcp`). This is the fallback path used when no local plugin is installed (confirmed by this session's own Figma-MCP tool instructions, which list, e.g., `/figma-use — MANDATORY before calling use_figma; fallback: skill://figma/figma-use/SKILL.md`). **This path offers no substitution point whatsoever** from the user's machine: the content is served by Figma's server process, not read from any file the user controls. A compressed skill can only reach this path by Figma itself deploying it server-side — i.e., only via strategy (d), and even then only if Figma's internal `mcp-sync-skills` pipeline (which lives in `figma/figma`, not this public repo) picks it up.

  Net effect: **local substitution is only possible for plugin-installed clients (Claude Code, Cursor, Copilot), and only as an unsupported overlay that the plugin manager will clobber on update.** For MCP-resource-only consumers (Gemini CLI, or any client falling back to `skill://` because no plugin is installed), there is no substitution point at all — the compression would have to be upstreamed to take effect.

## HALF B — PERMISSIBILITY (risk assessment, not legal advice)

**I am not a lawyer, and nothing here is legal advice.** This is a plain-English read of publicly posted terms, offered so a careful person can reason about risk — not a substitute for actual counsel, which I'd recommend before publishing any derivative of these files.

### 4. What the Figma Developer Terms actually say

Fetched from `https://www.figma.com/legal/developer-terms/`. The terms apply broadly — the license section covers "Application Programming Interfaces, Software Development Kits, Model Context Protocol servers, and related resources and documentation," so the skills are almost certainly in scope as "Developer Resources."

- **License grant (Section 2):** the license is "non-exclusive, royalty free, worldwide ... non-transferable ... **limited license to access and use the Developer Resources only as necessary to develop, test, and support an integration** ... as permitted in Figma's associated developer documentation." Under 25 words: *"limited license to access and use the Developer Resources only as necessary to develop, test, and support an integration"* — the grant is purpose-bound (build an integration), not a general right to copy, alter, or redistribute the resource itself.
- **Ownership (Section 8(a)):** "Figma owns all right, title, and interest in the Developer Resources ... **All rights not expressly granted are reserved**, and no license or other right should be implied." This is the operative "reserved rights" clause — since modification and redistribution are nowhere expressly granted, the safe reading is that they are not granted.
- **Termination (Section 4):** "Upon termination, you will delete all Developer Resources and you will cease any use of our marks" — reinforcing that possession/use of the resources is conditional and revocable, not owned.
- **Reverse engineering:** notably, **no dedicated, explicit reverse-engineering or derivative-works prohibition clause was found** in the document (checked directly, not just inferred) — restrictions are scattered (secure use in Section 3, data handling in Section 7) rather than collected into a "you will not..." list. This means the strongest applicable constraint is the *absence* of a redistribution grant (Section 2/8(a)), not an explicit ban on modification.

Combined with the repo's own README line — "By using the Figma MCP server and the related resources (**including these skills**), you agree to the Figma Developer Terms" — the skills are explicitly brought under this purpose-bound, reserved-rights license, and there is no LICENSE file in the repo granting anything broader (e.g., no MIT/Apache grant that would independently permit redistribution).

### 5. The four-way split

- **(i) Privately modifying your own installed copy** — **Low risk.** This is "use" of the Developer Resources for your own integration work, which is squarely inside the licensed purpose. No distribution to anyone else occurs. This is the safest of the four by a wide margin.
- **(ii) Publishing a transform/script that modifies it locally on the user's machine** — **Moderate, generally defensible risk.** You are not distributing Figma's content at all — you are distributing your own code (a script/diff/patch) that a third party runs against *their own* separately-obtained, separately-licensed copy. This is analogous to publishing a `sed` script or a build patch, not to publishing the modified file. It is meaningfully lower risk than (iii) because the recipient still gets Figma's original content and terms directly from Figma, and your artifact never contains Figma's copyrighted text. Some residual risk remains if the script embeds large verbatim excerpts of the original prose (e.g., as match targets) — keep those minimal.
- **(iii) Publishing the compressed derivative files themselves** — **Highest risk.** This is redistributing content built from Developer Resources whose license grant is explicitly scoped to "develop, test, and support an integration," with all other rights reserved and no LICENSE file granting redistribution. Even a heavily "compressed" version is a derivative of copyrighted, terms-gated text. This is the one a careful person would not do without either (a) Figma's explicit sign-off, or (b) actual legal review confirming the modifications are transformative/de minimis enough to fall outside the reserved rights — which is exactly the kind of judgment call this report is not qualified to make.
- **(iv) Publishing research findings that quote short excerpts** — **Low risk, standard practice**, consistent with how this very report is written: short quotes (under 25 words, as instructed), attributed, in service of commentary/analysis (a fair-use-shaped pattern in the US, though fair use is fact-specific and this is not a fair-use legal opinion). This report's own quoting behavior in Section 4 above is an example of the pattern being described as lower-risk — not a self-certifying license to reproduce more than that.

**Bottom line:** research and private use are comfortable; a published *transform/script* is the most defensible way to let others get compression's benefit without touching redistribution risk; publishing the *derivative files* is the one place a careful person should stop and get real legal advice (or, per strategy (e) above, sidestep the whole question by controlling skill invocation instead of distributing modified skill content).
