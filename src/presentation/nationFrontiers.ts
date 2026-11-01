// Each nation's outer frontier as plain line segments, worked out from the
// map geometry and the provinces each nation holds. An edge of a nation's
// province is "frontier" unless another province of the same nation lies
// along it — sampled at a few points with a small tolerance, so
// T-junctions and nearly-coincident borders still count as internal.
//
// A province that broke away (lostProvinceIds) is no longer the nation's,
// so the frontier runs round it. Each set of lost provinces is worked out once and kept.
//
// The map used to find these with SVG erode filters at draw time, which the
// browser re-ran on every frame of every pan and zoom. As geometry, the
// frontier is just a stroked path — about as cheap as drawing gets.
import { NATIONS } from "../domain/nations/nationData";
import type { Nation } from "../domain/nations/types";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";

export type Point = [number, number];
export type Segment = [Point, Point];

const TOLERANCE = 1; // map units

export function parsePolygon(path: string): Point[] {
  return [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

export function edges(points: Point[]): Segment[] {
  return points
    .map((a, i): Segment => [a, points[(i + 1) % points.length]])
    .filter(([a, b]) => a[0] !== b[0] || a[1] !== b[1]);
}

export function distanceToSegment([px, py]: Point, [[ax, ay], [bx, by]]: Segment): number {
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
}

function nationShape(nation: Nation, lostProvinceIds: string[]): NationShape | null {
  const owned = MAP_GEOMETRY.provinces.filter((p) => nation.provinceIds.includes(p.id) && !lostProvinceIds.includes(p.id));
  if (owned.length === 0) return null;
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

  return {
    nationId: nation.id,
    name: nation.name,
    color: nation.color,
    outline: owned.map((p) => p.path).join(" "),
    frontier: frontier.map(([a, b]) => `M${a[0]},${a[1]} L${b[0]},${b[1]}`).join(" "),
  };
}

const shapesByLoss = new Map<string, NationShape[]>();

// Every nation as it stands, given the provinces that broke away.
export function nationShapes(lostProvinceIds: string[]): NationShape[] {
  const key = [...lostProvinceIds].sort().join(",");
  let shapes = shapesByLoss.get(key);
  if (!shapes) {
    shapes = NATIONS.map((nation) => nationShape(nation, lostProvinceIds)).filter((s): s is NationShape => s !== null);
    shapesByLoss.set(key, shapes);
  }
  return shapes;
}
