// On a narrow screen the details sit under the tree (the max-width rule on
// .law-tree__body in LawsPanel.css; keep the two in step), so a click on a
// node would seem to do nothing. Bring its details into view instead.
const TREE_STACKED_QUERY = "(max-width: 1050px)";

export function revealTreeDetails() {
  if (!window.matchMedia(TREE_STACKED_QUERY).matches) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  requestAnimationFrame(() => document.querySelector(".law-tree__details")?.scrollIntoView({ behavior, block: "start" }));
}
