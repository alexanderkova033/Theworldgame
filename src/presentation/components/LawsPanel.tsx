import "./LawsPanel.css";
import { useState, type CSSProperties } from "react";
import { enactLaw } from "../../application/actions";
import type { AdvisorAlert } from "../../application/getAdvisorOutlook";
import { getHelpedAlerts, getHelpedAlertsByAny } from "../../application/getTreeHints";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import type { GameState } from "../../domain/country/types";
import { LAW_NODES, LAW_PATHS } from "../../domain/laws/lawData";
import {
  canAffordLawEnactCost,
  getEffectivePassChance,
  getLawDays,
  getLawNode,
  getLawNodeStatus,
  getOwnStance,
  getRivalStance,
  getQuotaProgress,
} from "../../domain/laws/lawsRules";
import type { LawCategory, LawNode, QuotaStat } from "../../domain/laws/types";
import { getParty, getRivalParty } from "../../domain/parties/partyRules";
import type { PartyStance } from "../../domain/parties/rivalRules";
import type { TreePath } from "../../domain/policy/modifiers";
import { chosenIds, closedBy, getLockouts, isOpenToParty } from "../../domain/policy/treeRules";
import { getDailyPoliticalPower } from "../../domain/politics/politicsRules";
import { getResearchNode } from "../../domain/research/researchRules";
import { getSynergiesForLaw } from "../../domain/synergy/synergyRules";
import { playGavel } from "../audio/sound";
import { pickDefaultNode } from "../pickDefaultNode";
import { formatCompact } from "../formatNumber";
import { CostChips, DaysChip, ResourceChip, StatChip, TreasuryChip } from "./CostChips";
import { StatIcon } from "./StatIcon";
import { HourglassIcon } from "./CauseIcon";
import { SubTabs } from "./SubTabs";
import { InspectorHeader, Lockouts, PathInspector, StatusLine, SynergyLine, TreeBank, TreeColumns, VoteRow, WorkInProgress, type TreeNodeStatus } from "./TechTree";

interface LawsPanelProps {
  state: GameState;
  alerts: AdvisorAlert[]; // what the advisor is warning about: laws that would help are marked
  dispatch: (action: (state: GameState) => GameState) => void;
}

// What one way down a path costs, root excluded: every row from II to VII,
// taking the first branch of the fork (both ways cost the same by row).
function PathCost({ nodes }: { nodes: LawNode[] }) {
  const route = [2, 3, 4, 5, 6, 7].map((tier) => nodes.find((n) => n.tier === tier && !n.ideology)).filter((n): n is LawNode => !!n);
  const sum = (pick: (n: LawNode) => number) => route.reduce((total, n) => total + pick(n), 0);
  return (
    <div className="law-inspector__enact-cost">
      <span className="law-inspector__enact-cost-label">The whole way</span>
      <CostChips>
        <StatChip type="politicalPower" amount={sum((n) => n.enactCost.politicalPower)} />
        <TreasuryChip amount={formatCompact(sum((n) => n.enactCost.treasury))} />
        <DaysChip days={sum(getLawDays)} />
      </CostChips>
    </div>
  );
}


