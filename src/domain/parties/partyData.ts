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
    description: "Smallholders and cooperative farmers. The republic's first parliament grew out of their protests against the grain tithe.",
    platform: "Speaks for farmers and the rural poor.",
    creed: { farmYieldMultiplier: 1.15, supportTarget: 2, industryMultiplier: 0.9 },
  },
  {
    id: "astravia-merchants-assembly",
    nationId: "astravia",
    name: "Merchants' Assembly",
    ideology: "Commercial",
    color: "#3f9e7a",
    description: "Trading houses and town guilds. They want the young republic run like a well-kept set of books.",
    platform: "Speaks for the towns, the ports and the trading houses.",
    creed: { incomeMultiplier: 1.1, buyPriceMultiplier: 0.9, hardshipMultiplier: 1.25 },
  },
  {
    id: "caldenreich-crown-loyalists",
    nationId: "caldenreich",
    name: "Crown Loyalists",
    ideology: "Traditionalist",
    color: "#4a6fa5",
    description: "The old administrative families. To them the kingdom's discipline is its inheritance, and nobody should tamper with it.",
    platform: "Speaks for the civil service, the church and the old families.",
    creed: { stabilityPerDay: 0.05, politicalPowerMultiplier: 1.15, researchMultiplier: 0.85 },
  },
  {
    id: "caldenreich-reform-circle",
    nationId: "caldenreich",
    name: "Reform Circle",
    ideology: "Progressive",
    color: "#7ec8e3",
    description: "Young schoolmasters and clerks who want to modernise the kingdom's famous administration from the inside.",
    platform: "Speaks for the young, the teachers and the clerks.",
    creed: { researchMultiplier: 1.2, supportTarget: 3, stabilityPerDay: -0.04 },
  },
  {
    id: "veldoria-ironworkers-guild",
    nationId: "veldoria",
    name: "Ironworkers' Guild",
    ideology: "Labor",
    color: "#e0a15c",
    description: "The foundry and rail unions. They built Veldoria's industry and now mean to run it.",
    platform: "Speaks for the factory floor and the railways.",
    creed: { industryMultiplier: 1.1, hardshipMultiplier: 0.75, wageMultiplier: 1.3 },
  },
  {
    id: "veldoria-national-vanguard",
    nationId: "veldoria",
    name: "National Vanguard",
    ideology: "Nationalist",
    color: "#b23a3a",
    description: "Veterans and industrialists. They want Veldoria strong, armed and feared by its neighbours.",
    platform: "Speaks for the veterans and the big industrialists.",
    creed: { pressureMultiplier: 1.4, buildCostMultiplier: 0.9, buyPriceMultiplier: 1.15 },
  },
];
