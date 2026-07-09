// The continent is currently divided among three playable nations. The rest
// of the map (whichever nation the player doesn't pick) is shown but not
// controllable — a placeholder for AI-controlled neighbors down the line.
import type { Nation } from "./types";

export const NATIONS: Nation[] = [
  {
    id: "astravia",
    name: "Astravia",
    color: "#2f6b4f",
    capitalProvinceId: "province-7", // Redgate
    provinceIds: ["province-7", "province-8", "province-2"], // Redgate, Thornwick, Marrow Coast
    blurb: "A young republic in the continent's heartland, balancing farmland and ambition.",
  },
  {
    id: "caldenreich",
    name: "Caldenreich",
    color: "#3f5f8a",
    capitalProvinceId: "province-5", // Caldermoor
    provinceIds: ["province-5", "province-3", "province-6"], // Caldermoor, Ashford, Duskhaven
    blurb: "A disciplined northern kingdom, proud of its schools and its steady administration.",
  },
  {
    id: "veldoria",
    name: "Veldoria",
    color: "#8a3f4a",
    capitalProvinceId: "province-1", // Veldshire
    provinceIds: ["province-1", "province-4"], // Veldshire, Brindlewood
    blurb: "A compact eastern power built on early industry — smaller, but sharp-edged.",
  },
];