const CATEGORIES = [
  { key: "labor", label: "Labour", icon: "industry" as const },
  { key: "sustenance", label: "Food", icon: "food" as const },
  { key: "order", label: "Order", icon: "stability" as const },
  { key: "revenue", label: "Revenue", icon: "treasury" as const },
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

// Where a law stands, in the few words that fit under its name on the tree.
function lawStatusLabel(state: GameState, node: LawNode, status: TreeNodeStatus): string {
  switch (status) {
    case "enacted":
      return "In force";
    case "in-progress":
      return state.activeLaw ? `Passing, ${state.activeLaw.daysRemaining}d` : "Passing";
    case "available":
      return canAffordLawEnactCost(state, node.enactCost) ? "Ready to vote" : "Can't afford yet";
    case "foreclosed":
      return "Closed off";
    case "locked-prerequisite":
      return "Needs law above";
    case "locked-party":
      return "Another party's";
    case "locked-cross":
      return "Needs research";
    case "locked-quota":
      return `Needs ${QUOTA_LABELS[node.quota.stat].toLowerCase()} ${node.quota.stat === "stability" || node.quota.stat === "popularity" ? Math.round(node.quota.threshold) : formatCompact(node.quota.threshold)}`;
  }
}

// A law tied to another party's ideology isn't shown at all: it would
// never be yours to propose.
function nodesFor(state: GameState) {
  return (category: string): LawNode[] => LAW_NODES.filter((n) => n.category === (category as LawCategory) && getLawNodeStatus(state, n) !== "locked-party");
}

function pathsFor(category: string): TreePath[] {
  return LAW_PATHS.filter((p) => p.category === category);
}

function nameOf(id: string): { name: string; elsewhere?: string } {
  const law = getLawNode(id);
  if (law) return { name: law.name };
  return { name: getResearchNode(id)?.name ?? id, elsewhere: "Research" };
}

// Why a law is closed off, naming what closed it.
function closedReason(state: GameState, node: LawNode): string {
  const why = closedBy(node.id, chosenIds(state));
  if (!why) return "Closed off.";
  // A law in a lane you didn't take: the path is the real reason.
  const taken = LAW_NODES.find((n) => n.category === node.category && n.tier === 2 && state.enactedLawIds.includes(n.id));
  const takenPath = taken && LAW_PATHS.find((p) => p.key === taken.path);
  if (takenPath && node.path && taken.path !== node.path) return `Closed off: you took the ${takenPath.name} path.`;
  const by = nameOf(why.by);
  if (why.reason === "sibling") return `Closed off: ${by.name} was passed instead.`;
  if (why.reason === "excluded") return `Closed off by ${by.name}${by.elsewhere ? ` (${by.elsewhere})` : ""}.`;
  return "Closed off: the law that leads here was passed over.";
}

function stanceText(stance: PartyStance): string {
  return stance === "supports" ? "backs this" : "opposes this";
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
  const party = getParty(state.partyId);
  const rival = getRivalParty(state.partyId);
  const ownStance = getOwnStance(state, node);
  const rivalStance = getRivalStance(state, node);
  const crossNodeName = node.crossRequirement ? getResearchNode(node.crossRequirement.nodeId)?.name : undefined;
  const parents = (node.requires ?? []).map((id) => getLawNode(id)?.name ?? id);
  const open = status !== "enacted" && status !== "foreclosed" && status !== "in-progress";
  const lockouts = open
    ? getLockouts(node.id, chosenIds(state))
        .filter((n) => isOpenToParty(n, party.ideology))
        .map((n) => nameOf(n.id))
    : [];

  return (
    <div className="law-inspector">
      <InspectorHeader node={node} description={node.description} effects={node.effects} />

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

      {/* Where both parties stand: your own benches vote with their beliefs. */}
      {open && (ownStance !== "neutral" || rivalStance !== "neutral") && (
        <div className="party-stances">
          {ownStance !== "neutral" && (
            <p className={`party-stance is-${ownStance}`} style={{ "--party-color": party.color } as CSSProperties}>
              <span className="party-stance__swatch" />
              {node.ideology ? `Only the ${party.name} would ever propose this.` : `Your party ${stanceText(ownStance)}.`}
            </p>
          )}
          {rivalStance !== "neutral" && (
            <p className={`party-stance is-${rivalStance}`} style={{ "--party-color": rival.color } as CSSProperties}>
              <span className="party-stance__swatch is-rival" />
              {rival.name} {stanceText(rivalStance)}.
            </p>
          )}
        </div>
      )}

      {open && <Lockouts names={lockouts} />}

      {status === "enacted" && <StatusLine status="enacted">In force.</StatusLine>}
      {status === "in-progress" && state.activeLaw && (
        <StatusLine status="in-progress">Passed. In force in {state.activeLaw.daysRemaining} days.</StatusLine>
      )}
      {status === "foreclosed" && <StatusLine status="foreclosed">{closedReason(state, node)}</StatusLine>}
      {status === "locked-prerequisite" && (
        <StatusLine status="locked">Needs {parents.length > 1 ? `${parents.slice(0, -1).join(", ")} or ${parents[parents.length - 1]}` : parents[0] ?? "the law above"} first.</StatusLine>
      )}
      {status === "locked-cross" && <StatusLine status="locked">Needs {crossNodeName ?? "a technology"} (Research).</StatusLine>}

      {status === "locked-quota" && (
        <div className="law-inspector__quota">
          <StatusLine status="locked">
            Unlocks when {QUOTA_LABELS[node.quota.stat].toLowerCase()} reaches {formatQuotaValue(node.quota.stat, node.quota.threshold)}.
          </StatusLine>
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
            playGavel();
            onConfirm();
          }}
        />
      )}
    </div>
  );
}

