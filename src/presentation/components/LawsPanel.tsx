import "./LawsPanel.css";
import { useEffect, useRef, useState } from "react";
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
} from "../../domain/laws/lawsRules";
import type { LawCategory, LawNode, QuotaStat } from "../../domain/laws/types";
import { getRivalParty } from "../../domain/parties/partyRules";
import { getResearchNode } from "../../domain/research/researchRules";
import { getSynergiesForLaw } from "../../domain/synergy/synergyRules";
import { playConfirm } from "../audio/sound";
import { CostChips, ResourceChip, TreasuryChip } from "./CostChips";
import { StatIcon } from "./StatIcon";
import { InspectorHeader, StatusLine, SynergyLine, TreeColumns, VoteRow, type TreeNodeStatus } from "./TechTree";

interface LawsPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORIES = [
  { key: "labor", label: "Labor", icon: "industry" as const },
  { key: "sustenance", label: "Sustenance", icon: "food" as const },
  { key: "order", label: "Order", icon: "stability" as const },
];

const QUOTA_LABELS: Record<QuotaStat, string> = {
  treasury: "Treasury",
  population: "Population",
  food: "Food",
  industry: "Industry",
  stability: "Stability",
  popularity: "Popularity",
};

const QUOTA_ICONS: Record<QuotaStat, "treasury" | "population" | "food" | "industry" | "stability" | "popularity"> = {
  treasury: "treasury",
  population: "population",
  food: "food",
  industry: "industry",
  stability: "stability",
  popularity: "popularity",
};

function formatQuotaValue(stat: QuotaStat, value: number): string {
  if (stat === "treasury") return `${Math.round(value).toLocaleString()} ${CURRENCY_SYMBOL}`;
  if (stat === "stability" || stat === "popularity") return `${Math.round(value)}`;
  return Math.round(value).toLocaleString();
}

function nodesFor(category: string, tier: number): LawNode[] {
  return LAW_NODES.filter((n) => n.category === (category as LawCategory) && n.tier === tier);
}

interface LawInspectorProps {
  node: LawNode;
  state: GameState;
  status: TreeNodeStatus;
  isArmed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}

function LawInspector({ node, state, status, isArmed, onArm, onConfirm }: LawInspectorProps) {
  const passChance = Math.round(getEffectivePassChance(state, node) * 100);
  const quota = getQuotaProgress(state, node);
  const rival = getRivalParty(state.partyId);
  const stance = getRivalStance(state, node);
  const crossNodeName = node.crossRequirement ? getResearchNode(node.crossRequirement.nodeId)?.name : undefined;

  return (
    <div className="law-inspector">
      <InspectorHeader node={node} description={node.description} benefit={node.benefit} cost={node.cost} effects={node.effects} />

      <div className="law-inspector__enact-cost">
        <span className="law-inspector__enact-cost-label">To put to a vote</span>
        <CostChips>
          <TreasuryChip amount={node.enactCost.treasury.toLocaleString()} />
          {node.enactCost.resourceType && <ResourceChip type={node.enactCost.resourceType} amount={node.enactCost.resourceAmount ?? 0} />}
        </CostChips>
      </div>

      {getSynergiesForLaw(node.id).map((synergy) => (
        <SynergyLine
          key={synergy.id}
          synergy={synergy}
          partnerName={getResearchNode(synergy.researchId)?.name ?? "a Research node"}
          isActive={status === "enacted" && state.enactedResearchIds.includes(synergy.researchId)}
        />
      ))}

      {stance !== "neutral" && status !== "enacted" && (
        <p className={`rival-stance is-${stance}`}>
          {rival.name} {stance === "opposes" ? "opposes this." : "supports this."}
        </p>
      )}

      {status === "enacted" && <StatusLine status="enacted">Enacted.</StatusLine>}
      {status === "foreclosed" && <StatusLine status="foreclosed">A rival law took this branch.</StatusLine>}
      {status === "locked-prerequisite" && <StatusLine status="locked">Enact the law above it first.</StatusLine>}
      {status === "locked-cross" && <StatusLine status="locked">Needs {crossNodeName ?? "a Research node"} (Research).</StatusLine>}

      {status === "locked-quota" && (
        <div className="law-inspector__quota">
          <span className="law-inspector__quota-label">
            <StatIcon type={QUOTA_ICONS[node.quota.stat]} size={15} />
            {QUOTA_LABELS[node.quota.stat]} {formatQuotaValue(node.quota.stat, quota.current)} / {formatQuotaValue(node.quota.stat, node.quota.threshold)}
          </span>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${Math.round(quota.ratio * 100)}%` }} />
          </div>
        </div>
      )}

      {status === "available" && (
        <VoteRow
          passChance={passChance}
          affordable={canAffordLawEnactCost(state, node.enactCost)}
          isArmed={isArmed}
          onArm={onArm}
          onConfirm={() => {
            playConfirm();
            onConfirm();
          }}
        />
      )}
    </div>
  );
}

export function LawsPanel({ state, dispatch }: LawsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedId ? (LAW_NODES.find((n) => n.id === selectedId) ?? null) : null;

  // The tree can run 4 tiers deep, well past the fold — without this, picking
  // a node (especially near the bottom of a branch) opens the inspector
  // somewhere below the visible modal with no indication it appeared at all.
  useEffect(() => {
    if (selectedId) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="law-tree">
      <TreeColumns
        categories={CATEGORIES}
        nodesFor={nodesFor}
        getStatus={(node) => getLawNodeStatus(state, node)}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
      />

      {selectedNode && (
        <div ref={inspectorRef}>
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
        </div>
      )}
    </div>
  );
}
