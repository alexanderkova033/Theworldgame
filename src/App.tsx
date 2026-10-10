// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import "./App.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNation } from "./domain/nations/nationRules";
import { NATIONS } from "./domain/nations/nationData";
import type { GameSpeed } from "./domain/country/types";
import { getPartiesForNation, getParty } from "./domain/parties/partyRules";
import { dismissDecision, resolveDecision } from "./application/actions";
import { getAdvisorOutlook } from "./application/getAdvisorOutlook";
import { getDailyProductionSummary } from "./application/getDailyProductionSummary";
import { getHeatingOutlook } from "./application/getHeatingOutlook";
import { playDanger, playGameOver } from "./presentation/audio/sound";
import { ActionsPanel } from "./presentation/components/ActionsPanel";
import { AdvisorStrip } from "./presentation/components/AdvisorStrip";
import { DecisionModal } from "./presentation/components/DecisionModal";
import { EventLog } from "./presentation/components/EventLog";
import { ExpeditionPanel } from "./presentation/components/ExpeditionPanel";
import { GameEndScreen } from "./presentation/components/GameEndScreen";
import { LawsPanel } from "./presentation/components/LawsPanel";
import { MapPanel } from "./presentation/components/MapPanel";
import { Modal } from "./presentation/components/Modal";
import { NavIcon } from "./presentation/components/NavIcon";
import { PartySelectScreen } from "./presentation/components/PartySelectScreen";
import { PeoplePanel } from "./presentation/components/PeoplePanel";
import { PoliticsPanel } from "./presentation/components/PoliticsPanel";
import { ProductionPanel } from "./presentation/components/ProductionPanel";
import { ProjectsPanel } from "./presentation/components/ProjectsPanel";
import { RepairsPanel } from "./presentation/components/RepairsPanel";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { ResearchPanel } from "./presentation/components/ResearchPanel";
import { StartScreen } from "./presentation/components/StartScreen";
import { TaxPanel } from "./presentation/components/TaxPanel";
import { Toasts } from "./presentation/components/Toasts";
import { TopBar, type PanelKey } from "./presentation/components/TopBar";
import { TradePanel } from "./presentation/components/TradePanel";
import { WorkforcePanel } from "./presentation/components/WorkforcePanel";
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

  // Today's projected numbers. Recomputed only when the day actually
  // advances — not on every hover, panel toggle, or map pan that also
  // re-renders App.
  const production = useMemo(() => (state ? getDailyProductionSummary(state) : null), [state]);
  const heating = useMemo(() => (state ? getHeatingOutlook(state) : null), [state]);
  // What needs the player now — ranked once per day, never inside the map.
  const advisor = useMemo(() => (state && production && heating ? getAdvisorOutlook(state, production, heating) : null), [state, production, heating]);

  // MapPanel is memoized (it's the heaviest thing on screen), so its props
  // have to keep stable identities across a tick or the memo buys nothing.
  // simulateDay rebuilds `expeditions` every single day even when it's
  // empty, so derive the id list from a plain string key instead.
  const expeditionKey = state?.expeditions.map((e) => e.islandId).join(",") ?? "";
  const expeditionIslandIds = useMemo(() => (expeditionKey ? expeditionKey.split(",") : []), [expeditionKey]);

  // Same trick for the neighbors' ruling parties (shown on the map), which
  // only change on the odd monthly government change.
  const foreignRulersKey = state ? Object.entries(state.foreignPolitics).map(([id, gov]) => `${id}:${gov.rulingPartyId}`).join(",") : "";
  const foreignRulers = useMemo(
    () => Object.fromEntries(foreignRulersKey ? foreignRulersKey.split(",").map((pair) => pair.split(":")) : []) as Record<string, string>,
    [foreignRulersKey],
  );

  const handleSelectIsland = useCallback((islandId: string) => {
    setSelectedIslandId(islandId);
    setOpenModal("ventures");
  }, []);

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
  // Non-null past the `!state` guard above — it's memoized from that same value.
  const dailyProduction = production!;

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
        unrestStage={state.unrestStage}
        resources={state.resources}
        production={dailyProduction}
        heating={heating!}
        debt={state.debt}
        activePanel={openModal}
        reportsBadgeCount={unseenEventCount}
        advisor={advisor && <AdvisorStrip outlook={advisor} onOpenPanel={openPanel} />}
        onPause={pause}
        onResume={resume}
        onSetSpeed={setSpeed}
        onOpenPanel={openPanel}
      />

      <main className="game-layout__main">
        <div className="game-layout__map-stage">
          <MapPanel
            nation={nation}
            placedBuildings={state.placedBuildings}
            selectedProvinceId={currentProvinceId}
            onSelectProvince={setSelectedProvinceId}
            scoutedIslandIds={state.scoutedIslandIds}
            expeditionIslandIds={expeditionIslandIds}
            selectedIslandId={selectedIslandId}
            onSelectIsland={handleSelectIsland}
            foreignRulers={foreignRulers}
          />
        </div>
      </main>

      {openModal === "politics" && (
        <Modal title="Politics" icon={<NavIcon type="politics" size={22} />} onClose={() => setOpenModal(null)}>
          <PoliticsPanel state={state} dispatch={dispatch} onOpenPanel={openPanel} />
        </Modal>
      )}

      {openModal === "economy" && (
        <Modal title="Economy" icon={<NavIcon type="economy" size={22} />} onClose={() => setOpenModal(null)} wide>
          <div className="economy-modal">
            <ActionsPanel state={state} selectedProvinceId={currentProvinceId} dispatch={dispatch} />
            <div className="economy-modal__side">
              <TaxPanel state={state} production={dailyProduction} dispatch={dispatch} />
              <PeoplePanel state={state} production={dailyProduction} onOpenPanel={openPanel} />
              <RepairsPanel state={state} dispatch={dispatch} />
              <WorkforcePanel state={state} dispatch={dispatch} />
              <ProjectsPanel state={state} />
              <ProductionPanel production={dailyProduction} />
            </div>
          </div>
        </Modal>
      )}

      {openModal === "trade" && (
        <Modal title="Trade" icon={<NavIcon type="trade" size={22} />} onClose={() => setOpenModal(null)} wide>
          <TradePanel state={state} production={dailyProduction} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "reports" && (
        <Modal title="Reports" icon={<NavIcon type="reports" size={22} />} onClose={() => setOpenModal(null)} wide>
          <div className="reports-modal">
            {/* Active projects already live on the Economy tab, right next to
                the Build actions that create them — showing the same list
                again here was pure duplication. Reports stays the historical
                record: monthly summaries + the event log. */}
            <ReportsPanel reports={state.monthlyReports} />
            <EventLog events={state.events} />
          </div>
        </Modal>
      )}

      {openModal === "laws" && (
        <Modal title="Laws" icon={<NavIcon type="laws" size={22} />} onClose={() => setOpenModal(null)} wide>
          <LawsPanel state={state} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "research" && (
        <Modal title="Research" icon={<NavIcon type="research" size={22} />} onClose={() => setOpenModal(null)} wide>
          <ResearchPanel state={state} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "ventures" && (
        <Modal title="Ventures" icon={<NavIcon type="ventures" size={22} />} onClose={() => setOpenModal(null)}>
          <ExpeditionPanel state={state} selectedIslandId={selectedIslandId} dispatch={dispatch} />
        </Modal>
      )}

      <Toasts events={state.events} monthlyReports={state.monthlyReports} onOpenPanel={openPanel} />

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
    </div>
  );
}

export default App;
