import "./StartScreen.css";
import type { CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import { getNation, getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { getParty } from "../../domain/parties/partyRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { SavedGamePreview } from "../hooks/useGameClock";
import { cogPoints, starPoints } from "./iconShapes";

interface StartScreenProps {
  nations: Nation[];
  savedGame: SavedGamePreview | null;
  onContinue: () => void;
  onSelectNation: (nationId: string) => void;
}

export function StartScreen({ nations, savedGame, onContinue, onSelectNation }: StartScreenProps) {
  const { width, height, coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;

  return (
    <div className="start-screen">
      <div className="start-screen__content">
        <p className="start-screen__eyebrow">A nation-building chronicle</p>
        <h1 className="start-screen__title">The World Game</h1>
        <p className="start-screen__subtitle">
          The continent enters a new century. Choose the nation you'll carry forward — this choice
          cannot be undone once the clock starts.
        </p>

        {savedGame && (
          <div className="start-screen__continue">
            <button className="start-screen__continue-button" onClick={onContinue}>
              Continue as the {getParty(savedGame.partyId).name} of {getNation(savedGame.nationId).name} —{" "}
              {formatDate(savedGame.date)}
            </button>
            <p className="start-screen__continue-hint">Picking a nation below starts a new game and overwrites this save.</p>
          </div>
        )}

        <svg viewBox={`0 0 ${width} ${height}`} className="start-screen__map" aria-hidden="true">
          {otherLandmasses.map((land) => (
            <path key={land.id} d={land.path} className="start-screen__unclaimed-land" />
          ))}
          <path d={coastPath} className="start-screen__coast" />
          {provinces.map((province) => {
            const owner = getNationForProvince(province.id);
            return (
              <path
                key={province.id}
                d={province.path}
                className="start-screen__province"
                style={owner ? ({ "--nation-color": owner.color } as CSSProperties) : undefined}
                onClick={owner ? () => onSelectNation(owner.id) : undefined}
              >
                <title>{province.name}{owner ? ` — ${owner.name}` : ""}</title>
              </path>
            );
          })}
        </svg>

        <div className="start-screen__nations">
          {nations.map((nation) => (
            <button
              key={nation.id}
              className="nation-card"
              style={{ "--nation-color": nation.color } as CSSProperties}
              onClick={() => onSelectNation(nation.id)}
            >
              <span className="nation-card__crest">
                <CrestEmblem nationId={nation.id} />
              </span>
              <span className="nation-card__name">{nation.name}</span>
              <span className="nation-card__blurb">{nation.blurb}</span>
              <span className="nation-card__bonus">{nation.startingBonus}</span>
              <span className="nation-card__cta">Play as {nation.name}</span>
            </button>
          ))}
        </div>
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
            <circle cx={0} cy={0} r={2.1} className="nation-card__crest-hole" />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={22} height={22} viewBox="-8 -8 16 16">
      {emblem}
    </svg>
  );
}
