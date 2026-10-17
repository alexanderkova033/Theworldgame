import "./MapPanel.css";
import { flushSync } from "react-dom";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
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
import type { ProvinceOverview, ProvinceStatus } from "../../application/getProvinceOverview";
import { formatAmount } from "../formatNumber";
import { UNREST_INFO } from "../unrestStages";
import { JobsIcon, UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";

const TERRAIN_LABELS: Record<Terrain, string> = {
  hills: "Hills",
  forest: "Forest",
  coast: "Coast",
  plains: "Plains",
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  coal: "Coal",
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
  venturesOpen: boolean; // islands can be chartered (see domain/chapters)
  foreignRulers: Record<string, string>; // nationId -> ruling party id, for every nation but the player's
  provinceStatus: Record<string, ProvinceStatus>; // coarse flags for the info bars — stable between flips, so the map isn't redrawn daily
  provinceOverview: ProvinceOverview[]; // today's numbers, for the tooltip only
  problemCount: number; // provinces that need the player (see getTroubledProvinces)
  onNextProblem: () => void; // select the next of them and open its card
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

// A faint terrain wash over the nation's own watercolour, like a second
// pass of the brush: umber hills, green forest, wheat-gold plains, sea-grey
// coast. The pen symbols on top carry the terrain; this only warms it.
const TERRAIN_TINT: Record<Terrain, string> = {
  hills: "#7a5428",
  forest: "#2f5a26",
  coast: "#3d6f86",
  plains: "#c79a2e",
};

// Each road built thickens the single line to its province (instead of
// fanning out extra parallel lines) — a "×N" badge carries the exact count
// so the line itself never has to turn into a tangle to stay informative.
// A colour pushed toward the ink, so a pale party colour still reads as
// lettering on the paper.
function inkier(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ink = [0x2b, 0x1d, 0x12];
  const channel = (shift: number, i: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (ink[i] - c) * amount);
  };
  return `rgb(${channel(16, 0)}, ${channel(8, 1)}, ${channel(0, 2)})`;
}

// The watercolour a nation is washed in: its own hue at a soft, faded
// mid tone, as old hand-colouring has aged. A dark crest colour laid thin
// over the paper would only turn grey; a bright one would glare.
function washColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff].map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return `hsl(${Math.round(h * 60 + 360) % 360}, 32%, 50%)`;
}

// Water-lining, as engravers drew it: rings of fine lines following the
// coast outward, closer together near the shore. Each ring is a wide ink
// stroke with a slightly narrower sea-coloured one over it, leaving a line.
const WATERLINES = [
  { width: 64, opacity: 0.22 },
  { width: 48, opacity: 0.3 },
  { width: 34, opacity: 0.38 },
  { width: 22, opacity: 0.48 },
  { width: 12, opacity: 0.6 },
];

function Waterlines({ d }: { d: string }) {
  return (
    <>
      {WATERLINES.map((ring) => (
        <g key={ring.width}>
          <path d={d} className="map-panel__waterline" style={{ strokeWidth: ring.width, strokeOpacity: ring.opacity }} />
          <path d={d} className="map-panel__waterline-gap" style={{ strokeWidth: ring.width - 2.2 }} />
        </g>
      ))}
    </>
  );
}

// A compass rose in open water, the way every chart of the day carried one.
const COMPASS = { x: 1330, y: 480, r: 62 };

