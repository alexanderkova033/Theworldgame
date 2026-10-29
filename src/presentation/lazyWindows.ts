// The windows, loaded only when first wanted: the map, the top bar and the
// letters come in the first download, everything behind a tab follows. Once
// a game is under way the rest are fetched while the browser is idle, so the
// first open of a tab doesn't wait on the network.
import { lazy } from "react";

const loaders = {
  politics: () => import("./components/PoliticsPanel"),
  build: () => import("./components/BuildPanel"),
  money: () => import("./components/MoneyPanel"),
  reports: () => import("./components/ReportsPanel"),
  eventLog: () => import("./components/EventLog"),
  laws: () => import("./components/LawsPanel"),
  research: () => import("./components/ResearchPanel"),
  army: () => import("./components/ArmyPanel"),
  ventures: () => import("./components/ExpeditionPanel"),
  end: () => import("./components/GameEndScreen"),
  party: () => import("./components/PartySelectScreen"),
};

export const PoliticsPanel = lazy(() => loaders.politics().then((m) => ({ default: m.PoliticsPanel })));
export const BuildPanel = lazy(() => loaders.build().then((m) => ({ default: m.BuildPanel })));
export const MoneyPanel = lazy(() => loaders.money().then((m) => ({ default: m.MoneyPanel })));
export const ReportsPanel = lazy(() => loaders.reports().then((m) => ({ default: m.ReportsPanel })));
export const EventLog = lazy(() => loaders.eventLog().then((m) => ({ default: m.EventLog })));
export const LawsPanel = lazy(() => loaders.laws().then((m) => ({ default: m.LawsPanel })));
export const ResearchPanel = lazy(() => loaders.research().then((m) => ({ default: m.ResearchPanel })));
export const ArmyPanel = lazy(() => loaders.army().then((m) => ({ default: m.ArmyPanel })));
export const ExpeditionPanel = lazy(() => loaders.ventures().then((m) => ({ default: m.ExpeditionPanel })));
export const GameEndScreen = lazy(() => loaders.end().then((m) => ({ default: m.GameEndScreen })));
export const PartySelectScreen = lazy(() => loaders.party().then((m) => ({ default: m.PartySelectScreen })));

let preloaded = false;

// Fetch every window in the background, once, when the browser has a moment.
export function preloadWindows(): void {
  if (preloaded) return;
  preloaded = true;
  const load = () => {
    for (const loader of Object.values(loaders)) void loader();
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 1500);
}
