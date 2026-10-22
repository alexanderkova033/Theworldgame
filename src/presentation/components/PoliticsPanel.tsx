// Politics, one question per page (the same subtabs as Economy and Laws),
// each opening on its answer in large type:
// - Election: the chamber as it would sit if the vote were today, when the
//   vote is, and which groups back you — court any of them from its row.
// - Support: where it's heading, what's moving it (each cause with its
//   fix), and rallies and courting that buy it with political power.
// - Unrest: how close the country is to strikes and riots, and the
//   crackdown that pulls it back.
// - Abroad: leaning on the neighbours' governments (see ForeignAffairs.tsx).
// Figures carry their stat's icon from the top bar instead of its name
// (the name is in the tooltip), and pointing at an action previews what it
// would do on the gauge it moves before it's clicked.
// Opened from the nation's label at the left of the top bar.
import "./PoliticsPanel.css";
import { useState, type CSSProperties, type ReactNode } from "react";
import { canCourtGroup, canCrackDown, canHoldRally, canRecallMilitia, canSendMilitia, courtGroup, crackDown, holdRally, recallMilitia, sendMilitia } from "../../application/actions";
import { getProvinceOverview, type ProvinceOverview } from "../../application/getProvinceOverview";
import { getFreeMilitia } from "../../domain/uprising/uprisingRules";
import { getPopularityOutlook } from "../../application/getPopularityOutlook";
import { IDEOLOGY_CARES } from "../../domain/parties/rivalRules";
import {
  COURT_POLITICAL_POWER_COST,
  COURT_SUPPORT,
  COURT_TREASURY_COST,
  CRACKDOWN_POLITICAL_POWER_COST,
  CRACKDOWN_SUPPORT,
  CURRENCY_SYMBOL,
  ELECTIONS_TO_WIN_GAME,
  LONG_REIGN_THRESHOLD_STEP,
  MILITIA_SEND_POLITICAL_POWER,
  MILITIA_SEND_SUPPORT,
  RALLY_POLITICAL_POWER_COST,
  RALLY_SUPPORT,
  RALLY_TREASURY_COST,
  STABILITY_GOOD_POPULARITY_THRESHOLD,
  STABILITY_LOW_POPULARITY_PENALTY,
  STABILITY_LOW_POPULARITY_THRESHOLD,
  STABILITY_RECOVERY_RATE,
  UNREST_DISCONTENT_BELOW,
  UNREST_RIOTS_BELOW,
  UPRISING_CALM_STABILITY,
  UNREST_STRIKES_BELOW,
} from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { getElectionThreshold, monthsUntilNextElection } from "../../domain/parties/electionRules";
import { FACTIONS, getFactionWeights } from "../../domain/parties/factionData";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";
import type { Ideology, Party } from "../../domain/parties/types";
import { GROUP_NAMES } from "../names";
import type { PopularityDriver } from "../../domain/politics/politicsRules";
import { getDailyPoliticalPower } from "../../domain/politics/politicsRules";
import { getCrackdownStability } from "../../domain/unrest/unrestRules";
import { playCoins, playDrum, playRally } from "../audio/sound";
import { UNREST_INFO, UNREST_STEPS } from "../unrestStages";
import { BuildingGlyph, CrackdownIcon, FlameIcon, HourglassIcon, JobsIcon, NeighboursIcon, RallyIcon, TaxIcon, UnrestStageIcon, VotersIcon } from "./CauseIcon";
import { ForeignAffairs } from "./ForeignAffairs";
import { Gauge, SignedBar, withPreview, type GaugeTone } from "./Gauge";
import { NavIcon } from "./NavIcon";
import { StatIcon, type StatIconType } from "./StatIcon";
import { SubTabs } from "./SubTabs";
import { EffectList } from "./TechTree";
import { BUDGET, BUILDINGS, lockedReason, MARKET, PEOPLE, type Destination, type OpenPanel, type PoliticsSection } from "../navigation";
import { MilitiaForce, PoliceForce } from "./WorkforcePanel";
import { formatAmount, formatRate, formatSigned } from "../formatNumber";
import { isLongReign } from "../../domain/reign/reignRules";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface PoliticsPanelProps {
  state: GameState;
  dispatch: Dispatch;
  onOpenPanel: OpenPanel;
  section: PoliticsSection;
  onSection: (section: PoliticsSection) => void;
}

