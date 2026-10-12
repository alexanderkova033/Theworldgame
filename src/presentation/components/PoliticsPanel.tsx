// Politics, split into two views:
// - At home: the election, what support gets you, what's moving it (each
//   cause with a button to fix it), and political actions that spend
//   political power directly on the mood of the country.
// - Abroad: leaning on the neighbors' governments (see ForeignAffairs.tsx).
import "./PoliticsPanel.css";
import { useState, type CSSProperties, type ReactNode } from "react";
import { canCourtGroup, canCrackDown, canHoldRally, courtGroup, crackDown, holdRally, setTaxRate } from "../../application/actions";
import { getPopularityOutlook } from "../../application/getPopularityOutlook";
import { formatDate } from "../../domain/country/calendar";
import {
  COURT_POLITICAL_POWER_COST,
  COURT_SUPPORT,
  COURT_TREASURY_COST,
  CRACKDOWN_POLITICAL_POWER_COST,
  CRACKDOWN_SUPPORT,
  ELECTIONS_TO_WIN_GAME,
  ELECTION_WIN_THRESHOLD,
  MAX_TAX_RATE,
  MIN_TAX_RATE,
  RALLY_POLITICAL_POWER_COST,
  RALLY_SUPPORT,
  RALLY_TREASURY_COST,
  STABILITY_GOOD_POPULARITY_THRESHOLD,
  STABILITY_LOW_POPULARITY_PENALTY,
  STABILITY_LOW_POPULARITY_THRESHOLD,
  STABILITY_RECOVERY_RATE,
  TAX_RATE_STEP,
  UNREST_DISCONTENT_BELOW,
  UNREST_RIOTS_BELOW,
  UNREST_STRIKES_BELOW,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import { monthsUntilNextElection } from "../../domain/parties/electionRules";
import { FACTIONS, getFactionWeights } from "../../domain/parties/factionData";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";
import type { Ideology } from "../../domain/parties/types";
import type { PopularityDriver } from "../../domain/politics/politicsRules";
import { getDailyPoliticalPower } from "../../domain/politics/politicsRules";
import { getCrackdownStability } from "../../domain/unrest/unrestRules";
import { playConfirm } from "../audio/sound";
import { UNREST_INFO, UNREST_STEPS } from "../unrestStages";
import { UnrestStageIcon } from "./CauseIcon";
import { DecisionIcon } from "./DecisionModal";
import { ForeignAffairs } from "./ForeignAffairs";
import { Gauge, SignedBar, type GaugeTone } from "./Gauge";
import { StatIcon, type StatIconType } from "./StatIcon";
import type { PanelKey } from "./TopBar";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface PoliticsPanelProps {
  state: GameState;
  dispatch: Dispatch;
  onOpenPanel: (panel: PanelKey) => void;
}

const DRIVER_ICONS: Record<PopularityDriver["key"], StatIconType> = {
  taxes: "treasury",
  food: "food",
  homes: "population",
  heat: "stability",
  jobs: "industry",
  order: "police",
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

// A driver this big fills its half of the bar.
const DRIVER_SCALE = 15;

function signed(n: number, digits = 0): string {
  const rounded = Number(n.toFixed(digits));
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

// --- What support gets you -------------------------------------------------
function BenefitTile({ icon, value, caption, good }: { icon: StatIconType; value: string; caption: string; good: boolean | null }) {
  return (
    <div className={`politics-benefit ${good === true ? "is-good" : good === false ? "is-bad" : ""}`}>
      <StatIcon type={icon} size={28} />
      <strong>{value}</strong>
      <span>{caption}</span>
    </div>
  );
}

function Benefits({ state }: { state: GameState }) {
  const popularity = state.stats.popularity;
  const order =
    popularity >= STABILITY_GOOD_POPULARITY_THRESHOLD
      ? STABILITY_RECOVERY_RATE
      : popularity < STABILITY_LOW_POPULARITY_THRESHOLD
        ? -STABILITY_LOW_POPULARITY_PENALTY
        : 0;
  return (
    <div className="politics-benefits">
      <BenefitTile
        icon="popularity"
        value={popularity >= ELECTION_WIN_THRESHOLD ? "Win" : "Lose"}
        caption={`elections need ${ELECTION_WIN_THRESHOLD}%`}
        good={popularity >= ELECTION_WIN_THRESHOLD}
      />
      <BenefitTile icon="politicalPower" value={`+${getDailyPoliticalPower(state).toFixed(2)}/d`} caption="political power" good={null} />
      <BenefitTile icon="stability" value={`${signed(order, 2)}/d`} caption="stability" good={order > 0 ? true : order < 0 ? false : null} />
    </div>
  );
}

// --- What moves it, each with a fix ----------------------------------------
function DriverCard({ driver, children }: { driver: PopularityDriver; children?: ReactNode }) {
  const value = Math.round(driver.value);
  return (
    <div className={`politics-driver ${value > 0 ? "is-gain" : value < 0 ? "is-loss" : ""}`}>
      <StatIcon type={DRIVER_ICONS[driver.key]} size={24} />
      <span className="politics-driver__label">{driver.label}</span>
      <strong className="politics-driver__value">{signed(value)}</strong>
      <span className="politics-driver__bar">
        <SignedBar value={driver.value} scale={DRIVER_SCALE} label={`${driver.label}: ${signed(value)} to where support is heading`} />
      </span>
      <span className="politics-driver__fix">{children}</span>
    </div>
  );
}

function Drivers({ state, dispatch, onOpenPanel }: { state: GameState; dispatch: Dispatch; onOpenPanel: (panel: PanelKey) => void }) {
  const outlook = getPopularityOutlook(state);
  const current = Math.round(state.stats.popularity);
  const target = Math.round(outlook.target);
  const go = (panel: PanelKey, label: string) => (
    <button type="button" onClick={() => onOpenPanel(panel)}>
      {label}
    </button>
  );
  const fixes: Record<PopularityDriver["key"], ReactNode> = {
    taxes: (
      <span className="politics-driver__tax">
        <button type="button" disabled={state.taxRate <= MIN_TAX_RATE} onClick={() => dispatch((s) => setTaxRate(s, s.taxRate - TAX_RATE_STEP))} aria-label="Lower taxes">
          −
        </button>
        {Math.round(state.taxRate * 100)}%
        <button type="button" disabled={state.taxRate >= MAX_TAX_RATE} onClick={() => dispatch((s) => setTaxRate(s, s.taxRate + TAX_RATE_STEP))} aria-label="Raise taxes">
          +
        </button>
      </span>
    ),
    food: go("trade", "Buy food"),
    homes: go("economy", "Build"),
    heat: go("trade", "Buy coal"),
    jobs: go("economy", "Jobs"),
    order: go("economy", "Police"),
  };

  return (
    <div className="politics-drivers">
      <div className="politics-section-head">
        <h3>What moves support</h3>
        <span className={`politics-heading ${target > current ? "is-up" : target < current ? "is-down" : ""}`} title="Where support is slowly drifting">
          {current}% → {target}% {target > current ? "↑" : target < current ? "↓" : ""}
        </span>
      </div>
      {/* Support now, the line to win, and the diamond where it's drifting. */}
      <div className="politics-drivers__gauge">
        <Gauge
          max={100}
          size="lg"
          segments={[{ value: state.stats.popularity, tone: current >= ELECTION_WIN_THRESHOLD ? "good" : "bad" }]}
          markers={[{ at: ELECTION_WIN_THRESHOLD, label: `${ELECTION_WIN_THRESHOLD}% to win` }]}
          heading={outlook.target}
          label={`Support ${current}%, drifting toward ${target}%; ${ELECTION_WIN_THRESHOLD}% wins the election`}
        />
      </div>
      <div className="politics-drivers__grid">
        {outlook.drivers.map((driver) => (
          <DriverCard key={driver.key} driver={driver}>
            {fixes[driver.key]}
          </DriverCard>
        ))}
      </div>
    </div>
  );
}

// --- How far unrest has gone: the stages, this one marked ------------------
function Unrest({ state }: { state: GameState }) {
  const current = UNREST_STEPS.indexOf(state.unrestStage);
  return (
    <div className="politics-unrest">
      <div className="politics-section-head">
        <h3>Unrest</h3>
        <span className="politics-bank" title="Stability — unrest grows as it falls">
          <StatIcon type="stability" size={18} />
          {Math.round(state.stats.stability)}
        </span>
      </div>
      {/* Stability as one gauge, the stages as zones along it: how far
          it is to the next line down is visible at a glance. */}
      <Gauge
        max={100}
        size="lg"
        segments={[{ value: state.stats.stability, tone: STAGE_TONE[state.unrestStage] }]}
        zones={[
          { from: 0, to: UNREST_RIOTS_BELOW, tone: "bad", label: "Riots", hint: `${UNREST_INFO.riots.range}: ${UNREST_INFO.riots.effect}` },
          { from: UNREST_RIOTS_BELOW, to: UNREST_STRIKES_BELOW, tone: "bad", label: "Strikes", hint: `${UNREST_INFO.strikes.range}: ${UNREST_INFO.strikes.effect}` },
          { from: UNREST_STRIKES_BELOW, to: UNREST_DISCONTENT_BELOW, tone: "warn", label: "Discontent", hint: `${UNREST_INFO.discontent.range}: ${UNREST_INFO.discontent.effect}` },
          { from: UNREST_DISCONTENT_BELOW, to: 100, tone: "good", label: "Calm", hint: UNREST_INFO.calm.effect },
        ]}
        label={`Stability ${Math.round(state.stats.stability)} of 100 — ${UNREST_INFO[state.unrestStage].name}`}
      />
      <p className={`politics-unrest__now is-${state.unrestStage}`}>
        <UnrestStageIcon stage={state.unrestStage} size={22} />
        <strong>{UNREST_INFO[state.unrestStage].name}.</strong> {UNREST_INFO[state.unrestStage].effect}
        {current > 0 && " A crackdown pulls the country back a stage."} The government collapses at 0.
      </p>
    </div>
  );
}

const STAGE_TONE: Record<GameState["unrestStage"], GaugeTone> = { calm: "good", discontent: "warn", strikes: "bad", riots: "bad" };

// --- Spend political power on the mood of the country ---------------------
function ActionCard({
  icon,
  title,
  effect,
  cost,
  enabled,
  onClick,
}: {
  icon: StatIconType;
  title: string;
  effect: ReactNode;
  cost: ReactNode;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="politics-action"
      disabled={!enabled}
      onClick={() => {
        playConfirm();
        onClick();
      }}
    >
      <StatIcon type={icon} size={28} />
      <strong>{title}</strong>
      <span className="politics-action__effect">{effect}</span>
      <span className="politics-action__cost">{cost}</span>
    </button>
  );
}

function Cost({ pp, cr }: { pp: number; cr?: number }) {
  return (
    <>
      <StatIcon type="politicalPower" size={14} />
      {pp}
      {cr !== undefined && (
        <>
          <StatIcon type="treasury" size={14} />
          {cr}
        </>
      )}
    </>
  );
}

function Actions({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [courting, setCourting] = useState(false);
  const weights = getFactionWeights(state.nationId);
  return (
    <div className="politics-actions">
      <div className="politics-section-head">
        <h3>Act</h3>
        <span className="politics-bank" title="Political power — earned faster the more popular you are">
          <StatIcon type="politicalPower" size={18} />
          {Math.floor(state.stats.politicalPower)}
        </span>
      </div>
      <div className="politics-actions__grid">
        <ActionCard
          icon="popularity"
          title="Rally"
          effect={<>Everyone +{RALLY_SUPPORT}</>}
          cost={<Cost pp={RALLY_POLITICAL_POWER_COST} cr={RALLY_TREASURY_COST} />}
          enabled={canHoldRally(state)}
          onClick={() => dispatch(holdRally)}
        />
        <ActionCard
          icon="population"
          title="Court a group"
          effect={<>One group +{COURT_SUPPORT}</>}
          cost={<Cost pp={COURT_POLITICAL_POWER_COST} cr={COURT_TREASURY_COST} />}
          enabled={canCourtGroup(state)}
          onClick={() => setCourting((v) => !v)}
        />
        <ActionCard
          icon="police"
          title="Crack down"
          effect={
            <>
              <StatIcon type="stability" size={14} />+{getCrackdownStability(state.workforce.police)}
              {state.unrestStage !== "calm" && " · calms a stage"} · everyone {CRACKDOWN_SUPPORT}
            </>
          }
          cost={<Cost pp={CRACKDOWN_POLITICAL_POWER_COST} />}
          enabled={canCrackDown(state)}
          onClick={() => dispatch(crackDown)}
        />
      </div>
      {courting && canCourtGroup(state) && (
        <div className="politics-court" role="group" aria-label="Which group to court">
          {[...FACTIONS]
            .sort((a, b) => weights[b] - weights[a])
            .map((ideology) => (
              <button
                key={ideology}
                type="button"
                title={`${IDEOLOGY_GROUPS[ideology]} — ${Math.round(weights[ideology] * 100)}% of voters, ${Math.round(state.factionApproval[ideology])}% like you`}
                onClick={() => {
                  playConfirm();
                  dispatch((s) => courtGroup(s, ideology));
                  setCourting(false);
                }}
              >
                <StatIcon type={IDEOLOGY_ICONS[ideology]} size={20} />
                {IDEOLOGY_GROUPS[ideology]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function ElectionsView({ state, dispatch, onOpenPanel }: { state: GameState; dispatch: Dispatch; onOpenPanel: (panel: PanelKey) => void }) {
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
          {isWinning ? `Winning by ${margin}` : `Losing by ${-margin}`}
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

      {/* 3. What support gets you. */}
      <Benefits state={state} />

      {/* 4. What's moving it — each with a fix. */}
      <Drivers state={state} dispatch={dispatch} onOpenPanel={onOpenPanel} />

      {/* 5. How far unrest has gone, and what each stage does. */}
      <Unrest state={state} />

      {/* 6. Spend political power on it directly. */}
      <Actions state={state} dispatch={dispatch} />

      {/* 7. Who your support comes from. */}
      <div className="politics-groups">
        <h3>Who backs you</h3>
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
                <span className="politics-group__bar">
                  <Gauge
                    max={100}
                    segments={[{ value: approval, tone: approval >= ELECTION_WIN_THRESHOLD ? "good" : approval >= 40 ? "warn" : "bad" }]}
                    markers={[{ at: ELECTION_WIN_THRESHOLD }]}
                    label={`${IDEOLOGY_GROUPS[ideology]}: ${approval}% back you`}
                  />
                </span>
                <span className="politics-group__approval">{approval}%</span>
              </div>
            );
          })}
      </div>

      {/* 8. What you've decided lately. */}
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
                  <DecisionIcon icon={decision.icon} size={20} />
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

export function PoliticsPanel({ state, dispatch, onOpenPanel }: PoliticsPanelProps) {
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

      {view === "elections" ? (
        <ElectionsView state={state} dispatch={dispatch} onOpenPanel={onOpenPanel} />
      ) : (
        <ForeignAffairs state={state} dispatch={dispatch} />
      )}
    </section>
  );
}
