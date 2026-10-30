// Regiments on the map (see domain/military): a counter for each country's
// regiments in a province, in its colour, with how many stand there. Yours
// can be picked up and sent somewhere: tap the counter, then a province of
// yours. A march under way is drawn as a dashed line along the way still to
// go, and its counter moves along it day by day. Over land the way runs
// straight from one place to the next; at sea it goes round the coasts
// (presentation/seaRoutes.ts). While a counter is picked
// up, pointing at a province shows the way there, and how many days it takes.
import "./MapArmies.css";
import { memo, type ReactNode } from "react";
import type { Regiment } from "../../domain/military/types";
import type { FreeProvince } from "../../domain/military/battleRules";
import { getSiegeDays } from "../../domain/military/battleRules";
import { getIslandPeople } from "../../domain/neighbours/treatyRules";
import { getNation } from "../../domain/nations/nationRules";
import { getPlace, getProvinceName } from "../../domain/provinces/provinceRules";
import { StatIcon } from "./StatIcon";
import { seaWay } from "../seaRoutes";

type Point = { x: number; y: number };

const COUNTER_RISE = 38; // map units above a province's name
const COUNTER_SPACING = 50; // between two countries' counters in one province

function placePoint(provinceId: string): Point {
  const place = getPlace(provinceId);
  return { x: place?.labelX ?? 0, y: (place?.labelY ?? 0) - COUNTER_RISE };
}

// The drawn way of one step of a march, from one place to the next.
function stepPoints(fromId: string, toId: string): Point[] {
  return [placePoint(fromId), ...(seaWay(fromId, toId) ?? []), placePoint(toId)];
}

// The point a share t (0 to 1) of the way along, and the way still to go from it.
function splitAt(points: Point[], t: number): { at: Point; rest: Point[] } {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let left = Math.max(0, Math.min(1, t)) * lengths.reduce((sum, l) => sum + l, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] > 0 ? Math.min(1, left / lengths[i]) : 1;
      const [a, b] = [points[i], points[i + 1]];
      const at = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
      return { at, rest: [at, ...points.slice(i + 1)] };
    }
    left -= lengths[i];
  }
  return { at: points[0], rest: points };
}

// The whole way of a march still to go: from where it is on the step under
// way (a share t along it) to the end of its route.
function marchPoints(fromId: string, route: string[], t: number): Point[] {
  if (route.length === 0) return [placePoint(fromId)];
  const points = splitAt(stepPoints(fromId, route[0]), t).rest;
  for (let i = 1; i < route.length; i++) points.push(...stepPoints(route[i - 1], route[i]).slice(1));
  return points;
}

const shareDone = (march: NonNullable<Regiment["march"]>) => 1 - march.daysLeft / march.legDays;

interface Stack {
  key: string;
  nationId: string;
  provinceId: string; // where it stands, or last left
  at: Point;
  count: number;
  drilling: number; // of them, still at drill
  marching: Regiment["march"];
  strength: number; // their average, 0-100
}

// One counter per country per province, and one per march under way.
function stacksOf(regiments: Regiment[], free: ReadonlySet<string>): Stack[] {
  const stacks = new Map<string, Stack>();
  for (const r of regiments) {
    const key = r.march ? `${r.nationId}|${r.provinceId}|${r.march.route.join(">")}|${r.march.daysLeft}` : `${r.nationId}|${r.provinceId}`;
    const stack = stacks.get(key);
    if (stack) {
      stack.strength = (stack.strength * stack.count + r.strength) / (stack.count + 1);
      stack.count += 1;
      stack.drilling += r.trainingDays > 0 ? 1 : 0;
      continue;
    }
    const at = r.march ? splitAt(stepPoints(r.provinceId, r.march.route[0]), shareDone(r.march)).at : placePoint(r.provinceId);
    stacks.set(key, { key, nationId: r.nationId, provinceId: r.provinceId, at, count: 1, drilling: r.trainingDays > 0 ? 1 : 0, marching: r.march, strength: r.strength });
  }
  // Two countries' counters in one province stand side by side, and beside
  // the rebels, where there are any.
  const standing = [...stacks.values()].filter((s) => !s.marching);
  for (const provinceId of new Set(standing.map((s) => s.provinceId))) {
    const here = standing.filter((s) => s.provinceId === provinceId);
    // The rebels, if any, take the first place in the row (see RebelCounter).
    const first = free.has(provinceId) ? 1 : 0;
    const slots = here.length + first;
    here.forEach((s, i) => (s.at = { ...s.at, x: s.at.x + (first + i - (slots - 1) / 2) * COUNTER_SPACING }));
  }
  return [...stacks.values()];
}

