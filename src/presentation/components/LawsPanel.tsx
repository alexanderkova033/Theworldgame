import "./LawsPanel.css";
import { useEffect, useRef, useState } from "react";
import { enactLaw } from "../../application/actions";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { LAW_NODES } from "../../domain/laws/lawData";
import {
  canAffordLawEnactCost,
  getEffectivePassChance,
  getLawDays,
  getLawNode,
  getLawNodeStatus,
  getRivalStance,
  getQuotaProgress,
} from "../../domain/laws/lawsRules";
import type { LawCategory, LawNode, QuotaStat } from "../../domain/laws/types";
import { getRivalParty } from "../../domain/parties/partyRules";
import { getDailyPoliticalPower } from "../../domain/politics/politicsRules";
import { getResearchNode } from "../../domain/research/researchRules";
import { getSynergiesForLaw } from "../../domain/synergy/synergyRules";
import { playConfirm } from "../audio/sound";
import { CostChips, DaysChip, ResourceChip, StatChip, TreasuryChip } from "./CostChips";
import { StatIcon } from "./StatIcon";
import { HourglassIcon } from "./CauseIcon";
import { SubTabs } from "./SubTabs";
import { InspectorHeader, StatusLine, SynergyLine, TreeBank, TreeColumns, VoteRow, WorkInProgress, type TreeNodeStatus } from "./TechTree";

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
          <StatChip type="politicalPower" amount={node.enactCost.politicalPower} />
          <TreasuryChip amount={node.enactCost.treasury.toLocaleString()} />
          {node.enactCost.resourceType && <ResourceChip type={node.enactCost.resourceType} amount={node.enactCost.resourceAmount ?? 0} />}
          <DaysChip days={getLawDays(node)} />
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
      {status === "in-progress" && state.activeLaw && (
        <StatusLine status="in-progress">Passed — in force in {state.activeLaw.daysRemaining} days.</StatusLine>
      )}
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
          busy={state.activeLaw !== null}
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
  // One category at a time; opens on the one whose law is being drafted.
  const [category, setCategory] = useState<LawCategory>(
    () => (state.activeLaw ? getLawNode(state.activeLaw.nodeId)?.category : undefined) ?? "labor",
  );
  const inspectorRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedId ? (LAW_NODES.find((n) => n.id === selectedId) ?? null) : null;
  const activeNode = state.activeLaw ? (LAW_NODES.find((n) => n.id === state.activeLaw?.nodeId) ?? null) : null;

  // The tree can run 4 tiers deep, well past the fold — without this, picking
  // a node (especially near the bottom of a branch) opens the inspector
  // somewhere below the visible modal with no indication it appeared at all.
  useEffect(() => {
    if (selectedId) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="law-tree">
      <div className="law-tree__header">
        <TreeBank icon="politicalPower" label="Political power" value={state.stats.politicalPower} rate={getDailyPoliticalPower(state)} />
        {activeNode && state.activeLaw && (
          <WorkInProgress
            node={activeNode}
            daysRemaining={state.activeLaw.daysRemaining}
            totalDays={state.activeLaw.totalDays}
            onSelect={() => setSelectedId(activeNode.id)}
          />
        )}
      </div>

      <SubTabs
        label="Law categories"
        tabs={CATEGORIES.map((c) => {
          const nodes = LAW_NODES.filter((n) => n.category === c.key);
          const tiers = new Set(nodes.map((n) => n.tier)).size;
          const done = nodes.filter((n) => state.enactedLawIds.includes(n.id)).length;
          const drafting = state.activeLaw ? getLawNode(state.activeLaw.nodeId) : undefined;
          const isDrafting = drafting?.category === c.key;
          return {
            key: c.key,
            label: c.label,
            icon: <StatIcon type={c.icon} size={22} />,
            badge: isDrafting ? (
              <span className="tree-badge-drafting">
                <HourglassIcon size={13} />
                {done}/{tiers}
              </span>
            ) : (
              `${done}/${tiers}`
            ),
            hint: isDrafting ? `${drafting!.name} is being drafted · ${done} of ${tiers} tiers passed` : `${done} of ${tiers} tiers passed`,
          };
        })}
        active={category}
        onSelect={(key) => {
          setCategory(key as LawCategory);
          setSelectedId(null);
        }}
      />

      <TreeColumns
        categories={CATEGORIES.filter((c) => c.key === category)}
        nodesFor={nodesFor}
        getStatus={(node) => getLawNodeStatus(state, node)}
        getProgress={(node) =>
          state.activeLaw?.nodeId === node.id ? 1 - state.activeLaw.daysRemaining / state.activeLaw.totalDays : 0
        }
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
