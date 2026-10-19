// What each ledger cause is called and drawn as (see domain/ledger) — shared
// by the monthly report breakdown and its toast headline.
import type { ReactNode } from "react";
import type { LedgerMetric } from "../domain/ledger/types";
import { formatRate, formatSigned } from "./formatNumber";
import { BuildingGlyph, CrackdownIcon, EventIcon, FlameIcon, JobsIcon, LoanIcon, NeighboursIcon, SettlingIcon, TaxIcon, UnrestStageIcon, VotersIcon, WagesIcon } from "./components/CauseIcon";
import { NavIcon } from "./components/NavIcon";
import { StatIcon } from "./components/StatIcon";

interface CauseInfo {
  label: string;
  hint: string; // tooltip
  icon: (size: number) => ReactNode;
}

const ONE_OFFS: CauseInfo = {
  label: "Decisions",
  hint: "Decisions, laws, research, rallies, crackdowns and ventures",
  icon: (size) => <NavIcon type="laws" size={size} />,
};
const EVENTS: CauseInfo = {
  label: "Events",
  hint: "Random events and what ventures brought home",
  icon: (size) => <EventIcon size={size} />,
};
const TRADE: CauseInfo = { label: "Market", hint: "Buying and selling on the market", icon: (size) => <NavIcon type="market" size={size} /> };
const POLICY: CauseInfo = {
  label: "Laws and creed",
  hint: "Laws and research in force, and your party's creed",
  icon: (size) => <NavIcon type="laws" size={size} />,
};
const DEBT: CauseInfo = { label: "Debt", hint: "Debt past the danger line", icon: (size) => <LoanIcon size={size} /> };

export const CAUSES: Record<LedgerMetric, Record<string, CauseInfo>> = {
  treasury: {
    taxes: { label: "Taxes", hint: "Tax paid by the population", icon: (size) => <TaxIcon size={size} /> },
    industry: { label: "Industry", hint: "What the factories earn", icon: (size) => <StatIcon type="industry" size={size} /> },
    salaries: { label: "Wages", hint: "Scientists', police and militia wages, hiring fees, and pay rises granted", icon: (size) => <WagesIcon size={size} /> },
    construction: { label: "Building", hint: "Building and repairing: down payments and daily instalments", icon: (size) => <NavIcon type="build" size={size} /> },
    trade: TRADE,
    loans: { label: "Loans", hint: "Money borrowed, minus money paid back", icon: (size) => <LoanIcon size={size} /> },
    oneOffs: ONE_OFFS,
    events: EVENTS,
    army: { label: "Army", hint: "Raising regiments, and their pay", icon: (size) => <StatIcon type="regiment" size={size} /> },
    colonies: { label: "Islands", hint: "The salt trade, less ships chartered to supply colonies with no harbour link", icon: (size) => <NavIcon type="ventures" size={size} /> },
  },
  food: {
    farms: { label: "Farms", hint: "Harvest from staffed farms, and island flocks", icon: (size) => <BuildingGlyph type="farm" size={size} /> },
    processing: { label: "Granaries", hint: "Granaries and canneries turning grain and fish into food", icon: (size) => <BuildingGlyph type="granary" size={size} /> },
    eating: { label: "Eating", hint: "What the population ate", icon: (size) => <StatIcon type="population" size={size} /> },
    trade: TRADE,
    oneOffs: ONE_OFFS,
    events: EVENTS,
  },
  support: {
    taxes: { label: "Taxes", hint: "Taxes above or below what people accept", icon: (size) => <TaxIcon size={size} /> },
    food: { label: "Food", hint: "Going hungry", icon: (size) => <StatIcon type="food" size={size} /> },
    homes: { label: "Homes", hint: "People without a home", icon: (size) => <BuildingGlyph type="housing" size={size} /> },
    heat: { label: "Heating", hint: "Homes left cold in winter", icon: (size) => <FlameIcon size={size} /> },
    jobs: { label: "Jobs", hint: "People without work", icon: (size) => <JobsIcon size={size} /> },
    order: { label: "Stability", hint: "How stable the country is", icon: (size) => <StatIcon type="stability" size={size} /> },
    policy: POLICY,
    expectations: { label: "Expectations", hint: "What voters ask of you at this difficulty", icon: (size) => <VotersIcon size={size} /> },
    settling: { label: "Settling", hint: "Opinion easing back toward 50% when nothing pushes it", icon: (size) => <SettlingIcon size={size} /> },
    debt: DEBT,
    rival: { label: "Rival", hint: "The rival party's campaign", icon: (size) => <NavIcon type="politics" size={size} /> },
    war: { label: "War", hint: "Declaring war, and every month it lasts", icon: (size) => <StatIcon type="regiment" size={size} /> },
    foreign: { label: "Neighbours", hint: "Neighbouring governments campaigning for you or against you", icon: (size) => <NeighboursIcon size={size} /> },
    oneOffs: ONE_OFFS,
  },
  stability: {
    food: { label: "Hunger", hint: "Food running out", icon: (size) => <StatIcon type="food" size={size} /> },
    support: { label: "Support", hint: "Low support erodes order; good support restores it", icon: (size) => <StatIcon type="popularity" size={size} /> },
    debt: DEBT,
    homes: { label: "Homeless", hint: "People without a home", icon: (size) => <BuildingGlyph type="housing" size={size} /> },
    cold: { label: "Cold", hint: "Homes left cold in winter", icon: (size) => <FlameIcon size={size} /> },
    police: { label: "Police", hint: "Police on the payroll", icon: (size) => <StatIcon type="police" size={size} /> },
    policy: POLICY,
    provinces: { label: "Province riots", hint: "Provinces rioting on their own", icon: (size) => <UnrestStageIcon stage="riots" size={size} /> },
    crackdown: { label: "Crackdowns", hint: "Crackdowns ordered from the Politics tab", icon: (size) => <CrackdownIcon size={size} /> },
    election: { label: "Election", hint: "A won election's mandate", icon: (size) => <NavIcon type="politics" size={size} /> },
    oneOffs: ONE_OFFS,
    events: EVENTS,
  },
};

