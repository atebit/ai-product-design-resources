---
name: semantic-theme-tokens
description: Set up a role-based semantic token architecture with three mutation tiers (brand reflows, neutrals tilt, sentiment pinned) so an app can be mathematically re-themed and mode-switched safely. Use when creating a design system's color layer, adding dark/light modes, preparing an app for white-labeling, or auditing token hygiene ("no hardcoded hex").
---

# Semantic Theme Tokens

Build the token architecture that makes theming a computation instead of a redesign. Components reference **roles**, themes map roles to values, and every role belongs to exactly one **mutation tier**. Codified from a production design system (`docs/research/theming/00-theming-architecture.md`; concrete values in `03-case-study.md`).

## The structure

**Two frozen theme objects with identical shape** — mode switching is one swap, no per-component logic:

```ts
const T = mode === 'dark' ? darkTheme : lightTheme;   // { semantic, chart }
```

**Every token in exactly one tier:**

| Tier | Contains | On brand change |
|---|---|---|
| **Brand** | `primary`, `onPrimary`, `ring`, `chart-1`, `sidebar-primary`, `primarySurface`, `onPrimarySurface` | **Reflows** from the seed (see `oklch-brand-reflow` skill) |
| **Neutral** | bg stack, borders, muted→primary text ramp, `appShellBg` | **Tilts** — hue rotates to brand at chroma ≤ 0.04, lightness ramp fixed |
| **Sentiment** | warning, destructive family, decorative accent, all chart sentiment | **Pinned** — hue *is* meaning; never mutates |

The tier assignment is the design decision; get it agreed before writing values. Ambiguous cases (an "info blue", a secondary accent) must be assigned explicitly.

## Token inventory to mint

Beyond the obvious, these families exist because contrast physics or theming demands them:

- **Surface stack with fixed hierarchy**: `bgBase` → `bgDeep` → `bgCard` → `bgSurface` (each step lighter in dark mode). The lightness ladder is the app's spatial hierarchy — it never moves during theming.
- **Border pair**: `borderOuter` (container frames, weaker) vs `borderInner` (row dividers, stronger) — dense UIs need internal structure more than frames. Per-mode alphas, tuned separately.
- **Text ramp with contrast minimums as spec**: primary ~17:1, secondary ~14:1, tertiary ~7:1, muted ~8:1 dark / ~5:1 light. Spec the *ratios*; the hex follows.
- **Fill/text splits for sentiment**: `destructive` (fills/strokes only) + `destructiveText` (~7:1 per mode) + `destructiveHover` + `destructiveSubtle`. No single red survives fill, stroke, and text duty.
- **Surface tints as tokens** (`primarySurface` / `warningSurface` / `destructiveSurface`, ~6–12% alpha): active-nav fills, toasts, chart areas. Tokens, not ad-hoc opacity, so the contrast engine can composite them.
- **Chart sentiment, two tiers each**: `subtle` (informational — semi-transparent stroke + tinted fill) and `bold` (threshold crossed — full saturation, sparingly), plus `negative.text` for labels. Never mix tiers on one series; only `chart-1` follows the brand.
- **Glass + scrims as a contract**: `glassBg` + `glassBorder` (translucent fill + hairline; never blur without fill, never glass over dense data), `scrimStrong` behind solid overlays / `scrimSoft` behind glass.
- **`appShellBg`**: the full-page background as one token (dark: layered radial mesh gradient from token stops; light: plain white). Replaces background images; re-themes with everything else.

## Hard rules to encode

Write these into the project's agent context (CLAUDE.md / AGENTS.md / design-rules.md) — they're what keep the system re-themeable after other agents build on it:

1. **No hardcoded hex in component styles** — semantic tokens only.
2. **Never use the raw palette directly in UI** — raw colors bypass theming; they are inputs to the theme layer.
3. `destructive` is fills/strokes only; red text uses `destructiveText`.
4. Decorative accent is **non-interactive**, one per view max — never buttons, status, or active states.
5. **Default to dark mode**; light via theme switching, never hardcoded mode-specific values.
6. Status dots always carry a text label — never color alone.
7. Active-state convention everywhere: `primarySurface` fill + `primary` text/border.
8. On-fill text colors are derived by contrast, never authored (see `contrast-preserving-reversal` skill).

## Procedure

1. Inventory every color in the codebase (`grep -rE '#[0-9a-fA-F]{3,8}|rgba?\(' src/` + Tailwind palette classes). Map each occurrence to a role; the roles that emerge are your token set.
2. Assign every token a tier; document the assignment table.
3. Author the dark theme first (hand-tuned — it becomes the ramp spec any reflow engine reads its constants from). Derive light by re-deriving contrast, not mirroring.
4. Ship as parallel artifacts generated from one source: TS/JSON tokens, CSS custom properties, Tailwind `@theme`. Never hand-edit the generated ones.
5. Wire semantic classes/vars through the app; delete raw hex as you go.
6. Verify: zero hex in components (grep is the test), both modes pass the contrast checklist, and a trial brand-seed swap reflows cleanly.

## Smells to flag during audit

- A hex value in a component "because it matched the design" → missing role; mint it.
- The same color used for a warning badge and a brand highlight → tier collision; split tokens even if values currently coincide.
- `opacity:` on a colored fill to make a tint → replace with a tint token so contrast can be verified.
- Light theme values that are exact lightness inversions of dark → nobody re-derived contrast; audit with the reversal checklist.