// Each driver drawn as what it is: taxes, food, homes, heating, jobs, the
// stability of the country, and laws.
function DriverIcon({ driver }: { driver: PopularityDriver["key"] }) {
  switch (driver) {
    case "taxes":
      return <TaxIcon size={22} />;
    case "food":
      return <StatIcon type="food" size={22} />;
    case "homes":
      return <BuildingGlyph type="housing" size={22} />;
    case "heat":
      return <FlameIcon size={22} />;
    case "jobs":
      return <JobsIcon size={22} />;
    case "order":
      return <StatIcon type="stability" size={22} />;
    case "policy":
      return <NavIcon type="laws" size={22} />;
    case "expectations":
      return <VotersIcon size={22} />;
  }
}


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

// A party's colour faded toward sepia, so a bright one doesn't glare.
function washed(color: string): string {
  return `color-mix(in srgb, ${color} 62%, #8f7d5c)`;
}

// The rival's seats: the same colour, much paler, so the two sides of the
// chamber read apart even when both parties wear green.
function paled(color: string): string {
  return `color-mix(in srgb, ${color} 28%, var(--paper-raised))`;
}

function inked(color: string): string {
  return `color-mix(in srgb, ${color} 60%, var(--ink))`;
}

// A figure with its stat's icon instead of its name; the name is in the
// tooltip (and read out to screen readers).
function Figure({ icon, value, name, tone }: { icon: StatIconType; value: ReactNode; name: string; tone?: "gain" | "loss" | null }) {
  return (
    <span className={`politics-figure ${tone ? `is-${tone}` : ""}`} title={name}>
      <StatIcon type={icon} size={18} />
      <span className="sr-only">{name}: </span>
      {value}
    </span>
  );
}

// --- The chamber: a hundred seats, as the vote would fall today -----------
const CHAMBER = { rows: 5, seats: 100, radius: 150, inner: 0.42, seatRadius: 6.4 };

interface SeatSpot {
  x: number;
  y: number;
  angle: number;
  row: number;
}

// Rows of seats in a half-circle, more on the longer outer rows, read in
// order from the far left round to the far right.
const SEATS: SeatSpot[] = (() => {
  const { rows, seats, radius, inner } = CHAMBER;
  const radii = Array.from({ length: rows }, (_, i) => radius * (inner + ((1 - inner) * i) / (rows - 1)));
  const sum = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((r) => Math.round((seats * r) / sum));
  counts[rows - 1] += seats - counts.reduce((a, b) => a + b, 0);
  return radii
    .flatMap((r, row) =>
      Array.from({ length: counts[row] }, (_, j): SeatSpot => {
        const angle = Math.PI * (1 - j / (counts[row] - 1));
        return { x: r * Math.cos(angle), y: -r * Math.sin(angle), angle, row };
      }),
    )
    .sort((a, b) => b.angle - a.angle || a.row - b.row);
})();

// Whole seats from exact shares, the leftovers going to the biggest
// remainders, so the chamber always holds exactly its hundred.
function apportion(exact: number[], total: number): number[] {
  const counts = exact.map(Math.floor);
  let left = total - counts.reduce((a, b) => a + b, 0);
  exact
    .map((value, i) => ({ i, rest: value - Math.floor(value) }))
    .sort((a, b) => b.rest - a.rest)
    .forEach(({ i }) => {
      if (left > 0) {
        counts[i]++;
        left--;
      }
    });
  return counts;
}

interface Seat extends SeatSpot {
  ideology: Ideology;
  yours: boolean;
}

// Your seats fill from the left, group by group (biggest first); the
// rival's from the right, the same groups mirrored.
function seatChamber(state: GameState): Seat[] {
  const weights = getFactionWeights(state.nationId);
  const order = [...FACTIONS].sort((a, b) => weights[b] - weights[a]);
  const blocks = [...order.map((ideology) => ({ ideology, yours: true })), ...[...order].reverse().map((ideology) => ({ ideology, yours: false }))];
  const counts = apportion(
    blocks.map(({ ideology, yours }) => weights[ideology] * (yours ? state.factionApproval[ideology] : 100 - state.factionApproval[ideology])),
    CHAMBER.seats,
  );
  const owners = blocks.flatMap((block, i) => Array.from({ length: counts[i] }, () => block));
  return SEATS.map((spot, i) => ({ ...spot, ...(owners[i] ?? owners[owners.length - 1]) }));
}

