// A chapter's briefing letter: what has happened, what it opens, and what
// to do now. It arrives with the chapter, and the game waits while it's read
// (see application/chapters.ts). A story chapter's letter comes on the same
// page when nothing stands between them, so the two are one stop.
import "./ChapterBriefing.css";
import { joinedLetter, objectivesMet, stopsBehind } from "../../application/chapters";
import { getChapter, type ChapterId, type Feature } from "../../domain/chapters/chapterData";
import type { GameState } from "../../domain/country/types";
import { getDecision } from "../../domain/decisions/decisionRules";
import { playSeal } from "../audio/sound";
import { LetterAnswers } from "./DecisionModal";
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
  onAnswer: (id: ChapterId, optionId: string) => void;
}

export function ChapterBriefing({ state, onRead, onAnswer }: ChapterBriefingProps) {
  const id = state.chapters.unread[0];
  if (!id) return null;
  const chapter = getChapter(id);
  const met = objectivesMet(state, id);
  const letterId = joinedLetter(state, id);
  const letter = letterId ? getDecision(letterId) : undefined;
  const behind = stopsBehind(state, id);
  const read = () => {
    playSeal();
    onRead(id);
  };

  return (
    // A letter on the page must be answered, so that page can't be closed.
    // Keyed so that the next one in a queue starts at its top, not scrolled.
    <Modal key={id} title={chapter.title} icon={<NavIcon type="reports" size={22} />} onClose={letter ? undefined : read} wide={!!letter}>
      <div className={`briefing ${letter ? "briefing--joined" : ""}`}>
        {behind > 0 && <p className="briefing__waiting">{behind} more waiting</p>}
        <div className="briefing__story">
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
        </div>

        {letter ? (
          <div className="decision-modal briefing__joined">
            <h3 className="briefing__head">{letter.title}</h3>
            <p className="decision-modal__prompt">{letter.prompt}</p>
            <LetterAnswers state={state} decision={letter} onAnswer={(optionId) => onAnswer(id, optionId)} />
          </div>
        ) : (
          <button type="button" className="btn-primary briefing__go" onClick={read} autoFocus>
            To work
          </button>
        )}
      </div>
    </Modal>
  );
}
