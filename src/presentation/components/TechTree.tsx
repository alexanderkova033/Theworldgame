// The parts the Laws and Research trees have in common. Both are the same
// interaction — a three-column, four-tier fork tree of icon badges, with an
// inspector underneath the one you picked and a vote to enact it — and used
// to be two near-identical 370-line files. Everything shape-related lives
// here; each panel keeps only its own domain wiring (statuses, costs, gates)
// and hands the rest over.
//
// Styling for all of it is LawsPanel.css, which both panels import.
import type { CSSProperties, ReactNode } from "react";
import { BuildingGlyph, FlameIcon, SnowflakeIcon } from "./CauseIcon";
import { NavIcon } from "./NavIcon";
import { WrenchIcon } from "./RepairsPanel";
import { StatIcon, type StatIconType } from "./StatIcon";
import type { Synergy } from "../../domain/synergy/synergyData";

export const TIERS = [1, 2, 3, 4] as const;

// Both trees carry the same status vocabulary; Research simply never
// produces "locked-quota" (it has no country-condition gate).
export type TreeNodeStatus =
  | "enacted"
  | "in-progress"
  | "available"
  | "foreclosed"
  | "locked-prerequisite"
  | "locked-cross"
  | "locked-quota";

// The subset of a LawNode/ResearchNode this file actually needs to draw one.
export interface TreeNode {
  id: string;
  tier: number;
  name: string;
  icon: string; // a StatIconType name — domain/ deliberately doesn't import presentation/
}

// LawEffects and ResearchEffects are structurally identical; this is that
// shared shape, so the icon derivation below serves both.
export interface TreeEffects {
  incomeMultiplier?: number;
  industryMultiplier?: number;
  housingCapacityMultiplier?: number;
  heatingMultiplier?: number;
  farmJobsMultiplier?: number;
  factoryJobsMultiplier?: number;
  winterFarmMultiplier?: number;
  breakdownMultiplier?: number;
  repairCostMultiplier?: number;
  buyPriceMultiplier?: number;
  politicalPowerMultiplier?: number;
  pressureMultiplier?: number;
  treasuryDelta?: number;
  foodDelta?: number;
  stabilityDelta?: number;
  populationDelta?: number;
  popularityDelta?: number;
}

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

