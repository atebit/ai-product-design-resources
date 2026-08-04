# Contrast Preservation & Reversal — Keeping Every Mutation Readable

**Source:** Codified from a production design system's on-color engine and mode-reversal conventions (the [case study](03-case-study.md)).
**Series:** Theming & Mathematical Color Mutation — doc 3 of 4

## Scope

Color mutation is only safe if contrast survives it. This document codifies the machinery that guarantees that: the auto on-color engine (measured contrast picks the text color, never a stylesheet), tint compositing, and the deliberate *reversal* moves — light mode deepening fills so text flips from dark-on-color to white-on-color, and the fill-vs-text splits that keep sentiment colors readable on both modes.

---

## 1. The principle: on-colors are outputs, not decisions

The failure this prevents is familiar: a theme engine changes a fill, and somewhere a hardcoded `text-white` becomes illegible on the new color. The source system's rule closes the class of bug, not the instance:

> The on-fill text color is never hardwired. One engine takes any background — a solid fill or a semi-transparent tint — and returns whichever of light (`#FFFFFF`) or dark (`#0B1220`) text has the higher measured WCAG contrast, then flags whether it clears AA. Every colored surface routes through it.

```
solid   = alpha < 1 ? composite(bg, cardBackdrop) : bg
on(bg)  = argmax_contrast(solid, { white #FFFFFF, navy #0B1220 })
ratio   = contrast(solid, on(bg))
aa      = ratio >= 4.5      // 3.0 for large/bold text; best-available is flagged, not hidden
```

Design notes that make this robust rather than merely clever:

- **The candidate set is two brand-approved colors, not "black or white."** The dark candidate is the system's own navy (`#0B1220`), so even the *derived* text colors stay on-palette.
- **Consistency is a stated goal:** because everything routes through one engine, "the same brand fill never shows white text in one place and dark text in another."
- **AA is asserted, and failure is honest.** When no candidate clears the threshold (possible for extreme mid-tone seeds), the engine flags best-available rather than silently shipping — a human decision point, surfaced by the machine.

## 2. Tints must be composited before they are measured

The subtlest rule in the system. Surface tints like `primarySurface` are ~8–10% alpha. Measuring contrast against the raw tint color gives a **wrong answer** — the eye sees the tint *over its backdrop*, and so must the math:

> The primarySurface tint is only ~8–10% opaque, so the engine paints it over the card backdrop for the mode (`#0B1220`) before measuring — judging the raw tint color would give the wrong answer.

So: alpha-composite (`solid = tint over backdrop`), *then* run the argmax. This is why the decision visibly flips across modes — a pale brand tint over a white card needs dark text, the same tint over a dark card needs light text — and the engine gets both right from one rule. Generalized: **contrast is a property of rendered pixels, not of token values.** Any color that ships with alpha needs a compositing step in its verification path.

## 3. Reversal move #1 — deepen light-mode fills so white wins

The heart of "reversed to retain contrast." A dark-first system can't produce its light mode by mirroring lightness, because contrast relationships don't mirror. The source system's engine seats generated brands at **L 72.3% in dark mode but L 52% in light mode** — much deeper than a naive flip would give — and documents why:

> Why light mode runs deeper (52%, not green's 62.7%): a primary button should read as a strong colored fill with white text. At 62.7% most chromatic hues landed in a washed-out zone where dark text barely won (≈4.8:1) and buttons looked flat. Seating generated brands at L 52% makes every hue rich enough that white wins the contrast vote (≥5:1) — so brand buttons reverse to white-on-color and pop in light mode.

Unpack the mechanism, because it generalizes:

- Around L 60–65%, many hues sit in a **washed-out zone**: too light for white text to clear AA comfortably, barely dark enough for navy text — the argmax picks dark text by a hair, and the button reads as a weak tint rather than a confident fill.
- Rather than accept whatever the argmax yields there, the system moves the *fill* until the argmax yields the **convention it wants**: white-on-color, matching dark mode's feel and the shipped green's `#16A34A` white-on-green.
- So the pipeline is: pick the desired reversal convention first → position the ramp's lightness so the contrast vote lands there for *every* hue → let the engine verify it hue-by-hue. The on-color engine is the checker; ramp lightness is the designer's control knob.

Verified across the eleven starter presets (engine-generated, not hardcoded): dark-mode fills land at 7.0–8.2:1 against the page with navy on-color; light-mode fills land at 3.3–6.1:1 with white on-color, every hue ≥5:1 except the hand-tuned house green (3.3, exempt by fiat).

The general statement: **when a surface crosses modes, re-derive its foreground from measured contrast — and if the measured winner isn't the *designed* winner, move the background until it is.**

## 4. Reversal move #2 — fill/text splits for sentiment colors

The second class of contrast-preserving reversal: one hue, two tokens, because no single value survives both uses.

- **`destructive` (`#D42B4E` dark) is fills and strokes only.** As text on a dark card it fails. Red *text* uses `destructiveText` — `#F9A8BA` on dark (a light rose, ~7:1), `#9B0F2E` on light (a deep wine). Same semantic, *opposite lightness direction per mode* — the token pair encodes the reversal.
- **Charts repeat the split:** `chart.negative.bold` is for SVG strokes only, never text; all negative labels use `chart.negative.text` (~7:1). A stroke can get away with 3:1 against its plot background; a −2.1% label cannot.
- **The text ramp itself carries contrast minimums as spec:** `textPrimary` ~17:1, `textSecondary` ~14:1, `textTertiary` ~7:1, `textMuted` ~8:1 dark / ~5:1 light. Reversal preserves the *minimums*, not the hex values.

The pattern to reuse: for every sentiment hue, ask "does this need to work as a fill, a stroke, *and* text?" — and mint separate tokens the moment the answer forces different lightnesses. A flat palette physically cannot express this.

## 5. Reversal move #3 — everything else that flips

Smaller reversals that complete the system:

- **Logos:** one white asset, `filter: brightness(0)` in light mode. The reversal is a filter, not a second file.
- **`appShellBg`:** dark = layered mesh gradient from token stops; light = plain white. The *token* reverses; components above it don't know.
- **Alpha-borders survive both modes cheaply:** `borderOuter`/`borderInner` are black-ish alphas on light (`rgba(15,23,42,…)`) and slate alphas on dark (`rgba(51,65,85,…)`) — tuned per mode rather than shared, because a divider legible on `#0B1220` vanishes on white at the same alpha.
- **Scrims barely reverse at all** (`rgba(2,4,8,0.55)` dark vs `0.45` light): dimming behind a modal is about occlusion, not theme, so it's nearly mode-invariant — a reminder that *not everything* should flip.

## 6. The checklist form

For any theme mutation (new brand seed, new mode, new tint):

1. Every on-fill text color re-derived via `argmax_contrast(fill, candidates)` — zero hardwired on-colors anywhere.
2. Every alpha color composited over its actual backdrop before measuring.
3. Fill ramps positioned so the argmax lands on the *designed* convention (e.g., white-on-color in both modes) for all hues — adjust ramp L, don't override the vote.
4. Sentiment hues have separate fill and text tokens per mode, text ≥ ~7:1.
5. Text ramp meets its contrast minimums in both modes.
6. AA failures flagged, never silently shipped.
7. Anything communicated by color also communicated by a label (dots, deltas, badges).

The runnable version of this checklist is the [contrast-preserving-reversal skill](skills/contrast-preserving-reversal/SKILL.md); the math primitives are in [oklch-engine.ts](skills/oklch-brand-reflow/oklch-engine.ts).

Next: [03 — Case Study](03-case-study.md), the concrete system these rules were extracted from.
