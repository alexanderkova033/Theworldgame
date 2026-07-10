import { PARTIES } from "./partyData";
import type { Party } from "./types";

export function getPartiesForNation(nationId: string): Party[] {
  return PARTIES.filter((party) => party.nationId === nationId);
}

export function getParty(partyId: string): Party {
  const party = PARTIES.find((p) => p.id === partyId);
  if (!party) throw new Error(`Unknown party: ${partyId}`);
  return party;
}

// Every nation has exactly two parties (see partyData.ts) — whichever one
// the player didn't pick is automatically their opposition.
export function getRivalParty(partyId: string): Party {
  const party = getParty(partyId);
  const rival = PARTIES.find((p) => p.nationId === party.nationId && p.id !== partyId);
  if (!rival) throw new Error(`No rival party found for: ${partyId}`);
  return rival;
}
