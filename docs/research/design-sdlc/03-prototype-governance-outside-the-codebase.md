# Prototype Governance Outside the Codebase — Lifecycle, Storage, Promotion, and Retirement of AI-Generated Prototypes (2025–2026)

**Scope.** This document covers the governance and lifecycle layer for prototypes that do *not* live in the product repository: Claude Design projects and hosted artifacts, Figma Make files, v0 / Lovable / Bolt apps, and generated wireframes and flow diagrams (static images, Mermaid/D2, FigJam AI, Relume, UX Pilot, Uizard). The tools themselves are catalogued in [03 — AI UI Generation](../foundational/03-ai-ui-generation.md) §1–2 and [05 — Motion, IxD & Prototyping](../foundational/05-ai-motion-ixd-prototyping.md) §3; this doc asks what teams *do* with the artifacts: where they live, how they are indexed, how their design-system fidelity is kept honest, what has to be true before one becomes a ticket or PR, and how they are retired. The reader is a design leader hardening an SDLC. Sources were gathered via live web research on 2 September 2026; every link was fetched unless marked otherwise in the Candidate picks section. Vendor capabilities move monthly — treat them as snapshots.

---

## Table of Contents

1. [Prototype lifecycle models](#1-prototype-lifecycle-models)
2. [Where prototypes live and how they are indexed](#2-where-prototypes-live-and-how-they-are-indexed)
3. [Design-system fidelity in disposable prototypes](#3-design-system-fidelity-in-disposable-prototypes)
4. [Promotion criteria and the handoff contract](#4-promotion-criteria-and-the-handoff-contract)
5. [Generated wireframes and flow diagrams as inputs](#5-generated-wireframes-and-flow-diagrams-as-inputs)
6. [Risk and hygiene](#6-risk-and-hygiene)
7. [Prototype governance at scale](#7-prototype-governance-at-scale)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Recommendations: a prototype lifecycle and governance model](#9-recommendations-a-prototype-lifecycle-and-governance-model)
10. [Templates](#10-templates)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. Prototype lifecycle models

**What it is.** The stages an AI-generated prototype passes through — explore → validate → promote or retire — and the frameworks people use to decide whether a given artifact is throwaway or evolutionary.

**Why it matters.** The classic throwaway/evolutionary distinction has been reactivated by AI because the *cost* of a prototype collapsed while the cost of maintaining one that accidentally ships did not. 43% of designers now say their company expects working prototypes as a design output, and 50% have shipped AI-generated code to production ([AI in Design Report 2026, Craft chapter](https://stateofaidesign.com/chapters/craft)). Without an explicit lifecycle, "prototype" silently becomes "production".

**Key findings, tools, resources.**

- **Throwaway vs. evolved is now a policy question, not a technical one.** Elektor's 2026 retrospective frames the "vibe coding hangover": speed is rational for prototypes and one-off tools, but "the hangover arrives when those 'throwaway' artifacts become dependencies, revenue features, or embedded firmware that must be maintained, audited, and secured for years" ([Elektor](https://www.elektormagazine.com/articles/2026-an-ai-odyssey-vibe-coding-hangover)). The recommended stance: treat AI output as an untrusted external contribution the moment it leaves the prototype lane.
- **The "graduate workflow".** Multiple sources describe the same two-tool shape — prototype in a browser builder (Bolt/Lovable/v0/Make), then re-do the work in a repo-native agent (Claude Code/Cursor) once validated ([Full Scale](https://fullscale.io/blog/software-prototyping-tools-for-development-teams/); Builder.io's "pick one tool for 0→1 and one for 1→100, then get really good at the handoffs" ([Builder.io](https://www.builder.io/blog/ai-software-engineer))). The spec-driven-development community makes the same cut explicitly: skip SDD for "throwaway prototypes · solo, short-lived projects · exploratory work", and spec-drive everything that ships ([dev.to SDD 2026 survey](https://dev.to/krlz/spec-driven-development-in-2026-what-it-is-the-tooling-and-how-teams-actually-use-it-2fk2); [GitHub Spec Kit](https://github.com/github/spec-kit)).
- **"Keep the UX, rebuild the engine."** The most-cited productionization pattern: the screens and flows the AI produced are the strongest part; the data layer, auth, and infrastructure are gutted and rebuilt ([workspace.hr](https://workspace.hr/blog/vibe-coding-prototype-to-production)). Shopify's enterprise blog draws the same line for commerce: vibe-code the first 80%, then harden payments, auth, and regulated paths under human review ([Shopify](https://www.shopify.com/enterprise/blog/vibe-coding-commerce-platform), search-verified only).
- **"Prototype is the spec" and its critics.** The pro case: show engineers the target rather than a written description ([Reforge](https://www.reforge.com/blog/ai-prototyping-product-development), not fetched — 403). The critique: calling every AI output a "prototype" sets wrong expectations — designers read it as exploration, stakeholders as a near-final direction, customers as a promise, engineers as a feasibility question ([Piedimonte, Medium, Jun 2026](https://medium.com/design-bootcamp/your-ai-generated-prototype-is-probably-not-a-prototype-yet-09f0cbb7dbca), not fetched — 403). Smashing's "production-ready becomes a design deliverable" (already cited in doc 05) is the same argument from the labor side. NN/g's controlled study concludes AI prototyping tools "lack the sophistication to weigh design tradeoffs" and are best for ideation, stakeholder proof-of-concept, and quick usability-test stimuli — not final designs ([NN/g](https://www.nngroup.com/articles/ai-prototyping/)).
- **The counter-position: anchor from the start so nothing is thrown away.** Alloy argues "every gap between the prototype and the codebase is work someone has to resolve later" and recommends pointing AI at the real component library *before* exploring ([Alloy, Jun 2026](https://alloy.app/library/what-is-ai-prototyping)); Builder.io's Fusion model opens a PR "with real code using design tokens and components, rather than creating a disposable mockup" ([Builder.io](https://www.builder.io/blog/ai-prototyping)). This is the evolutionary camp, and it only works when the prototype tool can see the real system (§3).
- **Practitioner accounts of the transition.** Atlassian designers stopped producing multiple Figma files and instead vibe-code refinements "using the real codebase … shipped as a pull request for engineering to review", with explicit no-go zones (business logic, shared platform libraries, security/compliance, performance-fragile systems) and the rule "Always create Pull Requests, never direct-merge" ([Atlassian](https://www.atlassian.com/blog/ai-at-work/designers-workflow-for-shipping-code)). Vercel's design engineers prototype motion, keyboard, and touch in code because those are "better implemented in code to save the time and effort of reimplementing them from a different medium" ([Vercel](https://vercel.com/blog/design-engineering-at-vercel)). Figma's own Workflow Lab shows a designer connecting Make to a live repo, branching, and pushing a PR — scoped to "finer finishes, accessibility improvements, and polish", not large features ([Figma, Jul 2026](https://www.figma.com/blog/workflow-lab-deploying-designs-directly-with-figma-make/)). The AI in Design Report documents the governance spread: AI risk-scored auto-merge at one end, DoorDash-style "same production-quality bar as engineering" PR review at the other ([Craft chapter](https://stateofaidesign.com/chapters/craft)).
- **Academic framing.** CHI 2026 hosted a meet-up on how Generative Design and Vibe Coding "blur boundaries between designers and developers … while raising new challenges around trust, authorship, and control" ([ACM DL](https://dl.acm.org/doi/10.1145/3772363.3778802), abstract via search; not fetched — 403); an earlier CHI study on prompt-based prototyping in software teams flags the risk of "over-optimizing designs around specific examples" ([arXiv 2402.17721](https://arxiv.org/abs/2402.17721)).

**Open questions.** Is there a measurable threshold (e.g., % of screens on-system, presence of real data contracts) at which "rebuild" flips to "evolve"? Who arbitrates the vocabulary — is "prototype" a status field rather than a noun? Does the two-tool graduate workflow survive once Make/v0/Claude Design all write PRs directly?

---

## 2. Where prototypes live and how they are indexed

**What it is.** Storage and discovery patterns for artifacts outside the product repo: sandbox repos, monorepo folders, vendor workspaces, and the registry/ledger that indexes them.

**Why it matters.** Every vendor now hosts prototypes on its own URL space by default (Claude Design projects, Make files in Drafts, v0 chats, Lovable/Bolt projects). Without an index, the organization does not know what exists — the exact failure that security researchers later found at scale (§6).

**Key findings, tools, resources.**

| Pattern | Example | Strengths | Weaknesses |
|---|---|---|---|
| **Shared sandbox repo** (one Next.js app, per-designer folders) | Notion's Prototype Playground: "each designer has a separate folder … file-based and has no backend database", with shared design-system components and `/deploy`, `/figma` commands; explicitly "for prototypes rather than production code" ([ChatPRD/How I AI](https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows); [Lenny's](https://www.lennysnewsletter.com/p/this-week-on-how-i-ai-how-notions)) | Discoverable, reusable, on-system by default, git history | Neither source describes cleanup or retirement; needs an owner |
| **Stripped-down "design sandbox" repo** | Xinran Ma's pattern: a separate lightweight repo with the DS installed as a package, only core screens recreated, shared via tunnel links; "someone has to own and maintain" it ([Design with AI, Sep 2026](https://designwithai.substack.com/p/how-to-build-a-design-sandbox-for-your-team-to-prototype-with-real-code)) | Cheap, safe distance from production | No documented promotion path |
| **Experiments monorepo** | Automattic `block-experiments`: one repo to "develop, test, and package" experimental blocks, bundled via JSON configs ([GitHub](https://github.com/Automattic/block-experiments)) | Packaging + issue tracking in one place | README is silent on graduation/archival |
| **Vendor workspace** | Claude Design projects (org-scoped, auto-inherit DS) ([Anthropic help](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)); Figma Make files in Drafts/team projects ([Figma help](https://help.figma.com/hc/en-us/articles/31304412302231)); v0 team projects with private/team scope and Owner access-by-URL to any chat ([v0 Teams](https://v0.app/docs/teams)); Lovable workspace visibility ([Lovable](https://docs.lovable.dev/features/share-project)) | Zero setup; admin controls exist | Scattered across four vendors; no cross-tool index; Jira's Figma integration embeds Figma design files, not vendor-hosted prototypes ([Figma help](https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma)) |
| **Registry / ledger** | "As simple as a shared Notion database or Airtable where teams log: what the tool does, what data it touches, who built it and who maintains it, how many people use it" ([MindStudio, "prototype commons"](https://www.mindstudio.ai/blog/what-is-the-prototype-commons-ai-product-management)); Notion's Experiment Results template ([Notion](https://www.notion.com/templates/experiment-results)) | Cross-tool, cheap, auditable | Manual; decays without a hook that forces entries |

- No published "prototype registry" standard exists; the closest analogues are the design-system **exception log with expiry** ("explicit, temporary, measurable" with review cycles to promote or sunset — [UXPin](https://www.uxpin.com/studio/blog/design-drift/)) and the security community's **application inventory** ("You can't govern what you can't see" — [Superblocks](https://www.superblocks.com/blog/vibe-coding-governance)). The ledger template in §10 merges both.
- Status vocabularies in the wild are informal. The most defensible one comes from combining exception-path language (draft / validated / promoted / sunset) with Definition-of-Ready/Done thinking ([Plane](https://plane.so/blog/definition-of-done-dod-checklist-examples-for-agile-teams), search-verified only).

**Open questions.** Should the ledger live in the issue tracker (a "Prototype" issue type) or beside the design system? Can a hook auto-create a ledger row when a Claude Design/Make/v0 link is pasted into a ticket? What retention does the sandbox repo get — branch-per-prototype with auto-archive after N days?

---

## 3. Design-system fidelity in disposable prototypes

**What it is.** How each prototyping tool ingests the real design system so that throwaway work is on-brand, and what still drifts.

**Why it matters.** Figma's Tara Nadella: "Speed without direction leads to divergence" ([Figma, 5 Shifts](https://www.figma.com/blog/5-shifts-redefining-design-systems-in-the-ai-era/)). Vitaly Friedman's diagnosis of why AI prototypes underdeliver: "tiny inconsistencies scattered across a design system" — undocumented decisions and hard-coded values the model faithfully reproduces ([Smashing, Jun 2026](https://www.smashingmagazine.com/2026/06/how-make-design-system-ai-ready/)). The countermeasure in every tool is the same: a packaged, versioned DS context object.

**Key findings, tools, resources.**

| Tool | DS ingestion mechanism | Scope / governance | Notable limits |
|---|---|---|---|
| **Claude Design** | Import from a GitHub repo, design files, decks, or brand assets; "all team members' projects automatically use it (for Team and Enterprise plans)" ([Anthropic help](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)); `/design-sync` from Claude Code keeps a local component library in sync "incrementally, one component at a time, never as a wholesale replace" ([tool description](https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-designsync.md)) | Org-level; Enterprise-only "Claude Design Admin" role gates who can publish/set default/delete DSs; "default off for Enterprise" ([admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)) | Updates require re-upload/"Remix"; no DS version pinning documented |
| **Figma Make** | Make kits: npm packages + variables/styles from published libraries + guidelines; "Figma Make can generate the guidelines … We recommend letting Figma Make generate the guidelines and then reviewing" ([Make kits](https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits)); file-level `guidelines.md` with the warning "More context isn't always better" ([guidelines](https://help.figma.com/hc/en-us/articles/33665861260823-Add-guidelines-to-Figma-Make)) | Org admins "can approve published Make kits and enable them by default"; Full seats only ([Make kits](https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits)); launched Apr 2026 ([Figma blog](https://www.figma.com/blog/introducing-make-kits-and-make-attachments/)) | Kit quality depends on guideline authoring; no kit-version stamp on outputs |
| **v0** | Design Systems 2.0: DS saved "as a skill in your current scope" from GitHub, npm, Figma frames, Storybook; "If a component, prop, or token cannot be verified from the sources, v0 should not use it" ([v0 docs](https://v0.app/docs/design-systems-2)); legacy path via shadcn registries + Open in v0 ([v0 legacy](https://v0.app/docs/design-systems-legacy); [shadcn](https://ui.shadcn.com/docs/registry/open-in-v0); [Vercel](https://vercel.com/blog/ai-powered-prototyping-with-design-systems)) | Team default DS for all new chats | "Existing projects don't auto-update"; Open-in-v0 ignores `cssVars`/`css` |
| **Lovable** | A DS is "a regular Lovable project that is marked as a design system"; connecting copies components to `src/design-system/<slug>/` and rules to `.lovable/rules/libraries/<slug>/`; auto-scans for "raw color literals where a design system token should be used" ([Lovable DS](https://docs.lovable.dev/features/design-systems)); workspace/project knowledge files and repo `AGENTS.md` ([Lovable knowledge](https://docs.lovable.dev/features/knowledge)) | Versioned releases with "Update available" prompts; one DS per project | Local edits to DS files are overwritten on update |
| **Bolt** | DS compiled from your component library/DS site; "built from your actual components, not stand-in code"; sync with version history and rollback ([Bolt](https://support.bolt.new/building/design-system/introduction.md)) | Team plan required | Storybook view exposes what Bolt "knows"; no adherence scan documented |

- **What still breaks.** Translation steps and uncontrolled overrides are the structural causes of drift ([UXPin](https://www.uxpin.com/studio/blog/design-drift/)); prototyping with real components removes the translation step ([Magic Patterns](https://www.magicpatterns.com/blog/design-system-maintenance)) but not overrides or invented components. The pragmatic fix is a closed token layer plus audit scripts (Smashing's three layers: spec files, token layer, audit) ([Smashing](https://www.smashingmagazine.com/2026/06/how-make-design-system-ai-ready/)); the structural fix is the construction-file approach in [prototype-construction](../prototype-construction/README.md), where the builder "physically cannot emit an off-token color or an invented component".
- **Policy pattern: "no prototype without the DS package."** Figma's fourth shift is DS teams "embedding rules directly into AI tools" ([5 Shifts](https://www.figma.com/blog/5-shifts-redefining-design-systems-in-the-ai-era/)); Anthropic's admin guide says the single most important rollout step is having "an experienced designer set up your organization's design system" before enabling the tool ([admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)). Enforceable versions: Make kits enabled-by-default + admin approval; v0 team default DS; Claude Design org DS with the Admin role.

**Open questions.** None of the five tools stamps outputs with the DS version used — the ledger has to record it manually. Can an on-system-rate check (see doc 02's evaluation gap) run against a hosted prototype URL? Who owns Make-kit/knowledge-file guidelines when they diverge from the code DS?

---

## 4. Promotion criteria and the handoff contract

**What it is.** What must be true before a prototype becomes a ticket or a PR, and what crosses the boundary (reference vs. code).

**Why it matters.** The handoff is where governance either exists or does not. Every vendor now ships a one-click path from prototype to repo, which makes the *gate* — not the mechanism — the design leader's job.

**Key findings, tools, resources.**

| Path | Mechanism | What carries over | Evidence on rebuild vs. eject |
|---|---|---|---|
| **Claude Design → Claude Code** | "Hand off to Claude Code" export: design files, chat, and a README "which tells the model to interpret the designs", plus a paste-in prompt ([Claude Academy](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux)); push to GitHub/GitLab/Bitbucket, then connect Vercel ([Vercel KB](https://vercel.com/kb/guide/claude-design)) | Intent, screenshots, component names, decisions in chat; "Since the prototype is already built with your real patterns, the gap … shrinks dramatically" when the codebase is linked | PM toolkit's README template instructs "re-implement this in our production stack while preserving the design intent" — map inline styles to component props, do not build 1:1 from the HTML; ships a DoD (Axe, Lighthouse ≥90, i18n) ([aakashg toolkit](https://github.com/aakashg/claude-design-pm-toolkit/blob/main/11_claude_code_handoff.md)); practitioner walkthrough to auto-opened PRs ([dev.to, May 2026](https://dev.to/bilelsalemdev/from-prompt-to-pull-request-using-claude-design-claude-code-and-github-together-3m00)) |
| **Figma Make → codebase** | Connect repo, branch, push PR from Make; engineer reviews, PM checks the goal ([Figma Workflow Lab](https://www.figma.com/blog/workflow-lab-deploying-designs-directly-with-figma-make/)); reverse direction via MCP + Code Connect with drift detection, new components "added back to Figma's canvas for the design team to formalize" ([Figma, Aug 2026](https://www.figma.com/blog/workflow-lab-moving-between-design-and-code-with-agents/)) | Code diff (when repo-connected); otherwise a published URL and Make file | Figma scopes the direct-PR path to polish and a11y, not features |
| **v0 → repo** | Branch-per-chat, auto-commits, PR from v0; Git Import of existing repos; "After the pull request merges, v0 synchronizes the chat with the base branch" ([v0 GitHub](https://v0.app/docs/github)); registry items install via `npx shadcn add <url or @namespace/item>` ([shadcn CLI](https://ui.shadcn.com/docs/cli)) | Component files, or a PR | The old "Add to Codebase" one-liner was removed; users report falling back to zip download or Git sync ([Vercel community](https://community.vercel.com/t/v0-add-to-codebase-feature-missing-or-changed-to-shadcn-cli/34643)) |
| **Lovable → GitHub** | Two-way sync on one active branch; commits by `lovable-dev[bot]` co-attributed to members; import of existing repos "unsupported — only export works"; reconnecting creates a new repo ([Lovable GitHub](https://docs.lovable.dev/integrations/github)) | Whole app | "Keep the UX, rebuild the engine" is the documented productionization pattern ([workspace.hr](https://workspace.hr/blog/vibe-coding-prototype-to-production)) |
| **Bolt → GitHub** | Repo backup/sync; org admin picks which repos Bolt may touch ([Bolt](https://support.bolt.new/integrations/github-org.md)); reverse to Figma via html.to.design for "prototyping, and developer handoff" ([html.to.design](https://html.to.design/blog/from-bolt-to-figma/)) | Whole app | Same as Lovable |

- **The contract that keeps showing up.** Atlassian's rules (PR always; no business logic, shared libs, security, or perf-fragile paths; small diffs; validate across themes and states; Loom for intent) ([Atlassian](https://www.atlassian.com/blog/ai-at-work/designers-workflow-for-shipping-code)); Claude Academy's "before handing off, ask Claude to demonstrate … empty states, errors, and loading states" ([Claude Academy](https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux)); the design-ops `handoff-spec` skill's "include all states, not just the happy path" (see [skills.md](../../../skill-resources/skills.md)). These converge on the checklist in §10b.
- **Reference, not code.** Across sources the prototype crosses as a *reference package* (screens, states, decisions, DS version, validation evidence) and the code is rebuilt on the real stack — except for narrow, repo-connected polish where the tool itself opened the PR.

**Open questions.** Should the promotion gate be a ticket state ("Prototype validated") that blocks PR creation, or a PR template checkbox? Who signs the accessibility floor for a prototype that never reaches a PR? Can the handoff README be generated from the ledger row?

---

## 5. Generated wireframes and flow diagrams as inputs

**What it is.** Treating static mockups, wireframes, and flow diagrams as machine-readable spec inputs, and keeping traceability from ticket → prototype → PR.

**Why it matters.** Diagrams and mockups are cheap to generate and therefore multiply; the ones that matter need to become contracts that agents and reviewers read literally.

**Key findings, tools, resources.**

- **Diagrams as contracts in the repo.** "A flowchart is not an implementation detail. It is a contract" — Mermaid files stored beside code (even in `CLAUDE.md`), with the review rule that a PR changing a workflow must update the diagram ([Bircan](https://erdembircan.github.io/blog/mermaid-flowcharts-agentic-development)). D2 offers the same docs-as-code loop with CI rendering ([terrastruct/d2-docs](https://github.com/terrastruct/d2-docs), search-verified only). Limits: Mermaid is a local documentation tactic, weak for many linked diagrams or layout control ([Revision](https://revision.app/blog/mermaid-architecture-diagram), search-verified only).
- **FigJam as the agent's whiteboard.** Figma's `figma-use-figjam`, `generate_diagram`, and `generate-project-plan` skills let agents read and write boards; the documented loop is plan on FigJam → review asynchronously → pull the board back into the coding agent → PR "which links to the FigJam with all the design context" ([Figma, Apr 2026](https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/)). FigJam stickies convert to Jira issues via the widget ([Figma help](https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma)).
- **Image-to-code.** Claude Design accepts screenshots, images, decks, and codebases as inputs ([Anthropic help](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)); the open-source `screenshot-to-code` lineage is in doc 03. Wireframe tools remain lossy inputs: Uizard "does not export production-ready code" and its Figma export is a known pain point ([Medium comparison](https://medium.com/@syedahmershah/i-tested-and-compared-the-6-best-ai-wireframe-generators-with-ui-and-code-export-db9457358e16), search-verified only). A Claude Code wireframe skill exists that generates five B&W HTML options into a timestamped `wireframe/<MMDD-feature>/` folder — a de facto storage convention ([claude-wireframe-skill](https://github.com/Magdoub/claude-wireframe-skill/)).
- **Traceability.** Jira's Figma integration embeds files/prototypes in issues, mirrors "Ready for dev", and writes the Jira link back into the file's Dev resources; it covers design files, not vendor-hosted prototypes ([Figma help](https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma)). For decisions, the ADR pattern (Nygard/MADR; append-only, supersede rather than edit) is the closest thing to a "design decision record" ([adr.github.io](https://adr.github.io/)); no UX-specific DDR standard was found.

**Open questions.** Should flows be Mermaid in the repo (reviewable) or FigJam (collaborative), with one declared canonical? How does a static mockup carry its DS version and validation status? Is a PR-template field "Prototype: <ledger id>" enough traceability?

---

## 6. Risk and hygiene

**What it is.** Data, secrets, public exposure, licensing, and retention for prototypes that live on vendor hosting.

**Why it matters.** The failure mode is documented at scale. CVE-2025-48757: 170+ Lovable apps with 303 endpoints readable via the public anon key because generated Supabase RLS was missing — "the public anon_key embedded in the client allowed direct queries" ([Superblocks](https://www.superblocks.com/blog/lovable-vulnerabilities)). RedAccess then found ~380,000 public assets on Lovable/Base44/Replit/Netlify, ~5,000 holding sensitive corporate data (clinical trials, patient conversations, finance), "not listed in any asset inventory" ([VentureBeat, May 2026](https://venturebeat.com/security/vibe-coded-apps-shadow-ai-s3-bucket-crisis-ciso-audit-framework)). The Cloud Security Alliance's June 2026 note: teams that "do not currently inventory citizen-built applications have no baseline against which to assess risk" ([CSA](https://labs.cloudsecurityalliance.org/research/csa-research-note-vibe-coding-ai-governance-gap-20260602-csa/)).

**Key findings, tools, resources.**

| Risk | What the vendors provide | Policy to adopt |
|---|---|---|
| **Public share links** | Claude Design sharing is org-scoped — no public link; external sharing requires HTML/PDF export ([Hummingdeck, Jun 2026](https://hummingdeck.com/blog/share-claude-design)). Figma admins can disable external publishing and require passwords for Make/Sites ([Figma help](https://help.figma.com/hc/en-us/articles/31242876956183-Manage-web-publishing-for-an-organization)) and disable public link sharing ([Figma help](https://help.figma.com/hc/en-us/articles/5726756336791-Manage-public-link-sharing-and-open-sessions)). Lovable published apps get "a public URL with HTTPS included" ([Lovable FAQ](https://docs.lovable.dev/introduction/faq)); preview links can be password-protected with expiry on Business/Enterprise ([Lovable](https://docs.lovable.dev/features/share-project)). v0 chats can be private/team/unlisted/public ([v0 Teams](https://v0.app/docs/teams)). | Default internal-only; public publish requires ledger entry + owner + expiry |
| **Backends and secrets** | Figma admins can disable Supabase backend integration (existing connections are *not* severed) ([Figma help](https://help.figma.com/hc/en-us/articles/34162517434007-Manage-backend-integration-for-an-organization)) and gate MCP connectors ([Figma help](https://help.figma.com/hc/en-us/articles/36343926263703-Manage-MCP-connectors-for-the-Figma-agent-and-Figma-Make)); Bolt org admins choose which repos Bolt may access ([Bolt](https://support.bolt.new/integrations/github-org.md)) | No prototype connects to production data; secrets scanning extended to builder platforms (CSA) |
| **Real customer data** | Figma de-identifies content and lets admins toggle content training ([Figma AI approach](https://www.figma.com/ai/our-approach/), search-verified only); Claude Design uploads "fall under the same data retention and deletion policies as other Anthropic enterprise products", no data residency ([admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)) | Synthetic data only; data classification "before anyone generates" ([Superblocks governance](https://www.superblocks.com/blog/vibe-coding-governance)) |
| **Accidental shipping** | Atlassian's no-go zones; Elektor's "treat as untrusted external contribution" | Promotion gate (§9) is the only path to production |
| **Retention** | Vendor retention is workspace-level, not per-prototype | Ledger expiry with default 90-day archive; sandbox branches auto-archived |
| **Licensing of generated assets** | Not addressed by any prototype tool doc reviewed | Defer to doc 04's licensing section; record asset provenance in the ledger |

**Open questions.** Can DNS/cert-transparency discovery of `*.lovable.app`, `*.bolt.host`, `*.figma.site` be run as a recurring hook? Does a "delete on expiry" automation exist for any vendor API? Who owns a prototype when its author leaves?

---

## 7. Prototype governance at scale

**What it is.** How DesignOps, design-system teams, and security functions divide the governance of AI-generated prototypes.

**Why it matters.** Governance that "punishes experimentation" pushes AI to the edges; governance that is absent produces the exposures in §6. The practical middle is lightweight registration plus enforced gates.

**Key findings, tools, resources.**

- **DesignOps as pipeline governor.** A four-layer model — source (versioned, machine-readable contracts), injection (governed context via MCP/RAG), evaluation ("component validity, token compliance, keyboard behavior, ARIA coverage, forbidden patterns"), and dynamic audit (records of output, failures, and corrections that feed back into schemas) ([UX Design Lab, DesignOps 2.0](https://uxdesignlab.com/insights/designops-2-0-governing-the-ai-delivery-pipeline/)). Figma's fifth shift treats AI as a maintainer of the system itself ([5 Shifts](https://www.figma.com/blog/5-shifts-redefining-design-systems-in-the-ai-era/)).
- **Security's six pillars** — ownership per app, centralized visibility/audit trail, build-time guardrails, data classification, review and governed deployment, automatic standards enforcement ([Superblocks](https://www.superblocks.com/blog/vibe-coding-governance)) — map cleanly onto a design-side ledger and gate; CSA recommends "lightweight application registration processes (not heavy gatekeeping)" and tiered governance for internal tools vs. PII-handling vs. agentic apps ([CSA](https://labs.cloudsecurityalliance.org/research/csa-research-note-vibe-coding-ai-governance-gap-20260602-csa/)).
- **Vendor admin surfaces are now real.** Claude Design: capability toggle, custom roles, Design Admin permission, phased rollout advice ([admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)). Figma: kit approval, publishing, backend, MCP controls (§3, §6). v0: Owner access to any team chat by URL, Enterprise RBAC ([v0 Teams](https://v0.app/docs/teams)). Bolt: org-level repo allow-list.
- **Conference and analyst coverage is thin.** Rosenfeld's DesignOps Summit 2025 themed "Craft" and "Futures" ([Rosenfeld](https://rosenfeldmedia.com/designops-summit/), search-verified only) and the Designing with AI 2026 recap could not be fetched (403); no talk specifically on prototype governance was identified. Gartner/Forrester 2026 material addresses agentic-AI governance generally, not design prototypes (search-verified only). NN/g's contribution is the fidelity/appropriateness study in §1.

**Open questions.** Does prototype governance belong to DesignOps, the DS team, or AppSec — or is the ledger the shared object all three read? What is the minimum viable registration that people will actually do?

---

## 8. Cross-cutting themes

1. **The gate is the product, not the pipe.** Every vendor now ships prototype→PR in one click; the differentiating work is the promotion checklist and who signs it.
2. **Inventory precedes policy.** Security research, DS governance, and DesignOps all arrive at "one place that lists every prototype" as step zero.
3. **Reference crosses, code rarely does.** Outside narrow repo-connected polish, the prototype is a package of screens, states, decisions, and evidence; the implementation is rebuilt on the real stack.
4. **DS context objects are the fidelity mechanism** — org DS (Claude Design), Make kits, v0 DS skills, Lovable DS projects, Bolt DS — and none of them stamp outputs with a version, so the ledger must.
5. **Vocabulary is governance.** "Prototype" needs a status axis (draft / validated / promoted / archived) or everyone reads it differently.
6. **Public-by-default hosting is the new S3 bucket.** Expiry and internal-only defaults are the cheapest controls available.

---

## 9. Recommendations: a prototype lifecycle and governance model

### Lifecycle stages

| Stage | Entry criteria | Exit criteria | Default expiry |
|---|---|---|---|
| **0 Draft** | Anyone, any tool; internal-only sharing; synthetic data | Ledger row created (id, question, tool, link, DS version, owner) | 30 days → archived |
| **1 Exploring** | Ledger row exists; DS package attached (org DS / Make kit / v0 DS / Lovable DS) | Question answered or abandoned; screenshots + decisions captured | 60 days |
| **2 Validated** | Evidence attached (usability session, stakeholder decision, or data); states covered (empty/error/loading); a11y floor checked | Promotion checklist (§10b) signed by design + eng owner | 90 days |
| **3 Promoted** | Linked ticket/PR; handoff package (README, screenshots, decisions, DS version) attached | PR merged; prototype marked "superseded by <PR>" | Archive on merge |
| **Archived / Retired** | Expiry hit or question closed | Public links revoked; backend disconnected; row kept for audit | Keep row indefinitely; delete artifact per vendor policy |

### Storage and index

- One **ledger** (Notion/Airtable/Linear "Prototype" issue type — whichever the team already opens daily), one row per prototype, fields as in §10a. Enforce with a hook or issue template: no ticket may link a prototype URL without a ledger id.
- One **sandbox repo** (Notion pattern) for code prototypes: per-designer folders, DS as a package, preview deploys, branches auto-archived at expiry. Vendor-hosted prototypes stay where they are but are indexed.
- **Flows** live as Mermaid/D2 in the repo once promoted; FigJam is the exploratory surface.

### Per-tool handoff paths

| Source | What carries over | What gets rebuilt | Promotion gate |
|---|---|---|---|
| **Claude Design** | Handoff bundle (design files, chat, README), screenshots, component names, decisions; org DS version | Implementation on the real stack via Claude Code with the codebase linked; README rewritten to "re-implement using existing components" | Checklist + eng owner; `/design-sync` only for DS components, never whole screens |
| **Figma Make** | Published URL + Make file; Make kit version; for repo-connected polish, the PR itself | Any feature-scale work; anything touching logic or shared libs | Checklist; direct Make→PR allowed only for polish/a11y with engineer review |
| **v0** | Registry items via `npx shadcn add`, or the branch/PR when repo-connected | Everything outside the component layer | Checklist; team default DS mandatory |
| **Lovable / Bolt** | Screens and flows as reference; exported repo as *read-only* reference | Data layer, auth, RLS, infra ("keep the UX, rebuild the engine") | Checklist + security review; backend disconnected on archive |
| **Static mockups / wireframes** | Images as vision input + annotations; DS version noted | All code | Checklist minus code items; must name the flow it belongs to |
| **Flow diagrams** | Mermaid/D2 file committed with the PR; FigJam link in PR | N/A | Diagram updated in the same PR (contract rule) |

---

## 10. Templates

### (a) Prototype ledger row

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

### (b) Promotion checklist (prototype → ticket/PR)

```markdown
## Promotion gate — PROTO-____
- [ ] Ledger row complete; status = validated; owner + eng partner named
- [ ] Question answered with evidence (sessions, decision, or data) linked
- [ ] Built on the DS package (org DS / Make kit / v0 DS / Lovable DS); ds_version recorded
- [ ] No invented components or raw token values in the reference screens (or exceptions listed with expiry)
- [ ] States covered: empty, loading, error, success, edge/long content; responsive breakpoints shown
- [ ] Accessibility floor: keyboard path, focus order, contrast, labels checked (Axe/FigmaLint or manual)
- [ ] Data model sketched: entities, sources, permissions; nothing assumes prototype backend/RLS
- [ ] Synthetic data only; no secrets; public links revoked or justified
- [ ] Handoff package attached: screenshots, decisions/ADR, flow diagram (Mermaid/D2), README with stack + component paths
- [ ] Scope statement: what is reference-only vs. what code (if any) is reused
- [ ] Ticket created with ledger id; PR template will cite it
- [ ] Sign-off: design ____  eng ____  (security ____ if data/backend involved)
```

---

## 11. Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| aakashg/claude-design-pm-toolkit — handoff README | https://github.com/aakashg/claude-design-pm-toolkit/blob/main/11_claude_code_handoff.md | Fill-in README + DoD for the Claude Design → Claude Code handoff | fetched OK | templates (proposed) / subagents-and-commands |
| Magdoub/claude-wireframe-skill | https://github.com/Magdoub/claude-wireframe-skill/ | Claude Code skill: 5 B&W HTML wireframe options in `wireframe/<MMDD-feature>/` | fetched OK | skills |
| Anthropic `/design-sync` tool description | https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-designsync.md | Reference for the plan→write ordering of DS sync; useful for rules on "components only, never whole screens" | fetched OK | rules |
| Figma Make kits + guidelines docs | https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits | Canonical DS-context object for Make; guidelines authoring rules | fetched OK | prototype governance (proposed) |
| v0 Design Systems 2.0 | https://v0.app/docs/design-systems-2 | DS-as-skill scoped to team; "cannot be verified → should not use it" rule | fetched OK | prototype governance (proposed) |
| Lovable design systems + knowledge | https://docs.lovable.dev/features/design-systems | DS project pattern with token-literal scanning and versioned updates | fetched OK | prototype governance (proposed) |
| Notion Prototype Playground write-up | https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows | Sandbox-repo storage pattern with `/deploy`, `/figma` commands | fetched OK | subagents-and-commands (pattern) |
| GitHub Spec Kit | https://github.com/github/spec-kit | `/speckit.specify → plan → tasks → implement` for the promoted half of the lifecycle | fetched OK | subagents-and-commands |
| Mermaid flowcharts as contracts | https://erdembircan.github.io/blog/mermaid-flowcharts-agentic-development | Rule: PR that changes a flow must update the diagram | fetched OK | rules / hooks (idea: diff check on `docs/flows/*.mmd`) |
| adr.github.io (MADR/Nygard) | https://adr.github.io/ | Decision-record templates to adapt as design decision records | fetched OK | templates (proposed) |
| Figma FigJam agent skills | https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/ | `figma-use-figjam`, `generate_diagram`, `generate-project-plan` | fetched OK | mcp-servers |
| Superblocks vibe-coding governance pillars | https://www.superblocks.com/blog/vibe-coding-governance | Six-pillar checklist to mirror in the ledger | fetched OK | prototype governance (proposed) |
| CSA vibe-coding governance gap note | https://labs.cloudsecurityalliance.org/research/csa-research-note-vibe-coding-ai-governance-gap-20260602-csa/ | Tiered governance and lightweight registration guidance | fetched OK | prototype governance (proposed) |
| Design sandbox how-to (Xinran Ma) | https://designwithai.substack.com/p/how-to-build-a-design-sandbox-for-your-team-to-prototype-with-real-code | Separate lightweight repo + DS package pattern | fetched OK | prototype governance (proposed) |
| Hook idea: ledger-link gate | — | PreToolUse/PR-template check: reject tickets/PRs containing `claude.ai/design`, `figma.com/make`, `v0.app`, `lovable.app`, `bolt.host` URLs without a `PROTO-` id | n/a | hooks (proposed) |
| Hook idea: expiry sweep | — | Scheduled job reads the ledger, flags rows past expiry, opens "archive or extend" tasks; optional cert-transparency scan of vendor subdomains (VentureBeat framework) | n/a | hooks (proposed) |

Not fetched (403 or paywall) but referenced: [The New Stack on the Claude Design overhaul](https://thenewstack.io/anthropic-claude-design-overhaul/), [Reforge](https://www.reforge.com/blog/ai-prototyping-product-development), [Piedimonte (Medium)](https://medium.com/design-bootcamp/your-ai-generated-prototype-is-probably-not-a-prototype-yet-09f0cbb7dbca), [Design Systems Collective — Arteeva](https://www.designsystemscollective.com/design-systems-lovable-bolt-v0-and-replit-50a0a197bc35), [CHI 2026 meet-up](https://dl.acm.org/doi/10.1145/3772363.3778802), [Rosenfeld Designing with AI 2026 recap](https://rosenfeldmedia.com/designing-with-ai/a-deep-dive-into-day-1-of-designing-with-ai-2026/). Southleft's [Life After the Prototype](https://southleft.substack.com/p/life-after-the-prototype) was fetched but is partly paywalled.

---

## 12. Sources

- https://stateofaidesign.com/chapters/craft
- https://www.elektormagazine.com/articles/2026-an-ai-odyssey-vibe-coding-hangover
- https://fullscale.io/blog/software-prototyping-tools-for-development-teams/
- https://www.builder.io/blog/ai-software-engineer
- https://www.builder.io/blog/ai-prototyping
- https://www.builder.io/blog/new-path-from-prototype-to-production
- https://dev.to/krlz/spec-driven-development-in-2026-what-it-is-the-tooling-and-how-teams-actually-use-it-2fk2
- https://github.com/github/spec-kit
- https://workspace.hr/blog/vibe-coding-prototype-to-production
- https://www.shopify.com/enterprise/blog/vibe-coding-commerce-platform
- https://www.reforge.com/blog/ai-prototyping-product-development
- https://medium.com/design-bootcamp/your-ai-generated-prototype-is-probably-not-a-prototype-yet-09f0cbb7dbca
- https://www.nngroup.com/articles/ai-prototyping/
- https://alloy.app/library/what-is-ai-prototyping
- https://www.atlassian.com/blog/ai-at-work/designers-workflow-for-shipping-code
- https://vercel.com/blog/design-engineering-at-vercel
- https://www.figma.com/blog/workflow-lab-deploying-designs-directly-with-figma-make/
- https://www.figma.com/blog/workflow-lab-moving-between-design-and-code-with-agents/
- https://dl.acm.org/doi/10.1145/3772363.3778802
- https://arxiv.org/abs/2402.17721
- https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows
- https://www.lennysnewsletter.com/p/this-week-on-how-i-ai-how-notions
- https://designwithai.substack.com/p/how-to-build-a-design-sandbox-for-your-team-to-prototype-with-real-code
- https://github.com/Automattic/block-experiments
- https://support.claude.com/en/articles/14604416-get-started-with-claude-design
- https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design
- https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans
- https://www.anthropic.com/news/claude-design-anthropic-labs
- https://academy.claude.com/tutorials/using-claude-design-for-prototypes-and-ux
- https://github.com/Piebald-AI/claude-code-system-prompts/blob/main/system-prompts/tool-description-designsync.md
- https://vercel.com/kb/guide/claude-design
- https://hummingdeck.com/blog/share-claude-design
- https://github.com/aakashg/claude-design-pm-toolkit/blob/main/11_claude_code_handoff.md
- https://dev.to/bilelsalemdev/from-prompt-to-pull-request-using-claude-design-claude-code-and-github-together-3m00
- https://help.figma.com/hc/en-us/articles/31304412302231
- https://help.figma.com/hc/en-us/articles/39241689698839-Get-started-with-Make-kits
- https://help.figma.com/hc/en-us/articles/33665861260823-Add-guidelines-to-Figma-Make
- https://www.figma.com/blog/introducing-make-kits-and-make-attachments/
- https://www.figma.com/blog/5-shifts-redefining-design-systems-in-the-ai-era/
- https://www.figma.com/blog/figjam-your-coding-agents-whiteboard/
- https://help.figma.com/hc/en-us/articles/360039827834-Jira-and-Figma
- https://help.figma.com/hc/en-us/articles/31242876956183-Manage-web-publishing-for-an-organization
- https://help.figma.com/hc/en-us/articles/5726756336791-Manage-public-link-sharing-and-open-sessions
- https://help.figma.com/hc/en-us/articles/34162517434007-Manage-backend-integration-for-an-organization
- https://help.figma.com/hc/en-us/articles/36343926263703-Manage-MCP-connectors-for-the-Figma-agent-and-Figma-Make
- https://www.figma.com/ai/our-approach/
- https://v0.app/docs/design-systems-2
- https://v0.app/docs/design-systems-legacy
- https://v0.app/docs/teams
- https://v0.app/docs/github
- https://community.vercel.com/t/v0-add-to-codebase-feature-missing-or-changed-to-shadcn-cli/34643
- https://ui.shadcn.com/docs/registry/open-in-v0
- https://ui.shadcn.com/docs/cli
- https://vercel.com/blog/ai-powered-prototyping-with-design-systems
- https://docs.lovable.dev/features/design-systems
- https://docs.lovable.dev/features/knowledge
- https://docs.lovable.dev/integrations/github
- https://docs.lovable.dev/features/share-project
- https://docs.lovable.dev/introduction/faq
- https://support.bolt.new/building/design-system/introduction.md
- https://support.bolt.new/integrations/github-org.md
- https://html.to.design/blog/from-bolt-to-figma/
- https://www.smashingmagazine.com/2026/06/how-make-design-system-ai-ready/
- https://www.uxpin.com/studio/blog/design-drift/
- https://www.magicpatterns.com/blog/design-system-maintenance
- https://www.mindstudio.ai/blog/what-is-the-prototype-commons-ai-product-management
- https://www.notion.com/templates/experiment-results
- https://plane.so/blog/definition-of-done-dod-checklist-examples-for-agile-teams
- https://erdembircan.github.io/blog/mermaid-flowcharts-agentic-development
- https://github.com/terrastruct/d2-docs
- https://revision.app/blog/mermaid-architecture-diagram
- https://medium.com/@syedahmershah/i-tested-and-compared-the-6-best-ai-wireframe-generators-with-ui-and-code-export-db9457358e16
- https://github.com/Magdoub/claude-wireframe-skill/
- https://adr.github.io/
- https://www.superblocks.com/blog/lovable-vulnerabilities
- https://www.superblocks.com/blog/vibe-coding-governance
- https://venturebeat.com/security/vibe-coded-apps-shadow-ai-s3-bucket-crisis-ciso-audit-framework
- https://labs.cloudsecurityalliance.org/research/csa-research-note-vibe-coding-ai-governance-gap-20260602-csa/
- https://uxdesignlab.com/insights/designops-2-0-governing-the-ai-delivery-pipeline/
- https://rosenfeldmedia.com/designops-summit/
- https://rosenfeldmedia.com/designing-with-ai/a-deep-dive-into-day-1-of-designing-with-ai-2026/
- https://thenewstack.io/anthropic-claude-design-overhaul/
- https://www.designsystemscollective.com/design-systems-lovable-bolt-v0-and-replit-50a0a197bc35
- https://southleft.substack.com/p/life-after-the-prototype

---

*Research conducted 2 September 2026 via live web search and page fetches. Companion docs: [03 — AI UI Generation](../foundational/03-ai-ui-generation.md), [05 — Motion, IxD & Prototyping](../foundational/05-ai-motion-ixd-prototyping.md), [02 — AI & Design Systems](../foundational/02-ai-design-systems.md), [Construction-File Prototyping](../prototype-construction/README.md), and the [skill picks](../../../skill-resources/skills.md).*
