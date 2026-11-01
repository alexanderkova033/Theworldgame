// Trial only (plans/tasks/06-country-titles.md, stage 1): which way of showing
// the country names is on, from the address bar: ?titles=a, ?titles=b or
// ?titles=c. Without it the names stay as they were. Once the owner has chosen,
// this file and the other options go.
//   a: smaller, paler names under every map picture
//   b: names out at sea, following the country's coast
//   c: names faded while the clock runs, back when it stops or the pointer rests
export type TitleOption = "now" | "a" | "b" | "c";

function readOption(): TitleOption {
  if (typeof location === "undefined") return "now";
  const asked = new URLSearchParams(location.search).get("titles");
  return asked === "a" || asked === "b" || asked === "c" ? asked : "now";
}

export const TITLE_OPTION: TitleOption = readOption();
