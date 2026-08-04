# Theming & Mathematical Color Mutation

## The concept

Most "theming" is a stylesheet swap. This stream codifies a stronger claim, extracted from a production design system: **a theme is a computation.** One brand seed color, run through an OKLCH engine against a hand-tuned ramp spec, regenerates an entire accessible theme — in both dark and light mode, live, with no rebuild — because three things were designed to make it possible:

1. **A three-tier semantic token architecture.** Every color role belongs to exactly one mutation tier: **brand** tokens *reflow* from the seed (primary, ring, chart-1, nav accent, tints); **neutral** tokens *tilt* (hue rotates toward the brand at ≤0.04 chroma while the lightness ramp — the app's spatial hierarchy — stays fixed); **sentiment** tokens are *pinned* (warning amber, destructive plum, decorative orange — their hue *is* their meaning).
2. **Gamut-aware OKLCH mutation.** The seed contributes exactly one number — its hue. The system owns lightness (whoever owns lightness owns contrast), and chroma is binary-searched to the largest in-sRGB-gamut value per hue rather than copied — because max chroma varies ~50% across hues at fixed lightness, and out-of-gamut colors get silently gamut-mapped by the browser, invalidating every contrast ratio you measured.
3. **Contrast-preserving reversal.** On-fill text colors are *outputs of measurement*, never stylesheet decisions: one engine composites alpha tints over their real backdrop, then picks whichever brand-approved candidate (white vs house navy) wins WCAG contrast, flagging AA. And when dark flips to light, foregrounds are re-derived, not mirrored — generated light-mode fills are deliberately seated *deeper* (L 52%) so white text wins ≥5:1 for every hue and buttons reverse to confident white-on-color instead of landing in the washed-out zone.

The payoff: "re-theme this app to `#7C3AED`" becomes deterministic and verifiable — a preset sweep across eleven hues lands in a tight contrast band (7.0–8.2:1 dark) with the correct on-color chosen everywhere, generated live by the shipping engine.

## The documents

- **[00 — Theming Architecture](00-theming-architecture.md)** — the three-tier token model, dark-first reversal, the fill/text splits a flat palette can't express, and the hard rules that make the system safe to hand to agents.
- **[01 — OKLCH Color Mutation](01-oklch-color-mutation.md)** — the math: why OKLCH, the three-move reflow algorithm (extract hue → seat into fixed-lightness ramps → clamp chroma by gamut binary search), neutral tilt, and the properties worth stealing.
- **[02 — Contrast Preservation & Reversal](02-contrast-preservation-and-reversal.md)** — the on-color engine, tint compositing ("contrast is a property of rendered pixels, not token values"), light-mode deepening, sentiment fill/text splits, and the audit checklist.
- **[03 — Case Study](03-case-study.md)** — the source system in the concrete: full token inventory, the engine's published OKLCH constants, the verified 11-brand preset table, and the agent-distribution model (llms.txt → portable rules file → per-tool install kit).

## The skills

Three portable skills in [skills/](skills/), each usable standalone in any project:

- **[semantic-theme-tokens](skills/semantic-theme-tokens/SKILL.md)** — set up (or audit) the role-based, three-tier token architecture that theming requires.
- **[oklch-brand-reflow](skills/oklch-brand-reflow/SKILL.md)** — implement the seed-to-theme mutation engine. Ships with [oklch-engine.ts](skills/oklch-brand-reflow/oklch-engine.ts), a zero-dependency reference implementation (verified: reproduces the source system's published preset contrast table exactly — e.g. violet → 7.3:1/navy dark, 5.9:1/white light).
- **[contrast-preserving-reversal](skills/contrast-preserving-reversal/SKILL.md)** — derive on-colors by measurement, composite tints before judging, re-derive (don't mirror) on mode flips; includes the audit checklist.

## Open threads

- A second data point: run the same codification against another house ramp to see which constants are system-specific (the seats, the tilt ceiling) versus universal (the argmax, the clamp, the tier partition).
- The washed-out-zone phenomenon (L ~60–65%, where neither text candidate wins convincingly) deserves a systematic map across hue × lightness — it would let ramp seats be chosen analytically instead of by sweep.
- APCA (WCAG 3 draft) as the contrast metric: the argmax architecture is metric-agnostic, so swapping WCAG 2 ratios for APCA Lc is a contained change worth prototyping.
