// One name for each thing the player sees. Each entry is the word to use,
// and the words that used to stand for the same thing. tests/vocabulary
// fails if one of those creeps back into the screens or the messages.
// Flavour text (law, research and decision descriptions) may use ordinary
// English: "foreign grain" is fine there.
export interface Term {
  use: string;
  notThese: RegExp[];
}

export const GLOSSARY: Term[] = [
  { use: "Support (the % behind your government)", notThese: [/\bPopularity\b/, /\b[a-z]+ popularity\b/, /\bapproval rating\b/i] },
  { use: "Jobless (people without work)", notThese: [/\b[Oo]ut of work\b/, /\b[Uu]nemployed\b/, /\b[Uu]nemployment\b/] },
  { use: "Police, an officer", notThese: [/\b[Cc]onstables?\b/, /\b[Pp]olicem[ae]n\b/] },
  { use: "Uprising; a province has risen", notThese: [/\b[Rr]ebellions?\b/, /\b[Rr]evolts?\b/, /\b[Ii]nsurrections?\b/] },
  { use: "Militia, a company (kept at home, for uprisings)", notThese: [/\b[Tt]roops\b/, /\b[Ss]oldiers\b/, /\bmilitia regiments?\b/i] },
  { use: "Regiment (the army, on the map)", notThese: [/\b[Dd]ivisions?\b/, /\b[Bb]attalions?\b/, /\b[Uu]nits?\b/] },
  { use: "Neighbours (the other two nations)", notThese: [/\bAbroad\b/, /\b[Ff]oreign affairs\b/] },
  { use: "Venture (a trip to an island)", notThese: [/\b[Ee]xpeditions?\b/] },
  { use: "Group (a share of the voters)", notThese: [/\b[Ff]actions?\b/] },
  { use: "Wages", notThese: [/\b[Ss]alar(y|ies)\b/] },
  { use: "Homes", notThese: [/\b[Hh]ousing\b/] },
  { use: "A research step (one node of the Research tree)", notThese: [/\b[Tt]echnolog(y|ies)\b/] },
  { use: "Build, Money, Politics, Laws, Research, Army, Reports (the windows)", notThese: [/\b(Economy|Trade|Staff) tab\b/] },
];
