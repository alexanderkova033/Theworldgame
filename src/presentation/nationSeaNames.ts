// Trial only (option b, see titleOption.ts): where a nation's name runs out at
// sea. The continent's shore is walked in order and shared out by who holds the
// land behind it. The name then takes the flattest stretch of that nation's
// shore, on a smoothed line outside the water-lining, so nothing lies on land.
import { NATIONS } from "../domain/nations/nationData";
import { MAP_GEOMETRY } from "../domain/provinces/provinceData";
import { distanceToSegment, edges, parsePolygon, type Point, type Segment } from "./nationFrontiers";

export interface SeaName {
  nationId: string;
  path: string;
}

export const SEA_NAME_SIZE = 25;
const LETTER_WIDTH = 0.68; // of the size, spacing included: measured on the display face
const STEP = 6; // map units between points along the shore
const CLEAR_OF_SHORE = 28; // over the faintest rings of water-lining (Waterlines in MapDecor), which read through
const NAME_BLOCK_BELOW = 18; // the party line under the name
const NAME_BLOCK_ABOVE = SEA_NAME_SIZE * 0.8;
const SHORE_TOLERANCE = 3;
const TOP_OF_VIEW = 92; // a name higher than this falls off the top of the map as it opens

function resample(ring: Point[]): Point[] {
  const out: Point[] = [];
  for (const [[ax, ay], [bx, by]] of edges(ring)) {
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / STEP));
    for (let i = 0; i < steps; i++) out.push([ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps]);
  }
  return out;
}

function smooth(points: Point[], radius: number): Point[] {
  return points.map((_, i) => {
    const from = Math.max(0, i - radius);
    const to = Math.min(points.length - 1, i + radius);
    // The window narrows towards the ends, so the line keeps its length.
    const reach = Math.min(i - from, to - i);
    const part = points.slice(i - reach, i + reach + 1);
    return [part.reduce((sum, p) => sum + p[0], 0) / part.length, part.reduce((sum, p) => sum + p[1], 0) / part.length];
  });
}

function distanceToShore(point: Point, shore: Segment[]): number {
  return Math.min(...shore.map((segment) => distanceToSegment(point, segment)));
}

function ringWithOwners(lostProvinceIds: string[]): Array<{ point: Point; nationId: string | null }> {
  const holders = MAP_GEOMETRY.provinces.map((province) => ({
    nationId: lostProvinceIds.includes(province.id) ? null : (NATIONS.find((n) => n.provinceIds.includes(province.id))?.id ?? null),
    outline: edges(parsePolygon(province.path)),
  }));
  return resample(parsePolygon(MAP_GEOMETRY.coastPath)).map((point) => {
    let nearest = Infinity;
    let nationId: string | null = null;
    for (const holder of holders) {
      const distance = Math.min(...holder.outline.map((edge) => distanceToSegment(point, edge)));
      if (distance < nearest) {
        nearest = distance;
        nationId = holder.nationId;
      }
    }
    return { point, nationId: nearest <= SHORE_TOLERANCE ? nationId : null };
  });
}

// The nation's stretches of shore, each in order round the ring.
function runsOf(nationId: string, ring: Array<{ point: Point; nationId: string | null }>): number[][] {
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

function nameLine(nationId: string, name: string, ring: Point[], owners: Array<{ point: Point; nationId: string | null }>, shore: Segment[]): string | null {
  const runs = runsOf(nationId, owners);
  if (runs.length === 0) return null;
  const count = Math.ceil((name.length * SEA_NAME_SIZE * LETTER_WIDTH) / STEP) + 4;
  const at = (i: number) => ring[((i % ring.length) + ring.length) % ring.length];
  const windows: number[][] = [];
  for (const run of runs) {
    if (run.length >= count) for (let i = 0; i + count <= run.length; i += 2) windows.push(run.slice(i, i + count));
  }
  // A shore too short for the name: run on past both its ends, centred on it.
  if (windows.length === 0) {
    const longest = runs.reduce((a, b) => (b.length > a.length ? b : a));
    const first = longest[Math.floor(longest.length / 2)] - Math.floor(count / 2);
    windows.push(Array.from({ length: count }, (_, k) => ((first + k) % ring.length + ring.length) % ring.length));
  }

  const candidates = windows.map((window) => {
    // Outward from the shore: the ring runs clockwise, so that is to its left.
    const lifted = window.map((i): Point => {
      const [dx, dy] = [at(i + 6)[0] - at(i - 6)[0], at(i + 6)[1] - at(i - 6)[1]];
      const length = Math.hypot(dx, dy) || 1;
      const [ox, oy] = [dy / length, -dx / length];
      const room = CLEAR_OF_SHORE + Math.max(oy, 0) * NAME_BLOCK_ABOVE + Math.max(-oy, 0) * NAME_BLOCK_BELOW;
      return [ring[i][0] + ox * room, ring[i][1] + oy * room];
    });
    let line = smooth(lifted, Math.round(count / 4));
    if (line[line.length - 1][0] < line[0][0]) line = [...line].reverse();
    const [first, last] = [line[0], line[line.length - 1]];
    const tilt = Math.abs(Math.atan2(last[1] - first[1], last[0] - first[0]));
    const bend = Math.max(...line.map((p) => distanceToSegment(p, [first, last])));
    const nearShore = Math.min(...line.map((p) => distanceToShore(p, shore)));
    const short = Math.max(0, CLEAR_OF_SHORE - nearShore);
    const offTop = Math.max(0, TOP_OF_VIEW - Math.min(...line.map((p) => p[1])));
    return { line, score: -tilt * 120 - bend * 1.5 - short * 6 - offTop * 12 };
  });
  const { line } = candidates.reduce((a, b) => (b.score > a.score ? b : a));
  return line.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

const namesByLoss = new Map<string, SeaName[]>();

export function seaNames(lostProvinceIds: string[]): SeaName[] {
  const key = [...lostProvinceIds].sort().join(",");
  let names = namesByLoss.get(key);
  if (!names) {
    const owners = ringWithOwners(lostProvinceIds);
    const ring = owners.map((o) => o.point);
    const shore = edges(parsePolygon(MAP_GEOMETRY.coastPath));
    names = NATIONS.flatMap((nation) => {
      const path = nameLine(nation.id, nation.name, ring, owners, shore);
      return path ? [{ nationId: nation.id, path }] : [];
    });
    namesByLoss.set(key, names);
  }
  return names;
}
