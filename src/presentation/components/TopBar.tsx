import "./TopBar.css";
import { formatDate } from "../../domain/country/calendar";
import type { GameDate, GameSpeed } from "../../domain/country/types";

const SPEEDS: GameSpeed[] = [1, 2, 3, 5];

interface TopBarProps {
  nationName: string;
  date: GameDate;
  isPaused: boolean;
  speed: GameSpeed;
  onPause: () => void;
  onResume: () => void;
  onSetSpeed: (speed: GameSpeed) => void;
  onOpenLaws: () => void;
  onOpenVentures: () => void;
}

export function TopBar({
  nationName,
  date,
  isPaused,
  speed,
  onPause,
  onResume,
  onSetSpeed,
  onOpenLaws,
  onOpenVentures,
}: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar__nation">{nationName}</span>
      <span className="top-bar__date">{formatDate(date)}</span>

      <button
        className="top-bar__pause-button"
        onClick={isPaused ? onResume : onPause}
      >
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

      <div className="top-bar__spacer" />

      <div className="top-bar__panel-buttons">
        <button onClick={onOpenLaws}>Laws</button>
        <button onClick={onOpenVentures}>Ventures</button>
      </div>
    </header>
  );
}
