// The Research tree shares LawsPanel's stylesheet and every piece of its
// shape (see TechTree.tsx) — what differs is how it moves. There's no vote
// and no price: each column is a research area with its own daily rate
// (its buildings + its scientists), and you only choose which node it
// works toward. The column headers carry that rate, the scientists hired
// into the area, and how far along its current direction is.
import "./LawsPanel.css";
import "./ResearchPanel.css";
import { useEffect, useRef, useState } from "react";
import { clearResearchFocus, focusResearch } from "../../application/actions";
import { CURRENCY_SYMBOL, SCIENTIST_SALARY } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getLawNode } from "../../domain/laws/lawsRules";
import { RESEARCH_NODES } from "../../domain/research/researchData";
import {
  getResearchCost,
  getResearchDaysLeft,
  getResearchNode,
  getResearchNodeStatus,
  getResearchOutcomeFlavor,
  getResearchProgressRatio,
  getResearchRateBreakdown,
} from "../../domain/research/researchRules";
import type { ResearchCategory, ResearchNode } from "../../domain/research/types";
import { getSynergiesForResearch } from "../../domain/synergy/synergyRules";
import { getScientistCap, getTotalScientists, RESEARCH_CATEGORIES } from "../../domain/workforce/workforceRules";
import { playConfirm } from "../audio/sound";
import { CostChips, StatChip } from "./CostChips";
import { StatIcon } from "./StatIcon";
import { InspectorHeader, StatusLine, SynergyLine, TreeColumns, TreeTabs, type TreeNodeStatus, type TreeTab } from "./TechTree";
import { AREA_ICONS, AREA_LABELS } from "../researchAreas";
import { ScientistStepper } from "./WorkforcePanel";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface ResearchPanelProps {
  state: GameState;
  dispatch: Dispatch;
}

// Every research area, Housing included — taken from the domain list so a
// new area can't be left off the tree again.
const CATEGORIES = RESEARCH_CATEGORIES.map((key) => ({
  key,
  label: AREA_LABELS[key],
  icon: AREA_ICONS[key],
}));

function nodesFor(category: string, tier: number): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.category === (category as ResearchCategory) && n.tier === tier);
}

// Under each column title: the area's daily rate (with where it comes from
// in the tooltip), its scientists, and its current direction's progress —
// or a warning that it's idle.
function AreaHeader({ state, category, dispatch, onSelectNode }: { state: GameState; category: ResearchCategory; dispatch: Dispatch; onSelectNode: (id: string) => void }) {
  const rate = getResearchRateBreakdown(state, category);
  const focusId = state.researchFocus[category];
  const focusNode = focusId ? getResearchNode(focusId) : undefined;
  const ratio = focusNode ? getResearchProgressRatio(state, focusNode) : 0;
  const daysLeft = focusNode ? getResearchDaysLeft(state, focusNode) : null;

  return (
    <div className="research-area">
      <div className="research-area__row">
        <span
          className="research-area__rate"
          title={`Base ${rate.base.toFixed(2)} + buildings ${rate.buildings.toFixed(2)} + scientists ${rate.scientists.toFixed(2)}, ×${rate.educationMultiplier.toFixed(2)} from schools`}
        >
          <StatIcon type="research" size={16} />+{rate.total.toFixed(2)}/d
        </span>
        <ScientistStepper state={state} category={category} dispatch={dispatch} />
      </div>
      {focusNode ? (
        <button type="button" className="research-area__focus" onClick={() => onSelectNode(focusNode.id)} title={`${focusNode.name}: ${Math.round(ratio * 100)}%`}>
          <span className="research-area__bar">
            <span className="research-area__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </span>
          <span className="research-area__days">{daysLeft === null ? "—" : `${daysLeft}d`}</span>
        </button>
      ) : (
        <span className="research-area__idle" title="This area's research is going nowhere — pick a node below">
          Idle — pick a direction
        </span>
      )}
    </div>
  );
}

interface ResearchInspectorProps {
  node: ResearchNode;
  state: GameState;
  status: TreeNodeStatus;
  onFocus: () => void;
  onStop: () => void;
}

