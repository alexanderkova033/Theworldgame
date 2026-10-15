// HOI4-style subtabs inside a tab: one section at a time, each tab carrying
// a glance of how that section stands (a count, a %, a rate) and a "!" when
// something in it needs the player. Used by Research, Laws and Economy.
//
// Keyboard: one Tab stop for the whole row (the open tab); the arrow keys,
// Home and End move between tabs and open them, as the ARIA tabs pattern
// expects.
import "./SubTabs.css";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface SubTab {
  key: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode; // a short status: progress, a count, a rate
  alert?: boolean; // needs attention — drawn with a "!" as well as colour
  hint?: string; // tooltip
}

export function SubTabs({ tabs, active, onSelect, label }: { tabs: SubTab[]; active: string; onSelect: (key: string) => void; label: string }) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.key === active);
    const next =
      e.key === "ArrowRight" ? (index + 1) % tabs.length
      : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onSelect(tabs[next].key);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className="sub-tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={tab.key === active}
          tabIndex={tab.key === active ? 0 : -1}
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
