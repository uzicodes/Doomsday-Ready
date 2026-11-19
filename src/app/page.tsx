"use client";

import { useCallback, useEffect, useState } from "react";
import { CinemaItem, MovieItem } from "@/types";
import { MoviesView } from "@/components/MoviesView";

type ActiveTab = "movies" | "rewatch" | "booking";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("movies");
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [cinemas, setCinemas] = useState<CinemaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    const res = await fetch("/api/movies", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load movies.");
    const data = await res.json();
    setMovies(data.movies ?? []);
  }, []);

  const fetchCinemas = useCallback(async () => {
    const res = await fetch("/api/cinemas", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load cinemas.");
    const data = await res.json();
    setCinemas(data.cinemas ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setGlobalError(null);
        await Promise.all([fetchMovies(), fetchCinemas()]);
      } catch (err) {
        if (active) {
          setGlobalError(err instanceof Error ? err.message : "Failed to initialize app data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [fetchMovies, fetchCinemas]);

  const watchedTotal = movies.filter((m) => m.watched).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold text-sm">
                DR
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Doomsday Ready
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              MCU Prerequisite Rewatch Planner &amp; Opening-Night Watch-Party Booking
            </p>
          </div>

          {/* 3-View Navigation Tabs */}
          <nav
            aria-label="Primary Views"
            className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setActiveTab("movies")}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === "movies"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>1. Movies</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md ${
                  activeTab === "movies"
                    ? "bg-slate-950/20 text-slate-950 font-semibold"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {watchedTotal}/{movies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rewatch")}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === "rewatch"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              2. Rewatch Plan
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("booking")}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === "booking"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>3. Booking</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md ${
                  activeTab === "booking"
                    ? "bg-slate-950/20 text-slate-950 font-semibold"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {cinemas.length}
              </span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main View Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {globalError && (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {globalError}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-400">
            Loading MCU timeline and cinema data...
          </div>
        ) : (
          <>
            {activeTab === "movies" && (
              <MoviesView movies={movies} onRefreshMovies={fetchMovies} />
            )}

            {activeTab === "rewatch" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-lg font-semibold text-white">Rewatch Plan</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Select a target movie to compute prerequisite watch order. Ready for Step 9 UI.
                </p>
              </div>
            )}

            {activeTab === "booking" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <h2 className="text-lg font-semibold text-white">Watch-Party Booking</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Loaded {cinemas.length} cinemas. Ready for Step 10 UI.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}