// Small line-icon glyphs for the stats panel, built from basic shapes
// (circles, rects, polygons) rather than hand-authored illustration paths —
// easy to read at a glance, easy to tweak.
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
      return (
        <>
          <circle cx={0} cy={0} r={6} />
          <line x1={0} y1={-3} x2={0} y2={3} />
        </>
      );
    case "population":
      return (
        <>
          <circle cx={-3.2} cy={1} r={1.8} fill="currentColor" stroke="none" />
          <circle cx={0} cy={-2} r={1.8} fill="currentColor" stroke="none" />
          <circle cx={3.2} cy={1} r={1.8} fill="currentColor" stroke="none" />
        </>
      );
    case "food":
      return <polygon points="0,-6 -6,6 6,6" fill="currentColor" stroke="none" />;
    case "industry":
      return (
        <>
          <rect x={-6} y={-1} width={12} height={7} fill="currentColor" stroke="none" />
          <rect x={-5} y={-5} width={2.5} height={4} fill="currentColor" stroke="none" />
          <rect x={0.5} y={-7} width={2.5} height={6} fill="currentColor" stroke="none" />
        </>
      );
    case "stability":
      return <polygon points="0,-7 6,-4 5,4 0,7 -5,4 -6,-4" fill="currentColor" stroke="none" />;
    case "army":
      return (
        <>
          <line x1={-6} y1={-6} x2={6} y2={6} />
          <line x1={6} y1={-6} x2={-6} y2={6} />
        </>
      );
    case "research":
      return (
        <>
          <rect x={-1.5} y={-7} width={3} height={3} fill="currentColor" stroke="none" />
          <polygon points="-2.5,-4 2.5,-4 4.2,6 -4.2,6" fill="currentColor" stroke="none" />
        </>
      );
    case "popularity":
      return <polyline points="-5,1 0,-4 5,1" />;
    default:
      return null;
  }
}
