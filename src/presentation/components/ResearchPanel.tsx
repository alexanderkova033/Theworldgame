// The Research tree shares LawsPanel's stylesheet and every piece of its
// shape (see TechTree.tsx) — what differs is the gate: research points
// instead of a country-condition quota, and education instead of popularity
// nudging the vote.
import "./LawsPanel.css";
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
  getResearchDays,
  getResearchNodeStatus,
  getResearchOutcomeFlavor,
  getRivalStance,
} from "../../domain/research/researchRules";
import type { ResearchCategory, ResearchNode } from "../../domain/research/types";
import { getSynergiesForResearch } from "../../domain/synergy/synergyRules";
import { playConfirm } from "../audio/sound";
import { CostChips, DaysChip, ResourceChip, StatChip, TreasuryChip } from "./CostChips";
import { InspectorHeader, StatusLine, SynergyLine, TreeBank, TreeColumns, VoteRow, WorkInProgress, type TreeNodeStatus } from "./TechTree";

interface ResearchPanelProps {
  state: GameState;
  dispatch: (action: (state: GameState) => GameState) => void;
}

const CATEGORIES = [
  { key: "industry", label: "Industry", icon: "industry" as const },
  { key: "agriculture", label: "Agriculture", icon: "food" as const },
  { key: "administration", label: "Administration", icon: "stability" as const },
];

function nodesFor(category: string, tier: number): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.category === (category as ResearchCategory) && n.tier === tier);
}

interface ResearchInspectorProps {
  node: ResearchNode;
  state: GameState;
  status: TreeNodeStatus;
  isArmed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}

function ResearchInspector({ node, state, status, isArmed, onArm, onConfirm }: ResearchInspectorProps) {
  const passChance = Math.round(getEffectivePassChance(state, node) * 100);
  const rival = getRivalParty(state.partyId);
  const stance = getRivalStance(state, node);
  const crossNodeName = node.crossRequirement ? getLawNode(node.crossRequirement.nodeId)?.name : undefined;

  return (
    <div className="law-inspector">
      <InspectorHeader node={node} description={node.description} benefit={node.benefit} cost={node.cost} effects={node.effects} />

      <div className="law-inspector__enact-cost">
        <span className="law-inspector__enact-cost-label">To fund the trial</span>
        <CostChips>
          <StatChip type="research" amount={node.enactCost.researchPoints} />
          <TreasuryChip amount={node.enactCost.treasury.toLocaleString()} />
          {node.enactCost.resourceType && <ResourceChip type={node.enactCost.resourceType} amount={node.enactCost.resourceAmount ?? 0} />}
          <DaysChip days={getResearchDays(node)} />
        </CostChips>
      </div>

      {getSynergiesForResearch(node.id).map((synergy) => (
        <SynergyLine
          key={synergy.id}
          synergy={synergy}
          partnerName={getLawNode(synergy.lawId)?.name ?? "a Law"}
          isActive={status === "enacted" && state.enactedLawIds.includes(synergy.lawId)}
        />
      ))}

      {stance !== "neutral" && status !== "enacted" && (
        <p className={`rival-stance is-${stance}`}>
          {rival.name} {stance === "opposes" ? "opposes this." : "supports this."}
        </p>
      )}

      {status === "enacted" && (
        <StatusLine status="enacted">Adopted — {getResearchOutcomeFlavor(state.researchOutcomes[node.id]) ?? "as projected"}.</StatusLine>
      )}
      {status === "in-progress" && state.activeResearch && (
        <StatusLine status="in-progress">In the lab — {state.activeResearch.daysRemaining} days left.</StatusLine>
      )}
      {status === "foreclosed" && <StatusLine status="foreclosed">A rival technology took this branch.</StatusLine>}
      {status === "locked-prerequisite" && <StatusLine status="locked">Adopt the technology above it first.</StatusLine>}
      {status === "locked-cross" && <StatusLine status="locked">Needs {crossNodeName ?? "a Law"} (Laws).</StatusLine>}

      {status === "available" && (
        <VoteRow
          passChance={passChance}
          affordable={canAffordResearchEnactCost(state, node.enactCost)}
          busy={state.activeResearch !== null}
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

export function ResearchPanel({ state, dispatch }: ResearchPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedId ? (RESEARCH_NODES.find((n) => n.id === selectedId) ?? null) : null;
  const activeNode = state.activeResearch ? (RESEARCH_NODES.find((n) => n.id === state.activeResearch?.nodeId) ?? null) : null;
  const progress = state.activeResearch
    ? { nodeId: state.activeResearch.nodeId, ratio: 1 - state.activeResearch.daysRemaining / state.activeResearch.totalDays }
    : null;

  // The tree can run 4 tiers deep, well past the fold — without this, picking
  // a node (especially near the bottom of a branch) opens the inspector
  // somewhere below the visible modal with no indication it appeared at all.
  useEffect(() => {
    if (selectedId) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="law-tree research-tree">
      {/* What the tree itself can't show: the pool every node spends from,
          and whatever is in the lab right now. */}
      <div className="law-tree__header">
        <TreeBank icon="research" label="Research points" value={state.stats.researchPoints} rate={calculateDailyResearch(state.educationLevel)} />
        {activeNode && state.activeResearch && (
          <WorkInProgress
            node={activeNode}
            daysRemaining={state.activeResearch.daysRemaining}
            totalDays={state.activeResearch.totalDays}
            onSelect={() => setSelectedId(activeNode.id)}
          />
        )}
      </div>

      <TreeColumns
        categories={CATEGORIES}
        nodesFor={nodesFor}
        getStatus={(node) => getResearchNodeStatus(state, node)}
        progress={progress}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
      />

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
