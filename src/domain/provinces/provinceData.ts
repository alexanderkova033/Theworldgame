// Static map geometry for Astravia. Generated once offline (a Voronoi
// diagram clipped to a procedurally generated coastline) and hardcoded here
// — the map doesn't need to be regenerated at runtime, so there's no reason
// to ship a geometry library to the browser for it.
//
// The 8 original provinces were later each split into 2 (16 total) to give
// building caps somewhere to matter and nations more territory to manage —
// every split cuts *inside* an existing province, so the coastline and
// every original border are pixel-identical to before.
import type { MapGeometry } from "./types";

export const MAP_GEOMETRY: MapGeometry = {
  width: 1500,
  height: 1000,
  coastPath:
    "M830,340 L828,378 L808,414 L758,437 L707,451 L665,462 L632,474 L604,492 L583,528 L545,549 L500,580 L449,578 L391,589 L348,561 L295,549 L259,518 L216,492 L207,450 L203,411 L234,371 L263,340 L284,315 L283,288 L286,260 L267,215 L280,177 L303,140 L350,122 L397,107 L451,112 L500,109 L547,121 L597,119 L636,142 L674,163 L709,186 L735,214 L746,247 L784,272 L803,305 L830,340 Z",
  provinces: [
    {
      id: "province-1-north",
      name: "North Veldshire",
      path: "M654.5,343.3 L736.9,218.6 L745.9,247.4 L784.3,271.7 L802.8,304.5 L829.6,340 L829.5,343.3 L654.5,343.3 Z",
      labelX: 755,
      labelY: 302,
      terrain: "coast",
    },
    {
      id: "province-1-south",
      name: "South Veldshire",
      path: "M645.1,357.6 L654.5,343.3 L829.5,343.3 L828,378.4 L808.5,414.1 L757.6,437 L711.3,449.9 L645.1,357.6 Z",
      labelX: 735,
      labelY: 385,
      terrain: "coast",
    },
    {
      id: "province-2-west",
      name: "West Marrow Coast",
      path: "M213.8,480.5 L331.6,386 L331.6,557.4 L294.5,549.1 L258.8,518.3 L216.3,492.3 L213.8,480.5 Z",
      labelX: 266,
      labelY: 495,
      terrain: "coast",
    },
    {
      id: "province-2-east",
      name: "East Marrow Coast",
      path: "M331.6,386 L348.8,372.2 L450.4,495.5 L463.8,578.6 L449,578 L390.7,588.7 L347.7,561 L331.6,557.4 L331.6,386 Z",
      labelX: 383,
      labelY: 500,
      terrain: "coast",
    },
    {
      id: "province-3-west",
      name: "West Ashford",
      path: "M467.8,110.8 L500,108.9 L547,120.8 L550.9,120.7 L550.9,230 L525.3,245.9 L467.8,110.8 Z",
      labelX: 516,
      labelY: 150,
      terrain: "coast",
    },
    {
      id: "province-3-east",
      name: "East Ashford",
      path: "M550.9,120.7 L597,119.3 L636.4,142.1 L665.7,158.5 L550.9,230 L550.9,120.7 Z",
      labelX: 592,
      labelY: 149,
      terrain: "coast",
    },
    {
      id: "province-4-west",
      name: "West Brindlewood",
      path: "M450.4,495.5 L562.8,320.1 L578.5,327.2 L578.5,530.4 L544.8,549 L500,580.2 L463.8,578.6 L450.4,495.5 Z",
      labelX: 516,
      labelY: 485,
      terrain: "plains",
    },
    {
      id: "province-4-east",
      name: "East Brindlewood",
      path: "M578.5,327.2 L645.1,357.6 L711.3,449.9 L707,451.1 L665.1,462 L632,474.3 L604.5,491.5 L582.7,528.1 L578.5,530.4 L578.5,327.2 Z",
      labelX: 628,
      labelY: 440,
      terrain: "plains",
    },
    {
      id: "province-5-west",
      name: "West Caldermoor",
      path: "M266.9,214.8 L279.7,177.2 L303.4,140 L349.7,121.9 L371.9,114.7 L371.9,307.5 L347.4,315.5 L283.3,252.3 L266.9,214.8 Z",
      labelX: 316,
      labelY: 207,
      terrain: "hills",
    },
    {
      id: "province-5-east",
      name: "East Caldermoor",
      path: "M371.9,114.7 L397.4,106.5 L451.1,111.8 L467.8,110.8 L525.3,245.9 L523.6,258.1 L371.9,307.5 L371.9,114.7 Z",
      labelX: 435,
      labelY: 171,
      terrain: "hills",
    },
    {
      id: "province-6-west",
      name: "West Duskhaven",
      path: "M523.6,258.1 L525.3,245.9 L630.1,180.7 L630.1,350.8 L562.8,320.1 L523.6,258.1 Z",
      labelX: 566,
      labelY: 269,
      terrain: "hills",
    },
    {
      id: "province-6-east",
      name: "East Duskhaven",
      path: "M630.1,180.7 L665.7,158.5 L673.9,163.1 L708.7,185.7 L735.3,213.6 L736.9,218.6 L645.1,357.6 L630.1,350.8 L630.1,180.7 Z",
      labelX: 673,
      labelY: 223,
      terrain: "hills",
    },
    {
      id: "province-7-north",
      name: "North Redgate",
      path: "M347.4,315.5 L523.6,258.1 L562.8,320.1 L546.1,346.2 L348.2,346.2 L347.4,315.5 Z",
      labelX: 446,
      labelY: 317,
      terrain: "plains",
    },
    {
      id: "province-7-south",
      name: "South Redgate",
      path: "M348.2,346.2 L546.1,346.2 L450.4,495.5 L348.8,372.2 L348.2,346.2 Z",
      labelX: 408,
      labelY: 381,
      terrain: "plains",
    },
    {
      id: "province-8-north",
      name: "North Thornwick",
      path: "M248.4,355.5 L263.1,340 L284,314.7 L282.7,287.8 L286.5,259.6 L283.3,252.3 L347.4,315.5 L348.4,355.5 L248.4,355.5 Z",
      labelX: 288,
      labelY: 315,
      terrain: "forest",
    },
    {
      id: "province-8-south",
      name: "South Thornwick",
      path: "M203.1,411.3 L233.6,371.2 L248.4,355.5 L348.4,355.5 L348.8,372.2 L213.8,480.5 L207.3,450.2 L203.1,411.3 Z",
      labelX: 251,
      labelY: 401,
      terrain: "forest",
    },
  ],
  // Decorative-only for now: not divided into provinces, not owned by any
  // nation. A reminder that the world is bigger than one continent, and
  // somewhere to grow into later (see ROADMAP.md).
  islands: [
    {
      id: "island-1",
      name: "Kestrel Isles",
      path: "M1271.6,230 L1268,245.5 L1257.5,258.5 L1255,274.5 L1252.3,294.1 L1246.9,318.8 L1230,337.1 L1204.6,339.9 L1180,331.9 L1160.4,317.4 L1146.8,301.1 L1134.5,290.5 L1121,282.4 L1110.7,271.1 L1100.7,259.2 L1094,245.2 L1082,230 L1072.6,211 L1069.5,189.4 L1079.3,170.3 L1099.9,159 L1123.3,154.7 L1145.6,156.3 L1162.7,152.8 L1180,144.6 L1200.5,138.3 L1221.2,141.8 L1237.7,153.4 L1251.6,166.4 L1261.1,181.9 L1268.9,197.3 L1269.9,214.1 L1271.6,230 Z",
      labelX: 1180,
      labelY: 230,
      terrain: "coast",
    },
    {
      id: "island-2",
      name: "Solmere",
      path: "M1260.6,760 L1263,784.4 L1251.4,806 L1235.4,823.5 L1226.2,845.8 L1211.5,866.6 L1191.4,883.6 L1167.1,895.9 L1140,887 L1118.3,868.8 L1104.8,844.6 L1091.2,832.8 L1072.3,827.5 L1049.9,820 L1024,807.9 L1009.7,785.8 L1003.3,760 L1001.5,732.6 L1004.9,704.2 L1019.5,679.8 L1044.6,664.9 L1074.5,662.4 L1101.9,668.3 L1122.9,674.3 L1140,666.8 L1160.8,655.8 L1187.5,645.8 L1214,649.6 L1230,670.3 L1243.3,691.3 L1251.1,714.1 L1258.6,736.5 L1260.6,760 Z",
      labelX: 1140,
      labelY: 760,
      terrain: "hills",
    },
    {
      id: "island-3",
      name: "Vashtel Cay",
      path: "M499.5,830 L489.4,839.7 L486.4,849.1 L482.3,858.6 L475.6,867.3 L467.8,876.3 L457.4,884.1 L445.6,894.3 L430,903.1 L411.1,907.5 L393.4,902.2 L383,887.6 L379.2,871.5 L377.7,858.6 L375.3,848.5 L367.7,840.1 L362.1,830 L358.7,818.4 L359.4,806.1 L368.7,796.5 L375,785 L385.1,775 L398.9,768.6 L414.5,766.4 L430,770.5 L443.5,774.7 L456.5,777.7 L471.6,779 L490.9,780.2 L504.4,789.3 L511.6,802.4 L505.2,817.8 L499.5,830 Z",
      labelX: 430,
      labelY: 830,
      terrain: "plains",
    },
    {
      id: "island-4",
      name: "Grey Holm",
      path: "M165.5,712.0 L170.1,724.3 L167.7,736.6 L162.4,748.5 L156.5,761.0 L145.9,770.6 L131.7,775.2 L116.8,774.9 L103.0,769.2 L91.9,763.3 L82.9,757.0 L72.4,755.5 L59.8,754.2 L48.5,748.8 L42.7,738.9 L36.3,729.0 L35.4,717.6 L32.5,706.1 L32.8,694.1 L38.1,683.0 L43.8,671.8 L53.2,662.9 L65.6,657.9 L77.6,653.1 L90.0,648.8 L103.5,645.4 L117.1,648.0 L127.2,657.8 L133.8,668.8 L139.5,677.8 L143.0,686.9 L149.8,693.9 L159.0,701.7 Z",
      labelX: 100,
      labelY: 712,
      terrain: "plains",
    },
    {
      id: "island-5",
      name: "Marrowind",
      path: "M1035.2,85.0 L1032.9,97.1 L1025.0,107.6 L1009.2,113.1 L996.7,117.0 L986.6,120.8 L978.2,125.9 L969.7,133.8 L958.3,141.2 L943.7,148.4 L929.3,144.8 L915.2,140.6 L903.5,132.9 L892.1,124.8 L882.8,115.0 L880.1,102.7 L882.6,90.6 L886.6,79.7 L893.1,70.4 L897.4,61.1 L901.5,51.1 L908.5,41.8 L918.7,34.3 L932.0,31.5 L945.9,33.7 L958.1,32.8 L970.2,34.4 L984.8,32.4 L999.7,34.4 L1013.8,39.8 L1023.9,49.3 L1030.4,60.7 L1034.7,72.6 Z",
      labelX: 955,
      labelY: 85,
      terrain: "forest",
    },
    {
      id: "island-6",
      name: "Saltreach",
      path: "M791.5,760.0 L792.6,771.4 L790.6,783.1 L786.8,795.0 L778.8,805.7 L767.8,814.7 L753.9,820.6 L738.5,822.3 L724.0,828.5 L708.3,826.6 L693.0,823.6 L682.4,813.1 L676.7,800.7 L670.5,791.7 L669.2,781.4 L659.9,774.4 L653.0,765.2 L644.7,754.1 L642.4,741.4 L647.5,729.5 L651.2,715.9 L661.1,704.6 L674.3,695.4 L690.7,690.8 L708.1,692.3 L723.5,699.2 L735.3,708.5 L745.4,714.7 L757.5,717.0 L769.9,721.2 L781.1,727.9 L790.8,736.9 L791.5,748.8 Z",
      labelX: 720,
      labelY: 760,
      terrain: "coast",
    },
  ],
};
