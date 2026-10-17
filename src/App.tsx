// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import "./App.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { emptyLedger, mergeLedgers } from "./domain/ledger/ledgerRules";
import { getNation } from "./domain/nations/nationRules";
import { NATIONS } from "./domain/nations/nationData";
import type { GameSpeed } from "./domain/country/types";
import { getElectionThreshold } from "./domain/parties/electionRules";
import { getPartiesForNation, getParty } from "./domain/parties/partyRules";
import { dismissDecision, resolveDecision } from "./application/actions";
import { getAdvisorOutlook } from "./application/getAdvisorOutlook";
import { getDailyProductionSummary } from "./application/getDailyProductionSummary";
import { getForecasts } from "./application/getForecasts";
import { getHeatingOutlook } from "./application/getHeatingOutlook";
import { getMaterialShortages } from "./application/getMaterialShortages";
import { getProvinceOverview, getProvinceStatus, type ProvinceStatus } from "./application/getProvinceOverview";
import { getTroubledProvinces } from "./application/getTroubledProvinces";
import { playBreakthrough, playDanger, playGameOver, playLetter } from "./presentation/audio/sound";
import { AdvisorStrip } from "./presentation/components/AdvisorStrip";
import { DecisionModal } from "./presentation/components/DecisionModal";
import { BuildPanel } from "./presentation/components/BuildPanel";
import { EventLog } from "./presentation/components/EventLog";
import { ExpeditionPanel } from "./presentation/components/ExpeditionPanel";
import { GameEndScreen } from "./presentation/components/GameEndScreen";
import { LawsPanel } from "./presentation/components/LawsPanel";
import { MapPanel } from "./presentation/components/MapPanel";
import { Modal } from "./presentation/components/Modal";
import { NavIcon } from "./presentation/components/NavIcon";
import { StatIcon } from "./presentation/components/StatIcon";
import { PartySelectScreen } from "./presentation/components/PartySelectScreen";
import { PoliticsPanel } from "./presentation/components/PoliticsPanel";
import { ProvinceCard } from "./presentation/components/ProvinceCard";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { ResearchPanel } from "./presentation/components/ResearchPanel";
import { StartScreen } from "./presentation/components/StartScreen";
import { Toasts } from "./presentation/components/Toasts";
import { TopBar } from "./presentation/components/TopBar";
import { FIRST_SECTIONS, lockedReason, politicsSectionFor, reachable, type PanelKey, type Section, type Sections } from "./presentation/navigation";
import { MoneyPanel } from "./presentation/components/MoneyPanel";
import { useGameClock } from "./presentation/hooks/useGameClock";
import { isFeatureOpen } from "./domain/chapters/chapterData";
import { readBriefing } from "./application/chapters";
import { ChapterBriefing } from "./presentation/components/ChapterBriefing";
import { Objectives } from "./presentation/components/Objectives";
import { getChapter } from "./domain/chapters/chapterData";
import { getDifficulty } from "./domain/difficulty/difficultyData";
import { takeBurden } from "./application/actions/burdenActions";
import { BurdenLetter } from "./presentation/components/BurdenLetter";
import type { ReignResult } from "./presentation/components/GameEndScreen";
import { submitReign } from "./presentation/hooks/records";

const SPEED_KEYS: Record<string, GameSpeed> = { "1": 1, "2": 2, "3": 3, "5": 5 };

