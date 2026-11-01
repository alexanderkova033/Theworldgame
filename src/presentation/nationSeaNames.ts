// Where each nation's name runs: out at sea, so nothing lies on the land. The
// continent's shore is walked in order and shared out by who holds the land
// behind it, and the name takes the flattest stretch of its nation's shore, on
// a smoothed line outside the thick of the water-lining. A nation left with no
// shore takes the nearest open water to the land it still holds. Islands don't
// count as shore: they are too small to letter a name along. Each set of lost
// provinces is worked out once and kept.
import { NATIONS } from "../domain/nations/nationData";
import type { Nation } from "../domain/nations/types";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { distanceToSegment, edges, parsePolygon, type Point, type Segment } from "./nationFrontiers";

export interface SeaName {
  nationId: string;
  path: string; // the line the name's baseline follows, left to right
  points: Point[]; // the same line, as points
}

export const SEA_NAME_SIZE = 25;
export const SEA_PARTY_DROP = 15; // the party line, below the name's baseline
export const SEA_NAME_RISE = 19; // the tall letters, above the baseline

const LETTER_WIDTH = 0.68; // of the size, spacing included: measured on the display face
const STEP = 6; // map units between points along the shore
const CLEAR_OF_SHORE = 24; // over the faintest rings of water-lining (Waterlines in MapDecor), which read through
const PARTY_ROOM = 12; // more, when the party line comes between the name and the shore
const SLACK_STEPS = 4; // spare line beyond the name's ends, so no letter runs off it
const TANGENT_REACH = 6; // points either side, for the shore's direction
const SHORE_TOLERANCE = 3;
const WINDOW_STRIDE = 2;
// A name higher than this falls off the top of the map as it opens: every
// nation's opening view stops not far above the continent's north shore.
export const SEA_NAME_LOWEST_TOP = 62;
const OTHER_NAME_CLEARANCE = 50; // between one name's line and another's, room for the party lines
const ISLAND_CLEARANCE = 22;

type RingPoint = { point: Point; nationId: string | null };

function resample(ring: Point[]): Point[] {
  const out: Point[] = [];
  for (const [[ax, ay], [bx, by]] of edges(ring)) {
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / STEP));
    for (let i = 0; i < steps; i++) out.push([ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps]);
  }
  return out;
}

// A moving average whose window narrows towards the ends, so the line keeps its length.
function smooth(points: Point[], radius: number): Point[] {
  return points.map((_, i) => {
    const reach = Math.min(i, points.length - 1 - i, radius);
    const part = points.slice(i - reach, i + reach + 1);
    return [part.reduce((sum, p) => sum + p[0], 0) / part.length, part.reduce((sum, p) => sum + p[1], 0) / part.length];
  });
}

const nearestEdge = (point: Point, outline: Segment[]) => Math.min(...outline.map((segment) => distanceToSegment(point, segment)));

function ringWithOwners(lostProvinceIds: string[]): RingPoint[] {
  const holders = MAP_GEOMETRY.provinces.map((province) => ({
    nationId: lostProvinceIds.includes(province.id) ? null : (NATIONS.find((n) => n.provinceIds.includes(province.id))?.id ?? null),
    outline: edges(parsePolygon(province.path)),
  }));
  return resample(parsePolygon(MAP_GEOMETRY.coastPath)).map((point) => {
    let nearest = Infinity;
    let nationId: string | null = null;
    for (const holder of holders) {
      const distance = nearestEdge(point, holder.outline);
      if (distance < nearest) {
        nearest = distance;
        nationId = holder.nationId;
      }
    }
    return { point, nationId: nearest <= SHORE_TOLERANCE ? nationId : null };
  });
}

// The nation's stretches of shore, each in order round the ring.
function runsOf(nationId: string, ring: RingPoint[]): number[][] {
  const start = ring.findIndex((r) => r.nationId !== nationId);
  if (start < 0) return [ring.map((_, i) => i)];
  const runs: number[][] = [];
  let run: number[] = [];
  for (let k = 0; k < ring.length; k++) {
    const i = (start + k) % ring.length;
    if (ring[i].nationId === nationId) run.push(i);
    else if (run.length > 0) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 0) runs.push(run);
  return runs;
}

// Stretches of the ring as long as the name, each as its points' indexes.
function windowsAlong(run: number[], count: number, size: number): number[][] {
  const windows: number[][] = [];
  if (run.length >= count) {
    for (let i = 0; i + count <= run.length; i += WINDOW_STRIDE) windows.push(run.slice(i, i + count));
    return windows;
  }
  // A shore too short for the name: run on past its ends, over its middle.
  const middle = run[Math.floor(run.length / 2)];
  for (let shift = 0; shift < count; shift += WINDOW_STRIDE) {
    windows.push(Array.from({ length: count }, (_, k) => (middle - shift + k + size) % size));
  }
  return windows;
}

