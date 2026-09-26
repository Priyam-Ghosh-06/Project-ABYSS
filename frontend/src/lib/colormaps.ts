// Colormap utilities for Project ABYSS scientific visualization
export type ColormapType = 'turbo' | 'thermal' | 'haline' | 'coolwarm' | 'viridis' | 'ocean' | 'plasma';

const TURBO_STOPS: [number, number, number][] = [
  [48, 18, 59],
  [70, 107, 237],
  [40, 188, 235],
  [44, 222, 148],
  [164, 252, 60],
  [251, 185, 56],
  [251, 86, 32],
  [122, 4, 3]
];

const THERMAL_STOPS: [number, number, number][] = [
  [20, 10, 40],
  [80, 20, 90],
  [150, 30, 90],
  [210, 70, 50],
  [245, 140, 30],
  [255, 215, 60],
  [255, 255, 180]
];

const HALINE_STOPS: [number, number, number][] = [
  [20, 35, 70],
  [30, 85, 120],
  [45, 140, 145],
  [65, 185, 145],
  [120, 220, 135],
  [205, 245, 145],
  [255, 255, 210]
];

const COOLWARM_STOPS: [number, number, number][] = [
  [59, 76, 192],
  [115, 155, 235],
  [190, 215, 250],
  [240, 240, 240],
  [250, 185, 160],
  [225, 90, 70],
  [180, 4, 38]
];

const VIRIDIS_STOPS: [number, number, number][] = [
  [68, 1, 84],
  [71, 44, 122],
  [59, 81, 139],
  [44, 113, 142],
  [33, 144, 141],
  [39, 173, 129],
  [92, 200, 99],
  [170, 220, 50],
  [253, 231, 37]
];

const OCEAN_STOPS: [number, number, number][] = [
  [5, 20, 50],
  [10, 50, 110],
  [20, 100, 180],
  [40, 155, 220],
  [90, 210, 245],
  [180, 245, 255],
  [245, 252, 255]
];

const PLASMA_STOPS: [number, number, number][] = [
  [13, 8, 135],
  [84, 2, 163],
  [139, 10, 165],
  [185, 50, 137],
  [219, 92, 104],
  [244, 136, 73],
  [254, 188, 43],
  [240, 249, 33]
];

function getStops(cmap: ColormapType): [number, number, number][] {
  switch (cmap) {
    case 'thermal': return THERMAL_STOPS;
    case 'haline': return HALINE_STOPS;
    case 'coolwarm': return COOLWARM_STOPS;
    case 'viridis': return VIRIDIS_STOPS;
    case 'ocean': return OCEAN_STOPS;
    case 'plasma': return PLASMA_STOPS;
    case 'turbo':
    default:
      return TURBO_STOPS;
  }
}

export function interpolateColor(normalizedVal: number, cmap: ColormapType = 'turbo'): [number, number, number] {
  const t = Math.max(0, Math.min(1, normalizedVal));
  const stops = getStops(cmap);
  const n = stops.length - 1;
  const idx = Math.min(Math.floor(t * n), n - 1);
  const frac = (t * n) - idx;

  const c1 = stops[idx];
  const c2 = stops[idx + 1];

  const r = Math.round(c1[0] + frac * (c2[0] - c1[0]));
  const g = Math.round(c1[1] + frac * (c2[1] - c1[1]));
  const b = Math.round(c1[2] + frac * (c2[2] - c1[2]));

  return [r, g, b];
}

export function getColorHex(normalizedVal: number, cmap: ColormapType = 'turbo'): string {
  const [r, g, b] = interpolateColor(normalizedVal, cmap);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getCssGradient(cmap: ColormapType = 'turbo'): string {
  const stops = getStops(cmap);
  const colorStrings = stops.map((c, i) => {
    const pct = Math.round((i / (stops.length - 1)) * 100);
    return `rgb(${c[0]}, ${c[1]}, ${c[2]}) ${pct}%`;
  });
  return `linear-gradient(to right, ${colorStrings.join(', ')})`;
}
