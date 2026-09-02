# Guardrails, Structured Output, Routing & Evals

The tooling that lets a cheap model — Claude Haiku 4.5 and its peers — produce consistent, on-design-system output in **one pass** instead of looping. A model that is five times cheaper per token but needs three passes is not cheaper; this file is about making the first pass count.

Small models loop for four reasons, and each has a tool answer. **No external verifier** — the model grades its own work, and small models cannot self-correct without outside feedback (they can, however, fix a *named* error). **Unbounded output space** — free-form code lets the model invent a component; an enum makes the invention impossible. **Unbounded feedback path** — a retry loop with no cap is the loop generator, so every repair budget here is a hard number. **Context volume** — long rules files and prose catalogs degrade small models fastest, so the answer is shorter rules plus a registry the model queries.

Two modes get equal weight: **interactive** (a designer driving a cheap model in Claude Code or Cursor — rules, hooks, skills, subagents) and **automated** (CI, batch generation, subagents, construction-file pipelines — schemas, validators, repair loops, routers, evals). The one-line thesis: *small models need a verifier, not a conscience; the big model's job is to write the small model's prompt.* This file extends [hooks.md](hooks.md) recipes 1–5 and [skillchains.md §6](skillchains.md) (determinism); it references them rather than repeating them. Curated and verified live 2 September 2026; model names and prices come from Anthropic's live docs, not memory.

---

## The guardrail ladder

Cheapest → most robust. Evidence grade: **A** = measured in a peer-reviewed or vendor-published eval; **B** = vendor docs or repeated practitioner reports; **C** = reasoned from adjacent evidence.

| # | Guardrail | Failure it prevents | Interactive | Automated | Grade |
|---|---|---|---|---|---|
| 1 | Short rules with exact imports and token names | Ignored instructions, recreated components | CLAUDE.md ≤ one screen; detail in skills; prune with `/doctor` | System prompt = ~10 rules + schema | B |
| 2 | 2–3 gold exemplars of the exact output | Wrong shape, wrong idiom | Skill `references/` with canonical files | Exemplar construction files in the cached prefix | A |
| 3 | Structured plan → narrow executor | Under-specified task, scope creep | Plan mode on Sonnet/Opus; `model: haiku` executor | Planner emits task list; Haiku fills slots | A |
| 4 | Queryable registry, not a prose catalog | Hallucinated components and props | Storybook / shadcn MCP + "query before use" rule | Registry index → enum in the schema | A/B |
| 5 | Format + token-drift gate on every edit | Off-token values, noisy diffs | hooks.md recipes 1–2 | `stylelint-declaration-strict-value` as a validator step | B |
| 6 | Schema-constrained output, enum-typed component names | Invalid or unknown structure | Emulate with template + validator hook | `output_config.format` / `strict: true`; Zod/Pydantic; Outlines self-hosted | A |
| 7 | Named-error repair loop, max 2 retries | Endless retry spirals | PostToolUse stderr feedback; Stop hook with `stop_hook_active` guard | `jsonrepair` → schema → lint → build → axe, hard cap | A/B |
| 8 | Completion gates: a11y + screenshot on Stop | Shipping WCAG failures, unseen renders | hooks.md recipes 3–4; `/goal "axe reports 0 violations"` | `@axe-core/cli --exit`, screenshot diff in CI | B |
| 9 | Cheap-first, escalate on validator failure | Big-model prices for easy tasks | `model: haiku` subagents with frontmatter hooks | Haiku → validators → Sonnet 5 retry; log the escalation | A |
| 10 | Cross-model reviewer | Self-graded errors | Review subagent in a fresh context | Different-family verifier on best-of-N | A |
| 11 | Design-task eval set: pass^3, loops-per-task | Silent regressions when rules change | `promptfoo eval` before committing rule edits | CI gate on first-pass validity, on-system rate, axe = 0 | B |
| 12 | Prompt optimization against the eval set | Residual gap after 1–11 | — | DSPy GEPA on the executor prompt with validator feedback | A |

