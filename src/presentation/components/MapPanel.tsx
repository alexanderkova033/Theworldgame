import "./MapPanel.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import type { ProjectType } from "../../domain/construction/types";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import { NATIONS } from "../../domain/nations/nationData";
import { getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { getParty } from "../../domain/parties/partyRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding, Terrain } from "../../domain/provinces/types";
import { RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { RESOURCE_TYPES } from "../../domain/resources/types";
import { BUILDING_COLORS, BuildingIcon } from "./BuildingIcon";
import { NATION_SHAPES } from "../nationFrontiers";
import { starPoints } from "./iconShapes";
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
  education: "School",
  granary: "Granary",
  cannery: "Cannery",
  housing: "Homes",
};

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  selectedProvinceId: string;
  onSelectProvince: (provinceId: string) => void;
  scoutedIslandIds: string[];
  expeditionIslandIds: string[]; // islands with an expedition currently in progress
  selectedIslandId: string | null;
  onSelectIsland: (islandId: string) => void;
  foreignRulers: Record<string, string>; // nationId -> ruling party id, for every nation but the player's
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

// A terrain-colored wash underneath that texture (blended with multiply,
// so it darkens/tints rather than washing out the nation's color) — the
// two together read as an actual colored terrain instead of a flat
// political fill with a pattern stamped on it. Pushed richer/more
// saturated than a subtle relief hint so the base color itself already
// reads as forest/hill/plain/coast before the scattered props on top.
const TERRAIN_TINT: Record<Terrain, string> = {
  hills: "#63492c",
  forest: "#123a20",
  coast: "#256782",
  plains: "#8f741f",
};

// Each road built thickens the single line to its province (instead of
// fanning out extra parallel lines) — a "×N" badge carries the exact count
// so the line itself never has to turn into a tangle to stay informative.
// A brighter shade of a nation's color for its border band, so the band
// stands out against the nation's own fill.
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount);
  };
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

const ROAD_BASE_WIDTH = 2.5;
const ROAD_WIDTH_PER_ROAD = 1.1;
const ROAD_MAX_WIDTH = 9;

function roadLineWidth(count: number): number {
  return Math.min(ROAD_BASE_WIDTH + count * ROAD_WIDTH_PER_ROAD, ROAD_MAX_WIDTH);
}

