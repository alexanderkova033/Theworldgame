import "./MapPanel.css";
import { washColor, type ViewBox, BASE_VIEW, DRAG_CLICK_THRESHOLD, WHEEL_SETTLE_MS, LABEL_ZOOM_THRESHOLD, clampViewBox, homeView, type MapMode, type ModeLevel, MODE_COLORS, MAP_MODES } from "./mapCommon";
import { MapLayers } from "./MapLayers";
import { flushSync } from "react-dom";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ProjectType } from "../../domain/construction/types";
import { isWorking } from "../../domain/maintenance/maintenanceRules";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { PlacedBuilding, Terrain } from "../../domain/provinces/types";
import { RESOURCE_BY_TERRAIN } from "../../domain/resources/resourceRules";
import { BuildingIcon } from "./BuildingIcon";
import type { UnderwayBuilding } from "./MapSettlements";
import type { ProvinceOverview, ProvinceStatus } from "../../application/getProvinceOverview";
import { formatAmount } from "../formatNumber";
import { UNREST_INFO } from "../unrestStages";
import { JobsIcon, UnrestStageIcon } from "./CauseIcon";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import { ArmyLayer, type MarchPreview } from "./MapArmies";
import type { Season } from "../../domain/country/calendar";

import { areTipsOn, TIP_REST_MS, TIP_REST_SLOP } from "../tipPreference";
import type { FreeProvince } from "../../domain/military/battleRules";
import type { Regiment } from "../../domain/military/types";

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
  harbour: "Harbour",
};

interface MapPanelProps {
  nation: Nation;
  placedBuildings: PlacedBuilding[];
  underway: UnderwayBuilding[]; // what's going up, stable from day to day so the map isn't redrawn for it
  buildKinds: ProjectType[] | null; // the Build window is open: show the building slots for these kinds
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
  lostProvinceIds: string[]; // broke away after an uprising: drawn as free land (see domain/uprising)
  settledIslandIds: string[]; // islands settled: drawn and picked like your provinces (see domain/islands)
  foreignIslands: Record<string, string>; // islands a neighbour claimed: drawn in their colour
  regiments: Regiment[] | null; // every country's regiments, once the army is open (see domain/military)
  marchFrom: string | null; // where the regiments you picked up stand
  onPickArmy: (provinceId: string) => void; // a counter of yours tapped
  planMarch: (to: string) => MarchPreview | null; // the way there, for the preview
  freeProvinces: Record<string, FreeProvince>; // provinces that broke away, held by rebels
  sieges: Record<string, number>; // islands your regiments besiege: days so far
  season: Season; // washed over the land and sea (see MapSeasons)
}

const ICONS_KEY = "theworldgame-map-icons";

