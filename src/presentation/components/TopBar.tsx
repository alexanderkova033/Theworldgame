import "./TopBar.css";
import { formatDate } from "../../domain/country/calendar";
import type { CountryStats, GameDate, GameSpeed } from "../../domain/country/types";
import type { ResourceBundle } from "../../domain/resources/types";
import { NavIcon, type NavIconType } from "./NavIcon";
import { ResourceTicker } from "./ResourceTicker";

const SPEEDS: GameSpeed[] = [1, 2, 3, 5];

export type PanelKey = "economy" | "reports" | "laws" | "ventures";

const TABS: Array<{ key: PanelKey; label: string; icon: NavIconType }> = [
  { key: "economy", label: "Economy", icon: "economy" },
  { key: "reports", label: "Reports", icon: "reports" },
  { key: "laws", label: "Laws", icon: "laws" },
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

interface TopBarProps {
  nationName: string;
  date: GameDate;
  isPaused: boolean;
  speed: GameSpeed;
  stats: CountryStats;
  resources: ResourceBundle;
  activePanel: PanelKey | null;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: GameSpeed) => void;
  onOpenPanel: (panel: PanelKey) => void;
}

export function TopBar({
  nationName,
  date,
  isPaused,
  speed,
  stats,
  resources,
  activePanel,
  onPause,
  onResume,
  onSetSpeed,
  onOpenPanel,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="top-bar__row top-bar__row--ticker">
        <span className="top-bar__nation">{nationName}</span>

        <ResourceTicker stats={stats} resources={resources} />

        <div className="top-bar__spacer" />

        <span className="top-bar__date">
          <DateIcon />
          {formatDate(date)}
        </span>

        <button className="top-bar__pause-button" onClick={isPaused ? onResume : onPause}>
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
      </div>

      <div className="top-bar__row top-bar__row--tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`top-bar__tab ${activePanel === tab.key ? "is-active" : ""}`}
            onClick={() => onOpenPanel(tab.key)}
          >
            <NavIcon type={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
