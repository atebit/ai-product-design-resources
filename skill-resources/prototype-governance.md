# Prototype & Design-Artifact Governance

**Curated picks for the lifecycle of design artifacts that live outside the product repo** — Claude Design projects, Figma Make files, v0 / Lovable / Bolt apps, generated wireframes, flow diagrams, and the Figma files themselves once code is canonical. Where they live, how they are indexed, how their design-system fidelity is kept honest, what has to be true before one becomes a ticket or a PR, how the Figma side and the code side stay in sync, and how artifacts get retired.

This category exists because the pipe is no longer the problem. Every vendor now ships prototype → PR in one click (Make pushes a branch, v0 opens the pull request, Claude Design bundles a handoff, Lovable and Bolt two-way sync a repo). What none of them ships is the *gate*: no tool stamps its output with the design-system version it was built against, none knows whether the question the prototype was meant to answer got answered, and none tells you which of last quarter's forty hosted URLs still has a Supabase key in it. **The gate is the product, not the pipe** — the promotion checklist and the person who signs it are the differentiating work. And **inventory precedes policy**: security research, design-system governance, and DesignOps all arrive at the same step zero — one place that lists every prototype — because you cannot expire, audit, or promote what you cannot see.

The second principle is that **source of truth is a per-artifact allocation, not a tool vote.** Tokens, components, screens, flows, copy, and motion each have a different natural home and a different feasible sync direction; most drift comes from applying one policy ("Figma is truth" or "code is truth") to an artifact type where the other side is actually the originator. The allocation table below is the opinionated default; every pick after it is a mechanism for one row.

*Curation date: 2 September 2026. Every vendor page, repo, and write-up below was fetched live and read; GitHub stars and last-push dates are as of that day. Companion research: [01 — Source of truth: Figma vs. code](../docs/research/design-sdlc/01-source-of-truth-figma-vs-code.md) and [03 — Prototype governance outside the codebase](../docs/research/design-sdlc/03-prototype-governance-outside-the-codebase.md).*

---

## Lifecycle at a glance

Vocabulary is governance: "prototype" needs a status axis or designers read it as exploration, stakeholders as direction, and engineers as a feasibility question.

| Stage | Entry criteria | Exit criteria | Default expiry |
|---|---|---|---|
| **0 Draft** | Anyone, any tool; internal-only sharing; synthetic data | Ledger row created (id, question, tool, link, DS version, owner) | 30 days → archived |
| **1 Exploring** | Ledger row exists; DS context object attached (org DS / Make kit / v0 DS / Lovable DS) | Question answered or abandoned; screenshots + decisions captured | 60 days |
| **2 Validated** | Evidence attached (usability session, stakeholder decision, or data); empty/error/loading states shown; a11y floor checked | Promotion checklist signed by design + eng owner | 90 days |
| **3 Promoted** | Linked ticket/PR; handoff package (README, screenshots, decisions, DS version) attached | PR merged; prototype marked "superseded by PR #" | Archive on merge |
| **Archived** | Expiry hit or question closed | Public links revoked; backend disconnected; row kept for audit | Row kept indefinitely; artifact deleted per vendor policy |

**Source-of-truth allocation.** "Canonical home" is where a conflict is resolved; the non-canonical copy is derived, labeled, or discarded — never hand-maintained.

