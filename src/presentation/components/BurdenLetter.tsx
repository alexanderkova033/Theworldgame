// After a Long Reign election win: a new term, and the price of it. The
// player takes one of the burdens on offer, and the game waits until they
// do (see domain/reign and application/actions/burdenActions.ts).
import "./BurdenLetter.css";
import type { GameState } from "../../domain/country/types";
import type { BurdenId } from "../../domain/reign/reignData";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";
import { playSeal } from "../audio/sound";
import { Modal } from "./Modal";
import { NavIcon } from "./NavIcon";

interface BurdenLetterProps {
  state: GameState;
  onTake: (id: BurdenId) => void;
}

export function BurdenLetter({ state, onTake }: BurdenLetterProps) {
  if (!state.burdenOffer || state.isGameOver) return null;
  return (
    <Modal title={`Term ${state.electionsWon + 1} Begins`} icon={<NavIcon type="politics" size={22} />}>
      <div className="burden-letter">
        <p className="burden-letter__lead">Power has its price. Take on one of these for the rest of your reign.</p>
        <div className="burden-letter__options">
          {state.burdenOffer.map((id) => {
            const burden = getBurden(id);
            const held = state.burdens.filter((b) => b === id).length;
            return (
              <button
                key={id}
                type="button"
                className="burden-letter__option"
                onClick={() => {
                  playSeal();
                  onTake(id);
                }}
              >
                <span className="burden-letter__name">
                  {burden.name}
                  {held > 0 && <span className="burden-letter__held"> (you carry {held})</span>}
                </span>
                <span className="burden-letter__flavour">{burden.flavour}</span>
                {describeBurden(burden).map((line) => (
                  <span key={line} className="burden-letter__cost">
                    − {line}
                  </span>
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
