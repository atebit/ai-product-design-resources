# MCP Servers for Designers

A curated, verified selection of Model Context Protocol (MCP) servers for a design-focused agent stack. Quality over quantity: ~12 picks, each checked against its live repo/docs (August 2026).

**What MCP is.** The Model Context Protocol is an open standard that lets an AI agent call tools exposed by external servers — so instead of *describing* your Figma file, browser, or component library to the model, the agent queries and acts on them directly. An MCP server is a small program (local process or hosted endpoint) that advertises a set of typed tools the agent can invoke. For designers, MCP is what turns an agent from "text about design" into an actor inside design tools.

**How servers are configured.** In Claude Code, add a server with `claude mcp add <name> -- npx <package>` or declare it in a project `.mcp.json`; in Cursor, the same JSON goes in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

Local servers use `command`/`args` (stdio transport); hosted servers use a `url` (HTTP/SSE transport, often with OAuth). One practical rule before adding anything: every connected server's tool descriptions sit in the agent's context window. Install the few servers your workflow actually uses, not all twelve.

---

## The Recommended Stack

The minimal stack for a design-focused agent is **four servers** — one per role in the loop:

| Role | Server | Why |
|---|---|---|
| Design source of truth | **Official Figma MCP** | Highest-fidelity design context, variables/tokens, and Code Connect mapping to your real components |
| Eyes and hands | **Playwright MCP** | The agent renders, screenshots, and interacts with the UI it just built — the verification loop that separates design-capable agents from text generators |
| Component library | **shadcn MCP** | Agent discovers and installs real, documented components (yours or public registries) instead of hallucinating bespoke divs |
| Living docs + tests | **Storybook MCP** | Agent reuses documented components, previews stories, and runs interaction/a11y tests on what it generated |

Rationale: this covers the full loop — *read the design → build with real components → see the result → test it*. Everything else in this list is a swap or an addition for a specific situation:

