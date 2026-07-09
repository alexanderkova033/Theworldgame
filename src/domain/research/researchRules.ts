// Research points accumulate passively every day, boosted by education
// investment. They gate starting research projects (see domain/construction).
import { RESEARCH_BASE_RATE, RESEARCH_PER_EDUCATION_LEVEL } from "../constants";

export function calculateDailyResearch(educationLevel: number): number {
  return RESEARCH_BASE_RATE + educationLevel * RESEARCH_PER_EDUCATION_LEVEL;
}
