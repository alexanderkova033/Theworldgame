import "./ProjectsPanel.css";
import { getProjectAffordabilities } from "../../application/getProjectAffordability";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { projectProgress } from "../../domain/construction/constructionRules";
import type { GameState } from "../../domain/country/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import { BuildingIcon } from "./BuildingIcon";
import { ResourceIcon } from "./ResourceIcon";

interface ProjectsPanelProps {
  state: GameState;
}

// The ongoing daily installment a project is drawing — see
// createBuildAction.ts (half the cost up front, the rest drained daily) and
// simulateDay.ts step 1 (earlier-started projects claim funds first on a
// tight budget, which is exactly what getProjectAffordabilities mirrors).
function DailyCost({ treasuryPerDay, resourceType, resourcePerDay }: { treasuryPerDay: number; resourceType: string | null; resourcePerDay: number }) {
  const treasuryRounded = Math.round(treasuryPerDay * 10) / 10;
  const resourceRounded = Math.round(resourcePerDay * 10) / 10;
  return (
    <span className="projects-panel__cost">
      {treasuryRounded > 0 && (
        <span className="projects-panel__cost-item">
          {treasuryRounded} {CURRENCY_SYMBOL}/day
        </span>
      )}
      {resourceType && resourceRounded > 0 && (
        <span className="projects-panel__cost-item">
          <svg viewBox="-10 -10 20 20" width={13} height={13}>
            <ResourceIcon type={resourceType as never} size={8} />
          </svg>
          {resourceRounded}/day
        </span>
      )}
    </span>
  );
}

export function ProjectsPanel({ state }: ProjectsPanelProps) {
  const { projects } = state;
  const affordabilities = getProjectAffordabilities(state);

  return (
    <section className="panel projects-panel">
      <h2>Active Projects</h2>
      {projects.length === 0 && (
        <div className="projects-panel__empty">
          <svg viewBox="-12 -16 24 24" aria-hidden="true">
            <BuildingIcon type="road" x={0} y={0} size={7} />
          </svg>
          <p>No active projects.</p>
        </div>
      )}
      <ul className="projects-panel__list">
        {projects.map((project) => {
          const progress = Math.round(projectProgress(project) * 100);
          const willAffordTomorrow = affordabilities.get(project.id) ?? true;
          return (
            <li key={project.id} className={`projects-panel__item ${project.isStalled ? "is-stalled" : ""}`}>
              <div className="projects-panel__icon" aria-hidden="true">
                <svg viewBox="-12 -16 24 24">
                  <BuildingIcon type={project.type} x={0} y={0} size={7} />
                </svg>
              </div>
              <div className="projects-panel__body">
                <div className="projects-panel__item-header">
                  <span>
                    {project.label} <span className="projects-panel__province">— {getProvinceName(project.provinceId)}</span>
                  </span>
                  {project.isStalled ? (
                    <span className="projects-panel__stalled-tag">Stalled — can't afford it</span>
                  ) : (
                    <span>{Math.ceil(project.daysRemaining)} days left</span>
                  )}
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
                </div>
                <div className="projects-panel__footer">
                  <DailyCost treasuryPerDay={project.treasuryCostPerDay} resourceType={project.resourceType} resourcePerDay={project.resourceCostPerDay} />
                  {!project.isStalled && !willAffordTomorrow && (
                    <span className="projects-panel__warning-tag">Will stall tomorrow — not enough to cover it</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
