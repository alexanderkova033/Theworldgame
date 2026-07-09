// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import { useState } from "react";
import { getNation } from "./domain/nations/nationRules";
import { NATIONS } from "./domain/nations/nationData";
import { ActionsPanel } from "./presentation/components/ActionsPanel";
import { EventLog } from "./presentation/components/EventLog";
import { MapPanel } from "./presentation/components/MapPanel";
import { ProjectsPanel } from "./presentation/components/ProjectsPanel";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { StartScreen } from "./presentation/components/StartScreen";
import { StatsPanel } from "./presentation/components/StatsPanel";
import { TopBar } from "./presentation/components/TopBar";
import { useGameClock } from "./presentation/hooks/useGameClock";

function App() {
  const { state, startGame, pause, resume, setSpeed, dispatch } = useGameClock();

  // Which province new construction goes into. This is a UI selection, not
  // simulation truth — it never touches GameState directly.
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);

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
      />

      <main className="game-layout__main">
        <div className="game-layout__map-row">
          <MapPanel
            nation={nation}
            placedBuildings={state.placedBuildings}
            selectedProvinceId={currentProvinceId}
            onSelectProvince={setSelectedProvinceId}
          />
        </div>

        <div className="game-layout__columns">
          <div className="game-layout__column">
            <StatsPanel stats={state.stats} taxRate={state.taxRate} />
            <ActionsPanel state={state} selectedProvinceId={currentProvinceId} dispatch={dispatch} />
          </div>

          <div className="game-layout__column">
            <ProjectsPanel projects={state.projects} />
            <ReportsPanel reports={state.monthlyReports} />
          </div>

          <div className="game-layout__column">
            <EventLog events={state.events} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
