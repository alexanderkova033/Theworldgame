// An engraved plate for a chapter: a scene in iron-gall line work (hatched
// skies, ruled water, cross-hatched shadow) heading its briefing and its
// story letter, so the country's history reads as pictures as well as words.
// Each chapter is drawn as one of a few scenes (SCENE_OF); a chapter
// without one has no plate.
import "./StoryPlate.css";
import type { ReactNode } from "react";
import type { ChapterId } from "../../domain/chapters/chapterData";

type Scene =
  | "fields"
  | "flood"
  | "granary"
  | "harbour"
  | "island"
  | "rising-manor"
  | "rising-town"
  | "rising-foundry"
  | "felling"
  | "festival"
  | "throne"
  | "hall"
  | "academy"
  | "mine"
  | "winter"
  | "crown"
  | "foundry"
  | "commons"
  | "exhibition"
  | "camp";

const SCENE_OF: Record<string, Scene> = {
  "first-winter": "winter",
  exchange: "hall",
  assembly: "hall",
  society: "academy",
  streets: "rising-town",
  voters: "hall",
  envoys: "harbour",
  captain: "island",
  army: "camp",
  "astravia:promise": "fields",
  "astravia:flood": "flood",
  "astravia:lean-year": "granary",
  "astravia:coast": "harbour",
  "astravia:island": "island",
  "astravia:new-farmers": "fields",
  "astravia:thornwick-rises": "rising-manor",
  "astravia:felling": "felling",
  "astravia:founding-day": "festival",
  "caldenreich:speech": "throne",
  "caldenreich:academy": "academy",
  "caldenreich:seam": "mine",
  "caldenreich:guild": "mine",
  "caldenreich:winter": "winter",
  "caldenreich:heir": "throne",
  "caldenreich:ashford": "flood",
  "caldenreich:konrad": "crown",
  "caldenreich:elisabet": "crown",
  "veldoria:whistle": "foundry",
  "veldoria:smoke": "foundry",
  "veldoria:ore": "foundry",
  "veldoria:commons": "commons",
  "veldoria:islands": "island",
  "veldoria:congress": "rising-foundry",
  "veldoria:strike": "rising-foundry",
  "veldoria:flood": "flood",
  "veldoria:exhibition": "exhibition",
};

const W = 640;
const H = 200;
const HORIZON = 128;
const PAPER = "var(--plate-paper)";
const HATCH = "url(#plate-hatch)";
const SHADE = "url(#plate-shade)";
const WATER = "url(#plate-water)";

