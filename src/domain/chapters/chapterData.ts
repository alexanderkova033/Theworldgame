// The game unfolds in chapters. A new game shows only what the first winter
// needs; every other system is locked, really locked, until something in
// the world opens it: the exchange opening its doors, the assembly sitting,
// a scholars' petition, the first strike, an envoy's visit. Each chapter
// arrives as a briefing letter with a few objectives, and names what it
// opens. A chapter that waits on luck has a date by which it opens anyway
// (`by`), so bad luck can delay a system but never keep it shut.
//
// What sets each chapter off, and when its objectives are met, is worked
// out in application/chapters.ts; this file is the words and the order.
//
// Besides the chapters that open the game's systems, each nation has a
// story of its own (STORY_CHAPTERS, filled campaign by campaign): chapters
// told only in that nation, one leading to the next, that open nothing, so
// every system still opens when it would. A story chapter may bring a
// letter with a choice, sent once its briefing is read; the choice is
// remembered, for later chapters and for the ending.

// The systems a chapter can open. Building, people, the budget, taxes,
// loans and rallies are open from the first day.
export type Feature = "market" | "laws" | "research" | "unrest" | "voters" | "neighbours" | "ventures" | "army";

// The chapters that open the game's systems.
export type SystemChapterId = "first-winter" | "exchange" | "assembly" | "society" | "streets" | "voters" | "envoys" | "captain" | "army";
// A nation's story chapter: "<nation>:<beat>".
export type StoryChapterId = `${string}:${string}`;
export type ChapterId = SystemChapterId | StoryChapterId;

export interface ChapterData {
  id: ChapterId;
  title: string;
  opens: Feature[];
  briefing: string; // the letter: the situation, in two or three sentences
  objectives: string[]; // in order; their checks are in application/chapters.ts
  until: string; // while it's shut: when it opens, for the locked tab's tooltip
  by?: number; // the month (counted from the start) by which it opens whatever happens
  // A story chapter only:
  nation?: string; // the nation whose story it is
  after?: ChapterId | ChapterId[]; // it opens only once this chapter is done (one of these, when several)
  letter?: string; // a story letter (a decision marked story) sent once the briefing is read
  partyLines?: Record<string, string>; // a line added to the briefing, by the party you lead
  ending?: Record<string, string>; // a line for the ending screen, by the choice made on its letter ("<letter>:<option>")
}

