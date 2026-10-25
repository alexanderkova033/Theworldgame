// Astravia's story: the Harvest Republic (ROADMAP step 6, G). A young
// republic that promised land to the families who farm it, and the years in
// which that promise falls due. Eight beats, the sixth told one of two ways
// by the first choice. When each opens and what each asks is checked in
// application/stories/astravia.ts; this file is the words.
//
// Provinces named: Thornwick (province-8-north, -south), the Marrow Coast
// (province-2-west, -east), North Redgate, the capital (province-7-north),
// and the Kestrel Isles (island-1).
import type { DecisionDefinition } from "../../decisions/types";
import type { ChapterData } from "../chapterData";

const THORNWICK = "province-8-north";
const THORNWICK_SOUTH = "province-8-south";
const MARROW_WEST = "province-2-west";
const MARROW_EAST = "province-2-east";
const CAPITAL = "province-7-north";

const UNION = "astravia-harvest-union";
const ASSEMBLY = "astravia-merchants-assembly";

export const ASTRAVIA_CHAPTERS: ChapterData[] = [
  {
    id: "astravia:promise",
    nation: "astravia",
    title: "The Founders' Promise",
    opens: [],
    briefing:
      "When the republic was founded, its founders promised every family that works the land a field of its own. Fifty years on, the good land of Thornwick still belongs to a few old estates, and the farmers' petition has reached your desk.",
    partyLines: {
      [UNION]: "Your party was founded on that promise, and the farmers expect you to keep it.",
      [ASSEMBLY]: "The estates' owners sit on your party's benches, and they expect you to remember it.",
    },
    letter: "astravia-petition",
    objectives: ["Answer the farmers", "Build a farm in Thornwick"],
    until: "",
    by: 5,
    ending: { "astravia-petition:keep": "Thornwick's fields belong to the families who farm them." },
  },
  {
    id: "astravia:flood",
    nation: "astravia",
    title: "The Marrow in Flood",
    opens: [],
    briefing:
      "The summer rains have swollen the Marrow, and the river is over its banks along the coast. West Marrow Coast is under water, and how the country answers will be remembered there.",
    crisis: { provinceId: MARROW_WEST, kind: "flood" },
    objectives: ["Put West Marrow Coast right"],
    until: "",
    after: "astravia:promise",
    by: 8,
  },
  {
    id: "astravia:lean-year",
    nation: "astravia",
    title: "A Lean Year",
    opens: [],
    briefing:
      "Blight has come to the wheat on the Redgate plains, and the harvest will be thin. The granaries can carry the plains through, or the grain can go abroad while the price is high. The election is not far off.",
    letter: "astravia-lean-year",
    objectives: ["Answer the plains", "Keep six months of food in store"],
    until: "",
    after: "astravia:flood",
    by: 16,
    ending: {
      "astravia-lean-year:granaries": "In the lean year the granaries were opened, and nobody went hungry.",
      "astravia-lean-year:sell": "In the lean year the grain went abroad while the plains went hungry.",
    },
  },
  {
    id: "astravia:coast",
    nation: "astravia",
    title: "The Coast Asks for a Say",
    opens: [],
    briefing:
      "The elders of the Marrow Coast's fishing towns have come to the capital. They feed the country and pay its taxes, they say, yet the assembly is all farmers and merchants. They ask for seats of their own, and a harbour.",
    letter: "astravia-charter",
    objectives: ["Answer the elders", "Have a harbour on the Marrow Coast"],
    until: "",
    after: "astravia:lean-year",
    by: 26,
    ending: {
      "astravia-charter:grant": "The Marrow Coast sits in the assembly, and its harbour is the busiest in the republic.",
      "astravia-charter:refuse": "The Marrow Coast never got its say.",
    },
  },
  {
    id: "astravia:island",
    nation: "astravia",
    title: "The Island over the Water",
    opens: [],
    briefing:
      "On a clear day the Kestrel Isles can be seen from the Marrow Coast. Their fishing folk trade with our boats, and the neighbours have noticed them too. Their elders have sent to ask what the republic wants of them.",
    letter: "astravia-kestrel",
    objectives: ["Scout the Kestrel Isles", "Hold an island"],
    until: "",
    after: "astravia:coast",
    by: 34,
  },
  // The sixth beat, one way or the other, by what was done with the promise.
  {
    id: "astravia:new-farmers",
    nation: "astravia",
    title: "The New Farmers",
    opens: [],
    briefing:
      "Thornwick's new farmers have had their first good years on land of their own. Their barns are full, and they have sent a share of the harvest to the capital as thanks.",
    letter: "astravia-new-farmers",
    objectives: ["Answer Thornwick"],
    until: "",
    after: "astravia:island",
  },
  {
    id: "astravia:thornwick-rises",
    nation: "astravia",
    title: "Thornwick Rises",
    opens: [],
    briefing:
      "The farmers of Thornwick have waited for their land long enough. They have marched on the estates, and the estate owners demand that the government put them down.",
    letter: "astravia-thornwick-rises",
    objectives: ["Answer Thornwick"],
    until: "",
    after: "astravia:island",
    ending: {
      "astravia-thornwick-rises:grant": "The founders' promise was kept in the end, at twice the price.",
      "astravia-thornwick-rises:crush": "The founders' promise was never kept, and Thornwick remembers.",
    },
  },
  {
    id: "astravia:felling",
    nation: "astravia",
    title: "The Great Felling",
    opens: [],
    briefing:
      "Thornwick's forest has fed the republic's sawmills since the founding. This year the last of the old trees in South Thornwick came down, and the foresters ask what is to become of it.",
    crisis: { provinceId: THORNWICK_SOUTH, kind: "felling" },
    objectives: ["Answer the foresters"],
    until: "",
    after: ["astravia:new-farmers", "astravia:thornwick-rises"],
    by: 46,
  },
  {
    id: "astravia:founding-day",
    nation: "astravia",
    title: "Founding Day",
    opens: [],
    briefing:
      "The republic turns fifty this summer. The capital wants a festival, and the founders' families want to know what became of their promise.",
    letter: "astravia-fiftieth",
    objectives: ["Mark Founding Day", "Win the third election"],
    until: "",
    after: "astravia:felling",
    by: 50,
    ending: {
      "astravia-fiftieth:festival": "Founding Day was the grandest the capital had ever seen.",
      "astravia-fiftieth:school": "The republic marked its fiftieth year with a school in the capital.",
    },
  },
];

