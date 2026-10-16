// The Research tree shares LawsPanel's stylesheet and every piece of its
// shape (see TechTree.tsx) — what differs is how it moves. There's no vote
// and no price: each column is a research area with its own daily rate
// (its buildings + its scientists), and you only choose which node it
// works toward. The column headers carry that rate, the scientists hired
// into the area, and how far along its current direction is.
import "./LawsPanel.css";
import "./ResearchPanel.css";
import { useState } from "react";
import { clearResearchFocus, focusResearch } from "../../application/actions";
import type { AdvisorAlert } from "../../application/getAdvisorOutlook";
import { getHelpedAlerts, getHelpedAlertsByAny } from "../../application/getTreeHints";
import { CURRENCY_SYMBOL, SCIENTIST_SALARY } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { getLawNode } from "../../domain/laws/lawsRules";
import { getParty } from "../../domain/parties/partyRules";
import type { TreePath } from "../../domain/policy/modifiers";
import { chosenIds, closedBy, getLockouts, isOpenToParty } from "../../domain/policy/treeRules";
import { RESEARCH_NODES, RESEARCH_PATHS } from "../../domain/research/researchData";
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
import { getPairHeld, getSynergiesForResearch } from "../../domain/synergy/synergyRules";
import { getScientistCap, getTotalScientists, RESEARCH_CATEGORIES } from "../../domain/workforce/workforceRules";
import { playQuill } from "../audio/sound";
import { pickDefaultNode } from "../pickDefaultNode";
import { revealTreeDetails } from "../revealTreeDetails";
import { CostChips, StatChip } from "./CostChips";
import { StatIcon } from "./StatIcon";
import { SubTabs, type SubTab } from "./SubTabs";
import { pairMarks } from "../treeMarks";
import { InspectorHeader, Lockouts, PathInspector, StatusLine, SynergyLine, TreeColumns, type TreeNodeStatus } from "./TechTree";
import { AREA_LABELS } from "../researchAreas";
import { ScientistStepper } from "./WorkforcePanel";
import { formatAmount, formatRate, formatSigned } from "../formatNumber";

type Dispatch = (action: (state: GameState) => GameState) => void;

interface ResearchPanelProps {
  state: GameState;
  alerts: AdvisorAlert[]; // what the advisor is warning about: technologies that would help are marked
  dispatch: Dispatch;
}

// The work one way down a path takes, root excluded (both ways through
// the fork cost the same), and how long that is at the area's rate today.
function PathCost({ state, nodes }: { state: GameState; nodes: ResearchNode[] }) {
  const route = [2, 3, 4, 5, 6, 7].map((tier) => nodes.find((n) => n.tier === tier)).filter((n): n is ResearchNode => !!n);
  const work = route.reduce((total, n) => total + getResearchCost(n) - (state.researchProgress[n.id] ?? 0), 0);
  const rate = route[0] ? getResearchRateBreakdown(state, route[0].category).total : 0;
  return (
    <div className="law-inspector__enact-cost">
      <span className="law-inspector__enact-cost-label">The whole way</span>
      <CostChips>
        <StatChip type="research" amount={Math.round(work)} />
      </CostChips>
      <span className="note">{rate > 0 ? `about ${formatAmount(Math.ceil(work / rate))} days at today's rate` : "no progress at today's rate"}</span>
    </div>
  );
}

// Every research area, Housing included — taken from the domain list so a
// new area can't be left off the tree again.
const CATEGORIES = RESEARCH_CATEGORIES.map((key) => ({
  key,
  label: AREA_LABELS[key],
}));

// Where a technology stands, in the few words that fit under its name.
function researchStatusLabel(state: GameState, node: ResearchNode, status: TreeNodeStatus): string {
  switch (status) {
    case "enacted":
      return "Done";
    case "in-progress":
      return `Researching, ${Math.round(getResearchProgressRatio(state, node) * 100)}%`;
    case "available":
      return getResearchProgressRatio(state, node) > 0 ? `Paused at ${Math.round(getResearchProgressRatio(state, node) * 100)}%` : "Ready to research";
    case "foreclosed":
      return "Closed off";
    case "locked-prerequisite":
      return "Needs one above";
    case "locked-cross":
      return "Needs a law";
    case "locked-quota":
    case "locked-party":
      return "Locked";
  }
}

function nodesFor(category: string): ResearchNode[] {
  return RESEARCH_NODES.filter((n) => n.category === (category as ResearchCategory));
}

function pathsFor(category: string): TreePath[] {
  return RESEARCH_PATHS.filter((p) => p.category === category);
}

function nameOf(id: string): { name: string; elsewhere?: string } {
  const tech = getResearchNode(id);
  if (tech) return { name: tech.name };
  return { name: getLawNode(id)?.name ?? id, elsewhere: "Laws" };
}

