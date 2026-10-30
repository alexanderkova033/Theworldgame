import "./TopBar.css";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { formatDate, type Season } from "../../domain/country/calendar";
import { monthsUntilNextElection } from "../../domain/parties/electionRules";
import type { CountryStats, GameDate, GameSpeed } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { OpenPanel, PanelKey } from "../navigation";
import type { HeatingOutlook } from "../../application/getHeatingOutlook";
import type { Forecasts } from "../../application/getForecasts";
import type { MaterialShortage } from "../../application/getMaterialShortages";
import type { Ledger } from "../../domain/ledger/types";
import type { UnrestStage } from "../../domain/unrest/types";
import { isMuted, setMuted } from "../audio/sound";
import { areTipsOn, setTipsOn } from "../tipPreference";
import { FEEDBACK_URL } from "../feedback";
import { NavIcon } from "./NavIcon";
import { StatIcon } from "./StatIcon";
import { ResourceTicker } from "./ResourceTicker";

const SPEEDS: GameSpeed[] = [1, 2, 3, 5];

// The windows, as pictures: each tab is its icon, named in its tip. Ventures
// have no tab (they open from an island on the map, or the event log), and
// Politics opens from the nation's seal at the left of the bar.
const TABS: Array<{ key: PanelKey; label: string; icon: () => ReactNode }> = [
  { key: "build", label: "Build", icon: () => <NavIcon type="build" size={28} /> },
  { key: "money", label: "Money", icon: () => <StatIcon type="treasury" size={28} /> },
  { key: "laws", label: "Laws", icon: () => <NavIcon type="laws" size={28} /> },
  { key: "research", label: "Research", icon: () => <NavIcon type="research" size={28} /> },
  { key: "army", label: "Army", icon: () => <NavIcon type="army" size={28} /> },
  { key: "reports", label: "Reports", icon: () => <NavIcon type="reports" size={28} /> },
];

// A small hourglass in place of a bare date string.
function DateIcon() {
  return (
    <svg width={16} height={16} viewBox="-10 -10 20 20">
      <path d="M-6,-8 L6,-8 L6,-6 L1.5,0 L6,6 L6,8 L-6,8 L-6,6 L-1.5,0 L-6,-6 Z" fill="#e6c56a" stroke="#93731f" strokeWidth={0.7} />
      <path d="M-4,-6.3 L4,-6.3 L1,-0.4 L-1,-0.4 Z" fill="#c9a24a" opacity={0.85} />
    </svg>
  );
}

// The season, as a glyph beside the date — winter matters (farms barely
// yield), so it should be visible without opening anything.
const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn: harvest season, farms yield their best",
  winter: "Winter: farms yield little and grain fields lie fallow",
};

function SeasonIcon({ season }: { season: Season }) {
  switch (season) {
    case "spring":
      return (
        <svg width={16} height={16} viewBox="-10 -10 20 20">
          <path d="M0,8 L0,-1" stroke="#6fae7c" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M0,1 C-6,0 -7,-6 -6,-7 C-1,-7 0,-3 0,1 Z" fill="#8bc34a" />
          <path d="M0,-1 C5,-2 7,-7 6,-8 C1,-8 0,-5 0,-1 Z" fill="#6fae7c" />
        </svg>
      );
    case "summer":
      return (
        <svg width={16} height={16} viewBox="-10 -10 20 20">
          <circle r={4.2} fill="#f0c869" />
          <g stroke="#f0c869" strokeWidth={1.5} strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line key={angle} x1={0} y1={-6.2} x2={0} y2={-8.6} transform={`rotate(${angle})`} />
            ))}
          </g>
        </svg>
      );
    case "autumn":
      return (
        <svg width={16} height={16} viewBox="-10 -10 20 20">
          <path d="M0,-8.5 L2,-3.5 L7,-5 L4.5,0 L8,2.5 L3,3.5 L3.5,7 L0,5 L-3.5,7 L-3,3.5 L-8,2.5 L-4.5,0 L-7,-5 L-2,-3.5 Z" fill="#d9822b" stroke="#8a4a14" strokeWidth={0.6} />
          <line x1={0} y1={5} x2={0} y2={9} stroke="#8a4a14" strokeWidth={1.2} strokeLinecap="round" />
        </svg>
      );
    case "winter":
      return (
        <svg width={16} height={16} viewBox="-10 -10 20 20">
          <g stroke="#bfe3f5" strokeWidth={1.5} strokeLinecap="round">
            {[0, 60, 120].map((angle) => (
              <g key={angle} transform={`rotate(${angle})`}>
                <line x1={0} y1={-8} x2={0} y2={8} />
                <polyline points="-2.4,-6.2 0,-4 2.4,-6.2" fill="none" />
                <polyline points="-2.4,6.2 0,4 2.4,6.2" fill="none" />
              </g>
            ))}
          </g>
        </svg>
      );
  }
}

