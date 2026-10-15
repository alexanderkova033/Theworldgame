// Each nation's outer frontier as plain line segments, worked out once from
// the static map geometry. An edge of a nation's province is "frontier"
// unless another province of the same nation lies along it — sampled at a
// few points with a small tolerance, so T-junctions and nearly-coincident
// borders still count as internal.
//
// The map used to find these with SVG erode filters at draw time, which the
// browser re-ran on every frame of every pan and zoom. As geometry, the
// frontier is just a stroked path — about as cheap as drawing gets.
import { NATIONS } from "../domain/nations/nationData";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";

type Point = [number, number];
type Segment = [Point, Point];

const TOLERANCE = 1; // map units

function parsePolygon(path: string): Point[] {
  return [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

function edges(points: Point[]): Segment[] {
  return points
    .map((a, i): Segment => [a, points[(i + 1) % points.length]])
    .filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
}

function distanceToSegment([px, py]: Point, [[ax, ay], [bx, by]]: Segment): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function lerp([ax, ay]: Point, [bx, by]: Point, t: number): Point {
  return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

export interface NationShape {
  nationId: string;
  name: string;
  color: string;
  outline: string; // every province of the nation as one multi-subpath path (for clipping)
  frontier: string; // just the outer frontier, as move/line segments
  labelX: number; // the middle of the name block (name + ruling party)
  labelY: number;
  labelWidth: number; // how much land lies across that point, for fitting the name
}

// Signed area and centroid of one polygon (shoelace).
function polygonCentroid(points: Point[]): { area: number; x: number; y: number } {
  let area = 0;
  let x = 0;
  let y = 0;
  points.forEach(([ax, ay], i) => {
    const [bx, by] = points[(i + 1) % points.length];
    const cross = ax * by - bx * ay;
    area += cross;
    x += (ax + bx) * cross;
    y += (ay + by) * cross;
  });
  area /= 2;
  return area === 0 ? { area: 0, x: points[0][0], y: points[0][1] } : { area, x: x / (6 * area), y: y / (6 * area) };
}

// Where a horizontal line at y crosses the frontier, as inside-intervals.
function scanline(frontier: Segment[], y: number): Array<[number, number]> {
  const xs = frontier
    .filter(([[, ay], [, by]]) => (ay <= y && y < by) || (by <= y && y < ay))
    .map(([[ax, ay], [bx, by]]) => ax + ((y - ay) / (by - ay)) * (bx - ax))
    .sort((a, b) => a - b);
  const spans: Array<[number, number]> = [];
  for (let i = 0; i + 1 < xs.length; i += 2) spans.push([xs[i], xs[i + 1]]);
  return spans;
}

// Half the height of the name block: the name and the party line under it.
const LABEL_HALF_HEIGHT = 22;
// The name alone, for the overlap test (the party line is small and light).
const NAME_HALF_HEIGHT = 14;
const NAME_MAX_WIDTH = 220;

// A province's own marks on the map, as boxes: its name, and the slip of
// icons pinned under it (see the province info bar in MapPanel.tsx).
export interface MapMark {
  x: number;
  y: number;
  halfWidth: number;
  halfHeight: number;
}

// The name goes on the widest run of land near the nation's centre of
// mass, checked at the top, middle and bottom of the name block so it
// sits inside the frontier rather than across a bay or a neighbour. The
// province marks are kept clear too: a name drawn across them is hard to
// read, and they'd hide part of it.
function labelPlacement(polygons: Point[][], frontier: Segment[], marks: MapMark[]): { x: number; y: number; width: number } {
  const parts = polygons.map(polygonCentroid);
  const area = parts.reduce((sum, p) => sum + Math.abs(p.area), 0) || 1;
  const cx = parts.reduce((sum, p) => sum + p.x * Math.abs(p.area), 0) / area;
  const cy = parts.reduce((sum, p) => sum + p.y * Math.abs(p.area), 0) / area;

  let best = { x: cx, y: cy, width: 0, score: -Infinity };
  for (let y = cy - 80; y <= cy + 80; y += 4) {
    for (const [left, right] of scanline(frontier, y)) {
      let lo = left;
      let hi = right;
      for (const dy of [-LABEL_HALF_HEIGHT, LABEL_HALF_HEIGHT]) {
        const overlap = scanline(frontier, y + dy)
          .map(([a, b]): [number, number] => [Math.max(a, lo), Math.min(b, hi)])
          .filter(([a, b]) => b > a)
          .sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
        [lo, hi] = overlap ?? [0, 0];
      }
      const width = hi - lo;
      const mid = (lo + hi) / 2;
      const half = Math.min(width * 0.86, NAME_MAX_WIDTH) / 2;
      const covered = marks.filter((m) => Math.abs(m.x - mid) < half + m.halfWidth && Math.abs(m.y - y) < NAME_HALF_HEIGHT + m.halfHeight).length;
      // Room for the name matters most, then keeping off the province
      // marks; being near the centre breaks ties.
      const score = Math.min(width, NAME_MAX_WIDTH) - covered * 80 - Math.abs(y - cy) * 1.2 - Math.abs(mid - cx) * 0.5;
      if (width > 0 && score > best.score) best = { x: mid, y, width, score };
    }
  }
  return best.width > 0 ? best : { x: cx, y: cy, width: 200 };
}

export const NATION_SHAPES: NationShape[] = NATIONS.map((nation) => {
  const owned = MAP_GEOMETRY.provinces.filter((p) => nation.provinceIds.includes(p.id));
  const polygons = owned.map((p) => ({ id: p.id, segments: edges(parsePolygon(p.path)) }));

  const frontier: Segment[] = [];
  for (const polygon of polygons) {
    const mates = polygons.filter((q) => q.id !== polygon.id);
    for (const segment of polygon.segments) {
      const samples = [0.25, 0.5, 0.75].map((t) => lerp(segment[0], segment[1], t));
      const internal = samples.every((s) => mates.some((q) => q.segments.some((other) => distanceToSegment(s, other) <= TOLERANCE)));
      if (!internal) frontier.push(segment);
    }
  }

  const label = labelPlacement(
    owned.map((p) => parsePolygon(p.path)),
    frontier,
    owned.flatMap((p): MapMark[] => [
      { x: p.labelX, y: p.labelY - 5, halfWidth: 40, halfHeight: 8 },
      { x: p.labelX, y: p.labelY + 21, halfWidth: 22, halfHeight: 11 },
    ]),
  );

  return {
    nationId: nation.id,
    name: nation.name,
    color: nation.color,
    outline: owned.map((p) => p.path).join(" "),
    frontier: frontier.map(([a, b]) => `M${a[0]},${a[1]} L${b[0]},${b[1]}`).join(" "),
    labelX: label.x,
    labelY: label.y,
    labelWidth: label.width,
  };
});
