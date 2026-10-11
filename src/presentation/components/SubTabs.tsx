// HOI4-style subtabs inside a tab: one section at a time, each tab carrying
// a glance of how that section stands (a count, a %, a rate) and a "!" when
// something in it needs the player. Used by Research, Laws and Economy.
import "./SubTabs.css";
import type { ReactNode } from "react";

export interface SubTab {
  key: string;
  label: string;
  icon: ReactNode;
  badge?: ReactNode; // a short status: progress, a count, a rate
  alert?: boolean; // needs attention — drawn with a "!" as well as colour
  hint?: string; // tooltip
}

export function SubTabs({ tabs, active, onSelect, label }: { tabs: SubTab[]; active: string; onSelect: (key: string) => void; label: string }) {
  return (
    <div className="sub-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          className={`sub-tab ${tab.key === active ? "is-active" : ""} ${tab.alert ? "is-alert" : ""}`}
          title={tab.hint}
          onClick={() => onSelect(tab.key)}
        >
          {tab.icon}
          <span className="sub-tab__label">{tab.label}</span>
          {tab.alert && (
            <span className="sub-tab__alert" aria-label="Needs attention">
              !
            </span>
          )}
          {tab.badge !== undefined && <span className="sub-tab__badge">{tab.badge}</span>}
        </button>
      ))}
    </div>
  );
}
