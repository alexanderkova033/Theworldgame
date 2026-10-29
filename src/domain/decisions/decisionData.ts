import {
  DECISION_COAL_SHORTAGE_DAYS,
  DECISION_GLUT_FOOD_DAYS,
  DECISION_HOUSING_PROTEST_SHARE,
  DECISION_STRIKE_FACTORY_STAFFING,
  DECISION_STRIKE_UNEMPLOYMENT,
  DECISION_UNREST_STABILITY,
  FOOD_PER_POP_CONSUMPTION,
} from "../constants";
import { getSeason } from "../country/calendar";
import type { GameState } from "../country/types";
import { getHeatingDemand, getNationalHomelessShare } from "../housing/housingRules";
import { getLabourSituation } from "../labour/labourRules";
import { isDebtDangerous } from "../loans/loanRules";
import type { DecisionDefinition } from "./types";
import { ASTRAVIA_LETTERS } from "../chapters/stories/astravia";
import { CALDENREICH_LETTERS } from "../chapters/stories/caldenreich";
import { VELDORIA_LETTERS } from "../chapters/stories/veldoria";

// What the situational decisions below react to.
function coalRunningOut(state: GameState): boolean {
  if (getSeason(state.date) !== "winter") return false;
  const demand = getHeatingDemand(state, "winter");
  return demand > 0 && (state.resources.coal + state.resources.wood) / demand < DECISION_COAL_SHORTAGE_DAYS;
}

function manyHomeless(state: GameState): boolean {
  return getNationalHomelessShare(state) >= DECISION_HOUSING_PROTEST_SHARE;
}

function workersRestless(state: GameState): boolean {
  const labour = getLabourSituation(state);
  return (state.factoryCount > 0 && labour.industryStaffing < DECISION_STRIKE_FACTORY_STAFFING) || labour.unemploymentShare >= DECISION_STRIKE_UNEMPLOYMENT;
}

function harvestGlut(state: GameState): boolean {
  return getSeason(state.date) === "autumn" && state.stats.food > state.stats.population * FOOD_PER_POP_CONSUMPTION * DECISION_GLUT_FOOD_DAYS;
}