// Why a technology is closed off, naming what closed it.
function closedReason(state: GameState, node: ResearchNode): string {
  const why = closedBy(node.id, chosenIds(state));
  if (!why) return "Closed off.";
  // A technology in a lane you didn't take: the path is the real reason.
  const taken = RESEARCH_NODES.find((n) => n.category === node.category && n.tier === 2 && state.enactedResearchIds.includes(n.id));
  const takenPath = taken && RESEARCH_PATHS.find((p) => p.key === taken.path);
  if (takenPath && node.path && taken.path !== node.path) return `Closed off: you took the ${takenPath.name} path.`;
  const by = nameOf(why.by);
  if (why.reason === "sibling") return `Closed off: ${by.name} was developed instead.`;
  if (why.reason === "excluded") return `Closed off by ${by.name}${by.elsewhere ? ` (${by.elsewhere})` : ""}.`;
  return "Closed off: the research that leads here was passed over.";
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
          <StatIcon type="research" size={16} />{formatRate(rate.total, true)}
        </span>
        <ScientistStepper state={state} category={category} dispatch={dispatch} />
      </div>
      {focusNode ? (
        <button type="button" className="research-area__focus" onClick={() => onSelectNode(focusNode.id)} title={`${focusNode.name}: ${Math.round(ratio * 100)}%`}>
          <span className="research-area__bar">
            <span className="research-area__fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </span>
          <span className="research-area__days">{daysLeft === null ? "stalled" : `${daysLeft}d`}</span>
        </button>
      ) : (
        <span className="research-area__idle" title="This area's research is going nowhere. Pick a step below.">
          Idle: pick a direction
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
  const parents = (node.requires ?? []).map((id) => getResearchNode(id)?.name ?? id);
  const open = status !== "enacted" && status !== "foreclosed";
  const lockouts = open
    ? getLockouts(node.id, chosenIds(state))
        .filter((n) => isOpenToParty(n, getParty(state.partyId).ideology))
        .map((n) => nameOf(n.id))
    : [];

  return (
    <div className="law-inspector">
      <InspectorHeader node={node} description={node.description} effects={node.effects} />

      {status !== "enacted" && (
        <div className="law-inspector__enact-cost">
          <span className="law-inspector__enact-cost-label">Work needed</span>
          <CostChips>
            <StatChip type="research" amount={getResearchCost(node)} />
          </CostChips>
          {daysLeft !== null && <span className="research-inspector__eta">about {daysLeft} days at today's rate</span>}
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
          held={getPairHeld(synergy, state.enactedLawIds, state.enactedResearchIds)}
        />
      ))}

      {open && <Lockouts names={lockouts} />}

      {status === "enacted" && (
        <StatusLine status="enacted">Done: {getResearchOutcomeFlavor(state.researchOutcomes[node.id]) ?? "as projected"}.</StatusLine>
      )}
      {status === "foreclosed" && <StatusLine status="foreclosed">{closedReason(state, node)}</StatusLine>}
      {status === "locked-prerequisite" && (
        <StatusLine status="locked">Needs {parents.length > 1 ? `${parents.slice(0, -1).join(", ")} or ${parents[parents.length - 1]}` : parents[0] ?? "the step above"} first.</StatusLine>
      )}
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
              playQuill();
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
function areaTab(state: GameState, category: ResearchCategory): SubTab {
  const focusId = state.researchFocus[category];
  const focusNode = focusId ? getResearchNode(focusId) : undefined;
  const done = RESEARCH_NODES.filter((n) => n.category === category && state.enactedResearchIds.includes(n.id)).length;
  const total = new Set(RESEARCH_NODES.filter((n) => n.category === category).map((n) => n.tier)).size;
  const idle = !focusNode && RESEARCH_NODES.some((n) => n.category === category && getResearchNodeStatus(state, n) === "available");
  return {
    key: category,
    label: AREA_LABELS[category],
    alert: idle,
    badge: focusNode ? `${Math.round(getResearchProgressRatio(state, focusNode) * 100)}%` : `${done}/${total}`,
    hint: focusNode
      ? `Researching ${focusNode.name}, ${Math.round(getResearchProgressRatio(state, focusNode) * 100)}% done`
      : idle
        ? "Idle: no direction chosen, so no progress"
        : `${done} of ${total} rows done`,
  };
}

export function ResearchPanel({ state, alerts, dispatch }: ResearchPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPathKey, setSelectedPathKey] = useState<string | null>(null);
  // One area at a time; opens on the first one sitting idle, if any.
  const [area, setArea] = useState<ResearchCategory>(
    () => RESEARCH_CATEGORIES.find((c) => areaTab(state, c).alert) ?? RESEARCH_CATEGORIES[0],
  );

  const statusOf = (node: ResearchNode) => getResearchNodeStatus(state, node);
  // Only what can be chosen now is marked: a hint three rows down would
  // just be noise.
  const hintFor = (node: ResearchNode) => (statusOf(node) === "available" ? getHelpedAlerts(node.effects, alerts)[0] : undefined);
  const pathNodes = (key: string) => RESEARCH_NODES.filter((n) => n.path === key);
  const pathHints = (key: string) => getHelpedAlertsByAny(pathNodes(key).filter((n) => statusOf(n) !== "foreclosed").map((n) => n.effects), alerts);
  const shownPath = selectedPathKey ? RESEARCH_PATHS.find((p) => p.key === selectedPathKey && p.category === area) : undefined;
  const selectNode = (id: string) => {
    setSelectedPathKey(null);
    setSelectedId(id);
  };
  // The details pane is never empty: until the player picks, it shows the
  // technology most worth looking at in this area.
  const shownNode =
    (selectedId ? RESEARCH_NODES.find((n) => n.id === selectedId && n.category === area) : undefined) ??
    pickDefaultNode(
      RESEARCH_NODES.filter((n) => n.category === area),
      statusOf,
    ) ??
    null;
  const scientists = getTotalScientists(state.workforce);

  return (
    <div className="law-tree research-tree">
      <div className="law-tree__header">
        <span
          className="law-tree__bank"
          title={`Scientists employed, of how many your schools can train. Each costs ${SCIENTIST_SALARY} ${CURRENCY_SYMBOL}/day.`}
        >
          <StatIcon type="research" size={22} />
          <span className="law-tree__bank-label">Scientists</span>
          <span className="law-tree__bank-value">
            {scientists}/{getScientistCap(state.educationLevel)}
          </span>
          <span className="law-tree__bank-rate is-cost">
            {formatSigned(-scientists * SCIENTIST_SALARY)} {CURRENCY_SYMBOL} a day
          </span>
        </span>
        <span
          className="law-tree__help"
          title="Pick a direction for each area and it moves forward every day, faster with scientists and schools. Each area splits into three paths: the first step on one closes the other two for good. When a step finishes and only one way leads on, work carries on by itself."
        >
          How it works
        </span>
      </div>

      <SubTabs
        label="Research areas"
        tabs={RESEARCH_CATEGORIES.map((c) => areaTab(state, c))}
        active={area}
        onSelect={(key) => {
          setArea(key as ResearchCategory);
          setSelectedId(null);
          setSelectedPathKey(null);
        }}
      />

      <div className="law-tree__body">
        <TreeColumns
          categories={CATEGORIES.filter((c) => c.key === area)}
          numerals="arabic"
          nodesFor={nodesFor}
          pathsFor={pathsFor}
          getStatus={statusOf}
          getStatusLabel={(node) => researchStatusLabel(state, node, statusOf(node))}
          getProgress={(node) => getResearchProgressRatio(state, node)}
          renderColumnExtra={(key) => (
            <AreaHeader state={state} category={key as ResearchCategory} dispatch={dispatch} onSelectNode={selectNode} />
          )}
          getHint={hintFor}
          getPathHint={(path) => pathHints(path.key)[0]}
          getMarks={(node) => ({
            ...pairMarks(state, getSynergiesForResearch(node.id)),
            breakthrough: state.researchOutcomes[node.id] === "breakthrough",
          })}
          selectedId={shownPath ? null : (shownNode?.id ?? null)}
          selectedPathKey={shownPath?.key ?? null}
          onSelect={(id) => {
            selectNode(id);
            revealTreeDetails();
          }}
          onSelectPath={(key) => {
            setSelectedPathKey(key);
            revealTreeDetails();
          }}
        />

        {shownPath && (
          <aside className="law-tree__details" aria-label={`${shownPath.name} path`}>
            <PathInspector
              path={shownPath}
              nodes={pathNodes(shownPath.key)}
              getStatus={statusOf}
              getEffects={(node) => node.effects}
              noun="step"
              hints={pathHints(shownPath.key)}
              cost={<PathCost state={state} nodes={pathNodes(shownPath.key)} />}
              onSelectNode={selectNode}
            />
          </aside>
        )}

        {!shownPath && shownNode && (
          <aside className="law-tree__details" aria-label={`${shownNode.name} details`}>
            <ResearchInspector
              node={shownNode}
              state={state}
              status={statusOf(shownNode)}
              onFocus={() => dispatch((s) => focusResearch(s, shownNode.id))}
              onStop={() => dispatch((s) => clearResearchFocus(s, shownNode.category))}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
