// Veldoria's story: Smoke and Iron (ROADMAP step 6, I). A small country
// that industrialised first, and meets its troubles first. Eight beats, the
// sixth told one of two ways by the first choice. When each opens and what
// each asks is checked in application/stories/veldoria.ts; this file is
// the words.
//
// Provinces named: North Veldshire (province-1-north, beside the capital, and its
// foundries) and Brindlewood (province-4-west, -east, the farmland).
import type { DecisionDefinition } from "../../decisions/types";
import type { ChapterData } from "../chapterData";

const NORTH_VELDSHIRE = "province-1-north";
const WEST_BRINDLEWOOD = "province-4-west";
const EAST_BRINDLEWOOD = "province-4-east";

const GUILD = "veldoria-ironworkers-guild";
const VANGUARD = "veldoria-national-vanguard";

const EVERY_GROUP = (n: number) => ({ Agrarian: n, Commercial: n, Traditionalist: n, Progressive: n, Labor: n, Nationalist: n });

export const VELDORIA_CHAPTERS: ChapterData[] = [
  {
    id: "veldoria:whistle",
    nation: "veldoria",
    title: "The Foundry Whistle",
    opens: [],
    briefing:
      "The great foundries of Veldshire run day and night, and the whistle that ends a shift blows after fourteen hours. The ironworkers ask for ten, by law.",
    partyLines: {
      [GUILD]: "Your party was born on the foundry floor, and the ironworkers expect it to remember.",
      [VANGUARD]: "The foundry masters fund your party, and they say Veldoria's strength is in its long days.",
    },
    letter: "veldoria-whistle",
    objectives: ["Answer the ironworkers"],
    until: "",
    by: 5,
    ending: { "veldoria-whistle:ten": "Veldoria's ironworkers won their ten hours." },
  },
  {
    id: "veldoria:smoke",
    nation: "veldoria",
    title: "Smoke over Veldshire",
    opens: [],
    briefing:
      "In the summer heat the smoke hangs low over the foundry streets of North Veldshire, and a fever has come with it.",
    crisis: { provinceId: NORTH_VELDSHIRE, kind: "fever" },
    objectives: ["See the fever through"],
    until: "",
    after: "veldoria:whistle",
    by: 8,
  },
  {
    id: "veldoria:ore",
    nation: "veldoria",
    title: "Ore for the Furnaces",
    opens: [],
    briefing:
      "Veldoria digs no ore of its own. The foundry masters say the furnaces will go cold without a steady supply, and Caldenreich's hills are full of it.",
    letter: "veldoria-ore",
    objectives: ["Answer the foundry masters"],
    until: "",
    after: "veldoria:smoke",
    by: 13,
    ending: { "veldoria-ore:contract": "Caldenreich's ore fed Veldoria's furnaces." },
  },
  {
    id: "veldoria:commons",
    nation: "veldoria",
    title: "The Brindlewood Commons",
    opens: [],
    briefing:
      "For as long as anyone remembers, the farmers of Brindlewood have grazed their animals on the common land. Now the landlords want to enclose it, for sheep and for mills.",
    letter: "veldoria-commons",
    objectives: ["Answer Brindlewood"],
    until: "",
    after: "veldoria:ore",
    by: 22,
    ending: {
      "veldoria-commons:enclose": "The Brindlewood commons became mills and fields of sheep.",
      "veldoria-commons:protect": "The Brindlewood commons are common land still.",
    },
  },
  {
    id: "veldoria:islands",
    nation: "veldoria",
    title: "Land Beyond the Sea",
    opens: [],
    briefing:
      "Veldoria is the smallest country on the continent, and its people have nowhere to go but the foundries. The islands matter more to it than to anyone, and merchants offer to found a company to settle them.",
    letter: "veldoria-company",
    objectives: ["Answer the merchants", "Hold an island"],
    until: "",
    after: "veldoria:commons",
    by: 30,
    ending: { "veldoria-company:charter": "Veldoria's colonial company flew its flag over the islands." },
  },
  // The sixth beat, one way or the other, by what was done about the hours.
  {
    id: "veldoria:congress",
    nation: "veldoria",
    title: "The Guild's Congress",
    opens: [],
    briefing: "With their ten hours won, the ironworkers have called their first congress, and they have invited the government to speak.",
    letter: "veldoria-congress",
    objectives: ["Answer the congress"],
    until: "",
    after: "veldoria:islands",
    ending: { "veldoria-congress:address": "The ironworkers' congress cheered its government." },
  },
  {
    id: "veldoria:strike",
    nation: "veldoria",
    title: "The General Strike",
    opens: [],
    briefing: "The ironworkers have waited for their ten hours long enough. Every foundry in Veldshire has gone quiet, and the masters demand that the strike be broken.",
    letter: "veldoria-strike",
    objectives: ["Answer the strike"],
    until: "",
    after: "veldoria:islands",
    ending: {
      "veldoria-strike:grant": "The ten hours were won by a general strike.",
      "veldoria-strike:break": "The general strike was broken, and the foundries remember it.",
    },
  },
  {
    id: "veldoria:flood",
    nation: "veldoria",
    title: "The Brindlewood Flood",
    opens: [],
    briefing: "The spring rains have filled the rivers of the plains, and West Brindlewood is under water.",
    crisis: { provinceId: WEST_BRINDLEWOOD, kind: "flood" },
    objectives: ["Put West Brindlewood right"],
    until: "",
    after: ["veldoria:congress", "veldoria:strike"],
    by: 41,
  },
  {
    id: "veldoria:exhibition",
    nation: "veldoria",
    title: "The Great Exhibition",
    opens: [],
    briefing:
      "Veldoria has made more iron, more engines and more smoke than any country on the continent. Its people ask how the country should mark what it has made, and what it cost.",
    letter: "veldoria-exhibition",
    objectives: ["Mark what Veldoria has made", "Win the third election"],
    until: "",
    after: "veldoria:flood",
    by: 50,
    ending: {
      "veldoria-exhibition:machines": "The Great Exhibition showed the world what Veldoria could make.",
      "veldoria-exhibition:memorial": "A memorial stands in Veldshire to those the foundries killed.",
    },
  },
];