// A steady wobble, so hand-drawn edges look drawn and every render is the same.
function wobble(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// A scalloped outline round an ellipse: clouds, tree crowns, smoke.
function blob(cx: number, cy: number, rx: number, ry: number, bumps: number, seed = 0): string {
  const points = Array.from({ length: bumps }, (_, i) => {
    const a = (i / bumps) * Math.PI * 2;
    const k = 0.85 + wobble(seed + i) * 0.25;
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
  });
  const arcs = points.map((_, i) => {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % bumps];
    const r = Math.hypot(x2 - x1, y2 - y1) * 0.62;
    return `A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  });
  return `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}${arcs.join("")}Z`;
}

// --- Parts -----------------------------------------------------------------

function Sky({ to = HORIZON }: { to?: number }) {
  return <rect width={W} height={to} fill="url(#plate-sky)" stroke="none" />;
}

function Cloud({ x, y, w, dark = false, seed = 1 }: { x: number; y: number; w: number; dark?: boolean; seed?: number }) {
  const d = blob(x, y, w / 2, w / 5, 11, seed);
  return (
    <g>
      <path d={d} fill={PAPER} />
      {dark && <path d={d} fill={SHADE} stroke="none" />}
    </g>
  );
}

function Sun({ x, y, r, rays = 16 }: { x: number; y: number; r: number; rays?: number }) {
  return (
    <g>
      {Array.from({ length: rays }, (_, i) => {
        const a = (i / rays) * Math.PI * 2;
        const long = i % 2 === 0 ? 2.1 : 1.6;
        return <line key={i} x1={x + Math.cos(a) * r * 1.25} y1={y + Math.sin(a) * r * 1.25} x2={x + Math.cos(a) * r * long} y2={y + Math.sin(a) * r * long} strokeWidth={0.7} />;
      })}
      <circle cx={x} cy={y} r={r} fill={PAPER} />
    </g>
  );
}

function Hills({ d, shaded = true }: { d: string; shaded?: boolean }) {
  return (
    <g>
      <path d={d} fill={PAPER} />
      {shaded && <path d={d} fill={HATCH} stroke="none" />}
    </g>
  );
}

function Ground({ from = HORIZON }: { from?: number }) {
  return <rect y={from} width={W} height={H - from} fill={PAPER} stroke="none" />;
}

function Water({ from = HORIZON, x = 0, w = W }: { from?: number; x?: number; w?: number }) {
  return (
    <g stroke="none">
      <rect x={x} y={from} width={w} height={H - from} fill={PAPER} />
      <rect x={x} y={from} width={w} height={H - from} fill={WATER} />
    </g>
  );
}

function Tree({ x, y, r, seed = 3, bare = false }: { x: number; y: number; r: number; seed?: number; bare?: boolean }) {
  if (bare) {
    return (
      <g strokeWidth={0.9}>
        <path d={`M${x} ${y}V${y - r * 1.6}`} strokeWidth={1.6} />
        {[-1, 1, -1, 1].map((side, i) => {
          const at = y - r * (0.6 + i * 0.25);
          return <path key={i} d={`M${x} ${at}q${side * r * 0.5} ${-r * 0.3} ${side * r * 0.9} ${-r * 0.7}M${x + side * r * 0.45} ${at - r * 0.25}l${side * r * 0.25} ${-r * 0.35}`} />;
        })}
      </g>
    );
  }
  const crown = blob(x, y - r * 1.5, r, r * 0.95, 9, seed);
  return (
    <g>
      <path d={`M${x} ${y}V${y - r}`} strokeWidth={1.6} />
      <path d={crown} fill={PAPER} />
      <path d={crown} fill={HATCH} stroke="none" />
      <path d={blob(x + r * 0.25, y - r * 1.25, r * 0.55, r * 0.5, 7, seed + 9)} fill={SHADE} stroke="none" />
    </g>
  );
}

function House({ x, y, w, h, chimney = true, windows = 2, smoke = false }: { x: number; y: number; w: number; h: number; chimney?: boolean; windows?: number; smoke?: boolean }) {
  const roof = h * 0.75;
  return (
    <g>
      {chimney && <rect x={x + w * 0.68} y={y - roof * 0.9} width={w * 0.1} height={roof * 0.7} fill={PAPER} />}
      {smoke && <Smoke x={x + w * 0.73} y={y - roof * 0.95} size={w * 0.35} />}
      <path d={`M${x - 3} ${y}L${x + w / 2} ${y - roof}L${x + w + 3} ${y}Z`} fill={PAPER} />
      <path d={`M${x - 3} ${y}L${x + w / 2} ${y - roof}L${x + w + 3} ${y}Z`} fill={HATCH} stroke="none" />
      <rect x={x} y={y} width={w} height={h} fill={PAPER} />
      <rect x={x + w * 0.5} y={y} width={w * 0.5} height={h} fill={HATCH} stroke="none" />
      {Array.from({ length: windows }, (_, i) => (
        <rect key={i} x={x + (w / (windows + 1)) * (i + 1) - 3} y={y + h * 0.22} width={6} height={7} fill={PAPER} />
      ))}
      <rect x={x + w / 2 - 3.5} y={y + h - 11} width={7} height={11} fill={SHADE} />
    </g>
  );
}

// A neoclassical front: steps, columns, entablature, pediment.
function Portico({ x, y, w, h, columns = 6, dome = false, flag = false }: { x: number; y: number; w: number; h: number; columns?: number; dome?: boolean; flag?: boolean }) {
  const top = y - h;
  const ped = h * 0.32;
  return (
    <g>
      {dome && (
        <g>
          <rect x={x + w * 0.32} y={top - ped - 10} width={w * 0.36} height={12} fill={PAPER} />
          <path d={`M${x + w * 0.3} ${top - ped - 10}A${w * 0.2} ${w * 0.17} 0 0 1 ${x + w * 0.7} ${top - ped - 10}Z`} fill={PAPER} />
          <path d={`M${x + w * 0.5} ${top - ped - 10}A${w * 0.2} ${w * 0.17} 0 0 1 ${x + w * 0.7} ${top - ped - 10}Z`} fill={HATCH} stroke="none" />
          {[0.38, 0.46, 0.54, 0.62].map((f) => (
            <path key={f} d={`M${x + w * f} ${top - ped - 10}Q${x + w * 0.5} ${top - ped - 10 - w * 0.2} ${x + w * 0.5} ${top - ped - 10 - w * 0.17}`} strokeWidth={0.5} />
          ))}
          <path d={`M${x + w * 0.5} ${top - ped - 10 - w * 0.17}v-8`} />
        </g>
      )}
      {flag && <Flag x={x + w / 2} y={top - ped} h={30} />}
      <path d={`M${x} ${top}L${x + w / 2} ${top - ped}L${x + w} ${top}Z`} fill={PAPER} />
      <path d={`M${x + 14} ${top - 3}L${x + w / 2} ${top - ped + 6}L${x + w - 14} ${top - 3}Z`} fill={HATCH} />
      <rect x={x} y={top} width={w} height={10} fill={PAPER} />
      <rect x={x + 4} y={top + 10} width={w - 8} height={h - 22} fill={SHADE} stroke="none" />
      {Array.from({ length: columns }, (_, i) => {
        const cx = x + 10 + ((w - 20) / (columns - 1)) * i;
        return (
          <g key={i}>
            <rect x={cx - 4} y={top + 10} width={8} height={h - 22} fill={PAPER} />
            <path d={`M${cx - 1.5} ${top + 12}V${y - 14}M${cx + 1.5} ${top + 12}V${y - 14}`} strokeWidth={0.4} />
          </g>
        );
      })}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x - 6 - i * 5} y={y - 12 + i * 4} width={w + 12 + i * 10} height={4} fill={PAPER} />
      ))}
    </g>
  );
}

function Flag({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g>
      <path d={`M${x} ${y}V${y - h}`} strokeWidth={1.1} />
      <path d={`M${x} ${y - h}q10 -4 20 0t20 0v12q-10 -4 -20 0t-20 0Z`} fill={PAPER} />
      <path d={`M${x} ${y - h + 6}q10 -4 20 0t20 0`} strokeWidth={0.5} />
    </g>
  );
}

function Smoke({ x, y, size, drift = 1 }: { x: number; y: number; size: number; drift?: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => {
        const d = blob(x + drift * size * i * 0.9, y - size * (0.4 + i * 0.55), size * (0.35 + i * 0.18), size * (0.28 + i * 0.12), 8, i * 5 + Math.round(x));
        return (
          <g key={i}>
            <path d={d} fill={PAPER} strokeWidth={0.7} />
            {i < 2 && <path d={d} fill={HATCH} stroke="none" />}
          </g>
        );
      })}
    </g>
  );
}

function Ship({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const t = (dx: number, dy: number) => `${x + dx * s} ${y + dy * s}`;
  return (
    <g>
      <path d={`M${t(-46, -6)}L${t(46, -6)}L${t(36, 8)}L${t(-38, 8)}Z`} fill={PAPER} />
      <path d={`M${t(-42, 0)}L${t(42, 0)}L${t(36, 8)}L${t(-38, 8)}Z`} fill={SHADE} stroke="none" />
      <path d={`M${t(-20, -6)}V${y - 78 * s}M${t(14, -6)}V${y - 70 * s}M${t(46, -6)}L${t(64, -24)}`} strokeWidth={1.1} />
      {[
        [-20, -72, 15],
        [-20, -46, 19],
        [14, -64, 13],
        [14, -40, 17],
      ].map(([mx, my, half], i) => (
        <g key={i}>
          <path d={`M${t(mx - half, my)}Q${t(mx, my + 4)} ${t(mx + half, my)}L${t(mx + half + 2, my + 22)}Q${t(mx, my + 27)} ${t(mx - half - 2, my + 22)}Z`} fill={PAPER} />
          <path d={`M${t(mx + 2, my + 2)}L${t(mx + half + 2, my + 22)}Q${t(mx + 6, my + 26)} ${t(mx, my + 25)}Z`} fill={HATCH} stroke="none" />
        </g>
      ))}
      <path d={`M${t(-20, -78)}l${-10 * s} ${3 * s}l${10 * s} ${3 * s}`} fill={PAPER} strokeWidth={0.7} />
    </g>
  );
}

function Crowd({ x0, x1, y, rows = 2, tools = "forks" }: { x0: number; x1: number; y: number; rows?: number; tools?: "forks" | "banners" }) {
  const people: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const gap = 15 - r * 2;
    for (let px = x0 + (r % 2) * 7, i = 0; px < x1; px += gap, i++) {
      const py = y - r * 13 + wobble(i + r * 31) * 3;
      const s = 1 - r * 0.15;
      const raised = (i + r) % 4 === 1;
      people.push(
        <g key={`${r}-${i}`}>
          {raised && tools === "forks" && <path d={`M${px + 4 * s} ${py - 4}l${3 * s} ${-26 * s}m${-4 * s} ${0}l${7 * s} ${1.5 * s}m${-7 * s} ${-1.5 * s}l${-1 * s} ${-6 * s}m${4.5 * s} ${0.8 * s}l${-0.6 * s} ${-6 * s}m${3.6 * s} ${0.7 * s}l0 ${-6 * s}`} strokeWidth={0.8} />}
          <path d={`M${px - 6 * s} ${py + 16 * s}Q${px - 6 * s} ${py + 2} ${px} ${py + 2}Q${px + 6 * s} ${py + 2} ${px + 6 * s} ${py + 16 * s}Z`} fill={r === 0 ? SHADE : HATCH} />
          <circle cx={px} cy={py - 2} r={4 * s} fill={PAPER} />
        </g>,
      );
    }
  }
  return (
    <g>
      {tools === "banners" &&
        Array.from({ length: Math.floor((x1 - x0) / 170) }, (_, i) => {
          const bx = x0 + 60 + i * 170;
          return (
            <g key={i}>
              <path d={`M${bx} ${y - 10}V${y - 62}M${bx + 56} ${y - 10}V${y - 62}`} strokeWidth={1.1} />
              <path d={`M${bx} ${y - 60}Q${bx + 28} ${y - 55} ${bx + 56} ${y - 60}V${y - 42}Q${bx + 28} ${y - 37} ${bx} ${y - 42}Z`} fill={PAPER} />
              <path d={`M${bx + 8} ${y - 50}Q${bx + 28} ${y - 46} ${bx + 48} ${y - 50}`} strokeWidth={0.5} strokeDasharray="4 2" />
            </g>
          );
        })}
      {people.reverse()}
    </g>
  );
}

function Wheat({ x, y, n, thin = false }: { x: number; y: number; n: number; thin?: boolean }) {
  return (
    <g strokeWidth={0.7}>
      {Array.from({ length: n }, (_, i) => {
        const sx = x + i * 5 + wobble(i) * 3;
        const lean = (wobble(i + 7) - 0.5) * (thin ? 16 : 8);
        const top = y - 28 - wobble(i + 3) * 10;
        const ear = thin ? 2 : 4;
        return (
          <g key={i}>
            <path d={`M${sx} ${y}Q${sx} ${(y + top) / 2} ${sx + lean} ${top}`} />
            {Array.from({ length: ear }, (_, k) => (
              <ellipse key={k} cx={sx + lean - 1.5 + (k % 2) * 3} cy={top + 2 + k * 2.6} rx={1.4} ry={2.4} transform={`rotate(${k % 2 ? 25 : -25} ${sx + lean} ${top + 2 + k * 2.6})`} fill={PAPER} />
            ))}
          </g>
        );
      })}
    </g>
  );
}

function Chimney({ x, w, top, smoke = 1 }: { x: number; w: number; top: number; smoke?: number }) {
  return (
    <g>
      {smoke > 0 && <Smoke x={x + w / 2 + 6} y={top - 2} size={14 * smoke} />}
      <path d={`M${x} ${HORIZON}L${x + 2} ${top}H${x + w - 2}L${x + w} ${HORIZON}Z`} fill={PAPER} />
      <path d={`M${x + w / 2} ${HORIZON}L${x + w / 2 + 1} ${top}H${x + w - 2}L${x + w} ${HORIZON}Z`} fill={HATCH} stroke="none" />
      <rect x={x} y={top - 4} width={w} height={4} fill={PAPER} />
    </g>
  );
}

function Works({ x, w }: { x: number; w: number }) {
  const teeth = Math.floor(w / 26);
  const d = `M${x} ${HORIZON}V${HORIZON - 26}${Array.from({ length: teeth }, (_, i) => `L${x + i * 26 + 20} ${HORIZON - 44}V${HORIZON - 26}`).join("")}L${x + w} ${HORIZON - 26}V${HORIZON}Z`;
  return (
    <g>
      <path d={d} fill={PAPER} />
      <path d={d} fill={HATCH} stroke="none" />
      {Array.from({ length: teeth }, (_, i) => (
        <rect key={i} x={x + i * 26 + 6} y={HORIZON - 20} width={9} height={12} fill={PAPER} />
      ))}
    </g>
  );
}

function Furrows({ vx = W / 2 }: { vx?: number }) {
  return (
    <g strokeWidth={0.55}>
      {Array.from({ length: 23 }, (_, i) => {
        const k = i - 11;
        return <line key={i} x1={vx + k * 12} y1={HORIZON + 2} x2={vx + k * 70} y2={H} />;
      })}
      <path d={`M0 ${HORIZON + 22}Q160 ${HORIZON + 18} 320 ${HORIZON + 22}T640 ${HORIZON + 20}`} strokeWidth={1.4} strokeDasharray="2 2" />
    </g>
  );
}

function Rays({ x, y }: { x: number; y: number }) {
  return (
    <g strokeWidth={0.5}>
      {Array.from({ length: 64 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2;
        return <line key={i} x1={x + Math.cos(a) * 30} y1={y + Math.sin(a) * 30} x2={x + Math.cos(a) * 400} y2={y + Math.sin(a) * 400} strokeOpacity={i % 2 ? 0.45 : 0.9} />;
      })}
    </g>
  );
}

function Birds({ at }: { at: Array<[number, number]> }) {
  return (
    <g strokeWidth={0.8}>
      {at.map(([x, y], i) => (
        <path key={i} d={`M${x - 5} ${y}q2.5 -3 5 0q2.5 -3 5 0`} />
      ))}
    </g>
  );
}

// --- Scenes ----------------------------------------------------------------

function SceneFields() {
  return (
    <>
      <Sky />
      <Sun x={510} y={HORIZON - 14} r={22} />
      <Cloud x={170} y={38} w={120} />
      <Cloud x={380} y={58} w={80} seed={5} />
      <Hills d={`M0 ${HORIZON - 4}Q90 ${HORIZON - 30} 200 ${HORIZON - 16}T420 ${HORIZON - 12}T640 ${HORIZON - 18}V${HORIZON}H0Z`} />
      <rect x={70} y={HORIZON - 46} width={96} height={30} fill={PAPER} />
      <path d={`M64 ${HORIZON - 46}L118 ${HORIZON - 62}L172 ${HORIZON - 46}Z`} fill={HATCH} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={78 + i * 14} y={HORIZON - 40} width={6} height={9} fill={PAPER} />
      ))}
      <rect x={112} y={HORIZON - 28} width={11} height={12} fill={SHADE} />
      <Tree x={50} y={HORIZON - 12} r={13} />
      <Tree x={190} y={HORIZON - 14} r={11} seed={8} />
      <Ground />
      <Furrows />
      <Wheat x={18} y={H - 4} n={12} />
      <Wheat x={560} y={H - 2} n={14} />
    </>
  );
}

function SceneFlood() {
  return (
    <>
      <Sky />
      <Cloud x={140} y={34} w={200} dark seed={2} />
      <Cloud x={430} y={44} w={240} dark seed={4} />
      <g strokeWidth={0.5}>
        {Array.from({ length: 70 }, (_, i) => {
          const x = (i * 37) % W;
          const y = 58 + ((i * 23) % 60);
          return <line key={i} x1={x} y1={y} x2={x - 5} y2={y + 11} />;
        })}
      </g>
      <Hills d={`M0 ${HORIZON - 8}Q120 ${HORIZON - 26} 260 ${HORIZON - 10}T640 ${HORIZON - 14}V${HORIZON}H0Z`} />
      <House x={90} y={HORIZON - 16} w={56} h={30} smoke={false} />
      <path d={`M300 ${HORIZON - 4}V${HORIZON - 58}L306 ${HORIZON - 74}L312 ${HORIZON - 58}V${HORIZON - 4}Z`} fill={PAPER} />
      <rect x={292} y={HORIZON - 40} width={28} height={36} fill={PAPER} />
      <path d={`M306 ${HORIZON - 74}V${HORIZON - 84}M302 ${HORIZON - 80}H310`} />
      <House x={430} y={HORIZON - 12} w={64} h={30} windows={3} />
      <Tree x={220} y={HORIZON + 2} r={12} />
      <Tree x={560} y={HORIZON + 4} r={14} seed={6} />
      <Water from={HORIZON + 2} />
      <g strokeWidth={0.6}>
        {[110, 128, 300, 452, 470].map((x, i) => (
          <path key={i} d={`M${x - 10} ${HORIZON + 10 + (i % 2) * 6}h20`} />
        ))}
      </g>
      <path d={`M228 172Q260 186 300 172L292 166H236Z`} fill={PAPER} />
      <path d="M248 166l-14 -16M276 166l16 -14" strokeWidth={1} />
      <circle cx={262} cy={152} r={4} fill={PAPER} />
      <path d="M256 166Q256 156 262 156Q268 156 268 166" fill={SHADE} />
    </>
  );
}

function SceneGranary() {
  return (
    <>
      <Sky />
      <Sun x={470} y={52} r={20} rays={24} />
      <Birds at={[[300, 40], [322, 50], [340, 36]]} />
      <Hills d={`M0 ${HORIZON - 6}Q140 ${HORIZON - 18} 300 ${HORIZON - 8}T640 ${HORIZON - 10}V${HORIZON}H0Z`} shaded={false} />
      <path d={`M90 ${HORIZON}V${HORIZON - 44}L120 ${HORIZON - 70}H210L240 ${HORIZON - 44}V${HORIZON}Z`} fill={PAPER} />
      <path d={`M90 ${HORIZON - 44}L120 ${HORIZON - 70}H210L240 ${HORIZON - 44}Z`} fill={HATCH} />
      <path d={`M165 ${HORIZON}V${HORIZON - 44}L210 ${HORIZON - 70}L240 ${HORIZON - 44}V${HORIZON}Z`} fill={HATCH} stroke="none" />
      <rect x={145} y={HORIZON - 34} width={40} height={34} fill={SHADE} />
      <path d={`M145 ${HORIZON - 34}l40 34M185 ${HORIZON - 34}l-40 34`} strokeWidth={0.6} />
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={258 + i * 13} cy={HORIZON - 6 - (i === 1 ? 10 : 0)} rx={8} ry={9} fill={PAPER} />
      ))}
      <Ground />
      <g strokeWidth={0.6}>
        {Array.from({ length: 14 }, (_, i) => {
          const x = 20 + i * 46 + wobble(i) * 20;
          const y = HORIZON + 20 + wobble(i + 4) * 50;
          return <path key={i} d={`M${x} ${y}l8 3l5 -4l9 5l6 -2`} />;
        })}
      </g>
      <Wheat x={330} y={H - 6} n={9} thin />
      <Wheat x={470} y={H - 2} n={7} thin />
      <Wheat x={40} y={H - 4} n={6} thin />
    </>
  );
}

function SceneHarbour() {
  return (
    <>
      <Sky />
      <Cloud x={420} y={36} w={150} />
      <Birds at={[[360, 70], [380, 62], [520, 80]]} />
      <Water from={HORIZON - 10} x={240} w={W - 240} />
      <path d={`M560 ${HORIZON - 10}q20 -12 50 -8q20 2 30 8Z`} fill={HATCH} />
      <path d={`M596 ${HORIZON - 18}L600 ${HORIZON - 78}H612L616 ${HORIZON - 18}Z`} fill={PAPER} />
      <path d={`M606 ${HORIZON - 18}L606 ${HORIZON - 78}H612L616 ${HORIZON - 18}Z`} fill={HATCH} stroke="none" />
      <rect x={598} y={HORIZON - 90} width={16} height={12} fill={PAPER} />
      <path d={`M596 ${HORIZON - 90}L606 ${HORIZON - 100}L616 ${HORIZON - 90}Z`} fill={SHADE} />
      <g strokeWidth={0.5}>
        <path d={`M590 ${HORIZON - 84}l-40 -6M590 ${HORIZON - 84}l-40 6M622 ${HORIZON - 84}l18 -4`} />
      </g>
      <Ship x={380} y={HORIZON + 14} s={0.85} />
      <Ship x={520} y={HORIZON + 34} s={0.6} />
      <rect x={0} y={HORIZON - 10} width={250} height={H - HORIZON + 10} fill={PAPER} />
      {Array.from({ length: 8 }, (_, r) =>
        Array.from({ length: 9 }, (_, c) => <rect key={`${r}-${c}`} x={c * 28 + (r % 2) * 14 - 14} y={HORIZON - 4 + r * 9} width={28} height={9} fill="none" strokeWidth={0.45} />),
      )}
      <path d={`M0 ${HORIZON - 10}H250V${H}`} strokeWidth={1.4} />
      <House x={20} y={HORIZON - 42} w={46} h={32} windows={2} />
      <House x={76} y={HORIZON - 48} w={54} h={38} windows={3} smoke />
      <House x={140} y={HORIZON - 40} w={42} h={30} chimney={false} />
      <path d={`M200 ${HORIZON - 10}V${HORIZON - 70}L246 ${HORIZON - 64}M200 ${HORIZON - 56}L230 ${HORIZON - 66}M240 ${HORIZON - 65}V${HORIZON - 40}`} strokeWidth={1.2} />
      <rect x={234} y={HORIZON - 40} width={12} height={9} fill={SHADE} />
    </>
  );
}

function SceneIsland() {
  return (
    <>
      <Sky to={HORIZON - 20} />
      <Sun x={560} y={HORIZON - 26} r={16} />
      <Cloud x={250} y={40} w={170} seed={7} />
      <Birds at={[[420, 60], [440, 52]]} />
      <Water from={HORIZON - 22} />
      <Hills d={`M380 ${HORIZON - 22}Q420 ${HORIZON - 48} 460 ${HORIZON - 40}T530 ${HORIZON - 30}Q560 ${HORIZON - 26} 600 ${HORIZON - 22}Z`} />
      <Tree x={436} y={HORIZON - 38} r={6} />
      <Tree x={470} y={HORIZON - 36} r={7} seed={11} />
      <Tree x={500} y={HORIZON - 30} r={5} seed={13} />
      <Ship x={190} y={HORIZON + 40} s={1.15} />
      <Ship x={460} y={HORIZON + 6} s={0.4} />
    </>
  );
}

function SceneRising({ backdrop }: { backdrop: "manor" | "town" | "foundry" }) {
  return (
    <>
      <Sky />
      {backdrop === "foundry" ? (
        <>
          <Chimney x={150} w={14} top={30} />
          <Chimney x={260} w={16} top={22} smoke={0} />
          <Chimney x={430} w={14} top={34} smoke={0} />
          <Works x={80} w={480} />
        </>
      ) : backdrop === "manor" ? (
        <>
          <Cloud x={500} y={40} w={150} dark />
          <Hills d={`M0 ${HORIZON - 10}Q160 ${HORIZON - 30} 320 ${HORIZON - 16}T640 ${HORIZON - 12}V${HORIZON}H0Z`} />
          <Portico x={230} y={HORIZON - 6} w={180} h={64} columns={6} />
          <Tree x={190} y={HORIZON - 6} r={14} />
          <Tree x={450} y={HORIZON - 6} r={15} seed={5} />
        </>
      ) : (
        <>
          <Cloud x={150} y={40} w={150} dark seed={9} />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <House key={i} x={10 + i * 80} y={HORIZON - 40 - (i % 3) * 8} w={60} h={40 + (i % 3) * 8} windows={2} chimney={i % 2 === 0} />
          ))}
        </>
      )}
      <Ground />
      <path d={`M0 ${HORIZON + 4}H${W}`} strokeWidth={0.6} />
      <Crowd x0={30} x1={610} y={H - 30} rows={3} tools={backdrop === "manor" ? "forks" : "banners"} />
    </>
  );
}

function SceneFelling() {
  return (
    <>
      <Sky />
      <Cloud x={220} y={42} w={140} seed={3} />
      <Hills d={`M0 ${HORIZON - 6}Q200 ${HORIZON - 30} 380 ${HORIZON - 14}T640 ${HORIZON - 22}V${HORIZON}H0Z`} shaded={false} />
      {[520, 548, 576, 604, 630].map((x, i) => (
        <Tree key={x} x={x} y={HORIZON - 16 + (i % 2) * 4} r={10 + (i % 3) * 2} seed={i * 3} />
      ))}
      <Ground />
      {[
        [80, 150, 12],
        [170, 140, 10],
        [260, 168, 14],
        [380, 146, 11],
        [470, 172, 13],
        [560, 156, 10],
        [120, 182, 15],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x - r} ${y}V${y + r * 0.9}Q${x} ${y + r * 1.3} ${x + r} ${y + r * 0.9}V${y}`} fill={HATCH} />
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.35} fill={PAPER} />
          <ellipse cx={x} cy={y} rx={r * 0.5} ry={r * 0.16} strokeWidth={0.5} />
        </g>
      ))}
      <g>
        <path d={`M300 ${H - 18}L470 ${H - 40}L474 ${H - 26}L304 ${H - 4}Z`} fill={HATCH} />
        <ellipse cx={302} cy={H - 11} rx={5} ry={7} fill={PAPER} />
      </g>
      <path d={`M256 ${168 - 5}l22 -34`} strokeWidth={1.6} />
      <path d={`M272 ${168 - 34}l12 -4l-4 12Z`} fill={SHADE} />
    </>
  );
}

