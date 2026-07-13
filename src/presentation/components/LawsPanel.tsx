import "./LawsPanel.css";
import { useState } from "react";
import { enactLaw } from "../../application/actions";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { LAW_NODES } from "../../domain/laws/lawData";
import {
  canAffordLawEnactCost,
  getEffectivePassChance,
  getLawNodeStatus,
  getRivalStance,
  getQuotaProgress,
  type LawNodeStatus,
} from "../../domain/laws/lawsRules";
import type { LawCategory, LawEffects, LawNode, QuotaStat } from "../../domain/laws/types";
import { getRivalParty } from "../../domain/parties/partyRules";
import { getResearchNode } from "../../domain/research/researchRules";
import type { ResourceType } from "../../domain/resources/types";
import { playConfirm } from "../audio/sound";
import { StatIcon, type StatIconType } from "./StatIcon";

interface LawsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORIES: LawCategory[] = ["labor", "sustenance", "order"];
const TIERS = [1, 2, 3, 4] as const;

const CATEGORY_LABELS: Record<LawCategory, string> = {
  labor: "Labor",
  sustenance: "Sustenance",
  order: "Order",
};

const CATEGORY_ICONS: Record<LawCategory, StatIconType> = {
  labor: "industry",
  sustenance: "food",
  order: "stability",
};