function Chamber({
  state,
  party,
  rival,
  focus,
  onFocus,
  gain,
}: {
  state: GameState;
  party: Party;
  rival: Party;
  focus: Ideology | null;
  onFocus: (ideology: Ideology | null) => void;
  gain: number | null; // support an action being pointed at would add
}) {
  const seats = seatChamber(state);
  const yours = seats.filter((s) => s.yours).length;
  const { radius, seatRadius } = CHAMBER;
  const pad = seatRadius + 3;
  const popularity = Math.round(state.stats.popularity);
  return (
    <svg
      className="chamber"
      viewBox={`${-radius - pad} ${-radius - pad} ${2 * (radius + pad)} ${radius + pad + seatRadius + 2}`}
      role="img"
      aria-label={`If the vote were today: ${party.name} ${yours} seats, ${rival.name} ${CHAMBER.seats - yours}. ${getElectionThreshold(state)} seats win.`}
      onMouseLeave={() => onFocus(null)}
    >
      {/* The line to win: half the chamber for the first election, further
          round for each one after. */}
      <WinLine threshold={getElectionThreshold(state)} inner={radius * CHAMBER.inner - seatRadius - 2} outer={radius + pad - 1} />
      {seats.map((seat, i) => (
        <circle
          key={i}
          cx={seat.x}
          cy={seat.y}
          r={seatRadius}
          className={`chamber__seat ${seat.yours ? "" : "is-rival"} ${focus && seat.ideology !== focus ? "is-dim" : ""} ${focus === seat.ideology ? "is-focus" : ""}`}
          style={seat.yours ? { fill: washed(party.color) } : { fill: paled(rival.color), stroke: inked(rival.color) }}
          onMouseEnter={() => onFocus(seat.ideology)}
        >
          <title>
            {GROUP_NAMES[seat.ideology]}: {seat.yours ? party.name : rival.name}
          </title>
        </circle>
      ))}
      <text x={0} y={-4} className="chamber__share" style={{ fill: inked(party.color) }}>
        {popularity}%
      </text>
      {gain !== null && gain > 0 && (
        <text x={0} y={-40} className="chamber__gain">
          {formatSigned(gain, true)}
        </text>
      )}
    </svg>
  );
}

// --- What a party is: who it speaks for, what it cares about, and what
// governing as it changes (its creed, in force while it holds power). ---
function PartyCreed({ party, isYours }: { party: Party; isYours: boolean }) {
  const cares = IDEOLOGY_CARES[party.ideology];
  return (
    <div className={`politics-creed ${isYours ? "is-yours" : ""}`} style={{ "--party-color": party.color } as CSSProperties}>
      <div className="politics-creed__head" title={party.platform}>
        <span className="politics-parties__swatch" style={isYours ? { background: washed(party.color) } : { background: paled(party.color), borderColor: inked(party.color) }} />
        <strong>{party.name}</strong>
        <span className="politics-creed__who">{isYours ? "you" : "rival"}</span>
      </div>
      <p className="politics-creed__cares">
        <span>For</span> {cares.for}
        <br />
        <span>Against</span> {cares.against}
      </p>
      <span className="politics-creed__label">{isYours ? "While you govern" : "If they governed"}</span>
      <EffectList effects={party.creed} />
    </div>
  );
}

// A ray from the chamber's centre at the seat that wins: seats fill from
// the left, so 50% is straight up and a higher bar leans right.
function WinLine({ threshold, inner, outer }: { threshold: number; inner: number; outer: number }) {
  const angle = Math.PI * (1 - threshold / 100);
  const at = (r: number) => ({ x: Math.cos(angle) * r, y: -Math.sin(angle) * r });
  const from = at(inner);
  const to = at(outer);
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="chamber__line" />;
}

// --- Election -------------------------------------------------------------
function Cost({ state, pp, cr }: { state: GameState; pp: number; cr?: number }) {
  return (
    <span className="politics-cost">
      <span className={state.stats.politicalPower < pp ? "is-short" : ""} title={`${pp} political power${state.stats.politicalPower < pp ? ", not enough" : ""}`}>
        <StatIcon type="politicalPower" size={14} />
        {pp}
      </span>
      {cr !== undefined && (
        <span className={state.stats.treasury < cr ? "is-short" : ""} title={`${cr} ${CURRENCY_SYMBOL}${state.stats.treasury < cr ? ", not enough" : ""}`}>
          <StatIcon type="treasury" size={14} />
          {cr}
        </span>
      )}
    </span>
  );
}

