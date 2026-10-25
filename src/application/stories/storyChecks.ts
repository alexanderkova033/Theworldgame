// Checks the nations' stories share, for when a beat opens and when its
// objectives are met (see application/stories/<nation>.ts).
import type { StoryChapterId } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";

// A story letter has been answered, one way or another.
export const answered = (letter: string) => (s: GameState) => s.chapters.deeds.some((d) => d.startsWith(`${letter}:`));

// A particular answer was given ("<letter>:<option>").
export const chose = (deed: string) => (s: GameState) => s.chapters.deeds.includes(deed);

// A building of this kind stands in (or is being built in) one of these
// provinces; ofYours leaves out what the country started with.
export const has = (s: GameState, provinceIds: string[], type: string, ofYours = false) =>
  s.placedBuildings.some((b) => provinceIds.includes(b.provinceId) && b.type === type && (!ofYours || !b.id.startsWith("starting-"))) ||
  s.projects.some((p) => provinceIds.includes(p.provinceId) && p.type === type);

// The crisis a chapter strikes as its briefing is read is over, or answered.
export const crisisDealtWith = (chapter: StoryChapterId, provinceId: string) => (s: GameState) =>
  !s.chapters.unread.includes(chapter) && (!s.provinces[provinceId]?.crisis || s.provinces[provinceId].crisis!.answer !== null);
