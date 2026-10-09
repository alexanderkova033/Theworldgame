// Foreign affairs: the player can't govern the neighboring nations, but can
// lean on them. Pressuring a neighbor shifts its electorate toward the party
// you back — harder when your own government is popular and stable, and it
// can backfire when it isn't. A neighbor ruled by the party you backed is
// "friendly" and opens up better trade (an income bonus).
import {
  FOREIGN_MEDDLING_CHANCE_PER_MONTH,
  FOREIGN_MEDDLING_SUPPORT,
  FOREIGN_SUPPORT_DRIFT,
  FOREIGN_SUPPORT_NOISE,
  FOREIGN_TAKEOVER_THRESHOLD,
  FRIENDLY_GOVERNMENT_INCOME_BONUS,
  PRESSURE_BASE,
  PRESSURE_MAX,
  PRESSURE_MIN,
  PRESSURE_OFFSET,
} from "../constants";
import type { CountryStats } from "../country/types";
import { NATIONS } from "../nations/nationData";
import { getPartiesForNation } from "../parties/partyRules";
import type { ForeignGovernment } from "./types";

function clampSupport(value: number): number {
  return Math.min(95, Math.max(5, value));
}

// Two parties, so one number decides both shares.
function withSupport(gov: ForeignGovernment, partyId: string, share: number): ForeignGovernment {
  const otherId = Object.keys(gov.support).find((id) => id !== partyId)!;
  const clamped = clampSupport(share);
  return { ...gov, support: { [partyId]: clamped, [otherId]: 100 - clamped } };
}

export function createForeignPolitics(playerNationId: string): Record<string, ForeignGovernment> {
  const result: Record<string, ForeignGovernment> = {};
  for (const nation of NATIONS) {
    if (nation.id === playerNationId) continue;
    const [a, b] = getPartiesForNation(nation.id);
    const shareA = Math.round(40 + Math.random() * 20);
    result[nation.id] = {
      rulingPartyId: shareA >= 50 ? a.id : b.id,
      support: { [a.id]: shareA, [b.id]: 100 - shareA },
      backedPartyId: null,
    };
  }
  return result;
}

// How much one push moves a neighbor's electorate, from how strong your own
// government looks at home.
export function getPressureStrength(stats: CountryStats): number {
  const raw = (PRESSURE_BASE * (stats.popularity + stats.stability)) / 100 - PRESSURE_OFFSET;
  return Math.min(PRESSURE_MAX, Math.max(PRESSURE_MIN, Math.round(raw * 10) / 10));
}

export function applyPressure(gov: ForeignGovernment, partyId: string, strength: number): ForeignGovernment {
  return { ...withSupport(gov, partyId, gov.support[partyId] + strength), backedPartyId: partyId };
}

export function isFriendly(gov: ForeignGovernment): boolean {
  return gov.backedPartyId !== null && gov.rulingPartyId === gov.backedPartyId;
}

export function getFriendlyCount(foreignPolitics: Record<string, ForeignGovernment>): number {
  return Object.values(foreignPolitics).filter(isFriendly).length;
}

export function getDiplomacyIncomeMultiplier(foreignPolitics: Record<string, ForeignGovernment>): number {
  return 1 + getFriendlyCount(foreignPolitics) * FRIENDLY_GOVERNMENT_INCOME_BONUS;
}

// Monthly: every neighbor's electorate relaxes a little toward an even split
// (with some noise), and a challenger that's climbed past the threshold
// takes power. Returns which nations changed government, for the event log.
export function updateForeignPolitics(foreignPolitics: Record<string, ForeignGovernment>): {
  foreignPolitics: Record<string, ForeignGovernment>;
  changes: Array<{ nationId: string; newRulingPartyId: string }>;
} {
  const next: Record<string, ForeignGovernment> = {};
  const changes: Array<{ nationId: string; newRulingPartyId: string }> = [];
  for (const [nationId, gov] of Object.entries(foreignPolitics)) {
    const ruler = gov.rulingPartyId;
    const rulerShare = gov.support[ruler];
    const noise = (Math.random() * 2 - 1) * FOREIGN_SUPPORT_NOISE;
    let updated = withSupport(gov, ruler, rulerShare + (50 - rulerShare) * FOREIGN_SUPPORT_DRIFT + noise);
    const challenger = Object.keys(updated.support).find((id) => id !== ruler)!;
    if (updated.support[challenger] >= FOREIGN_TAKEOVER_THRESHOLD) {
      updated = { ...updated, rulingPartyId: challenger };
      changes.push({ nationId, newRulingPartyId: challenger });
    }
    next[nationId] = updated;
  }
  return { foreignPolitics: next, changes };
}

export interface ForeignMeddling {
  nationId: string;
  partyId: string; // the neighbour's ruling party, doing the pushing
  supportDelta: number; // what it does to your support: + if it backs you, − if it backs your rival
}

// Monthly: each neighbour may lean on your elections. A friendly government
// (ruled by the party you backed) campaigns for you; any other funds your
// opposition. So who governs next door matters in both directions.
export function rollForeignMeddling(foreignPolitics: Record<string, ForeignGovernment>): ForeignMeddling[] {
  const moves: ForeignMeddling[] = [];
  for (const [nationId, gov] of Object.entries(foreignPolitics)) {
    if (Math.random() >= FOREIGN_MEDDLING_CHANCE_PER_MONTH) continue;
    moves.push({
      nationId,
      partyId: gov.rulingPartyId,
      supportDelta: isFriendly(gov) ? FOREIGN_MEDDLING_SUPPORT : -FOREIGN_MEDDLING_SUPPORT,
    });
  }
  return moves;
}
