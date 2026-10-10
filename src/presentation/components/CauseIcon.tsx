// Small glyphs for the causes in the monthly report (see presentation/causes.tsx).
import type { ProjectType } from "../../domain/construction/types";
import { BuildingIcon } from "./BuildingIcon";

export function FlameIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <path d="M0,-9 C4,-4 7,-1 7,3 C7,7 4,9.5 0,9.5 C-4,9.5 -7,7 -7,3 C-7,-1 -3,-2 -2,-6 C-1,-3 1,-2 0,-9 Z" fill="#e0703a" />
      <path d="M0,-1 C2.5,2 3.5,3.5 3.5,5.5 C3.5,7.6 2,9 0,9 C-2,9 -3.5,7.6 -3.5,5.5 C-3.5,3.5 -1.5,2.5 0,-1 Z" fill="#f0c869" />
    </svg>
  );
}

// A promissory note with a percent sign — borrowing and paying back.
export function LoanIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <rect x={-8.5} y={-6} width={17} height={12} rx={1.5} fill="#e8d9ab" stroke="#93731f" strokeWidth={0.8} />
      <circle cx={-3} cy={-1.6} r={1.6} fill="none" stroke="#93731f" strokeWidth={1.1} />
      <circle cx={3} cy={2.4} r={1.6} fill="none" stroke="#93731f" strokeWidth={1.1} />
      <line x1={3.6} y1={-3.6} x2={-3.6} y2={4.2} stroke="#93731f" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

// A warning triangle — something that happened to you, not something you did.
export function EventIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <path d="M0,-8.5 L8.5,7.5 L-8.5,7.5 Z" fill="#d9a24f" stroke="#7a4a14" strokeWidth={0.8} strokeLinejoin="round" />
      <rect x={-1} y={-3.4} width={2} height={6} rx={0.9} fill="#2a1506" />
      <circle cx={0} cy={5} r={1.1} fill="#2a1506" />
    </svg>
  );
}

// A circular arrow: opinion easing back toward the middle on its own.
export function SettlingIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <path d="M6.5,-3 A7,7 0 1,0 7,2.5" fill="none" stroke="#b3987a" strokeWidth={2} strokeLinecap="round" />
      <polygon points="9.5,-6.5 8,0 2.5,-3.5" fill="#b3987a" />
    </svg>
  );
}

export function BuildingGlyph({ type, size }: { type: ProjectType; size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <BuildingIcon type={type} x={0} y={1.5} size={6.5} />
    </svg>
  );
}
