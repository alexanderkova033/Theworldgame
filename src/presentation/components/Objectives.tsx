// The chapters under way, and what each still asks: a slip on the map with
// the newest chapter's plate, its objectives as numbered steps, and any
// other chapter on a line under it, so the player always knows what they're
// doing right now. An objective still to do opens the window where it's
// done. In a Long Reign, the burdens carried too.
//
// It folds to one line (the newest chapter and how much is left) so it
// needn't cover the map; the choice is remembered, and a new chapter
// unfolds it once so its objectives are seen.
import "./Objectives.css";
import { useEffect, useRef, useState } from "react";
import { objectivesMet } from "../../application/chapters";
import { getChapter, type ChapterId } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { describeBurden, getBurden } from "../../domain/reign/reignRules";
import { destinationName, objectiveDestination, type OpenPanel } from "../navigation";
import { NavIcon } from "./NavIcon";
import { StoryPlate } from "./StoryPlate";

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

// How far a chapter has got: one pip per objective, filled when it's met.
function Pips({ met }: { met: boolean[] }) {
  return (
    <span className="objectives__pips" aria-label={`${met.filter(Boolean).length} of ${met.length} done`}>
      {met.map((done, i) => (
        <span key={i} className={done ? "is-done" : ""} />
      ))}
    </span>
  );
}

// The chapter in hand: its engraved plate with the title across its foot and
// a wax seal on its corner, a bar for how far it has got, then its
// objectives as numbered steps on a line. The first one still to do is the
// one lit, with the way to where it's done.
function ChapterCard({ state, id, onOpenPanel }: { state: GameState; id: ChapterId; onOpenPanel: OpenPanel }) {
  const chapter = getChapter(id);
  const met = objectivesMet(state, id);
  const done = met.filter(Boolean).length;
  const next = met.indexOf(false);
  return (
    <div className="objectives__card">
      <div className="objectives__head">
        <StoryPlate chapterId={id} />
        <span className="objectives__seal" aria-hidden="true">
          <NavIcon type="reports" size={18} />
        </span>
        <h3 className="objectives__title">{chapter.title}</h3>
      </div>
      <span className="objectives__bar" aria-hidden="true">
        <span style={{ width: `${Math.round((done / Math.max(1, met.length)) * 100)}%` }} />
      </span>
      <ol className="objectives__steps">
        {chapter.objectives.map((objective, i) => {
          const to = met[i] ? null : objectiveDestination(id, i);
          const current = i === next;
          const mark = (
            <span className="objectives__step-mark" aria-hidden="true">
              {met[i] ? "✓" : i + 1}
            </span>
          );
          return (
            <li key={objective} className={`objectives__step ${met[i] ? "is-done" : ""} ${current ? "is-current" : ""}`}>
              {to ? (
                <button type="button" className="objectives__go" title={`Open ${destinationName(to)}`} onClick={() => onOpenPanel(to.panel, to.section, to.rail)}>
                  {mark}
                  <span className="objectives__text">{objective}</span>
                  {current && <span className="objectives__go-label">Go ›</span>}
                </button>
              ) : (
                <span className="objectives__plain">
                  {mark}
                  <span className="objectives__text">{objective}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
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
    const next = newest ? objectivesMet(state, newest) : [];
    return (
      <section className="objectives is-folded" aria-label="Objectives">
        <button type="button" className="objectives__fold" aria-expanded={false} title="Show the objectives" onClick={() => fold(false)}>
          <span className="objectives__seal objectives__seal--small" aria-hidden="true">
            <NavIcon type="reports" size={13} />
          </span>
          <span className="objectives__title">{newest ? getChapter(newest).title : "Burdens of office"}</span>
          {next.length > 0 && <Pips met={next} />}
          {left > 0 && <span className="objectives__left">{left} to do</span>}
          <span className="objectives__caret" aria-hidden="true">
            ▾
          </span>
        </button>
      </section>
    );
  }

  const [lead, ...others] = current;
  return (
    <section className="objectives" aria-label="Objectives">
      {lead && <ChapterCard state={state} id={lead} onOpenPanel={onOpenPanel} />}
      <button type="button" className="objectives__fold objectives__fold--close" aria-expanded={true} aria-label="Fold the objectives" title="Fold the objectives" onClick={() => fold(true)}>
        <span className="objectives__caret" aria-hidden="true">
          ▴
        </span>
      </button>
      {/* Another chapter under way: one line, the step it still asks (its
          title in the tip) and its pips, opening where that step is done. */}
      {others.map((id) => {
        const met = objectivesMet(state, id);
        const next = met.indexOf(false);
        const to = next >= 0 ? objectiveDestination(id, next) : null;
        const line = (
          <>
            <span className="objectives__also-label">Also</span>
            <span className="objectives__also-title">{next >= 0 ? getChapter(id).objectives[next] : getChapter(id).title}</span>
            <Pips met={met} />
          </>
        );
        return to ? (
          <button key={id} type="button" className="objectives__also" title={`${getChapter(id).title}. Open ${destinationName(to)}`} onClick={() => onOpenPanel(to.panel, to.section, to.rail)}>
            {line}
            <span className="objectives__also-go" aria-hidden="true">›</span>
          </button>
        ) : (
          <div key={id} className="objectives__also" title={getChapter(id).title}>
            {line}
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
