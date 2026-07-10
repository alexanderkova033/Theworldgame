import "./PoliticsPanel.css";
import type { CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import { ELECTIONS_TO_WIN_GAME, ELECTION_WIN_THRESHOLD } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import { monthsUntilNextElection } from "../../domain/parties/electionRules";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";
import { NavIcon } from "./NavIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface PoliticsPanelProps {
  state: GameState;
}

const IDEOLOGY_ICONS: Record<string, StatIconType> = {
  Agrarian: "food",
  Commercial: "treasury",
  Traditionalist: "stability",
  Progressive: "popularity",
  Labor: "industry",
  Nationalist: "population",
};

export function PoliticsPanel({ state }: PoliticsPanelProps) {
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const popularity = Math.round(state.stats.popularity);
  const rivalPopularity = 100 - popularity;
  const monthsLeft = monthsUntilNextElection(state.date);
  const isWinning = popularity >= ELECTION_WIN_THRESHOLD;
  const recentDecisions = state.decisionHistory.slice(0, 3);

  return (
    <section className="panel politics-panel">
      <h2>Politics</h2>
      <p className="panel-hint">
        Election in {monthsLeft} mo. — stay ≥{ELECTION_WIN_THRESHOLD}%.
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
        {isWinning ? "Leading today" : "Trailing today"}
      </p>

      <div className="politics-panel__cards">
        <div className="politics-panel__card" style={{ "--party-color": party.color } as CSSProperties}>
          <span className="politics-panel__card-icon">
            <StatIcon type={IDEOLOGY_ICONS[party.ideology] ?? "popularity"} size={28} />
          </span>
          <span className="politics-panel__card-label">Your Party</span>
          <span className="politics-panel__card-name">{party.name}</span>
          <span className="politics-panel__card-ideology">{party.ideology}</span>
        </div>
        <div className="politics-panel__card" style={{ "--party-color": rival.color } as CSSProperties}>
          <span className="politics-panel__card-icon">
            <StatIcon type={IDEOLOGY_ICONS[rival.ideology] ?? "popularity"} size={28} />
          </span>
          <span className="politics-panel__card-label">Opposition</span>
          <span className="politics-panel__card-name">{rival.name}</span>
          <span className="politics-panel__card-ideology">{rival.ideology}</span>
        </div>
      </div>

      <div className="politics-panel__progress">
        <span className="politics-panel__progress-label">
          {state.electionsWon}/{ELECTIONS_TO_WIN_GAME} elections to outright victory
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

      <div className="politics-panel__decisions">
        <h3>Recent Decisions</h3>
        {recentDecisions.length === 0 ? (
          <div className="politics-panel__decisions-empty">
            <span aria-hidden="true">
              <NavIcon type="politics" size={24} />
            </span>
            <p>None yet — they pop up unannounced.</p>
          </div>
        ) : (
          <ul className="politics-panel__decisions-list">
            {recentDecisions.map((entry) => {
              const decision = getDecision(entry.decisionId);
              const option = decision?.options.find((o) => o.id === entry.optionId);
              if (!decision || !option) return null;
              return (
                <li key={entry.id} className="politics-panel__decision-row">
                  <span className="politics-panel__decision-icon">
                    <StatIcon type={decision.icon as StatIconType} size={20} />
                  </span>
                  <span className="politics-panel__decision-text">
                    <strong>{decision.title}</strong> — {option.label}
                  </span>
                  <span className="politics-panel__decision-date">{formatDate(entry.date)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
