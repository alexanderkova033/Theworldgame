// The way a ship takes between a coast and an island, for drawing a march
// at sea: out from the shore, round any land in the way, and in to the far
// shore, instead of a straight line over the continent. Drawing only: the
// days at sea are the rules' (domain/military), whatever way is drawn.
//
// The sea is crossed through waypoints set a little off every coast: one
// off each corner of the continent's coastline, and one off each corner of
// every island's convex hull (a way round the hull can never clip the
// island). The shortest way between waypoints that can see each other,
// never crossing land, is the way. Each pair of places is worked out once
// and kept.
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";

export type Point = { x: number; y: number };

const SEA_MARGIN = 20; // how far off a coast a ship keeps, in map units
const ON_COAST = 1.5; // how near the coastline an edge of a province must lie to be shore

function parsePolygon(path: string): Point[] {
  return [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const len = (p: Point) => Math.hypot(p.x, p.y);
const unit = (p: Point): Point => {
  const l = len(p) || 1;
  return { x: p.x / l, y: p.y / l };
};
const dist = (a: Point, b: Point) => len(sub(a, b));

function nearestOnSegment(p: Point, a: Point, b: Point): Point {
  const d = sub(b, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * d.x + (p.y - a.y) * d.y) / (d.x * d.x + d.y * d.y || 1)));
  return { x: a.x + d.x * t, y: a.y + d.y * t };
}

function insidePolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

