// The map's small drawn pieces: water-lining round the coasts, the compass
// rose, the nations' names, the capital's star and the province flags.
import { SEA_NAME_SIZE, SEA_PARTY_DROP } from "../nationSeaNames";
import { starPoints } from "./iconShapes";

// Water-lining, as engravers drew it: rings of fine lines following the
// coast outward, closer together near the shore. Each ring is a wide ink
// stroke with a slightly narrower sea-coloured one over it, leaving a line.
const WATERLINES = [
  { width: 64, opacity: 0.22 },
  { width: 48, opacity: 0.3 },
  { width: 34, opacity: 0.38 },
  { width: 22, opacity: 0.48 },
  { width: 12, opacity: 0.6 },
];

export function Waterlines({ d }: { d: string }) {
  return (
    <>
      {WATERLINES.map((ring) => (
        <g key={ring.width}>
          <path d={d} className="map-panel__waterline" style={{ strokeWidth: ring.width, strokeOpacity: ring.opacity }} />
          <path d={d} className="map-panel__waterline-gap" style={{ strokeWidth: ring.width - 2.2 }} />
        </g>
      ))}
    </>
  );
}

// A compass rose in open water, the way every chart of the day carried one.
const COMPASS = { x: 1330, y: 480, r: 62 };

export function CompassRose() {
  const { x, y, r } = COMPASS;
  const point = (angle: number, length: number, half: number) => {
    const rad = (angle * Math.PI) / 180;
    const tip = [x + Math.sin(rad) * length, y - Math.cos(rad) * length];
    const left = [x + Math.sin(rad - Math.PI / 2) * half, y - Math.cos(rad - Math.PI / 2) * half];
    const right = [x + Math.sin(rad + Math.PI / 2) * half, y - Math.cos(rad + Math.PI / 2) * half];
    return (
      <g key={angle}>
        <polygon points={`${x},${y} ${tip.join(",")} ${left.join(",")}`} className="map-panel__compass-dark" />
        <polygon points={`${x},${y} ${tip.join(",")} ${right.join(",")}`} className="map-panel__compass-light" />
      </g>
    );
  };
  return (
    <g pointerEvents="none" aria-hidden="true">
      <circle cx={x} cy={y} r={r} className="map-panel__compass-ring" />
      <circle cx={x} cy={y} r={r - 6} className="map-panel__compass-ring" />
      {[45, 135, 225, 315].map((a) => point(a, r * 0.72, 7))}
      {[0, 90, 180, 270].map((a) => point(a, r * 1.18, 11))}
      <circle cx={x} cy={y} r={4} className="map-panel__compass-hub" />
      <text x={x} y={y - r * 1.18 - 8} className="map-panel__compass-north">
        N
      </text>
    </g>
  );
}

// A nation's name out at sea, along a line following its coast (see
// nationSeaNames.ts), with the ruling party under it.
export function NationName({ id, path, name, isYou, party }: { id: string; path: string; name: string; isYou: boolean; party: { name: string; fill: string } | null }) {
  return (
    <g>
      <path id={id} d={path} fill="none" />
      <text className={`map-panel__nation-name ${isYou ? "is-you" : ""}`} style={{ fontSize: SEA_NAME_SIZE }}>
        <textPath href={`#${id}`} startOffset="50%">
          {name}
        </textPath>
      </text>
      {party && (
        <text className="map-panel__nation-party" dy={SEA_PARTY_DROP} style={{ fill: party.fill }}>
          <textPath href={`#${id}`} startOffset="50%">
            {party.name}
          </textPath>
        </text>
      )}
    </g>
  );
}

// The capital marker: a drawn five-point star (not the "★" glyph — that
// renders as a flat, font-dependent blob at the small sizes the map uses),
// using the same star math as BuildingIcon/StatIcon/StartScreen's crests.
export function CapitalBadge({ x, y }: { x: number; y: number }) {
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={6.4} fill="#7b2121" stroke="#2b1d12" strokeWidth={0.9} />
      <polygon points={starPoints(x, y, 4.4, 1.9)} fill="#e2c27a" stroke="#561414" strokeWidth={0.5} strokeLinejoin="round" />
    </g>
  );
}

// A homes or jobs flag in a province's info bar: amber when it's tight,
// red with a "!" when people there are without a home or without work.
export function StatusFlag({ kind, level, cx, cy }: { kind: "homes" | "jobs"; level: "warn" | "alert"; cx: number; cy: number }) {
  const className = `map-panel__status-flag is-${level}`;
  return (
    <g>
      {kind === "homes" ? (
        <>
          <polygon points={`${cx - 6},${cy - 0.5} ${cx},${cy - 6.5} ${cx + 6},${cy - 0.5}`} className={className} />
          <rect x={cx - 4.5} y={cy - 0.5} width={9} height={6.5} className={className} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy - 3.5} r={2.7} className={className} />
          <path d={`M${cx - 5},${cy + 6} C${cx - 5},${cy - 0.5} ${cx + 5},${cy - 0.5} ${cx + 5},${cy + 6} Z`} className={className} />
        </>
      )}
      {level === "alert" && (
        <>
          <circle cx={cx + 5.5} cy={cy - 5} r={4} className="map-panel__status-alert" />
          <text x={cx + 5.5} y={cy - 2} className="map-panel__status-alert-mark">
            !
          </text>
        </>
      )}
    </g>
  );
}

