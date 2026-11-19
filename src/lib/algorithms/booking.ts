export interface BundleBreakdownItem {
  bundleSize: number;
  count: number;
  subtotalSeats: number;
}

export interface BookingQuoteResult {
  possible: boolean;
  groupSize: number;
  totalBundles: number;
  breakdown: BundleBreakdownItem[];
  message: string;
}

/**
 * Finds the minimum number of bundles whose seats sum to exact `groupSize`
 * using Bottom-Up Dynamic Programming with parent-pointer reconstruction.
 *
 * Time complexity: O(groupSize * bundleSizes.length) — at most 10,000 * 10 = 100,000 ops.
 */
export function calculateOptimalBundles(
  bundleSizes: number[],
  groupSize: number
): BookingQuoteResult {
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
    throw new Error("Group size must be an integer between 1 and 10,000.");
  }

  // Sort descending so ties favor larger bundles deterministically
  const sortedBundles = Array.from(new Set(bundleSizes))
    .filter((size) => Number.isInteger(size) && size >= 1 && size <= 500)
    .sort((a, b) => b - a);

  if (sortedBundles.length === 0) {
    return {
      possible: false,
      groupSize,
      totalBundles: 0,
      breakdown: [],
      message: "Not possible: cinema has no valid bundle sizes.",
    };
  }

  // dp[s] = minimum number of bundles needed to reach exact seat count `s`
  const dp = new Int32Array(groupSize + 1);
  const INF = groupSize + 1;
  dp.fill(INF);
  dp[0] = 0;

  // choice[s] = bundle size used in the last step to reach seat count `s`
  const choice = new Int32Array(groupSize + 1);
  choice.fill(-1);

  for (let seats = 1; seats <= groupSize; seats++) {
    for (let i = 0; i < sortedBundles.length; i++) {
      const bundle = sortedBundles[i];
      if (bundle <= seats && dp[seats - bundle] !== INF) {
        const candidateCount = dp[seats - bundle] + 1;
        if (candidateCount < dp[seats]) {
          dp[seats] = candidateCount;
          choice[seats] = bundle;
        }
      }
    }
  }

  // No exact combination exists
  if (dp[groupSize] === INF) {
    return {
      possible: false,
      groupSize,
      totalBundles: 0,
      breakdown: [],
      message: `Not possible to form an exact group of ${groupSize} seats with bundle sizes [${sortedBundles.slice().reverse().join(", ")}].`,
    };
  }

  // Reconstruct bundle counts via choice[] parent pointers
  const countsMap = new Map<number, number>();
  let remaining = groupSize;

  while (remaining > 0) {
    const usedBundle = choice[remaining];
    countsMap.set(usedBundle, (countsMap.get(usedBundle) ?? 0) + 1);
    remaining -= usedBundle;
  }

  const breakdown: BundleBreakdownItem[] = Array.from(countsMap.entries())
    .sort((a, b) => b[0] - a[0]) // Largest bundle size first (e.g., 20 x 1, 9 x 2, 6 x 1)
    .map(([bundleSize, count]) => ({
      bundleSize,
      count,
      subtotalSeats: bundleSize * count,
    }));

  const summaryParts = breakdown.map((item) => `${item.bundleSize} × ${item.count}`);

  return {
    possible: true,
    groupSize,
    totalBundles: dp[groupSize],
    breakdown,
    message: `${dp[groupSize]} ${dp[groupSize] === 1 ? "bundle" : "bundles"}: ${summaryParts.join(", ")}`,
  };
}