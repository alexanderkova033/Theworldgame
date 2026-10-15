// Every law and technology has a pictogram of its own, drawn in the
// ledger's ink with one wash of its branch's colour, so no two nodes on a
// tree look alike and a branch reads as a family at a glance. The pictures
// are built from a small set of shapes below; a node either uses one shape,
// or a main shape with a smaller one tucked in its top-right corner (Night
// Shifts: a factory with the moon over it).
//
// Styling (ink stroke, the colour wash per branch) is in LawsPanel.css.
// Shape classes: "a" takes the branch colour, "w" the paper, "k" solid ink.
import type { ReactNode } from "react";
import { cogPoints, starPoints } from "./iconShapes";
import { StatIcon, type StatIconType } from "./StatIcon";

// --- Placement ---------------------------------------------------------------
function at(x: number, y: number, s: number, shape: ReactNode) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>{shape}</g>;
}

// A small second shape in the top-right corner, on a paper disc so it
// reads apart from the main one.
function withMark(main: ReactNode, mark: ReactNode) {
  return (
    <>
      {main}
      <circle className="w" cx={6.5} cy={-6.5} r={5.2} />
      {at(6.5, -6.5, 0.45, mark)}
    </>
  );
}

// --- Shapes, each drawn about ±9 around the centre ----------------------------
const factory = (
  <>
    <path className="a" d="M-9 9V0l5-3v3l5-3v3l4-2.4V-8h3V9z" />
    <path d="M-6 5h2M-1 5h2M4 5h2" />
  </>
);
const house = (
  <>
    <path className="a" d="M-8 9V-1L0-8l8 7V9z" />
    <path d="M-2.5 9V3h5v6" />
  </>
);
const coin = (
  <>
    <circle className="a" r={7.5} />
    <circle r={4.5} />
  </>
);
const coins = (
  <>
    <rect className="a" x={-7} y={3} width={14} height={4.5} rx={2} />
    <rect className="a" x={-5} y={-1.5} width={14} height={4.5} rx={2} />
    <rect className="a" x={-8} y={-6} width={14} height={4.5} rx={2} />
  </>
);
const scroll = (
  <>
    <path className="w" d="M-7-9h12v15a3 3 0 0 1-3 3H-8a3 3 0 0 0 1-2.5z" />
    <path d="M-4-5h6M-4-2h6M-4 1h4" />
    <circle className="a" cx={4} cy={5} r={3} />
  </>
);
const scales = (
  <>
    <path d="M0-8V8M-5 8h10M-8-5h16M-8-5l-3 6M-8-5l3 6M8-5l-3 6M8-5l3 6" />
    <path className="a" d="M-11.5 1h7a3.5 3 0 0 1-7 0zM4.5 1h7a3.5 3 0 0 1-7 0z" />
  </>
);
const gear = (
  <>
    <polygon className="a" points={cogPoints(0, 0, 9, 6.5, 8)} />
    <circle className="w" r={2.8} />
  </>
);
const wheat = (
  <>
    <path d="M0 10V-9" />
    <path className="a" d="M0-6c-3-1-4-3-4-5 3 0 4 2 4 5zM0-6c3-1 4-3 4-5-3 0-4 2-4 5zM0-1c-3-1-4-3-4-5 3 0 4 2 4 5zM0-1c3-1 4-3 4-5-3 0-4 2-4 5zM0 4c-3-1-4-3-4-5 3 0 4 2 4 5zM0 4c3-1 4-3 4-5-3 0-4 2-4 5z" />
  </>
);
const fish = (
  <>
    <path className="a" d="M-9 0c4-6 10-6 13 0-3 6-9 6-13 0zM4 0l6-5v10z" />
    <circle className="k" cx={-5} cy={-1} r={1.1} />
  </>
);
const loaf = (
  <>
    <path className="a" d="M-9 6V0a9 7 0 0 1 18 0v6z" />
    <path d="M-5-3l2 4M-1-4.5l2 4M3-3.5l2 4" />
  </>
);
const person = (
  <>
    <circle className="a" cy={-4.5} r={3.6} />
    <path className="a" d="M-7 9a7 7.5 0 0 1 14 0z" />
  </>
);
const people = (
  <>
    {at(-5, 1.5, 0.7, person)}
    {at(5, 1.5, 0.7, person)}
    {at(0, -0.5, 0.8, person)}
  </>
);
const shield = <path className="a" d="M0-9l8 3v5c0 5-4 8-8 10-4-2-8-5-8-10v-5z" />;
const star = <polygon className="a" points={starPoints(0, 0, 9, 4)} />;
const key = (
  <>
    <circle className="a" cx={-4.5} r={4.5} />
    <circle className="w" cx={-4.5} r={1.5} />
    <path d="M0 0h9.5M6.5 0v3.5M9.5 0v3.5" />
  </>
);
const eye = (
  <>
    <path className="w" d="M-10 0c4-6.5 16-6.5 20 0-4 6.5-16 6.5-20 0z" />
    <circle className="a" r={3.8} />
    <circle className="k" r={1.4} />
  </>
);
const book = (
  <>
    <path className="w" d="M0-5c-3-2-6-2-9-1V7c3-1 6-1 9 1 3-2 6-2 9-1V-6c-3-1-6-1-9 1z" />
    <path className="a" d="M0-5c3-2 6-2 9-1V7c-3-1-6-1-9 1z" />
    <path d="M0-5V8" />
  </>
);
const flask = (
  <>
    <path className="w" d="M-2.5-9v6L-8 7a1.5 1.5 0 0 0 1.3 2.2h13.4A1.5 1.5 0 0 0 8 7L2.5-3v-6" />
    <path className="a" d="M-5.4 2.5h10.8L8 7a1.5 1.5 0 0 1-1.3 2.2H-6.7A1.5 1.5 0 0 1-8 7z" />
    <path d="M-4-9h8" />
  </>
);
const flame = <path className="a" d="M0 9.5c-5 0-7.5-4-6.5-8 .8-3 3-4.5 3.2-9 3 2 4.3 4.5 4.3 6.8 1-1 1.8-2.4 1.8-4.3 3 3 4.4 6.4 3.6 9.6-.8 3-3 4.9-6.4 4.9z" />;
const snowflake = (
  <path d="M0-9V9M-7.8-4.5l15.6 9M-7.8 4.5l15.6-9M-2-7l2 2 2-2M-2 7l2-2 2 2M-8-1.5l2.7.4-.7-2.7M8 1.5l-2.7-.4.7 2.7M8-1.5l-2.7.4.7-2.7M-8 1.5l2.7-.4-.7 2.7" />
);
const clock = (
  <>
    <circle className="a" r={9} />
    <circle className="w" r={6.6} />
    <path d="M0-4.5V0l3.5 2" />
  </>
);
const hammer = (
  <>
    <path d="M-1-2l8.5 10.5" />
    <path className="a" d="M-9-5l6-6 6 4-2 2.5-2-1-3.5 3.5z" />
  </>
);
const anvil = <path className="a" d="M-10-5h14c0 3 2 4.5 6 4.5H5L3 3h3v5H-6V3h3L-1 .5c-4 0-9-1.5-9-5.5z" />;
const ship = (
  <>
    <path className="a" d="M-10 3h20l-3 6H-7z" />
    <path d="M0 3V-10" />
    <path className="w" d="M0-9c5 2 6 6 6 10H0zM0-8c-4 2-5 5-5 9h5z" />
  </>
);
const bell = (
  <>
    <path className="a" d="M-7 5c1-2 1-4.5 1-8a6 6 0 0 1 12 0c0 3.5 0 6 1 8z" />
    <path d="M-8.5 5h17M0-9v-1" />
    <circle className="k" cy={7.6} r={1.6} />
  </>
);
const hall = (
  <>
    <path className="a" d="M-10-3L0-9.5 10-3z" />
    <path d="M-10 9h20M-9-3h18M-7-1v8M-2.4-1v8M2.4-1v8M7-1v8" />
  </>
);
const crown = (
  <>
    <path className="a" d="M-9 6l-1.5-11 5.5 5 5-7.5 5 7.5 5.5-5L9 6z" />
    <path d="M-9 8.5h18" />
  </>
);
const chain = (
  <>
    <rect className="a" x={-10} y={-4} width={11} height={8} rx={4} />
    <rect className="w" x={-1} y={-4} width={11} height={8} rx={4} />
    <path d="M-6 0h3M4 0h3" />
  </>
);
const door = (
  <>
    <path className="a" d="M-6 9V-3a6 6 0 0 1 12 0V9z" />
    <circle className="k" cx={3} cy={2} r={1} />
    <path d="M-9 9h18" />
  </>
);
const moon = <path className="a" d="M2-9a9 9 0 1 0 7 14.5A7.5 7.5 0 0 1 2-9z" />;
const trendUp = (
  <>
    <path d="M-9 8h18M-9 8V-9" />
    <path className="a" d="M-7 5l5-5 3 3 6-7-1.5-1.5h4.5v4.5L7.5-2.5 1 5l-3-3-4 4z" />
  </>
);
const envelope = (
  <>
    <rect className="w" x={-9} y={-6} width={18} height={12} rx={1} />
    <path className="a" d="M-9-6l9 7 9-7z" />
  </>
);
const pole = (
  <>
    <path d="M0 10V-9M-6-6h12M-5-2h10" />
    <circle className="a" cx={-6} cy={-6} r={1.5} />
    <circle className="a" cx={6} cy={-6} r={1.5} />
    <circle className="a" cx={-5} cy={-2} r={1.5} />
    <circle className="a" cx={5} cy={-2} r={1.5} />
  </>
);
const bolt = <path className="a" d="M2-10L-7 2h6L-3 10l10-13H1z" />;
const rails = (
  <>
    <path d="M-5 10L-2-9M5 10L2-9" />
    <path className="a" d="M-7 6h14v2H-7zM-6 0h12v2H-6zM-4.8-5.5h9.6v1.6h-9.6z" />
  </>
);
const plough = (
  <>
    <path d="M-10-6l12 8" />
    <path className="a" d="M0 1l7-1 3 5-8 2z" />
    <path d="M-2 8h12" />
  </>
);
const churn = (
  <>
    <path className="a" d="M-5-5h10l1.5 14h-13z" />
    <path d="M-3-9h6v4M-6 0h12" />
  </>
);
const glasshouse = (
  <>
    <path className="w" d="M-9 9V-1l9-7 9 7V9z" />
    <path d="M0-8V9M-9 3h18M-4.5-4.5V9M4.5-4.5V9" />
    <path className="a" d="M-7 9c1-3 3-4 4-4s2 2 3 4z" />
  </>
);
const barrel = (
  <>
    <path className="a" d="M-6-9h12c2 6 2 12 0 18H-6c-2-6-2-12 0-18z" />
    <path d="M-7.3-4h14.6M-7.3 4h14.6" />
  </>
);
const tin = (
  <>
    <rect className="a" x={-6} y={-6} width={12} height={15} rx={1} />
    <ellipse className="w" cy={-6} rx={6} ry={2.5} />
    <path d="M-6 0h12" />
  </>
);
const iceBlock = (
  <>
    <path className="w" d="M-8-3l8-5 8 5v9l-8 4-8-4z" />
    <path className="a" d="M-8-3l8 4 8-4-8-5z" />
    <path d="M0 1v9" />
  </>
);
const tree = (
  <>
    <path d="M0 10V2" />
    <circle className="a" cy={-3} r={6.5} />
  </>
);
const drop = <path className="a" d="M0-10c4 6 7 9.5 7 13a7 7 0 0 1-14 0c0-3.5 3-7 7-13z" />;
const ballotBox = (
  <>
    <path className="w" d="M-3.5-10h7v8h-7z" />
    <rect className="a" x={-8} y={-3} width={16} height={12} rx={1} />
    <path d="M-4-3h8" />
  </>
);
const gavel = (
  <>
    <rect className="a" x={-8} y={-9} width={10} height={6} rx={1.5} transform="rotate(-35 -3 -6)" />
    <path d="M-1-4l9 9M-9 9h11" />
  </>
);
const bars = (
  <>
    <rect className="w" x={-8} y={-8} width={16} height={17} rx={1} />
    <path d="M-4-8V9M0-8V9M4-8V9" />
    <path className="a" d="M-8-8h16v3H-8z" />
  </>
);
const sun = (
  <>
    <circle className="a" r={4.5} />
    <path d="M0-10v3M0 7v3M-10 0h3M7 0h3M-7-7l2 2M5 5l2 2M-7 7l2-2M5-5l2-2" />
  </>
);
const dove = <path className="a" d="M-10 2c3 0 5-1 7-3l-2-7c3 1 5 4 6 7l5-3-1 3 4 1-5 2c-2 4-6 6-11 5l3-3c-3 0-5-1-6-2z" />;
const seedling = (
  <>
    <path d="M0 10V-2M-9 10h18" />
    <path className="a" d="M0-2c-1-4-4-6-8-6 0 4 3 6 8 6zM0 1c1-5 4-8 8-8 0 5-3 8-8 8z" />
  </>
);
const quill = (
  <>
    <path className="a" d="M8-10C1-8-4-2-6 6l3-1c1-4 6-9 11-15z" />
    <path d="M-6 6l-3 4M-9 10h8" />
  </>
);
const seal = (
  <>
    <circle className="a" r={8} />
    <polygon className="w" points={starPoints(0, 0, 5, 2.2)} />
  </>
);
const ledger = (
  <>
    <rect className="a" x={-7} y={-9} width={14} height={18} rx={1.5} />
    <path className="w" d="M-4-5h8v4h-8z" />
    <path d="M-4 3h8" />
  </>
);
const pie = (
  <>
    <circle className="w" r={8.5} />
    <path className="a" d="M0 0V-8.5A8.5 8.5 0 0 1 8.1 2.6z" />
  </>
);
const certificate = (
  <>
    <rect className="w" x={-9} y={-7} width={18} height={12} rx={1} />
    <path d="M-6-3h12M-6 0h7" />
    <circle className="a" cx={5} cy={3} r={2.8} />
    <path className="a" d="M3.5 5l-1 5 2.5-1.5L7.5 10l-1-5z" />
  </>
);
const tower = (
  <>
    <rect className="a" x={-5} y={-10} width={10} height={20} />
    <path d="M-2-7h0M2-7h0M-2-3h0M2-3h0M-2 1h0M2 1h0M-2 5h0M2 5h0" strokeWidth={2.2} />
    <path d="M-9 10h18" />
  </>
);
const radiator = (
  <>
    <path className="a" d="M-8-6h3v14h-3zM-3-6h3v14h-3zM2-6h3v14H2zM7-6h3v14H7z" transform="translate(-1 0)" />
    <path d="M-9 4h18M-9-3h18" />
  </>
);
const bricks = (
  <>
    <rect className="a" x={-9} y={-8} width={18} height={16} />
    <path d="M-9-3h18M-9 3h18M-3-8v5M5-8v5M1-3v6M-6-3v6M-3 3v5M5 3v5" />
  </>
);
const tram = (
  <>
    <rect className="a" x={-9} y={-5} width={18} height={11} rx={2} />
    <path className="w" d="M-6-2h4v3h-4zM2-2h4v3H2z" />
    <path d="M0-5l-3-5h6M-5 9h0M5 9h0" strokeWidth={1.5} />
    <circle className="k" cx={-5} cy={7.5} r={1.5} />
    <circle className="k" cx={5} cy={7.5} r={1.5} />
  </>
);
const bath = (
  <>
    <path className="a" d="M-10 0h20v2c0 4-3 6-7 6h-6c-4 0-7-2-7-6z" />
    <path d="M-7 0v-7a2 2 0 0 1 4 0M-6 8l-1 2M6 8l1 2" />
  </>
);
const bucket = (
  <>
    <path className="a" d="M-7-4h14l-2 13H-5z" />
    <path d="M-7-4a7 7 0 0 1 14 0" />
  </>
);
const church = (
  <>
    <path className="a" d="M-8 9V0l4-3V-6l4-4 4 4v3l4 3v9z" />
    <path d="M0-10v-3M-1.5-11.5h3M-2 9V4a2 2 0 0 1 4 0v5" />
  </>
);
const papers = (
  <>
    <rect className="w" x={-8} y={-9} width={16} height={18} rx={1} />
    <circle className="a" cx={-2.5} cy={-3} r={2.5} />
    <path className="a" d="M-6.5 3a4 3 0 0 1 8 0z" />
    <path d="M3-4h3M3-1h3M-6 6h12" />
  </>
);
const typewriter = (
  <>
    <path className="w" d="M-5-10h10v6H-5z" />
    <path className="a" d="M-9-4h18l1 10h-20z" />
    <path d="M-6 0h0M-3 0h0M0 0h0M3 0h0M6 0h0M-4 3h8" strokeWidth={2} />
  </>
);
const cannon = (
  <>
    <path className="a" d="M-10-3l15-5 2 5-15 5z" />
    <circle className="w" cx={-1} cy={5} r={4} />
    <path d="M-1 5h0" strokeWidth={2.2} />
  </>
);
const medal = (
  <>
    <path className="w" d="M-5-10h4l3 7h-4zM5-10H1l-3 7h4z" />
    <circle className="a" cy={3} r={6} />
    <polygon className="w" points={starPoints(0, 3, 3.5, 1.5)} />
  </>
);
const streetlamp = (
  <>
    <path d="M0 10V-4M-4 10h8" />
    <path className="a" d="M-4-4h8l-1.5-5h-5z" />
    <path d="M-1-11h2" />
  </>
);
const spade = (
  <>
    <path d="M0-10v9M-2.5-10h5" />
    <path className="a" d="M-4-1h8v6c0 3-2 5-4 5s-4-2-4-5z" />
  </>
);
const sickle = (
  <>
    <path className="a" d="M-4 4C-8-2-5-9 3-9 6-9 8-8 9-6c-5-2-11 0-11 6 0 2 1 3 2 4z" />
    <path d="M-4 4l-5 5" />
  </>
);
const bowl = (
  <>
    <path className="a" d="M-10-1h20c0 6-4 9-10 9S-10 5-10-1z" />
    <path d="M-4-4c0-2 2-3 2-5M1-4c0-2 2-3 2-5M-6 10h12" />
  </>
);
const cane = (
  <>
    <circle className="a" cx={-3} cy={-6} r={3} />
    <path className="a" d="M-8 9c0-6 1-10 5-10s5 4 5 10z" />
    <path d="M7 10V-1c0-2-3-2-3 0" />
  </>
);
const crutch = (
  <g transform="rotate(-18)">
    <path className="a" d="M-5.5-9q5.5-3 11 0v2.2q-5.5-2.2-11 0z" />
    <path d="M-4-7l3.2 11M4-7L.8 4M-2.6-1h5.2M0 4v6" />
  </g>
);
const pickaxe = (
  <>
    <path d="M-7 9L4-3" />
    <path className="a" d="M-6-6c5-4 12-4 15 1-5-2-10-1-12 3 0-2-1-3-3-4z" />
  </>
);
const crate = (
  <>
    <rect className="a" x={-8} y={-7} width={16} height={15} />
    <path d="M-8-7l16 15M8-7L-8 8" />
  </>
);
const signpost = (
  <>
    <path d="M0 10V-10" />
    <path className="a" d="M0-8h8l2 2-2 2H0zM0-1h-8l-2 2 2 2h8z" />
  </>
);
const map = (
  <>
    <path className="w" d="M-9-7l6-2 6 2 6-2v15l-6 2-6-2-6 2z" />
    <path className="a" d="M-3-9v15l6 2V-7z" />
  </>
);
const magnifier = (
  <>
    <circle className="w" cx={-2} cy={-2} r={6} />
    <circle className="a" cx={-2} cy={-2} r={3.5} />
    <path d="M2.5 2.5l6 6" strokeWidth={2.4} />
  </>
);
const bulb = (
  <>
    <path className="a" d="M-3 5c0-3-4-5-4-9a7 7 0 0 1 14 0c0 4-4 6-4 9z" />
    <path d="M-3 7h6M-2 9.5h4M0 5V0l-2-2M0 0l2-2" />
  </>
);
const dynamo = (
  <>
    <circle className="a" r={7} />
    <path d="M-4-4c3 1 5 3 4 4s-3 3-4 4M4-4C1-3-1-1 0 0s3 3 4 4" />
    <path d="M-9 9h18" />
  </>
);
const beltDrive = (
  <>
    <circle className="a" cx={-5} r={4} />
    <circle className="a" cx={6} r={3} />
    <path d="M-5-4L6-3M-5 4L6 3" />
  </>
);
const calipers = (
  <>
    <path className="a" d="M-9-8h18v4H-9z" />
    <path d="M-6-4v13l2-3V-4M5-4v8" />
  </>
);
const nutBolt = (
  <>
    <polygon className="a" points="-4,-9 2,-9 5,-4 2,1 -4,1 -7,-4" />
    <circle className="w" cx={-1} cy={-4} r={1.8} />
    <path d="M4 3l5 5M2 5l5 5" />
  </>
);
const needle = (
  <>
    <path className="a" d="M7-9c1 0 2 1 2 2L-7 9l-1-1z" />
    <path d="M7-7c-6-1-12 3-14 10s6 6 9 3" />
  </>
);
const spinningWheel = (
  <>
    <circle className="w" cx={-2} cy={-1} r={7} />
    <path d="M-2-8V6M-9-1H5M-7-6l10 10M3-6L-7 4M-2-1l8 10M-8 9h16" />
    <circle className="a" cx={-2} cy={-1} r={2} />
  </>
);
const pitLamp = (
  <>
    <path d="M-3-10a3 3 0 0 1 6 0" />
    <path className="w" d="M-4-8h8v9h-8z" />
    <path d="M-2-8v9M2-8v9" />
    <path className="a" d="M-6 1h12v8H-6z" />
  </>
);
const furnace = (
  <>
    <path className="a" d="M-7 9V-4l2-6h10l2 6V9z" />
    <path className="w" d="M-3 9V4a3 3 0 0 1 6 0v5z" />
    <path d="M-2-10c0-2 2-2 2-4" />
  </>
);
const iBeam = <path className="a" d="M-9-8H9v4H2.5v8H9v4H-9V4h6.5v-8H-9z" />;
const crucible = (
  <>
    <path className="a" d="M-7-4h14l-2 11H-5z" />
    <path d="M-3-6l-2-4M0-6v-4M3-6l2-4" />
  </>
);
const boiler = (
  <>
    <rect className="a" x={-5} y={-5} width={10} height={13} rx={4} />
    <path d="M-2-5v-4h3v4M-8 9h16M3-10c2 0 2-2 4-2" />
    <circle className="w" cy={1.5} r={2.6} />
    <path d="M0 1.5l1.6-1.6" />
  </>
);
const stove = (
  <>
    <rect className="a" x={-7} y={-3} width={12} height={10} rx={1.5} />
    <path d="M-6 7v2.5M4 7v2.5M1-3v-6h5v-1" />
    <path className="w" d="M-4.5 0h7v4.5h-7z" />
  </>
);
const dome = (
  <>
    <path className="a" d="M-9 8a9 11 0 0 1 18 0z" />
    <path className="w" d="M-2.5 8V4a2.5 2.5 0 0 1 5 0v4z" />
    <path d="M-10 8h20" />
  </>
);
const press = (
  <>
    <path d="M-8 9V-9h16V9M-8-9h16" />
    <path className="a" d="M-5-3h10v4H-5z" />
    <path d="M0-9v6M-6 9h12" />
    <rect className="w" x={-4} y={5} width={8} height={2} />
  </>
);
const sack = (
  <>
    <path className="a" d="M-4-6c-5 3-6 9-5 13 1 2 3 2 9 2s8 0 9-2c1-4 0-10-5-13z" />
    <path d="M-4-6h8M-3-9l3 3 3-3" />
  </>
);
const bread2 = (
  <>
    {at(-3, 2, 0.7, loaf)}
    {at(4, -3, 0.6, loaf)}
  </>
);
const cow = (
  <>
    <path className="a" d="M-6-4h10c3 0 5 2 5 5v3H-6z" />
    <path className="a" d="M-6-4c-2-1.5-5-1-5 1.5S-9 2-6 1.5z" />
    <path d="M-10-4l-1.5-2.5M-7-4.5l.5-2.5M-4 4v5M0 4v5M5 4v5M8 4v5M9-1l1.5 4" />
  </>
);
const shovelPeat = spade;
const hourglass = (
  <>
    <path className="w" d="M-6-9h12M-6 9h12" />
    <path className="a" d="M-5-9h10c0 5-4 6-4 9s4 4 4 9H-5c0-5 4-6 4-9s-4-4-4-9z" />
  </>
);
const fist = <path className="a" d="M-6 9V2l-2-3v-4c0-1 1-2 2-2h2V-9h3v2h2V-9h3v2h2V-6c1 0 2 1 2 2v5l-3 8z" />;
const brokenChain = (
  <>
    <rect className="a" x={-10} y={-4} width={9} height={8} rx={4} />
    <rect className="a" x={1} y={-4} width={9} height={8} rx={4} />
    <path d="M-1-7l2 3M1 7l-2-3" />
  </>
);
const handshake = (
  <>
    <path className="a" d="M-10-2l5-4 5 3 5-3 5 4v5l-6 5-4-2-4 2-6-5z" />
    <path d="M-5 2l4 3M-1 0l4 3M3-2l3 2" />
  </>
);
const handsRaised = (
  <>
    <path className="a" d="M-8 9V0l-2-6 2-1 2 4v-7h2v6V-6h2v6-5h2v6l2-3 2 1-3 7v4z" />
  </>
);
const triangleLink = (
  <>
    <path d="M0-7L-7 6H7z" />
    <circle className="a" cy={-7} r={3} />
    <circle className="a" cx={-7} cy={6} r={3} />
    <circle className="a" cx={7} cy={6} r={3} />
  </>
);
const compass = (
  <>
    <circle className="w" r={8.5} />
    <path className="a" d="M0-7l2.5 7L0 7-2.5 0z" />
  </>
);
const pillars = (
  <>
    <path className="a" d="M-9-8h18v3H-9z" />
    <path d="M-6-5v12M0-5v12M6-5v12M-9 7h18" />
  </>
);
const shipBig = (
  <>
    <path className="a" d="M-10 2h20l-3 6H-7z" />
    <path d="M-4 2V-9M4 2V-7" />
    <path className="w" d="M-4-8l5 3-5 3zM4-6l4 3-4 3z" />
  </>
);
const trowel = (
  <>
    <path className="a" d="M-10 9l3.5-10.5L3 3.5z" />
    <path d="M-1.5 1l3.5-4.5" />
    <path d="M2-3.5l7-6.5" strokeWidth={3.2} />
  </>
);
const vault = (
  <>
    <rect className="a" x={-9} y={-8} width={18} height={16} rx={1.5} />
    <circle className="w" r={4.5} />
    <path d="M0-4.5V4.5M-4.5 0h9" />
  </>
);
const harbour = (
  <>
    <path d="M-10 6c2 2 4 2 5 0s3-2 5 0 4 2 5 0 3-2 5 0" />
    <path className="a" d="M-6-8h4v12h-4z" />
    <path className="a" d="M2-4h7v8H2z" />
  </>
);
const lighthouse = (
  <>
    <path className="a" d="M-3-6h6l2 15H-5z" />
    <path className="w" d="M-3-10h6v4h-6z" />
    <path d="M-8-9l3 1M8-9l-3 1" />
  </>
);
const tax = (
  <>
    <path className="w" d="M-8-9h12l4 4v14H-8z" />
    <path d="M4-9v4h4M-5-3h7M-5 0h10" />
    <circle className="a" cx={2} cy={5} r={3.5} />
  </>
);
const salt = (
  <>
    <path className="a" d="M-5-4h10l-1 13h-8z" />
    <path className="w" d="M-4-9h8a1 1 0 0 1 1 1v4H-5v-4a1 1 0 0 1 1-1z" />
    <path d="M-2-7h0M1-7h0" strokeWidth={1.8} />
  </>
);
const tombstone = (
  <>
    <path className="a" d="M-6 9V-3a6 6 0 0 1 12 0V9z" />
    <path d="M-9 9h18M0-5v6M-2.5-2.5h5" />
  </>
);
const piggy = (
  <>
    <path className="a" d="M-9 1c0-5 4-8 9-8s9 3 9 8c0 3-2 5-4 6v3h-3V8H-2v2h-3V7c-2-1-4-3-4-6z" />
    <path d="M-2-7v-2h4" />
    <circle className="k" cx={4} cy={-2} r={1} />
  </>
);
const shares = (
  <>
    <rect className="w" x={-9} y={-6} width={14} height={11} rx={1} />
    <rect className="a" x={-5} y={-2} width={14} height={11} rx={1} />
    <path d="M-2 2h8M-2 5h5" />
  </>
);
const bondPaper = withMark(certificate, coin);
const exchange = (
  <>
    <path d="M-8-3h14l-3-3M8 3H-6l3 3" />
    <circle className="a" cx={-6} cy={-3} r={3} />
    <circle className="a" cx={6} cy={3} r={3} />
  </>
);
const goldBar = (
  <>
    <path className="a" d="M-10 6l3-7h14l3 7z" />
    <path className="a" d="M-6-1l2-5h8l2 5z" />
  </>
);
const fortress = (
  <>
    <path className="a" d="M-9 9V-6h3v3h3v-3h6v3h3v-3h3V9z" />
    <path className="w" d="M-2.5 9V3a2.5 2.5 0 0 1 5 0v6z" />
  </>
);
const watchtower = withMark(fortress, eye);
const school = withMark(house, book);

