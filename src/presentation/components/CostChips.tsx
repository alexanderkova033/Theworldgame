// Cost/benefit numbers used to be written out as sentences — "240 Cr + 5
// Wood" — everywhere a build cost, enact cost, or research cost showed up.
// These small icon+number chips replace that prose with the same glyphs the
// rest of the UI already uses for treasury/resources/stats, so a cost reads
// at a glance instead of needing to be read.
import "./CostChips.css";
import type { ResourceType } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ChipProps {
  amount: number | string;
  suffix?: string;
}

export function TreasuryChip({ amount, suffix }: ChipProps) {
  return (
    <span className="cost-chip">
      <StatIcon type="treasury" size={15} />
      {amount}
      {suffix}
    </span>
  );
}

export function ResourceChip({ type, amount, suffix }: ChipProps & { type: ResourceType }) {
  return (
    <span className="cost-chip">
      <svg viewBox="-10 -10 20 20" width={15} height={15}>
        <ResourceIcon type={type} size={7.5} />
      </svg>
      {amount}
      {suffix}
    </span>
  );
}

export function StatChip({ type, amount, suffix }: ChipProps & { type: StatIconType }) {
  return (
    <span className="cost-chip">
      <StatIcon type={type} size={15} />
      {amount}
      {suffix}
    </span>
  );
}

// How long it takes once started — a small hourglass and a day count.
export function DaysChip({ days }: { days: number }) {
  return (
    <span className="cost-chip cost-chip--days" title={`Takes ${days} days`}>
      <svg viewBox="-10 -10 20 20" width={13} height={13}>
        <path d="M-5,-7 L5,-7 L5,-5.5 L1.2,0 L5,5.5 L5,7 L-5,7 L-5,5.5 L-1.2,0 L-5,-5.5 Z" fill="currentColor" />
      </svg>
      {days}d
    </span>
  );
}

export function CostChips({ children }: { children: React.ReactNode }) {
  return <span className="cost-chips">{children}</span>;
}
