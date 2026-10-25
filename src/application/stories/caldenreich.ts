// Caldenreich's story (domain/chapters/stories/caldenreich.ts): when each
// beat opens besides its date, and when its objectives are met. Months are
// counted from the start; the elections fall at 18, 36 and 54.
import type { StoryChapterId } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import type { StoryRules } from "../chapters";
import { answered, chose, crisisDealtWith } from "./storyChecks";

const scientists = (s: GameState) => Object.values(s.workforce.scientists).some((n) => n > 0);

export const CALDENREICH_RULES: Record<StoryChapterId, StoryRules> = {
  "caldenreich:speech": {
    opens: (_s, month) => month >= 4,
    checks: [answered("caldenreich-speech")],
  },
  "caldenreich:academy": {
    opens: (s, month) => month >= 10 && s.chapters.opened.includes("society"),
    checks: [answered("caldenreich-academy"), scientists],
  },
  "caldenreich:seam": {
    opens: (_s, month) => month >= 14,
    checks: [crisisDealtWith("caldenreich:seam", "province-6-west")],
  },
  "caldenreich:guild": {
    opens: (_s, month) => month >= 19,
    checks: [answered("caldenreich-guild")],
  },
  "caldenreich:winter": {
    opens: (_s, month) => month >= 25,
    checks: [answered("caldenreich-winter")],
  },
  "caldenreich:heir": {
    opens: (_s, month) => month >= 30,
    checks: [answered("caldenreich-heir")],
  },
  "caldenreich:ashford": {
    opens: (_s, month) => month >= 39,
    checks: [crisisDealtWith("caldenreich:ashford", "province-3-east")],
  },
  // The last beat: one or the other, by whom the government backed as heir.
  "caldenreich:konrad": {
    opens: (s, month) => month >= 46 && chose("caldenreich-heir:konrad")(s),
    checks: [answered("caldenreich-konrad"), (s) => s.electionsWon >= 3],
  },
  "caldenreich:elisabet": {
    opens: (s, month) => month >= 46 && chose("caldenreich-heir:elisabet")(s),
    checks: [answered("caldenreich-elisabet"), (s) => s.electionsWon >= 3],
  },
};