// What there is to spend, by icon: political power, and the treasury.
function Purse({ state }: { state: GameState }) {
  return (
    <span className="politics-purse">
      <Figure icon="politicalPower" value={Math.floor(state.stats.politicalPower)} name="Political power" />
      <Figure icon="treasury" value={formatAmount(Math.floor(state.stats.treasury))} name={`Treasury, ${CURRENCY_SYMBOL}`} />
    </span>
  );
}

function stabilityFromSupport(popularity: number): number {
  return popularity >= STABILITY_GOOD_POPULARITY_THRESHOLD
    ? STABILITY_RECOVERY_RATE
    : popularity < STABILITY_LOW_POPULARITY_THRESHOLD
      ? -STABILITY_LOW_POPULARITY_PENALTY
      : 0;
}

function SupportView({ state, dispatch, onOpenPanel, onSection }: { state: GameState; dispatch: Dispatch; onOpenPanel: OpenPanel; onSection: (section: PoliticsSection) => void }) {
  const [focus, setFocus] = useState<Ideology | null>(null);
  const [rallying, setRallying] = useState(false);
  const outlook = getPopularityOutlook(state);
  const target = Math.round(outlook.target);
  const go = (to: Destination, label: string) => (
    <button type="button" onClick={() => onOpenPanel(to.panel, to.section)}>
      {label}
    </button>
  );
  const fixes: Record<PopularityDriver["key"], ReactNode> = {
    taxes: go(BUDGET, "Taxes"),
    food: go(MARKET, "Buy food"),
    homes: go(BUILDINGS, "Build"),
    heat: go(MARKET, "Buy coal"),
    jobs: go(PEOPLE, "Jobs"),
    order: (
      <button type="button" onClick={() => onSection("unrest")}>
        Police
      </button>
    ),
    policy: go({ panel: "laws" }, "Laws"),
    expectations: null, // the difficulty level: nothing to fix
  };
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const popularity = Math.round(state.stats.popularity);
  const rivalPopularity = 100 - popularity;
  const monthsLeft = monthsUntilNextElection(state.date);
  const margin = popularity - getElectionThreshold(state);
  const isWinning = margin >= 0;
  const order = stabilityFromSupport(state.stats.popularity);

  return (
    <>
      {/* 1. The headline: the chamber as it would sit today, flanked by
          when the vote is and how many you've won; under it the verdict,
          and what your support earns every day. */}
      <div className="politics-hero">
        <div className="politics-hero__side" title={`The election is in ${monthsLeft} months`}>
          <HourglassIcon size={24} />
          <span className="politics-hero__big">{monthsLeft}</span>
          <span className="politics-hero__unit">months</span>
        </div>
        <div className="politics-hero__chamber">
          <Chamber
            state={state}
            party={party}
            rival={rival}
            focus={focus}
            onFocus={setFocus}
            gain={rallying ? RALLY_SUPPORT : null}
          />
          <div className="politics-hero__under">
            <span className={`politics-hero__verdict ${isWinning ? "is-winning" : "is-losing"}`}>
              {isWinning ? <CheckIcon /> : <CrossIcon />}
              {isWinning ? `Winning by ${margin}` : `Losing by ${-margin}`}
            </span>
            <Figure
              icon="popularity"
              value={`→ ${target}%`}
              name={`Support drifts toward ${target}%, where the causes below push it`}
              tone={target > popularity ? "gain" : target < popularity ? "loss" : null}
            />
            <Figure icon="politicalPower" value={formatRate(getDailyPoliticalPower(state), true)} name="Political power a day: the more popular you are, the more you earn" />
            <Figure
              icon="stability"
              value={formatRate(order, true)}
              name={`Stability a day from support: it recovers above ${STABILITY_GOOD_POPULARITY_THRESHOLD}% and falls below ${STABILITY_LOW_POPULARITY_THRESHOLD}%`}
              tone={order > 0 ? "gain" : order < 0 ? "loss" : null}
            />
          </div>
        </div>
        {isLongReign(state) ? (
          <div
            className="politics-hero__side"
            title={`Long Reign: no finish line. Lose one election and the reign ends. The line rises ${LONG_REIGN_THRESHOLD_STEP} points with every election from the third: the next needs ${getElectionThreshold(state)}%.`}
          >
            <span className="politics-hero__big">{state.electionsWon}</span>
            <span className="politics-hero__unit">{state.electionsWon === 1 ? "win" : "wins"}</span>
          </div>
        ) : (
        <div className="politics-hero__side" title={`Win ${ELECTIONS_TO_WIN_GAME} elections in a row for outright victory. Lose one and the game ends. Each asks for more support: ${getDifficulty(state.difficulty).electionThresholds.join("%, then ")}%.`}>
          <span className="politics-hero__pips">
            {Array.from({ length: ELECTIONS_TO_WIN_GAME }, (_, i) => (
              <span key={i} className={`politics-hero__pip ${i < state.electionsWon ? "is-won" : ""}`} style={{ "--party-color": party.color } as CSSProperties} />
            ))}
          </span>
          <span className="politics-hero__big">
            {state.electionsWon}/{ELECTIONS_TO_WIN_GAME}
          </span>
          <span className="politics-hero__unit">wins</span>
        </div>
        )}
      </div>

      {/* 2. The two parties, under their side of the chamber. */}
      <div className="politics-parties">
        <span className="politics-parties__side" style={{ color: inked(party.color) }}>
          <span className="politics-parties__swatch" style={{ background: washed(party.color) }} />
          {party.name}
          <strong>{popularity}%</strong>
        </span>
        <span className="politics-parties__side is-rival" style={{ color: inked(rival.color) }}>
          <strong>{rivalPopularity}%</strong>
          {rival.name}
          <span className="politics-parties__swatch" style={{ background: paled(rival.color), borderColor: inked(rival.color) }} />
        </span>
      </div>

      {/* 3. What moves support, each with where to fix it. */}
      <h3 className="politics-subhead">What moves it</h3>
      <div className="politics-drivers">
        {/* Laws and creed only get a card when they actually push. */}
        {outlook.drivers.filter((d) => (d.key !== "policy" && d.key !== "expectations") || Math.round(d.value) !== 0).map((driver) => (
          <DriverCard key={driver.key} driver={driver}>
            {fixes[driver.key]}
          </DriverCard>
        ))}
      </div>

      <div className="politics-section-head">
        <h3 className="politics-subhead">Win people over</h3>
        <Purse state={state} />
      </div>
      <div className="politics-actions politics-actions--one">
        <ActionCard
          icon={<RallyIcon size={28} />}
          title="Rally"
          effect={<>+{RALLY_SUPPORT} with everyone</>}
          cost={<Cost state={state} pp={RALLY_POLITICAL_POWER_COST} cr={RALLY_TREASURY_COST} />}
          enabled={canHoldRally(state)}
          onClick={() => dispatch(holdRally)}
          sound={playRally}
          onPreview={setRallying}
        />
      </div>

    </>
  );
}

