// What the map's parts share: the terrain's fills, the nations' washes,
// road widths, the camera (the viewBox and its limits) and the map modes.
// Plain values and functions, kept apart from the components (MapDecor,
// MapLayers, MapPanel) so each of those files exports components only.
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { Terrain } from "../../domain/provinces/types";
import type { ProvinceStatus } from "../../application/getProvinceOverview";

// Every terrain gets a decorative texture, drawn on top of the province's
// ownership color — this is what makes the map read as an actual landscape
// rather than a flat political map.
export const TERRAIN_PATTERN: Record<Terrain, string> = {
  hills: "url(#terrain-hills)",
  forest: "url(#terrain-forest)",
  coast: "url(#terrain-coast)",
  plains: "url(#terrain-plains)",
};

// A faint terrain wash over the nation's own watercolour, like a second
// pass of the brush: umber hills, green forest, wheat-gold plains, sea-grey
// coast. The pen symbols on top carry the terrain; this only warms it.
export const TERRAIN_TINT: Record<Terrain, string> = {
  hills: "#7a5428",
  forest: "#2f5a26",
  coast: "#3d6f86",
  plains: "#c79a2e",
};

// Each road built thickens the single line to its province (instead of
// fanning out extra parallel lines) — a "×N" badge carries the exact count
// so the line itself never has to turn into a tangle to stay informative.
// A colour pushed toward the ink, so a pale party colour still reads as
// lettering on the paper.
export function inkier(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ink = [0x2b, 0x1d, 0x12];
  const channel = (shift: number, i: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (ink[i] - c) * amount);
  };
  return `rgb(${channel(16, 0)}, ${channel(8, 1)}, ${channel(0, 2)})`;
}

// The watercolour a nation is washed in: its own hue at a soft, faded
// mid tone, as old hand-colouring has aged. A dark crest colour laid thin
// over the paper would only turn grey; a bright one would glare.
export function washColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return `hsl(${Math.round(h * 60 + 360) % 360}, 32%, 50%)`;
}

export const ROAD_BASE_WIDTH = 2.5;
export const ROAD_WIDTH_PER_ROAD = 1.1;
export const ROAD_MAX_WIDTH = 9;

export function roadLineWidth(count: number): number {
  return Math.min(ROAD_BASE_WIDTH + count * ROAD_WIDTH_PER_ROAD, ROAD_MAX_WIDTH);
}

// --- Zoom & pan --------------------------------------------------------
// The "camera" is just the SVG viewBox. Zooming/panning never touches the
// map's actual coordinates — it only changes which rectangle of that fixed
// world we're looking at. This is view state, not simulation state, so it
// lives here as local component state, the same way selectedProvinceId
// lives in App.tsx.

export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BASE_VIEW: ViewBox = { x: 0, y: 0, width: MAP_GEOMETRY.width, height: MAP_GEOMETRY.height };

// The world is bigger than the continent: zooming all the way out reveals
// open sea around it (textured, shaded, alive) instead of hitting a hard
// edge at the coastline. WORLD_VIEW is that outer bound — centered on the
// continent, half again as wide/tall on every side.
export const WORLD_MARGIN_X = MAP_GEOMETRY.width * 0.5;
export const WORLD_MARGIN_Y = MAP_GEOMETRY.height * 0.5;
export const WORLD_VIEW: ViewBox = {
  x: BASE_VIEW.x - WORLD_MARGIN_X,
  y: BASE_VIEW.y - WORLD_MARGIN_Y,
  width: BASE_VIEW.width + WORLD_MARGIN_X * 2,
  height: BASE_VIEW.height + WORLD_MARGIN_Y * 2,
};

export const MIN_ZOOM = BASE_VIEW.width / WORLD_VIEW.width; // zooming out this far shows the whole surrounding sea
export const MAX_ZOOM = 6;
export const DRAG_CLICK_THRESHOLD = 6; // total pixels of movement from the initial press before a drag stops counting as a click
export const WHEEL_SETTLE_MS = 140; // a wheel pause this long ends the gesture and redraws the map at its new zoom
export const LABEL_ZOOM_THRESHOLD = 1.5; // zoomRatio past which every province gets its name label, not just the focused one

export function clampViewBox(vb: ViewBox): ViewBox {
  const minWidth = BASE_VIEW.width / MAX_ZOOM;
  const maxWidth = BASE_VIEW.width / MIN_ZOOM;
  const width = Math.min(Math.max(vb.width, minWidth), maxWidth);
  const height = width * (BASE_VIEW.height / BASE_VIEW.width);

  // Allow a little overscroll past the open sea so the world edge never
  // feels glued to the panel border, but not so much you can pan away into
  // the void indefinitely.
  const padX = WORLD_VIEW.width * 0.15;
  const padY = WORLD_VIEW.height * 0.15;
  const minX = WORLD_VIEW.x - padX;
  const maxX = Math.max(minX, WORLD_VIEW.x + WORLD_VIEW.width + padX - width);
  const minY = WORLD_VIEW.y - padY;
  const maxY = Math.max(minY, WORLD_VIEW.y + WORLD_VIEW.height + padY - height);

  return {
    width,
    height,
    x: Math.min(Math.max(vb.x, minX), maxX),
    y: Math.min(Math.max(vb.y, minY), maxY),
  };
}

// The visible ocean canvas itself, generous enough to cover the full pan
// range above with room to spare — it should never run out before the pan
// clamp does.
export const OCEAN_RECT = {
  x: WORLD_VIEW.x - WORLD_VIEW.width * 0.2,
  y: WORLD_VIEW.y - WORLD_VIEW.height * 0.2,
  width: WORLD_VIEW.width * 1.4,
  height: WORLD_VIEW.height * 1.4,
};

export type MapMode = "political" | "homes" | "jobs" | "unrest";
export type ModeLevel = "ok" | "warn" | "alert";

export const MODE_COLORS: Record<ModeLevel, string> = { ok: "#93a878", warn: "#cfa760", alert: "#b8694f" };

// Each mode's three steps, and what they mean.
export const MAP_MODES: Array<{ key: MapMode; label: string; levels?: Record<ModeLevel, string> }> = [
  { key: "political", label: "Nations" },
  { key: "homes", label: "Homes", levels: { ok: "Room to grow", warn: "Nearly full", alert: "People without a home" } },
  { key: "jobs", label: "Jobs", levels: { ok: "Work for all", warn: "Jobs unfilled", alert: "Jobless" } },
  { key: "unrest", label: "Unrest", levels: { ok: "Calm", warn: "Discontent", alert: "Strikes or riots" } },
];

export function getModeLevel(mode: MapMode, status: ProvinceStatus): ModeLevel {
  if (mode === "homes") return status.homes === "over" ? "alert" : status.homes === "full" ? "warn" : "ok";
  if (mode === "jobs") return status.jobs === "jobless" ? "alert" : status.jobs === "short" ? "warn" : "ok";
  return status.stage === "calm" ? "ok" : status.stage === "discontent" ? "warn" : "alert";
}

