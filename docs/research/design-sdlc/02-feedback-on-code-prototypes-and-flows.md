# Giving Feedback on User Flows and Prototypes That Are Not in Figma (2026)

**Scope.** This document answers one question: how should a team see, annotate, discuss, and track feedback on prototypes and flows that do not live on a Figma canvas — hosted code prototypes (Vercel/Netlify/Cloudflare previews, Storybook), Claude Design and Claude Code artifacts, Figma Make / v0 / Lovable / Bolt links, generated wireframes (static images), and text-defined flow diagrams (Mermaid, D2, FigJam, Miro). Figma gave reviewers a "see every screen at once, comment on anything" surface; code and hosted prototypes do not, and the review layer has to be reassembled from other parts. Agent-driven review of a running branch (Playwright screenshots, the OneRedOak design-review subagent) is already covered in [skill-resources/subagents-and-commands.md](../../../skill-resources/subagents-and-commands.md) and [skill-resources/hooks.md](../../../skill-resources/hooks.md); this document is about the *human* feedback layer and where AI assists it. It complements section 5.3 of [06 — UX Research, IA & Process](../foundational/06-ai-ux-research-ia-process.md). Every vendor claim was checked against the live page in September 2026; anything not fetched is marked as such. Treat pricing and plan gating as snapshots.

---

## Table of Contents

