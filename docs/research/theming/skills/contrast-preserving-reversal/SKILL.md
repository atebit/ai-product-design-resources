---
name: contrast-preserving-reversal
description: Keep text readable through theme mutation and dark/light reversal — derive on-colors by measured WCAG contrast, composite alpha tints before measuring, split sentiment hues into fill vs text tokens, and position ramps so the contrast vote lands on the designed convention. Use when building or auditing dark/light modes, theme engines, on-fill text colors, or any "readable foreground" logic.
---

# Contrast-Preserving Reversal

Color mutation is only safe if contrast survives it. This skill encodes the machinery: **on-colors are outputs of measurement, never stylesheet decisions**, and mode reversal re-derives foregrounds instead of mirroring values. Codified from a production design system (`docs/research/theming/02-contrast-preservation-and-reversal.md`); runnable primitives (`contrastRatio`, `composite`, `onColor`) live in [../oklch-brand-reflow/oklch-engine.ts](../oklch-brand-reflow/oklch-engine.ts).

## The on-color engine

```
solid   = alpha < 1 ? composite(bg over cardBackdrop) : bg
on(bg)  = argmax_contrast(solid, { light-candidate, dark-candidate })
aa      = ratio >= 4.5     // 3.0 for large/bold text; flag best-available, never hide failure
```

- **Candidates are two brand-approved colors** (reference system: white `#FFFFFF` and house navy `#0B1220`), not generic black/white — derived text stays on-palette.
- **One engine, everywhere.** Every colored surface routes through it, so the same fill never shows white text in one place and dark in another.
- **Failure is flagged, not hidden.** If no candidate clears AA (extreme mid-tone seeds), surface it as a human decision.

## The four rules

### 1. Composite tints before measuring

A ~8–10% alpha surface tint measured raw gives the **wrong answer** — the eye sees tint-over-backdrop. Alpha-composite over the actual card background for the mode, *then* measure. This is why the same brand tint correctly takes dark text over a white card and light text over a dark card. Generalized: **contrast is a property of rendered pixels, not token values** — any token with alpha needs a compositing step in its verification path.

### 2. Re-derive on mode flip; move the background if the vote is wrong

Contrast relationships don't mirror, so a light mode built by flipping lightness breaks. And when the measured winner isn't the *designed* winner, fix the fill, not the vote: the reference system seats generated light-mode primaries at L 52% (not the naive ~63%) specifically so white text wins ≥5:1 for **every** hue — buttons reverse to strong white-on-color instead of landing in the washed-out zone where dark text barely wins (~4.8:1) and fills look flat. Sequence: choose the reversal convention → position ramp lightness so the argmax lands there for all hues → let the engine verify hue-by-hue.

### 3. Split sentiment hues into fill vs text tokens

No single red survives both uses. The fill color (`destructive #D42B4E`) fails as text on dark; text gets its own token (`destructiveText`: light rose `#F9A8BA` on dark ~7:1, deep wine `#9B0F2E` on light) — same semantic, *opposite lightness direction per mode*. Charts repeat it: `chart.negative.bold` is SVG strokes only; all negative labels use `chart.negative.text`. Mint separate tokens the moment fill/stroke/text demand different lightnesses.

### 4. Spec text ramps as contrast minimums, not hex

The reversal preserves *ratios*, not values: textPrimary ~17:1, textSecondary ~14:1, textTertiary ~7:1, textMuted ~8:1 dark / ~5:1 light. Verify per mode against real surfaces (including composited tints and glass).

## What reverses, and how

| Surface | Reversal mechanism |
|---|---|
| On-fill text | Re-run argmax per mode — never mirror |
| Sentiment text | Paired token flips lightness direction (`#F9A8BA` ↔ `#9B0F2E`) |
| Logos | One white asset + `filter: brightness(0)` in light mode |
| App shell bg | Token swaps (dark mesh gradient ↔ plain white) |
| Borders/dividers | Per-mode alphas tuned separately — a divider legible on dark vanishes on white at the same alpha |
| Scrims | Nearly mode-invariant (occlusion, not theme) — not everything should flip |

## Audit checklist

Run on any new theme, mode, brand seed, or tinted surface:

1. Zero hardwired on-colors — every on-fill text derived by argmax (grep for `text-white` / `text-black` / hex text colors adjacent to colored fills).
2. Every alpha color composited over its real backdrop before measurement.
3. Fill ramps positioned so the vote lands on the designed convention for **all** hues (sweep 10+ hues; outliers → move ramp L).
4. Sentiment hues have fill/text splits per mode; text ≥ ~7:1.
5. Text ramp meets its minimums in both modes.
6. AA failures reported (best-available flagged), never silently shipped.
7. Nothing communicated by color alone — dots, deltas, and badges carry labels.

Quick verification in Node: `import { onColor, composite, contrastRatio } from '.../oklch-engine.ts'` and assert `onColor(fill).aa` across the preset sweep.
