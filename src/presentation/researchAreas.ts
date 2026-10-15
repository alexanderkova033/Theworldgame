// Display names for the research areas, shared by the Research tab and the
// scientist stepper. Areas go by name only: they have no icon of their own,
// and borrowing a stat's icon made them look like that stat.
import type { ResearchCategory } from "../domain/research/types";

export const AREA_LABELS: Record<ResearchCategory, string> = {
  industry: "Industry",
  agriculture: "Agriculture",
  administration: "Administration",
  housing: "Homes",
};
