// Pictorial glyphs for the raw resources — parametric by (x, y, size)
// so the same shapes work small on the map and large in the panels.
import type { ResourceType } from "../../domain/resources/types";

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: "#a9773f",
  ore: "#8c93a0",
  coal: "#4a4c55",
  grain: "#d9b64e",
  fish: "#5b9bd6",
};

interface ResourceIconProps {
  type: ResourceType;
  x?: number;
  y?: number;
  size?: number;
}

export function ResourceIcon({ type, x = 0, y = 0, size = 7 }: ResourceIconProps) {
  const color = RESOURCE_COLORS[type];

  switch (type) {
    case "wood":
      // A log: a rounded body, end-grain rings, and a couple of bark ticks.
      return (
        <g>
          <rect x={x - size} y={y - size * 0.4} width={size * 2} height={size * 0.8} rx={size * 0.4} fill={color} />
          <line x1={x - size * 0.55} y1={y - size * 0.32} x2={x + size * 0.15} y2={y - size * 0.32} stroke="#7a5a2e" strokeWidth={size * 0.08} strokeLinecap="round" />
          <line x1={x - size * 0.3} y1={y + size * 0.3} x2={x + size * 0.5} y2={y + size * 0.3} stroke="#7a5a2e" strokeWidth={size * 0.08} strokeLinecap="round" />
          <ellipse cx={x - size} cy={y} rx={size * 0.34} ry={size * 0.42} fill="#d9b378" stroke="#7a5a2e" strokeWidth={size * 0.06} />
          <ellipse cx={x - size} cy={y} rx={size * 0.17} ry={size * 0.22} fill="none" stroke="#7a5a2e" strokeWidth={size * 0.05} />
          <ellipse cx={x + size} cy={y} rx={size * 0.34} ry={size * 0.42} fill="#d9b378" stroke="#7a5a2e" strokeWidth={size * 0.06} />
          <ellipse cx={x + size} cy={y} rx={size * 0.17} ry={size * 0.22} fill="none" stroke="#7a5a2e" strokeWidth={size * 0.05} />
        </g>
      );
    case "ore":
      // A chunky rock with a lit facet and a shadowed facet.
      return (
        <g>
          <polygon
            points={`${x},${y - size} ${x + size * 0.9},${y - size * 0.3} ${x + size * 0.6},${y + size} ${x - size * 0.6},${y + size} ${x - size * 0.9},${y - size * 0.3}`}
            fill={color}
            stroke="#5a616c"
            strokeWidth={size * 0.06}
          />
          <polygon points={`${x},${y - size} ${x + size * 0.9},${y - size * 0.3} ${x},${y}`} fill="#c1c6cf" opacity={0.65} />
          <polygon points={`${x},${y} ${x - size * 0.6},${y + size} ${x - size * 0.9},${y - size * 0.3}`} fill="#5a616c" opacity={0.5} />
        </g>
      );
    case "grain":
      // A wheat sheaf with grain heads at the tips.
      return (
        <g>
          <g stroke={color} strokeWidth={size * 0.2} strokeLinecap="round" fill="none">
            <line x1={x} y1={y - size} x2={x} y2={y + size * 0.85} />
            <line x1={x} y1={y - size * 0.7} x2={x - size * 0.5} y2={y - size} />
            <line x1={x} y1={y - size * 0.7} x2={x + size * 0.5} y2={y - size} />
            <line x1={x} y1={y - size * 0.2} x2={x - size * 0.6} y2={y - size * 0.5} />
            <line x1={x} y1={y - size * 0.2} x2={x + size * 0.6} y2={y - size * 0.5} />
            <line x1={x - size * 0.4} y1={y + size * 0.7} x2={x + size * 0.4} y2={y + size * 0.7} />
          </g>
          <g fill="#eecf7a">
            <ellipse cx={x} cy={y - size} rx={size * 0.16} ry={size * 0.26} />
            <ellipse cx={x - size * 0.5} cy={y - size} rx={size * 0.14} ry={size * 0.22} transform={`rotate(-35 ${x - size * 0.5} ${y - size})`} />
            <ellipse cx={x + size * 0.5} cy={y - size} rx={size * 0.14} ry={size * 0.22} transform={`rotate(35 ${x + size * 0.5} ${y - size})`} />
          </g>
        </g>
      );
    case "coal":
      // A heap of coal: three dark, faceted lumps with a cold sheen.
      return (
        <g stroke="#a4aab8" strokeWidth={size * 0.07} strokeLinejoin="round">
          <polygon points={`${x - size},${y + size * 0.6} ${x - size * 0.75},${y - size * 0.1} ${x - size * 0.15},${y - size * 0.3} ${x + size * 0.1},${y + size * 0.6}`} fill={color} />
          <polygon points={`${x - size * 0.05},${y + size * 0.6} ${x + size * 0.2},${y - size * 0.25} ${x + size * 0.8},${y - size * 0.05} ${x + size},${y + size * 0.6}`} fill="#5a5d68" />
          <polygon points={`${x - size * 0.55},${y - size * 0.15} ${x - size * 0.3},${y - size * 0.85} ${x + size * 0.3},${y - size * 0.75} ${x + size * 0.45},${y - size * 0.1}`} fill="#3c3e46" />
          <line x1={x - size * 0.35} y1={y - size * 0.65} x2={x + size * 0.15} y2={y - size * 0.6} stroke="#dfe4ee" strokeWidth={size * 0.08} opacity={0.6} />
          <line x1={x + size * 0.3} y1={y + size * 0.05} x2={x + size * 0.65} y2={y + size * 0.1} stroke="#dfe4ee" strokeWidth={size * 0.07} opacity={0.5} />
        </g>
      );
    case "fish":
      // A fish: body, tail, top fin, gill mark, and an eye.
      return (
        <g>
          <ellipse cx={x - size * 0.15} cy={y} rx={size * 0.85} ry={size * 0.45} fill={color} stroke="#3a6a94" strokeWidth={size * 0.05} />
          <polygon
            points={`${x + size * 0.65},${y} ${x + size * 1.15},${y - size * 0.5} ${x + size * 1.15},${y + size * 0.5}`}
            fill={color}
            stroke="#3a6a94"
            strokeWidth={size * 0.05}
          />
          <polygon points={`${x - size * 0.3},${y - size * 0.42} ${x},${y - size * 0.75} ${x + size * 0.15},${y - size * 0.4}`} fill="#3a6a94" opacity={0.85} />
          <path d={`M${x - size * 0.5},${y - size * 0.2} Q${x - size * 0.35},${y} ${x - size * 0.5},${y + size * 0.2}`} stroke="#3a6a94" strokeWidth={size * 0.06} fill="none" />
          <circle cx={x - size * 0.6} cy={y - size * 0.08} r={size * 0.12} fill="#0e131a" />
        </g>
      );
    default:
      return null;
  }
}
