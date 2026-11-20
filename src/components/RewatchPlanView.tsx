"use client";

import { useCallback, useEffect, useState } from "react";
import { MovieItem, RewatchPlanResponse } from "@/types";

interface RewatchPlanViewProps {
  movies: MovieItem[];
  onRefreshMovies: () => Promise<void>;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours}h (${totalMinutes} min)`;
  return `${hours}h ${minutes}m (${totalMinutes} min)`;
}

export function RewatchPlanView({ movies, onRefreshMovies }: RewatchPlanViewProps) {
  // Default to "Avengers: Doomsday" if present, otherwise the last movie in the list
  const defaultTargetId =
    movies.find((m) => m.title.toLowerCase().includes("doomsday"))?.id ??
    movies[movies.length - 1]?.id ??
    "";

  const [selectedMovieId, setSelectedMovieId] = useState<string>(defaultTargetId);
  const [plan, setPlan] = useState<RewatchPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedMovieId if movies list loads or selected movie was removed
  useEffect(() => {
    if (movies.length > 0 && !movies.some((m) => m.id === selectedMovieId)) {
      const doomsday = movies.find((m) => m.title.toLowerCase().includes("doomsday"));
      setSelectedMovieId(doomsday?.id ?? movies[movies.length - 1].id);
    }
  }, [movies, selectedMovieId]);

  const fetchRewatchPlan = useCallback(async (movieId: string) => {
    if (!movieId) return;
    try {
      setLoadingPlan(true);
      setError(null);
      const res = await fetch(`/api/movies/${movieId}/rewatch-order`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to load rewatch order.");
        setPlan(null);
        return;
      }
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error loading rewatch plan.");
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMovieId) {
      fetchRewatchPlan(selectedMovieId);
    }
  }, [selectedMovieId, fetchRewatchPlan]);

  async function handleTogglePrereqWatched(movieId: string, currentWatched: boolean) {
    try {
      setTogglingId(movieId);
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !currentWatched }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to update watched status.");
        return;
      }

      // Refresh both the global movies state and the current rewatch plan metrics
      await Promise.all([onRefreshMovies(), fetchRewatchPlan(selectedMovieId)]);
    } finally {
      setTogglingId(null);
    }
  }

  const progressPercent =
    plan && plan.totalCount > 0
      ? Math.round((plan.watchedCount / plan.totalCount) * 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Target Movie Selector Card */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label
              htmlFor="target-movie-select"
              className="block text-xs font-medium uppercase tracking-wider text-emerald-400 mb-2"
            >
              Target Movie to Prepare For
            </label>
            <select
              id="target-movie-select"
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value)}
              disabled={movies.length === 0}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.releaseYear})
                </option>
              ))}
            </select>
          </div>

          {plan && (
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5">
                <span className="text-slate-400 block">Progress</span>
                <span className="text-sm font-semibold text-white">
                  {plan.watchedCount} of {plan.totalCount} watched
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5">
                <span className="text-slate-400 block">Remaining Watch Time</span>
                <span className="text-sm font-semibold text-amber-300">
                  {formatDuration(plan.remainingRuntimeMinutes)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {plan && plan.totalCount > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-slate-300">
                {plan.watchedCount} of {plan.totalCount} prerequisites completed
              </span>
              <span className="font-semibold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Ordered Prerequisite List */}
      {loadingPlan ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
          Computing topological rewatch order...
        </div>
      ) : plan ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Watch Order Before <span className="text-emerald-400">{plan.targetMovie.title}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every prerequisite appears after all movies it depends on. Tick items as you watch them.
            </p>
          </div>

          {plan.orderedMovies.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 text-center">
              <p className="text-sm font-medium text-emerald-300">
                No prerequisites required!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                You can jump straight into <strong>{plan.targetMovie.title}</strong> without watching anything first.
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {plan.orderedMovies.map((movie, index) => (
                <li
                  key={movie.id}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 transition ${
                    movie.watched
                      ? "border-emerald-500/30 bg-emerald-950/15"
                      : "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        movie.watched
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {index + 1}
                    </span>

                    <input
                      type="checkbox"
                      checked={movie.watched}
                      disabled={togglingId === movie.id}
                      onChange={() => handleTogglePrereqWatched(movie.id, movie.watched)}
                      aria-label={`Mark ${movie.title} as watched`}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                    />

                    <div>
                      <p
                        className={`text-sm font-medium ${
                          movie.watched
                            ? "text-emerald-200 line-through decoration-emerald-500/50"
                            : "text-white"
                        }`}
                      >
                        {movie.title}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          ({movie.releaseYear})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">
                      {movie.runtimeMinutes} min
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                        movie.watched
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {movie.watched ? "Watched" : "Unwatched"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}