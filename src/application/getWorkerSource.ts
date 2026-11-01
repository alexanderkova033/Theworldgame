// Where a new building's workers would come from, for its row in Build: when
// there aren't spare people for it, who it would take them from, or that its
// jobs would stand empty. Null when people are there for it.
import type { ProjectType } from "../domain/construction/types";
import type { GameState } from "../domain/country/types";
import { getJobsPerBuilding, getLabourSituation, SECTOR_OF, SECTORS, type JobBuilding, type Sector } from "../domain/labour/labourRules";

const SECTOR_NAMES: Record<Sector, string> = { food: "farms and food", school: "schools", industry: "factories" };

export function getWorkerSource(state: GameState, type: ProjectType): string | null {
  const sector = SECTOR_OF[type];
  if (!sector) return null;
  const labour = getLabourSituation(state);
  const jobs = getJobsPerBuilding(state)[type as JobBuilding];

  // A limit of the player's own holds it back first.
  if (state.workPlan) {
    const room = Math.max(0, state.workPlan[sector] - labour.sectors[sector].jobs);
    const shut = Math.round(jobs - room);
    if (shut > 0) return `Your limit of ${state.workPlan[sector].toLocaleString()} on ${SECTOR_NAMES[sector]} would leave ${shut === jobs ? `its ${jobs.toLocaleString()}` : `${shut.toLocaleString()} of its ${jobs.toLocaleString()}`} jobs empty.`;
  }

  const spare = Math.floor(labour.unemployed);
  if (spare >= jobs) return null;
  // Jobs fill in order, so it takes from the sectors filled after it.
  const later = SECTORS.slice(SECTORS.indexOf(sector) + 1).filter((s) => labour.sectors[s].hired >= 1);
  const from = later.length > 0 ? `filled from ${SECTOR_NAMES[later[later.length - 1]]}` : "stand empty";
  if (spare >= 1) return `Only ${spare.toLocaleString()} people are jobless. The rest of its ${jobs.toLocaleString()} jobs would be ${from === "stand empty" ? "left empty" : from}.`;
  return `No spare workers. Its ${jobs.toLocaleString()} jobs would ${from === "stand empty" ? from : `be ${from}`}.`;
}
