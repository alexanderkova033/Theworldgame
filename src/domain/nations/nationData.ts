// The continent is divided among three playable nations. The two the player
// doesn't pick are run by the computer (see domain/neighbours).
import type { Nation } from "./types";

export const NATIONS: Nation[] = [
  {
    id: "astravia",
    name: "Astravia",
    color: "#2f6b4f",
    capitalProvinceId: "province-7-north", // North Redgate
    provinceIds: [
      "province-7-north", "province-7-south", // Redgate
      "province-8-north", "province-8-south", // Thornwick
      "province-2-west", "province-2-east", // Marrow Coast
    ],
    blurb: "A young republic in the continent's heartland, balancing farmland and ambition.",
    startingBonus: "Starts with an extra farm.",
  },
  {
    id: "caldenreich",
    name: "Caldenreich",
    color: "#1f3f78",
    capitalProvinceId: "province-5-west", // West Caldermoor
    provinceIds: [
      "province-5-west", "province-5-east", // Caldermoor
      "province-3-west", "province-3-east", // Ashford
      "province-6-west", "province-6-east", // Duskhaven
    ],
    blurb: "A disciplined northern kingdom, proud of its schools and its steady administration.",
    startingBonus: "Starts with higher stability.",
  },
  {
    id: "veldoria",
    name: "Veldoria",
    color: "#c8693f",
    capitalProvinceId: "province-1-south", // South Veldshire
    provinceIds: [
      "province-1-north", "province-1-south", // Veldshire
      "province-4-west", "province-4-east", // Brindlewood
    ],
    blurb: "A compact eastern power built on early industry. Smaller, but sharp-edged.",
    startingBonus: "+15% industry output.",
  },
];
