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

// One shape per unrest stage, so the stage reads without its colour: a calm
// olive sprig, a frown, a picket sign, a torch, a broken crown.
export function UnrestStageIcon({ stage, size }: { stage: "calm" | "discontent" | "strikes" | "riots" | "collapse"; size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      {stage === "calm" && (
        <g>
          <path d="M-7,7 C-3,3 2,-2 7,-8" fill="none" stroke="#6fae7c" strokeWidth={1.6} strokeLinecap="round" />
          <ellipse cx={-3} cy={0.5} rx={1.6} ry={3.2} transform="rotate(-50 -3 0.5)" fill="#8bc34a" />
          <ellipse cx={0.5} cy={-4} rx={1.6} ry={3.2} transform="rotate(-50 0.5 -4)" fill="#8bc34a" />
          <ellipse cx={1.5} cy={2.5} rx={1.6} ry={3.2} transform="rotate(40 1.5 2.5)" fill="#6fae7c" />
          <ellipse cx={5} cy={-2} rx={1.5} ry={3} transform="rotate(40 5 -2)" fill="#6fae7c" />
        </g>
      )}
      {stage === "discontent" && (
        <g>
          <circle r={8} fill="#d9a24f" stroke="#7a4a14" strokeWidth={1} />
          <circle cx={-3} cy={-2.2} r={1.2} fill="#2a1506" />
          <circle cx={3} cy={-2.2} r={1.2} fill="#2a1506" />
          <path d="M-4,4.5 Q0,1 4,4.5" fill="none" stroke="#2a1506" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
      {stage === "strikes" && (
        <g>
          <rect x={-0.9} y={-1} width={1.8} height={10} fill="#8a5a2b" />
          <rect x={-7.5} y={-8.5} width={15} height={8.5} rx={1} fill="#e8d9ab" stroke="#c0582f" strokeWidth={1.2} />
          <g stroke="#c0582f" strokeWidth={1.8} strokeLinecap="round">
            <line x1={-3} y1={-6.6} x2={3} y2={-2} />
            <line x1={3} y1={-6.6} x2={-3} y2={-2} />
          </g>
        </g>
      )}
      {stage === "riots" && (
        <g>
          <rect x={-1.2} y={0} width={2.4} height={9.5} rx={0.8} fill="#8a5a2b" transform="rotate(15 0 4)" />
          <path d="M0,-9.5 C3.5,-6 5.5,-3.5 5.5,-0.5 C5.5,2.5 3,3.8 0,3.8 C-3,3.8 -5.5,2.5 -5.5,-0.5 C-5.5,-3.5 -2.5,-4 -1.5,-7 C-0.8,-5 0.8,-4.5 0,-9.5 Z" fill="#ea6a52" />
          <path d="M0,-3.5 C1.8,-1.8 2.6,-0.8 2.6,0.6 C2.6,2 1.4,2.8 0,2.8 C-1.4,2.8 -2.6,2 -2.6,0.6 C-2.6,-0.8 -1,-1.6 0,-3.5 Z" fill="#f0c869" />
        </g>
      )}
      {stage === "collapse" && (
        <g>
          <path d="M-8,6 L-8,-3 L-4,1 L-1,-6 L0.5,-1 L-1.5,6 Z" fill="#b3987a" stroke="#5a4630" strokeWidth={0.8} strokeLinejoin="round" />
          <path d="M1.5,6 L3,0 L1.8,-4 L4,1 L8,-3 L8,6 Z" fill="#b3987a" stroke="#5a4630" strokeWidth={0.8} strokeLinejoin="round" transform="translate(1 1) rotate(8)" />
        </g>
      )}
    </svg>
  );
}

// Time running out (a forecast) or time passing (a law being drafted).
export function HourglassIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <path d="M-6,-8 L6,-8 L6,-6 L1.5,0 L6,6 L6,8 L-6,8 L-6,6 L-1.5,0 L-6,-6 Z" fill="#e6c56a" stroke="#93731f" strokeWidth={0.7} />
      <path d="M-4,-6.3 L4,-6.3 L1,-0.4 L-1,-0.4 Z" fill="#c9a24a" opacity={0.85} />
    </svg>
  );
}

export function SnowflakeIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <g stroke="#bfe3f5" strokeWidth={1.6} strokeLinecap="round">
        {[0, 60, 120].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <line x1={0} y1={-8} x2={0} y2={8} />
            <polyline points="-2.4,-6.2 0,-4 2.4,-6.2" fill="none" />
            <polyline points="-2.4,6.2 0,4 2.4,6.2" fill="none" />
          </g>
        ))}
      </g>
    </svg>
  );
}