const FALLBACK: CauseInfo = { label: "Other", hint: "", icon: (size) => <EventIcon size={size} /> };

export function getCauseInfo(metric: LedgerMetric, cause: string): CauseInfo {
  return CAUSES[metric][cause] ?? FALLBACK;
}

export const METRIC_LABELS: Record<LedgerMetric, string> = {
  treasury: "Treasury",
  food: "Food",
  support: "Support",
  stability: "Stability",
};

export const METRIC_ICONS: Record<LedgerMetric, "treasury" | "food" | "popularity" | "stability"> = {
  treasury: "treasury",
  food: "food",
  support: "popularity",
  stability: "stability",
};

// Crowns and food are big round numbers; support and stability are points
// where a tenth still matters — a hundredth, in a single day's change.
export function formatChange(metric: LedgerMetric | "population", value: number, perDay = false): string {
  const points = metric === "support" || metric === "stability";
  if (points && perDay) return formatRate(value, true).replace("/d", "");
  return formatSigned(value, points);
}

// After a loss, one thing to do differently, picked by the cause that did
// the most damage (see domain/ledger/defeatRules.ts).
const DEFEAT_TIPS: Record<"support" | "stability", Record<string, string>> = {
  support: {
    taxes: "Taxes ran above what people accept. Ease them before an election, and let industry carry the treasury.",
    food: "People went hungry. Keep a month of food in store, more before winter.",
    homes: "People had nowhere to live. Build homes ahead of the population, not behind it.",
    heat: "Homes went cold. Stock wood and ore for heating before winter comes.",
    jobs: "People had no work. Build workplaces as the population grows.",
    order: "Unrest dragged support down with it. Mend stability first and support follows.",
    policy: "Your laws and research cost you voters. Check what each one does to support before taking it.",
    expectations: "Voters expected more. Keep every other cause in the green to outpace them.",
    settling: "Support drifted with nothing holding it up. Give voters reasons: food, homes, work and fair taxes.",
    debt: "Debt past the danger line cost you voters. Borrow less, or pay it back sooner.",
    rival: "The rival's campaign won voters over. Court the groups they target, and rally before an election.",
    foreign: "Neighbours campaigned against you. Mind who you press abroad.",
    oneOffs: "Your own decisions cost support. Weigh each one's effect on voters first.",
  },
  stability: {
    food: "Hunger broke order. Keep a month of food in store, more before winter.",
    support: "Low support wore order down. Win voters back and order follows.",
    debt: "Debt past the danger line wore order down. Borrow less, or pay it back sooner.",
    homes: "Homeless people turned on the government. Build homes ahead of the population.",
    cold: "Cold homes turned people against you. Stock wood and ore for heating before winter.",
    policy: "Your laws and research cost order. Check what each one does to stability before taking it.",
    provinces: "Provinces rioted on their own. Go to the worst one as soon as it starts.",
    crackdown: "Crackdowns bought calm and cost more later. Use them sparingly.",
    oneOffs: "Your own decisions cost order. Weigh each one's effect on stability first.",
    events: "Bad luck hit hard. Keep money and food in reserve for it.",
  },
};

export function getDefeatTip(metric: "support" | "stability", cause: string | undefined): string {
  return (cause && DEFEAT_TIPS[metric][cause]) || "Watch the top bar: its numbers say what is moving, and why.";
}