- **No paid Figma seat, or payloads too heavy?** Swap in **Framelink (Figma-Context-MCP)**.
- **Need the agent to write into Figma or manage variables at scale?** Add **figma-console-mcp** (or use the official server's write tools).
- **Debugging performance, network, or Chrome-specific rendering?** Swap Playwright for **Chrome DevTools MCP**.
- **On Carbon?** Add **Carbon MCP**. Working design-in-IDE? Consider **Pencil**.

---

## Design-to-Code (Figma)

### Official Figma MCP Server (Dev Mode MCP)

[developers.figma.com/docs/figma-mcp-server](https://developers.figma.com/docs/figma-mcp-server/)

**What it does.** Figma's first-party server. Reads design context out of Figma for faithful design-to-code, and (newer) writes native Figma content back to the canvas — frames, components, variables, auto layout. Integrates Code Connect so generated code uses *your* component library rather than generic markup.

**Tool surface (key tools).**
- `get_design_context` — layout hierarchy, text, component props, and styling for a frame/layer (the workhorse)
- `get_metadata` — sparse XML map (IDs, names, types, positions) for cheap orientation before targeted fetches
- `get_screenshot` — visual reference image of a node
- `get_variable_defs` — variables/tokens used in a selection
- `get_code_connect_map` / `add_code_connect_map` — mapping between Figma components and code components
- Write tools (`create_new_file`, `use_figma`, `generate_diagram`, asset upload) for pushing designs/diagrams into Figma and FigJam

**How it works.** Two modes: a **remote hosted server** at `https://mcp.figma.com/mcp` (OAuth, works on all seats and plans, no desktop app), and a **desktop server** run by the Figma desktop app that supports selection-based context ("implement my current selection") but requires a Dev or Full seat on a paid plan. Rate limits are per-seat (roughly 200 tool calls/day on Organization Full/Dev seats, 600 on Enterprise). Write-to-canvas is free during beta but flagged to become usage-based paid.

**When to use.** Design-to-code and code-to-design; the design-system bridge when you have Code Connect coverage.

**Quality/maturity.** Official, actively developed, the ecosystem default. Best-in-class fidelity, and the only option with Code Connect.

**Caveats.** Full experience gated on paid seats; daily tool-call limits are real in heavy sessions; `get_design_context` payloads for large frames are token-expensive — use the `get_metadata` → targeted-fetch pattern.

### Framelink — Figma-Context-MCP

[github.com/GLips/Figma-Context-MCP](https://github.com/GLips/Figma-Context-MCP)

**What it does.** The most popular open-source Figma MCP (~15.6k stars, MIT). Paste a Figma link; the server fetches the file via the REST API and returns a *simplified, translated* layout/styling payload — deliberately stripped down so the model gets only what it needs, which improves accuracy and cuts token cost.

**Tool surface.** Intentionally tiny: `get_figma_data` (simplified layout + styling for a file or node) and `download_figma_images` (export image/SVG assets).

**How it works.** `npx figma-developer-mcp` with a Figma **personal access token** — works with any Figma account, including free plans. Read-only. No plugin, no desktop app.

**When to use.** Design-to-code when you don't have Dev/Full seats, when official-server payloads blow the context budget, or when you want a dead-simple two-tool surface.

**Quality/maturity.** Very high adoption, actively maintained, the de facto community standard.

**Caveats.** Read-only; no Code Connect (generated code won't automatically map to your component library); simplification discards some fidelity (effects, complex fills) by design.

### cursor-talk-to-figma-mcp

[github.com/sonnylazuardi/cursor-talk-to-figma-mcp](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp)

**What it does.** Bidirectional Figma control (~6.9k stars, MIT): the agent reads *and modifies* live Figma documents — create frames/text/shapes, restyle, manage auto layout, batch-update text, create annotations and connectors, instantiate components, export images.

**Tool surface.** Large read+write set: document/selection/node inspection, text and style modification, element creation, component instance generation, image fills, node move/delete, annotation tools, batch operations, export.

**How it works.** Three parts: a TypeScript MCP server (Bun runtime), a Figma plugin you run inside Figma, and a WebSocket bridge between them. The plugin must be open in the target file for anything to work.

**When to use.** Code-to-design and agent-driven design edits: bulk content replacement across mockups, programmatic layout generation, "make all these labels sentence case" tasks.

**Quality/maturity.** Popular and maintained, but a community project with moving parts (Bun + plugin + socket) — more setup friction and fragility than the other two.

**Caveats.** Requires the plugin running in an open file; write operations are only as good as the agent's spatial judgment; official server's write tools now overlap this territory.

### Choosing between the three Figma options

| | **Official Figma MCP** | **Framelink** | **talk-to-figma** |
|---|---|---|---|
| Direction | Read + write (write in beta) | Read only | Read + write |
| Fidelity | Highest; Code Connect maps to your real components | Good; simplified on purpose | Good read; full write |
| Auth / cost | OAuth; desktop mode needs Dev/Full paid seat; daily call limits | Personal access token; any plan incl. free | Free; needs plugin running + Bun |
| Setup friction | Low (remote) / medium (desktop) | Lowest | Highest |
| Payload/token cost | Heavy unless you use metadata-first pattern | Lightest | Moderate |
| Best for | Teams with paid seats + design system (Code Connect) | Individuals, free plans, token-budget-sensitive work | Agent-driven *editing* of Figma files |

**Default advice:** official server if your org has the seats (Code Connect is the differentiator that keeps generated code on-system); Framelink if you don't or the payloads hurt; talk-to-figma only when the job is programmatically *changing* designs.

---

## QA and Verification (Browser)

### Playwright MCP

[github.com/microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**What it does.** Microsoft's official browser-automation MCP (~35.8k stars, Apache 2.0) — the standard "eyes and hands" for design agents. Operates on structured **accessibility snapshots** rather than pixels, so the agent interacts with the page deterministically and cheaply, with screenshots available when visual judgment is needed.

**Tool surface.** ~14 core automation tools (`browser_navigate`, `browser_click`, `browser_fill_form`, `browser_snapshot`, `browser_take_screenshot`, hover, drag, keyboard, dialogs, file upload), plus console messages, network inspection, tab management, JS evaluation, coordinate-based vision tools, tracing/video, and PDF generation.

**How it works.** `claude mcp add playwright -- npx @playwright/mcp@latest` (or the equivalent Cursor config). Local, no auth. Multi-browser (Chromium/Firefox/WebKit).

**When to use.** The verification loop: after every UI change the agent opens the page, snapshots/screenshots it, checks console errors, and tests responsive breakpoints. This is the backbone of design-review workflows (e.g., OneRedOak's) and the single highest-leverage add for any UI work.

**Quality/maturity.** Official Microsoft, extremely active, massive adoption. The safe default.

**Caveats.** Accessibility snapshots of complex pages can be verbose; canvas-heavy UIs (charts, WebGL) need screenshot fallback; no deep performance profiling (that's Chrome DevTools MCP's job).

### Chrome DevTools MCP

[github.com/ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)

**What it does.** The official Chrome team server (~48.5k stars): gives agents full DevTools access to a live Chrome — performance traces, Lighthouse audits, network and console inspection, heap snapshots — plus standard input automation.

**Tool surface.** 31+ tools: `performance_start_trace` / `performance_stop_trace` / `performance_analyze_insight`, `lighthouse_audit`, `list_network_requests` / `get_network_request`, `take_screenshot`, `evaluate_script`, `list_console_messages`, `click` / `fill` / `type_text` / `drag`, page/tab management, and a dozen heap-snapshot tools.

**How it works.** `npx chrome-devtools-mcp@latest` (also ships as a Claude Code plugin marketplace). Requires stable Chrome and Node LTS. Local, no auth.

**When to use.** When "does it look right" becomes "why is it slow/janky/broken": Core Web Vitals, layout shift, animation jank, memory leaks, Lighthouse scores. Complements or replaces Playwright for Chrome-only teams.

**Quality/maturity.** Official, very actively maintained, the most-starred server on this list.

**Caveats.** Chrome-only (no cross-browser checking); tool surface overlaps Playwright's — running both doubles context cost for little gain, so pick per task.

---

## Design System and Components

### Storybook MCP (`@storybook/addon-mcp`)

[github.com/storybookjs/mcp](https://github.com/storybookjs/mcp) · [storybook.js.org/docs/ai](https://storybook.js.org/docs/ai)

**What it does.** Official Storybook addon that runs an MCP server inside your Storybook dev server at `http://localhost:6006/mcp`. The agent can read component documentation and props, get story-authoring instructions, preview stories live, and run interaction + accessibility tests on stories it just wrote — closing the generate → verify loop at the component level.

**Tool surface.** Three toolsets, individually toggleable:
- **docs:** `list-all-documentation`, `get-documentation`, `get-documentation-for-story`
- **dev:** `get-changed-stories`, `get-storybook-story-instructions`, `preview-stories`
- **test:** `run-story-tests` (interaction + axe a11y)

**How it works.** Install the addon into Storybook 10.3+, run Storybook, point your agent at the localhost endpoint. Companion Claude Code and Codex plugins ship in the same monorepo.

**When to use.** Design-system reuse ("use our documented Button, don't invent one"), story generation, and component-level QA — the code-side counterpart to the Figma server's design-side context.

**Quality/maturity.** Official and actively developed, but explicitly **experimental/preview** — API may change.

**Caveats.** AI features (manifests + MCP) are **React-only** as of mid-2026; requires a running Storybook; small ecosystem footprint so far (~265 stars) despite official status.

### shadcn MCP

[ui.shadcn.com/docs/mcp](https://ui.shadcn.com/docs/mcp)

**What it does.** The official shadcn registry server: agents browse, search, and install components from the shadcn/ui registry *and any registry that speaks the registry schema* — public, third-party, or your company's private one. "Add a login form" becomes a real install of real, open code into your repo.

**Tool surface.** Registry discovery and installation: list registries configured for the project, list/search items across registries, view item source and examples, and produce the exact `npx shadcn add` command for installation. (Tool names in the current CLI include `get_project_registries`, `search_items_in_registries`, `view_items_in_registries`, `get_add_command_for_items`.)

**How it works.** `npx shadcn@latest mcp` in `.mcp.json` / `.cursor/mcp.json`. Needs a valid `components.json` in the project; namespaced registries (`@acme/...`) and private registries with auth headers are configured there.

**When to use.** UI generation grounded in a real component library; distributing your own design system to agents (publish a registry, and every MCP-enabled agent can consume it).

**Quality/maturity.** Official, mature, and strategically important — the registry model has become the de facto distribution format for AI-native component ecosystems.

**Caveats.** Copy-in "open code" model means no versioned upgrades of installed components; quality of third-party registries varies — curate which ones you configure.

### Carbon MCP (IBM)

[github.com/carbon-design-system/carbon-mcp](https://github.com/carbon-design-system/carbon-mcp) · [carbondesignsystem.com/developing/carbon-mcp/overview](https://carbondesignsystem.com/developing/carbon-mcp/overview/)

**What it does.** IBM's official server for the Carbon Design System: search Carbon and IBM Products documentation (usage, accessibility, guidance) and search real Carbon React / Web Components code examples, icons, and pictograms — so agents generate on-system Carbon UI instead of approximations.

**Tool surface.** Deliberately minimal: `docs_search` (documentation, component guidance, a11y) and `code_search` (code examples, icons, pictograms, complete example app files).

**How it works.** Installable across MCP-enabled clients (Claude Code, Claude Desktop, Cursor, VS Code + Copilot, IBM Bob); no Carbon-side account needed.

**When to use.** Any team building on Carbon; also worth studying even if you're not — alongside Atlassian's ADS work, it's the clearest public template for "official design-system MCP" (two retrieval tools, nothing else).

**Quality/maturity.** Official IBM, maintained by the Carbon team.

**Caveats.** Only valuable if Carbon (or its patterns) are relevant to you; retrieval-only — it doesn't install or scaffold code.

### southleft/design-systems-mcp

[github.com/southleft/design-systems-mcp](https://github.com/southleft/design-systems-mcp)

**What it does.** A design-systems *knowledge base* as an MCP server: 200+ curated entries (761+ chunks) spanning the W3C DTCG token spec, WCAG 2.2, WAI-ARIA authoring practices, and 10+ major design systems (Material, Fluent, Carbon, Polaris, Ant...), served via hybrid semantic + keyword search.

**Tool surface.** `search_design_knowledge`, `search_chunks`, `browse_by_category` (components / tokens / patterns / guidelines / workflows), `get_all_tags`.

**How it works.** Easiest path: the hosted endpoint `https://design-systems-mcp.southleft.com/mcp` added as a custom connector/HTTP server — zero install. Self-hosting needs Cloudflare Workers + Supabase + an OpenAI key.

**When to use.** Grounding design decisions in established practice: naming tokens, choosing component APIs, accessibility patterns — a reference librarian for design-system work rather than a build tool.

**Quality/maturity.** Small (~195 stars) but maintained by a design-systems consultancy (Southleft); content curation is the value, and it's good.

**Caveats.** Knowledge freshness depends on the maintainer's curation cadence; hosted endpoint means your queries transit a third-party service.

---

## Tokens, Variables, and Figma Operations at Scale

### southleft/figma-console-mcp

[github.com/southleft/figma-console-mcp](https://github.com/southleft/figma-console-mcp)

**What it does.** "Your design system as an API" (~2.1k stars): the deepest Figma tool surface available — full variable/collection CRUD, bidirectional design-token sync in 10 formats (DTCG, CSS, Tailwind, TypeScript...), programmatic design and component/variant creation, WCAG scanning, real-time console log access for plugin debugging, FigJam/Slides authoring.

**Tool surface.** 114 tools in local mode (101 cloud, 9 read-only remote), grouped into: diagnostics, visual debugging (screenshots, console logs), design extraction, design creation, token export/import, variable management, FigJam/Slides, accessibility scanning, and shared-library inspection.

**How it works.** A desktop-bridge Figma plugin connects over WebSocket to the local server (Figma Desktop required, no special launch flags); needs a Figma personal access token with file/variables scopes. A cloud-relay mode serves web-based clients.

**When to use.** Design-token pipelines (Figma variables ↔ code, both directions), bulk variable management, design-system audits, and Figma plugin debugging — the operations the official server doesn't cover. Explicitly complementary to the official MCP, not a replacement (it does no code generation / Code Connect).

**Quality/maturity.** Impressively active community project with rapid releases; the most capable token-sync option in the ecosystem.

**Caveats.** 114 tool descriptions is a *lot* of context — enable it for token/variable sessions, not permanently; community-maintained with a fast-moving surface; Desktop-only for full capability.

---

## Generation and Ideation

### 21st.dev MCP (Magic)

[21st.dev/mcp](https://21st.dev/mcp) · [github.com/21st-dev/magic-mcp](https://github.com/21st-dev/magic-mcp)

**What it does.** Hosted server from 21st.dev (~5.6k stars on the original Magic repo, now a compatibility layer forwarding to the unified "21st MCP"): search 10,000+ curated React/Tailwind components, pull design inspiration, generate new UI from prompts, search logos, and manage team component libraries — generation grounded in a curated gallery rather than raw model priors.

**Tool surface.** Component/theme/template catalog search, `generate` (UI generation with variants), `get_inspiration`, `search_logo`, team library management.

**How it works.** Free API key from 21st.dev/mcp; hosted service configured via npx wrapper or URL. Note: legacy Magic API keys were reset and no longer work — onboard via the new 21st MCP.

**When to use.** Ideation and greenfield UI — landing pages, marketing sections, dashboards — when there's no design system to honor yet and you want stronger-than-default visual output.

**Quality/maturity.** Established product with real adoption; actively developed, but a commercial hosted dependency.

**Caveats.** Output is generic React/Tailwind — it will *not* follow your design system (pair with rules files or swap to shadcn MCP once a system exists); free tier limits apply; the repo-vs-service split can confuse setup.

### Pencil MCP (pen.dev)

[pen.dev](https://www.pen.dev/) · [docs.pencil.dev](https://docs.pencil.dev/getting-started/ai-integration)

**What it does.** An agent-native design canvas *inside your IDE*: designs live as open-format `.pen` JSON files in your repo, versioned with Git, editable both by humans (Figma-like vector canvas in a VS Code/Cursor extension) and by agents through a local MCP server. The category-defining "design-as-code" tool.

**Tool surface.** `get_editor_state`, `get_guidelines`, `batch_get`, `batch_design` (create/edit nodes), `snapshot_layout`, `get_screenshot`, `get_variables` / `set_variables` (tokens), `export_nodes` (PNG/JPEG/WEBP/PDF). A CLI (`@pencil.dev/cli`) drives the same tools headlessly.

**How it works.** Install the Pencil extension in VS Code/Cursor; the MCP server ships with it. No cloud round-trip for file access — designs are local files.

**When to use.** Designer-developer or solo workflows where design and code should share one repo: agents can design, screenshot their own output, iterate, and then implement — the tightest design↔code loop currently available.

**Quality/maturity.** Young commercial product (a16z Speedrun-backed) with fast iteration and genuine novelty; already spawning open-source clones (open-pencil, openpencil), which signals the model has legs.

**Caveats.** Proprietary product and early — expect churn; `.pen` is open-format but the editor is not open source; small ecosystem vs. Figma; team/multiplayer features immature.

---

## Evaluated But Not Selected

- **kenneives/design-token-bridge-mcp** — well-designed 9-tool token translator (Tailwind/CSS/Figma/DTCG → Material 3, SwiftUI) with WCAG validation, but ~5 stars and single-maintainer; figma-console-mcp covers the sync need with far more adoption. Watch it.
- **yajihum/design-system-mcp** — nice personal-scale pattern (component props + Style Dictionary tokens via MCP), but a template to copy, not a server to adopt.
- **Tokens Studio Relay** — promising official token MCP from Tokens Studio, but early, thinly documented, and tied to the Tokens Studio plugin stack; revisit once it stabilizes.
- **BartWaardenburg/recraft-mcp-server** — clean 16-tool Recraft integration, but ~10 stars, single-provider, and paid-API-dependent; no image-gen MCP has clear community consensus yet.
- **merlinrabens/image-gen-mcp-server** — the multi-provider idea was right, but the project has pivoted to a Claude Code plugin/CLI (shipdeckai) rather than an MCP server.
- **EverArt MCP** — Anthropic reference server; the reference-servers image tools are archived/unmaintained.
- **Atlassian ADS MCP** — the best-documented design-system MCP program (with published metrics), but built for Atlassian's internal ecosystem; read their write-ups as a blueprint rather than installing anything.
- **Supernova / zeroheight MCPs** — solid official servers, but only meaningful if you're already a paying customer of those platforms.
- **Legacy `@modelcontextprotocol` Figma community servers and misc. browser MCPs (Browser MCP, BrowserBase, etc.)** — superseded for this use case by the official Figma, Playwright, and Chrome DevTools servers.

---

*Verified August 2026 against live repos and docs. Star counts and rate limits drift; the architecture of each pick changes slower than the numbers.*