function SceneFestival() {
  return (
    <>
      <Sky />
      {[
        [130, 48],
        [320, 30],
        [510, 52],
      ].map(([x, y], i) => (
        <g key={i} strokeWidth={0.7}>
          {Array.from({ length: 18 }, (_, k) => {
            const a = (k / 18) * Math.PI * 2;
            return <line key={k} x1={x + Math.cos(a) * 6} y1={y + Math.sin(a) * 6} x2={x + Math.cos(a) * 26} y2={y + Math.sin(a) * 26} strokeDasharray="3 2" />;
          })}
          <circle cx={x} cy={y} r={2} fill="currentColor" />
        </g>
      ))}
      <path d={`M0 18Q160 50 320 20T640 18`} strokeWidth={0.8} />
      {Array.from({ length: 22 }, (_, i) => {
        const x = 12 + i * 29;
        const y = 18 + Math.sin((x / 320) * Math.PI) * 18 * (x < 320 ? 1 : 1);
        return <path key={i} d={`M${x - 6} ${y + 2}L${x} ${y + 13}L${x + 6} ${y + 2}Z`} fill={i % 2 ? HATCH : PAPER} />;
      })}
      {[0, 1, 2].map((i) => (
        <House key={i} x={10 + i * 62} y={HORIZON - 44 - i * 6} w={52} h={44 + i * 6} windows={2} chimney={false} />
      ))}
      {[0, 1, 2].map((i) => (
        <House key={i} x={450 + i * 62} y={HORIZON - 56 + i * 6} w={52} h={56 - i * 6} windows={2} chimney={false} />
      ))}
      <path d={`M310 ${HORIZON - 10}L314 ${HORIZON - 98}L320 ${HORIZON - 106}L326 ${HORIZON - 98}L330 ${HORIZON - 10}Z`} fill={PAPER} />
      <path d={`M320 ${HORIZON - 106}L326 ${HORIZON - 98}L330 ${HORIZON - 10}H320Z`} fill={HATCH} stroke="none" />
      <rect x={300} y={HORIZON - 10} width={40} height={10} fill={PAPER} />
      <Ground />
      <Crowd x0={20} x1={620} y={H - 22} rows={3} tools="banners" />
    </>
  );
}