// The letters, each with two answers (the lean year's, three). What an answer does beyond its
// numbers is its outcome (application/storyOutcome.ts).
export const ASTRAVIA_LETTERS: DecisionDefinition[] = [
  {
    id: "astravia-petition",
    story: true,
    title: "The Farmers' Petition",
    prompt: "The farmers of Thornwick ask for the land the founders promised them. The estates will not give it up quietly.",
    icon: "popularity",
    options: [
      {
        id: "keep",
        label: "Break up the estates",
        effects: {},
        outcome: {
          groups: { Agrarian: 15, Commercial: -15 },
          build: [{ provinceId: THORNWICK, type: "farm", count: 2 }],
          lasting: { effects: { incomeMultiplier: 0.88 }, days: 360, why: "The estate owners took their money abroad" },
        },
      },
      { id: "wait", label: "Let the promise wait", effects: {}, outcome: { groups: { Commercial: 10, Agrarian: -15 } } },
    ],
  },
  {
    id: "astravia-lean-year",
    story: true,
    title: "The Thin Harvest",
    prompt: "Blight has thinned the wheat on the Redgate plains. The granaries are full, and so are the merchants' order books abroad.",
    icon: "food",
    options: [
      { id: "granaries", label: "Open the granaries", effects: { foodDelta: -120000 }, outcome: { groups: { Agrarian: 6, Labor: 6 } } },
      {
        id: "sell",
        label: "Sell the surplus abroad",
        effects: { treasuryDelta: 2000, stabilityDelta: -3 },
        outcome: { groups: { Agrarian: -3, Commercial: -3, Traditionalist: -3, Progressive: -3, Labor: -3, Nationalist: -3 } },
      },
      {
        id: "ration",
        label: "Ration the bread",
        effects: { popularityDelta: -3 },
        outcome: { lasting: { effects: { foodConsumptionMultiplier: 0.9 }, days: 120, why: "Bread rationed in the lean year" } },
      },
    ],
  },
  {
    id: "astravia-charter",
    story: true,
    title: "The Coast's Charter",
    prompt: "The Marrow Coast asks for seats in the assembly and a harbour of its own.",
    icon: "stability",
    options: [
      {
        id: "grant",
        label: "Grant the coast its charter",
        effects: { treasuryDelta: -500 },
        outcome: {
          groups: { Commercial: 5 },
          order: [
            { provinceId: MARROW_WEST, change: 15 },
            { provinceId: MARROW_EAST, change: 15 },
          ],
          build: [{ provinceId: MARROW_EAST, type: "harbour", count: 1 }],
        },
      },
      {
        id: "refuse",
        label: "The assembly is enough",
        effects: {},
        outcome: {
          groups: { Commercial: -5 },
          order: [
            { provinceId: MARROW_WEST, change: -10 },
            { provinceId: MARROW_EAST, change: -10 },
          ],
          taxRelief: { provinceId: MARROW_WEST, days: 180 },
        },
      },
    ],
  },
  {
    id: "astravia-kestrel",
    story: true,
    title: "The Kestrel Folk",
    prompt: "The elders of the Kestrel Isles ask what the republic wants of them.",
    icon: "population",
    options: [
      { id: "settle", label: "Ask to live among them", effects: {}, outcome: { groups: { Progressive: 8, Nationalist: -5 } } },
      { id: "rights", label: "Buy their fishing rights", effects: { treasuryDelta: -1000, foodDelta: 30000 }, outcome: { groups: { Nationalist: 5 } } },
    ],
  },
  {
    id: "astravia-new-farmers",
    story: true,
    title: "The New Farmers Prosper",
    prompt: "Thornwick's new farmers send a share of their harvest to the capital.",
    icon: "food",
    options: [
      {
        id: "celebrate",
        label: "Celebrate with them",
        effects: {},
        outcome: { groups: { Agrarian: 5 }, lasting: { effects: { farmYieldMultiplier: 1.1 }, days: 720, why: "Thornwick's new farmers' good years" } },
      },
      { id: "tax", label: "Tax their good years", effects: { treasuryDelta: 1500 }, outcome: { groups: { Agrarian: -10 } } },
    ],
  },
  {
    id: "astravia-thornwick-rises",
    story: true,
    title: "Thornwick Rises",
    prompt: "The farmers of Thornwick have marched on the estates, and will not go home without their land.",
    icon: "uprising",
    options: [
      {
        id: "grant",
        label: "Grant the land now",
        effects: { treasuryDelta: -2000 },
        outcome: { groups: { Agrarian: 10, Commercial: -15 }, build: [{ provinceId: THORNWICK, type: "farm", count: 2 }] },
      },
      { id: "crush", label: "Put it down", effects: {}, outcome: { groups: { Commercial: 5, Agrarian: -10 }, rises: THORNWICK } },
    ],
  },
  {
    id: "astravia-fiftieth",
    story: true,
    title: "The Fiftieth Year",
    prompt: "The republic turns fifty. How shall the day be marked?",
    icon: "popularity",
    options: [
      {
        id: "festival",
        label: "A festival for everyone",
        effects: { treasuryDelta: -2500 },
        outcome: { groups: { Agrarian: 3, Commercial: 3, Traditionalist: 3, Progressive: 3, Labor: 3, Nationalist: 3 } },
      },
      {
        id: "school",
        label: "A quiet day, and a school for the capital",
        effects: { treasuryDelta: -500, stabilityDelta: 2 },
        outcome: { build: [{ provinceId: CAPITAL, type: "education", count: 1 }] },
      },
    ],
  },
];
