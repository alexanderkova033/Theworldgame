import "./PoliticsPanel.css";
import type { CSSProperties } from "react";
import { ELECTIONS_TO_WIN_GAME, ELECTION_WIN_THRESHOLD } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { monthsUntilNextElection } from "../../domain/parties/electionRules";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";

interface PoliticsPanelProps {
  state: GameState;
}

export function PoliticsPanel({ state }: PoliticsPanelProps) {
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const popularity = Math.round(state.stats.popularity);
  const rivalPopularity = 100 - popularity;
  const monthsLeft = monthsUntilNextElection(state.date);
  const isWinning = popularity >= ELECTION_WIN_THRESHOLD;

  return (
    <section className="panel politics-panel">
      <h2>Politics</h2>
      <p className="panel-hint">
        Every {monthsLeft === 1 ? "month" : `${monthsLeft} months`} until the next general election, your party's
        support is put to the vote. Fall below {ELECTION_WIN_THRESHOLD}% and the {rival.name} takes power.
      </p>

      <div className="politics-panel__meter" aria-label={`${party.name} ${popularity}% support, ${rival.name} ${rivalPopularity}% support`}>
        <div
          className="politics-panel__meter-fill politics-panel__meter-fill--you"
          style={{ width: `${popularity}%`, "--party-color": party.color } as CSSProperties}
        />
        <div
          className="politics-panel__meter-fill politics-panel__meter-fill--rival"
          style={{ width: `${rivalPopularity}%`, "--party-color": rival.color } as CSSProperties}
        />
        <div className="politics-panel__meter-threshold" style={{ left: `${ELECTION_WIN_THRESHOLD}%` }} />
      </div>
      <div className="politics-panel__meter-labels">
        <span style={{ color: party.color }}>
          {party.name} · {popularity}%
        </span>
        <span style={{ color: rival.color }}>
          {rival.name} · {rivalPopularity}%
        </span>
      </div>

      <p className={`politics-panel__status ${isWinning ? "is-winning" : "is-losing"}`}>
        {isWinning ? "Leading — you'd win an election held today." : "Trailing — you'd lose an election held today."}
      </p>

      <div className="politics-panel__cards">
        <div className="politics-panel__card" style={{ "--party-color": party.color } as CSSProperties}>
          <span className="politics-panel__card-label">Your Party</span>
          <span className="politics-panel__card-name">{party.name}</span>
          <span className="politics-panel__card-ideology">{party.ideology}</span>
          <p className="politics-panel__card-description">{party.description}</p>
        </div>
        <div className="politics-panel__card" style={{ "--party-color": rival.color } as CSSProperties}>
          <span className="politics-panel__card-label">Opposition</span>
          <span className="politics-panel__card-name">{rival.name}</span>
          <span className="politics-panel__card-ideology">{rival.ideology}</span>
          <p className="politics-panel__card-description">{rival.description}</p>
        </div>
      </div>

      <div className="politics-panel__progress">
        <span className="politics-panel__progress-label">
          Elections won toward outright victory: {state.electionsWon}/{ELECTIONS_TO_WIN_GAME}
        </span>
        <div className="politics-panel__pips">
          {Array.from({ length: ELECTIONS_TO_WIN_GAME }, (_, i) => (
            <span
              key={i}
              className={`politics-panel__pip ${i < state.electionsWon ? "is-won" : ""}`}
              style={{ "--party-color": party.color } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