function SceneThrone() {
  return (
    <>
      <rect width={W} height={H} fill={HATCH} stroke="none" />
      <path d={`M120 ${H}L250 120H390L520 ${H}Z`} fill={PAPER} />
      <g strokeWidth={0.5}>
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={250 + i * 17.5} y1={120} x2={120 + i * 50} y2={H} />
        ))}
        {[132, 148, 168, 192].map((y) => (
          <line key={y} x1={250 - ((y - 120) / 80) * 130} y1={y} x2={390 + ((y - 120) / 80) * 130} y2={y} />
        ))}
      </g>
      {[60, 120, 520, 580].map((x) => (
        <g key={x}>
          <rect x={x - 12} y={10} width={24} height={H - 10} fill={PAPER} />
          {[-6, -2, 2, 6].map((d) => (
            <line key={d} x1={x + d} y1={16} x2={x + d} y2={H - 6} strokeWidth={0.4} />
          ))}
          <rect x={x - 16} y={4} width={32} height={8} fill={PAPER} />
        </g>
      ))}
      <path d="M180 0Q230 46 280 10Q320 50 360 10Q410 46 460 0Z" fill={PAPER} />
      <path d="M180 0Q230 46 280 10Q320 50 360 10Q410 46 460 0" strokeWidth={0.6} transform="translate(0 6)" />
      <path d="M168 0H226Q206 50 236 104Q196 84 172 112Q186 56 168 0Z" fill={SHADE} />
      <path d="M472 0H414Q434 50 404 104Q444 84 468 112Q454 56 472 0Z" fill={SHADE} />
      <path d="M226 74Q232 82 236 84M414 74Q408 82 404 84" strokeWidth={2} />
      <path d="M290 120V44Q320 30 350 44V120Z" fill={PAPER} />
      <path d="M298 112V50Q320 40 342 50V112Z" fill={SHADE} />
      <path d="M306 34l4 -12l5 7l5 -9l5 9l5 -7l4 12Z" fill={PAPER} />
      <rect x={282} y={104} width={76} height={14} fill={PAPER} />
      <path d="M282 118V138M358 118V138" strokeWidth={2} />
      <rect x={262} y={138} width={116} height={6} fill={PAPER} />
      <rect x={250} y={144} width={140} height={6} fill={PAPER} />
    </>
  );
}

