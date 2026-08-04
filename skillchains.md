# Skillchains: Composing the Collection into Working Setups

A **skillchain** is a deliberate composition of the primitives in [skill-resources/](skill-resources/README.md) — rules + skills + commands/subagents + hooks + MCP servers — assembled for one design workflow. No single primitive makes an agent design-capable; the reliability comes from the chain: *rules constrain → skills direct → MCP connects → hooks enforce → subagents verify*.

This doc covers: where everything lives (config files), five ready-to-assemble chains, which pieces complement or conflict, how to adapt the setup to **your** design system, and how to think about determinism.

## Table of Contents

1. [Where everything lives (config files)](#1-where-everything-lives-config-files)
2. [The base layer every chain shares](#2-the-base-layer-every-chain-shares)
3. [The chains](#3-the-chains)
4. [Complementarity and conflicts](#4-complementarity-and-conflicts)
5. [Adapting to your design system](#5-adapting-to-your-design-system)
6. [Determinism: what you can and can't rely on](#6-determinism-what-you-can-and-cant-rely-on)
7. [Rollout order](#7-rollout-order)

---

## 1. Where everything lives (config files)

All of this is per-project unless noted. Claude Code conventions shown; Cursor/Copilot equivalents in [rules.md](skill-resources/rules.md).

```
your-project/
├── CLAUDE.md                    # rules — always-on constraints (commit this)
├── .claude/
│   ├── settings.json            # hooks + permissions (commit this)
│   ├── settings.local.json      # personal overrides (gitignored)
│   ├── skills/<name>/SKILL.md   # project-local skills
│   ├── agents/<name>.md         # subagent definitions
│   └── commands/<name>.md       # slash commands
├── .mcp.json                    # project MCP servers (commit this)
└── design/
    ├── DESIGN.md                # optional: portable design context (see §5)
    └── tokens.json              # DTCG tokens if you have them
```

Install surfaces:

- **Plugins/marketplaces** (skills, agents, commands in one install): `/plugin marketplace add <owner>/<repo>` then `/plugin install <name>` — this is how Anthropic frontend-design, designer-skills, and wshobson collections ship.
- **Manual**: copy a `SKILL.md` folder into `.claude/skills/`, an agent file into `.claude/agents/`. Fine for single picks and for forking (see §5).
- **MCP**: `claude mcp add <name> ...` or edit `.mcp.json` directly. Example:

```json
{
  "mcpServers": {
    "figma": { "url": "http://127.0.0.1:3845/mcp", "type": "http" },
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] }
  }
}
```

---

## 2. The base layer every chain shares

Set this up once; every chain below assumes it.

1. **CLAUDE.md with the seven encode-categories** from [rules.md](skill-resources/rules.md): token usage, component reuse, a11y floors, spacing/type scales, brand voice, aesthetic direction, and the self-verification ritual. Start from the snippets in that file and fill in your values (§5).
2. **Hook recipe 1 (format-on-edit)** from [hooks.md](skill-resources/hooks.md) — Prettier/Stylelint on PostToolUse. Zero-risk, immediately removes a whole class of noise.
3. **Playwright MCP** from [mcp-servers.md](skill-resources/mcp-servers.md) — the agent's eyes. Nearly every chain uses it for verification.

> Token-cost note: rules load on every turn — keep CLAUDE.md tight (constraints, not documentation). Skills load only when triggered; MCP tool results are the expensive part, so prefer targeted queries over full-file dumps.

---

## 3. The chains

Each chain lists its pieces (all from [skill-resources/](skill-resources/README.md)), what each contributes, and the assembly notes that aren't obvious.

### Chain A — UI generation (new screens, prototypes, marketing pages)

*The goal: distinctive, on-brand output instead of AI-slop defaults.*

| Piece | Role |
|---|---|
| Anthropic **frontend-design** plugin (skill) | Forces an aesthetic-direction step (purpose, audience, tone) before any code |
| **MengTo/Skills** aesthetic recipes (skills) | Named visual directions to invoke deliberately ("use the editorial recipe") |
| CLAUDE.md **anti-slop + aesthetic direction** rules | Bans defaults (Inter-on-white, purple gradients, three-card grids) persistently |
| Hook recipes **1 + 3** (format-on-edit, screenshot-after-UI-change) | Canonical formatting; the agent sees what it built |
| **Playwright MCP** | Renders and screenshots for the self-verification ritual |

**Assembly notes:** frontend-design and MengTo recipes complement rather than conflict — frontend-design governs *process* (decide direction first), recipes supply *vocabulary* (what the direction is). Keep your aesthetic rules in CLAUDE.md short and let the skill do the heavy lifting; duplicating a full style guide in rules burns tokens every turn.

### Chain B — Design-to-code (implementing Figma designs)

*The goal: generated code that uses your real tokens and components, not lookalike markup.*

| Piece | Role |
|---|---|
| **Official Figma MCP** (Dev Mode) | Structured design context: variables, components, Code Connect mappings |
| Figma official skills (`figma-use`, `figma-code-connect`) | Teach the agent the server's correct usage patterns |
| CLAUDE.md **token + component-reuse** rules | "Never hardcode hex; always use existing components" as law |
| **shadcn MCP** or **Storybook MCP** | The agent discovers/installs *your* real components instead of inventing |
| Hook recipe **2** (token-drift guard) | Blocks hardcoded values that slip through anyway |

**Assembly notes:** the chain's strength scales with Code Connect coverage — without mappings, the Figma MCP returns visual context but the agent still guesses at component names (that's what the reuse rules + registry MCP backstop). No paid Figma seat? Swap in Framelink per the comparison table in [mcp-servers.md](skill-resources/mcp-servers.md). Don't run Storybook MCP and shadcn MCP together unless you genuinely use both — overlapping component-discovery tools confuse tool choice.

### Chain C — Design QA & review (the crit loop)

*The goal: every UI change reviewed like a principal designer would, automatically.*

| Piece | Role |
|---|---|
| **design-review subagent** (OneRedOak) | Seven-phase, evidence-required review driving the live UI via Playwright |
| **/design-review** command | On-demand trigger for the current branch |
| **/accessibility-audit** command (wshobson) | Deeper a11y pass when needed |
| Hook recipes **4 + 5** (axe-on-stop, design-review-on-PR) | Deterministic gates so review can't be skipped |
| **Playwright MCP** | Required by the subagent; also drives viewport testing |
| Anthropic **webapp-testing** skill | Functional pass alongside the visual one |

**Assembly notes:** the subagent needs Playwright MCP available in *its* tool list — check the agent file's tools line after install. The axe-on-stop hook is advisory (warns), the PR hook is the hard gate; that split is deliberate — don't make every Stop blocking or iteration gets miserable.

### Chain D — Design system work (building and maintaining the system itself)

*The goal: the system stays coherent while agents contribute to it.*

| Piece | Role |
|---|---|
| designer-skills **design-systems** plugin | Component specs, token architecture, audit processes |
| **Storybook MCP** | Docs/props lookup, story generation, a11y test runs on stories |
| Figma **figma-generate-library** + **figma-code-connect** skills | Push system artifacts into Figma; wire mappings |
| CLAUDE.md **spacing/type scale + token** rules | The system's own constraints, enforced on its own code |
| Hook recipe **2** (token-drift guard) | The system repo is exactly where drift matters most |
| **figma-console-mcp** (situational) | Bulk token/variable operations — heavy tool surface, enable only when doing token sync work |

### Chain E — Research & strategy (before pixels)

*The goal: structured discovery and strategy work with the same rigor as the build chains.*

| Piece | Role |
|---|---|
| designer-skills **design-research + ux-strategy** plugins | Interview guides, synthesis templates, strategy frameworks |
| **/design-research:discover** command | Kicks off structured discovery |
| **/visual-critique:critique-screen** | Structured critique when evaluating existing UI |
| (Optional) **/design-ops:handoff** | Closes the loop into build chains |

**Assembly notes:** this chain is nearly hook/MCP-free by nature — it produces documents, not code. Its output (a discovery brief, a strategy doc) is the natural *input* to Chain A: reference it explicitly when you switch.

---

## 4. Complementarity and conflicts

**Complements (run together by design):**
- Rules + hooks are the same constraint at two altitudes: the rule teaches ("use tokens"), the hook enforces (blocks the hex). Always pair them for anything non-negotiable.
- frontend-design (process) + aesthetic recipes (vocabulary) + anti-slop rules (persistence).
- Figma MCP (read design) + registry MCP (write with real components) + Playwright (verify result) — the read/build/verify triangle.

**Conflicts and redundancies (avoid):**
- **Overlapping skills with similar descriptions** compete for triggering — don't install claude-design-skill *and* frontend-design; they occupy the same niche (frontend-design is the stronger pick).
- **Multiple Figma servers** (official + Framelink + talk-to-figma) simultaneously — pick one per project.
- **Too many always-on rules**: past a few hundred lines, CLAUDE.md degrades adherence on all of it. Move anything situational into a skill.
- **Subagent + hook both gating the same event** (e.g., design review as Stop-hook *and* PR-hook) doubles latency for no reliability gain — gate once, at the PR.

**Budget guidance:** a chain should be ~1 plugin-group of skills, ≤2 MCP servers beyond Playwright, and ≤3 active hooks. If you're beyond that, you're probably running two chains at once — that's fine, but prune the overlap.

---

## 5. Adapting to your design system

The collection ships generic; the value appears when it speaks *your* system. Four adaptation layers, cheapest first:

1. **Fill the rules snippets with your values.** The seven categories in [rules.md](skill-resources/rules.md) are templates: your token names, your spacing scale, your component list, your voice. One honest afternoon of work; biggest single lift in output quality.

2. **Fork the brand-guidelines skill.** Anthropic's brand-guidelines skill ([skills.md](skill-resources/skills.md) pick 14) is explicitly a fork-template: replace its palette/type/spacing with yours, rename it (`acme-brand`), drop it in `.claude/skills/`. Now brand knowledge is model-triggered instead of burning always-on tokens.

3. **Write a DESIGN.md.** The spec ([rules.md](skill-resources/rules.md) picks 3–4) captures identity + rationale in one portable file any agent can read. Atlassian's field test is the honest reference: it works ("recognizably on-brand output") but costs ~92% more tokens than serving equivalent context via MCP — right for small teams and portability, wrong as the end-state for a large system.

4. **Wire the system itself.** Code Connect mappings (design ↔ code), Storybook MCP over your stories, DTCG token export served to agents. This is Chain B/D territory and the highest-effort tier — do it after 1–3 prove out, and let coverage grow incrementally (map your ten most-used components first).

**Non-Claude agents:** everything in layer 1 ports — maintain one AGENTS.md as the source and symlink/copy to CLAUDE.md and `.cursor/rules` (conversion notes in [rules.md](skill-resources/rules.md)). Skills and hooks are Claude Code-specific; the rules layer is your portable core.

---

## 6. Determinism: what you can and can't rely on

The primitives sit on a spectrum, and chain design is mostly about pushing must-happen behavior toward the deterministic end:

| | Primitive | Reliability behavior |
|---|---|---|
| **Deterministic** | Hooks | Always fire on their event. The only primitive that *cannot* be skipped, forgotten, or reasoned around |
| | MCP tool results | The data returned is real (the agent's *use* of it is not guaranteed) |
| **Probabilistic, high adherence** | Rules | Loaded every turn; adherence is good but degrades with rule volume and context length |
| | Commands / subagents | Deterministic *trigger* (you typed it), probabilistic *execution* |
| **Probabilistic, variable** | Skills | Triggering depends on description matching; execution quality on instruction writing |

Practical corollaries:

- **If it must always happen, it's a hook.** "Always run axe" as a rule is a request; as a Stop hook it's a fact. This is the single most important chain-design principle.
- **Make outputs canonical.** Pinned Prettier via recipe 1 means formatting differences never masquerade as design changes — diffs show only real deltas.
- **Close the loop with evidence.** The self-verification ritual (rules category 7) + screenshot hook + Playwright turns "I made the change" claims into verified screenshots. Agents drift; verification loops catch it.
- **Determinism costs latency.** Every blocking hook adds seconds to every matching event. Reserve *blocking* for cheap checks (grep-based token guard) and gates that run rarely (PR review); make expensive checks advisory or event-scoped.
- **Test your hooks like code.** A silently failing hook is worse than no hook — you believe the gate exists. `claude --debug` shows hook execution; verify each one fires before trusting it.

---

## 7. Rollout order

Don't install everything at once — you won't know what's working. The order that builds on itself:

1. **Week 1 — base layer** (§2): CLAUDE.md + format hook + Playwright MCP. Establish the verification habit.
2. **Week 2 — your primary chain**: A if you mostly generate UI, B if you mostly implement designs. Adapt rules to your system (§5 layer 1).
3. **Week 3 — the QA chain (C)**: once output volume is real, add the review gate. Start with `/design-review` on demand; promote to the PR hook when you trust it.
4. **Then**: fork brand-guidelines (§5 layer 2), add Chain D/E as those workflows arise, and wire Code Connect/Storybook incrementally.

At each step the test is the same: *did output quality or reliability visibly improve?* If a piece isn't earning its context cost, remove it — the "Evaluated but not selected" sections exist because most things don't make the cut.
