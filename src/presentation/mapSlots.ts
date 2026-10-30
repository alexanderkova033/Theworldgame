// Where things stand inside a province on the map: a set of building plots
// worked out once from its outline, clear of its name, its strip of flags and
// the nation's name, and two grounds for crowds (a camp and a square) that no
// building takes. Worked out from the geometry alone, so a building stays
// where it is as others go up.
import {
  MAX_CANNERIES_PER_PROVINCE,
  MAX_EDUCATION_PER_PROVINCE,
  MAX_FACTORIES_PER_PROVINCE,
  MAX_FARMS_PER_PROVINCE,
  MAX_GRANARIES_PER_PROVINCE,
  MAX_HARBOURS_PER_PROVINCE,
  MAX_HOUSING_PER_PROVINCE,
} from "../domain/constants";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import type { ProjectType } from "../domain/construction/types";
import { distanceToSegment, edges, nationShapes, parsePolygon, type Point } from "./nationFrontiers";

export interface ProvincePlots {
  camp: Point; // where people without a home gather
  square: Point; // where strikers and rioters gather
  plots: Point[]; // building plots: the clear ones, nearest the province's name first...
  clearPlots: number; // ...this many of them; the rest are squeezed in, for a province nearly full
}

// The most buildings a province can hold, roads apart (they're lines): the
// MAX_*_PER_PROVINCE constants added up.
export const PLOTS_NEEDED = 18;

const SPACINGS = [32, 28, 24, 20, 17]; // map units between clear plots: the widest that gives enough
const ENOUGH_CLEAR_PLOTS = 8; // more than a province holds for a long while
const EDGE_MARGIN = 8;
export const PROVINCE_LABEL_ROOM = { halfWidth: 40, above: 26, below: 36 }; // the middle of the name with the capital's star, and the strip of flags under it
const STRIP_HALF_WIDTH = 36;
const NATION_NAME_ROOM = { maxHalfWidth: 112, halfHeight: 28 };
const CROWD_REACH = { across: 20, above: 30, below: 10 }; // the ground a crowd covers round its point
const CROWD_EDGE_MARGINS = [18, 13, 9]; // as far from the border as the province allows
const CROWD_GRID = 7;
const GROUNDS_APART = 44;

interface Room {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const inRoom = ([x, y]: Point, r: Room) => x > r.left && x < r.right && y > r.top && y < r.bottom;

function inside([x, y]: Point, polygon: Point[]): boolean {
  let within = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[i];
    const [bx, by] = polygon[j];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) within = !within;
  }
  return within;
}

