# Skill Resources — The Curated Collection

The vetted collection of agent-workflow resources for designers: skills, rules, hooks, MCP servers, subagents, and commands.

**Curation principle: the best, not the most.** Every entry was verified live (repo exists, actively maintained, contents actually read and judged) before inclusion. Each file ends with an "Evaluated but not selected" list so rejected candidates don't get re-litigated.

For how to compose these into working setups, see [skillchains.md](../skillchains.md) at the repo root.

---

## The files

| File | What's inside | Count |
|---|---|---|
| [skills.md](skills.md) | The best agent skills for design work — packaged design judgment, organized by process stage. Anchors: Anthropic frontend-design, Figma official skills, designer-skills plugin groups, MengTo aesthetic recipes | 14 picks |
| [rules.md](rules.md) | Rules files — the "always-on constitution" layer (CLAUDE.md / .cursor/rules / AGENTS.md / copilot-instructions), plus a **what-to-encode guide** with verified snippets for tokens, component reuse, a11y floors, spacing/type scales, voice, anti-slop direction, and self-verification | 11 picks + 7 snippet categories |
| [hooks.md](hooks.md) | Deterministic design-QA enforcement — **5 ready-to-use recipes** (format-on-edit, token-drift guard, screenshot-after-UI-change, a11y-on-stop, design-review-on-PR) with working settings.json snippets, plus vetted resources | 5 recipes + 5 resources |
| [mcp-servers.md](mcp-servers.md) | The designer's MCP stack — headline: **Figma + Playwright + shadcn + Storybook**, with swap rules, verified tool surfaces, and a three-way Figma-server comparison | 12 servers |
| [subagents-and-commands.md](subagents-and-commands.md) | Delegated specialist agents (design-review, ui-designer, frontend-developer) and slash commands (`/design-review`, `/critique-screen`, `/handoff`, `/accessibility-audit`), plus prompt-writing lessons from the v0/Lovable system prompts | 11 picks |

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

## Process map

| Stage | Reach for |
|---|---|
| Discovery & research | designer-skills research/strategy plugins ([skills.md](skills.md)), `/design-research:discover` |
| IA & strategy | ux-strategy plugin ([skills.md](skills.md)) |
| Design system work | designer-skills design-systems plugin, token/component rules ([rules.md](rules.md)), Storybook + shadcn MCP, Figma `figma-code-connect` skill |
| UI generation | Anthropic frontend-design, MengTo aesthetic recipes, anti-slop rules, Figma MCP, 21st.dev MCP |
| Motion & IxD | claudedesignskills motion/3D stack ([skills.md](skills.md)) |
| QA & review | design-review subagent, hook recipes 1–4, Playwright MCP, `/accessibility-audit`, webapp-testing skill |
| Handoff & ops | `/design-ops:handoff`, prototyping-testing plugin, screenshot + a11y hooks |

## Grounding research

This collection was seeded by the landscape research in [../docs/research/foundational/](../docs/research/foundational/00-overview.md) and then verified independently against the live web. Where verification contradicted the research (dead repos, pivoted products, restructured collections), the collection files are the source of truth.
