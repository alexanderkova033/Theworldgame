// What's being built, as a strip of rings along the top of the Build window:
// each ring fills as its building goes up, with the building's picture in
// the middle and the days left under it. A stalled one turns amber with a
// "!" and says what it's short of; one that will stall tomorrow says so.
// The details (where, how much a day) are in each ring's tip.
import "./ProjectsPanel.css";
import { getProjectShortages, type ProjectShortage } from "../../application/getProjectAffordability";
import { projectProgress } from "../../domain/construction/constructionRules";
import type { GameState } from "../../domain/country/types";
import { CURRENCY_SYMBOL } from "../../domain/constants";
import { getProvinceName } from "../../domain/provinces/provinceRules";
import type { CSSProperties } from "react";
import { formatAmount } from "../formatNumber";
import { counted } from "../../domain/plural";
import { BuildingIcon } from "./BuildingIcon";

interface ProjectRingsProps {
  state: GameState;
  dailyCost: number; // what the building instalments take from the treasury each day
}

// What a project is short of, in words: the money, the good, or both. An earlier
// project having taken it is the only way it can be there and still not reach this one.
function describeShortage(shortage: ProjectShortage): string {
  const wants = [shortage.money && "money", shortage.good].filter(Boolean).join(" and ");
  return ` for want of ${wants}${shortage.takenByEarlier ? ", as earlier projects are paid first" : ""}`;
}

export function ProjectRings({ state, dailyCost }: ProjectRingsProps) {
  const { projects } = state;
  const shortages = getProjectShortages(state);

  return (
    <section className={`project-rings ${projects.length === 0 ? "is-empty" : ""}`} aria-label="Being built">
      {projects.length === 0 && <p className="project-rings__none">Nothing being built</p>}
      <ul className="project-rings__list">
        {projects.map((project) => {
          const progress = Math.round(projectProgress(project) * 100);
          const shortage = shortages.get(project.id) ?? null;
          const stallsTomorrow = !project.isStalled && shortage !== null;
          const tone = project.isStalled ? "is-stalled" : stallsTomorrow ? "is-tight" : "";
          const perDay = [
            project.treasuryCostPerDay > 0 ? `${formatAmount(project.treasuryCostPerDay)} ${CURRENCY_SYMBOL}` : null,
            project.resourceType && project.resourceCostPerDay > 0 ? `${Math.round(project.resourceCostPerDay * 10) / 10} ${project.resourceType}` : null,
          ]
            .filter(Boolean)
            .join(" and ");
          const tip = `${project.label} in ${getProvinceName(project.provinceId)}: ${progress}%${project.isStalled ? `, stalled${shortage ? describeShortage(shortage) : ", and it can pay again tomorrow"}` : `, ${counted(Math.ceil(project.daysRemaining), "day")} left`}.${perDay ? ` Takes ${perDay} a day.` : ""}${stallsTomorrow && shortage ? ` Tomorrow's share isn't covered${describeShortage(shortage)}.` : ""}`;
          return (
            <li key={project.id} className={`project-ring ${tone}`} title={tip} aria-label={tip}>
              <span className="project-ring__dial" style={{ "--progress": `${progress}%` } as CSSProperties}>
                <span className="project-ring__face">
                  <svg viewBox="-12 -16 24 24" aria-hidden="true">
                    <BuildingIcon type={project.type} x={0} y={0} size={7} />
                  </svg>
                </span>
                {(project.isStalled || stallsTomorrow) && (
                  <span className="project-ring__mark" aria-hidden="true">
                    !
                  </span>
                )}
              </span>
              <span className="project-ring__label">{project.isStalled ? (shortage ? `no ${shortage.money ? "money" : shortage.good}` : "resumes") : stallsTomorrow ? "short" : `${Math.ceil(project.daysRemaining)}d`}</span>
            </li>
          );
        })}
      </ul>
      {dailyCost > 0 && (
        <span className="project-rings__cost" title="What the buildings under way take from the treasury each day">
          <span>Building</span>
          <strong>−{formatAmount(dailyCost)} {CURRENCY_SYMBOL}/d</strong>
        </span>
      )}
    </section>
  );
}
