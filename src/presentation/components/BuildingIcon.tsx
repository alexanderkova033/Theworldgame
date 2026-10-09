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
  granary: "#c9a45c",
  cannery: "#6ea3c9",
  housing: "#e0a87a",
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
      // A little barn: peaked roof (with a lit/shadow split) over a body
      // (with a lit window and a shadowed wall edge), with a door.
      return (
        <g>
          <polygon
            points={`${x},${y - size * 1.3} ${x - size},${y - size * 0.2} ${x + size},${y - size * 0.2}`}
            fill={color}
            stroke="#2f4a1e"
            strokeWidth={0.6}
          />
          <polygon points={`${x},${y - size * 1.3} ${x - size},${y - size * 0.2} ${x},${y - size * 0.2}`} fill="#ffffff" opacity={0.14} />
          <rect x={x - size} y={y - size * 0.2} width={size * 2} height={size * 1.3} fill={color} stroke="#2f4a1e" strokeWidth={0.6} />
          <rect x={x + size * 0.55} y={y - size * 0.2} width={size * 0.45} height={size * 1.3} fill="#2f4a1e" opacity={0.22} />
          <rect x={x - size * 0.3} y={y + size * 0.35} width={size * 0.6} height={size * 0.75} fill="#2f4a1e" />
          <rect x={x - size * 0.75} y={y + size * 0.05} width={size * 0.32} height={size * 0.32} fill="#e6c56a" opacity={0.85} />
        </g>
      );
    case "factory":
      // A workshop body with a dark roofline, a lit window, a chimney, and
      // a little puff of smoke.
      return (
        <g>
          <rect x={x - size * 1.1} y={y - size * 0.3} width={size * 2.2} height={size * 1.4} fill={color} stroke="#7a4720" strokeWidth={0.6} />
          <rect x={x - size * 1.1} y={y - size * 0.3} width={size * 2.2} height={size * 0.32} fill="#7a4720" opacity={0.55} />
          <rect x={x + size * 0.2} y={y - size * 1.4} width={size * 0.55} height={size * 1.1} fill={color} stroke="#7a4720" strokeWidth={0.6} />
          <circle cx={x + size * 0.5} cy={y - size * 1.7} r={size * 0.35} fill="#cfcfcf" opacity={0.75} />
          <rect x={x - size * 0.7} y={y + size * 0.1} width={size * 0.5} height={size * 0.5} fill="#e6c56a" opacity={0.8} stroke="#7a4720" strokeWidth={0.3} />
        </g>
      );
    case "education":
      // An open book: two leaves meeting at a spine, with a soft
      // center-fold shadow.
      return (
        <g stroke="#1c4a7a" strokeWidth={0.6}>
          <polygon points={`${x},${y - size * 0.9} ${x - size * 1.15},${y - size * 0.35} ${x - size * 1.15},${y + size * 0.9} ${x},${y + size * 0.35}`} fill={color} />
          <polygon points={`${x},${y - size * 0.9} ${x + size * 1.15},${y - size * 0.35} ${x + size * 1.15},${y + size * 0.9} ${x},${y + size * 0.35}`} fill={color} />
          <polygon points={`${x},${y - size * 0.9} ${x - size * 0.28},${y - size * 0.6} ${x - size * 0.28},${y + size * 0.6} ${x},${y + size * 0.35}`} fill="#1c4a7a" opacity={0.18} stroke="none" />
          <line x1={x} y1={y - size * 0.9} x2={x} y2={y + size * 0.35} />
        </g>
      );
    case "granary":
      // A grain silo: a domed roof over a ribbed cylindrical body, with a
      // small hatch door.
      return (
        <g>
          <rect x={x - size * 0.8} y={y - size * 0.15} width={size * 1.6} height={size * 1.45} rx={size * 0.15} fill={color} stroke="#6e4a1e" strokeWidth={0.6} />
          <ellipse cx={x} cy={y - size * 0.15} rx={size * 0.8} ry={size * 0.55} fill={color} stroke="#6e4a1e" strokeWidth={0.6} />
          <ellipse cx={x - size * 0.22} cy={y - size * 0.32} rx={size * 0.3} ry={size * 0.18} fill="#ffffff" opacity={0.22} />
          <line x1={x - size * 0.8} y1={y + size * 0.35} x2={x + size * 0.8} y2={y + size * 0.35} stroke="#6e4a1e" strokeWidth={0.5} opacity={0.5} />
          <rect x={x - size * 0.22} y={y + size * 0.55} width={size * 0.44} height={size * 0.75} fill="#6e4a1e" />
        </g>
      );
    case "cannery":
      // A dockside cannery: a gabled warehouse with a pale fish emblem over
      // the door.
      return (
        <g>
          <rect x={x - size * 1.05} y={y - size * 0.25} width={size * 2.1} height={size * 1.5} fill={color} stroke="#1c4a63" strokeWidth={0.6} />
          <polygon points={`${x - size * 1.05},${y - size * 0.25} ${x},${y - size * 1.05} ${x + size * 1.05},${y - size * 0.25}`} fill="#1c4a63" opacity={0.55} />
          <rect x={x - size * 0.25} y={y + size * 0.45} width={size * 0.5} height={size * 0.8} fill="#1c4a63" />
          <g fill="#e8f2fa" opacity={0.85}>
            <ellipse cx={x} cy={y + size * 0.05} rx={size * 0.32} ry={size * 0.16} />
            <polygon points={`${x + size * 0.28},${y + size * 0.05} ${x + size * 0.44},${y - size * 0.06} ${x + size * 0.44},${y + size * 0.16}`} />
          </g>
        </g>
      );
    case "housing":
      // A cottage: steep roof, a chimney, a lit window and a door.
      return (
        <g>
          <rect x={x + size * 0.35} y={y - size * 1.25} width={size * 0.36} height={size * 0.7} fill="#7a4a2e" stroke="#4a2a14" strokeWidth={0.4} />
          <polygon points={`${x},${y - size * 1.2} ${x - size * 1.1},${y - size * 0.1} ${x + size * 1.1},${y - size * 0.1}`} fill="#9a4a32" stroke="#4a2a14" strokeWidth={0.6} />
          <rect x={x - size * 0.85} y={y - size * 0.1} width={size * 1.7} height={size * 1.2} fill={color} stroke="#4a2a14" strokeWidth={0.6} />
          <rect x={x - size * 0.6} y={y + size * 0.15} width={size * 0.45} height={size * 0.4} fill="#f0c869" stroke="#4a2a14" strokeWidth={0.3} />
          <rect x={x + size * 0.15} y={y + size * 0.3} width={size * 0.42} height={size * 0.8} fill="#4a2a14" />
        </g>
      );
    case "road":
      // A paved strip with a dashed centerline and hub dots at each end —
      // reads as an actual road, not just a legend swatch, when drawn big.
      return (
        <g>
          <line x1={x - size * 1.15} y1={y} x2={x + size * 1.15} y2={y} stroke="#3a2f1e" strokeWidth={size * 0.62} strokeLinecap="round" />
          <line x1={x - size * 1.15} y1={y} x2={x + size * 1.15} y2={y} stroke={color} strokeWidth={size * 0.62} strokeLinecap="round" opacity={0.28} />
          <line x1={x - size * 0.85} y1={y} x2={x + size * 0.85} y2={y} stroke={color} strokeWidth={size * 0.18} strokeLinecap="round" strokeDasharray={`${size * 0.4} ${size * 0.32}`} />
          <circle cx={x - size * 1.15} cy={y} r={size * 0.26} fill={color} stroke="#3a2f1e" strokeWidth={0.4} />
          <circle cx={x + size * 1.15} cy={y} r={size * 0.26} fill={color} stroke="#3a2f1e" strokeWidth={0.4} />
        </g>
      );
    default:
      return null;
  }
}
