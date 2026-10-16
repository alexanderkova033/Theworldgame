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
import "./Tooltips.css";
import { useEffect, useRef, useState } from "react";

const SHOW_DELAY_MS = 200;
const WARM_MS = 300; // moving straight on to another tip shows it at once
const GAP = 8; // px between the element and the tip
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

    function take(el: Element) {
      if (held.current?.el === el) return;
      release();
      const title = el.getAttribute("title");
      if (!title) return;
      held.current = { el, title, describedBy: el.getAttribute("aria-describedby") };
      el.removeAttribute("title");
      el.setAttribute("aria-describedby", TOOLTIP_ID);
      const show = () => held.current?.el === el && setTip(placeFor(el, title));
      if (Date.now() - lastHidden.current < WARM_MS) show();
      else timer.current = setTimeout(show, SHOW_DELAY_MS);
    }

    const titled = (target: EventTarget | null) => (target instanceof Element ? target.closest("[title]") : null);

    function onOver(e: PointerEvent) {
      const el = titled(e.target);
      if (el) take(el);
      else if (held.current && !(e.target instanceof Node && held.current.el.contains(e.target))) release();
    }
    function onOut(e: PointerEvent) {
      const h = held.current;
      if (h && !(e.relatedTarget instanceof Node && h.el.contains(e.relatedTarget))) release();
    }
    function onFocus(e: FocusEvent) {
      const el = titled(e.target);
      if (el && el === e.target) take(el);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") release();
    }

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", release);
    document.addEventListener("pointerdown", release);
    window.addEventListener("scroll", release, true);
    window.addEventListener("keydown", onKey);
    return () => {
      release();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", release);
      document.removeEventListener("pointerdown", release);
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
