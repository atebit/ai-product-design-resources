# OKLCH Color Mutation — Re-Seeding a Theme From One Brand Color

**Source:** Codified from a production design system's live theming engine (the [case study](03-case-study.md)).
**Series:** Theming & Mathematical Color Mutation — doc 2 of 4

## Scope

The algorithm that takes **one seed color** and regenerates the brand tier of a theme — accessibly, in both modes, with no rebuild — plus the neutral-tilt math. This is the "mathematical color theory mutation" layer: every step is a deterministic computation in OKLCH space, so the same seed always yields the same theme and every output is verifiable.

A reference implementation lives in [skills/oklch-brand-reflow/oklch-engine.ts](skills/oklch-brand-reflow/oklch-engine.ts).

---

## 1. Why OKLCH is the mutation space

The engine operates in OKLCH (the cylindrical form of OKLab) rather than HSL or RGB for three properties that the algorithm depends on:

1. **Perceptually uniform lightness.** `L` in OKLCH predicts perceived lightness regardless of hue. HSL's `L` does not — `hsl(60, 100%, 50%)` (yellow) and `hsl(240, 100%, 50%)` (blue) share a nominal lightness but differ wildly in appearance and in WCAG luminance. Fixing `L` per role only produces *consistent-feeling* themes across hues in a perceptually uniform space.
2. **Independent, meaningful chroma.** Chroma `C` is absolute colorfulness, not a percentage of gamut like HSL saturation. That makes "as saturated as this hue can be at this lightness" a well-posed question — which the clamping step (§3) answers.
3. **Hue stability under L/C changes.** Adjusting lightness or chroma in OKLCH doesn't visibly rotate hue (the failure that makes HSL-derived ramps drift purple in the blues).

The tradeoff: OKLCH coordinates can describe colors outside the sRGB gamut, and the maximum in-gamut chroma varies **sharply** by hue and lightness. That tradeoff is not a footnote — it's the reason the algorithm's central operation is a gamut-aware clamp rather than a coordinate copy.

## 2. The reflow algorithm

The seed contributes exactly **one number: its hue.** Everything else comes from the design system's own ramps.

```
seedH          = OKLCH(seed).H
clampC(L,C,H)  = largest c ≤ C with oklch(L, c, H) inside sRGB gamut   // binary search

dark.primary   = oklch(72.3%, clampC(72.3%, 0.192, seedH), seedH)
light.primary  = oklch(52.0%, clampC(52.0%, 0.170, seedH), seedH)   // deep: white text wins
ring / chart-1 / sidebar-primary = primary
primarySurface = brand hue @ ~10% alpha (dark) / 8% (light)

onPrimary(fill) = argmax_contrast(fill, { white, navy #0B1220 })    // AA-enforced
```

Read it as three moves:

**Move 1 — extract hue, discard everything else.** The seed's own lightness and chroma are noise: a brand might hand you `#001F5C` (a nearly-black navy) or `#FFB3D9` (a pastel pink), and neither is usable as a button fill. Taking only `H` means the *identity* of the brand survives while its *usability* is re-derived.

**Move 2 — seat the hue into each role's existing ramp.** Every role has a fixed target lightness taken from the hand-tuned house theme (in the source system: dark primary sits at L 72.3%, generated light primaries at L 52%). Lightness is what governs contrast relationships, spatial hierarchy, and "does this read as a fill or a tint" — so lightness belongs to the *system*, not the brand. The brand only gets to pick the angle around the hue wheel.

**Move 3 — clamp chroma to the gamut, per hue, by binary search.** The house ramp also defines a chroma *ceiling* per role (0.192 dark, 0.170 light). The engine takes the largest chroma ≤ the ceiling that is still inside sRGB at that exact `(L, H)` — found by binary search on `c`, testing sRGB gamut membership at each step (a dozen iterations converges well below visual difference).

## 3. Why clamp chroma instead of fixing it

This is the subtle step, and the live system documents its own rationale:

