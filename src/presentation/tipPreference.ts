// When an explanation appears on hover: the game's tooltips (Tooltips.tsx)
// and the province card on the map (MapPanel.tsx) both follow it.
//
// A tip waits for the pointer to come to rest on something, so sweeping
// the mouse across the screen shows nothing; holding Shift shows one at
// once. The player can also turn resting tips off from the clock (TopBar),
// leaving Shift as the only way to ask; keyboard focus and a finger's
// press-and-hold still show them, being deliberate already.

const TIPS_KEY = "theworldgame-tips";

// How long the pointer must stay still before a tip appears.
export const TIP_REST_MS = 650;
// Reading along a row: once a tip has shown, the next needs a shorter rest.
export const TIP_REST_WARM_MS = 300;
// How far (px) the pointer may drift and still count as resting.
export const TIP_REST_SLOP = 4;

let tipsOn: boolean | null = null;

export function areTipsOn(): boolean {
  if (tipsOn === null) {
    try {
      tipsOn = localStorage.getItem(TIPS_KEY) !== "0";
    } catch {
      tipsOn = true;
    }
  }
  return tipsOn;
}

export function setTipsOn(on: boolean): void {
  tipsOn = on;
  try {
    localStorage.setItem(TIPS_KEY, on ? "1" : "0");
  } catch {
    // Storage unavailable: the choice holds for this session only.
  }
}
