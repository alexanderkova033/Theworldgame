// Small pictorial glyphs for the top-bar tab buttons — same hand-drawn-shape
// approach as StatIcon/ResourceIcon/BuildingIcon, so the tab row reads as
// imagery rather than plain text labels.
export type NavIconType = "build" | "money" | "reports" | "laws" | "ventures" | "politics" | "research";

interface NavIconProps {
  type: NavIconType;
  size?: number;
}

export function NavIcon({ type, size = 26 }: NavIconProps) {
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20">
      {renderShape(type)}
    </svg>
  );
}

function renderShape(type: NavIconType) {
  switch (type) {
    case "build":
      // A gold coin behind a crossed pick — build & trade at a glance.
      return (
        <g>
          <circle cx={-0.5} cy={0.5} r={6.6} fill="#c9a24a" stroke="#7a531f" strokeWidth={0.8} />
          <circle cx={-0.5} cy={0.5} r={4.6} fill="none" stroke="#7a531f" strokeWidth={0.5} />
          <g strokeLinecap="round">
            <line x1={-4.2} y1={-3.8} x2={3.2} y2={4.6} stroke="#5a616c" strokeWidth={1.6} />
            <line x1={-4.2} y1={4.6} x2={3.2} y2={-3.8} stroke="#8c93a0" strokeWidth={1.6} />
          </g>
        </g>
      );
    case "money":
      // An exchange loop — two arced arrows chasing each other, gold and
      // blue, around a small coin — coins and goods swapping hands.
      return (
        <g>
          <path d="M-6.5,-1.6 A6.7,6.7 0 0 1 4.6,-6.5" fill="none" stroke="#c9a24a" strokeWidth={1.6} strokeLinecap="round" />
          <polygon points="4.6,-6.5 1.5,-7.5 3.4,-4.3" fill="#c9a24a" />
          <path d="M6.5,1.6 A6.7,6.7 0 0 1 -4.6,6.5" fill="none" stroke="#5b9bd6" strokeWidth={1.6} strokeLinecap="round" />
          <polygon points="-4.6,6.5 -1.5,7.5 -3.4,4.3" fill="#5b9bd6" />
          <circle cx={0} cy={0} r={2.7} fill="#e6c56a" stroke="#93731f" strokeWidth={0.5} />
        </g>
      );
    case "reports":
      // A rolled parchment scroll with a ribbon tie.
      return (
        <g>
          <rect x={-6.2} y={-4.5} width={12.4} height={9} rx={1.2} fill="#e6d9ab" stroke="#7a5a2e" strokeWidth={0.6} />
          <ellipse cx={-6.2} cy={0} rx={1.5} ry={4.6} fill="#d9c58c" stroke="#7a5a2e" strokeWidth={0.6} />
          <ellipse cx={6.2} cy={0} rx={1.5} ry={4.6} fill="#d9c58c" stroke="#7a5a2e" strokeWidth={0.6} />
          <line x1={-3.4} y1={-1.6} x2={3.4} y2={-1.6} stroke="#93731f" strokeWidth={0.6} />
          <line x1={-3.4} y1={0.6} x2={3.4} y2={0.6} stroke="#93731f" strokeWidth={0.6} />
          <line x1={-3.4} y1={2.8} x2={1.2} y2={2.8} stroke="#93731f" strokeWidth={0.6} />
        </g>
      );
    case "laws":
      // A balance scale: beam, two hanging pans, a stand.
      return (
        <g strokeLinecap="round">
          <line x1={0} y1={-7} x2={0} y2={7} stroke="#c9a24a" strokeWidth={1} />
          <line x1={-4.5} y1={7} x2={4.5} y2={7} stroke="#c9a24a" strokeWidth={1.2} />
          <line x1={-6.5} y1={-4.5} x2={6.5} y2={-4.5} stroke="#c9a24a" strokeWidth={1} />
          <line x1={-6.5} y1={-4.5} x2={-6.5} y2={-1.5} stroke="#8c93a0" strokeWidth={0.7} />
          <line x1={6.5} y1={-4.5} x2={6.5} y2={-1.5} stroke="#8c93a0" strokeWidth={0.7} />
          <path d="M-9,-1.5 A2.5,2.5 0 0 0 -4,-1.5 Z" fill="#8c93a0" stroke="#5a616c" strokeWidth={0.4} />
          <path d="M9,-1.5 A2.5,2.5 0 0 1 4,-1.5 Z" fill="#8c93a0" stroke="#5a616c" strokeWidth={0.4} />
        </g>
      );
    case "ventures":
      // A compass rose: ring, tick marks, red/pale needle.
      return (
        <g>
          <circle cx={0} cy={0} r={7} fill="#1c2330" stroke="#c9a24a" strokeWidth={1} />
          <g stroke="#c9a24a" strokeWidth={0.5}>
            <line x1={0} y1={-7} x2={0} y2={-5.6} />
            <line x1={0} y1={7} x2={0} y2={5.6} />
            <line x1={-7} y1={0} x2={-5.6} y2={0} />
            <line x1={7} y1={0} x2={5.6} y2={0} />
          </g>
          <polygon points="0,-5.5 1.6,0 0,1 -1.6,0" fill="#c2402f" />
          <polygon points="0,5.5 1.6,0 0,-1 -1.6,0" fill="#e6d9ab" />
          <circle cx={0} cy={0} r={1.1} fill="#c9a24a" />
        </g>
      );
    case "research":
      // A small flask, echoing StatIcon's research glyph at nav scale.
      return (
        <g>
          <rect x={-1.5} y={-7.5} width={3} height={3} fill="none" stroke="#c9ccd1" strokeWidth={0.8} />
          <polygon points="-1.5,-4.5 1.5,-4.5 4.6,6 -4.6,6" fill="#c58ae0" stroke="#c9ccd1" strokeWidth={0.8} />
          <path d="M-2.6,0.8 Q0,-0.8 2.6,0.8 L3.8,6 L-3.8,6 Z" fill="#a862c9" />
          <circle cx={-1} cy={2.8} r={0.9} fill="#e6c8f5" opacity={0.85} />
        </g>
      );
    case "politics":
      // A ballot box: a slotted wooden box with a checked ballot peeking out.
      return (
        <g>
          <path d="M-7,-2 L7,-2 L6,7 L-6,7 Z" fill="#5a4326" stroke="#2e2011" strokeWidth={0.7} />
          <rect x={-7.5} y={-3.2} width={15} height={1.6} rx={0.6} fill="#3a2a15" stroke="#1c1409" strokeWidth={0.4} />
          <rect x={-2.3} y={-6.5} width={4.6} height={4.6} fill="#e6d9ab" stroke="#93731f" strokeWidth={0.5} />
          <polyline
            points="-1.1,-4.3 -0.2,-3.3 1.4,-5.6"
            fill="none"
            stroke="#3f6b3f"
            strokeWidth={0.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    default:
      return null;
  }
}
