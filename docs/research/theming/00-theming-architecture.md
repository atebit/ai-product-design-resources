# Theming Architecture — The Three-Tier Semantic Token Model

**Source:** Codified from a production dark-first, data-dense design system (the [case study](03-case-study.md)).
**Series:** Theming & Mathematical Color Mutation — doc 1 of 4

## Scope

This document codifies the token architecture that makes mathematical re-theming possible at all: role-based semantic tokens partitioned into three tiers with different mutation behavior. The math itself (OKLCH mutation) is in [01](01-oklch-color-mutation.md); the contrast machinery is in [02](02-contrast-preservation-and-reversal.md); the concrete values are in [03](03-case-study.md).

---

## 1. The core premise: roles, not colors

Nothing in component code references a color. Components reference **semantic roles** (`primary`, `bgCard`, `destructiveText`, `borderInner`), and a theme is a mapping from roles to values. Two consequences fall out:

1. **Mode switching is a single object swap.** Dark and light themes share an identical shape (`{ semantic, chart }`), so `const T = mode === 'dark' ? darkTheme : lightTheme` is the entire mode implementation. No per-component mode logic, ever.
2. **Brand switching is a re-seed, not a redesign.** Because every colored surface routes through a role, an engine can regenerate the role→value mapping from one seed color and the whole app reflows — buttons, focus rings, chart series, nav tints, the page background — with no rebuild.

The raw palette (`colors.green.DEFAULT`, `colors.navy.card`, …) still exists, but it is **input to the theme layer only**. The hard rule: *never use the raw palette directly in UI* — raw colors carry no semantic meaning and bypass theming entirely. The one-sentence version that survives being pasted into any agent context: **no hardcoded hex; use semantic tokens.**

## 2. The three tiers — the load-bearing idea

The naive version of white-labeling regenerates everything from the brand color, and it fails in two directions at once: neutrals become tinted mush, and status colors lose their meaning. This architecture partitions every token into exactly one of three tiers, each with a different mutation contract:

### Tier 1 — Brand: **reflows**

`primary`, `onPrimary`, `ring`, `chart-1`, `sidebar-primary`, `primarySurface`, `onPrimarySurface`.

This is the *only* family seeded by the brand color. When the brand changes, these regenerate through the OKLCH engine ([01](01-oklch-color-mutation.md)). Note what's included: not just the button fill, but every role that *means* "the brand acting" — focus rings, the primary chart series, active-nav tints. And every on-fill text color in this tier is **derived by measured contrast, never authored** ([02](02-contrast-preservation-and-reversal.md)).

### Tier 2 — Neutral: **tilts toward the brand**

The background/surface/border/muted-text ramp — in the source system a cool-navy ramp around hue ~260° at very low chroma.

Neutrals don't reflow; they **tilt**. The lightness ramp is fixed (that's what keeps dark mode dark and the hierarchy of surfaces intact), but the hue rotates toward the brand at a chroma ceiling of **≤ 0.04**. The result: a violet brand gets faintly violet-cast cards and backgrounds, a teal brand gets teal-cast ones — the app feels *built for* the brand rather than skinned — while the chroma cap guarantees the neutrals still read as neutrals.

Two refinements worth keeping:

- **The house default is exempt.** The shipped house theme keeps its hand-tuned navy surfaces rather than being run through its own engine. The engine exists for *generated* brands; the flagship stays artisanal.
- **Tilt is a user-facing toggle.** "Tilt neutrals toward the brand hue" ships on by default but can be turned off for accent-only reflow — some white-label customers want their color on the buttons but a strictly neutral chrome.

### Tier 3 — Sentiment: **pinned**

Warning amber, destructive plum-crimson, and the decorative orange `brandAccent` never move, in any theme, ever. **Their hue *is* their meaning** — reflowing them would break status signalling (a red that drifted toward the brand hue is no longer unambiguously "loss"). This is also why chart sentiment tokens (`chart.positive.*`, `chart.negative.*`, `chart.warning.*`) are pinned while only `chart-1` (the series color) reflows: *positive is always green, negative is always plum-crimson, regardless of brand.*

The tier assignment is the design decision. Everything downstream — the math, the contrast engine — operates within it.

## 3. Dark-first, with reversal as a first-class concern

The system defaults to dark mode and treats light mode as a **reversal**, not a second design:

- Same token shape, flipped values: `bgCard` `#0B1220` ↔ `#FFFFFF`, `textPrimary` `#F8FAFC` ↔ `#0F172A`.
- Roles whose *purpose* is contrast get re-derived per mode rather than mirrored — the deep dive on why naive mirroring fails (and how generated light-mode primaries get deliberately deepened so white text wins) is [doc 02](02-contrast-preservation-and-reversal.md).
- Assets reverse too: logos render black in light mode via `filter: brightness(0)` — one asset, no second file.
- The full-page background is itself a token (`appShellBg`): in dark mode a layered radial "mesh" gradient assembled entirely from token color stops, in light mode plain white. One token replaces 400KB–1MB of background PNGs and switches with the theme like everything else.

## 4. Splits the architecture forces (that a flat palette hides)

Several token pairs exist only because contrast physics demands them, and they're easy to miss if you start from a flat palette:

- **`destructive` vs `destructiveText`.** The plum-crimson that works as a button fill (`#D42B4E`) fails as text on a dark background. So `destructive` is *fills and strokes only*; red text uses `destructiveText` (`#F9A8BA` on dark — a light rose at ~7:1). The same split recurs in charts: `chart.negative.bold` is for SVG strokes only, `chart.negative.text` for every negative label.
- **Two-tier chart sentiment.** Every sentiment has a *subtle* tier (informational, within tolerance — semi-transparent strokes, tinted fills) and a *bold* tier (threshold crossed, action required — full-saturation strokes, used sparingly). Never mix tiers for one data series; the tier difference is itself information.
- **Surface tints as tokens.** `primarySurface` / `warningSurface` / `destructiveSurface` are ~6–12% alpha tints used for active-nav fills, toasts, and chart areas. They're tokens (not ad-hoc opacity) because the contrast engine must composite them over their backdrop before choosing text color — see [02 §3](02-contrast-preservation-and-reversal.md).
- **Outer vs inner borders.** Container frames (`borderOuter`) are weaker than row dividers (`borderInner`) — density needs internal structure more than it needs frames.
- **Glass as a contract, not an effect.** Glass = translucent fill + backdrop blur + hairline border, all three tokens (`glassBg`, `glassBorder`, plus paired scrims `scrimStrong`/`scrimSoft`). Never blur without a fill; never glass over dense data; text must survive `backdrop-filter` being unsupported.

## 5. Hard rules — the portable contract

The rules that travel with the system into any agent context (the distribution model that carries them is in [03 §4](03-case-study.md)):

1. No hardcoded hex in component styles — semantic tokens only.
2. Never use the raw palette directly in UI.
3. `destructive` is fills/strokes only; red text uses `destructiveText`.
4. `brandAccent` (orange) is non-interactive, one per view max — never buttons, warnings, status, or active states.
5. Default to dark mode; support light via theme switching, never hardcoded mode-specific values.
6. Status dots always carry a text label — never color alone.
7. Text contrast minimums are part of the token spec: `textPrimary` ~17:1, `textSecondary` ~14:1, `textTertiary` ~7:1, `textMuted` ~8:1 dark / ~5:1 light.
8. Active-state convention everywhere (nav, tabs, steppers, palette): `primarySurface` fill + `primary` text/border.

Rules 3, 4, and 7 are the interesting ones for this research stream: they're **contrast decisions and mutation-tier decisions promoted to brand law**, which is exactly what makes the system safe to hand to an agent — the agent can't accidentally reflow a status hue or put low-contrast red text on a card, because the rule is stated at the same altitude as "the logo is always caps."

## 6. Why this matters for AI-assisted theming

This architecture is what makes "re-theme this app to `#7C3AED`" a *computation* instead of a design project:

- The tier partition tells the engine **what it may touch** (tier 1), **what it may only nudge** (tier 2, ≤0.04 chroma), and **what it must not touch** (tier 3).
- Role-based tokens mean the engine's output is a small object, not a codebase diff.
- Derived on-colors mean accessibility survives the mutation without human review ([02](02-contrast-preservation-and-reversal.md)).
- The whole contract compresses into a few hundred tokens of rules (`llms.txt` → a portable rules file), so any agent — Claude Code, Cursor, Replit — can build on-system by reading it. The source system ships this as an install kit with per-tool entry points; the distribution model is covered in [03 §4](03-case-study.md).

Next: [01 — OKLCH Color Mutation](01-oklch-color-mutation.md), the math that executes tier 1 and tier 2.
