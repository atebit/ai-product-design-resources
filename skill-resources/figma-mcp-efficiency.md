# The Figma MCP Cost Model — What the Skills Actually Fix

The official Figma MCP server is the highest-fidelity design bridge available and the most expensive server in a designer's stack. Both things are true, and the usual complaint — *"the Figma MCP is wildly inefficient"* — is usually about one of three unrelated budgets that get conflated into a single feeling of slowness.

This document separates them, measures each, and says which ones Figma's first-party skills fix, which ones they make **worse**, and what actually moves the number.

**The short version:** the skills are not a token diet. They are 211 KB of `SKILL.md` guarding a tool surface of 42 tools, and loading one costs more context than the call it precedes. What they buy is *round trips* — fewer malformed `use_figma` calls, fewer retry loops, fewer rebuilds after the agent hardcodes hex where a variable existed. On the write path that trade is strongly positive. On the read path it is roughly neutral, and the real fix is a different tool ladder or a different server entirely.

---

## Three budgets, not one

Almost every "Figma MCP is slow/expensive" complaint resolves to one of these. They have different causes and different fixes, and optimizing the wrong one is why the problem persists.

| Budget | Unit | What burns it | What fixes it |
|---|---|---|---|
| **Context window** | tokens | 42 tool definitions, `get_design_context` payloads, triggered skill loads | Tool deferral, the `get_metadata` → targeted-fetch ladder, narrower nodes |
| **Call quota** | tool calls/day, calls/min | Every read tool; retries count | Fewer, better-formed calls — this is what skills buy |
| **Wall clock** | round trips | Retry loops, the 10-op ceiling, per-call state resets | Batching, correct API on the first attempt |

The skills target column three, and column two follows from it. They *spend* column one to do it. If your complaint is "my context fills up," the skills are not the answer and will make it worse.

---

## What the surface costs before you write a single prompt

**42 tools.** Measured against a live session with the official server connected: `get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs`, `search_design_system`, `get_libraries`, `use_figma`, `create_new_file`, `upload_assets`, `download_assets`, `export_video`, `generate_diagram`, `get_figjam`, `get_motion_context`, six Code Connect tools, nine shader tools, four generative-plugin tools, six `weave_*` tools, two skill-resource readers, and `whoami`.

That is the largest single MCP surface in the stack this repo recommends, and on a client that loads all tool definitions eagerly it is always-on context. **The mitigation is client-side, not Figma-side:** Claude Code defers MCP tool schemas behind `ToolSearch`, so only the tools you actually reach for get expanded. Figma's own `figma-use` skill acknowledges this and tells the agent to batch the lookup:

> If Figma MCP tools appear as deferred tools, batch-load all their schemas in a single `ToolSearch` call using the `select:` syntax. One round trip beats six.

If your client does *not* defer, trimming the surface is the single largest context win available, and no skill can do it for you.

**The skill descriptions are cheap; the skills are not.** All 14 skill descriptions together are 7,146 bytes (~1,800 tokens) — that is the always-on cost of having them installed, and it is negligible. The cost arrives when one triggers.

| Skill | `SKILL.md` | References (excl. typings) | Mandatory before |
|---|---:|---:|---|
| `figma-use` | 34.6 KB | 214 KB | every `use_figma` call |
| `figma-generate-design` | 33.5 KB | 6 KB | — |
| `figma-code-connect` | 26.7 KB | 33 KB | — |
| `figma-generate-library` | 23.4 KB | 196 KB | — |
| `figma-implement-motion` | 23.3 KB | 45 KB | — |
| `figma-use-slides` | 22.0 KB | 47 KB | — |
| `figma-generate-diagram` | 10.3 KB | 101 KB | every `generate_diagram` call |
| `figma-use-figjam` | 6.9 KB | 142 KB | — |
| `figma-use-motion` | 6.9 KB | 25 KB | — |
| `figma-shaders` | 5.6 KB | 11 KB | every `create_shader` / `update_shader` |
| `figma-design-to-code` | 5.0 KB | — | every `get_design_context` call |
| `figma-generative-plugins` | 4.9 KB | 12 KB | every `create_generative_plugin` |
| `figma-swiftui` | 4.0 KB | 56 KB | — |
| `figma-create-new-file` | 3.9 KB | — | every `create_new_file` call |
| **Total** | **211 KB** | **~888 KB** | 6 of 14 are hard gates |

