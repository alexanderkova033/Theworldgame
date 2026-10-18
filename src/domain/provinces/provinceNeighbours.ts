// Which provinces border which, worked out once from the map itself. The
// provinces are polygons cut from one Voronoi diagram, later split in two,
// so a border's corners don't always appear on both sides: a split adds a
// corner to one province that only lies on its neighbour's edge. So two
// provinces are neighbours when at least two corners of either one lie on
// the other's outline: two points along the same border make a shared edge
// (one alone is only a meeting at a point).
import { MAP_GEOMETRY } from "./provinceData";

type Point = [number, number];

const ON_EDGE = 0.5; // map units: how near a corner must be to count as on the line

function corners(path: string): Point[] {
  return (path.match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g) ?? []).map((pair) => pair.split(",").map(Number) as Point);
}

function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function onOutline(point: Point, outline: Point[]): boolean {
  return outline.some((a, i) => distanceToSegment(point, a, outline[(i + 1) % outline.length]) < ON_EDGE);
}

const OUTLINES = new Map(MAP_GEOMETRY.provinces.map((p) => [p.id, corners(p.path)]));

function sharesEdge(a: Point[], b: Point[]): boolean {
  const shared = new Set([...a.filter((p) => onOutline(p, b)), ...b.filter((p) => onOutline(p, a))].map(([x, y]) => `${x},${y}`));
  return shared.size >= 2;
}

const NEIGHBOURS = new Map<string, string[]>(
  MAP_GEOMETRY.provinces.map((p) => [
    p.id,
    MAP_GEOMETRY.provinces.filter((other) => other.id !== p.id && sharesEdge(OUTLINES.get(p.id)!, OUTLINES.get(other.id)!)).map((other) => other.id),
  ]),
);

export function getNeighbours(provinceId: string): string[] {
  return NEIGHBOURS.get(provinceId) ?? [];
}
