// What a province holds and how its people fare, drawn on the land itself:
// every building as a small picture on its own plot (a farm with its field,
// which follows the season), one going up as a faded picture, and the people
// when something is wrong. People without a home camp out of doors, more of
// them the more there are; strikers carry placards; rioters carry torches
// round a fire. See mapSlots.ts for where each stands.
import "./MapSettlements.css";
import { memo } from "react";
import type { ProvinceStatus } from "../../application/getProvinceOverview";
import type { ProjectType } from "../../domain/construction/types";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { getProvincePlots, placeBuildings } from "../mapSlots";
import type { Point } from "../nationFrontiers";
import { BuildingIcon } from "./BuildingIcon";

export interface UnderwayBuilding {
  type: ProjectType;
  provinceId: string;
}

const BUILDING_SIZE: Partial<Record<ProjectType, number>> = { housing: 6, factory: 7, farm: 5.5 };
const BUILDING_SCALE = 1.3; // large enough to read at the zoom the map opens on
const CROWD_SCALE = 1.2;

// Where a crowd stands round its plot, front rank last so it overlaps right.
const CROWD_SPOTS: Point[] = [
  [-7, -7],
  [6, -8],
  [-13, -1],
  [0, -2],
  [12, -2],
  [-7, 4],
  [6, 4],
  [0, 9],
];
const HOMELESS_FIGURES = [0, 3, 5, 8];
const STRIKE_FIGURES = 5;
const RIOT_FIGURES = 7;

function Field() {
  return (
    <g className="map-settle__field-group">
      <polygon points="-13,-1 9,-1 13,9 -9,9" className="map-settle__field" />
      <path d="M-9,2 L10.5,2 M-7.5,5 L11.8,5 M-6,7.5 L12.5,7.5" className="map-settle__furrows" />
    </g>
  );
}

function Building({ type, at, idle, underway }: { type: ProjectType; at: Point; idle: boolean; underway: boolean }) {
  const [x, y] = at;
  return (
    <g transform={`translate(${x} ${y}) scale(${BUILDING_SCALE})`} className={`map-settle__building ${idle ? "is-idle" : ""} ${underway ? "is-underway" : ""}`}>
      {type === "farm" && <Field />}
      {underway && <ellipse cx={0} cy={7} rx={10} ry={3.5} className="map-settle__ground" />}
      <BuildingIcon type={type} x={0} y={type === "farm" ? -3 : 0} size={BUILDING_SIZE[type] ?? 6} />
    </g>
  );
}

// One small figure, standing on the point (0, 0).
function Figure({ tone }: { tone: "homeless" | "striker" | "rioter" }) {
  return (
    <>
      <path d="M-2.6,0 L-2.2,-6 Q0,-7.4 2.2,-6 L2.6,0 Z" className={`map-settle__body is-${tone}`} />
      <circle cx={0} cy={-8.6} r={2} className="map-settle__head" />
    </>
  );
}

function Camp({ at, level }: { at: Point; level: number }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${CROWD_SCALE})`}>
      <path d="M-20,8 L-13,-5 L-6,8 Z" className="map-settle__tent" />
      <path d="M-13,-5 L-13,8" className="map-settle__tent-seam" />
      {level >= 2 && (
        <>
          <path d="M8,-3 L15,-14 L22,-3 Z" className="map-settle__tent" />
          <path d="M15,-14 L15,-3" className="map-settle__tent-seam" />
        </>
      )}
      {CROWD_SPOTS.slice(0, HOMELESS_FIGURES[level]).map(([x, y]) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
          <Figure tone="homeless" />
        </g>
      ))}
    </g>
  );
}

function Strike({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${CROWD_SCALE})`}>
      {CROWD_SPOTS.slice(0, STRIKE_FIGURES).map(([x, y], i) => (
        <g key={`${x},${y}`} transform={`translate(${x} ${y})`}>
          <Figure tone="striker" />
          {/* Each placard sways on its own beat. */}
          <g className="map-settle__placard" style={{ animationDelay: `${i * -0.37}s` }}>
            <path d="M2.6,-4 L2.6,-15" className="map-settle__pole" />
            <rect x={-2} y={-20} width={9.2} height={6} className="map-settle__board" />
            <path d="M-0.4,-17 L5.6,-17" className="map-settle__board-mark" />
          </g>
        </g>
      ))}
    </g>
  );
}

function Riot({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${CROWD_SCALE})`}>
      <path d="M-7,-1 L0,-5 L7,-1 L0,3 Z" className="map-settle__ash" />
      <path d="M0,-18 C6,-11 5,-5 0,-3 C-5,-5 -6,-11 0,-18 Z" className="map-settle__flame" />
      <path d="M0,-11 C2.5,-8 2,-5.5 0,-4.5 C-2,-5.5 -2.5,-8 0,-11 Z" className="map-settle__flame-core" />
      {CROWD_SPOTS.slice(0, RIOT_FIGURES).map(([x, y], i) => (
        <g key={`${x},${y}`} transform={`translate(${x * 1.2} ${y + 3})`}>
          <Figure tone="rioter" />
          <path d="M2.6,-4 L4,-13" className="map-settle__pole" />
          <circle cx={4} cy={-14.5} r={1.8} className="map-settle__torch" style={{ animationDelay: `${i * -0.23}s` }} />
        </g>
      ))}
    </g>
  );
}

// Memoized on what it draws: it changes when a building or a province's
// standing does, not with the days or as the map moves.
export const MapSettlements = memo(function MapSettlements({
  provinceIds,
  buildingsByProvince,
  underway,
  provinceStatus,
}: {
  provinceIds: string[];
  buildingsByProvince: Map<string, PlacedBuilding[]>;
  underway: UnderwayBuilding[];
  provinceStatus: Record<string, ProvinceStatus>;
}) {
  return (
    <g className="map-settle" pointerEvents="none" aria-hidden="true">
      {provinceIds.map((provinceId) => {
        const plots = getProvincePlots(provinceId);
        if (!plots) return null;
        const built = buildingsByProvince.get(provinceId) ?? [];
        const going = underway.filter((u) => u.provinceId === provinceId);
        const spots = placeBuildings(provinceId, [...built.map((b) => b.type), ...going.map((u) => u.type)]);
        const items = [
          ...built.map((b, i) => ({ key: b.id, type: b.type, at: spots[i], idle: !isWorking(b), underway: false })),
          ...going.map((u, i) => ({ key: `underway-${i}`, type: u.type, at: spots[built.length + i], idle: false, underway: true })),
        ];
        const status = provinceStatus[provinceId];
        return (
          <g key={provinceId}>
            {items
              .filter((item) => item.at)
              // Further up the page is further away: drawn first, overlapped.
              .sort((a, b) => a.at![1] - b.at![1])
              .map((item) => (
                <Building key={item.key} type={item.type} at={item.at!} idle={item.idle} underway={item.underway} />
              ))}
            {status && status.homelessLevel > 0 && <Camp at={plots.camp} level={status.homelessLevel} />}
            {status?.stage === "strikes" && <Strike at={plots.square} />}
            {status?.stage === "riots" && <Riot at={plots.square} />}
          </g>
        );
      })}
    </g>
  );
});