Plus `figma-use/references/plugin-api-standalone.d.ts` at **453 KB** — the full Plugin API typings. To Figma's credit this is explicitly grep-gated rather than loaded: the skill routes you through a 30 KB index first and instructs *"do not load it all at once, grep for relevant sections as needed."* That is correct progressive disclosure, and it is the reason the reference tree's raw size overstates its real cost.

**The honest read:** `figma-use` is a ~9,000-token mandatory preamble to a write call. If you make one small edit, you paid 9,000 tokens to save maybe two retries. If you build a screen, you paid it once and saved a dozen.

---

## What actually goes wrong without the skills

Each of these is a rule the skills exist to enforce, and each maps to a specific waste mode. This is the case *for* the skills, stated concretely.

**1. The 10-operation ceiling.** `figma-use` states: *"At most 10 logical operations per `use_figma` call"* — where a logical operation is creating a node, setting its properties, and parenting it. An agent that doesn't know this tries to build a 40-node screen in one call, fails, and retries — often by halving blindly. Every failed attempt is a quota-consuming round trip that produces nothing.

**2. State does not survive between calls.** Two documented traps, both invisible without the skill:
- `figma.currentPage` **resets to the first page** at the start of every `use_figma` call. Multi-call workflows targeting any other page silently write to the wrong one unless each call re-opens with `setCurrentPageAsync`.
- A variable handle obtained in one call **is not in scope** in the next. You must rehydrate by ID (`figma.variables.getVariableByIdAsync`). Agents that don't know this fall back to copying resolved hex values into JS constants and painting with them — which produces a component that *looks* right and has zero variable bindings. That is the most expensive failure in the list, because it isn't an error. It passes review and gets rebuilt later.

**3. Subtree search over the whole document.** From the gotchas reference: *"Every `findAll` / `findOne` / `findAllWithCriteria` walks the entire subtree of the receiver. Picking the right receiver is the single biggest performance lever you have — bigger than the type index."* An agent reaching for `figma.root.findAll()` on a real design file is the canonical slow call.

**4. Property-at-a-time mutation.** The skills push `node.set({...})` batch updates over sequential property assignment, with before/after examples. Fewer statements, same result, fewer failure points.

**5. Asset handling.** Exported asset URLs **expire in ~7 days**. Without the skill an agent either hand-writes `<svg>` paths it cannot know (wrong glyphs, silently), or commits a URL that 404s the following week.

These are real, and they are why the write path justifies the skill load. None of them is a token problem.

---

## Where the skills make it worse

**`figma-design-to-code` actively forbids the cheap path.** The skill is a mandatory prerequisite to `get_design_context`, and it says:

> You MUST call `get_design_context` on the target node before writing any code. It is your primary tool — a single call returns reference code, a screenshot, and contextual hints. You MUST NOT reach for `get_metadata` or `get_screenshot` as a substitute. Use them only to orient (e.g. picking a node) or to validate, not in place of `get_design_context`.

That is a fidelity-first instruction, and it is correct *for fidelity*. But `get_design_context` on a large frame returns React + Tailwind reference code **and an inline screenshot** **and** hints, in one response — the single largest payload the server produces. The skill costs 5 KB to load and then steers the agent toward the most expensive call available, away from the `get_metadata` → narrow → targeted-fetch pattern that this repo already recommends in [mcp-servers.md](mcp-servers.md).

If your problem is read-path token burn, `figma-design-to-code` is not the fix — it is arguably part of the cost. The fix is node discipline: orient with `get_metadata` (sparse XML: IDs, names, types, positions), pick the smallest node that contains the work, then call `get_design_context` **once** on that node. The skill permits this ("use them to orient"); it just doesn't emphasize it.

