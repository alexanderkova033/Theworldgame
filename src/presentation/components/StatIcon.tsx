// Small pictorial glyphs for the stats panel — a coin stack, a person, a
// wheat sheaf, and so on — built from basic shapes (circles, rects,
// polygons, lines) rather than hand-authored illustration paths, matching
// the style used for BuildingIcon.
import { starPoints } from "./iconShapes";

export type StatIconType =
  | "treasury"
  | "population"
  | "food"
  | "industry"
  | "stability"
  | "army"
  | "research"
  | "popularity";

interface StatIconProps {
  type: StatIconType;
}

export function StatIcon({ type }: StatIconProps) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="-8 -8 16 16"
      className="stats-panel__icon"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {renderShape(type)}
    </svg>
  );
}

function renderShape(type: StatIconType) {
  switch (type) {
    case "treasury":
      // A stack of coins, viewed edge-on.
      return (
        <>
          <ellipse cx={0} cy={4} rx={6} ry={2} fill="currentColor" stroke="none" opacity={0.5} />
          <ellipse cx={0} cy={1.3} rx={6} ry={2} fill="currentColor" stroke="none" opacity={0.75} />
          <ellipse cx={0} cy={-1.5} rx={6} ry={2.2} fill="currentColor" stroke="none" />
          <line x1={0} y1={-2.6} x2={0} y2={-0.4} stroke="#1a1406" strokeWidth={1} opacity={0.5} />
        </>
      );
    case "population":
      // A single figure: head + shoulders.
      return (
        <>
          <circle cx={0} cy={-3.3} r={2.5} fill="currentColor" stroke="none" />
          <polygon points="-4.5,6 4.5,6 3,-0.5 -3,-0.5" fill="currentColor" stroke="none" />
        </>
      );
    case "food":
      // A wheat sheaf: a stalk with leaves and a tied band.
      return (
        <g strokeWidth={1.2}>
          <line x1={0} y1={-7} x2={0} y2={6} strokeWidth={1.4} />
          <line x1={0} y1={-5} x2={-3.5} y2={-7} />
          <line x1={0} y1={-5} x2={3.5} y2={-7} />
          <line x1={0} y1={-1.5} x2={-4} y2={-3.5} />
          <line x1={0} y1={-1.5} x2={4} y2={-3.5} />
          <line x1={-3} y1={5} x2={3} y2={5} strokeWidth={1.4} />
        </g>
      );
    case "industry":
      // A workshop with a chimney and a puff of smoke.
      return (
        <>
          <rect x={-6} y={-1} width={12} height={7} fill="currentColor" stroke="none" />
          <rect x={-5} y={-5} width={2.5} height={4} fill="currentColor" stroke="none" />
          <rect x={0.5} y={-7} width={2.5} height={6} fill="currentColor" stroke="none" />
          <circle cx={1.75} cy={-8.2} r={1.3} fill="currentColor" stroke="none" opacity={0.4} />
        </>
      );
    case "stability":
      // A shield with a simple emblazoned cross.
      return (
        <>
          <polygon points="0,-7 6,-4 5,4 0,7 -5,4 -6,-4" fill="currentColor" stroke="none" />
          <line x1={0} y1={-4} x2={0} y2={4} stroke="#1a1406" strokeWidth={1} opacity={0.45} />
          <line x1={-3} y1={0} x2={3} y2={0} stroke="#1a1406" strokeWidth={1} opacity={0.45} />
        </>
      );
    case "army":
      // Crossed swords, with crossguards and pommels.
      return (
        <>
          <line x1={-6} y1={-6} x2={6} y2={6} strokeWidth={1.6} />
          <line x1={6} y1={-6} x2={-6} y2={6} strokeWidth={1.6} />
          <line x1={-7.2} y1={-4.8} x2={-4.8} y2={-7.2} strokeWidth={1.6} />
          <line x1={4.8} y1={-7.2} x2={7.2} y2={-4.8} strokeWidth={1.6} />
          <circle cx={6} cy={6} r={1} fill="currentColor" stroke="none" />
          <circle cx={-6} cy={6} r={1} fill="currentColor" stroke="none" />
        </>
      );
    case "research":
      // A flask with a bubble inside.
      return (
        <>
          <rect x={-1.5} y={-7} width={3} height={3} fill="currentColor" stroke="none" />
          <polygon points="-2.5,-4 2.5,-4 4.5,6 -4.5,6" fill="currentColor" stroke="none" />
          <circle cx={-1.3} cy={3} r={1} fill="#1a1406" stroke="none" opacity={0.35} />
        </>
      );
    case "popularity":
      // A star rating.
      return <polygon points={starPoints(0, 0, 7, 2.9)} fill="currentColor" stroke="none" />;
    default:
      return null;
  }
}
