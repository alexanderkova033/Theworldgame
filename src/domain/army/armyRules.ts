// Recruiting soldiers is instant (unlike buildings/research, it is not a
// timed project) but adds ongoing upkeep, handled by domain/economy.
import { SOLDIER_RECRUIT_COST, SOLDIER_RECRUIT_STRENGTH } from "../constants";

export function getRecruitmentCost(): number {
  return SOLDIER_RECRUIT_COST;
}

export function getRecruitmentStrength(): number {
  return SOLDIER_RECRUIT_STRENGTH;
}
