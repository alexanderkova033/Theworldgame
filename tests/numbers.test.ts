// One way to write a number (see src/presentation/formatNumber.ts).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatAmount, formatRate, formatSigned } from "../src/presentation/formatNumber";

describe("numbers", () => {
  it("writes amounts exactly below 10,000 and compactly from there", () => {
    expect([formatAmount(350), formatAmount(2000), formatAmount(9850), formatAmount(10500), formatAmount(400000), formatAmount(1_250_000)]).toEqual([
      "350", "2,000", "9,850", "10.5k", "400k", "1.3M",
    ]);
  });

  it("signs changes with a real minus, and keeps a tenth for points", () => {
    expect([formatSigned(32), formatSigned(-3169), formatSigned(-12000), formatSigned(0), formatSigned(0.4, true), formatSigned(-0.04, true)]).toEqual([
      "+32", "−3,169", "−12k", "0", "+0.4", "0",
    ]);
  });

  it("writes rates per day, keeping small ones readable", () => {
    expect([formatRate(32), formatRate(-3169), formatRate(0.6), formatRate(0.05, true), formatRate(0.63, true), formatRate(0)]).toEqual([
      "+32/d", "−3,169/d", "+0.6/d", "+0.05/d", "+0.63/d", "0/d",
    ]);
  });

  it("are never formatted by hand in the interface", () => {
    const files = (path: string): string[] => (statSync(path).isFile() ? [path] : readdirSync(path).flatMap((name) => files(join(path, name))));
    const offenders = [...files("src/presentation"), "src/App.tsx"]
      .filter((file) => /\.tsx?$/.test(file) && !file.endsWith("formatNumber.ts"))
      .filter((file) => readFileSync(file, "utf8").includes(".toLocaleString("));
    expect(offenders).toEqual([]);
  });
});
