import "./ResearchPanel.css";
import { useEffect, useRef, useState } from "react";
import { enactResearch } from "../../application/actions";
import type { GameState } from "../../domain/country/types";
import { getLawNode } from "../../domain/laws/lawsRules";
import { getRivalParty } from "../../domain/parties/partyRules";
import { RESEARCH_NODES } from "../../domain/research/researchData";
import {
  calculateDailyResearch,
  canAffordResearchEnactCost,
  getEffectivePassChance,
  getResearchNodeStatus,
  getResearchOutcomeFlavor,
  getRivalStance,
  type ResearchNodeStatus,
} from "../../domain/research/researchRules";
import type { ResearchCategory, ResearchEffects, ResearchNode } from "../../domain/research/types";
import { getSynergiesForResearch } from "../../domain/synergy/synergyRules";
import type { Synergy } from "../../domain/synergy/synergyData";
import { playConfirm } from "../audio/sound";
import { CostChips, ResourceChip, StatChip, TreasuryChip } from "./CostChips";
import { StatIcon, type StatIconType } from "./StatIcon";

interface ResearchPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORIES: ResearchCategory[] = ["industry", "agriculture", "administration"];
const TIERS = [1, 2, 3, 4] as const;

const CATEGORY_LABELS: Record<ResearchCategory, string> = {
  industry: "Industry",
  agriculture: "Agriculture",
  administration: "Administration",
};

const CATEGORY_ICONS: Record<ResearchCategory, StatIconType> = {
  industry: "industry",
  agriculture: "food",
  administration: "stability",
};

function nodesFor(category: ResearchCategory, tier: number): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.category === category && n.tier === tier);
}

// "+5% industry, +5% income" from a synergy's multiplier-only effects.
function formatSynergyEffect(effects: Synergy["effects"]): string {
  const parts: string[] = [];
  if (effects.industryMultiplier) parts.push(`+${Math.round((effects.industryMultiplier - 1) * 100)}% industry`);
  if (effects.incomeMultiplier) parts.push(`+${Math.round((effects.incomeMultiplier - 1) * 100)}% income`);
  return parts.join(", ");
}

function effectEntries(effects: ResearchEffects): Array<{ icon: StatIconType; positive: boolean }> {
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

// Legs are spread evenly between the same 22%/78% bounds a 2-leg version
// would use, so a 2-way fork still looks pixel-identical — this just
// doesn't assume exactly two, since Agriculture and Administration both
// have 3-way forks now.
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

interface ResearchNodeBadgeProps {
  node: ResearchNode;
  status: ResearchNodeStatus;
  isSelected: boolean;
  onSelect: () => void;
}

function ResearchNodeBadge({ node, status, isSelected, onSelect }: ResearchNodeBadgeProps) {
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
        {(status === "locked-prerequisite" || status === "locked-cross") && (
          <span className="law-node__badge law-node__badge--locked">
            <LockBadge />
          </span>
        )}
      </span>
      <span className="law-node__name">{node.name}</span>
    </button>
  );
}

interface ResearchInspectorProps {
  node: ResearchNode;
  state: GameState;
  status: ResearchNodeStatus;
  isArmed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}