function SceneHall() {
  return (
    <>
      <Sky />
      <Cloud x={110} y={40} w={130} seed={14} />
      <Cloud x={530} y={30} w={110} seed={15} />
      <Portico x={190} y={HORIZON + 14} w={260} h={92} columns={8} flag />
      <Tree x={150} y={HORIZON + 10} r={18} />
      <Tree x={490} y={HORIZON + 10} r={17} seed={6} />
      <Ground from={HORIZON + 14} />
      <g strokeWidth={0.5}>
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={320 + (i - 5) * 26} y1={HORIZON + 14} x2={320 + (i - 5) * 80} y2={H} />
        ))}
      </g>
      {[60, 580].map((x) => (
        <g key={x}>
          <path d={`M${x} ${H - 6}V${HORIZON - 4}`} strokeWidth={1.4} />
          <path d={`M${x - 7} ${HORIZON - 4}h14l-3 -10h-8Z`} fill={PAPER} />
        </g>
      ))}
    </>
  );
}

function SceneAcademy() {
  return (
    <>
      <Sky />
      <Cloud x={520} y={36} w={140} seed={19} />
      <Portico x={262} y={HORIZON + 10} w={200} h={62} columns={6} dome />
      <Tree x={520} y={HORIZON + 8} r={16} />
      <Ground from={HORIZON + 10} />
      <g>
        <path d={`M110 ${H - 8}L130 150L150 ${H - 8}M130 150V${H - 8}`} strokeWidth={1.3} />
        <path d="M78 150L196 96L201 107L84 162Z" fill={PAPER} />
        <path d="M78 150L196 96L198 101L80 156Z" fill={HATCH} stroke="none" />
        <ellipse cx={199} cy={101} rx={4} ry={7} transform="rotate(-24 199 101)" fill={SHADE} />
      </g>
      <g strokeWidth={0.7}>
        <circle cx={600} cy={170} r={18} fill={PAPER} />
        <ellipse cx={600} cy={170} rx={8} ry={18} />
        <path d="M582 170H618M585 160H615M585 180H615" />
        <path d="M600 188V198M588 198H612" strokeWidth={1.3} />
      </g>
    </>
  );
}