function pathThrough(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// The counter: a field in the country's colour, the old infantry mark (a
// crossed box) and the number of regiments.
function Counter({ stack, isYours, isPicked, onPick }: { stack: Stack; isYours: boolean; isPicked: boolean; onPick?: () => void }) {
  const nation = getNation(stack.nationId);
  const ready = stack.count - stack.drilling;
  const where = getProvinceName(stack.marching ? stack.marching.route[stack.marching.route.length - 1] : stack.provinceId);
  const who = `${isYours ? "Your" : `${nation.name}'s`} ${stack.count === 1 ? "regiment" : `${stack.count} regiments`}`;
  const what = [
    stack.marching ? `marching to ${where}` : `in ${where}`,
    stack.drilling > 0 ? `${stack.drilling} still at drill` : "",
    stack.strength < 100 ? `strength ${Math.round(stack.strength)} of 100` : "",
  ].filter(Boolean);
  const hint = isYours && onPick ? (isPicked ? " Tap a province to march there, or tap here to put them down." : " Tap to pick up and march.") : "";
  const title = `${who} ${what.join(", ")}.${hint}`;
  return (
    <g
      className={`map-armies__counter ${isYours ? "is-yours" : ""} ${isPicked ? "is-picked" : ""} ${ready === 0 ? "is-drilling" : ""} ${onPick ? "is-pickable" : ""}`}
      transform={`translate(${stack.at.x.toFixed(1)} ${stack.at.y.toFixed(1)})`}
      onClick={
        onPick
          ? (e) => {
              e.stopPropagation();
              onPick();
            }
          : undefined
      }
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      aria-label={onPick ? title : undefined}
      data-tip={title}
      aria-pressed={onPick ? isPicked : undefined}
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
    >
      <rect x={-20} y={-11} width={40} height={22} rx={3} className="map-armies__field" style={{ fill: nation.color }} />
      <rect x={-16} y={-7} width={16} height={14} className="map-armies__mark" />
      <path d="M-16,-7 L0,7 M0,-7 L-16,7" className="map-armies__cross" style={{ stroke: nation.color }} />
      <text x={10} y={5} className="map-armies__count">
        {stack.count}
      </text>
      {stack.strength < 100 && <StrengthBar strength={stack.strength} />}
    </g>
  );
}

// How strong a worn force still is, under its counter.
function StrengthBar({ strength }: { strength: number }) {
  return (
    <g className="map-armies__strength" aria-hidden="true">
      <rect x={-20} y={13} width={40} height={5} rx={1.5} className="map-armies__strength-back" />
      <rect x={-20} y={13} width={(40 * Math.max(0, strength)) / 100} height={5} rx={1.5} className="map-armies__strength-fill" />
    </g>
  );
}

// The rebels holding a province that broke away: their banner, and how
// strong they are.
function RebelCounter({ provinceId, free, beside }: { provinceId: string; free: FreeProvince; beside: number }) {
  const point = placePoint(provinceId);
  const at = { ...point, x: point.x - (beside * COUNTER_SPACING) / 2 };
  const strength = Math.round(free.strength);
  return (
    <g className="map-armies__counter is-rebels" transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`} data-tip={`Rebels hold ${getProvinceName(provinceId)}: strength ${strength} of 100. March regiments here to take it back.`}>
      <rect x={-20} y={-11} width={40} height={22} rx={3} className="map-armies__field map-armies__field--rebels" />
      <path d="M-14,-7 L-14,7 M-13.4,-7 L-3,-7 L-5.5,-3.5 L-3,0 L-13.4,0 Z" className="map-armies__banner" />
      <text x={8} y={4.5} className="map-armies__count map-armies__count--rebels">
        {strength}
      </text>
      <StrengthBar strength={free.strength} />
    </g>
  );
}

// While regiments are picked up: what the next tap does, and a way out.
export function MarchBanner({ count, from, onCancel }: { count: number; from: string; onCancel: () => void }) {
  return (
    <div className="march-banner" role="status">
      <StatIcon type="regiment" size={20} />
      <span>
        {count === 1 ? "A regiment" : `${count} regiments`} in {getProvinceName(from)}: tap a province of yours to march there.
      </span>
      <button type="button" className="march-banner__cancel" onClick={onCancel}>
        Stay
      </button>
    </div>
  );
}

interface ArmyLayerProps {
  regiments: Regiment[];
  playerNationId: string;
  marchFrom: string | null; // the province your picked-up regiments stand in
  onPick: (provinceId: string) => void;
  preview: MarchPreview | null; // the way to the province pointed at, while picked up
  freeProvinces: Record<string, FreeProvince>; // provinces that broke away, held by rebels
  sieges: Record<string, number>; // islands your regiments besiege: days so far
}

export interface MarchPreview {
  route: string[];
  days: number;
  fight: { days: number; won: boolean } | null; // at a province held by rebels: how the fight would go
}

export const ArmyLayer = memo(function ArmyLayer({ regiments, playerNationId, marchFrom, onPick, preview, freeProvinces, sieges }: ArmyLayerProps) {
  const stacks = stacksOf(regiments, new Set(Object.keys(freeProvinces)));
  const lines: ReactNode[] = [];
  for (const stack of stacks) {
    if (!stack.marching || stack.nationId !== playerNationId) continue;
    const points = marchPoints(stack.provinceId, stack.marching.route, shareDone(stack.marching));
    const end = points[points.length - 1];
    lines.push(
      <g key={`${stack.key}-way`}>
        <path d={pathThrough(points)} className="map-armies__way" />
        <circle cx={end.x} cy={end.y} r={5} className="map-armies__way-end" />
      </g>,
    );
  }
  let previewLine: ReactNode = null;
  if (marchFrom && preview) {
    const points = marchPoints(marchFrom, preview.route, 0);
    const end = points[points.length - 1];
    const text = preview.fight
      ? preview.fight.won
        ? `${preview.days} d, then ${preview.fight.days} d to take it`
        : `${preview.days} d: too few to win`
      : `${preview.days} d`;
    const width = text.length * 7 + 14;
    previewLine = (
      <g className={`map-armies__preview ${preview.fight && !preview.fight.won ? "is-losing" : ""}`}>
        <path d={pathThrough(points)} className="map-armies__way is-preview" />
        <rect x={end.x - width / 2} y={end.y - 30} width={width} height={20} rx={4} className="map-armies__days-plate" />
        <text x={end.x} y={end.y - 16} className="map-armies__days">
          {text}
        </text>
      </g>
    );
  }
  return (
    <g className="map-armies">
      <g pointerEvents="none">
        {lines}
        {previewLine}
      </g>
      {Object.entries(sieges).map(([id, days]) => {
        const at = placePoint(id);
        return (
          <g key={`siege-${id}`} className="map-armies__siege" pointerEvents="none">
            <rect x={at.x - 44} y={at.y + 22} width={88} height={18} rx={4} className="map-armies__days-plate" />
            <text x={at.x} y={at.y + 35} className="map-armies__days">
              Siege {days} of {getSiegeDays(getIslandPeople(id))} days
            </text>
          </g>
        );
      })}
      {Object.entries(freeProvinces).map(([id, free]) => (
        <RebelCounter key={`rebels-${id}`} provinceId={id} free={free} beside={stacks.filter((s) => !s.marching && s.provinceId === id).length} />
      ))}
      {stacks.map((stack) => {
        const isYours = stack.nationId === playerNationId;
        const pickable = isYours && !stack.marching && stack.count > stack.drilling;
        return (
          <Counter
            key={stack.key}
            stack={stack}
            isYours={isYours}
            isPicked={isYours && !stack.marching && stack.provinceId === marchFrom}
            onPick={pickable ? () => onPick(stack.provinceId) : undefined}
          />
        );
      })}
    </g>
  );
});
