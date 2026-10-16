// Player actions that combine others: their whole effect, and that a
// failed one changes nothing.
import { describe, expect, it } from "vitest";
import { buildHousing } from "../src/application/actions/buildHousing";
import { buyAndBuild, planBuyAndBuild } from "../src/application/actions/buyAndBuild";
import { takeLoan } from "../src/application/actions/loanActions";
import { startNewGame } from "../src/application/startNewGame";
import { getNation } from "../src/domain/nations/nationRules";

describe("buy and build", () => {
  const start = takeLoan(startNewGame("astravia", "astravia-harvest-union"));
  const province = getNation(start.nationId).provinceIds[0];
  const empty = { ...start, resources: { ...start.resources, wood: 0 } };

  it("buys the missing material and orders the building", () => {
    expect(buildHousing.canBuild(empty, province)).toBe(false);
    const plan = planBuyAndBuild(empty, buildHousing, province)!;
    expect(plan.amount).toBeGreaterThan(0);
    const after = buyAndBuild(empty, buildHousing, province);
    expect(after.projects).toHaveLength(empty.projects.length + 1);
    expect(after.resources.wood).toBeGreaterThanOrEqual(0);
    expect(after.stats.treasury).toBeLessThan(empty.stats.treasury - plan.goodsCost);
  });

  it("does nothing when the money can't cover both", () => {
    const broke = { ...empty, stats: { ...empty.stats, treasury: 0 } };
    expect(planBuyAndBuild(broke, buildHousing, province)).toBeNull();
    expect(buyAndBuild(broke, buildHousing, province)).toBe(broke);
  });

  it("offers nothing when the material is already in store", () => {
    const stocked = { ...start, resources: { ...start.resources, wood: 50 } };
    expect(planBuyAndBuild(stocked, buildHousing, province)).toBeNull();
  });
});