function SceneMine() {
  return (
    <>
      <Sky />
      <Hills d={`M0 ${HORIZON - 10}Q100 ${HORIZON - 60} 220 ${HORIZON - 40}T460 ${HORIZON - 54}T640 ${HORIZON - 30}V${HORIZON}H0Z`} />
      <Chimney x={430} w={12} top={36} smoke={1.1} />
      <rect x={360} y={HORIZON - 40} width={60} height={40} fill={PAPER} />
      <path d={`M354 ${HORIZON - 40}L390 ${HORIZON - 58}L426 ${HORIZON - 40}Z`} fill={HATCH} />
      <rect x={384} y={HORIZON - 30} width={12} height={20} fill={SHADE} />
      <g strokeWidth={1.4}>
        <path d={`M230 ${HORIZON}L262 ${HORIZON - 86}L294 ${HORIZON}M246 ${HORIZON - 40}H278M262 ${HORIZON - 86}L320 ${HORIZON}`} />
      </g>
      <circle cx={262} cy={HORIZON - 88} r={16} fill={PAPER} strokeWidth={1.2} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <line key={i} x1={262} y1={HORIZON - 88} x2={262 + Math.cos(a) * 16} y2={HORIZON - 88 + Math.sin(a) * 16} strokeWidth={0.6} />;
      })}
      <path d={`M60 ${HORIZON}L110 ${HORIZON - 34}L170 ${HORIZON}Z`} fill={SHADE} />
      <path d={`M500 ${HORIZON}L540 ${HORIZON - 22}L590 ${HORIZON}Z`} fill={HATCH} />
      <Ground />
      <g strokeWidth={0.9}>
        <path d={`M262 ${HORIZON}L120 ${H}M276 ${HORIZON}L240 ${H}`} />
        {Array.from({ length: 7 }, (_, i) => {
          const t = (i + 1) / 8;
          const y = HORIZON + (H - HORIZON) * t;
          return <line key={i} x1={262 - 142 * t - 6} y1={y} x2={276 - 36 * t + 6} y2={y} strokeWidth={0.6} />;
        })}
      </g>
      <path d="M168 150H226L220 172H174Z" fill={HATCH} />
      <path d={blob(197, 148, 24, 6, 8, 2)} fill={SHADE} />
      <circle cx={180} cy={174} r={5} fill={PAPER} />
      <circle cx={214} cy={174} r={5} fill={PAPER} />
    </>
  );
}

