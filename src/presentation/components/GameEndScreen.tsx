import "./GameEndScreen.css";
import type { CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL, ELECTIONS_TO_WIN_GAME } from "../../domain/constants";
import type { GameOutcome, GameState } from "../../domain/country/types";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";
import { explainDefeat } from "../../domain/ledger/defeatRules";
import { DefeatStory } from "./DefeatStory";
import { StatIcon } from "./StatIcon";
import { formatAmount, formatReign } from "../formatNumber";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { getReignMonths, isLongReign } from "../../domain/reign/reignRules";
import type { ReignRecord } from "../hooks/records";

export interface Retry {
  chapterTitle: string; // the chapter the checkpoint was taken at
  left: number;
  total: number; // what the difficulty allows in a game
}

// A Long Reign's length against the best before it on the same difficulty.
export interface ReignResult {
  previous: ReignRecord | null;
  isNew: boolean;
}

interface GameEndScreenProps {
  state: GameState;
  onNewGame: () => void;
  retry: Retry | null; // null when there's no checkpoint to go back to
  onRetry: () => void;
  reign: ReignResult | null; // a Long Reign only
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
export function GameEndScreen({ state, onNewGame, retry, onRetry, reign }: GameEndScreenProps) {
  const nation = getNation(state.nationId);
  const party = getParty(state.partyId);
  const outcome = state.outcome ?? "collapsed";
  const copy = OUTCOME_COPY[outcome];
  const story = explainDefeat(state);

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

        {story && <DefeatStory story={story} />}

        <div className="game-end-screen__stats">
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="popularity" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Elections Won</span>
              <span className="icon-tile__value">
                {isLongReign(state) ? state.electionsWon : `${state.electionsWon} / ${ELECTIONS_TO_WIN_GAME}`}
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
                {formatAmount(Math.round(state.stats.treasury))} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="population" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">Final Population</span>
              <span className="icon-tile__value">{formatAmount(Math.round(state.stats.population))}</span>
            </div>
          </div>
          <div className="icon-tile">
            <div className="icon-tile__icon">
              <StatIcon type="stability" />
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">{isLongReign(state) ? "Reign Lasted" : "Reign Lasted Until"}</span>
              <span className="icon-tile__value">{isLongReign(state) ? formatReign(getReignMonths(state.date)) : formatDate(state.date)}</span>
            </div>
          </div>
        </div>

        {/* A Long Reign has no retries: only the record. */}
        {reign && (
          <p className={`game-end-screen__record ${reign.isNew ? "is-new" : ""}`}>
            {reign.isNew
              ? `Your longest reign yet on ${getDifficulty(state.difficulty).name}.`
              : `Your longest reign on ${getDifficulty(state.difficulty).name}: ${formatReign(reign.previous!.months)}, as ${getNation(reign.previous!.nationId).name}.`}
          </p>
        )}

        {/* Going back costs everything since that chapter began, and the
            difficulty decides how often it's allowed. */}
        {outcome !== "victory" && !isLongReign(state) && retry && (
          <div className="game-end-screen__retry">
            {retry.left > 0 ? (
              <>
                <button className="game-end-screen__button" onClick={onRetry}>
                  Go back to the start of “{retry.chapterTitle}”
                </button>
                <span className="game-end-screen__retries">
                  {retry.left} of {retry.total} {retry.total === 1 ? "retry" : "retries"} left
                </span>
              </>
            ) : (
              <span className="game-end-screen__retries">{retry.total === 0 ? "No going back on this difficulty." : "No retries left."}</span>
            )}
          </div>
        )}

        <button className="game-end-screen__button btn-primary" onClick={onNewGame}>
          Start a New Game
        </button>
      </div>
    </div>
  );
}
