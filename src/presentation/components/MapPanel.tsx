import "./MapPanel.css";
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

const TERRAIN_LABELS: Record<Terrain, string> = {
  hills: "Hills",
  forest: "Forest",
  coast: "Coast",
  plains: "Plains",
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

const BUILDING_LABELS: Record<ProjectType, string> = {
  farm: "Farm",
  factory: "Factory",
  road: "Road",
  education: "Education",
  research: "Research",
};

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  armyStrength: number;
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  scoutedIslandIds: string[];
  expeditionIslandIds: string[]; // islands with an expedition currently in progress
  selectedIslandId: string | null;
  onSelectIsland: (islandId: string) => void;
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

// A faint terrain-colored wash underneath that texture (blended with
// multiply, so it darkens/tints rather than washing out the nation's
// color) — the two together read as an actual colored terrain instead of
// a flat political fill with a pattern stamped on it.
const TERRAIN_TINT: Record<Terrain, string> = {
  hills: "#5c4a2e",
  forest: "#173a22",
  coast: "#28576b",
  plains: "#8a6f2e",
};

// Each road built thickens the single line to its province (instead of
// fanning out extra parallel lines) — a "×N" badge carries the exact count
// so the line itself never has to turn into a tangle to stay informative.
const ROAD_BASE_WIDTH = 2.5;
const ROAD_WIDTH_PER_ROAD = 1.1;
const ROAD_MAX_WIDTH = 9;

function roadLineWidth(count: number): number {
  return Math.min(ROAD_BASE_WIDTH + count * ROAD_WIDTH_PER_ROAD, ROAD_MAX_WIDTH);
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

// The world is bigger than the continent: zooming all the way out reveals
// open sea around it (textured, shaded, alive) instead of hitting a hard
// edge at the coastline. WORLD_VIEW is that outer bound — centered on the
// continent, half again as wide/tall on every side.
const WORLD_MARGIN_X = MAP_GEOMETRY.width * 0.5;
const WORLD_MARGIN_Y = MAP_GEOMETRY.height * 0.5;
const WORLD_VIEW: ViewBox = {
  x: BASE_VIEW.x - WORLD_MARGIN_X,
  y: BASE_VIEW.y - WORLD_MARGIN_Y,
  width: BASE_VIEW.width + WORLD_MARGIN_X * 2,
  height: BASE_VIEW.height + WORLD_MARGIN_Y * 2,
};

const MIN_ZOOM = BASE_VIEW.width / WORLD_VIEW.width; // zooming out this far shows the whole surrounding sea
const MAX_ZOOM = 6;
const DRAG_CLICK_THRESHOLD = 4; // pixels of movement before a drag stops counting as a click

function clampViewBox(vb: ViewBox): ViewBox {
  const minWidth = BASE_VIEW.width / MAX_ZOOM;
  const maxWidth = BASE_VIEW.width / MIN_ZOOM;
  const width = Math.min(Math.max(vb.width, minWidth), maxWidth);
  const height = width * (BASE_VIEW.height / BASE_VIEW.width);

  // Allow a little overscroll past the open sea so the world edge never
  // feels glued to the panel border, but not so much you can pan away into
  // the void indefinitely.
  const padX = WORLD_VIEW.width * 0.15;
  const padY = WORLD_VIEW.height * 0.15;
  const minX = WORLD_VIEW.x - padX;
  const maxX = Math.max(minX, WORLD_VIEW.x + WORLD_VIEW.width + padX - width);
  const minY = WORLD_VIEW.y - padY;
  const maxY = Math.max(minY, WORLD_VIEW.y + WORLD_VIEW.height + padY - height);

  return {
    width,
    height,
    x: Math.min(Math.max(vb.x, minX), maxX),
    y: Math.min(Math.max(vb.y, minY), maxY),
  };
}

// The visible ocean canvas itself, generous enough to cover the full pan
// range above with room to spare — it should never run out before the pan
// clamp does.
const OCEAN_RECT = {
  x: WORLD_VIEW.x - WORLD_VIEW.width * 0.2,
  y: WORLD_VIEW.y - WORLD_VIEW.height * 0.2,
  width: WORLD_VIEW.width * 1.4,
  height: WORLD_VIEW.height * 1.4,
};

export function MapPanel({
  nation,
  placedBuildings,
  armyStrength,
  selectedProvinceId,
  onSelectProvince,
  scoutedIslandIds,
  expeditionIslandIds,
  selectedIslandId,
  onSelectIsland,
}: MapPanelProps) {
  const { coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);

  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewBox>(BASE_VIEW);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  // A custom hover tooltip for owned provinces — richer than the browser's
  // native <title> (name/owner only): terrain, produced resource, and every
  // building actually standing there, in one place instead of only as
  // small icons on the map itself.
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  function handleStageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

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
    setHoveredProvinceId(null);
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

  function handleIslandClick(islandId: string) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    onSelectIsland(islandId);
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
      <div className="map-panel__stage" ref={stageRef} onMouseMove={handleStageMouseMove}>
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
            <filter id="shallow-blur" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="9" />
            </filter>

            {/* Open-sea texture: soft, wide-set swells across the whole
                ocean, distinct from the tighter shoreline ripples in
                terrain-coast, so the water reads as alive everywhere, not
                just at the water's edge. */}
            <pattern id="ocean-swell" width={140} height={90} patternUnits="userSpaceOnUse">
              <path d="M-10,20 Q25,4 60,20 T130,20" stroke="#3a7093" strokeWidth={1.6} fill="none" opacity={0.16} />
              <path d="M-10,55 Q25,39 60,55 T130,55" stroke="#3a7093" strokeWidth={1.4} fill="none" opacity={0.12} />
              <path d="M15,80 Q50,66 85,80 T155,80" stroke="#3a7093" strokeWidth={1.2} fill="none" opacity={0.1} />
            </pattern>

            {/* Terrain textures — a quiet relief hint (like a HOI4 elevation
                layer) rather than a competing pattern of their own color, so
                the nation's political color and the map's icons stay the
                clearest thing on screen. Neutral dark shading, sparse tiling,
                low opacity. */}
            <pattern id="terrain-hills" width={60} height={46} patternUnits="userSpaceOnUse">
              <path d="M-4,40 Q11,20 26,40 Q41,22 56,40" fill="none" stroke="#000000" strokeWidth={2.5} opacity={0.16} />
              <path d="M-4,26 Q11,10 26,26 Q41,12 56,26" fill="none" stroke="#000000" strokeWidth={2} opacity={0.12} />
            </pattern>
            <pattern id="terrain-forest" width={40} height={40} patternUnits="userSpaceOnUse">
              <polygon points="9,4 13.5,13 4.5,13" fill="#08170d" opacity={0.3} />
              <rect x={8.3} y={13} width={1.4} height={2} fill="#08170d" opacity={0.3} />
              <polygon points="29,20 33.5,29 24.5,29" fill="#08170d" opacity={0.24} />
              <rect x={28.3} y={29} width={1.4} height={2} fill="#08170d" opacity={0.24} />
            </pattern>
            <pattern id="terrain-coast" width={30} height={15} patternUnits="userSpaceOnUse">
              <path d="M0,7 Q7.5,2.5 15,7 T30,7" stroke="#d5eefa" strokeWidth={1.3} fill="none" opacity={0.22} />
            </pattern>
            <pattern id="terrain-plains" width={26} height={26} patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
              <line x1={0} y1={0} x2={0} y2={26} stroke="#000000" strokeWidth={1.2} opacity={0.12} />
            </pattern>
          </defs>

          <rect x={OCEAN_RECT.x} y={OCEAN_RECT.y} width={OCEAN_RECT.width} height={OCEAN_RECT.height} fill="url(#ocean-gradient)" />
          <rect
            x={OCEAN_RECT.x}
            y={OCEAN_RECT.y}
            width={OCEAN_RECT.width}
            height={OCEAN_RECT.height}
            fill="url(#ocean-swell)"
            pointerEvents="none"
          />

          {/* Shallow water: a soft blurred halo hugging every coastline,
              plus a thin surf line right at the water's edge — drawn before
              any land fill, so the fill's inner half covers it and only the
              water-side sliver shows through. Reads as an actual sea meeting
              an actual shore instead of a flat shape dropped on blue. */}
          <g pointerEvents="none">
            <path d={coastPath} className="map-panel__shallows" filter="url(#shallow-blur)" />
            {otherLandmasses.map((land) => (
              <path key={`${land.id}-shallows`} d={land.path} className="map-panel__shallows" filter="url(#shallow-blur)" />
            ))}
            <path d={coastPath} className="map-panel__surf" />
            {otherLandmasses.map((land) => (
              <path key={`${land.id}-surf`} d={land.path} className="map-panel__surf" />
            ))}
          </g>

          {/* Other landmasses: unowned, but chartable via ventures. */}
          <g filter="url(#coast-shadow)">
            {otherLandmasses.map((land) => {
              const isScouted = scoutedIslandIds.includes(land.id);
              const isExpeditionActive = expeditionIslandIds.includes(land.id);
              const isSelected = land.id === selectedIslandId;
              const status = isScouted ? "charted" : isExpeditionActive ? "venture under way" : "uncharted — click to charter a venture";
              return (
                <path
                  key={land.id}
                  d={land.path}
                  className={[
                    "map-panel__unclaimed-land",
                    "map-panel__unclaimed-land--clickable",
                    isSelected ? "is-selected" : "",
                  ].join(" ")}
                  onClick={() => handleIslandClick(land.id)}
                >
                  <title>
                    {land.name} ({status})
                  </title>
                </path>
              );
            })}
            {/* A hint of vegetation so unclaimed islands read as actual
                islands, not flat brown blobs. */}
            {otherLandmasses.map((land) => (
              <path key={`${land.id}-terrain`} d={land.path} fill="url(#terrain-forest)" opacity={0.55} pointerEvents="none" />
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
                  onMouseEnter={isOwned ? () => setHoveredProvinceId(province.id) : undefined}
                  onMouseLeave={isOwned ? () => setHoveredProvinceId((prev) => (prev === province.id ? null : prev)) : undefined}
                >
                  <title>
                    {province.name}
                    {isOwned ? " (yours)" : owner ? ` (${owner.name})` : " (unclaimed)"}
                  </title>
                </path>
              );
            })}

            {/* Terrain tint: a faint multiply wash in the terrain's own
                color, underneath its texture — the two together make hills,
                forest, plains, and coast actually look different from each
                other, instead of only differing by which pattern is
                stamped on the same flat political fill. */}
            {provinces.map((province) => {
              const isOwned = nation.provinceIds.includes(province.id);
              return (
                <path
                  key={`${province.id}-tint`}
                  d={province.path}
                  fill={TERRAIN_TINT[province.terrain]}
                  opacity={isOwned ? 0.32 : 0.2}
                  className="map-panel__terrain-tint"
                  pointerEvents="none"
                />
              );
            })}

            {/* Terrain texture for every province — a quiet relief hint, not
                a second competing color. Owned provinces get it a little
                clearer, foreign ones quieter still. */}
            {provinces.map((province) => {
              const isOwned = nation.provinceIds.includes(province.id);
              return (
                <path
                  key={`${province.id}-terrain`}
                  d={province.path}
                  fill={TERRAIN_PATTERN[province.terrain]}
                  opacity={isOwned ? 0.85 : 0.4}
                  pointerEvents="none"
                />
              );
            })}
          </g>

          {/* Road network: every road built in the capital grows its hub;
              every road built elsewhere thickens the single line connecting
              that province to the capital, with a "×N" badge carrying the
              exact count — a clean, single connection per province instead
              of a fan of parallel lines. */}
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

              const width = roadLineWidth(count);

              return (
                <g key={`road-${provinceId}`}>
                  <line
                    x1={capital.labelX}
                    y1={capital.labelY}
                    x2={province.labelX}
                    y2={province.labelY}
                    className="map-panel__road-line-base"
                    style={{ strokeWidth: width }}
                  />
                  <line
                    x1={capital.labelX}
                    y1={capital.labelY}
                    x2={province.labelX}
                    y2={province.labelY}
                    className="map-panel__road-line-top"
                    style={{ strokeWidth: width * 0.4 }}
                  />
                  {count > 1 && (
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

          {/* Province info bar: one compact strip per owned province, on its
              own translucent backing so it reads clearly no matter what
              terrain or nation color sits underneath — what it produces,
              then what's built there (one icon + a "×N" count per building
              type, not one icon per building), instead of scattering icons
              loose across the map. */}
          {provinces.map((province) => {
            if (!nation.provinceIds.includes(province.id)) return null;

            const buildings = buildingsByProvince.get(province.id) ?? [];
            const counts = new Map<ProjectType, number>();
            for (const building of buildings) {
              counts.set(building.type, (counts.get(building.type) ?? 0) + 1);
            }
            const buildingTypes = [...counts.keys()];

            const itemWidth = 20;
            const itemCount = 1 + buildingTypes.length; // resource + one slot per building type present
            const barWidth = itemCount * itemWidth + 6;
            const barX = province.labelX - barWidth / 2;
            const barY = province.labelY + 10;
            const itemCenterY = barY + 11;

            return (
              <g key={`${province.id}-info`} pointerEvents="none">
                <rect x={barX} y={barY} width={barWidth} height={22} rx={5} className="map-panel__info-bar" />
                <ResourceIcon
                  type={RESOURCE_BY_TERRAIN[province.terrain]}
                  x={barX + itemWidth / 2 + 3}
                  y={itemCenterY}
                  size={7}
                />
                {buildingTypes.map((type, index) => {
                  const cx = barX + itemWidth * (index + 1) + itemWidth / 2 + 3;
                  const count = counts.get(type)!;
                  return (
                    <g key={type}>
                      <BuildingIcon type={type} x={cx - 3} y={itemCenterY} size={5.5} />
                      {count > 1 && (
                        <text x={cx + 7} y={itemCenterY + 3} className="map-panel__info-count">
                          {count}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
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

        {hoveredProvinceId &&
          tooltipPos &&
          !isPanning &&
          (() => {
            const province = provinces.find((p) => p.id === hoveredProvinceId);
            if (!province) return null;
            const buildings = buildingsByProvince.get(province.id) ?? [];
            const roads = roadCountByProvince.get(province.id) ?? 0;
            const counts = new Map<ProjectType, number>();
            for (const b of buildings) counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
            const resourceType = RESOURCE_BY_TERRAIN[province.terrain];

            return (
              <div className="map-panel__tooltip" style={{ left: tooltipPos.x + 18, top: tooltipPos.y + 18 }}>
                <div className="map-panel__tooltip-title">
                  {province.id === nation.capitalProvinceId ? "★ " : ""}
                  {province.name}
                </div>
                <div className="map-panel__tooltip-row">
                  <svg viewBox="-10 -10 20 20" width={18} height={18}>
                    <ResourceIcon type={resourceType} size={8} />
                  </svg>
                  <span>
                    {TERRAIN_LABELS[province.terrain]} — produces {RESOURCE_LABELS[resourceType]}
                  </span>
                </div>
                {[...counts.entries()].map(([type, count]) => (
                  <div className="map-panel__tooltip-row" key={type}>
                    <svg viewBox="-12 -16 24 24" width={18} height={18}>
                      <BuildingIcon type={type} x={0} y={0} size={7} />
                    </svg>
                    <span>
                      {count}× {BUILDING_LABELS[type]}
                    </span>
                  </div>
                ))}
                {roads > 0 && (
                  <div className="map-panel__tooltip-row">
                    <svg viewBox="-12 -16 24 24" width={18} height={18}>
                      <BuildingIcon type="road" x={0} y={0} size={7} />
                    </svg>
                    <span>
                      {roads}× {BUILDING_LABELS.road}
                    </span>
                  </div>
                )}
                {buildings.length === 0 && roads === 0 && <div className="map-panel__tooltip-empty">No buildings yet.</div>}
              </div>
            );
          })()}
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
