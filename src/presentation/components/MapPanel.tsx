import type { ProjectType } from "../../domain/construction/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding } from "../../domain/provinces/types";

interface MapPanelProps {
  placedBuildings: PlacedBuilding[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
}

const BUILDING_COLORS: Record<ProjectType, string> = {
  farm: "#8bc34a",
  factory: "#e08a3c",
  road: "#aab2bd",
  education: "#4fa8ff",
  research: "#b98ae0",
};

export function MapPanel({ placedBuildings, selectedProvinceId, onSelectProvince }: MapPanelProps) {
  const { width, height, coastPath, provinces } = MAP_GEOMETRY;

  const buildingsByProvince = new Map<string, PlacedBuilding[]>();
  for (const building of placedBuildings) {
    const list = buildingsByProvince.get(building.provinceId) ?? [];
    list.push(building);
    buildingsByProvince.set(building.provinceId, list);
  }

  return (
    <section className="panel map-panel">
      <h2>Map of Astravia</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="map-panel__svg">
        <path d={coastPath} className="map-panel__coast" />

        {provinces.map((province) => (
          <path
            key={province.id}
            d={province.path}
            className={`map-panel__province ${province.id === selectedProvinceId ? "is-selected" : ""}`}
            onClick={() => onSelectProvince(province.id)}
          >
            <title>{province.name}</title>
          </path>
        ))}

        {provinces.map((province) => (
          <text
            key={`${province.id}-label`}
            x={province.labelX}
            y={province.labelY}
            className="map-panel__label"
            pointerEvents="none"
          >
            {province.name}
          </text>
        ))}

        {provinces.flatMap((province) => {
          const buildings = buildingsByProvince.get(province.id) ?? [];
          return buildings.map((building, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const x = province.labelX - 21 + col * 14;
            const y = province.labelY + 14 + row * 14;
            return (
              <circle
                key={building.id}
                cx={x}
                cy={y}
                r={4}
                fill={BUILDING_COLORS[building.type]}
                pointerEvents="none"
              />
            );
          });
        })}
      </svg>

      <div className="map-panel__legend">
        {(Object.keys(BUILDING_COLORS) as ProjectType[]).map((type) => (
          <span key={type} className="map-panel__legend-item">
            <span className="map-panel__legend-dot" style={{ backgroundColor: BUILDING_COLORS[type] }} />
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}
