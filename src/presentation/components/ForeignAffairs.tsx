// Foreign affairs, inside the Politics tab: one card per neighbor: the
// country its computer ruler runs (see domain/neighbours), then its
// electorate split as a two-color bar (ruling party crowned) and a "back"
// button for each side. How far a push moves them comes from your own
// popularity + stability, stated once up top with its price — and it can
// go negative. Pointing at a "back" button shows the push on the bar.
import "./ForeignAffairs.css";
import { useState, type CSSProperties } from "react";
import { buyBackIsland, canBuyBackIsland, canPressureGovernment, canSignAccord, pressureGovernment, signIslandAccord } from "../../application/actions";
import {
  ACCORD_COST,
  FOREIGN_TAKEOVER_THRESHOLD,
  FRIENDLY_GOVERNMENT_INCOME_BONUS,
  PRESSURE_POLITICAL_POWER_COST,
  RELATIONS_HOSTILE,
  RELATIONS_WARM,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getPressureStrength, isFriendly } from "../../domain/diplomacy/diplomacyRules";
import { getModifiers } from "../../domain/policy/policyRules";
import type { ForeignGovernment } from "../../domain/diplomacy/types";
import { getNation } from "../../domain/nations/nationRules";
import { getParty } from "../../domain/parties/partyRules";
import { playSeal } from "../audio/sound";
import { StatIcon } from "./StatIcon";
import { formatAmount, formatSigned } from "../formatNumber";
import { getPersonality } from "../../domain/neighbours/neighbourData";
import { relationsWord } from "../../domain/neighbours/relationsRules";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { BuildingGlyph } from "./CauseIcon";
import { isFeatureOpen } from "../../domain/chapters/chapterData";
import { regimentsOf } from "../../domain/military/militaryRules";
import { formatDate } from "../../domain/country/calendar";
import { getBuyBackPrice, getIslandPeople, hasAccord, whyNoAccord, whyNoBuyBack } from "../../domain/neighbours/treatyRules";

type Dispatch = (action: (state: GameState) => GameState) => void;

function CrownIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={14} height={14} aria-label="In power">
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

function washed(color: string): string {
  return `color-mix(in srgb, ${color} 62%, #8f7d5c)`;
}

// The bar, with the push being pointed at drawn in: the stretch that would
// change hands striped in the colour of the side that gains it.
function Meter({ gov, partyIds, backing, strength }: { gov: ForeignGovernment; partyIds: string[]; backing: string | null; strength: number }) {
  const [left, right] = partyIds;
  const now = gov.support[left];
  const after = backing === null ? now : Math.min(100, Math.max(0, now + (backing === left ? strength : -strength)));
  const leftColor = washed(getParty(left).color);
  const rightColor = washed(getParty(right).color);
  const parts =
    after > now
      ? [
          { width: now, color: leftColor },
          { width: after - now, color: leftColor, preview: true },
          { width: 100 - after, color: rightColor },
        ]
      : [
          { width: after, color: leftColor },
          { width: now - after, color: rightColor, preview: true },
          { width: 100 - now, color: rightColor },
        ];
  return (
    <div className="foreign-card__meter" title={`A challenger at ${FOREIGN_TAKEOVER_THRESHOLD}% takes power at the next monthly check`}>
      {parts.map((part, i) =>
        part.width > 0 ? (
          <span
            key={i}
            className={`foreign-card__meter-fill ${part.preview ? "is-preview" : ""}`}
            style={{ width: `${part.width}%`, "--fill": part.color } as CSSProperties}
          />
        ) : null,
      )}
      <span className="foreign-card__meter-threshold" style={{ left: `${100 - FOREIGN_TAKEOVER_THRESHOLD}%` }} />
      <span className="foreign-card__meter-threshold" style={{ left: `${FOREIGN_TAKEOVER_THRESHOLD}%` }} />
    </div>
  );
}

