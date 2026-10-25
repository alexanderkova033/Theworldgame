// Astravia's story (domain/chapters/stories/astravia.ts): when each beat
// opens besides its date, and when its objectives are met. Months are
// counted from the start; the elections fall at 18, 36 and 54.
import { FOOD_PER_POP_CONSUMPTION } from "../../domain/constants";
import type { StoryChapterId } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { isIsland } from "../../domain/islands/islandRules";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
import type { StoryRules } from "../chapters";

const answered = (letter: string) => (s: GameState) => s.chapters.deeds.some((d) => d.startsWith(`${letter}:`));
const chose = (deed: string) => (s: GameState) => s.chapters.deeds.includes(deed);
const has = (s: GameState, provinceIds: string[], type: string, ofYours = false) =>
  s.placedBuildings.some((b) => provinceIds.includes(b.provinceId) && b.type === type && (!ofYours || !b.id.startsWith("starting-"))) ||
  s.projects.some((p) => provinceIds.includes(p.provinceId) && p.type === type);
// Its crisis struck as the briefing was read, and is over or answered.
const crisisDealtWith = (chapter: StoryChapterId, provinceId: string) => (s: GameState) =>
  !s.chapters.unread.includes(chapter) && (!s.provinces[provinceId]?.crisis || s.provinces[provinceId].crisis!.answer !== null);

const THORNWICK = ["province-8-north", "province-8-south"];
const MARROW = ["province-2-west", "province-2-east"];

export const ASTRAVIA_RULES: Record<StoryChapterId, StoryRules> = {
  "astravia:promise": {
    opens: (_s, month) => month >= 4,
    checks: [answered("astravia-petition"), (s) => has(s, THORNWICK, "farm", true)],
  },
  "astravia:flood": {
    opens: (_s, month) => month >= 7,
    checks: [(s) => !s.chapters.unread.includes("astravia:flood") && !s.provinces["province-2-west"]?.crisis],
  },
  "astravia:lean-year": {
    opens: (_s, month) => month >= 14,
    checks: [answered("astravia-lean-year"), (s) => s.stats.food >= s.stats.population * FOOD_PER_POP_CONSUMPTION * 180],
  },
  "astravia:coast": {
    opens: (s, month) => month >= 20 && s.chapters.opened.includes("captain"),
    checks: [answered("astravia-charter"), (s) => has(s, MARROW, "harbour")],
  },
  "astravia:island": {
    opens: (_s, month) => month >= 30,
    checks: [(s) => s.scoutedIslandIds.includes("island-1"), (s) => getOwnedProvinceIds(s).some(isIsland)],
  },
  // The sixth beat: one or the other, by the first letter's answer.
  "astravia:new-farmers": {
    opens: (s, month) => month >= 38 && chose("astravia-petition:keep")(s),
    checks: [answered("astravia-new-farmers")],
  },
  "astravia:thornwick-rises": {
    opens: (s, month) => month >= 38 && chose("astravia-petition:wait")(s),
    checks: [answered("astravia-thornwick-rises")],
  },
  "astravia:felling": {
    opens: (_s, month) => month >= 44,
    checks: [crisisDealtWith("astravia:felling", "province-8-south")],
  },
  "astravia:founding-day": {
    opens: (_s, month) => month >= 48,
    checks: [answered("astravia-fiftieth"), (s) => s.electionsWon >= 3],
  },
};
