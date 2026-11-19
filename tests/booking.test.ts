import { describe, expect, it } from "vitest";
import { calculateOptimalBundles } from "../src/lib/algorithms/booking";

describe("Feature 2: Watch-Party Optimal Bundle Solver", () => {
  it("solves [1, 3, 4] for groupSize 6 -> 2 bundles: 3 x 2 (beats greedy 4+1+1)", () => {
    const result = calculateOptimalBundles([1, 3, 4], 6);

    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(2);
    expect(result.breakdown).toEqual([
      { bundleSize: 3, count: 2, subtotalSeats: 6 },
    ]);
  });

  it("solves [2, 5] for groupSize 11 -> 4 bundles: 5 x 1, 2 x 3", () => {
    const result = calculateOptimalBundles([2, 5], 11);

    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(4);
    expect(result.breakdown).toEqual([
      { bundleSize: 5, count: 1, subtotalSeats: 5 },
      { bundleSize: 2, count: 3, subtotalSeats: 6 },
    ]);
  });

  it("solves [6, 9, 20] for groupSize 44 -> 4 bundles: 20 x 1, 9 x 2, 6 x 1", () => {
    const result = calculateOptimalBundles([6, 9, 20], 44);

    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(4);
    expect(result.breakdown).toEqual([
      { bundleSize: 20, count: 1, subtotalSeats: 20 },
      { bundleSize: 9, count: 2, subtotalSeats: 18 },
      { bundleSize: 6, count: 1, subtotalSeats: 6 },
    ]);
  });

  it("returns possible: false for [4, 6] with groupSize 7", () => {
    const result = calculateOptimalBundles([4, 6], 7);

    expect(result.possible).toBe(false);
    expect(result.totalBundles).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it("handles upper constraint groupSize = 10,000 efficiently", () => {
    const result = calculateOptimalBundles([7, 13, 500], 10000);

    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(20);
    expect(result.breakdown).toEqual([
      { bundleSize: 500, count: 20, subtotalSeats: 10000 },
    ]);
  });

  it("throws validation error when groupSize is outside 1–10,000", () => {
    expect(() => calculateOptimalBundles([2, 4], 0)).toThrow();
    expect(() => calculateOptimalBundles([2, 4], 10001)).toThrow();
  });
});