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
  | "politicalPower";

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
      // A wheat sheaf with visible grain heads and a tied band.
      return (
        <g>
          <g stroke="#c9a03f" strokeWidth={1.3} strokeLinecap="round" fill="none">
            <line x1={0} y1={-8.5} x2={0} y2={7} />
            <line x1={0} y1={-6} x2={-4.3} y2={-8} />
            <line x1={0} y1={-6} x2={4.3} y2={-8} />
            <line x1={0} y1={-1.8} x2={-5} y2={-4.3} />
            <line x1={0} y1={-1.8} x2={5} y2={-4.3} />
            <line x1={-3.8} y1={6} x2={3.8} y2={6} strokeWidth={1.6} />
          </g>
          <g fill="#e6c56a" stroke="#93731f" strokeWidth={0.3}>
            <ellipse cx={0} cy={-9} rx={1.3} ry={2.1} />
            <ellipse cx={-4.6} cy={-8.6} rx={1.1} ry={1.8} transform="rotate(-35 -4.6 -8.6)" />
            <ellipse cx={4.6} cy={-8.6} rx={1.1} ry={1.8} transform="rotate(35 4.6 -8.6)" />
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
    default:
      return null;
  }
}
