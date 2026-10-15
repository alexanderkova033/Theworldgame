import "./StartScreen.css";
import { useState, type CSSProperties } from "react";
import { formatDate } from "../../domain/country/calendar";
import { getNation, getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { getParty } from "../../domain/parties/partyRules";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import type { SaveSlotPreview } from "../hooks/gameSave";
import { cogPoints, starPoints } from "./iconShapes";

interface StartScreenProps {
  nations: Nation[];
  saveSlots: SaveSlotPreview[];
  pendingSlotId: number | null;
  onSelectSlot: (slotId: number) => void;
  onBackToSlots: () => void;
  onContinueSlot: (slotId: number) => void;
  onRenameSlot: (slotId: number, name: string) => void;
  onDeleteSlot: (slotId: number) => void;
  onSelectNation: (nationId: string) => void;
}

// A pencil glyph for the rename affordance on an occupied slot card.
function PencilIcon() {
  return (
    <svg width={12} height={12} viewBox="-10 -10 20 20">
      <path
        d="M-6,4 L-7,7 L-4,6 L5,-3 A2,2 0 0 0 2,-6 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SaveSlotCardProps {
  slot: SaveSlotPreview;
  onSelect: (slotId: number) => void;
  onContinue: (slotId: number) => void;
  onRename: (slotId: number, name: string) => void;
  onDelete: (slotId: number) => void;
}

// One of the 3 fixed save slots — empty ones offer a straight "Start New
// Game"; occupied ones show what's there and require an explicit,
// clearly-labeled two-step confirm before either overwriting or deleting, so
// a save never disappears from a single misclick.
function SaveSlotCard({ slot, onSelect, onContinue, onRename, onDelete }: SaveSlotCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(slot.name);
  const [armedAction, setArmedAction] = useState<"overwrite" | "delete" | null>(null);

  function commitRename() {
    onRename(slot.slotId, nameDraft);
    setIsRenaming(false);
  }

  return (
    <div className="save-slot-card">
      <div className="save-slot-card__header">
        {isRenaming ? (
          <input
            className="save-slot-card__name-input"
            value={nameDraft}
            autoFocus
            maxLength={24}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setNameDraft(slot.name);
                setIsRenaming(false);
              }
            }}
          />
        ) : (
          <>
            <span className="save-slot-card__name">{slot.name}</span>
            <button
              className="save-slot-card__rename"
              aria-label="Rename save slot"
              onClick={() => {
                setNameDraft(slot.name);
                setIsRenaming(true);
              }}
            >
              <PencilIcon />
            </button>
          </>
        )}
      </div>

      {slot.preview ? (
        <>
          <p className="save-slot-card__detail">
            {getParty(slot.preview.partyId).name} of {getNation(slot.preview.nationId).name}
          </p>
          <p className="save-slot-card__date">{formatDate(slot.preview.date)}</p>

          <button className="save-slot-card__continue" onClick={() => onContinue(slot.slotId)}>
            Continue
          </button>

          <div className="save-slot-card__danger-row">
            <button
              className="save-slot-card__danger-button"
              onClick={() => (armedAction === "overwrite" ? onSelect(slot.slotId) : setArmedAction("overwrite"))}
            >
              {armedAction === "overwrite" ? "Confirm: overwrite this save" : "Overwrite ▸ Start New Game"}
            </button>
            <button
              className="save-slot-card__danger-button"
              onClick={() => (armedAction === "delete" ? onDelete(slot.slotId) : setArmedAction("delete"))}
            >
              {armedAction === "delete" ? "Confirm: delete this save" : "Delete"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="save-slot-card__detail save-slot-card__detail--empty">Empty</p>
          <button className="save-slot-card__continue" onClick={() => onSelect(slot.slotId)}>
            Start New Game →
          </button>
        </>
      )}
    </div>
  );
}

