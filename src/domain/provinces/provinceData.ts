// Static map geometry for Astravia. Generated once offline (a Voronoi
// diagram clipped to a procedurally generated coastline) and hardcoded here
// — the map doesn't need to be regenerated at runtime, so there's no reason
// to ship a geometry library to the browser for it.
import type { MapGeometry } from "./types";

export const MAP_GEOMETRY: MapGeometry = {
  width: 1000,
  height: 700,
  coastPath:
    "M830,340 L828,378 L808,414 L758,437 L707,451 L665,462 L632,474 L604,492 L583,528 L545,549 L500,580 L449,578 L391,589 L348,561 L295,549 L259,518 L216,492 L207,450 L203,411 L234,371 L263,340 L284,315 L283,288 L286,260 L267,215 L280,177 L303,140 L350,122 L397,107 L451,112 L500,109 L547,121 L597,119 L636,142 L674,163 L709,186 L735,214 L746,247 L784,272 L803,305 L830,340 Z",
  provinces: [
    {
      id: "province-1",
      name: "Veldshire",
      path: "M645.1,357.6 L736.9,218.6 L745.9,247.4 L784.3,271.7 L802.8,304.5 L829.6,340 L828,378.4 L808.5,414.1 L757.6,437 L711.3,449.9 L645.1,357.6 Z",
      labelX: 754,
      labelY: 343,
    },
    {
      id: "province-2",
      name: "Marrow Coast",
      path: "M213.8,480.5 L348.8,372.2 L450.4,495.5 L463.8,578.6 L449,578 L390.7,588.7 L347.7,561 L294.5,549.1 L258.8,518.3 L216.3,492.3 L213.8,480.5 Z",
      labelX: 332,
      labelY: 518,
    },
    {
      id: "province-3",
      name: "Ashford",
      path: "M467.8,110.8 L500,108.9 L547,120.8 L597,119.3 L636.4,142.1 L665.7,158.5 L525.3,245.9 L467.8,110.8 Z",
      labelX: 551,
      labelY: 140,
    },
    {
      id: "province-4",
      name: "Brindlewood",
      path: "M450.4,495.5 L562.8,320.1 L645.1,357.6 L711.3,449.9 L707,451.1 L665.1,462 L632,474.3 L604.5,491.5 L582.7,528.1 L544.8,549 L500,580.2 L463.8,578.6 L450.4,495.5 Z",
      labelX: 578,
      labelY: 479,
    },
    {
      id: "province-5",
      name: "Caldermoor",
      path: "M266.9,214.8 L279.7,177.2 L303.4,140 L349.7,121.9 L397.4,106.5 L451.1,111.8 L467.8,110.8 L525.3,245.9 L523.6,258.1 L347.4,315.5 L283.3,252.3 L266.9,214.8 Z",
      labelX: 372,
      labelY: 189,
    },
    {
      id: "province-6",
      name: "Duskhaven",
      path: "M523.6,258.1 L525.3,245.9 L665.7,158.5 L673.9,163.1 L708.7,185.7 L735.3,213.6 L736.9,218.6 L645.1,357.6 L562.8,320.1 L523.6,258.1 Z",
      labelX: 630,
      labelY: 238,
    },
    {
      id: "province-7",
      name: "Redgate",
      path: "M347.4,315.5 L523.6,258.1 L562.8,320.1 L450.4,495.5 L348.8,372.2 L347.4,315.5 Z",
      labelX: 430,
      labelY: 346,
    },
    {
      id: "province-8",
      name: "Thornwick",
      path: "M203.1,411.3 L233.6,371.2 L263.1,340 L284,314.7 L282.7,287.8 L286.5,259.6 L283.3,252.3 L347.4,315.5 L348.8,372.2 L213.8,480.5 L207.3,450.2 L203.1,411.3 Z",
      labelX: 263,
      labelY: 356,
    },
  ],
};
