import type { Party } from "./types";

// Two parties per nation, opposite enough to make the pick matter but both
// plausible governors of that nation's flavor — see nationData.ts blurbs.
export const PARTIES: Party[] = [
  {
    id: "astravia-harvest-union",
    nationId: "astravia",
    name: "Harvest Union",
    ideology: "Agrarian",
    color: "#8bc34a",
    description: "Smallholders and cooperative farmers who built the republic's first parliament out of grain-tithe protests.",
    platform: "Popular with farmers and the rural poor; wary of high taxes.",
  },
  {
    id: "astravia-merchants-assembly",
    nationId: "astravia",
    name: "Merchants' Assembly",
    ideology: "Commercial",
    color: "#e0954a",
    description: "Trading houses and town guilds who want the young republic run like a well-audited ledger.",
    platform: "Popular in the towns and ports; comfortable taxing to invest.",
  },
  {
    id: "caldenreich-crown-loyalists",
    nationId: "caldenreich",
    name: "Crown Loyalists",
    ideology: "Traditionalist",
    color: "#5b9bd6",
    description: "Old administrative families who see the kingdom's discipline as its whole inheritance, not to be tampered with.",
    platform: "Popular with the civil service; steady, risk-averse governing.",
  },
  {
    id: "caldenreich-reform-circle",
    nationId: "caldenreich",
    name: "Reform Circle",
    ideology: "Progressive",
    color: "#c58ae0",
    description: "Younger schoolmasters and clerks pushing to modernize the kingdom's famous administration from within.",
    platform: "Popular with the young and the educated; impatient with tradition for its own sake.",
  },
  {
    id: "veldoria-ironworkers-guild",
    nationId: "veldoria",
    name: "Ironworkers' Guild",
    ideology: "Labor",
    color: "#8c93a0",
    description: "The foundry and rail unions that built Veldoria's industry, now organizing to run it themselves.",
    platform: "Popular with factory workers; suspicious of unearned wealth.",
  },
  {
    id: "veldoria-national-vanguard",
    nationId: "veldoria",
    name: "National Vanguard",
    ideology: "Nationalist",
    color: "#c2402f",
    description: "Veterans and industrialists who want Veldoria's sharp edge turned outward, not softened.",
    platform: "Popular with veterans and industrialists; hungry for strength projects.",
  },
];
