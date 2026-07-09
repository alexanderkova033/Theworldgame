// App.tsx is the seam between the presentation layer and the rest of the
// app: it owns the live GameState (via useGameClock) and wires it into the
// UI panels. It never computes simulation values itself.
import { ActionsPanel } from "./presentation/components/ActionsPanel";
import { EventLog } from "./presentation/components/EventLog";
import { ProjectsPanel } from "./presentation/components/ProjectsPanel";
import { ReportsPanel } from "./presentation/components/ReportsPanel";
import { StatsPanel } from "./presentation/components/StatsPanel";
import { TopBar } from "./presentation/components/TopBar";
import { useGameClock } from "./presentation/hooks/useGameClock";

function App() {
  const { state, pause, resume, setSpeed, dispatch } = useGameClock();

  return (
    <div className="game-layout">
      <TopBar
        date={state.date}
        isPaused={state.isPaused}
        speed={state.speed}
        onPause={pause}
        onResume={resume}
        onSetSpeed={setSpeed}
      />

      <main className="game-layout__main">
        <div className="game-layout__column">
          <StatsPanel stats={state.stats} taxRate={state.taxRate} />
          <ActionsPanel state={state} dispatch={dispatch} />
        </div>

        <div className="game-layout__column">
          <ProjectsPanel projects={state.projects} />
          <ReportsPanel reports={state.monthlyReports} />
        </div>

        <div className="game-layout__column">
          <EventLog events={state.events} />
        </div>
      </main>
    </div>
  );
}

export default App;
