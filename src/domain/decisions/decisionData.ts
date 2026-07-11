import type { DecisionDefinition } from "./types";

// Nine short, two-option decisions. Kept deliberately terse — a title, one
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
      { id: "high-road", label: "Take the high road", effects: { popularityDelta: 2, stabilityDelta: 2 } },
    ],
  },
  {
    id: "charity-gala",
    title: "Charity Gala",
    prompt: "Local elites invite your party to a fundraising gala.",
    icon: "treasury",
    options: [
      { id: "attend", label: "Attend, court donors", effects: { treasuryDelta: 800, popularityDelta: -2 } },
      { id: "decline", label: "Decline, stay with the people", effects: { popularityDelta: 4 } },
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
      { id: "ignore", label: "Stay above it", effects: { popularityDelta: 1 } },
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
      { id: "sell", label: "Sell the surplus", effects: { treasuryDelta: 500, foodDelta: -1000 } },
      { id: "store", label: "Store it for lean times", effects: { foodDelta: 1500, popularityDelta: 2 } },
    ],
  },
  {
    id: "veterans-parade",
    title: "Veterans' Parade",
    prompt: "Veterans ask for a parade in their honor.",
    icon: "population",
    options: [
      { id: "grand", label: "Throw a grand parade", effects: { treasuryDelta: -500, popularityDelta: 7 } },
      { id: "simple", label: "Keep it simple", effects: { popularityDelta: 2 } },
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
];
