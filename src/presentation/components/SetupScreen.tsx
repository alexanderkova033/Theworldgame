import "./SetupScreen.css";
import { useState, type CSSProperties } from "react";
import { DIFFICULTIES, DIFFICULTY_SETTINGS, type Difficulty } from "../../domain/difficulty/difficultyData";
import { getNationForProvince } from "../../domain/nations/nationRules";
import type { Nation } from "../../domain/nations/types";
import { getPartiesForNation } from "../../domain/parties/partyRules";
import { describeEffects } from "../../domain/policy/modifiers";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";
import { cogPoints, starPoints } from "./iconShapes";
import { washColor } from "./mapCommon";
import { formatReign } from "../formatNumber";
import { getBestReign } from "../hooks/records";
import { nationShapes } from "../nationFrontiers";
import { MODES, MODE_SETTINGS, type GameMode } from "../../domain/reign/reignData";

interface SetupScreenProps {
  nations: Nation[];
  slotName: string;
  onBack: () => void;
  onStart: (nationId: string, partyId: string, difficulty: Difficulty, mode: GameMode) => void;
}

// The chart's frame: the land and every island, with a little sea round them.
const CHART_VIEW = "10 15 1285 910";

// Starting a game, on one screen. The chart fills it and chooses the nation
// (click its land, or its seal on the plate); a plate lying on it holds the party, how
// the game ends and how hard it is. Everything has a choice made already, so
// "Take office" is always ready. The game doesn't exist until it's pressed.
export function SetupScreen({ nations, slotName, onBack, onStart }: SetupScreenProps) {
  const [nationId, setNationId] = useState(nations[0].id);
  const nation = nations.find((n) => n.id === nationId) ?? nations[0];
  const parties = getPartiesForNation(nation.id);
  const [wantedPartyId, setPartyId] = useState<string | null>(null);
  // A party belongs to one nation: choosing another nation starts on its first.
  const party = parties.find((p) => p.id === wantedPartyId) ?? parties[0];
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const level = DIFFICULTY_SETTINGS[difficulty];
  const [mode, setMode] = useState<GameMode>("terms");
  const best = mode === "long-reign" ? getBestReign(difficulty) : null;
  // A Long Reign has no retries, so that line doesn't apply to it.
  const changes = level.changes.filter((change) => mode !== "long-reign" || !/retr/i.test(change));
  // What most sets a level apart stays on screen; all of it is in the tip.
  const keyChanges = changes.filter((change) => /^Elections need|retr/i.test(change));
  const shapes = nationShapes([]);
  const chosen = shapes.find((s) => s.nationId === nation.id);

  return (
    <div className="setup">
      <div className="setup__map">
        <svg viewBox={CHART_VIEW} className="setup__chart" role="img" aria-label={`The continent and its islands, with ${nation.name} chosen`}>
          {MAP_GEOMETRY.islands.map((land) => (
            <path key={land.id} d={land.path} className="setup__island" />
          ))}
          {MAP_GEOMETRY.provinces.map((province) => {
            const owner = getNationForProvince(province.id);
            return (
              <path
                key={province.id}
                d={province.path}
                className={`setup__province ${owner?.id === nation.id ? "is-chosen" : ""}`}
                style={{ "--nation-color": owner?.color ?? "#a8946c", "--nation-wash": washColor(owner?.color ?? "#a8946c") } as CSSProperties}
                onClick={owner ? () => setNationId(owner.id) : undefined}
                data-tip={owner?.name ?? province.name}
              />
            );
          })}
          <path d={MAP_GEOMETRY.coastPath} className="setup__coast" />
          {chosen && (
            <>
              <path d={chosen.frontier} className="setup__frontier-under" />
              <path d={chosen.frontier} className="setup__frontier" />
            </>
          )}
          {shapes.map((shape) => (
            <text key={shape.nationId} x={shape.labelX} y={shape.labelY} className={`setup__label ${shape.nationId === nation.id ? "is-chosen" : ""}`}>
              {shape.name}
            </text>
          ))}
        </svg>
        <button type="button" className="setup__back" onClick={onBack}>
          ← Back to saves
        </button>
        <p className="setup__slot">New game in {slotName}</p>
      </div>

      <div className="setup__panel">
        <svg className="setup__plate-seal" width={36} height={36} viewBox="-18 -18 36 36" aria-hidden="true">
          <circle r={16} fill="var(--oxblood)" stroke="var(--gilt)" strokeWidth={1.5} />
          <polygon points={starPoints(0, 0, 9, 3.8)} fill="var(--gilt-bright)" />
        </svg>
        <div className="setup__choices">
          <section className="setup__section">
            <div className="setup__nation-head">
              <h1 className="setup__nation-name">{nation.name}</h1>
              <div className="setup__seals" role="radiogroup" aria-label="Nation">
                {nations.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="radio"
                    aria-checked={n.id === nation.id}
                    aria-label={n.name}
                    title={n.name}
                    className={`setup__seal ${n.id === nation.id ? "is-active" : ""}`}
                    style={{ "--nation-color": n.color } as CSSProperties}
                    onClick={() => setNationId(n.id)}
                  >
                    <CrestEmblem nationId={n.id} />
                  </button>
                ))}
              </div>
            </div>
            <p className="setup__blurb">{nation.blurb}</p>
            <span className="setup__bonus">{nation.startingBonus}</span>
          </section>

          <section className="setup__section" aria-labelledby="setup-party">
            <h2 className="setup__label-line" id="setup-party">
              Your party
            </h2>
            <div className="setup__section" role="radiogroup" aria-labelledby="setup-party">
              {parties.map((p) => {
                const creed = describeEffects(p.creed);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={p.id === party.id}
                    className={`setup__party ${p.id === party.id ? "is-active" : ""}`}
                    style={{ "--party-color": p.color } as CSSProperties}
                    onClick={() => setPartyId(p.id)}
                    title={p.description}
                  >
                    <span className="setup__party-seal" aria-hidden="true">
                      <PartyCrestEmblem ideology={p.ideology} />
                    </span>
                    {/* What governing as this party changes: a button holds
                        only inline content, so the lists are spans. */}
                    <span className="setup__party-body">
                      <span className="setup__party-name">{p.name}</span>
                      {creed.gains.map((line) => (
                        <span key={line.key} className="setup__perk is-gain">
                          <span className="setup__mark" aria-label="Gain">▲</span>
                          {line.text}
                        </span>
                      ))}
                      {creed.costs.map((line) => (
                        <span key={line.key} className="setup__perk is-loss">
                          <span className="setup__mark" aria-label="Cost">▼</span>
                          {line.text}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="setup__section" aria-labelledby="setup-mode">
            <h2 className="setup__label-line" id="setup-mode">
              How it ends
            </h2>
            <div className="setup__modes" role="radiogroup" aria-labelledby="setup-mode">
              {MODES.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={mode === key}
                  className={`mode-tile ${mode === key ? "is-active" : ""}`}
                  onClick={() => setMode(key)}
                  title={MODE_SETTINGS[key].summary}
                >
                  <ModeEmblem mode={key} />
                  <span className="mode-tile__name">{MODE_SETTINGS[key].name}</span>
                </button>
              ))}
            </div>
            {/* What to expect: the usual length of a campaign, or the reign to beat. */}
            <p className="setup__note">
              {MODE_SETTINGS[mode].tagline}{" "}
              {mode === "terms"
                ? "A careful game lasts about four and a half years."
                : best
                  ? `Your longest on ${level.name}: ${formatReign(best.months)}.`
                  : `No reign on ${level.name} yet.`}
            </p>
          </section>

          <section className="setup__section" aria-labelledby="setup-level">
            <h2 className="setup__label-line" id="setup-level">
              How hard
            </h2>
            <div className="setup__ranks" role="radiogroup" aria-labelledby="setup-level">
              {DIFFICULTIES.map((key, i) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={difficulty === key}
                  className={`rank-badge rank-badge--${key} ${difficulty === key ? "is-active" : ""}`}
                  onClick={() => setDifficulty(key)}
                  title={`${DIFFICULTY_SETTINGS[key].title}. ${DIFFICULTY_SETTINGS[key].summary}`}
                >
                  <RankInsignia chevrons={i + 1} />
                  <span className="rank-badge__name">{DIFFICULTY_SETTINGS[key].name}</span>
                </button>
              ))}
            </div>
            <p className="setup__note" title={changes.join(". ")}>
              {level.summary} {keyChanges.join(". ")}.
            </p>
          </section>
        </div>

        <div className="setup__foot">
          <button type="button" className="setup__start" onClick={() => onStart(nation.id, party.id, difficulty, mode)}>
            Take office
          </button>
        </div>
      </div>
    </div>
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
            <circle cx={0} cy={0} r={2.1} className="setup__seal-hole" />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={24} height={24} viewBox="-8 -8 16 16" aria-hidden="true">
      {emblem}
    </svg>
  );
}

// How a game ends, drawn: three stars for three elections won, an hourglass
// for a reign that runs until it runs out.
function ModeEmblem({ mode }: { mode: GameMode }) {
  return (
    <svg className="mode-tile__emblem" viewBox="-20 -14 40 28" width={46} height={32} aria-hidden="true">
      {mode === "terms" ? (
        <g fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.8} strokeLinejoin="round">
          <polygon points={starPoints(-12, 3, 6.5, 2.8)} />
          <polygon points={starPoints(0, -4, 8, 3.4)} />
          <polygon points={starPoints(12, 3, 6.5, 2.8)} />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <rect x={-9} y={-12} width={18} height={2.6} rx={1} fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.6} />
          <rect x={-9} y={9.4} width={18} height={2.6} rx={1} fill="var(--gilt-bright)" stroke="#93731f" strokeWidth={0.6} />
          <path d="M-6.5,-9.4 L6.5,-9.4 L0.8,0 L6.5,9.4 L-6.5,9.4 L-0.8,0 Z" fill="rgba(244, 234, 208, 0.18)" stroke="var(--gilt-bright)" strokeWidth={1} />
          <path d="M-3.8,-6.2 L3.8,-6.2 L0.5,-1.2 L-0.5,-1.2 Z" fill="var(--gilt-bright)" />
          <path d="M0,0.5 L0,6 M-4.6,8.9 Q0,5.6 4.6,8.9 Z" fill="var(--gilt-bright)" stroke="var(--gilt-bright)" strokeWidth={0.8} />
          <path d="M-15,6 C-17,0 -16,-6 -12,-10 M15,6 C17,0 16,-6 12,-10" fill="none" stroke="#9fbf86" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

// A difficulty as a rank: a shield with one chevron per step up.
function RankInsignia({ chevrons }: { chevrons: number }) {
  return (
    <svg className="rank-badge__shield" viewBox="-10 -11 20 22" width={28} height={31} aria-hidden="true">
      <path d="M-8,-9 H8 V0.5 C8,6 0,10 0,10 C0,10 -8,6 -8,0.5 Z" fill="var(--rank-color)" stroke="var(--gilt-bright)" strokeWidth={1.1} />
      <g fill="none" stroke="#f4ead0" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {Array.from({ length: chevrons }, (_, i) => {
          const y = 4 - i * 3.6 + (chevrons - 1) * 1.8;
          return <path key={i} d={`M-4.5,${y} L0,${y - 3} L4.5,${y}`} />;
        })}
      </g>
    </svg>
  );
}

// A small emblem per ideology, echoing what each party actually stands for —
// same hand-drawn-basic-shapes approach as StartScreen's nation crests.
function PartyCrestEmblem({ ideology }: { ideology: string }) {
  const emblem = (() => {
    switch (ideology) {
      case "Agrarian":
        // A wheat sheaf, for the smallholders and cooperative farmers.
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
      case "Commercial":
        // A balance scale, for a party that wants the ledger well-audited.
        return (
          <g stroke="#f4efe2" strokeWidth={1.2} strokeLinecap="round" fill="none">
            <line x1={0} y1={-7} x2={0} y2={6} />
            <line x1={-6} y1={-4} x2={6} y2={-4} />
            <path d="M-6,-4 L-8,1 A2.4,2.4 0 0 0 -3.5,1 Z" />
            <path d="M6,-4 L8,1 A2.4,2.4 0 0 0 3.5,1 Z" />
            <line x1={-3.5} y1={6} x2={3.5} y2={6} />
          </g>
        );
      case "Traditionalist":
        // A crown, for old administrative families guarding the inheritance.
        return (
          <g fill="#f4efe2">
            <polygon points="-7,3 -7,-1 -3.5,-5 0,-1 3.5,-5 7,-1 7,3" />
            <rect x={-7} y={3} width={14} height={2.4} />
          </g>
        );
      case "Progressive":
        // A rising sun, for younger clerks pushing to modernize.
        return (
          <g stroke="#f4efe2" strokeWidth={1.2} strokeLinecap="round" fill="none">
            <path d="M-7,3 A7,7 0 0 1 7,3" fill="#f4efe2" stroke="none" />
            <line x1={0} y1={-9} x2={0} y2={-6.5} />
            <line x1={-6.4} y1={-6.4} x2={-4.6} y2={-4.6} />
            <line x1={6.4} y1={-6.4} x2={4.6} y2={-4.6} />
          </g>
        );
      case "Labor":
        // A hammer, for the foundry and rail unions — a crossed hammer and
        // wrench read as a muddy squiggle at this size, so one clear tool
        // silhouette instead of two overlapping ones.
        return (
          <g stroke="#2a1f14" strokeWidth={0.6} fill="#f4efe2">
            <rect x={-1} y={-1} width={2} height={9} rx={0.8} />
            <rect x={-4.5} y={-8} width={9} height={4} rx={1} />
          </g>
        );
      case "Nationalist":
        // A sword, for veterans and industrialists wanting strength — a
        // crossed pair collapsed into a plain "X" at this size, so one
        // upright blade instead.
        return (
          <g stroke="#2a1f14" strokeWidth={0.5} fill="#f4efe2">
            <polygon points="0,-9 1.5,-3 -1.5,-3" />
            <rect x={-1} y={-3} width={2} height={6} />
            <rect x={-4} y={3} width={8} height={1.8} rx={0.6} />
            <rect x={-1} y={4.8} width={2} height={3} />
            <circle cx={0} cy={8.3} r={1.3} />
          </g>
        );
      default:
        return <polygon points={starPoints(0, 0, 6, 2.6)} fill="#f4efe2" />;
    }
  })();

  return (
    <svg width={22} height={22} viewBox="-8 -9 16 18">
      {emblem}
    </svg>
  );
}
