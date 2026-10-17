// The chapters under way, and what each still asks: a small list on the
// map, ticked off as the country gets there, so the player always knows
// what they're doing right now. In a Long Reign, the burdens carried too.
import "./Objectives.css";
import { objectivesMet } from "../../application/chapters";
import { getChapter } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";

const SHOWN = 2; // chapters at once: the most recent first

export function Objectives({ state }: { state: GameState }) {
  const current = state.chapters.opened.filter((id) => !state.chapters.done.includes(id)).slice(-SHOWN).reverse();
  // A Long Reign's burdens, each once with how many are carried.
  const burdens = [...new Set(state.burdens)].map((id) => ({ burden: getBurden(id), count: state.burdens.filter((b) => b === id).length }));
  if (current.length === 0 && burdens.length === 0) return null;

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
      {burdens.length > 0 && (
        <div className="objectives__chapter">
          <h3 className="objectives__title">Burdens of office</h3>
          <ul className="objectives__burdens">
            {burdens.map(({ burden, count }) => (
              <li key={burden.id} title={`${burden.flavour} ${describeBurden(burden).join(", ")}.`}>
                {burden.name}
                {count > 1 && <span className="objectives__count">×{count}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
