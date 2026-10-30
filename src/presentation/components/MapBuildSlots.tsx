// The map while the Build window is open: on each of your provinces a small
// plate of its building slots, kind by kind (an icon, then one pip a slot:
// filled when built, amber while going up), in groups ruled off from one
// another. Only what's open to you today, and what that province can hold.
// Click a province to choose where to build.
import { memo } from "react";
import type { ProjectType } from "../../domain/construction/types";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { BUILD_ROWS } from "../buildGroups";
import { BuildingIcon } from "./BuildingIcon";
import type { UnderwayBuilding } from "./MapSettlements";

const PIP = { width: 5, height: 8, gap: 1.2 };
const ICON_WIDTH = 13;
const KIND_GAP = 5;
const ROW_HEIGHT = 14;
const PAD = 4;

function rowWidth(kinds: Array<{ max: number }>): number {
  return kinds.reduce((sum, kind) => sum + ICON_WIDTH + kind.max * (PIP.width + PIP.gap), 0) + (kinds.length - 1) * KIND_GAP;
}

export const MapBuildSlots = memo(function MapBuildSlots({
  provinceIds,
  kinds,
  buildingsByProvince,
  roadCountByProvince,
  underway,
  selectedProvinceId,
}: {
  provinceIds: string[];
  kinds: ProjectType[];
  buildingsByProvince: Map<string, PlacedBuilding[]>;
  roadCountByProvince: Map<string, number>;
  underway: UnderwayBuilding[];
  selectedProvinceId: string;
}) {
  const places = [...MAP_GEOMETRY.provinces, ...MAP_GEOMETRY.islands];
  return (
    <g className="map-slots" pointerEvents="none" aria-hidden="true">
      {provinceIds.map((provinceId) => {
        const place = places.find((p) => p.id === provinceId);
        if (!place) return null;
        const built = buildingsByProvince.get(provinceId) ?? [];
        const going = underway.filter((u) => u.provinceId === provinceId);
        const rows = BUILD_ROWS.map(({ group, actions }) => ({
          group,
          kinds: actions
            .filter(({ config }) => kinds.includes(config.type) && (!config.allowedIn || config.allowedIn.test(provinceId)))
            .map(({ config, maxPerProvince }) => ({
              type: config.type,
              max: maxPerProvince,
              built: config.type === "road" ? (roadCountByProvince.get(provinceId) ?? 0) : built.filter((b) => b.type === config.type).length,
              going: going.filter((u) => u.type === config.type).length,
            })),
        })).filter((row) => row.kinds.length > 0);
        if (rows.length === 0) return null;

        const width = Math.max(...rows.map((row) => rowWidth(row.kinds))) + PAD * 2;
        const height = rows.length * ROW_HEIGHT + PAD * 2;
        const left = place.labelX - width / 2;
        const top = place.labelY + 6;
        return (
          <g key={provinceId} className={provinceId === selectedProvinceId ? "is-selected" : ""}>
            <rect x={left} y={top} width={width} height={height} rx={3} className="map-slots__plate" />
            {rows.map((row, r) => {
              const y = top + PAD + r * ROW_HEIGHT;
              let x = left + PAD;
              return (
                <g key={row.group}>
                  {r > 0 && <line x1={left + 2} x2={left + width - 2} y1={y} y2={y} className="map-slots__rule" />}
                  {row.kinds.map((kind) => {
                    const startX = x;
                    x += ICON_WIDTH + kind.max * (PIP.width + PIP.gap) + KIND_GAP;
                    return (
                      <g key={kind.type}>
                        <BuildingIcon type={kind.type} x={startX + 5.5} y={y + 7.5} size={kind.type === "road" ? 4 : 4.6} />
                        {Array.from({ length: kind.max }, (_, i) => (
                          <rect
                            key={i}
                            x={startX + ICON_WIDTH + i * (PIP.width + PIP.gap)}
                            y={y + (ROW_HEIGHT - PIP.height) / 2}
                            width={PIP.width}
                            height={PIP.height}
                            className={`map-slots__pip ${i < kind.built ? "is-built" : i < kind.built + kind.going ? "is-going" : ""}`}
                          />
                        ))}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
});
