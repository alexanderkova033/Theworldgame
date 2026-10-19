// Regiments on the map (see domain/military): a counter for each country's
// regiments in a province, in its colour, with how many stand there. Yours
// can be picked up and sent somewhere: tap the counter, then a province of
// yours. A march under way is drawn as a dashed line along the way still to
// go, and its counter moves along it day by day. While a counter is picked
// up, pointing at a province shows the way there, and how many days it takes.
import "./MapArmies.css";
import { memo, type ReactNode } from "react";
import type { Regiment } from "../../domain/military/types";
import { getNation } from "../../domain/nations/nationRules";
import { getPlace, getProvinceName } from "../../domain/provinces/provinceRules";
import { StatIcon } from "./StatIcon";

type Point = { x: number; y: number };

const COUNTER_RISE = 38; // map units above a province's name
const COUNTER_SPACING = 46; // between two countries' counters in one province

function placePoint(provinceId: string): Point {
  const place = getPlace(provinceId);
  return { x: place?.labelX ?? 0, y: (place?.labelY ?? 0) - COUNTER_RISE };
}

interface Stack {
  key: string;
  nationId: string;
  provinceId: string; // where it stands, or last left
  at: Point;
  count: number;
  drilling: number; // of them, still at drill
  marching: Regiment["march"];
}

// One counter per country per province, and one per march under way.
function stacksOf(regiments: Regiment[]): Stack[] {
  const stacks = new Map<string, Stack>();
  for (const r of regiments) {
    const key = r.march ? `${r.nationId}|${r.provinceId}|${r.march.route.join(">")}|${r.march.daysLeft}` : `${r.nationId}|${r.provinceId}`;
    const stack = stacks.get(key);
    if (stack) {
      stack.count += 1;
      stack.drilling += r.trainingDays > 0 ? 1 : 0;
      continue;
    }
    let at = placePoint(r.provinceId);
    if (r.march) {
      const next = placePoint(r.march.route[0]);
      const t = 1 - r.march.daysLeft / r.march.legDays;
      at = { x: at.x + (next.x - at.x) * t, y: at.y + (next.y - at.y) * t };
    }
    stacks.set(key, { key, nationId: r.nationId, provinceId: r.provinceId, at, count: 1, drilling: r.trainingDays > 0 ? 1 : 0, marching: r.march });
  }
  // Two countries' counters in one province stand side by side.
  const standing = [...stacks.values()].filter((s) => !s.marching);
  for (const provinceId of new Set(standing.map((s) => s.provinceId))) {
    const here = standing.filter((s) => s.provinceId === provinceId);
    here.forEach((s, i) => (s.at = { ...s.at, x: s.at.x + (i - (here.length - 1) / 2) * COUNTER_SPACING }));
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
  const title = [
    `${isYours ? "Your" : `${nation.name}'s`} ${stack.count === 1 ? "regiment" : `${stack.count} regiments`}`,
    stack.marching ? `marching to ${where}` : `in ${where}`,
    stack.drilling > 0 ? `${stack.drilling} still at drill` : "",
    isYours && onPick ? (isPicked ? "Tap a province of yours to march there, or tap here to put them down" : "Tap to pick up and march") : "",
  ]
    .filter(Boolean)
    .join(". ");
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
      <title>{title}</title>
      <rect x={-20} y={-11} width={40} height={22} rx={3} className="map-armies__field" style={{ fill: nation.color }} />
      <rect x={-16} y={-7} width={16} height={14} className="map-armies__mark" />
      <path d="M-16,-7 L0,7 M0,-7 L-16,7" className="map-armies__cross" style={{ stroke: nation.color }} />
      <text x={10} y={5} className="map-armies__count">
        {stack.count}
      </text>
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
  preview: { route: string[]; days: number } | null; // the way to the province pointed at, while picked up
}

export const ArmyLayer = memo(function ArmyLayer({ regiments, playerNationId, marchFrom, onPick, preview }: ArmyLayerProps) {
  const stacks = stacksOf(regiments);
  const lines: ReactNode[] = [];
  for (const stack of stacks) {
    if (!stack.marching || stack.nationId !== playerNationId) continue;
    const points = [stack.at, ...stack.marching.route.map(placePoint)];
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
    const points = [placePoint(marchFrom), ...preview.route.map(placePoint)];
    const end = points[points.length - 1];
    previewLine = (
      <g className="map-armies__preview">
        <path d={pathThrough(points)} className="map-armies__way is-preview" />
        <rect x={end.x - 22} y={end.y - 30} width={44} height={20} rx={4} className="map-armies__days-plate" />
        <text x={end.x} y={end.y - 16} className="map-armies__days">
          {preview.days} d
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
