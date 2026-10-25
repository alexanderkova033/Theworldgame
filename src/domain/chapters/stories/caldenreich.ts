// Caldenreich's story: the Chancellor's Kingdom (ROADMAP step 6, H). An old
// kingdom proud of its schools and its order, with a king growing old.
// Eight beats, the last told one of two ways by who was backed as heir.
// When each opens and what each asks is checked in
// application/stories/caldenreich.ts; this file is the words.
//
// Provinces named: Ashford (province-3-west, -east, the coast), Duskhaven
// (province-6-west, -east, the old pits) and Caldermoor, the capital's
// (province-5-west).
import type { DecisionDefinition } from "../../decisions/types";
import type { ChapterData } from "../chapterData";

const WEST_ASHFORD = "province-3-west";
const EAST_ASHFORD = "province-3-east";
const WEST_DUSKHAVEN = "province-6-west";
const EAST_DUSKHAVEN = "province-6-east";

const LOYALISTS = "caldenreich-crown-loyalists";
const REFORM = "caldenreich-reform-circle";

const EVERY_GROUP = (n: number) => ({ Agrarian: n, Commercial: n, Traditionalist: n, Progressive: n, Labor: n, Nationalist: n });

export const CALDENREICH_CHAPTERS: ChapterData[] = [
  {
    id: "caldenreich:speech",
    nation: "caldenreich",
    title: "The King's Speech",
    opens: [],
    briefing:
      "Old King Albrecht will open the assembly, and by custom he reads a speech his government has written. The whole kingdom will hear what it promises.",
    partyLines: {
      [LOYALISTS]: "The king expects his ministers to speak for the crown.",
      [REFORM]: "Your party wants the speech to speak for the people, and the court is watching to see if it dares.",
    },
    letter: "caldenreich-speech",
    objectives: ["Write the king's speech"],
    until: "",
    by: 5,
    ending: {
      "caldenreich-speech:order": "Caldenreich kept to its old ways, and its order held.",
      "caldenreich-speech:schools": "A school stands in every town of Caldenreich.",
    },
  },
  {
    id: "caldenreich:academy",
    nation: "caldenreich",
    title: "The Academy's Petition",
    opens: [],
    briefing:
      "The Royal Academy is the pride of the kingdom, and it knows it. Its fellows have written to ask for their share of a growing budget, and for new chairs in the sciences.",
    letter: "caldenreich-academy",
    objectives: ["Answer the academy", "Have a scientist at work"],
    until: "",
    after: "caldenreich:speech",
    by: 12,
    ending: { "caldenreich-academy:fund": "The Royal Academy grew into the finest on the continent." },
  },
  {
    id: "caldenreich:seam",
    nation: "caldenreich",
    title: "The Duskhaven Seam",
    opens: [],
    briefing:
      "The oldest pits in Duskhaven have warmed the kingdom for a century. This spring the last of the old seam was cut, and the pit bells rang for the end of it.",
    crisis: { provinceId: WEST_DUSKHAVEN, kind: "seam" },
    objectives: ["Answer the miners of West Duskhaven"],
    until: "",
    after: "caldenreich:academy",
    by: 16,
  },
  {
    id: "caldenreich:guild",
    nation: "caldenreich",
    title: "The Miners Organise",
    opens: [],
    briefing:
      "Duskhaven's miners have formed a guild of their own, and ask the crown to recognise it. The court says a guild is the first step to a strike.",
    letter: "caldenreich-guild",
    objectives: ["Answer the guild"],
    until: "",
    after: "caldenreich:seam",
    by: 21,
    ending: {
      "caldenreich-guild:recognise": "Duskhaven's miners won their guild.",
      "caldenreich-guild:forbid": "The miners' guild was forbidden, and Duskhaven did not forget it.",
    },
  },
  {
    id: "caldenreich:winter",
    nation: "caldenreich",
    title: "The Long Winter",
    opens: [],
    briefing:
      "This is the coldest winter in living memory. The rivers have frozen to the sea, and in the towns the poor are burning their furniture.",
    letter: "caldenreich-winter",
    objectives: ["Answer the poor"],
    until: "",
    after: "caldenreich:guild",
    by: 26,
    ending: { "caldenreich-winter:forests": "In the long winter, the royal forests warmed the poor." },
  },
  {
    id: "caldenreich:heir",
    nation: "caldenreich",
    title: "The King Falls Ill",
    opens: [],
    briefing:
      "King Albrecht has taken to his bed, and the physicians do not expect him to rise. The court must choose whom to stand behind: Prince Konrad, who would rule as his father did, or Princess Elisabet, who speaks of reform.",
    partyLines: {
      [LOYALISTS]: "The Loyalists have always stood by the line of the crown.",
      [REFORM]: "The Circle has its hopes set on the princess.",
    },
    letter: "caldenreich-heir",
    objectives: ["Choose whom to back"],
    until: "",
    after: "caldenreich:winter",
    by: 32,
  },
  {
    id: "caldenreich:ashford",
    nation: "caldenreich",
    title: "The Ashford Floods",
    opens: [],
    briefing:
      "While the court waits on the king, the spring tides have broken over the sea walls at East Ashford.",
    crisis: { provinceId: EAST_ASHFORD, kind: "flood" },
    objectives: ["Put East Ashford right"],
    until: "",
    after: "caldenreich:heir",
    by: 41,
  },
  // The last beat, one way or the other, by who was backed as heir.
  {
    id: "caldenreich:konrad",
    nation: "caldenreich",
    title: "The Coronation of King Konrad",
    opens: [],
    briefing: "King Albrecht is dead, and Prince Konrad is to be crowned. The court wants to know what kind of day it will be.",
    letter: "caldenreich-konrad",
    objectives: ["Crown the king", "Win the third election"],
    until: "",
    after: "caldenreich:ashford",
    ending: {
      "caldenreich-konrad:grand": "King Konrad was crowned in the grandest ceremony the kingdom had ever seen.",
      "caldenreich-konrad:modest": "King Konrad was crowned quietly, and the treasury thanked him for it.",
    },
  },
  {
    id: "caldenreich:elisabet",
    nation: "caldenreich",
    title: "The Coronation of Queen Elisabet",
    opens: [],
    briefing: "King Albrecht is dead, and Princess Elisabet is to be crowned. She asks whether she should be crowned under a charter of rights.",
    letter: "caldenreich-elisabet",
    objectives: ["Crown the queen", "Win the third election"],
    until: "",
    after: "caldenreich:ashford",
    ending: {
      "caldenreich-elisabet:charter": "Queen Elisabet was crowned under a charter of rights.",
      "caldenreich-elisabet:old": "Queen Elisabet was crowned the old way.",
    },
  },
];