> At L 72.3% green reaches C 0.192, but blue/indigo top out near 0.145 and teal/cyan near 0.13. Forcing a constant chroma would push them out of gamut and the browser would silently clip — breaking accessibility.

Unpacked:

- **The sRGB gamut is lumpy in OKLCH.** At any fixed lightness, the maximum representable chroma varies by ~50% or more across hues. There is no single chroma value that is both "as vivid as the green" and representable for blue.
- **Silent clipping is the failure mode.** If you emit `oklch(72.3% 0.192 264)` (out of gamut for blue), the browser gamut-maps it — and what you *get* is not what you *measured*. Every contrast ratio you computed against the requested color is now wrong. Clamping in the engine means the color that ships is the color that was verified.
- **Clamping preserves perceived consistency better than matching numbers would.** Each hue renders as saturated as its gamut allows at the system's lightness — which is the honest definition of "equally vivid." The source system's starter presets confirm it: eleven brands (blue → rose → teal → amber) all land within a tight band of fill-vs-background contrast (7.0–8.2 dark, 3.3–6.1 light), generated live by the engine rather than hardcoded.

## 4. Derived roles: one computation, many tokens

Only `primary` is computed from scratch. The rest of tier 1 is derivation:

- `ring`, `chart-1`, `sidebar-primary` **equal** `primary` — focus, the first data series, and the nav accent are all "the brand acting," and keeping them literally identical is what makes the theme feel coherent rather than themed-in-parts.
- `primarySurface` is the brand hue at ~10% alpha (dark) / ~8% (light) — a tint, not a lighter solid, so it composites correctly over any surface beneath it.
- `onPrimary` and `onPrimarySurface` are **outputs of the contrast engine**, never authored — the fill (or the tint composited over its backdrop) is measured against white and navy, and the winner ships ([02](02-contrast-preservation-and-reversal.md)).
- The dark `appShellBg` mesh gradient re-seats its stops toward the brand hue as well, so even the page atmosphere follows the theme.

## 5. Neutral tilt — mutation tier 2

The neutral ramp mutates by a different, gentler rule:

```
tilted(L, C, H_neutral) = oklch(L, min(C, 0.04), seedH)
```

- **Lightness ramp: untouched.** The dark surface stack (bgBase 9.9% → bgDeep 15.9% → bgCard 18.3% → bgSurface 22.8% → border 27.9%) is the spatial hierarchy of the whole UI; it never moves.
- **Hue: rotates to the brand.** The whole ramp swings from the house ~260° navy toward the seed hue.
- **Chroma: capped at 0.04.** Below this ceiling a surface still reads as "dark neutral" while carrying an unmistakable cast of the brand. Above it, backgrounds start competing with content.

The house default is exempt (keeps its shipped navy), and the tilt is a toggle — both covered in [00 §2](00-theming-architecture.md).

Sentiment hues (tier 3) receive **no** mutation. The engine never touches them; that's enforced by the tier partition, not by the math.

## 6. Properties worth stealing

What this design gets right, stated generally enough to reuse in any system:

1. **The brand contributes one degree of freedom (hue); the system owns the rest (L, C ceilings, alpha, ramps).** This is the whole trick. Whoever owns lightness owns contrast; keep it out of the brand's hands.
2. **Mutate in a perceptually uniform space; ship in the device space; clamp at the boundary between them.** Never let the renderer make gamut decisions for you.
3. **Derive, don't enumerate.** One computed `primary` fans out to ring/chart/sidebar/tints/on-colors. A theme is ~1 computed color + ~10 derivations + 1 tilt rule — which is why it can run live in the browser with no rebuild.
4. **Fixed lightness makes verification tractable.** Because every generated brand sits at known (L, backdrop) pairs, contrast can be verified once per ramp design and then *spot-checked* per brand, instead of re-audited per brand.
5. **Hand-tune the flagship, generate the rest.** The engine's ramp constants are read off the hand-tuned house theme — the artisanal original is the spec for the machine.

Next: [02 — Contrast Preservation & Reversal](02-contrast-preservation-and-reversal.md), the machinery that keeps every mutation readable.
