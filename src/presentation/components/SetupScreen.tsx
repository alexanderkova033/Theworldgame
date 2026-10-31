import "./SetupScreen.css";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from "../../domain/difficulty/difficultyData";
import type { Nation } from "../../domain/nations/types";
import { getPartiesForNation } from "../../domain/parties/partyRules";
import { describeEffects } from "../../domain/policy/modifiers";
import type { PlacedBuilding } from "../../domain/provinces/types";
import type { ProvinceStatus } from "../../application/getProvinceOverview";
import "./MapPanel.css";
import { Waterlines } from "./MapDecor";
import { MapLayers } from "./MapLayers";
import type { UnderwayBuilding } from "./MapSettlements";
import { cogPoints, starPoints } from "./iconShapes";
import { washColor } from "./mapCommon";
import { formatReign } from "../formatNumber";
import { getBestReign } from "../hooks/records";
import { nationShapes } from "../nationFrontiers";
import { MODES, MODE_SETTINGS, type GameMode } from "../../domain/reign/reignData";

interface SetupScreenProps {
  nations: Nation[];
  slotName: string;
  onBack: () => void;
  onStart: (nationId: string, partyId: string, difficulty: Difficulty, mode: GameMode) => void;
}

// The continent and every island, with their shallows and the compass: what
// the chart must show, fitted to the sea the flags and the choices leave.
const LAND = { x: 0, y: -15, width: 1400, height: 960 };
const FIRST_VIEW = `${LAND.x} ${LAND.y} ${LAND.width} ${LAND.height}`;
// A smaller window has no compass (SetupScreen.css), so the land has its room.
const LAND_NO_COMPASS = { ...LAND, width: 1310 };
const COMPASS_MIN_WIDTH = 1500;
// West of here is open sea north of the islands, so the land can slide under
// the flags this far without touching them.
const CONTINENT_WEST = 175;
// Narrow, there's only room for what's being chosen between: the three nations.
const CONTINENT = { x: 165, y: 70, width: 700, height: 565 };

// The shore of the land the choices stand on, as "how far in, how far along":
// 0 to 100 across its depth, 0 to 1000 along its length. It runs off both ends
// of the chart, and is stretched to fit whatever the window is.
const SHORE =
  "M58,-30 C78,40 86,90 72,150 C62,195 40,205 34,255 C29,300 52,330 70,365 C84,395 88,440 74,490 C62,535 48,545 52,600 C56,650 78,670 82,720 C85,765 60,790 44,825 C34,850 36,895 52,930 C60,955 64,990 60,1030";
const SHORE_DEPTH = 56; // screen pixels
const SHORE_REACH = 26; // what its shallows take of the sea, in screen pixels
const SEA_MARGIN = 16;

// What a chart with no game behind it holds.
const NO_BUILDINGS = new Map<string, PlacedBuilding[]>();
const NO_ROADS = new Map<string, number>();
const NOTHING: UnderwayBuilding[] = [];
const NOTHING_IDS: string[] = [];
const NO_RULERS: Record<string, string> = {};
const NO_STATUS: Record<string, ProvinceStatus> = {};
const ignore = () => {};

