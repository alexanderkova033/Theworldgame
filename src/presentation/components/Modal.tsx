import "./Modal.css";
import { useEffect } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  // A small glyph shown beside the title — normally the same NavIcon medallion
  // as the tab that opened this modal, so the panel reads as the same object
  // scaled up rather than a plain text-titled box indistinguishable from any
  // other modal.
  icon?: React.ReactNode;
}

// A generic overlay for panels that are an occasional decision rather than an
// always-on dashboard — every panel but the map itself now opens this way
// (HOI4-style tabs instead of permanent sidebars), so the map stays the star.
export function Modal({ title, onClose, children, wide = false, icon }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`panel modal ${wide ? "modal--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__header-title">
            {icon && <span className="modal__header-icon">{icon}</span>}
            <h2>{title}</h2>
          </span>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
