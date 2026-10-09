// Foreign affairs, inside the Politics tab: one card per neighbor, with its
// electorate split as a two-color bar (ruling party crowned) and a "back
// this party" button for each side. How hard a push lands comes from your
// own popularity + stability, shown up top — and it can go negative.
import "./ForeignAffairs.css";
import type { CSSProperties } from "react";
import { canPressureGovernment, pressureGovernment } from "../../application/actions";
import { FOREIGN_TAKEOVER_THRESHOLD, FRIENDLY_GOVERNMENT_INCOME_BONUS, PRESSURE_POLITICAL_POWER_COST } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getPressureStrength, isFriendly } from "../../domain/diplomacy/diplomacyRules";
import type { ForeignGovernment } from "../../domain/diplomacy/types";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";
import { playConfirm } from "../audio/sound";
import { StatIcon } from "./StatIcon";

type Dispatch = (action: (state: GameState) => GameState) => void;

function CrownIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={13} height={13} aria-hidden="true">
      <path d="M-8,5 L-8,-5 L-4,-1 L0,-7 L4,-1 L8,-5 L8,5 Z" fill="#e6c56a" stroke="#93731f" strokeWidth={0.8} />
    </svg>
  );
}

function NationCrest({ color, name }: { color: string; name: string }) {
  return (
    <span className="foreign-card__crest" style={{ "--nation-color": color } as CSSProperties} aria-hidden="true">
      {name[0]}
    </span>
  );
}

function ForeignCard({ state, nationId, gov, strength, dispatch }: { state: GameState; nationId: string; gov: ForeignGovernment; strength: number; dispatch: Dispatch }) {
  const nation = getNation(nationId);
  const partyIds = Object.keys(gov.support);
  const friendly = isFriendly(gov);
  const canPush = canPressureGovernment(state, nationId);

  return (
    <div className={`foreign-card ${friendly ? "is-friendly" : ""}`} style={{ "--nation-color": nation.color } as CSSProperties}>
      <div className="foreign-card__head">
        <NationCrest color={nation.color} name={nation.name} />
        <span className="foreign-card__name">{nation.name}</span>
        {friendly && (
          <span className="foreign-card__friendly" title={`Ruled by the party you backed: +${FRIENDLY_GOVERNMENT_INCOME_BONUS * 100}% income from trade`}>
            Friendly +{FRIENDLY_GOVERNMENT_INCOME_BONUS * 100}%
          </span>
        )}
      </div>

      <div className="foreign-card__meter" title={`A challenger at ${FOREIGN_TAKEOVER_THRESHOLD}% takes power at the next monthly check`}>
        {partyIds.map((partyId) => {
          const party = getParty(partyId);
          return (
            <span
              key={partyId}
              className="foreign-card__meter-fill"
              style={{ width: `${gov.support[partyId]}%`, background: party.color }}
            />
          );
        })}
        <span className="foreign-card__meter-threshold" style={{ left: `${FOREIGN_TAKEOVER_THRESHOLD}%` }} />
        <span className="foreign-card__meter-threshold" style={{ left: `${100 - FOREIGN_TAKEOVER_THRESHOLD}%` }} />
      </div>

      <div className="foreign-card__parties">
        {partyIds.map((partyId) => {
          const party = getParty(partyId);
          const isRuling = partyId === gov.rulingPartyId;
          return (
            <div className="foreign-card__party" key={partyId} style={{ "--party-color": party.color } as CSSProperties}>
              <span className="foreign-card__party-name">
                {isRuling && <CrownIcon />}
                {party.name}
                <span className="foreign-card__party-share">{Math.round(gov.support[partyId])}%</span>
              </span>
              <button
                type="button"
                className="foreign-card__back"
                disabled={!canPush}
                title={`Spend ${PRESSURE_POLITICAL_POWER_COST} political power to push ${nation.name} toward the ${party.name} (${strength >= 0 ? "+" : ""}${strength} support)`}
                onClick={() => {
                  playConfirm();
                  dispatch((s) => pressureGovernment(s, nationId, partyId));
                }}
              >
                <StatIcon type="politicalPower" size={15} />
                {PRESSURE_POLITICAL_POWER_COST}
                <span className={strength >= 0 ? "is-gain" : "is-loss"}>
                  {strength >= 0 ? "+" : ""}
                  {strength}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ForeignAffairs({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const strength = getPressureStrength(state.stats);
  const entries = Object.entries(state.foreignPolitics);
  if (entries.length === 0) return null;

  return (
    <div className="foreign-affairs">
      <div className="foreign-affairs__how" aria-label="How it works">
        <span title="Spend political power to push a neighbour's vote toward one of its parties">
          <StatIcon type="politicalPower" size={18} /> {PRESSURE_POLITICAL_POWER_COST} → push
        </span>
        <span className="foreign-affairs__arrow">→</span>
        <span title="If your party takes power there, the government is friendly">party wins</span>
        <span className="foreign-affairs__arrow">→</span>
        <span className="is-gain" title="Each friendly government: better trade terms, and it campaigns for you at home">
          <StatIcon type="treasury" size={18} /> +{FRIENDLY_GOVERNMENT_INCOME_BONUS * 100}%
        </span>
      </div>
      <div
        className={`foreign-affairs__strength ${strength >= 0 ? "is-gain" : "is-loss"}`}
        title="Your popularity plus stability at home sets how far one push moves them. Below zero, meddling backfires."
      >
        <span>Push size</span>
        <strong>
          {strength >= 0 ? "+" : ""}
          {strength}
        </strong>
        <span className="foreign-affairs__why">
          (<StatIcon type="popularity" size={15} /> {Math.round(state.stats.popularity)} + <StatIcon type="stability" size={15} />{" "}
          {Math.round(state.stats.stability)})
        </span>
      </div>
      <div className="foreign-affairs__cards">
        {entries.map(([nationId, gov]) => (
          <ForeignCard key={nationId} state={state} nationId={nationId} gov={gov} strength={strength} dispatch={dispatch} />
        ))}
      </div>
    </div>
  );
}
