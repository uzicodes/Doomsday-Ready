"use client";

import { useEffect, useState } from "react";
import { BookingQuoteResponse, CinemaItem } from "@/types";

interface BookingViewProps {
  cinemas: CinemaItem[];
  onRefreshCinemas: () => Promise<void>;
}

const GROUP_PRESETS = [6, 11, 44, 7];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Decorative barcode derived from the group size (purely visual). */
function Barcode({ seed }: { seed: number }) {
  const bars = Array.from({ length: 28 }, (_, i) => ((i * 7 + seed * 3) % 4) + 1);
  return (
    <div className="flex h-8 items-stretch gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span key={i} className="bg-dim/70" style={{ width: `${w}px` }} />
      ))}
    </div>
  );
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
      setCinemaFormSuccess(
        `Venue registered: "${data.cinema.name}" with bundles [${data.cinema.bundleSizes.join(", ")}].`
      );
      await onRefreshCinemas();
      setSelectedCinemaId(data.cinema.id);
    } catch (err) {
      setCinemaFormError(err instanceof Error ? err.message : "Network error creating cinema.");
    } finally {
      setCreatingCinema(false);
    }
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left Column: Box-office bundle allocator */}
      <section className="space-y-5 lg:col-span-7">
        <div className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-edge pb-3">
            <div>
              <h2 className="font-display text-base font-bold tracking-[0.1em] text-white">
                BOX-OFFICE BUNDLE ALLOCATOR
              </h2>
              <p className="mono-label mt-1 normal-case tracking-[0.06em]">
                Fewest bundles that match your group exactly, zero empty seats.
              </p>
            </div>
            <span className="font-mono text-[10px] tracking-[0.14em] text-arc-bright">PREMIERE // 03</span>
          </div>

          <form onSubmit={handleCalculateQuote} className="mt-5 space-y-5">
            <div>
              <label htmlFor="cinema-select" className="mono-label mb-1.5 block">
                Cinema <span className="text-crimson-bright">*</span>
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
                className="field !py-2.5"
              >
                {cinemas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} | Bundles: [{c.bundleSizes.join(", ")}]
                  </option>
                ))}
              </select>

              {selectedCinema && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="mono-label !text-[10px]">Bundles</span>
                  {selectedCinema.bundleSizes.map((size) => (
                    <span
                      key={size}
                      className="rounded border border-arc/40 bg-arc/10 px-2 py-0.5 font-mono text-xs font-semibold text-arc-bright"
                    >
                      {size} {size === 1 ? "SEAT" : "SEATS"}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="group-size-input" className="mono-label mb-1.5 block">
                Group Size // 1-10,000 <span className="text-crimson-bright">*</span>
              </label>
              <input
                id="group-size-input"
                type="number"
                required
                min={1}
                max={10000}
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
                className="field font-mono !text-base"
              />

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="mono-label !text-[10px]">Quick Select</span>
                {GROUP_PRESETS.map((preset) => {
                  const active = groupSize === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setGroupSize(String(preset));
                        setQuote(null);
                        setQuoteError(null);
                      }}
                      aria-pressed={active}
                      className={`min-w-12 rounded border px-3 py-1 font-mono text-sm font-semibold transition ${
                        active
                          ? "border-arc-bright bg-arc/15 text-arc-bright"
                          : "border-edge-hi bg-obsidian text-dim hover:border-faint hover:text-white"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={calculating || cinemas.length === 0}
              className="btn-primary w-full"
            >
              {calculating ? "Allocating Bundles..." : "Allocate Bundles"}
            </button>
          </form>

          {quoteError && (
            <div
              role="alert"
              className="mt-4 overflow-hidden rounded-md border border-crimson-bright/60 bg-crimson/10"
            >
              <div className="bg-crimson px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                INPUT REJECTED
              </div>
              <p className="px-3 py-2 text-xs text-red-100">{quoteError}</p>
            </div>
          )}
        </div>

        {/* Quote output */}
        {quote && quote.possible && (
          <div
            className="relative overflow-hidden rounded-md border border-edge-hi bg-steel shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_40px_-20px_rgba(0,0,0,0.9)]"
            aria-label="IMAX Premiere Ticket Stub"
          >
            <div className="flex flex-col md:flex-row">
              {/* Ticket body */}
              <div className="flex-1 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xs font-bold tracking-[0.3em] text-arc-bright">
                      IMAX PREMIERE
                    </div>
                    <div className="mono-label mt-1 !text-[10px]">
                      Avengers: <span className="text-crimson-accent">Doomsday</span> // Opening Night
                    </div>
                  </div>
                  <span className="badge-crimson" title="All requested seats are allocated exactly">
                    Exact Match
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="mono-label !text-[10px]">Venue</div>
                    <div className="mt-0.5 font-display text-sm font-semibold text-white">
                      {quote.cinema.name}
                    </div>
                  </div>
                  <div>
                    <div className="mono-label !text-[10px]">Admit</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-white">
                      {quote.groupSize} {quote.groupSize === 1 ? "SEAT" : "SEATS"}
                    </div>
                  </div>
                </div>

                <div className="mono-label mb-2 mt-5 !text-[10px]">Size &times; Qty</div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {quote.breakdown.map((item) => (
                    <div key={item.bundleSize} className="well px-3 py-2.5">
                      <div className="font-mono text-lg font-bold text-white">
                        {item.bundleSize} <span className="text-faint">&times;</span> {item.count}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-arc-bright">
                        = {item.subtotalSeats} SEATS
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-4 border-t border-edge pt-3 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-dim">
                  {quote.message}
                </p>
              </div>

              {/* Perforation */}
              <div
                aria-hidden="true"
                className="relative h-0 shrink-0 border-t-2 border-dashed border-edge-hi md:h-auto md:border-l-2 md:border-t-0"
              >
                <span className="absolute -left-2.5 -top-[9px] h-5 w-5 rounded-full border border-edge-hi bg-obsidian md:-left-[9px] md:-top-2.5" />
                <span className="absolute -right-2.5 -top-[9px] h-5 w-5 rounded-full border border-edge-hi bg-obsidian md:-bottom-2.5 md:-left-[9px] md:right-auto md:top-auto" />
              </div>

              {/* Stub */}
              <div className="flex shrink-0 flex-col items-start justify-between gap-4 bg-obsidian/50 p-5 sm:p-6 md:w-48 md:items-center md:text-center">
                <div>
                  <div className="mono-label !text-[10px]">Total Bundles</div>
                  <div className="mt-1 font-mono text-5xl font-bold leading-none text-gold">
                    {pad(quote.totalBundles)}
                  </div>
                  <div className="mt-2 font-mono text-[10.5px] tracking-[0.1em] text-dim">
                    FOR {quote.groupSize} {quote.groupSize === 1 ? "SEAT" : "SEATS"}
                  </div>
                </div>
                <Barcode seed={quote.groupSize} />
              </div>
            </div>
          </div>
        )}

        {quote && !quote.possible && (
          <div
            role="alert"
            className="overflow-hidden rounded-md border border-crimson-bright/70 bg-crimson/10"
          >
            <div className="flex items-center gap-2.5 bg-crimson px-4 py-2.5">
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-white" fill="none" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
              </svg>
              <span className="font-display text-sm font-bold uppercase tracking-[0.1em] text-white">
                ALLOCATION IMPOSSIBLE — EXACT SEAT MATCH UNAVAILABLE
              </span>
            </div>
            <div className="space-y-2 p-4 sm:p-5">
              <p className="font-mono text-xs font-semibold tracking-[0.06em] text-crimson-bright">
                NO EXACT BUNDLE COMBINATION EXISTS FOR {quote.groupSize} SEATS AT {quote.cinema.name.toUpperCase()}
              </p>
              <p className="text-xs leading-relaxed text-red-100/90">{quote.message}</p>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="mono-label !text-[10px]">Available bundles</span>
                {quote.cinema.bundleSizes.map((size) => (
                  <span
                    key={size}
                    className="rounded border border-crimson-bright/40 bg-obsidian px-2 py-0.5 font-mono text-xs font-semibold text-crimson-bright"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Right Column: Register Venue */}
      <section className="panel p-5 sm:p-6 lg:col-span-5">
        <div className="flex items-center justify-between border-b border-edge pb-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-[0.1em] text-white">
              REGISTER VENUE
            </h2>
            <p className="mono-label mt-1 normal-case tracking-[0.06em]">
              1 to 10 distinct bundle sizes, 1-500 seats each.
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-arc-bright">FORM // V-01</span>
        </div>

        <form onSubmit={handleCreateCinema} className="mt-5 space-y-4">
          {cinemaFormError && (
            <div
              role="alert"
              className="overflow-hidden rounded-md border border-crimson-bright/60 bg-crimson/10"
            >
              <div className="bg-crimson px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                REQUEST REJECTED
              </div>
              <p className="px-3 py-2 text-xs text-red-100">{cinemaFormError}</p>
            </div>
          )}

          {cinemaFormSuccess && (
            <div
              role="status"
              className="rounded-md border border-arc/50 bg-arc/10 px-3 py-2 text-xs text-emerald-100"
            >
              {cinemaFormSuccess}
            </div>
          )}

          <div>
            <label htmlFor="cinema-name" className="mono-label mb-1.5 block">
              Cinema Name <span className="text-crimson-bright">*</span>
            </label>
            <input
              id="cinema-name"
              type="text"
              required
              value={cinemaName}
              onChange={(e) => setCinemaName(e.target.value)}
              placeholder="e.g., Wakanda Dolby Cinema"
              className="field"
            />
          </div>

          <div>
            <label htmlFor="bundle-sizes" className="mono-label mb-1.5 block">
              Bundle Sizes // Comma-Separated, 1-500 <span className="text-crimson-bright">*</span>
            </label>
            <input
              id="bundle-sizes"
              type="text"
              required
              value={bundleSizesInput}
              onChange={(e) => setBundleSizesInput(e.target.value)}
              placeholder="e.g., 6, 9, 20"
              className="field font-mono"
            />
            <p className="mt-1.5 font-mono text-[10.5px] tracking-[0.06em] text-faint">
              Between 1 and 10 distinct integers, each between 1 and 500.
            </p>
          </div>

          <button
            type="submit"
            disabled={creatingCinema}
            className="w-full rounded-md border border-arc/60 bg-arc/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-[0.12em] text-arc-bright transition hover:bg-arc/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingCinema ? "Registering..." : "Register Venue"}
          </button>
        </form>
      </section>
    </div>
  );
}