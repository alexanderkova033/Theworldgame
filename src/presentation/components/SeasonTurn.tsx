// The turn of a season, played across the whole screen: a band of the new
// season's colour sweeps over everything while snow, leaves, blossom or
// motes of summer light fall through it, and a card names the season and
// what it means for the farms. The map's own wash eases over underneath
// (MapSeasons), so when the band has passed the country looks different.
// It never takes a click and never stops the clock; hooks/useSeasonTurn.ts
// decides when it plays.
import "./SeasonTurn.css";
import type { CSSProperties } from "react";
import type { Season } from "../../domain/country/calendar";

const NAMES: Record<Season, string> = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" };

const LINES: Record<Season, string> = {
  spring: "The thaw. The fields are workable again.",
  summer: "Long days. The farms grow well, and no home needs heating.",
  autumn: "The harvest. Farms yield their best of the year: stock up for winter.",
  winter: "Winter sets in. Farms yield little, and homes burn coal or wood.",
};

const FALLING = 34;

// One thing falling (or, in summer, drifting up), its place and pace fixed
// by its number so a turn always looks the same.
function Flake({ season, i }: { season: Season; i: number }) {
  const seed = (n: number) => {
    const x = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const size = 8 + seed(3) * 12;
  const style = {
    left: `${seed(1) * 100}%`,
    width: size,
    height: size,
    animationDelay: `${seed(2) * 1.6}s`,
    animationDuration: `${2.6 + seed(4) * 1.6}s`,
    "--drift": `${(seed(5) - 0.5) * 160}px`,
    "--turn": `${(seed(6) - 0.5) * 720}deg`,
  } as CSSProperties;
  return (
    <svg className="season-turn__flake" style={style} viewBox="-10 -10 20 20" aria-hidden="true">
      {season === "winter" && <circle r={5 + seed(7) * 3} fill="#fbf8f0" stroke="#6f7f8c" strokeWidth={0.8} />}
      {season === "autumn" && (
        <g fill={["#b8521c", "#d4892a", "#9b3a17"][i % 3]} stroke="#4a2410" strokeWidth={0.8}>
          <path d="M-9 0Q0 -7.5 9 0Q0 7.5 -9 0Z" />
          <path d="M-9 0H10" fill="none" />
        </g>
      )}
      {season === "spring" && (
        <g fill="#e9a9b6" stroke="#8a4a58" strokeWidth={0.6}>
          <ellipse rx={4} ry={7} />
        </g>
      )}
      {season === "summer" && <path d="M0 -8L2 -2L8 0L2 2L0 8L-2 2L-8 0L-2 -2Z" fill="#f1d27a" stroke="#7a5a12" strokeWidth={0.6} />}
    </svg>
  );
}

export function SeasonTurn({ turning: shown }: { turning: Season | null }) {
  if (!shown) return null;
  return (
    <div key={shown} className={`season-turn season-turn--${shown}`} role="status" aria-live="polite">
      <div className="season-turn__band" />
      <div className={`season-turn__fall ${shown === "summer" ? "is-rising" : ""}`}>
        {Array.from({ length: FALLING }, (_, i) => (
          <Flake key={i} season={shown} i={i} />
        ))}
      </div>
      <div className="season-turn__card surface-leather">
        <span className="season-turn__name">{NAMES[shown]}</span>
        <span className="season-turn__line">{LINES[shown]}</span>
      </div>
    </div>
  );
}