function readIconsOn(): boolean {
  try {
    return localStorage.getItem(ICONS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeIconsOn(on: boolean): void {
  try {
    localStorage.setItem(ICONS_KEY, on ? "1" : "0");
  } catch {
    // Storage unavailable: the choice holds for this session only.
  }
}

// Each map mode as a picture, named in its tip.
const MODE_ICONS: Record<MapMode, ReactNode> = {
  political: (
    <svg viewBox="-12 -12 24 24" width={26} height={26} aria-hidden="true">
      <path d="M-6,10 L-6,-10" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M-6,-9 Q0,-12 3,-8 Q6,-5 10,-8 L10,1 Q6,4 3,1 Q0,-3 -6,0 Z" fill="currentColor" />
    </svg>
  ),
  homes: (
    <svg viewBox="-12 -13 24 24" width={26} height={26} aria-hidden="true">
      <BuildingIcon type="housing" x={0} y={0} size={8} />
    </svg>
  ),
  jobs: <JobsIcon size={24} />,
  unrest: <UnrestStageIcon stage="riots" size={24} />,
};

// A swatch drawing the same colour and hatching as the map.
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


// Memoized: the map is by far the heaviest thing on screen (hundreds of SVG
// nodes and patterns), but it only depends on which buildings
// exist and what's selected — none of which change on an ordinary daily
// tick. Without this it re-rendered up to 5x/second at 5x game speed purely
// because the treasury number moved.
export const MapPanel = memo(function MapPanel({
  nation,
  placedBuildings,
  underway,
  buildKinds,
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
  lostProvinceIds,
  settledIslandIds,
  foreignIslands,
  regiments,
  marchFrom,
  onPickArmy,
  planMarch,
  freeProvinces,
  sieges,
  season,
}: MapPanelProps) {
  const { provinces } = MAP_GEOMETRY;

  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Opens on your own land (see homeView); Reset comes back here.
  const home = useMemo(() => homeView(nation.provinceIds), [nation.provinceIds]);
  const [view, setView] = useState<ViewBox>(home);
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
  // native title element (name/owner only): terrain, produced resource, and every
  // building actually standing there, in one place instead of only as
  // small icons on the map itself.
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  // The tooltip's position is written straight to its element on every
  // mouse move — keeping it in state re-rendered the whole map each time.
  const tooltipPos = useRef({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  // The card waits for the mouse to rest on a province, as every tip does
  // (tipPreference.ts): crossing the map to get somewhere shows nothing.
  // The province itself still lights at once.
  const [cardShown, setCardShown] = useState(false);
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRest = useRef({ x: 0, y: 0 });
  const awaitCardRest = useCallback((shiftKey: boolean) => {
    if (cardTimer.current) clearTimeout(cardTimer.current);
    cardTimer.current = null;
    if (shiftKey) setCardShown(true);
    else if (areTipsOn()) cardTimer.current = setTimeout(() => setCardShown(true), TIP_REST_MS);
  }, []);
  useEffect(() => () => {
    if (cardTimer.current) clearTimeout(cardTimer.current);
  }, []);

  // Each province's strip of small icons, or the buildings and people drawn
  // on the land: one or the other, the player's choice, kept between visits.
  const [showIcons, setShowIcons] = useState(readIconsOn);
  // Which map mode is showing — a view choice, not simulation truth.
  const [mapMode, setMapMode] = useState<MapMode>("political");

  function handleStageMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    tooltipPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (!cardShown && Math.hypot(e.clientX - cardRest.current.x, e.clientY - cardRest.current.y) > TIP_REST_SLOP) {
      cardRest.current = { x: e.clientX, y: e.clientY };
      awaitCardRest(e.shiftKey);
    }
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

  // Safari on an iPad doesn't honour touch-action on the shapes inside an
  // SVG: it takes a finger dragged over the chart for a scroll or a zoom of
  // the page, and cancels the drag a few pixels in. Refusing the moves
  // themselves keeps every gesture on the map for the map. The touch's
  // start is left alone, so a tap still selects a province.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function holdTouch(e: TouchEvent) {
      if (e.cancelable && e.target instanceof Element && svgRef.current?.contains(e.target)) e.preventDefault();
    }
    stage.addEventListener("touchmove", holdTouch, { passive: false });
    return () => stage.removeEventListener("touchmove", holdTouch);
  }, []);

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
    if (e.type === "pointerleave") {
      // A finger never "leaves" mid-drag; Safari reports a leave whenever
      // the shape under it changes, which would drop the drag. Only lifting
      // it (or a cancel) ends a touch.
      if (e.pointerType !== "mouse") return;
      // A leave after the button has already come up changes nothing.
      if (!pointers.current.has(e.pointerId)) return;
    }
    pointers.current.delete(e.pointerId);
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
    setHoveredProvinceId((prev) => {
      const id = typeof next === "function" ? next(prev) : next;
      // A new province starts its own wait (repeating this is harmless).
      if (id !== prev) {
        setCardShown(false);
        awaitCardRest(false);
      }
      return id;
    });
  }, [awaitCardRest]);

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

  // A counter tapped at the end of a drag is the drag, not a tap.
  const handlePickArmy = useCallback(
    (provinceId: string) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        return;
      }
      onPickArmy(provinceId);
    },
    [onPickArmy],
  );
  const preview = useMemo(
    () => (marchFrom && hoveredProvinceId && hoveredProvinceId !== marchFrom ? planMarch(hoveredProvinceId) : null),
    [marchFrom, hoveredProvinceId, planMarch],
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
    <section className="map-panel" data-season={season}>
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
            underway={underway}
            showIcons={showIcons}
            buildKinds={buildKinds}
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
            lostProvinceIds={lostProvinceIds}
            settledIslandIds={settledIslandIds}
            foreignIslands={foreignIslands}
          />
          {regiments && <ArmyLayer regiments={regiments} playerNationId={nation.id} marchFrom={marchFrom} onPick={handlePickArmy} preview={preview} freeProvinces={freeProvinces} sieges={sieges} />}
        </svg>


        {hoveredProvinceId &&
          cardShown &&
          !isPanning &&
          (() => {
            const province = provinces.find((p) => p.id === hoveredProvinceId) ?? MAP_GEOMETRY.islands.find((i) => i.id === hoveredProvinceId);
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

        {/* Bottom right: the small icons or the buildings on the land, then
            the map modes, each a picture named in its tip. */}
        <div className="map-panel__modes">
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
          <div className="map-panel__mode-rail">
            <button
              type="button"
              className={`map-panel__mode-button map-panel__icons-toggle ${showIcons ? "is-active" : ""}`}
              aria-pressed={showIcons}
              aria-label="Province icons"
              title={showIcons ? "Province icons on. Click for buildings and people on the land" : "Buildings and people on the land. Click for province icons"}
              onClick={() => {
                setShowIcons(!showIcons);
                writeIconsOn(!showIcons);
              }}
            >
              <svg viewBox="-13 -9 26 18" width={28} height={20} aria-hidden="true">
                <rect x={-12} y={-8} width={24} height={16} rx={3} fill="#dcc79d" stroke="#2b1d12" strokeWidth={1} />
                <path d="M-9,1 L-5,-4 L-1,1 L-1,5 L-9,5 Z" fill="#7b2121" />
                <circle cx={6} cy={-2} r={2.4} fill="#2b1d12" />
                <path d="M2,5 C2,0 10,0 10,5 Z" fill="#2b1d12" />
              </svg>
            </button>
            <span className="map-panel__mode-gap" />
            <div className="map-panel__mode-group" role="group" aria-label="Map mode">
              {MAP_MODES.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={`map-panel__mode-button ${mapMode === mode.key ? "is-active" : ""}`}
                  aria-pressed={mapMode === mode.key}
                  aria-label={mode.label}
                  title={mode.label}
                  onClick={() => setMapMode(mode.key)}
                >
                  {MODE_ICONS[mode.key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});
