// What the player calls things that have code names: the voter groups, and
// each kind of building (one and many). One name each, used everywhere.
import type { ProjectType } from "../domain/construction/types";
import type { Ideology } from "../domain/parties/types";

// The groups as people, not "wings".
export const GROUP_NAMES: Record<Ideology, string> = {
  Agrarian: "Farmers",
  Commercial: "Merchants",
  Traditionalist: "Traditionalists",
  Progressive: "Progressives",
  Labor: "Workers",
  Nationalist: "Nationalists",
};

export const BUILDING_NAMES: Record<ProjectType, [one: string, many: string]> = {
  housing: ["Home", "Homes"],
  farm: ["Farm", "Farms"],
  factory: ["Factory", "Factories"],
  road: ["Road", "Roads"],
  education: ["School", "Schools"],
  granary: ["Granary", "Granaries"],
  cannery: ["Cannery", "Canneries"],
  harbour: ["Harbour", "Harbours"],
};
