// The words for province crises (see domain/crises): their names, the
// letter that brings each, and what each answer does, for the crisis
// letter, the province card and the map's legend.
import {
  FELLING_DAYS,
  FELLING_REPLANT_DAYS,
  FEVER_DOCTORS_DAYS,
  FEVER_LEFT_DAYS,
  FEVER_QUARANTINE_DAYS,
  FISHING_DAYS,
  FLOOD_DIKE_DAYS,
  FLOOD_LEFT_DAYS,
  FLOOD_REBUILD_DAYS,
  SEAM_SHAFT_DAYS,
} from "../domain/constants";
import { getAnswerCost } from "../domain/crises/crisisRules";
import type { CrisisAnswer, CrisisKind } from "../domain/crises/types";
import { formatAmount } from "./formatNumber";

export const CRISIS_NAMES: Record<CrisisKind, string> = {
  flood: "Flood",
  seam: "Seam worked out",
  felling: "Forest felled",
  fever: "Fever",
  fishing: "Fishing failed",
};

// For the legend: what each crisis does.
export const CRISIS_HINTS: Record<CrisisKind, string> = {
  flood: "The river has flooded it: its farms are under water until it is put right.",
  seam: "Its seam is worked out: its pits give no ore or coal while a new shaft is sunk.",
  felling: "Its forest is felled bare: no wood until it grows back.",
  fever: "Fever: people are dying, and left alone it spreads next door.",
  fishing: "Its fishing grounds have failed: little or no fish for a year.",
};

export const CRISIS_TITLES: Record<CrisisKind, string> = {
  flood: "The River Floods",
  seam: "The Seam Runs Out",
  felling: "A Forest Felled Bare",
  fever: "Fever in the Town",
  fishing: "The Fishing Grounds Fail",
};

export function crisisPrompt(kind: CrisisKind, name: string, detail: { homesLost: number; hasWorks: boolean }): string {
  switch (kind) {
    case "flood":
      return `The river has burst its banks in ${name}. Its farms are under water${detail.homesLost > 0 ? `, and ${detail.homesLost} of its homes are gone` : ""}. How will you put it right?`;
    case "seam":
      return `The seam under ${name} is worked out. Its pits give no more ore or coal${detail.hasWorks ? ", and its works will close unless you act" : ""}.`;
    case "felling":
      return `The forest of ${name} has been felled bare to build the country. It gives no more wood.`;
    case "fever":
      return `Fever has broken out in the crowded streets of ${name}. People are dying, and it may spread.`;
    case "fishing":
      return `The fish have left the grounds off ${name}. Its boats come home empty.`;
  }
}

const days = (n: number) => (n >= 360 ? `${Math.round(n / 360)} ${n >= 720 ? "years" : "year"}` : `${n} days`);

function price(answer: CrisisAnswer): string {
  const cost = getAnswerCost(answer);
  if (cost.treasury === 0 && cost.wood === 0) return "Free";
  return [`−${formatAmount(cost.treasury)} Cr`, cost.wood > 0 ? `${cost.wood} wood` : ""].filter(Boolean).join(" and ");
}

export interface AnswerPlate {
  label: string;
  effect: string;
}

export function answerPlate(answer: CrisisAnswer, hasWorks: boolean): AnswerPlate {
  const p = price(answer);
  switch (answer) {
    case "dike":
      return { label: "Build a dike", effect: `${p} · farms and homes back in ${days(FLOOD_DIKE_DAYS)} · it floods no more` };
    case "rebuild":
      return { label: "Rebuild as it was", effect: `${p} · farms and homes back in ${days(FLOOD_REBUILD_DAYS)} · it can flood again` };
    case "leave":
      return { label: "Leave it to its people", effect: `${p} · farms back in ${days(FLOOD_LEFT_DAYS)}, the homes never · its mood sinks meanwhile` };
    case "shaft":
      return { label: "Sink a deeper shaft", effect: `${p} · half its ore and coal back in ${days(SEAM_SHAFT_DAYS)}` };
    case "retool":
      return { label: "Retool the works", effect: `${p} · ${hasWorks ? "its works stay open" : "nothing to keep open here"}, its pits stay empty` };
    case "close":
      return { label: "Close the pits", effect: `${p} · ${hasWorks ? "a works closes, and its workers go looking for work" : "its pits stay empty"}` };
    case "replant":
      return { label: "Replant it", effect: `${p} · wood again in ${days(FELLING_REPLANT_DAYS)}` };
    case "regrow":
      return { label: "Let it grow back", effect: `${p} · wood again in ${days(FELLING_DAYS)}` };
    case "doctors":
      return { label: "Send doctors", effect: `${p} · over in ${days(FEVER_DOCTORS_DAYS)}` };
    case "quarantine":
      return { label: "Shut the province in", effect: `${p} · over in ${days(FEVER_QUARANTINE_DAYS)} · its mood sinks meanwhile` };
    case "neglect":
      return { label: "Let it run its course", effect: `${p} · more die each month for ${days(FEVER_LEFT_DAYS)} · it spreads next door` };
    case "boats":
      return { label: "Send the boats further out", effect: `${p} · half the catch, for ${days(FISHING_DAYS)}` };
    case "wait":
      return { label: "Wait for the fish", effect: `${p} · no fish for ${days(FISHING_DAYS)}` };
  }
}
