// The parts the Laws and Research trees have in common. Both are the same
// interaction: a branch of icon badges in seven rows, a shared root that
// splits into three lanes (one per path), joined by lines from each node to
// the ones it opens, with the picked node's details beside it.
// Everything shape-related lives here; each panel keeps only its own domain
// wiring (statuses, costs, gates) and hands the rest over.
//
// Each node says where it stands in words under its name ("Ready to vote",
// "Needs food 200k"), and the panels show the picked node's details beside
// the tree rather than under it, so nothing has to be clicked to learn why a
// padlock is there, and nothing opens out of sight.
//
// Styling for all of it is LawsPanel.css, which both panels import.
import "./LawsPanel.css";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { TreeHint } from "../../application/getTreeHints";
import { combineEffects, describeEffects, TREE_TIERS, type EffectKey, type PolicyEffects, type TreePath } from "../../domain/policy/modifiers";
import { AdvisorAlertIcon } from "./AdvisorStrip";
import { BuildingGlyph, FlameIcon, NeighboursIcon, PairIcon, SnowflakeIcon, TaxIcon, WagesIcon } from "./CauseIcon";
import { NavIcon } from "./NavIcon";
import { NodeGlyph } from "./NodeGlyph";
import { WrenchIcon } from "./RepairsPanel";
import { StatIcon, type StatIconType } from "./StatIcon";
import type { Synergy } from "../../domain/synergy/synergyData";
import type { NodeMarks } from "../treeMarks";
import { formatRate } from "../formatNumber";


// Both trees carry the same status vocabulary; Research simply never
// produces "locked-quota" (it has no country-condition gate).
export type TreeNodeStatus =
  | "enacted"
  | "in-progress"
  | "available"
  | "foreclosed"
  | "locked-party"
  | "locked-prerequisite"
  | "locked-cross"
  | "locked-quota";

// The subset of a LawNode/ResearchNode this file actually needs to draw one.
export interface TreeNode {
  id: string;
  tier: number;
  name: string;
  icon: string; // a StatIconType name; domain/ deliberately doesn't import presentation/
  requires?: string[]; // the nodes that open this one: a line is drawn from each
  ideology?: string; // only open to one kind of party: marked on the badge
  path?: string; // the lane it sits in; none = the branch's shared root
  category?: string; // its branch: sets the colour wash on its picture
}

// Both trees' effects share one shape (see domain/policy).
export type TreeEffects = PolicyEffects;