// The letters, each with two answers. What an answer does beyond its
// numbers is its outcome (application/storyOutcome.ts).
export const CALDENREICH_LETTERS: DecisionDefinition[] = [
  {
    id: "caldenreich-speech",
    story: true,
    title: "The Speech from the Throne",
    prompt: "What shall the king promise the kingdom?",
    icon: "stability",
    options: [
      { id: "order", label: "Order and the old ways", effects: { stabilityDelta: 5 }, outcome: { groups: { Traditionalist: 12, Progressive: -10 } } },
      {
        id: "schools",
        label: "A school in every town",
        effects: {},
        outcome: { groups: { Progressive: 12, Traditionalist: -8 }, build: [{ provinceId: WEST_ASHFORD, type: "education", count: 1 }] },
      },
    ],
  },
  {
    id: "caldenreich-academy",
    story: true,
    title: "The Academy's Share",
    prompt: "The Royal Academy asks for new chairs in the sciences, and the money to fill them.",
    icon: "research",
    options: [
      {
        id: "fund",
        label: "Fund the academy",
        effects: { treasuryDelta: -1500 },
        outcome: { groups: { Progressive: 5 }, lasting: { effects: { researchMultiplier: 1.2 }, days: 720, why: "The academy's new chairs" } },
      },
      { id: "treasury", label: "The treasury comes first", effects: {}, outcome: { groups: { Progressive: -8, Traditionalist: 3 } } },
    ],
  },
  {
    id: "caldenreich-guild",
    story: true,
    title: "The Miners' Guild",
    prompt: "Duskhaven's miners ask the crown to recognise their guild.",
    icon: "population",
    options: [
      {
        id: "recognise",
        label: "Recognise the guild",
        effects: {},
        outcome: { groups: { Labor: 10, Traditionalist: -5 }, lasting: { effects: { incomeMultiplier: 0.95 }, days: 360, why: "The guild's wages" } },
      },
      {
        id: "forbid",
        label: "Forbid it",
        effects: {},
        outcome: {
          groups: { Labor: -10 },
          order: [
            { provinceId: WEST_DUSKHAVEN, change: -15 },
            { provinceId: EAST_DUSKHAVEN, change: -15 },
          ],
        },
      },
    ],
  },
  {
    id: "caldenreich-winter",
    story: true,
    title: "Fuel for the Poor",
    prompt: "The poor are freezing in the towns. What will the crown give them?",
    icon: "coal",
    options: [
      {
        id: "forests",
        label: "Open the royal forests to the poor",
        effects: {},
        outcome: { groups: { Agrarian: 5, Traditionalist: -5 }, lasting: { effects: { heatingMultiplier: 0.85 }, days: 120, why: "The royal forests opened to the poor" } },
      },
      { id: "coal", label: "Coal from the treasury", effects: { treasuryDelta: -1500 }, outcome: { groups: EVERY_GROUP(2) } },
    ],
  },
  {
    id: "caldenreich-heir",
    story: true,
    title: "The Heir",
    prompt: "Whom will your government stand behind?",
    icon: "popularity",
    options: [
      { id: "konrad", label: "Back Prince Konrad", effects: {}, outcome: { groups: { Traditionalist: 10, Progressive: -5 } } },
      { id: "elisabet", label: "Back Princess Elisabet", effects: {}, outcome: { groups: { Progressive: 10, Traditionalist: -10 } } },
    ],
  },
  {
    id: "caldenreich-konrad",
    story: true,
    title: "King Konrad's Coronation",
    prompt: "How shall the new king be crowned?",
    icon: "popularity",
    options: [
      { id: "grand", label: "A grand coronation", effects: { treasuryDelta: -2500 }, outcome: { groups: { ...EVERY_GROUP(2), Traditionalist: 10 } } },
      { id: "modest", label: "A modest one", effects: { treasuryDelta: -500, stabilityDelta: 3 } },
    ],
  },
  {
    id: "caldenreich-elisabet",
    story: true,
    title: "Queen Elisabet's Coronation",
    prompt: "Shall the new queen be crowned under a charter of rights?",
    icon: "popularity",
    options: [
      {
        id: "charter",
        label: "Crown her with a charter of rights",
        effects: {},
        outcome: { groups: { Progressive: 10, Traditionalist: -8 }, lasting: { effects: { supportTarget: 2 }, days: 720, why: "Queen Elisabet's charter" } },
      },
      { id: "old", label: "Crown her the old way", effects: {}, outcome: { groups: { Traditionalist: 5 } } },
    ],
  },
];
