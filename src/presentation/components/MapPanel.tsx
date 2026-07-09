import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { ProjectType } from "../../domain/construction/types";
import { NATIONS } from "../../domain/nations/nationData";
import { getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding, Terrain } from "../../domain/provinces/types";
import { RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";
import { ResourceIcon } from "./ResourceIcon";

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  armyStrength: number;
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
}

// Every terrain gets a decorative texture, drawn on top of the province's
// ownership color — this is what makes the map read as an actual landscape
// rather than a flat political map.
const TERRAIN_PATTERN: Record<Terrain, string> = {
  hills: "url(#terrain-hills)",
  forest: "url(#terrain-forest)",
  coast: "url(#terrain-coast)",
  plains: "url(#terrain-plains)",
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

// --- Zoom & pan --------------------------------------------------------
// The "camera" is just the SVG viewBox. Zooming/panning never touches the
// map's actual coordinates — it only changes which rectangle of that fixed
// world we're looking at. This is view state, not simulation state, so it
// lives here as local component state, the same way selectedProvinceId
// lives in App.tsx.

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const BASE_VIEW: ViewBox = { x: 0, y: 0, width: MAP_GEOMETRY.width, height: MAP_GEOMETRY.height };
const MIN_ZOOM = 1; // can't zoom out past the full map
const MAX_ZOOM = 6;
const DRAG_CLICK_THRESHOLD = 4; // pixels of movement before a drag stops counting as a click

function clampViewBox(vb: ViewBox): ViewBox {
  const minWidth = BASE_VIEW.width / MAX_ZOOM;
  const maxWidth = BASE_VIEW.width / MIN_ZOOM;
  const width = Math.min(Math.max(vb.width, minWidth), maxWidth);
  const height = width * (BASE_VIEW.height / BASE_VIEW.width);

  // Allow a little overscroll past the coastline so provinces at the edge
  // aren't stuck glued to the panel border, but not so much you can pan
  // away into the void indefinitely.
  const padX = BASE_VIEW.width * 0.2;
  const padY = BASE_VIEW.height * 0.2;
  const minX = -padX;
  const maxX = Math.max(minX, BASE_VIEW.width + padX - width);
  const minY = -padY;
  const maxY = Math.max(minY, BASE_VIEW.height + padY - height);

  return {
    width,
    height,
    x: Math.min(Math.max(vb.x, minX), maxX),
    y: Math.min(Math.max(vb.y, minY), maxY),
  };
}

export function MapPanel({ nation, placedBuildings, armyStrength, selectedProvinceId, onSelectProvince }: MapPanelProps) {
  const { coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);

  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<ViewBox>(BASE_VIEW);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  // Wheel-to-zoom, centered on the cursor. Attached as a native (non-passive)
  // listener so we can preventDefault and stop the page itself from
  // scrolling while the cursor is over the map.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = svg!.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const zoomFactor = e.deltaY < 0 ? 0.88 : 1 / 0.88;

      setView((vb) => {
        const newWidth = vb.width * zoomFactor;
        const newHeight = newWidth * (BASE_VIEW.height / BASE_VIEW.width);
        return clampViewBox({
          x: vb.x + (vb.width - newWidth) * px,
          y: vb.y + (vb.height - newHeight) * py,
          width: newWidth,
          height: newHeight,
        });
      });
    }

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, []);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    dragStart.current = { x: e.clientX, y: e.clientY };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragStart.current) return;
    const dxPixels = e.clientX - dragStart.current.x;
    const dyPixels = e.clientY - dragStart.current.y;
    if (Math.hypot(dxPixels, dyPixels) > DRAG_CLICK_THRESHOLD) {
      suppressNextClick.current = true;
      setIsPanning(true);
    }

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setView((vb) =>
      clampViewBox({
        ...vb,
        x: vb.x - (dxPixels / rect.width) * vb.width,
        y: vb.y - (dyPixels / rect.height) * vb.height,
      }),
    );
  }

  function handlePointerUp() {
    dragStart.current = null;
    setIsPanning(false);
  }

  function handleProvinceClick(provinceId: string) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    onSelectProvince(provinceId);
  }

  function zoomBy(factor: number) {
    setView((vb) => {
      const cx = vb.x + vb.width / 2;
      const cy = vb.y + vb.height / 2;
      const newWidth = vb.width * factor;
      const newHeight = newWidth * (BASE_VIEW.height / BASE_VIEW.width);
      return clampViewBox({ x: cx - newWidth / 2, y: cy - newHeight / 2, width: newWidth, height: newHeight });
    });
  }

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
      <div className="map-panel__stage">
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          className={`map-panel__svg ${isPanning ? "is-panning" : ""}`}
          style={{ "--nation-color": nation.color } as CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <radialGradient id="ocean-gradient" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#1e3a52" />
              <stop offset="100%" stopColor="#101d29" />
            </radialGradient>
            <filter id="coast-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
            </filter>

            {/* Terrain textures — bold enough to read as actual landscape,
                not just a subtle hint. */}
            <pattern id="terrain-hills" width={24} height={20} patternUnits="userSpaceOnUse">
              <path d="M-2,20 Q4,8 10,20 Q16,10 22,20 Q28,9 34,20 Z" fill="#3a2f18" opacity={0.55} />
              <path d="M-2,20 Q4,15 10,20 Q16,16 22,20 Q28,15 34,20 Z" fill="#241d10" opacity={0.4} />
            </pattern>
            <pattern id="terrain-forest" width={24} height={24} patternUnits="userSpaceOnUse">
              <polygon points="5,1 8.5,8 1.5,8" fill="#1f4a2e" opacity={0.6} />
              <rect x={4.3} y={8} width={1.4} height={1.8} fill="#1f4a2e" opacity={0.6} />
              <polygon points="17,12 20.5,19 13.5,19" fill="#1f4a2e" opacity={0.5} />
              <rect x={16.3} y={19} width={1.4} height={1.8} fill="#1f4a2e" opacity={0.5} />
            </pattern>
            <pattern id="terrain-coast" width={22} height={11} patternUnits="userSpaceOnUse">
              <path d="M0,5 Q5.5,1 11,5 T22,5" stroke="#d5eefa" strokeWidth={1.6} fill="none" opacity={0.55} />
              <path d="M0,8.5 Q5.5,5 11,8.5 T22,8.5" stroke="#d5eefa" strokeWidth={1.2} fill="none" opacity={0.4} />
            </pattern>
            <pattern id="terrain-plains" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
              <line x1={0} y1={0} x2={0} y2={16} stroke="#e6c56a" strokeWidth={1.4} opacity={0.38} />
            </pattern>
          </defs>

          <rect x={BASE_VIEW.x} y={BASE_VIEW.y} width={BASE_VIEW.width} height={BASE_VIEW.height} fill="url(#ocean-gradient)" />

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
                  onClick={isOwned ? () => handleProvinceClick(province.id) : undefined}
                >
                  <title>
                    {province.name}
                    {isOwned ? " (yours)" : owner ? ` (${owner.name})` : " (unclaimed)"}
                  </title>
                </path>
              );
            })}

            {/* Terrain texture for every province — owned provinces get it
                at full strength, foreign ones a bit quieter so your own
                territory still reads as the focus. */}
            {provinces.map((province) => {
              const isOwned = nation.provinceIds.includes(province.id);
              return (
                <path
                  key={`${province.id}-terrain`}
                  d={province.path}
                  fill={TERRAIN_PATTERN[province.terrain]}
                  opacity={isOwned ? 1 : 0.5}
                  pointerEvents="none"
                />
              );
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
              const x = province.labelX - 24 + col * 16;
              const y = province.labelY + 18 + row * 16;
              return <BuildingIcon key={building.id} type={building.type} x={x} y={y} size={7} />;
            });
          })}

          {/* Resource badge: what each of your provinces produces, echoing the
              terrain texture underneath — Catan-style "this hex makes wood". */}
          {provinces.map((province) => {
            if (!nation.provinceIds.includes(province.id)) return null;
            return (
              <ResourceIcon
                key={`${province.id}-resource`}
                type={RESOURCE_BY_TERRAIN[province.terrain]}
                x={province.labelX + 38}
                y={province.labelY - 18}
                size={8}
              />
            );
          })}
        </svg>

        <div className="map-panel__zoom-controls">
          <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => setView(BASE_VIEW)} aria-label="Reset view">
            Reset
          </button>
          <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom out">
            −
          </button>
        </div>
      </div>

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
        {(["wood", "ore", "grain", "fish"] as const).map((type) => (
          <span key={type} className="map-panel__legend-item">
            <svg width={20} height={20} viewBox="-9 -9 18 18" className="map-panel__legend-icon">
              <ResourceIcon type={type} size={7.5} />
            </svg>
            {type}
          </span>
        ))}
      </div>
    </section>
  );
}

function BuildingIconSwatch({ type }: { type: ProjectType }) {
  return (
    <svg width={20} height={20} viewBox="-9 -9 18 18" className="map-panel__legend-icon">
      <BuildingIcon type={type} x={0} y={0} size={5.5} />
    </svg>
  );
}