function ResearchInspector({ node, state, status, isArmed, onArm, onConfirm }: ResearchInspectorProps) {
  const entries = effectEntries(node.effects);
  const benefitIcons = entries.filter((e) => e.positive).map((e) => e.icon);
  const costIcons = entries.filter((e) => !e.positive).map((e) => e.icon);
  const passChance = Math.round(getEffectivePassChance(state, node) * 100);
  const rival = getRivalParty(state.partyId);
  const stance = getRivalStance(state, node);
  const affordable = canAffordResearchEnactCost(state, node.enactCost);
  const crossNodeName = node.crossRequirement ? getLawNode(node.crossRequirement.nodeId)?.name : undefined;
  const synergies = getSynergiesForResearch(node.id);

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

      <div className="law-inspector__enact-cost">
        <span className="law-inspector__enact-cost-label">To fund the trial</span>
        <CostChips>
          <StatChip type="research" amount={node.enactCost.researchPoints} />
          <TreasuryChip amount={node.enactCost.treasury.toLocaleString()} />
          {node.enactCost.resourceType && (
            <ResourceChip type={node.enactCost.resourceType} amount={node.enactCost.resourceAmount ?? 0} />
          )}
        </CostChips>
        <span className="law-inspector__enact-cost-note">{state.stats.researchPoints.toFixed(1)} banked</span>
      </div>

      {synergies.map((synergy) => {
        const lawNode = getLawNode(synergy.lawId);
        const isActive = status === "enacted" && state.enactedLawIds.includes(synergy.lawId);
        return (
          <p key={synergy.id} className={`law-inspector__synergy ${isActive ? "is-active" : ""}`}>
            {isActive ? "Synergy active — " : "Synergy: pair with "}
            {lawNode?.name ?? "a Law"} (Law) for {formatSynergyEffect(synergy.effects)}.
          </p>
        );
      })}

      {stance !== "neutral" && status !== "enacted" && (
        <p className={`rival-stance is-${stance}`}>
          {rival.name} {stance === "opposes" ? "opposes this." : "supports this."}
        </p>
      )}

      {status === "enacted" && (
        <p className="law-inspector__status is-enacted">
          Adopted — {getResearchOutcomeFlavor(state.researchOutcomes[node.id]) ?? "as projected"}.
        </p>
      )}

      {status === "foreclosed" && (
        <p className="law-inspector__status is-foreclosed">Foreclosed — a rival technology took this branch instead.</p>
      )}

      {status === "locked-prerequisite" && (
        <p className="law-inspector__status is-locked">Requires the technology above it in this branch first.</p>
      )}

      {status === "locked-cross" && (
        <p className="law-inspector__status is-locked">Requires {crossNodeName ?? "a Law"} (Law) enacted first.</p>
      )}

      {status === "available" && (
        <div className="law-inspector__vote">
          <span
            className={`law-inspector__chance ${passChance >= 80 ? "is-safe" : passChance >= 50 ? "is-risky" : "is-dangerous"}`}
          >
            {passChance}% chance to pass
          </span>
          <button
            className="btn-primary law-inspector__vote-button"
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
            {!affordable ? (
              "Can't afford it"
            ) : isArmed ? (
              <>
                <CheckBadge /> Confirm — put it to a vote
              </>
            ) : (
              "Propose"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export function ResearchPanel({ state, dispatch }: ResearchPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedId ? (RESEARCH_NODES.find((n) => n.id === selectedId) ?? null) : null;

  // The tree can run 4 tiers deep, well past the fold — without this, picking
  // a node (especially near the bottom of a branch) opens the inspector
  // somewhere below the visible modal with no indication it appeared at all.
  useEffect(() => {
    if (selectedId) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="law-tree research-tree">
      <p className="panel-hint">
        Research points are a currency, not a threshold: you have {state.stats.researchPoints.toFixed(1)} banked (+
        {calculateDailyResearch(state.educationLevel).toFixed(2)}/day), and every node spends some of that pool plus
        treasury when its vote passes — no country-condition quota to clear first, unlike Laws. Adopting a technology
        is still a vote, not a guarantee, and even a passed vote's result is a roll of the dice — the listed benefit
        is what a solid trial looks like, not a promise.
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
                      <ResearchNodeBadge
                        key={node.id}
                        node={node}
                        status={getResearchNodeStatus(state, node)}
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
        <div ref={inspectorRef}>
          <ResearchInspector
            node={selectedNode}
            state={state}
            status={getResearchNodeStatus(state, selectedNode)}
            isArmed={armedId === selectedNode.id}
            onArm={() => setArmedId(selectedNode.id)}
            onConfirm={() => {
              dispatch((s) => enactResearch(s, selectedNode.id));
              setArmedId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
