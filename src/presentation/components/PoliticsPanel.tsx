// Politics, split into two views so neither is a wall of numbers:
// - Elections: when the next vote is, whether you'd win it today, and which
//   groups of voters are behind you — plus the decisions you've made.
// - Abroad: leaning on the neighbors' governments (see ForeignAffairs.tsx).
import "./PoliticsPanel.css";
import { useState, type CSSProperties } from "react";
import { getPopularityOutlook } from "../../application/getPopularityOutlook";
import { formatDate } from "../../domain/country/calendar";
import { ELECTIONS_TO_WIN_GAME, ELECTION_WIN_THRESHOLD } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import { monthsUntilNextElection } from "../../domain/parties/electionRules";
import { FACTIONS, getFactionWeights } from "../../domain/parties/factionData";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";
import type { Ideology } from "../../domain/parties/types";
import { ForeignAffairs } from "./ForeignAffairs";
import { StatIcon, type StatIconType } from "./StatIcon";

interface PoliticsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const DRIVER_ICONS: Record<string, StatIconType> = {
  taxes: "treasury",
  food: "food",
  homes: "population",
  heat: "stability",
  order: "stability",
};

const IDEOLOGY_ICONS: Record<Ideology, StatIconType> = {
  Agrarian: "food",
  Commercial: "treasury",
  Traditionalist: "stability",
  Progressive: "popularity",
  Labor: "industry",
  Nationalist: "population",
};

// The groups as people, not "wings".
const IDEOLOGY_GROUPS: Record<Ideology, string> = {
  Agrarian: "Farmers",
  Commercial: "Merchants",
  Traditionalist: "Traditionalists",
  Progressive: "Progressives",
  Labor: "Workers",
  Nationalist: "Nationalists",
};

type View = "elections" | "abroad";

function CheckIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} aria-hidden="true">
      <polyline points="-6,0 -2,5 6,-6" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} aria-hidden="true">
      <g stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <line x1={-5} y1={-5} x2={5} y2={5} />
        <line x1={5} y1={-5} x2={-5} y2={5} />
      </g>
    </svg>
  );
}

