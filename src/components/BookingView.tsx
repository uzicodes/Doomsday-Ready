"use client";

import { useEffect, useState } from "react";
import { BookingQuoteResponse, CinemaItem } from "@/types";

interface BookingViewProps {
  cinemas: CinemaItem[];
  onRefreshCinemas: () => Promise<void>;
}

export function BookingView({ cinemas, onRefreshCinemas }: BookingViewProps) {
  // Booking quote calculator state
  const [selectedCinemaId, setSelectedCinemaId] = useState<string>(cinemas[0]?.id ?? "");
  const [groupSize, setGroupSize] = useState<string>("6");
  const [quote, setQuote] = useState<BookingQuoteResponse | null>(null);
  const [calculating, setCalculating] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Add cinema form state
  const [cinemaName, setCinemaName] = useState<string>("");
  const [bundleSizesInput, setBundleSizesInput] = useState<string>("2, 5, 10");
  const [creatingCinema, setCreatingCinema] = useState<boolean>(false);
  const [cinemaFormError, setCinemaFormError] = useState<string | null>(null);
  const [cinemaFormSuccess, setCinemaFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (cinemas.length > 0 && !cinemas.some((c) => c.id === selectedCinemaId)) {
      setSelectedCinemaId(cinemas[0].id);
    }
  }, [cinemas, selectedCinemaId]);

  const selectedCinema = cinemas.find((c) => c.id === selectedCinemaId);

  async function handleCalculateQuote(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCinemaId) return;

    setQuoteError(null);
    setQuote(null);

    const parsedGroupSize = Number(groupSize);
    if (!Number.isInteger(parsedGroupSize) || parsedGroupSize < 1 || parsedGroupSize > 10000) {
      setQuoteError("Group size must be a whole number between 1 and 10,000.");
      return;
    }

    try {
      setCalculating(true);
      const res = await fetch(
        `/api/cinemas/${selectedCinemaId}/booking?groupSize=${parsedGroupSize}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok) {
        setQuoteError(data.message || "Failed to calculate booking quote.");
        return;
      }

      setQuote(data);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Network error while calculating quote.");
    } finally {
      setCalculating(false);
    }
  }

  async function handleCreateCinema(e: React.FormEvent) {
    e.preventDefault();
    setCinemaFormError(null);
    setCinemaFormSuccess(null);

    const parsedSizes = bundleSizesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map(Number);

    if (parsedSizes.length === 0 || parsedSizes.some((n) => !Number.isInteger(n))) {
      setCinemaFormError("Enter 1 to 10 comma-separated integers (e.g., 2, 5, 10).");
      return;
    }

    try {
      setCreatingCinema(true);
      const res = await fetch("/api/cinemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cinemaName.trim(),
          bundleSizes: parsedSizes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCinemaFormError(data.message || "Failed to create cinema.");
        return;
      }

      setCinemaName("");
      setBundleSizesInput("2, 5, 10");
      setCinemaFormSuccess(`Added "${data.cinema.name}" with bundles [${data.cinema.bundleSizes.join(", ")}].`);
      await onRefreshCinemas();
      setSelectedCinemaId(data.cinema.id);
    } catch (err) {
      setCinemaFormError(err instanceof Error ? err.message : "Network error creating cinema.");
    } finally {
      setCreatingCinema(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Booking Quote Calculator */}
      <section className="lg:col-span-7 space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Opening-Night Watch-Party Quote</h2>
          <p className="text-xs text-slate-400 mt-1">
            Find the fewest seat bundles that match your exact group size with zero empty seats.
          </p>

          <form onSubmit={handleCalculateQuote} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="cinema-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Select Cinema <span className="text-rose-400">*</span>
              </label>
              <select
                id="cinema-select"
                value={selectedCinemaId}
                onChange={(e) => {
                  setSelectedCinemaId(e.target.value);
                  setQuote(null);
                  setQuoteError(null);
                }}
                disabled={cinemas.length === 0}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Bundles: [{c.bundleSizes.join(", ")}]
                  </option>
                ))}
              </select>

              {selectedCinema && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Available bundle sizes:</span>
                  {selectedCinema.bundleSizes.map((size) => (
                    <span
                      key={size}
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs font-mono text-emerald-300"
                    >
                      {size} {size === 1 ? "seat" : "seats"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="group-size-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Group Size (1–10,000) <span className="text-rose-400">*</span>
              </label>
              <input
                id="group-size-input"
                type="number"
                required
                min={1}
                max={10000}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={calculating || cinemas.length === 0}
              className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
            >
              {calculating ? "Calculating Optimal Bundles..." : "Calculate Bundle Quote"}
            </button>
          </form>

          {quoteError && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              {quoteError}
            </div>
          )}
        </div>

        {/* Quote Output Card */}
        {quote && (
          <div
            className={`rounded-2xl border p-6 ${
              quote.possible
                ? "border-emerald-500/40 bg-emerald-950/15"
                : "border-rose-500/40 bg-rose-950/15"
            }`}
          >
            {quote.possible ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                      Optimal Exact Match
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {quote.totalBundles} {quote.totalBundles === 1 ? "bundle" : "bundles"} for{" "}
                      {quote.groupSize} {quote.groupSize === 1 ? "seat" : "seats"}
                    </h3>
                  </div>
                  <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-300">
                    {quote.message}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {quote.breakdown.map((item) => (
                    <div
                      key={item.bundleSize}
                      className="rounded-xl border border-slate-800 bg-slate-950/90 p-3.5"
                    >
                      <div className="text-xs text-slate-400">
                        {item.bundleSize}-Seat Bundle
                      </div>
                      <div className="text-lg font-bold text-white mt-0.5">
                        × {item.count}
                      </div>
                      <div className="text-xs text-emerald-400 mt-1">
                        = {item.subtotalSeats} seats
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <span className="inline-block rounded-md bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                  Not possible
                </span>
                <h3 className="text-base font-semibold text-white mt-2">
                  No exact bundle combination exists for {quote.groupSize} seats
                </h3>
                <p className="text-xs text-slate-300 mt-1">{quote.message}</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Right Column: Add Cinema Form */}
      <section className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Add Cinema</h2>
        <p className="text-xs text-slate-400 mt-1">
          Register a new theater with 1 to 10 distinct opening-night seat bundle sizes (1–500 seats each).
        </p>

        <form onSubmit={handleCreateCinema} className="mt-5 space-y-4">
          {cinemaFormError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {cinemaFormError}
            </div>
          )}

          {cinemaFormSuccess && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
              {cinemaFormSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Cinema Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={cinemaName}
              onChange={(e) => setCinemaName(e.target.value)}
              placeholder="e.g., Wakanda Dolby Cinema"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Bundle Sizes (comma-separated, 1–500) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={bundleSizesInput}
              onChange={(e) => setBundleSizesInput(e.target.value)}
              placeholder="e.g., 6, 9, 20"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Between 1 and 10 distinct integers, each between 1 and 500.
            </p>
          </div>

          <button
            type="submit"
            disabled={creatingCinema}
            className="w-full rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 transition"
          >
            {creatingCinema ? "Saving Cinema..." : "Add Cinema"}
          </button>
        </form>
      </section>
    </div>
  );
}