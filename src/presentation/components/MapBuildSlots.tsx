// The map while the Build window is open: on each of your provinces a small
// plate of its building slots, kind by kind (a picture, then one square a
// slot: gilt when built, hollow gilt while going up), in groups ruled off from
// one another. Only what's open to you today, and what that province can hold.
// Plates push each other apart rather than overlap. Click a province to choose
// where to build.
import { memo } from "react";
import type { ProjectType } from "../../domain/construction/types";
import type { PlacedBuilding } from "../../domain/provinces/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { BUILD_ROWS } from "../buildGroups";
import { separatePlates } from "../mapSlots";
import { BuildingIcon } from "./BuildingIcon";
import type { UnderwayBuilding } from "./MapSettlements";

const SLOT = { size: 4.6, gap: 1.2 };
const ICON_WIDTH = 11;
const ROW_HEIGHT = 10.5;
const PAD = 3;
const ICON_SIZE: Partial<Record<ProjectType, number>> = { factory: 2.9, farm: 2.7, road: 3.2, education: 3.4 };

interface Kind {
  type: ProjectType;
  max: number;
  built: number;
  going: number;
}

const kindWidth = (kind: Kind) => ICON_WIDTH + kind.max * (SLOT.size + SLOT.gap);

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
  const laidOut = provinceIds.flatMap((provinceId) => {
    const place = places.find((p) => p.id === provinceId);
    if (!place) return [];
    const built = buildingsByProvince.get(provinceId) ?? [];
    const going = underway.filter((u) => u.provinceId === provinceId);
    // One row a kind, so a province reads down a column of pictures.
    const groups = BUILD_ROWS.map(({ group, actions }) => ({
      group,
      kinds: actions
        .filter(({ config }) => kinds.includes(config.type) && (!config.allowedIn || config.allowedIn.test(provinceId)))
        .map(({ config, maxPerProvince }): Kind => ({
          type: config.type,
          max: maxPerProvince,
          built: config.type === "road" ? (roadCountByProvince.get(provinceId) ?? 0) : built.filter((b) => b.type === config.type).length,
          going: going.filter((u) => u.type === config.type).length,
        })),
    })).filter((group) => group.kinds.length > 0);
    if (groups.length === 0) return [];
    const rows = groups.flatMap((group) => group.kinds.length);
    const width = Math.max(...groups.flatMap((group) => group.kinds.map(kindWidth))) + PAD * 2;
    const height = rows.reduce((sum, n) => sum + n, 0) * ROW_HEIGHT + PAD * 2;
    return [{ provinceId, groups, x: place.labelX - width / 2, y: place.labelY - height / 2, width, height }];
  });

  return (
    <g className="map-slots" pointerEvents="none" aria-hidden="true">
      {separatePlates(laidOut).map(({ provinceId, groups, x: left, y: top, width, height }) => {
        let y = top + PAD;
        return (
          <g key={provinceId} className={provinceId === selectedProvinceId ? "is-selected" : ""}>
            <rect x={left} y={top} width={width} height={height} rx={2} className="map-slots__plate" />
            {groups.map((group, g) => (
              <g key={group.group}>
                {g > 0 && <line x1={left + 3} x2={left + width - 3} y1={y} y2={y} className="map-slots__rule" />}
                {group.kinds.map((kind) => {
                  const rowY = y;
                  y += ROW_HEIGHT;
                  return (
                    <g key={kind.type}>
                      <BuildingIcon type={kind.type} x={left + PAD + 4.5} y={rowY + 5.6} size={ICON_SIZE[kind.type] ?? 3.2} />
                      {Array.from({ length: kind.max }, (_, i) => (
                        <rect
                          key={i}
                          x={left + PAD + ICON_WIDTH + i * (SLOT.size + SLOT.gap)}
                          y={rowY + (ROW_HEIGHT - SLOT.size) / 2}
                          width={SLOT.size}
                          height={SLOT.size}
                          className={`map-slots__slot ${i < kind.built ? "is-built" : i < kind.built + kind.going ? "is-going" : ""}`}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>
            ))}
          </g>
        );
      })}
    </g>
  );
});
