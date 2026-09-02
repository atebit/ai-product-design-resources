# Catalog Extraction from Real Design Systems — What Source Can Yield, Where Curation Is Unavoidable, and a Pipeline with Drift Gates

**Scope:** This document answers open question Q2 of [04 §10](04-deterministic-assembly.md) ("How is the catalog produced? … Extraction is the only non-rotting option; feasibility depends on DS prop-type hygiene") and Q4 of [02 §8](02-intent-spec-and-context.md) ("Can component-source → doc-page generation be fully automated … or does each primitive need hand-written usage guidance?"). It takes as given the catalog design in [01 §4](01-primitive-codification.md) (Zod as hub, TS-style prompt rendering, DTCG tokens), the sync principles in [01 §6](01-primitive-codification.md) ("generated from them, never hand-maintained in parallel"), the serving thresholds in [02 §3](02-intent-spec-and-context.md), and the "pointers beat parsing" verdict on Figma Code Connect in [design-sdlc/01 §3](../design-sdlc/01-source-of-truth-figma-vs-code.md) — none of which is repeated. What is new here: the current state (September 2026) of every extractor that could feed the catalog, an audit of eleven public design systems as extraction subjects, what the design-system MCP/llms.txt wave actually exposes per component, the irreducible curated overlay, and a concrete source → extractor → overlay → catalog pipeline with drift detection and coverage metrics. Every claim links its source; fetch failures are marked. Release dates come from the npm registry and GitHub API queried on 2026-09-02.

## Table of Contents