// The capital marker: a drawn five-point star (not the "★" glyph — that
// renders as a flat, font-dependent blob at the small sizes the map uses),
// using the same star math as BuildingIcon/StatIcon/StartScreen's crests.
function CapitalBadge({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={6.4} fill="#2a1f10" stroke="#f0c869" strokeWidth={0.9} opacity={0.92} />
      <polygon points={starPoints(x, y, 4.4, 1.9)} fill="#f0c869" stroke="#7a5a1e" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
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
const DRAG_CLICK_THRESHOLD = 6; // total pixels of movement from the initial press before a drag stops counting as a click
const LABEL_ZOOM_THRESHOLD = 1.5; // zoomRatio past which every province gets its name label, not just the focused one

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

interface MapLayersProps {
  nation: Nation;
  buildingsByProvince: Map<string, PlacedBuilding[]>;
  roadCountByProvince: Map<string, number>;
  selectedProvinceId: string;
  hoveredProvinceId: string | null;
  zoomedIn: boolean; // past LABEL_ZOOM_THRESHOLD: every province labeled, nation names hidden
  scoutedIslandIds: string[];
  expeditionIslandIds: string[];
  selectedIslandId: string | null;
  foreignRulers: Record<string, string>;
  onProvinceClick: (provinceId: string) => void;
  onProvinceKeySelect: (provinceId: string) => void;
  onIslandClick: (islandId: string) => void;
  onHoverProvince: Dispatch<SetStateAction<string | null>>;
}

// Everything drawn on the map, as its own memoized component: panning and
// zooming only change the <svg>'s viewBox in MapPanel, so none of these
// hundreds of nodes are re-rendered while the map moves — only when what's
// on it changes (a building, a selection, a hover, crossing the label zoom).
const MapLayers = memo(function MapLayers({
  nation,
  buildingsByProvince,
  roadCountByProvince,
  selectedProvinceId,
  hoveredProvinceId,
  zoomedIn,
  scoutedIslandIds,
  expeditionIslandIds,
  selectedIslandId,
  foreignRulers,
  onProvinceClick,
  onProvinceKeySelect,
  onIslandClick,
  onHoverProvince,
}: MapLayersProps) {
  const { coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);

  return (
    <>
    <defs>
      <radialGradient id="ocean-gradient" cx="50%" cy="40%" r="75%">
        <stop offset="0%" stopColor="#1e3a52" />
        <stop offset="100%" stopColor="#101d29" />
      </radialGradient>
      {/* Each nation's shape, to keep its border band on its own side
          of the frontier. */}
      {NATION_SHAPES.map((shape) => (
        <clipPath id={`nation-clip-${shape.nationId}`} key={shape.nationId}>
          <path d={shape.outline} />
        </clipPath>
      ))}

      {/* Open-sea texture: soft, wide-set swells across the whole
          ocean, distinct from the tighter shoreline ripples in
          terrain-coast, so the water reads as alive everywhere, not
          just at the water's edge. */}
      <pattern id="ocean-swell" width={140} height={90} patternUnits="userSpaceOnUse">
        <path d="M-10,20 Q25,4 60,20 T130,20" stroke="#3a7093" strokeWidth={1.6} fill="none" opacity={0.16} />
        <path d="M-10,55 Q25,39 60,55 T130,55" stroke="#3a7093" strokeWidth={1.4} fill="none" opacity={0.12} />
        <path d="M15,80 Q50,66 85,80 T155,80" stroke="#3a7093" strokeWidth={1.2} fill="none" opacity={0.1} />
      </pattern>

      {/* Terrain textures — scattered props (pine, boulder, wheat,
          surf) instead of a flat relief hint, but kept sparse, thin-
          stroked, and low-opacity so they read as a quiet landscape
          cue rather than competing with the map's political color and
          icons. */}
      <pattern id="terrain-hills" width={100} height={90} patternUnits="userSpaceOnUse">
        <ellipse cx={20} cy={50} rx={11} ry={5} fill="#4a3a24" opacity={0.35} />
        <ellipse cx={20} cy={46} rx={13} ry={9} fill="#7a6a52" stroke="#241c10" strokeWidth={0.8} opacity={0.8} />
        <ellipse cx={16} cy={41} rx={6} ry={3.5} fill="#a89877" opacity={0.4} />
      </pattern>
      <pattern id="terrain-forest" width={90} height={90} patternUnits="userSpaceOnUse">
        <rect x={14.5} y={54} width={3} height={4} fill="#4a3320" opacity={0.75} />
        <polygon points="7,54 25,54 16,42" fill="#2d6b3a" stroke="#12291a" strokeWidth={0.7} opacity={0.75} />
        <polygon points="9,47 23,47 16,37" fill="#34793f" stroke="#12291a" strokeWidth={0.7} opacity={0.75} />
        <polygon points="11,41 21,41 16,32" fill="#3d8a48" stroke="#12291a" strokeWidth={0.7} opacity={0.75} />
        <polygon points="16,34 18,40 15,40" fill="#7ecf86" opacity={0.3} />
      </pattern>
      <pattern id="terrain-coast" width={40} height={22} patternUnits="userSpaceOnUse">
        <path d="M0,11 Q10,3 20,11 T40,11" stroke="#d8f2fa" strokeWidth={1.6} fill="none" opacity={0.35} strokeLinecap="round" />
        <path d="M0,18 Q10,12 20,18 T40,18" stroke="#d8f2fa" strokeWidth={1.2} fill="none" opacity={0.2} strokeLinecap="round" />
      </pattern>
      <pattern id="terrain-plains" width={50} height={50} patternUnits="userSpaceOnUse">
        <path d="M10,30 Q7,22 5,14" stroke="#c9a23a" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.65} />
        <ellipse cx={5} cy={13} rx={1.4} ry={2.6} fill="#d9b846" opacity={0.65} />
        <path d="M10,30 Q10,20 9,10" stroke="#d9b846" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.65} />
        <ellipse cx={9} cy={9} rx={1.4} ry={2.8} fill="#e8c860" opacity={0.65} />
        <path d="M10,30 Q13,22 15,14" stroke="#c9a23a" strokeWidth={1} fill="none" strokeLinecap="round" opacity={0.65} />
        <ellipse cx={15} cy={13} rx={1.4} ry={2.6} fill="#d9b846" opacity={0.65} />
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

    {/* Shallow water: a soft halo hugging every coastline,
        plus a thin surf line right at the water's edge — drawn before
        any land fill, so the fill's inner half covers it and only the
        water-side sliver shows through. Reads as an actual sea meeting
        an actual shore instead of a flat shape dropped on blue. */}
    <g pointerEvents="none">
      <path d={coastPath} className="map-panel__shallows" />
      <path d={coastPath} className="map-panel__shallows map-panel__shallows--near" />
      {otherLandmasses.map((land) => (
        <path key={`${land.id}-shallows`} d={land.path} className="map-panel__shallows" />
      ))}
      <path d={coastPath} className="map-panel__surf" />
      {otherLandmasses.map((land) => (
        <path key={`${land.id}-surf`} d={land.path} className="map-panel__surf" />
      ))}
    </g>

    {/* A shadow under all land: the same shapes, offset and dark —
        no blur filter, so panning never re-rasterizes it. */}
    <g className="map-panel__land-shadow" transform="translate(0 5)" pointerEvents="none">
      <path d={coastPath} />
      {otherLandmasses.map((land) => (
        <path key={`${land.id}-shadow`} d={land.path} />
      ))}
    </g>

    {/* Other landmasses: unowned, but chartable via ventures. */}
    <g>
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
            onClick={() => onIslandClick(land.id)}
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

    <g>
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
            onClick={isOwned ? () => onProvinceClick(province.id) : undefined}
            tabIndex={isOwned ? 0 : undefined}
            role={isOwned ? "button" : undefined}
            aria-label={isOwned ? `${province.name}${isSelected ? ", selected" : ""}` : undefined}
            aria-pressed={isOwned ? isSelected : undefined}
            onKeyDown={
              isOwned
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onProvinceKeySelect(province.id);
                    }
                  }
                : undefined
            }
            onMouseEnter={isOwned ? () => onHoverProvince(province.id) : undefined}
            onMouseLeave={isOwned ? () => onHoverProvince((prev) => (prev === province.id ? null : prev)) : undefined}
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
            opacity={isOwned ? 0.3 : 0.18}
            className="map-panel__terrain-tint"
            pointerEvents="none"
          />
        );
      })}

      {/* Terrain props for every province — a quiet landscape cue
          (sparse trees/rocks/wheat/surf), not a competing pattern.
          Owned provinces get them a little clearer, foreign ones
          quieter still. */}
      {provinces.map((province) => {
        const isOwned = nation.provinceIds.includes(province.id);
        return (
          <path
            key={`${province.id}-terrain`}
            d={province.path}
            fill={TERRAIN_PATTERN[province.terrain]}
            opacity={isOwned ? 0.65 : 0.35}
            pointerEvents="none"
          />
        );
      })}
    </g>

    {/* National frontiers: a band in each nation's (brightened) color
        just inside its outer edge, so who owns what reads at a glance
        even where two nations' fills sit side by side. */}
    <g pointerEvents="none">
      {NATION_SHAPES.map((shape) => (
        <path
          key={`${shape.nationId}-border`}
          d={shape.frontier}
          clipPath={`url(#nation-clip-${shape.nationId})`}
          stroke={lighten(shape.color, shape.nationId === nation.id ? 0.45 : 0.3)}
          className="map-panel__nation-border"
        />
      ))}
      {NATION_SHAPES.map((shape) => (
        <path key={`${shape.nationId}-frontier`} d={shape.frontier} className="map-panel__nation-frontier" />
      ))}
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

    {/* Big, spaced-out nation names across each country (EU4-style),
        with the party currently ruling each neighbor underneath. They
        give way to the per-province labels once zoomed in. */}
    {!zoomedIn && (
      <g pointerEvents="none">
        {NATION_SHAPES.map((shape) => {
          const isYou = shape.nationId === nation.id;
          const rulerId = foreignRulers[shape.nationId];
          const ruler = rulerId ? getParty(rulerId) : null;
          return (
            <g key={`${shape.nationId}-name`}>
              <text x={shape.labelX} y={shape.labelY - 34} className={`map-panel__nation-name ${isYou ? "is-you" : ""}`}>
                {shape.name}
              </text>
              {ruler && (
                <text x={shape.labelX} y={shape.labelY - 16} className="map-panel__nation-party" style={{ fill: lighten(ruler.color, 0.35) }}>
                  {ruler.name}
                </text>
              )}
            </g>
          );
        })}
      </g>
    )}

    {provinces.map((province) => {
      const isCapital = province.id === nation.capitalProvinceId;
      // The continent packs a lot of small provinces close together —
      // at the fully-zoomed-out default view, every name label at full
      // size collides with its neighbors into unreadable clutter,
      // so only the province the player's attention is already on
      // (selected/hovered) stays labeled until they zoom in past
      // LABEL_ZOOM_THRESHOLD, same as EU4/HOI4-style province maps.
      const isFocused = province.id === selectedProvinceId || province.id === hoveredProvinceId;
      const showLabel = isCapital || isFocused || zoomedIn;
      if (!showLabel) return null;
      return (
        <g key={`${province.id}-label`}>
          {isCapital && <CapitalBadge x={province.labelX} y={province.labelY - 13} />}
          <text
            x={province.labelX}
            y={province.labelY}
            className={`map-panel__label ${nation.provinceIds.includes(province.id) ? "" : "is-foreign"}`}
            pointerEvents="none"
          >
            {province.name}
          </text>
        </g>
      );
    })}

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
      const brokenCount = buildings.filter((b) => !isWorking(b)).length;

      const itemWidth = 20;
      const itemCount = 1 + buildingTypes.length + (brokenCount > 0 ? 1 : 0); // resource + one slot per building type present + a broken marker
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
          {brokenCount > 0 && (
            <g>
              <circle cx={barX + itemWidth * (buildingTypes.length + 1) + itemWidth / 2 + 3} cy={itemCenterY} r={7} className="map-panel__broken-marker" />
              <text x={barX + itemWidth * (buildingTypes.length + 1) + itemWidth / 2 + 3} y={itemCenterY + 3.5} className="map-panel__broken-count">
                !
              </text>
            </g>
          )}
        </g>
      );
    })}
    </>
  );
});

