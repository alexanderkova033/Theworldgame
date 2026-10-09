// A neighboring nation's government, as far as the player can influence it.
// Each nation has exactly two parties (see domain/parties/partyData.ts);
// `support` is each one's share of that nation's electorate, summing to 100.
export interface ForeignGovernment {
  rulingPartyId: string;
  support: Record<string, number>;
  backedPartyId: string | null; // the party the player last pressured in favor of — "friendly" if it's in power
}
