// Small pictorial glyphs for the four raw resources, matching the style of
// BuildingIcon/StatIcon — basic shapes, no hand-authored illustration paths.
import type { ResourceType } from "../../domain/resources/types";

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  wood: "#a9773f",
  ore: "#8c93a0",
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
      // A log: a rounded body with end-grain rings at each tip.
      return (
        <g>
          <rect x={x - size} y={y - size * 0.4} width={size * 2} height={size * 0.8} rx={size * 0.4} fill={color} />
          <ellipse cx={x - size} cy={y} rx={size * 0.32} ry={size * 0.42} fill="#c99a5f" />
          <ellipse cx={x + size} cy={y} rx={size * 0.32} ry={size * 0.42} fill="#c99a5f" />
        </g>
      );
    case "ore":
      // A chunky rock.
      return (
        <polygon
          points={`${x},${y - size} ${x + size * 0.9},${y - size * 0.3} ${x + size * 0.6},${y + size} ${x - size * 0.6},${y + size} ${x - size * 0.9},${y - size * 0.3}`}
          fill={color}
        />
      );
    case "grain":
      // A wheat sheaf.
      return (
        <g stroke={color} strokeWidth={size * 0.2} strokeLinecap="round" fill="none">
          <line x1={x} y1={y - size} x2={x} y2={y + size * 0.85} />
          <line x1={x} y1={y - size * 0.7} x2={x - size * 0.5} y2={y - size} />
          <line x1={x} y1={y - size * 0.7} x2={x + size * 0.5} y2={y - size} />
          <line x1={x} y1={y - size * 0.2} x2={x - size * 0.6} y2={y - size * 0.5} />
          <line x1={x} y1={y - size * 0.2} x2={x + size * 0.6} y2={y - size * 0.5} />
          <line x1={x - size * 0.4} y1={y + size * 0.7} x2={x + size * 0.4} y2={y + size * 0.7} />
        </g>
      );
    case "fish":
      // A fish: an oval body with a tail and an eye.
      return (
        <g>
          <ellipse cx={x - size * 0.15} cy={y} rx={size * 0.85} ry={size * 0.45} fill={color} />
          <polygon
            points={`${x + size * 0.65},${y} ${x + size * 1.15},${y - size * 0.5} ${x + size * 1.15},${y + size * 0.5}`}
            fill={color}
          />
          <circle cx={x - size * 0.6} cy={y - size * 0.08} r={size * 0.1} fill="#0e131a" />
        </g>
      );
    default:
      return null;
  }
}