// Where opinion is heading, and each thing pushing it there — sorted so the
// biggest problem is at the top. Zero-value rows are left out.
function MoodDrivers({ state }: { state: GameState }) {
  const outlook = getPopularityOutlook(state);
  const current = Math.round(state.stats.popularity);
  const target = Math.round(outlook.target);
  const drivers = outlook.drivers.filter((d) => Math.round(d.value) !== 0).sort((a, b) => a.value - b.value);
  return (
    <div className="politics-mood">
      <h3>What moves your support</h3>
      <p className="politics-mood__heading">
        Support is drifting {target > current ? "up" : target < current ? "down" : "nowhere"} toward <strong>{target}%</strong>
        {target > current ? " ↑" : target < current ? " ↓" : ""}
      </p>
      {drivers.length === 0 ? (
        <p className="politics-mood__none">Nothing is helping or hurting you right now.</p>
      ) : (
        <ul>
          {drivers.map((d) => (
            <li key={d.key} className={d.value > 0 ? "is-gain" : "is-loss"}>
              <StatIcon type={DRIVER_ICONS[d.key]} size={18} />
              <span>{d.label}</span>
              <strong>
                {d.value > 0 ? "+" : "−"}
                {Math.abs(Math.round(d.value))}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ElectionsView({ state }: { state: GameState }) {
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const weights = getFactionWeights(state.nationId);
  const popularity = Math.round(state.stats.popularity);
  const rivalPopularity = 100 - popularity;
  const monthsLeft = monthsUntilNextElection(state.date);
  const margin = popularity - ELECTION_WIN_THRESHOLD;
  const isWinning = margin >= 0;
  const recentDecisions = state.decisionHistory.slice(0, 3);

  return (
    <>
      {/* 1. The headline: when, and would you win today. */}
      <div className="politics-hero">
        <div className="politics-hero__countdown">
          <span className="politics-hero__big">{monthsLeft}</span>
          <span className="politics-hero__caption">months to the election</span>
        </div>
        <div className={`politics-hero__verdict ${isWinning ? "is-winning" : "is-losing"}`}>
          {isWinning ? <CheckIcon /> : <CrossIcon />}
          {isWinning ? `You'd win today, by ${margin}` : `You'd lose today, by ${-margin}`}
        </div>
        <div className="politics-hero__wins" title={`Win ${ELECTIONS_TO_WIN_GAME} elections in a row for outright victory. Lose one and the game ends.`}>
          <span className="politics-hero__pips">
            {Array.from({ length: ELECTIONS_TO_WIN_GAME }, (_, i) => (
              <span
                key={i}
                className={`politics-hero__pip ${i < state.electionsWon ? "is-won" : ""}`}
                style={{ "--party-color": party.color } as CSSProperties}
              />
            ))}
          </span>
          <span className="politics-hero__caption">
            {state.electionsWon} of {ELECTIONS_TO_WIN_GAME} wins
          </span>
        </div>
      </div>

      {/* 2. The vote, as one bar: you on the left, the rival on the right. */}
      <div className="politics-vote">
        <div className="politics-vote__names">
          <span style={{ color: party.color }}>
            <StatIcon type={IDEOLOGY_ICONS[party.ideology]} size={18} />
            {party.name}
            <strong>{popularity}%</strong>
          </span>
          <span style={{ color: rival.color }}>
            <strong>{rivalPopularity}%</strong>
            {rival.name}
            <StatIcon type={IDEOLOGY_ICONS[rival.ideology]} size={18} />
          </span>
        </div>
        <div className="politics-vote__bar" role="img" aria-label={`${party.name} ${popularity}%, ${rival.name} ${rivalPopularity}%`}>
          <span className="politics-vote__fill" style={{ width: `${popularity}%`, "--party-color": party.color } as CSSProperties} />
          <span className="politics-vote__fill" style={{ width: `${rivalPopularity}%`, "--party-color": rival.color } as CSSProperties} />
          <span className="politics-vote__line" style={{ left: `${ELECTION_WIN_THRESHOLD}%` }} />
        </div>
        <span className="politics-vote__line-label" style={{ left: `${ELECTION_WIN_THRESHOLD}%` }}>
          {ELECTION_WIN_THRESHOLD}% to win
        </span>
      </div>

      {/* 3. What's moving support — the things you control. */}
      <MoodDrivers state={state} />

      {/* 4. Who your support comes from. */}
      <div className="politics-groups">
        <h3>Who backs you</h3>
        <p className="politics-groups__hint">Each group's approval of your party. Bigger groups count for more.</p>
        {[...FACTIONS]
          .sort((a, b) => weights[b] - weights[a])
          .map((ideology) => {
            const approval = Math.round(state.factionApproval[ideology]);
            const isYours = ideology === party.ideology;
            const isRivals = ideology === rival.ideology;
            return (
              <div className="politics-group" key={ideology}>
                <StatIcon type={IDEOLOGY_ICONS[ideology]} size={24} />
                <span className="politics-group__name">
                  {IDEOLOGY_GROUPS[ideology]}
                  {isYours && (
                    <span className="politics-group__tag" style={{ borderColor: party.color, color: party.color }}>
                      your base
                    </span>
                  )}
                  {isRivals && (
                    <span className="politics-group__tag" style={{ borderColor: rival.color, color: rival.color }}>
                      rival's base
                    </span>
                  )}
                  <span className="politics-group__share">{Math.round(weights[ideology] * 100)}% of voters</span>
                </span>
                <span className="politics-group__bar" aria-hidden="true">
                  <span className="politics-group__fill" style={{ width: `${approval}%` }} />
                </span>
                <span className="politics-group__approval">{approval}%</span>
              </div>
            );
          })}
      </div>

      {/* 5. What you've decided lately. */}
      {recentDecisions.length > 0 && (
        <div className="politics-decisions">
          <h3>Recent decisions</h3>
          <ul>
            {recentDecisions.map((entry) => {
              const decision = getDecision(entry.decisionId);
              const option = decision?.options.find((o) => o.id === entry.optionId);
              if (!decision || !option) return null;
              return (
                <li key={entry.id}>
                  <StatIcon type={decision.icon as StatIconType} size={20} />
                  <span className="politics-decisions__text">
                    <strong>{decision.title}</strong> — {option.label}
                  </span>
                  <span className="politics-decisions__date">{formatDate(entry.date)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

export function PoliticsPanel({ state, dispatch }: PoliticsPanelProps) {
  const [view, setView] = useState<View>("elections");

  return (
    <section className="politics-panel">
      <div className="politics-panel__views" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "elections"}
          className={`politics-panel__view ${view === "elections" ? "is-active" : ""}`}
          onClick={() => setView("elections")}
        >
          <StatIcon type="popularity" size={18} />
          At home
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "abroad"}
          className={`politics-panel__view ${view === "abroad" ? "is-active" : ""}`}
          onClick={() => setView("abroad")}
        >
          <StatIcon type="politicalPower" size={18} />
          Abroad
        </button>
      </div>

      {view === "elections" ? <ElectionsView state={state} /> : <ForeignAffairs state={state} dispatch={dispatch} />}
    </section>
  );
}
