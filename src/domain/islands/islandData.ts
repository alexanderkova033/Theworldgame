// The islands off the continent, as places to settle (their outlines and
// terrain are in provinces/provinceData.ts). Each has one trait of its own,
// what makes it worth the voyage, and some have people already living
// there: settling those is a choice about them (see GAME_DESIGN.md,
// Islands). The rest are empty.
//
// Built in phases (ROADMAP.md, step 3): settling comes first, then the sea
// and the traits, then the locals, so not everything here is used yet.

export type IslandTrait = "fishingGrounds" | "oreSeam" | "anchorage" | "grazing" | "timber" | "saltPans";

export interface IslandLocals {
  name: string; // who they are, as a letter would call them
  people: number;
}

export interface IslandData {
  id: string; // matches an island in MAP_GEOMETRY.islands
  trait: IslandTrait;
  traitText: string; // the trait in plain words, for the Ventures window
  locals: IslandLocals | null; // null: nobody lives there
}

export const ISLANDS: IslandData[] = [
  {
    id: "island-1",
    trait: "fishingGrounds",
    traitText: "Rich fishing grounds: its fish yield doubles.",
    locals: { name: "the Kestrel fishing folk", people: 1200 },
  },
  {
    id: "island-2",
    trait: "oreSeam",
    traitText: "An ore seam close to the surface: its ore yield doubles.",
    locals: null,
  },
  {
    id: "island-3",
    trait: "anchorage",
    traitText: "A sheltered anchorage: a harbour there costs half as much.",
    locals: null,
  },
  {
    id: "island-4",
    trait: "grazing",
    traitText: "Windswept grazing: its flocks add 300 food a day.",
    locals: null,
  },
  {
    id: "island-5",
    trait: "timber",
    traitText: "Old forest down to the shore: its wood yield doubles.",
    locals: { name: "the Marrowind foresters", people: 800 },
  },
  {
    id: "island-6",
    trait: "saltPans",
    traitText: "Salt pans: the salt trade brings in 6 Cr a day.",
    locals: { name: "the Saltreach salt-panners", people: 600 },
  },
];

export function getIslandData(id: string): IslandData | undefined {
  return ISLANDS.find((island) => island.id === id);
}