// Memoized: the map is by far the heaviest thing on screen (hundreds of SVG
// nodes and patterns), but it only depends on which buildings
// exist and what's selected — none of which change on an ordinary daily
// tick. Without this it re-rendered up to 5x/second at 5x game speed purely
// because the treasury number moved.
export const MapPanel = memo(function MapPanel({
  nation,
  placedBuildings,
  selectedProvinceId,
  onSelectProvince,
  scoutedIslandIds,
  expeditionIslandIds,
  selectedIslandId,
  onSelectIsland,
  foreignRulers,
}: MapPanelProps) {
  const { provinces } = MAP_GEOMETRY;

  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewBox>(BASE_VIEW);
  const zoomRatio = BASE_VIEW.width / view.width;
  // dragOrigin is the original pointerdown position, used only to decide
  // "was this whole gesture a click or a drag" — dragStart is the *last*
  // move position, used for incremental pan deltas. Keeping these separate
  // matters: comparing each move only to the previous move (as this used to
  // do) means ordinary hand jitter during a plain click — a couple of
  // pixels this way, a couple back — can cross the threshold on a single
  // small step and silently swallow the click, even though the pointer
  // never actually traveled far from where it went down.
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClick = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

  // A custom hover tooltip for owned provinces — richer than the browser's
  // native <title> (name/owner only): terrain, produced resource, and every
  // building actually standing there, in one place instead of only as
  // small icons on the map itself.
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  // The tooltip's position is written straight to its element on every
  // mouse move — keeping it in state re-rendered the whole map each time.
  const tooltipPos = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // The legend is a lot of content (every nation, building type, and raw
  // resource) — collapsed by default so it doesn't sit permanently on top of
  // the map, and toggled from a small corner button instead, HOI4-outliner
  // style.
  const [showLegend, setShowLegend] = useState(false);

  function handleStageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    tooltipPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${tooltipPos.current.x + 18}px`;
      tooltipRef.current.style.top = `${tooltipPos.current.y + 18}px`;
    }
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
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    dragStart.current = { x: e.clientX, y: e.clientY };
    // A drag that ends over a non-clickable spot (ocean, another island, an
    // unowned province) never gets its suppression flag consumed by a click
    // handler, leaving it stuck true and silently swallowing the *next*
    // gesture's click even though that's an unrelated, deliberate click.
    // Each new gesture should decide suppression on its own merits.
    suppressNextClick.current = false;
    // Deliberately NOT calling setPointerCapture here: capturing on the SVG
    // root at pointerdown retargets the browser's *click* event to the SVG
    // element itself instead of whatever <path> is under the cursor (this is
    // real Chromium/Edge behavior, not a hypothetical), so every province's
    // onClick would silently stop firing — the map would look normal but no
    // click would ever select anything. Capture is only needed once a
    // gesture is confirmed to be a drag (see handlePointerMove), by which
    // point suppressNextClick already ensures the resulting click is a
    // no-op regardless of what it's retargeted to.
    setHoveredProvinceId(null);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragStart.current) return;
    const dxPixels = e.clientX - dragStart.current.x;
    const dyPixels = e.clientY - dragStart.current.y;

    if (dragOrigin.current) {
      const totalDx = e.clientX - dragOrigin.current.x;
      const totalDy = e.clientY - dragOrigin.current.y;
      if (Math.hypot(totalDx, totalDy) > DRAG_CLICK_THRESHOLD) {
        if (!suppressNextClick.current) {
          svgRef.current?.setPointerCapture(e.pointerId);
        }
        suppressNextClick.current = true;
        setIsPanning(true);
      }
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

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    dragOrigin.current = null;
    dragStart.current = null;
    setIsPanning(false);
  }

  const handleProvinceClick = useCallback(
    (provinceId: string) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        return;
      }
      onSelectProvince(provinceId);
    },
    [onSelectProvince],
  );

  const handleIslandClick = useCallback(
    (islandId: string) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        return;
      }
      onSelectIsland(islandId);
    },
    [onSelectIsland],
  );

  function zoomBy(factor: number) {
    setView((vb) => {
      const cx = vb.x + vb.width / 2;
      const cy = vb.y + vb.height / 2;
      const newWidth = vb.width * factor;
      const newHeight = newWidth * (BASE_VIEW.height / BASE_VIEW.width);
      return clampViewBox({ x: cx - newWidth / 2, y: cy - newHeight / 2, width: newWidth, height: newHeight });
    });
  }

  // Rebuilt only when a building actually completes — not on every pan,
  // zoom, or hover, all of which re-render this component.
  const { buildingsByProvince, roadCountByProvince } = useMemo(() => {
    const byProvince = new Map<string, PlacedBuilding[]>();
    const roads = new Map<string, number>();
    for (const building of placedBuildings) {
      if (building.type === "road") {
        roads.set(building.provinceId, (roads.get(building.provinceId) ?? 0) + 1);
        continue;
      }
      const list = byProvince.get(building.provinceId) ?? [];
      list.push(building);
      byProvince.set(building.provinceId, list);
    }
    return { buildingsByProvince: byProvince, roadCountByProvince: roads };
  }, [placedBuildings]);

  return (
    <section className="map-panel">
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
          <MapLayers
            nation={nation}
            buildingsByProvince={buildingsByProvince}
            roadCountByProvince={roadCountByProvince}
            selectedProvinceId={selectedProvinceId}
            hoveredProvinceId={hoveredProvinceId}
            zoomedIn={zoomRatio > LABEL_ZOOM_THRESHOLD}
            scoutedIslandIds={scoutedIslandIds}
            expeditionIslandIds={expeditionIslandIds}
            selectedIslandId={selectedIslandId}
            foreignRulers={foreignRulers}
            onProvinceClick={handleProvinceClick}
            onProvinceKeySelect={onSelectProvince}
            onIslandClick={handleIslandClick}
            onHoverProvince={setHoveredProvinceId}
          />
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
              <div className="map-panel__tooltip" ref={tooltipRef} style={{ left: tooltipPos.current.x + 18, top: tooltipPos.current.y + 18 }}>
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
                {buildings.some((b) => !isWorking(b)) && (
                  <div className="map-panel__tooltip-row map-panel__tooltip-broken">
                    {buildings.filter((b) => !isWorking(b)).length} broken — repair from the Economy tab
                  </div>
                )}
                {buildings.length === 0 && roads === 0 && <div className="map-panel__tooltip-empty">No buildings yet.</div>}
              </div>
            );
          })()}

        <button
          type="button"
          className={`map-panel__legend-toggle ${showLegend ? "is-active" : ""}`}
          onClick={() => setShowLegend((v) => !v)}
          aria-expanded={showLegend}
        >
          Legend
        </button>

        {showLegend && (
          <div className="map-panel__legend">
            {NATIONS.map((n) => (
              <span key={n.id} className={`map-panel__legend-item ${n.id === nation.id ? "is-you" : ""}`} title={n.name}>
                <span className="map-panel__legend-swatch" style={{ backgroundColor: n.color }} />
                {n.name}
              </span>
            ))}
            {(Object.keys(BUILDING_COLORS) as ProjectType[]).map((type) => (
              <span key={type} className="map-panel__legend-item" title={BUILDING_LABELS[type]}>
                <svg width={20} height={20} viewBox="-9 -9 18 18" className="map-panel__legend-icon">
                  <BuildingIcon type={type} x={0} y={0} size={5.5} />
                </svg>
                {BUILDING_LABELS[type]}
              </span>
            ))}
            {RESOURCE_TYPES.map((type) => (
              <span key={type} className="map-panel__legend-item" title={RESOURCE_LABELS[type]}>
                <svg width={20} height={20} viewBox="-9 -9 18 18" className="map-panel__legend-icon">
                  <ResourceIcon type={type} size={7.5} />
                </svg>
                {RESOURCE_LABELS[type]}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
