# Source of Truth: Figma vs. Code — How Teams Handle the Back-and-Forth, and Where the Field Is Leaning

**Scope:** This document answers a process question, not a tooling question: *when some prototypes live in Figma, some live in code, and code is increasingly "the truth," how do teams keep the two coherent — and which way is the field moving?* It is written for a design leader hardening a software development lifecycle so that Figma files, code prototypes, AI-generated mockups, and production code stay consistent. The tooling landscape (Figma MCP read/write, Code Connect, html.to.design, story.to.design, Pencil `.pen`) is already catalogued in [03 — AI UI Generation §2–3](../foundational/03-ai-ui-generation.md), [02 — AI & Design Systems §1, 3, 5](../foundational/02-ai-design-systems.md), and [06 — UX Research, IA & Process §5.4](../foundational/06-ai-ux-research-ia-process.md); the round-trip engineering argument is in [prototype-construction/05 §4](../prototype-construction/05-surgical-editing-iteration.md). This doc sits on top of those: what teams actually do, what they recommend, and what the survey and case-study evidence says as of September 2026. Every link was fetched live during research unless marked otherwise.

---

## Table of Contents

1. [The "code is the source of truth" movement](#1-the-code-is-the-source-of-truth-movement)
2. [Per-artifact allocation: nobody has one truth](#2-per-artifact-allocation-nobody-has-one-truth)
3. [Sync mechanics and drift](#3-sync-mechanics-and-drift)
4. [Process patterns with named teams](#4-process-patterns-with-named-teams)
5. [Git-native and design-as-code alternatives](#5-git-native-and-design-as-code-alternatives)
6. [Verdict: where the field is leaning](#6-verdict-where-the-field-is-leaning)
7. [Cross-cutting themes](#cross-cutting-themes)
8. [Recommendations: a source-of-truth allocation model](#recommendations-a-source-of-truth-allocation-model)
9. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
10. [Sources](#sources)

---

## 1. The "code is the source of truth" movement

### What it is
A 2025–2026 wave of practitioner essays, case studies, and job descriptions arguing that the production codebase — not the Figma file — is the canonical description of the product, with Figma repositioned as an upstream exploration and communication layer.

### Why it matters
If your SDLC still treats Figma as the deliverable, every AI-generated prototype and every code-first exploration becomes an unreconciled fork. The movement is not "abandon Figma"; it is "stop asking Figma to be the record."

### Key findings
- **The survey floor has moved.** Designer Fund/Foundation Capital's [AI in Design Report 2026](https://stateofaidesign.com/) (906 respondents, Q1 2026) reports that [50% have shipped AI-generated code to production, 43% say their company now expects working prototypes as a design output, and 76% have used an AI coding tool](https://stateofaidesign.com/chapters/craft) (68% shipped code at early-stage companies vs. 33% at public ones). Figma's own [2026 AI Report](https://www.figma.com/blog/2026-ai-report/) (8,403 responses, June 2026) finds designers participating in development doubled from 21% to 41% in a year, and developers doing design rose from 44% to 60%.
- **But the platform is not collapsing.** zeroheight's [Design Systems Report 2026](https://report.zeroheight.com/) (147 practitioners) still finds 97% use Figma for design assets and 69% for documentation. The leaning is toward *code-canonical, Figma-resident* — not Figma-free.
- **The canonical essays.** JumpCloud Design's ["Figma is no longer the source of truth"](https://medium.com/@jc-design/figma-is-no-longer-the-source-of-truth-adb89feabafb) (cited in [06 §5.4](../foundational/06-ai-ux-research-ia-process.md); Medium blocked automated re-fetch this session). Jason Grant's ["Post-Figma Design"](https://mrjasongrant.substack.com/p/post-figma-design-real-ui-real-data) (July 2025): every design decision lives "in the same environment it will ship in: the browser"; explicitly "post-Figma, not anti-Figma" — Figma keeps systems design and early exploration. Changying Zheng's [case study of a 40-person B2B org moving from Figma-first to code-first](https://changying.substack.com/p/case-study-from-figma-first-to-code) (Feb 2026): the design system "exists only in code. Code is the source of truth because it's the originator"; Figma survives for tool-agnostic wireframing only, alongside Miro and Mermaid. The Crit's ["The New Design Handoff Is Not a Handoff"](https://thecrit.co/resources/design-handoff-is-not-a-handoff) (Apr 2026): Figma becomes "a structured, machine-readable source that feeds implementation," while code "lives in repositories from the start."
- **The counter-voice is Linear, and it is precise.** Karri Saarinen, quoted in the [AI in Design Report craft chapter](https://stateofaidesign.com/chapters/craft), warns against mixing planning and implementation: "design is the planning stage and code is the implementation stage." (His X posts describing Linear's flow — Figma exploration → agent-built prototypes → back into Figma → code behind a feature flag — returned HTTP 402 to fetch and are unverified here.)
- **Vendors are converging on the same framing from opposite sides.** Vercel's [Design Engineering at Vercel](https://vercel.com/blog/design-engineering-at-vercel) (2024, still the reference): no handoff; designers sketch in Figma, then iterate with a design engineer "in Figma or code"; animation, keyboard, and touch are "better implemented in code." Figma's Config 2026 line is that ["code should be treated like any other design material"](https://www.figma.com/blog/config-2026-recap/). Anthropic's [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs) (Apr 2026) builds its design system "by reading your codebase and design files" and hands off to Claude Code as a bundle — it never mentions Figma. Product Impact's analysis of the launch argues the strategic asset is not generation but ["the canonical system that defines what every component looks like"](https://productimpactpod.com/news/figma-claude-design-source-of-truth-for-design/).
- **Conference programming confirms the drift.** Into Design Systems 2026 ([agenda](https://www.intodesignsystems.com/agenda), March 2026) ran "Vibe coding with zero drift: from Figma to Storybook to Production," "Machine-Readable Design Systems for MCP and LLMs" (Indeed), and Figma's own Laura Fehre on Markdown as "the missing link between design systems and automation." Hatch 2026's [AI-Ready Design System workshop](https://www.hatchconference.com/workshops/the-ai-ready-design-system) (Lukas Oppermann, GitHub, Sept 2026) teaches "codifying human intuition into machine-readable formats like `AGENTS.md`, ensuring your system remains the single source of truth for both humans and AI agents."

### Open questions
- Is the 50%-shipped-code figure a design-engineer phenomenon or broad? The AI in Design data skews early-stage; enterprise (33%) lags by a full cycle.
- Saarinen's planning/implementation separation vs. Grant's "design in the browser": is the disagreement about tools or about *when* fidelity should be cheap?

---

## 2. Per-artifact allocation: nobody has one truth

### What it is
In practice, "single source of truth" is a per-artifact decision. Tokens, components, screens, flows, copy, and motion each have a different natural home and a different feasible sync direction.

### Why it matters
Most drift comes from applying one policy ("Figma is truth" or "code is truth") to artifact types where the other side is actually the originator.

### Key findings

| Artifact | Where it originates today | Sync direction in practice | Evidence |
|---|---|---|---|
| **Design tokens** | Split. 90% of teams define tokens in the design tool, 82% in code; **60% have no automation pipeline; only 5% achieve bidirectional sync** | Mostly one-way, either direction; true bidirectional is rare | [zeroheight 2026](https://report.zeroheight.com/); Figma's own [variables ↔ tokens GitHub Action example](https://github.com/figma/variables-github-action-example) is bidirectional by name-matching, never deletes, Enterprise-only, and "designed as manual workflows" |
| **Tokens (git-first variant)** | Code repo, DTCG JSON | Tokens Studio pulls/pushes to GitHub; its docs state "the Design Tokens living in code are the source of truth" | [Tokens Studio GitHub sync](https://docs.tokens.studio/token-storage/remote/sync-git-github); Supernova opens PRs from Figma changes ([doc 02 §5](../foundational/02-ai-design-systems.md)) |
| **Components** | Code (Storybook/React) for mature systems | Code → Figma via story.to.design ("one-way, from code to Figma"), refreshed on demand; Figma → code via Code Connect *pointers*, not generation | [story.to.design docs](https://story.to.design/docs/what-is-story-to-design); [Code Connect](https://developers.figma.com/docs/code-connect/) publishes "true-to-production code snippets" from repo template files; [GitHub Primer](https://story.to.design/blog/in-practice-primer-github-design-system) and [GOV.UK](https://story.to.design/blog/in-practice-gov-uk-design-system) both generate Figma libraries from Storybook ("code leads, Figma follows") |
| **Screens / layouts** | Either — Figma for exploration, code for AI-built prototypes | One-shot imports both ways; no continuous sync | Figma's [code-to-canvas workflow lab](https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas) is "a one-shot import with optional push-back, not continuous sync"; agents on canvas ([Mar 2026](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/)) write via `use_figma` |
| **Copy / content** | Neither — a dedicated string store | Bidirectional Figma ↔ Ditto; Ditto → code and PRs | [Ditto](https://www.dittowords.com/) syncs into Figma, Claude Code, and pull requests; UX Content Collective's [three-experiment comparison](https://uxcontent.com/ux-copy-single-source-truth/) concluded Figma-native copy management does not scale |
| **Motion** | Historically code; Figma Motion (Config 2026) exports timelines to Dev Mode / motion.dev / React | Figma → code, one-way | [Config 2026 recap](https://www.figma.com/blog/config-2026-recap/): "every timing value, every easing curve, every keyframe is readable" in Dev Mode |
| **User flows** | FigJam / Miro / Mermaid | One-way (diagram → tickets/spec); no code sync | No published team evidence found for flow ↔ code sync; Zheng's case study lists Miro and Mermaid as acceptable wireframing tools |
| **Component specs / decisions** | Emerging: YAML/Markdown spec, platform-agnostic | Spec → both Figma and code | Nathan Curtis's [component specs as data](https://speakerdeck.com/nathanacurtis/designing-and-automating-component-specifications-9fd209c9-9582-44a7-81f1-08047e984d4c) (IDS 2024; specs are "communication tools," "disposable" once built) and his 2025 YAML/Markdown ADR practice ([doc 02 §5](../foundational/02-ai-design-systems.md)) |

- **The Storybook/Figma question was settled years ago and the answer still holds.** Anima's 2022 ["Figma vs Storybook: what's the single source of truth?"](https://www.animaapp.com/blog/industry/what-is-the-single-source-of-truth-storybook-or-figma/) concluded neither alone works; Storybook's [design integrations docs](https://storybook.js.org/docs/sharing/design-integrations) position stories as the reference designers *compare against*. Sebastien Powell's ["Solving the design-development drift"](https://www.sebastienpowell.com/blog/solving-the-design-development-drift) (Oct 2025) is the clearest modern statement: code is canonical for components, designers test changes in Figma and then *request* a code update, and story.to.design regenerates the Figma side.
- **Figma's own agent skills treat code as the reference for libraries.** The official [`figma-generate-library` skill](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-generate-library/SKILL.md) builds a Figma library *from the codebase*, and on any "Code ≠ Figma" conflict presents both with provenance (file/line vs. node) and makes the human choose.

### Open questions
- Tokens are the only artifact where bidirectional sync is technically routine, yet only 5% achieve it. Is the blocker Figma's Enterprise-only Variables REST API, or organizational ownership?
- Motion and copy now have credible one-way pipelines. Flows still don't — is a Mermaid-in-repo pattern the missing piece?

---

## 3. Sync mechanics and drift

### What it is
The concrete machinery that keeps Figma and code from diverging — and what teams do with the Figma file once code ships.

### Why it matters
Drift is the failure mode of every "both places" policy. zeroheight 2026 finds [only 8% of teams call their system "very stable"; 44% call it unstable or very unstable](https://overlayqa.com/blog/design-system-drift/).

### Key findings
- **Code Connect is a pointer, not a sync.** [Code Connect](https://developers.figma.com/docs/code-connect/) maps Figma components to repo components via CLI template files (React, HTML/Web Components, SwiftUI, Compose) so Dev Mode and the MCP server serve real code. It does not update Figma when code changes; it makes the mapping the maintained artifact — exactly the model recommended in [prototype-construction/05 §4.3](../prototype-construction/05-surgical-editing-iteration.md) ("ship pointers, not parsing"). Christine Vallaure's [practical guide](https://christinevallaure.substack.com/p/agentic-ai-design-systems-and-figma) (Mar 2026) calls matching names and props across Figma and code "the number one way to get consistent component reuse."
- **Figma's write path is one-shot and human-reviewed.** Agents on canvas ([March 2026 beta](https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/)) added `use_figma` alongside `generate_figma_design`; the [in-canvas design agent](https://www.figma.com/blog/the-figma-agent-is-here/) (May 2026) frames the loop as "start in code, bring it into Figma… then send it back via the Figma MCP server." Figma's [code-to-canvas lab](https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas) is explicit that imported screens are starting points, not finished designs, and the push-back is a manual prompt.
- **Code Layers (Config 2026) is the first "same artifact" claim — and it is scoped to exploration.** Figma's [recap](https://www.figma.com/blog/config-2026-recap/): turn any layer into a code layer, extract frames into editable design layers, and "one click updates the code layer with what has changed"; rollout from July 2026. Third-party coverage stresses the caveat: ["Code Layers are exploratory, not production… Do not expect to deploy from Figma"](https://byteiota.com/figma-config-2026-code-layers-end-the-design-dev-handoff/).
- **Round-trip fidelity is bounded.** Code → Figma via html.to.design is quoted at roughly 80–90% structural accuracy with Auto Layout in beta ([doc 03 §3](../foundational/03-ai-ui-generation.md)); Anima's [Claude Design → Figma path](https://animaapp.com/blog/genai/how-to-go-from-claude-design-to-figma/) exports HTML and re-layers it, producing "Auto Layout–ready" layers that then need mapping to system components. Figma → code via the Notion team's `/figma` loop lands ["approximately 80% on the first pass"](https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows). Nobody publishes multi-trip fidelity numbers; the repo's prior analysis (general round-trip "one of near-universal failure") stands.
- **Drift detection is now a native Figma feature — on the Figma side only.** [Check designs](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma) (Organization/Enterprise) flags hard-coded values, detached instances, and components from unsubscribed libraries, and "makes no mention of comparing designs to code." Community linters ([design-lint](https://github.com/destefanis/design-lint), 518 stars) do the same. On the code side, Chromatic/Percy detect change from a *baseline*, not deviation from the *spec* — OverlayQA's [drift guide](https://overlayqa.com/blog/design-system-drift/) recommends both, plus monthly audits for teams using AI coding tools.
- **Cross-side parity checks are appearing as agent skills.** Figma's [community agent skills index](https://github.com/figma/community-resources/tree/main/agent_skills) points to community-hosted skills — `check-design-parity-figma` lives in [southleft/skills-for-figma](https://github.com/southleft/skills-for-figma) — including `check-design-parity-figma` ("compares design nodes against code specifications and reports drift"), `ds-compliance-audit`, and `export-/import-tokens-figma` (DTCG). [storysync](https://github.com/brendanciccone/storysync) (66 stars) offers push, **diff** ("audits drift between code and Figma"), and a planned pull. [figma-design-sync](https://github.com/lifesized/figma-design-sync) (`/sync-to-figma`, `/sync-from-figma`, code-first, token-bound; 2 stars — early).
- **What happens to the Figma file after code ships — the honest answer is "it depends on the artifact":**
  - *Library files* are regenerated from code on a cadence: GitLab's Pajamas UI kit ships [monthly versioned releases](https://design.gitlab.com/get-started/uik-release-notes/) (19.3 on 2026-08-14) whose notes say components were "updated to reflect the latest visual refinements from the product" — the kit tracks the product. Primer and GOV.UK regenerate from Storybook (§2).
  - *Screen files* become reference: Zheng's team keeps Figma for wireframes only; Grant treats Figma as exploration; Notion's playground is "for prototypes rather than production code," with Figma as visual reference.
  - *No published team says it deletes Figma files.* Figr's [drift analysis](https://figr.design/blog/figma-design-system-drift) (May 2026) reframes the target: "your design system is not what lives in Figma. Your design system is what users touch."

### Open questions
- Code Layers' "one click updates the code layer" has no published fidelity data yet; watch for reports after the July 2026 rollout.
- Check designs lints Figma against Figma. Who ships the linter that checks Figma against *code* tokens as a CI gate?

---

## 4. Process patterns with named teams

### What it is
The four recurring workflow shapes, with who is on record using each.

### Why it matters
A design leader needs a named pattern to adopt, not a principle. Each pattern implies a different answer to "what is the deliverable?"

### Key findings

| Pattern | Deliverable | Figma's role | Named teams / sources |
|---|---|---|---|
| **A. Figma as sketch layer, code canonical** | Working prototype → PR | Exploration, stakeholder alignment, wireframes | Vercel ([design engineering](https://vercel.com/blog/design-engineering-at-vercel)); Zheng's 40-person B2B org ([case study](https://changying.substack.com/p/case-study-from-figma-first-to-code)); Jason Grant ([Post-Figma](https://mrjasongrant.substack.com/p/post-figma-design-real-ui-real-data)); Linear (Figma exploration → agent prototypes → feature flag; report quote verified, X posts not) |
| **B. Design in code from day one** | Shared prototype repo | Reference only; source of tokens/icons | Notion's [Prototype Playground](https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows) (one Next.js repo on Vercel, per-designer folders, shared Notion components, `/figma` loop with Figma MCP + Chrome DevTools MCP, `/deploy` teaches git); Brian Lovin on Lenny's: ["I haven't written a single line of front-end code in 3 months"](https://www.lennysnewsletter.com/p/i-havent-written-a-single-line-of); Cursor's [designer workflow](https://cursor.com/for/designers) (prototype in the integrated browser, ship small fixes directly) |
| **C. Spec-first, both derived** | Markdown/YAML spec + AGENTS.md/DESIGN.md | Generated from spec or from code | Nathan Curtis (YAML/Markdown ADRs, [doc 02 §5](../foundational/02-ai-design-systems.md)); Atlassian's [context engine](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era) (May 2026: structured content + MCP + DESIGN.md; 52% AI accuracy improvement, 26% fewer tool calls); GitHub's [spec-kit](https://github.com/github/spec-kit) (133k stars, v1.0; "from 'code is the source of truth' to 'intent is the source of truth'" — [GitHub blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)); Hatch 2026 [AGENTS.md workshop](https://www.hatchconference.com/workshops/the-ai-ready-design-system) |
| **D. Figma-canonical with enforced pipeline ("zero drift")** | Figma library → Storybook via agents | Source for design decisions, enforced as rules | Shuaiqi Sun's IDS 2026 talk ["Vibe coding with zero drift"](https://www.intodesignsystems.com/agenda/vibe-coding-from-figma-to-production) (design decisions "carried forward instead of reshaped"); monday.com's [11-step LangGraph pipeline](https://engineering.monday.com/how-we-use-ai-to-turn-figma-designs-into-production-code/) (Feb 2026) — Figma is the *input*, but its design-system MCP derives from "real sources of truth: component code, TypeScript types… token definitions"; Figma [Make kits](https://www.figma.com/blog/introducing-make-kits-and-make-attachments/) (Apr 2026: npm package + Figma tokens + Markdown guidelines) |

- **Handbooks.** GitLab's Pajamas is described in its handbook as "the single source of truth" for components — meaning the *documentation site with live code*, with the Figma kit versioned separately ([release notes](https://design.gitlab.com/get-started/uik-release-notes/)); the handbook page itself returned only navigation on fetch. GitHub Primer's [Figma guide](https://primer.style/product/getting-started/figma/) says design teams use Figma "as the single source of truth, collaboration, and exploration" *within design* while stating components "match what is available for developers" — a two-truths split (Figma for design-time, code for build-time) that is common and works only because story.to.design regenerates the Figma side. GOV.UK's official [resources page](https://design-system.service.gov.uk/community/resources-and-tools/) lists no Figma library at all; kits are community-maintained.
- **Pattern D is the enterprise-safe on-ramp; A/B are where AI-native teams land.** The [AI in Design report](https://stateofaidesign.com/chapters/craft) quotes Anthropic's Joel Lewenstein: designers must be "deeply involved in the final delivery process"; Samsara's design director notes designers "directly fix code issues."
- **Prototype-is-the-spec is real but partial.** The report's 43% "prototypes expected as output" is the strongest evidence. Notion's playground explicitly keeps prototypes out of production; Zheng's engineers "refactor for production standards rather than shipping unchanged." The prototype is the *behavioral* spec; the PR is the deliverable.

### Open questions
- Pattern C has the best measured results (Atlassian) but the fewest design-team adopters. Is spec-first a design-systems-team practice that never reaches product designers?
- Where does rationale live in Pattern B? (Carried over from [06 §5](../foundational/06-ai-ux-research-ia-process.md).)

---

## 5. Git-native and design-as-code alternatives

### What it is
Tools that put the design file itself in the repo or make it code-shaped: Pencil (`.pen`), OpenPencil, Penpot, Paper, Framer, and Apple's acquisition of Play.

### Why it matters
If the design file is JSON in git, "source of truth" becomes a branch-and-PR question instead of a plugin question.

### Key findings
- **Pencil** ([pen.dev](https://www.pen.dev/), "Design on canvas. Land in code."): `.pen` JSON in the repo, local MCP for coding agents; third-party coverage cites ~100k users and a16z Speedrun backing ([doc 03 §3](../foundational/03-ai-ui-generation.md)). The public site and [docs](https://docs.pen.dev/) expose little detail on fetch.
- **OpenPencil** ([open-pencil/open-pencil](https://github.com/open-pencil/open-pencil)): MIT, 8.1k stars, reads/writes `.fig` and `.pen`, MCP server with 100+ tools; "usable today, with some rough edges."
- **Paper** ([paper.design](https://paper.design/)): web-standards canvas, "your design exports as code," MCP for any IDE/CLI agent, $34M Series A (Accel, ICONIQ), claims designers at Vercel, Perplexity, PostHog, Tailwind Labs.
- **Penpot** ([penpot.app](https://penpot.app/)): open source, self-hostable, native design tokens, an MCP server and "AI workflows" across code-to-design and design-to-code; open file format plus CSS/HTML/SVG/JSON.
- **Play** was [acquired by Apple in June 2026](https://9to5mac.com/2026/06/29/apple-just-acquired-the-app-that-won-last-years-innovation-apple-design-award/) and pulled from the App Store — a SwiftUI-native prototyping tool absorbed into the platform vendor, not a Figma competitor.
- **Are AI-first teams actually leaving Figma? No published migration data says so.** Subframe's [Figma-alternative pitch](https://www.subframe.com/tips/best-figma-alternative) (May 2026) "provides no quantitative data on actual migration rates" and (incorrectly) claims Figma lacks an MCP server. The strongest counter-evidence is Figma's 97% share among design-systems teams ([zeroheight](https://report.zeroheight.com/)) and Figma's 2026 finding that [76% of product builders do at least half their work on the canvas](https://www.figma.com/blog/2026-ai-report/). Anthropic's Claude Design launching without a Figma path — and Figma stock dropping 7% that day ([Product Impact](https://productimpactpod.com/news/figma-claude-design-source-of-truth-for-design/)) — is the clearest signal that *generation* is leaving Figma even while *the record* stays.
- **Figma's answer is to absorb the alternatives' properties:** agents on canvas, skills as Markdown, Code Layers cloning a GitHub repo onto the canvas, Make kits consuming npm packages. Sameness.co's [post-Config critique](https://www.sameness.co/blog/figma-config-brand-context) (Aug 2026) notes what is still missing from any canvas: brand/strategic context, which "must exist in a form that works alongside agent-native canvases."

### Open questions
- `.pen` in git solves versioning but not review: who can read a JSON diff of a design? Does Code Layers' "same artifact" model make this moot?
- Penpot's DTCG-native tokens plus MCP is the only open-source stack covering all of §2's rows — is anyone running it at scale?

---

## 6. Verdict: where the field is leaning

**Center of gravity, September 2026: code is canonical for anything that ships; Figma is canonical for anything that is still being decided; tokens are canonical in a DTCG file that both consume; and the *mapping layer* (Code Connect, MCP, skills, AGENTS.md) is the artifact that teams actually maintain.**

- **Leading teams** (Vercel, Notion, Linear, Atlassian, the Zheng case study, monday.com) do not round-trip. They run *one-way generation with human re-adoption*: sketch in Figma → build in code (often agent-assisted) → optionally push a screen back to canvas for review → the PR is the record. Libraries flow code → Figma on a release cadence. This matches the recommendation already reached in [prototype-construction/05 §4](../prototype-construction/05-surgical-editing-iteration.md).
- **Figma itself has conceded the direction** — "code as design material," Code Connect as the bridge, Make kits built on npm packages, skills as Markdown — while betting that the *canvas* remains where humans decide. Its 2026 data (41% of designers in development, 20% of developers preferring to start on canvas) supports a both-ways flow, not a Figma-first one.
- **Laggards' failure modes** (from Figr, OverlayQA, Powell, Vallaure): maintaining parallel Figma and code libraries by hand; treating the Figma file as the deliverable so AI-generated prototypes fork it silently; tokens defined twice with no pipeline (60% of teams); no Code Connect, so agents "regenerate components unnecessarily"; drift audited quarterly while AI tooling generates weekly; and Figma-only linting that never sees production.
- **What is *not* settled:** Code Layers' real fidelity, whether spec-first (Pattern C) reaches product designers, and where rationale lives once specs are prompts.

---

## Cross-cutting themes

1. **"Source of truth" is a per-artifact allocation, not a tool choice.** The teams with the least drift pick a home per artifact (§2) and enforce direction, rather than voting Figma vs. code.
2. **Pointers beat parsing.** Code Connect, story.to.design's linked components, Plasmic-style file ownership, and this repo's construction-file design all maintain a *mapping*, never an inverse transform. Round-trip is still the graveyard it was in the CASE-tool era.
3. **Markdown is the new interchange.** Figma skills, Make kit guidelines, DESIGN.md, AGENTS.md, Storybook MCP manifests, and Curtis's YAML specs all encode "how we build" as text agents can read — consistent with the AI-legibility stack in [00-overview](../foundational/00-overview.md).
4. **Drift detection is bifurcated.** Figma lints Figma (Check designs); CI lints code (Chromatic, ESLint token rules). The cross-side check (`check-design-parity-figma`, storysync `diff`) is nascent — a gap this repo's hooks collection could fill.
5. **The deliverable moved from picture to PR, but not to production.** Prototypes are behavioral specs; engineers still refactor (Zheng, Notion). "Prototype is the spec" is true; "prototype is the product" mostly is not.
6. **Generation is leaving the canvas faster than the record is.** Claude Design, v0, Cursor, and Claude Code generate outside Figma; Figma's counter-move is to be the place agents *land* work for human decision.

---

## Recommendations: a source-of-truth allocation model

Opinionated defaults for a team hardening its design SDLC. "Canonical home" is where a conflict is resolved; the non-canonical copy is always derived, labeled, or discarded — never hand-maintained.

| Artifact | Canonical home | Sync direction | Mechanism | Non-canonical copy |
|---|---|---|---|---|
| **Design tokens** | DTCG JSON in the repo | Code → Figma (push); Figma → code only via PR | Tokens Studio or Figma Variables REST → Style Dictionary; PR review for any Figma-originated change ([Tokens Studio](https://docs.tokens.studio/token-storage/remote/sync-git-github), [Figma action example](https://github.com/figma/variables-github-action-example)) | Figma Variables are a generated mirror; designers propose, never edit-in-place without a PR |
| **Components (mature)** | Code + Storybook | Code → Figma | story.to.design/storysync regenerate the Figma library on release; Code Connect maps every published component ([Code Connect](https://developers.figma.com/docs/code-connect/)) | Figma library is versioned and regenerated (GitLab/Primer model); never edited directly |
| **Components (net-new)** | Figma until first merge, then code | Figma → code once, then flips | Design in Figma → agent implements via Figma MCP + Code Connect → PR merges → story.to.design regenerates the Figma component from Storybook | Original Figma exploration frame marked "superseded by `<component>` v1.0" |
| **Screens / prototypes** | The PR (code prototype) | Figma → code (one-shot); code → canvas for review only | Figma MCP `get_design_context` → build → Chrome DevTools/Playwright compare loop (Notion `/figma` pattern); `generate_figma_design` to bring code back for critique | Figma screen files are exploration; archive the page with a link to the PR when merged |
| **Copy / strings** | A string store (Ditto or repo i18n files) | Store ↔ Figma; store → code | [Ditto](https://www.dittowords.com/) or equivalent; PR checks | Text in Figma frames is a synced view, never edited outside the plugin |
| **Motion** | Code (Motion/GSAP/Rive) | Figma Motion → code, one-way | Dev Mode timeline export → agent implementation | Figma Motion frames are specs; delete on merge |
| **Flows / IA** | Mermaid or YAML in the repo (or FigJam if no repo) | Diagram → tickets, one-way | `figma-generate-diagram` skill to render Mermaid into FigJam for workshops | FigJam boards are meeting artifacts; export decisions back to Markdown |
| **Component specs / rationale** | Markdown/YAML (ADRs, DESIGN.md, AGENTS.md) | Spec → Figma and code | Curtis/Atlassian pattern; served via MCP and skills | Figma annotations and Storybook docs are rendered views |
| **Brand / aesthetic direction** | DESIGN.md + brand guidelines repo | → everything | [DESIGN.md](../foundational/02-ai-design-systems.md) as agent context; Make kit guidelines | Figma brand pages are presentation, not source |

Operating rules that fall out of the table: (1) every Figma library file carries a version tag matching a code release; (2) any Figma page that has shipped gets a "reference — see PR #" banner within the sprint; (3) drift audits run monthly if agents generate UI, cross-checking tokens in code vs. Figma; (4) no artifact is hand-maintained in two places — if you catch yourself doing it, one side becomes generated.

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Category |
|---|---|---|---|---|
| Figma `mcp-server-guide` skills | https://github.com/figma/mcp-server-guide | Official skills: `figma-generate-library` (code → Figma library with conflict forks), `figma-generate-design`, `figma-code-connect`, `figma-use` | Fetched OK | skills |
| Figma community `agent_skills` index → southleft/skills-for-figma | https://github.com/southleft/skills-for-figma | `check-design-parity-figma`, `ds-compliance-audit`, `export-/import-tokens-figma` (DTCG), `design-react-api` (the Figma index page links out to this repo) | Fetched OK | skills |
| OpenAI `figma-implement-design` | https://github.com/openai/skills/blob/main/skills/.curated/figma-implement-design/SKILL.md | Figma → code skill; "treat MCP output as design intent, not code style" | Fetched OK | skills |
| `figma-design-sync` (lifesized) | https://github.com/lifesized/figma-design-sync | `/sync-to-figma`, `/sync-from-figma`, code-first, token-bound; needs Figma Console MCP | Fetched OK (2 stars — early) | skills |
| `storysync` | https://github.com/brendanciccone/storysync | Storybook + tokens → Figma push, **diff** (drift audit), pull planned | Fetched OK | subagents-and-commands |
| Storybook `addon-mcp` | https://github.com/storybookjs/addon-mcp | Docs/dev/test toolsets; agents reuse documented components, run a11y tests | Fetched OK | mcp-servers |
| Figma Console MCP (southleft) | https://github.com/southleft/figma-console-mcp | Read-write variables/nodes on any plan via Plugin API; 121 tools | Not fetched (search only) | mcp-servers |
| Figma variables ↔ tokens GitHub Action | https://github.com/figma/variables-github-action-example | Bidirectional token sync reference (Enterprise API) | Fetched OK | hooks |
| `figma-variables-to-styledictionary` | https://github.com/gerard-figma/figma-variables-to-styledictionary | Same workflow plus Style Dictionary transforms | Fetched OK | hooks |
| Tokens Studio GitHub sync | https://docs.tokens.studio/token-storage/remote/sync-git-github | Two-way token sync docs; "tokens in code are the source of truth" | Fetched OK | rules (policy template) |
| `design-lint` | https://github.com/destefanis/design-lint | Figma-side linter (MIT, 518 stars) | Fetched OK | hooks (pre-handoff gate) |
| Figma Specs generator | https://github.com/antivirusakash/figma-ui-specs-generator | Figma selection → compact YAML spec for agents | Fetched OK (12 stars) | subagents-and-commands |
| GitHub `spec-kit` | https://github.com/github/spec-kit | Spec-driven development toolkit (specify/plan/tasks/implement) | Fetched OK | subagents-and-commands |
| Notion `/figma` loop pattern | https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows | Figma MCP → build → Chrome DevTools MCP compare, max 3 iterations | Fetched OK | subagents-and-commands (command recipe) |
| Ditto | https://www.dittowords.com/ | Copy source of truth syncing to Figma, Claude Code, PRs | Fetched OK | mcp-servers / proposed **content-tooling** |
| OpenPencil | https://github.com/open-pencil/open-pencil | Open-source `.fig`/`.pen` editor with MCP | Fetched OK | mcp-servers |
| Hook idea: token-drift gate | — | Pre-commit/CI hook diffing DTCG JSON vs. Figma Variables export; fail on unmapped hard-coded values (no open-source standard exists — see [00-overview gap #7](../foundational/00-overview.md)) | n/a | hooks (proposed) |
| Rule idea: "shipped page" banner | — | CLAUDE.md/AGENTS.md rule: agents editing a Figma page linked to a merged PR must add a superseded note instead of editing | n/a | rules (proposed) |

---

## Sources

- https://stateofaidesign.com/ · https://stateofaidesign.com/chapters/craft
- https://www.figma.com/blog/2026-ai-report/ · https://www.figma.com/blog/state-of-the-designer-2026/
- https://report.zeroheight.com/
- https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/ · https://www.figma.com/blog/the-figma-agent-is-here/ · https://www.figma.com/blog/config-2026-recap/ · https://www.figma.com/blog/introducing-make-kits-and-make-attachments/ · https://www.figma.com/blog/5-shifts-redefining-design-systems-in-the-ai-era/
- https://help.figma.com/hc/en-us/articles/40219873508247-Workflow-lab-Code-to-canvas · https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma · https://help.figma.com/hc/en-us/articles/39166810751895-Figma-skills-for-MCP
- https://developers.figma.com/docs/code-connect/ · https://github.com/figma/mcp-server-guide · https://github.com/figma/mcp-server-guide/blob/main/skills/figma-generate-library/SKILL.md · https://github.com/figma/community-resources/tree/main/agent_skills · https://github.com/figma/variables-github-action-example · https://github.com/gerard-figma/figma-variables-to-styledictionary
- https://vercel.com/blog/design-engineering-at-vercel · https://cursor.com/for/designers
- https://medium.com/@jc-design/figma-is-no-longer-the-source-of-truth-adb89feabafb (not re-fetched) · https://mrjasongrant.substack.com/p/post-figma-design-real-ui-real-data · https://changying.substack.com/p/case-study-from-figma-first-to-code · https://thecrit.co/resources/design-handoff-is-not-a-handoff
- https://www.chatprd.ai/how-i-ai/how-notion-designs-with-ai-brian-lovins-prototype-playground-and-claude-code-workflows · https://www.lennysnewsletter.com/p/i-havent-written-a-single-line-of
- https://engineering.monday.com/how-we-use-ai-to-turn-figma-designs-into-production-code/ · https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era
- https://www.anthropic.com/news/claude-design-anthropic-labs · https://productimpactpod.com/news/figma-claude-design-source-of-truth-for-design/ · https://animaapp.com/blog/genai/how-to-go-from-claude-design-to-figma/
- https://story.to.design/docs/what-is-story-to-design · https://story.to.design/blog/in-practice-primer-github-design-system · https://story.to.design/blog/in-practice-gov-uk-design-system · https://primer.style/product/getting-started/figma/ · https://design.gitlab.com/get-started/uik-release-notes/ · https://design-system.service.gov.uk/community/resources-and-tools/
- https://www.animaapp.com/blog/industry/what-is-the-single-source-of-truth-storybook-or-figma/ · https://storybook.js.org/docs/sharing/design-integrations · https://storybook.js.org/docs/ai/mcp/overview · https://github.com/storybookjs/addon-mcp
- https://www.sebastienpowell.com/blog/solving-the-design-development-drift · https://christinevallaure.substack.com/p/agentic-ai-design-systems-and-figma · https://figr.design/blog/figma-design-system-drift · https://overlayqa.com/blog/design-system-drift/ · https://github.com/destefanis/design-lint
- https://docs.tokens.studio/token-storage/remote/sync-git-github · https://www.dittowords.com/ · https://uxcontent.com/ux-copy-single-source-truth/
- https://speakerdeck.com/nathanacurtis/designing-and-automating-component-specifications-9fd209c9-9582-44a7-81f1-08047e984d4c · https://github.com/github/spec-kit · https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/ · https://www.hatchconference.com/workshops/the-ai-ready-design-system · https://www.intodesignsystems.com/agenda · https://www.intodesignsystems.com/agenda/vibe-coding-from-figma-to-production
- https://byteiota.com/figma-config-2026-code-layers-end-the-design-dev-handoff/ · https://www.sameness.co/blog/figma-config-brand-context · https://superdesign.dev/blog/figma-to-code
- https://www.pen.dev/ · https://docs.pen.dev/ · https://github.com/open-pencil/open-pencil · https://paper.design/ · https://penpot.app/ · https://www.subframe.com/tips/best-figma-alternative · https://9to5mac.com/2026/06/29/apple-just-acquired-the-app-that-won-last-years-innovation-apple-design-award/
- https://github.com/lifesized/figma-design-sync · https://github.com/brendanciccone/storysync · https://github.com/antivirusakash/figma-ui-specs-generator · https://github.com/openai/skills/blob/main/skills/.curated/figma-implement-design/SKILL.md · https://github.com/southleft/figma-console-mcp (not fetched)

*Research conducted 2 September 2026 via live web search (~45 queries) and page fetches (~75 URLs). Unverifiable this session: Karri Saarinen's X posts on Linear's workflow (HTTP 402), the JumpCloud Medium essay (403; previously verified in doc 06), a Sparkbox 2025 survey (404 — none found), and several UX Collective/Medium pieces (403).*
