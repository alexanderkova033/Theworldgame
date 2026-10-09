// A province is a region of the map the player can build in. In the MVP,
// provinces are purely geographic/visual — the national economy is still one
// shared pool (see domain/economy) — but every completed project remembers
// which province it was built in, so the map can show where things are.
import type { ProjectType } from "../construction/types";

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
