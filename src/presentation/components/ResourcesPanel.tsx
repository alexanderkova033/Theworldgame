import "./ResourcesPanel.css";
import { RESOURCE_TYPES, type ResourceBundle } from "../../domain/resources/types";
import { ResourceIcon } from "./ResourceIcon";

interface ResourcesPanelProps {
  resources: ResourceBundle;
}

const RESOURCE_LABELS: Record<string, string> = {
  wood: "Wood",
  ore: "Ore",
  grain: "Grain",
  fish: "Fish",
};

export function ResourcesPanel({ resources }: ResourcesPanelProps) {
  return (
    <section className="panel resources-panel">
      <h2>Raw Resources</h2>
      <p className="resources-panel__hint">Produced by your provinces' terrain — spent on building, or traded.</p>
      <div className="icon-tile-list">
        {RESOURCE_TYPES.map((type) => (
          <div className="icon-tile" key={type}>
            <div className="icon-tile__icon">
              <svg viewBox="-10 -10 20 20">
                <ResourceIcon type={type} size={8} />
              </svg>
            </div>
            <div className="icon-tile__body">
              <span className="icon-tile__label">{RESOURCE_LABELS[type]}</span>
              <span className="icon-tile__value">{Math.round(resources[type]).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
