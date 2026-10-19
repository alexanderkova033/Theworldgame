// Regiments: trained soldiers, paid by the day, that stand on the map in a
// province and march from one to the next (see militaryRules.ts). Yours and
// the neighbours' are kept in one list, each marked with its nation. The
// militia is something else: companies kept at home to put down uprisings
// (see domain/uprising).

export interface Regiment {
  id: string;
  nationId: string; // whose it is
  provinceId: string; // where it stands; while marching, the province it last left
  strength: number; // 0-100: how many of its men are fit to fight
  trainingDays: number; // days of drill left before it can march; 0 when ready
  march: March | null;
}

// A march under way, one leg at a time.
export interface March {
  route: string[]; // the provinces still to reach, in order: the last is where it is going
  legDays: number; // how long the leg to route[0] takes in all
  daysLeft: number; // days until it reaches route[0]
}