const QUOTA_LABELS: Record<QuotaStat, string> = {
  treasury: "Treasury",
  population: "Population",
  food: "Food",
  industry: "Industry",
  stability: "Stability",
  popularity: "Popularity",
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

function formatQuotaValue(stat: QuotaStat, value: number): string {
  if (stat === "treasury") return `${Math.round(value).toLocaleString()} ${CURRENCY_SYMBOL}`;
  if (stat === "stability" || stat === "popularity") return `${Math.round(value)}`;
  return Math.round(value).toLocaleString();
}

function nodesFor(category: LawCategory, tier: number): LawNode[] {
  return LAW_NODES.filter((n) => n.category === category && n.tier === tier);
}

// Turns a law's numeric effects into (icon, is-it-a-benefit) pairs so the
// benefit/cost lines carry a matching stat glyph instead of being plain text.
function effectEntries(effects: LawEffects): Array<{ icon: StatIconType; positive: boolean }> {
  const entries: Array<{ icon: StatIconType; positive: boolean }> = [];
  if (effects.industryMultiplier !== undefined) entries.push({ icon: "industry", positive: effects.industryMultiplier >= 1 });
  if (effects.incomeMultiplier !== undefined) entries.push({ icon: "treasury", positive: effects.incomeMultiplier >= 1 });
  if (effects.treasuryDelta !== undefined) entries.push({ icon: "treasury", positive: effects.treasuryDelta >= 0 });
  if (effects.foodDelta !== undefined) entries.push({ icon: "food", positive: effects.foodDelta >= 0 });
  if (effects.stabilityDelta !== undefined) entries.push({ icon: "stability", positive: effects.stabilityDelta >= 0 });
  if (effects.populationDelta !== undefined) entries.push({ icon: "population", positive: effects.populationDelta >= 0 });
  if (effects.popularityDelta !== undefined) entries.push({ icon: "popularity", positive: effects.popularityDelta >= 0 });
  return entries;
}

function EffectIcons({ icons }: { icons: StatIconType[] }) {
  if (icons.length === 0) return null;
  return (
    <span className="law-effect-icons">
      {icons.map((icon, i) => (
        <StatIcon type={icon} size={15} key={`${icon}-${i}`} />
      ))}
    </span>
  );
}

function CheckBadge() {
  return (
    <svg viewBox="-10 -10 20 20" width={13} height={13}>
      <polyline points="-5,0 -1,4 5,-6" fill="none" stroke="#1a1406" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockBadge() {
  return (
    <svg viewBox="-10 -10 20 20" width={11} height={11}>
      <rect x={-4} y={-1} width={8} height={7} rx={1.2} fill="currentColor" />
      <path d="M-2.5,-1 L-2.5,-3.5 A2.5,2.5 0 0 1 2.5,-3.5 L2.5,-1" fill="none" stroke="currentColor" strokeWidth={1.6} />
    </svg>
  );
}

function XBadge() {
  return (
    <svg viewBox="-10 -10 20 20" width={11} height={11}>
      <line x1={-4} y1={-4} x2={4} y2={4} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <line x1={4} y1={-4} x2={-4} y2={4} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

// Legs are spread evenly between 22%/78% so a 2-way fork still looks
// pixel-identical to before — this just stops assuming exactly two, since
// Order tier 2 now has a 3-way fork alongside Agriculture's on the Research
// tree (see ResearchPanel.tsx, which this was ported from).
function TierConnector({ legCount }: { legCount: number }) {
  const legPositions =
    legCount === 1 ? [50] : Array.from({ length: legCount }, (_, i) => 22 + i * (56 / (legCount - 1)));
  return (
    <div className="law-tree__connector">
      <div className="law-tree__connector-stem" />
      {legCount > 1 && (
        <div className="law-tree__connector-fork">
          <div className="law-tree__connector-bar" />
          {legPositions.map((left, i) => (
            <div className="law-tree__connector-leg" style={{ left: `${left}%` }} key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

interface LawNodeBadgeProps {
  node: LawNode;
  status: LawNodeStatus;
  isSelected: boolean;
  onSelect: () => void;
}

function LawNodeBadge({ node, status, isSelected, onSelect }: LawNodeBadgeProps) {
  return (
    <button type="button" className={`law-node law-node--${status} ${isSelected ? "is-selected" : ""}`} onClick={onSelect}>
      <span className="law-node__icon">
        <StatIcon type={node.icon as StatIconType} size={26} />
        {status === "enacted" && (
          <span className="law-node__badge law-node__badge--enacted">
            <CheckBadge />
          </span>
        )}
        {status === "foreclosed" && (
          <span className="law-node__badge law-node__badge--foreclosed">
            <XBadge />
          </span>
        )}
        {(status === "locked-prerequisite" || status === "locked-cross" || status === "locked-quota") && (
          <span className="law-node__badge law-node__badge--locked">
            <LockBadge />
          </span>
        )}
      </span>
      <span className="law-node__name">{node.name}</span>
    </button>
  );
}

interface LawInspectorProps {
  node: LawNode;
  state: GameState;
  status: LawNodeStatus;
  isArmed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}

function LawInspector({ node, state, status, isArmed, onArm, onConfirm }: LawInspectorProps) {
  const entries = effectEntries(node.effects);
  const benefitIcons = entries.filter((e) => e.positive).map((e) => e.icon);
  const costIcons = entries.filter((e) => !e.positive).map((e) => e.icon);
  const passChance = Math.round(getEffectivePassChance(state, node) * 100);
  const quota = getQuotaProgress(state, node);
  const rival = getRivalParty(state.partyId);
  const stance = getRivalStance(state, node);
  const affordable = canAffordLawEnactCost(state, node.enactCost);
  const crossNodeName = node.crossRequirement ? getResearchNode(node.crossRequirement.nodeId)?.name : undefined;

  return (
    <div className="law-inspector">
      <div className="law-inspector__header">
        <div className="law-inspector__icon">
          <StatIcon type={node.icon as StatIconType} size={30} />
        </div>
        <div className="law-inspector__heading">
          <h4 className="law-inspector__name">{node.name}</h4>
          <p className="law-inspector__description">{node.description}</p>
        </div>
      </div>

      <div className="law-inspector__effects">
        <span className="law-inspector__benefit">
          <EffectIcons icons={benefitIcons} />
          {node.benefit}
        </span>
        <span className="law-inspector__cost">
          <EffectIcons icons={costIcons} />
          {node.cost}
        </span>
      </div>

      <p className="law-inspector__enact-cost">
        Costs {node.enactCost.treasury.toLocaleString()} {CURRENCY_SYMBOL}
        {node.enactCost.resourceType && ` + ${node.enactCost.resourceAmount} ${RESOURCE_LABELS[node.enactCost.resourceType]}`}
        {" "}to put to a vote
      </p>

      {stance !== "neutral" && status !== "enacted" && (
        <p className={`rival-stance is-${stance}`}>
          {rival.name} {stance === "opposes" ? "opposes this." : "supports this."}
        </p>
      )}

      {status === "enacted" && <p className="law-inspector__status is-enacted">Enacted.</p>}

      {status === "foreclosed" && (
        <p className="law-inspector__status is-foreclosed">Foreclosed — a rival law took this branch instead.</p>
      )}

      {status === "locked-prerequisite" && (
        <p className="law-inspector__status is-locked">Requires the law above it in this branch to be enacted first.</p>
      )}

      {status === "locked-cross" && (
        <p className="law-inspector__status is-locked">Requires {crossNodeName ?? "a Research node"} (Research) enacted first.</p>
      )}

      {status === "locked-quota" && (
        <div className="law-inspector__quota">
          <span className="law-inspector__quota-label">
            Needs {QUOTA_LABELS[node.quota.stat]} ≥ {formatQuotaValue(node.quota.stat, node.quota.threshold)} — currently{" "}
            {formatQuotaValue(node.quota.stat, quota.current)}
          </span>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.round(quota.ratio * 100)}%` }} />
          </div>
        </div>
      )}

      {status === "available" && (
        <div className="law-inspector__vote">
          <span
            className={`law-inspector__chance ${passChance >= 80 ? "is-safe" : passChance >= 50 ? "is-risky" : "is-dangerous"}`}
          >
            {passChance}% chance to pass
          </span>
          <button
            disabled={!affordable}
            onClick={() => {
              if (isArmed) {
                playConfirm();
                onConfirm();
              } else {
                onArm();
              }
            }}
          >
            {!affordable ? "Can't afford it" : isArmed ? "Confirm — put it to a vote" : "Propose"}
          </button>
        </div>
      )}
    </div>
  );
}

export function LawsPanel({ state, dispatch }: LawsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);

  const selectedNode = selectedId ? (LAW_NODES.find((n) => n.id === selectedId) ?? null) : null;

  return (
    <div className="law-tree">
      <p className="panel-hint">
        Each branch opens as you cross a quota and pay to put it to a vote — select a node to see what it needs.
        Passing isn't guaranteed: your party's popularity swings the odds.
      </p>

      <div className="law-tree__columns">
        {CATEGORIES.map((category) => (
          <div className="law-tree__column" key={category}>
            <h3 className="law-tree__column-title">
              <StatIcon type={CATEGORY_ICONS[category]} size={20} />
              {CATEGORY_LABELS[category]}
            </h3>

            {TIERS.map((tier, tierIndex) => {
              const nodes = nodesFor(category, tier);
              if (nodes.length === 0) return null;
              return (
                <div className="law-tree__tier" key={tier}>
                  {tierIndex > 0 && <TierConnector legCount={nodes.length} />}
                  <div className={`law-tree__row ${nodes.length > 1 ? "law-tree__row--fork" : ""}`}>
                    {nodes.map((node) => (
                      <LawNodeBadge
                        key={node.id}
                        node={node}
                        status={getLawNodeStatus(state, node)}
                        isSelected={selectedId === node.id}
                        onSelect={() => setSelectedId(node.id === selectedId ? null : node.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selectedNode && (
        <LawInspector
          node={selectedNode}
          state={state}
          status={getLawNodeStatus(state, selectedNode)}
          isArmed={armedId === selectedNode.id}
          onArm={() => setArmedId(selectedNode.id)}
          onConfirm={() => {
            dispatch((s) => enactLaw(s, selectedNode.id));
            setArmedId(null);
          }}
        />
      )}
    </div>
  );
}
