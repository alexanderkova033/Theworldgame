import { EDUCATION_BUILD_DAYS, EDUCATION_COST, EDUCATION_WOOD_COST, MAX_EDUCATION_PER_PROVINCE } from "../../domain/constants";
import { createBuildAction } from "./createBuildAction";

// A real building now (see MapPanel's BUILDING_LABELS/BuildingIcon, which
// already knew how to draw "education" — only the build action itself was
// missing) — same half-now/half-over-time cost shape as Farm/Factory/Road,
// instead of the old flat-upfront, uncapped investEducation.ts.
export const buildEducation = createBuildAction({
  type: "education",
  label: "School",
  cost: EDUCATION_COST,
  buildDays: EDUCATION_BUILD_DAYS,
  resourceType: "wood",
  resourceCost: EDUCATION_WOOD_COST,
  maxPerProvince: MAX_EDUCATION_PER_PROVINCE,
});
