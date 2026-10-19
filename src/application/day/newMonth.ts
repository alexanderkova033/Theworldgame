// Step 8 of the day, once the calendar has turned: the rolls that come with
// a new month. A world event every few months, the rival's campaign, the
// neighbours' own politics and their meddling in yours, and the season.
// These land in the new month's ledger.
import { RANDOM_EVENT_INTERVAL_MONTHS, RIVAL_CAMPAIGN_CHANCE_PER_MONTH, WAR_WEARINESS_PER_MONTH } from "../../domain/constants";
import { isEveryNMonths, isFirstDayOfMonth } from "../../domain/country/calendar";
import type { CountryStats, GameDate, GameEvent, GameState } from "../../domain/country/types";
import { isFriendly, rollForeignMeddling, updateForeignPolitics } from "../../domain/diplomacy/diplomacyRules";
import { getNation } from "../../domain/nations/nationRules";
import { applyFactionEffects, applyUniformDelta, type getFactionWeights } from "../../domain/parties/factionRules";
import { getParty } from "../../domain/parties/partyRules";
import { getDifficulty } from "../../domain/difficulty/difficultyData";
import { applyRandomEventEffect, pickRandomEvent, scaleEventLosses } from "../../domain/randomEvents/randomEventRules";
import { pickRivalCampaignMove } from "../rivalCampaignMove";
import { book, bookChange, log, type Day } from "./dayContext";
import { getBurdenRivalSwing } from "../../domain/reign/reignRules";

// The turn of the season, announced on its first day: winter especially,
// since it's when farms stop pulling their weight.
const SEASON_MESSAGES: Record<number, { message: string; severity: GameEvent["severity"] }> = {
  3: { message: "Spring thaw: the fields are workable again.", severity: "info" },
  9: { message: "Harvest season: farms yield their best of the year. Stockpile for winter.", severity: "info" },
  12: { message: "Winter sets in. Farms yield little and grain fields lie fallow until spring.", severity: "warning" },
};

export interface NewMonth {
  stats: CountryStats;
  resources: GameState["resources"];
  factionApproval: GameState["factionApproval"];
  foreignPolitics: GameState["foreignPolitics"];
}

export function turnOfTheMonth(
  day: Day,
  working: GameState,
  date: GameDate,
  today: NewMonth & { isGameOver: boolean; factionWeights: ReturnType<typeof getFactionWeights> },
): NewMonth {
  let { stats, resources, factionApproval, foreignPolitics } = today;
  const difficulty = getDifficulty(working.difficulty);

  // A random world event, every RANDOM_EVENT_INTERVAL_MONTHS.
  if (isEveryNMonths(date, RANDOM_EVENT_INTERVAL_MONTHS)) {
    const randomEvent = pickRandomEvent();
    const applied = applyRandomEventEffect(stats, resources, scaleEventLosses(randomEvent.effect, difficulty.badEventScale));
    bookChange(day, "late", stats, applied.stats, { treasury: "events", food: "events", stability: "events" });
    stats = applied.stats;
    resources = applied.resources;
    log(day, { date, message: `${randomEvent.name}: ${randomEvent.message}`, severity: randomEvent.severity, topic: "world" });
  }

  // The rival party's campaign move, roughly once a month: a visible, mildly
  // random swing that reacts to your own laws and research when the rival
  // feels strongly about one (see rivalCampaignMove.ts).
  if (!today.isGameOver && isFirstDayOfMonth(date) && Math.random() < RIVAL_CAMPAIGN_CHANCE_PER_MONTH * difficulty.rivalChance) {
    const move = pickRivalCampaignMove(working);
    // Harder rivals hit harder; a grudging word of credit stays as it is.
    // A Long Reign's rival machine hits harder still (domain/reign).
    const swing = move.popularityDelta < 0 ? move.popularityDelta * difficulty.rivalSwing * getBurdenRivalSwing(working.burdens) : move.popularityDelta;
    const applied = applyFactionEffects(factionApproval, today.factionWeights, move.effects ?? {}, swing);
    factionApproval = applied.factionApproval;
    book(day, "late", "support", { rival: applied.popularity - stats.popularity });
    stats = { ...stats, popularity: applied.popularity };
    log(day, { date, message: move.message, severity: swing < 0 ? "warning" : "info", topic: "elections" });
  }

  // The neighbours' politics move once a month: their electorates relax
  // toward an even split, and a challenger past the line takes power...
  if (!today.isGameOver && isFirstDayOfMonth(date)) {
    const update = updateForeignPolitics(foreignPolitics);
    foreignPolitics = update.foreignPolitics;
    for (const change of update.changes) {
      const nation = getNation(change.nationId);
      const newParty = getParty(change.newRulingPartyId);
      const friendly = isFriendly(foreignPolitics[change.nationId]);
      log(day, {
        date,
        message: `${nation.name} changes government: the ${newParty.name} takes power${friendly ? ". A friendly government: trade terms improve." : "."}`,
        severity: friendly ? "info" : "warning",
        topic: "elections",
      });
    }

    // ...and they meddle back in yours.
    const relations = Object.fromEntries(Object.entries(working.neighbours).map(([id, n]) => [id, n.relations]));
    for (const move of rollForeignMeddling(foreignPolitics, relations)) {
      const applied = applyUniformDelta(factionApproval, today.factionWeights, move.supportDelta);
      factionApproval = applied.factionApproval;
      book(day, "late", "support", { foreign: applied.popularity - stats.popularity });
      stats = { ...stats, popularity: applied.popularity };
      const nation = getNation(move.nationId);
      const party = getParty(move.partyId);
      log(day, {
        date,
        message:
          move.supportDelta > 0
            ? `${nation.name}'s ${party.name} campaigns for you across the border: support +${move.supportDelta}.`
            : `${nation.name}'s ${party.name} is funding your opposition: support ${move.supportDelta}.`,
        severity: move.supportDelta > 0 ? "info" : "warning",
        topic: "elections",
      });
    }
  }

  // Every month at war wears on the country (see domain/military/warRules.ts).
  if (!today.isGameOver && isFirstDayOfMonth(date)) {
    // A war they started rallies the country instead: no weariness.
    for (const nationId of Object.keys(working.wars).filter((id) => !working.wars[id].byThem)) {
      const applied = applyUniformDelta(factionApproval, today.factionWeights, WAR_WEARINESS_PER_MONTH);
      factionApproval = applied.factionApproval;
      book(day, "late", "support", { war: applied.popularity - stats.popularity });
      stats = { ...stats, popularity: applied.popularity };
      log(day, { date, message: `The war with ${getNation(nationId).name} wears on the country: support ${WAR_WEARINESS_PER_MONTH} with everyone.`, severity: "warning", topic: "army" });
    }
  }

  // The turn of the season.
  const season = isFirstDayOfMonth(date) ? SEASON_MESSAGES[date.month] : undefined;
  if (!today.isGameOver && season) log(day, { date, ...season, topic: "season" });

  return { stats, resources, factionApproval, foreignPolitics };
}