**Skills loaded over MCP may draw on the same quota.** Figma exempts exactly three tools from rate limits — `add_code_connect_map`, `create_new_file`, and `whoami`. `get_figma_skill` / `read_skill_uri` are **not** on that list. The stated scope is "tools that read data from Figma," and a static skill resource arguably isn't that, so this is **unverified** — but if resource-loaded skills do count, installing the skills locally (via the plugin) rather than fetching them per-session converts a recurring quota cost into a one-time disk cost. Worth testing against your own `whoami` quota before assuming either way.

---

## The leaner tree nobody tells you about

Upstream ships **two** skill trees with the same 14 names, and which one you get is decided by a manifest field you probably never looked at:

| | `skills/` | `skills-figquery/` |
|---|---|---|
| Loaded by | Claude Code, GitHub Copilot, Gemini CLI | **Cursor only** |
| Declared in | `.claude-plugin/plugin.json` (no `skills` field → defaults to `skills/`) | `.cursor-plugin/plugin.json` → `"skills": "./skills-figquery/"` |
| Total `SKILL.md` | 211 KB | **190 KB** |
| `figma-use/SKILL.md` | 34.6 KB | **23.4 KB** |
| Extra reference | — | `fig-builder.md`, `critical-rules-deep.md` |
| Node creation API | standard `figma.create*` | **`$fig` global; `figma.create*` "do not exist"** |
| Differs from the other tree | — | **8 of 14 skills** |

The figquery variant is built around a `$fig` helper layer, and it is explicit about why it prefers a `query()` node search:

> Do not use `findOne`, `findAll`, `findAllWithCriteria`, `findChildren`, `findChild` directly for node searching. They are more verbose, error-prone, and less efficient than `query()`. Additionally, do not use recursion to search.

**Do not treat the two trees as interchangeable.** An earlier revision of this document suggested pointing Claude Code at `skills-figquery/` to get the smaller tree. That advice was wrong and has been removed. The figquery tree describes a *different execution environment*, not the same environment in fewer words:

> `$fig` is a global that is responsible for all node creation. [...] Never use `figma.createFrame()`, `figma.createText()` or any `figma.create*` methods. **They do not exist in this environment.**

The default `skills/` tree never mentions `$fig` — not once in 209,893 bytes — and teaches the standard Plugin API those sentences forbid. Loading figquery against a connection that provides the standard environment would instruct the agent to call a global that isn't there and to avoid the methods that are. That is a guaranteed-failure configuration, not a saving.

**This also breaks the "figquery proves skills compress" inference.** `figma-use` is 32% smaller in that tree, but the reduction is mostly explained by the higher-level tool surface making entire sections of hand-taught API mechanics unnecessary — not by denser writing of the same lessons. The tell: `figma-design-to-code` *grew* 32% in the same tree. Only `figma-generate-library` (a phase checklist replacing three redundant restatements, 98 → 61 lines) is clean evidence of prose compression. Citing the tree-size delta as a compression result conflates prose editing with a tool-surface redesign.

What survives: `query()` over `findAll` is sound advice in **both** trees — the default tree documents `node.query()` too, it just buries the performance rationale in a 53 KB gotchas file instead of promoting it to the primary idiom. Prefer `query()` where your environment offers it; don't swap trees to get it.

**Open question, unresolved here:** which environment a given client actually gets. The two trees are generated from different upstream plugins (`figma-plugin` vs `figma-plugin-fig-query`), and `.mcp.json` sends an `X-Figma-Plugin-Bundle` header, which suggests server behaviour keyed to the bundle rather than to the client. Verifying that costs a live write call and a quota unit; it has not been tested for this document.

---

## The hard budget: rate limits

