// Raw resources, Catan-inspired: each province's terrain determines what it
// produces, so a nation's mix of terrain shapes what it has plenty of and
// what it needs to trade for.
export type ResourceType = "wood" | "ore" | "coal" | "grain" | "fish";

export type ResourceBundle = Record<ResourceType, number>;

export const RESOURCE_TYPES: ResourceType[] = ["wood", "ore", "coal", "grain", "fish"];