Full evidence trail per rung: [research doc §1–§8](../docs/research/design-sdlc/04-small-model-guardrails.md).

**Starter stack — interactive (one afternoon).** (1) Prune CLAUDE.md to exact import paths, token names, and the self-verification ritual from [rules.md](rules.md). (2) Install hooks.md recipes 1, 2 and 4. (3) Add a `ui-build` skill: numbered procedure, 2–3 gold component files, checklist. (4) Wire Storybook or shadcn MCP ([mcp-servers.md](mcp-servers.md)) and add a "query before use" rule. (5) Create the `ui-executor` subagent from Recipe A below and let the main Sonnet/Opus session plan. Then watch the correction rate — above roughly 20%, move that task class up the ladder.

**Starter stack — automated (one sprint).** (1) Zod schema with enum component types → `output_config.format` on Haiku 4.5; schema + exemplars in a ≥ 4,096-token cached prefix. (2) Validator chain from Recipe B, each stage emitting named errors. (3) Repair loop capped at 2, then escalate to Sonnet 5 and record it. (4) A 20–50 task promptfoo suite scoring first-pass validity, on-system rate, axe = 0, pass^3, loops-per-task, gating CI. (5) Once the suite is stable, run GEPA on the executor prompt.

---

## The picks

### Structured output

#### 1. Anthropic structured outputs — `output_config.format` and `strict: true`

[platform.claude.com/docs/en/build-with-claude/structured-outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) · GA, no beta header · supported on Haiku 4.5 (`claude-haiku-4-5`, listed in the docs under its dated id) through Fable 5.1

**What it does.** Constrains the Messages API response to a JSON Schema (`output_config: { format: { type: "json_schema", schema } }`) or guarantees tool inputs validate exactly (`strict: true` on the tool definition). The docs' guarantee: always valid JSON, no retries needed for schema violations. SDK helpers: `client.messages.parse()` with a Pydantic model in Python, `zodOutputFormat(schema)` inside `output_config.format` in TypeScript; both return `parsed_output`. Compiled grammars are cached for 24 hours; a schema change invalidates the prompt cache for that thread.

**Small-model angle.** This is rung 6 and the single strongest automated guardrail: an enum of registry component names makes a hallucinated component impossible on Haiku, not a bug to catch. Enums of primitives, `const`, internal `$ref`, and `additionalProperties: false` are supported; recursive schemas, numeric bounds, and string-length limits are not — the SDKs strip unsupported constraints and validate the response against your original schema client-side.

**Caveats.** Schema-valid is not semantically valid — a quantity of `1` where `0.46` was meant still parses. Constrain *selection* (component names, slots, token ids) and leave a rationale field free-text, first in the object. Truncation on `max_tokens` still yields unparseable output; set `max_tokens` generously and check `stop_reason`.

#### 2. Instructor