// The country the computer runs: its temper, its numbers, its islands, and
// what it did last month.
function NeighbourState({ state, nationId }: { state: GameState; nationId: string }) {
  const n = state.neighbours[nationId];
  if (!n) return null;
  const islands = Object.entries(state.foreignIslands).filter(([, holder]) => holder === nationId).map(([id]) => [id, getProvinceName(id)]);
  return (
    <div className="foreign-card__country">
      <p className="foreign-card__temper">{getPersonality(nationId).temper}</p>
      <p
        className={`foreign-card__feeling ${n.relations >= RELATIONS_WARM ? "is-warm" : n.relations <= RELATIONS_HOSTILE ? "is-hostile" : ""}`}
        title={[
          n.relations >= RELATIONS_WARM
            ? "Warm: it campaigns for you in your elections, whoever rules it."
            : n.relations <= RELATIONS_HOSTILE
              ? "Hostile: it funds your opposition harder, and races you for the islands."
              : "From +30 it campaigns for you; at -30 it works against you.",
          ...n.feelings.map((f) => `${f.text}: ${formatSigned(f.change)}`),
        ].join("\n")}
      >
        Towards you: <strong>{relationsWord(n.relations)}</strong> ({formatSigned(Math.round(n.relations))})
      </p>
      <ul className="foreign-card__figures">
        <li title="People">
          <StatIcon type="population" size={15} />
          {formatAmount(n.population)}
        </li>
        <li title="Crowns in its treasury">
          <StatIcon type="treasury" size={15} />
          {formatAmount(n.treasury)}
        </li>
        <li title="Stability">
          <StatIcon type="stability" size={15} />
          {Math.round(n.stability)}
        </li>
        <li title="Farms and factories">
          <BuildingGlyph type="farm" size={15} />
          {n.farms}
          <BuildingGlyph type="factory" size={15} />
          {n.factories}
        </li>
        {isFeatureOpen(state, "army") && (
          <li title="Regiments, counting those still at drill">
            <StatIcon type="regiment" size={15} />
            {regimentsOf(state.regiments, nationId).length}
          </li>
        )}
      </ul>
      {state.wars[nationId] && (
        <p className="foreign-card__at-war" title="See the Army window: war is fought over the islands, and every month of it costs support.">
          <StatIcon type="regiment" size={15} /> At war with you since {formatDate(state.wars[nationId].since)}
        </p>
      )}
      {islands.length > 0 && <p className="foreign-card__islands">Holds {islands.map(([, name]) => name).join(" and ")}.</p>}
      {n.lastDeed && <p className="foreign-card__deed">Last month: {n.lastDeed.toLowerCase()}.</p>}
    </div>
  );
}

// What it will sign with you: an island accord, and any island it holds,
// sold back. Each button says what it costs; its tooltip, what it needs.
function Treaties({ state, nationId, dispatch }: { state: GameState; nationId: string; dispatch: Dispatch }) {
  const n = state.neighbours[nationId];
  if (!n) return null;
  const name = getNation(nationId).name;
  const islands = Object.keys(state.foreignIslands).filter((id) => state.foreignIslands[id] === nationId);
  const accordWhy = whyNoAccord(n, state.date, state.stats.treasury);
  return (
    <div className="foreign-card__treaties">
      {hasAccord(n, state.date) ? (
        <p className="foreign-card__accord" title={`${name} sends no settlers to any island until then.`}>
          Island accord until {formatDate(n.accordUntil!)}
        </p>
      ) : (
        <span className="foreign-card__treaty-wrap" title={`For two years ${name} sends no settlers to any island, and thinks better of you.${accordWhy ? ` ${accordWhy}` : ""}`}>
          <button
            type="button"
            className="foreign-card__treaty"
            disabled={!canSignAccord(state, nationId)}
            onClick={() => {
              playSeal();
              dispatch((s) => signIslandAccord(s, nationId));
            }}
          >
            Island accord
            <StatIcon type="treasury" size={14} />
            {formatAmount(ACCORD_COST)}
          </button>
        </span>
      )}
      {islands.map((islandId) => {
        const why = whyNoBuyBack(n, islandId, state.stats.treasury);
        return (
          <span
            key={islandId}
            className="foreign-card__treaty-wrap"
            title={`${getProvinceName(islandId)} becomes one of your provinces, and its ${formatAmount(getIslandPeople(islandId))} people your own. ${name} parts with it unwillingly.${why ? ` ${why}` : ""}`}
          >
            <button
              type="button"
              className="foreign-card__treaty"
              disabled={!canBuyBackIsland(state, islandId)}
              onClick={() => {
                playSeal();
                dispatch((s) => buyBackIsland(s, islandId));
              }}
            >
              Buy {getProvinceName(islandId)}
              <StatIcon type="treasury" size={14} />
              {formatAmount(getBuyBackPrice(islandId))}
            </button>
          </span>
        );
      })}
    </div>
  );
}

