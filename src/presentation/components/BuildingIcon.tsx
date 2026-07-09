// Small geometric glyphs for each building type — distinct by shape (not just
// color), rendered on the map. Kept as plain polygon/circle/rect math rather
// than hand-authored illustration paths, so they stay easy to read and tweak.
import type { ProjectType } from "../../domain/construction/types";

export const BUILDING_COLORS: Record<ProjectType, string> = {
  farm: "#8bc34a",
  factory: "#e0954a",
  road: "#c9ccd1",
  education: "#4fa8ff",
  research: "#c58ae0",
};

interface BuildingIconProps {
  type: ProjectType;
  x: number;
  y: number;
  size?: number;
}

function trianglePoints(x: number, y: number, s: number): string {
  return `${x},${y - s} ${x - s},${y + s} ${x + s},${y + s}`;
}

function diamondPoints(x: number, y: number, s: number): string {
  return `${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`;
}

function starPoints(x: number, y: number, s: number): string {
  const inner = s * 0.42;
  const points: string[] = [];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? s : inner;
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    points.push(`${x + Math.cos(angle) * r},${y + Math.sin(angle) * r}`);
  }
  return points.join(" ");
}

export function BuildingIcon({ type, x, y, size = 5 }: BuildingIconProps) {
  const color = BUILDING_COLORS[type];

  switch (type) {
    case "farm":
      return <polygon points={trianglePoints(x, y, size)} fill={color} />;
    case "factory":
      return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} fill={color} />;
    case "road":
      return <polygon points={diamondPoints(x, y, size)} fill={color} />;
    case "education":
      return <circle cx={x} cy={y} r={size} fill={color} />;
    case "research":
      return <polygon points={starPoints(x, y, size)} fill={color} />;
    default:
      return null;
  }
}
