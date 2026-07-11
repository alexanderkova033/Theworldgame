import type { Party } from "./types";

// Two parties per nation, opposite enough to make the pick matter but both
// plausible governors of that nation's flavor — see nationData.ts blurbs.
//
// Every party's color is a shade *within its own nation's hue family*
// (green for Astravia, blue for Caldenreich, red for Veldoria — see
// nationData.ts), differentiated from its rival by lightness/warmth rather
// than by hue. A party in an unrelated hue (an early version had a lavender
// purple here) reads as a mystery fourth nation the moment it's shown next
// to the nation name — this way a party's color always visibly "belongs" to
// its own country while still being easy to tell apart from its rival.
export const PARTIES: Party[] = [
  {
    id: "astravia-harvest-union",
    nationId: "astravia",
    name: "Harvest Union",
    ideology: "Agrarian",
    color: "#7cb350",
    description: "Smallholders and cooperative farmers who built the republic's first parliament out of grain-tithe protests.",
    platform: "Popular with farmers and the rural poor; wary of high taxes.",
  },
  {
    id: "astravia-merchants-assembly",
    nationId: "astravia",
    name: "Merchants' Assembly",
    ideology: "Commercial",
    color: "#3f9e7a",
    description: "Trading houses and town guilds who want the young republic run like a well-audited ledger.",
    platform: "Popular in the towns and ports; comfortable taxing to invest.",
  },
  {
    id: "caldenreich-crown-loyalists",
    nationId: "caldenreich",
    name: "Crown Loyalists",
    ideology: "Traditionalist",
    color: "#4a6fa5",
    description: "Old administrative families who see the kingdom's discipline as its whole inheritance, not to be tampered with.",
    platform: "Popular with the civil service; steady, risk-averse governing.",
  },
  {
    id: "caldenreich-reform-circle",
    nationId: "caldenreich",
    name: "Reform Circle",
    ideology: "Progressive",
    color: "#7ec8e3",
    description: "Younger schoolmasters and clerks pushing to modernize the kingdom's famous administration from within.",
    platform: "Popular with the young and the educated; impatient with tradition for its own sake.",
  },
  {
    id: "veldoria-ironworkers-guild",
    nationId: "veldoria",
    name: "Ironworkers' Guild",
    ideology: "Labor",
    color: "#c07a4a",
    description: "The foundry and rail unions that built Veldoria's industry, now organizing to run it themselves.",
    platform: "Popular with factory workers; suspicious of unearned wealth.",
  },
  {
    id: "veldoria-national-vanguard",
    nationId: "veldoria",
    name: "National Vanguard",
    ideology: "Nationalist",
    color: "#b23a3a",
    description: "Veterans and industrialists who want Veldoria's sharp edge turned outward, not softened.",
    platform: "Popular with veterans and industrialists; hungry for strength projects.",
  },
];
