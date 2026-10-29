import "./Modal.css";
import { useEffect, useId, useRef } from "react";

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
export function Modal({ title, onClose, children, wide = false, icon, window: windowKey, side = false }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

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
    <div className={`modal-overlay ${side ? "modal-overlay--side" : ""}`} onClick={side ? undefined : onClose}>
      <div
        ref={dialogRef}
        className={`modal ${wide ? "modal--wide" : ""} ${side ? "modal--side" : ""}`}
        data-window={windowKey}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header surface-leather">
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