function PlayIcon() {
  return (
    <svg width={14} height={14} viewBox="-10 -10 20 20">
      <polygon points="-5,-8 8,0 -5,8" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width={14} height={14} viewBox="-10 -10 20 20">
      <rect x={-6} y={-8} width={4.5} height={16} fill="currentColor" />
      <rect x={1.5} y={-8} width={4.5} height={16} fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width={16} height={16} viewBox="-10 -10 20 20">
      <polygon points="-8,-3 -3,-3 3,-9 3,9 -3,3 -8,3" fill="currentColor" />
      {!muted && (
        <g stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" fill="none">
          <path d="M6,-3.5 Q9,0 6,3.5" />
          <path d="M8,-6 Q13,0 8,6" opacity={0.7} />
        </g>
      )}
      {muted && (
        <g stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
          <line x1={5.5} y1={-4.5} x2={12} y2={4.5} />
          <line x1={12} y1={-4.5} x2={5.5} y2={4.5} />
        </g>
      )}
    </svg>
  );
}

// A slip of paper with writing on it: the hover tips. Struck through when off.
function TipsIcon({ off }: { off: boolean }) {
  return (
    <svg width={16} height={16} viewBox="-10 -10 20 20">
      <path d="M-8,-7 H8 V4 H-1 L-5,8 V4 H-8 Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <g stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" opacity={off ? 0.5 : 1}>
        <line x1={-4.5} y1={-3.2} x2={4.5} y2={-3.2} />
        <line x1={-4.5} y1={0.3} x2={2} y2={0.3} />
      </g>
      {off && <line x1={-9} y1={8.5} x2={9} y2={-8.5} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />}
    </svg>
  );
}

