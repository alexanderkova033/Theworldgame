// The season on the chart, as a colourist would show it: a wash over the land
// (fresh green in spring, gold in summer, orange in autumn, frost in winter)
// and a scatter of blossom, fallen leaves or snow, with the sea cooling and
// warming beneath. Everything is drawn always and shown by MapPanel's
// data-season (MapSeasons.css), so a change of season is a slow CSS
// transition and these layers never re-render.
import "./MapSeasons.css";
import { MAP_GEOMETRY } from "../../domain/provinces/provinceData";

const LAND = [MAP_GEOMETRY.coastPath, ...MAP_GEOMETRY.islands.map((land) => land.path)].join(" ");

function SeasonPatterns() {
  return (
    <defs>
      <pattern id="season-snow" width={46} height={42} patternUnits="userSpaceOnUse">
        {[
          [6, 8, 1.8],
          [24, 4, 1.2],
          [38, 14, 2],
          [14, 24, 1.4],
          [31, 30, 1.7],
          [4, 36, 1.2],
          [42, 38, 1.1],
        ].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#fbf8f0" stroke="#6f7f8c" strokeWidth={0.35} />
        ))}
      </pattern>
      <pattern id="season-leaves" width={120} height={96} patternUnits="userSpaceOnUse">
        {[
          [14, 18, 30, "#b8521c"],
          [70, 10, -40, "#d4892a"],
          [100, 52, 70, "#9b3a17"],
          [36, 68, -15, "#c96b22"],
          [80, 88, 20, "#d4892a"],
        ].map(([x, y, turn, colour]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${turn})`}>
            <path d="M-5 0Q0 -4.2 5 0Q0 4.2 -5 0Z" fill={colour as string} stroke="#4a2410" strokeWidth={0.45} />
            <path d="M-5 0H6" stroke="#4a2410" strokeWidth={0.4} />
          </g>
        ))}
      </pattern>
      <pattern id="season-blossom" width={92} height={78} patternUnits="userSpaceOnUse">
        {[
          [12, 14],
          [58, 8],
          [34, 46],
          [78, 56],
          [10, 70],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-2.2} rx={1.3} ry={2} transform={`rotate(${a})`} fill="#e9a9b6" stroke="#8a4a58" strokeWidth={0.3} />
            ))}
            <circle r={0.9} fill="#e8c46a" />
          </g>
        ))}
      </pattern>
      <pattern id="season-glint" width={64} height={56} patternUnits="userSpaceOnUse">
        {[
          [12, 14],
          [44, 30],
          [24, 48],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x - 3} ${y}L${x} ${y - 3}L${x + 3} ${y}L${x} ${y + 3}Z`} fill="#e7c25a" stroke="#7a5a12" strokeWidth={0.35} />
        ))}
      </pattern>
    </defs>
  );
}

// Over the open sea, under the coasts.
export function SeasonSea({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  return (
    <g pointerEvents="none">
      <SeasonPatterns />
      <rect x={x} y={y} width={width} height={height} className="map-season__sea" />
    </g>
  );
}

// Over the land and its terrain, under the map modes, borders and labels.
export function SeasonLand() {
  return (
    <g pointerEvents="none">
      <path d={LAND} className="map-season__wash" />
      <path d={LAND} className="map-season__frost" />
      <path d={LAND} fill="url(#season-blossom)" className="map-season__mark map-season__mark--spring" />
      <path d={LAND} fill="url(#season-glint)" className="map-season__mark map-season__mark--summer" />
      <path d={LAND} fill="url(#season-leaves)" className="map-season__mark map-season__mark--autumn" />
      <path d={LAND} fill="url(#season-snow)" className="map-season__mark map-season__mark--winter" />
    </g>
  );
}
