import type { CSSProperties } from "react";
import type { ProjectType } from "../../domain/construction/types";
import { NATIONS } from "../../domain/nations/nationData";
import { getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding, Terrain } from "../../domain/provinces/types";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  armyStrength: number;
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
}

// Which terrains get a decorative pattern overlay (drawn on top of an owned
// province's color fill). "plains" gets none — a flat fill is fine.
const TERRAIN_PATTERN: Partial<Record<Terrain, string>> = {
  hills: "url(#terrain-hills)",
  forest: "url(#terrain-forest)",
  coast: "url(#terrain-coast)",
};

// Each road built adds its own visible lane (parallel to the last), up to
// this many, fanning out from the centerline. Beyond that, a "×N" badge
// keeps the count legible instead of the lines turning into an unreadable
// smear.
const MAX_ROAD_LANES = 5;
const LANE_SPACING = 5;

function getLaneOffsets(count: number): number[] {
  const lanes = Math.min(count, MAX_ROAD_LANES);
  const offsets: number[] = [0];
  for (let i = 1; i < lanes; i++) {
    const pair = Math.ceil(i / 2);
    const sign = i % 2 === 1 ? 1 : -1;
    offsets.push(pair * sign * LANE_SPACING);
  }
  return offsets;
}

export function MapPanel({ nation, placedBuildings, armyStrength, selectedProvinceId, onSelectProvince }: MapPanelProps) {
  const { width, height, coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);

  const buildingsByProvince = new Map<string, PlacedBuilding[]>();
  const roadCountByProvince = new Map<string, number>();
  for (const building of placedBuildings) {
    if (building.type === "road") {
      roadCountByProvince.set(building.provinceId, (roadCountByProvince.get(building.provinceId) ?? 0) + 1);
      continue;
    }
    const list = buildingsByProvince.get(building.provinceId) ?? [];
    list.push(building);
    buildingsByProvince.set(building.provinceId, list);
  }

  return (
    <section className="panel map-panel">
      <h2 className="map-panel__title">Map of {nation.name}</h2>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="map-panel__svg"
        style={{ "--nation-color": nation.color } as CSSProperties}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="ocean-gradient" cx="50%" cy="40%" r="75%">
            <stop offset="0%" stopColor="#1e3a52" />
            <stop offset="100%" stopColor="#101d29" />
          </radialGradient>
          <filter id="coast-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
          </filter>

          {/* Terrain textures — subtle, purely decorative overlays. */}
          <pattern id="terrain-hills" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={9} stroke="#000" strokeOpacity={0.22} strokeWidth={2.5} />
          </pattern>
          <pattern id="terrain-forest" width={11} height={11} patternUnits="userSpaceOnUse">
            <circle cx={3} cy={3} r={1.5} fill="#000" fillOpacity={0.22} />
            <circle cx={8.5} cy={8} r={1.5} fill="#000" fillOpacity={0.22} />
          </pattern>
          <pattern id="terrain-coast" width={16} height={7} patternUnits="userSpaceOnUse">
            <path d="M0,3.5 Q4,0.5 8,3.5 T16,3.5" stroke="#fff" strokeOpacity={0.2} fill="none" strokeWidth={1.2} />
          </pattern>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="url(#ocean-gradient)" />

        {/* Other landmasses: decorative only, not part of any nation yet. */}
        <g filter="url(#coast-shadow)">
          {otherLandmasses.map((land) => (
            <path key={land.id} d={land.path} className="map-panel__unclaimed-land">
              <title>{land.name} (unclaimed)</title>
            </path>
          ))}
        </g>
        {otherLandmasses.map((land) => (
          <text key={`${land.id}-label`} x={land.labelX} y={land.labelY} className="map-panel__label is-foreign" pointerEvents="none">
            {land.name}
          </text>
        ))}

        <g filter="url(#coast-shadow)">
          <path d={coastPath} className="map-panel__coast" />

          {provinces.map((province) => {
            const isOwned = nation.provinceIds.includes(province.id);
            const owner = isOwned ? nation : getNationForProvince(province.id);
            const isSelected = isOwned && province.id === selectedProvinceId;
            return (
              <path
                key={province.id}
                d={province.path}
                className={[
                  "map-panel__province",
                  isOwned ? "is-owned" : "is-foreign",
                  isSelected ? "is-selected" : "",
                ].join(" ")}
                style={!isOwned ? { fill: owner?.color ?? "#414a58" } : undefined}
                onClick={isOwned ? () => onSelectProvince(province.id) : undefined}
              >
                <title>
                  {province.name}
                  {isOwned ? " (yours)" : owner ? ` (${owner.name})` : " (unclaimed)"}
                </title>
              </path>
            );
          })}

          {/* Terrain texture, only for owned provinces (foreign ones stay flat). */}
          {provinces.map((province) => {
            if (!nation.provinceIds.includes(province.id)) return null;
            const pattern = TERRAIN_PATTERN[province.terrain];
            if (!pattern) return null;
            return <path key={`${province.id}-terrain`} d={province.path} fill={pattern} pointerEvents="none" />;
          })}
        </g>

        {/* Road network: every road built in the capital grows its hub;
            every road built elsewhere adds its own visible lane on the road
            connecting that province to the capital, so building more roads
            is always visibly different — not just a slightly thicker line. */}
        {capital &&
          [...roadCountByProvince.entries()].map(([provinceId, count]) => {
            const province = provinces.find((p) => p.id === provinceId);
            if (!province) return null;

            if (provinceId === nation.capitalProvinceId) {
              return (
                <g key={`road-hub-${provinceId}`}>
                  <circle
                    cx={province.labelX}
                    cy={province.labelY - 24}
                    r={Math.min(2.5 + count * 1.2, 10)}
                    className="map-panel__road-hub"
                  />
                  {count > 1 && (
                    <text x={province.labelX + 14} y={province.labelY - 20} className="map-panel__road-count">
                      ×{count}
                    </text>
                  )}
                </g>
              );
            }

            const dx = province.labelX - capital.labelX;
            const dy = province.labelY - capital.labelY;
            const length = Math.hypot(dx, dy) || 1;
            const perpX = -dy / length;
            const perpY = dx / length;

            return (
              <g key={`road-${provinceId}`}>
                {getLaneOffsets(count).map((offset, laneIndex) => {
                  const ox = perpX * offset;
                  const oy = perpY * offset;
                  return (
                    <g key={laneIndex}>
                      <line
                        x1={capital.labelX + ox}
                        y1={capital.labelY + oy}
                        x2={province.labelX + ox}
                        y2={province.labelY + oy}
                        className="map-panel__road-line-base"
                      />
                      <line
                        x1={capital.labelX + ox}
                        y1={capital.labelY + oy}
                        x2={province.labelX + ox}
                        y2={province.labelY + oy}
                        className="map-panel__road-line-top"
                      />
                    </g>
                  );
                })}
                {count > MAX_ROAD_LANES && (
                  <text
                    x={(capital.labelX + province.labelX) / 2}
                    y={(capital.labelY + province.labelY) / 2 - 8}
                    className="map-panel__road-count"
                  >
                    ×{count}
                  </text>
                )}
              </g>
            );
          })}

        {/* Army marker: crossed swords at the capital, growing (and labeled)
            with army strength, so recruiting soldiers shows up on the map too. */}
        {capital && armyStrength > 0 && (
          <g
            transform={`translate(${capital.labelX - 32}, ${capital.labelY}) scale(${Math.min(0.7 + armyStrength / 150, 1.8)})`}
            className="map-panel__army-marker"
          >
            <line x1={-6} y1={-6} x2={6} y2={6} />
            <line x1={6} y1={-6} x2={-6} y2={6} />
            <circle cx={6} cy={6} r={1.2} />
            <circle cx={-6} cy={6} r={1.2} />
          </g>
        )}
        {capital && armyStrength > 0 && (
          <text x={capital.labelX - 32} y={capital.labelY + 17} className="map-panel__road-count">
            {Math.round(armyStrength)}
          </text>
        )}

        {provinces.map((province) => (
          <text
            key={`${province.id}-label`}
            x={province.labelX}
            y={province.labelY}
            className={`map-panel__label ${nation.provinceIds.includes(province.id) ? "" : "is-foreign"}`}
            pointerEvents="none"
          >
            {province.id === nation.capitalProvinceId ? "★ " : ""}
            {province.name}
          </text>
        ))}

        {provinces.flatMap((province) => {
          const buildings = buildingsByProvince.get(province.id) ?? [];
          return buildings.map((building, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = province.labelX - 21 + col * 14;
            const y = province.labelY + 16 + row * 14;
            return <BuildingIcon key={building.id} type={building.type} x={x} y={y} />;
          });
        })}
      </svg>

      <div className="map-panel__legend">
        {NATIONS.map((n) => (
          <span key={n.id} className="map-panel__legend-item">
            <span className="map-panel__legend-swatch" style={{ backgroundColor: n.color }} />
            {n.name}
            {n.id === nation.id ? " (yours)" : ""}
          </span>
        ))}
        {(Object.keys(BUILDING_COLORS) as ProjectType[]).map((type) => (
          <span key={type} className="map-panel__legend-item">
            <BuildingIconSwatch type={type} />
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

function BuildingIconSwatch({ type }: { type: ProjectType }) {
  return (
    <svg width={16} height={16} viewBox="-8 -8 16 16" className="map-panel__legend-icon">
      <BuildingIcon type={type} x={0} y={0} size={4.5} />
    </svg>
  );
}
