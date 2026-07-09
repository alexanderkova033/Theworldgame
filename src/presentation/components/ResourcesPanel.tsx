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
      <dl className="stats-panel__grid">
        {RESOURCE_TYPES.map((type) => (
          <div className="stats-panel__row" key={type}>
            <dt>
              <svg width={30} height={30} viewBox="-10 -10 20 20" className="stats-panel__icon">
                <ResourceIcon type={type} size={8} />
              </svg>
              {RESOURCE_LABELS[type]}
            </dt>
            <dd>{Math.round(resources[type]).toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