export function CheckBadge() {
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

function HourglassBadge() {
  return (
    <svg viewBox="-10 -10 20 20" width={11} height={11}>
      <path d="M-5,-7 L5,-7 L5,-5.5 L1.2,0 L5,5.5 L5,7 L-5,7 L-5,5.5 L-1.2,0 L-5,-5.5 Z" fill="currentColor" />
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

// `progress` (0..1) only matters for an in-progress node — it fills the
// ring drawn around its badge, so how far along it is reads straight off the
// tree without opening the inspector.
function NodeBadge({
  node,
  status,
  statusLabel,
  progress,
  isSelected,
  hint,
  marks,
  onSelect,
}: {
  node: TreeNode;
  status: TreeNodeStatus;
  statusLabel?: string;
  progress: number;
  isSelected: boolean;
  hint?: TreeHint;
  marks?: NodeMarks;
  onSelect: () => void;
}) {
  const isLocked = status.startsWith("locked-");
  const label = [node.name, statusLabel, marks?.breakthrough && "a breakthrough", hint && `helps with ${hint.text}`, marks?.pair?.title].filter(Boolean).join(": ");
  return (
    <button
      type="button"
      data-node-id={node.id}
      className={`law-node law-node--${status} ${isSelected ? "is-selected" : ""} ${node.ideology ? "is-party" : ""} ${marks?.breakthrough ? "is-breakthrough" : ""}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={label}
    >
      {/* The pair mark sits beside the medallion, not in it, so it stays
          bright while a locked medallion is faded. */}
      <span className="law-node__seat">
        <span className="law-node__icon" style={{ "--progress": `${Math.round(progress * 100)}%` } as CSSProperties}>
          <NodeGlyph id={node.id} category={node.category} icon={node.icon} size={34} />
          {hint && <HintMarker hint={hint} />}
          {status === "enacted" && (
            <span className="law-node__badge law-node__badge--enacted">
              <CheckBadge />
            </span>
          )}
          {status === "in-progress" && (
            <span className="law-node__badge law-node__badge--in-progress">
              <HourglassBadge />
            </span>
          )}
          {status === "foreclosed" && (
            <span className="law-node__badge law-node__badge--foreclosed">
              <XBadge />
            </span>
          )}
          {isLocked && (
            <span className="law-node__badge law-node__badge--locked">
              <LockBadge />
            </span>
          )}
        </span>
        {marks?.pair && (
          <span className={`law-node__pair law-node__pair--${marks.pair.held}`} title={marks.pair.title}>
            <PairIcon size={13} />
          </span>
        )}
      </span>
      <span className="law-node__name">{node.name}</span>
      {node.ideology && <span className="law-node__party">Your party only</span>}
      {statusLabel && <span className="law-node__status">{statusLabel}</span>}
      {/* Work done so far: shown as a bar on research cards (ResearchPanel.css). */}
      {progress > 0 && <span className="law-node__progress" style={{ width: `${Math.round(progress * 100)}%` }} aria-hidden="true" />}
    </button>
  );
}

// A small marker on a node that would help with one of the problems the
// advisor is warning about, in the advisor's own picture for it.
function HintMarker({ hint }: { hint: TreeHint }) {
  return (
    <span className="law-node__hint" title={`Helps with ${hint.text}`}>
      <AdvisorAlertIcon kind={hint.kind} />
    </span>
  );
}

// How a line between two nodes reads: the path already walked, the way
// open next, a way closed off for good, or simply ahead.
type LinkState = "taken" | "open" | "closed" | "ahead";

function linkState(parent: TreeNodeStatus, child: TreeNodeStatus): LinkState {
  if (parent === "foreclosed" || child === "foreclosed") return "closed";
  if (parent === "enacted" && (child === "enacted" || child === "in-progress")) return "taken";
  if (parent === "enacted") return "open";
  return "ahead";
}

interface Link {
  key: string;
  d: string;
  state: LinkState;
}

// Laws number their rows like a statute book's chapters; research counts
// its stages plainly, like a workshop's.
const NUMERALS = { roman: ["", "I", "II", "III", "IV", "V", "VI", "VII"], arabic: ["", "1", "2", "3", "4", "5", "6", "7"] };
export type Numerals = keyof typeof NUMERALS;

// Grid row for a tier: the root on row 1, the path names on row 2, then
// tiers 2 to 7 below them.
function gridRowOf(tier: number): number {
  return tier === 1 ? 1 : tier + 1;
}

// How a whole lane reads: the path you're on, a path closed off for good,
// or still open to choose.
function laneState(head: TreeNodeStatus | undefined): "taken" | "closed" | "open" {
  if (head === "enacted" || head === "in-progress") return "taken";
  if (head === "foreclosed") return "closed";
  return "open";
}

// One branch, as a grid: the shared root across the top, then a lane per
// path under its name, a numbered row per tier, and a line from every node
// to each node it opens. The lines are measured from where the badges
// actually landed, so they follow the layout at any width.
function TreeBranch<N extends TreeNode>({
  nodes,
  paths,
  getStatus,
  getProgress,
  getStatusLabel,
  getHint,
  getPathHint,
  getMarks,
  selectedId,
  selectedPathKey,
  onSelect,
  onSelectPath,
  numerals,
}: {
  nodes: N[];
  paths: TreePath[];
  getStatus: (node: N) => TreeNodeStatus;
  getProgress: (node: N) => number;
  getStatusLabel?: (node: N) => string;
  getHint?: (node: N) => TreeHint | undefined;
  getPathHint?: (path: TreePath) => TreeHint | undefined;
  getMarks?: (node: N) => NodeMarks | undefined;
  selectedId: string | null;
  selectedPathKey: string | null;
  onSelect: (nodeId: string) => void;
  onSelectPath: (pathKey: string) => void;
  numerals: Numerals;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [links, setLinks] = useState<Link[]>([]);
  // Stands in for the nodes and their statuses as the effect's dependency.
  const statusKey = nodes.map((n) => `${n.id}:${getStatus(n)}`).join(",");

  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => {
      const origin = box.getBoundingClientRect();
      // Lines leave from under a node's whole badge (its name and status
      // included) and arrive at the top of the next one's icon.
      const spot = (id: string) => {
        const badge = box.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
        const icon = badge?.querySelector<HTMLElement>(".law-node__icon");
        if (!badge || !icon) return null;
        const b = badge.getBoundingClientRect();
        const i = icon.getBoundingClientRect();
        return { x: i.left + i.width / 2 - origin.left, top: i.top - origin.top, bottom: b.bottom - origin.top };
      };
      // Lines out of the root turn above the path names and drop straight
      // into their own lane, so none of them cuts across another lane's name.
      const headTop = box.querySelector(".law-tree__lane-head")?.getBoundingClientRect().top;
      const elbowY = (fromBottom: number) => (headTop === undefined ? null : (fromBottom + headTop - origin.top) / 2);
      const shown = new Map(nodes.map((n) => [n.id, n]));
      const next: Link[] = [];
      for (const child of nodes) {
        for (const parentId of child.requires ?? []) {
          const parent = shown.get(parentId);
          const from = parent ? spot(parentId) : null;
          const to = spot(child.id);
          if (!parent || !from || !to) continue;
          const bend = parent.tier === 1 ? elbowY(from.bottom) : null;
          const dx = to.x - from.x;
          let d: string;
          if (bend !== null && Math.abs(dx) > 24) {
            const r = 10 * Math.sign(dx);
            d = `M${from.x},${from.bottom} V${bend - 10} Q${from.x},${bend} ${from.x + r},${bend} H${to.x - r} Q${to.x},${bend} ${to.x},${bend + 10} V${to.top - 2}`;
          } else {
            const midY = (from.bottom + to.top) / 2;
            d = `M${from.x},${from.bottom} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.top - 2}`;
          }
          next.push({ key: `${parentId}>${child.id}`, d, state: linkState(getStatus(parent), getStatus(child)) });
        }
      }
      // Closed lines first, so the live ones are drawn over them.
      const order: LinkState[] = ["closed", "ahead", "open", "taken"];
      setLinks(next.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [statusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const badge = (node: N) => (
    <NodeBadge
      key={node.id}
      node={node}
      status={getStatus(node)}
      statusLabel={getStatusLabel?.(node)}
      progress={getProgress(node)}
      isSelected={selectedId === node.id}
      hint={getHint?.(node)}
      marks={getMarks?.(node)}
      onSelect={() => onSelect(node.id)}
    />
  );
  const lanes = paths.map((path, index) => {
    const head = nodes.find((n) => n.path === path.key && n.tier === 2);
    const state = laneState(head && getStatus(head));
    return { path, column: index + 2, state, hint: state === "open" ? getPathHint?.(path) : undefined };
  });

  return (
    <div className="law-tree__branch" ref={ref} style={{ gridTemplateColumns: `1.75rem repeat(${paths.length}, minmax(0, 1fr))` }}>
      {/* The lane bands go first, so the lines are drawn over them. */}
      {lanes.map((lane) => (
        <div key={`band-${lane.path.key}`} className={`law-tree__lane is-${lane.state}`} style={{ gridColumn: lane.column, gridRow: "2 / -1" }} />
      ))}
      <svg className="law-tree__links" aria-hidden="true">
        {links.map((link) => (
          <path key={link.key} d={link.d} className={`law-tree__link is-${link.state}`} />
        ))}
      </svg>
      {TREE_TIERS.map((tier) => (
        <span key={`tier-${tier}`} className="law-tree__tier" style={{ gridRow: gridRowOf(tier) }} aria-hidden="true">
          {NUMERALS[numerals][tier]}
        </span>
      ))}
      <div className="law-tree__cell law-tree__cell--root" style={{ gridColumn: "2 / -1", gridRow: 1 }}>
        {nodes.filter((n) => n.tier === 1).map(badge)}
      </div>
      {lanes.map((lane) => (
        <button
          type="button"
          key={`head-${lane.path.key}`}
          className={`law-tree__lane-head is-${lane.state} ${selectedPathKey === lane.path.key ? "is-selected" : ""}`}
          style={{ gridColumn: lane.column, gridRow: 2 }}
          title={`${lane.path.motto}. Click to see the whole path.`}
          aria-pressed={selectedPathKey === lane.path.key}
          onClick={() => onSelectPath(lane.path.key)}
        >
          {lane.path.name}
          {lane.state === "closed" && <XBadge />}
          {lane.state === "taken" && <CheckBadge />}
          {lane.hint && <HintMarker hint={lane.hint} />}
        </button>
      ))}
      {lanes.flatMap((lane) =>
        TREE_TIERS.filter((tier) => tier > 1).map((tier) => (
          <div key={`${lane.path.key}-${tier}`} className="law-tree__cell" style={{ gridColumn: lane.column, gridRow: gridRowOf(tier) }}>
            {nodes.filter((n) => n.path === lane.path.key && n.tier === tier).map(badge)}
          </div>
        )),
      )}
    </div>
  );
}

interface TreeColumnsProps<N extends TreeNode> {
  categories: Array<{ key: string; label: string }>;
  nodesFor: (categoryKey: string) => N[];
  pathsFor: (categoryKey: string) => TreePath[];
  getStatus: (node: N) => TreeNodeStatus;
  getProgress: (node: N) => number; // 0..1 — fills the ring on an in-progress node
  getStatusLabel?: (node: N) => string; // where it stands, in a few words, under its name
  renderColumnExtra?: (categoryKey: string) => ReactNode; // shown under each column's title
  getHint?: (node: N) => TreeHint | undefined; // a problem it would help with, marked on its badge
  getPathHint?: (path: TreePath) => TreeHint | undefined; // the same, for a whole path, on its name
  getMarks?: (node: N) => NodeMarks | undefined; // a breakthrough, or a pair, drawn on its medallion
  selectedId: string | null;
  selectedPathKey: string | null;
  onSelect: (nodeId: string) => void;
  onSelectPath: (pathKey: string) => void;
  numerals?: Numerals; // how the rows are numbered
}

// The tree proper: one column per category, each split into its paths.
export function TreeColumns<N extends TreeNode>({
  categories,
  nodesFor,
  pathsFor,
  getStatus,
  getProgress,
  getStatusLabel,
  renderColumnExtra,
  getHint,
  getPathHint,
  getMarks,
  selectedId,
  selectedPathKey,
  onSelect,
  onSelectPath,
  numerals = "roman",
}: TreeColumnsProps<N>) {
  return (
    <div className={`law-tree__columns ${categories.length === 1 ? "law-tree__columns--single" : ""}`}>
      {categories.map((category) => (
        <div className="law-tree__column" key={category.key}>
          <h3 className="law-tree__column-title">
            {category.label}
          </h3>
          {renderColumnExtra?.(category.key)}

          <TreeBranch
            nodes={nodesFor(category.key)}
            paths={pathsFor(category.key)}
            getStatus={getStatus}
            getProgress={getProgress}
            getStatusLabel={getStatusLabel}
            getHint={getHint}
            getPathHint={getPathHint}
            getMarks={getMarks}
            selectedId={selectedId}
            selectedPathKey={selectedPathKey}
            onSelect={onSelect}
            onSelectPath={onSelectPath}
            numerals={numerals}
          />
        </div>
      ))}
    </div>
  );
}

// What an effect is drawn as: a stat, or the building/thing it changes.
type EffectIconKey = StatIconType | "farm" | "factory" | "heat" | "winter" | "repairs" | "market" | "neighbours" | "build" | "wages" | "taxes" | "hardship";

const EFFECT_ICONS: Record<EffectKey, EffectIconKey> = {
  incomeMultiplier: "treasury",
  industryMultiplier: "industry",
  housingCapacityMultiplier: "population",
  heatingMultiplier: "heat",
  farmJobsMultiplier: "farm",
  factoryJobsMultiplier: "factory",
  farmYieldMultiplier: "food",
  winterFarmMultiplier: "winter",
  foodConsumptionMultiplier: "food",
  breakdownMultiplier: "repairs",
  repairCostMultiplier: "repairs",
  buildCostMultiplier: "build",
  buyPriceMultiplier: "market",
  wageMultiplier: "wages",
  researchMultiplier: "research",
  politicalPowerMultiplier: "politicalPower",
  pressureMultiplier: "neighbours",
  hardshipMultiplier: "hardship",
  taxTolerance: "taxes",
  supportTarget: "popularity",
  stabilityPerDay: "stability",
  treasuryDelta: "treasury",
  foodDelta: "food",
  stabilityDelta: "stability",
  populationDelta: "population",
  popularityDelta: "popularity",
};

function EffectIcon({ icon }: { icon: EffectIconKey }) {
  switch (icon) {
    case "farm":
    case "factory":
      return <BuildingGlyph type={icon} size={15} />;
    case "heat":
      return <FlameIcon size={15} />;
    case "winter":
      return <SnowflakeIcon size={15} />;
    case "repairs":
      return <WrenchIcon size={14} />;
    case "market":
      return <NavIcon type="market" size={15} />;
    case "wages":
      return <WagesIcon size={15} />;
    case "taxes":
      return <TaxIcon size={15} />;
    case "hardship":
      return <StatIcon type="popularity" size={15} />;
    case "neighbours":
      return <NeighboursIcon size={15} />;
    case "build":
      return <NavIcon type="build" size={15} />;
    default:
      return <StatIcon type={icon} size={15} />;
  }
}

// What a node (or a party's creed) does, as two lists: gains in green,
// costs in red, each line with the icon of what it touches.
export function EffectList({ effects }: { effects: TreeEffects }) {
  const { gains, costs } = describeEffects(effects);
  return (
    <div className="law-inspector__effects">
      {gains.length > 0 && (
        <ul className="law-inspector__benefit">
          {gains.map((line) => (
            <li key={line.key}>
              <EffectIcon icon={EFFECT_ICONS[line.key]} />
              {line.text}
            </li>
          ))}
        </ul>
      )}
      {costs.length > 0 ? (
        <ul className="law-inspector__cost">
          {costs.map((line) => (
            <li key={line.key}>
              <EffectIcon icon={EFFECT_ICONS[line.key]} />
              {line.text}
            </li>
          ))}
        </ul>
      ) : (
        <span className="law-inspector__no-cost">No drawback</span>
      )}
    </div>
  );
}

// Name, description, and what it does: the top of every inspector.
export function InspectorHeader({ node, description, effects }: { node: TreeNode; description: string; effects: TreeEffects }) {
  return (
    <>
      <div className="law-inspector__header">
        <div className="law-inspector__icon">
          <NodeGlyph id={node.id} category={node.category} icon={node.icon} size={34} />
        </div>
        <div className="law-inspector__heading">
          <h4 className="law-inspector__name">{node.name}</h4>
          <p className="note law-inspector__description">{description}</p>
        </div>
      </div>
      <EffectList effects={effects} />
    </>
  );
}

// A node in the path summary: its picture and name, a button to its details.
function PathStep({ node, onSelect }: { node: TreeNode; onSelect: (id: string) => void }) {
  return (
    <button type="button" className="path-step" onClick={() => onSelect(node.id)}>
      <NodeGlyph id={node.id} category={node.category} icon={node.icon} size={24} />
      <span>{node.name}</span>
    </button>
  );
}

// A whole path at a glance, for the big choice of which one to take: what
// it adds up to (the rows every way down it passes through), the fork in
// its middle, where it ends, what it would help with now, and what it costs.
export function PathInspector<N extends TreeNode>({
  path,
  nodes,
  getStatus,
  getEffects,
  noun,
  hints,
  cost,
  onSelectNode,
}: {
  path: TreePath;
  nodes: N[]; // this path's nodes, as this party sees them
  getStatus: (node: N) => TreeNodeStatus;
  getEffects: (node: N) => TreeEffects;
  noun: "law" | "step";
  hints: TreeHint[];
  cost: ReactNode;
  onSelectNode: (id: string) => void;
}) {
  const at = (tier: number) => nodes.filter((n) => n.tier === tier);
  const head = at(2)[0];
  const state = laneState(head && getStatus(head));
  // The rows every way down the path passes through, ending on its own
  // capstone (a party's capstone is the alternative to it).
  const spine = [...at(2), ...at(3), ...at(6), ...at(7).filter((n) => !n.ideology)];
  const forks = at(4).map((first) => ({ first, second: at(5).find((n) => n.requires?.includes(first.id)) }));
  const capstones = at(7);
  return (
    <div className="law-inspector path-inspector">
      <div className="law-inspector__header">
        <div className="law-inspector__heading">
          <h4 className="law-inspector__name">{path.name}</h4>
          <p className="note law-inspector__description">{path.motto}.</p>
        </div>
      </div>

      {state === "taken" && <StatusLine status="enacted">You're on this path.</StatusLine>}
      {state === "closed" && (
        <StatusLine status="foreclosed">
          {noun === "step" ? "Closed for now: you took another path. A year after that one is finished, this one can be taken up." : "Closed off: you took another path."}
        </StatusLine>
      )}
      {state === "open" && (
        <StatusLine status="locked">
          {noun === "step" ? "Its first step closes the other two paths until this one is finished, and for a year after." : `Its first ${noun} closes the other two paths for good.`}
        </StatusLine>
      )}

      <h5 className="path-inspector__label">All together</h5>
      <EffectList effects={combineEffects(spine.map(getEffects))} />
      <p className="path-inspector__aside">Rows II, III, VI and VII. The fork below adds more.</p>

      <h5 className="path-inspector__label">The fork: pick one way</h5>
      <div className="path-inspector__forks">
        {forks.map(({ first, second }) => (
          <div key={first.id} className="path-inspector__fork">
            <PathStep node={first} onSelect={onSelectNode} />
            {second && (
              <>
                <span className="path-inspector__then">then</span>
                <PathStep node={second} onSelect={onSelectNode} />
              </>
            )}
          </div>
        ))}
      </div>

      <h5 className="path-inspector__label">Where it ends</h5>
      <div className="path-inspector__forks">
        {capstones.map((node) => (
          <div key={node.id} className="path-inspector__fork">
            <PathStep node={node} onSelect={onSelectNode} />
            {node.ideology && <span className="law-node__party">Your party only</span>}
          </div>
        ))}
      </div>

      {hints.length > 0 && (
        <>
          <h5 className="path-inspector__label">Helps with now</h5>
          <ul className="path-inspector__hints">
            {hints.map((hint) => (
              <li key={hint.kind}>
                <AdvisorAlertIcon kind={hint.kind} />
                {hint.text}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="path-inspector__cost">{cost}</div>
    </div>
  );
}

// What choosing this would close off for good, in this tree and the other.
// The whole point of a fork, so it's spelled out before the choice.
export function Lockouts({ names, label = "Closes off for good" }: { names: Array<{ name: string; elsewhere?: string }>; label?: string }) {
  if (names.length === 0) return null;
  const shown = names.slice(0, 6);
  return (
    <div className="law-inspector__lockouts">
      <span className="law-inspector__lockouts-label">
        <XBadge />
        {label}
      </span>
      <ul>
        {shown.map((n) => (
          <li key={n.name}>
            {n.name}
            {n.elsewhere && <span className="law-inspector__elsewhere"> ({n.elsewhere})</span>}
          </li>
        ))}
        {names.length > shown.length && <li>and {names.length - shown.length} more</li>}
      </ul>
    </div>
  );
}

// "factories produce 5% more" from a synergy's effects.
function formatSynergyEffect(effects: Synergy["effects"]): string {
  return describeEffects(effects)
    .gains.map((line) => line.text.charAt(0).toLowerCase() + line.text.slice(1))
    .join(", ");
}

// The other half of a Law+Research pair, and what enacting both is worth.
export function SynergyLine({ synergy, partnerName, held }: { synergy: Synergy; partnerName: string; held: number }) {
  const isActive = held === 2;
  return (
    <p className={`law-inspector__synergy ${isActive ? "is-active" : ""}`}>
      <PairIcon size={14} />
      <span>
        {isActive ? "Paired with " : "Pair with "}
        <strong>{partnerName}</strong>: {formatSynergyEffect(synergy.effects)}.
      </span>
      <span className="law-inspector__synergy-held">{isActive ? "Active" : `${held} of 2`}</span>
    </p>
  );
}

// The pass-chance meter plus the two-step (arm, then confirm) vote button.
// Chance is a bar, not just a percentage: at a glance the fill length says
// "safe / risky / a gamble" without reading the number.
export function VoteRow({
  passChance,
  affordable,
  busy,
  isArmed,
  onArm,
  onConfirm,
}: {
  passChance: number; // 0-100
  affordable: boolean;
  busy: boolean; // something else in this tree is already underway — one at a time
  isArmed: boolean;
  onArm: () => void;
  onConfirm: () => void;
}) {
  const tone = passChance >= 80 ? "is-safe" : passChance >= 50 ? "is-risky" : "is-dangerous";
  return (
    <div className="law-inspector__vote">
      <span className={`law-inspector__chance ${tone}`} title={`${passChance}% chance the vote passes`}>
        <span className="law-inspector__chance-bar">
          <span className="law-inspector__chance-fill" style={{ width: `${passChance}%` }} />
        </span>
        {passChance}% to pass
      </span>
      <button className="btn-primary law-inspector__vote-button" disabled={busy || !affordable} onClick={isArmed ? onConfirm : onArm}>
        {busy ? (
          <>
            <HourglassBadge /> Busy
          </>
        ) : !affordable ? (
          "Can't afford it"
        ) : isArmed ? (
          <>
            <CheckBadge /> Confirm
          </>
        ) : (
          "Propose"
        )}
      </button>
    </div>
  );
}

// A locked/foreclosed/enacted status line, with the padlock or tick that
// matches the badge on the node itself.
export function StatusLine({ status, children }: { status: "enacted" | "in-progress" | "foreclosed" | "locked"; children: ReactNode }) {
  return (
    <p className={`law-inspector__status is-${status}`}>
      {status === "locked" && <LockBadge />}
      {status === "in-progress" && <HourglassBadge />}
      {status === "foreclosed" && <XBadge />}
      {children}
    </p>
  );
}

// The pool a tree spends from, and how fast it refills — research points for
// Research, political power for Laws.
export function TreeBank({ icon, value, rate, label }: { icon: StatIconType; value: number; rate: number; label: string }) {
  return (
    <div className="law-tree__bank" title={`${label}: ${value.toFixed(1)}, +${rate.toFixed(2)} per day`}>
      <StatIcon type={icon} size={22} />
      <span className="law-tree__bank-label">{label}</span>
      <span className="law-tree__bank-value">{Math.floor(value)}</span>
      <span className="law-tree__bank-rate">{formatRate(rate, true)}</span>
    </div>
  );
}

// What's underway right now in this tree, as a progress bar with the days
// left — shown above the tree, and clicking it jumps to that node.
export function WorkInProgress({
  node,
  daysRemaining,
  totalDays,
  onSelect,
}: {
  node: TreeNode;
  daysRemaining: number;
  totalDays: number;
  onSelect: () => void;
}) {
  const ratio = 1 - daysRemaining / totalDays;
  return (
    <button type="button" className="law-tree__work" onClick={onSelect} title={`${node.name}: ${daysRemaining} of ${totalDays} days left`}>
      <NodeGlyph id={node.id} category={node.category} icon={node.icon} size={22} />
      <span className="law-tree__work-name">{node.name}</span>
      <span className="law-tree__work-bar">
        <span className="law-tree__work-fill" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </span>
      <span className="law-tree__work-days">
        <HourglassBadge />
        {daysRemaining}d
      </span>
    </button>
  );
}