[github.com/567-labs/instructor](https://github.com/567-labs/instructor) · 13.8k★ · MIT · v1.16.0 (27 Aug 2026), pushed today · Python; TypeScript port at [js.useinstructor.com](https://js.useinstructor.com)

**What it does.** Pydantic models as the output contract, across providers (`instructor.from_provider("anthropic/...")`). Failed validations are automatically re-asked with the validator's error message, up to `max_retries`.

**Small-model angle.** The reference implementation of rung 7: Pydantic field validators are where design semantics live — "`type` must be in the registry", "`spacing` must be a scale token" — and the validator's message becomes the repair prompt. Set `max_retries=2` and treat the third failure as an escalation, not a fourth attempt.

**Caveats.** Python-first; the TS port lags. On Anthropic it now sits on top of native structured outputs, so its retry loop is for *semantic* validators, not JSON shape.

#### 3. BAML

[github.com/BoundaryML/baml](https://github.com/BoundaryML/baml) · 9.1k★ · Apache-2.0 · nightly releases, pushed today · TS / Python / Go / C# / Java clients

**What it does.** A small typed language for LLM functions whose runtime uses **Schema-Aligned Parsing**: rather than demanding valid JSON, it reads the model's text "generously" and applies the least-cost edit that makes it match the schema — stripping preamble, fixing quotes and commas, coercing a scalar to a one-item array, completing partial objects mid-stream. No retry. On the Berkeley Function Calling Leaderboard the team reports 92.4% for GPT-4o-mini with SAP versus 19.8% with native function calling — the small-model gap is exactly the point.

**Small-model angle.** The "constrain selection, free the reasoning" design in one tool: enums and unions are typed, the model writes prose around them, the parser recovers the structure. Its blog is also the best documented case *against* over-constraining decoding on small models.

**Caveats.** A language plus a build step, not a library import — real adoption cost. Nightly versioning moves fast; pin.

#### 4. Vercel AI SDK — `Output.object` / `Output.choice`

[ai-sdk.dev/docs/ai-sdk-core/generating-structured-data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) · [vercel/ai](https://github.com/vercel/ai) 26.6k★ · `ai` 7.0.91, `@ai-sdk/anthropic` 4.0.49, pushed today

**What it does.** `generateText` / `streamText` with `Output.object({ schema })` (Zod), `Output.array`, `Output.choice({ options })` for enum-only answers, `Output.json`. On failure `NoObjectGeneratedError` carries the raw `text`, `cause`, `response`, and `usage`, so you can hand the text to `jsonrepair` or a repair prompt yourself. The Anthropic provider exposes `structuredOutputMode: "outputFormat" | "jsonTool" | "auto"` — `auto` uses native structured outputs where the model supports them.

**Small-model angle.** The TypeScript default for the automated pipeline in Recipe B, and `Output.choice` is the cheapest possible classifier for routing ("simple | needs-planner").

**Caveats.** Fast-moving major versions; check the migration guide before upgrading. The SDK-level repair hook mentioned in older write-ups could not be confirmed in the current docs — rely on `NoObjectGeneratedError.text`.

#### 5. Outlines — self-hosted constrained decoding

[github.com/dottxt-ai/outlines](https://github.com/dottxt-ai/outlines) · 15.7k★ · Apache-2.0 · 1.3.3 (Aug 2026), pushed today

**What it does.** Guaranteed-structure generation for open models: JSON Schema / Pydantic, regex, context-free grammars, `Literal[...]` choices, across Transformers, llama.cpp, vLLM, and Ollama. The company's "Say What You Mean" rerun of the format-restriction debate found structured generation *matched or beat* free-form with fair prompts.

**Small-model angle.** When the executor is a local 7–9B model rather than Haiku, this is rung 6. Swap rules: vLLM, SGLang, and TensorRT-LLM already ship [XGrammar](https://github.com/mlc-ai/xgrammar) (1.9k★, Apache-2.0) as the default backend, and [llguidance](https://github.com/guidance-ai/llguidance) (855★, MIT, ~50 µs/token) powers OpenAI's structured outputs and llama.cpp — if you are on one of those servers, use the engine's `response_format` and skip the extra dependency.

**Caveats.** Only relevant if you control inference. Grammar-level constraint is where the "structure snowballing" evidence bites hardest on small models — keep reasoning fields free-text.

### Verification and repair

#### 6. @axe-core/cli

[github.com/dequelabs/axe-core-npm (packages/cli)](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli) · 721★ (monorepo) · MPL-2.0 · 4.13.0, pushed today

**What it does.** `axe <url> --exit` runs Deque's rules headlessly and exits 1 on any violation; `--tags wcag2a,wcag2aa`, `--rules`, `--stdout` for JSON to pipe into `jq`, `--save` for artifacts. Chrome headless by default.

**Small-model angle.** The deterministic "axe = 0" gate in hooks.md recipe 4, Recipe B stage 5, and the eval set below. A named rule id (`color-contrast`, `button-name`) is exactly the feedback a Haiku executor can act on in one round.

**Caveats.** Needs a running page; scope to the changed route or story for speed. Catches ~30–40% of WCAG issues (the automatable ones) — a floor, not a review.

#### 7. stylelint-declaration-strict-value

[github.com/AndyOGo/stylelint-declaration-strict-value](https://github.com/AndyOGo/stylelint-declaration-strict-value) · 144★ · MIT · 1.12.1, pushed Aug 2026 · stylelint 16–17

**What it does.** Rule `scale-unlimited/declaration-strict-value`: for listed properties (`color`, `/color$/`, `font-size`, `z-index`, spacing) the value must be a variable, function, or allow-listed keyword. `ignoreValues`, `expandShorthand`, and an `autoFixFunc` for rewriting literals to tokens.

**Small-model angle.** The lint-grade upgrade to hooks.md recipe 2's grep: same failure class (rung 5), but with proper CSS parsing and autofix, so the executor never has to be asked twice about `#3B82F6`. Runs inside recipe 1's `stylelint --fix` for free.

**Caveats.** CSS/SCSS only — Tailwind arbitrary values and inline `style={{}}` still need the grep. Small project; one maintainer.

#### 8. jsonrepair

[github.com/josdejong/jsonrepair](https://github.com/josdejong/jsonrepair) · 2.4k★ · ISC · 3.15.0, pushed Jul 2026

**What it does.** `jsonrepair(text)` fixes what LLMs actually break: markdown fences, stray prose, single quotes, trailing commas, comments, Python constants, missing brackets, and **truncated documents**. Streaming transform and a CLI included.

**Small-model angle.** Rung 7's zero-cost first stage: repair before you spend a single token on a retry. With Anthropic structured outputs it is only needed for `stop_reason: "max_tokens"` truncation; on self-hosted or other-provider executors it removes most "invalid JSON" retries outright.

**Caveats.** Syntactic only — it will happily produce valid JSON with the wrong component name. Always follow with the schema check.

#### 9. Claude Code hooks reference

[code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) · official

**What it does.** Five handler types — `command`, `http`, `mcp_tool`, `prompt`, `agent` — on 30+ events. `PostToolUse` exit 2 cannot undo the edit but feeds stderr to Claude; `Stop` exit 2 blocks stopping; the `stop_hook_active` field is your loop guard, and Claude Code ends the turn after 8 consecutive Stop blocks regardless. Hooks can live in subagent frontmatter and run only while that agent runs.

**Small-model angle.** The interactive-mode guardrail framework. Everything on the ladder's interactive column that must *always* happen is a hook, and a Haiku executor can carry its own gates (Recipe A). The `prompt` and `agent` handlers are a cheap verifier in the loop: a small model judging one narrow condition.

**Caveats.** Reference, not recipes — pair with hooks.md. Hooks need workspace trust; a `-p` session does not count as accepting it.

#### 10. Claude Code `/goal`

[code.claude.com/docs/en/goal](https://code.claude.com/docs/en/goal) · official

**What it does.** A session-scoped prompt-based Stop hook: `/goal npm run a11y exits 0 and the token lint is clean`. After every turn a small fast model (Haiku by default on the Claude API) returns *not yet / met / impossible*; Claude keeps working until met. Stalls (no tool use for several turns) stop the loop with the goal still set; add `or stop after 20 turns` to bound it yourself.

**Small-model angle.** Rung 8 without writing a hook, and a working example of the thesis — a cheap model doing a narrow verification job while a bigger model does the work. The evaluator only sees what Claude surfaces, so phrase goals as *evidence in the transcript* ("`axe --exit` printed 0 violations").

**Caveats.** Judgment is model-graded, not deterministic; for anything that must be enforced, promote it to a `command` Stop hook.

### Routing and escalation

#### 11. Claude Code subagent `model:` + frontmatter hooks

[code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) · [model-config](https://code.claude.com/docs/en/model-config) · official

**What it does.** Subagent frontmatter accepts `model: sonnet | opus | haiku | fable | <full id> | inherit`, a `tools` allowlist, `maxTurns`, `skills` to preload, `mcpServers`, and a `hooks` block whose `Stop` becomes `SubagentStop`. Resolution order: per-invocation → frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL` → session model. `opusplan` runs Opus in plan mode and Sonnet for execution; `CLAUDE_CODE_EFFORT_LEVEL` (`low`–`max`) is the other cost lever.

**Small-model angle.** Rungs 3 and 9 in one file: the planner/executor split with the executor's gates attached to the executor. Recipe A is the concrete form.

**Caveats.** Frontmatter `model` only took precedence over the env var from v2.1.251. Subagent hooks are ignored for plugin-distributed agents.

**Cheap-first cascade — the arithmetic.** Anthropic list prices, verified live: Haiku 4.5 $1 / $5 per MTok, Sonnet 5 $2 / $10, Opus 5 $5 / $25; cache reads are 0.1× base, and the minimum cacheable prefix on Haiku 4.5 is **4,096 tokens** (shorter prefixes silently do not cache). For one screen — a 30K-token cached design-system prefix, 2K task in, 3K out — Haiku ≈ $0.003 + $0.002 + $0.015 = **$0.020**; Sonnet 5 ≈ **$0.040**; Opus 5 ≈ **$0.100**. A Haiku-first cascade with first-pass validity *p* and Sonnet 5 as the fallback costs ≈ 0.020 + (1 − *p*) × 0.040: it beats Sonnet-first whenever *p* > 0.5, and at *p* = 0.85 it is ≈ $0.026. Two caveats from Anthropic's own cost guidance: measure the most capable model at *lower effort* on the same tasks before building a cascade, and remember caches are model-scoped — a cascade forfeits cache reuse across its rungs. Judge cost per *completed* task, never per request.

### Evals

#### 12. promptfoo

[github.com/promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) · 24.8k★ · MIT · 0.122.2, pushed today

**What it does.** YAML-declared eval suites with deterministic assertions — `is-json` (takes a JSON Schema, inline or `file://`), `javascript` / `python` graders, `regex`, `cost`, `latency`, `trajectory:tool-used` — plus model-graded `llm-rubric`, `assert-set` with a `threshold`, `--repeat <n>` for repeated trials, JSON/JUnit output, and exit code 100 on failures for CI. Anthropic provider id: `anthropic:messages:claude-haiku-4-5`.

**Small-model angle.** Rung 11's harness, and the right altitude for a 20–50 task design suite: every grader you need (schema, on-system script, axe) is a deterministic assertion. See the eval-set section below.

**Caveats.** Loops-per-task is not a native metric — log it from your pipeline and read it into a `javascript` grader. Model-graded "looks right" rubrics on a cheap grader are uncalibrated; keep them advisory.

#### 13. Braintrust

[braintrust.dev](https://www.braintrust.dev/) · commercial, free Starter tier (10k scores/month, 14-day retention, no card) · TS and Python SDKs

**What it does.** Evals (code, LLM, or human scorers), production tracing of prompts and tool calls, and **quality gates** that block a release when scores regress; scorers written in TS or Python run in CI.

**Small-model angle.** Where promptfoo is the local loop, Braintrust is the shared dashboard: escalation rate, first-pass validity, and pass^3 per rules-file revision, visible to the whole team. Its traces also answer "which stage of the validator chain fails most."

**Caveats.** Hosted dependency; the free tier's retention is short. Do not adopt it until the promptfoo suite exists — it is a place to *see* metrics, not the source of them.

#### 14. Anthropic — "Demystifying evals for AI agents"

[anthropic.com/engineering/demystifying-evals-for-ai-agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) · official

**What it does.** The methodology this file's eval section follows: pass@k ("at least one correct solution in k attempts") versus **pass^k** ("all k trials succeed"); start with "20–50 simple tasks drawn from real failures"; grade "what the agent produced, not the path it took"; isolate each trial in a clean environment; read transcripts to check your graders.

**Small-model angle.** pass^k is the consistency metric — at 75% per trial, pass^3 is 42%. A cheap executor that passes *sometimes* is what loops feel like from the inside.

**Caveats.** Guidance, not tooling. No design-specific graders; those are yours to write.

#### 15. DSPy GEPA

[dspy.ai/api/optimizers/GEPA/overview](https://dspy.ai/api/optimizers/GEPA/overview/) · [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy) 37.7k★ · MIT · 3.3.1 (Aug 2026)

**What it does.** A reflective prompt optimizer: your metric returns a score *and textual feedback* ("unknown component `Modal`; raw px at children[2]"), a strong **reflection LM** reads the failures and rewrites the instructions, and a Pareto frontier of candidates avoids local optima. `dspy.GEPA(metric=..., reflection_lm=..., max_metric_calls=...)`, then `.compile(student, trainset, valset)`.

**Small-model angle.** Rung 12, and the thesis made mechanical: the big model writes the small model's prompt, using the validator chain's named errors as the feedback signal. Run it only once the eval set is stable, and cache the resulting prefix.

**Caveats.** DSPy's programming model is a commitment; the optimized prompt is what you keep, not the framework. Not yet reported on UI-generation tasks.

### Context discipline

#### 16. Rule-length guidance — Claude Code best practices + Cursor rules

[code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) · [cursor.com/docs/context/rules](https://cursor.com/docs/context/rules) · official

**What it does.** Claude Code: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions!"; for each line ask "Would removing this cause Claude to make mistakes?"; if Claude already does it, delete the rule or convert it to a hook; after two failed corrections, `/clear` and write a better prompt; `/doctor` proposes cuts. Cursor: keep each rule under 500 lines, split into composable rules, "point to canonical examples" rather than pasting them, and don't replicate style guides — use linters.

**Small-model angle.** Rung 1. Context volume is a guardrail *failure mode* for cheap models; both vendors converge on short rules plus pointers, which is why this file sends design detail to skills and registries instead of CLAUDE.md.

**Caveats.** Neither page quantifies the cliff; treat "one screen" as the working rule and measure with the eval set.

**Queryable registry beats prose catalog.** Storybook MCP's directive to agents — "Never hallucinate component properties! … you MUST use the MCP tools to check" — and shadcn's registry MCP are rung 4; both are already curated in [mcp-servers.md](mcp-servers.md) and are not re-reviewed here. The design rule that pairs with them: *query the registry before using any component; name the exact import path.*

---

## Recipe A — `ui-executor` subagent (Haiku, gated) · *authored here*

Protects: **the planner/executor split with gates attached** — the main Sonnet/Opus session plans; a Haiku agent that cannot go off-system builds. Untested end to end in this repo; frontmatter fields verified against the sub-agents docs, hook scripts are hooks.md recipes 2 and 4.

Save as `.claude/agents/ui-executor.md`:

```markdown
---
name: ui-executor
description: Builds ONE screen or component from an approved plan file, using only registry components and design tokens. Use after planning is done. Not for exploration, design decisions, or multi-screen work.
model: haiku
tools: Read, Edit, Write, Grep, Glob, Bash
maxTurns: 25
mcpServers:
  - storybook
hooks:
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/token-drift.sh"
  Stop:
    - hooks:
        - type: command
          command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/a11y-gate.sh"
          timeout: 60
---
You implement exactly what the plan says. Follow the steps in order.

1. Read the plan file named in your prompt. Do not add, remove, or reinterpret scope.
2. Read the exemplars before writing anything — match their structure and idiom exactly:
   `src/components/Button/Button.tsx`, `src/screens/Settings/SettingsScreen.tsx`, `src/styles/tokens.css`.
3. For every component the plan names, confirm it exists: grep `src/components/index.ts`
   or call the Storybook MCP `docs-show` tool. If one is missing, stop and report it. Never invent one.
4. Write the file(s). Styling uses tokens only (`var(--*)`, theme scale). No raw hex, no raw px.
5. Run `npm run typecheck`. Fix each named error once. If the same error repeats, stop and report it.
6. Report: files written, components used, and any plan item you could not complete and why.
```

How it works: the main session (Sonnet 5 or Opus 5) runs plan mode, writes a slot-filled plan — screen name, component list *taken from the registry*, token names, acceptance checks — to `.claude/plans/<screen>.md`, then delegates: *"Use the ui-executor subagent to implement .claude/plans/invite-sheet.md."* The executor ships with its own gates: the token-drift hook feeds named off-token lines back after every edit, and the a11y gate converts to `SubagentStop`, so "done" cannot mean "done with violations." `maxTurns` is the loop bound. Escalation is the main session's job: if the executor's report lists an unfinished item twice, the bigger model takes that item itself — that is rung 9 in interactive form. Adjust the three exemplar paths and the MCP server name to your repo.

## Recipe B — bounded validate-and-repair loop (automated) · *authored here*

Protects: **the automated pipeline from retry spirals** — every failure is named, every loop is capped, and escalation is a logged event rather than a silent fourth try. TypeScript sketch, untested; the shape is what matters.

```ts
import { jsonrepair } from "jsonrepair";

const MAX_REPAIRS = 2;
const LADDER = ["claude-haiku-4-5", "claude-sonnet-5"] as const;
type NamedError = { code: string; path?: string; message: string };   // e.g. UNKNOWN_COMPONENT, RAW_PX, AXE_color-contrast

export async function buildScreen(task: Task): Promise<Built> {
  let errors: NamedError[] = [];
  for (const model of LADDER) {
    for (let repair = 0; repair <= MAX_REPAIRS; repair++) {
      const raw = await generate({ model, task, errors });          // output_config.format = construction-file schema; errors go in the prompt verbatim
      const doc = parse(jsonrepair(raw));                           // 1. free repair (truncation, fences) — no tokens spent
      errors = schemaCheck(doc);                                    // 2. Zod / JSON Schema → path + expected type
      if (!errors.length) errors = semanticLint(doc, registry);     // 3. unknown component, illegal slot, non-token value
      if (!errors.length) errors = await build(doc);                // 4. render + typecheck
      if (!errors.length) errors = await axe(previewUrl(doc));      // 5. @axe-core/cli --exit --stdout → rule ids
      if (!errors.length) return { doc, model, repairs: repair };
      metrics.loop({ task: task.id, model, repair, codes: errors.map(e => e.code) });
    }
    metrics.escalation({ task: task.id, from: model, errors });     // logged before moving up the ladder
  }
  throw new PipelineError(task.id, errors);                         // human queue — never a third model
}
```

How it works: stages are ordered cheapest-first and each stops the chain, so the model only ever sees the *first* failing layer's errors. Two repairs on Haiku, then two on Sonnet 5, then a human — six generations maximum, and `metrics.loop` / `metrics.escalation` are the raw data for loops-per-task and escalation rate. With Anthropic structured outputs stage 2 rarely fires; it stays because stage 3 needs a parsed document and because self-hosted executors need it. Semantic errors should carry the registry's nearest match (`UNKNOWN_COMPONENT "Modal" — did you mean "Dialog"?`); that one line is most of the difference between one repair round and two. The deep dive on the schema itself — format choice, enum-typed component types, slot rules, builder fail-safes — is [construction-file generation §2–§3 and §6](../docs/research/prototype-construction/03-construction-file-generation.md).

---

## A minimal design-task eval set

Twenty to fifty tasks drawn from real failures — "add a destructive confirm dialog to the settings screen," "apply the new spacing token to the card grid," "build the invite-teammate sheet from this intent" — each graded deterministically on the artifact, never the transcript. Five numbers per run: **first-pass validity** (schema check passes on attempt 0), **on-system rate** (every import resolves to the registry; zero raw hex/px), **axe = 0**, **pass^3** (all three repeats pass), and **mean loops-per-task** (repairs before the chain is green, from Recipe B's `metrics.loop`).

```yaml
# promptfooconfig.yaml — run: promptfoo eval --repeat 3 -o results.json
providers:
  - id: anthropic:messages:claude-haiku-4-5
    config: { temperature: 0, max_tokens: 8192 }
prompts:
  - file://prompts/ui-executor.txt        # rules + schema + exemplars; ≥ 4,096 tokens so it caches
tests:
  - vars: { task: "Add a destructive confirm dialog to the settings screen" }
    assert:
      - type: is-json
        value: file://schema/construction-file.json     # first-pass validity
      - type: javascript
        value: file://graders/on-system.js               # imports ∈ registry; no /#[0-9a-f]{3,8}/, no /\d+px/
      - type: javascript
        value: file://graders/axe-zero.js                # render, run `axe --stdout`, expect violations.length === 0
      - type: cost
        threshold: 0.03
  # … 19–49 more, one real failure each; include negatives ("do NOT add a new component")
```

Reading the output: pass^3 is the share of tasks green in all three repeats (`--repeat 3` writes each run; group by test in `results.json`); loops-per-task comes from the pipeline log, not promptfoo. Gate CI on exit code 100 or `PROMPTFOO_PASS_RATE_THRESHOLD`; run the suite before committing any change to rules, skills, exemplars, or the schema — that is what turns "the rules feel better" into a number. Repeat with `claude-sonnet-5` as a second provider to see what escalation actually buys.

---

## Evaluated but not selected

- **[RouteLLM](https://github.com/lm-sys/RouteLLM)** (5.4k★) — the ICLR 2025 router and the "up to 85% cost reduction" claim are real, but the last commit is 9 Aug 2024. Preference-trained routers optimize chat quality, not schema validity; a validator-triggered cascade (pick 11) is simpler and directly measurable. Read the paper, skip the package.
- **[Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai)** (2.7k★, MIT, active) — excellent research-grade harness with 200+ prebuilt evals, but Python-first and built for capability/safety evals; for a 20–50 task design suite promptfoo's YAML is the right altitude.
- **[TypeChat](https://github.com/microsoft/TypeChat)** (8.7k★) — the "schema engineering, compiler errors as repair prompt" idea is sound, but 2026 commits are dependency bumps only and there are no releases; Instructor's re-ask and BAML's parser carry the idea forward.
- **[XGrammar](https://github.com/mlc-ai/xgrammar)** / **[llguidance](https://github.com/guidance-ai/llguidance)** — engine backends, not something you adopt directly; covered as swap lines under Outlines.
- **[Guardrails AI](https://github.com/guardrails-ai/guardrails)** (7.3k★, active) — solid `on_fail` validator framework, but its Hub is safety/PII-oriented; a design validator is a 40-line script, not a Hub download.
- **[NeMo Guardrails](https://github.com/NVIDIA-NeMo/Guardrails)** and **[Cloudflare AI Gateway Guardrails](https://developers.cloudflare.com/ai-gateway/features/guardrails/)** — safety and topical control only; neither validates artifact structure.
- **[OpenAI Agents SDK guardrails](https://openai.github.io/openai-agents-python/guardrails/)** — the "run a guardrail with a fast/cheap model" tripwire is the right pattern and is already what `/goal` and prompt hooks do in Claude Code; no need for the SDK.
- **[LangSmith repetitions](https://docs.langchain.com/langsmith/repetition)** — `num_repetitions` with per-score standard deviation is a good pass^k primitive, but it is one option on `evaluate()`; promptfoo's `--repeat` covers it without the platform.
- **[Not Diamond](https://www.notdiamond.ai/)** — custom routers for coding agents with real customer numbers, but trained on general accuracy, not design-system adherence. **[OpenRouter Auto Router](https://openrouter.ai/openrouter/auto)** — picks by community spend with a `cost_tier`; no awareness of schema validity.

---

*Verified 2 September 2026 against live repos, docs, and package registries. Full evidence and open questions: [04-small-model-guardrails.md](../docs/research/design-sdlc/04-small-model-guardrails.md); the structured-output deep dive: [03-construction-file-generation.md](../docs/research/prototype-construction/03-construction-file-generation.md).*
