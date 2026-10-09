// Display names and glyphs for the three research areas, shared by the
// Research tab and the Workforce panel.
import type { ResearchCategory } from "../domain/research/types";
import type { StatIconType } from "./components/StatIcon";

export const AREA_LABELS: Record<ResearchCategory, string> = {
  industry: "Industry",
  agriculture: "Agriculture",
  administration: "Administration",
  housing: "Housing",
};

export const AREA_ICONS: Record<ResearchCategory, StatIconType> = {
  industry: "industry",
  agriculture: "food",
  administration: "stability",
  housing: "population",
};
