// A province is a region of the map the player can build in, and (for the
// player's own) a place people live, with its own homes, jobs and mood —
// while money, food and resources stay national. Every completed project remembers
// which province it was built in, so the map can show where things are.
import type { ProjectType } from "../construction/types";
import type { UnrestStage } from "../unrest/types";

// Cosmetic only — drives which decorative texture the map draws over a
// province. Has no effect on the simulation.
export type Terrain = "plains" | "hills" | "forest" | "coast";

export interface Province {
  id: string;
  name: string;
  path: string; // SVG path `d` attribute, in the shared map viewBox
  labelX: number;
  labelY: number;
  terrain: Terrain;
}

// A purely decorative landmass — not divided into provinces, not ownable by
// any nation. Exists so the world map doesn't feel like it's just one
// continent; a natural place to grow into (new nations, colonization) later.
export interface DecorativeLandmass {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

export interface MapGeometry {
  width: number;
  height: number;
  coastPath: string; // outline of the main continent
  provinces: Province[];
  otherLandmasses: DecorativeLandmass[];
}

// A province as a place people live: its own population, and how orderly
// it is on its own (see provincePopulation.ts and provinceOrder.ts). Only
// the player's own provinces have one. National population is always the
// sum of these.
export interface ProvinceState {
  population: number;
  stability: number; // 0-100, local order — drifts toward the national figure, minus local troubles
  unrestStage: UnrestStage; // same stages as the nation's (see domain/unrest), reached on local stability
}

// A completed building, remembered so the map can show where it is.
// `condition` is absent while it works normally; a broken building produces
// nothing until it's repaired (see domain/maintenance).
export interface PlacedBuilding {
  id: string;
  provinceId: string;
  type: ProjectType;
  condition?: "broken" | "repairing";
  repairDaysRemaining?: number;
}
