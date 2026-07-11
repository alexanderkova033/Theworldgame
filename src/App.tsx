// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { getNation } from "./domain/nations/nationRules";
import { NATIONS } from "./domain/nations/nationData";
import type { GameSpeed } from "./domain/country/types";
import { getPartiesForNation, getParty } from "./domain/parties/partyRules";
import { dismissDecision, resolveDecision } from "./application/actions";
import { getDailyProductionSummary } from "./application/getDailyProductionSummary";
import { playDanger, playGameOver } from "./presentation/audio/sound";
import { ActionsPanel } from "./presentation/components/ActionsPanel";
import { DebtPanel } from "./presentation/components/DebtPanel";
import { DecisionModal } from "./presentation/components/DecisionModal";
import { EventLog } from "./presentation/components/EventLog";
import { ExpeditionPanel } from "./presentation/components/ExpeditionPanel";
import { GameEndScreen } from "./presentation/components/GameEndScreen";
import { LawsPanel } from "./presentation/components/LawsPanel";
import { MapPanel } from "./presentation/components/MapPanel";
import { Modal } from "./presentation/components/Modal";
import { PartySelectScreen } from "./presentation/components/PartySelectScreen";
import { PoliticsPanel } from "./presentation/components/PoliticsPanel";
import { ProductionPanel } from "./presentation/components/ProductionPanel";
import { ProjectsPanel } from "./presentation/components/ProjectsPanel";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { ResearchPanel } from "./presentation/components/ResearchPanel";
import { StartScreen } from "./presentation/components/StartScreen";
import { TopBar, type PanelKey } from "./presentation/components/TopBar";
import { TradePanel } from "./presentation/components/TradePanel";
import { TUTORIAL_STEPS, TutorialOverlay } from "./presentation/components/TutorialOverlay";
import { useGameClock } from "./presentation/hooks/useGameClock";

const SPEED_KEYS: Record<string, GameSpeed> = { "1": 1, "2": 2, "3": 3, "5": 5 };

