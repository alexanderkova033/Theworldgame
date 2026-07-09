// Shared polygon-point generators for the hand-drawn icon set (BuildingIcon,
// StatIcon, StartScreen's nation crests) — plain trigonometry, no icon
// library, kept in one place so the star/gear math isn't duplicated per file.

// Points for a star polygon centered at (cx, cy): alternates outerR/innerR
// around the circle. `points` is how many star points it has (5 = a classic
// star, 4 = a four-point "sparkle").
export function starPoints(cx: number, cy: number, outerR: number, innerR: number, points = 5): string {
  const vertices: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    vertices.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return vertices.join(" ");
}

// Points for a gear/cog polygon centered at (cx, cy) with the given number
// of teeth.
export function cogPoints(cx: number, cy: number, outerR: number, innerR: number, teeth: number): string {
  const vertices: string[] = [];
  const count = teeth * 2;
  for (let i = 0; i < count; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = ((Math.PI * 2) / count) * i - Math.PI / 2;
    vertices.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return vertices.join(" ");
}