// Starting a game, on one screen. The chart fills it and chooses the nation
// (click its land, or its flag); the choices stand on a green shore to the
// right of it, with no straight edge between them and the sea. Everything has
// a choice made already, so "Take office" is always ready. The game doesn't
// exist until it's pressed.
export function SetupScreen({ nations, slotName, onBack, onStart }: SetupScreenProps) {
  const [nationId, setNationId] = useState(nations[0].id);
  const nation = nations.find((n) => n.id === nationId) ?? nations[0];
  const mapRef = useRef<HTMLDivElement>(null);
  const flagsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState({ view: FIRST_VIEW, shore: "" });
  useLayoutEffect(() => {
    const map = mapRef.current;
    const flags = flagsRef.current;
    const panel = panelRef.current;
    if (!map || !flags || !panel) return;
    const fit = () => {
      const box = map.getBoundingClientRect();
      // Narrow, the choices sit under the chart and the shore runs along its foot.
      const beside = getComputedStyle(panel).position === "absolute";
      const shoreAt = beside ? panel.getBoundingClientRect().left - box.left - SHORE_DEPTH : box.height - SHORE_DEPTH;
      const sail = beside ? flags.getBoundingClientRect().right - box.left : 0;
      const east = beside ? shoreAt - SHORE_REACH : box.width - SEA_MARGIN;
      const south = beside ? box.height - SEA_MARGIN : shoreAt - SHORE_REACH;
      const west = beside ? CONTINENT_WEST : 0;
      const shown = !beside ? CONTINENT : box.width >= COMPASS_MIN_WIDTH ? LAND : LAND_NO_COMPASS;
      const scale = Math.min((south - SEA_MARGIN) / shown.height, (east - Math.max(sail, SEA_MARGIN)) / (shown.width - west));
      if (scale <= 0) return;
      const spare = east - Math.max(sail, SEA_MARGIN) - (shown.width - west) * scale;
      const landLeft = Math.max(SEA_MARGIN, Math.max(sail, SEA_MARGIN) - west * scale + spare / 2);
      const landTop = SEA_MARGIN + (south - SEA_MARGIN - shown.height * scale) / 2;
      const viewX = shown.x - landLeft / scale;
      const viewY = shown.y - landTop / scale;
      const point = (across: number, along: number) => {
        const inward = shoreAt + (across / 100) * SHORE_DEPTH;
        const [x, y] = beside ? [inward, (along / 1000) * box.height] : [(along / 1000) * box.width, inward];
        return `${viewX + x / scale},${viewY + y / scale}`;
      };
      const shore = SHORE.replace(/(-?\d+),(-?\d+)/g, (_, across, along) => point(Number(across), Number(along)));
      // Closed off behind the panel, so the land is filled right up to it.
      setChart({ view: `${viewX} ${viewY} ${box.width / scale} ${box.height / scale}`, shore: `${shore} L${point(600, 1030)} L${point(600, -30)} Z` });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(map);
    observer.observe(flags);
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);
  const parties = getPartiesForNation(nation.id);
  const [wantedPartyId, setPartyId] = useState<string | null>(null);
  // A party belongs to one nation: choosing another nation starts on its first.
  const party = parties.find((p) => p.id === wantedPartyId) ?? parties[0];
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const level = DIFFICULTY_SETTINGS[difficulty];
  const [mode, setMode] = useState<GameMode>("terms");
  const best = mode === "long-reign" ? getBestReign(difficulty) : null;
  // A Long Reign has no retries, so that line doesn't apply to it.
  const changes = level.changes.filter((change) => mode !== "long-reign" || !/retr/i.test(change));
  // What most sets a level apart stays on screen; all of it is in the tip.
  const keyChanges = changes.filter((change) => /^Elections need|retr/i.test(change));
  const shapes = nationShapes([]);
  const chosen = shapes.find((shape) => shape.nationId === nation.id);

  return (
    <div className="setup">
      <div className="setup__map" ref={mapRef}>
        {/* The chart the game is played on, not a drawing of it. MapLayers
            shows the chosen nation as your own; these clear shapes on top
            catch the clicks for all three. */}
        <div className="setup__chart-frame map-panel" data-season="summer">
          <svg
            viewBox={chart.view}
            className="setup__chart"
            style={{ "--nation-color": washColor(nation.color) } as CSSProperties}
            role="img"
            aria-label={`The continent and its islands, with ${nation.name} chosen`}
          >
            <MapLayers
              nation={nation}
              buildingsByProvince={NO_BUILDINGS}
              underway={NOTHING}
              showIcons={false}
              buildKinds={null}
              roadCountByProvince={NO_ROADS}
              selectedProvinceId=""
              hoveredProvinceId={null}
              zoomedIn={false}
              scoutedIslandIds={NOTHING_IDS}
              expeditionIslandIds={NOTHING_IDS}
              selectedIslandId={null}
              foreignRulers={NO_RULERS}
              provinceStatus={NO_STATUS}
              mapMode="political"
              onProvinceClick={ignore}
              onProvinceKeySelect={ignore}
              onIslandClick={ignore}
              venturesOpen={false}
              onHoverProvince={ignore}
              lostProvinceIds={NOTHING_IDS}
              settledIslandIds={NOTHING_IDS}
              foreignIslands={NO_RULERS}
            />
            {chosen && <path d={chosen.outline} className="setup__chosen-land" fill={nation.color} />}
            {shapes.map((shape) => (
              <path key={shape.nationId} d={shape.outline} className="setup__hit" onClick={() => setNationId(shape.nationId)} data-tip={shape.name} />
            ))}
            {/* The chosen nation's frontier, in gilt. */}
            {chosen && <path d={chosen.frontier} className="setup__frontier" />}
            {/* The land the choices stand on, with the shore every island has. */}
            {chart.shore && (
              <g pointerEvents="none">
                <Waterlines d={chart.shore} />
                <path d={chart.shore} className="map-panel__shallows" />
                <path d={chart.shore} className="setup__shore" />
              </g>
            )}
          </svg>
        </div>
        <div className="setup__top">
          <button type="button" className="setup__back" onClick={onBack}>
            ← Back to saves
          </button>
          <span className="setup__slot">{slotName}</span>
        </div>
      </div>

      {/* The nations fly from the frame; the chosen one's flag says what it is. */}
      <div className="setup__flags" role="radiogroup" aria-label="Nation" ref={flagsRef}>
        {nations.map((n) => (
          <button
            key={n.id}
            type="button"
            role="radio"
            aria-checked={n.id === nation.id}
            className={`setup__flag ${n.id === nation.id ? "is-active" : ""}`}
            style={{ "--nation-color": n.color } as CSSProperties}
            onClick={() => setNationId(n.id)}
          >
            <span className="setup__flag-head">
              <CrestEmblem nationId={n.id} />
              <span className="setup__flag-name">{n.name}</span>
            </span>
            {n.id === nation.id && (
              <span className="setup__flag-text">
                <span>{n.blurb}</span>
                <strong>{n.startingBonus}</strong>
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="setup__panel" ref={panelRef}>
        <div className="setup__choices">
          <section className="setup__section" aria-labelledby="setup-party">
            <h2 className="setup__label" id="setup-party">
              Your party
            </h2>
            <div className="setup__parties" role="radiogroup" aria-labelledby="setup-party">
              {parties.map((p) => {
                const creed = describeEffects(p.creed);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === party.id}
                    className={`setup__party ${p.id === party.id ? "is-active" : ""}`}
                    style={{ "--party-color": p.color } as CSSProperties}
                    onClick={() => setPartyId(p.id)}
                    title={p.description}
                  >
                    {/* What governing as this party changes: a button holds
                        only inline content, so the lists are spans. */}
                    <span className="setup__party-head">
                      <span className="setup__party-seal" aria-hidden="true">
                        <PartyCrestEmblem ideology={p.ideology} />
                      </span>
                      <span className="setup__party-name">{p.name}</span>
                    </span>
                    {creed.gains.map((line) => (
                      <span key={line.key} className="setup__perk is-gain">
                        <span className="setup__mark" aria-label="Gain">▲</span>
                        {line.text}
                      </span>
                    ))}
                    {creed.costs.map((line) => (
                      <span key={line.key} className="setup__perk is-loss">
                        <span className="setup__mark" aria-label="Cost">▼</span>
                        {line.text}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="setup__section" aria-labelledby="setup-mode">
            <h2 className="setup__label" id="setup-mode">
              How it ends
            </h2>
            <div className="setup__scale setup__scale--modes" role="radiogroup" aria-labelledby="setup-mode">
              {MODES.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  className={`setup__step ${mode === key ? "is-active" : ""}`}
                  onClick={() => setMode(key)}
                  title={MODE_SETTINGS[key].summary}
                >
                  <ModeEmblem mode={key} />
                  {MODE_SETTINGS[key].name}
                </button>
              ))}
            </div>
            {/* What to expect: the usual length of a campaign, or the reign to beat. */}
            <p className="setup__note">
              {MODE_SETTINGS[mode].tagline}{" "}
              {mode === "terms"
                ? "A careful game lasts about four and a half years."
                : best
                  ? `Your longest on ${level.name}: ${formatReign(best.months)}.`
                  : `No reign on ${level.name} yet.`}
            </p>
          </section>

          <section className="setup__section" aria-labelledby="setup-level">
            <h2 className="setup__label" id="setup-level">
              How hard
            </h2>
            <div className="setup__scale setup__scale--levels" role="radiogroup" aria-labelledby="setup-level">
              {DIFFICULTIES.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === key}
                  className={`setup__step setup__step--${key} ${difficulty === key ? "is-active" : ""}`}
                  onClick={() => setDifficulty(key)}
                  title={`${DIFFICULTY_SETTINGS[key].title}. ${DIFFICULTY_SETTINGS[key].summary}`}
                >
                  <RankInsignia chevrons={i + 1} />
                  {DIFFICULTY_SETTINGS[key].name}
                </button>
              ))}
            </div>
            <p className="setup__note" title={changes.join(". ")}>
              {level.summary} {keyChanges.join(". ")}.
            </p>
          </section>
        </div>

        {/* The one way in, always on screen however far the choices scroll. */}
        <button type="button" className="setup__start" onClick={() => onStart(nation.id, party.id, difficulty, mode)}>
          Take office
        </button>
      </div>
    </div>
  );
}

// A small emblem per nation, echoing its flavor (farmland, schools,
// industry) — purely decorative, drawn from the same basic-shape approach
// as BuildingIcon/StatIcon.
function CrestEmblem({ nationId }: { nationId: string }) {
  const emblem = (() => {
    switch (nationId) {
      case "astravia":
        // A wheat sheaf, for a farming republic.
        return (
          <g stroke="#f4efe2" strokeWidth={1.3} strokeLinecap="round" fill="none">
            <line x1={0} y1={-7} x2={0} y2={6} />
            <line x1={0} y1={-5} x2={-3.5} y2={-7} />
            <line x1={0} y1={-5} x2={3.5} y2={-7} />
            <line x1={0} y1={-1.5} x2={-4} y2={-3.5} />
            <line x1={0} y1={-1.5} x2={4} y2={-3.5} />
            <line x1={-3} y1={5} x2={3} y2={5} />
          </g>
        );
      case "caldenreich":
        // An open book, for a kingdom proud of its schools.
        return (
          <g fill="#f4efe2">
            <polygon points="0,-6 -7,-2 -7,6 0,2" />
            <polygon points="0,-6 7,-2 7,6 0,2" />
          </g>
        );
      case "veldoria":
        // A gear, for an industrial power.
        return (
          <g fill="#f4efe2">
            <polygon points={cogPoints(0, 0, 6.5, 5, 8)} />
            <circle cx={0} cy={0} r={2.1} className="setup__seal-hole" />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={24} height={24} viewBox="-8 -8 16 16" aria-hidden="true">
      {emblem}
    </svg>
  );
}

// How a game ends, drawn: three stars for three elections won, an hourglass
// for a reign that runs until it runs out.
function ModeEmblem({ mode }: { mode: GameMode }) {
  return (
    <svg className="setup__emblem" viewBox="-20 -14 40 28" width={32} height={22} aria-hidden="true">
      {mode === "terms" ? (
        <g fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.8} strokeLinejoin="round">
          <polygon points={starPoints(-12, 3, 6.5, 2.8)} />
          <polygon points={starPoints(0, -4, 8, 3.4)} />
          <polygon points={starPoints(12, 3, 6.5, 2.8)} />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <rect x={-9} y={-12} width={18} height={2.6} rx={1} fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.6} />
          <rect x={-9} y={9.4} width={18} height={2.6} rx={1} fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.6} />
          <path d="M-6.5,-9.4 L6.5,-9.4 L0.8,0 L6.5,9.4 L-6.5,9.4 L-0.8,0 Z" fill="rgba(244, 234, 208, 0.18)" stroke="var(--gilt-bright)" strokeWidth={1} />
          <path d="M-3.8,-6.2 L3.8,-6.2 L0.5,-1.2 L-0.5,-1.2 Z" fill="var(--gilt-bright)" />
          <path d="M0,0.5 L0,6 M-4.6,8.9 Q0,5.6 4.6,8.9 Z" fill="var(--gilt-bright)" stroke="var(--gilt-bright)" strokeWidth={0.8} />
          <path d="M-15,6 C-17,0 -16,-6 -12,-10 M15,6 C17,0 16,-6 12,-10" fill="none" stroke="#9fbf86" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

// A difficulty as a rank: a shield with one chevron per step up.
function RankInsignia({ chevrons }: { chevrons: number }) {
  return (
    <svg className="setup__emblem" viewBox="-10 -11 20 22" width={20} height={22} aria-hidden="true">
      <path d="M-8,-9 H8 V0.5 C8,6 0,10 0,10 C0,10 -8,6 -8,0.5 Z" fill="var(--rank-color)" stroke="var(--gilt-bright)" strokeWidth={1.1} />
      <g fill="none" stroke="#f4ead0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: chevrons }, (_, i) => {
          const y = 4 - i * 3.6 + (chevrons - 1) * 1.8;
          return <path key={i} d={`M-4.5,${y} L0,${y - 3} L4.5,${y}`} />;
        })}
      </g>
    </svg>
  );
}

// A small emblem per ideology, echoing what each party actually stands for —
// same hand-drawn-basic-shapes approach as StartScreen's nation crests.
function PartyCrestEmblem({ ideology }: { ideology: string }) {
  const emblem = (() => {
    switch (ideology) {
      case "Agrarian":
        // A wheat sheaf, for the smallholders and cooperative farmers.
        return (
          <g stroke="#f4efe2" strokeWidth={1.3} strokeLinecap="round" fill="none">
            <line x1={0} y1={-7} x2={0} y2={6} />
            <line x1={0} y1={-5} x2={-3.5} y2={-7} />
            <line x1={0} y1={-5} x2={3.5} y2={-7} />
            <line x1={0} y1={-1.5} x2={-4} y2={-3.5} />
            <line x1={0} y1={-1.5} x2={4} y2={-3.5} />
            <line x1={-3} y1={5} x2={3} y2={5} />
          </g>
        );
      case "Commercial":
        // A balance scale, for a party that wants the ledger well-audited.
        return (
          <g stroke="#f4efe2" strokeWidth={1.2} strokeLinecap="round" fill="none">
            <line x1={0} y1={-7} x2={0} y2={6} />
            <line x1={-6} y1={-4} x2={6} y2={-4} />
            <path d="M-6,-4 L-8,1 A2.4,2.4 0 0 0 -3.5,1 Z" />
            <path d="M6,-4 L8,1 A2.4,2.4 0 0 0 3.5,1 Z" />
            <line x1={-3.5} y1={6} x2={3.5} y2={6} />
          </g>
        );
      case "Traditionalist":
        // A crown, for old administrative families guarding the inheritance.
        return (
          <g fill="#f4efe2">
            <polygon points="-7,3 -7,-1 -3.5,-5 0,-1 3.5,-5 7,-1 7,3" />
            <rect x={-7} y={3} width={14} height={2.4} />
          </g>
        );
      case "Progressive":
        // A rising sun, for younger clerks pushing to modernize.
        return (
          <g stroke="#f4efe2" strokeWidth={1.2} strokeLinecap="round" fill="none">
            <path d="M-7,3 A7,7 0 0 1 7,3" fill="#f4efe2" stroke="none" />
            <line x1={0} y1={-9} x2={0} y2={-6.5} />
            <line x1={-6.4} y1={-6.4} x2={-4.6} y2={-4.6} />
            <line x1={6.4} y1={-6.4} x2={4.6} y2={-4.6} />
          </g>
        );
      case "Labor":
        // A hammer, for the foundry and rail unions — a crossed hammer and
        // wrench read as a muddy squiggle at this size, so one clear tool
        // silhouette instead of two overlapping ones.
        return (
          <g stroke="#2a1f14" strokeWidth={0.6} fill="#f4efe2">
            <rect x={-1} y={-1} width={2} height={9} rx={0.8} />
            <rect x={-4.5} y={-8} width={9} height={4} rx={1} />
          </g>
        );
      case "Nationalist":
        // A sword, for veterans and industrialists wanting strength — a
        // crossed pair collapsed into a plain "X" at this size, so one
        // upright blade instead.
        return (
          <g stroke="#2a1f14" strokeWidth={0.5} fill="#f4efe2">
            <polygon points="0,-9 1.5,-3 -1.5,-3" />
            <rect x={-1} y={-3} width={2} height={6} />
            <rect x={-4} y={3} width={8} height={1.8} rx={0.6} />
            <rect x={-1} y={4.8} width={2} height={3} />
            <circle cx={0} cy={8.3} r={1.3} />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={22} height={22} viewBox="-8 -9 16 18">
      {emblem}
    </svg>
  );
}
