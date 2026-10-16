// The chapters under way, and what each still asks: a small list on the
// map, ticked off as the country gets there, so the player always knows
// what they're doing right now.
import "./Objectives.css";
import { objectivesMet } from "../../application/chapters";
import { getChapter } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";

const SHOWN = 2; // chapters at once: the most recent first

export function Objectives({ state }: { state: GameState }) {
  const current = state.chapters.opened.filter((id) => !state.chapters.done.includes(id)).slice(-SHOWN).reverse();
  if (current.length === 0) return null;

  return (
    <section className="objectives" aria-label="Objectives">
      {current.map((id) => {
        const chapter = getChapter(id);
        const met = objectivesMet(state, id);
        return (
          <div key={id} className="objectives__chapter">
            <h3 className="objectives__title">{chapter.title}</h3>
            <ul>
              {chapter.objectives.map((objective, i) => (
                <li key={objective} className={met[i] ? "is-done" : ""}>
                  <span className="objectives__box" aria-hidden="true">
                    {met[i] ? "✓" : ""}
                  </span>
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
