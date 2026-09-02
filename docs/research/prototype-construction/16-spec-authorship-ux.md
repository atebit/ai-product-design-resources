# 16 — Spec Authorship UX: How Designers Actually Author Intent

**Scope:** This document answers open questions Q1 ("Will designers write YAML?"), Q3 ("spec granularity floor"), Q7 ("multi-fidelity intent") and Q8 ("where does conversation state live") from [02 — Intent Spec & Context §8](02-intent-spec-and-context.md#8-open-questions). It covers the *authoring surface* for `intent.yaml`: whether the designer types it, talks it into existence, fills a form, or draws it, and what the spec must contain before the construction step ([03](03-construction-file-generation.md)) has enough to work with. It builds on doc 02's format sketch (§2.6) and conversation loop (§6), the pipeline in [00](00-architecture-synthesis.md), and it does not repeat the feedback-surface evidence in [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) or the PRD/spec-generation tooling survey in [foundational/06 §5.2](../foundational/06-ai-ux-research-ia-process.md). Out of scope: catalog serving, construction-file schema, builder mechanics. Verified live 2 September 2026; every claim links its source; anything that could not be fetched is marked.

## Table of Contents

1. [Framing: three places a spec can be born](#1-framing-three-places-a-spec-can-be-born)
2. [Spec-driven development in practice, 2025–2026](#2-spec-driven-development-in-practice-20252026)
3. [Designer-facing intent surfaces](#3-designer-facing-intent-surfaces)
4. [Conversational elicitation: what the research and the products say](#4-conversational-elicitation-what-the-research-and-the-products-say)
5. [Form-like and structured-editor front-ends](#5-form-like-and-structured-editor-front-ends)
6. [The spec granularity floor](#6-the-spec-granularity-floor)
7. [Multi-fidelity intent and the promotion path](#7-multi-fidelity-intent-and-the-promotion-path)
8. [Where conversation state lives](#8-where-conversation-state-lives)
9. [Recommended authoring model](#9-recommended-authoring-model)
10. [Revised intent.yaml sketch](#10-revised-intentyaml-sketch)
11. [Tradeoffs](#11-tradeoffs)
12. [Open questions](#12-open-questions)
13. [Recommended experiments](#13-recommended-experiments)
14. [Candidate picks for skill-resources](#14-candidate-picks-for-skill-resources)
15. [Sources](#15-sources)

---

## 1. Framing: three places a spec can be born

Doc 02 assumed the designer opens a text editor and types `intent.yaml`. The evidence below says that assumption is wrong for the median designer but *right for the artifact*: every serious tool surveyed — whether it starts from chat, a form, or a canvas — has converged on **a durable, editable, plain-text plan/spec file that the model drafts and the human edits**. The question is therefore not "YAML or not" but "who writes the first draft, what surface edits it, and what the file must contain before generation is allowed to run." Three birth-places recur:

| Birth-place | Mechanism | Representative | What it emits |
|---|---|---|---|
| **Conversation → file** | Model asks, drafts a markdown/YAML plan, human edits and approves | Figma Make plan mode, Lovable plan mode, Claude Code plan mode, Spec Kit `/speckit.clarify` | `plan.md` / `spec.md` in the project |
| **Form / structured editor** | Schema-driven fields, sometimes AI-filled | ChatPRD, Rovo PRDs, JSON-Schema forms, Kiro's three files | Markdown or JSON conforming to a template |
| **Canvas / sketch → structure** | Sitemap, wireframe, annotation or drawing parsed into structure | Relume sitemap→wireframe, tldraw make-real, Stitch annotate, Uizard scanner | Sitemap tree, shape JSON, or nothing durable (image only) |

The rest of the document tests each against the pipeline's needs: concept, audience, screens, flows, sample data, states, and non-goals.

---

## 2. Spec-driven development in practice, 2025–2026

**What it is:** Tooling that makes a written specification the gate before an agent writes code. It is the closest engineering precedent for the intent-spec stage, and its one-year track record answers "will people maintain a spec?" with data.

**Key findings:**

| Tool | Artifacts | Clarification mechanism | Who authors | State as of Sept 2026 |
|---|---|---|---|---|
| **GitHub Spec Kit** | `.specify/constitution.md`, `spec.md`, `plan.md`, `tasks.md` | `/speckit.clarify` asks "up to 5" questions selected by an "(Impact × Uncertainty)" heuristic across nine ambiguity categories (Functional Scope, Domain & Data Model, Interaction & UX Flow, …) and writes answers into a `## Clarifications` / `### Session YYYY-MM-DD` section of the spec ([clarify.md template](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md)); the spec template inserts `[NEEDS CLARIFICATION: specific question]` markers rather than guessing ([spec-driven.md](https://github.com/github/spec-kit/blob/main/spec-driven.md)) | Unstated; the methodology essay references "product manager updates" and "the development team" but assigns no authorship role | 133.1k stars, 12.0k forks, "30+ AI coding agents", v1.0.0 ([repo](https://github.com/github/spec-kit)) |
| **Kiro (AWS)** | `requirements.md` (EARS), `design.md`, `tasks.md` | Approval gates between phases; "Analyze Requirements" pass for "logical inconsistencies, ambiguities, conflicting constraints, and gaps" | Engineers in an IDE; a "Quick Spec" variant for "a well-understood feature where you trust Kiro's output" | EARS pattern verbatim: "WHEN [condition/event] THE SYSTEM SHALL [expected behavior]" ([feature specs](https://kiro.dev/docs/specs/feature-specs/)); spec drift handled by "Sync Files" on `tasks.md` and "Refine" on `design.md` ([best practices](https://kiro.dev/docs/specs/best-practices/)) |
| **OpenSpec** | `proposal`, `specs/`, `design`, `tasks`; requirements carry `ADDED` / `MODIFIED` / `REMOVED` delta markers; archiving "merges them into the main specs" | Proposal-first; `/opsx:propose` | Engineers; "built for brownfield not just greenfield" | 67.1k stars, MIT, 30+ assistants ([repo](https://github.com/Fission-AI/OpenSpec)) |
| **Tessl** | `specs/*.spec.md` with YAML frontmatter `targets:` (files/globs) and inline `[@test]` links | "Ask clarifying questions one at a time"; rule: "Never begin implementation without an approved spec" ([tile repo](https://github.com/tesslio/spec-driven-development-tile)) | Engineers | Docs page at docs.tessl.io returned 404; tile README used instead |
| **BMAD Method** | Product Brief → PRD → UX spec → architecture → sharded stories | Coach-style agents | **Explicitly non-engineers:** "Web Bundles" ship the Brief/PRD/UX coaches as Gemini Gems and ChatGPT Custom GPTs — "Built for non-technicals AND engineers. Founders, PMs, designers, and ops staff get into the BMad lifecycle without learning an editor" ([BMM v6.8.0, 25 May 2026](https://www.bmadcode.com/bmad-update-may-2026-web-bundles-prd-brief-platforms/)) | Heaviest in the field: "Enterprise framework with 21 specialized AI agents" per [spec-compare](https://github.com/cameronsjo/spec-compare) (18 tools, last reassessed 2026-08-28) |
| **Claude Code plan mode** | A plan the user can open with `Ctrl+G` "in your default text editor and edit it directly before Claude proceeds" ([permission modes](https://code.claude.com/docs/en/permission-modes)) | `AskUserQuestion`: "1-4 questions with 2-4 options each", `header` max 12 chars, `multiSelect`, free-text "Other", optional HTML/markdown `preview` per option for "layout choices, color schemes" ([Agent SDK user input](https://code.claude.com/docs/en/agent-sdk/user-input)) | Anyone in the terminal | Auto mode "nudges Claude to keep working without stopping for clarifying questions" — asking is a mode-dependent behavior, not a constant |
| **Cursor plan mode** | "a Markdown file with file paths and code references", "optionally, save as a Markdown file in your repository" | "ask clarifying questions" during research ([Cursor, 7 Oct 2025](https://cursor.com/blog/plan-mode)) | Engineers | Persistence across sessions not documented |
| **Windsurf planning mode** | Persistent markdown plan editable by user and agent (search-result claim: stored under `~/.codeium/windsurf/brain/`) | — | Engineers | Docs URL redirected to docs.devin.ai and returned 404; **not verified** |

**The critiques are about volume, not the idea.** Böckeler's three-tool test (15 Oct 2025) found Kiro turned a small bug fix into four user stories with sixteen acceptance criteria — "like using a sledgehammer to crack a nut" — and concluded "I'd rather review code than all these markdown files"; she also names the three maturity levels this pipeline must pick between: **spec-first, spec-anchored, spec-as-source** ([martinfowler.com](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)). Eisele (15 Jul 2026) names the failure mode directly — "That is not a specification system. It is a second codebase with weaker tooling" — and proposes that specs "serve the delta … then expire", with durable constraints moving into "executable forms that tools enforce automatically" ([the-main-thread](https://www.the-main-thread.com/p/spec-driven-development-exit-strategy)). Roger Wong, writing as a designer (4 Mar 2026), cites a developer who "found that specs ate 50% of his total project time" yet argues the model is "agile wearing a trench coat" because build cycles collapse "from months to minutes"; his design-specific claim is the load-bearing one for this doc: "Designers co-author the spec … If you can't express your design intent in terms a system can enforce, you're back to tossing mockups" ([rogerwong.me](https://rogerwong.me/2026/03/spec-driven-development)).

**What this means for intent.yaml:** (1) Every SDD tool that survived contact with users has a *clarify* step that writes into the file; none rely on the user producing a complete spec cold. (2) The engineering tools are authored by engineers; the only framework explicitly targeting designers (BMAD) did it by moving the coaches *out of the IDE* into chat surfaces. (3) The spec-rot critique means the pipeline should be **spec-anchored for the prototype's life and disposable afterward** — the construction file and fixtures are the "executable forms"; intent.yaml is the delta.

**Open questions:** Whether Spec Kit's 5-question cap or Claude Code's 4-question cap came from user data or taste is unpublished; no SDD vendor reports spec-abandonment rates.

---

## 3. Designer-facing intent surfaces

**What it is:** The products a designer (not a design-engineer) would actually open. The test applied to each: does it emit a durable, editable, machine-readable intent artifact, or does intent live in chat scrollback and the rendered output?

| Product | Intent inputs | Durable spec artifact? | Design-system context | Notes (dated) |
|---|---|---|---|---|
| **Figma Make** | Prompt; attachments ("PDFs, markdown files, CSV and JSON datasets, screenshots, brand guidelines, legal copy, images, media, and SVGs"); **plan mode** | **Yes** — plan mode "creates a plan markdown file, which opens automatically"; "Open `plan.md` to adjust the structure, add details, or remove sections", then click **Build** ([help center](https://help.figma.com/hc/en-us/articles/40830441709719-Use-plan-mode-in-Figma-Make)). Post-build persistence undocumented | **Make kits**: "combine their library's components or styles with detailed guidelines" from npm packages and Figma libraries ([Figma blog, 2 Apr 2026](https://www.figma.com/blog/introducing-make-kits-and-make-attachments/)) | Plan mode "only available when using the default model or Claude Opus 4.7"; paid plans; the blog's framing — "Instead of summarizing everything in a long prompt, you attach the source material" — is the attachment-over-prose principle |
| **Claude Design** (Anthropic Labs, 17 Apr 2026) | Prompt; uploaded DOCX/PPTX/XLSX/images; codebase; web capture; inline comments; "adjustment knobs" | **Partial** — the handoff bundle "packages everything" for Claude Code ([announcement](https://www.anthropic.com/news/claude-design-anthropic-labs)); admin guide: "Export design intent for use with Claude Code" ([admin guide](https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans)). A practitioner write-up reports the bundle contains HTML/CSS/JS, per-state screenshots, a README, and "the conversation history from Claude Design — so it knows why you made the design decisions you made" ([dev.to](https://dev.to/bilelsalemdev/from-prompt-to-pull-request-using-claude-design-claude-code-and-github-together-3m00); secondary) | "builds a design system for your team by reading your codebase and design files"; editing the system is chat-based via "Remix" ([setup guide](https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design)) | No brief/spec form; intent = prompt + attachments + edit history. The `/design-sync` and brand-guidelines update: Digital Trends/Yahoo pages returned 403; **not verified** |
| **v0 (Vercel)** | Prompt with three inputs — "Product surface", "Context of use", "Constraints & taste"; Design Mode for visual tweaks | **No** — chat + code | Name components: "use shadcn/ui Dialog with DialogHeader…" | Claims "30-40% faster generation time" with no stated basis ([Vercel, 15 Dec 2025](https://vercel.com/blog/how-to-prompt-v0)) |
| **Lovable** | Prompt; **plan mode**; project/workspace **Knowledge** | **Yes** — "The working plan lives in `.lovable/plan.md`", archived "to a dated copy in `.lovable/plan/`" on approval; edits shown as diffs ([plan mode docs](https://docs.lovable.dev/features/plan-mode)); Knowledge is 10,000 chars per level, must be hand-maintained ([knowledge docs](https://docs.lovable.dev/features/knowledge)) | Knowledge holds "Brand voice and UI guidelines" | "Every message in Plan mode deducts one credit" |
| **Bolt** | Prompt; Plan mode (v1 "Discussion Mode" retired for new projects 13 Apr 2026 per search results; support page shows no dates — partially verified) | **No** — plan is chat ([support](https://support.bolt.new/best-practices/discussion-mode)) | — | — |
| **Subframe** | Prompt against your system; "Ask AI mode drafted four options in under a minute" ([design-systems page](https://www.subframe.com/design-systems)) | **No** — canvas + code | Native: generation constrained to your components | Variant-first: pick a direction, then refine |
| **Paper** | Canvas manipulation; MCP so agents "create frames, update styles, set text content, get screenshots" ([banani review](https://www.banani.co/blog/paper-design-mcp-review)) | **No** spec; the HTML/CSS canvas *is* the artifact | Tokens/components sync with codebase | Intent expressed by drawing, not describing |
| **Relume** | Short concept prompt → **sitemap** (pages × sections, each with a "section prompt" title + description) → wireframes → export | **Yes, structurally** — "The title and description of a section in the sitemap helps inform AI what component to generate" ([wireframe docs](https://www.relume.ai/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder)); sitemap docs URL returned 404 | 1,000+ component library | The clearest existing instance of *structured intent before pixels*; sections are exactly the "structure sketch" slot in doc 02 §2.3 |
| **Framer** | Wireframer (prompt → wireframe) and Workshop (prompt → coded component) | **No** | — | Search-result claims only ([superdesign review](https://superdesign.dev/blog/framer-ai-review)); not independently verified |
| **Google Stitch** (ex-Galileo, acquired May 2025) | Prompt; **Annotate** — "draw, circle, or write notes directly on generated UI screens" fed back to Gemini; "Describe" prompt for interactions ([UXPin, 13 Apr 2026](https://www.uxpin.com/studio/blog/google-stitch-ai-design-tool-updates-ui-ux/)) | **No** | — | Third-party posts describe a March 2026 canvas, 5-screen flows, voice and MCP; stitch.withgoogle.com served no verifiable content — **not verified** |
| **Uizard** | Text (Autodesigner), hand-drawn wireframe scan, screenshot scan | **No** | — | "Switch from high to low fidelity in an instant" ([wireframe scanner](https://uizard.io/wireframe-scanner/)) |
| **Figma agent / FigJam** | "Beginning May 20, 2026, Figma's agent will be the new entry point" for First Draft; open beta 24 Jun 2026 with file/image/PDF/spreadsheet attachments, custom skills, MCP ([Config 2026 notes](https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026)) | **No** spec; FigJam boards are readable via MCP `get_figjam` | Library-aware | Whiteboard → structured spec is possible via MCP but no product does it |

**Pattern:** The two products that most explicitly target designers *and* emit a durable plan (Figma Make, Lovable) both arrived at the same shape as the engineering SDD tools — `plan.md`, drafted by the model after a short clarification, edited by the human as markdown, approved by a button. Nobody ships a form. Nobody asks the designer to write YAML. Relume is the lone tool that captures *structure* (pages → sections → intent per section) as a first-class editable object before rendering; its sitemap is the closest living analogue to `screens[].structure`.

---

## 4. Conversational elicitation: what the research and the products say

**What it is:** The model detects under-specification, asks, and the answers become part of the spec. Doc 02 §6 covered the 2024–25 disambiguation papers; this section adds 2026 results and the product-side question budgets.

**Key findings:**

- **Models know but do not ask.** On 1,000 AmbigQA items across ten GPT/Claude/Qwen models, models "achieve reasonably high accuracy on the ambiguous class (often 60–80%)" when asked to *judge* ambiguity, but ask clarifying questions in only "0–5%" of ambiguous cases when answering; Claude 3.5 Sonnet was highest at ~5%, GPT and Qwen "rarely exceeded 1%". Worse for this pipeline: adding retrieved context *raised* accuracy (46%→55% on ambiguous) while *suppressing* clarification further ([Knowing but Not Showing, 24 May 2026](https://arxiv.org/html/2605.25284v1)). Implication: a rich catalog in context will make the model *less* likely to ask about the intent — asking must be forced by the workflow, not left to the model.
- **Decoupling detection from generation works.** A multi-agent scaffold that separates "underspecification detection from code execution" reached a "69.40% task resolve rate" on an underspecified SWE-bench Verified variant, "closing the gap with agents operating on fully specified instructions", while "conserving queries on simple tasks" ([Ask or Assume?, 2603.26233](https://arxiv.org/abs/2603.26233)). This is the architectural argument for a *separate* slot-linter/clarifier step ahead of construction.
- **Training helps, modestly.** Simulating future turns to label preferences gave "5% improvement in F1" and "3% improvement in accuracy for determining when to ask" ([ICLR 2025](https://arxiv.org/abs/2410.13788)). The tool-use variant states the root cause: "LLMs tend to arbitrarily generate the missed argument" ([Learning to Ask](https://arxiv.org/abs/2409.00557)).
- **Users prefer the questions when they are precise.** In a coding-assistant study, a 73%-accurate clarity classifier gated question generation; participants preferred the system's clarifications in 68% of precision judgments and its final answers in 82% (p<0.001). The authors call false-positive questions "low-cost" overhead but did not measure burden ([Curiosity by Design](https://arxiv.org/html/2507.21285v1)).
- **Question fatigue has no direct measurement.** No paper found quantifies tolerance as a function of question count for spec elicitation; the best proxies are product caps: Spec Kit's "up to 5", Claude Code's "1-4 questions with 2-4 options", Lovable's one credit per plan-mode message. Treat "one batch of ≤4–5, multiple-choice with a recommended default" as the industry prior, not a finding.
- **Product shape of a good question.** Spec Kit requires each question to carry a "Why it matters" rationale and a recommended answer and accept "yes/recommended" as a reply ([clarify.md](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md)); Claude Code lets each option carry a rendered `preview` ("Compact" card vs "Detailed" card as HTML) ([Agent SDK](https://code.claude.com/docs/en/agent-sdk/user-input)). For a *design* spec, previewed options are the natural form — "which empty-state treatment?" is answered faster from two thumbnails than two sentences.
- **Interview-mode PRD generators exist** (ChatPRD's interview mode, per search results; its own codegen guide prescribes sections and warns to "be thorough yet concise" ([ChatPRD](https://www.chatprd.ai/learn/prd-for-ai-codegen)); Rovo will "Generate PRDs with user stories, acceptance criteria, and priorities from your source docs" ([Atlassian](https://www.atlassian.com/software/confluence/create-and-edit-with-rovo))). None targets screens/flows/data at the granularity the construction step needs.

**Implication:** Elicitation must be **schema-driven** (the intent schema defines the slots), **budgeted** (≤5 per round, one round by default), **previewed** where the choice is visual, and **written into the file** with a session stamp. Silent defaults go into an `assumptions` block rather than a question.

---

## 5. Form-like and structured-editor front-ends

**What it is:** Instead of chat, present the intent schema as a form or structured document. If `intent.yaml` has a JSON Schema (and doc 01 argues Zod is the source of truth), a schema-driven form is nearly free.

**Key findings:**

| Option | What you get | Fit for intent.yaml |
|---|---|---|
| **react-jsonschema-form (RJSF)** | "A simple React component capable of using JSON Schema to declaratively build and customize web forms"; 15.9k stars; `uiSchema` for presentation, AJV validation ([repo](https://github.com/rjsf-team/react-jsonschema-form)) | Good for the scalar/enum slots (fidelity, audience, non-goals, states); weak for nested `screens[].structure` lists that want drag-reorder |
| **JSON Forms** | "Declare your forms as JSON based on a JSON Schema"; separate data schema and UI schema; React/Angular/Vue ([jsonforms.io](https://jsonforms.io/)) | The UI-schema layer maps directly to doc 02's "layouts" idea; cross-framework is irrelevant here |
| **Formily** | Enterprise "form engine" (search-result characterization; not independently verified) | Overkill |
| **Notion/Coda/Confluence as spec store** | Rovo generates PRDs into Confluence with "user stories, acceptance criteria, and priorities" ([Atlassian](https://www.atlassian.com/software/confluence/create-and-edit-with-rovo)) | Databases give designers a familiar table UI, but the pipeline needs the record in git next to the construction file; use as a *source*, export to YAML |
| **Kiro's three files** | Requirements/design/tasks with EARS lines ([Kiro](https://kiro.dev/docs/specs/feature-specs/)) | A markdown "form" — headings are fields. The strongest precedent for **structured-but-prose**: EARS `WHEN … THE SYSTEM SHALL …` is a sentence template a designer can fill without knowing YAML |
| **Retool AppGen** | "treat your opening prompt like a product brief" ([HostAdvice review](https://hostadvice.com/ai-app-builders/retool-review/); secondary) | Confirms the brief-as-input norm; no structured editor |
| **Storybook-style spec preview** | No product does "spec preview" for intent; the nearest is Claude Code's per-option `preview` and Subframe's four-variant draft | Build it: render each `screens[]` entry as a low-fi block diagram from `structure` before construction |

**The YAML question, answered narrowly.** YAML's designer-hostile traits are real and documented: YAML 1.1 parses `no`, `off`, `n` as false (the Norway problem), `22:22` as base-60, and "toml is a friendly format without yaml's footguns" ([ruuda.nl](https://ruuda.nl/2023/the-yaml-document-from-hell)); the 2026 defense concedes "Configuration files are precisely the domain where surprising behavior is least tolerable" and that PyYAML "remains frozen at YAML 1.1 semantics" ([Posit, 21 May 2026](https://opensource.posit.co/blog/2026-05-21_in-defense-of-yaml/)). Two consequences: (1) designers should **never hand-type the file cold** — the model drafts it; (2) parse with a YAML 1.2 core-schema parser and **quote every string on write** so `status: NO` cannot become `false` in a fixture. Keep YAML as the review/diff surface (doc 03's decision) because markdown-in-YAML block scalars carry prose well and every plan-mode product above already uses a text file designers edit.

---

## 6. The spec granularity floor

**What it is:** How much intent must be present before construction quality stops collapsing (Q3). No study measures this for construction files; the nearest evidence is prompt-specificity research for code and UI generation.

**Key findings:**

- **The knee is early and the curve saturates.** PartialOrderEval built a partial order of prompts from minimal to maximal for the same tasks: Qwen2.5-Coder-14B rose from 0.280 to 0.860 pass@1 on HumanEval "with near-saturation by 100 words", and *declined* from 0.921 to 0.860 at 200-word prompts — "overly verbose prompts may introduce redundancy or cognitive overload". The components that mattered were "Input/Output Specifications", "Edge Case Handling", and "stepwise breakdowns"; "Task goals and algorithmic strategies appeared implicitly understood" ([PartialOrderEval](https://arxiv.org/html/2508.03678)). Mapped to intent.yaml: **sample data (I/O), states (edge cases), and structure (stepwise)** are the load-bearing slots; concept prose is not.
- **Smaller models need the spec more.** DETAIL: GPT-4 went 0.60→0.83 from vague to detailed prompts; o3-mini 0.34→0.68; "Decision-Making Scenarios exhibit almost no sensitivity (+0.02)" and detail sometimes hurt open-ended tasks ([DETAIL, Dec 2025](https://arxiv.org/html/2512.02246v1)). If construction runs on a small/cheap model, the floor is higher.
- **Supplying text content is worth ~2–5 block-match points.** Design2Code's text-augmented prompting (extracted strings supplied alongside the screenshot) moved GPT-4V block-match 85.8→87.6 and Gemini Pro Vision 80.2→84.8, because the model "could copy text content from the prompt and insert it into the correct positions" ([Design2Code](https://arxiv.org/html/2403.03163)). Real strings in `data.sample` are the construction-file analogue.
- **Practitioner guidance agrees on the same three slots.** v0: "Product surface", "Context of use", "Constraints & taste" ([Vercel](https://vercel.com/blog/how-to-prompt-v0)); ChatPRD's codegen PRD: overview, users/use cases, features, constraints, non-functional, out-of-scope ([ChatPRD](https://www.chatprd.ai/learn/prd-for-ai-codegen)); Retool: "product brief" with every page and data relationship.

**Proposed floor (to be tested in E4):** a screen is *constructible* when it has `purpose` (one line), `structure` (≥1 region in catalog or plain nouns), and a bound `data` collection with ≥1 realistic sample record. `states`, `interactions`, `audience` and `scope.out` are amplifiers. Everything below the floor is `fidelity: sketch` and routes to a throwaway generator, not the construction step.

---

## 7. Multi-fidelity intent and the promotion path

**What it is:** Can one format hold a whiteboard sketch and a handoff-grade spec (Q7), and how does a sketch become a spec?

**Key findings:**

- **Sketch-as-intent is mature but non-durable.** tldraw's make-real (Nov 2023) snapshots a selection to PNG and iterates by re-selecting old and new; its current guidance is dual serialization — "Sending both to the model works best: the image shows spatial relationships and styling, and the structured data gives exact text and positions" ([tldraw AI docs](https://tldraw.dev/docs/ai)). The structured half (shape JSON with text and positions) is exactly what a sketch→`screens[].structure` extractor needs. Fairies (Dec 2025) put agents *on* the canvas ([fairies.tldraw.com](https://fairies.tldraw.com/)). Uizard's scanner converts hand-drawn wireframes and lets users "Switch from high to low fidelity in an instant" ([Uizard](https://uizard.io/wireframe-scanner/)); Stitch's Annotate feeds marked-up screenshots back as edits ([UXPin](https://www.uxpin.com/studio/blog/google-stitch-ai-design-tool-updates-ui-ux/)). None writes a spec.
- **Relume is the working promotion ladder:** concept prompt → sitemap (structured, editable) → wireframe (real components, unstyled, with copy) → styled → export to Figma/Webflow/React ([Relume](https://www.relume.ai/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder)). Each rung adds a class of information (structure, then content, then style) without discarding the previous rung — the property a `fidelity` field must preserve.
- **Vision→structured extraction is a solved sub-problem.** Design2Code-family results (§6) show models reproduce block layout from screenshots at 80–89% block-match; extracting *regions and their nouns* (a much coarser target than pixel-faithful HTML) from a sketch is well within that.
- **Figma Make's attachment model** — attach the sketch, the CSV, the PDF; "let Make reference it directly" ([Figma](https://www.figma.com/blog/introducing-make-kits-and-make-attachments/)) — argues for `sources:` references in the spec rather than transcribing the sketch into prose.

**Recommendation:** one format, three declared fidelities, monotone promotion:

| `fidelity` | Required slots | Clarifier behavior | Output |
|---|---|---|---|
| `sketch` | `concept` + one of {`sources.sketch`, `screens[].purpose`} | None (no questions) | Throwaway render or Relume-style block diagram; **not** a construction file |
| `build` | §6 floor per screen; `data.sample` | One batched round, ≤5 | Construction file → build |
| `handoff` | `build` + `states` per screen, `interactions` as EARS, `scope.out`, resolved `open_questions` | Blocks until `open_questions` is empty | Construction file + fixtures + decision log |

Promotion is a spec edit (`fidelity: sketch → build`) that triggers the linter; demotion never deletes slots.

---

## 8. Where conversation state lives

**What it is:** Across sessions and tools, where do answers, assumptions and decisions persist (Q8)?

**Key findings:**

| Location | Precedent | Properties |
|---|---|---|
| **Inside the spec, stamped** | Spec Kit's `## Clarifications` / `### Session YYYY-MM-DD` with `Q → A` bullets that then propagate into sections ([clarify.md](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md)); Spec Kit's `[NEEDS CLARIFICATION]` markers | Diffable, travels with the file, survives tool switches; grows unless pruned |
| **Archived plan copies** | Lovable: approved plans archived "to a dated copy in `.lovable/plan/`" ([Lovable](https://docs.lovable.dev/features/plan-mode)) | Cheap history; not a decision log |
| **Standing project context** | Kiro steering: `product.md` / `tech.md` / `structure.md`, inclusion modes `always` / `fileMatch` / `manual` / `auto`, guidance to explain *why* decisions were made ([Kiro steering](https://kiro.dev/docs/steering/)); Claude Code `CLAUDE.md` ("target under 200 lines") vs auto memory (`MEMORY.md`, "first 200 lines or 25KB" loaded; types `user` / `feedback` / `project` / `reference`; skips "anything your CLAUDE.md files already say") ([Claude Code memory](https://code.claude.com/docs/en/memory)); Lovable Knowledge (10,000 chars) | Right for *product-wide* facts (audience, brand voice, non-goals that never change); wrong for per-prototype answers |
| **Decision records beside the spec** | OpenSpec's `spec-driven-with-adr` schema: ADRs live outside the change and persist after archive; "Specs represent the current state of the application's overall functionality … ADRs represent … how and why the system is built that way" ([intent-driven.dev, 29 Apr 2026](https://intent-driven.dev/blog/2026/04/29/spec-driven-development-with-adr/)); MADR templates ([adr.github.io](https://adr.github.io/)) | Answers "why did we pick per-line-item refunds?" six weeks later without reading chat |
| **Session store / chat history** | Claude Design's handoff bundle reportedly includes "the conversation history … so it knows why you made the design decisions" ([dev.to](https://dev.to/bilelsalemdev/from-prompt-to-pull-request-using-claude-design-claude-code-and-github-together-3m00); secondary); Claude Code `--resume` | Lossy on tool change; unreviewable; this is the "vibe" failure doc 02 §6 warns about |

**Recommendation:** three tiers, all files, no session store. (1) **Product-level** facts go in the catalog skill / `CLAUDE.md`-style steering (audience, brand, permanent non-goals) — Kiro's `product.md` is the model. (2) **Prototype-level** conversation state goes *in* `intent.yaml`: a `clarifications` log stamped per session, an `assumptions` block the model must append to whenever it defaults silently, and `open_questions`. (3) **Decisions with rationale** get a one-line `decisions` entry (ADR-lite: `id`, `decision`, `because`, `date`) in the same file; promote to a standalone ADR only if reused across prototypes. Eisele's exit rule applies: once the prototype graduates, delete `clarifications` and keep `decisions` — the construction file and fixtures are the executable residue.

---

## 9. Recommended authoring model

**Conversational elicitation that writes the file, a schema-driven form view of the same file, and a canvas/attachment entry ramp** — one artifact, three surfaces:

1. **Entry:** the designer supplies *anything* — a sentence, a FigJam board (via MCP `get_figjam`), a sketch image, a CSV, an existing Figma frame. A drafter agent writes `intent.yaml` at `fidelity: sketch`, transcribing nothing it can reference via `sources:` (Figma Make's attachment principle) and extracting `screens[].structure` from images using image+structured dual input (tldraw's rule).
2. **Clarify (deterministic gate + model questions):** a slot-linter derived from the intent JSON Schema computes `completeness` per screen against the §6 floor. Only if the designer requests `build` does the clarifier run: ≤5 questions in one batch, multiple-choice with a recommended default and a rendered preview where the choice is visual (Claude Code `AskUserQuestion` shape), scored by Spec Kit's Impact × Uncertainty over doc 02's slots (data and states first). Answers are written to `clarifications` with a session stamp; silent defaults to `assumptions`.
3. **Edit surface:** the designer never sees raw YAML by default. A JSON Forms/RJSF view renders the schema (enums as chips, `screens[]` as a reorderable list, `structure` as a block strip preview); the YAML tab and git diff are for reviewers. Strings are always quoted on write; YAML 1.2 core schema on read.
4. **Approve → construct:** approval is a button that sets `fidelity: build` and hands the file to the construction step. Reactions to the rendered prototype come back as spec edits (regenerate) or construction-file patches (doc 05), never as chat-only instructions.

This matches what Figma Make, Lovable, Claude Code and Spec Kit each ship in part; the additions are the deterministic completeness floor and the form view over the same file.

---

## 10. Revised intent.yaml sketch

```yaml
# intent.yaml — v2 sketch. Drafted by the model, edited via form or text; strings always quoted.
prototype: "order-refunds-console"
fidelity: "build"                      # sketch | build | handoff  (monotone promotion, §7)
concept: "Support agents find an order and issue a partial or full refund in under a minute."
audience: "@steering/product.md#support-agents"   # product-level facts live outside this file (§8)
sources:                               # reference, don't transcribe (Figma Make attachment principle)
  - { kind: "figjam", ref: "https://www.figma.com/board/…", note: "flow sketch, 2026-08-28" }
  - { kind: "csv",    ref: "./fixtures/orders-sample.csv" }
scope:
  in:  ["order search", "order detail", "refund modal", "success state"]
  out: ["auth", "real payments", "editing orders"]
data:
  order:
    sample: "./fixtures/orders-sample.csv"   # ≥1 realistic record is part of the floor (§6)
    volume: 25
    variants: ["fulfilled", "refunded", "partially_refunded"]
screens:
  - id: "orders-list"
    purpose: "find an order fast"
    structure: ["page-header", "filter-bar", "data-table"]
    states: ["populated", "empty-search", "loading"]
    interactions:
      - { when: "user selects a table row", then: "navigate to order-detail" }   # EARS shape
    completeness: { floor: true, amplifiers: ["states", "interactions"] }         # linter-written
  - id: "refund-modal"
    purpose: "choose full/partial refund with clear consequence preview"
    structure: ["dialog", "radio-group", "amount-input", "action-bar"]
    states: ["default", "partial-selected", "submitting", "error"]
    completeness: { floor: true, amplifiers: ["states"] }
assumptions:                           # model MUST append here whenever it defaults silently (§4)
  - { slot: "screens.orders-list.states.empty-search", value: "catalog default EmptyState", by: "model", at: "2026-09-02" }
clarifications:                        # Spec Kit-style session log; pruned at graduation (§8)
  - session: "2026-09-02"
    qa:
      - { q: "Partial refund per line item or free amount?", a: "per line item", impact: "data, refund-modal structure" }
decisions:                             # ADR-lite; survives graduation
  - { id: "D1", decision: "per-line-item partial refunds", because: "matches finance reconciliation", at: "2026-09-02" }
open_questions:
  - "Should a refunded order remain in the default list filter?"
```

---

## 11. Tradeoffs

| Choice | Gain | Cost | Evidence |
|---|---|---|---|
| Model drafts, human edits (vs designer writes YAML) | Removes the YAML footgun and blank-page problem; matches every shipping plan-mode product | Designer must still *read* structure; drafts embed silent assumptions | Figma Make/Lovable/Cursor plan files; Norway problem ([ruuda.nl](https://ruuda.nl/2023/the-yaml-document-from-hell)) |
| Deterministic completeness floor before questions | Questions only when needed; no asking on `sketch` | Floor is a hypothesis until E4 runs | PartialOrderEval saturation at ~100 words; Ask-or-Assume "conserving queries on simple tasks" |
| ≤5 batched multiple-choice questions | Bounded fatigue; answers land in the file | May miss a sixth, critical ambiguity | Spec Kit cap; Claude Code 1–4 cap; no direct fatigue data |
| Form view over the same file (vs form as the only surface) | Designers get chips and lists; reviewers get diffs | Two renderers to maintain; nested lists are RJSF's weak spot | RJSF/JSON Forms |
| Conversation state in the spec (vs session store) | Tool-portable, reviewable, survives resume | File grows; needs pruning at graduation | Spec Kit Clarifications; Eisele's "second codebase" |
| One format, three fidelities | Monotone promotion; no re-entry cost | Linter complexity; risk of premature convergence in `sketch` | Relume ladder; Uizard fidelity toggle |
| Reference sources, don't transcribe | Sketch/CSV stay canonical | Model must fetch at construction time; MCP dependency | Figma Make attachments; tldraw dual serialization |

---

## 12. Open questions

1. **Does the form view get used?** Figma Make and Lovable ship only a markdown editor; no data says designers want fields over prose. The form may be for *reviewers*.
2. **Question budget for design vs code.** All caps come from coding tools; visual choices with previews may tolerate more questions, or fewer.
3. **Sketch extraction accuracy for `structure`.** Design2Code numbers are for screenshots of real sites; hand sketches with catalog-noun labeling are unmeasured.
4. **Who prunes `clarifications`?** Eisele's expiry rule needs a trigger (graduation? merge?) and an owner.
5. **Catalog context suppresses asking.** Knowing-but-Not-Showing's finding that context lowers clarification rates means the clarifier may need to run *without* the catalog in context — untested.
6. **Small-model floor.** If construction runs on a cheaper model, DETAIL suggests the floor rises; the linter may need a per-model threshold.

---

## 13. Recommended experiments

1. **E4′ — Floor ablation (extends doc 00's E4):** 8 screens × {sketch-only, floor, floor + states, floor + states + interactions, full} → construction validity, states covered, hand-fix minutes. Locate the knee; confirm or move the §6 floor.
2. **Clarifier A/B:** same partial specs, three clarifier settings — none (assume + log), ≤3 questions, ≤5 questions with previews; measure construction quality delta and designer-reported burden (5 designers). Pair with a catalog-in-context vs catalog-out condition to test open question 5.
3. **Authoring-surface study:** 3 designers × 3 surfaces (markdown/YAML editor, JSON Forms view, chat-only) on the same brief with a 15-minute cap; measure completeness score reached, errors introduced (unquoted scalars, broken lists), and preference.
4. **Sketch → structure extraction:** 20 hand sketches + FigJam boards → `screens[].structure`; score region recall and catalog-noun precision against a designer-labeled key; compare image-only vs image+shape-JSON (tldraw's claim).
5. **State-in-file durability:** resume five prototypes after a week in a fresh session with only `intent.yaml`; count re-asked questions and wrong regenerations vs a session-store baseline.

---

## 14. Candidate picks for skill-resources

- **Spec Kit `clarify.md` template** — https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md — the best-specified clarification protocol (9 categories, ≤5 questions, Impact × Uncertainty, in-file `Clarifications` log); adaptable verbatim to intent slots.
- **Spec Kit methodology essay** — https://github.com/github/spec-kit/blob/main/spec-driven.md — `[NEEDS CLARIFICATION]` and the specify/plan split the pipeline already borrows.
- **Kiro feature specs + steering docs** — https://kiro.dev/docs/specs/feature-specs/ · https://kiro.dev/docs/steering/ — EARS sentence template and the product/tech/structure steering split.
- **OpenSpec** — https://github.com/Fission-AI/OpenSpec — delta markers and archive-merge model for spec changes; pair with the ADR schema post https://intent-driven.dev/blog/2026/04/29/spec-driven-development-with-adr/.
- **Claude Code Agent SDK: user input / AskUserQuestion** — https://code.claude.com/docs/en/agent-sdk/user-input — the 1–4 × 2–4 question shape with HTML option previews; the reference UI for visual clarifiers.
- **Claude Code memory docs** — https://code.claude.com/docs/en/memory — CLAUDE.md vs auto-memory split; the model for product-level vs prototype-level state.
- **Figma Make plan mode** — https://help.figma.com/hc/en-us/articles/40830441709719-Use-plan-mode-in-Figma-Make — the designer-facing `plan.md` gate to emulate.
- **Lovable plan mode + Knowledge** — https://docs.lovable.dev/features/plan-mode · https://docs.lovable.dev/features/knowledge — dated plan archive and 10k-char project context.
- **tldraw AI docs / agent starter** — https://tldraw.dev/docs/ai · https://github.com/tldraw/agent-template — dual (image + shape JSON) serialization for sketch→structure.
- **JSON Forms** — https://jsonforms.io/ — data-schema/UI-schema split for the form view; **RJSF** — https://github.com/rjsf-team/react-jsonschema-form — simpler React-only alternative.
- **Relume site builder docs** — https://www.relume.ai/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder — sitemap→wireframe as the structured-intent precedent.
- **spec-compare** — https://github.com/cameronsjo/spec-compare — living comparison of 18 SDD tools, reassessed Aug 2026.
- **Critiques to keep honest:** Böckeler https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html · Eisele https://www.the-main-thread.com/p/spec-driven-development-exit-strategy · Wong https://rogerwong.me/2026/03/spec-driven-development.
- **Research:** Knowing but Not Showing https://arxiv.org/html/2605.25284v1 · Ask or Assume https://arxiv.org/abs/2603.26233 · PartialOrderEval https://arxiv.org/html/2508.03678 · DETAIL https://arxiv.org/html/2512.02246v1.

---

## 15. Sources

**Spec-driven development**
- GitHub Spec Kit — https://github.com/github/spec-kit · clarify template — https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/clarify.md · methodology — https://github.com/github/spec-kit/blob/main/spec-driven.md
- Kiro feature specs — https://kiro.dev/docs/specs/feature-specs/ · best practices — https://kiro.dev/docs/specs/best-practices/ · steering — https://kiro.dev/docs/steering/
- OpenSpec — https://github.com/Fission-AI/OpenSpec
- Tessl spec-driven-development tile — https://github.com/tesslio/spec-driven-development-tile (docs.tessl.io page returned 404)
- BMAD update, May 2026 — https://www.bmadcode.com/bmad-update-may-2026-web-bundles-prd-brief-platforms/
- spec-compare — https://github.com/cameronsjo/spec-compare
- Böckeler, Understanding SDD (15 Oct 2025) — https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html
- Eisele, SDD Needs an Exit Strategy (15 Jul 2026) — https://www.the-main-thread.com/p/spec-driven-development-exit-strategy
- Wong, SDD Looks Like Waterfall (4 Mar 2026) — https://rogerwong.me/2026/03/spec-driven-development
- Claude Code permission modes / plan mode — https://code.claude.com/docs/en/permission-modes · Agent SDK user input — https://code.claude.com/docs/en/agent-sdk/user-input · memory — https://code.claude.com/docs/en/memory
- Cursor plan mode (7 Oct 2025) — https://cursor.com/blog/plan-mode
- Windsurf planning mode — docs URL redirected to docs.devin.ai and returned 404 (not verified)

**Designer-facing surfaces**
- Figma Make plan mode — https://help.figma.com/hc/en-us/articles/40830441709719-Use-plan-mode-in-Figma-Make · Make kits & attachments (2 Apr 2026) — https://www.figma.com/blog/introducing-make-kits-and-make-attachments/ · First Draft → agent — https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI · Config 2026 — https://help.figma.com/hc/en-us/articles/39582753756695-What-s-new-from-Config-2026
- Claude Design announcement (17 Apr 2026) — https://www.anthropic.com/news/claude-design-anthropic-labs · design-system setup — https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design · admin guide — https://support.claude.com/en/articles/14604406-claude-design-admin-guide-for-team-and-enterprise-plans · handoff write-up (secondary) — https://dev.to/bilelsalemdev/from-prompt-to-pull-request-using-claude-design-claude-code-and-github-together-3m00 · brand-guidelines update: https://www.digitaltrends.com/computing/claude-design-will-now-stick-to-your-brand-guidelines-instead-of-generic-ai-mockups/ and Yahoo mirror returned 403 (not verified)
- v0, How to prompt v0 (15 Dec 2025) — https://vercel.com/blog/how-to-prompt-v0
- Lovable plan mode — https://docs.lovable.dev/features/plan-mode · Knowledge — https://docs.lovable.dev/features/knowledge
- Bolt plan/discussion mode — https://support.bolt.new/best-practices/discussion-mode
- Subframe design systems — https://www.subframe.com/design-systems
- Paper review (secondary) — https://www.banani.co/blog/paper-design-mcp-review
- Relume wireframes doc — https://www.relume.ai/resources/docs/how-to-create-and-edit-wireframes-in-the-relume-site-builder (sitemap doc URL returned 404)
- Framer AI review (secondary, not verified) — https://superdesign.dev/blog/framer-ai-review
- Google Stitch (UXPin, 13 Apr 2026) — https://www.uxpin.com/studio/blog/google-stitch-ai-design-tool-updates-ui-ux/ · stitch.withgoogle.com served no verifiable content
- Uizard wireframe scanner — https://uizard.io/wireframe-scanner/
- tldraw AI docs — https://tldraw.dev/docs/ai · fairies — https://fairies.tldraw.com/ · agent template — https://github.com/tldraw/agent-template
- Retool review (secondary) — https://hostadvice.com/ai-app-builders/retool-review/

**Clarification research**
- Knowing but Not Showing (24 May 2026) — https://arxiv.org/html/2605.25284v1
- Ask or Assume? (2026) — https://arxiv.org/abs/2603.26233
- Modeling Future Conversation Turns (ICLR 2025) — https://arxiv.org/abs/2410.13788
- Learning to Ask / Ask-when-Needed — https://arxiv.org/abs/2409.00557
- Curiosity by Design — https://arxiv.org/html/2507.21285v1
- Clarifying questions for preference elicitation — https://arxiv.org/abs/2510.12015

**Spec granularity**
- PartialOrderEval — https://arxiv.org/html/2508.03678
- DETAIL (Dec 2025) — https://arxiv.org/html/2512.02246v1
- Design2Code — https://arxiv.org/html/2403.03163
- ChatPRD, PRDs for AI codegen — https://www.chatprd.ai/learn/prd-for-ai-codegen

**Forms, spec stores, decision logs**
- react-jsonschema-form — https://github.com/rjsf-team/react-jsonschema-form · JSON Forms — https://jsonforms.io/ · Form.io comparison — https://form.io/json-schema-forms-formio-rjsf-jsonforms-surveyjs-compared/
- Atlassian Rovo in Confluence — https://www.atlassian.com/software/confluence/create-and-edit-with-rovo
- ADRs with OpenSpec (29 Apr 2026) — https://intent-driven.dev/blog/2026/04/29/spec-driven-development-with-adr/ · ADR home — https://adr.github.io/

**YAML**
- The YAML document from hell — https://ruuda.nl/2023/the-yaml-document-from-hell
- In Defense of YAML (Posit, 21 May 2026) — https://opensource.posit.co/blog/2026-05-21_in-defense-of-yaml/
