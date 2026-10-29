// The chapters under way, and what each still asks: a small list on the
// map, ticked off as the country gets there, so the player always knows
// what they're doing right now. An objective still to do opens the window
// where it's done. In a Long Reign, the burdens carried too.
//
// It folds to one line (the newest chapter and how much is left) so it
// needn't cover the map; the choice is remembered, and a new chapter
// unfolds it once so its objectives are seen.
import "./Objectives.css";
import { useEffect, useRef, useState } from "react";
import { objectivesMet } from "../../application/chapters";
import { getChapter } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";
import { destinationName, objectiveDestination, type OpenPanel } from "../navigation";

const SHOWN = 2; // chapters at once: the most recent first
const FOLDED_KEY = "theworldgame-objectives-folded";

function readFolded(): boolean {
  try {
    return localStorage.getItem(FOLDED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeFolded(folded: boolean): void {
  try {
    localStorage.setItem(FOLDED_KEY, folded ? "1" : "0");
  } catch {
    // Storage unavailable: the choice holds for this session only.
  }
}

export function Objectives({ state, onOpenPanel }: { state: GameState; onOpenPanel: OpenPanel }) {
  const current = state.chapters.opened.filter((id) => !state.chapters.done.includes(id)).slice(-SHOWN).reverse();
  // A Long Reign's burdens, each once with how many are carried.
  const burdens = [...new Set(state.burdens)].map((id) => ({ burden: getBurden(id), count: state.burdens.filter((b) => b === id).length }));
  const [folded, setFolded] = useState(readFolded);
  const newest = current[0] ?? null;
  const seenNewest = useRef(newest);
  useEffect(() => {
    if (newest && newest !== seenNewest.current) setFolded(false);
    seenNewest.current = newest;
  }, [newest]);
  if (current.length === 0 && burdens.length === 0) return null;

  const left = current.reduce((sum, id) => sum + objectivesMet(state, id).filter((met) => !met).length, 0);
  const fold = (next: boolean) => {
    setFolded(next);
    writeFolded(next);
  };

  if (folded) {
    return (
      <section className="objectives is-folded" aria-label="Objectives">
        <button type="button" className="objectives__fold" aria-expanded={false} title="Show the objectives" onClick={() => fold(false)}>
          <span className="objectives__title">{newest ? getChapter(newest).title : "Burdens of office"}</span>
          {left > 0 && <span className="objectives__left">{left} to do</span>}
          <span className="objectives__caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="objectives" aria-label="Objectives">
      <button type="button" className="objectives__fold objectives__fold--close" aria-expanded={true} aria-label="Fold the objectives" title="Fold the objectives" onClick={() => fold(true)}>
        <span className="objectives__caret" aria-hidden="true">
          ▴
        </span>
      </button>
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
                const to = met[i] ? null : objectiveDestination(id, i);
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