function App() {
  const { state, saveSlots, startGame, continueGame, resetGame, deleteSlot, renameSlot, pause, resume, setSpeed, dispatch } =
    useGameClock();

  // Which save slot a new game will be written into — chosen on the Start
  // Screen before nation/party, so overwriting an occupied slot is always an
  // explicit, labeled choice (see StartScreen's SaveSlotCard).
  const [pendingSlotId, setPendingSlotId] = useState<number | null>(null);

  // Nation picked on the Start Screen but not yet confirmed with a party —
  // the game doesn't actually start (no GameState exists) until a party is
  // chosen too, on the follow-up PartySelectScreen.
  const [pendingNationId, setPendingNationId] = useState<string | null>(null);

  // Which province new construction goes into. This is a UI selection, not
  // simulation truth — it never touches GameState directly.
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  // Which unclaimed island the Ventures panel is showing. Same idea as
  // selectedProvinceId — a UI selection, not simulation truth.
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);

  // Every panel but the map and the always-visible resource ticker is an
  // occasional lookup, not an always-on dashboard, so it lives in an
  // on-demand overlay (HOI4-style tabs) instead of a permanent sidebar —
  // see Modal.tsx and TopBar.tsx.
  const [openModal, setOpenModal] = useState<PanelKey | null>(null);

  // How many of state.events the player has actually seen — everything past
  // that count shows up as an unread badge on the Reports tab, since the
  // event log now lives behind a closed-by-default panel instead of an
  // always-visible sidebar.
  const [seenEventCount, setSeenEventCount] = useState(0);

  // Keyboard shortcuts: Space toggles pause, 1/2/3/5 set speed. Scoped to
  // "nothing else has focus" so they never double-fire alongside a focused
  // button's own Space/Enter handling.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!state || state.isGameOver || e.target !== document.body) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (state.isPaused) resume();
        else pause();
      } else if (e.key in SPEED_KEYS) {
        setSpeed(SPEED_KEYS[e.key]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, pause, resume, setSpeed]);

  // A danger-severity event just landed in the log — play an alert, but no
  // more than once every few seconds, since "stability critically low" can
  // repeat daily while it stays that way (see simulateDay.ts) and would
  // otherwise turn into an alarm siren at high game speed.
  const lastEventIdRef = useRef<string | null>(null);
  const lastDangerSoundAt = useRef(0);
  useEffect(() => {
    if (!state || state.events.length === 0) return;
    const newest = state.events[0];
    if (newest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = newest.id;
    if (newest.severity === "danger") {
      const now = Date.now();
      if (now - lastDangerSoundAt.current > 4000) {
        playDanger();
        lastDangerSoundAt.current = now;
      }
    }
  }, [state]);

  // The reign just ended — a distinct sting, once.
  const wasGameOver = useRef(false);
  useEffect(() => {
    if (state?.isGameOver && !wasGameOver.current) playGameOver();
    wasGameOver.current = state?.isGameOver ?? false;
  }, [state?.isGameOver]);

  // A decision popped up (see simulateDay.ts step 14) — close whatever tab
  // is open so it isn't competing with the popup for attention.
  useEffect(() => {
    if (state?.pendingDecisionId) setOpenModal(null);
  }, [state?.pendingDecisionId]);

  // The first-run spotlight tour (see TutorialOverlay.tsx) drives which
  // panel is open for any step that targets a tab — so e.g. the "Laws" step
  // actually shows the Laws panel behind the spotlight, not just points at
  // a closed tab. A decision popup takes priority: the tour never fights it
  // for the screen (see the guard on TutorialOverlay's `step` prop below).
  useEffect(() => {
    const tutorialStep = state?.tutorialStep;
    if (typeof tutorialStep !== "number") return;
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;
    setOpenModal(step.panel);
  }, [state?.tutorialStep]);

  // No game yet: pick a save slot, then a nation, then a party, then the
  // game itself starts. Nation/party are permanent — there is no
  // "change nation/party" control anywhere in the game UI below.
  if (!state) {
    if (!pendingNationId) {
      return (
        <StartScreen
          nations={NATIONS}
          saveSlots={saveSlots}
          pendingSlotId={pendingSlotId}
          onSelectSlot={setPendingSlotId}
          onBackToSlots={() => setPendingSlotId(null)}
          onContinueSlot={continueGame}
          onRenameSlot={renameSlot}
          onDeleteSlot={deleteSlot}
          onSelectNation={setPendingNationId}
        />
      );
    }

    const pendingNation = getNation(pendingNationId);
    return (
      <PartySelectScreen
        nation={pendingNation}
        parties={getPartiesForNation(pendingNationId)}
        onBack={() => setPendingNationId(null)}
        onSelectParty={(partyId) => {
          startGame(pendingNationId, partyId, pendingSlotId ?? 0);
          setSelectedProvinceId(pendingNation.capitalProvinceId);
        }}
      />
    );
  }

  if (state.isGameOver) {
    return (
      <GameEndScreen
        state={state}
        onNewGame={() => {
          resetGame();
          setPendingNationId(null);
          setPendingSlotId(null);
        }}
      />
    );
  }

  const nation = getNation(state.nationId);
  const party = getParty(state.partyId);
  const currentProvinceId = selectedProvinceId ?? nation.capitalProvinceId;
  const unseenEventCount = Math.max(0, state.events.length - seenEventCount);
  const production = getDailyProductionSummary(state);

  function openPanel(panel: PanelKey) {
    // Always opens/switches to the tab — never toggles it closed. An
    // earlier version closed the panel when you clicked its already-active
    // tab again, but that made an accidental double-click (easy to trigger
    // for real) immediately re-close whatever you just opened. Closing has
    // its own unambiguous affordances: the modal's X, Escape, or clicking
    // the backdrop.
    setOpenModal(panel);
    if (panel === "reports" && state) setSeenEventCount(state.events.length);
  }

  return (
    <div className="game-layout">
      <TopBar
        nationName={nation.name}
        partyName={party.name}
        partyColor={party.color}
        date={state.date}
        isPaused={state.isPaused}
        speed={state.speed}
        stats={state.stats}
        resources={state.resources}
        production={production}
        debt={state.debt}
        activePanel={openModal}
        reportsBadgeCount={unseenEventCount}
        onPause={pause}
        onResume={resume}
        onSetSpeed={setSpeed}
        onOpenPanel={openPanel}
        onReplayTutorial={() => dispatch((s) => ({ ...s, tutorialStep: 0 }))}
      />

      <main className="game-layout__main">
        <div className="game-layout__map-stage" data-tutorial="map">
          <MapPanel
            nation={nation}
            placedBuildings={state.placedBuildings}
            armyStrength={state.stats.armyStrength}
            selectedProvinceId={currentProvinceId}
            onSelectProvince={setSelectedProvinceId}
            scoutedIslandIds={state.scoutedIslandIds}
            expeditionIslandIds={state.expeditions.map((e) => e.islandId)}
            selectedIslandId={selectedIslandId}
            onSelectIsland={(islandId) => {
              setSelectedIslandId(islandId);
              setOpenModal("ventures");
            }}
          />
        </div>
      </main>

      {openModal === "politics" && (
        <Modal title="Politics" onClose={() => setOpenModal(null)}>
          <PoliticsPanel state={state} />
        </Modal>
      )}

      {openModal === "economy" && (
        <Modal title="Economy" onClose={() => setOpenModal(null)} wide>
          <div className="economy-modal">
            <ActionsPanel state={state} selectedProvinceId={currentProvinceId} dispatch={dispatch} />
            <div className="economy-modal__side">
              <ProjectsPanel state={state} />
              <ProductionPanel production={production} />
            </div>
          </div>
        </Modal>
      )}

      {openModal === "trade" && (
        <Modal title="Trade" onClose={() => setOpenModal(null)}>
          <div className="trade-modal">
            <TradePanel state={state} dispatch={dispatch} />
            <DebtPanel state={state} dispatch={dispatch} />
          </div>
        </Modal>
      )}

      {openModal === "reports" && (
        <Modal title="Reports" onClose={() => setOpenModal(null)} wide>
          <div className="reports-modal">
            <div className="reports-modal__column">
              <ProjectsPanel state={state} />
              <ReportsPanel reports={state.monthlyReports} />
            </div>
            <EventLog events={state.events} />
          </div>
        </Modal>
      )}

      {openModal === "laws" && (
        <Modal title="Laws" onClose={() => setOpenModal(null)} wide>
          <LawsPanel state={state} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "research" && (
        <Modal title="Research" onClose={() => setOpenModal(null)} wide>
          <ResearchPanel state={state} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "ventures" && (
        <Modal title="Ventures" onClose={() => setOpenModal(null)}>
          <ExpeditionPanel state={state} selectedIslandId={selectedIslandId} dispatch={dispatch} />
        </Modal>
      )}

      <DecisionModal
        state={state}
        onResolve={(decisionId, optionId) => {
          dispatch((s) => resolveDecision(s, decisionId, optionId));
          resume();
        }}
        onDismiss={() => {
          dispatch(dismissDecision);
          resume();
        }}
      />

      <TutorialOverlay
        step={state.pendingDecisionId ? null : state.tutorialStep}
        onAdvance={(nextStep) => dispatch((s) => ({ ...s, tutorialStep: nextStep }))}
        onSkip={() => {
          dispatch((s) => ({ ...s, tutorialStep: null }));
          setOpenModal(null);
        }}
      />
    </div>
  );
}

export default App;