// --- Every node's picture ---------------------------------------------------
const GLYPHS: Record<string, ReactNode> = {
  // Labour
  "labor-labour-exchange": signpost,
  "labor-factory-act": withMark(factory, scroll),
  "labor-guild-charter": withMark(anvil, seal),
  "labor-workers-councils": people,
  "labor-friendly-societies": withMark(people, coin),
  "labor-collective-bargaining": handshake,
  "labor-workmens-compensation": crutch,
  "labor-old-age-pensions": cane,
  "labor-labour-congress": withMark(hall, people),
  "labor-eight-hour-day": withMark(clock, sun),
  "labor-shift-rotas": withMark(clock, factory),
  "labor-wage-boards": withMark(scales, coin),
  "labor-arbitration-board": scales,
  "labor-profit-sharing": pie,
  "labor-no-strike-pledge": withMark(handsRaised, scroll),
  "labor-copartnership": shares,
  "labor-industrial-peace": dove,
  "labor-social-compact": triangleLink,
  "labor-open-hiring": door,
  "labor-piece-rates": crate,
  "labor-overtime-shifts": withMark(factory, moon),
  "labor-industrial-charter": withMark(factory, star),
  "labor-long-indentures": withMark(hourglass, chain),
  "labor-company-towns": withMark(house, factory),
  "labor-combination-acts": withMark(fist, bars),
  "labor-state-combine": withMark(factory, crown),
  "labor-war-industries": cannon,

  // Sustenance
  "sustenance-harvest-returns": withMark(ledger, wheat),
  "sustenance-state-granary": withMark(barrel, wheat),
  "sustenance-ration-cards": withMark(papers, loaf),
  "sustenance-parish-relief": bread2,
  "sustenance-price-ceiling": withMark(loaf, coin),
  "sustenance-school-dinners": bowl,
  "sustenance-requisitioning": withMark(sack, shield),
  "sustenance-famine-code": withMark(ledger, loaf),
  "sustenance-national-larder": withMark(hall, barrel),
  "sustenance-crop-rotation": withMark(seedling, exchange),
  "sustenance-common-pastures": cow,
  "sustenance-land-grants": withMark(map, house),
  "sustenance-model-farms": withMark(house, wheat),
  "sustenance-dairy-cooperatives": churn,
  "sustenance-harvest-prizes": withMark(medal, wheat),
  "sustenance-fishing-bounty": fish,
  "sustenance-great-reclamation": withMark(spade, drop),
  "sustenance-smallholders-charter": withMark(seedling, seal),
  "sustenance-grain-market": withMark(sack, coin),
  "sustenance-export-charter": withMark(ship, wheat),
  "sustenance-tithe-reform": sickle,
  "sustenance-grain-exchange": withMark(hall, wheat),
  "sustenance-corn-laws": withMark(wheat, shield),
  "sustenance-import-depots": withMark(harbour, sack),
  "sustenance-grain-fleet": shipBig,
  "sustenance-continental-breadbasket": withMark(wheat, crown),

  // Order
  "order-parish-constables": bell,
  "order-gendarmerie": withMark(shield, person),
  "order-press-office": withMark(quill, bars),
  "order-emergency-statutes": withMark(scroll, bolt),
  "order-loyalty-oaths": withMark(handsRaised, crown),
  "order-secret-police": eye,
  "order-state-church": church,
  "order-internal-passports": papers,
  "order-absolute-authority": crown,
  "order-estates-restored": withMark(pillars, crown),
  "order-independent-courts": withMark(hall, scales),
  "order-jury-trials": withMark(people, scales),
  "order-penal-reform": withMark(bars, seedling),
  "order-transportation": withMark(ship, chain),
  "order-reformatories": withMark(school, key),
  "order-convict-labour": withMark(pickaxe, chain),
  "order-legal-code": book,
  "order-supreme-court": gavel,
  "order-magistrates": withMark(gavel, person),
  "order-right-of-petition": withMark(envelope, hall),
  "order-constitutional-reform": brokenChain,
  "order-open-border": withMark(door, people),
  "order-county-councils": withMark(map, people),
  "order-naturalisation": withMark(papers, star),
  "order-secret-ballot": ballotBox,
  "order-constitutional-convention": withMark(hall, quill),
  "order-bill-of-rights": withMark(scroll, star),

  // Revenue
  "revenue-exchequer-audit": magnifier,
  "revenue-tax-office": tax,
  "revenue-excise": withMark(barrel, coin),
  "revenue-land-tax": withMark(map, coin),
  "revenue-salt-tax": salt,
  "revenue-death-duties": tombstone,
  "revenue-tax-farming": withMark(sack, fist),
  "revenue-coastguard": lighthouse,
  "revenue-universal-assessment": withMark(ledger, eye),
  "revenue-public-works": trowel,
  "revenue-national-bank": withMark(pillars, coin),
  "revenue-state-lottery": withMark(coin, star),
  "revenue-consols": bondPaper,
  "revenue-sinking-fund": vault,
  "revenue-joint-stock": withMark(shares, factory),
  "revenue-stock-exchange": exchange,
  "revenue-gold-standard": goldBar,
  "revenue-free-port": withMark(harbour, door),
  "revenue-tax-relief": withMark(house, coin),
  "revenue-poll-tax-abolished": withMark(person, coin),
  "revenue-income-tax": coins,
  "revenue-public-salaries": withMark(ledger, person),
  "revenue-luxury-tax": withMark(medal, coin),
  "revenue-savings-banks": piggy,
  "revenue-peoples-budget": withMark(scales, people),
  "revenue-welfare-fund": withMark(hall, house),

  // Industry
  "industry-applied-mechanics": withMark(gear, quill),
  "industry-apprenticeship-schools": withMark(anvil, book),
  "industry-safety-lamps": pitLamp,
  "industry-cooperative-workshops": withMark(gear, people),
  "industry-cottage-industry": spinningWheel,
  "industry-mechanics-institutes": withMark(hall, gear),
  "industry-sewing-machines": needle,
  "industry-patent-office": withMark(certificate, gear),
  "industry-guild-federation": withMark(triangleLink, gear),
  "industry-interchangeable-parts": nutBolt,
  "industry-machine-tools": withMark(gear, hammer),
  "industry-assembly-line": beltDrive,
  "industry-precision-instruments": calipers,
  "industry-conveyor-belts": withMark(beltDrive, crate),
  "industry-electroplating": withMark(drop, bolt),
  "industry-dynamo": dynamo,
  "industry-electrification": bulb,
  "industry-steam-power": boiler,
  "industry-coke-ovens": dome,
  "industry-automated-foundries": press,
  "industry-hot-blast": furnace,
  "industry-bessemer-steel": crucible,
  "industry-rolling-mills": iBeam,
  "industry-railways": rails,
  "industry-continental-combine": withMark(factory, gear),

  // Agriculture
  "agriculture-grain-mills": withMark(gear, wheat),
  "agriculture-agronomy-society": withMark(book, seedling),
  "agriculture-glasshouses": glasshouse,
  "agriculture-cannery-works": tin,
  "agriculture-winter-wheat": withMark(wheat, snowflake),
  "agriculture-ice-houses": iceBlock,
  "agriculture-salting-houses": withMark(barrel, fish),
  "agriculture-refrigeration": withMark(iceBlock, gear),
  "agriculture-state-seed-bank": withMark(vault, seedling),
  "agriculture-field-drainage": withMark(drop, seedling),
  "agriculture-selective-breeding": withMark(cow, star),
  "agriculture-veterinary-college": withMark(cow, flask),
  "agriculture-guano": withMark(sack, seedling),
  "agriculture-dairy-science": withMark(churn, flask),
  "agriculture-soil-chemistry": flask,
  "agriculture-hybrid-seed": seedling,
  "agriculture-synthetic-fertiliser": withMark(flask, wheat),
  "agriculture-seed-drills": withMark(plough, seedling),
  "agriculture-mechanised-threshing": withMark(wheat, gear),
  "agriculture-steam-ploughs": plough,
  "agriculture-reaping-machines": withMark(sickle, gear),
  "agriculture-traction-engines": withMark(boiler, wheat),
  "agriculture-combine-harvester": withMark(sickle, wheat),
  "agriculture-farm-railways": withMark(rails, wheat),
  "agriculture-mechanised-estates": withMark(wheat, factory),

  // Administration
  "administration-civil-survey": compass,
  "administration-telegraph": pole,
  "administration-statistics-bureau": trendUp,
  "administration-cipher-office": withMark(envelope, key),
  "administration-police-registers": withMark(ledger, shield),
  "administration-permanent-embassies": withMark(hall, ship),
  "administration-identity-papers": withMark(papers, eye),
  "administration-records-office": withMark(ledger, key),
  "administration-panopticon-bureau": watchtower,
  "administration-land-registry": withMark(map, seal),
  "administration-penny-post": envelope,
  "administration-civil-service-exams": withMark(quill, star),
  "administration-municipal-boards": withMark(streetlamp, drop),
  "administration-treasury-control": withMark(ledger, coin),
  "administration-board-of-health": withMark(drop, shield),
  "administration-typewriters": typewriter,
  "administration-modern-ministries": withMark(pillars, gear),
  "administration-public-lectures": withMark(person, book),
  "administration-teachers-college": school,
  "administration-universal-primer": withMark(book, person),
  "administration-royal-academy": withMark(pillars, flask),
  "administration-public-libraries": withMark(hall, book),
  "administration-polytechnic": withMark(school, gear),
  "administration-state-laboratories": withMark(flask, bolt),
  "administration-free-press-charter": withMark(quill, dove),

  // Housing
  "housing-building-codes": withMark(house, scroll),
  "housing-tenement-blocks": tower,
  "housing-terraced-rows": withMark(house, house),
  "housing-sewers": withMark(drop, bricks),
  "housing-back-to-backs": withMark(tower, house),
  "housing-fire-brigades": bucket,
  "housing-lodging-houses": withMark(house, moon),
  "housing-iron-frames": withMark(iBeam, house),
  "housing-apartment-towers": withMark(tower, star),
  "housing-iron-stoves": stove,
  "housing-insulated-cottages": withMark(house, snowflake),
  "housing-brick-kilns": bricks,
  "housing-town-gas": flame,
  "housing-cavity-walls": withMark(bricks, flame),
  "housing-gas-lighting": streetlamp,
  "housing-radiators": radiator,
  "housing-district-heating": withMark(radiator, factory),
  "housing-public-baths": bath,
  "housing-garden-suburbs": withMark(house, tree),
  "housing-model-villages": withMark(church, tree),
  "housing-building-societies": withMark(house, key),
  "housing-allotments": shovelPeat,
  "housing-freehold-plots": withMark(map, key),
  "housing-tramways": tram,
  "housing-garden-cities": tree,
};

// The node's own picture, or its stat icon if it has none.
export function NodeGlyph({ id, category, icon, size }: { id: string; category?: string; icon: string; size: number }) {
  const glyph = GLYPHS[id];
  if (!glyph) return <StatIcon type={icon as StatIconType} size={size} />;
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className={`node-glyph node-glyph--${category ?? "none"}`} aria-hidden="true">
      {glyph}
    </svg>
  );
}