function ForeignCard({ state, nationId, gov, strength, dispatch }: { state: GameState; nationId: string; gov: ForeignGovernment; strength: number; dispatch: Dispatch }) {
  const [backing, setBacking] = useState<string | null>(null);
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
            Friendly
            <StatIcon type="treasury" size={14} />+{FRIENDLY_GOVERNMENT_INCOME_BONUS * 100}%
          </span>
        )}
      </div>

      <NeighbourState state={state} nationId={nationId} />
      <Treaties state={state} nationId={nationId} dispatch={dispatch} />

      <Meter gov={gov} partyIds={partyIds} backing={backing} strength={strength} />

      <div className="foreign-card__parties">
        {partyIds.map((partyId) => {
          const party = getParty(partyId);
          const isRuling = partyId === gov.rulingPartyId;
          return (
            <div className="foreign-card__party" key={partyId} style={{ "--party-color": party.color } as CSSProperties}>
              <span className="foreign-card__party-name">{party.name}</span>
              <span className="foreign-card__party-share">
                {isRuling && <CrownIcon />}
                {Math.round(gov.support[partyId])}%
              </span>
              {/* On a wrapper, so the push still shows when it can't be paid for. */}
              <span
                className="foreign-card__back-wrap"
                title={`Push ${nation.name} toward the ${party.name}: ${formatSigned(strength, true)} support, for ${PRESSURE_POLITICAL_POWER_COST} political power`}
                onMouseEnter={() => setBacking(partyId)}
                onMouseLeave={() => setBacking(null)}
                onFocus={() => setBacking(partyId)}
                onBlur={() => setBacking(null)}
              >
                <button
                  type="button"
                  className="foreign-card__back"
                  disabled={!canPush}
                  onClick={() => {
                    playSeal();
                    dispatch((s) => pressureGovernment(s, nationId, partyId));
                  }}
                >
                  Back <span className={strength >= 0 ? "is-gain" : "is-loss"}>{formatSigned(strength, true)}</span>
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ForeignAffairs({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const strength = getPressureStrength(state.stats, getModifiers(state).pressureMultiplier);
  const entries = Object.entries(state.foreignPolitics);
  if (entries.length === 0) return null;
  const short = state.stats.politicalPower < PRESSURE_POLITICAL_POWER_COST;

  return (
    <div className="foreign-affairs">
      {/* What one push does, why, and what it costs — once, for every card. */}
      <div className="foreign-affairs__head">
        <span
          className={`foreign-affairs__push ${strength >= 0 ? "is-gain" : "is-loss"}`}
          title={`How far one push moves a neighbour's vote: your support (${Math.round(state.stats.popularity)}) plus stability (${Math.round(state.stats.stability)}) at home. Below zero, meddling backfires. Win them a government and it's friendly: +${FRIENDLY_GOVERNMENT_INCOME_BONUS * 100}% income from trade.`}
        >
          Each push
          <strong>{formatSigned(strength, true)}</strong>
          <span className="foreign-affairs__why">
            <StatIcon type="popularity" size={15} />
            {Math.round(state.stats.popularity)}
            <span aria-hidden="true">+</span>
            <StatIcon type="stability" size={15} />
            {Math.round(state.stats.stability)}
          </span>
        </span>
        <span className="foreign-affairs__cost">
          <span className={short ? "is-short" : ""} title={`${PRESSURE_POLITICAL_POWER_COST} political power a push${short ? `; you have ${Math.floor(state.stats.politicalPower)}` : ""}`}>
            <StatIcon type="politicalPower" size={16} />
            {PRESSURE_POLITICAL_POWER_COST}
          </span>
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
