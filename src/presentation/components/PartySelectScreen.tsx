import "./PartySelectScreen.css";
import { useState, type CSSProperties } from "react";
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from "../../domain/difficulty/difficultyData";
import type { Nation } from "../../domain/nations/types";
import type { Party } from "../../domain/parties/types";
import { describeEffects } from "../../domain/policy/modifiers";
import { IDEOLOGY_CARES } from "../../domain/parties/rivalRules";
import { starPoints } from "./iconShapes";
import { MapWatermark } from "./StartScreen";
import { formatReign } from "../formatNumber";
import { getBestReign } from "../hooks/records";
import { MODES, MODE_SETTINGS, type GameMode } from "../../domain/reign/reignData";

interface PartySelectScreenProps {
  nation: Nation;
  parties: Party[];
  onBack: () => void;
  onSelectParty: (partyId: string, difficulty: Difficulty, mode: GameMode) => void;
}

// The second half of starting a game: how it ends, how hard it is, and
// which of the nation's two parties the player leads. The first two sit on
// a leather board, as tiles and rank badges; the parties stand below as
// cards in their own colours.
export function PartySelectScreen({ nation, parties, onBack, onSelectParty }: PartySelectScreenProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const level = DIFFICULTY_SETTINGS[difficulty];
  const [mode, setMode] = useState<GameMode>("terms");
  const best = mode === "long-reign" ? getBestReign(difficulty) : null;
  // A Long Reign has no retries, so that line doesn't apply to it.
  const changes = level.changes.filter((change) => mode !== "long-reign" || !/retr/i.test(change));

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
        <h1 className="start-screen__title">Take Office</h1>
        <p className="start-screen__subtitle">How your rule ends, how hard the road, and which party you lead.</p>

        <div className="terms-board">
          <section className="terms-board__half" aria-labelledby="terms-mode">
            <h2 className="terms-board__label" id="terms-mode">
              How it ends
            </h2>
            <div className="terms-board__modes" role="radiogroup" aria-labelledby="terms-mode">
              {MODES.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  className={`mode-tile ${mode === key ? "is-active" : ""}`}
                  onClick={() => setMode(key)}
                  title={MODE_SETTINGS[key].summary}
                >
                  <ModeEmblem mode={key} />
                  <span className="mode-tile__name">{MODE_SETTINGS[key].name}</span>
                  <span className="mode-tile__summary">{MODE_SETTINGS[key].tagline}</span>
                </button>
              ))}
            </div>
            {/* What to expect: the usual length of a campaign, or the reign to beat. */}
            <p className="terms-board__record">
              {mode === "terms"
                ? "A careful game lasts about four and a half years."
                : best
                  ? `Your longest on ${level.name}: ${formatReign(best.months)}`
                  : `No reign on ${level.name} yet`}
            </p>
          </section>

          <section className="terms-board__half" aria-labelledby="terms-level">
            <h2 className="terms-board__label" id="terms-level">
              How hard
            </h2>
            <div className="terms-board__ranks" role="radiogroup" aria-labelledby="terms-level">
              {DIFFICULTIES.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === key}
                  className={`rank-badge rank-badge--${key} ${difficulty === key ? "is-active" : ""}`}
                  onClick={() => setDifficulty(key)}
                  title={DIFFICULTY_SETTINGS[key].summary}
                >
                  <RankInsignia chevrons={i + 1} />
                  <span className="rank-badge__name">{DIFFICULTY_SETTINGS[key].name}</span>
                  <span className="rank-badge__title">{DIFFICULTY_SETTINGS[key].title}</span>
                </button>
              ))}
            </div>
            <p className="terms-board__summary">{level.summary}</p>
            <ul className="terms-board__changes">
              {changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="party-select-screen__grid">
          {parties.map((party) => {
            const creed = describeEffects(party.creed);
            return (
              <button
                key={party.id}
                className="party-card"
                style={{ "--party-color": party.color } as CSSProperties}
                onClick={() => onSelectParty(party.id, difficulty, mode)}
                title={party.description}
              >
                <span className="party-card__banner" aria-hidden="true">
                  <span className="party-card__crest">
                    <PartyCrestEmblem ideology={party.ideology} />
                  </span>
                </span>
                <span className="party-card__name">{party.name}</span>
                <span className="party-card__ideology">{party.ideology}</span>
                <span className="party-card__platform">{party.platform}</span>
                {/* What governing as this party changes: a button holds
                    only inline content, so the lists are spans. */}
                <span className="party-card__creed">
                  {creed.gains.map((line) => (
                    <span key={line.key} className="party-card__perk is-gain">
                      <span className="party-card__mark" aria-label="Gain">▲</span>
                      {line.text}
                    </span>
                  ))}
                  {creed.costs.map((line) => (
                    <span key={line.key} className="party-card__perk is-loss">
                      <span className="party-card__mark" aria-label="Cost">▼</span>
                      {line.text}
                    </span>
                  ))}
                </span>
                <span className="party-card__cares">Backs laws for {IDEOLOGY_CARES[party.ideology].for}</span>
                <span className="party-card__cta">Lead the {party.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// How a game ends, drawn: three stars for three elections won, an hourglass
// for a reign that runs until it runs out.
function ModeEmblem({ mode }: { mode: GameMode }) {
  return (
    <svg className="mode-tile__emblem" viewBox="-20 -14 40 28" width={64} height={45} aria-hidden="true">
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
    <svg className="rank-badge__shield" viewBox="-10 -11 20 22" width={42} height={46} aria-hidden="true">
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
