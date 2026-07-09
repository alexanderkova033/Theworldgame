import type { CSSProperties } from "react";
import type { ProjectType } from "../../domain/construction/types";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
}

export function MapPanel({ nation, placedBuildings, selectedProvinceId, onSelectProvince }: MapPanelProps) {
  const { width, height, coastPath, provinces } = MAP_GEOMETRY;

  const buildingsByProvince = new Map<string, PlacedBuilding[]>();
  for (const building of placedBuildings) {
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
        </g>

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
    <svg width={12} height={12} viewBox="-6 -6 12 12" className="map-panel__legend-icon">
      <BuildingIcon type={type} x={0} y={0} size={5} />
    </svg>
  );
}
