/**
 * oklch-engine.ts — self-contained OKLCH brand-reflow engine.
 *
 * Zero dependencies; runs in Node, Deno, Bun, or the browser.
 * Implements the mutation model codified in docs/research/theming:
 *   - seed → hue extraction (L/C of the seed are discarded)
 *   - fixed-lightness seating with gamut-clamped chroma (binary search)
 *   - contrast-derived on-colors (argmax over brand-approved candidates)
 *   - alpha-tint compositing before contrast measurement
 *   - neutral tilt (hue → seed, chroma capped, lightness ramp fixed)
 *
 * Quick check: `npx tsx oklch-engine.ts "#7C3AED"` prints a generated theme.
 */

// ── sRGB ↔ OKLab/OKLCH (Björn Ottosson's reference matrices) ─────────────────

export interface OKLCH { L: number; C: number; H: number } // L 0..1, H degrees

const cbrt = Math.cbrt;

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** OKLCH → linear sRGB. May return out-of-[0,1] channels: that means out of gamut. */
function oklchToLinearSrgb({ L, C, H }: OKLCH): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function hexToOklch(hex: string): OKLCH {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function oklchToHex(c: OKLCH): string {
  const lin = oklchToLinearSrgb(c).map((v) => Math.min(1, Math.max(0, v)));
  return (
    "#" +
    lin
      .map((v) => Math.round(linearToSrgb(v) * 255).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

// ── Gamut clamp: the central operation ───────────────────────────────────────

const GAMUT_EPS = 1e-5;

export function inSrgbGamut(c: OKLCH): boolean {
  return oklchToLinearSrgb(c).every((v) => v >= -GAMUT_EPS && v <= 1 + GAMUT_EPS);
}

/**
 * clampC(L, Cmax, H): largest chroma ≤ Cmax with oklch(L, c, H) inside sRGB.
 * Binary search — ~20 iterations is far below any visible difference.
 * Clamp instead of fixing C: max in-gamut chroma varies ~50% by hue at fixed L,
 * and letting the browser gamut-map an out-of-range color silently invalidates
 * every contrast ratio measured against the requested color.
 */
export function clampChroma(L: number, Cmax: number, H: number): number {
  if (inSrgbGamut({ L, C: Cmax, H })) return Cmax;
  let lo = 0, hi = Cmax;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgbGamut({ L, C: mid, H })) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ── WCAG contrast + on-color engine ──────────────────────────────────────────

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA), lb = relativeLuminance(hexB);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite a foreground-with-alpha over an opaque backdrop (both sRGB). */
export function composite(fgHex: string, alpha: number, backdropHex: string): string {
  const fg = hexToRgb(fgHex), bg = hexToRgb(backdropHex);
  const out = fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
  return (
    "#" + out.map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase()
  );
}

export interface OnColorResult { color: string; ratio: number; aa: boolean; aaLarge: boolean }

/**
 * onColor(bg): contrast-derived foreground. Never author on-colors by hand.
 * For tints (alpha < 1), pass the backdrop so the tint is composited first —
 * contrast is a property of rendered pixels, not token values.
 */
export function onColor(
  bgHex: string,
  opts: { alpha?: number; backdrop?: string; candidates?: [string, string] } = {},
): OnColorResult {
  const { alpha = 1, backdrop = "#0B1220", candidates = ["#FFFFFF", "#0B1220"] } = opts;
  const solid = alpha < 1 ? composite(bgHex, alpha, backdrop) : bgHex;
  const scored = candidates.map((c) => ({ color: c, ratio: contrastRatio(solid, c) }));
  scored.sort((a, b) => b.ratio - a.ratio);
  const best = scored[0];
  return { ...best, aa: best.ratio >= 4.5, aaLarge: best.ratio >= 3.0 };
}

// ── The reflow engine ────────────────────────────────────────────────────────

export interface RampSpec {
  /** Per-mode seat for the primary fill: fixed lightness + chroma ceiling. */
  dark: { L: number; Cmax: number };
  light: { L: number; Cmax: number };
  /** Neutral tilt chroma ceiling. */
  neutralCmax: number;
  /** primarySurface tint alphas per mode. */
  surfaceAlpha: { dark: number; light: number };
  /** Card backdrops used for tint compositing per mode. */
  backdrop: { dark: string; light: string };
}

/** Reference constants from the source system — replace with your own house ramp. */
export const REFERENCE_RAMP: RampSpec = {
  dark: { L: 0.723, Cmax: 0.192 },
  light: { L: 0.52, Cmax: 0.17 }, // deep seat: white text wins ≥5:1 for every hue
  neutralCmax: 0.04,
  surfaceAlpha: { dark: 0.1, light: 0.08 },
  backdrop: { dark: "#0B1220", light: "#FFFFFF" },
};

export interface NeutralStop { role: string; L: number; C: number; H: number }

/** Reference dark neutral ramp (lightness hierarchy is fixed; hue tilts). */
export const REFERENCE_NEUTRALS: NeutralStop[] = [
  { role: "bgBase", L: 0.099, C: 0.022, H: 314 },
  { role: "bgDeep", L: 0.159, C: 0.03, H: 261 },
  { role: "bgCard", L: 0.183, C: 0.031, H: 263 },
  { role: "bgSurface", L: 0.228, C: 0.037, H: 265 },
  { role: "border", L: 0.279, C: 0.037, H: 260 },
  { role: "textMuted", L: 0.711, C: 0.035, H: 257 },
  { role: "textPrimary", L: 0.984, C: 0.003, H: 248 },
];

export interface BrandTheme {
  seedHue: number;
  dark: Record<string, string | OnColorResult>;
  light: Record<string, string | OnColorResult>;
  neutralsTilted: Array<{ role: string; hex: string }>;
}

/**
 * reflowBrand(seedHex): the full tier-1 + tier-2 mutation.
 * Tier 3 (sentiment) is deliberately absent — pinned hues never enter the engine.
 */
export function reflowBrand(
  seedHex: string,
  ramp: RampSpec = REFERENCE_RAMP,
  neutrals: NeutralStop[] = REFERENCE_NEUTRALS,
  tiltNeutrals = true,
): BrandTheme {
  const seedH = hexToOklch(seedHex).H; // the seed contributes exactly one number

  const mode = (m: "dark" | "light") => {
    const { L, Cmax } = ramp[m];
    const primary = oklchToHex({ L, C: clampChroma(L, Cmax, seedH), H: seedH });
    const on = onColor(primary);
    const onSurface = onColor(primary, {
      alpha: ramp.surfaceAlpha[m],
      backdrop: ramp.backdrop[m],
    });
    return {
      primary,
      onPrimary: on,
      ring: primary,
      chart1: primary,
      sidebarPrimary: primary,
      primarySurface: `${primary}${Math.round(ramp.surfaceAlpha[m] * 255).toString(16).padStart(2, "0")}`,
      onPrimarySurface: onSurface,
    };
  };

  const neutralsTilted = neutrals.map((n) => ({
    role: n.role,
    hex: oklchToHex(
      tiltNeutrals
        ? { L: n.L, C: clampChroma(n.L, Math.min(n.C, ramp.neutralCmax), seedH), H: seedH }
        : n,
    ),
  }));

  return { seedHue: seedH, dark: mode("dark"), light: mode("light"), neutralsTilted };
}

// ── CLI smoke test ───────────────────────────────────────────────────────────

declare const process: { argv: string[] } | undefined;
if (typeof process !== "undefined" && process?.argv?.[1]?.includes("oklch-engine")) {
  const seed = process.argv[2] ?? "#7C3AED";
  console.log(JSON.stringify(reflowBrand(seed), null, 2));
}
