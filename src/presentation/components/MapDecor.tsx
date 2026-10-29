// The map's small drawn pieces: water-lining round the coasts, the compass
// rose, the nations' names, the capital's star and the province flags.
import { useLayoutEffect, useRef, useState } from "react";
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

// The capital marker: a drawn five-point star (not the "★" glyph — that
// renders as a flat, font-dependent blob at the small sizes the map uses),
// using the same star math as BuildingIcon/StatIcon/StartScreen's crests.
const NATION_NAME_SIZE = 34;
const NATION_NAME_MIN_SIZE = 20;
const NATION_NAME_SPACING = 0.16; // em, as in .map-panel__nation-name
const NATION_NAME_FILL = 0.86; // share of the land's width the name may take

// A nation's name across its land, shrunk to fit if the country is narrow,
// with the ruling party underneath; the pair is centred on (x, y). Letter
// spacing adds a gap after the last letter too, so the name is nudged
// right by half a gap to sit truly in the middle.
export function NationName({ x, y, width, name, isYou, party }: { x: number; y: number; width: number; name: string; isYou: boolean; party: { name: string; fill: string } | null }) {
  const ref = useRef<SVGTextElement>(null);
  const [size, setSize] = useState(NATION_NAME_SIZE);
  useLayoutEffect(() => {
    const fit = () => {
      const text = ref.current;
      if (!text) return;
      const shown = text.style.fontSize;
      text.style.fontSize = `${NATION_NAME_SIZE}px`;
      const natural = text.getComputedTextLength();
      text.style.fontSize = shown;
      const room = width * NATION_NAME_FILL;
      setSize(natural > room ? Math.max(NATION_NAME_MIN_SIZE, (NATION_NAME_SIZE * room) / natural) : NATION_NAME_SIZE);
    };
    fit();
    // The display face may still be loading; measure again once it has.
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    return () => {
      live = false;
    };
  }, [name, width]);
  const nameY = party ? y - 9 : y;
  return (
    <g>
      <text
        ref={ref}
        x={x}
        y={nameY}
        dx={(size * NATION_NAME_SPACING) / 2}
        dominantBaseline="central"
        className={`map-panel__nation-name ${isYou ? "is-you" : ""}`}
        style={{ fontSize: size }}
      >
        {name}
      </text>
      {party && (
        <text x={x} y={nameY + size * 0.5 + 10} dominantBaseline="central" className="map-panel__nation-party" style={{ fill: party.fill }}>
          {party.name}
        </text>
      )}
    </g>
  );
}

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