// A small steady wobble for each plot, so they don't read as a grid.
function wobble(n: number): number {
  return (Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function candidates(polygon: Point[], spacing: number, rooms: Room[], margin: number, jitter = 0.15): Point[] {
  const outline = edges(polygon);
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const found: Point[] = [];
  const rowHeight = spacing * 0.8;
  let row = 0;
  for (let y = minY; y <= maxY; y += rowHeight, row++) {
    for (let x = minX + (row % 2 ? spacing / 2 : 0); x <= maxX; x += spacing) {
      const seed = x * 3.1 + y * 7.7;
      const plot: Point = [x + wobble(seed) * spacing * jitter, y + wobble(seed + 1) * spacing * jitter];
      if (!inside(plot, polygon) || rooms.some((room) => inRoom(plot, room))) continue;
      if (outline.some((edge) => distanceToSegment(plot, edge) < margin)) continue;
      found.push(plot);
    }
  }
  return found;
}

const apart = (a: Point, b: Point, distance: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) >= distance;

// A crowd's point must leave the crowd itself clear of a name.
const widenedForCrowd = (r: Room): Room => ({ left: r.left - CROWD_REACH.across, right: r.right + CROWD_REACH.across, top: r.top - CROWD_REACH.below, bottom: r.bottom + CROWD_REACH.above });

// The two grounds: the nearest open ones to the province's name, one each
// side of it if it can. Each try gives up a little more where a province is
// too small: first closeness to the border, then the nation's name, then its
// own (shown only when in focus), and last the strip of flags under it.
function findGrounds(polygon: Point[], label: Point, labelRoom: Room, nameRooms: Room[]): { camp: Point; square: Point } {
  const distance = ([x, y]: Point) => Math.hypot(x - label[0], y - label[1]);
  const stripRoom: Room = { left: label[0] - STRIP_HALF_WIDTH, right: label[0] + STRIP_HALF_WIDTH, top: label[1] + 6, bottom: label[1] + 36 };
  const tries: Array<{ rooms: Room[]; margin: number }> = [
    ...CROWD_EDGE_MARGINS.map((margin) => ({ rooms: [labelRoom, ...nameRooms], margin })),
    { rooms: [labelRoom], margin: CROWD_EDGE_MARGINS[2] },
    { rooms: [stripRoom, ...nameRooms], margin: CROWD_EDGE_MARGINS[2] },
    { rooms: [stripRoom], margin: CROWD_EDGE_MARGINS[2] },
    { rooms: [], margin: CROWD_EDGE_MARGINS[2] },
    { rooms: [], margin: 0 },
  ];
  for (const { rooms, margin } of tries) {
    const open = candidates(polygon, CROWD_GRID, rooms.map(widenedForCrowd), margin, 0).sort((a, b) => distance(a) - distance(b));
    const camp = open.find((p) => p[0] < label[0]) ?? open[0];
    if (!camp) continue;
    const square = open.find((p) => p[0] >= label[0] && apart(p, camp, GROUNDS_APART)) ?? open.find((p) => apart(p, camp, GROUNDS_APART));
    if (square) return { camp, square };
  }
  return { camp: label, square: label };
}

const plotsById = new Map<string, ProvincePlots>();

export function getProvincePlots(provinceId: string): ProvincePlots | null {
  const cached = plotsById.get(provinceId);
  if (cached) return cached;
  const place = [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands].find((p) => p.id === provinceId);
  if (!place) return null;

  const polygon = parsePolygon(place.path);
  const label: Point = [place.labelX, place.labelY];
  const labelHalfWidth = PROVINCE_LABEL_ROOM.halfWidth;
  const labelRoom: Room = { left: place.labelX - labelHalfWidth, right: place.labelX + labelHalfWidth, top: place.labelY - PROVINCE_LABEL_ROOM.above, bottom: place.labelY + PROVINCE_LABEL_ROOM.below };
  const nameRooms: Room[] = nationShapes([]).map((shape) => {
    const halfWidth = Math.min(shape.labelWidth * 0.5, NATION_NAME_ROOM.maxHalfWidth);
    return { left: shape.labelX - halfWidth, right: shape.labelX + halfWidth, top: shape.labelY - NATION_NAME_ROOM.halfHeight, bottom: shape.labelY + NATION_NAME_ROOM.halfHeight };
  });

  const { camp, square } = findGrounds(polygon, label, labelRoom, nameRooms);
  const groundRoom = ([x, y]: Point): Room => ({ left: x - CROWD_REACH.across, right: x + CROWD_REACH.across, top: y - CROWD_REACH.above, bottom: y + CROWD_REACH.below });
  const grounds = [groundRoom(camp), groundRoom(square)];

  // Clear plots: the widest spacing that gives enough, or the most there are.
  const clearRooms = [labelRoom, ...nameRooms, ...grounds];
  let clear: Point[] = [];
  for (const spacing of SPACINGS) {
    const found = candidates(polygon, spacing, clearRooms, EDGE_MARGIN);
    if (found.length > clear.length) clear = found;
    if (clear.length >= ENOUGH_CLEAR_PLOTS) break;
  }
  const distance = ([x, y]: Point) => Math.hypot(x - place.labelX, y - place.labelY);
  clear.sort((a, b) => distance(a) - distance(b));

  // Squeezed in behind them, so a province nearly full still shows every
  // building: tighter, and over the names only when nothing else is left.
  const plots = [...clear];
  const squeezeTries: Array<{ spacing: number; rooms: Room[]; margin: number; gap: number }> = [
    { spacing: 16, rooms: [labelRoom, ...grounds], margin: 8, gap: 14 },
    { spacing: 13, rooms: grounds, margin: 7, gap: 11 },
    { spacing: 10, rooms: [], margin: 5, gap: 8 },
    { spacing: 7, rooms: [], margin: 3, gap: 5 },
  ];
  for (const { spacing, rooms, margin, gap } of squeezeTries) {
    // Furthest from the name first, where they cover least.
    for (const plot of candidates(polygon, spacing, rooms, margin).sort((a, b) => distance(b) - distance(a))) {
      if (plots.length >= PLOTS_NEEDED) break;
      if (plots.every((taken) => apart(plot, taken, gap))) plots.push(plot);
    }
  }

  const result: ProvincePlots = { camp, square, plots, clearPlots: clear.length };
  plotsById.set(provinceId, result);
  return result;
}

// Homes gather round the middle of the province, farms spread to its far
// edges with the harbour, and everything else starts part way out.
const KIND_PLACES: Array<{ type: ProjectType; max: number; from: "near" | "far" | "middle" }> = [
  { type: "housing", max: MAX_HOUSING_PER_PROVINCE, from: "near" },
  { type: "farm", max: MAX_FARMS_PER_PROVINCE, from: "far" },
  { type: "factory", max: MAX_FACTORIES_PER_PROVINCE, from: "middle" },
  { type: "education", max: MAX_EDUCATION_PER_PROVINCE, from: "middle" },
  { type: "granary", max: MAX_GRANARIES_PER_PROVINCE, from: "middle" },
  { type: "cannery", max: MAX_CANNERIES_PER_PROVINCE, from: "middle" },
  { type: "harbour", max: MAX_HARBOURS_PER_PROVINCE, from: "far" },
];

const reservedById = new Map<string, Map<ProjectType, Point[]>>();

// Every building a province could ever hold has its plot set aside from the
// start, the first of each kind before the second of any, so a building
// never moves whatever goes up round it, and what's built first gets the
// clear plots.
function reservedPlots(provinceId: string): Map<ProjectType, Point[]> {
  const cached = reservedById.get(provinceId);
  if (cached) return cached;
  const reserved = new Map<ProjectType, Point[]>(KIND_PLACES.map(({ type }) => [type, []]));
  const provincePlots = getProvincePlots(provinceId);
  if (provincePlots) {
    const { plots, clearPlots } = provincePlots;
    const clear = Array.from({ length: clearPlots }, (_, i) => i);
    const squeezed = Array.from({ length: plots.length - clearPlots }, (_, i) => clearPlots + i);
    const start = Math.floor(clearPlots * 0.4);
    const orders = {
      near: [...clear, ...squeezed],
      far: [...[...clear].reverse(), ...squeezed],
      middle: [...clear.slice(start), ...clear.slice(0, start), ...squeezed],
    };
    const taken = new Set<number>();
    const mostOfAny = Math.max(...KIND_PLACES.map((kind) => kind.max));
    for (let round = 0; round < mostOfAny; round++) {
      for (const { type, max, from } of KIND_PLACES) {
        if (round >= max) continue;
        const index = orders[from].find((i) => !taken.has(i));
        if (index === undefined) continue;
        taken.add(index);
        reserved.get(type)!.push(plots[index]);
      }
    }
  }
  reservedById.set(provinceId, reserved);
  return reserved;
}

// Where each of these buildings stands, in order: the nth of a kind always
// on that kind's nth plot. Null for any there's no plot for (a road).
export function placeBuildings(provinceId: string, types: ProjectType[]): Array<Point | null> {
  const reserved = reservedPlots(provinceId);
  const seen = new Map<ProjectType, number>();
  return types.map((type) => {
    const nth = seen.get(type) ?? 0;
    seen.set(type, nth + 1);
    return reserved.get(type)?.[nth] ?? null;
  });
}
