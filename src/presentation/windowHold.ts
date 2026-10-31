// Which window is open, and whether a letter is holding it back. A letter
// that arrives takes the window off the screen without closing it, and once
// the last letter is dealt with it comes back as it was. Going anywhere
// meanwhile counts for more: that choice replaces the window held back.
import type { PanelKey } from "./navigation";

export interface WindowHold {
  open: PanelKey | null;
  heldBack: boolean;
}

export const NO_WINDOW: WindowHold = { open: null, heldBack: false };

// The player chose a window, or (with null) to close it.
export function chooseWindow(panel: PanelKey | null): WindowHold {
  return { open: panel, heldBack: false };
}

export function holdWindowBack(windows: WindowHold): WindowHold {
  return windows.open && !windows.heldBack ? { ...windows, heldBack: true } : windows;
}

export function giveWindowBack(windows: WindowHold): WindowHold {
  return windows.heldBack ? { ...windows, heldBack: false } : windows;
}
