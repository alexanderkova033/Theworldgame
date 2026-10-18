// Bigger, colorful, literal mini-illustrations for the stats panel — a coin
// stack, a person, a wheat sheaf — rather than small single-color glyphs.
// Each stat gets its own fixed palette instead of inheriting currentColor,
// so they read at a glance without needing to know what color means what.
import { starPoints } from "./iconShapes";

export type StatIconType =
  | "treasury"
  | "population"
  | "food"
  | "industry"
  | "stability"
  | "research"
  | "popularity"
  | "politicalPower"
  | "police"
  | "militia"
  | "uprising";

interface StatIconProps {
  type: StatIconType;
  size?: number;
}

export function StatIcon({ type, size = 30 }: StatIconProps) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" className="stats-panel__icon">
      {renderShape(type)}
    </svg>
  );
}

function renderShape(type: StatIconType) {
  switch (type) {
    case "treasury":
      // A stack of coins, the top one stamped with a "C" for Crowns.
      return (
        <g>
          <ellipse cx={0} cy={5.3} rx={7} ry={2.2} fill="#93731f" />
          <ellipse cx={0} cy={2.4} rx={7} ry={2.2} fill="#c9a24a" />
          <ellipse cx={0} cy={-0.6} rx={7} ry={2.5} fill="#e6c574" />
          <ellipse cx={0} cy={-0.6} rx={5.2} ry={1.5} fill="none" stroke="#93731f" strokeWidth={0.6} />
          <text x={0} y={0.3} fontSize={3.4} textAnchor="middle" fill="#93731f" fontWeight={700}>
            C
          </text>
        </g>
      );
    case "population":
      // A figure: skin-tone head, blue shoulders.
      return (
        <g>
          <path d="M-6.5,9 C-6.5,1.5 -3.4,-1.5 0,-1.5 C3.4,-1.5 6.5,1.5 6.5,9 Z" fill="#5b9bd6" stroke="#3a6a94" strokeWidth={0.6} />
          <circle cx={0} cy={-5} r={3.6} fill="#e0b98f" stroke="#a9773f" strokeWidth={0.5} />
        </g>
      );
    case "food":
      // A loaf of bread — baked food, so it can't be mistaken for raw grain
      // (a wheat ear, see ResourceIcon).
      return (
        <g>
          <path d="M-8.5,4.5 C-9.5,-1 -6,-6.5 0,-6.5 C6,-6.5 9.5,-1 8.5,4.5 C8.2,6.4 6.8,7 5,7 L-5,7 C-6.8,7 -8.2,6.4 -8.5,4.5 Z" fill="#c98a3c" stroke="#7a4a1a" strokeWidth={0.7} />
          <path d="M-6.5,-1.5 C-5,-4.6 -2,-5.6 0.5,-5.6" fill="none" stroke="#f0c98a" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
          <g stroke="#7a4a1a" strokeWidth={1.1} strokeLinecap="round">
            <line x1={-4.8} y1={1.8} x2={-2.6} y2={-2.4} />
            <line x1={-1.1} y1={2.2} x2={1.1} y2={-2.2} />
            <line x1={2.6} y1={2.4} x2={4.8} y2={-1.8} />
          </g>
        </g>
      );
    case "industry":
      // A workshop: brick body, dark roofline, chimney with smoke, two lit windows.
      return (
        <g>
          <rect x={-7} y={-1} width={14} height={9} fill="#a9773f" stroke="#6e4a26" strokeWidth={0.5} />
          <rect x={-7} y={-1} width={14} height={2} fill="#6e4a26" />
          <rect x={1.5} y={-6.5} width={2.6} height={6} fill="#8c93a0" stroke="#5a616c" strokeWidth={0.5} />
          <circle cx={2.8} cy={-8} r={1.5} fill="#c9ccd1" opacity={0.75} />
          <circle cx={3.6} cy={-9.6} r={1.9} fill="#c9ccd1" opacity={0.5} />
          <rect x={-5} y={2} width={2.4} height={2.4} fill="#e6c56a" stroke="#6e4a26" strokeWidth={0.4} />
          <rect x={-0.2} y={2} width={2.4} height={2.4} fill="#e6c56a" stroke="#6e4a26" strokeWidth={0.4} />
        </g>
      );
    case "stability":
      // A shield, blue with a gold cross.
      return (
        <g>
          <polygon points="0,-9 7.5,-5 6.3,5 0,9 -6.3,5 -7.5,-5" fill="#3f6b94" stroke="#264a68" strokeWidth={0.6} />
          <polygon points="0,-9 7.5,-5 6.3,-1 0,-3" fill="#5b9bd6" opacity={0.6} />
          <line x1={0} y1={-5} x2={0} y2={5} stroke="#e6c56a" strokeWidth={1.4} strokeLinecap="round" />
          <line x1={-3.5} y1={0} x2={3.5} y2={0} stroke="#e6c56a" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case "research":
      // A flask: glass outline, purple liquid, bubbles, a glint of light.
      return (
        <g>
          <rect x={-1.8} y={-9} width={3.6} height={3.5} fill="none" stroke="#c9ccd1" strokeWidth={0.9} />
          <polygon
            points="-1.8,-5.5 1.8,-5.5 5.6,7 -5.6,7"
            fill="#c58ae0"
            stroke="#c9ccd1"
            strokeWidth={0.9}
          />
          <path d="M-3.2,1 Q0,-1 3.2,1 L4.6,7 L-4.6,7 Z" fill="#a862c9" />
          <circle cx={-1.3} cy={3.5} r={1.1} fill="#e6c8f5" opacity={0.85} />
          <circle cx={1.5} cy={1} r={0.7} fill="#e6c8f5" opacity={0.7} />
          <line x1={-4.4} y1={-2} x2={-2.6} y2={-5} stroke="#ffffff" strokeWidth={0.7} opacity={0.5} strokeLinecap="round" />
        </g>
      );
    case "popularity":
      // A layered gold star for a bit of depth.
      return (
        <g>
          <polygon points={starPoints(0, 0.5, 8.5, 3.5)} fill="#93731f" />
          <polygon points={starPoints(0, 0, 8, 3.3)} fill="#e6c56a" stroke="#93731f" strokeWidth={0.4} />
        </g>
      );
    case "politicalPower":
      // A judge's gavel over its sounding block — the currency of lawmaking.
      return (
        <g>
          <rect x={-9} y={5.6} width={10} height={3} rx={0.8} fill="#6e4a26" stroke="#3f2a14" strokeWidth={0.5} />
          <g transform="rotate(-40 1 -1)">
            <rect x={0.1} y={-2} width={1.8} height={11} rx={0.6} fill="#c9a24a" stroke="#93731f" strokeWidth={0.4} />
            <rect x={-4} y={-7.5} width={10} height={5.5} rx={1.2} fill="#a9773f" stroke="#6e4a26" strokeWidth={0.5} />
            <rect x={-2.6} y={-7.5} width={1.2} height={5.5} fill="#e6c56a" />
            <rect x={3.4} y={-7.5} width={1.2} height={5.5} fill="#e6c56a" />
          </g>
        </g>
      );
    case "police":
      // A constable's helmet, navy with a gold star badge.
      return (
        <g>
          <path d="M-6,5 C-6,-3 -4,-8 0,-8.6 C4,-8 6,-3 6,5 Z" fill="#2c3e66" stroke="#16213a" strokeWidth={0.6} />
          <path d="M-3.6,-5 C-2.4,-7 -0.8,-7.8 0.6,-7.9" stroke="#6f86b8" strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.7} />
          <rect x={-8.5} y={4.4} width={17} height={2.8} rx={1.3} fill="#1d2b4a" stroke="#0e1628" strokeWidth={0.5} />
          <circle cx={0} cy={-8.9} r={1.2} fill="#c9ccd1" />
          <polygon points={starPoints(0, -0.6, 3.3, 1.4)} fill="#e6c56a" stroke="#93731f" strokeWidth={0.3} />
        </g>
      );
    case "militia":
      // A militia company's shako: scarlet, a brass plate, a white plume.
      return (
        <g>
          <path d="M-5,5.4 L-6,-5 L6,-5 L5,5.4 Z" fill="#8e2323" stroke="#4a1010" strokeWidth={0.6} />
          <rect x={-6.4} y={-6.8} width={12.8} height={2.2} rx={0.6} fill="#2b1d12" />
          <rect x={-7.6} y={4.6} width={15.2} height={2.6} rx={1.2} fill="#2b1d12" stroke="#120a05" strokeWidth={0.5} />
          <path d="M0,-6.6 C-1.8,-8.4 -1.3,-10.4 0.2,-10.9 C1.5,-10.1 1.7,-8.3 0,-6.6 Z" fill="#f4ead0" stroke="#9c8a66" strokeWidth={0.4} />
          <path d="M0,-3.2 L2.3,-0.4 L0,2.4 L-2.3,-0.4 Z" fill="#e6c56a" stroke="#93731f" strokeWidth={0.4} />
        </g>
      );
    case "uprising":
      // A rebel banner: a ragged red flag on a rough pole.
      return (
        <g>
          <line x1={-5} y1={-8.6} x2={-5} y2={8.6} stroke="#3b2a1a" strokeWidth={1.4} strokeLinecap="round" />
          <path d="M-4.4,-7.8 L7.2,-7.8 L4.6,-4.4 L7.2,-1 L-4.4,-1 Z" fill="#b3261e" stroke="#5e1410" strokeWidth={0.6} />
          <circle cx={-5} cy={-8.8} r={1} fill="#c9a24a" />
        </g>
      );
    default:
      return null;
  }
}
