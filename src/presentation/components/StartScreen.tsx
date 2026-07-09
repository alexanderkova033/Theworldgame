import type { CSSProperties } from "react";
import { getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";

interface StartScreenProps {
  nations: Nation[];
  onSelectNation: (nationId: string) => void;
}

export function StartScreen({ nations, onSelectNation }: StartScreenProps) {
  const { width, height, coastPath, provinces } = MAP_GEOMETRY;

  return (
    <div className="start-screen">
      <div className="start-screen__content">
        <p className="start-screen__eyebrow">A nation-building chronicle</p>
        <h1 className="start-screen__title">The World Game</h1>
        <p className="start-screen__subtitle">
          The continent enters a new century. Choose the nation you'll carry forward — this choice
          cannot be undone once the clock starts.
        </p>

        <svg viewBox={`0 0 ${width} ${height}`} className="start-screen__map" aria-hidden="true">
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
              <span className="nation-card__crest" />
              <span className="nation-card__name">{nation.name}</span>
              <span className="nation-card__blurb">{nation.blurb}</span>
              <span className="nation-card__cta">Play as {nation.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
