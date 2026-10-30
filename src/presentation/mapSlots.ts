// Where things stand inside a province on the map: building plots worked out
// once from its outline, far enough apart that no two pictures touch, clear
// of the capital's star and the nation's name. A province with more buildings
// than plots counts the rest on one of their kind, rather than stacking them.
// Crowds (a camp, a square) find open ground round whatever stands.
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import type { ProjectType } from "../domain/construction/types";
import { distanceToSegment, edges, nationShapes, parsePolygon, type Point } from "./nationFrontiers";

export interface ProvincePlots {
  plots: Point[]; // building plots, nearest the province's middle first
  grounds: Point[]; // places a crowd could stand, the same way round
}

export interface CrowdGrounds {
  camp: Point; // where people without a home gather
  square: Point; // where strikers and rioters gather
}

// The room one building's picture takes, whatever its kind: the farm's field
// is the widest, the factory's chimney the tallest.
export const BUILDING_ROOM = { width: 29, height: 25 };

const SPACINGS = [38, 35, 32]; // between plots: the widest that gives enough
const ROW_SHARE = 0.9; // rows are this much of the spacing apart, offset by half
const ENOUGH_PLOTS = 8;
const FEWEST_PLOTS = 3; // a home, a farm and a factory: a province with less gives up some room
const EDGE_MARGINS = [14, 10, 6]; // a picture stays on its own side of a border, as far as it can
const JITTER = 0.03; // a small steady wobble, so the plots don't read as a grid
const CAPITAL_ROOM = { halfWidth: 16, above: 30, below: 6 }; // the star, just above the province's middle
const NATION_NAME_ROOM = { maxHalfWidth: 112, halfHeight: 28 };
const CROWD_REACH = { across: 28, above: 36, below: 14 }; // the ground a crowd covers round its point
const CROWD_EDGE_MARGIN = 13;
const CROWD_GRID = 7;
const GROUNDS_APART = 60;

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

