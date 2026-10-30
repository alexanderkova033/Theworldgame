// One tooltip for the whole game, in paper and ink. Much of the game
// explains itself on hover, through plain `title` attributes; the
// browser's own tooltip for those looks like the operating system, not the
// ledger. This takes over any `title` while its element is pointed at or
// focused: the attribute is set aside (so the browser's tooltip doesn't
// also show), the text appears in a styled box, and the attribute comes
// back after.
//
// A tip is asked for, not thrown at the player: it appears only once the
// mouse has come to rest on something (tipPreference.ts), so moving across
// the screen to get somewhere shows nothing, and a click puts it away
// until the pointer leaves. Holding Shift shows it at once, and is the
// only way to ask when the player has turned resting tips off.
//
// Drawn things (the map, the chamber's seats) carry `data-tip` instead: an SVG
// title element would bring the browser's own tooltip back beside this one. A title
// that changes while it's pointed at (a figure ticking over) is set aside
// again as it arrives, and a click only hides the box: the title stays aside
// until the pointer leaves.
//
// A finger has no hover, so on a touch screen a tip comes from pressing and
// holding instead: it shows once the finger has rested a moment, stays
// after it lifts so it can be read, and goes at the next touch. That hold
// is not also a tap on the button underneath.
import "./Tooltips.css";
import { useEffect, useRef, useState } from "react";
import { areTipsOn, TIP_REST_MS, TIP_REST_SLOP, TIP_REST_WARM_MS } from "../tipPreference";

const FOCUS_DELAY_MS = 200; // a keyboard focus is already deliberate
const WARM_MS = 800; // a tip shown this recently makes the next rest shorter
const GAP = 8; // px between the element and the tip
const HOLD_MS = 450; // a finger resting this long asks for the tip
const HOLD_SLOP = 10; // px a resting finger may wander before it counts as a drag
const TOOLTIP_ID = "game-tooltip";

interface Tip {
  text: string;
  x: number;
  y: number;
  above: boolean;
}

interface Held {
  el: Element;
  title: string;
  fromTitle: boolean; // a `title` set aside, to put back; a `data-tip` just stays
  describedBy: string | null;
  watcher: MutationObserver;
}

const TIPPED = "[title],[data-tip],[data-tip-held]";

function placeFor(el: Element, text: string): Tip {
  const rect = el.getBoundingClientRect();
  const above = rect.bottom + 80 > window.innerHeight;
  return { text, x: rect.left + rect.width / 2, y: above ? rect.top - GAP : rect.bottom + GAP, above };
}

