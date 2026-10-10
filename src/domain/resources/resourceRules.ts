import { COAL_PER_HILLS_PROVINCE, RESOURCE_PER_PROVINCE } from "../constants";
import type { Season } from "../country/calendar";
import type { Terrain } from "../provinces/types";
import type { ResourceBundle, ResourceType } from "./types";

// Each terrain produces one matching raw resource — the map's terrain
// texture (see MapPanel) isn't just decorative, it tells you what a
// province is good for.
export const RESOURCE_BY_TERRAIN: Record<Terrain, ResourceType> = {
  forest: "wood",
  hills: "ore",
  plains: "grain",
  coast: "fish",
};

export function emptyResourceBundle(): ResourceBundle {
  return { wood: 0, ore: 0, coal: 0, grain: 0, fish: 0 };
}

// One day's production across every owned province, given their terrains.
// Hills mine coal alongside their ore. Grain fields lie fallow in winter;
// forests, mines and the sea don't stop.
export function calculateDailyProduction(terrains: Terrain[], season: Season): ResourceBundle {
  const production = emptyResourceBundle();
  for (const terrain of terrains) {
    const type = RESOURCE_BY_TERRAIN[terrain];
    if (type === "grain" && season === "winter") continue;
    production[type] += RESOURCE_PER_PROVINCE;
    if (terrain === "hills") production.coal += COAL_PER_HILLS_PROVINCE;
  }
  return production;
}

export function addResources(a: ResourceBundle, b: ResourceBundle): ResourceBundle {
  return {
    wood: a.wood + b.wood,
    ore: a.ore + b.ore,
    coal: a.coal + b.coal,
    grain: a.grain + b.grain,
    fish: a.fish + b.fish,
  };
}

export function canAffordResource(resources: ResourceBundle, type: ResourceType, amount: number): boolean {
  return resources[type] >= amount;
}

export function deductResource(resources: ResourceBundle, type: ResourceType, amount: number): ResourceBundle {
  return { ...resources, [type]: resources[type] - amount };
}
