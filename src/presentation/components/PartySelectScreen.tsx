import "./PartySelectScreen.css";
import { useState, type CSSProperties } from "react";
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from "../../domain/difficulty/difficultyData";
import type { Nation } from "../../domain/nations/types";
import type { Party } from "../../domain/parties/types";
import { describeEffects } from "../../domain/policy/modifiers";
import { IDEOLOGY_CARES } from "../../domain/parties/rivalRules";
import { starPoints } from "./iconShapes";
import { MapWatermark } from "./StartScreen";
import { MODES, MODE_SETTINGS, type GameMode } from "../../domain/reign/reignData";

interface PartySelectScreenProps {
  nation: Nation;
  parties: Party[];
  onBack: () => void;
  onSelectParty: (partyId: string, difficulty: Difficulty, mode: GameMode) => void;
}

// The second half of starting a game: which of the nation's two parties the
// player actually leads. This is the choice the whole rest of the game
// measures you against — win elections as this party, or get voted out.
export function PartySelectScreen({ nation, parties, onBack, onSelectParty }: PartySelectScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const level = DIFFICULTY_SETTINGS[difficulty];
  const [mode, setMode] = useState<GameMode>("terms");
  return (
    <div className="start-screen party-select-screen">
      <MapWatermark />
      <div className="start-screen__content">
        <button className="party-select-screen__back" onClick={onBack}>
          ← Choose a different nation
        </button>

        <p className="start-screen__eyebrow" style={{ color: nation.color }}>
          {nation.name}
        </p>
        <h1 className="start-screen__title">Lead a Party</h1>
        <p className="start-screen__subtitle">
          Every law, tax and venture from here on is measured by one thing: whether the people still back you. The
          two parties govern differently, so pick the one whose strengths you want.
        </p>

        {/* How the game ends: three terms, or as long as you can hold on. */}
        <div className="difficulty-picker">
          <div className="difficulty-picker__levels" role="radiogroup" aria-label="Mode">
            {MODES.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                className={`difficulty-picker__level ${mode === key ? "is-active" : ""}`}
                onClick={() => setMode(key)}
              >
                {MODE_SETTINGS[key].name}
              </button>
            ))}
          </div>
          <p className="difficulty-picker__summary">{MODE_SETTINGS[mode].summary}</p>
        </div>

        {/* How hard: every change from Normal, listed in plain words. */}
        <div className="difficulty-picker">
          <div className="difficulty-picker__levels" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTIES.map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={difficulty === key}
                className={`difficulty-picker__level ${difficulty === key ? "is-active" : ""}`}
                onClick={() => setDifficulty(key)}
              >
                {DIFFICULTY_SETTINGS[key].name}
              </button>
            ))}
          </div>
          <p className="difficulty-picker__summary">{level.summary}</p>
          <ul className="difficulty-picker__changes">
            {level.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>

        <div className="party-select-screen__grid">
          {parties.map((party) => (
            <button
              key={party.id}
              className="party-card"
              style={{ "--party-color": party.color } as CSSProperties}
              onClick={() => onSelectParty(party.id, difficulty, mode)}
            >
              <span className="party-card__crest">
                <PartyCrestEmblem ideology={party.ideology} />
              </span>
              <span className="party-card__name">{party.name}</span>
              <span className="party-card__ideology">{party.ideology}</span>
              <span className="party-card__description">{party.description}</span>
              <span className="party-card__platform">{party.platform}</span>
              {/* What governing as this party changes: a button holds
                  only inline content, so the lists are spans. */}
              <span className="party-card__creed">
                <span className="party-card__creed-label">In power</span>
                {describeEffects(party.creed).gains.map((line) => (
                  <span key={line.key} className="party-card__perk is-gain">
                    + {line.text}
                  </span>
                ))}
                {describeEffects(party.creed).costs.map((line) => (
                  <span key={line.key} className="party-card__perk is-loss">
                    − {line.text}
                  </span>
                ))}
              </span>
              <span className="party-card__cares">
                Backs laws for {IDEOLOGY_CARES[party.ideology].for}
              </span>
              <span className="party-card__cta">Lead the {party.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
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
