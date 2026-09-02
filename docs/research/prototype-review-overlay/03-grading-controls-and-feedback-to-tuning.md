# Grading Controls in the Review Overlay and the Path Back to Tuning (2026)

**Scope.** This document answers one question: *what grading controls belong in a drop-in review overlay, what should the human grade record contain so a tuning loop can use it, and where should that record go?* The overlay is the JS package this stream designs — included in every generated prototype, single-file HTML or Vite/React/Next dev app, used by a small shared team. Out of scope: the element-comment layer and DOM anchoring, capturing generation context (assumed to arrive as a `generator` block), machine grading, judge calibration, and the loop itself, which live in the sibling overlay docs and in [eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md) (the full grade record), [02](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) (review cards, annotation tooling, anchoring), [03](../eval-tuning-loops/03-feeding-grades-back-text-level.md) (the altitude ladder) and [skill-resources/eval-loops.md](../../../skill-resources/eval-loops.md). Existing feedback surfaces on hosted prototypes are in [design-sdlc/02](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md). This is the *in-page control and its record*, not the loop. Every vendor claim was checked on 2 September 2026; sources are marked "fetched OK" or "search-verified only"; unverifiable items say "not verified."

---

## Table of Contents

1. [In-product grading UX that already exists](#1-in-product-grading-ux-that-already-exists)
2. [Feedback SDKs that capture a human score in the browser](#2-feedback-sdks-that-capture-a-human-score-in-the-browser)
3. [Annotation-tool patterns worth copying](#3-annotation-tool-patterns-worth-copying)
4. [What the human grade record must contain](#4-what-the-human-grade-record-must-contain)
5. [Where the grade should go](#5-where-the-grade-should-go)
6. [How a grade gets consumed](#6-how-a-grade-gets-consumed)
7. [Biases and pitfalls of in-page grading](#7-biases-and-pitfalls-of-in-page-grading)
8. [Cross-cutting themes](#cross-cutting-themes)
9. [Recommendations](#recommendations)
10. [Templates](#templates)
11. [Candidate picks for skill-resources](#candidate-picks-for-skill-resources)
12. [Sources](#sources)

---

## 1. In-product grading UX that already exists

### What it is
The thumbs up/down under every AI response, what follows a thumbs-down (categories, free text, both), and whether any product asks for a comparison rather than a verdict.

### Why it matters
Reviewers will judge the overlay against these controls, and the products have already run the experiment on what people fill in. The surviving pattern is the floor; the pairwise prompt shows what is possible when the goal is a training signal.

### Key findings
- **ChatGPT: binary → five categories → optional text.** After a thumbs-down: "This is not true," "This is not helpful," "This is harmful or unsafe," "This does not follow my instructions," "Something else," plus "a space to type your own note" ([Code Carbon, June 2026](https://codecarbon.com/where-is-the-option-on-chatgpt-to-give-feedback-and-report-issues/), fetched OK; OpenAI's help center returned 403). ChatGPT is also the only mainstream product collecting a **rank**: with two candidates it asks "Which response do you prefer? Your choice will help make ChatGPT better" ([OpenAI community, June 2024](https://community.openai.com/t/feature-request-for-which-response-do-you-prefer/807079), fetched OK).
- **Claude.ai: binary → issue-type dropdown → text.** The modal asks "What type of issue do you wish to report" and "What was unsatisfying about this response" before Submit ([Guideflow, updated 4 March 2026](https://www.guideflow.com/tutorial/how-to-give-negative-feedback-on-a-response-in-claudeai), fetched OK); dropdown values not verified. Team/Enterprise owners can disable "Rate chats" for the org ([Claude help](https://support.claude.com/en/articles/10504844-manage-user-feedback-settings-on-team-and-enterprise-plans), fetched OK) — a grade carries context with it, and admins want a switch.
- **Gemini: "Good response / Bad response" → optional reason → optional text → optional attachments.** Users "can select a reason" (example: "Offensive / Unsafe"), "enter additional feedback," and include "the files and/or images uploaded before this response"; work-Pro and school accounts cannot add text ([Gemini Apps Help](https://support.google.com/gemini/answer/13275746?hl=en&co=GENIE.Platform%3DDesktop), fetched OK). Attaching context is the closest analogue to carrying the `generator` block.
- **Coding and prototyping tools stop at the binary.** Copilot Chat documents only thumbs icons "next to the response" in VS Code and Xcode ([GitHub Docs](https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide), fetched OK). Lovable: "Helpful / Not helpful: Rate the response to give feedback on the result," nothing after ([Lovable docs](https://docs.lovable.dev/features/projects/chat), fetched OK). v0 has a thumbs-down ([Vercel community, Nov 2025](https://community.vercel.com/t/feedback-v0-usability-issues/27287), fetched OK) with no documented follow-up. Figma Make results carry thumbs up/down per forum posts ([Figma forum](https://forum.figma.com/suggest-a-feature-11/figma-make-credit-management-idea-49333), search-verified only). Cursor's agent docs contain no rating control ([Cursor docs](https://cursor.com/docs/agent/overview), fetched OK — none found); Bolt: not verified. Microsoft Copilot Studio ships thumbs on by default with an optional comment prompt ([Microsoft Learn](https://learn.microsoft.com/en-us/power-platform/release-plan/2025wave1/microsoft-copilot-studio/collect-thumbs-up-or-down-feedback-comments-agents), search-verified only).
- **Done well** means: binary verdict; a *short* fixed list (five is the ceiling anyone ships); text optional on up, prompted on down; context attached automatically. No prototyping tool does the last three, and none anchors a thumbs-down to a *part* of the output — for a UI the element is the unit.
- **"Rank, don't score" with one version on screen.** Humans agree far better on pairs (Design2Code κ 0.46 pairwise vs 0.26–0.32 direct; UICrit 0.55 rankings vs 0.29 ratings — [01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md)). ChatGPT gets pairs by generating two answers; the overlay can get them by **comparing with the previous version** known to the ledger ([prototype-governance.md](../../../skill-resources/prototype-governance.md)): open it in a split or toggle, randomize which is "A," ask "which is better for the brief?", allow a tie.

### Open questions
- No product publishes what fraction of thumbs-downs carry a category or text; the overlay should log both rates from day one.
- Whether reviewers will open a previous version to compare, unprompted, is untested.

---

## 2. Feedback SDKs that capture a human score in the browser

### What it is
Vendor SDKs and endpoints that accept a human score from client code and attach it to a trace.

### Why it matters
If the overlay ever writes to an eval platform, its record must map onto that schema and the write must be safe from a browser — no secret key in a single-file artifact. The schemas are also the best evidence of what a "score" has converged on.

### Key findings
- **Browser-safe writes exist in two platforms.** Langfuse's `@langfuse/browser` "only requires your public key; never expose a Langfuse secret key in frontend code," with `langfuse.score({ traceId, id, name, value, dataType: "BOOLEAN", comment })` ([Langfuse](https://langfuse.com/docs/observability/features/user-feedback), fetched OK). LangSmith uses a **presigned feedback token**: the server calls `create_presigned_feedback_token(run_id, feedback_key, expiration, feedback_config)` (default three hours) and the browser POSTs `score`, `comment`, `correction`, `metadata` to `token.url` with no key ([LangSmith](https://docs.langchain.com/langsmith/presigned-feedback-tokens), fetched OK). Everyone else needs a bearer key — a dev-server proxy in Vite/Next, impossible in a single file.
- **Schemas have converged on six fields** — name, value, comment, a source marker, a trace/span id, an idempotency id:

| Platform | Record shape (fetched OK unless noted) | Human marker | Browser write | Free tier |
|---|---|---|---|---|
| [Langfuse](https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk) | `name`, `value`, `dataType` ∈ NUMERIC/CATEGORICAL/BOOLEAN/TEXT, `traceId`/`observationId`/`sessionId`, `id`, `configId`, `comment`; configs validate | config + comment | Yes, public key | 50k units, **2 users**, 30 days; Core $29 ([pricing](https://langfuse.com/pricing)) |
| [LangSmith](https://docs.langchain.com/langsmith/feedback-data-format) | `run_id`, `key`, `score`, `value` (categorical), `comment`, `correction`, `feedback_source.type` ∈ api/app/evaluator, `user_id` | `feedback_source` | Yes, token | **1 seat**, 5k traces, 14 days; Plus $39/seat ([pricing](https://www.langchain.com/pricing-langsmith)) |
| [Braintrust](https://www.braintrust.dev/docs/api-reference/logs/feedback-for-project-logs-events) | `POST /v1/project_logs/{id}/feedback`: `id`, `scores` (0–1), `expected`, `comment`, `metadata`, `source` ∈ external/app/api, `tags` | `source` | No, bearer | Unlimited users, 1 GB, 14 days, 10k scores; Pro $249 ([pricing](https://www.braintrust.dev/pricing)) |
| [Phoenix](https://arize.com/docs/phoenix/tracing/how-to-tracing/feedback-and-annotations/capture-feedback) | `POST /v1/span_annotations`: `span_id`, `name`, `annotator_kind` ∈ HUMAN/LLM/CODE, `result.{label,score,explanation}`, `metadata`, `identifier` (upsert) | `annotator_kind` | No, API key; TS `@arizeai/phoenix-client` | OSS |
| [Opik](https://www.comet.com/docs/opik/reference/rest-api/spans/add-span-feedback-score) | `name`, `value`, `source` ∈ ui/sdk/online_scoring, `category_name`, `reason` | `source` | No | 25k spans, 10 members, 60 days; Pro $19 ([pricing](https://www.comet.com/site/pricing/)) |
| [Weave](https://docs.wandb.ai/weave/guides/tracking/feedback/) | `add_reaction`, `add_note` (≤1,024 chars), `feedback.add` (≤1 KB); annotation scorers boolean/integer/string/enum | scorer | No; "TypeScript SDK does not yet support feedback" | 1 GB/mo; Pro from $60 ([pricing](https://wandb.ai/site/pricing/)) |
| [Helicone](https://docs.helicone.ai/features/advanced-usage/feedback) | `rating: boolean` only; no bulk endpoint | none | No | — |
| [PostHog](https://posthog.com/docs/ai-observability/collect-user-feedback) | Survey events with `$ai_trace_id`; `useThumbSurvey` hook | survey | Yes, project key | 100k AI events, 1,500 survey responses, no card ([pricing](https://posthog.com/pricing)) |
| [Sentry](https://docs.sentry.io/platforms/javascript/user-feedback/) | `captureFeedback({ message, name, email, associatedEventId, attachments })` | none | Yes, DSN | Developer plan shows no User Feedback allowance ([pricing](https://sentry.io/pricing/)) |
| Humanloop | offline since 8 Sep 2025; team joined Anthropic ([HN](https://news.ycombinator.com/item?id=44592216), search-verified only) | — | — | — |

- **Nobody's schema has a defect list with locations.** Every platform stores one value per name plus a comment; a UI grade is several located, categorized defects. The only carrier is one score per criterion plus JSON in `metadata`/`correction` — Weave's 1 KB cap rules it out. Same finding as [eval-tuning-loops/05](../eval-tuning-loops/05-loop-architecture-and-governance.md): no platform knows what a prototype is.
- **Free tiers are hostile to a shared team** (two users, one seat, 14–30-day retention). Braintrust and Opik fit a team but refuse browser writes.
- **Copy the idempotency key.** Langfuse `id`, Phoenix `identifier`, LangSmith's single `feedback_key` all make a resubmission an update; the overlay's `grade_id` must be deterministic.

### Open questions
- Could the generating Claude Code session mint a presigned token and embed it in the artifact? It expires in hours unless extended.

---

## 3. Annotation-tool patterns worth copying

### What it is
Conventions from tools built for fast, reliable labels — Prodigy, Argilla, Label Studio, Braintrust review, Langfuse queues, Anthropic's eval guidance — reduced to what a two-minute in-page review should borrow.

### Why it matters
[02 §4–5](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md) established that "the interface is the reviewer's accuracy." The overlay never gets an annotation team; reliable behaviour must be the default.

### Key findings
- **Single-key verdicts, three-way answers.** Prodigy: `a` accept, `x` reject, `space` ignore, `backspace` undo, stored as `"answer": accept|reject|ignore`, designed to reduce "each annotation to simple and intuitive decisions" ([Prodigy](https://prodi.gy/docs/api-web-app), fetched OK). Argilla: Enter submits, Cmd/Ctrl+S drafts, Backspace discards, number keys pick labels, arrows navigate; four states — pending, draft, discarded, submitted ([Argilla](https://docs.argilla.io/latest/how_to_guides/annotate/), fetched OK). Langfuse queues: "arrow keys to navigate, number keys to pick" ([02 §4](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)). A verdict is one keystroke; "unsure" and "skip" are first-class; a half-finished grade is a draft.
- **Time and skip are recorded.** Label Studio's annotation JSON has `lead_time` ("time in seconds to label the task"), `was_cancelled` (skipped), `completed_by`, `ground_truth` ([Label Studio](https://labelstud.io/guide/task_format), fetched OK). Time-on-task is the cheapest fatigue signal (§7).
- **Binaries before the overall call.** CheckEval's decomposed yes/no raised cross-judge agreement by 0.45 ([01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)); Anthropic's guidance uses binary classifiers for anything objective, Likert only for tone, and wants a rationale on human grades ([Claude docs](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests), fetched OK). Braintrust review offers categorical, continuous, and free-form scores "written to `metadata` or `expected` at a specified path" ([Braintrust](https://www.braintrust.dev/docs/annotate/human-review), fetched OK); its review-mode shortcuts are not verified.
- **Blind-first is configuration.** Label Studio locks a task under annotation and can require "minimum annotations per task" above one ([labeling guide](https://labelstud.io/guide/labeling), fetched OK); Braintrust's score visibility hides other scores in the review modal but "is a display filter, not a security boundary." For the overlay: `generator`, prior grades, and machine scores stay collapsed until the verdict commits, and the record stores whether they were revealed.
- **Rationale is the training signal; mandatory on reject.** Galileo, Braintrust, and Hamel Husain converge on a binary plus a critique "a new employee could understand" ([02 §2, §5](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)). Claude.ai's modal is the consumer version. Refuse a reject with no defect *and* no sentence.

### Open questions
- Prodigy's `ignore` means "bad data," not "cannot judge." The overlay needs `skip` (not my call) and `unsure` (looked, undecided), each with a reason.

---

## 4. What the human grade record must contain

### What it is
The subset of the full grade record ([01](../eval-tuning-loops/01-grading-generated-prototypes.md); [eval-loops.md Templates](../../../skill-resources/eval-loops.md)) a human in the browser can produce, plus a fixed "what was wrong" taxonomy.

### Why it matters
The full record's `gates`, judge `dimensions` and grader `provenance` are machine fields. What the machine cannot fill — verdict, severity, located defects with a category, a sentence of reasoning — must arrive in the loop's shape or someone retypes it.

### Key findings
- **Verdict is accept / reject / unsure, never a number.** Anthropic and CheckEval favour binaries; the κ evidence says absolute scores are noise. So: three-way verdict, binary checklist, optional pairwise against the previous version. No sliders, no stars.
- **Checklist items reuse the loop's dimension names** — hierarchy, copy, on-system, states, routes ([01 §2](../eval-tuning-loops/01-grading-generated-prototypes.md)) — so human and judge checklists compare per criterion, which calibration needs ([02 §2](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).
- **Every defect needs location, category, severity.** Visual-SDPO's fix attribution depends on locations ([01 §4](../eval-tuning-loops/01-grading-generated-prototypes.md)); UICrit critiques carry bounding boxes. The overlay has the DOM: selector + normalized bbox + visible text + *state* (open menu, breakpoint). Severity stays human ([02 Recommendations](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).
- **The taxonomy must be small, fixed, and mapped to levers.** Published sources overlap heavily:

| Source | Categories |
|---|---|
| [UICrit](https://arxiv.org/html/2407.08850v2) (fetched OK), 11,344 designer critiques | Layout (position, alignment, hierarchy, grouping), Color contrast, Text readability, Usability of buttons, Learnability |
| [UXBench](https://arxiv.org/html/2606.16262) (fetched OK), seven dimensions | Goal-state clarity, Navigation scent, Action feedback, Flow efficiency, Error recovery, Trust transparency, Scanability and accessibility |
| [Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/) (fetched OK) | Visibility of status, Real-world match, User control, Consistency, Error prevention, Recognition, Flexibility, Minimalist design, Error recovery, Help |
| Repo record ([01](../eval-tuning-loops/01-grading-generated-prototypes.md)) | on_system_rate, state_coverage, route_coverage, hierarchy, copy; gates for schema, errors, axe, raw values, dead links |

  Collapsed to what a generator can be *tuned* on: `wrong-intent`, `off-system`, `hierarchy`, `layout`, `missing-state`, `interaction`, `copy`, `a11y`, plus `other` (see Templates). The membership test: a category with no fix lever in §6 is a comment, not a grade category.
- **Provenance is inherited.** The `generator` block is copied verbatim; the overlay adds only its own version, taxonomy and rubric versions, and emit channel. Without `generator`, the change record's "Motivating grades" line ([03 Template](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) has nothing to point at.
- **Rater identity, blindness, time:** `rater.id`, `blind`, `seconds`, `revealed_at` — what the weekly review needs for override rates, autopilot detection, and anchor-set eligibility ([02 §7](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).

### Open questions
- Whether `unsure` counts as half a reject in aggregates; excluding it and tracking its rate is the conservative default.
- The taxonomy will drift; version it and treat the `other` rate as the alarm ([02 §6](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)).

---

## 5. Where the grade should go

### What it is
The output target: (a) repo grade record + ledger as JSON; (b) an eval platform via adapter; (c) GitHub Issues/Discussions; (d) a generic export with adapters.

### Why it matters
The choice decides whether a Claude Code skill-improvement loop reads grades without a network call, whether the single-file case works, whether teammates see each other's grades, and whether a grade is diffable a month later.

### Key findings
- **The loop already names the store.** [Eval-loops.md Recipe A](../../../skill-resources/eval-loops.md) writes machine grades to `evals/grades/${proto}-<timestamp>.json`; Recipe B reads a record's `human` block before promoting an exemplar; the ledger is `docs/prototypes/ledger.md` keyed by `PROTO-` ids. A human grade as a sibling JSON joins the grade table with no plumbing, is read with `Read`, and is versioned by its commit.
- **Eval platforms fail the constraints.** Only Langfuse and LangSmith accept browser writes; their free tiers seat one or two people; retention is shorter than an iteration; no defect locations; and the vendor becomes the system of record, which [eval-loops.md](../../../skill-resources/eval-loops.md) warns against. They are a fine *secondary* sink for teams already tracing there.
- **GitHub Issues: good conversation, poor record.** `gh issue create --title --body-file --label` runs non-interactively ([GitHub CLI](https://cli.github.com/manual/gh_issue_create), fetched OK); issue forms support `dropdown`, `checkboxes`, `required: true`, auto-labels ([GitHub Docs](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms), fetched OK), so a form can enforce the taxonomy. But the output is markdown to parse, needs `gh` auth (absent in a single file), and Discussions need the GraphQL `createDiscussion` mutation, no REST ([GitHub Docs](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions), fetched OK). The `@claude` Action already turns issue comments into work ([design-sdlc/02 §4](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md)) — right for *disputed* grades.
- **Single-file forces a no-server path.** `localStorage` for drafts; `navigator.clipboard.writeText` (Baseline since March 2020, secure context — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText), fetched OK) for "copy as agent prompt"; a JSON download; `showSaveFilePicker` is "not Baseline" and needs HTTPS plus user activation ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker), fetched OK), so an enhancement only.
- **Vite/Next has a trivial server.** A dev-only `POST /__review/grade` middleware writing `evals/grades/<proto>-<rater>-<ts>.json` is a few dozen lines, localhost-only, no auth, and can fan out to an adapter.

**Verdict: (a), with (d)'s export as the wire format.** One JSON document; primary sink `evals/grades/` (dev endpoint, or download/clipboard then commit); GitHub Issues for disputes; platform adapter optional. Decision table under Recommendations.

### Open questions
- Multiple reviewers produce multiple files; a hook-regenerated `grades/index.jsonl` is the obvious merge view, untested.
- Auto-commit from the dev endpoint hides grades in noisy history; staged-for-review is safer. Unresolved.

---

## 6. How a grade gets consumed

### What it is
The handoff from a human grade to a generator change — exemplar promotion, rule delta, skill change record — per [eval-tuning-loops/03](../eval-tuning-loops/03-feeding-grades-back-text-level.md), and what the overlay must emit so no one retypes it.

### Why it matters
The loop's currency is "textual feedback with rationale," and a grade becomes "a constraint, then an example, then a sentence" ([eval-loops.md](../../../skill-resources/eval-loops.md)). Manual summarization breaks the loop at its cheapest step.

### Key findings
- **Category → lever is a lookup.** From the altitude ladder ([03 §1](../eval-tuning-loops/03-feeding-grades-back-text-level.md)): `off-system` and `a11y` → hook/lint/schema; `hierarchy` and `layout` → exemplar; `missing-state` and `interaction` → skill instruction or checklist; `copy` → rule, then optimizer if it resists (03's worked example C); `wrong-intent` → the brief or the skill's trigger description. The record carries the lever as a `lever_hint` the agent may override.
- **Accept + clean checklist = exemplar candidate.** Recipe B refuses promotion when `human` is null; the overlay's `promote_candidate: true` is the field it needs.
- **Reject + defects = repair task and change-record input.** A cluster of same-category rejects on one skill version triggers the change record; individually, a reject with anchored defects is a repair prompt — UXBench defines critique quality as "whether a fixed downstream repair agent can improve the interface based on the critique" ([UXBench](https://arxiv.org/html/2606.16262), fetched OK).
- **Three emit actions.** *Write to `evals/grades/`* feeds the loop. *Copy as agent prompt* renders the record as the [design-sdlc/02 §10](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) critique format — triage, anchor, observation, impact — one block per defect under a `generator` header, with the JSON in a fenced block. *Open as GitHub issue* uses `gh issue create --body-file` with a `grade:<category>` label.
- **Pairwise feeds a different consumer:** a Bradley–Terry input for "did v2 beat v1?" ([01 Recommendations](../eval-tuning-loops/01-grading-generated-prototypes.md)), aggregated weekly, not a repair task.

### Open questions
- Who closes a grade — reviewer, skill owner, or the weekly ritual? [05](../eval-tuning-loops/05-loop-architecture-and-governance.md) says the eval owner; the overlay only records `status: open`.

---

## 7. Biases and pitfalls of in-page grading

### What it is
Measured ways a fast in-context grade goes wrong — acquiescence, order, halo from polish, freshness, fatigue, anchoring — and the design counters.

### Why it matters
Human agreement is already "tentative": κ 0.46 pairwise, ≈0.30 on critiques, 85% human ceiling on running UIs in WebDevJudge ([01 §3](../eval-tuning-loops/01-grading-generated-prototypes.md), [02 §1](../eval-tuning-loops/02-reviewing-grades-and-human-calibration.md)). A control that adds bias produces a signal pointing the wrong way.

### Key findings
- **Acquiescence.** 10–20% of respondents "select a positive response option … without considering the content"; counters are balanced keying and direct questions with a range ([Wikipedia](https://en.wikipedia.org/wiki/Acquiescence_bias), fetched OK). Overlay: neutral defaults (yes / no / can't tell, nothing pre-selected), mixed polarity, accept never the default or the Enter key.
- **Order.** "Preferences change depending on presentation order," and filtering inconsistent annotators "flips majority harm classifications for 18.6% of prompts and shifts mean ratings by over 13 points" ([arXiv 2604.03238](https://arxiv.org/html/2604.03238v2), fetched OK); the standard fix is randomized order ([RLAIF](https://arxiv.org/pdf/2309.00267), search-verified only). Overlay: randomize A/B, record `order_shown`, never label one "current."
- **Halo from polish.** "Users are more tolerant of minor usability issues when they find an interface visually appealing" — 26 ATM designs, 252 participants, aesthetics predicting *perceived* over actual ease of use ([NN/g](https://www.nngroup.com/articles/aesthetic-usability-effect/), fetched OK). Generated prototypes are polished by default. Overlay: checklist before verdict, with `off-system`, `missing-state`, `a11y` items answered even when the screen looks good.
- **Freshness and fatigue.** "Per-batch κ falls by more than 32 points across the annotation task," while items labelled within a minute reach κ 0.98 vs 0.65 a day apart ([arXiv 2605.27239](https://arxiv.org/abs/2605.27239), fetched OK). Grading fresh is consistent — with the reviewer's momentary frame, including the prompt they just wrote. Overlay: record `seconds` and session position, nudge a break, send anchor-set items to a later blind pass.
- **Anchoring and the correction trap.** With 2,784 participants, "requiring corrections for flagged AI errors reduced engagement and increased the tendency to accept incorrect suggestions" ([arXiv 2509.08514](https://arxiv.org/abs/2509.08514), fetched OK). Overlay: collapse `generator`, prior grades, machine scores until the verdict commits; never pre-fill defects from a judge; log `revealed_at`.
- **Mandatory reason on reject only.** Both Claude.ai and ChatGPT ask for text after a thumbs-down and nothing after up; Prodigy's `ignore` exists so people do not fake a verdict to pass a required field. Rules: accept → checklist only; reject → ≥1 anchored defect + sentence; unsure → sentence; skip → reason from a two-item list.

### Open questions
- Whether showing a reviewer their own bias profile (accept rate, mean seconds, `other` rate) helps or demotivates is unsettled.

---

## Cross-cutting themes

1. **Binary verdict, short taxonomy, anchored defect, one sentence.** Consumer products converged on the first two; no prototyping tool does the third; the eval literature demands the fourth.
2. **The element is the unit, not the response.** Every platform schema lacks locations, which is why the record cannot live natively in any of them.
3. **Browser-safe writes are rare and small-team-hostile.** Two platforms accept a keyless write; their free tiers seat one or two people. The repo is the only target that is free, shared, versioned, and agent-readable without a key.
4. **Order of operations is the bias control.** Checklist → verdict → rationale → reveal → randomized A/B; each ordering counters a named, measured bias.
5. **The record is a projection of the loop's record.** Reusing its field names is what makes the human grade join the grade table without a mapping layer.
6. **Emit for three readers** — a file for the loop, a prompt for the agent, an issue for the humans.

---

## Recommendations

1. **Emit the Templates record to `evals/grades/`; everything else is a rendering.** Dev-server endpoint in Vite/Next; download plus clipboard in single-file; GitHub issue and platform adapters optional.
2. **Ship the eight-category taxonomy plus `other`, versioned; watch the `other` rate.**
3. **Order the control against bias:** checklist → verdict → defects and rationale → reveal context → optional randomized compare-with-previous.
4. **Keyboard-first, four answers:** `a` accept, `x` reject, `u` unsure, `s` skip; numbers toggle checklist items; `c` starts a defect on a clicked element; Enter submits only when the rules pass.
5. **Never write a secret to the page.** Adapters are Langfuse (public key) or LangSmith (presigned token); everything else goes through the dev server.

### Output-target decision table

| Target | Loop-consumable | Agent-readable | Single-file, no server | Small team | Diffable | Verdict |
|---|---|---|---|---|---|---|
| (a) `evals/grades/*.json` + ledger | Yes — Recipes A/B/C read it | Yes | Yes (download / clipboard) | Yes, via git | Yes | **Primary** |
| (b) Eval platform via adapter | Partial — one score per criterion, defects in metadata | With key | Langfuse / LangSmith only | Free tiers: 1–2 users, 14–30 days | No | Optional secondary |
| (c) GitHub Issues / Discussions | Partial — markdown to parse | Via `gh` | No | Yes | Threads only | Secondary, for disputes |
| (d) Generic export + adapters | If export = (a) | Yes | Yes | Depends | Depends | Wire format, not a target |

### Recommended control layout

| Zone | Control | Keys | Rule |
|---|---|---|---|
| Header | `PROTO-id` · route · viewport · version; context collapsed | — | `generator`, prior grades, machine scores hidden until verdict commits; reveal logged |
| Checklist | 8 binaries: primary action obvious · single reading order · on-system only · states present · controls respond · copy is product · contrast and focus ok · matches brief | `1`–`8`; yes / no / can't tell | Mixed polarity, no default; verdict enabled only when all answered |
| Verdict | Accept · Reject · Unsure · Skip | `a` `x` `u` `s` | Accept → optional promote flag; Reject → ≥1 defect + sentence; Unsure → sentence; Skip → reason |
| Defects | Click element → anchor (selector, bbox, text, state) → category → severity → note | `c` new; category `1`–`9`; severity `b` `m` `n` | `other` requires text; anchor auto-captured |
| Compare | Previous version from ledger; A/B randomized; A / B / tie | `p` `[` `]` `t` | `order_shown` recorded; available after verdict |
| Emit | Save to `evals/grades/` · Download · Copy as agent prompt · GitHub issue · adapter | Enter save; `⌘⇧C` copy | Save default in dev; download + copy in single-file |
| Footer | Rater · elapsed · draft autosaved | — | `seconds`, `blind` written; drafts in `localStorage` |

---

## Templates

### Human grade record (what the overlay emits)

```json
{
  "schema": "human-grade/1", "grade_id": "hg_PROTO-2026-041_v3_r42", "task_id": "PROTO-2026-041", "kind": "HUMAN",
  "created_at": "2026-09-02T10:14:00Z", "submitted_at": "2026-09-02T10:15:24Z", "status": "open",
  "artifact": { "kind": "prototype", "url": "http://localhost:5173/settings/invite", "version": "v3", "commit": "3f1c…",
                "route": "/settings/invite", "viewport": { "w": 1280, "h": 800, "dpr": 2 }, "state": "invite-sheet-open",
                "screenshot": "evals/grades/assets/PROTO-2026-041_v3_r42.png" },
  "generator": { "skill": "proto-builder@1.4.2", "skill_sha": "9e0d…", "exemplar_set": "ex-2026-08-30",
                 "catalog_version": "ds-core@7.2.0", "model": "<model id>", "prompt_sha": "c7a1…", "session": "<session id>" },
  "rater": { "id": "r_42", "blind": true, "revealed_at": "2026-09-02T10:15:10Z", "seconds": 84, "session_index": 3 },
  "rubric_version": "overlay-rubric/1", "taxonomy_version": "wrong-v1",
  "checklist": { "primary_action_obvious": true, "single_reading_order": false, "on_system_only": true, "states_present": false,
                 "controls_respond": true, "copy_is_product": true, "contrast_and_focus_ok": "cant_tell", "matches_brief": true },
  "verdict": "reject",
  "defects": [
    { "id": "d1", "category": "hierarchy", "severity": "major",
      "anchor": { "selector": "form > h2:nth-of-type(2)", "bbox": [0.12, 0.31, 0.40, 0.36], "text": "Invite settings", "state": "invite-sheet-open" },
      "note": "Secondary heading competes with the Send invite button", "lever_hint": "exemplar" },
    { "id": "d2", "category": "missing-state", "severity": "blocking",
      "anchor": { "selector": "[data-testid=invite-list]", "bbox": [0.10, 0.45, 0.90, 0.80], "text": null, "state": "empty-team" },
      "note": "No empty state when the team has no members", "lever_hint": "skill-instruction" }
  ],
  "rationale": "Reads well on desktop, but the empty team case is unhandled and the second heading pulls attention off the primary action.",
  "promote_candidate": false,
  "pairwise": { "opponent": { "task_id": "PROTO-2026-041", "version": "v2" }, "order_shown": "opponent-first", "winner": "this", "seconds": 31 },
  "comments": ["thread_8f2a"],
  "provenance": { "overlay_version": "0.3.0", "emitted_via": "dev-endpoint" }
}
```

Rules: `verdict` ∈ accept / reject / unsure / skip; checklist values `true` / `false` / `"cant_tell"`; `defects` ≥1 when reject; `rationale` required on reject or unsure; skip carries `skip_reason` ∈ not-my-area / cannot-load-state; `pairwise` null when no previous version; `generator` copied verbatim, never edited; `grade_id` deterministic (task, version, rater) so resubmission updates.

### Wrong-category taxonomy (`wrong-v1`)

| Key | Category | Means | Grounding | Default lever ([03](../eval-tuning-loops/03-feeding-grades-back-text-level.md)) |
|---|---|---|---|---|
| 1 | `wrong-intent` | Wrong thing for the brief; page goal unclear | UXBench goal-state clarity; Nielsen #2 | Brief / skill trigger |
| 2 | `off-system` | Raw values, non-catalog components | Repo `on_system_rate`; Nielsen #4 | Hook / lint / schema |
| 3 | `hierarchy` | Primary action not obvious; reading order | UICrit Layout; repo `hierarchy` | Exemplar |
| 4 | `layout` | Spacing, alignment, overflow, breakpoints | UICrit Layout; Visual-SDPO defects | Exemplar (+ DOM-metric hook) |
| 5 | `missing-state` | Empty / loading / error / offline absent | Repo `state_coverage`; Nielsen #1; UXBench action feedback | Skill instruction / checklist |
| 6 | `interaction` | Dead control, wrong affordance, no feedback, dead end | UICrit buttons; UXBench feedback, flow, recovery; Nielsen #3, #5 | Skill instruction; dead-link hook |
| 7 | `copy` | Labels, tone, placeholders, marketing-not-product | UICrit learnability; Nielsen #2, #6 | Rule → optimizer if it resists |
| 8 | `a11y` | Contrast, focus, names, target size | UICrit contrast/readability; UXBench scanability; axe | Hook (axe) / catalog |
| 9 | `other` | Text required | — | Weekly triage; ≥3 in a window → new category |

---

## Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| Langfuse `@langfuse/browser` + score API | https://langfuse.com/docs/observability/features/user-feedback | Public-key browser scores with `dataType` and `comment`; configs validate | fetched OK | eval-loops (optional adapter) |
| LangSmith presigned feedback tokens | https://docs.langchain.com/langsmith/presigned-feedback-tokens | Server-minted URL; browser POSTs score / comment / correction without a key | fetched OK | eval-loops (optional adapter) |
| Phoenix span annotations | https://arize.com/docs/phoenix/tracing/how-to-tracing/feedback-and-annotations/capture-feedback | `annotator_kind` HUMAN/LLM/CODE + label, score, explanation, upsert identifier — cleanest schema to mirror | fetched OK | eval-loops (schema reference) |
| Opik feedback scores | https://www.comet.com/docs/opik/reference/rest-api/spans/add-span-feedback-score | `source`, `category_name`, `reason`; free tier fits 10 members | fetched OK | eval-loops (swap line) |
| PostHog `useThumbSurvey` + `$ai_trace_id` | https://posthog.com/docs/ai-observability/collect-user-feedback | Thumbs survey tied to a trace; generous free tier | fetched OK | review-and-feedback (if PostHog present) |
| Prodigy keymap | https://prodi.gy/docs/api-web-app | `a` / `x` / `space` / `backspace`; accept / reject / ignore | fetched OK | rules (overlay keymap) |
| Argilla annotation UX | https://docs.argilla.io/latest/how_to_guides/annotate/ | Pending / draft / discarded / submitted; number-key labels | fetched OK | review-and-feedback (pattern) |
| Label Studio annotation JSON | https://labelstud.io/guide/task_format | `lead_time`, `was_cancelled`, `completed_by`, `ground_truth` | fetched OK | eval-loops (field reference) |
| UXBench rubric | https://arxiv.org/html/2606.16262 | Seven UX dimensions; repair-lift actionability | fetched OK | guardrails-and-evals |
| NN/g aesthetic-usability effect | https://www.nngroup.com/articles/aesthetic-usability-effect/ | Halo evidence for checklist-before-verdict | fetched OK | rules |
| `gh issue create` + issue forms | https://cli.github.com/manual/gh_issue_create | Non-interactive issue creation; required dropdowns enforce the taxonomy | fetched OK | subagents-and-commands |
| Human grade record + `wrong-v1` (this doc) | — | Overlay-emitted record and taxonomy | authored | eval-loops Templates |

Not picked: Helicone (boolean only), Sentry User Feedback (bug form; no free-plan allowance), Weave (no TS feedback, 1 KB cap), Braintrust as a browser target (bearer key), Humanloop (offline).

---

## Sources

- https://codecarbon.com/where-is-the-option-on-chatgpt-to-give-feedback-and-report-issues/
- https://community.openai.com/t/feature-request-for-which-response-do-you-prefer/807079
- https://www.guideflow.com/tutorial/how-to-give-negative-feedback-on-a-response-in-claudeai
- https://support.claude.com/en/articles/10504844-manage-user-feedback-settings-on-team-and-enterprise-plans
- https://support.google.com/gemini/answer/13275746?hl=en&co=GENIE.Platform%3DDesktop
- https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide
- https://docs.lovable.dev/features/projects/chat
- https://community.vercel.com/t/feedback-v0-usability-issues/27287
- https://forum.figma.com/suggest-a-feature-11/figma-make-credit-management-idea-49333
- https://cursor.com/docs/agent/overview
- https://learn.microsoft.com/en-us/power-platform/release-plan/2025wave1/microsoft-copilot-studio/collect-thumbs-up-or-down-feedback-comments-agents
- https://langfuse.com/docs/observability/features/user-feedback
- https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk
- https://langfuse.com/pricing
- https://docs.langchain.com/langsmith/feedback-data-format
- https://docs.langchain.com/langsmith/presigned-feedback-tokens
- https://www.langchain.com/pricing-langsmith
- https://www.braintrust.dev/docs/annotate/human-review
- https://www.braintrust.dev/docs/api-reference/logs/feedback-for-project-logs-events
- https://www.braintrust.dev/pricing
- https://docs.wandb.ai/weave/guides/tracking/feedback/
- https://wandb.ai/site/pricing/
- https://arize.com/docs/phoenix/tracing/how-to-tracing/feedback-and-annotations/capture-feedback
- https://www.comet.com/docs/opik/reference/rest-api/spans/add-span-feedback-score
- https://www.comet.com/site/pricing/
- https://docs.helicone.ai/features/advanced-usage/feedback
- https://posthog.com/docs/ai-observability/collect-user-feedback
- https://posthog.com/pricing
- https://docs.sentry.io/platforms/javascript/user-feedback/
- https://sentry.io/pricing/
- https://news.ycombinator.com/item?id=44592216
- https://prodi.gy/docs/api-web-app
- https://docs.argilla.io/latest/how_to_guides/annotate/
- https://labelstud.io/guide/labeling
- https://labelstud.io/guide/task_format
- https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- https://arxiv.org/html/2407.08850v2
- https://arxiv.org/html/2606.16262
- https://www.nngroup.com/articles/ten-usability-heuristics/
- https://www.nngroup.com/articles/aesthetic-usability-effect/
- https://en.wikipedia.org/wiki/Acquiescence_bias
- https://arxiv.org/html/2604.03238v2
- https://arxiv.org/pdf/2309.00267
- https://arxiv.org/abs/2605.27239
- https://arxiv.org/abs/2509.08514
- https://cli.github.com/manual/gh_issue_create
- https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms
- https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText
- https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker

*Research conducted 2 September 2026. Not verified: OpenAI help-center pages (403; ChatGPT categories from a June 2026 secondary article), Claude.ai dropdown option wording, Figma Make thumbs (forum only), Cursor and Bolt rating controls (no documentation found), Copilot Studio reactions (search only), RLAIF position-bias numbers (search only), Braintrust review-mode shortcuts, `@langfuse/browser` npm page (403; name from Langfuse docs), weave-docs.wandb.ai (403; docs.wandb.ai mirror used).*
