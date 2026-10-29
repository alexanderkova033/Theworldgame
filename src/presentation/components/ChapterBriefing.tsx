// A chapter's briefing letter: what has happened, what it opens, and what
// to do now. It arrives with the chapter, and the game waits while it's read
// (see application/chapters.ts).
import "./ChapterBriefing.css";
import { objectivesMet } from "../../application/chapters";
import { getChapter, type ChapterId, type Feature } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { playSeal } from "../audio/sound";
import { Modal } from "./Modal";
import { NavIcon } from "./NavIcon";
import { StoryPlate } from "./StoryPlate";

// What each system is called where the player finds it.
const FEATURE_NAMES: Record<Feature, string> = {
  market: "the Market (Money)",
  laws: "Laws",
  research: "Research, schools and scientists",
  unrest: "Unrest: police and crackdowns (Politics)",
  voters: "Voters (Politics)",
  neighbours: "Neighbours (Politics)",
  ventures: "Ventures to the islands (the map)",
  army: "the Army, and regiments on the map",
};

interface ChapterBriefingProps {
  state: GameState;
  onRead: (id: ChapterId) => void;
}

export function ChapterBriefing({ state, onRead }: ChapterBriefingProps) {
  const id = state.chapters.unread[0];
  if (!id) return null;
  const chapter = getChapter(id);
  const met = objectivesMet(state, id);
  const read = () => {
    playSeal();
    onRead(id);
  };

  return (
    <Modal title={chapter.title} icon={<NavIcon type="reports" size={22} />} onClose={read}>
      <div className="briefing">
        <StoryPlate chapterId={id} />
        <p className="briefing__letter">
          {chapter.briefing}
          {chapter.partyLines?.[state.partyId] && <> {chapter.partyLines[state.partyId]}</>}
        </p>

        {chapter.opens.length > 0 && (
          <p className="briefing__opens">
            Now open: {chapter.opens.map((f) => FEATURE_NAMES[f]).join(", ")}
          </p>
        )}

        <h3 className="briefing__head">Objectives</h3>
        <ul className="briefing__objectives">
          {chapter.objectives.map((objective, i) => (
            <li key={objective} className={met[i] ? "is-done" : ""}>
              <span className="briefing__box" aria-hidden="true">
                {met[i] ? "✓" : ""}
              </span>
              {objective}
            </li>
          ))}
        </ul>

        <button type="button" className="btn-primary briefing__go" onClick={read} autoFocus>
          To work
        </button>
      </div>
    </Modal>
  );
}