// --- Voters: who backs you, group by group, and the two parties ----------
function VotersView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [courting, setCourting] = useState<Ideology | null>(null);
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const weights = getFactionWeights(state.nationId);
  const canCourt = canCourtGroup(state);
  const courtGain = (ideology: Ideology) => Math.min(COURT_SUPPORT, 100 - state.factionApproval[ideology]);

  return (
    <>
      {/* Who your support comes from, and courting each group right here. */}
      <div className="politics-groups">
        <div className="politics-section-head">
          <h3 className="politics-subhead">Who backs you</h3>
          <span className="politics-head-cost">
            Court
            <Cost state={state} pp={COURT_POLITICAL_POWER_COST} cr={COURT_TREASURY_COST} />
          </span>
        </div>
        {[...FACTIONS]
          .sort((a, b) => weights[b] - weights[a])
          .map((ideology) => {
            const approval = Math.round(state.factionApproval[ideology]);
            const isYours = ideology === party.ideology;
            const isRivals = ideology === rival.ideology;
            const gain = courting === ideology ? courtGain(ideology) : null;
            return (
              <div className="politics-group" key={ideology}>
                <span className="politics-group__name">
                  {GROUP_NAMES[ideology]}
                  {isYours && (
                    <span className="politics-group__tag" style={{ borderColor: party.color, color: inked(party.color) }}>
                      your base
                    </span>
                  )}
                  {isRivals && (
                    <span className="politics-group__tag" style={{ borderColor: rival.color, color: inked(rival.color) }}>
                      rival's base
                    </span>
                  )}
                  <span className="politics-group__share">{Math.round(weights[ideology] * 100)}% of voters</span>
                </span>
                <span className="politics-group__bar">
                  <Gauge
                    max={100}
                    segments={withPreview(approval, approval >= getElectionThreshold(state) ? "good" : approval >= 40 ? "warn" : "bad", gain, 100)}
                    markers={[{ at: getElectionThreshold(state) }]}
                    label={`${GROUP_NAMES[ideology]}: ${approval}% back you`}
                  />
                </span>
                <span className="politics-group__approval">
                  {approval}%{gain ? <span className="politics-group__gain">+{gain}</span> : null}
                </span>
                <Previewing onPreview={(on) => setCourting(on ? ideology : null)} title={`Court the ${GROUP_NAMES[ideology]}: their support +${COURT_SUPPORT}`}>
                  <button
                    type="button"
                    className="politics-group__court"
                    disabled={!canCourt}
                    onClick={() => {
                      playCoins();
                      dispatch((s) => courtGroup(s, ideology));
                    }}
                  >
                    Court <span className="politics-group__court-gain">+{courtGain(ideology)}</span>
                  </button>
                </Previewing>
              </div>
            );
          })}
      </div>

      {/* What each party would do in power: the creeds, side by side. */}
      <h3 className="politics-subhead">The two parties</h3>
      <div className="politics-creeds">
        <PartyCreed party={party} isYours />
        <PartyCreed party={rival} isYours={false} />
      </div>
    </>
  );
}

