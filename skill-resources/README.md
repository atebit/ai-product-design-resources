# Skill Resources — The Curated Collection

The vetted collection of agent-workflow resources for designers: skills, rules, hooks, MCP servers, subagents, and commands — plus four process-layer collections: review & feedback tooling, prototype governance, guardrails & evals, and eval loops (the loop that improves a generator over time).

**Curation principle: the best, not the most.** Every entry was verified live (repo exists, actively maintained, contents actually read and judged) before inclusion. Each file ends with an "Evaluated but not selected" list so rejected candidates don't get re-litigated.

For how to compose these into working setups, see [skillchains.md](skillchains.md) in this folder.

---

## The files

| File | What's inside | Count |
|---|---|---|
| [skills.md](skills.md) | The best agent skills for design work — packaged design judgment, organized by process stage. Anchors: Anthropic frontend-design, Figma official skills, designer-skills plugin groups, MengTo aesthetic recipes | 14 picks |
| [rules.md](rules.md) | Rules files — the "always-on constitution" layer (CLAUDE.md / .cursor/rules / AGENTS.md / copilot-instructions), plus a **what-to-encode guide** with verified snippets for tokens, component reuse, a11y floors, spacing/type scales, voice, anti-slop direction, and self-verification | 11 picks + 7 snippet categories |
| [hooks.md](hooks.md) | Deterministic design-QA enforcement — **5 ready-to-use recipes** (format-on-edit, token-drift guard, screenshot-after-UI-change, a11y-on-stop, design-review-on-PR) with working settings.json snippets, plus vetted resources | 5 recipes + 5 resources |
| [mcp-servers.md](mcp-servers.md) | The designer's MCP stack — headline: **Figma + Playwright + shadcn + Storybook**, with swap rules, verified tool surfaces, and a three-way Figma-server comparison | 12 servers |
| [subagents-and-commands.md](subagents-and-commands.md) | Delegated specialist agents (design-review, ui-designer, frontend-developer) and slash commands (`/design-review`, `/critique-screen`, `/handoff`, `/accessibility-audit`), plus prompt-writing lessons from the v0/Lovable system prompts | 11 picks |
| [review-and-feedback.md](review-and-feedback.md) | Giving feedback on prototypes that aren't on a Figma canvas — comment surfaces for hosted prototypes and Claude artifacts, annotation-to-agent tools, rebuilding the "see every screen" overview, critique formats, feedback→agent loops; **a playbook by artifact type, two templates** (review request, structured critique response) and **2 hook recipes** (contact-sheet-on-PR, unresolved-preview-comments gate) | 14 picks + 2 recipes + 2 templates |
| [prototype-governance.md](prototype-governance.md) | The lifecycle of design artifacts outside the repo — design-system context objects per prototyping tool, handoff paths, storage patterns, Figma↔code sync and drift tooling, process scaffolds; **lifecycle and source-of-truth allocation tables, two templates** (prototype ledger row, promotion checklist), **3 hook recipes** (ledger-link gate, flow-diagram contract, expiry sweep) and a rule snippet | 15 picks + 3 recipes + 2 templates |
| [guardrails-and-evals.md](guardrails-and-evals.md) | Making cheap models execute in one pass — structured output, verification and repair, routing and escalation, eval harnesses, context discipline; **the guardrail ladder, two starter stacks, 2 recipes** (a gated `ui-executor` Haiku subagent, a bounded validate-and-repair loop) and a minimal design-task eval set | 16 picks + 2 recipes |
| [eval-loops.md](eval-loops.md) | Grade → review → feed back: graders and judges, review and annotation tooling, feeding grades into skills/catalogs/prompts, loop infrastructure, training and distillation; **the reference loop and maturity model, the grading stack and trust tiers, 3 recipes** (grade-on-generate hook, exemplar promotion gate with contamination lint, skill-change CI gate) and **4 templates** (grade record, grade review card, skill change record, weekly loop review) | 18 picks + 3 recipes + 4 templates |

## How the primitives fit together (the altitude ladder)

Choose the lowest-effort primitive that solves the problem:

| Primitive | Fires | Use for |
|---|---|---|
| **Rules** ([rules.md](rules.md)) | Always on | Non-negotiable constraints: token usage, a11y floors, component reuse, brand voice |
| **Skills** ([skills.md](skills.md)) | Model-triggered by task | Repeatable expertise: aesthetic direction, heuristic evaluation, handoff process |
| **Commands** ([subagents-and-commands.md](subagents-and-commands.md)) | You type `/command` | Rituals you invoke deliberately: `/design-review`, `/critique-screen`, `/handoff` |
| **Subagents** ([subagents-and-commands.md](subagents-and-commands.md)) | Delegated | Isolated specialist work: a Playwright-driven design reviewer with its own context |
| **Hooks** ([hooks.md](hooks.md)) | Deterministic, on lifecycle events | Enforcement that must *always* happen: formatting, token linting, screenshots, a11y gates |
| **MCP servers** ([mcp-servers.md](mcp-servers.md)) | Tool access, on demand | Letting the agent act in real tools: Figma, the browser, Storybook, the component registry |

The four process-layer collections sit *across* the ladder rather than at one rung: each combines templates (what a human fills in), hooks (what a machine enforces), and picks (the tools that make either possible). They are indexed by the stage they serve, below.

## Process map

| Stage | Reach for |
|---|---|
| Discovery & research | designer-skills research/strategy plugins ([skills.md](skills.md)), `/design-research:discover` |
| IA & strategy | ux-strategy plugin ([skills.md](skills.md)) |
| Design system work | designer-skills design-systems plugin, token/component rules ([rules.md](rules.md)), Storybook + shadcn MCP, Figma `figma-code-connect` skill |
| UI generation | Anthropic frontend-design, MengTo aesthetic recipes, anti-slop rules, Figma MCP, 21st.dev MCP |
| Motion & IxD | claudedesignskills motion/3D stack ([skills.md](skills.md)) |
| QA & review | design-review subagent, hook recipes 1–4, Playwright MCP, `/accessibility-audit`, webapp-testing skill |
| Prototype review & feedback (outside Figma) | Playbook and templates in [review-and-feedback.md](review-and-feedback.md): Vercel/Netlify comments, artifact threads, contact-sheet hook, Conventional Comments, `@claude` review loop |
| Prototype governance & promotion | Ledger, promotion checklist, DS context objects per tool, ledger-link gate, Figma↔code sync tooling in [prototype-governance.md](prototype-governance.md) |
| Handoff & ops | `/design-ops:handoff`, prototyping-testing plugin, screenshot + a11y hooks, handoff README template ([prototype-governance.md](prototype-governance.md)) |
| Small-model reliability & evals | Guardrail ladder, gated Haiku executor, validate-and-repair loop, promptfoo design-task eval set in [guardrails-and-evals.md](guardrails-and-evals.md) |
| Improving the generator over time | Grade record on the ledger row, trust tiers, anchor-set calibration, fix-altitude table, skill-change CI gate, maturity model in [eval-loops.md](eval-loops.md) |

## Grounding research

This collection was seeded by the landscape research in [../docs/research/foundational/](../docs/research/foundational/00-overview.md) — and, for the process-layer collections, by the [design-sdlc](../docs/research/design-sdlc/README.md) and [eval-tuning-loops](../docs/research/eval-tuning-loops/README.md) streams — and then verified independently against the live web. Where verification contradicted the research (dead repos, pivoted products, restructured collections), the collection files are the source of truth.