function SceneWinter() {
  return (
    <>
      <Sky />
      <Cloud x={470} y={34} w={220} seed={21} />
      {Array.from({ length: 6 }, (_, i) => (
        <House key={i} x={30 + i * 100} y={HORIZON - 34 - (i % 2) * 10} w={70} h={34 + (i % 2) * 10} windows={3} smoke={i % 3 === 1} />
      ))}
      <Tree x={20} y={H - 20} r={20} bare />
      <Tree x={600} y={H - 10} r={24} bare />
      <Ground />
      <g fill="currentColor" stroke="none">
        {Array.from({ length: 120 }, (_, i) => (
          <circle key={i} cx={(i * 53) % W} cy={(i * 29) % H} r={0.6 + wobble(i) * 0.9} />
        ))}
      </g>
      <g strokeWidth={0.5}>
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${300 + i * 6 - 40} ${H - i * 5}q2 -2 4 0`} />
        ))}
      </g>
    </>
  );
}

function SceneCrown() {
  return (
    <>
      <Rays x={W / 2} y={92} />
      <circle cx={W / 2} cy={92} r={58} fill={PAPER} stroke="none" />
      {[-1, 1].map((side) => (
        <g key={side} transform={`translate(${W / 2} 0) scale(${side} 1) translate(${-W / 2} 0)`}>
          <path d="M268 160Q228 120 246 60" strokeWidth={1.2} />
          {Array.from({ length: 8 }, (_, i) => {
            const t = i / 8;
            const x = 268 - 30 * t + 10 * t * t;
            const y = 160 - 100 * t;
            return <ellipse key={i} cx={x - 8} cy={y} rx={9} ry={3.4} transform={`rotate(${-40 + t * 30} ${x - 8} ${y})`} fill={HATCH} />;
          })}
        </g>
      ))}
      <path d="M278 132Q320 150 362 132L368 148Q320 170 272 148Z" fill={SHADE} />
      <path d="M284 128L278 72L300 98L320 62L340 98L362 72L356 128Q320 140 284 128Z" fill={PAPER} />
      <path d="M320 62L340 98L362 72L356 128Q330 136 320 134Z" fill={HATCH} stroke="none" />
      <path d="M286 116Q320 126 354 116" strokeWidth={0.8} />
      {[278, 320, 362].map((x, i) => (
        <circle key={x} cx={x} cy={i === 1 ? 58 : 68} r={4} fill={PAPER} />
      ))}
      <path d="M300 112l4 -6l4 6l-4 6ZM332 112l4 -6l4 6l-4 6Z" fill={SHADE} />
      <path d="M220 172Q320 158 420 172L412 186Q320 174 228 186Z" fill={PAPER} />
      <path d="M220 172L204 184L228 186M420 172L436 184L412 186" fill={HATCH} />
    </>
  );
}

function SceneFoundry() {
  return (
    <>
      <Sky />
      <Chimney x={90} w={16} top={24} smoke={1.4} />
      <Chimney x={200} w={18} top={14} smoke={1.6} />
      <Chimney x={330} w={14} top={30} smoke={1.2} />
      <Chimney x={470} w={18} top={20} smoke={1.5} />
      <Works x={40} w={560} />
      <Ground />
      {Array.from({ length: 9 }, (_, i) => (
        <House key={i} x={i * 72 - 8} y={H - 34} w={64} h={34} windows={2} />
      ))}
      <path d={`M0 ${HORIZON + 6}H${W}`} strokeWidth={0.6} />
    </>
  );
}

function SceneCommons() {
  return (
    <>
      <Sky />
      <Cloud x={160} y={40} w={150} seed={23} />
      <Hills d={`M0 ${HORIZON - 8}Q160 ${HORIZON - 34} 320 ${HORIZON - 14}T640 ${HORIZON - 24}V${HORIZON}H0Z`} />
      <g>
        <path d={`M520 ${HORIZON - 26}L526 ${HORIZON - 70}H538L544 ${HORIZON - 26}Z`} fill={PAPER} />
        <path d={`M524 ${HORIZON - 70}L532 ${HORIZON - 80}L540 ${HORIZON - 70}Z`} fill={HATCH} />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + 0.4;
          return <path key={i} d={`M532 ${HORIZON - 70}l${Math.cos(a) * 30} ${Math.sin(a) * 30}`} strokeWidth={3} />;
        })}
      </g>
      <Ground />
      <path d={`M0 ${HORIZON + 20}Q200 ${HORIZON + 12} 640 ${HORIZON + 24}`} strokeWidth={1.4} strokeDasharray="2 2" />
      {[
        [120, 160],
        [210, 150],
        [300, 172],
        [430, 158],
      ].map(([x, y], i) => (
        <g key={i}>
          <path d={`M${x - 10} ${y + 6}v9M${x + 8} ${y + 6}v9`} strokeWidth={1.2} />
          <path d={blob(x, y, 16, 10, 12, i * 7)} fill={PAPER} />
          <ellipse cx={x + (i % 2 ? -18 : 18)} cy={y - 2} rx={5} ry={4} fill={SHADE} />
        </g>
      ))}
      <g>
        {Array.from({ length: 6 }, (_, i) => {
          const x = 470 + i * 34;
          return <rect key={i} x={x} y={H - 50 + i * 2} width={5} height={40} fill={PAPER} />;
        })}
        <path d={`M470 ${H - 40}L640 ${H - 30}M470 ${H - 26}L640 ${H - 16}`} strokeWidth={2.2} />
      </g>
    </>
  );
}

function SceneExhibition() {
  return (
    <>
      <Sky />
      <Cloud x={120} y={30} w={120} seed={29} />
      <path d={`M60 ${HORIZON}V${HORIZON - 40}Q60 ${HORIZON - 70} 120 ${HORIZON - 70}H520Q580 ${HORIZON - 70} 580 ${HORIZON - 40}V${HORIZON}Z`} fill={PAPER} />
      <g strokeWidth={0.45}>
        {Array.from({ length: 26 }, (_, i) => (
          <line key={i} x1={80 + i * 19} y1={HORIZON - 68} x2={80 + i * 19} y2={HORIZON} />
        ))}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={60} y1={HORIZON - 40 * (1 - f) - 30 * f + 10} x2={580} y2={HORIZON - 40 * (1 - f) - 30 * f + 10} />
        ))}
      </g>
      <path d={`M270 ${HORIZON}V${HORIZON - 60}A50 50 0 0 1 370 ${HORIZON - 60}V${HORIZON}Z`} fill={PAPER} />
      <g strokeWidth={0.5}>
        {Array.from({ length: 11 }, (_, i) => {
          const a = Math.PI + (i / 10) * Math.PI;
          return <line key={i} x1={320} y1={HORIZON - 60} x2={320 + Math.cos(a) * 50} y2={HORIZON - 60 + Math.sin(a) * 50} />;
        })}
        <path d={`M285 ${HORIZON - 60}A35 35 0 0 1 355 ${HORIZON - 60}M300 ${HORIZON - 60}A20 20 0 0 1 340 ${HORIZON - 60}`} />
      </g>
      <rect x={300} y={HORIZON - 40} width={40} height={40} fill={SHADE} />
      <Flag x={320} y={HORIZON - 110} h={10} />
      <Flag x={110} y={HORIZON - 70} h={20} />
      <Flag x={530} y={HORIZON - 70} h={20} />
      <Ground />
      <Crowd x0={40} x1={600} y={H - 22} rows={2} tools="banners" />
    </>
  );
}

function SceneCamp() {
  return (
    <>
      <Sky />
      <Cloud x={480} y={40} w={160} seed={31} />
      <Hills d={`M0 ${HORIZON - 4}Q160 ${HORIZON - 30} 330 ${HORIZON - 12}T640 ${HORIZON - 20}V${HORIZON}H0Z`} />
      <Flag x={320} y={HORIZON - 4} h={70} />
      <Ground />
      {[
        [80, 156, 1],
        [190, 150, 0.9],
        [440, 150, 0.9],
        [560, 158, 1],
        [130, 186, 1.2],
        [510, 188, 1.2],
      ].map(([x, y, s], i) => (
        <g key={i}>
          <path d={`M${x - 30 * s} ${y}L${x} ${y - 34 * s}L${x + 30 * s} ${y}Z`} fill={PAPER} />
          <path d={`M${x} ${y - 34 * s}L${x + 30 * s} ${y}H${x}Z`} fill={HATCH} stroke="none" />
          <path d={`M${x} ${y - 34 * s}L${x - 6 * s} ${y}H${x + 6 * s}Z`} fill={SHADE} />
          <path d={`M${x} ${y - 34 * s}v-6`} />
        </g>
      ))}
      {[290, 350].map((x) => (
        <path key={x} d={`M${x - 12} ${H - 12}L${x} ${H - 52}L${x + 12} ${H - 12}M${x} ${H - 52}V${H - 12}`} strokeWidth={1.1} />
      ))}
    </>
  );
}

function drawScene(scene: Scene): ReactNode {
  switch (scene) {
    case "fields":
      return <SceneFields />;
    case "flood":
      return <SceneFlood />;
    case "granary":
      return <SceneGranary />;
    case "harbour":
      return <SceneHarbour />;
    case "island":
      return <SceneIsland />;
    case "rising-manor":
      return <SceneRising backdrop="manor" />;
    case "rising-town":
      return <SceneRising backdrop="town" />;
    case "rising-foundry":
      return <SceneRising backdrop="foundry" />;
    case "felling":
      return <SceneFelling />;
    case "festival":
      return <SceneFestival />;
    case "throne":
      return <SceneThrone />;
    case "hall":
      return <SceneHall />;
    case "academy":
      return <SceneAcademy />;
    case "mine":
      return <SceneMine />;
    case "winter":
      return <SceneWinter />;
    case "crown":
      return <SceneCrown />;
    case "foundry":
      return <SceneFoundry />;
    case "commons":
      return <SceneCommons />;
    case "exhibition":
      return <SceneExhibition />;
    case "camp":
      return <SceneCamp />;
  }
}

// The plate's frame: a double rule, and a strapwork knot in each corner.
function Frame() {
  const knot = (
    <g strokeWidth={0.8}>
      <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" fill={PAPER} />
      <rect x={-3.5} y={-3.5} width={7} height={7} transform="rotate(45)" />
      <path d="M-14 0H14M0 -14V14" strokeWidth={0.6} />
    </g>
  );
  return (
    <g>
      <rect x={1} y={1} width={W - 2} height={H - 2} strokeWidth={2} />
      <rect x={6} y={6} width={W - 12} height={H - 12} strokeWidth={0.7} />
      {[
        [6, 6],
        [W - 6, 6],
        [6, H - 6],
        [W - 6, H - 6],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {knot}
        </g>
      ))}
    </g>
  );
}

export function StoryPlate({ chapterId }: { chapterId: ChapterId }) {
  const scene = SCENE_OF[chapterId];
  if (!scene) return null;
  return (
    <svg className="story-plate" viewBox={`0 0 ${W} ${H}`} role="img" aria-hidden="true">
      <defs>
        <pattern id="plate-sky" width="8" height="3.2" patternUnits="userSpaceOnUse">
          <path d="M0 1.6H8" stroke="currentColor" strokeWidth="0.45" />
        </pattern>
        <pattern id="plate-hatch" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0V3.4" stroke="currentColor" strokeWidth="0.6" />
        </pattern>
        <pattern id="plate-shade" width="2.6" height="2.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
          <path d="M0 0V2.6M0 1.3H2.6" stroke="currentColor" strokeWidth="0.75" />
        </pattern>
        <pattern id="plate-water" width="28" height="5" patternUnits="userSpaceOnUse">
          <path d="M0 2.5Q7 0.6 14 2.5T28 2.5" fill="none" stroke="currentColor" strokeWidth="0.55" />
        </pattern>
        <clipPath id="plate-clip">
          <rect x={6} y={6} width={W - 12} height={H - 12} />
        </clipPath>
      </defs>
      <rect width={W} height={H} fill={PAPER} stroke="none" />
      <g fill="none" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" clipPath="url(#plate-clip)">
        {drawScene(scene)}
      </g>
      <g fill="none" stroke="currentColor">
        <Frame />
      </g>
    </svg>
  );
}