Read tools consume a per-seat quota. Writes and three named tools do not. Verified against [Figma's rate-limits page](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/), September 2026:

| Seat | Starter | Professional | Organization | Enterprise |
|---|---|---|---|---|
| View, Collab | 20/month | **6/month** | **6/month** | **6/month** |
| Dev, Full | 200/day · 10/min | 200/day · 15/min | 600/day · 20/min | least-limited (unpublished) |

Education plans follow Professional. Exempt from limits: `add_code_connect_map`, `create_new_file`, `whoami`.

Two things follow:

- **Six calls a month on a View or Collab seat is not a trial, it is a demo.** Any evaluation of "is the Figma MCP worth it" conducted on a Collab seat is measuring the seat, not the server. Designers without a Dev or Full seat should assume the official server is unavailable to them and go straight to [Framelink](mcp-servers.md), which uses a personal access token and works on free plans.
- **Retries are not free.** A failed `use_figma` call that exceeds the 10-op ceiling still costs quota. On a 200/day budget, an agent stuck in a malformed-call loop can burn a working day's allocation in a few minutes. This is the strongest argument for loading `figma-use` despite its size.

> **Correction to [mcp-servers.md](mcp-servers.md):** that file states "roughly 200 tool calls/day on Organization Full/Dev seats, 600 on Enterprise." The columns are shifted — it is **200/day on Professional** and **600/day on Organization**, with Enterprise unpublished. Corrected inline there.

---

## The efficiency ladder

In order. Stop when the problem goes away — each rung costs more than the one above it.

1. **Defer the tool schemas.** 42 always-on tool definitions is the largest fixed cost and the cheapest to remove. Free on clients that support it.
2. **Orient before you fetch.** `get_metadata` returns a sparse XML map — IDs, names, types, positions — for a fraction of `get_design_context`. Use it to *choose the node*, then fetch once.
3. **Narrow the node.** Payload scales with subtree size. One `get_design_context` on a card beats one on the page that contains it, and beats three on the page after two timeouts.
4. **Load `figma-use` for write work.** The 9,000-token preamble pays for itself the moment it prevents one 10-op overflow or one unbound-variable rebuild. Skip it only for trivially small single-node edits.
5. **Try the figquery tree.** Smaller, `query()`-first, free to test. See above.
6. **Don't load the skill you don't need.** `figma-use-figjam` carries 142 KB of references; `figma-generate-library` carries 196 KB. They are correctly gated behind triggers — keep it that way and don't preload them "just in case."
7. **Swap the server.** If payloads still dominate after all of the above, the official server is the wrong tool for your job. Framelink returns a deliberately simplified layout/styling payload built for exactly this constraint. You lose Code Connect — which is the whole differentiator — so this is a real trade, not a free win.

---

## When to not use the official server at all

- **No Dev or Full seat.** Six calls a month. Use Framelink.
- **Read-only, high-volume, token-sensitive.** Framelink's simplified payload is the design goal, not a compromise.
- **Bulk variable/token operations.** `figma-console-mcp` has the deeper surface for CRUD at scale; the official server's write tools are aimed at composition, not bulk edits.
- **No Code Connect coverage.** The official server's fidelity advantage is largely *your components in the output*. Without Code Connect mappings you are paying premium payload for generic markup you'll rewrite anyway. Set up Code Connect first, or use a cheaper server until you have.

---

## Going further

Whether these skills can be *compressed* — and why that is mostly the wrong lever — is its own research stream: **[docs/research/figma-skill-compression/](../docs/research/figma-skill-compression/README.md)**. It measures where the cuttable mass actually is, reads the published evidence skeptically, models retry risk against token saving, and ends with a falsifiable experiment roadmap. It is also the source of the figquery retraction above.

---

## What this document does not establish

Stated plainly so it isn't read as more than it is:

- **No measured payload sizes for `get_design_context`.** Payload scales with the design, and a number from one file wouldn't generalize. The *relative* ordering (`get_metadata` ≪ `get_design_context`) is documented by Figma and is the actionable part.
- **The figquery efficiency claim is upstream's, not benchmarked here.** The size difference is measured; the round-trip improvement is asserted by the skill text and not independently verified.
- **The `get_figma_skill` quota question is open** — see above.
- **Rate limits drift.** Figma reserves the right to change them and the write-to-canvas beta is flagged to become usage-based paid. Re-check the table before making a seat-purchase decision on it.

---

*Skill sizes, tree diffs, and the tool count measured September 2026 against [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) at commit `a5e7e04` (v2.2.108) and a live session with the official server connected. Rate limits verified against Figma's published docs the same day. Upstream ships no LICENSE file and states that use of the server and its skills is governed by the [Figma Developer Terms](https://www.figma.com/legal/developer-terms/) — which is why this repo documents the skills and links upstream rather than vendoring a copy.*