// Short, two-option decisions. Kept deliberately terse — a title, one
// prompt sentence, and two option labels short enough to read at a glance —
// since the popup is meant to be answered in a few seconds, not studied.
export const DECISIONS: DecisionDefinition[] = [
  {
    id: "press-interview",
    title: "Press Interview",
    prompt: "A reporter wants your take on the opposition.",
    icon: "popularity",
    options: [
      { id: "attack", label: "Attack them", effects: { popularityDelta: 6, stabilityDelta: -3 } },
      { id: "high-road", label: "Take the high road", effects: { stabilityDelta: 2 } },
    ],
  },
  {
    id: "charity-gala",
    title: "Charity Gala",
    prompt: "Local elites invite your party to a fundraising gala.",
    icon: "treasury",
    options: [
      { id: "attend", label: "Attend, court donors", effects: { treasuryDelta: 800, popularityDelta: -2 } },
      { id: "decline", label: "Decline, stay with the people", effects: { popularityDelta: 2 } },
    ],
  },
  {
    id: "factory-strike",
    title: "Strike Threat",
    prompt: "Workers threaten to strike over conditions.",
    icon: "industry",
    options: [
      { id: "concede", label: "Meet their demands", effects: { popularityDelta: 5, treasuryDelta: -600 } },
      { id: "stand-firm", label: "Stand firm", effects: { stabilityDelta: -6, treasuryDelta: 200 } },
    ],
  },
  {
    id: "scandal-rumor",
    title: "Scandal Rumor",
    prompt: "Rumors swirl about a rival's closest ally.",
    icon: "popularity",
    options: [
      { id: "amplify", label: "Amplify it", effects: { popularityDelta: 8, stabilityDelta: -5 } },
      { id: "ignore", label: "Stay above it", effects: { stabilityDelta: 1 } },
    ],
  },
  {
    id: "harvest-festival",
    title: "Harvest Festival",
    prompt: "Farmers ask you to fund this year's festival.",
    icon: "food",
    options: [
      { id: "fund", label: "Fund it generously", effects: { treasuryDelta: -400, popularityDelta: 5, stabilityDelta: 2 } },
      { id: "modest", label: "Keep it modest", effects: { treasuryDelta: -100, popularityDelta: 1 } },
    ],
  },
  {
    id: "border-incident",
    title: "Border Incident",
    prompt: "A skirmish at the border rattles nerves.",
    icon: "stability",
    needs: "neighbours",
    options: [
      { id: "diplomacy", label: "Send diplomats", effects: { stabilityDelta: 4, treasuryDelta: -300 } },
      { id: "hardline", label: "Take a hard line", effects: { popularityDelta: 6, stabilityDelta: -4 } },
    ],
  },
  {
    id: "tax-audit",
    title: "Audit Findings",
    prompt: "Auditors find room to squeeze more revenue.",
    icon: "treasury",
    options: [
      { id: "squeeze", label: "Squeeze harder", effects: { treasuryDelta: 700, popularityDelta: -5 } },
      { id: "ease", label: "Ease up", effects: { popularityDelta: 4, treasuryDelta: -100 } },
    ],
  },
  {
    id: "grain-surplus",
    title: "Grain Surplus",
    prompt: "This season's yield exceeds every estimate.",
    icon: "food",
    options: [
      { id: "sell", label: "Sell the surplus", effects: { treasuryDelta: 500, foodDelta: -50000 } },
      { id: "store", label: "Store it for lean times", effects: { foodDelta: 30000 } },
    ],
  },
  {
    id: "veterans-parade",
    title: "Veterans' Parade",
    prompt: "Veterans ask for a parade in their honor.",
    icon: "population",
    options: [
      { id: "grand", label: "Throw a grand parade", effects: { treasuryDelta: -500, popularityDelta: 7 } },
      { id: "simple", label: "Keep it simple", effects: { popularityDelta: 1 } },
    ],
  },

  // --- Genuinely rough ones: unlike everything above, neither option here
  // is a real win — both cost you something, and the choice is which cost
  // you'd rather carry.
  {
    id: "epidemic-outbreak",
    title: "Epidemic Outbreak",
    prompt: "A fever spreads through the crowded districts.",
    icon: "population",
    options: [
      { id: "quarantine", label: "Quarantine the districts", effects: { treasuryDelta: -900, stabilityDelta: -4 } },
      { id: "let-it-pass", label: "Let it run its course", effects: { populationDelta: -400, popularityDelta: -6 } },
    ],
  },
  {
    id: "bridge-collapse",
    title: "Bridge Collapse",
    prompt: "A key river crossing gives way under its own age.",
    icon: "industry",
    options: [
      { id: "rebuild", label: "Rebuild it properly", effects: { treasuryDelta: -1000 } },
      { id: "patch", label: "Patch it and move on", effects: { stabilityDelta: -6, popularityDelta: -3 } },
    ],
  },
  {
    id: "corruption-scandal",
    title: "Corruption Scandal",
    prompt: "A minister close to you is caught skimming public funds.",
    icon: "popularity",
    options: [
      { id: "cover-up", label: "Cover it up", effects: { popularityDelta: -5, stabilityDelta: -3 } },
      { id: "prosecute", label: "Prosecute publicly", effects: { treasuryDelta: -300, stabilityDelta: -6, popularityDelta: 2 } },
    ],
  },
  {
    id: "harsh-winter",
    title: "Harsh Winter",
    prompt: "An early frost catches the granaries half-stocked.",
    icon: "stability",
    options: [
      { id: "subsidize", label: "Emergency heating subsidies", effects: { treasuryDelta: -700, stabilityDelta: 2 } },
      { id: "ration", label: "Ration fuel and endure it", effects: { stabilityDelta: -5, popularityDelta: -4 } },
    ],
  },
  // --- Good for the economy, bad for the vote ----------------------------
  {
    id: "austerity-budget",
    title: "Budget Shortfall",
    prompt: "Treasury officials propose cutting public works to balance the books.",
    icon: "treasury",
    options: [
      { id: "cut", label: "Cut spending", effects: { treasuryDelta: 1500, popularityDelta: -8 } },
      { id: "spend", label: "Keep the works going", effects: { treasuryDelta: -300, popularityDelta: 2 } },
    ],
  },
  {
    id: "bread-prices",
    title: "Bread Prices",
    prompt: "Millers want to raise bread prices after a costly year.",
    icon: "food",
    options: [
      { id: "allow", label: "Let prices rise", effects: { treasuryDelta: 700, popularityDelta: -6 } },
      { id: "cap", label: "Cap prices, pay the millers", effects: { treasuryDelta: -800, popularityDelta: 4 } },
    ],
  },
  {
    id: "state-forests",
    title: "Timber Offer",
    prompt: "A timber company offers good money for the old state forests.",
    icon: "treasury",
    options: [
      { id: "sell", label: "Sell the forests", effects: { treasuryDelta: 1800, popularityDelta: -7, stabilityDelta: -2 } },
      { id: "keep", label: "Keep them for the people", effects: { popularityDelta: 2 } },
    ],
  },
  {
    id: "railway-concession",
    title: "Railway Concession",
    prompt: "Foreign investors will build a railway, if they get the tolls for twenty years.",
    icon: "industry",
    options: [
      { id: "accept", label: "Accept their terms", effects: { treasuryDelta: 2200, popularityDelta: -9 } },
      { id: "refuse", label: "Refuse, stay independent", effects: { popularityDelta: 2 } },
    ],
  },
  {
    id: "long-shifts",
    title: "Longer Shifts",
    prompt: "Factory owners ask to extend the working day through the busy season.",
    icon: "industry",
    options: [
      { id: "allow", label: "Allow longer shifts", effects: { treasuryDelta: 1000, popularityDelta: -6, stabilityDelta: -3 } },
      { id: "forbid", label: "Protect the workers", effects: { treasuryDelta: -200, popularityDelta: 5 } },
    ],
  },
  // --- Situational: these only come up when the country is actually in
  // that trouble (see each condition), and win the monthly pick over the
  // generic ones above when they can (see pickDecision).
  {
    id: "coal-shortage",
    title: "Coal Runs Low",
    prompt: "Families are burning their furniture to stay warm.",
    icon: "coal",
    condition: coalRunningOut,
    options: [
      { id: "subsidise", label: "Subsidise fuel for the poor", effects: { treasuryDelta: -900, stabilityDelta: 4, popularityDelta: 2 } },
      { id: "forests", label: "Open the state forests", effects: { popularityDelta: 3, stabilityDelta: -5 } },
    ],
  },
  {
    id: "housing-protest",
    title: "Housing Protest",
    prompt: "Families without a roof are camping outside parliament.",
    icon: "housing",
    condition: manyHomeless,
    options: [
      { id: "shelters", label: "Fund emergency shelters", effects: { treasuryDelta: -800, popularityDelta: 5, stabilityDelta: 2 } },
      { id: "clear", label: "Clear the camps", effects: { stabilityDelta: 3, popularityDelta: -7, populationDelta: -200 } },
    ],
  },
  {
    id: "general-strike",
    title: "General Strike",
    prompt: "Unions threaten to shut every works in the country over jobs and hours.",
    icon: "industry",
    needs: "unrest",
    condition: workersRestless,
    options: [
      { id: "concede", label: "Meet their demands", effects: { treasuryDelta: -700, popularityDelta: 5 } },
      { id: "break", label: "Break the strike", effects: { stabilityDelta: -5, popularityDelta: -4, treasuryDelta: 300 } },
    ],
  },
  {
    id: "harvest-glut",
    title: "Harvest Glut",
    prompt: "The granaries overflow and grain prices collapse for the farmers.",
    icon: "food",
    condition: harvestGlut,
    options: [
      { id: "buy", label: "Buy the surplus at fair prices", effects: { treasuryDelta: -600, popularityDelta: 5 } },
      { id: "export", label: "Ship it abroad cheaply", effects: { treasuryDelta: 800, foodDelta: -40000, popularityDelta: -3 } },
    ],
  },
  {
    id: "debt-crisis",
    title: "Creditors at the Door",
    prompt: "The banks want money back before they roll over your loans.",
    icon: "treasury",
    condition: (state) => isDebtDangerous(state.debt),
    options: [
      { id: "sell", label: "Sell state assets", effects: { treasuryDelta: 2000, popularityDelta: -7 } },
      { id: "levy", label: "Raise an emergency levy", effects: { treasuryDelta: 1300, stabilityDelta: -5 } },
    ],
  },
  {
    id: "street-unrest",
    title: "Unrest in the Streets",
    prompt: "Angry crowds fill the squares of the capital.",
    icon: "stability",
    needs: "unrest",
    condition: (state) => state.stats.stability < DECISION_UNREST_STABILITY,
    options: [
      { id: "reform", label: "Promise reforms", effects: { treasuryDelta: -600, popularityDelta: 4, stabilityDelta: 3 } },
      { id: "curfew", label: "Declare a curfew", effects: { stabilityDelta: 7, popularityDelta: -7 } },
    ],
  },
  // The nations' story letters, sent only by their chapters (domain/chapters/stories).
  ...ASTRAVIA_LETTERS,
  ...CALDENREICH_LETTERS,
  ...VELDORIA_LETTERS,
];
