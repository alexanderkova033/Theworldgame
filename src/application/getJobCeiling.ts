// The ceiling on jobs: people stand idle, and no building open to the country
// has a slot left anywhere it holds, so nothing more can be built to employ
// them. Money and materials don't count: a country that can't pay for a
// factory hasn't run out of room for one.
//
// The whole country is asked, not each province, as most of the idle will
// travel to new jobs elsewhere on the mainland (see domain/labour).
import type { GameState } from "../domain/country/types";
import { getLabourSituation, type JobBuilding } from "../domain/labour/labourRules";
import { getOwnedProvinceIds } from "../domain/provinces/provinceRules";
import { buildCannery } from "./actions/buildCannery";
import { buildEducation } from "./actions/buildEducation";
import { buildFactory } from "./actions/buildFactory";
import { buildFarm } from "./actions/buildFarm";
import { buildGranary } from "./actions/buildGranary";
import { buildEstate, buildFoundry, buildMine, buildModelFarm, buildSawmill, buildSteelworks } from "./actions/buildLarger";
import { hasBuildingSlot, type BuildAction } from "./actions/createBuildAction";

// Every building that employs anyone.
const JOB_BUILDINGS: Record<JobBuilding, BuildAction> = {
  farm: buildFarm,
  factory: buildFactory,
  granary: buildGranary,
  cannery: buildCannery,
  education: buildEducation,
  estate: buildEstate,
  modelFarm: buildModelFarm,
  foundry: buildFoundry,
  steelworks: buildSteelworks,
  mine: buildMine,
  sawmill: buildSawmill,
};

export function isAtJobCeiling(state: GameState): boolean {
  if (getLabourSituation(state).unemployed < 1) return false;
  return !getOwnedProvinceIds(state).some((id) => Object.values(JOB_BUILDINGS).some((action) => hasBuildingSlot(state, action.config, id)));
}