export function Tooltips() {
  const [tip, setTip] = useState<Tip | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const held = useRef<Held | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHidden = useRef(0);
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; id: number } | null>(null);
  const swallowClick = useRef(false);
  const shown = useRef(false);
  const rest = useRef({ x: 0, y: 0 }); // where the mouse last came to rest
  const shift = useRef(false);
  const dismissed = useRef<Element | null>(null); // clicked: no tip until the pointer leaves

  useEffect(() => {
    // Put the title back, unless the page has set a new one meanwhile.
    function release() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const h = held.current;
      if (!h) return;
      held.current = null;
      h.watcher.disconnect();
      h.el.removeAttribute("data-tip-held");
      if (h.fromTitle && !h.el.hasAttribute("title")) h.el.setAttribute("title", h.title);
      if (h.describedBy === null) h.el.removeAttribute("aria-describedby");
      else h.el.setAttribute("aria-describedby", h.describedBy);
      setTip(null);
      if (shown.current) lastHidden.current = Date.now();
      shown.current = false;
    }

    function show() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const h = held.current;
      if (!h || shown.current || !h.el.isConnected) return;
      shown.current = true;
      setTip(placeFor(h.el, h.title));
    }

    // Hold on to an element's title (so the browser's own tip stays away)
    // without showing anything yet.
    function take(el: Element): boolean {
      if (held.current?.el === el) return true;
      release();
      const ownTitle = el.getAttribute("title");
      const title = ownTitle || el.getAttribute("data-tip");
      if (!title) return false;
      // The page may set a new title while this one is aside (a daily figure
      // in its text): take that too, and show it if the tip is up.
      const watcher = new MutationObserver(() => {
        const fresh = el.getAttribute("title");
        const h = held.current;
        if (fresh === null || !h || h.el !== el) return;
        el.removeAttribute("title");
        h.title = fresh;
        if (shown.current) setTip((tip) => (tip ? { ...tip, text: fresh } : tip));
      });
      watcher.observe(el, { attributes: true, attributeFilter: ["title"] });
      held.current = { el, title, fromTitle: ownTitle !== null, describedBy: el.getAttribute("aria-describedby"), watcher };
      el.removeAttribute("title");
      el.setAttribute("data-tip-held", "");
      el.setAttribute("aria-describedby", TOOLTIP_ID);
      return true;
    }

    // Put the box away but keep the title aside, for a click: the browser's
    // own tip would otherwise come up under a pointer that's still there.
    function hide() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setTip(null);
      if (shown.current) lastHidden.current = Date.now();
      shown.current = false;
    }

    // (Re)start the wait for the mouse to settle.
    function awaitRest() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (!held.current || shown.current) return;
      if (shift.current) return show();
      if (!areTipsOn()) return;
      const warm = Date.now() - lastHidden.current < WARM_MS;
      timer.current = setTimeout(show, warm ? TIP_REST_WARM_MS : TIP_REST_MS);
    }

    const titled = (target: EventTarget | null) => (target instanceof Element ? target.closest(TIPPED) : null);

    function cancelHold() {
      if (hold.current) clearTimeout(hold.current.timer);
      hold.current = null;
    }

    function onOver(e: PointerEvent) {
      // A tap's pretend hover would pop a tip on every touch.
      if (e.pointerType !== "mouse") return;
      // The nearest tipped thing: a part of the one already held stays with
      // it (it's marked), and one with its own title inside it takes over,
      // so that title can't show as the browser's tip.
      const el = titled(e.target);
      if (el && el === dismissed.current) return;
      if (el && held.current?.el !== el) {
        if (take(el)) {
          rest.current = { x: e.clientX, y: e.clientY };
          awaitRest();
        }
      } else if (!el && held.current && !(e.target instanceof Node && held.current.el.contains(e.target))) release();
    }
    function onOut(e: PointerEvent) {
      // A tip a finger asked for stays once the finger lifts.
      if (e.pointerType !== "mouse") return;
      const stillIn = (el: Element) => e.relatedTarget instanceof Node && el.contains(e.relatedTarget);
      if (dismissed.current && !stillIn(dismissed.current)) dismissed.current = null;
      const h = held.current;
      // Inside it, but on something with a tip of its own: onOver takes over.
      if (h && !stillIn(h.el)) release();
    }
    function onFocus(e: FocusEvent) {
      const el = titled(e.target);
      // Keyboard focus only: a tap focuses a button too, and a tip on every
      // tap is what the hold is there to avoid.
      if (el && el === e.target && el.matches(":focus-visible") && take(el)) {
        timer.current = setTimeout(show, FOCUS_DELAY_MS);
      }
    }
    function onDown(e: PointerEvent) {
      const h = held.current;
      const onHeld = h && e.target instanceof Node && h.el.contains(e.target);
      dismissed.current = e.pointerType !== "mouse" ? null : onHeld ? h.el : titled(e.target);
      if (e.pointerType === "mouse" && onHeld) hide();
      else release();
      cancelHold();
      swallowClick.current = false;
      if (e.pointerType === "mouse" || !e.isPrimary) return;
      const el = titled(e.target);
      if (!el) return;
      const timer = setTimeout(() => {
        hold.current = null;
        if (!el.isConnected || !take(el)) return;
        show();
        swallowClick.current = true;
      }, HOLD_MS);
      hold.current = { timer, x: e.clientX, y: e.clientY, id: e.pointerId };
    }
    function onMove(e: PointerEvent) {
      const h = hold.current;
      if (h && h.id === e.pointerId && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP) cancelHold();
      // Still travelling: the wait starts over from here.
      if (e.pointerType === "mouse" && held.current && !shown.current) {
        if (Math.hypot(e.clientX - rest.current.x, e.clientY - rest.current.y) > TIP_REST_SLOP) {
          rest.current = { x: e.clientX, y: e.clientY };
          awaitRest();
        }
      }
    }
    function onUp(e: PointerEvent) {
      if (hold.current?.id === e.pointerId) cancelHold();
    }
    function onClick(e: MouseEvent) {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
    // Only the tipped element losing focus ends its tip: on a touch screen
    // the last button tapped loses focus as a hold ends, which would take
    // the tip the hold has just shown.
    function onFocusOut(e: FocusEvent) {
      if (held.current && e.target instanceof Node && held.current.el.contains(e.target)) release();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") release();
      if (e.key === "Shift") {
        shift.current = true;
        if (held.current) show();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") shift.current = false;
    }
    function onBlur() {
      shift.current = false;
    }

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", release, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      release();
      cancelHold();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", release, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Keep the box inside the window once its width is known.
  useEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return;
    const half = box.offsetWidth / 2;
    const x = Math.min(window.innerWidth - half - GAP, Math.max(half + GAP, tip.x));
    box.style.left = `${x}px`;
  }, [tip]);

  return (
    <div
      ref={boxRef}
      id={TOOLTIP_ID}
      role="tooltip"
      className={`game-tooltip ${tip ? "is-shown" : ""} ${tip?.above ? "is-above" : ""}`}
      style={tip ? { left: tip.x, top: tip.y } : undefined}
    >
      {tip?.text}
    </div>
  );
}
