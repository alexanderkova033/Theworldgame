import "./Modal.css";
import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface Offset {
  x: number;
  y: number;
}

// Where each window was dragged to, kept for the session: it opens there
// again next time.
const OFFSETS = new Map<string, Offset>();

// How much of a dragged window must stay on screen: enough of its title
// band to grab it back.
const KEEP_VISIBLE = 140;
const HEADER_HEIGHT = 56;

interface ModalProps {
  title: string;
  onClose?: () => void; // absent: a letter that must be answered, with no way to close it
  children: React.ReactNode;
  wide?: boolean;
  // A small glyph shown beside the title — normally the same NavIcon
  // as the tab that opened this modal, so the panel reads as the same object
  // scaled up rather than a plain text-titled box indistinguishable from any
  // other modal.
  icon?: React.ReactNode;
  // Which window this is: each inks its headings and open tab in its own
  // colour (see the --ink-* tokens in index.css).
  window?: string;
  // Docked to the right with no wash, and the map beside it still takes
  // clicks (Build: pick the province on the map).
  side?: boolean;
}

// A generic overlay for panels that are an occasional decision rather than an
// always-on dashboard — every panel but the map itself now opens this way
// (HOI4-style tabs instead of permanent sidebars), so the map stays the star.
//
// Not aria-modal: the top bar stays live above it on purpose (switch tabs,
// pause), so the rest of the page isn't inert while it's open.
//
// A window (not a letter) moves by dragging its title band. Once moved it
// sits beside the map rather than over it: no wash, and the map takes
// clicks. A double-click on the band puts it back.
export function Modal({ title, onClose, children, wide = false, icon, window: windowKey, side = false }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const movable = windowKey !== undefined;
  const [offset, setOffset] = useState<Offset | null>(() => (windowKey ? OFFSETS.get(windowKey) ?? null : null));
  const drag = useRef<{ startX: number; startY: number; from: Offset; base: DOMRect } | null>(null);

  function startDrag(e: ReactPointerEvent<HTMLElement>) {
    if (!movable || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const from = offset ?? { x: 0, y: 0 };
    const rect = dialog.getBoundingClientRect();
    // Where the window sits with no offset, to keep it on screen from.
    const base = new DOMRect(rect.x - from.x, rect.y - from.y, rect.width, rect.height);
    drag.current = { startX: e.clientX, startY: e.clientY, from, base };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function moveDrag(e: ReactPointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d) return;
    const x = d.from.x + e.clientX - d.startX;
    const y = d.from.y + e.clientY - d.startY;
    setOffset({
      x: Math.min(window.innerWidth - KEEP_VISIBLE - d.base.left, Math.max(KEEP_VISIBLE - d.base.right, x)),
      y: Math.min(window.innerHeight - HEADER_HEIGHT - d.base.top, Math.max(-d.base.top, y)),
    });
  }

  function endDrag() {
    if (!drag.current) return;
    drag.current = null;
    if (windowKey && offset) OFFSETS.set(windowKey, offset);
  }

  function resetPosition() {
    if (!movable) return;
    setOffset(null);
    if (windowKey) OFFSETS.delete(windowKey);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Keyboard focus moves into the panel when it opens, and back to whatever
  // opened it when it closes — unless focus has already gone somewhere else
  // (another tab was clicked, which is about to open its own panel).
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.focus({ preventScroll: true });
    return () => {
      const focus = document.activeElement;
      const focusWasInside = !focus || focus === document.body || dialog?.contains(focus);
      if (focusWasInside && opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className={`modal-overlay ${side ? "modal-overlay--side" : ""} ${offset ? "modal-overlay--moved" : ""}`} onClick={side || offset ? undefined : onClose}>
      <div
        ref={dialogRef}
        className={`modal ${wide ? "modal--wide" : ""} ${side ? "modal--side" : ""}`}
        data-window={windowKey}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={offset ? { translate: `${offset.x}px ${offset.y}px` } : undefined}
      >
        <header
          // A grab cursor says it moves; no tip, which would cover the tabs.
          className={`modal__header surface-leather ${movable ? "is-movable" : ""}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={(e) => {
            if (!(e.target as HTMLElement).closest("button")) resetPosition();
          }}
        >
          {icon && <span className="modal__header-icon">{icon}</span>}
          <h2 id={titleId}>{title}</h2>
          {onClose && (
            <button className="modal__close" onClick={onClose} aria-label="Close" title="Close (Esc)">
              <svg width={14} height={14} viewBox="-7 -7 14 14" aria-hidden="true">
                <path d="M-5,-5 L5,5 M5,-5 L-5,5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
              </svg>
            </button>
          )}
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