function App() {
  const { state, saveSlots, startGame, continueGame, resetGame, deleteSlot, renameSlot, pause, resume, setSpeed, dispatch, peekCheckpoint, retryFromCheckpoint } =
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
  // Clicking a province on the map also opens its card (see ProvinceCard).
  const [isProvinceCardOpen, setProvinceCardOpen] = useState(false);
  const selectProvinceOnMap = useCallback((provinceId: string) => {
    setSelectedProvinceId(provinceId);
    setProvinceCardOpen(true);
  }, []);
  const closeProvinceCard = useCallback(() => setProvinceCardOpen(false), []);

  // Which unclaimed island the Ventures panel is showing. Same idea as
  // selectedProvinceId — a UI selection, not simulation truth.
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);

  // Every panel but the map and the always-visible resource ticker is an
  // occasional lookup, not an always-on dashboard, so it lives in an
  // on-demand overlay (HOI4-style tabs) instead of a permanent sidebar —
  // see Modal.tsx and TopBar.tsx.
  const [openModal, setOpenModal] = useState<PanelKey | null>(null);
  // Which section each window shows: remembered between visits, and set
  // directly when an advisor chip or toast points somewhere.
  const [sections, setSections] = useState<Sections>(FIRST_SECTIONS);
  const setSection = useCallback(<K extends keyof Sections>(panel: K, section: Sections[K]) => setSections((s) => ({ ...s, [panel]: section })), []);

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
  // The month so far, cause by cause — summed from the days already
  // booked (see domain/ledger), plus anything done since the last tick.
  const monthLedger = useMemo(
    () => (state ? [...state.history.map((d) => d.ledger ?? emptyLedger()), state.pendingLedger].reduce(mergeLedgers, emptyLedger()) : emptyLedger()),
    [state],
  );
  const shortages = useMemo(() => (state && production ? getMaterialShortages(state, production) : []), [state, production]);
  // What needs the player now — ranked once per day, never inside the map.
  // When food and money run out if nothing changes — once per day.
  const forecasts = useMemo(() => (state && production ? getForecasts(state, production) : { food: null, treasury: null }), [state, production]);
  const advisor = useMemo(
    () => (state && production && heating ? getAdvisorOutlook(state, production, heating, forecasts) : null),
    [state, production, heating, forecasts],
  );

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

  // Each province as a place, once per day — and the map's coarse flags
  // from it, through a string key so they only change identity when a
  // province actually tips (keeps the memoized map from redrawing daily).
  const provinceOverview = useMemo(() => (state ? getProvinceOverview(state) : []), [state]);
  const provinceStatusKey = provinceOverview.map((o) => { const s = getProvinceStatus(o); return `${o.id}:${s.homes}:${s.jobs}:${s.stage}`; }).join(",");
  const provinceStatus = useMemo(
    () =>
      Object.fromEntries(
        (provinceStatusKey ? provinceStatusKey.split(",") : []).map((entry) => {
          const [id, homes, jobs, stage] = entry.split(":");
          return [id, { homes, jobs, stage } as ProvinceStatus];
        }),
      ),
    [provinceStatusKey],
  );

  // The provinces that need you, worst first. Kept in refs so the "Next
  // problem" callback stays the same function and the memoized map isn't
  // redrawn every day for it.
  const troubledIds = useMemo(() => (state ? getTroubledProvinces(state, provinceOverview) : []), [state, provinceOverview]);
  const troubledRef = useRef(troubledIds);
  const selectedRef = useRef(selectedProvinceId);
  useEffect(() => {
    troubledRef.current = troubledIds;
    selectedRef.current = selectedProvinceId;
  }, [troubledIds, selectedProvinceId]);
  const showNextProblem = useCallback(() => {
    const ids = troubledRef.current;
    if (ids.length === 0) return;
    const at = ids.indexOf(selectedRef.current ?? "");
    selectProvinceOnMap(ids[(at + 1) % ids.length]);
  }, [selectProvinceOnMap]);

  const handleSelectIsland = useCallback((islandId: string) => {
    setSelectedIslandId(islandId);
    setOpenModal("ventures");
  }, []);

  // Keyboard shortcuts: Space toggles pause, 1/2/3/5 set speed, N goes to the next province that needs you. Scoped to
  // "nothing else has focus" so they never double-fire alongside a focused
  // button's own Space/Enter handling.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!state || state.isGameOver) return;
      // N means nothing to a focused button, so it works anywhere but a
      // text box (renaming a save slot, say).
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "n" || e.key === "N") && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        showNextProblem();
        return;
      }
      if (e.target !== document.body) return;
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
  }, [state, pause, resume, setSpeed, showNextProblem]);

  // A breakthrough just landed in the log: its own peal. A danger-severity
  // event: an alert, but no more than once every few seconds, since
  // "stability critically low" can repeat daily while it stays that way (see
  // simulateDay.ts) and would otherwise turn into an alarm siren at high
  // game speed.
  const lastEventIdRef = useRef<string | null>(null);
  const lastDangerSoundAt = useRef(0);
  useEffect(() => {
    if (!state || state.events.length === 0) return;
    const newest = state.events[0];
    if (newest.id === lastEventIdRef.current) return;
    // Everything new since last time, for a breakthrough among them (they
    // land mid-day, under whatever came after).
    const seen = state.events.findIndex((e) => e.id === lastEventIdRef.current);
    const fresh = seen === -1 ? [newest] : state.events.slice(0, seen);
    lastEventIdRef.current = newest.id;
    if (fresh.some((e) => e.tier === "breakthrough")) playBreakthrough();
    else if (newest.severity === "danger") {
      const now = Date.now();
      if (now - lastDangerSoundAt.current > 4000) {
        playDanger();
        lastDangerSoundAt.current = now;
      }
    }
  }, [state]);

  // A Long Reign that just ended goes up against the record, once (a ref,
  // so a second run of the effect can't count it again).
  const [reignResult, setReignResult] = useState<ReignResult | null>(null);
  const submittedReign = useRef(false);
  useEffect(() => {
    if (!state?.isGameOver) {
      submittedReign.current = false;
      return;
    }
    if (state.mode !== "long-reign" || submittedReign.current) return;
    submittedReign.current = true;
    setReignResult(submitReign(state));
  }, [state]);

  // The reign just ended — a distinct sting, once.
  const wasGameOver = useRef(false);
  useEffect(() => {
    if (state?.isGameOver && !wasGameOver.current) playGameOver(state.outcome === "victory");
    wasGameOver.current = state?.isGameOver ?? false;
  }, [state?.isGameOver]);

  // A chapter opened (see application/chapters.ts): its letter arrives, and
  // whatever tab is open closes for it.
  const unreadBriefings = state?.chapters.unread.length ?? 0;
  useEffect(() => {
    if (unreadBriefings === 0) return;
    playLetter();
    setOpenModal(null);
  }, [unreadBriefings]);

  // A decision popped up (see simulateDay.ts step 14): a letter arrives,
  // and whatever tab is open closes so it isn't competing with the popup
  // for attention.
  useEffect(() => {
    if (!state?.pendingDecisionId) return;
    playLetter();
    setOpenModal(null);
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
        onSelectParty={(partyId, difficulty, mode) => {
          startGame(pendingNationId, partyId, pendingSlotId ?? 0, difficulty, mode);
          setSelectedProvinceId(pendingNation.capitalProvinceId);
        }}
      />
    );
  }

  if (state.isGameOver) {
    const checkpoint = state.outcome === "victory" ? null : peekCheckpoint();
    const allowed = getDifficulty(state.difficulty).retries;
    return (
      <GameEndScreen
        state={state}
        retry={checkpoint ? { chapterTitle: getChapter(checkpoint.chapters.opened[checkpoint.chapters.opened.length - 1]).title, left: allowed - state.retriesUsed, total: allowed } : null}
        onRetry={retryFromCheckpoint}
        reign={reignResult}
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

  function openPanel(wanted: PanelKey, wantedSection?: Section) {
    // A shut window or section opens somewhere open instead (see navigation.ts).
    const { panel, section } = reachable(state!, { panel: wanted, section: wantedSection });
    if (panel === "build" || panel === "money" || panel === "politics") {
      // Politics with no section given opens on whatever is most urgent.
      const next = section ?? (panel === "politics" ? politicsSectionFor(state!) : undefined);
      if (next) setSections((s) => ({ ...s, [panel]: next }));
    }
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
        locked={{ laws: lockedReason(state, "laws") ?? undefined, research: lockedReason(state, "research") ?? undefined }}
        electionThreshold={getElectionThreshold(state)}
        nationName={nation.name}
        partyName={party.name}
        partyColor={party.color}
        date={state.date}
        isPaused={state.isPaused}
        speed={state.speed}
        stats={state.stats}
        unrestStage={state.unrestStage}
        resources={state.resources}
        shortages={shortages}
        lastDayLedger={state.lastDayLedger}
        monthLedger={monthLedger}
        forecasts={forecasts}
        production={dailyProduction}
        heating={heating!}
        debt={state.debt}
        activePanel={openModal}
        reportsBadgeCount={unseenEventCount}
        advisor={advisor && <AdvisorStrip outlook={advisor} state={state} heating={heating!} dispatch={dispatch} onOpenPanel={openPanel} />}
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
            onSelectProvince={selectProvinceOnMap}
            scoutedIslandIds={state.scoutedIslandIds}
            expeditionIslandIds={expeditionIslandIds}
            selectedIslandId={selectedIslandId}
            onSelectIsland={handleSelectIsland}
            venturesOpen={isFeatureOpen(state, "ventures")}
            foreignRulers={foreignRulers}
            provinceStatus={provinceStatus}
            provinceOverview={provinceOverview}
            problemCount={troubledIds.length}
            onNextProblem={showNextProblem}
          />
          {isProvinceCardOpen &&
            (() => {
              const province = provinceOverview.find((p) => p.id === currentProvinceId);
              return province ? (
                <ProvinceCard state={state} dispatch={dispatch} province={province} onOpenPanel={openPanel} onClose={closeProvinceCard} />
              ) : null;
            })()}
          <Objectives state={state} onOpenPanel={openPanel} />
        </div>
      </main>

      {openModal === "politics" && (
        <Modal title="Politics" window="politics" icon={<NavIcon type="politics" size={22} />} onClose={() => setOpenModal(null)}>
          <PoliticsPanel state={state} dispatch={dispatch} onOpenPanel={openPanel} section={sections.politics} onSection={(section) => setSection("politics", section)} />
        </Modal>
      )}

      {openModal === "build" && (
        <Modal title="Build" window="build" icon={<NavIcon type="build" size={22} />} onClose={() => setOpenModal(null)} wide>
          <BuildPanel
            state={state}
            dispatch={dispatch}
            production={dailyProduction}
            provinces={provinceOverview}
            selectedProvinceId={currentProvinceId}
            onSelectProvince={setSelectedProvinceId}
            onOpenPanel={openPanel}
            section={sections.build}
            onSection={(section) => setSection("build", section)}
          />
        </Modal>
      )}

      {openModal === "money" && (
        <Modal title="Money" window="money" icon={<StatIcon type="treasury" size={22} />} onClose={() => setOpenModal(null)} wide>
          <MoneyPanel
            state={state}
            production={dailyProduction}
            dispatch={dispatch}
            onOpenPanel={openPanel}
            section={sections.money}
            onSection={(section) => setSection("money", section)}
          />
        </Modal>
      )}

      {openModal === "reports" && (
        <Modal title="Reports" window="reports" icon={<NavIcon type="reports" size={22} />} onClose={() => setOpenModal(null)} wide>
          <div className="reports-modal">
            {/* Active projects already live on the Build tab, right next to
                the Build actions that create them — showing the same list
                again here was pure duplication. Reports stays the historical
                record: monthly summaries + the event log. */}
            <ReportsPanel reports={state.monthlyReports} />
            <EventLog events={state.events} onOpenPanel={openPanel} />
          </div>
        </Modal>
      )}

      {openModal === "laws" && (
        <Modal title="Laws" window="laws" icon={<NavIcon type="laws" size={22} />} onClose={() => setOpenModal(null)} wide>
          <LawsPanel state={state} alerts={advisor?.alerts ?? []} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "research" && (
        <Modal title="Research" window="research" icon={<NavIcon type="research" size={22} />} onClose={() => setOpenModal(null)} wide>
          <ResearchPanel state={state} alerts={advisor?.alerts ?? []} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "ventures" && (
        <Modal title="Ventures" window="ventures" icon={<NavIcon type="ventures" size={22} />} onClose={() => setOpenModal(null)}>
          <ExpeditionPanel state={state} selectedIslandId={selectedIslandId} dispatch={dispatch} />
        </Modal>
      )}

      <Toasts events={state.events} monthlyReports={state.monthlyReports} isPaused={state.isPaused} onOpenPanel={openPanel} />

      {/* A chapter's briefing comes first; a decision letter waits behind it. */}
      <ChapterBriefing
        state={state}
        onRead={(id) => {
          dispatch((s) => readBriefing(s, id));
          // The opening letter is read before the clock first starts.
          if (id !== "first-winter") resume();
        }}
      />
      {/* A new term's burden is chosen before any other letter is read. */}
      {state.chapters.unread.length === 0 && (
        <BurdenLetter
          state={state}
          onTake={(id) => {
            dispatch((s) => takeBurden(s, id));
            resume();
          }}
        />
      )}
      {state.chapters.unread.length === 0 && !state.burdenOffer && (
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
      )}
    </div>
  );
}

export default App;
