// Small pictorial glyphs for each building type, built from basic shapes
// (rects, polygons, circles) rather than hand-authored illustration paths —
// easy to read at a glance, easy to tweak. Roads aren't drawn as a point
// icon here (see MapPanel's road network lines) but still get a swatch for
// the legend.
import type { ProjectType } from "../../domain/construction/types";

export const BUILDING_COLORS: Record<ProjectType, string> = {
  farm: "#8bc34a",
  factory: "#e0954a",
  road: "#e8d9ab",
  education: "#4fa8ff",
  research: "#c58ae0",
};

interface BuildingIconProps {
  type: ProjectType;
  x: number;
  y: number;
  size?: number;
}

export function BuildingIcon({ type, x, y, size = 5 }: BuildingIconProps) {
  const color = BUILDING_COLORS[type];

  switch (type) {
    case "farm":
      // A little barn: peaked roof over a body, with a door.
      return (
        <g>
          <polygon
            points={`${x},${y - size * 1.3} ${x - size},${y - size * 0.2} ${x + size},${y - size * 0.2}`}
            fill={color}
            stroke="#2f4a1e"
            strokeWidth={0.6}
          />
          <rect x={x - size} y={y - size * 0.2} width={size * 2} height={size * 1.3} fill={color} stroke="#2f4a1e" strokeWidth={0.6} />
          <rect x={x - size * 0.3} y={y + size * 0.35} width={size * 0.6} height={size * 0.75} fill="#2f4a1e" />
        </g>
      );
    case "factory":
      // A workshop body with a chimney and a little puff of smoke.
      return (
        <g>
          <rect x={x - size * 1.1} y={y - size * 0.3} width={size * 2.2} height={size * 1.4} fill={color} stroke="#7a4720" strokeWidth={0.6} />
          <rect x={x + size * 0.2} y={y - size * 1.4} width={size * 0.55} height={size * 1.1} fill={color} stroke="#7a4720" strokeWidth={0.6} />
          <circle cx={x + size * 0.5} cy={y - size * 1.7} r={size * 0.35} fill="#cfcfcf" opacity={0.75} />
          <rect x={x - size * 0.7} y={y + size * 0.1} width={size * 0.5} height={size * 0.5} fill="#7a4720" opacity={0.6} />
        </g>
      );
    case "education":
      // An open book: two leaves meeting at a spine.
      return (
        <g stroke="#1c4a7a" strokeWidth={0.6}>
          <polygon points={`${x},${y - size * 0.9} ${x - size * 1.15},${y - size * 0.35} ${x - size * 1.15},${y + size * 0.9} ${x},${y + size * 0.35}`} fill={color} />
          <polygon points={`${x},${y - size * 0.9} ${x + size * 1.15},${y - size * 0.35} ${x + size * 1.15},${y + size * 0.9} ${x},${y + size * 0.35}`} fill={color} />
          <line x1={x} y1={y - size * 0.9} x2={x} y2={y + size * 0.35} />
        </g>
      );
    case "research":
      // A flask: narrow neck flaring into a rounded body.
      return (
        <g>
          <rect x={x - size * 0.3} y={y - size * 1.3} width={size * 0.6} height={size * 0.6} fill={color} stroke="#5a2f78" strokeWidth={0.6} />
          <polygon
            points={`${x - size * 0.3},${y - size * 0.7} ${x + size * 0.3},${y - size * 0.7} ${x + size * 1.1},${y + size * 1.1} ${x - size * 1.1},${y + size * 1.1}`}
            fill={color}
            stroke="#5a2f78"
            strokeWidth={0.6}
          />
          <circle cx={x - size * 0.35} cy={y + size * 0.5} r={size * 0.22} fill="#ffffff" opacity={0.5} />
        </g>
      );
    case "road":
      // Legend-only: a short dashed road segment.
      return <line x1={x - size} y1={y} x2={x + size} y2={y} stroke={color} strokeWidth={2} strokeDasharray="2.5 2" />;
    default:
      return null;
  }
}
