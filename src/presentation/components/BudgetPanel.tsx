// The daily budget, set out as a ledger page: money in, money out, and the
// balance — every line that moves the treasury on an ordinary day, each with
// what it's made of in words ("12% tax on 10.2k people"), so it's plain how
// a day's money is reckoned. Building instalments are on it too: they leave
// the treasury every day a project is underway, and a figure without them
// would say the treasury is rising while it falls.
//
// The In and Out bars beside the balance are made of the lines below them:
// point at a line and its stretch of the bar lights up, and the other way
// round. A line someone can change links to the section that changes it.
import "./BudgetPanel.css";
import { useState, type ReactNode } from "react";
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { BUILDINGS, PEOPLE, type Destination, type OpenPanel } from "../navigation";
import { getForecasts } from "../../application/getForecasts";
import { formatDate } from "../../domain/country/calendar";
import { CURRENCY_SYMBOL, REGIMENT_SALARY } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getTotalScientists } from "../../domain/workforce/workforceRules";
import { formatAmount, formatSigned } from "../formatNumber";
import { TaxIcon, WagesIcon } from "./CauseIcon";
import { NavIcon } from "./NavIcon";
import { StatIcon } from "./StatIcon";

type LineKey = "taxes" | "industry" | "wages" | "army" | "building";