function nameLine(nation: Nation, lostProvinceIds: string[], owners: RingPoint[], shore: Segment[], islands: Segment[], taken: Point[][]): SeaName | null {
  const held = MAP_GEOMETRY.provinces.filter((p) => nation.provinceIds.includes(p.id) && !lostProvinceIds.includes(p.id));
  if (held.length === 0) return null; // no country left to name
  const ring = owners.map((o) => o.point);
  const count = Math.ceil((nation.name.length * SEA_NAME_SIZE * LETTER_WIDTH) / STEP) + SLACK_STEPS;
  const at = (i: number) => ring[(i + ring.length) % ring.length];
  const runs = runsOf(nation.id, owners);
  const landlocked = runs.length === 0;
  const windows = landlocked ? windowsAlong(ring.map((_, i) => i), count, ring.length) : runs.flatMap((run) => windowsAlong(run, count, ring.length));
  const landX = held.reduce((sum, p) => sum + p.labelX, 0) / held.length;
  const landY = held.reduce((sum, p) => sum + p.labelY, 0) / held.length;

  let best: { line: Point[]; score: number } | null = null;
  for (const window of windows) {
    // Outward from the shore: the ring runs clockwise, so that is to its left.
    const lifted = window.map((i): Point => {
      const [dx, dy] = [at(i + TANGENT_REACH)[0] - at(i - TANGENT_REACH)[0], at(i + TANGENT_REACH)[1] - at(i - TANGENT_REACH)[1]];
      const length = Math.hypot(dx, dy) || 1;
      const [ox, oy] = [dy / length, -dx / length];
      const room = CLEAR_OF_SHORE + Math.max(oy, 0) * SEA_NAME_RISE + Math.max(-oy, 0) * PARTY_ROOM;
      return [ring[i][0] + ox * room, ring[i][1] + oy * room];
    });
    let line = smooth(lifted, Math.round(count / 4));
    if (line[line.length - 1][0] < line[0][0]) line = [...line].reverse();
    const [first, last] = [line[0], line[line.length - 1]];
    const tilt = Math.abs(Math.atan2(last[1] - first[1], last[0] - first[0]));
    const bend = Math.max(...line.map((p) => distanceToSegment(p, [first, last])));
    const short = Math.max(0, CLEAR_OF_SHORE - Math.min(...line.map((p) => nearestEdge(p, shore))));
    const offTop = Math.max(0, SEA_NAME_LOWEST_TOP + SEA_NAME_RISE - Math.min(...line.map((p) => p[1])));
    const onIsland = line.some((p) => nearestEdge(p, islands) < ISLAND_CLEARANCE);
    const onName = line.some((p) => taken.some((other) => other.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < OTHER_NAME_CLEARANCE)));
    const [mx, my] = line[Math.floor(line.length / 2)];
    const far = landlocked ? Math.hypot(mx - landX, my - landY) : 0;
    const score = -tilt * 120 - bend * 1.5 - short * 6 - offTop * 40 - (onIsland ? 3000 : 0) - (onName ? 3000 : 0) - far * 3;
    if (!best || score > best.score) best = { line, score };
  }
  if (!best) return null;
  return {
    nationId: nation.id,
    path: best.line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" "),
    points: best.line,
  };
}

const namesByLoss = new Map<string, SeaName[]>();

// Every nation's name as things stand, given the provinces that broke away.
export function seaNames(lostProvinceIds: string[]): SeaName[] {
  const key = [...lostProvinceIds].sort().join(",");
  let names = namesByLoss.get(key);
  if (!names) {
    const owners = ringWithOwners(lostProvinceIds);
    const shore = edges(parsePolygon(MAP_GEOMETRY.coastPath));
    const islands = MAP_GEOMETRY.islands.flatMap((island) => edges(parsePolygon(island.path)));
    // Those with a shore choose first: one without can go anywhere.
    const order = [...NATIONS].sort((a, b) => Number(!owners.some((o) => o.nationId === a.id)) - Number(!owners.some((o) => o.nationId === b.id)));
    const placed: SeaName[] = [];
    for (const nation of order) {
      const name = nameLine(nation, lostProvinceIds, owners, shore, islands, placed.map((p) => p.points));
      if (name) placed.push(name);
    }
    names = placed;
    namesByLoss.set(key, names);
  }
  return names;
}