export function LawsPanel({ state, alerts, dispatch }: LawsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPathKey, setSelectedPathKey] = useState<string | null>(null);
  const [armedId, setArmedId] = useState<string | null>(null);
  // One category at a time; opens on the one whose law is being drafted,
  // else one with a law ready to vote on, else the first.
  const [category, setCategory] = useState<LawCategory>(
    () =>
      (state.activeLaw ? getLawNode(state.activeLaw.nodeId)?.category : undefined) ??
      LAW_NODES.find((n) => getLawNodeStatus(state, n) === "available" && canAffordLawEnactCost(state, n.enactCost))?.category ??
      "labor",
  );

  const statusOf = (node: LawNode) => getLawNodeStatus(state, node);
  const visible = (n: LawNode) => statusOf(n) !== "locked-party";
  // Only what can be chosen now is marked: a hint on a law three rows down
  // would just be noise.
  const hintFor = (node: LawNode) => (statusOf(node) === "available" ? getHelpedAlerts(node.effects, alerts)[0] : undefined);
  const pathNodes = (key: string) => LAW_NODES.filter((n) => n.path === key && visible(n));
  const pathHints = (key: string) => getHelpedAlertsByAny(pathNodes(key).filter((n) => statusOf(n) !== "foreclosed").map((n) => n.effects), alerts);
  const shownPath = selectedPathKey ? LAW_PATHS.find((p) => p.key === selectedPathKey && p.category === category) : undefined;
  const selectNode = (id: string) => {
    setSelectedPathKey(null);
    setSelectedId(id);
  };
  const activeNode = state.activeLaw ? (LAW_NODES.find((n) => n.id === state.activeLaw?.nodeId) ?? null) : null;
  // The details pane is never empty: until the player picks, it shows the
  // law most worth looking at in this branch.
  const shownNode =
    (selectedId ? LAW_NODES.find((n) => n.id === selectedId && n.category === category) : undefined) ??
    pickDefaultNode(
      LAW_NODES.filter((n) => n.category === category && statusOf(n) !== "locked-party"),
      statusOf,
    ) ??
    null;

  return (
    <div className="law-tree">
      <div className="law-tree__header">
        <TreeBank icon="politicalPower" label="Political power" value={state.stats.politicalPower} rate={getDailyPoliticalPower(state)} />
        {activeNode && state.activeLaw && (
          <WorkInProgress
            node={activeNode}
            daysRemaining={state.activeLaw.daysRemaining}
            totalDays={state.activeLaw.totalDays}
            onSelect={() => {
              setCategory(activeNode.category);
              selectNode(activeNode.id);
            }}
          />
        )}
      </div>
      <p className="note law-tree__guide">
        Each branch splits into three paths. The first law you pass on one closes the other two for good, and only one law per row can
        pass. Proposing a law spends political power and money, then parliament votes.
      </p>

      <SubTabs
        label="Law categories"
        tabs={CATEGORIES.map((c) => {
          const nodes = LAW_NODES.filter((n) => n.category === c.key && statusOf(n) !== "locked-party");
          const tiers = new Set(nodes.map((n) => n.tier)).size;
          const done = nodes.filter((n) => state.enactedLawIds.includes(n.id)).length;
          const drafting = state.activeLaw ? getLawNode(state.activeLaw.nodeId) : undefined;
          const isDrafting = drafting?.category === c.key;
          const ready = nodes.some((n) => statusOf(n) === "available" && canAffordLawEnactCost(state, n.enactCost));
          return {
            key: c.key,
            label: c.label,
            icon: <StatIcon type={c.icon} size={22} />,
            alert: ready && !state.activeLaw,
            badge: isDrafting ? (
              <span className="tree-badge-drafting">
                <HourglassIcon size={13} />
                {done}/{tiers}
              </span>
            ) : (
              `${done}/${tiers}`
            ),
            hint: isDrafting
              ? `${drafting!.name} is being drafted. ${done} of ${tiers} rows passed`
              : ready
                ? `A law here is ready to vote. ${done} of ${tiers} rows passed`
                : `${done} of ${tiers} rows passed`,
          };
        })}
        active={category}
        onSelect={(key) => {
          setCategory(key as LawCategory);
          setSelectedId(null);
          setSelectedPathKey(null);
        }}
      />

      <div className="law-tree__body">
        <TreeColumns
          categories={CATEGORIES.filter((c) => c.key === category)}
          nodesFor={nodesFor(state)}
          pathsFor={pathsFor}
          getStatus={statusOf}
          getStatusLabel={(node) => lawStatusLabel(state, node, statusOf(node))}
          getProgress={(node) =>
            state.activeLaw?.nodeId === node.id ? 1 - state.activeLaw.daysRemaining / state.activeLaw.totalDays : 0
          }
          getHint={hintFor}
          getPathHint={(path) => pathHints(path.key)[0]}
          selectedId={shownPath ? null : (shownNode?.id ?? null)}
          selectedPathKey={shownPath?.key ?? null}
          onSelect={selectNode}
          onSelectPath={setSelectedPathKey}
        />

        {shownPath && (
          <aside className="law-tree__details" aria-label={`${shownPath.name} path`}>
            <PathInspector
              path={shownPath}
              nodes={pathNodes(shownPath.key)}
              getStatus={statusOf}
              getEffects={(node) => node.effects}
              noun="law"
              hints={pathHints(shownPath.key)}
              cost={<PathCost nodes={pathNodes(shownPath.key)} />}
              onSelectNode={selectNode}
            />
          </aside>
        )}

        {!shownPath && shownNode && (
          <aside className="law-tree__details" aria-label={`${shownNode.name} details`}>
            <LawInspector
              node={shownNode}
              state={state}
              status={statusOf(shownNode)}
              isArmed={armedId === shownNode.id}
              onArm={() => setArmedId(shownNode.id)}
              onConfirm={() => {
                dispatch((s) => enactLaw(s, shownNode.id));
                setArmedId(null);
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