1. [What the catalog needs versus what extractors produce](#1-what-the-catalog-needs-versus-what-extractors-produce)
2. [Prop-type extraction: the React toolchain and its hard cases](#2-prop-type-extraction-the-react-toolchain-and-its-hard-cases)
3. [Variant and recipe extraction](#3-variant-and-recipe-extraction)
4. [Story, manifest and design-tool extraction](#4-story-manifest-and-design-tool-extraction)
5. [Real design systems as extraction subjects](#5-real-design-systems-as-extraction-subjects)
6. [The llms.txt / MCP wave: what is actually exposed per component](#6-the-llmstxt--mcp-wave-what-is-actually-exposed-per-component)
7. [What cannot be extracted, and how teams encode it today](#7-what-cannot-be-extracted-and-how-teams-encode-it-today)
8. [Pipeline proposal: extractor + curated overlay + drift gate](#8-pipeline-proposal-extractor--curated-overlay--drift-gate)
9. [Small-DS versus large-DS thresholds](#9-small-ds-versus-large-ds-thresholds)
10. [Tradeoffs](#10-tradeoffs)
11. [Recommended extraction stack](#11-recommended-extraction-stack)
12. [Open questions](#12-open-questions)
13. [Recommended experiments](#13-recommended-experiments)
14. [Candidate picks for skill-resources](#14-candidate-picks-for-skill-resources)
15. [Sources](#15-sources)

---

## 1. What the catalog needs versus what extractors produce

The catalog in [01 §4.4](01-primitive-codification.md) needs seven kinds of fact per primitive. They fall into three extractability tiers, and the whole feasibility question reduces to how much of the DS lands in each:

| Catalog field | Where it lives in a real DS | Tier |
|---|---|---|
| Component name, import path | Package exports, `.d.ts` | **A — mechanical** |
| Typed props, required-ness, defaults, JSDoc descriptions | TS interfaces + JSDoc; propTypes in older systems | **A**, degrading to **B** on hard type shapes (§2) |
| Variants and their enums | Either a prop union (`variant: 'primary' \| 'ghost'`) or a styling-library recipe (`cva`, `tv`, Panda) | **A** if a type; **B** if a recipe that must be parsed (§3) |
| Slots (named children) | `children`, `ReactNode` props, `figma.slot`, CEM `@slot` | **B — inferable but semantically empty**: the extractor sees `header?: ReactNode`, not "at most one Heading" |
| Token bindings | Recipe class strings, style props, Figma Variables `codeSyntax` | **B** |
| Composition / nesting rules | Nowhere structured; prose docs, lint rules, JSDoc | **C — curated** |
| Usage guidance, pattern-level definitions, a11y contracts, responsive behavior | MDX docs, Storybook docs pages, DESIGN.md-style prose | **C — curated** |

The evidence below shows Tier A is a solved problem with a moving toolchain, Tier B has a good answer per styling library and a poor one across them, and Tier C is exactly the labor that Atlassian, GitHub, Adobe, and IBM all report spending on — none of them extracted it.

## 2. Prop-type extraction: the React toolchain and its hard cases

**What it is:** Turning a component's TypeScript surface into a JSON prop table. Three lineages exist: Babel-AST tools (react-docgen), TypeScript-checker tools (react-docgen-typescript, ts-morph scripts, TypeDoc, API Extractor), and the new language-server tools (Volar-based `vue-component-meta` and Storybook's React Component Meta).

**Why it matters:** [01 §6](01-primitive-codification.md) named react-docgen-typescript as the primary extractor. Its status has changed enough to matter.

**Key findings:**

| Tool | Status (2026-09-02) | Type resolution | Known hard cases |
|---|---|---|---|
| **react-docgen-typescript** | v2.4.0 released 2025-06-05, npm last modified 2025-06-10; repo pushed 2026-08-30 with 22 open issues and 14 open PRs ([GitHub API](https://github.com/styleguidist/react-docgen-typescript); [releases](https://github.com/styleguidist/react-docgen-typescript/releases)). Not archived, but no release in 15 months | Full TS checker — resolves imported types, generics, intersections | README: "only named exports are supported"; union extraction is opt-in via `shouldExtractValuesFromUnion`; the maintainers' own framing: "The typescript is pretty complex and there are many different ways how to define components and their props so it's really hard to support all these use cases" ([README](https://github.com/styleguidist/react-docgen-typescript)). Union-typed props were unsupported until [PR #247 closed issue #57](https://github.com/styleguidist/react-docgen-typescript/issues/57) (opened 2018). Storybook users report "~2s overhead per component" ([discussion #34477](https://github.com/storybookjs/storybook/discussions/34477)) |
| **react-docgen** | v8.0.3 published 2026-03-13; 103 open issues, 3,819 stars ([GitHub API](https://github.com/reactjs/react-docgen)). Storybook's default since 8.0 ([Storybook TS docs](https://storybook.js.org/docs/configure/integration/typescript)) | Babel AST only — no checker. The official TypeScript reference page reads "This content hasn't been created yet" ([react-docgen.dev](https://react-docgen.dev/docs/reference/documentation/typescript)) | Types imported from another file are opaque; `forwardRef<HTMLButtonElement, Props>()` loses union members unless the destructured parameter is re-annotated — [issue #883](https://github.com/reactjs/react-docgen/issues/883) closed "not planned" |
| **React Component Meta (RCM)** | Storybook 10.4 (May 2026): "faster, higher-quality component metadata based on Volar and the TypeScript Language Server"; enabled by `features.experimentalReactComponentMeta`; "Once it's stabilized we plan to standardize on RCM for both MCP and Storybook Docs" ([Storybook 10.4](https://storybook.js.org/blog/storybook-10-4/)) | Language-server (checker-backed) | Positioned "to replace both `react-docgen` and `react-docgen-typescript`"; edge-case list lives in the PR, not the post |
| **vue-component-meta** | v3.3.11, 2026-08-21; "Statically extract metadata such as props, events, slots, and exposed from Vue components" ([README](https://github.com/vuejs/language-tools/blob/master/packages/component-meta/README.md)) | Volar checker | Slots are first-class output — the one mainstream extractor where they are |
| **Compodoc + storybook-addon-angular-manifest** | Compodoc 2.0.0 (2026-06-28); addon 0.1.2 (2026-03-31) "generates component manifests for Angular components using Compodoc … enabling … Storybook MCP" ([addon page](https://storybook.js.org/addons/storybook-addon-angular-manifest)) | Decorator + JSDoc | Inputs/outputs only; content projection is prose |
| **TypeDoc / API Extractor** | TypeDoc 0.28.20 (2026-07-05); API Extractor 7.59.0 (2026-08-21). API Extractor's doc model is "your extracted API signature and doc comments" as `.api.json` ([api-extractor.com](https://api-extractor.com/pages/setup/generating_docs/)) | Full checker | Library-level, not component-aware: no notion of "props of a component", no default-value inference from destructuring |
| **ts-morph scripts** | v28.0.0 (2026-04-12) | Whatever you write; `getTypeAtLocation` + `getProperties` + JSDoc tags | The reference tutorial's own caveat: "There is still a lot more we'd need to do for this to be production-ready, like checking if the function is wrapped in `React.forwardRef`, determine if the type is imported from another file, among many other edge cases" ([souporserious](https://souporserious.com/generate-typescript-docs-using-ts-morph/)) |

The hard-case list is stable across tools: **discriminated unions** (a `Props = A | B` component becomes either one merged table or "children only"), **generics** (`<T>` props flatten to `any`), **polymorphic `as`** (the prop set depends on the element; extractors emit the base case), **forwardRef/memo/HOC wrappers** (the component-detection step fails before types are even consulted), and **inherited DOM attributes** (200+ `HTMLAttributes` members flood the table unless filtered — the standard fix is a `propFilter` excluding `node_modules`, which [Rachel Cantor's write-up](https://rachel.fyi/posts/storybook-mcp-reads-your-manifest-not-your-docs-tab) had to add before her manifest was usable). MUI, the largest React DS with generated API docs, uses `react-docgen ^8.0.3` plus `@typescript/typescript6` in `packages-internal/api-docs-builder/package.json` ([repo](https://github.com/mui/material-ui/tree/master/packages-internal/api-docs-builder); README fetch returned 404), with separate `ComponentApiBuilder` and `HookApiBuilder` classes — i.e., even MUI runs a custom builder on top of docgen rather than docgen alone.

**Open questions:** Whether RCM resolves the forwardRef/union and polymorphic cases is unverified — the post promises a case list in the PR, not in the docs. Nobody publishes a hard-case benchmark across extractors; §13 proposes one.

## 3. Variant and recipe extraction

**What it is:** When variants are not prop unions but recipe definitions in a styling library, the extractor has to read the recipe. Feasibility depends entirely on whether the library exposes its config.

| Library | Version / status | Introspectable? | Evidence |
|---|---|---|---|
| **class-variance-authority (cva)** | 0.7.1 published 2024-11-26; repo active (pushed 2026-09-02) but the stable package is stale ([GitHub API](https://github.com/joe-bell/cva)) | **No runtime access** — `cva()` returns "A `cva` component function" and nothing else ([API reference](https://cva.style/docs/api-reference)); variants are recoverable only via the `VariantProps<typeof button>` type or by AST-parsing the `cva({ variants: … })` literal | shadcn/ui's whole registry is written this way, so any shadcn-derived DS needs the AST path |
| **tailwind-variants (`tv`)** | 3.3.1, 2026-08-03 | **Yes, fully** — the returned function carries `variants`, `variantKeys: string[]`, `defaultVariants`, `compoundVariants`, `slots`, `compoundSlots` ([API reference](https://www.tailwind-variants.org/docs/api-reference)) | Import the component module, read the object: variants, defaults and slot names fall out without parsing |
| **vanilla-extract recipes** | 0.5.7, 2025-12-11 | **Partially** — `button.variants(); // -> ['color', 'size']` and `classNames.variants.color.neutral`, so variant keys and values are enumerable at runtime ([docs](https://vanilla-extract.style/documentation/packages/recipes/)) | Defaults and compound variants are not exposed |
| **Panda CSS** | `@pandacss/dev` 1.12.0, 2026-08-28 | **Yes, by design** — config recipes are declared in `panda.config.ts` under `theme.recipes` via `defineRecipe` (plain data), typed through `RecipeVariantProps`; the CLI's `panda analyze --scope recipe` with `--outfile` will "Output analyze report in given JSON filepath" ([recipes](https://panda-css.com/docs/concepts/recipes); [CLI](https://panda-css.com/docs/references/cli)) | The one styling library whose variants, slot recipes, and token usage are all first-class JSON. Note config recipes are "JIT — Panda only emits variants it finds in your code", so the *catalog* must read the config, not the generated CSS |
| **Stitches** | Repository archived; README carries "[Not Actively Maintained]"; last push 2025-02-10 ([GitHub API](https://github.com/stitchesjs/stitches)) | Was config-based | Treat any Stitches-based DS as a migration candidate before extraction |

The practical rule: **tailwind-variants and Panda give you variants for free; cva and hand-written class maps cost an AST pass; prop-union variants are already handled by §2.** For cva the AST pass is small (find `cva(` call, read the object literal's `variants` and `defaultVariants` keys) and shadcn's `registry validate` shows the ecosystem already tolerates build-time inspection of these files (§5).

## 4. Story, manifest and design-tool extraction

### 4.1 Storybook's components manifest — the closest thing to a React component manifest

Storybook shipped a components manifest as an "experimental feature included in v10.1 … specifically tailored for Storybook's official MCP addon" ([Gutenberg PR #74626](https://github.com/WordPress/gutenberg/pull/74626), which enabled it for Gutenberg's component library); in 10.3.0 the flag was renamed to `componentsManifest` and defaulted on ([v10.3.0 release](https://github.com/storybookjs/storybook/releases/tag/v10.3.0)). Per component the manifest carries `id`, `name`, `path`, an `import` statement, `description`, `jsDocTags`, a `props` object with each prop's "required status, type, description, and default value", a `stories` array with "id, name, and code snippet for each story", and `subcomponents` ([Manifests docs](https://storybook.js.org/docs/ai/manifests)). A debugger at `/manifests/components.html` shows "any errors or warnings that were encountered during manifest generation"; items opt out with `tags: ['!manifest']`; a second *docs manifest* is built from MDX pages. Manifest support covers "every React framework" plus `@storybook/angular-vite` and `@storybook/vue3-vite`; "Every other framework" is unsupported ([MCP overview](https://storybook.js.org/docs/ai/mcp/overview), marked "preview" at 10.6). `@storybook/addon-mcp` 10.6.0 was published 2026-09-02.

Two field reports set expectations. LogRocket's walkthrough measured a generated component at "263 lines (without MCP); 188 lines (with MCP)" and confirmed the docs toolset "is currently React-only" ([LogRocket](https://blog.logrocket.com/storybook-mcp-component-libraries/)). Rachel Cantor found the manifest silently dropped `parameters.docs.description.component` and all selection guidance: "an agent only ever sees what your pipeline chooses to surface, and when the pipeline drops something, it drops it silently" — her fix was to move "when to use X vs Y" into `CLAUDE.md` ([rachel.fyi](https://rachel.fyi/posts/storybook-mcp-reads-your-manifest-not-your-docs-tab)). That is the Tier C boundary observed in the wild.

### 4.2 Custom Elements Manifest — the standardized precedent

CEM is the only component manifest with a published schema: version 2.1.0 (2024-05-06), describing attributes, properties, methods, events, CSS parts, CSS variables, superclasses and module exports, with stated use cases including linting ("warning if unknown elements are used") and cataloging ([webcomponents/custom-elements-manifest](https://github.com/webcomponents/custom-elements-manifest)). The analyzer (0.11.0, 2025-11-04) "is able to figure out most of your components API by itself, but for some things it needs a little help, including the following: CSS Shadow Parts, CSS Custom Properties and Slots" — supplied via `@slot`, `@csspart`, `@cssprop`, `@fires`, `@attr` JSDoc tags ([getting started](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)). Dave Rupert calls it "low-effort, high-impact type work" and notes it now feeds MCP servers ([daverupert.com](https://daverupert.com/2025/10/custom-elements-manifest-killer-feature/)); `bennypowers/cem` ships a `cem mcp` command whose stated goal is HTML "with correct slot usage, appropriate attributes, and design system compliance" ([README](https://github.com/bennypowers/cem)). The lesson for React: **slots became extractable the moment the community agreed on a JSDoc tag for them.** There is no `@slot` convention in React docgen today.

### 4.3 Figma: Code Connect and Variables

Code Connect's React API maps design props to code props with `figma.string`, `figma.boolean`, `figma.enum`, `figma.instance`, `figma.children('*')`, `figma.nestedProps`, `figma.textContent`, and — new — `figma.slot('Content')` "for composable areas", with `variant: { Type: 'Primary' }` restrictions for per-variant examples ([React docs](https://developers.figma.com/docs/code-connect/react/)); Storybook CSF stories can serve as the examples via `parameters.design.examples` ([Storybook integration](https://developers.figma.com/docs/code-connect/storybook/)). "Both Code Connect UI and CLI feed into Figma's MCP server", though UI mappings "do not display code snippets in the Inspect panel" and "You can connect one GitHub repository to each Figma library file" ([Figma help](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect)). The MCP's `get_code_connect_map` returns per node `componentName`, `source`, `snippet`, `snippetImports`, `version`, `label` ([tools reference](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)). `@figma/code-connect` 2.0.0 was published 2026-09-02. For the catalog, Code Connect files are a **second, human-authored source of variant/slot semantics** — a `figma.enum('Size', {...})` map is a curated enum, and `figma.slot`/`figma.children` calls are curated slot declarations. Adoption is thin: Kaelig's July 2026 survey finds Code Connect in only 2 of 20 systems (§5).

The Variables REST API "is available to full members of Enterprise orgs" only; each variable carries `resolvedType`, `valuesByMode`, `scopes` ("An array of scopes in the UI where this variable is shown"), `description`, and `codeSyntax` for `WEB`/`ANDROID`/`iOS` ([variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/)). `codeSyntax` is the token-binding field the catalog wants; `scopes` is a partial token-role constraint (a color scoped to `TEXT_FILL` should not appear as a border). Non-Enterprise teams get `get_variable_defs` from the MCP for a *selection* only.

### 4.4 Design-system documentation platforms

zeroheight's MCP explicitly composes upstream sources — "Design properties (source: Figma's MCP)" and "Code properties (source: Storybook's MCP)" — and exposes only "published, approved guidelines" ([zeroheight.com/mcp](https://zeroheight.com/mcp/)). Supernova positions itself as "design & engineering context ready for AI agents" and points agents to its own `/llms.txt`; its comparison page's "40+ tools" figure is a vendor claim not independently verified ([supernova.io/for-ai](https://www.supernova.io/for-ai)). Knapsack announced an MCP server and an "Ingestion Agent" for March 2026 (search summary of [knapsack.cloud](https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine); not fetched). Backlight shut down: "divRIOTS' IDEs components.studio, webcomponents.dev and backlight.dev will shutdown June 1st 2025" ([divriots.com](https://divriots.com/blog/ide-product-update)). None of these platforms extracts anything the underlying Storybook/Figma/CEM sources do not; their value is the editorial layer on top — which is precisely the Tier C overlay, hosted.

## 5. Real design systems as extraction subjects

The July 2026 *State of AI in Design Systems* study (Kaelig Deloumeau-Prigent, CC-BY-4.0, data collected July 26–28) tracks "20 design systems, 6 platforms, 187 AI affordances, 157 coercion techniques" and finds 19 of 20 with MCP servers, 14 with llms.txt, 18 with agent skills, 13 with Storybook, and only 2 with Code Connect ([state-of-ai-in-design-systems](https://state-of-ai-in-design-systems.netlify.app/)). What follows assesses extractability, not AI affordance count.

| System | Source hygiene for extraction | Machine-readable component metadata today | What it contains / lacks |
|---|---|---|---|
| **shadcn/ui** | cva-based variants (AST pass, §3); Radix/Base UI primitives underneath; copy-in source | `registry.json` / `registry-item.json` with `$schema` `https://ui.shadcn.com/schema/registry-item.json`: `name`, `type` (`registry:ui/block/page/…`), `title`, `description`, `files`, `dependencies`, `registryDependencies`, `cssVars`, `css`, `envVars`, `docs`, `categories`, `meta` ([registry-item.json](https://ui.shadcn.com/docs/registry/registry-item-json)); MCP with seven tools incl. `search_items_in_registries`, `view_items_in_registries` ([Kaelig: shadcn](https://state-of-ai-in-design-systems.netlify.app/systems/shadcn-ui.md)); `shadcn registry validate` checks "item schema errors, duplicate item names, include rules, and local item file paths" and `include` composes multi-file registries ([May 2026 changelog](https://ui.shadcn.com/docs/changelog/2026-05-registry-include)) | The registry schema describes *distribution* (files, deps, CSS vars), **not props or variants** — those live only in the copied source. It is a packaging precedent for the pattern layer (`registry:block`), not a prop catalog |
| **Radix Themes** | Clean prop unions; `asChild` polymorphism | No llms.txt (open [issue #894](https://github.com/radix-ui/website/issues/895/linked_closing_reference?reference_location=REPO_ISSUES_INDEX) on the website repo); community MCP only ([radix-mcp-server](https://github.com/gianpieropuleo/radix-mcp-server)) | Docgen-friendly source; zero first-party metadata |
| **MUI** | Generated API JSON via `api-docs-builder` on `react-docgen ^8.0.3` + TypeScript 6 ([package.json](https://github.com/mui/material-ui/tree/master/packages-internal/api-docs-builder)) | `@mui/mcp` with three tools (`useMuiDocs`, `fetchDocs`, `generateReactCode`); 156-line llms.txt; "zero `figma.config.json` files"; "No Storybook for the component library" ([Kaelig: MUI](https://state-of-ai-in-design-systems.netlify.app/systems/material-ui.md)) | The best prop hygiene in the set (every prop has `@default` and a description because the docs build fails otherwise) but the MCP serves docs pages, not the JSON |
| **Chakra / Ark** | Panda-native (config recipes, slot recipes) | `@chakra-ui/react-mcp` 2.1.1 (2025-11-03): `list_components`, `get_component_props` ("Detailed props, types, and configuration options"), `get_component_example`, `get_theme` ([docs](https://chakra-ui.com/docs/get-started/ai/mcp-server)) | Props + examples + tokens; no composition rules |
| **Atlassian DS** | Internal; schemas are "TypeScript files alongside code" | Schemas cover "usage, code examples, props, content standards, and accessibility requirements" and generate the MCP, skill, and DESIGN.md ([Teaching AI to speak our design language](https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language)); `@atlaskit/ads-mcp` 1.10.2 (2026-09-02) with `ads_search_components`, `ads_get_all_components`, `ads_plan`, plus demoted `atlaskit_*` fallbacks "with examples and props" ([npm README](https://www.npmjs.com/package/@atlaskit/ads-mcp)) | **The 52% figure:** "52% accuracy improvement in AI calls", "34% faster on average across ADS specific tasks", "26% reduction in AI tooling calls, with 16% reduction in AI token usage" ([context engine post](https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era)), and "4.9% more accurate code generated" / "11% fewer errors" (same series). What they extracted: the *documentation*, not the source — "We translated the Atlassian Design System's documentation content into machine-readable schema files." Their prototyping post admits "2,000 lines" of custom instructions for foundational elements, "spent six months taming the complexity", and "From a screenshot, AI prototyping reaches about 70% Atlassian Design System accuracy in one pass" ([handoffs into handshakes](https://www.atlassian.com/blog/how-we-build/turning-handoffs-into-handshakes-integrating-design-systems-for-ai-prototyping-at-scale)) |
| **Polaris** | Polaris React is "⚠️ Deprecated"; the live surface is ~60 web components with published TypeScript declarations `@shopify/polaris-types` ([Kaelig: Polaris](https://state-of-ai-in-design-systems.netlify.app/systems/shopify-polaris.md)) | `@shopify/dev-mcp` with a "MANDATORY VALIDATION TOOL" that typechecks generated code against bundled types, max 3 retries; a `shopify-polaris-app-home` skill; **no llms.txt** (404s), no Code Connect, robots.txt blocks "GPTBot, ClaudeBot" (same source). The Shopify.dev MCP added Polaris web components 2025-05-21 ([changelog](https://shopify.dev/changelog/the-shopifydev-mcp-server-now-supports-polaris-web-components)) | A community MCP extracts "properties, events, slots, examples" for all 47 (now ~60) components from the docs ([erikmay/polaris-web-components-mcp](https://github.com/erikmay/polaris-web-components-mcp)) — web-component docs are slot-explicit in a way React docs are not |
| **Primer** | React + 52 `.figma.tsx` Code Connect files "Published by a dedicated CI job"; 7 SKILL.md skills incl. one on `slots` ([Kaelig: Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)) | `@primer/mcp` 1.0.0 (2026-09-02): the docs page lists 24 tools incl. `get_component`, `get_component_examples`, `get_component_usage_guidelines`, `get_component_accessibility_guidelines`, `list_patterns`, `get_pattern`, `lint_css` ([primer.style MCP](https://primer.style/product/getting-started/foundations/mcp/); GitHub README fetch returned 404) | The only server that separates *API*, *usage guidance*, *a11y guidance* and *patterns* as distinct tools — exactly the catalog's tier split |
| **Spectrum / React Aria** | `@adobe/spectrum-design-data` publishes a `component-schemas` package: "An NPM package of JSON Schema for Spectrum components. Used in the table of options" — property/values/default tables like `size: s/m/l/xl, default m` ([README](https://github.com/adobe/spectrum-design-data/tree/main/packages/component-schemas); schema directory listing returned 404) | Three MCP servers (`@adobe/design-data-mcp` 1.7.33, `@adobe/design-data-agent-mcp`, `@adobe/s2-docs-mcp`) ([spectrum-design-data/ai](https://opensource.adobe.com/spectrum-design-data/ai)); S2 skill of "387-line SKILL.md + 211 reference files"; llms.txt ~16 KB with `.md` twins ([Kaelig: S2](https://state-of-ai-in-design-systems.netlify.app/systems/react-spectrum-s2.md)) | Spectrum's schemas are *design* option tables (states, `is quiet`), not TS props — a rare case of a design-side machine-readable contract that predates AI |
| **Carbon** | "243 story modules colocated per component"; "~86 `*.figma.tsx` Code Connect files … auto-published … on every push to main" ([Kaelig: Carbon](https://state-of-ai-in-design-systems.netlify.app/systems/carbon-design-system.md)) | Carbon MCP with four tools (`docs_search`, `code_search`, `get_charts`, `labs_search`) behind IBMid OAuth; `carbon-builder` skill "23.7 KB SKILL.md + 12 reference files"; 13 KB llms.txt (same source; the official onboarding page fetch was truncated) | Search over docs and code, not a per-component schema; the rule "Never generate, modify, or diagnose Carbon component code from training knowledge alone" |
| **Ant Design** | Well-typed props | Official MCP with eight tools: `antd_list`, `antd_info` ("Retrieve component property specifications"), `antd_doc`, `antd_demo`, `antd_token`, `antd_design_md`, `antd_semantic` ("Inspect DOM structure and styling hooks"), `antd_changelog`; plus `llms.txt` and `llms-full.txt` ([ant.design MCP](https://ant.design/docs/react/mcp/)) | Props, demos, tokens, design-language doc, DOM anatomy — the broadest per-component surface after Primer |
| **Gutenberg (WordPress)** | Large React DS that turned on the Storybook manifest in production builds ([PR #74626](https://github.com/WordPress/gutenberg/pull/74626)) | `manifests/components.json` | An existence proof that a big, old React library can emit the manifest without rewriting components |

**Reading across the table:** every system with a serious AI surface *generates* the prop layer (MUI's docgen, Storybook manifests, Polaris types, Spectrum schemas) and *hand-writes* the usage/a11y/pattern layer (Atlassian's 2,000 lines, Primer's guideline tools, Spectrum's 211 reference files, Carbon's 12). No system reports extracting composition rules.

## 6. The llms.txt / MCP wave: what is actually exposed per component

| Surface | Name / props / defaults | Examples | Tokens | Usage guidance | A11y contract | Slots | Composition / nesting | Patterns (screen sections) |
|---|---|---|---|---|---|---|---|---|
| Storybook MCP (`docs-show`) | yes (from docgen) | yes (story code) | only if documented in MDX | dropped unless in MDX docs manifest | no | as `ReactNode` props only | no | no |
| shadcn MCP | no (files only) | via `docs` field | `cssVars` | `description` string | no | no | `registryDependencies` (a dependency graph, not nesting) | `registry:block` items |
| Chakra MCP | yes | yes | yes | no | no | no | no | Pro templates (paid) |
| Ant Design MCP | yes | yes | yes | `antd_doc` prose | no | no | `antd_semantic` DOM anatomy | no |
| Primer MCP | yes | yes | yes | `get_component_usage_guidelines` prose | `get_component_accessibility_guidelines` prose | no | no | `list_patterns` / `get_pattern` |
| Atlassian MCP | yes | yes | yes | in schema prose | `ads_get_lint_rules`, a11y tools | no | no | no |
| Spectrum design-data MCP | option tables | no | yes | no | no | no | no | no |
| CEM-based MCPs (`cem mcp`, Polaris WC) | attributes/properties/events | yes | CSS props | no | partial (`cem` "accessibility patterns") | **yes** (`@slot`) | partial (HTML validation against manifest) | no |
| llms.txt (all) | links to pages | links | links | prose pages | prose pages | no | no | no |

Three observations. First, **no first-party surface exposes composition or nesting rules as data**; the closest are CEM validation ("HTML validation … correct slot usage") and Ant's DOM anatomy tool. Second, the wave is built for *retrieval by a code-writing agent* — search + get, prose in, prose out — whereas the construction-file catalog needs a *closed grammar*: enumerated component types, typed slots with allowed children, and nesting constraints that [03 §6](03-construction-file-generation.md) turns into schema enforcement. A search tool cannot make an invalid nesting impossible; an enum can. Third, the wave's real innovation is *coercion*, not extraction: Kaelig catalogs 157 techniques — Polaris's "you cannot trust your trained knowledge", Carbon's MCP-first rule, Primer's "REQUIRED FINAL STEP … You cannot complete a task involving CSS without a successful run of this tool" ([Kaelig: Primer](https://state-of-ai-in-design-systems.netlify.app/systems/primer-github.md)) — which in this architecture is unnecessary because the builder, not the model, owns realization. Atlassian's own eval is the sharpest contrast: their 80 KB DESIGN.md (~19,800 tokens) "required ~92% more tokens" than the MCP on a login-screen task (7.21M vs 3.75M tokens) because it makes agents "re-create components" instead of importing them ([DESIGN.md post](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)). A catalog whose builder emits `<Button>` invocations sidesteps that failure class by construction ([01 §5.4](01-primitive-codification.md)).

## 7. What cannot be extracted, and how teams encode it today

**What it is:** The Tier C fields: composition/nesting rules, slot semantics, usage guidance, pattern definitions, accessibility contracts, responsive behavior.

**Why it matters:** These are the fields that make an LLM pick `Banner` over `Toast` and put one primary action per region — the selection errors that survive schema validity ([eval-tuning-loops/01](../eval-tuning-loops/01-grading-generated-prototypes.md), "structurally valid, semantically wrong").

**Key findings — where the knowledge lives today:**

| Encoding | Machine-readable? | Evidence | Fit as overlay source |
|---|---|---|---|
| **JSDoc tags on components** | Yes, if a convention exists | CEM's `@slot`, `@csspart`, `@cssprop`; Storybook's manifest carries `jsDocTags` and recommends "JSDoc comments in your component source code can provide additional metadata for the manifest, which can be helpful for AI agents" ([Manifests docs](https://storybook.js.org/docs/ai/manifests)) | **Best** — colocated, survives refactors, diffed in PRs. Define `@slot`, `@allows`, `@useWhen`, `@notWhen`, `@a11y` tags and read them in the extractor |
| **MDX / docs pages** | Only via a docs manifest | Storybook builds a docs manifest from MDX; Rachel Cantor found `parameters.docs.description.component` dropped from the components manifest ([rachel.fyi](https://rachel.fyi/posts/storybook-mcp-reads-your-manifest-not-your-docs-tab)) | Medium — prose, needs an LLM pass to structure |
| **Structured content schemas (Atlassian model)** | Yes | Schema files as TS "containing … usage, code examples, props, content standards, and accessibility requirements", from which MCP, skill and DESIGN.md are generated; warning that "Documentation that drifts from the codebase is worse than no documentation at all" ([Teaching AI](https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language)) | **The reference overlay** — but it is a parallel hand-maintained artifact, mitigated by "tooling to keep documentation up-to-date" |
| **DESIGN.md do/don't tables** | Semi (YAML frontmatter + prose) | Atlassian's file has an "Anti-Slop Table" — "Each line is a drift pattern to correct on sight" ([Kaelig: Atlassian](https://state-of-ai-in-design-systems.netlify.app/systems/atlassian-design-system.md)) | Good for global rules; wrong altitude for per-component slot contracts |
| **Code Connect files** | Yes | `figma.enum` maps, `figma.slot`, `figma.children`, variant restrictions ([React docs](https://developers.figma.com/docs/code-connect/react/)); Primer 52 files, Carbon ~86 | Good secondary source for slot names and design-facing enum labels where it exists (2/20 systems) |
| **Design-system lint rules** | Yes, as code | Deslint "ships with 62 rules across 11 scoring categories" but they are value-level (`no-arbitrary-colors`, `no-arbitrary-spacing`, `prefer-semantic-html`) ([deslint rules](https://deslint.com/docs/rules)); Backlight's tutorial shows a custom rule "that `List.Item` [is] correctly wrapped inside a `List`" ([backlight.dev](https://backlight.dev/blog/best-practices-w-eslint-part-2)); `eslint-plugin-design-system` (`use-design-system-components`) last pushed 2019, 5 stars ([GitHub](https://github.com/dslounge/eslint-plugin-design-system)); `@lapidist/design-lint` 8.0.0 (2026-05-12) is DTIF-token-aware ([GitHub](https://github.com/bylapidist/design-lint)); Atlassian's ESLint config "is embedded directly in llms.txt" | Composition rules that already exist as ESLint rules can be *mined* — each `no-restricted-syntax`/custom rule that checks a parent–child relation is a nesting constraint waiting to be lifted into the schema |
| **Skills / reference files** | Prose | Spectrum: 211 reference files; Carbon: 12 with "explicit trigger condition"; Primer: 7 incl. `slots` ([Kaelig](https://state-of-ai-in-design-systems.netlify.app/)) | Mine for few-shot examples ([02 §3.5](02-intent-spec-and-context.md)) |

**The minimal curated overlay.** Everything above reduces to one small file per component that the extractor cannot produce and that a design engineer can write in minutes:

```yaml
# overlay/Banner.yaml — merged over generated/Banner.json
description: "Persistent, page-level status. Use for conditions the user must act on; for transient confirmations use Toast."
useWhen: ["error blocks the whole page", "account-level warnings"]
notWhen: ["success after a save (Toast)", "inline field errors (FieldMessage)"]
slots:
  actions: { allows: [Button], max: 2, note: "at most one primary" }
  children: { allows: [Text, Link], max: 1 }
nesting: { disallowedAncestors: [Toast, Dialog] }
a11y: ["role=status for info, role=alert for error", "actions must be reachable by Tab"]
responsive: "stacks actions below text under space.breakpoint.sm"
omitDefaults: [variant]        # tell the model not to emit defaults
aliases: { Alert: Banner }     # ecosystem name → DS name, per 01 §4.6
```

Everything in it is prose or a small enum; nothing duplicates a prop type. That is the boundary that keeps the overlay from becoming a second, drifting catalog.

**Open questions:** Whether `@useWhen`/`@slot`-style JSDoc tags can be adopted in a DS without maintainers treating them as doc noise; whether an LLM pass over MDX can *draft* the overlay reliably enough that humans only review (Atlassian "started by using AI to draft our first `llms.txt` instruction manifests, then spent six months taming the complexity").

## 8. Pipeline proposal: extractor + curated overlay + drift gate

```
DS source ──► extract (RCM | react-docgen-typescript | vue-component-meta | CEM analyzer)
   │              + recipe reader (tv runtime | Panda config | cva AST)
   │              + story reader (Storybook manifest: stories[].code → examples)
   │              + Code Connect reader (figma.enum/slot → design labels)   [optional]
   │              + tokens (DTCG file; Figma Variables codeSyntax)           [optional]
   ▼
generated/<Component>.json   (Tier A/B facts; committed; never hand-edited)
   +
overlay/<Component>.yaml     (Tier C facts; hand-curated; §7 shape)
   ▼ merge (overlay keys must reference existing props/slots or the build fails)
catalog.zod.ts  ──► z.toJSONSchema() → schema.json      (enforcement)
                ──► printer            → catalog.d.ts    (prompt catalog, 01 §4.2)
                ──► .parse()           → builder runtime validation
```

**Extractor choice per source.** React: run Storybook's manifest generation (RCM where it passes its own debugger without warnings; `react-docgen-typescript` with a `node_modules` `propFilter` otherwise) because it also yields `stories[].code` examples and an `import` line; do not run react-docgen alone on a TS codebase (§2). Vue: `vue-component-meta` (slots included). Web components: CEM analyzer + `@slot` tags. Angular: Compodoc via the manifest addon.

**Drift detection in CI.** Three gates, in order of cheapness: (1) *re-extract and diff* — regenerate `generated/*.json` on every DS release and fail if the diff was not reviewed (the discipline [01 §6](01-primitive-codification.md) prescribes; shadcn's `registry validate` is the packaging analog, checking "item schema errors, duplicate item names" before publish); (2) *overlay reference check* — an overlay that names a prop, slot, or enum value absent from the generated file fails the build, which converts silent drift into a loud, local error ([00 lesson 7](00-architecture-synthesis.md)); (3) *manifest warnings as errors* — the Storybook debugger's "errors or warnings that were encountered during manifest generation" become a CI failure, since every warning is a component the model will see incorrectly.

**Coverage metrics** (reported per catalog build, stamped in `meta.json`):

| Metric | Definition | Target |
|---|---|---|
| Clean-extraction rate | components whose generated file has no warnings, all props typed (no `any`/`unknown`), defaults present | ≥80% before trusting the pipeline |
| Hard-case rate | components hitting §2 cases (union props, generics, `as`, HOC-wrapped) — each needs a hand-written type or an overlay `props` override | track; <15% for a healthy DS |
| Overlay coverage | components with an overlay containing at least `description` + `slots` | 100% for the in-context set (§9); index-only components may lack `slots` |
| Example coverage | components with ≥1 story-derived example | 100% |
| Island rate (runtime) | `CustomBlock` share in generated construction files ([01 §7](01-primitive-codification.md)) | falling over time; rising means a missing pattern, not a missing prop |

**Curation labor estimate.** Public evidence gives a bracket rather than a number. Atlassian: "2,000 lines" of instructions for foundational elements plus "six months" of taming for a system with a full-time DS team; their guidance corpus is "20k+ lines" served via MCP ([handoffs](https://www.atlassian.com/blog/how-we-build/turning-handoffs-into-handshakes-integrating-design-systems-for-ai-prototyping-at-scale)). Spectrum's skill carries 211 reference files; Carbon's 12 files total ~190 KB ([Kaelig](https://state-of-ai-in-design-systems.netlify.app/)). CEM adopters add three JSDoc tags per component to close the slot/part/CSS-prop gap ([analyzer docs](https://custom-elements-manifest.open-wc.org/analyzer/getting-started/)). Rachel Cantor's manifest fix was one config change plus relocating existing prose. Translating to the overlay shape in §7: a primitive with clean props needs ~10–20 minutes (description, use/not-when, a11y line); a container with slots needs ~30–60 minutes (slot contracts, nesting); a pattern (screen section) is fully authored and needs 2–4 hours including its canonical example and story. For a 30-primitive, 5-pattern catalog that is roughly two to four engineer-days of curation on top of a one-day extractor setup — an order of magnitude below Atlassian's effort because the construction-file builder, not prose, carries the enforcement.

## 9. Small-DS versus large-DS thresholds

[02 §3.4](02-intent-spec-and-context.md) set the in-context threshold at ≤~30 primitives / ≤~10–15K tokens, with degradation appearing around 50K tokens. Extraction changes the shape of the problem in three ways:

- **Generated props are cheap; overlays are the budget.** A docgen table for a 20-prop component prints to ~150–300 tokens in the TS-style rendering; the overlay adds ~100–200. Thirty primitives fully documented land at ~8–15K tokens, inside the threshold. Atlassian's DESIGN.md alone is ~19,800 tokens ([DESIGN.md post](https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice)) — a reminder that prose, not schema, is what blows the budget.
- **Small DS (≤30 primitives, e.g., a shadcn-derived product system):** extract everything, curate every overlay, keep it all in context under prompt caching. There is usually **no pattern layer yet** — mine it bottom-up from repeated construction-file subtrees ([00 lesson 9](00-architecture-synthesis.md)) rather than authoring it up front.
- **Medium (30–150):** the extractor output *is* the index — `name` + `description` per component fits in ~1.5–3K tokens; per-component pages are pulled on demand (the skills layout in 02 §3.2). Overlay curation can be prioritized by story count and by island telemetry.
- **Large / multi-brand (>150, MUI- or Carbon-scale):** serve the catalog through a thin MCP `search`+`get` pair as Atlassian and Primer do, but keep the *construction-file grammar* small — the enum of component types the model may emit should be a curated subset (the 60–70% coverage set from [00](00-architecture-synthesis.md)), not the whole DS. Extraction coverage of the DS and grammar coverage of the DS are different numbers; only the second is bounded by context.

The threshold that matters most is therefore not component count but **hard-case rate**: a 25-component DS with polymorphic `as` props and generic tables everywhere costs more curation than an 80-component DS with flat enums, because every hard case is a hand-written type.

## 10. Tradeoffs

| Choice | Pro | Con | Recommendation |
|---|---|---|---|
| RCM (Storybook 10.4+) vs react-docgen-typescript | Checker-backed, maintained, also yields stories and imports | Experimental; unverified on forwardRef/polymorphic cases | RCM behind the manifest debugger gate; RDT as fallback |
| Extract from source vs from docs (Atlassian model) | Source cannot drift | Docs carry the Tier C facts | Both: source → generated, docs → overlay draft |
| JSDoc tags vs separate overlay files for Tier C | Colocated, PR-reviewed | Needs DS maintainers' buy-in; pollutes public types | Overlay files first; migrate stable tags (`@slot`) into JSDoc |
| Runtime recipe introspection (tv, Panda) vs AST (cva) | Zero parsing | Requires importing component modules at build time | Runtime where available; AST for cva only |
| Code Connect as a source | Curated enums and slots, design-labelled | 2/20 adoption; one repo per library file | Optional reader; never a dependency |
| Full-DS catalog vs curated grammar subset | Coverage | Context and near-duplicate distractors | Grammar subset always; full DS via MCP for infill |
| Coercion prompts vs builder enforcement | Works with any agent | Token-hungry; unenforceable | Not needed here — the builder enforces |

## 11. Recommended extraction stack

Storybook 10.6 with `componentsManifest` on and RCM enabled (falling back to `react-docgen-typescript` + `propFilter` where the debugger warns) as the React prop/story/import extractor; `vue-component-meta` or the CEM analyzer for Vue and web components; a recipe reader that imports `tv()` objects and reads `panda.config.ts` directly and AST-parses `cva()` literals; DTCG tokens as the value layer with Figma Variables `codeSyntax` as the binding source when Enterprise access exists. Everything else — descriptions, use/not-when, slot contracts, nesting, a11y, responsive notes, patterns — is a per-component YAML overlay merged at build time into `catalog.zod.ts`, with overlay-reference checks and re-extract diffs as CI gates.

## 12. Open questions

1. **RCM's hard-case coverage.** Does React Component Meta resolve forwardRef generics, discriminated-union props, and polymorphic `as`? The 10.4 post defers to a PR; needs a fixture run.
2. **Can an LLM draft the overlay from MDX + stories well enough to review rather than write?** Atlassian's "AI drafts, six months taming" suggests drafting is cheap and *stabilizing* is the cost.
3. **A `@slot`/`@useWhen` convention for React.** CEM proved a tag convention makes slots extractable; nobody has proposed one for TSX. Would Storybook's `jsDocTags` field carry it unchanged?
4. **Lint-rule mining.** How many of a DS's custom ESLint rules encode parent–child constraints that could be lifted mechanically into slot `allows` lists?
5. **Figma Variables `scopes` as token-role constraints.** Are scopes maintained well enough in real libraries to enforce "text color tokens only on text props"?
6. **Design-side schemas (Spectrum's option tables) versus code-side props.** When both exist and disagree, which is the catalog's truth — and does the disagreement itself flag a Code Connect gap?

## 13. Recommended experiments

1. **Extractor bake-off on a fixture DS (days).** Twenty components deliberately covering the §2 hard cases; run RCM, react-docgen-typescript, react-docgen, ts-morph; score clean-extraction and hard-case rates. Directly answers Q1 and calibrates the coverage targets in §8.
2. **Catalog extraction spike on the real DS (days; extends [04 §10 exp. 6](04-deterministic-assembly.md) and [01 §8 exp. 3](01-primitive-codification.md)).** Generate `generated/*.json`, count warnings, measure what fraction of a hand-written 15-primitive catalog is reproduced; log every field that had to be hand-written — that list *is* the overlay schema.
3. **Overlay drafting A/B (days).** For 10 components, have an LLM draft overlays from MDX + stories; measure reviewer edit distance and time versus writing from scratch.
4. **Drift replay (days).** Bump a variant enum and rename a prop in the DS; confirm re-extract diff, overlay-reference failure, and construction-file replay all fire ([01 §8 exp. 6](01-primitive-codification.md)).
5. **Grammar-subset ablation (week).** Same 10 briefs with (a) full-DS enum, (b) curated 25-type enum + MCP infill; measure selection accuracy on near-duplicates (`Select`/`Combobox`), tokens, island rate.
6. **Lint-rule mining pass (day).** Walk the DS's ESLint plugin; count rules expressible as `slots.allows`/`nesting` overlay entries.

## 14. Candidate picks for skill-resources

| Name | URL | Why |
|---|---|---|
| Storybook Manifests + MCP docs | https://storybook.js.org/docs/ai/manifests | The de facto React component manifest; field list and debugger |
| `@storybook/addon-mcp` / storybookjs/mcp | https://github.com/storybookjs/mcp | Reference for docs/dev/test toolsets over a manifest |
| Custom Elements Manifest schema | https://github.com/webcomponents/custom-elements-manifest | The only standardized component manifest; slot/part/cssprop model to copy |
| CEM analyzer | https://custom-elements-manifest.open-wc.org/analyzer/getting-started/ | JSDoc tag conventions worth porting to React |
| `bennypowers/cem` | https://github.com/bennypowers/cem | CEM → MCP with slot-aware HTML validation |
| react-docgen-typescript | https://github.com/styleguidist/react-docgen-typescript | Still the most complete checker-based extractor; know its staleness |
| Storybook 10.4 RCM announcement | https://storybook.js.org/blog/storybook-10-4/ | Where prop extraction is heading |
| vue-component-meta | https://github.com/vuejs/language-tools/tree/master/packages/component-meta | Slot-inclusive extraction for Vue |
| tailwind-variants API reference | https://www.tailwind-variants.org/docs/api-reference | Runtime-introspectable variant config |
| Panda CSS recipes + CLI | https://panda-css.com/docs/concepts/recipes | Config-as-data recipes; `panda analyze --scope recipe` |
| shadcn registry schema + `registry validate` | https://ui.shadcn.com/docs/registry/registry-item-json | Pattern-layer packaging precedent and a validate-before-publish gate |
| Figma Code Connect React API | https://developers.figma.com/docs/code-connect/react/ | `figma.slot`, `figma.enum`, variant restrictions as curated semantics |
| Figma Variables REST API | https://developers.figma.com/docs/rest-api/variables-endpoints/ | `codeSyntax` and `scopes` for token binding (Enterprise) |
| Atlassian "Teaching AI to speak our design language" | https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language | Schema-files-as-source-of-truth model and the 52%/34%/26%/16% numbers |
| Atlassian DESIGN.md evaluation | https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice | Only published head-to-head of MCP vs skill vs markdown context |
| `@atlaskit/ads-mcp` | https://www.npmjs.com/package/@atlaskit/ads-mcp | Two-tier tool hierarchy and `ads_plan` batching |
| Primer MCP | https://primer.style/product/getting-started/foundations/mcp/ | API / usage / a11y / patterns as separate tools |
| Ant Design MCP + llms.txt | https://ant.design/docs/react/mcp/ | `antd_semantic` DOM anatomy tool |
| Spectrum component-schemas | https://github.com/adobe/spectrum-design-data/tree/main/packages/component-schemas | Design-side JSON Schema option tables |
| State of AI in Design Systems (July 2026) | https://state-of-ai-in-design-systems.netlify.app/ | 20-system audit; per-system affordance pages |
| Rachel Cantor, "Storybook MCP reads your manifest" | https://rachel.fyi/posts/storybook-mcp-reads-your-manifest-not-your-docs-tab | Field report on what the manifest drops |
| Deslint rules | https://deslint.com/docs/rules | 62 value-level rules; the gap above composition |
| `@lapidist/design-lint` | https://github.com/bylapidist/design-lint | DTIF-aware token/component linter |
| zeroheight MCP | https://zeroheight.com/mcp/ | Composes Figma MCP + Storybook MCP under approved guidelines |

## 15. Sources

- https://github.com/styleguidist/react-docgen-typescript — README, releases, GitHub API (fetched; npm page returned 403, registry queried via `npm view`)
- https://github.com/styleguidist/react-docgen-typescript/issues/57
- https://github.com/storybookjs/storybook/discussions/34477
- https://github.com/reactjs/react-docgen — GitHub API; https://react-docgen.dev/docs/reference/documentation/typescript; https://github.com/reactjs/react-docgen/issues/883
- https://storybook.js.org/docs/configure/integration/typescript
- https://storybook.js.org/blog/storybook-10-4/
- https://storybook.js.org/docs/ai/manifests; https://storybook.js.org/docs/ai/mcp/overview; https://github.com/storybookjs/storybook/releases/tag/v10.3.0; https://github.com/storybookjs/mcp
- https://github.com/WordPress/gutenberg/pull/74626
- https://blog.logrocket.com/storybook-mcp-component-libraries/
- https://rachel.fyi/posts/storybook-mcp-reads-your-manifest-not-your-docs-tab
- https://github.com/vuejs/language-tools/blob/master/packages/component-meta/README.md
- https://storybook.js.org/addons/storybook-addon-angular-manifest
- https://api-extractor.com/pages/setup/generating_docs/; https://typedoc.org/
- https://souporserious.com/generate-typescript-docs-using-ts-morph/
- https://github.com/mui/material-ui/tree/master/packages-internal/api-docs-builder (package.json via GitHub API; README returned 404)
- https://cva.style/docs/api-reference; https://github.com/joe-bell/cva (GitHub API)
- https://www.tailwind-variants.org/docs/api-reference
- https://vanilla-extract.style/documentation/packages/recipes/
- https://panda-css.com/docs/concepts/recipes; https://panda-css.com/docs/references/cli
- https://github.com/stitchesjs/stitches (GitHub API: archived)
- https://github.com/webcomponents/custom-elements-manifest; https://custom-elements-manifest.open-wc.org/analyzer/getting-started/; https://daverupert.com/2025/10/custom-elements-manifest-killer-feature/; https://github.com/bennypowers/cem
- https://developers.figma.com/docs/code-connect/react/; https://developers.figma.com/docs/code-connect/storybook/; https://developers.figma.com/docs/figma-mcp-server/code-connect-integration; https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/; https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect; https://developers.figma.com/docs/rest-api/variables-endpoints/
- https://zeroheight.com/mcp/; https://www.supernova.io/for-ai (vendor claims; "40+ tools" not verified); https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine (search summary only); https://divriots.com/blog/ide-product-update (search summary only)
- https://state-of-ai-in-design-systems.netlify.app/ and per-system pages: atlassian-design-system.md, shopify-polaris.md, primer-github.md, material-ui.md, shadcn-ui.md, carbon-design-system.md, react-spectrum-s2.md
- https://ui.shadcn.com/docs/registry/registry-item-json; https://ui.shadcn.com/docs/registry/mcp; https://ui.shadcn.com/docs/changelog/2026-05-registry-include; https://ui.shadcn.com/llms.txt
- https://github.com/radix-ui/website/issues/895/linked_closing_reference?reference_location=REPO_ISSUES_INDEX; https://github.com/gianpieropuleo/radix-mcp-server
- https://chakra-ui.com/docs/get-started/ai/mcp-server
- https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language; https://www.atlassian.com/blog/ai-at-work/atlassian-design-system-building-the-context-engine-for-the-ai-era; https://www.atlassian.com/blog/how-we-build/turning-handoffs-into-handshakes-integrating-design-systems-for-ai-prototyping-at-scale; https://www.atlassian.com/blog/how-we-build/atlassians-design-md-is-here-what-we-learned-testing-portable-design-context-in-practice; https://atlassian.design/llms.txt; https://www.npmjs.com/package/@atlaskit/ads-mcp (README via `npm view`)
- https://shopify.dev/changelog/the-shopifydev-mcp-server-now-supports-polaris-web-components; https://shopify.dev/docs/api/app-home/polaris-web-components; https://github.com/erikmay/polaris-web-components-mcp
- https://primer.style/product/getting-started/foundations/mcp/ (GitHub README returned 404)
- https://opensource.adobe.com/spectrum-design-data/ai; https://github.com/adobe/spectrum-design-data/tree/main/packages/component-schemas (schema directory listing returned 404); https://react-aria.adobe.com/ai
- https://carbondesignsystem.com/developing/carbon-mcp/onboarding-and-setup/ (fetch truncated; details taken from the State of AI per-system page); https://medium.com/@ramyaskv812/turning-design-systems-into-conversations-how-carbon-mcp-makes-ai-carbon-aware-30e6006f79d7 (returned 403)
- https://ant.design/docs/react/mcp/
- https://deslint.com/docs/rules; https://backlight.dev/blog/best-practices-w-eslint-part-2; https://github.com/dslounge/eslint-plugin-design-system; https://github.com/bylapidist/design-lint
