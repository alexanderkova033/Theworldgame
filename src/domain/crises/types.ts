import type { GameDate } from "../country/types";

// Province crises (see crisisRules.ts): trouble that strikes one province,
// lasts a while, and is answered by letter.
export type CrisisKind = "flood" | "seam" | "felling" | "fever" | "fishing";

// How a crisis is answered: three ways for most, two for some.
export type CrisisAnswer =
  | "dike" // flood: build a dike, and it floods no more
  | "rebuild" // flood: rebuild as it was
  | "leave" // flood: leave it to its people
  | "shaft" // seam: sink a deeper shaft
  | "retool" // seam: keep the works open
  | "close" // seam: close the pits
  | "replant" // felling: replant the forest
  | "regrow" // felling: let it grow back by itself
  | "quarantine" // fever: shut the province in
  | "doctors" // fever: send doctors
  | "neglect" // fever: do nothing
  | "boats" // fishing: send the boats further out
  | "wait"; // fishing: wait for the fish to come back

export interface Crisis {
  kind: CrisisKind;
  since: GameDate;
  answer: CrisisAnswer | null; // null while its letter waits
  until: GameDate | null; // when it ends; null until it is answered
  yieldShare: number; // the share of the province's goods still coming in while it lasts (1: all)
  homesLost: number; // a flood's: the homes washed away, rebuilt when it is put right
  spread: boolean; // a fever's: it has already reached a province next door
}
