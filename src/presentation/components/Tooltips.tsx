// One tooltip for the whole game, in paper and ink. Much of the game
// explains itself on hover, through plain `title` attributes; the
// browser's own tooltip for those takes about a second to appear and looks
// like the operating system, not the ledger. This takes over any `title`
// while its element is pointed at or focused: the attribute is set aside
// (so the browser's tooltip doesn't also show), the text appears in a
// styled box after a short delay, and the attribute comes back after.
//
// SVG <title> children (the map, the chamber's seats) keep the browser's
// tooltip: React owns those nodes, and taking them out of the page would
// break its updates.
//
// A finger has no hover, so on a touch screen a tip comes from pressing and
// holding instead: it shows once the finger has rested a moment, stays
// after it lifts so it can be read, and goes at the next touch. That hold
// is not also a tap on the button underneath.
import "./Tooltips.css";
import { useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 200;
const WARM_MS = 300; // moving straight on to another tip shows it at once
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
  describedBy: string | null;
}

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

  useEffect(() => {
    // Put the title back, unless the page has set a new one meanwhile.
    function release() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      const h = held.current;
      if (!h) return;
      held.current = null;
      if (!h.el.hasAttribute("title")) h.el.setAttribute("title", h.title);
      if (h.describedBy === null) h.el.removeAttribute("aria-describedby");
      else h.el.setAttribute("aria-describedby", h.describedBy);
      setTip(null);
      lastHidden.current = Date.now();
    }

    function take(el: Element, now = false) {
      if (held.current?.el === el) return;
      release();
      const title = el.getAttribute("title");
      if (!title) return;
      held.current = { el, title, describedBy: el.getAttribute("aria-describedby") };
      el.removeAttribute("title");
      el.setAttribute("aria-describedby", TOOLTIP_ID);
      const show = () => held.current?.el === el && setTip(placeFor(el, title));
      if (now || Date.now() - lastHidden.current < WARM_MS) show();
      else timer.current = setTimeout(show, SHOW_DELAY_MS);
    }

    const titled = (target: EventTarget | null) => (target instanceof Element ? target.closest("[title]") : null);

    function cancelHold() {
      if (hold.current) clearTimeout(hold.current.timer);
      hold.current = null;
    }

    function onOver(e: PointerEvent) {
      // A tap's pretend hover would pop a tip on every touch.
      if (e.pointerType !== "mouse") return;
      const el = titled(e.target);
      if (el) take(el);
      else if (held.current && !(e.target instanceof Node && held.current.el.contains(e.target))) release();
    }
    function onOut(e: PointerEvent) {
      // A tip a finger asked for stays once the finger lifts.
      if (e.pointerType !== "mouse") return;
      const h = held.current;
      if (h && !(e.relatedTarget instanceof Node && h.el.contains(e.relatedTarget))) release();
    }
    function onFocus(e: FocusEvent) {
      const el = titled(e.target);
      // Keyboard focus only: a tap focuses a button too, and a tip on every
      // tap is what the hold is there to avoid.
      if (el && el === e.target && el.matches(":focus-visible")) take(el);
    }
    function onDown(e: PointerEvent) {
      release();
      cancelHold();
      swallowClick.current = false;
      if (e.pointerType === "mouse" || !e.isPrimary) return;
      const el = titled(e.target);
      if (!el) return;
      const timer = setTimeout(() => {
        hold.current = null;
        if (!el.isConnected) return;
        take(el, true);
        swallowClick.current = true;
      }, HOLD_MS);
      hold.current = { timer, x: e.clientX, y: e.clientY, id: e.pointerId };
    }
    function onMove(e: PointerEvent) {
      const h = hold.current;
      if (h && h.id === e.pointerId && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP) cancelHold();
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
