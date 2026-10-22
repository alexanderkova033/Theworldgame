// One mark for each kind of province crisis (see domain/crises), drawn the
// same on the map's province strip, the province card, the legend and the
// letter: waves for a flood, a pick for a worked-out seam, a stump for a
// felled forest, a thermometer for fever, and a fish struck through for
// failed fishing grounds.
import type { CrisisKind } from "../../domain/crises/types";

function Glyph({ kind }: { kind: CrisisKind }) {
  switch (kind) {
    case "flood":
      return (
        <g fill="none" stroke="#2f6f9f" strokeWidth={2} strokeLinecap="round">
          <path d="M-8,-4 q2,-3 4,0 t4,0 t4,0 t4,0" />
          <path d="M-8,1 q2,-3 4,0 t4,0 t4,0 t4,0" />
          <path d="M-8,6 q2,-3 4,0 t4,0 t4,0 t4,0" />
        </g>
      );
    case "seam":
      return (
        <g stroke="#3d3a36" strokeLinecap="round" fill="none">
          <line x1={-6} y1={8} x2={5} y2={-5} strokeWidth={2.2} stroke="#7a5c34" />
          <path d="M-2,-8 Q5,-9 9,-2" strokeWidth={2.4} />
        </g>
      );
    case "felling":
      return (
        <g stroke="#3d2a16" strokeWidth={1.2}>
          <path d="M-6,8 L-5,-1 L5,-1 L6,8 Z" fill="#8a5a2e" />
          <ellipse cx={0} cy={-1} rx={5} ry={2.2} fill="#d8b47a" />
          <ellipse cx={0} cy={-1} rx={2.2} ry={1} fill="none" />
        </g>
      );
    case "fever":
      return (
        <g stroke="#5a1a14" strokeWidth={1.2}>
          <rect x={-2} y={-9} width={4} height={12} rx={2} fill="#f3e6cf" />
          <circle cx={0} cy={5} r={3.6} fill="#c0392b" />
          <line x1={0} y1={-5} x2={0} y2={3} stroke="#c0392b" strokeWidth={1.8} />
        </g>
      );
    case "fishing":
      return (
        <g>
          <path d="M-7,0 Q-1,-6 5,0 Q-1,6 -7,0 Z M5,0 L9,-3 L9,3 Z" fill="#6f8f9f" stroke="#2b3a44" strokeWidth={1} />
          <line x1={-8} y1={-7} x2={8} y2={7} stroke="#8e1e14" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
  }
}

// Standalone, or inside an SVG at (x, y) when both are given.
export function CrisisIcon({ kind, size = 18, x, y }: { kind: CrisisKind; size?: number; x?: number; y?: number }) {
  if (x !== undefined && y !== undefined) {
    return (
      <g transform={`translate(${x} ${y}) scale(${size / 20})`}>
        <Glyph kind={kind} />
      </g>
    );
  }
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <Glyph kind={kind} />
    </svg>
  );
}
