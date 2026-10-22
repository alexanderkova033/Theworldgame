// A province is a region of the map the player can build in, and (for the
// player's own) a place people live, with its own homes, jobs and mood —
// while money, food and resources stay national. Every completed project remembers
// which province it was built in, so the map can show where things are.
import type { ProjectType } from "../construction/types";
import type { GameDate } from "../country/types";
import type { UnrestStage } from "../unrest/types";
import type { Uprising } from "../uprising/types";
import type { Crisis } from "../crises/types";

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

// An island off the continent. Scenery until a venture scouts it; then it
// can be settled and held like a province (see domain/islands), producing
// from its terrain as a province does.
export interface Island {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  terrain: Terrain;
}

export interface MapGeometry {
  width: number;
  height: number;
  coastPath: string; // outline of the main continent
  provinces: Province[];
  islands: Island[];
}

// A province as a place people live: its own population, and how orderly
// it is on its own (see provincePopulation.ts and provinceOrder.ts). Only
// the player's own provinces have one. National population is always the
// sum of these.
export interface ProvinceState {
  population: number;
  stability: number; // 0-100, local order — drifts toward the national figure, minus local troubles
  unrestStage: UnrestStage; // same stages as the nation's (see domain/unrest), reached on local stability
  riotDays: number; // days in a row it has rioted; enough of them and it rises (see domain/uprising)
  uprising: Uprising | null; // risen against the government, or null
  aggrievedUntil: GameDate | null; // put down by force: until this day it rises again sooner
  disputeUntil: GameDate | null; // a refused demand: until this day its mood sits well below the nation's
  payRiseUntil: GameDate | null; // a pay rise granted: until this day the country pays its workers more
  taxReliefUntil: GameDate | null; // rebels' terms met: until this day it pays no taxes
  crisis: Crisis | null; // a flood, a worked-out seam... striking it now (see domain/crises)
  diked: boolean; // a dike stands: it floods no more
  seamYield: number; // the share of its ore and coal its hills still give (1 until a seam runs out)
}

// A completed building, remembered so the map can show where it is.
// `condition` is absent while it works normally; a broken building produces
// nothing until it's repaired (see domain/maintenance).
export interface PlacedBuilding {
  id: string;
  provinceId: string;
  type: ProjectType;
  condition?: "broken" | "repairing" | "seized" | "ruined"; // seized: held by a province that has risen (see domain/uprising); ruined: by a crisis, until it is put right (domain/crises)
  repairDaysRemaining?: number;
}
