import "./PartySelectScreen.css";
import type { CSSProperties } from "react";
import type { Nation } from "../../domain/nations/types";
import type { Party } from "../../domain/parties/types";

interface PartySelectScreenProps {
  nation: Nation;
  parties: Party[];
  onBack: () => void;
  onSelectParty: (partyId: string) => void;
}

// The second half of starting a game: which of the nation's two parties the
// player actually leads. This is the choice the whole rest of the game
// measures you against — win elections as this party, or get voted out.
export function PartySelectScreen({ nation, parties, onBack, onSelectParty }: PartySelectScreenProps) {
  return (
    <div className="start-screen party-select-screen">
      <div className="start-screen__content">
        <button className="party-select-screen__back" onClick={onBack}>
          ← Choose a different nation
        </button>

        <p className="start-screen__eyebrow" style={{ color: nation.color }}>
          {nation.name}
        </p>
        <h1 className="start-screen__title">Lead a Party</h1>
        <p className="start-screen__subtitle">
          Every choice from here — laws, taxes, ventures — is measured by one thing: whether the people still back
          you. Win the next general election and the one after that, or your rivals will.
        </p>

        <div className="party-select-screen__grid">
          {parties.map((party) => (
            <button
              key={party.id}
              className="party-card"
              style={{ "--party-color": party.color } as CSSProperties}
              onClick={() => onSelectParty(party.id)}
            >
              <span className="party-card__crest" />
              <span className="party-card__name">{party.name}</span>
              <span className="party-card__ideology">{party.ideology}</span>
              <span className="party-card__description">{party.description}</span>
              <span className="party-card__platform">{party.platform}</span>
              <span className="party-card__cta">Lead the {party.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
