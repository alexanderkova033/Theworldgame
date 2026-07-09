import type { CSSProperties } from "react";
import type { ProjectType } from "../../domain/construction/types";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding, Terrain } from "../../domain/provinces/types";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
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

export function MapPanel({ nation, placedBuildings, selectedProvinceId, onSelectProvince }: MapPanelProps) {
  const { width, height, coastPath, provinces } = MAP_GEOMETRY;
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

        <g filter="url(#coast-shadow)">
          <path d={coastPath} className="map-panel__coast" />

          {provinces.map((province) => {
            const isOwned = nation.provinceIds.includes(province.id);
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
                onClick={isOwned ? () => onSelectProvince(province.id) : undefined}
              >
                <title>{province.name}{isOwned ? " (yours)" : " (foreign territory)"}</title>
              </path>
            );
          })}

          {/* Terrain texture, only for owned provinces (foreign ones stay flat/muted). */}
          {provinces.map((province) => {
            if (!nation.provinceIds.includes(province.id)) return null;
            const pattern = TERRAIN_PATTERN[province.terrain];
            if (!pattern) return null;
            return <path key={`${province.id}-terrain`} d={province.path} fill={pattern} pointerEvents="none" />;
          })}
        </g>

        {/* Road network: a line from the capital to every owned province with
            at least one road, thicker the more roads have been built there. */}
        {capital &&
          [...roadCountByProvince.entries()].map(([provinceId, count]) => {
            const province = provinces.find((p) => p.id === provinceId);
            if (!province) return null;

            if (provinceId === nation.capitalProvinceId) {
              return (
                <circle
                  key={`road-hub-${provinceId}`}
                  cx={province.labelX}
                  cy={province.labelY - 24}
                  r={2.5 + count}
                  className="map-panel__road-hub"
                />
              );
            }

            const strokeWidth = Math.min(2 + count * 1.4, 7);
            return (
              <g key={`road-${provinceId}`}>
                <line
                  x1={capital.labelX}
                  y1={capital.labelY}
                  x2={province.labelX}
                  y2={province.labelY}
                  className="map-panel__road-line-base"
                  style={{ strokeWidth: strokeWidth + 2 }}
                />
                <line
                  x1={capital.labelX}
                  y1={capital.labelY}
                  x2={province.labelX}
                  y2={province.labelY}
                  className="map-panel__road-line-top"
                  style={{ strokeWidth }}
                />
              </g>
            );
          })}

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
        <span className="map-panel__legend-item">
          <span className="map-panel__legend-swatch map-panel__legend-swatch--owned" />
          {nation.name} (yours)
        </span>
        <span className="map-panel__legend-item">
          <span className="map-panel__legend-swatch map-panel__legend-swatch--foreign" />
          Foreign territory
        </span>
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
