// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import "./App.css";
import { useState } from "react";
import { getNation } from "./domain/nations/nationRules";
import { NATIONS } from "./domain/nations/nationData";
import { ActionsPanel } from "./presentation/components/ActionsPanel";
import { EventLog } from "./presentation/components/EventLog";
import { ExpeditionPanel } from "./presentation/components/ExpeditionPanel";
import { LawsPanel } from "./presentation/components/LawsPanel";
import { MapPanel } from "./presentation/components/MapPanel";
import { Modal } from "./presentation/components/Modal";
import { ProjectsPanel } from "./presentation/components/ProjectsPanel";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { ResourcesPanel } from "./presentation/components/ResourcesPanel";
import { StartScreen } from "./presentation/components/StartScreen";
import { StatsPanel } from "./presentation/components/StatsPanel";
import { TopBar } from "./presentation/components/TopBar";
import { TradePanel } from "./presentation/components/TradePanel";
import { useGameClock } from "./presentation/hooks/useGameClock";

function App() {
  const { state, startGame, pause, resume, setSpeed, dispatch } = useGameClock();

  // Which province new construction goes into. This is a UI selection, not
  // simulation truth — it never touches GameState directly.
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

  // Which unclaimed island the Ventures panel is showing. Same idea as
  // selectedProvinceId — a UI selection, not simulation truth.
  const [selectedIslandId, setSelectedIslandId] = useState<string | null>(null);

  // Laws and Ventures are occasional decisions, not always-on dashboards, so
  // they live in an on-demand overlay instead of a permanently-visible
  // sidebar panel — see Modal.tsx.
  const [openModal, setOpenModal] = useState<"laws" | "ventures" | null>(null);

  // No game yet: show the start screen. Picking a nation here is permanent —
  // there is no "change nation" control anywhere in the game UI below.
  if (!state) {
    return (
      <StartScreen
        nations={NATIONS}
        onSelectNation={(nationId) => {
          startGame(nationId);
          setSelectedProvinceId(getNation(nationId).capitalProvinceId);
        }}
      />
    );
  }

  const nation = getNation(state.nationId);
  const currentProvinceId = selectedProvinceId ?? nation.capitalProvinceId;

  return (
    <div className="game-layout">
      <TopBar
        nationName={nation.name}
        date={state.date}
        isPaused={state.isPaused}
        speed={state.speed}
        onPause={pause}
        onResume={resume}
        onSetSpeed={setSpeed}
        onOpenLaws={() => setOpenModal("laws")}
        onOpenVentures={() => setOpenModal("ventures")}
      />

      <main className="game-layout__main">
        <aside className="game-layout__sidebar game-layout__sidebar--left">
          <StatsPanel stats={state.stats} />
          <ResourcesPanel resources={state.resources} />
          <ActionsPanel state={state} selectedProvinceId={currentProvinceId} dispatch={dispatch} />
          <TradePanel state={state} dispatch={dispatch} />
        </aside>

        <div className="game-layout__map-stage">
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

        <aside className="game-layout__sidebar game-layout__sidebar--right">
          <ProjectsPanel projects={state.projects} />
          <ReportsPanel reports={state.monthlyReports} />
          <EventLog events={state.events} />
        </aside>
      </main>

      {openModal === "laws" && (
        <Modal title="Laws" onClose={() => setOpenModal(null)}>
          <LawsPanel state={state} dispatch={dispatch} />
        </Modal>
      )}

      {openModal === "ventures" && (
        <Modal title="Ventures" onClose={() => setOpenModal(null)}>
          <ExpeditionPanel state={state} selectedIslandId={selectedIslandId} dispatch={dispatch} />
        </Modal>
      )}
    </div>
  );
}

export default App;