function ResearchInspector({ node, state, status, onFocus, onStop }: ResearchInspectorProps) {
  const crossNodeName = node.crossRequirement ? getLawNode(node.crossRequirement.nodeId)?.name : undefined;
  const ratio = getResearchProgressRatio(state, node);
  const daysLeft = getResearchDaysLeft(state, node);
  const currentFocus = state.researchFocus[node.category];
  const isSwitch = status === "available" && currentFocus !== null && currentFocus !== node.id;

  return (
    <div className="law-inspector">
      <InspectorHeader node={node} description={node.description} benefit={node.benefit} cost={node.cost} effects={node.effects} />

      {status !== "enacted" && (
        <div className="law-inspector__enact-cost">
          <span className="law-inspector__enact-cost-label">Work needed</span>
          <CostChips>
            <StatChip type="research" amount={getResearchCost(node)} />
          </CostChips>
          {daysLeft !== null && <span className="research-inspector__eta">≈ {daysLeft} days at today's rate</span>}
        </div>
      )}

      {ratio > 0 && status !== "enacted" && (
        <div className="progress-bar" title={`${Math.round(ratio * 100)}% done`}>
          <div className="progress-bar__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
      )}

      {getSynergiesForResearch(node.id).map((synergy) => (
        <SynergyLine
          key={synergy.id}
          synergy={synergy}
          partnerName={getLawNode(synergy.lawId)?.name ?? "a Law"}
          isActive={status === "enacted" && state.enactedLawIds.includes(synergy.lawId)}
        />
      ))}

      {status === "enacted" && (
        <StatusLine status="enacted">Complete — {getResearchOutcomeFlavor(state.researchOutcomes[node.id]) ?? "as projected"}.</StatusLine>
      )}
      {status === "foreclosed" && <StatusLine status="foreclosed">A rival technology took this branch.</StatusLine>}
      {status === "locked-prerequisite" && <StatusLine status="locked">Finish the technology above it first.</StatusLine>}
      {status === "locked-cross" && <StatusLine status="locked">Needs {crossNodeName ?? "a Law"} (Laws).</StatusLine>}

      {status === "in-progress" && (
        <div className="law-inspector__vote">
          <StatusLine status="in-progress">This is where {AREA_LABELS[node.category].toLowerCase()} research is headed.</StatusLine>
          <button type="button" onClick={onStop}>
            Stop
          </button>
        </div>
      )}

      {status === "available" && (
        <div className="law-inspector__vote">
          <button
            type="button"
            className="btn-primary law-inspector__vote-button"
            onClick={() => {
              playConfirm();
              onFocus();
            }}
            title={isSwitch ? "Progress on the current direction is kept if you come back to it" : undefined}
          >
            <StatIcon type="research" size={16} />
            {isSwitch ? "Switch direction" : "Research this"}
          </button>
        </div>
      )}
    </div>
  );
}

// Each area's tab: how far its current direction is, or a "!" when it's
// idle with something to research.
function areaTab(state: GameState, category: ResearchCategory): TreeTab {
  const focusId = state.researchFocus[category];
  const focusNode = focusId ? getResearchNode(focusId) : undefined;
  const done = RESEARCH_NODES.filter((n) => n.category === category && state.enactedResearchIds.includes(n.id)).length;
  const total = new Set(RESEARCH_NODES.filter((n) => n.category === category).map((n) => n.tier)).size;
  const idle = !focusNode && RESEARCH_NODES.some((n) => n.category === category && getResearchNodeStatus(state, n) === "available");
  return {
    key: category,
    label: AREA_LABELS[category],
    icon: AREA_ICONS[category],
    alert: idle,
    badge: focusNode ? `${Math.round(getResearchProgressRatio(state, focusNode) * 100)}%` : `${done}/${total}`,
    hint: focusNode
      ? `Researching ${focusNode.name} — ${Math.round(getResearchProgressRatio(state, focusNode) * 100)}% done`
      : idle
        ? "Idle — no direction chosen, so no progress"
        : `${done} of ${total} tiers done`,
  };
}

export function ResearchPanel({ state, dispatch }: ResearchPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // One area at a time; opens on the first one sitting idle, if any.
  const [area, setArea] = useState<ResearchCategory>(
    () => RESEARCH_CATEGORIES.find((c) => areaTab(state, c).alert) ?? RESEARCH_CATEGORIES[0],
  );
  const inspectorRef = useRef<HTMLDivElement>(null);

  const selectedNode = selectedId ? (RESEARCH_NODES.find((n) => n.id === selectedId) ?? null) : null;
  const scientists = getTotalScientists(state.workforce);

  // The tree can run 4 tiers deep, well past the fold — without this, picking
  // a node (especially near the bottom of a branch) opens the inspector
  // somewhere below the visible modal with no indication it appeared at all.
  useEffect(() => {
    if (selectedId) inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="law-tree research-tree">
      <div className="law-tree__header">
        <span
          className="law-tree__bank"
          title={`Scientists employed, of how many your schools can train. Each costs ${SCIENTIST_SALARY} ${CURRENCY_SYMBOL}/day.`}
        >
          <StatIcon type="research" size={22} />
          <span className="law-tree__bank-value">
            {scientists}/{getScientistCap(state.educationLevel)}
          </span>
          <span className="law-tree__bank-rate is-cost">
            −{scientists * SCIENTIST_SALARY} {CURRENCY_SYMBOL}/d
          </span>
        </span>
      </div>

      <TreeTabs
        label="Research areas"
        tabs={RESEARCH_CATEGORIES.map((c) => areaTab(state, c))}
        active={area}
        onSelect={(key) => {
          setArea(key as ResearchCategory);
          setSelectedId(null);
        }}
      />

      <TreeColumns
        categories={CATEGORIES.filter((c) => c.key === area)}
        nodesFor={nodesFor}
        getStatus={(node) => getResearchNodeStatus(state, node)}
        getProgress={(node) => getResearchProgressRatio(state, node)}
        renderColumnExtra={(key) => (
          <AreaHeader state={state} category={key as ResearchCategory} dispatch={dispatch} onSelectNode={setSelectedId} />
        )}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
      />

      {selectedNode && (
        <div ref={inspectorRef}>
          <ResearchInspector
            node={selectedNode}
            state={state}
            status={getResearchNodeStatus(state, selectedNode)}
            onFocus={() => dispatch((s) => focusResearch(s, selectedNode.id))}
            onStop={() => dispatch((s) => clearResearchFocus(s, selectedNode.category))}
          />
        </div>
      )}
    </div>
  );
}