// A quill, for the feedback form.
function FeedbackIcon() {
  return (
    <svg width={16} height={16} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d="M8,-9 C2,-8 -4,-3 -6,5 L-8,9 L-4,7 C3,5 7,-2 8,-9 Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M-4,5 L3,-3" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

interface TopBarProps {
  locked: Partial<Record<PanelKey, string>>; // tabs still shut, and when they open (see domain/chapters)
  electionThreshold: number; // support needed to win the next election
  nationName: string;
  partyName: string;
  partyColor: string;
  date: GameDate;
  isPaused: boolean;
  speed: GameSpeed;
  stats: CountryStats;
  unrestStage: UnrestStage;
  shortages: MaterialShortage[]; // building materials about to run out — see getMaterialShortages
  lastDayLedger: Ledger;
  monthLedger: Ledger;
  forecasts: Forecasts;
  production: DailyProductionSummary;
  heating: HeatingOutlook;
  debt: number;
  activePanel: PanelKey | null;
  reportsBadgeCount: number;
  advisor?: ReactNode; // the "what needs you now" row, see AdvisorStrip
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: GameSpeed) => void;
  onOpenPanel: OpenPanel;
}

export function TopBar({
  locked,
  electionThreshold,
  nationName,
  partyName,
  partyColor,
  date,
  isPaused,
  speed,
  stats,
  unrestStage,
  shortages,
  lastDayLedger,
  monthLedger,
  forecasts,
  production,
  heating,
  debt,
  activePanel,
  reportsBadgeCount,
  advisor,
  onPause,
  onResume,
  onSetSpeed,
  onOpenPanel,
}: TopBarProps) {
  const [muted, setMutedState] = useState(() => isMuted());
  const [tipsOn, setTipsOnState] = useState(() => areTipsOn());
  const supportPercent = Math.round(stats.popularity);
  const electionMonths = monthsUntilNextElection(date);

  // Publish the bar's real height for Modal.css, which hangs every panel
  // just below it — the bar grows when its rows wrap on a narrow window or
  // the advisor row changes, and a stale guess would tuck a panel's title
  // under it.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const bar = ref.current;
    if (!bar) return;
    const publish = () => document.documentElement.style.setProperty("--top-bar-height", `${bar.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="top-bar surface-leather" ref={ref}>
      <div className="top-bar__main">
        {/* The nation's label is the way into Politics: it carries the two
            numbers that matter there — support, and the months to the
            vote — so it reads as more than a name plate. */}
        <button
          type="button"
          className={`top-bar__nation ${activePanel === "politics" ? "is-active" : ""}`}
          style={{ "--party-color": partyColor } as CSSProperties}
          onClick={() => onOpenPanel("politics")}
          aria-current={activePanel === "politics" ? "true" : undefined}
          aria-label={`Politics: ${nationName}, ${partyName}: support ${supportPercent}%, ${electionThreshold}% needed, election in ${electionMonths} months`}
          title="Politics: the election, support, unrest and the neighbours"
        >
          <span className="top-bar__nation-name">{nationName}</span>
          <span className="top-bar__party">{partyName}</span>
          <span className={`top-bar__nation-politics ${supportPercent < electionThreshold ? "is-losing" : ""}`}>
            <NavIcon type="politics" size={15} />
            Needs {electionThreshold}% in {electionMonths} mo
          </span>
          {/* The seal says this plate opens something: Politics. */}
          <span className="top-bar__nation-seal" aria-hidden="true">
            <NavIcon type="politics" size={20} />
          </span>
        </button>

        <div className="top-bar__ticker">
          <ResourceTicker
            stats={stats}
            electionThreshold={electionThreshold}
            unrestStage={unrestStage}
            production={production}
            debt={debt}
            heating={heating}
            shortages={shortages}
            lastDayLedger={lastDayLedger}
            monthLedger={monthLedger}
            forecasts={forecasts}
            onOpenReports={() => onOpenPanel("reports")}
          />
        </div>

        <nav className="top-bar__tabs" aria-label="Panels">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`top-bar__tab ${activePanel === tab.key ? "is-active" : ""} ${locked[tab.key] ? "is-locked" : ""}`}
              onClick={() => onOpenPanel(tab.key)}
              disabled={!!locked[tab.key]}
              title={locked[tab.key] ? `${tab.label}: ${locked[tab.key]}` : tab.label}
              aria-current={activePanel === tab.key ? "true" : undefined}
              aria-label={tab.key === "reports" && reportsBadgeCount > 0 ? `${tab.label}, ${reportsBadgeCount} unread` : tab.label}
            >
              <span className="top-bar__tab-icon">
                {tab.icon()}
                {tab.key === "reports" && reportsBadgeCount > 0 && (
                  <span className="top-bar__tab-badge" aria-hidden="true">
                    {reportsBadgeCount > 9 ? "9+" : reportsBadgeCount}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>

        {/* The calendar and the clock, one plate: the date over its
            controls, as in HOI4. Paused, the Resume button is gilt — the
            one thing to press. */}
        <div className={`top-bar__clock ${isPaused ? "is-paused" : ""}`}>
          <div className="top-bar__clock-date">
            <span className={`top-bar__date top-bar__date--${production.season}`} title={SEASON_LABELS[production.season]}>
              <SeasonIcon season={production.season} />
              <DateIcon />
              {formatDate(date)}
            </span>
            <button
              className="top-bar__icon-button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                setMutedState(next);
              }}
              aria-label={muted ? "Unmute sound" : "Mute sound"}
              aria-pressed={muted}
            >
              <SpeakerIcon muted={muted} />
            </button>
            <button
              className="top-bar__icon-button"
              onClick={() => {
                setTipsOn(!tipsOn);
                setTipsOnState(!tipsOn);
              }}
              aria-label={tipsOn ? "Turn off hover tips" : "Turn on hover tips"}
              aria-pressed={!tipsOn}
              title={tipsOn ? "Hover tips are on. Rest the pointer on something to have it explained. Hold Shift to see a tip at once." : "Hover tips are off. Hold Shift over something to have it explained."}
            >
              <TipsIcon off={!tipsOn} />
            </button>
            {FEEDBACK_URL && (
              <a className="top-bar__icon-button" href={FEEDBACK_URL} target="_blank" rel="noreferrer" aria-label="Send feedback" title="Tell us what you think: opens a short form">
                <FeedbackIcon />
              </a>
            )}
          </div>

          <div className="top-bar__clock-controls">
            <button className={`top-bar__pause-button ${isPaused ? "btn-primary" : ""}`} onClick={isPaused ? onResume : onPause} title="Space">
              {isPaused ? <PlayIcon /> : <PauseIcon />}
              <span className="top-bar__pause-label">{isPaused ? "Resume" : "Pause"}</span>
            </button>

            <div className="top-bar__speeds" role="group" aria-label="Speed">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`top-bar__speed-button ${speed === s && !isPaused ? "is-active" : ""}`}
                  onClick={() => onSetSpeed(s)}
                  aria-pressed={speed === s && !isPaused}
                  title={`Speed ${s} (key ${s})`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {advisor}
    </header>
  );
}
