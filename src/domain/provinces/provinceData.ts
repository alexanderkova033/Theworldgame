// Static map geometry for Astravia. Generated once offline (a Voronoi
// diagram clipped to a procedurally generated coastline) and hardcoded here
// — the map doesn't need to be regenerated at runtime, so there's no reason
// to ship a geometry library to the browser for it.
import type { MapGeometry } from "./types";

export const MAP_GEOMETRY: MapGeometry = {
  width: 1500,
  height: 1000,
  coastPath:
    "M830,340 L828,378 L808,414 L758,437 L707,451 L665,462 L632,474 L604,492 L583,528 L545,549 L500,580 L449,578 L391,589 L348,561 L295,549 L259,518 L216,492 L207,450 L203,411 L234,371 L263,340 L284,315 L283,288 L286,260 L267,215 L280,177 L303,140 L350,122 L397,107 L451,112 L500,109 L547,121 L597,119 L636,142 L674,163 L709,186 L735,214 L746,247 L784,272 L803,305 L830,340 Z",
  provinces: [
    {
      id: "province-1",
      name: "Veldshire",
      path: "M645.1,357.6 L736.9,218.6 L745.9,247.4 L784.3,271.7 L802.8,304.5 L829.6,340 L828,378.4 L808.5,414.1 L757.6,437 L711.3,449.9 L645.1,357.6 Z",
      labelX: 754,
      labelY: 343,
      terrain: "coast",
    },
    {
      id: "province-2",
      name: "Marrow Coast",
      path: "M213.8,480.5 L348.8,372.2 L450.4,495.5 L463.8,578.6 L449,578 L390.7,588.7 L347.7,561 L294.5,549.1 L258.8,518.3 L216.3,492.3 L213.8,480.5 Z",
      labelX: 332,
      labelY: 518,
      terrain: "coast",
    },
    {
      id: "province-3",
      name: "Ashford",
      path: "M467.8,110.8 L500,108.9 L547,120.8 L597,119.3 L636.4,142.1 L665.7,158.5 L525.3,245.9 L467.8,110.8 Z",
      labelX: 551,
      labelY: 140,
      terrain: "coast",
    },
    {
      id: "province-4",
      name: "Brindlewood",
      path: "M450.4,495.5 L562.8,320.1 L645.1,357.6 L711.3,449.9 L707,451.1 L665.1,462 L632,474.3 L604.5,491.5 L582.7,528.1 L544.8,549 L500,580.2 L463.8,578.6 L450.4,495.5 Z",
      labelX: 578,
      labelY: 479,
      terrain: "plains",
    },
    {
      id: "province-5",
      name: "Caldermoor",
      path: "M266.9,214.8 L279.7,177.2 L303.4,140 L349.7,121.9 L397.4,106.5 L451.1,111.8 L467.8,110.8 L525.3,245.9 L523.6,258.1 L347.4,315.5 L283.3,252.3 L266.9,214.8 Z",
      labelX: 372,
      labelY: 189,
      terrain: "hills",
    },
    {
      id: "province-6",
      name: "Duskhaven",
      path: "M523.6,258.1 L525.3,245.9 L665.7,158.5 L673.9,163.1 L708.7,185.7 L735.3,213.6 L736.9,218.6 L645.1,357.6 L562.8,320.1 L523.6,258.1 Z",
      labelX: 630,
      labelY: 238,
      terrain: "hills",
    },
    {
      id: "province-7",
      name: "Redgate",
      path: "M347.4,315.5 L523.6,258.1 L562.8,320.1 L450.4,495.5 L348.8,372.2 L347.4,315.5 Z",
      labelX: 430,
      labelY: 346,
      terrain: "plains",
    },
    {
      id: "province-8",
      name: "Thornwick",
      path: "M203.1,411.3 L233.6,371.2 L263.1,340 L284,314.7 L282.7,287.8 L286.5,259.6 L283.3,252.3 L347.4,315.5 L348.8,372.2 L213.8,480.5 L207.3,450.2 L203.1,411.3 Z",
      labelX: 263,
      labelY: 356,
      terrain: "forest",
    },
  ],
  // Decorative-only for now: not divided into provinces, not owned by any
  // nation. A reminder that the world is bigger than one continent, and
  // somewhere to grow into later (see ROADMAP.md).
  otherLandmasses: [
    {
      id: "island-1",
      name: "Kestrel Isles",
      path: "M1271.6,230 L1268,245.5 L1257.5,258.5 L1255,274.5 L1252.3,294.1 L1246.9,318.8 L1230,337.1 L1204.6,339.9 L1180,331.9 L1160.4,317.4 L1146.8,301.1 L1134.5,290.5 L1121,282.4 L1110.7,271.1 L1100.7,259.2 L1094,245.2 L1082,230 L1072.6,211 L1069.5,189.4 L1079.3,170.3 L1099.9,159 L1123.3,154.7 L1145.6,156.3 L1162.7,152.8 L1180,144.6 L1200.5,138.3 L1221.2,141.8 L1237.7,153.4 L1251.6,166.4 L1261.1,181.9 L1268.9,197.3 L1269.9,214.1 L1271.6,230 Z",
      labelX: 1180,
      labelY: 230,
    },
    {
      id: "island-2",
      name: "Solmere",
      path: "M1260.6,760 L1263,784.4 L1251.4,806 L1235.4,823.5 L1226.2,845.8 L1211.5,866.6 L1191.4,883.6 L1167.1,895.9 L1140,887 L1118.3,868.8 L1104.8,844.6 L1091.2,832.8 L1072.3,827.5 L1049.9,820 L1024,807.9 L1009.7,785.8 L1003.3,760 L1001.5,732.6 L1004.9,704.2 L1019.5,679.8 L1044.6,664.9 L1074.5,662.4 L1101.9,668.3 L1122.9,674.3 L1140,666.8 L1160.8,655.8 L1187.5,645.8 L1214,649.6 L1230,670.3 L1243.3,691.3 L1251.1,714.1 L1258.6,736.5 L1260.6,760 Z",
      labelX: 1140,
      labelY: 760,
    },
    {
      id: "island-3",
      name: "Vashtel Cay",
      path: "M499.5,830 L489.4,839.7 L486.4,849.1 L482.3,858.6 L475.6,867.3 L467.8,876.3 L457.4,884.1 L445.6,894.3 L430,903.1 L411.1,907.5 L393.4,902.2 L383,887.6 L379.2,871.5 L377.7,858.6 L375.3,848.5 L367.7,840.1 L362.1,830 L358.7,818.4 L359.4,806.1 L368.7,796.5 L375,785 L385.1,775 L398.9,768.6 L414.5,766.4 L430,770.5 L443.5,774.7 L456.5,777.7 L471.6,779 L490.9,780.2 L504.4,789.3 L511.6,802.4 L505.2,817.8 L499.5,830 Z",
      labelX: 430,
      labelY: 830,
    },
  ],
};
