// A province is a region of the map the player can build in. In the MVP,
// provinces are purely geographic/visual — the national economy is still one
// shared pool (see domain/economy) — but every completed project remembers
// which province it was built in, so the map can show where things are.
import type { ProjectType } from "../construction/types";

export interface Province {
  id: string;
  name: string;
  path: string; // SVG path `d` attribute, in the shared map viewBox
  labelX: number;
  labelY: number;
}

export interface MapGeometry {
  width: number;
  height: number;
  coastPath: string; // outline of the whole landmass
  provinces: Province[];
}

// A completed building, remembered so the map can show where it is.
export interface PlacedBuilding {
  id: string;
  provinceId: string;
  type: ProjectType;
}