// Jobs: a pick and a shovel crossed, work of any kind.
export function JobsIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <g strokeLinecap="round">
        <line x1={-6.5} y1={6.5} x2={5} y2={-5} stroke="#8a5a2b" strokeWidth={1.6} />
        <line x1={6.5} y1={6.5} x2={-5} y2={-5} stroke="#8a5a2b" strokeWidth={1.6} />
      </g>
      <path d="M1.5,-8 Q5.5,-7.5 8,-4 Q5,-5.5 3,-5.2 Z" fill="#8c93a0" stroke="#5a616c" strokeWidth={0.5} />
      <path d="M-4.2,-4.2 L-8.2,-8.2 Q-9.2,-5.6 -7.6,-3.6 Q-5.8,-2.4 -4.2,-4.2 Z" fill="#8c93a0" stroke="#5a616c" strokeWidth={0.5} />
    </svg>
  );
}

// Neighbours: a foreign flag on its pole, the other nations.
export function NeighboursIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <line x1={-6} y1={-8.5} x2={-6} y2={8.5} stroke="#6b4a26" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M-5.3,-8 C-1,-9.5 2,-6 7.5,-7.5 L7.5,0 C2,1.5 -1,-2 -5.3,-0.5 Z" fill="#4f7cab" stroke="#2f4f73" strokeWidth={0.6} />
      <path d="M-5.3,-4.6 C-1,-6 2,-2.6 7.5,-4 L7.5,-3 C2,-1.6 -1,-5 -5.3,-3.6 Z" fill="#e8d9ab" />
    </svg>
  );
}

// Wages: a pay packet, an envelope with a coin showing.
export function WagesIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <rect x={-8.5} y={-5} width={17} height={11.5} rx={1.2} fill="#e8d9ab" stroke="#93731f" strokeWidth={0.8} />
      <path d="M-8.5,-5 L0,1.5 L8.5,-5" fill="none" stroke="#93731f" strokeWidth={0.8} strokeLinejoin="round" />
      <circle cx={4.5} cy={3} r={2.6} fill="#e6c56a" stroke="#93731f" strokeWidth={0.7} />
    </svg>
  );
}

// A crackdown: a constable's truncheon, raised.
export function CrackdownIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <g transform="rotate(40)">
        <rect x={-1.9} y={-8.5} width={3.8} height={13} rx={1.9} fill="#6b4524" stroke="#432a14" strokeWidth={0.5} />
        <rect x={-2.3} y={2.5} width={4.6} height={1.3} fill="#c9a24a" />
        <rect x={-1.3} y={3.8} width={2.6} height={4.5} rx={0.8} fill="#6b4a26" />
      </g>
    </svg>
  );
}

// A rally: a speaking trumpet, calling the crowd.
export function RallyIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <path d="M-7,-2 L1,-6.5 L1,6.5 L-7,2 Z" fill="#c9a24a" stroke="#93731f" strokeWidth={0.7} strokeLinejoin="round" />
      <rect x={-8.5} y={-2.4} width={2} height={4.8} rx={0.6} fill="#93731f" />
      <g stroke="#c2402f" strokeWidth={1.1} strokeLinecap="round" fill="none">
        <path d="M3.5,-3.5 Q5.5,0 3.5,3.5" />
        <path d="M6,-5.5 Q9,0 6,5.5" />
      </g>
    </svg>
  );
}

// Taxes: the collector's strongbox, a coin dropping through its slot.
export function TaxIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <rect x={-8} y={-2} width={16} height={10} rx={1.2} fill="#8a5a2b" stroke="#5a3a1a" strokeWidth={0.7} />
      <rect x={-8} y={1.4} width={16} height={1.4} fill="#c9a24a" />
      <rect x={-3} y={-2.6} width={6} height={1.3} rx={0.6} fill="#3d2a1a" />
      <ellipse cx={0} cy={-6} rx={2.8} ry={2.8} fill="#e6c56a" stroke="#93731f" strokeWidth={0.7} />
    </svg>
  );
}

// A pair: two links of a chain, a law and a research that work together.
export function PairIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <g fill="none" strokeWidth={2.2} strokeLinecap="round">
        <rect x={-8.5} y={-3.5} width={10} height={7} rx={3.5} stroke="#93731f" />
        <rect x={-1.5} y={-3.5} width={10} height={7} rx={3.5} stroke="#c9a24a" />
      </g>
    </svg>
  );
}

// Voters: a small crowd, three heads, the groups who decide elections.
export function VotersIcon({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} aria-hidden="true">
      <g stroke="#5e4528" strokeWidth={0.6}>
        <circle cx={-5.2} cy={-2.2} r={2.4} fill="#c9a57a" />
        <path d="M-9.2,7.5 C-9.2,2.5 -1.2,2.5 -1.2,7.5 Z" fill="#8a6a46" />
        <circle cx={5.2} cy={-2.2} r={2.4} fill="#c9a57a" />
        <path d="M1.2,7.5 C1.2,2.5 9.2,2.5 9.2,7.5 Z" fill="#8a6a46" />
        <circle cx={0} cy={-4} r={2.8} fill="#d8b98c" />
        <path d="M-4.6,8.5 C-4.6,1.8 4.6,1.8 4.6,8.5 Z" fill="#6b4a26" />
      </g>
    </svg>
  );
}