// Whether two segments cross (touching at an end doesn't count).
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (list: Point[]) => {
    const hull: Point[] = [];
    for (const p of list) {
      while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

const continent = parsePolygon(MAP_GEOMETRY.coastPath);
const islands = MAP_GEOMETRY.islands.map((island) => ({ id: island.id, outline: parsePolygon(island.path) }));
const land = [continent, ...islands.map((i) => i.outline)];
const landEdges = land.flatMap((poly) => poly.map((a, i): [Point, Point] => [a, poly[(i + 1) % poly.length]]));

const onLand = (p: Point) => land.some((poly) => insidePolygon(p, poly));
const nearLand = (p: Point, within: number) => landEdges.some(([a, b]) => dist(p, nearestOnSegment(p, a, b)) < within);

// The way out to sea from an edge of a polygon: its normal, on the side away from the polygon.
function outward(a: Point, b: Point, poly: Point[]): Point {
  const d = unit(sub(b, a));
  const normal = { x: d.y, y: -d.x };
  const mid = { x: (a.x + b.x) / 2 + normal.x, y: (a.y + b.y) / 2 + normal.y };
  return insidePolygon(mid, poly) ? { x: -normal.x, y: -normal.y } : normal;
}

// A waypoint off each corner of a polygon, the margin out along the bisector.
function cornerWaypoints(poly: Point[]): Point[] {
  return poly.flatMap((v, i) => {
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const next = poly[(i + 1) % poly.length];
    const n1 = outward(prev, v, poly);
    const n2 = outward(v, next, poly);
    const dir = unit({ x: n1.x + n2.x, y: n1.y + n2.y });
    const reach = SEA_MARGIN / Math.max(0.35, dir.x * n1.x + dir.y * n1.y);
    const p = { x: v.x + dir.x * reach, y: v.y + dir.y * reach };
    return onLand(p) || nearLand(p, SEA_MARGIN * 0.5) ? [] : [p];
  });
}

const waypoints: Point[] = [...cornerWaypoints(continent), ...islands.flatMap((i) => cornerWaypoints(convexHull(i.outline)))];

function clear(a: Point, b: Point): boolean {
  if (landEdges.some(([c, d]) => crosses(a, b, c, d))) return false;
  return !onLand({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
}

const seeing = new Map<string, boolean>();
function waypointsSee(i: number, j: number): boolean {
  const key = i < j ? `${i}|${j}` : `${j}|${i}`;
  let seen = seeing.get(key);
  if (seen === undefined) {
    seen = clear(waypoints[i], waypoints[j]);
    seeing.set(key, seen);
  }
  return seen;
}

// Where a place meets the sea, nearest the place across the water: a point
// just off its shore. For a province, only the edges along the coastline
// are shore.
function offShore(placeId: string, toward: Point): Point | null {
  const island = islands.find((i) => i.id === placeId);
  const province = MAP_GEOMETRY.provinces.find((p) => p.id === placeId);
  const poly = island ? island.outline : province ? parsePolygon(province.path) : null;
  if (!poly) return null;
  const owner = island ? island.outline : continent;
  let best: { at: Point; normal: Point; d: number } | null = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if (!island) {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const shore = continent.some((c, k) => dist(mid, nearestOnSegment(mid, c, continent[(k + 1) % continent.length])) < ON_COAST);
      if (!shore) continue;
    }
    const at = nearestOnSegment(toward, a, b);
    const d = dist(at, toward);
    if (!best || d < best.d) best = { at, normal: outward(a, b, owner), d };
  }
  if (!best) return null;
  const { at, normal } = best;
  for (const reach of [SEA_MARGIN, SEA_MARGIN * 0.6, SEA_MARGIN * 1.6]) {
    const p = { x: at.x + normal.x * reach, y: at.y + normal.y * reach };
    if (!onLand(p)) return p;
  }
  return null;
}

function labelOf(placeId: string): Point | null {
  const place = MAP_GEOMETRY.provinces.find((p) => p.id === placeId) ?? MAP_GEOMETRY.islands.find((i) => i.id === placeId);
  return place ? { x: place.labelX, y: place.labelY } : null;
}

export const isIsland = (placeId: string) => islands.some((i) => i.id === placeId);

const routes = new Map<string, Point[] | null>();

// The way across the sea from one place to another, from just off the
// first's shore to just off the second's, or null when the step between
// them is over land (neither is an island) or can't be worked out.
export function seaWay(fromId: string, toId: string): Point[] | null {
  if (!isIsland(fromId) && !isIsland(toId)) return null;
  const key = `${fromId}>${toId}`;
  if (routes.has(key)) return routes.get(key)!;
  const way = findWay(fromId, toId);
  routes.set(key, way);
  return way;
}

function findWay(fromId: string, toId: string): Point[] | null {
  const fromLabel = labelOf(fromId);
  const toLabel = labelOf(toId);
  if (!fromLabel || !toLabel) return null;
  const start = offShore(fromId, toLabel);
  const end = offShore(toId, fromLabel);
  if (!start || !end) return null;
  if (clear(start, end)) return [start, end];

  // Shortest way through the waypoints (Dijkstra; a hundred or so nodes).
  const n = waypoints.length;
  const START = n;
  const END = n + 1;
  const pointOf = (i: number) => (i === START ? start : i === END ? end : waypoints[i]);
  const sees = (i: number, j: number) => (i < n && j < n ? waypointsSee(i, j) : clear(pointOf(i), pointOf(j)));
  const best = new Array<number>(n + 2).fill(Infinity);
  const via = new Array<number>(n + 2).fill(-1);
  const done = new Array<boolean>(n + 2).fill(false);
  best[START] = 0;
  for (;;) {
    let i = -1;
    for (let k = 0; k < n + 2; k++) if (!done[k] && best[k] < Infinity && (i === -1 || best[k] < best[i])) i = k;
    if (i === -1) return null;
    if (i === END) break;
    done[i] = true;
    for (let j = 0; j < n + 2; j++) {
      if (done[j] || j === START) continue;
      const d = best[i] + dist(pointOf(i), pointOf(j));
      if (d < best[j] && sees(i, j)) {
        best[j] = d;
        via[j] = i;
      }
    }
  }
  const way: Point[] = [];
  for (let i = END; i !== -1; i = via[i]) way.unshift(pointOf(i));
  return way;
}
