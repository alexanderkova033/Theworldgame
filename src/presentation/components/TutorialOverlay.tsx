import "./TutorialOverlay.css";
import { useEffect, useState } from "react";
import type { PanelKey } from "./TopBar";

export interface TutorialStep {
  title: string;
  body: string;
  target: string | null; // a data-tutorial selector value, or null to center on screen
  panel: PanelKey | null; // a panel to open while this step is showing, or null to close whatever's open
}

// The first-run spotlight tour: highlights real, already-rendered UI
// elements (see the data-tutorial attributes on TopBar's tabs/ticker/pause
// row and App.tsx's map stage) rather than a slideshow of screenshots, so it
// always matches whatever's actually on screen. One step per major system —
// see TUTORIAL_STEPS below.
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to The World Game",
    body: "You've just taken the helm of a young nation. This short tour covers the controls — skip it any time, or replay it later from the \"?\" button.",
    target: null,
    panel: null,
  },
  {
    title: "The Map",
    body: "Your provinces, always on screen. Click one to build there — see the Economy tab for what you can build.",
    target: "map",
    panel: null,
  },
  {
    title: "The Ticker",
    body: "Treasury, population, food, industry, stability, popularity, and your raw resources — always visible, never buried in a menu.",
    target: "ticker",
    panel: null,
  },
  {
    title: "Pause & Speed",
    body: "The game runs on its own once you leave the start screen. Pause any time, or push the pace up to 5x once you've got a rhythm.",
    target: "pause-speed",
    panel: null,
  },
  {
    title: "Politics",
    body: "Your popularity is a zero-sum tug-of-war with the rival party — stay ahead of them, or a general election ends your government.",
    target: "tab-politics",
    panel: "politics",
  },
  {
    title: "Economy",
    body: "Build farms, factories, and roads on your provinces, and keep an eye on today's production, itemized.",
    target: "tab-economy",
    panel: "economy",
  },
  {
    title: "Trade",
    body: "Barter resources on the open market, buy or sell them outright for Crowns, or take out a loan when the treasury runs short — rates move with supply and demand.",
    target: "tab-trade",
    panel: "trade",
  },
  {
    title: "Laws",
    body: "A branching tree of policy — each one is a vote, not a guarantee, and the opposition has its own opinion on every branch.",
    target: "tab-laws",
    panel: "laws",
  },
  {
    title: "Research",
    body: "A second tree, paid for in research points instead of your country's condition — invest in education to improve your odds.",
    target: "tab-research",
    panel: "research",
  },
  {
    title: "Reports",
    body: "Monthly reports, active construction, and the full event log — everything that's happened, in one place.",
    target: "tab-reports",
    panel: "reports",
  },
  {
    title: "Ventures",
    body: "Send expeditions to unclaimed islands for one-time rewards — a nice bonus once your home nation is stable.",
    target: "tab-ventures",
    panel: "ventures",
  },
  {
    title: "You're ready",
    body: "That's the whole toolkit. Good luck out there.",
    target: null,
    panel: null,
  },
];

interface TutorialOverlayProps {
  step: number | null;
  onAdvance: (nextStep: number | null) => void;
  onSkip: () => void;
}

// A CSS-only spotlight: a box-shadow "hole" the size of the target element,
// with a huge spread so everything outside it reads as darkened backdrop —
// no canvas, no extra library, just one absolutely-positioned div per step.
function useTargetRect(selector: string | null): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let frame: number;
    function tick() {
      const el = document.querySelector(`[data-tutorial="${selector}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [selector]);

  return rect;
}

export function TutorialOverlay({ step, onAdvance, onSkip }: TutorialOverlayProps) {
  const active = typeof step === "number" && step >= 0 && step < TUTORIAL_STEPS.length;
  const current = active ? TUTORIAL_STEPS[step] : null;
  const rect = useTargetRect(current?.target ?? null);

  if (!active || !current) return null;

  const isLast = step === TUTORIAL_STEPS.length - 1;

  // The card needs real room to render in, not just a non-negative offset —
  // a target near the top of the screen (like the map, which fills nearly
  // the whole viewport) leaves too little space either above or below it,
  // so fall back to a centered card overlapping the spotlight rather than
  // clipping the card off the top of the screen.
  const CARD_HEIGHT_ESTIMATE = 220;
  const cardStyle = (() => {
    if (!rect) return null;
    const left = Math.min(Math.max(rect.left, 16), window.innerWidth - 356);
    if (window.innerHeight - rect.bottom > CARD_HEIGHT_ESTIMATE) return { top: rect.bottom + 18, left };
    if (rect.top > CARD_HEIGHT_ESTIMATE) return { top: rect.top - 18, left, transform: "translateY(-100%)" };
    return null;
  })();

  return (
    <div className="tutorial-overlay" onClick={() => onAdvance(isLast ? null : step + 1)}>
      {rect ? (
        <div
          className="tutorial-overlay__hole"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      ) : (
        <div className="tutorial-overlay__backdrop" />
      )}

      <div
        className={`panel tutorial-overlay__card ${cardStyle ? "" : "tutorial-overlay__card--centered"}`}
        style={cardStyle ?? undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="tutorial-overlay__step">
          Step {step + 1} of {TUTORIAL_STEPS.length}
        </p>
        <h3 className="tutorial-overlay__title">{current.title}</h3>
        <p className="tutorial-overlay__body">{current.body}</p>
        <div className="tutorial-overlay__actions">
          <button className="tutorial-overlay__skip" onClick={onSkip}>
            Skip Tour
          </button>
          <div className="tutorial-overlay__nav">
            {step > 0 && <button onClick={() => onAdvance(step - 1)}>Back</button>}
            <button className="is-active" onClick={() => onAdvance(isLast ? null : step + 1)}>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
