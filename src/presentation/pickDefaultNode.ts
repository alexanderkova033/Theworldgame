// Shared by the Laws and Research trees (see components/TechTree.tsx); kept
// out of that component file so it adds no fast-refresh warning there.
import type { TreeNode, TreeNodeStatus } from "./components/TechTree";

// Which node the details pane shows before the player picks one: whatever
// is underway, else something that can be started now, else the next one to
// unlock — never an empty pane.
export function pickDefaultNode<N extends TreeNode>(nodes: N[], getStatus: (node: N) => TreeNodeStatus): N | undefined {
  const byTier = [...nodes].sort((a, b) => a.tier - b.tier);
  return (
    byTier.find((n) => getStatus(n) === "in-progress") ??
    byTier.find((n) => getStatus(n) === "available") ??
    byTier.find((n) => getStatus(n).startsWith("locked-")) ??
    byTier[0]
  );
}