interface BudgetLine {
  key: LineKey;
  icon: ReactNode;
  label: string;
  detail: string;
  value: number;
  hint?: string; // how it's reckoned, for the curious
  go?: Destination & { label: string };
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Line({ line, focus, onFocus, onOpenPanel }: { line: BudgetLine; focus: LineKey | null; onFocus: (key: LineKey | null) => void; onOpenPanel: OpenPanel }) {
  return (
    <tr
      className={`budget-sheet__line ${focus === line.key ? "is-focus" : ""}`}
      onMouseEnter={() => onFocus(line.key)}
      onMouseLeave={() => onFocus(null)}
      title={line.hint}
    >
      <td className="budget-sheet__icon" aria-hidden="true">
        {line.icon}
      </td>
      <th scope="row" className="budget-sheet__label">
        {line.label}
        <span className="budget-sheet__detail">
          {line.detail}
          {line.go && (
            <button type="button" className="budget-sheet__go" onClick={() => onOpenPanel(line.go!.panel, line.go!.section, line.go!.rail)}>
              {line.go.label} ›
            </button>
          )}
        </span>
      </th>
      <td className={`budget-sheet__value ${line.value > 0 ? "is-gain" : line.value < 0 ? "is-loss" : ""}`}>{formatSigned(line.value)}</td>
    </tr>
  );
}

// In or out as one bar, each line its own stretch of it.
function Bar({ name, lines, scale, tone, focus, onFocus }: { name: string; lines: BudgetLine[]; scale: number; tone: "gain" | "loss"; focus: LineKey | null; onFocus: (key: LineKey | null) => void }) {
  return (
    <span className="budget-sheet__bar-row">
      <span className="budget-sheet__bar-name">{name}</span>
      <span className="budget-sheet__bar">
        {lines.map((line) => {
          const share = (Math.abs(Math.round(line.value)) / scale) * 100;
          if (share <= 0) return null;
          return (
            <span
              key={line.key}
              className={`budget-sheet__bar-fill is-${tone} ${focus === line.key ? "is-focus" : focus ? "is-dim" : ""}`}
              style={{ width: `${share}%` }}
              title={`${line.label}: ${formatSigned(line.value)} ${CURRENCY_SYMBOL}`}
              onMouseEnter={() => onFocus(line.key)}
              onMouseLeave={() => onFocus(null)}
            />
          );
        })}
      </span>
    </span>
  );
}

export function BudgetPanel({ state, production, onOpenPanel }: { state: GameState; production: DailyProductionSummary; onOpenPanel: OpenPanel }) {
  const [focus, setFocus] = useState<LineKey | null>(null);
  const scientists = getTotalScientists(state.workforce);
  const police = state.workforce.police;
  const projects = state.projects.length;

  const income: BudgetLine[] = [
    {
      key: "taxes",
      icon: <TaxIcon size={20} />,
      label: "Taxes",
      detail: `${Math.round(state.taxRate * 100)}% tax on ${formatAmount(state.stats.population)} people`,
      value: production.taxIncome,
    },
    {
      key: "industry",
      icon: <StatIcon type="industry" size={20} />,
      label: "Industry",
      detail: state.stats.industry > 0 ? `${formatAmount(state.stats.industry)} industry at work` : "No factories at work yet",
      value: production.industryIncome,
      hint: "What the factories earn. They run only as well as they're staffed.",
      go: { ...PEOPLE, label: "Workers" },
    },
  ];
  // A cost that is nothing today (no staff, nothing being built) takes no row.
  const spending: BudgetLine[] = [
    {
      key: "wages",
      icon: <WagesIcon size={20} />,
      label: "Wages",
      detail: `${plural(scientists, "scientist", "scientists")} and ${plural(police, "officer", "officers")}`,
      value: -production.salaries,
    },
    ...(production.armyPay > 0
      ? [
          {
            key: "army" as const,
            icon: <StatIcon type="regiment" size={20} />,
            label: "Army",
            detail: `Pay for ${plural(production.armyPay / REGIMENT_SALARY, "regiment", "regiments")}`,
            value: -production.armyPay,
            go: { panel: "army" as const, label: "Army" },
          },
        ]
      : []),
    {
      key: "building",
      icon: <NavIcon type="build" size={20} />,
      label: "Building",
      detail: `Instalments on ${plural(projects, "project", "projects")}`,
      value: -production.buildingInstalments,
      hint: "A new building takes 60% of its price the day you order it; the rest comes out here, a little each day, until it's finished.",
      go: { ...BUILDINGS, label: "Build" },
    },
  ];

  // Summed from the whole-crown figures as printed, so the page adds up
  // the way a reader checks it, line by line.
  const totalIn = income.reduce((sum, l) => sum + Math.round(l.value), 0);
  const totalOut = -spending.reduce((sum, l) => sum + Math.round(l.value), 0);
  const net = totalIn - totalOut;
  const scale = Math.max(totalIn, totalOut, 1);
  const runOut = net < 0 ? getForecasts(state, production).treasury : null;

  return (
    <section className="panel budget-sheet">
      <h2>Daily Budget</h2>

      {/* The day's balance, big: the one number that answers "am I making
          or losing money?" — with in and out as two bars beside it. */}
      <div
        className={`budget-sheet__balance ${net >= 0 ? "is-gain" : "is-loss"}`}
        title="Every ordinary day, as things stand. Trade, loans and decisions move the treasury on the day you make them, not every day."
      >
        <span className="budget-sheet__balance-label">{net >= 0 ? "You gain each day" : "You lose each day"}</span>
        <strong className="budget-sheet__balance-value">
          {formatSigned(net)} <span className="budget-sheet__unit">{CURRENCY_SYMBOL}</span>
        </strong>
        <span className="budget-sheet__bars">
          <Bar name="In" lines={income} scale={scale} tone="gain" focus={focus} onFocus={setFocus} />
          <Bar name="Out" lines={spending} scale={scale} tone="loss" focus={focus} onFocus={setFocus} />
        </span>
      </div>

      <table className="budget-sheet__table">
        <tbody>
          <tr className="budget-sheet__section">
            <th colSpan={2} scope="rowgroup">
              Money in
            </th>
            <td className="budget-sheet__subtotal is-gain">{formatSigned(totalIn)}</td>
          </tr>
          {income.map((line) => (
            <Line key={line.key} line={line} focus={focus} onFocus={setFocus} onOpenPanel={onOpenPanel} />
          ))}
        </tbody>
        <tbody>
          <tr className="budget-sheet__section">
            <th colSpan={2} scope="rowgroup">
              Money out
            </th>
            <td className="budget-sheet__subtotal is-loss">{formatSigned(-totalOut)}</td>
          </tr>
          {spending.filter((line) => Math.round(line.value) !== 0).map((line) => (
            <Line key={line.key} line={line} focus={focus} onFocus={setFocus} onOpenPanel={onOpenPanel} />
          ))}
        </tbody>
        <tfoot>
          <tr className="budget-sheet__total">
            <th colSpan={2} scope="row">
              Balance each day
            </th>
            <td className={net >= 0 ? "is-gain" : "is-loss"}>{formatSigned(net)}</td>
          </tr>
        </tfoot>
      </table>

      <p
        className="budget-sheet__outlook"
        title={state.debt > 0 ? "Debt isn't paid from this budget. It grows on its own until you repay it." : undefined}
      >
        <StatIcon type="treasury" size={18} />
        <strong>
          {formatAmount(Math.floor(state.stats.treasury))} {CURRENCY_SYMBOL}
        </strong>
        {runOut ? (
          <span className="is-loss">
            empty in {runOut.days} days ({formatDate(runOut.date)})
          </span>
        ) : net > 0 ? (
          <span className="is-gain">growing</span>
        ) : null}
        {state.debt > 0 && <span className="budget-sheet__debt">debt {formatAmount(Math.ceil(state.debt))} {CURRENCY_SYMBOL}</span>}
      </p>
    </section>
  );
}