function CompassRose() {
  const { x, y, r } = COMPASS;
  const point = (angle: number, length: number, half: number) => {
    const rad = (angle * Math.PI) / 180;
    const tip = [x + Math.sin(rad) * length, y - Math.cos(rad) * length];
    const left = [x + Math.sin(rad - Math.PI / 2) * half, y - Math.cos(rad - Math.PI / 2) * half];
    const right = [x + Math.sin(rad + Math.PI / 2) * half, y - Math.cos(rad + Math.PI / 2) * half];
    return (
      <g key={angle}>
        <polygon points={`${x},${y} ${tip.join(",")} ${left.join(",")}`} className="map-panel__compass-dark" />
        <polygon points={`${x},${y} ${tip.join(",")} ${right.join(",")}`} className="map-panel__compass-light" />
      </g>
    );
  };
  return (
    <g pointerEvents="none" aria-hidden="true">
      <circle cx={x} cy={y} r={r} className="map-panel__compass-ring" />
      <circle cx={x} cy={y} r={r - 6} className="map-panel__compass-ring" />
      {[45, 135, 225, 315].map((a) => point(a, r * 0.72, 7))}
      {[0, 90, 180, 270].map((a) => point(a, r * 1.18, 11))}
      <circle cx={x} cy={y} r={4} className="map-panel__compass-hub" />
      <text x={x} y={y - r * 1.18 - 8} className="map-panel__compass-north">
        N
      </text>
    </g>
  );
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
const NATION_NAME_SIZE = 34;
const NATION_NAME_MIN_SIZE = 20;
const NATION_NAME_SPACING = 0.16; // em, as in .map-panel__nation-name
const NATION_NAME_FILL = 0.86; // share of the land's width the name may take

// A nation's name across its land, shrunk to fit if the country is narrow,
// with the ruling party underneath; the pair is centred on (x, y). Letter
// spacing adds a gap after the last letter too, so the name is nudged
// right by half a gap to sit truly in the middle.
function NationName({ x, y, width, name, isYou, party }: { x: number; y: number; width: number; name: string; isYou: boolean; party: { name: string; fill: string } | null }) {
  const ref = useRef<SVGTextElement>(null);
  const [size, setSize] = useState(NATION_NAME_SIZE);
  useLayoutEffect(() => {
    const fit = () => {
      const text = ref.current;
      if (!text) return;
      const shown = text.style.fontSize;
      text.style.fontSize = `${NATION_NAME_SIZE}px`;
      const natural = text.getComputedTextLength();
      text.style.fontSize = shown;
      const room = width * NATION_NAME_FILL;
      setSize(natural > room ? Math.max(NATION_NAME_MIN_SIZE, (NATION_NAME_SIZE * room) / natural) : NATION_NAME_SIZE);
    };
    fit();
    // The display face may still be loading; measure again once it has.
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    return () => {
      live = false;
    };
  }, [name, width]);
  const nameY = party ? y - 9 : y;
  return (
    <g>
      <text
        ref={ref}
        x={x}
        y={nameY}
        dx={(size * NATION_NAME_SPACING) / 2}
        dominantBaseline="central"
        className={`map-panel__nation-name ${isYou ? "is-you" : ""}`}
        style={{ fontSize: size }}
      >
        {name}
      </text>
      {party && (
        <text x={x} y={nameY + size * 0.5 + 10} dominantBaseline="central" className="map-panel__nation-party" style={{ fill: party.fill }}>
          {party.name}
        </text>
      )}
    </g>
  );
}

function CapitalBadge({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={6.4} fill="#7b2121" stroke="#2b1d12" strokeWidth={0.9} />
      <polygon points={starPoints(x, y, 4.4, 1.9)} fill="#e2c27a" stroke="#561414" strokeWidth={0.5} strokeLinejoin="round" />
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
const WHEEL_SETTLE_MS = 140; // a wheel pause this long ends the gesture and redraws the map at its new zoom
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
  provinceStatus: Record<string, ProvinceStatus>;
  mapMode: MapMode;
  onProvinceClick: (provinceId: string) => void;
  onProvinceKeySelect: (provinceId: string) => void;
  onIslandClick: (islandId: string) => void;
  venturesOpen: boolean;
  onHoverProvince: Dispatch<SetStateAction<string | null>>;
}

// A homes or jobs flag in a province's info bar: amber when it's tight,
// red with a "!" when people there are without a home or without work.
function StatusFlag({ kind, level, cx, cy }: { kind: "homes" | "jobs"; level: "warn" | "alert"; cx: number; cy: number }) {
  const className = `map-panel__status-flag is-${level}`;
  return (
    <g>
      {kind === "homes" ? (
        <>
          <polygon points={`${cx - 6},${cy - 0.5} ${cx},${cy - 6.5} ${cx + 6},${cy - 0.5}`} className={className} />
          <rect x={cx - 4.5} y={cy - 0.5} width={9} height={6.5} className={className} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy - 3.5} r={2.7} className={className} />
          <path d={`M${cx - 5},${cy + 6} C${cx - 5},${cy - 0.5} ${cx + 5},${cy - 0.5} ${cx + 5},${cy + 6} Z`} className={className} />
        </>
      )}
      {level === "alert" && (
        <>
          <circle cx={cx + 5.5} cy={cy - 5} r={4} className="map-panel__status-alert" />
          <text x={cx + 5.5} y={cy - 2} className="map-panel__status-alert-mark">
            !
          </text>
        </>
      )}
    </g>
  );
}

type MapMode = "political" | "homes" | "jobs" | "unrest";
type ModeLevel = "ok" | "warn" | "alert";

const MODE_COLORS: Record<ModeLevel, string> = { ok: "#93a878", warn: "#cfa760", alert: "#b8694f" };

// Each mode's three steps, and what they mean.
const MAP_MODES: Array<{ key: MapMode; label: string; levels?: Record<ModeLevel, string> }> = [
  { key: "political", label: "Nations" },
  { key: "homes", label: "Homes", levels: { ok: "Room to grow", warn: "Nearly full", alert: "People without a home" } },
  { key: "jobs", label: "Jobs", levels: { ok: "Work for all", warn: "Jobs unfilled", alert: "Jobless" } },
  { key: "unrest", label: "Unrest", levels: { ok: "Calm", warn: "Discontent", alert: "Strikes or riots" } },
];

function getModeLevel(mode: MapMode, status: ProvinceStatus): ModeLevel {
  if (mode === "homes") return status.homes === "over" ? "alert" : status.homes === "full" ? "warn" : "ok";
  if (mode === "jobs") return status.jobs === "jobless" ? "alert" : status.jobs === "short" ? "warn" : "ok";
  return status.stage === "calm" ? "ok" : status.stage === "discontent" ? "warn" : "alert";
}

// A legend swatch drawing the same colour and hatching as the map.
function ModeSwatch({ level }: { level: ModeLevel }) {
  return (
    <svg width={18} height={14} viewBox="0 0 18 14" aria-hidden="true">
      <rect x={0.5} y={0.5} width={17} height={13} rx={2} fill={MODE_COLORS[level]} stroke="#2b1d12" />
      {level !== "ok" && (
        <g stroke="#2b1d12" strokeWidth={1.6} opacity={0.6}>
          <line x1={-2} y1={14} x2={12} y2={0} />
          <line x1={6} y1={14} x2={20} y2={0} />
          {level === "alert" && (
            <>
              <line x1={-2} y1={0} x2={12} y2={14} />
              <line x1={6} y1={0} x2={20} y2={14} />
            </>
          )}
        </g>
      )}
    </svg>
  );
}

type FlagKey = "homesFull" | "homesOver" | "jobsShort" | "jobsJobless" | "discontent" | "strikes" | "riots";

// The legend's key to the province flags — drawn with the very glyphs the
// info bars use.
const FLAG_LEGEND: Array<{ key: FlagKey; label: string; hint: string; glyph: ReactNode }> = [
  { key: "homesOver", label: "People without a home", hint: "1% or more of the people here have no home. Build homes here.", glyph: <svg width={22} height={22} viewBox="-10 -10 20 20" className="map-panel__legend-icon" aria-hidden="true"><StatusFlag kind="homes" level="alert" cx={-1} cy={1} /></svg> },
  { key: "homesFull", label: "Homes nearly full", hint: "95% of the places here are taken, so there's no room to grow.", glyph: <svg width={22} height={22} viewBox="-10 -10 20 20" className="map-panel__legend-icon" aria-hidden="true"><StatusFlag kind="homes" level="warn" cx={0} cy={1} /></svg> },
  { key: "jobsJobless", label: "Jobless", hint: "10% or more of the workers here have no job. Build workplaces here.", glyph: <svg width={22} height={22} viewBox="-10 -10 20 20" className="map-panel__legend-icon" aria-hidden="true"><StatusFlag kind="jobs" level="alert" cx={-1} cy={1} /></svg> },
  { key: "jobsShort", label: "Jobs unfilled", hint: "5% or more of the jobs here have nobody to do them. Homes here would bring workers.", glyph: <svg width={22} height={22} viewBox="-10 -10 20 20" className="map-panel__legend-icon" aria-hidden="true"><StatusFlag kind="jobs" level="warn" cx={0} cy={1} /></svg> },
  { key: "discontent", label: "Discontent", hint: UNREST_INFO.discontent.effect, glyph: <UnrestStageIcon stage="discontent" size={22} /> },
  { key: "strikes", label: "Strikes", hint: UNREST_INFO.strikes.effect, glyph: <UnrestStageIcon stage="strikes" size={22} /> },
  {
    key: "riots",
    label: "Riots",
    hint: "A province rioting on its own wrecks its buildings and drags national stability down",
    glyph: <UnrestStageIcon stage="riots" size={22} />,
  },
];

function countFlags(status: Record<string, ProvinceStatus>): Record<FlagKey, number> {
  const counts: Record<FlagKey, number> = { homesFull: 0, homesOver: 0, jobsShort: 0, jobsJobless: 0, discontent: 0, strikes: 0, riots: 0 };
  for (const s of Object.values(status)) {
    if (s.homes === "over") counts.homesOver++;
    if (s.homes === "full") counts.homesFull++;
    if (s.jobs === "jobless") counts.jobsJobless++;
    if (s.jobs === "short") counts.jobsShort++;
    if (s.stage !== "calm") counts[s.stage]++;
  }
  return counts;
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
  provinceStatus,
  mapMode,
  onProvinceClick,
  onProvinceKeySelect,
  onIslandClick,
  venturesOpen,
  onHoverProvince,
}: MapLayersProps) {
  const { coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;
  const capital = provinces.find((p) => p.id === nation.capitalProvinceId);

  return (
    <>
    <defs>
      {/* Each nation's shape, to keep its border band on its own side
          of the frontier. */}
      {NATION_SHAPES.map((shape) => (
        <clipPath id={`nation-clip-${shape.nationId}`} key={shape.nationId}>
          <path d={shape.outline} />
        </clipPath>
      ))}

      {/* The open sea, engraved: fine level lines ruled across the whole
          chart, broken here and there by a little stroke of swell. */}
      <pattern id="ocean-engraving" width={120} height={12} patternUnits="userSpaceOnUse">
        <line x1={0} y1={6} x2={120} y2={6} stroke="#4c6a78" strokeWidth={0.7} opacity={0.32} />
      </pattern>
      <pattern id="ocean-swell" width={260} height={150} patternUnits="userSpaceOnUse">
        <path d="M20,40 q10,-6 20,0 t20,0" stroke="#3e5a68" strokeWidth={1} fill="none" opacity={0.4} strokeLinecap="round" />
        <path d="M150,115 q10,-6 20,0 t20,0" stroke="#3e5a68" strokeWidth={1} fill="none" opacity={0.4} strokeLinecap="round" />
      </pattern>

      {/* Terrain, drawn as an engraver would, each with its own shape so the
          four tell apart even without their colour: rows of shaded molehills,
          clumps of round trees, grass tufts over faint furrows, and the short
          level dashes of salt-marsh along the coast. */}
      <pattern id="terrain-hills" width={84} height={60} patternUnits="userSpaceOnUse">
        {[
          [6, 24],
          [48, 54],
        ].map(([x, y]) => (
          <g key={x}>
            <path d={`M${x},${y} Q${x + 10},${y - 16} ${x + 20},${y}`} fill="#c2a473" stroke="#4a3826" strokeWidth={0.9} />
            <path d={`M${x + 12},${y - 8} L${x + 15},${y - 1} M${x + 15},${y - 5} L${x + 17},${y - 1}`} stroke="#4a3826" strokeWidth={0.7} />
          </g>
        ))}
      </pattern>
      <pattern id="terrain-forest" width={60} height={52} patternUnits="userSpaceOnUse">
        {[
          [12, 16, 5],
          [21, 13, 4.5],
          [44, 42, 5],
        ].map(([x, y, r]) => (
          <g key={x}>
            <path d={`M${x},${y + r} L${x},${y + r + 3.5}`} stroke="#4a3826" strokeWidth={0.8} />
            <circle cx={x} cy={y} r={r} fill="#7d8a60" stroke="#3a4228" strokeWidth={0.8} />
          </g>
        ))}
      </pattern>
      <pattern id="terrain-coast" width={48} height={22} patternUnits="userSpaceOnUse">
        <path d="M4,7 H16 M28,7 H40 M16,16 H28" stroke="#4f6670" strokeWidth={0.9} strokeLinecap="round" />
      </pattern>
      {/* Map-mode hatching: diagonal lines for "tight", a cross-hatch for
          "trouble" — so the shading never relies on colour alone. */}
      <pattern id="mode-hatch-warn" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={14} stroke="#2b1d12" strokeWidth={2.4} opacity={0.5} />
      </pattern>
      <pattern id="mode-hatch-alert" width={11} height={11} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1={0} y1={0} x2={0} y2={11} stroke="#2b1d12" strokeWidth={2.2} opacity={0.55} />
        <line x1={0} y1={0} x2={11} y2={0} stroke="#2b1d12" strokeWidth={2.2} opacity={0.55} />
      </pattern>
      <pattern id="terrain-plains" width={56} height={44} patternUnits="userSpaceOnUse">
        <path d="M8,14 L7,9 M10,14 L10,8 M12,14 L13,9 M38,38 L37,33 M40,38 L40,32 M42,38 L43,33" stroke="#5c4a24" strokeWidth={0.8} strokeLinecap="round" />
      </pattern>
    </defs>

    <rect x={OCEAN_RECT.x} y={OCEAN_RECT.y} width={OCEAN_RECT.width} height={OCEAN_RECT.height} className="map-panel__sea" />
    {["ocean-engraving", "ocean-swell"].map((id) => (
      <rect
        key={id}
        x={OCEAN_RECT.x}
        y={OCEAN_RECT.y}
        width={OCEAN_RECT.width}
        height={OCEAN_RECT.height}
        fill={`url(#${id})`}
        pointerEvents="none"
      />
    ))}

    <CompassRose />

    {/* Water-lining round every shore, then a blue wash along it, the way
        a colourist went over the coasts of a printed chart. All drawn
        before the land, so only the water side shows. */}
    <g pointerEvents="none">
      <Waterlines d={coastPath} />
      {otherLandmasses.map((land) => (
        <Waterlines key={`${land.id}-waterlines`} d={land.path} />
      ))}
      <path d={coastPath} className="map-panel__shallows" />
      {otherLandmasses.map((land) => (
        <path key={`${land.id}-shallows`} d={land.path} className="map-panel__shallows" />
      ))}
    </g>

    {/* Bare paper under the continent: each nation's colour is a
        translucent wash laid over it. */}
    <path d={coastPath} className="map-panel__land-paper" pointerEvents="none" />

    {/* Other landmasses: unowned, but chartable via ventures. */}
    <g>
      {otherLandmasses.map((land) => {
        const isScouted = scoutedIslandIds.includes(land.id);
        const isExpeditionActive = expeditionIslandIds.includes(land.id);
        const isSelected = land.id === selectedIslandId;
        const status = isScouted ? "charted" : isExpeditionActive ? "venture under way" : venturesOpen ? "uncharted: click to charter a venture" : "uncharted";
        return (
          <path
            key={land.id}
            d={land.path}
            className={[
              "map-panel__unclaimed-land",
              venturesOpen ? "map-panel__unclaimed-land--clickable" : "",
              isSelected ? "is-selected" : "",
            ].join(" ")}
            onClick={venturesOpen ? () => onIslandClick(land.id) : undefined}
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
        <path key={`${land.id}-terrain`} d={land.path} fill="url(#terrain-forest)" opacity={0.25} pointerEvents="none" />
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
            style={!isOwned ? { fill: owner ? washColor(owner.color) : "#a8946c" } : undefined}
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
            opacity={isOwned ? 0.08 : 0.06}
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
            opacity={isOwned ? 0.5 : 0.35}
            pointerEvents="none"
          />
        );
      })}

      {/* Map modes (HOI4-style): your provinces shaded by how their homes,
          jobs or order stand — three steps, each with its own hatching.
          Driven by the same coarse province status as the info-bar flags,
          so this only redraws when a province tips from one step to the
          next. No filters, just fills. */}
      {mapMode !== "political" &&
        provinces.map((province) => {
          const status = provinceStatus[province.id];
          // Other nations fade back, so their colours can't be read as a step.
          if (!status) return <path key={`${province.id}-mode`} d={province.path} fill="#c9b083" opacity={0.75} pointerEvents="none" />;
          const level = getModeLevel(mapMode, status);
          return (
            <g key={`${province.id}-mode`} pointerEvents="none">
              <path d={province.path} fill={MODE_COLORS[level]} opacity={0.6} />
              {level !== "ok" && <path d={province.path} fill={`url(#mode-hatch-${level})`} />}
            </g>
          );
        })}
    </g>

    {/* National frontiers: a deeper band of each nation's colour just
        inside its edge, as a colourist ran the brush along a border, and a
        dash-and-dot ink line on the frontier itself. */}
    <g pointerEvents="none">
      {NATION_SHAPES.map((shape) => (
        <path
          key={`${shape.nationId}-border`}
          d={shape.frontier}
          clipPath={`url(#nation-clip-${shape.nationId})`}
          stroke={shape.color}
          strokeOpacity={shape.nationId === nation.id ? 0.55 : 0.4}
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
            <NationName
              key={`${shape.nationId}-name`}
              x={shape.labelX}
              y={shape.labelY}
              width={shape.labelWidth}
              name={shape.name}
              isYou={isYou}
              party={ruler ? { name: ruler.name, fill: inkier(ruler.color, 0.3) } : null}
            />
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

    {/* Province info bar, on its own translucent backing so it reads
        clearly whatever lies underneath. Zoomed out, it appears only on a
        province with something wrong, and shows only that — broken
        buildings, short homes or work, unrest — so problems stand out
        instead of drowning among every province's buildings. Zoom in, or
        point at or pick a province, and it adds what the province
        produces and what's built there (one icon + a count per type). */}
    {provinces.map((province) => {
      if (!nation.provinceIds.includes(province.id)) return null;

      const buildings = buildingsByProvince.get(province.id) ?? [];
      const counts = new Map<ProjectType, number>();
      for (const building of buildings) {
        counts.set(building.type, (counts.get(building.type) ?? 0) + 1);
      }
      const buildingTypes = [...counts.keys()];
      const brokenCount = buildings.filter((b) => !isWorking(b)).length;
      // Only what's wrong gets a flag: tight or overflowing homes, short
      // or idle hands, unrest. A quiet province shows none.
      const status = provinceStatus[province.id];
      const flags: Array<"homes" | "jobs" | "stage"> = [];
      if (status && status.homes !== "ok") flags.push("homes");
      if (status && status.jobs !== "ok") flags.push("jobs");
      if (status && status.stage !== "calm") flags.push("stage");

      const showDetail = zoomedIn || province.id === selectedProvinceId || province.id === hoveredProvinceId;
      if (!showDetail && flags.length === 0 && brokenCount === 0) return null;
      const shownTypes = showDetail ? buildingTypes : [];
      const lead = showDetail ? 1 : 0; // the resource slot, when shown

      const itemWidth = 20;
      const itemCount = lead + shownTypes.length + (brokenCount > 0 ? 1 : 0) + flags.length; // resource + one slot per building type shown + a broken marker + the flags
      const barWidth = itemCount * itemWidth + 6;
      const barX = province.labelX - barWidth / 2;
      const barY = province.labelY + 10;
      const itemCenterY = barY + 11;

      return (
        <g key={`${province.id}-info`} pointerEvents="none">
          <rect x={barX} y={barY} width={barWidth} height={22} rx={5} className="map-panel__info-bar" />
          {showDetail && (
            <ResourceIcon
              type={RESOURCE_BY_TERRAIN[province.terrain]}
              x={barX + itemWidth / 2 + 3}
              y={itemCenterY}
              size={7}
            />
          )}
          {shownTypes.map((type, index) => {
            const cx = barX + itemWidth * (index + lead) + itemWidth / 2 + 3;
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
              <circle cx={barX + itemWidth * (shownTypes.length + lead) + itemWidth / 2 + 3} cy={itemCenterY} r={7} className="map-panel__broken-marker" />
              <text x={barX + itemWidth * (shownTypes.length + lead) + itemWidth / 2 + 3} y={itemCenterY + 3.5} className="map-panel__broken-count">
                !
              </text>
            </g>
          )}
          {flags.map((flag, index) => {
            const cx = barX + itemWidth * (lead + shownTypes.length + (brokenCount > 0 ? 1 : 0) + index) + itemWidth / 2 + 3;
            if (flag === "stage") {
              return (
                <g key={flag} transform={`translate(${cx - 7} ${itemCenterY - 7})`}>
                  <UnrestStageIcon stage={status.stage} size={14} />
                </g>
              );
            }
            const level = flag === "homes" ? (status.homes === "over" ? "alert" : "warn") : status.jobs === "jobless" ? "alert" : "warn";
            return <StatusFlag key={flag} kind={flag} level={level} cx={cx} cy={itemCenterY} />;
          })}
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
  venturesOpen,
  foreignRulers,
  provinceStatus,
  provinceOverview,
  problemCount,
  onNextProblem,
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
  // Until the legend has been opened once this session, the button points
  // at it with a "!" whenever a province flag is on the map.
  const [legendSeen, setLegendSeen] = useState(false);
  // Which map mode is showing — a view choice, not simulation truth.
  const [mapMode, setMapMode] = useState<MapMode>("political");
  const flagCounts = useMemo(() => countFlags(provinceStatus), [provinceStatus]);
  const anyFlags = Object.values(flagCounts).some((n) => n > 0);

  function handleStageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    tooltipPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${tooltipPos.current.x + 18}px`;
      tooltipRef.current.style.top = `${tooltipPos.current.y + 18}px`;
    }
  }

  // Panning and zooming never redraw the chart while the gesture is under
  // way: the drawn map is slid and scaled as a picture (a GPU transform),
  // and the real viewBox is set once, when the drag ends or the wheel goes
  // quiet. Redrawing every engraved line on every pointer move is what made
  // the map lag. The SVG is drawn half a stage wider on every side than the
  // stage (see .map-panel__svg), so a drag reveals land, not blank sea.
  const viewRef = useRef(view);
  const pendingView = useRef<ViewBox | null>(null);
  const wheelTimer = useRef<number | undefined>(undefined);

  // How a view sits in the stage: one scale for both axes, centred, as
  // preserveAspectRatio "meet" draws it.
  const fitView = useCallback((vb: ViewBox) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
    return { left: rect.left, top: rect.top, scale, offX: (rect.width - vb.width * scale) / 2, offY: (rect.height - vb.height * scale) / 2 };
  }, []);

  const previewView = useCallback(
    (next: ViewBox) => {
      pendingView.current = next;
      const shown = viewRef.current;
      const fit = fitView(shown);
      const svg = svgRef.current;
      if (!fit || !svg) return;
      const k = shown.width / next.width;
      const tx = fit.offX * (1 - k) + k * fit.scale * (shown.x - next.x);
      const ty = fit.offY * (1 - k) + k * fit.scale * (shown.y - next.y);
      svg.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    },
    [fitView],
  );

  const commitView = useCallback(() => {
    window.clearTimeout(wheelTimer.current);
    const next = pendingView.current;
    if (!next) return;
    pendingView.current = null;
    flushSync(() => setView(next));
  }, []);

  // The new viewBox and the cleared transform land in the same frame.
  useLayoutEffect(() => {
    viewRef.current = view;
    if (svgRef.current && !pendingView.current) svgRef.current.style.transform = "";
  }, [view]);

  // Wheel-to-zoom, centered on the cursor. Attached as a native (non-passive)
  // listener so we can preventDefault and stop the page itself from
  // scrolling while the cursor is over the map.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const base = pendingView.current ?? viewRef.current;
      const fit = fitView(base);
      if (!fit) return;
      const mx = e.clientX - fit.left;
      const my = e.clientY - fit.top;
      // The world point under the cursor stays under it.
      const wx = base.x + (mx - fit.offX) / fit.scale;
      const wy = base.y + (my - fit.offY) / fit.scale;
      const zoomFactor = e.deltaY < 0 ? 0.88 : 1 / 0.88;
      const width = base.width * zoomFactor;
      const height = width * (BASE_VIEW.height / BASE_VIEW.width);
      const scale = fit.scale / zoomFactor;
      previewView(clampViewBox({ x: wx - (mx - fit.offX) / scale, y: wy - (my - fit.offY) / scale, width, height }));
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(commitView, WHEEL_SETTLE_MS);
    }

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheel);
      window.clearTimeout(wheelTimer.current);
    };
  }, [fitView, previewView, commitView]);

  // Touch: every finger on the map by its pointer id, and the pinch under
  // way (two fingers: zoom by how far apart they are, pan by where their
  // midpoint goes). A mouse or a single finger drags as before.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ base: ViewBox; distance: number; mid: { x: number; y: number } } | null>(null);
  const lastPointerType = useRef<string>("mouse");

  function twoFingers() {
    const [a, b] = [...pointers.current.values()];
    return { distance: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  }

  function startPinch(e: React.PointerEvent<SVGSVGElement>) {
    const { distance, mid } = twoFingers();
    pinch.current = { base: pendingView.current ?? viewRef.current, distance, mid };
    // A pinch is never a tap on whatever is under the fingers.
    suppressNextClick.current = true;
    dragOrigin.current = null;
    dragStart.current = null;
    for (const id of pointers.current.keys()) {
      if (!svgRef.current?.hasPointerCapture(id)) {
        try {
          svgRef.current?.setPointerCapture(id);
        } catch {
          // The pointer is already gone.
        }
      }
    }
    setIsPanning(true);
    e.preventDefault();
  }

  function movePinch() {
    const start = pinch.current;
    if (!start) return;
    const fit = fitView(start.base);
    if (!fit) return;
    const { distance, mid } = twoFingers();
    // The world point under the fingers' first midpoint follows the midpoint.
    const zoomFactor = start.distance / distance;
    const width = start.base.width * zoomFactor;
    const height = width * (BASE_VIEW.height / BASE_VIEW.width);
    const scale = fit.scale / zoomFactor;
    const wx = start.base.x + (start.mid.x - fit.left - fit.offX) / fit.scale;
    const wy = start.base.y + (start.mid.y - fit.top - fit.offY) / fit.scale;
    previewView(clampViewBox({ x: wx - (mid.x - fit.left - fit.offX) / scale, y: wy - (mid.y - fit.top - fit.offY) / scale, width, height }));
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    lastPointerType.current = e.pointerType;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      startPinch(e);
      return;
    }
    if (pointers.current.size > 2) return;
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
    lastPointerType.current = e.pointerType;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current) {
      movePinch();
      return;
    }
    if (!dragStart.current) return;
    const dxPixels = e.clientX - dragStart.current.x;
    const dyPixels = e.clientY - dragStart.current.y;

    if (dragOrigin.current) {
      const totalDx = e.clientX - dragOrigin.current.x;
      const totalDy = e.clientY - dragOrigin.current.y;
      if (Math.hypot(totalDx, totalDy) > DRAG_CLICK_THRESHOLD) {
        if (!suppressNextClick.current) {
          try {
            svgRef.current?.setPointerCapture(e.pointerId);
          } catch {
            // The pointer is already gone (iOS cancels touches mid-gesture).
          }
        }
        suppressNextClick.current = true;
        setIsPanning(true);
      }
    }

    dragStart.current = { x: e.clientX, y: e.clientY };
    const base = pendingView.current ?? viewRef.current;
    const fit = fitView(base);
    if (!fit) return;
    previewView(clampViewBox({ ...base, x: base.x - dxPixels / fit.scale, y: base.y - dyPixels / fit.scale }));
  }

  function handlePointerUp(e: React.PointerEvent<SVGSVGElement>) {
    // A leave after the finger has already lifted changes nothing.
    if (!pointers.current.delete(e.pointerId) && e.type === "pointerleave") return;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) {
      svgRef.current.releasePointerCapture(e.pointerId);
    }
    if (pinch.current) {
      if (pointers.current.size >= 2) return;
      // One finger left after a pinch: it carries on as a drag from where
      // it is, without a jump.
      pinch.current = null;
      const [rest] = [...pointers.current.values()];
      if (rest) {
        dragStart.current = { ...rest };
        dragOrigin.current = null;
        return;
      }
    }
    if (pointers.current.size > 0) return;
    dragOrigin.current = null;
    dragStart.current = null;
    commitView();
    setIsPanning(false);
  }

  // Touch has no hover: a tap's pretend mouse-over would leave a province's
  // card stuck on the map. A mouse or trackpad still shows it.
  const hoverProvince = useCallback((next: React.SetStateAction<string | null>) => {
    if (lastPointerType.current === "touch") return;
    setHoveredProvinceId(next);
  }, []);

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
    commitView();
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
          viewBox={`${view.x - view.width / 2} ${view.y - view.height / 2} ${view.width * 2} ${view.height * 2}`}
          className={`map-panel__svg ${isPanning ? "is-panning" : ""}`}
          style={{ "--nation-color": washColor(nation.color) } as CSSProperties}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
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
            provinceStatus={provinceStatus}
            mapMode={mapMode}
            onProvinceClick={handleProvinceClick}
            onProvinceKeySelect={onSelectProvince}
            onIslandClick={handleIslandClick}
            venturesOpen={venturesOpen}
            onHoverProvince={hoverProvince}
          />
        </svg>

        <div className="map-panel__zoom-controls">
          <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom in">
            +
          </button>
          <button type="button" onClick={() => {
              commitView();
              setView(BASE_VIEW);
            }}
            aria-label="Reset view">
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
            const place = provinceOverview.find((o) => o.id === province.id);

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
                    {TERRAIN_LABELS[province.terrain]}, produces {RESOURCE_LABELS[resourceType]}
                    {province.terrain === "hills" ? " and Coal" : ""}
                  </span>
                </div>
                {place && (
                  <div className="map-panel__tooltip-place">
                    <div className={`map-panel__tooltip-row ${place.homeless >= 1 ? "is-alert" : ""}`}>
                      <StatIcon type="population" size={18} />
                      <span>
                        {formatAmount(place.population)} people · homes for {formatAmount(place.capacity)}
                        {place.homeless >= 1 ? ` · ${formatAmount(place.homeless)} homeless` : ""}
                      </span>
                    </div>
                    <div className={`map-panel__tooltip-row ${place.workers > 0 && place.unemployed / place.workers >= 0.1 ? "is-alert" : ""}`}>
                      <JobsIcon size={18} />
                      <span>
                        {formatAmount(place.workers)} workers · {formatAmount(place.jobs)} jobs
                        {place.unemployed >= 1 ? ` · ${formatAmount(place.unemployed)} jobless` : ""}
                        {place.openJobs >= 1 ? ` · ${formatAmount(place.openJobs)} unfilled` : ""}
                      </span>
                    </div>
                    <div className="map-panel__tooltip-row">
                      <UnrestStageIcon stage={place.unrestStage} size={18} />
                      <span>
                        {UNREST_INFO[place.unrestStage].name} · stability {Math.round(place.stability)}
                      </span>
                    </div>
                    {Math.abs(place.migration) >= 1 && (
                      <div className="map-panel__tooltip-row">
                        <span className="map-panel__tooltip-arrow" aria-hidden="true">
                          {place.migration > 0 ? "→" : "←"}
                        </span>
                        <span>
                          {place.migration > 0 ? "Moving in" : "Moving out"}: {formatAmount(Math.abs(place.migration))} a day
                        </span>
                      </div>
                    )}
                  </div>
                )}
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
                    {buildings.filter((b) => !isWorking(b)).length} broken. Repair from the Build tab.
                  </div>
                )}
                {buildings.length === 0 && roads === 0 && <div className="map-panel__tooltip-empty">No buildings yet.</div>}
              </div>
            );
          })()}

        <button
          type="button"
          className={`map-panel__legend-toggle ${showLegend ? "is-active" : ""}`}
          onClick={() => {
            setShowLegend((v) => !v);
            setLegendSeen(true);
          }}
          aria-expanded={showLegend}
          title={anyFlags && !legendSeen ? "Some provinces are flagged. The legend explains the marks." : undefined}
        >
          Legend
          {anyFlags && !legendSeen && (
            <span className="map-panel__legend-badge" aria-label="Provinces flagged">
              !
            </span>
          )}
        </button>

        {/* The next province that needs you, worst first: its card opens. */}
        <button
          type="button"
          className={`map-panel__next-problem ${problemCount > 0 ? "has-problems" : ""}`}
          onClick={onNextProblem}
          disabled={problemCount === 0}
          title={problemCount > 0 ? `Go to the next province that needs you, worst first (key: N)` : "No province needs you right now"}
        >
          {problemCount > 0 ? <>Next problem <span className="map-panel__next-problem-count">{problemCount}</span></> : "All well"}
        </button>

        {/* Map modes: a segmented switch, with the active mode's key. */}
        <div className="map-panel__modes">
          <div className="map-panel__mode-switch" role="group" aria-label="Map mode">
            {MAP_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={mapMode === mode.key ? "is-active" : ""}
                aria-pressed={mapMode === mode.key}
                onClick={() => setMapMode(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {(() => {
            const levels = MAP_MODES.find((m) => m.key === mapMode)?.levels;
            if (!levels) return null;
            return (
              <div className="map-panel__mode-key">
                {(["ok", "warn", "alert"] as ModeLevel[]).map((level) => (
                  <span key={level}>
                    <ModeSwatch level={level} />
                    {levels[level]}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {showLegend && (
          <div className="map-panel__legend">
            {/* The flags first: they're what changes, and what needs you. */}
            <span className="map-panel__legend-heading">Province flags</span>
            {FLAG_LEGEND.map((flag) => (
              <span key={flag.key} className={`map-panel__legend-item ${flagCounts[flag.key] > 0 ? "is-present" : ""}`} title={flag.hint}>
                {flag.glyph}
                {flag.label}
                {flagCounts[flag.key] > 0 && (
                  <strong className="map-panel__legend-count">
                    {flagCounts[flag.key]} {flagCounts[flag.key] === 1 ? "province" : "provinces"}
                  </strong>
                )}
              </span>
            ))}
            <span className="map-panel__legend-note">Zoomed out, only provinces with a problem show a strip. Zoom in, or point at a province, to see what it produces and what's built there.</span>
            <span className="map-panel__legend-heading">Map</span>
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
