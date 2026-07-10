import "./GameEndScreen.css";
import type { CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL, ELECTIONS_TO_WIN_GAME } from "../../domain/constants";
import type { GameOutcome, GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";
import { StatIcon } from "./StatIcon";

interface GameEndScreenProps {
  state: GameState;
  onNewGame: () => void;
}

const OUTCOME_COPY: Record<GameOutcome, { eyebrow: (nation: string) => string; title: string; className: string }> = {
  collapsed: {
    eyebrow: (nation) => `The Reign of ${nation} Ends`,
    title: "Government Collapsed",
    className: "is-defeat",
  },
  "voted-out": {
    eyebrow: (nation) => `The Reign of ${nation} Ends`,
    title: "Voted Out of Office",
    className: "is-defeat",
  },
  victory: {
    eyebrow: (nation) => `${nation} Remembers`,
    title: "Election Victory",
    className: "is-victory",
  },
};

// Shown once GameState.isGameOver flips true (see simulateDay.ts): a
// stability collapse, a lost general election, or — the actual win
// condition — enough election wins in a row to cement outright rule.
export function GameEndScreen({ state, onNewGame }: GameEndScreenProps) {
  const nation = getNation(state.nationId);
  const party = getParty(state.partyId);
  const outcome = state.outcome ?? "collapsed";
  const copy = OUTCOME_COPY[outcome];

  return (
    <div className={`game-end-screen ${copy.className}`}>
      <div className="game-end-screen__content">
        <p className="game-end-screen__eyebrow">{copy.eyebrow(nation.name)}</p>
        <h1 className="game-end-screen__title">{copy.title}</h1>

        <span className="game-end-screen__party" style={{ "--party-color": party.color } as CSSProperties}>
          <span className="game-end-screen__party-dot" />
          {party.name}
        </span>

        <p className="game-end-screen__reason">{state.gameOverReason}</p>

        <div className="game-end-screen__stats">
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="popularity" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Elections Won</span>
              <span className="icon-tile__value">
                {state.electionsWon} / {ELECTIONS_TO_WIN_GAME}
              </span>
            </div>
          </div>
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="treasury" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Final Treasury</span>
              <span className="icon-tile__value">
                {Math.round(state.stats.treasury).toLocaleString()} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="population" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Final Population</span>
              <span className="icon-tile__value">{Math.round(state.stats.population).toLocaleString()}</span>
            </div>
          </div>
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="stability" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Reign Lasted Until</span>
              <span className="icon-tile__value">{formatDate(state.date)}</span>
            </div>
          </div>
        </div>

        <button className="game-end-screen__button" onClick={onNewGame}>
          Start a New Game
        </button>
      </div>
    </div>
  );
}