export const CHAPTERS: ChapterData[] = [
  {
    id: "first-winter",
    title: "The First Winter",
    opens: [],
    briefing:
      "The country is yours, in the depth of winter. The granaries hold last autumn's harvest and the coal yards are stocked, but people need homes and the fields must be ready for spring. Get through to the thaw.",
    objectives: ["Build a farm", "Build homes", "See the winter through"],
    until: "",
  },
  {
    id: "exchange",
    title: "The Exchange Opens",
    opens: ["market"],
    briefing:
      "The merchants' exchange in the capital has opened its doors for the year. Wood, ore, coal, grain, fish and food can be bought and sold there, at prices that rise and fall with what's in the warehouses.",
    objectives: ["Buy or sell on the market"],
    until: "Opens when the merchants' exchange opens, early in the first year",
    by: 2,
  },
  {
    id: "assembly",
    title: "The Assembly Sits",
    opens: ["laws"],
    briefing:
      "The assembly has gathered for its first session under your government. Laws can now be put to the vote. Each costs political power and money, and the first law on a path closes the other two for good.",
    objectives: ["Pass a law"],
    until: "Opens when the assembly first sits, in spring, once you have political power to spend",
    by: 6,
  },
  {
    id: "society",
    title: "The Royal Society",
    opens: ["research"],
    briefing:
      "A petition from the capital's scholars asks for a royal charter, and you have granted it. Each field of study now moves forward every day in the direction you choose, faster with scientists and schools.",
    objectives: ["Choose a research direction", "Build a school"],
    until: "Opens when the scholars petition for a charter, by the first harvest at the latest",
    by: 9,
  },
  {
    id: "streets",
    title: "Trouble in the Streets",
    opens: ["unrest"],
    briefing:
      "Order is slipping. Crowds gather and talk turns angry. You may now raise a police force, which steadies the country, and order crackdowns, which calm it at a cost in support. A province left to riot on its own may rise against you; militia companies can be raised to put it down.",
    objectives: ["Hire a police officer"],
    until: "Opens at the first sign of unrest",
    by: 14,
  },
  {
    id: "voters",
    title: "Know Your Voters",
    opens: ["voters"],
    briefing:
      "With an election ahead, your agents have mapped the voters: farmers, merchants, workers and the rest, and how each of them feels about you. Each group can be courted, for political power and money.",
    objectives: ["Court a group"],
    until: "Opens when the election draws near and support is slipping",
    by: 13,
  },
  {
    id: "envoys",
    title: "Envoys Arrive",
    opens: ["neighbours"],
    briefing:
      "The neighbouring nations have taken notice. Their parties meddle in your politics, and you may now meddle in theirs. A friendly government next door means better trade.",
    objectives: ["Back a party abroad"],
    until: "Opens when a neighbour first meddles in your affairs",
    by: 15,
  },
  {
    id: "captain",
    title: "A Captain's Offer",
    opens: ["ventures"],
    briefing:
      "A ship's captain offers to charter ventures to the uncharted islands off the coast. Each venture costs money and time, and brings back whatever the island holds.",
    objectives: ["Charter a venture"],
    until: "Opens when a captain offers to sail for you, in the second year",
    by: 20,
  },
  {
    id: "army",
    title: "A Standing Army",
    opens: ["army"],
    briefing:
      "The neighbours keep regiments, and their colours can be seen drilling along the borders. You may now raise regiments of your own: trained soldiers, paid by the day, who march anywhere in the country and sail to its islands. A regiment standing in a province keeps order there: no uprising starts while it stands, and one already burning is worn down. Tap a regiment on the map, then a province, to send it there.",
    objectives: ["Raise a regiment"],
    until: "Opens when the neighbours' armies are noticed, in the second year",
    by: 24,
  },
];

// Each nation's story, in the order it is told. Empty until its campaign is written (ROADMAP step 6).
export const STORY_CHAPTERS: ChapterData[] = [];

export function getChapter(id: ChapterId): ChapterData {
  return (CHAPTERS.find((c) => c.id === id) ?? STORY_CHAPTERS.find((c) => c.id === id))!;
}

// The chapters a game of this nation is told: the systems', then its story.
export function chaptersFor(nationId: string): ChapterData[] {
  return [...CHAPTERS, ...STORY_CHAPTERS.filter((c) => c.nation === nationId)];
}

export function isStoryChapter(id: ChapterId): id is StoryChapterId {
  return id.includes(":");
}

// The chapter that opens a system.
export function chapterFor(feature: Feature): ChapterData {
  return CHAPTERS.find((c) => c.opens.includes(feature))!;
}

export interface ChapterProgress {
  opened: ChapterId[];
  done: ChapterId[]; // every objective met
  unread: ChapterId[]; // briefings the player hasn't read yet
  deeds: string[]; // one-off things done once, for objectives the country's numbers can't show ("traded", "courted"...), and the choices made on story letters ("<letter>:<option>")
  letters: string[]; // story letters waiting to be sent, the first next
}

export function newChapterProgress(): ChapterProgress {
  return { opened: ["first-winter"], done: [], unread: ["first-winter"], deeds: [], letters: [] };
}

// Saves from before chapters existed: everything is already open, and no
// story is told (its chapters count as done).
export function allChaptersOpen(): ChapterProgress {
  const ids = [...CHAPTERS, ...STORY_CHAPTERS].map((c) => c.id);
  return { opened: ids, done: ids, unread: [], deeds: [], letters: [] };
}

export function isFeatureOpen(state: { chapters?: ChapterProgress }, feature: Feature): boolean {
  if (!state.chapters) return true;
  return state.chapters.opened.includes(chapterFor(feature).id);
}

// The choice made on a story letter, as a deed.
export function choiceDeed(letterId: string, optionId: string): string {
  return `${letterId}:${optionId}`;
}

export function recordDeed<S extends { chapters: ChapterProgress }>(state: S, deed: string): S {
  if (state.chapters.deeds.includes(deed)) return state;
  return { ...state, chapters: { ...state.chapters, deeds: [...state.chapters.deeds, deed] } };
}