function wobble(n: number): number {
  return (Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function candidates(polygon: Point[], spacing: number, rooms: Room[], margin: number, jitter = JITTER): Point[] {
  const outline = edges(polygon);
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const found: Point[] = [];
  let row = 0;
  for (let y = minY; y <= maxY; y += spacing * ROW_SHARE, row++) {
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

// A crowd's point must leave the crowd itself clear of the room.
const widenedForCrowd = (r: Room): Room => ({ left: r.left - CROWD_REACH.across, right: r.right + CROWD_REACH.across, top: r.top - CROWD_REACH.below, bottom: r.bottom + CROWD_REACH.above });

const plotsById = new Map<string, ProvincePlots>();

export function getProvincePlots(provinceId: string): ProvincePlots | null {
  const cached = plotsById.get(provinceId);
  if (cached) return cached;
  const place = [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands].find((p) => p.id === provinceId);
  if (!place) return null;

  const polygon = parsePolygon(place.path);
  const middle: Point = [place.labelX, place.labelY];
  const capitalRoom: Room = { left: place.labelX - CAPITAL_ROOM.halfWidth, right: place.labelX + CAPITAL_ROOM.halfWidth, top: place.labelY - CAPITAL_ROOM.above, bottom: place.labelY + CAPITAL_ROOM.below };
  const nameRooms: Room[] = nationShapes([]).map((shape) => {
    const halfWidth = Math.min(shape.labelWidth * 0.5, NATION_NAME_ROOM.maxHalfWidth);
    return { left: shape.labelX - halfWidth, right: shape.labelX + halfWidth, top: shape.labelY - NATION_NAME_ROOM.halfHeight, bottom: shape.labelY + NATION_NAME_ROOM.halfHeight };
  });

  // The widest spacing that gives enough, or the most there are. Too small a
  // province gives up its distance from the border, then the nation's name.
  const rooms = [capitalRoom, ...nameRooms];
  const tries = [...EDGE_MARGINS.map((margin) => ({ rooms, margin })), ...EDGE_MARGINS.map((margin) => ({ rooms: [capitalRoom], margin }))];
  let plots: Point[] = [];
  for (const attempt of tries) {
    for (const spacing of SPACINGS) {
      const found = candidates(polygon, spacing, attempt.rooms, attempt.margin);
      if (found.length > plots.length) plots = found;
      if (plots.length >= ENOUGH_PLOTS) break;
    }
    if (plots.length >= FEWEST_PLOTS) break;
  }
  const distance = ([x, y]: Point) => Math.hypot(x - place.labelX, y - place.labelY);
  plots.sort((a, b) => distance(a) - distance(b));

  // Clear of the names first; anywhere in the province after those.
  const nearestFirst = (points: Point[]) => points.sort((a, b) => distance(a) - distance(b));
  const open = [...nearestFirst(candidates(polygon, CROWD_GRID, rooms.map(widenedForCrowd), CROWD_EDGE_MARGIN, 0)), ...nearestFirst(candidates(polygon, CROWD_GRID, [], 0, 0))];

  const result: ProvincePlots = { plots, grounds: open.length > 0 ? open : [middle] };
  plotsById.set(provinceId, result);
  return result;
}

// Where each of these buildings stands, in the order they went up, which keeps
// them where they are as more arrive: homes gather round the middle, farms and
// harbours spread to the edges, and everything else starts part way out. Null
// for any there's no plot left for.
export function placeBuildings(provinceId: string, types: ProjectType[]): Array<Point | null> {
  const plots = getProvincePlots(provinceId)?.plots ?? [];
  const near = plots.map((_, i) => i);
  const far = [...near].reverse();
  const start = Math.floor(plots.length * 0.4);
  const between = [...near.slice(start), ...near.slice(0, start)];
  const taken = new Set<number>();
  return types.map((type) => {
    const order = type === "housing" ? near : type === "farm" || type === "harbour" ? far : between;
    const index = order.find((i) => !taken.has(i));
    if (index === undefined) return null;
    taken.add(index);
    return plots[index];
  });
}

// Whether a crowd standing at this point would touch a building there.
const crowdTouches = ([x, y]: Point, [bx, by]: Point) =>
  Math.abs(bx - x) < CROWD_REACH.across + BUILDING_ROOM.width / 2 && by - y < CROWD_REACH.below + BUILDING_ROOM.height / 2 && y - by < CROWD_REACH.above + BUILDING_ROOM.height / 2;

// The nearest ground clear of everything in the way; failing that, the one
// furthest from it.
function clearestGround(grounds: Point[], touches: (ground: Point) => boolean, away: Point[]): Point {
  const clear = grounds.find((ground) => !touches(ground));
  if (clear) return clear;
  const room = (ground: Point) => Math.min(...away.map((a) => Math.hypot(a[0] - ground[0], a[1] - ground[1])), Infinity);
  return grounds.reduce((best, ground) => (room(ground) > room(best) ? ground : best), grounds[0]);
}

// Where this province's crowds stand, given the buildings on it: they keep to
// open ground, and away from each other.
export function placeCrowds(provinceId: string, standing: Point[]): CrowdGrounds | null {
  const grounds = getProvincePlots(provinceId)?.grounds;
  if (!grounds) return null;
  const camp = clearestGround(grounds, (g) => standing.some((b) => crowdTouches(g, b)), standing);
  const square = clearestGround(grounds, (g) => !apart(g, camp, GROUNDS_APART) || standing.some((b) => crowdTouches(g, b)), [...standing, camp]);
  return { camp, square };
}

export interface PlateBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PLATE_GAP = 3;

// Plates laid out from their provinces, pushed apart until none overlap: each
// pair along whichever way is the shorter move. Same input, same result.
export function separatePlates<T extends PlateBox>(plates: T[]): T[] {
  const boxes = plates.map((p) => ({ ...p }));
  for (let round = 0; round < 40; round++) {
    let moved = false;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) + PLATE_GAP;
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) + PLATE_GAP;
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        if (overlapY <= overlapX) {
          const shift = (overlapY / 2) * (a.y <= b.y ? 1 : -1);
          a.y -= shift;
          b.y += shift;
        } else {
          const shift = (overlapX / 2) * (a.x <= b.x ? 1 : -1);
          a.x -= shift;
          b.x += shift;
        }
      }
    }
    if (!moved) break;
  }
  return boxes;
}