// The letters, each with two answers. What an answer does beyond its
// numbers is its outcome (application/storyOutcome.ts).
export const VELDORIA_LETTERS: DecisionDefinition[] = [
  {
    id: "veldoria-whistle",
    story: true,
    title: "The Ten Hours",
    prompt: "The ironworkers ask for a working day of ten hours, by law.",
    icon: "industry",
    options: [
      {
        id: "ten",
        label: "Ten hours, by law",
        effects: {},
        outcome: { groups: { Labor: 12, Commercial: -10 }, lasting: { effects: { industryMultiplier: 0.95 }, days: 360, why: "The ten hours" } },
      },
      {
        id: "foundries",
        label: "The foundries set the hours",
        effects: {},
        outcome: { groups: { Commercial: 8, Labor: -12 }, order: [{ provinceId: NORTH_VELDSHIRE, change: -10 }] },
      },
    ],
  },
  {
    id: "veldoria-ore",
    story: true,
    title: "Caldenreich's Ore",
    prompt: "The foundry masters ask the government to secure ore for the furnaces.",
    icon: "industry",
    options: [
      {
        id: "contract",
        label: "Sign a contract for Caldenreich's ore",
        effects: { treasuryDelta: -1000 },
        outcome: { lasting: { effects: { industryMultiplier: 1.1 }, days: 720, why: "Caldenreich's ore" } },
      },
      { id: "make-do", label: "Make do with what we have", effects: {}, outcome: { groups: { Labor: -5, Nationalist: 5 } } },
    ],
  },
  {
    id: "veldoria-commons",
    story: true,
    title: "Enclosure",
    prompt: "The landlords of Brindlewood ask leave to enclose the common land.",
    icon: "food",
    options: [
      {
        id: "enclose",
        label: "Enclose the commons",
        effects: {},
        outcome: { groups: { Agrarian: -12, Commercial: 8 }, build: [{ provinceId: EAST_BRINDLEWOOD, type: "factory", count: 1 }] },
      },
      { id: "protect", label: "Protect the commons", effects: {}, outcome: { groups: { Agrarian: 10, Commercial: -5 } } },
    ],
  },
  {
    id: "veldoria-company",
    story: true,
    title: "A Colonial Company",
    prompt: "The merchants offer to found a company to settle the islands, with their own money and the crown's blessing.",
    icon: "population",
    options: [
      { id: "charter", label: "Charter the company", effects: { treasuryDelta: -800 }, outcome: { groups: { Nationalist: 10 }, politicalPower: 20 } },
      { id: "homeland", label: "The homeland first", effects: {}, outcome: { groups: { Labor: 5, Nationalist: -8 } } },
    ],
  },
  {
    id: "veldoria-congress",
    story: true,
    title: "The Congress",
    prompt: "The ironworkers' congress has invited the government to speak.",
    icon: "popularity",
    options: [
      { id: "address", label: "Address the congress", effects: { stabilityDelta: 3 }, outcome: { groups: { Labor: 8 } } },
      { id: "away", label: "Keep away", effects: {}, outcome: { groups: { Nationalist: 5 } } },
    ],
  },
  {
    id: "veldoria-strike",
    story: true,
    title: "The Strike",
    prompt: "Every foundry in Veldshire has gone quiet. What will the government do?",
    icon: "uprising",
    options: [
      {
        id: "grant",
        label: "Grant the ten hours now",
        effects: { treasuryDelta: -2000 },
        outcome: { groups: { Labor: 8 }, lasting: { effects: { industryMultiplier: 0.95 }, days: 360, why: "The ten hours" } },
      },
      { id: "break", label: "Break the strike", effects: {}, outcome: { groups: { Commercial: 5, Labor: -10 }, rises: NORTH_VELDSHIRE } },
    ],
  },
  {
    id: "veldoria-exhibition",
    story: true,
    title: "The Exhibition",
    prompt: "How shall Veldoria mark what it has made?",
    icon: "industry",
    options: [
      { id: "machines", label: "Show the world Veldoria's machines", effects: { treasuryDelta: -3000 }, outcome: { groups: { ...EVERY_GROUP(3), Commercial: 8 } } },
      { id: "memorial", label: "Raise a memorial to the foundry dead", effects: { treasuryDelta: -500, stabilityDelta: 5 }, outcome: { groups: { Labor: 6 } } },
    ],
  },
];
