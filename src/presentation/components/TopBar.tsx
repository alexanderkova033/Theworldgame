import "./TopBar.css";
import { useState, type CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import type { CountryStats, GameDate, GameSpeed } from "../../domain/country/types";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import type { ResourceBundle } from "../../domain/resources/types";
import { isMuted, setMuted } from "../audio/sound";
import { NavIcon, type NavIconType } from "./NavIcon";
import { ResourceTicker } from "./ResourceTicker";

const SPEEDS: GameSpeed[] = [1, 2, 3, 5];

export type PanelKey = "politics" | "economy" | "reports" | "laws" | "research" | "ventures";

const TABS: Array<{ key: PanelKey; label: string; icon: NavIconType }> = [
  { key: "politics", label: "Politics", icon: "politics" },
  { key: "economy", label: "Economy", icon: "economy" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "laws", label: "Laws", icon: "laws" },
  { key: "research", label: "Research", icon: "research" },
  { key: "ventures", label: "Ventures", icon: "ventures" },
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

interface TopBarProps {
  nationName: string;
  partyName: string;
  partyColor: string;
  date: GameDate;
  isPaused: boolean;
  speed: GameSpeed;
  stats: CountryStats;
  resources: ResourceBundle;
  production: DailyProductionSummary;
  debt: number;
  activePanel: PanelKey | null;
  reportsBadgeCount: number;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: GameSpeed) => void;
  onOpenPanel: (panel: PanelKey) => void;
  onReplayTutorial: () => void;
}

// A small "?" for relaunching the first-run spotlight tour on demand — see
// TutorialOverlay.tsx.
function HelpIcon() {
  return (
    <svg width={14} height={14} viewBox="-10 -10 20 20">
      <circle cx={0} cy={0} r={8.5} fill="none" stroke="currentColor" strokeWidth={1.4} />
      <path d="M-2.6,-3 Q-2.6,-6 0,-6 Q2.8,-6 2.8,-3.2 Q2.8,-1 0,0.4 L0,2" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <circle cx={0} cy={5.2} r={1.1} fill="currentColor" />
    </svg>
  );
}

export function TopBar({
  nationName,
  partyName,
  partyColor,
  date,
  isPaused,
  speed,
  stats,
  resources,
  production,
  debt,
  activePanel,
  reportsBadgeCount,
  onPause,
  onResume,
  onSetSpeed,
  onOpenPanel,
  onReplayTutorial,
}: TopBarProps) {
  const [muted, setMutedState] = useState(() => isMuted());

  return (
    <header className="top-bar">
      <div className="top-bar__row top-bar__row--ticker">
        <span className="top-bar__nation">
          {nationName}
          <span className="top-bar__party" style={{ "--party-color": partyColor } as CSSProperties}>
            {partyName}
          </span>
        </span>

        <ResourceTicker stats={stats} resources={resources} production={production} debt={debt} />

        <div className="top-bar__spacer" />

        <button className="top-bar__mute-button" onClick={onReplayTutorial} aria-label="Replay tutorial" title="Replay tutorial">
          <HelpIcon />
        </button>

        <button
          className="top-bar__mute-button"
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

        <span className="top-bar__date">
          <DateIcon />
          {formatDate(date)}
        </span>

        <span className="top-bar__pause-speed" data-tutorial="pause-speed">
          <button className="top-bar__pause-button" onClick={isPaused ? onResume : onPause} title="Space">
            {isPaused ? <PlayIcon /> : <PauseIcon />}
            {isPaused ? "Resume" : "Pause"}
          </button>

          <div className="top-bar__speeds">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`top-bar__speed-button ${speed === s && !isPaused ? "is-active" : ""}`}
                onClick={() => onSetSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </span>
      </div>

      <div className="top-bar__row top-bar__row--tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`top-bar__tab ${activePanel === tab.key ? "is-active" : ""}`}
            onClick={() => onOpenPanel(tab.key)}
            data-tutorial={`tab-${tab.key}`}
            aria-label={tab.key === "reports" && reportsBadgeCount > 0 ? `${tab.label}, ${reportsBadgeCount} unread` : tab.label}
          >
            <span className="top-bar__tab-icon">
              <NavIcon type={tab.icon} />
              {tab.key === "reports" && reportsBadgeCount > 0 && (
                <span className="top-bar__tab-badge" aria-hidden="true">
                  {reportsBadgeCount > 9 ? "9+" : reportsBadgeCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
