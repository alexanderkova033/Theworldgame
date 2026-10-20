// The Money window, in two sections:
// - Budget: the day's money in and out, the tax rate, and loans
// - Market: buying and selling goods
import type { DailyProductionSummary } from "../../application/getDailyProductionSummary";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { isDebtDangerous } from "../../domain/loans/loanRules";
import { formatSigned } from "../formatNumber";
import { lockedReason, type MoneySection, type OpenPanel } from "../navigation";
import { BudgetPanel } from "./BudgetPanel";
import { DebtPanel } from "./DebtPanel";
import { MarketPanel } from "./MarketPanel";
import { NavIcon } from "./NavIcon";
import { StatIcon } from "./StatIcon";
import { SubTabs } from "./SubTabs";
import { TaxPanel } from "./TaxPanel";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface MoneyPanelProps {
  state: GameState;
  production: DailyProductionSummary;
  dispatch: Dispatch;
  onOpenPanel: OpenPanel;
  section: MoneySection;
  onSection: (section: MoneySection) => void;
}

export function MoneyPanel({ state, production, dispatch, onOpenPanel, section, onSection }: MoneyPanelProps) {
  return (
    <div className="window-panel">
      <SubTabs
        label="Money sections"
        tabs={[
          {
            key: "budget",
            label: "Budget",
            icon: <StatIcon type="treasury" size={22} />,
            alert: production.netTreasury < 0 || isDebtDangerous(state.debt),
            hint: `Net ${formatSigned(production.netTreasury)} ${CURRENCY_SYMBOL} a day after wages and building`,
          },
          {
            key: "market",
            label: "Market",
            locked: lockedReason(state, "money", "market") ?? undefined,
            icon: <NavIcon type="market" size={22} />,
            hint: "Buy and sell goods",
          },
        ]}
        active={section}
        onSelect={(key) => onSection(key as MoneySection)}
      />

      {section === "budget" && (
        <div className="window-layout window-layout--even">
          <BudgetPanel state={state} production={production} onOpenPanel={onOpenPanel} />
          <div className="window-layout__side">
            <TaxPanel state={state} production={production} dispatch={dispatch} />
            <DebtPanel state={state} dispatch={dispatch} />
          </div>
        </div>
      )}

      {section === "market" && <MarketPanel state={state} production={production} dispatch={dispatch} />}
    </div>
  );
}
