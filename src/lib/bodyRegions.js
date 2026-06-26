// Shared geometry for the body pain chart (/public/body-pain-chart.jpg, 1480×1063).
// Used by the BodyPainSelector component (clickable hotspots) and by the PDF
// report (to draw the marked regions). Coordinates are over the printed numbers
// and are easy to fine-tune.
export const VIEW_W = 1480
export const VIEW_H = 1063
export const DEFAULT_R = 38

export const REGIONS = [
  // ---- Front body ----
  { id: 1, cx: 335, cy: 55 }, { id: 2, cx: 400, cy: 55 },
  { id: 3, cx: 350, cy: 182, r: 26 },
  { id: 4, cx: 295, cy: 235 }, { id: 5, cx: 410, cy: 235 },
  { id: 6, cx: 200, cy: 315 }, { id: 7, cx: 508, cy: 315 },
  { id: 12, cx: 300, cy: 318 }, { id: 13, cx: 397, cy: 318 },
  { id: 8, cx: 152, cy: 415 }, { id: 9, cx: 562, cy: 410 },
  { id: 14, cx: 306, cy: 430 }, { id: 15, cx: 388, cy: 430 },
  { id: 10, cx: 78, cy: 515, r: 28 }, { id: 11, cx: 628, cy: 510, r: 28 },
  { id: 16, cx: 352, cy: 515, r: 26 },
  { id: 17, cx: 300, cy: 590 }, { id: 18, cx: 400, cy: 590 },
  { id: 49, cx: 306, cy: 748, r: 30 }, { id: 50, cx: 392, cy: 748, r: 30 },
  { id: 19, cx: 300, cy: 842 }, { id: 20, cx: 392, cy: 842 },
  { id: 21, cx: 310, cy: 1008, r: 28 }, { id: 22, cx: 394, cy: 1008, r: 28 },
  // ---- Back body ----
  { id: 23, cx: 1097, cy: 70 }, { id: 24, cx: 1165, cy: 70 },
  { id: 25, cx: 1126, cy: 162, r: 28 },
  { id: 26, cx: 1027, cy: 216 }, { id: 27, cx: 1236, cy: 216 },
  { id: 28, cx: 986, cy: 318 }, { id: 29, cx: 1287, cy: 318 },
  { id: 34, cx: 1082, cy: 300 }, { id: 35, cx: 1176, cy: 300 },
  { id: 30, cx: 942, cy: 412 }, { id: 31, cx: 1336, cy: 412 },
  { id: 36, cx: 1086, cy: 406 }, { id: 37, cx: 1172, cy: 406 },
  { id: 48, cx: 1128, cy: 462, r: 24 },
  { id: 32, cx: 876, cy: 515, r: 28 }, { id: 33, cx: 1398, cy: 510, r: 28 },
  { id: 38, cx: 1082, cy: 516 }, { id: 39, cx: 1176, cy: 516 },
  { id: 40, cx: 1080, cy: 626 }, { id: 41, cx: 1176, cy: 626 },
  { id: 42, cx: 1082, cy: 846 }, { id: 43, cx: 1172, cy: 846 },
  { id: 47, cx: 1080, cy: 992, r: 24 }, { id: 46, cx: 1166, cy: 982, r: 24 },
  { id: 44, cx: 1082, cy: 1022, r: 26 }, { id: 45, cx: 1166, cy: 1022, r: 26 },
]