export function StartScreen({
  nations,
  saveSlots,
  pendingSlotId,
  onSelectSlot,
  onBackToSlots,
  onContinueSlot,
  onRenameSlot,
  onDeleteSlot,
  onSelectNation,
}: StartScreenProps) {
  const { width, height, coastPath, provinces, otherLandmasses } = MAP_GEOMETRY;

  if (pendingSlotId === null) {
    return (
      <div className="start-screen">
        <MapWatermark />
        <div className="start-screen__content">
          <p className="start-screen__eyebrow">A nation-building chronicle</p>
          <h1 className="start-screen__title">The World Game</h1>
          <p className="start-screen__subtitle">
            The continent enters a new century. Choose a save slot to continue an old chronicle, or start a new one.
            each slot is independent, so starting fresh never costs you an old game by accident.
          </p>

          <div className="save-slot-grid">
            {saveSlots.map((slot) => (
              <SaveSlotCard
                key={slot.slotId}
                slot={slot}
                onSelect={onSelectSlot}
                onContinue={onContinueSlot}
                onRename={onRenameSlot}
                onDelete={onDeleteSlot}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="start-screen">
      <MapWatermark />
      <div className="start-screen__content">
        <button className="party-select-screen__back" onClick={onBackToSlots}>
          ← Back to saves
        </button>

        <p className="start-screen__eyebrow">
          New game in {saveSlots.find((s) => s.slotId === pendingSlotId)?.name ?? `Save ${pendingSlotId + 1}`}
        </p>
        <h1 className="start-screen__title">Choose Your Nation</h1>
        <p className="start-screen__subtitle">
          The nation you'll carry forward. This choice can't be undone once the clock starts.
        </p>

        <svg viewBox={`0 0 ${width} ${height}`} className="start-screen__map" aria-hidden="true">
          {otherLandmasses.map((land) => (
            <path key={land.id} d={land.path} className="start-screen__unclaimed-land" />
          ))}
          <path d={coastPath} className="start-screen__coast" />
          {provinces.map((province) => {
            const owner = getNationForProvince(province.id);
            return (
              <path
                key={province.id}
                d={province.path}
                className="start-screen__province"
                style={owner ? ({ "--nation-color": owner.color } as CSSProperties) : undefined}
                onClick={owner ? () => onSelectNation(owner.id) : undefined}
              >
                <title>{province.name}{owner ? `, ${owner.name}` : ""}</title>
              </path>
            );
          })}
        </svg>

        <div className="start-screen__nations">
          {nations.map((nation) => (
            <button
              key={nation.id}
              className="nation-card"
              style={{ "--nation-color": nation.color } as CSSProperties}
              onClick={() => onSelectNation(nation.id)}
            >
              <span className="nation-card__crest">
                <CrestEmblem nationId={nation.id} />
              </span>
              <span className="nation-card__name">{nation.name}</span>
              <span className="nation-card__blurb">{nation.blurb}</span>
              <span className="nation-card__bonus">{nation.startingBonus}</span>
              <span className="nation-card__cta">Play as {nation.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// A huge, quiet silhouette of the continent sitting behind the start screen's
// content — the actual world the player is about to inherit, instead of a
// plain gradient void. Faint enough to never compete with the cards on top.
export function MapWatermark() {
  const { width, height, coastPath, otherLandmasses } = MAP_GEOMETRY;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="start-screen__watermark" aria-hidden="true">
      {otherLandmasses.map((land) => (
        <path key={land.id} d={land.path} />
      ))}
      <path d={coastPath} />
    </svg>
  );
}

// A small emblem per nation, echoing its flavor (farmland, schools,
// industry) — purely decorative, drawn from the same basic-shape approach
// as BuildingIcon/StatIcon.
function CrestEmblem({ nationId }: { nationId: string }) {
  const emblem = (() => {
    switch (nationId) {
      case "astravia":
        // A wheat sheaf, for a farming republic.
        return (
          <g stroke="#f4efe2" strokeWidth={1.3} strokeLinecap="round" fill="none">
            <line x1={0} y1={-7} x2={0} y2={6} />
            <line x1={0} y1={-5} x2={-3.5} y2={-7} />
            <line x1={0} y1={-5} x2={3.5} y2={-7} />
            <line x1={0} y1={-1.5} x2={-4} y2={-3.5} />
            <line x1={0} y1={-1.5} x2={4} y2={-3.5} />
            <line x1={-3} y1={5} x2={3} y2={5} />
          </g>
        );
      case "caldenreich":
        // An open book, for a kingdom proud of its schools.
        return (
          <g fill="#f4efe2">
            <polygon points="0,-6 -7,-2 -7,6 0,2" />
            <polygon points="0,-6 7,-2 7,6 0,2" />
          </g>
        );
      case "veldoria":
        // A gear, for an industrial power.
        return (
          <g fill="#f4efe2">
            <polygon points={cogPoints(0, 0, 6.5, 5, 8)} />
            <circle cx={0} cy={0} r={2.1} className="nation-card__crest-hole" />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={22} height={22} viewBox="-8 -8 16 16">
      {emblem}
    </svg>
  );
}
