// The chapters under way, and what each still asks: a small list on the
// map, ticked off as the country gets there, so the player always knows
// what they're doing right now. An objective still to do opens the window
// where it's done. In a Long Reign, the burdens carried too.
import "./Objectives.css";
import { objectivesMet } from "../../application/chapters";
import { getChapter } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";
import { destinationName, OBJECTIVE_DESTINATIONS, type OpenPanel } from "../navigation";

const SHOWN = 2; // chapters at once: the most recent first

export function Objectives({ state, onOpenPanel }: { state: GameState; onOpenPanel: OpenPanel }) {
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
              {chapter.objectives.map((objective, i) => {
                const box = (
                  <span className="objectives__box" aria-hidden="true">
                    {met[i] ? "✓" : ""}
                  </span>
                );
                const to = met[i] ? null : OBJECTIVE_DESTINATIONS[id][i];
                return (
                  <li key={objective} className={met[i] ? "is-done" : ""}>
                    {to ? (
                      <button type="button" className="objectives__go" title={`Open ${destinationName(to)}`} onClick={() => onOpenPanel(to.panel, to.section)}>
                        {box}
                        <span className="objectives__text">{objective}</span>
                        <span className="objectives__arrow" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    ) : (
                      <>
                        {box}
                        {objective}
                      </>
                    )}
                  </li>
                );
              })}
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