| Artifact | Canonical home | Sync direction | Mechanism | Non-canonical copy |
|---|---|---|---|---|
| **Design tokens** | DTCG JSON in the repo | Code → Figma (push); Figma → code only via PR | Tokens Studio or Figma Variables action → Style Dictionary (pick 11) | Figma Variables are a generated mirror; designers propose, never edit in place |
| **Components (mature)** | Code + Storybook | Code → Figma | storysync / story.to.design regenerate the library on release; Code Connect maps every published component ([Chain B/D](skillchains.md#3-the-chains)) | Figma library is versioned and regenerated; never edited directly |
| **Components (net-new)** | Figma until first merge, then code | Figma → code once, then flips | Figma MCP + Code Connect → PR; regenerate the Figma component from Storybook after merge | Exploration frame marked "superseded by `<component>` v1.0" |
| **Screens / prototypes** | The PR (or the sandbox repo) | Figma → code one-shot; code → canvas for review only | Notion `/figma` loop (pick 8); `generate_figma_design` to bring code back for critique | Figma screen pages are exploration; banner + archive when the PR merges (rule snippet below) |
| **Copy / strings** | A string store | Store ↔ Figma; store → code | Ditto (pick 12) or repo i18n files with PR checks | Text in Figma frames is a synced view |
| **Motion** | Code | Figma Motion → code, one-way | Dev Mode timeline export → agent implementation | Figma Motion frames are specs; delete on merge |
| **Flows / IA** | Mermaid in the repo (`docs/flows/*.mmd`) | Diagram → tickets, one-way | Contract rule + Recipe B; FigJam is the workshop surface (pick 14) | FigJam boards are meeting artifacts; decisions exported back to Markdown |
| **Decisions / rationale** | Markdown ADRs (`docs/decisions/`) | Spec → Figma and code | MADR (pick 14); served to agents via rules/skills | Figma annotations and Storybook docs are rendered views |

Operating rules that fall out of the table: every Figma library file carries a version tag matching a code release; any Figma page that has shipped gets a "reference — see PR #" banner within the sprint; drift audits run monthly if agents generate UI; and no artifact is hand-maintained in two places — if you catch yourself doing it, one side becomes generated.

---

## The picks

### (a) Design-system context objects, per tool

None of the five tools stamps its output with the DS version it used. The ledger has to.

### 1. Claude Design organization design systems ([setup guide](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design) · [admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans))

The org-level DS object for Claude Design: import a component repo ("If your design system lives in code (for example, a React component library), you can link or upload the repository"), design files, decks, or brand assets, publish once, and "all team members' projects automatically use it (for Team and Enterprise plans)."

**How it works:** A designer or brand owner builds the DS from the org's own sources, then publishes it; new projects from the home screen inherit it by default. Updates go through "Remix" in organization settings. On Enterprise, a **Claude Design Admin** permission gates the three governance actions — publish, set the org default, delete — and if nobody holds it, "any member with Claude Design access can publish a design system."

**When to reach for it:** Stage 0–1 for every Claude Design prototype; assign the Admin permission before enabling the tool broadly (Anthropic's own rollout advice: 2–4 designers set the DS up first, then the design team, then product/UX, then everyone).

**Caveats:** Plan gating: Pro, Max, Team, Enterprise (beta); default off on Enterprise; uploads follow enterprise retention policies, no data residency. No version pinning — you cannot tell from a project which DS revision it used, so record `ds_version` in the ledger by hand. Sharing is org-scoped; external review means HTML/PDF export.

### 2. Figma Make kits + guidelines ([Make kits](https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits) · [guidelines](https://help.figma.com/hc/en-us/articles/33665861260823-Add-guidelines-to-Figma-Make))

Make's packaged DS context: npm packages for code context, variables and styles from published Figma libraries, and Markdown guidelines that teach Make "how to properly use your components, when to apply specific variants, or how to follow your design system's rules."

**How it works:** A kit is published from a library; org admins "can approve published Make kits and enable them by default." Republishing a kit pushes updates to files that use it, with a notification on next open. Every Make file also has a `guidelines.md`; Figma's own warning is the one to remember: "More context isn't always better. It can confuse the LLM."

**When to reach for it:** The enforceable version of "no prototype without the DS package" for Make — admin approval + enabled-by-default means designers cannot start off-system by accident.

**Caveats:** Plan gating: Full seats on paid plans; admin approval controls are org-level. Kit quality is guideline quality — Make can auto-generate guidelines from your npm package (costs credits), but review them like a rules file. No kit-version stamp lands in the output.

### 3. v0 Design Systems 2.0 ([v0 docs](https://v0.app/docs/design-systems-2))

v0 saves your DS "as a skill" scoped to the team or a person — "not a copy of your docs; it is an adapter that tells v0 where your source lives, which components, props, and tokens are safe to use." The governance line worth quoting in your own rules file: "If a component, prop, or token cannot be verified from the sources, v0 should not use it."

**How it works:** Import from GitHub repos, npm packages, Figma frames, Storybook, and docs; v0 builds a starter app for verification and pauses for approval before saving. Team owners on paid plans can set a default DS for new chats.

**When to reach for it:** Any v0 prototype at stage 1; make the team default mandatory. The legacy route ([Open in v0](https://ui.shadcn.com/docs/registry/open-in-v0) from a shadcn registry) still works for component-level items.

**Caveats:** Plan gating: team default and access controls need a paid plan; private package credentials need the Developer role on Vercel. "Existing projects don't update automatically" — an updated skill only reaches new chats, so the ledger's `ds_version` per prototype is not decorative. Open in v0 ignores `cssVars`, `css`, `envVars`, and namespaced registries.

### 4. Lovable design systems + knowledge, and Bolt design systems ([Lovable DS](https://docs.lovable.dev/features/design-systems) · [Lovable knowledge](https://docs.lovable.dev/features/knowledge) · [Bolt DS](https://support.bolt.new/building/design-system/introduction.md))

The two whole-app builders, paired because their DS objects behave the same way: a compiled copy of your real components, versioned, attached per project.

**How it works:** In Lovable a DS "is a regular Lovable project that is marked as a design system"; connecting copies components to `src/design-system/<slug>/`, rules to `.lovable/rules/libraries/<slug>/`, and records the version in `lovable.toml`. Lovable then runs **adherence checks on every generation** — scanning for "raw color literals where a design system token should be used" and inline overrides — and auto-retries on violations. Workspace/project knowledge (10k chars each) plus repo `AGENTS.md`/`CLAUDE.md` carry the rules. Bolt "compiles your design system from your own sources, like your component library and design system website," syncs on demand with version history and rollback, and exposes a generated Storybook so you can see what Bolt knows.

**When to reach for it:** Stage 0–1 for anything built in these tools; the Lovable adherence scan is the closest any vendor comes to an on-system-rate check, so use it as evidence at promotion.

**Caveats:** Plan gating: Lovable DS on all paid tiers (React libraries; npm-wrapped DS needs Enterprise); Bolt custom DS needs a paid Team plan. One DS per Lovable project; local edits to copied DS files are overwritten on the next accepted update. Bolt documents no adherence check at all.

### (b) Handoff paths

### 5. Claude Design → Claude Code: the handoff bundle and `/design-sync` ([Claude Academy tutorial](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux) · [product page](https://claude.com/product/design) · [`/design-sync` tool description](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-designsync.md))

The bundle "includes the project's design files, chat, and a README which tells the model to interpret the designs," plus a paste-in prompt carrying the bundle URL. In the other direction, `/design-sync` in Claude Code keeps "a local component library in sync with a Claude Design project — incrementally, one component at a time, never as a wholesale replace."

**How it works:** Handoff is reference-crosses-code: the coding agent reads the HTML and chat as intent and rebuilds on the real stack — much shorter when the codebase was linked, because "Claude Code already understands the components and patterns the prototype was built with." `/design-sync` enforces a plan-then-write order (`list`/`get` → `finalize_plan` → `write_files`/`delete_files`), so nothing lands in the repo outside a locked path boundary. Before handing off, the tutorial's rule: ask for "empty states, error states, loading states, and different data volumes."

**When to reach for it:** Stage 3 for Claude Design prototypes. Policy that falls out of the tool design: `/design-sync` is for **DS components**, never whole screens; screens go through the bundle + checklist.

**Caveats:** `/design-sync` does not watch the repo — re-run it after token or component changes. Verified against Anthropic's product and help pages plus the extracted tool description; the CLI command surface is beta and moves.

### 6. Vendor → GitHub paths: Make, v0, Lovable, Bolt ([Make Workflow Lab](https://www.figma.com/blog/workflow-lab-deploying-designs-directly-with-figma-make/) · [v0 GitHub](https://v0.app/docs/github) · [Lovable GitHub](https://docs.lovable.dev/integrations/github) · [Bolt org GitHub](https://support.bolt.new/integrations/github-org.md))

| Tool | Mechanism | Scope the vendor itself recommends | Governance hook |
|---|---|---|---|
| **Figma Make** | Connect repo → branch → edit → push PR from Make (Jul 2026) | "The last 20%" — polish and accessibility; "the designer builds them and the engineer reviews" | Engineer review of the PR; canvas annotations carry intent |
| **v0** | Branch-per-chat; auto-commits; publish creates or reuses a PR and merges it; "after the pull request merges, v0 synchronizes the chat with the base branch" | Component/screen work on a connected repo | Branch protection and required checks block the merge |
| **Lovable** | Two-way sync on one active branch; commits by `lovable-dev[bot]` co-attributed to the member | Whole app; "only export from Lovable to GitHub, not the other way around" | Reconnecting creates a *new* repo — the old one silently goes stale |
| **Bolt** | Org admin installs the app once and "selects which repositories Bolt can access" | Whole app | Repo allow-list at the org level |

**When to reach for it:** Stage 3, and only after the checklist. The honest reading of all four docs: direct-to-PR is sanctioned for polish and for repo-connected component work; feature-scale Lovable/Bolt apps cross as **read-only reference** and the engine is rebuilt (data layer, auth, RLS, infra).

**Caveats:** v0's publish path merges automatically once checks pass — put the promotion checklist in a required check or a PR template, not in a Slack message. Lovable's bot commits need the member's GitHub email set or attribution is lost.

### 7. Handoff README template ([aakashg/claude-design-pm-toolkit — `11_claude_code_handoff.md`](https://github.com/aakashg/claude-design-pm-toolkit/blob/main/11_claude_code_handoff.md))

A fill-in README for the Claude Design → Claude Code bundle that replaces the default with a production brief. Small repo (11★, MIT, last push Apr 2026), but the template is the best public articulation of "re-implement, don't transcribe."

**How it works:** Sixteen headings — production stack, "Design tokens source of truth" ("Do NOT hard-code hex codes from the design HTML. Map every color to a token"), "Component reuse — check these first" ("Do not render the design 1:1 in raw HTML — compose from existing components"), data needs, interactions to preserve, animations, a11y, responsive, "What I do NOT want you to do," security baseline, i18n, bundle budget, questions to ask before coding — ending in a Definition of Done: 375/768/1280 without horizontal scroll, Axe 0 violations, Lighthouse ≥ 90, strings wrapped in `t()`, Storybook stories, `data-testid`, before/after screenshots, `prefers-reduced-motion` tested.

**When to reach for it:** Generate it from the ledger row at stage 3 and attach it to the bundle; it is the handoff-package item on the promotion checklist.

**Caveats:** Written for a React/Tailwind/Framer Motion stack — rewrite the stack and animation sections. Pair with the `handoff-spec` skill in [skills.md](skills.md) pick 5 for the state-coverage half.

### (c) Storage patterns

### 8. The sandbox repo: Notion's Prototype Playground and the "design sandbox" ([Notion write-up](https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows) · [design sandbox how-to](https://designwithai.substack.com/p/how-to-build-a-design-sandbox-for-your-team-to-prototype-with-real-code))

The storage answer for code prototypes: one shared repo that is explicitly "for prototypes rather than production code," discoverable by default, on-system by construction.

**How it works:** Notion's Playground is a single Next.js app — per-designer folders, "file-based and has no backend database," shared styles/icons, links out to Figma and v0 prototypes so the repo is also the index. Two commands do the governance work: `/figma` (Figma MCP extract → build → Chrome DevTools MCP compares against the frame → fix → repeat; "roughly 80% complete in one prompt") and `/deploy` (branch, commit, PR, watch CI). The design-sandbox variant (Xinran Ma, 1 Sep 2026) is the cheaper cut: a fresh repo with the DS installed as a package, only the most-used screens recreated, shared via tunnel links, with a component index and guardrails against custom UI — and the honest line, "someone has to maintain and refine it."

**When to reach for it:** Stage 0–2 for anything built in Claude Code/Cursor rather than a vendor canvas; vendor-hosted prototypes stay where they are but get a row in the same ledger.

**Caveats:** Neither write-up describes retirement — add the branch-per-prototype + auto-archive-at-expiry rule (Recipe C) yourself. Notion merges on green CI without review because the repo *cannot* reach production; keep that isolation or the review policy has to change.

**Generated wireframes need the same home.** [Magdoub/claude-wireframe-skill](https://github.com/Magdoub/claude-wireframe-skill) (71★, MIT, pushed Mar 2026; `git clone … ~/.claude/skills/wireframe`) is worth adopting for its convention as much as its output: every run lands in `wireframe/<MMDD-feature>/` with a persistent `wireframe/brain/design-context.md` that it reads from the codebase and appends to. Phase 1 is five B&W HTML options ("1 safe extension of your design system + 4 exploratory" — "No colors. No brand colors. Pure B&W with structural grays"); phase 2 renders Clean/Polished variants on the same locked layout. Put the folder in the sandbox repo and the 30-day draft expiry applies to it like any hosted URL — five options per run multiplies artifacts fast.

### (d) Sync and drift tooling between Figma and code

### 9. skills-for-figma — `check-design-parity-figma`, `export-`/`import-tokens-figma`, `lint-design-figma` ([southleft/skills-for-figma](https://github.com/southleft/skills-for-figma), listed in Figma's [community agent_skills index](https://github.com/figma/community-resources/tree/main/agent_skills))

The one cross-side check that exists as an installable skill. 19 skills for the official Figma MCP server (13★, MIT, pushed Jun 2026; a subset of the author's 77★ `figma-console-mcp-skills`), all executed through `use_figma` so they "require no plan-gated APIs."

**How it works:** `check-design-parity-figma` takes a node id plus a `codeSpec` (visual / spacing / typography / accessibility sections), extracts "fills, strokes, corner radius, opacity, padding/gap, and text properties," and scores drift as `max(0, 100 − (critical×15 + major×8 + minor×3 + info×1))` with a discrepancy list and fix suggestions for either side. `export-tokens-figma` writes DTCG (also CSS, Tailwind, SCSS, Style Dictionary, Tokens Studio) with alias and multi-mode resolution; `import-tokens-figma` re-imports with "non-destructive in-place matching." `lint-design-figma` flags hardcoded colors, detached components, and WCAG 2.2 issues on the Figma side.

**When to reach for it:** The monthly drift audit in the allocation table, and the "no invented components or raw token values" line on the promotion checklist when the reference lives in Figma.

**Install:** `npx skills add southleft/skills-for-figma`, or `/plugin marketplace add southleft/skills-for-figma`, or copy `skills/*` into `~/.claude/skills/`. Requires the Figma MCP connection and the `figma-use` skill ([skills.md](skills.md) pick 2).

**Caveats:** Low star count for a repo this substantive; Figma's index carries a "not endorsed or sponsored by Figma" disclaimer — read the SKILL.md scripts before running them. Parity is against a *spec you supply*, not against the live component — pair with Code Connect for the pointer.

### 10. storysync ([brendanciccone/storysync](https://github.com/brendanciccone/storysync))

The code → Figma direction for components, with a `diff`. 66★, MIT, pushed 31 Aug 2026; README is unusually candid about limitations.

**How it works:** `storysync init` fixes Storybook MCP setup, `setup --client claude|cursor|codex` drops skill files, `tokens` and `map` extract tokens and map stories to Figma variants, `push` writes them to Figma, and `diff` "compares Figma files against code tokens and components," reporting `+` missing in Figma, `−` missing in code, `~` value mismatches. Pull (Figma → code) is "coming in v0.3."

**When to reach for it:** Regenerating the Figma library from Storybook on release (the "components (mature)" row) when you are not on story.to.design; `diff` as a CI-adjacent drift report.

**Install:** `npm install -g storysync`; needs Storybook 10.1+ on Vite with `@storybook/addon-mcp` ([mcp-servers.md](mcp-servers.md)), a Full Figma seat on a paid plan for writes, and an authenticated Figma MCP endpoint for `diff`.

**Caveats:** Reads only the first mode of each variable collection by default; Tailwind CSS-var resolution reads only `:root`; `diff` from a bare CLI hits Figma's browser-OAuth wall — run it from a supported MCP client.

### 11. Token sync: Figma Variables GitHub Action + the Tokens Studio policy ([figma/variables-github-action-example](https://github.com/figma/variables-github-action-example) · [Tokens Studio GitHub sync](https://docs.tokens.studio/token-storage/remote/sync-git-github))

Two mechanisms, one policy: tokens live as DTCG JSON in the repo and Figma is a mirror.

**How it works:** Figma's reference action (203★, MIT, last push Mar 2025 — stable, not abandoned) runs two manual workflows over the Variables REST API: Figma → tokens opens a PR with updated JSON; tokens → Figma updates variables in place by name matching and **never deletes** ("the workflow will not remove variables or variable collections that have been removed in your tokens files"). Tokens Studio's plugin does the same push/pull from inside Figma and states the policy outright: "the Design Tokens living in code are the source of truth."

**When to reach for it:** The tokens row. Any Figma-originated change arrives as a PR; the reverse direction runs on release.

**Plan gating:** Figma's action needs a full member of an **Enterprise** org (Variables REST API). Tokens Studio multi-file sync is a Pro feature; single-file works free. Not on Enterprise? `export-`/`import-tokens-figma` in pick 9 use the Plugin API on any plan.

**Caveats:** Both are name-matching, no-delete pipelines — renames create orphans on the Figma side that you prune by hand. Both examples are "configured to run manually"; wire a release trigger yourself.

### 12. Ditto ([dittowords.com](https://www.dittowords.com/) · [MCP reference](https://developer.dittowords.com/mcp-reference/overview))

The copy row's canonical home: a string store that syncs to Figma, to code via CLI/API, and now to coding agents through a hosted MCP server.

**How it works:** Text carries stable IDs; the Figma plugin syncs both ways; the CLI/API pulls updated string files into the repo so copy ships "just like any other code change… reviewing in a pull request." The MCP server (`claude mcp add --transport http ditto https://api.dittowords.com/v2/mcp --header "Authorization: token …"`) exposes style-guide and text-search tools so an agent "checks your Ditto style guide first" and reuses approved strings instead of inventing them.

**When to reach for it:** Teams past the point where Figma-native copy management scales; the promotion checklist's "no lorem ipsum, strings from the store" line.

**Caveats:** Commercial SaaS with tiered pricing; overkill for a single-product team, where repo i18n files plus a PR check are the same policy at zero cost.

### (e) Process scaffolds

### 13. GitHub Spec Kit ([github/spec-kit](https://github.com/github/spec-kit))

The scaffold for the *promoted* half of the lifecycle. 133k★, MIT, pushed the day of this review, 30+ agents supported.

**How it works:** `/speckit.constitution` → `/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`, then `/speckit.converge` until it reports "Converged." The prototype and its ledger row become the input to `specify`; the plan is where "keep the UX, rebuild the engine" gets written down.

**When to reach for it:** Stage 3 onward. Not for stage 0–1 — spec-driven development's own community draws the line at throwaway prototypes and exploratory work. Install: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z` (pin a tag).

**Caveats:** Engineering-shaped; it has no notion of a design artifact, so the spec's link back to `PROTO-` id and DS version is your template addition.

### 14. Repo-resident contracts: MADR decision records + Mermaid flows ([adr/madr](https://github.com/adr/madr) · [adr.github.io](https://adr.github.io/) · [Mermaid flowcharts as contracts](https://erdembircan.github.io/blog/mermaid-flowcharts-agentic-development))

Two conventions that give decisions and flows a diffable home in the repo, so agents and reviewers read them literally.

**How it works:** MADR (2.4k★, MIT/CC0, pushed Aug 2026) is a Markdown template — context and problem, decision drivers, considered options, outcome, consequences, confirmation — filed as `docs/decisions/nnnn-title.md`, append-only: supersede, never edit. There is no UX-specific decision-record standard; MADR with a "prototype evidence" field is the closest thing. Bircan's Mermaid rule (Mar 2026): "A flowchart is not an implementation detail. It is a contract" — store `.mmd` beside code, and a PR that changes a workflow must change the diagram in the same commit (Recipe B enforces it). FigJam stays the workshop surface: Figma's `figma-use-figjam` and `figma-generate-diagram` skills ([skills.md](skills.md) pick 2) render Mermaid onto a board and `get_figjam` pulls the reviewed board back into the agent.

**When to reach for it:** The flows and decisions rows; stage 2 evidence ("decision memo link") and stage 3 handoff ("flow diagram" item).

**Caveats:** Mermaid is weak past a dozen linked diagrams; split by flow, not by product. ADRs decay if nobody links them from PRs — the PR template field is the forcing function.

### 15. Governance frameworks: Superblocks' six pillars + the CSA research note ([Superblocks, Aug 2026](https://www.superblocks.com/blog/vibe-coding-governance) · [CSA, Jun 2026](https://labs.cloudsecurityalliance.org/research/csa-research-note-vibe-coding-ai-governance-gap-20260602-csa/))

The security side's view of the same problem, useful because it names the failure at scale (CVE-2025-48757: 170+ Lovable apps readable via the public anon key; hundreds of thousands of public vibe-coded assets "not listed in any asset inventory").

**How it works:** Superblocks' pillars — named owner per app, centralized visibility and audit trail ("You can't govern what you can't see"), build-time guardrails, data classification before building, risk-matched review with rollback, automatic standards enforcement — map one-to-one onto ledger fields. CSA adds the calibration: "lightweight application registration processes (not heavy gatekeeping)," because "a single heavyweight gate will be circumvented in practice," with three tiers (internal non-sensitive / PII or regulated / AI-API or agentic) and secrets scanning extended to builder-platform exports.

**When to reach for it:** Writing the policy, and getting AppSec to co-own the ledger rather than run a parallel inventory.

**Caveats:** Vendor and consortium prose, not tooling; the pillars are only as real as the hook that forces a ledger row (Recipe A).

---

## Hook and rule recipes

Same conventions as [hooks.md](hooks.md): mechanism verified against the official hook docs, scripts *authored here* and **untested in your stack** — adjust globs, hosts, and branch names.

### Recipe A — Ledger-link gate  ·  *authored here*

Protects: **inventory precedes policy** — no PR or issue may link a prototype host without a `PROTO-` ledger id.

`.claude/hooks/proto-ledger-gate.sh` (`chmod +x`):

```bash
#!/bin/bash
# Blocks `gh pr create` / `gh issue create` whose body links a prototype host without a PROTO- id.
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')
echo "$cmd" | grep -qE 'gh (pr|issue) create' || exit 0
body="$cmd"
bf=$(echo "$cmd" | grep -oE '(--body-file|-F) +[^ ]+' | awk '{print $2}' | tr -d "\"'"); [ -f "$bf" ] && body="$body $(cat "$bf")"
hosts='claude\.ai/design|figma\.com/make|figma\.site|v0\.app|v0\.dev|lovable\.app|lovable\.dev/projects|bolt\.host|bolt\.new'
if echo "$body" | grep -qiE "$hosts" && ! echo "$body" | grep -qE 'PROTO-[0-9]{4}-[0-9]{3}'; then
  echo "Prototype link without a ledger id. Add 'Prototype: PROTO-YYYY-NNN' (docs/prototypes/ledger.md) before creating this PR/issue." >&2
  exit 2
fi
exit 0
```

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Bash", "hooks": [ { "type": "command", "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/proto-ledger-gate.sh" } ] } ] } }
```

How it works: `PreToolUse` on `Bash` sees the `gh` command before it runs; exit 2 blocks it and feeds the reason back so Claude adds the id. The CI twin is a `pull_request` workflow that greps `github.event.pull_request.body` with the same two regexes — do both, because humans open PRs too.

### Recipe B — Flow-diagram contract  ·  *authored here*

Protects: **flows as contracts** — a PR that touches routes or screens must touch `docs/flows/*.mmd` (or say why not).

`.claude/hooks/flow-contract.sh`:

```bash
#!/bin/bash
input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')
echo "$cmd" | grep -q 'gh pr create' || exit 0
echo "$cmd" | grep -q 'Flow-unchanged:' && exit 0          # explicit opt-out in the PR body
base=${PROTO_BASE_BRANCH:-origin/main}
changed=$(git diff --name-only "$base"...HEAD 2>/dev/null)
echo "$changed" | grep -qE '^(src/)?(app|pages|routes|screens)/' || exit 0
echo "$changed" | grep -qE '^docs/flows/.*\.mmd$' && exit 0
echo "Routes/screens changed but no docs/flows/*.mmd changed. Update the Mermaid flow (it is the contract) or add 'Flow-unchanged: <reason>' to the PR body." >&2
exit 2
```

Wire it exactly like Recipe A (same `PreToolUse`/`Bash` block; hooks run in parallel, so both can sit in one matcher). Tune the route glob to your router.

### Rule snippet — the "shipped page" banner  ·  *authored here*

For `CLAUDE.md` / `AGENTS.md` when agents operate on Figma through the MCP server:

```md
## Figma pages that have shipped
- Before editing any Figma page, read its description and Dev resources. A merged PR link or a
  "Reference only — shipped in PR #" banner means code is canonical: do not edit the page in place.
- To explore from a shipped page, duplicate it to an "Exploration" page, note
  "superseded by PROTO-____ / PR #____" on the original, and work on the copy.
- When a PR implemented from a Figma page merges, add "Reference only — shipped in PR #<n> on <date>"
  to that page and archive its ledger row.
```

### Recipe C — Expiry sweep (scheduled)  ·  *authored here, optional*

A weekly GitHub Actions cron (`on: schedule: cron: "0 9 * * 1"`, `permissions: issues: write`) reads the ledger and opens one "archive or extend" issue listing rows past expiry. If `docs/prototypes/ledger.md` is a table with `id` in column 2, `status` in 7, and ISO `expiry` in 9, the whole job is:

```bash
today=$(date -u +%F)
awk -F'|' -v t="$today" 'NR>2 && $7 !~ /archived/ && $9 < t {print "- " $2 " (" $7 ", expired " $9 ")"}' docs/prototypes/ledger.md > expired.txt
[ -s expired.txt ] && gh issue create --title "Prototype expiry sweep $today" --label prototype-governance \
  --body "$(printf 'Past expiry — archive (revoke links, disconnect backend) or extend with a reason:\n\n%s' "$(cat expired.txt)")"
```

No vendor exposes a per-prototype delete API, so the sweep opens work for a human. The optional next step is a certificate-transparency query for `*.lovable.app`, `*.bolt.host`, `*.figma.site` under your org's names, to catch prototypes that never got a row.

---

## Templates

### Prototype ledger row

One row per prototype, in whichever tool the team already opens daily (Notion, Airtable, Linear "Prototype" issue type, or `docs/prototypes/ledger.md`). Fields:

```markdown
| Field | Value |
|---|---|
| id | PROTO-2026-042 |
| title | Checkout address autocomplete |
| question | Does inline address suggestion reduce form abandonment for new users? |
| tool | Figma Make / Claude Design / v0 / Lovable / Bolt / static / Mermaid |
| link | <internal-only URL or repo path> |
| ds_version | design-system@4.7.0 (Make kit v3 / v0 DS skill 2026-08) |
| status | draft / exploring / validated / promoted / archived |
| owner | @designer (backup: @eng-partner) |
| created / expiry | 2026-09-02 / 2026-11-01 |
| data | synthetic only — yes / no (if no: classification + approver) |
| public_link | no / yes (reason, password, revoke date) |
| linked_ticket | PROJ-1234 |
| evidence | usability 2026-09-10 (5 users), decision memo link |
| outcome | promoted → PR #567 / retired (reason) / superseded by PROTO-2026-051 |
```

### Promotion checklist (prototype → ticket/PR)

```markdown
## Promotion gate — PROTO-____
- [ ] Ledger row complete; status = validated; owner + eng partner named
- [ ] Question answered with evidence (sessions, decision, or data) linked
- [ ] Built on the DS context object (org DS / Make kit / v0 DS / Lovable DS); ds_version recorded
- [ ] No invented components or raw token values in the reference screens (or exceptions listed with expiry)
- [ ] States covered: empty, loading, error, success, edge/long content; responsive breakpoints shown
- [ ] Accessibility floor: keyboard path, focus order, contrast, labels checked (Axe / lint-design-figma / manual)
- [ ] Data model sketched: entities, sources, permissions; nothing assumes the prototype backend or its RLS
- [ ] Synthetic data only; no secrets; public links revoked or justified
- [ ] Handoff package attached: screenshots, decisions (ADR), flow diagram (.mmd), README with stack + component paths
- [ ] Scope statement: what is reference-only vs. what code (if any) is reused
- [ ] Ticket created with ledger id; PR template will cite it
- [ ] Sign-off: design ____  eng ____  (security ____ if data/backend involved)
```

---

## Evaluated but not selected

- **[lifesized/figma-design-sync](https://github.com/lifesized/figma-design-sync)** — `/sync-to-figma` / `/sync-from-figma`, code-first and token-bound, but 2★ and dependent on a specific console MCP; storysync and skills-for-figma cover the same ground with more substance.
- **[namikazeseb/ds-compliance-audit](https://github.com/namikazeseb/ds-compliance-audit)** — single-file skill, 2★, CC0; `lint-design-figma` (pick 9) and Figma's native Check designs do the same audit with more behind them.
- **[destefanis/design-lint](https://github.com/destefanis/design-lint)** — the classic Figma linter (518★, MIT) but no commit since January 2024; Figma's native **Check designs** (Organization/Enterprise; flags hard-coded values, detached instances, wrong-library components; "does not compare designs to code") has absorbed its job.
- **[gerard-figma/figma-variables-to-styledictionary](https://github.com/gerard-figma/figma-variables-to-styledictionary)** — the official action plus a Style Dictionary step; last push Aug 2024 and the delta is one script. Start from pick 11 and add Style Dictionary yourself.
- **Figma Code Connect, story.to.design, Storybook MCP** — the component-row mechanisms; already curated in [mcp-servers.md](mcp-servers.md) and [skillchains.md](skillchains.md) Chains B and D, so referenced rather than re-picked.
- **Figma Code Layers** (Config 2026) — the first "same artifact" claim between canvas and code, but explicitly exploratory, rolling out from July 2026, with no published fidelity data yet.
- **html.to.design (Bolt/Claude Design → Figma)** — a real path for bringing code prototypes back to canvas for critique, but it is the round-trip the allocation table tells you not to maintain; use `generate_figma_design` for one-shot review imports instead.
- **[Automattic/block-experiments](https://github.com/Automattic/block-experiments)** — a working experiments monorepo, but its README is silent on graduation and archival, which is the whole question here.
- **[antivirusakash/figma-ui-specs-generator](https://github.com/antivirusakash/figma-ui-specs-generator)** — Figma selection → YAML spec for agents; 12★ and overlaps `generate-component-doc-figma` in pick 9.
- **Jira ↔ Figma integration** — embeds files and writes the Jira link into Dev resources, useful traceability for Figma files; it does not index Make, v0, Lovable, or Bolt artifacts, so it cannot be the ledger. (MindStudio's "prototype commons" and Notion's Experiment Results template are the generic version of the ledger row above.)

---

*Curated from [01 — Source of truth: Figma vs. code](../docs/research/design-sdlc/01-source-of-truth-figma-vs-code.md) (per-artifact allocation, sync tooling) and [03 — Prototype governance outside the codebase](../docs/research/design-sdlc/03-prototype-governance-outside-the-codebase.md) (lifecycle, storage, DS context objects, promotion gate, hygiene), re-verified live on 2 September 2026.*
