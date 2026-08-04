---
name: oklch-brand-reflow
description: Re-theme an entire app from a single brand seed color using OKLCH math — fixed-lightness seating, gamut-clamped chroma, brand-tilted neutrals, pinned sentiment hues. Use when asked to white-label an app, generate a brand theme from one color, build a theme picker/engine, or re-seed a design system's palette.
---

# OKLCH Brand Reflow

Regenerate a theme from **one seed color** so the whole app reflows — buttons, focus rings, chart series, nav tints, surfaces — while staying accessible in both modes. Codified from a production design system's live engine (see `docs/research/theming/01-oklch-color-mutation.md` for full rationale).

A working zero-dependency implementation ships next to this skill: [oklch-engine.ts](oklch-engine.ts). Run `npx tsx oklch-engine.ts "#7C3AED"` to see a generated theme. Prefer adapting it over rewriting the color math.

## Prerequisite

The app must use role-based semantic tokens partitioned into three tiers (brand / neutral / sentiment). If it doesn't, apply the `semantic-theme-tokens` skill first — reflow over hardcoded hex is impossible.

## The algorithm

```
seedH          = OKLCH(seed).H                 // hue only; discard seed L and C
clampC(L,C,H)  = largest c ≤ C in sRGB gamut   // binary search

dark.primary   = oklch(L_dark,  clampC(L_dark,  C_dark,  seedH), seedH)
light.primary  = oklch(L_light, clampC(L_light, C_light, seedH), seedH)
ring = chart-1 = sidebar-primary = primary
primarySurface = primary @ ~10% alpha (dark) / ~8% (light)
onPrimary      = argmax_contrast(fill, { white, house-dark })   // never authored
neutrals       = oklch(L_fixed, min(C, 0.04), seedH)            // tilt, don't reflow
sentiment      = untouched                                       // pinned
```

The reference constants: dark seat L 72.3% / C ≤ 0.192; light seat **L 52%** / C ≤ 0.170; neutral tilt chroma ≤ 0.04. Derive your own from the hand-tuned house theme: read the house primary's OKLCH per mode — those L values and chroma ceilings *are* the ramp spec.

## Rules that make it correct

1. **The seed contributes exactly one number: hue.** Seed lightness/chroma are noise (brands hand you near-black navies and pastel pinks). The system owns lightness — whoever owns lightness owns contrast.
2. **Clamp chroma, never fix it.** Max in-gamut chroma varies ~50% across hues at fixed L (green 0.192, blue ~0.145, teal ~0.13 at L 72.3%). Emitting out-of-gamut `oklch()` lets the browser gamut-map silently, invalidating every contrast ratio you measured. Clamp in the engine so the shipped color is the verified color.
3. **Seat light-mode fills deep enough that white text wins.** Around L 60–65% many hues are washed out — dark text barely wins (~4.8:1) and buttons look flat. Seating at ~L 52% makes white win ≥5:1 for every hue, so light mode reverses to white-on-color like dark mode. Pick the reversal convention first, then position L so the contrast vote lands there for all hues.
4. **Neutrals tilt, never reflow.** Keep the lightness ramp fixed (it's the app's spatial hierarchy), rotate hue to the seed, cap chroma ≤ 0.04. Above the cap, backgrounds compete with content. Make the tilt a toggle (some customers want accent-only reflow).
5. **Sentiment hues never enter the engine.** Warning/destructive/accent hue *is* meaning; only the brand series token (`chart-1`) reflows, sentiment chart tokens stay pinned.
6. **Exempt the hand-tuned house default.** The flagship theme keeps its artisanal values; the engine is for generated brands. Name both regimes so nobody "fixes" the flagship through the machine.
7. **Derive on-colors, never author them** — that half of the system is the `contrast-preserving-reversal` skill; every fill and tint routes through its argmax engine.

## Procedure

1. Confirm the tier partition: list which tokens reflow / tilt / stay pinned. Get sign-off if ambiguous (e.g., is an "info blue" brand or sentiment?).
2. Read ramp constants off the house theme (per-mode L + chroma ceiling for primary; the neutral ramp's L/C stops).
3. Implement or adapt `oklch-engine.ts` (`hexToOklch`, `clampChroma`, `reflowBrand`); wire outputs to CSS custom properties so re-theming needs no rebuild.
4. Generate a preset table across a hue sweep (10–12 brands: blue → violet → pink → orange → teal → amber). For each: fill-vs-background ratio and chosen on-color, both modes.
5. Verify the table: dark-mode ratios in a tight band (reference system: 7.0–8.2), every light-mode hue landing on the designed convention (white ≥5:1). Outliers mean the ramp seat needs moving — adjust L, don't override individual hues.
6. Render the presets against real components (button, focus ring, active nav tint, chart series) in both modes before shipping.

## Failure modes to check

- A hue that "looks weaker" than others → chroma ceiling too high for that hue at the seat L (working as intended if clamped) or ramp L in the washed-out zone (move it).
- Tinted neutrals reading as colored surfaces → tilt chroma above ~0.04.
- A generated theme passing contrast but "not feeling like the brand" → the seed's identity was in its *lightness* (e.g., pastel brands); surface that tradeoff to a human rather than loosening the ramp.
