// "What needs you now": a slim row under the tabs with the two or three most
// urgent problems, each a chip that opens the tab that fixes it. With
// nothing wrong it shows the next early-game objective instead, with a tick
// per step. Everything comes from getAdvisorOutlook, computed once per day
// in App.tsx — this only draws it.
import "./AdvisorStrip.css";
import { useEffect, useState, type ReactNode } from "react";
import type { HeatingOutlook } from "../../application/getHeatingOutlook";
import { getQuickFix, type QuickFix } from "../../application/getQuickFix";
import { CURRENCY_SYMBOL, QUICK_FIX_CONFIRM_SHARE } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { playConfirm } from "../audio/sound";
import { formatCompact } from "../formatNumber";
import type { AdvisorAlertKind, AdvisorOutlook, ObjectiveKind } from "../../application/getAdvisorOutlook";
import { BuildingGlyph, FlameIcon, LoanIcon, UnrestStageIcon } from "./CauseIcon";
import { NavIcon } from "./NavIcon";
import { WrenchIcon } from "./RepairsPanel";
import { ResourceIcon } from "./ResourceIcon";
import { StatIcon } from "./StatIcon";
import type { OpenPanel } from "./TopBar";

const ICON_SIZE = 18;

function CoalIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={ICON_SIZE} height={ICON_SIZE} aria-hidden="true">
      <ResourceIcon type="coal" size={8} />
    </svg>
  );
}

const ALERT_ICONS: Record<AdvisorAlertKind, () => ReactNode> = {
  unrest: () => <UnrestStageIcon stage="strikes" size={ICON_SIZE} />,
  provinceUnrest: () => <UnrestStageIcon stage="riots" size={ICON_SIZE} />,
  coal: () => <CoalIcon />,
  food: () => <StatIcon type="food" size={ICON_SIZE} />,
  money: () => <StatIcon type="treasury" size={ICON_SIZE} />,
  farmWorkers: () => <BuildingGlyph type="farm" size={ICON_SIZE} />,
  factoryWorkers: () => <BuildingGlyph type="factory" size={ICON_SIZE} />,
  homeless: () => <BuildingGlyph type="housing" size={ICON_SIZE} />,
  broken: () => <WrenchIcon size={ICON_SIZE - 2} />,
  debt: () => <LoanIcon size={ICON_SIZE} />,
  election: () => <NavIcon type="politics" size={ICON_SIZE} />,
  stalled: () => <NavIcon type="economy" size={ICON_SIZE} />,
  research: () => <StatIcon type="research" size={ICON_SIZE} />,
};

const OBJECTIVE_ICONS: Record<ObjectiveKind, () => ReactNode> = {
  winter: () => <FlameIcon size={ICON_SIZE} />,
  farm: () => <BuildingGlyph type="farm" size={ICON_SIZE} />,
  homes: () => <BuildingGlyph type="housing" size={ICON_SIZE} />,
  election: () => <NavIcon type="politics" size={ICON_SIZE} />,
};

function FlagIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={16} height={16} aria-hidden="true">
      <line x1={-6} y1={-8.5} x2={-6} y2={9} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M-5,-8 L7,-5 L-5,-1.5 Z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="-10 -10 20 20" width={14} height={14} aria-hidden="true">
      <polyline points="-6,0 -2,5 6,-6" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The fix for one chip, beside it. A fix that would take a big bite out of
// the treasury asks twice: the first click shows the cost and arms it, a
// second one within a few seconds does it.
function QuickFixButton({ fix, treasury, onApply }: { fix: QuickFix; treasury: number; onApply: () => void }) {
  const [armed, setArmed] = useState(false);
  const needsConfirm = fix.treasuryCost > 0 && fix.treasuryCost > Math.max(0, treasury) * QUICK_FIX_CONFIRM_SHARE;
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(id);
  }, [armed]);
  const cost = [
    fix.treasuryCost > 0 ? `${formatCompact(fix.treasuryCost)} ${CURRENCY_SYMBOL}` : null,
    fix.politicalPowerCost > 0 ? `${Math.round(fix.politicalPowerCost)} political power` : null,
  ]
    .filter(Boolean)
    .join(" + ");
  return (
    <button
      type="button"
      className={`advisor-fix ${armed ? "is-armed" : ""}`}
      title={`${fix.label}${cost ? ` — costs ${cost}` : ""}${needsConfirm && !armed ? ". A big share of the treasury: click twice to confirm." : ""}`}
      onClick={() => {
        if (needsConfirm && !armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        playConfirm();
        onApply();
      }}
    >
      {armed ? `Confirm −${formatCompact(fix.treasuryCost)} ${CURRENCY_SYMBOL}?` : fix.label}
      {!armed && fix.treasuryCost > 0 && (
        <span className="advisor-fix__cost">
          {formatCompact(fix.treasuryCost)} {CURRENCY_SYMBOL}
        </span>
      )}
    </button>
  );
}

const CONFIRM_WINDOW_MS = 4000;

interface AdvisorStripProps {
  outlook: AdvisorOutlook;
  state: GameState;
  heating: HeatingOutlook;
  dispatch: (action: (state: GameState) => GameState) => void;
  onOpenPanel: OpenPanel;
}

export function AdvisorStrip({ outlook, state, heating, dispatch, onOpenPanel }: AdvisorStripProps) {
  const { alerts, objective } = outlook;

  return (
    <div className="advisor-strip" role="region" aria-label="What needs you now">
      {alerts.map((alert) => {
        const fix = getQuickFix(state, alert, heating);
        return (
        <span key={alert.kind} className={`advisor-group ${fix ? "has-fix" : ""}`}>
        <button
          type="button"
          className={`advisor-chip ${alert.critical ? "is-critical" : "is-warning"}`}
          title={alert.detail}
          onClick={() => onOpenPanel(alert.panel, alert.section)}
        >
          {alert.critical && (
            <span className="advisor-chip__alert" aria-label="Urgent">
              !
            </span>
          )}
          <span className="advisor-chip__icon">
            {alert.stage ? <UnrestStageIcon stage={alert.stage} size={ICON_SIZE} /> : ALERT_ICONS[alert.kind]()}
          </span>
          <span>{alert.text}</span>
        </button>
        {fix && <QuickFixButton fix={fix} treasury={state.stats.treasury} onApply={() => dispatch(fix.apply)} />}
        </span>
        );
      })}

      {objective && (
        <button type="button" className="advisor-chip is-objective" title={objective.detail} onClick={() => onOpenPanel(objective.panel, objective.section)}>
          <span className="advisor-chip__flag">
            <FlagIcon />
          </span>
          <span className="advisor-chip__icon">{OBJECTIVE_ICONS[objective.kind]()}</span>
          <span>{objective.text}</span>
          <span className="advisor-chip__ticks" aria-label={`${objective.done.filter(Boolean).length} of ${objective.done.length} done`}>
            {objective.done.map((isDone, i) => (
              <span key={i} className={`advisor-chip__tick ${isDone ? "is-done" : ""}`} aria-hidden="true">
                {isDone && <CheckIcon />}
              </span>
            ))}
          </span>
        </button>
      )}

      {alerts.length === 0 && !objective && (
        <span className="advisor-chip is-quiet">
          <CheckIcon />
          All quiet
        </span>
      )}
    </div>
  );
}