// Legs are spread evenly between 22%/78%, so a 2-way fork looks exactly as
// it did before this stopped assuming there were only ever two.
function TierConnector({ legCount }: { legCount: number }) {
  const legPositions = legCount === 1 ? [50] : Array.from({ length: legCount }, (_, i) => 22 + i * (56 / (legCount - 1)));
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

// `progress` (0..1) only matters for an in-progress node — it fills the
// ring drawn around its badge, so how far along it is reads straight off the
// tree without opening the inspector.
function NodeBadge({
  node,
  status,
  progress,
  isSelected,
  onSelect,
}: {
  node: TreeNode;
  status: TreeNodeStatus;
  progress: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isLocked = status.startsWith("locked-");
  return (
    <button
      type="button"
      className={`law-node law-node--${status} ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
      title={node.name}
    >
      <span className="law-node__icon" style={{ "--progress": `${Math.round(progress * 100)}%` } as CSSProperties}>
        <StatIcon type={node.icon as StatIconType} size={26} />
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
      <span className="law-node__name">{node.name}</span>
    </button>
  );
}

interface TreeColumnsProps<N extends TreeNode> {
  categories: Array<{ key: string; label: string; icon: StatIconType }>;
  nodesFor: (categoryKey: string, tier: number) => N[];
  getStatus: (node: N) => TreeNodeStatus;
  getProgress: (node: N) => number; // 0..1 — fills the ring on an in-progress node
  renderColumnExtra?: (categoryKey: string) => ReactNode; // shown under each column's title
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
}

// The tree proper: one column per category, one row per tier, forks drawn
// between them.
export interface TreeTab {
  key: string;
  label: string;
  icon: StatIconType;
  badge?: ReactNode; // a short status: progress, a count, a mark
  alert?: boolean; // needs attention — drawn with a "!" as well as colour
  hint?: string; // tooltip
}

// HOI4-style branch tabs above a tree: one branch at a time, each tab
// carrying a glance of how that branch stands.
export function TreeTabs({ tabs, active, onSelect, label }: { tabs: TreeTab[]; active: string; onSelect: (key: string) => void; label: string }) {
  return (
    <div className="tree-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={`tree-tab ${tab.key === active ? "is-active" : ""} ${tab.alert ? "is-alert" : ""}`}
          title={tab.hint}
          onClick={() => onSelect(tab.key)}
        >
          <StatIcon type={tab.icon} size={22} />
          <span className="tree-tab__label">{tab.label}</span>
          {tab.alert && (
            <span className="tree-tab__alert" aria-label="Needs attention">
              !
            </span>
          )}
          {tab.badge !== undefined && <span className="tree-tab__badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function TreeColumns<N extends TreeNode>({
  categories,
  nodesFor,
  getStatus,
  getProgress,
  renderColumnExtra,
  selectedId,
  onSelect,
}: TreeColumnsProps<N>) {
  return (
    <div className={`law-tree__columns ${categories.length === 1 ? "law-tree__columns--single" : ""}`}>
      {categories.map((category) => (
        <div className="law-tree__column" key={category.key}>
          <h3 className="law-tree__column-title">
            <StatIcon type={category.icon} size={20} />
            {category.label}
          </h3>
          {renderColumnExtra?.(category.key)}

          {TIERS.map((tier, tierIndex) => {
            const nodes = nodesFor(category.key, tier);
            if (nodes.length === 0) return null;
            return (
              <div className="law-tree__tier" key={tier}>
                {tierIndex > 0 && <TierConnector legCount={nodes.length} />}
                <div className={`law-tree__row ${nodes.length > 1 ? "law-tree__row--fork" : ""}`}>
                  {nodes.map((node) => (
                    <NodeBadge
                      key={node.id}
                      node={node}
                      status={getStatus(node)}
                      progress={getProgress(node)}
                      isSelected={selectedId === node.id}
                      onSelect={() => onSelect(node.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// What an effect is drawn as: a stat, or the building/thing it changes.
type EffectIconKey = StatIconType | "farm" | "factory" | "heat" | "winter" | "repairs" | "trade" | "neighbours";

// A multiplier where less is better (fewer workers, less coal, cheaper),
// flipped so "above 1" always means "helps".
function flipped(multiplier: number | undefined): number {
  return multiplier !== undefined ? 2 - multiplier : NaN;
}

// Turns a node's numeric effects into the glyphs they touch, split into
// the ones it helps and the ones it costs — so the benefit/cost lines carry
// matching icons instead of being two undifferentiated runs of prose.
function effectIcons(effects: TreeEffects, wantPositive: boolean): EffectIconKey[] {
  const entries: Array<[EffectIconKey, number, number]> = [
    ["industry", effects.industryMultiplier ?? NaN, 1],
    ["treasury", effects.incomeMultiplier ?? NaN, 1],
    ["population", effects.housingCapacityMultiplier ?? NaN, 1],
    ["heat", flipped(effects.heatingMultiplier), 1],
    ["farm", flipped(effects.farmJobsMultiplier), 1],
    ["factory", flipped(effects.factoryJobsMultiplier), 1],
    ["winter", effects.winterFarmMultiplier ?? NaN, 1],
    ["repairs", flipped(effects.breakdownMultiplier), 1],
    ["repairs", flipped(effects.repairCostMultiplier), 1],
    ["trade", flipped(effects.buyPriceMultiplier), 1],
    ["politicalPower", effects.politicalPowerMultiplier ?? NaN, 1],
    ["neighbours", effects.pressureMultiplier ?? NaN, 1],
    ["treasury", effects.treasuryDelta ?? NaN, 0],
    ["food", effects.foodDelta ?? NaN, 0],
    ["stability", effects.stabilityDelta ?? NaN, 0],
    ["population", effects.populationDelta ?? NaN, 0],
    ["popularity", effects.popularityDelta ?? NaN, 0],
  ];
  const icons = entries.filter(([, value, neutral]) => !Number.isNaN(value) && value >= neutral === wantPositive).map(([icon]) => icon);
  return icons.filter((icon, i) => icons.indexOf(icon) === i);
}

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
    case "trade":
      return <NavIcon type="trade" size={15} />;
    case "neighbours":
      return <NavIcon type="ventures" size={15} />;
    default:
      return <StatIcon type={icon} size={15} />;
  }
}

function EffectIcons({ icons }: { icons: EffectIconKey[] }) {
  if (icons.length === 0) return null;
  return (
    <span className="law-effect-icons">
      {icons.map((icon) => (
        <EffectIcon icon={icon} key={icon} />
      ))}
    </span>
  );
}

// Name, description, and the benefit/cost pair — the top of every inspector,
// identical in both trees.
export function InspectorHeader({
  node,
  description,
  benefit,
  cost,
  effects,
}: {
  node: TreeNode;
  description: string;
  benefit: string;
  cost: string;
  effects: TreeEffects;
}) {
  return (
    <>
      <div className="law-inspector__header">
        <div className="law-inspector__icon">
          <StatIcon type={node.icon as StatIconType} size={30} />
        </div>
        <div className="law-inspector__heading">
          <h4 className="law-inspector__name">{node.name}</h4>
          <p className="law-inspector__description">{description}</p>
        </div>
      </div>

      <div className="law-inspector__effects">
        <span className="law-inspector__benefit">
          <EffectIcons icons={effectIcons(effects, true)} />
          {benefit}
        </span>
        <span className="law-inspector__cost">
          <EffectIcons icons={effectIcons(effects, false)} />
          {cost}
        </span>
      </div>
    </>
  );
}

// "+5% industry, +5% income" from a synergy's multiplier-only effects.
function formatSynergyEffect(effects: Synergy["effects"]): string {
  const parts: string[] = [];
  if (effects.industryMultiplier) parts.push(`+${Math.round((effects.industryMultiplier - 1) * 100)}% industry`);
  if (effects.incomeMultiplier) parts.push(`+${Math.round((effects.incomeMultiplier - 1) * 100)}% income`);
  return parts.join(", ");
}

// The other half of a Law+Research pair, and what enacting both is worth.
export function SynergyLine({ synergy, partnerName, isActive }: { synergy: Synergy; partnerName: string; isActive: boolean }) {
  return (
    <p className={`law-inspector__synergy ${isActive ? "is-active" : ""}`}>
      <StatIcon type="industry" size={14} />
      {isActive ? "Paired with " : "Pair with "}
      <strong>{partnerName}</strong> — {formatSynergyEffect(synergy.effects)}
      {isActive ? " active." : "."}
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
        {passChance}%
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
      <span className="law-tree__bank-value">{Math.floor(value)}</span>
      <span className="law-tree__bank-rate">+{rate.toFixed(1)}/d</span>
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
      <StatIcon type={node.icon as StatIconType} size={20} />
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
