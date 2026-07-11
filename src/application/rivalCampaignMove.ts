// Use case: pick what the rival party's monthly campaign move actually is.
// Touches both the law tree and the research tree's data (to see what the
// player has enacted and how the rival feels about it), which is why this
// lives here in the application layer rather than in domain/parties itself
// — see applyProjectCompletion.ts for the same "crosses multiple domain
// slices" reasoning.
import { RIVAL_CAMPAIGN_POPULARITY_SWING } from "../domain/constants";
import type { GameState } from "../domain/country/types";
import { LAW_NODES } from "../domain/laws/lawData";
import { getRivalParty } from "../domain/parties/partyRules";
import { CAMPAIGN_FLAVOR, getPartyStance, type StanceEffects } from "../domain/parties/rivalRules";
import { RESEARCH_NODES } from "../domain/research/researchData";

export interface RivalCampaignMove {
  message: string;
  popularityDelta: number; // applied to the player's own popularity
  effects?: StanceEffects; // the specific node's effects, when this move reacted to one — shapes which factions actually feel it (see factionRules.ts); undefined for a generic flavor-line swing
}

// Reacts to something you've already enacted if the rival has a strong
// opinion on it; otherwise falls back to a generic campaign-trail line. This
// is the only place besides an election where the rival visibly *does*
// something, rather than just being 100 - your popularity.
export function pickRivalCampaignMove(state: GameState): RivalCampaignMove {
  const rival = getRivalParty(state.partyId);

  const enactedLaws = LAW_NODES.filter((n) => state.enactedLawIds.includes(n.id));
  const enactedResearch = RESEARCH_NODES.filter((n) => state.enactedResearchIds.includes(n.id));
  const reactable = [...enactedLaws, ...enactedResearch]
    .map((node) => ({ node, stance: getPartyStance(rival.ideology, node.effects) }))
    .filter((entry) => entry.stance !== "neutral");

  if (reactable.length > 0) {
    const { node, stance } = reactable[Math.floor(Math.random() * reactable.length)];
    if (stance === "opposes") {
      return {
        message: `${rival.name} campaigns hard against ${node.name}, calling it a mistake the country will regret.`,
        popularityDelta: -RIVAL_CAMPAIGN_POPULARITY_SWING,
        effects: node.effects,
      };
    }
    return {
      message: `${rival.name} grudgingly credits the government for ${node.name} — a rare moment of agreement.`,
      popularityDelta: RIVAL_CAMPAIGN_POPULARITY_SWING * 0.4,
      effects: node.effects,
    };
  }

  const flavor = CAMPAIGN_FLAVOR[rival.ideology] ?? [];
  const line = flavor[Math.floor(Math.random() * flavor.length)] ?? "makes the rounds on the campaign trail.";
  const swing = (Math.random() * 2 - 1) * RIVAL_CAMPAIGN_POPULARITY_SWING * 0.5;
  return { message: `${rival.name} ${line}`, popularityDelta: swing };
}
