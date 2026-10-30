// On a phone the game doesn't fit yet: the clock and half the figures fall off
// the screen. Better said at the door than found out in the first minute. It
// can still be waved aside.
import "./PhoneNotice.css";
import { useState } from "react";

// A touch screen whose short side is a phone's. A tablet's is 700 or more.
const PHONE_SHORT_SIDE = 600;

function isPhone(): boolean {
  return matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < PHONE_SHORT_SIDE;
}

export function PhoneNotice() {
  const [shown, setShown] = useState(isPhone);
  if (!shown) return null;
  return (
    <div className="phone-notice" role="dialog" aria-labelledby="phone-notice-title">
      <h1 id="phone-notice-title" className="phone-notice__title">
        Better on a bigger screen
      </h1>
      <p className="phone-notice__text">The World Game doesn't fit a phone yet. Open this page on a computer, or on a tablet held sideways.</p>
      <button type="button" className="phone-notice__go" onClick={() => setShown(false)}>
        Try it anyway
      </button>
    </div>
  );
}
