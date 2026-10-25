// Veldoria's story (domain/chapters/stories/veldoria.ts): when each beat
// opens besides its date, and when its objectives are met. Months are
// counted from the start; the elections fall at 18, 36 and 54.
import type { StoryChapterId } from "../../domain/chapters/chapterData";
import { isIsland } from "../../domain/islands/islandRules";
import { getOwnedProvinceIds } from "../../domain/provinces/provinceRules";
import type { StoryRules } from "../chapters";
import { answered, chose, crisisDealtWith } from "./storyChecks";

export const VELDORIA_RULES: Record<StoryChapterId, StoryRules> = {
  "veldoria:whistle": {
    opens: (_s, month) => month >= 4,
    checks: [answered("veldoria-whistle")],
  },
  "veldoria:smoke": {
    opens: (_s, month) => month >= 7,
    checks: [crisisDealtWith("veldoria:smoke", "province-1-north")],
  },
  "veldoria:ore": {
    opens: (_s, month) => month >= 11,
    checks: [answered("veldoria-ore")],
  },
  "veldoria:commons": {
    opens: (_s, month) => month >= 20,
    checks: [answered("veldoria-commons")],
  },
  "veldoria:islands": {
    opens: (s, month) => month >= 26 && s.chapters.opened.includes("captain"),
    checks: [answered("veldoria-company"), (s) => getOwnedProvinceIds(s).some(isIsland)],
  },
  // The sixth beat: one or the other, by the first letter's answer.
  "veldoria:congress": {
    opens: (s, month) => month >= 32 && chose("veldoria-whistle:ten")(s),
    checks: [answered("veldoria-congress")],
  },
  "veldoria:strike": {
    opens: (s, month) => month >= 32 && chose("veldoria-whistle:foundries")(s),
    checks: [answered("veldoria-strike")],
  },
  "veldoria:flood": {
    opens: (_s, month) => month >= 39,
    checks: [crisisDealtWith("veldoria:flood", "province-4-west")],
  },
  "veldoria:exhibition": {
    opens: (_s, month) => month >= 46,
    checks: [answered("veldoria-exhibition"), (s) => s.electionsWon >= 3],
  },
};