// --- Support: what moves it, each with a fix ------------------------------
function DriverCard({ driver, children }: { driver: PopularityDriver; children?: ReactNode }) {
  const value = Math.round(driver.value);
  return (
    <div className={`politics-driver ${value > 0 ? "is-gain" : value < 0 ? "is-loss" : "is-idle"}`}>
      <DriverIcon driver={driver.key} />
      <span className="politics-driver__label">{driver.label}</span>
      <strong className="politics-driver__value">{formatSigned(value)}</strong>
      <span className="politics-driver__fix">{children}</span>
      <span className="politics-driver__bar">
        <SignedBar value={driver.value} scale={DRIVER_SCALE} label={`${driver.label}: ${formatSigned(value)} to where support is heading`} />
      </span>
    </div>
  );
}

// Pointing at (or tabbing to) what's inside previews it. Held on a wrapper:
// a disabled button gets no mouse events, and what an action would do is
// worth seeing most when it can't be afforded yet.
function Previewing({ onPreview, title, children }: { onPreview: (on: boolean) => void; title?: string; children: ReactNode }) {
  return (
    <span
      className="politics-previewing"
      title={title}
      onMouseEnter={() => onPreview(true)}
      onMouseLeave={() => onPreview(false)}
      onFocus={() => onPreview(true)}
      onBlur={() => onPreview(false)}
    >
      {children}
    </span>
  );
}

// One thing to spend political power on. Pointing at it previews what it
// would do on the gauge above.
function ActionCard({
  icon,
  title,
  effect,
  cost,
  enabled,
  onClick,
  onPreview,
  sound,
}: {
  icon: ReactNode;
  title: string;
  effect: ReactNode;
  cost: ReactNode;
  enabled: boolean;
  onClick: () => void;
  onPreview?: (on: boolean) => void;
  sound?: () => void; // what it sounds like when done
}) {
  return (
    <Previewing onPreview={(on) => onPreview?.(on)}>
      <button
        type="button"
        className="politics-action"
        disabled={!enabled}
        onClick={() => {
          sound?.();
          onClick();
        }}
      >
        {icon}
        <span className="politics-action__text">
          <strong>{title}</strong>
          <span className="politics-action__effect">{effect}</span>
        </span>
        {cost}
      </button>
    </Previewing>
  );
}

// --- Unrest: how far it's gone, and the crackdown -------------------------
const STAGE_TONE: Record<GameState["unrestStage"], GaugeTone> = { calm: "good", discontent: "warn", strikes: "bad", riots: "bad" };