1. [Feedback surfaces for hosted code prototypes](#1-feedback-surfaces-for-hosted-code-prototypes)
2. [Making flows visible outside Figma](#2-making-flows-visible-outside-figma)
3. [Structured critique formats that work async and in text](#3-structured-critique-formats-that-work-async-and-in-text)
4. [Feedback-to-tracking pipelines](#4-feedback-to-tracking-pipelines)
5. [Reviewing generated wireframes and static mockups](#5-reviewing-generated-wireframes-and-static-mockups)
6. [AI-assisted critique for these artifacts](#6-ai-assisted-critique-for-these-artifacts)
7. [Team practices](#7-team-practices)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Recommendations: a feedback playbook by artifact type](#9-recommendations-a-feedback-playbook-by-artifact-type)
10. [Templates](#10-templates)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. Feedback surfaces for hosted code prototypes

### What it is
The commenting layer that sits on top of a running prototype: platform-native toolbars (Vercel, Netlify), component-level review (Chromatic/Storybook), the AI prototyping tools' own comment modes (Claude Design, Claude Code artifacts, Figma Make, Lovable), and third-party "annotate any URL" overlays (BugHerd, Marker.io, Pastel, Ruttl, Markup.io, Userback, Usersnap).

### Why it matters
A Figma comment is anchored to a frame at a coordinate and visible to everyone at once. A comment on a code prototype has to be anchored to a *DOM element on a route at a viewport in a specific deployment* — and the deployment changes with every push. The surface you pick determines whether feedback is findable a week later, whether it survives the next deploy, and whether it can be turned into a ticket or handed to an agent without retyping.

### Key findings
- **Vercel Comments are the most complete platform-native surface, and they are free.** Comments are "enabled by default on all preview deployments, for all account plans, free of charge"; the only requirement is a Vercel account, and Pro/Enterprise teams can invite external reviewers ([Vercel docs](https://vercel.com/docs/comments)). Reviewers click any element or highlight text; threads sync two-way with Slack; any thread can be converted to a Linear, Jira, or GitHub issue (converting resolves the thread permanently), and the Vercel bot posts an "Add your feedback" link plus an unresolved-comment check on the PR that can be made a required check ([integrations](https://vercel.com/docs/comments/integrations)). Two 2026 additions matter for agent workflows: a `vercel comments` CLI (list/inspect/reply/resolve, `--json`, filtered to the current branch) shipped [20 Aug 2026](https://vercel.com/changelog/manage-vercel-toolbar-comments-from-the-cli) with an explicit "prompt your coding agent" recipe ([CLI reference](https://vercel.com/docs/cli/comments)), and the Vercel MCP server exposes `list_toolbar_threads`, `get_toolbar_thread`, `reply_to_toolbar_thread`, and `change_toolbar_thread_resolve_status` ([MCP tools](https://vercel.com/docs/agent-resources/vercel-mcp/tools)). This closes the gap users had been asking about since January 2026 ([community thread](https://community.vercel.com/t/sync-vercel-preview-deployment-comments-to-github-pr-for-ai-agent-feedback-loops/31663)). Gap: the CLI cannot *create* threads — only the toolbar can.
- **Netlify Drawer is the richest reviewer experience at zero cost.** Reviewers can "take screenshots and add visual or text-based annotations, create screen recordings, and share comments"; Deploy Preview comments post automatically into the PR/MR and vice versa; issues can be opened in GitHub, GitLab, Bitbucket, Jira, Trello, Azure DevOps, Linear, and Shortcut; team owners can invite unlimited reviewers in the free Reviewer role, though reviewers must log in ([Netlify docs](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/)). Branch deploys (no PR) lose the conversation pane.
- **Cloudflare Pages has no in-page commenting.** It posts a preview URL per PR and can gate previews behind Cloudflare Access, nothing more ([Cloudflare docs](https://developers.cloudflare.com/pages/configuration/preview-deployments/)). Pair it with a third-party overlay.
- **Chromatic UI Review is component-level, not page-level.** It builds a changeset of every story snapshot that changed against the base branch, shows side-by-side diffs, threads discussions "attached to the specific snapshot represented by the change," assigns default reviewers, and posts a PR status check ([Chromatic docs](https://www.chromatic.com/docs/review/)). Chromatic's own blog notes "pinned comments aren't available in UI Review yet" ([Chromatic blog](https://www.chromatic.com/blog/comment-on-ui-changes/)). The pricing page as of September 2026 lists UI Review as "Not included" on Free ($0, 5,000 snapshots), Starter ($179/mo), and Pro ($399/mo), with Enterprise as contact-sales ([Chromatic pricing](https://www.chromatic.com/pricing)) — verify before assuming it is available. Storybook Connect links stories to Figma components so designers see live stories in Figma; every plan includes unlimited collaborators ([Figma plugin docs](https://www.chromatic.com/docs/figma-plugin/)).
- **Claude Code artifacts have real comment threads that can wake an agent.** Artifacts are available on Pro/Max/Team/Enterprise; comments require sharing within an organization (Team/Enterprise, Claude Code v2.1.221+). An editor activates a thread with **Send to Claude** or `@claude`; "Claude can reply to or resolve only an activated thread"; from v2.1.228 the publishing session watches the artifact and can auto-reply and auto-edit (capped at 60 sent comments per hour). Publicly shared artifacts cannot take comments at all ([Claude Code artifacts docs](https://code.claude.com/docs/en/artifacts)). Each publish is a version and viewers can be pinned to a version — useful for keeping a review stable while work continues.
- **Claude Design** (Anthropic Labs, 17 Apr 2026) ships org-scoped sharing with view / comment / edit access, "inline comments on specific elements," adjustment knobs, export to HTML/PDF/PPTX/Canva, and a bundle handoff to Claude Code ([Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)). The help center documents a known bug — "Inline comments occasionally don't appear on the page" — with the workaround of pasting feedback into chat ([Claude Design help](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)).
- **Figma Make comments are element-anchored with a screenshot of the element's state**, sorted into "Current version" and "Other versions"; only full seats on paid plans can comment, only the latest version accepts comments, you cannot interact with the app while in comment mode, and public-web viewers of a published app cannot comment ([Figma help](https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make)).
- **Lovable's preview toolbar** has four modes (select, edit text, draw annotation, add comment); comments "stay attached to the element you pinned them to," support threads, and a thread can be sent to the agent as a task (billed as chat usage) ([Lovable docs](https://docs.lovable.dev/features/preview-toolbar)). **v0** offers private / team / unlisted / public sharing and a "view and duplicate" workflow but documents no commenting ([v0 docs](https://v0.app/docs/sharing)). **Bolt** documents share-vs-publish and multiplayer editing, and no commenting ([Bolt docs](https://support.bolt.new/building/using-bolt/collaborate)). For v0 and Bolt, deploy the output and comment on the deployment instead.
- **Third-party overlays** fill the gaps (any URL, guests without accounts, issue-tracker sync):

| Tool | Anchoring | Guest reviewers | Issue export | Pricing (Sep 2026, verified) |
|---|---|---|---|---|
| [BugHerd](https://bugherd.com/pricing) | Element-pinned, with metadata | Premium plan and up | GitHub on all paid; Jira on Premium ($150/mo) | Standard $50 / Studio $80 / Premium $150 per month |
| [Marker.io](https://marker.io/pricing) | Screenshot + annotation, page/browser/OS metadata | Yes | Jira, GitHub, GitLab, Linear on Team; GitHub sync is one-way ([help](https://help.marker.io/en/articles/6442000-github-integration)) | Starter $39 / Team $149 per month (annual) |
| [Pastel](https://usepastel.com/) | Element-pinned on live sites, images, PDFs, video | No login needed | Via project-management integrations; MCP via Zapier/viaSocket (search-verified only) | 14-day trial; pricing page returned 404 |
| [Ruttl](https://ruttl.com/pricing) | Pinned comments, reviewers can propose CSS edits | Yes | Slack, Trello, Asana, Jira; ClickUp on paid | Free (1 project, 5 pages, 10 comments) / Pro $18 per user per month |
| [Markup.io](https://www.markup.io/pricing) | Live sites, images, PDFs, video | Yes | Not verified | Pro $79–129/mo, Business $499–799/mo, no free plan |
| [Userback](https://userback.io/pricing) | Widget, screenshot, session replay | Yes | Jira, ClickUp, Asana; MCP connectors for Claude/Cursor | Free (2 seats) / Team $29 / Business $79 per month (annual) |
| [Usersnap](https://usersnap.com/pricing) | Widget, screenshot, console logs | Yes | Jira, Linear, GitHub, Azure DevOps | 20 free items; Starter → Enterprise tiers (prices not on page) |

- **Loom remains the default for interaction and flow feedback** because a screen recording captures the *sequence*, which no element-pinned comment does. Loom supports time-stamped comments and video replies, and AI titles/summaries/chapters ([Loom for design](https://www.loom.com/use-case/design)).

### Open questions
- None of the platform surfaces anchor a comment to *a state* (open menu, error, mid-animation) — Figma Make's element screenshot is the closest. Who solves state-anchored comments?
- Vercel comments resolve on issue conversion and cannot be reopened; is "convert late" an acceptable rule, or does it push discussion out of the thread prematurely?
- Chromatic's UI Review gating changed; does component-level review still make sense for teams whose prototypes are pages rather than stories?

---

## 2. Making flows visible outside Figma

### What it is
Techniques for reconstructing the "every screen at once" overview from a running app: screenshot contact sheets, Storybook stories per state, capturing code screens back into Figma, and text-defined flow diagrams that live in the repo.

### Why it matters
Reviewers cannot critique a flow they can only experience one screen at a time. The overview is where sequencing, state coverage, and consistency problems show up; without it, feedback collapses into "the screen I happened to land on."

### Key findings
- **Capture code back into Figma — now official.** Figma's Chrome extension turns a page or element into editable layers, binds existing variables, and works from a dev-server URL; it is "available on all plans" ([Figma help](https://help.figma.com/hc/en-us/articles/40826832449303-Turn-webpages-into-editable-design-layers)). The Claude Code → Figma integration (Feb 2026) captures a live UI from "production, staging, or localhost" and, "for flows, you can even capture multiple screens in a single session, preserving sequence and context," explicitly so teammates can "annotate what's working, call out what's unclear" ([Figma blog](https://www.figma.com/blog/introducing-claude-code-to-figma/)). This is the fastest route to a Figma-style flow board for a code prototype. html.to.design remains the bulk option (paste a URL list; PRO only) ([docs](https://html.to.design/docs/bulk-import-url-list/)) and also accepts pushes from Claude via MCP ([blog](https://html.to.design/blog/from-claude-to-figma-via-mcp/)).
- **Screenshot contact sheets from a route list.** [shot-scraper multi](https://shot-scraper.datasette.io/en/stable/multi.html) takes a YAML list of URLs with per-shot `selector`, `width`, `height`, `wait`, and `javascript` (to open a state before capture) and can boot a local server for the run; Playwright's own API does the same in code ([Playwright screenshots](https://playwright.dev/docs/screenshots)). Tile the output with ImageMagick `montage -tile 4x -label` into one labeled sheet ([ImageMagick](https://imagemagick.org/montage/)). The [app-screenshots](https://github.com/alexanderop/app-screenshots) Claude Code skill (MIT) discovers pages via navigation and produces annotated screenshots plus a markdown doc, built on Vercel's [agent-browser](https://github.com/vercel-labs/agent-browser) (41.8k stars, Apache-2.0), which itself supports numbered-ref annotated screenshots.
- **Storybook is the state overview for components.** One story per state is the convention; [storycap](https://github.com/reg-viz/storycap) (MIT, 755 stars, Storybook 7/8) screenshots every story, and Storybook's design integrations (Designs addon, Storybook Connect, Zeplin) let reviewers "compare designs to stories" per state ([Storybook docs](https://storybook.js.org/docs/sharing/design-integrations)).
- **Text diagrams in the repo are reviewable in the PR diff.** Mermaid's user-journey syntax scores each step 1–5 per actor ([Mermaid docs](https://mermaid.js.org/syntax/userJourney.html)); because it is text, flow changes are reviewed like code. For canvas tools: FigJam AI generates flow charts on paid plans ([Figma help](https://help.figma.com/hc/en-us/articles/18706554628119-Make-boards-and-diagrams-with-FigJam-AI)); Miro AI generates flowcharts/ERD/UML on a credit system (10 free credits/month, 1 per diagram) with board comments ([Miro](https://miro.com/ai/diagram-ai/)); Whimsical AI generates flowcharts and wireframes and ships an MCP server for Claude/Cursor ([Whimsical](https://whimsical.com/ai)). tldraw's "Make Real" goes the other direction — wireframe sketch to working HTML — and is the lowest-friction way to *get* a prototype from a whiteboard (search-verified only).

### Open questions
- Screenshot sheets are static: which states get captured is a human decision, so coverage gaps hide. Can a route map plus a state enumeration (from Storybook or a test plan) become the checklist that drives capture?
- Captured-to-Figma flows are copies. Who is allowed to edit them, and how is "annotated in Figma" fed back to the code owner?

---

## 3. Structured critique formats that work async and in text

### What it is
Formats that make written feedback locatable, triaged, and actionable when there is no canvas: critique-session protocols (GDS, NN/g, Loom), labeled-comment conventions (Conventional Comments, Google's "Nit:"), triage vocabularies, and PR/review templates.

### Why it matters
On a canvas, a pin *is* the location and the reviewer's presence *is* the context. In text, both must be written down. Teams that skip this get feedback that cannot be found, ranked, or acted on — the exact failure UXBench measures in LLM critiques (section 6).

### Key findings
- **Presenters state the ask; critics anchor to goals.** GDS: presenters "specify feedback needs upfront," "always have something to point to," and explain rejected options; "I don't like it" and "that will never work" are out of bounds; a note-taker records because the presenter facilitates ([GDS design notes](https://designnotes.blog.gov.uk/2017/11/27/using-design-crits-to-improve-collaboration/)). Their cross-government remote crits run 90 minutes in three 30-minute blocks (feedback practice, context, feedback), with Trello cards that "help presenters define their work and the type of feedback they want" ([GDS 2021](https://designnotes.blog.gov.uk/2021/05/12/take-part-in-get-feedback-weekly-remote-design-crits)). NN/g's cheat sheet: "each question or feedback should be tied back to a persona, scenario, use case or goal," "direct the feedback towards the work, not the designer," and attach designs to the agenda so people review beforehand ([NN/g cheat sheet](https://media.nngroup.com/media/articles/attachments/NNg_UXCritiqueCheatsheet.pdf)); after the session, sort feedback into "To do," "To persuade," and "To clarify" ([NN/g](https://www.nngroup.com/articles/derailed-design-critiques/)).
- **Labeled comments are the text equivalent of a pin color.** [Conventional Comments](https://conventionalcomments.org/) — `<label> [decorations]: <subject>` with `praise / nitpick / suggestion / issue / question / thought / chore / note` and `(blocking) / (non-blocking) / (if-minor)` — is machine-parseable and "the tone dramatically changes." Google's reviewer guide uses `Nit:`, `Optional`, `FYI` and the rule to point out problems and let the author decide ([Google eng-practices](https://google.github.io/eng-practices/review/reviewer/comments.html)). The OneRedOak `[Blocker] / [High-Priority] / [Medium-Priority] / [Nitpick]` vocabulary and its "problems and their impact, not technical solutions" rule ([subagents-and-commands.md](../../../skill-resources/subagents-and-commands.md)) is the same idea for design.
- **"I like / I wish / What if"** (Stanford d.school) still works async as three columns; "positivity breeds openness and emotional safety" ([Atomic Object](https://spin.atomicobject.com/i-like-i-wish-what-if/)). Use it for early-stage direction, not for QA-grade review.
- **Async-by-default recipes.** Microsoft's engineering playbook runs design review as a PR on markdown docs with named reviewers and a hard rule: "after two round trips of question/response, resort to synchronous communication" ([Microsoft playbook](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/async-design-reviews/)). Loom's design team posts a video request in a dedicated Slack channel that gives context, stays focused, and "specifically state[s] what type of feedback you're looking for," with video replies that "eliminat[e] the need for annotations" ([Loom/Atlassian](https://www.atlassian.com/blog/loom/asynchronous-design-critique)). Atlassian's design-review guidance: share "design artifacts, prototypes, target user research, and requirements" beforehand and tell reviewers *how* to respond (Figma comments, Slack thread, video) ([Atlassian](https://www.atlassian.com/blog/loom/design-review)); its Confluence template captures requirements, options with screenshots, and open questions ([template](https://www.atlassian.com/software/confluence/templates/design-review)).
- **Definition of done for design review.** GitLab's UX team, after finding "incomplete designs being passed to developers," agreed to formalize critique with better planning, external participants "on a case-by-case basis," and a definition-of-done checklist, under the mantra "Critique the work, not the person" ([GitLab issue](https://gitlab.com/gitlab-com/gitlab-ux/create-ux/design-critique-sessions/-/issues/1)). Design-QA guides converge on the same checklist — typography, color, spacing, every interactive state, responsive breakpoints, a11y — with issues logged as screenshot + selector + expected value rather than "the button looks wrong" ([OverlayQA](https://overlayqa.com/blog/what-is-design-qa/)).
- **Commenting on flows vs screens vs interactions vs copy** needs different anchors: a flow comment names a *step sequence* (`Checkout › Address › Payment`, or a Mermaid node ID); a screen comment names a route + viewport; an interaction comment needs a timestamp in a recording or a state description ("after the second tab is selected"); a copy comment quotes the string. The critique template in section 10 forces the anchor.

### Open questions
- Nobody has published a critique format designed for *prototypes that are also the implementation* (Vercel-style), where "wish" feedback can be a PR. Does the blocking/non-blocking decoration transfer cleanly to design intent?
- How much structure before reviewers stop reviewing? GDS and NN/g both rely on a facilitator; async text has none.

---

## 4. Feedback-to-tracking pipelines

### What it is
Turning comments into tracked work (Linear, Jira, GitHub Issues) and, increasingly, into agent tasks — while keeping the rationale attached to the artifact it came from.

### Why it matters
A comment on a preview deployment disappears with the deployment; a Loom comment lives in Loom. If feedback does not land in the tracker with its screenshot and link back, the "why" is lost, and agents cannot act on it.

### Key findings
- **Native converters.** Vercel: any thread → Linear / Jira / GitHub issue, carrying "all previous discussion and images, and a link back to the comment thread" ([Vercel](https://vercel.com/docs/comments/integrations); [Linear](https://linear.app/integrations/vercel)). Netlify: Drawer → GitHub, GitLab, Jira, Linear, Shortcut, Trello, Azure DevOps ([Netlify](https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/)). BugHerd → Jira on Premium; Marker.io → GitHub/Jira/Linear on Team, one-way from Marker.io ([Marker.io help](https://help.marker.io/en/articles/6442000-github-integration)).
- **Agents consuming review comments.** The Claude Code GitHub Action runs when `@claude` appears "in an issue or pull request comment, in a pull request review," and can implement changes and push commits ([Claude Code docs](https://code.claude.com/docs/en/github-actions)); a community skill fetches unresolved review threads via GraphQL, fixes, replies "WHAT was changed and WHY," and resolves threads ([gist](https://gist.github.com/corylanou/a381082d38b693792eed659bcdab09d0)). Vercel's `vercel comments --json` and MCP toolbar tools make preview comments a first-class agent input ([CLI](https://vercel.com/docs/cli/comments)); Vercel's own changelog suggests the prompt "process comments using the `vercel comments` command" ([changelog](https://vercel.com/changelog/manage-vercel-toolbar-comments-from-the-cli)). Claude Code artifact threads sent to Claude reach the publishing session live ([artifacts docs](https://code.claude.com/docs/en/artifacts)); Lovable comment threads become agent tasks ([Lovable](https://docs.lovable.dev/features/preview-toolbar)); Userback advertises MCP connectors for Claude/Cursor ([Userback](https://userback.io/pricing)).
- **Keeping rationale attached.** The pattern that works: the issue body carries the screenshot, the anchor (route/selector/timestamp), and the link back to the thread; the PR description carries the review outcome; a Mermaid/D2 diagram in the repo carries the flow decision. Vercel's PR bot tracking "how many comments have been resolved" and its optional required check are the cheapest enforcement.

### Open questions
- Screenshots in converted issues are the only durable record of a state; who ensures the *fix* is verified against the same state?
- When an agent auto-resolves a thread, who confirms the human reviewer's intent was met? Section 7's "design QA" pass is the current answer.

---

## 5. Reviewing generated wireframes and static mockups

### What it is
Critiquing images — Claude Design boards, Relume / UX Pilot / Uizard output, screenshots — and feeding annotated images back to an agent.

### Why it matters
Static output is where most AI design tools still land, and images cannot be clicked. The "red-pen" loop (mark the image, hand it back) is the fastest way to steer generation, and vision models now read the marks.

### Key findings
- **Pointing beats describing.** Benji Taylor's essay and tool: describing "the button hover feels sluggish" is ambiguous; clicking the element and capturing selector, position, and context "feels far more collaborative," and short notes ("slow this down") work best ([benji.org](https://benji.org/annotating)). [Agentation](https://github.com/benjitaylor/agentation) (React 18+, 4.6k stars, PolyForm Shield) overlays localhost, pauses animations, and emits markdown with selectors for Claude Code/Cursor. [Casso](https://usecasso.app/) ($29 one-time) draws numbered boxes on any screen and pastes image + prompt into the terminal; [MarkuprPlus](https://github.com/hashfunction/MarkuprPlus) (MIT) records screen + narration and emits "one annotated screenshot per mark" as markdown, with an MCP server for Claude Code/Cursor.
- **Annotate in a canvas, then export.** For image mockups, FigJam/Miro/Pastel/Markup.io are the annotation surfaces (Markup.io and Pastel both take images, PDFs, and video). The Figma Chrome extension and Claude Code → Figma capture (section 2) let a static-looking code screen be annotated as layers rather than pixels.
- **AI wireframe tools have thin review surfaces.** Relume's site documents export to Figma, Webflow, and React but no commenting ([Relume](https://www.relume.ai/)); UX Pilot's and Uizard's homepages document neither sharing nor commenting (fetched; not documented). Treat their output as images and review in FigJam/Figma or after export.
- **Predictive attention as a first pass.** Attention Insight claims heatmaps "up to 96% accurate," accepts images, URLs, and Figma via plugin, and costs €119/month ([Attention Insight](https://attentioninsight.com/)). VisualEyes/Loceye were acquired by Neurons in June 2022 and folded into Neurons AI ([Neurons](https://www.neuronsinc.com/insights/neurons-visualeyes-loceye)). Useful for hierarchy checks on landing pages; not a substitute for flow critique.

### Open questions
- Annotated-screenshot markdown is agent-agnostic today; will it converge on a schema (selector, bbox, note, severity) that both trackers and agents accept?
- How reliably do current VLMs read hand-drawn arrows versus numbered boxes? Casso's numbering is a hedge worth copying.

---

## 6. AI-assisted critique for these artifacts

### What it is
Running an LLM/VLM critique before human review — on screenshots, recordings, or the live prototype — and knowing what it is good for.

### Why it matters
Cheap critique raises the floor (a11y, consistency, missing states) so humans spend their time on judgment. The evidence says it also adds noise unless the output is localized and severity-checked.

### Key findings
- **Actionability is now measured by whether a repair agent can act.** UXBench (arXiv 2606.16262) uses runnable web fixtures across ten surface families, forces "coverage-gated browser exploration" before critique, scores seven rubric dimensions, and defines quality as "whether a fixed downstream repair agent can improve the interface based on the critique"; eight frontier models "differ meaningfully in report actionability" and "trade leadership across surface categories" ([arXiv](https://arxiv.org/abs/2606.16262)). Practical reading: pick the model per surface type, and require evidence gathering before critique. (Note: the [mengze-hong/UXBench](https://github.com/mengze-hong/UXBench) repo is a *different* benchmark on AI-assistant UX; the critique benchmark's code release was not located.)
- **Detection is decent; severity is not.** GPT-4o applying Nielsen's heuristics to 30 sites showed "moderate consistency" for issue detection (Cohen's κ 0.50, 84% exact agreement) but weak severity judgments (56% exact agreement, Krippendorff's α near zero) — "requires human oversight in practice" ([arXiv 2512.04262](https://arxiv.org/abs/2512.04262)). Video-based MLLM evaluation of task recordings produced recommendations rated clear (4.2–4.3/5) with 33% of participants discovering issues they had missed, but failed on specificity ("didn't identify which specific UI elements") and context ([arXiv 2604.25420](https://arxiv.org/html/2604.25420)). Expert evaluation of LLM-designed GUIs found structured layouts but weak accessibility and interaction handling ([arXiv 2601.22759](https://arxiv.org/abs/2601.22759)).
- **What raises quality: examples, stages, and roles.** UICrit's 3,059 designer critiques on 983 mobile UIs yielded "a 55% performance gain in LLM-generated UI feedback" via few-shot and visual prompting ([arXiv 2407.08850](https://arxiv.org/abs/2407.08850)). Criticmate (CHI 2026) splits single-screen critique into editable Perception → Comprehension → Projection stages so humans correct the model mid-pipeline ([ACM](https://dl.acm.org/doi/10.1145/3772318.3790929); abstract via search, page returned 403). CritiqueCrew found that orchestrating UX / PM / engineer roles "rather than a unified model" is what builds trust, across 48 participants ([arXiv 2602.01796](https://arxiv.org/abs/2602.01796)).
- **Implication for the pre-review pass.** Run the critique against the *live* prototype (Playwright/agent-browser), not a screenshot; make it emit the section-10 response format (triage + anchor + problem + impact); treat its severities as proposals; and use it for coverage (states, a11y, copy consistency), not taste. The repo's existing `/visual-critique:critique-screen` command and the OneRedOak subagent already fit this shape ([subagents-and-commands.md](../../../skill-resources/subagents-and-commands.md)).

### Open questions
- Is there a public benchmark for *flow-level* critique (sequence, dead ends, state coverage) rather than single-screen heuristics? None was found.
- Does pre-review AI critique anchor human reviewers (the "first comment is loudest" effect) and reduce their independent findings?

---

## 7. Team practices

### What it is
Published accounts of how design-engineering-first teams review code prototypes.

### Why it matters
The tools above are only as good as the ritual around them. The published accounts are thinner than the tool marketing suggests — what exists is listed; what could not be found is named.

### Key findings
- **Vercel** — design engineers share "Slack messages, screenshots, videos, preview links, and Zoom calls"; "animations, keyboard controls, and touch are better implemented in code" than rebuilt from Figma, so the prototype is the implementation and the preview link is the review surface ([Vercel](https://vercel.com/blog/design-engineering-at-vercel)).
- **Cursor** — Head of Design Ryo Lu: they prototype in Cursor because it "lets us really interact with the live states of the app. It just feels a lot more real than some pictures in Figma"; roles are "really muddy" and "we use the agent to tie everything" ([Roger Wong's writeup](https://rogerwong.me/2025/12/full-tutorial-design-to-code-with-cursors-head-of-design-ryo-lu)). Cursor's designer guide has designers open small PRs that "engineers review" ([Cursor](https://cursor.com/for/designers)).
- **Linear** — writes the spec first, keeps an "Explore designs" issue, and alternates "between reviewing the overall design and gathering input on specific details," with engineers involved from the spec onward ([Linear Method](https://linear.app/method/manage-design-projects)).
- **Raycast** — no mandatory code review; a nightly internal build "is automatically installed for the entire team" so feedback arrives from use within 24 hours (engineering account, 2021) ([Raycast](https://www.raycast.com/blog/no-code-reviews-by-default)). A design-crit account was not found.
- **Family / Benji Taylor** — the Agentation essay is the clearest published account of a design-engineer feedback loop on localhost ([benji.org](https://benji.org/annotating)).
- **Loom** — dedicated Slack channel, video request stating the feedback wanted, video replies ([Loom](https://www.atlassian.com/blog/loom/asynchronous-design-critique)).
- **GDS / Home Office** — weekly cross-government crits with roles and a code of conduct; the Home Office's first remote crit found two video rooms of 8 designers + 3 facilitators, 30-minute slots, and a single communication channel worked best ([Home Office](https://hodigital.blog.gov.uk/2020/06/05/running-our-first-remote-design-crit/)).
- **Not found (Sep 2026):** a published account of Anthropic's or Shopify's internal crit on code prototypes. Anthropic's public material is product documentation (artifacts, Claude Design); GitLab's handbook pages on design review returned navigation only when fetched, so only the critique-process issue above is cited.

### Open questions
- Every published account is from a team where designers write code. What changes when the reviewer cannot read the diff?
- Raycast-style "ship nightly, feedback from use" is a review model with no explicit critique; does it scale to product areas the team does not use daily?

---

## 8. Cross-cutting themes

1. **The anchor is the whole problem.** Figma gave you a coordinate for free. Outside it, every usable comment needs route + viewport + state (or a timestamp), and every tool in section 1 is differentiated by how much of that it captures automatically (Figma Make's element screenshot, Netlify's recording, Agentation's selector).
2. **Comments are becoming agent inputs.** Vercel (CLI + MCP, Aug 2026), Claude Code artifacts (Send to Claude), Lovable, and Userback all expose threads to agents. The reviewer's sentence is now a task spec; the section-3 discipline (problem + impact, not solution) matters more, not less.
3. **Overview is reconstructed, not given.** Screenshot sheets, storycap, and code-to-Figma capture rebuild the canvas; the state list that drives capture is the hidden artifact worth owning.
4. **AI critique is a coverage tool.** Detection is moderate and consistent; severity and localization are weak. Use it before humans, in the same format humans use, and never let it set triage alone.
5. **Free tiers are generous where it counts.** Vercel comments and Netlify Drawer cost nothing; the paid overlays earn their keep only for external guests, images/PDFs, or Jira-heavy teams.
6. **Rationale lives in the tracker, not the surface.** Preview comments die with the deployment; the conversion step (with screenshot and link-back) is the durable record.

---

## 9. Recommendations: a feedback playbook by artifact type

| Artifact | Best viewing surface | Best commenting surface | Critique format | Where feedback is tracked |
|---|---|---|---|---|
| Hosted code prototype (Vercel) | Preview URL + a shot-scraper/montage contact sheet of every route and state, linked in the PR | Vercel Toolbar comments (element/text anchored, free) — external guests on Pro+ | Section-10 response template with Conventional-Comment labels; interaction feedback as a Loom with timestamps | Convert threads to Linear/GitHub once discussion is done; Vercel unresolved-comment PR check made required; agent reads via `vercel comments --json` |
| Hosted code prototype (Netlify / Cloudflare) | Preview URL + contact sheet | Netlify Drawer (screenshots, recordings, PR sync); on Cloudflare, add Marker.io or Ruttl | Same as above | Netlify Drawer → Linear/Jira/GitHub; Marker.io → tracker (one-way) |
| Repo branch preview with Storybook | Storybook per-state stories; storycap sheet in CI artifacts | Chromatic UI Review if the plan includes it; otherwise PR review comments on the storycap images | Blocker / High / Medium / Nit with story ID as anchor | PR review threads; GitHub Issues; `@claude` on the thread for fixes |
| Claude Code artifact | The artifact page, pinned to a version for the review | Artifact comment threads (org-shared, Team/Enterprise); **Send to Claude** for changes the author wants automated | Short threads; one problem per thread so resolve/reopen is meaningful | Threads on the artifact; anything needing engineering copied into the tracker with the artifact URL |
| Claude Design board | Claude Design share link (view/comment) | Inline element comments; fall back to chat paste if pins fail | I like / I wish / What if for direction; section-10 template once converging | Export bundle to Claude Code; decisions summarized in the project's design doc |
| Figma Make / v0 / Lovable / Bolt link | Figma Make preview; for v0 and Bolt, deploy to Vercel/Netlify and use that URL | Figma Make comments (full seats, latest version); Lovable pinned comments; Vercel/Netlify comments for v0/Bolt deploys | Section-10 template; note the version in every comment | Figma Make "Other versions" filter; Vercel/Netlify conversion to tracker |
| Static generated mockup (image / Relume / UX Pilot / Uizard) | FigJam or Figma frame; Attention Insight for hierarchy first pass | FigJam/Figma comments; Pastel or Markup.io for outside guests; Casso/Agentation red-pen to hand back to the agent | I like / I wish / What if early; heuristic checklist later | Annotated image attached to the tracker issue; agent-bound annotations kept as markdown in the repo |
| Flow diagram (Mermaid / D2 in repo; FigJam / Miro / Whimsical) | Rendered diagram in the PR (Mermaid/D2) or the board | PR review comments on the diagram source lines; board comments for FigJam/Miro | Anchor to node IDs / step names; question and issue labels | The PR itself; board decisions summarized back into the repo diagram |

---

## 10. Templates

### (a) Prototype review request

```markdown
## Review request: <feature / flow name>
**Link:** <preview URL or artifact URL> (version/commit: <sha or artifact version>)
**Overview sheet:** <link to contact sheet / Figma capture / storycap>
**Flows to test (in order):**
1. <Flow A>: start at <route>, do <steps>, expect <outcome>
2. <Flow B>: …
**States covered:** default · loading · empty · error · <n> breakpoints · keyboard/screen reader
**States NOT covered (known gaps):** <list>
**Feedback wanted:** <e.g., does the step order make sense? is the error copy clear?>
**Feedback NOT wanted right now:** <e.g., visual polish, colors>
**How to comment:** <Vercel toolbar / artifact threads / Loom> — one problem per thread, use the response format
**Deadline / next sync:** <date>; after two round trips we switch to a call
```

### (b) Structured critique response

```markdown
**[Blocker | High | Medium | Nit]** <label: issue | suggestion | question | praise> <(blocking | non-blocking)>
**Where:** <route or screen> · <viewport> · <state / step / timestamp> · <selector or element name>
**What I observed:** <one or two sentences, factual>
**Why it matters (impact):** <who is affected, which goal/persona/heuristic, how often>
**Evidence:** <screenshot / recording link / console output>
**Not proposing a solution** — unless asked; if I have one: <optional, clearly marked>
```

---

## 11. Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| Vercel `comments` CLI + MCP toolbar tools | https://vercel.com/docs/cli/comments · https://vercel.com/docs/agent-resources/vercel-mcp/tools | Read/reply/resolve preview comments from an agent; JSON output | fetched OK | mcp-servers; hook idea: PreToolUse on `gh pr create` that runs `vercel comments --json` and injects unresolved threads |
| Netlify Drawer | https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/ | Annotated screenshots, recordings, PR-synced comments, issue export; free reviewers | fetched OK | proposed: review & feedback tooling |
| Claude Code artifacts (comments) | https://code.claude.com/docs/en/artifacts | Comment threads that wake the publishing session; version pinning | fetched OK | proposed: review & feedback tooling |
| Agentation | https://github.com/benjitaylor/agentation | Click-to-annotate localhost → markdown with selectors for agents (React) | fetched OK | proposed: review & feedback tooling |
| MarkuprPlus | https://github.com/hashfunction/MarkuprPlus | Narrated screen recording → one annotated screenshot per mark; MCP server | fetched OK | mcp-servers |
| Casso | https://usecasso.app/ | Numbered screen annotations pasted into Claude Code ($29 one-time) | fetched OK | proposed: review & feedback tooling |
| app-screenshots skill | https://github.com/alexanderop/app-screenshots | Claude Code skill: discover pages, annotated screenshots, markdown doc (agent-browser) | fetched OK | skills |
| agent-browser | https://github.com/vercel-labs/agent-browser | Agent-oriented browser CLI with annotated screenshots, axe audits | fetched OK | mcp-servers / skills dependency |
| shot-scraper multi | https://shot-scraper.datasette.io/en/stable/multi.html | YAML-driven multi-URL/selector screenshots with local-server boot | fetched OK | hooks (contact-sheet-on-PR recipe with ImageMagick montage) |
| storycap | https://github.com/reg-viz/storycap | Screenshot every Storybook story | fetched OK | hooks |
| Figma Chrome extension (code → layers) | https://help.figma.com/hc/en-us/articles/40826832449303-Turn-webpages-into-editable-design-layers | Capture running UI into editable Figma layers | fetched OK | proposed: review & feedback tooling |
| Conventional Comments | https://conventionalcomments.org/ | Labeled, parseable review-comment format | fetched OK | rules (add to CLAUDE.md for agent-written critiques) |
| NN/g UX Critique Cheat Sheet | https://media.nngroup.com/media/articles/attachments/NNg_UXCritiqueCheatsheet.pdf | One-page crit protocol | fetched OK | proposed: templates |
| GDS design crit guidance | https://designnotes.blog.gov.uk/2017/11/27/using-design-crits-to-improve-collaboration/ | Presenter/critic rules | fetched OK | proposed: templates |
| Microsoft async design reviews | https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/async-design-reviews/ | PR-based design review with the two-round-trip rule | fetched OK | proposed: templates |
| Address-PR-review-comments skill | https://gist.github.com/corylanou/a381082d38b693792eed659bcdab09d0 | Claude Code skill: fetch threads, fix, reply, resolve | fetched OK | subagents-and-commands |
| Claude Code GitHub Action | https://code.claude.com/docs/en/github-actions | `@claude` on PR review comments | fetched OK | subagents-and-commands |
| UXBench (critique actionability) | https://arxiv.org/abs/2606.16262 | Repair-lift benchmark; use its rubric shape for critique prompts | fetched OK | rules / skills reference |
| Section-10 templates (this doc) | — | Review request + critique response | authored | proposed: templates |

---

## 12. Sources

- https://vercel.com/docs/comments
- https://vercel.com/docs/comments/integrations
- https://vercel.com/docs/cli/comments
- https://vercel.com/changelog/manage-vercel-toolbar-comments-from-the-cli
- https://vercel.com/docs/agent-resources/vercel-mcp/tools
- https://community.vercel.com/t/sync-vercel-preview-deployment-comments-to-github-pr-for-ai-agent-feedback-loops/31663
- https://linear.app/integrations/vercel
- https://vercel.com/blog/design-engineering-at-vercel
- https://docs.netlify.com/deploy/review-deploys/netlify-drawer-for-feedback/overview/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://www.chromatic.com/docs/review/
- https://www.chromatic.com/blog/comment-on-ui-changes/
- https://www.chromatic.com/pricing
- https://www.chromatic.com/docs/figma-plugin/
- https://storybook.js.org/docs/sharing/design-integrations
- https://github.com/reg-viz/storycap
- https://code.claude.com/docs/en/artifacts
- https://code.claude.com/docs/en/github-actions
- https://www.anthropic.com/news/claude-design-anthropic-labs
- https://support.claude.com/en/articles/14604416-get-started-with-claude-design
- https://help.figma.com/hc/en-us/articles/38701587731735-Add-comments-in-Figma-Make
- https://help.figma.com/hc/en-us/articles/40826832449303-Turn-webpages-into-editable-design-layers
- https://www.figma.com/blog/introducing-claude-code-to-figma/
- https://help.figma.com/hc/en-us/articles/18706554628119-Make-boards-and-diagrams-with-FigJam-AI
- https://docs.lovable.dev/features/preview-toolbar
- https://v0.app/docs/sharing
- https://support.bolt.new/building/using-bolt/collaborate
- https://bugherd.com/pricing
- https://marker.io/pricing
- https://help.marker.io/en/articles/6442000-github-integration
- https://usepastel.com/
- https://ruttl.com/pricing
- https://www.markup.io/pricing
- https://userback.io/pricing
- https://usersnap.com/pricing
- https://www.loom.com/use-case/design
- https://www.atlassian.com/blog/loom/asynchronous-design-critique
- https://www.atlassian.com/blog/loom/design-review
- https://www.atlassian.com/software/confluence/templates/design-review
- https://html.to.design/docs/bulk-import-url-list/
- https://html.to.design/blog/from-claude-to-figma-via-mcp/
- https://shot-scraper.datasette.io/en/stable/multi.html
- https://playwright.dev/docs/screenshots
- https://imagemagick.org/montage/
- https://github.com/alexanderop/app-screenshots
- https://github.com/vercel-labs/agent-browser
- https://mermaid.js.org/syntax/userJourney.html
- https://miro.com/ai/diagram-ai/
- https://whimsical.com/ai
- https://designnotes.blog.gov.uk/2017/11/27/using-design-crits-to-improve-collaboration/
- https://designnotes.blog.gov.uk/2021/05/12/take-part-in-get-feedback-weekly-remote-design-crits
- https://hodigital.blog.gov.uk/2020/06/05/running-our-first-remote-design-crit/
- https://media.nngroup.com/media/articles/attachments/NNg_UXCritiqueCheatsheet.pdf
- https://www.nngroup.com/articles/derailed-design-critiques/
- https://conventionalcomments.org/
- https://google.github.io/eng-practices/review/reviewer/comments.html
- https://spin.atomicobject.com/i-like-i-wish-what-if/
- https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/recipes/async-design-reviews/
- https://gitlab.com/gitlab-com/gitlab-ux/create-ux/design-critique-sessions/-/issues/1
- https://overlayqa.com/blog/what-is-design-qa/
- https://gist.github.com/corylanou/a381082d38b693792eed659bcdab09d0
- https://benji.org/annotating
- https://github.com/benjitaylor/agentation
- https://usecasso.app/
- https://github.com/hashfunction/MarkuprPlus
- https://www.relume.ai/
- https://attentioninsight.com/
- https://www.neuronsinc.com/insights/neurons-visualeyes-loceye
- https://arxiv.org/abs/2606.16262
- https://github.com/mengze-hong/UXBench
- https://arxiv.org/abs/2512.04262
- https://arxiv.org/html/2604.25420
- https://arxiv.org/abs/2601.22759
- https://arxiv.org/abs/2407.08850
- https://dl.acm.org/doi/10.1145/3772318.3790929
- https://arxiv.org/abs/2602.01796
- https://rogerwong.me/2025/12/full-tutorial-design-to-code-with-cursors-head-of-design-ryo-lu
- https://cursor.com/for/designers
- https://linear.app/method/manage-design-projects
- https://www.raycast.com/blog/no-code-reviews-by-default

*Research conducted September 2026 via live web search and page fetches. Not fetched or only partially verified: Criticmate (ACM returned 403), Miro help center (403), GitLab handbook design-review pages (navigation only), Pastel pricing (404), UX Pilot and Uizard commenting features (homepages lacked documentation), tldraw Make Real (search only), Pastel MCP (search only).*
