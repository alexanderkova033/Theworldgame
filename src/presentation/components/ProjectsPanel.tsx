import { projectProgress } from "../../domain/construction/constructionRules";
import type { Project } from "../../domain/construction/types";
import { getProvinceName } from "../../domain/provinces/provinceRules";

interface ProjectsPanelProps {
  projects: Project[];
}

export function ProjectsPanel({ projects }: ProjectsPanelProps) {
  return (
    <section className="panel projects-panel">
      <h2>Active Projects</h2>
      {projects.length === 0 && <p className="projects-panel__empty">No active projects.</p>}
      <ul className="projects-panel__list">
        {projects.map((project) => {
          const progress = Math.round(projectProgress(project) * 100);
          return (
            <li key={project.id} className="projects-panel__item">
              <div className="projects-panel__item-header">
                <span>
                  {project.label} <span className="projects-panel__province">— {getProvinceName(project.provinceId)}</span>
                </span>
                <span>{Math.ceil(project.daysRemaining)} days left</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