function UnrestView({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const [preview, setPreview] = useState<number | null>(null);
  const current = UNREST_STEPS.indexOf(state.unrestStage);
  const stability = Math.round(state.stats.stability);
  const gain = getCrackdownStability(state.workforce.police);
  const info = UNREST_INFO[state.unrestStage];
  return (
    <>
      <p className={`politics-answer ${current === 0 ? "is-up" : current >= 2 ? "is-down" : ""}`}>
        <UnrestStageIcon stage={state.unrestStage} size={26} />
        {info.name}
        <strong className="politics-answer__figure" title="Stability">
          <StatIcon type="stability" size={26} />
          <span className="sr-only">Stability </span>
          {stability}
        </strong>
      </p>
      {/* Stability as one gauge, the stages as zones along it: how far
          it is to the next line down is visible at a glance. */}
      <div className="politics-gauge">
        <Gauge
          max={100}
          size="lg"
          segments={withPreview(state.stats.stability, STAGE_TONE[state.unrestStage], preview, 100)}
          zones={[
            { from: 0, to: UNREST_RIOTS_BELOW, tone: "bad", label: "Riots", hint: `${UNREST_INFO.riots.range}: ${UNREST_INFO.riots.effect} The government collapses at 0.` },
            { from: UNREST_RIOTS_BELOW, to: UNREST_STRIKES_BELOW, tone: "bad", label: "Strikes", hint: `${UNREST_INFO.strikes.range}: ${UNREST_INFO.strikes.effect}` },
            { from: UNREST_STRIKES_BELOW, to: UNREST_DISCONTENT_BELOW, tone: "warn", label: "Discontent", hint: `${UNREST_INFO.discontent.range}: ${UNREST_INFO.discontent.effect}` },
            { from: UNREST_DISCONTENT_BELOW, to: 100, tone: "good", label: "Calm", hint: UNREST_INFO.calm.effect },
          ]}
          label={`Stability ${stability} of 100: ${info.name}`}
        />
      </div>
      {/* Calm needs no explaining; anything worse says what it's doing. */}
      {current > 0 && (
        <p className={`note politics-unrest__now is-${state.unrestStage}`}>
          <strong>{info.name}:</strong> {info.effect}
        </p>
      )}

      <Uprisings state={state} dispatch={dispatch} />

      <div className="politics-section-head">
        <h3 className="politics-subhead">Restore order</h3>
        <Purse state={state} />
      </div>
      <div className="politics-actions politics-actions--one">
        <ActionCard
          icon={<CrackdownIcon size={28} />}
          title="Crack down"
          effect={
            <>
              <Figure icon="stability" value={`+${gain}`} name="Stability" tone="gain" />
              <Figure icon="popularity" value={CRACKDOWN_SUPPORT} name="Support with everyone" tone="loss" />
              {current > 0 && <span>calms a stage</span>}
            </>
          }
          cost={<Cost state={state} pp={CRACKDOWN_POLITICAL_POWER_COST} />}
          enabled={canCrackDown(state)}
          onClick={() => dispatch(crackDown)}
          sound={playDrum}
          onPreview={(on) => setPreview(on ? gain : null)}
        />
      </div>

      <PoliceForce state={state} dispatch={dispatch} />
      <MilitiaForce state={state} dispatch={dispatch} />
    </>
  );
}

// --- Uprisings: provinces risen against you, and those about to ------------
// Each risen province with its rebel strength, what is moving it and how
// fast, and the militia companies sent in. Below them, any province rioting
// on its own, with how long before it rises. See domain/uprising.
function Uprisings({ state, dispatch }: { state: GameState; dispatch: Dispatch }) {
  const overview = getProvinceOverview(state);
  const risen = overview.filter((o) => o.uprising);
  const brewing = overview.filter((o) => !o.uprising && o.riotDays > 0);
  if (risen.length === 0 && brewing.length === 0) return null;
  return (
    <>
      <div className="politics-section-head">
        <h3 className="politics-subhead">Uprisings</h3>
      </div>
      <ul className="uprisings">
        {risen.map((o) => (
          <UprisingRow key={o.id} state={state} dispatch={dispatch} province={o} />
        ))}
        {brewing.map((o) => (
          <li key={o.id} className="uprisings__brewing">
            <StatIcon type="uprising" size={18} />
            <span>
              <strong>{o.name}</strong> has rioted on its own for {o.riotDays} of {o.riotDaysToRise} days. Give it homes and work, or it rises.
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function UprisingRow({ state, dispatch, province }: { state: GameState; dispatch: Dispatch; province: ProvinceOverview }) {
  const uprising = province.uprising!;
  const { change } = uprising;
  const strength = Math.round(uprising.strength);
  const parts = [
    `Feeds on itself and on people sleeping rough there: ${formatRate(change.growth, true)}`,
    change.calm < 0 ? `A calm country starves it: ${formatRate(change.calm, true)}` : `The country is too unsettled to starve it (stability under ${UPRISING_CALM_STABILITY})`,
    change.police < 0 && `Police hold it down: ${formatRate(change.police, true)}`,
    change.militia < 0 && `Militia wear it down: ${formatRate(change.militia, true)}`,
    change.garrison < 0 && `Regiments standing there wear it down: ${formatRate(change.garrison, true)}`,
  ].filter(Boolean);
  const trend =
    change.total < 0
      ? `${formatRate(change.total, true)}: over in about ${Math.ceil(uprising.strength / -change.total)} days`
      : `${formatRate(change.total, true)}: growing`;
  const sendHint = canSendMilitia(state, province.id)
    ? `Send a company in: ${MILITIA_SEND_POLITICAL_POWER} political power, and support ${MILITIA_SEND_SUPPORT} with everyone`
    : getFreeMilitia(state.workforce, state.provinces) === 0
      ? "No company at home: raise one below"
      : `Sending a company in takes ${MILITIA_SEND_POLITICAL_POWER} political power`;

  return (
    <li className="uprisings__row">
      <div className="uprisings__head">
        <StatIcon type="uprising" size={22} />
        <strong className="uprisings__name">{province.name}</strong>
        <span className="uprisings__strength" title="Rebel strength, 0 to 100. At 0 the uprising is over.">
          Rebel strength {strength}
        </span>
      </div>
      <Gauge max={100} size="sm" segments={[{ value: uprising.strength, tone: "bad" }]} label={`Rebel strength ${strength} of 100`} />
      <p className={`uprisings__trend ${change.total < 0 ? "is-falling" : "is-growing"}`} title={parts.join("\n")}>
        {trend}
      </p>
      {uprising.breaksAwayIn !== null && (
        <p className="note is-warning uprisings__breakaway">
          <strong>At full strength:</strong> {province.name} breaks away for good in {uprising.breaksAwayIn} {uprising.breaksAwayIn === 1 ? "day" : "days"} unless its strength falls.
        </p>
      )}
      <div className="uprisings__militia">
        <StatIcon type="militia" size={18} />
        <span>Companies sent in</span>
        <span className="staff-stepper">
          <button
            type="button"
            className="staff-stepper__button"
            disabled={!canRecallMilitia(state, province.id)}
            onClick={() => dispatch((s) => recallMilitia(s, province.id))}
            title="Call a company home"
            aria-label="Call a company home"
          >
            −
          </button>
          <span className="staff-stepper__count">{uprising.militia}</span>
          <button
            type="button"
            className="staff-stepper__button staff-stepper__button--add"
            disabled={!canSendMilitia(state, province.id)}
            onClick={() => {
              playDrum();
              dispatch((s) => sendMilitia(s, province.id));
            }}
            title={sendHint}
            aria-label={sendHint}
          >
            +
          </button>
        </span>
      </div>
    </li>
  );
}

export function PoliticsPanel({ state, dispatch, onOpenPanel, section, onSection }: PoliticsPanelProps) {
  const popularity = Math.round(state.stats.popularity);
  const months = monthsUntilNextElection(state.date);
  const stage = UNREST_INFO[state.unrestStage];

  return (
    <section className="politics-panel">
      <SubTabs
        label="Politics sections"
        tabs={[
          {
            key: "support",
            label: "Support",
            icon: <StatIcon type="popularity" size={22} />,
            alert: popularity < getElectionThreshold(state) || getPopularityOutlook(state).target < getElectionThreshold(state),
            hint: `Election in ${months} months: ${popularity >= getElectionThreshold(state) ? "you'd win today" : "you'd lose today"}`,
          },
          {
            key: "voters",
            label: "Voters",
            locked: lockedReason(state, "politics", "voters") ?? undefined,
            icon: <VotersIcon size={22} />,
            hint: "Who backs you, group by group, and what each party stands for",
          },
          {
            key: "unrest",
            label: "Unrest",
            locked: lockedReason(state, "politics", "unrest") ?? undefined,
            icon: <UnrestStageIcon stage={state.unrestStage} size={22} />,
            alert: state.unrestStage === "strikes" || state.unrestStage === "riots" || Object.values(state.provinces).some((p) => p.uprising),
            hint: `${stage.name}: ${stage.effect}`,
          },
          {
            key: "neighbours",
            label: "Neighbours",
            locked: lockedReason(state, "politics", "neighbours") ?? undefined,
            icon: <NeighboursIcon size={22} />,
            hint: "The neighbours' governments, and leaning on them",
          },
        ]}
        active={section}
        onSelect={(key) => onSection(key as PoliticsSection)}
      />

      {section === "support" && <SupportView state={state} dispatch={dispatch} onOpenPanel={onOpenPanel} onSection={onSection} />}
      {section === "voters" && <VotersView state={state} dispatch={dispatch} />}
      {section === "unrest" && <UnrestView state={state} dispatch={dispatch} />}
      {section === "neighbours" && <ForeignAffairs state={state} dispatch={dispatch} />}
    </section>
  );
}
