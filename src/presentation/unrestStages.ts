// What each unrest stage is called and does, for the top bar chip and the
// Politics tab (see domain/unrest).
import {
  DISCONTENT_INDUSTRY_PENALTY,
  STRIKE_FACTORY_STOPPAGE,
  STRIKE_STOPPAGE_MIN,
  STRIKE_STOPPAGE_PER_POLICE,
  UNREST_DISCONTENT_BELOW,
  UNREST_RIOTS_BELOW,
  UNREST_STRIKES_BELOW,
} from "../domain/constants";

export type UnrestStep = "calm" | "discontent" | "strikes" | "riots" | "collapse";

export const UNREST_STEPS: UnrestStep[] = ["calm", "discontent", "strikes", "riots", "collapse"];

export const UNREST_INFO: Record<UnrestStep, { name: string; range: string; effect: string }> = {
  calm: { name: "Calm", range: `stability ${UNREST_DISCONTENT_BELOW}+`, effect: "No unrest." },
  discontent: {
    name: "Discontent",
    range: `under ${UNREST_DISCONTENT_BELOW}`,
    effect: `Industry -${Math.round(DISCONTENT_INDUSTRY_PENALTY * 100)}%.`,
  },
  strikes: {
    name: "Strikes",
    range: `under ${UNREST_STRIKES_BELOW}`,
    effect: `Factories lose ${Math.round(STRIKE_FACTORY_STOPPAGE * 100)}% of their work, ${Math.round(STRIKE_STOPPAGE_PER_POLICE * 100)}% less per officer (at least ${Math.round(STRIKE_STOPPAGE_MIN * 100)}%).`,
  },
  riots: { name: "Riots", range: `under ${UNREST_RIOTS_BELOW}`, effect: "Mobs wreck a building every week or so — fewer with police. Strikes go on." },
  collapse: { name: "Collapse", range: "stability 0", effect: "The government falls. Game over." },
};
