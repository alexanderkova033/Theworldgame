// What each ledger cause is called and drawn as (see domain/ledger) — shared
// by the monthly report breakdown and its toast headline.
import type { ReactNode } from "react";
import type { LedgerMetric } from "../domain/ledger/types";
import { BuildingGlyph, EventIcon, FlameIcon, LoanIcon, SettlingIcon } from "./components/CauseIcon";
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
const TRADE: CauseInfo = { label: "Trade", hint: "Buying and selling on the market", icon: (size) => <NavIcon type="trade" size={size} /> };
const DEBT: CauseInfo = { label: "Debt", hint: "Debt past the danger line", icon: (size) => <LoanIcon size={size} /> };

export const CAUSES: Record<LedgerMetric, Record<string, CauseInfo>> = {
  treasury: {
    taxes: { label: "Taxes", hint: "Tax paid by the population", icon: (size) => <StatIcon type="treasury" size={size} /> },
    industry: { label: "Industry", hint: "What the factories earn", icon: (size) => <StatIcon type="industry" size={size} /> },
    salaries: { label: "Wages", hint: "Scientists' and police wages, and hiring fees", icon: (size) => <StatIcon type="police" size={size} /> },
    construction: { label: "Building", hint: "Building and repairing — down payments and daily instalments", icon: (size) => <NavIcon type="economy" size={size} /> },
    trade: TRADE,
    loans: { label: "Loans", hint: "Money borrowed, minus money paid back", icon: (size) => <LoanIcon size={size} /> },
    oneOffs: ONE_OFFS,
    events: EVENTS,
  },
  food: {
    farms: { label: "Farms", hint: "Harvest from staffed farms", icon: (size) => <BuildingGlyph type="farm" size={size} /> },
    processing: { label: "Granaries", hint: "Granaries and canneries turning grain and fish into food", icon: (size) => <BuildingGlyph type="granary" size={size} /> },
    eating: { label: "Eating", hint: "What the population ate", icon: (size) => <StatIcon type="population" size={size} /> },
    trade: TRADE,
    oneOffs: ONE_OFFS,
    events: EVENTS,
  },
  support: {
    taxes: { label: "Taxes", hint: "Taxes above or below what people accept", icon: (size) => <StatIcon type="treasury" size={size} /> },
    food: { label: "Food", hint: "Going hungry", icon: (size) => <StatIcon type="food" size={size} /> },
    homes: { label: "Homes", hint: "People without a home", icon: (size) => <BuildingGlyph type="housing" size={size} /> },
    heat: { label: "Heating", hint: "Homes left cold in winter", icon: (size) => <FlameIcon size={size} /> },
    jobs: { label: "Jobs", hint: "People out of work", icon: (size) => <StatIcon type="industry" size={size} /> },
    order: { label: "Order", hint: "How stable the country is", icon: (size) => <StatIcon type="stability" size={size} /> },
    settling: { label: "Settling", hint: "Opinion easing back toward 50% when nothing pushes it", icon: (size) => <SettlingIcon size={size} /> },
    debt: DEBT,
    rival: { label: "Rival", hint: "The rival party's campaign", icon: (size) => <NavIcon type="politics" size={size} /> },
    foreign: { label: "Neighbours", hint: "Neighbouring governments campaigning for you or against you", icon: (size) => <NavIcon type="ventures" size={size} /> },
    oneOffs: ONE_OFFS,
  },
  stability: {
    food: { label: "Hunger", hint: "Food running out", icon: (size) => <StatIcon type="food" size={size} /> },
    support: { label: "Support", hint: "Low support erodes order; good support restores it", icon: (size) => <StatIcon type="popularity" size={size} /> },
    debt: DEBT,
    homes: { label: "Homeless", hint: "People without a home", icon: (size) => <BuildingGlyph type="housing" size={size} /> },
    cold: { label: "Cold", hint: "Homes left cold in winter", icon: (size) => <FlameIcon size={size} /> },
    police: { label: "Police", hint: "Police on the payroll", icon: (size) => <StatIcon type="police" size={size} /> },
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
