"use client";

import { useCallback, useEffect, useState } from "react";
import { MovieItem, RewatchPlanResponse } from "@/types";

interface RewatchPlanViewProps {
  movies: MovieItem[];
  onRefreshMovies: () => Promise<void>;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDuration(totalMinutes: number): string {
  const safe = Math.max(0, totalMinutes);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${hours}H ${String(minutes).padStart(2, "0")}M // ${safe} MIN`;
}

const MAX_SEGMENTS = 40;

export function RewatchPlanView({ movies, onRefreshMovies }: RewatchPlanViewProps) {
  const defaultTargetId =
    movies.find((m) => m.title.toLowerCase().includes("doomsday"))?.id ??
    movies[movies.length - 1]?.id ??
    "";

  const [selectedMovieId, setSelectedMovieId] = useState<string>(defaultTargetId);
  const [plan, setPlan] = useState<RewatchPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (movies.length > 0 && !movies.some((m) => m.id === selectedMovieId)) {
      const doomsday = movies.find((m) => m.title.toLowerCase().includes("doomsday"));
      setSelectedMovieId(doomsday?.id ?? movies[movies.length - 1].id);
    }
  }, [movies, selectedMovieId]);

  const fetchRewatchPlan = useCallback(async (movieId: string, silent = false) => {
    if (!movieId) return;
    try {
      if (!silent) setLoadingPlan(true);
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
      if (!silent) setLoadingPlan(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMovieId) {
      fetchRewatchPlan(selectedMovieId);
    }
  }, [selectedMovieId, fetchRewatchPlan]);

  async function handleTogglePrereqWatched(movieId: string, currentWatched: boolean) {
    const nextWatched = !currentWatched;
    setTogglingId(movieId);
    setError(null);

    setPlan((prev) =>
      prev
        ? {
            ...prev,
            orderedMovies: prev.orderedMovies.map((m) =>
              m.id === movieId ? { ...m, watched: nextWatched } : m
            ),
          }
        : prev
    );

    try {
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: nextWatched }),
      });

      if (!res.ok) {
        const data = await res.json();
        await fetchRewatchPlan(selectedMovieId, true);
        setError(data.message || "Failed to update watched status.");
        return;
      }

      await Promise.all([onRefreshMovies(), fetchRewatchPlan(selectedMovieId, true)]);
    } catch (err) {
      await fetchRewatchPlan(selectedMovieId, true);
      setError(err instanceof Error ? err.message : "Network error while updating status.");
    } finally {
      setTogglingId(null);
    }
  }

  const ordered = plan?.orderedMovies ?? [];
  const totalCount = ordered.length;
  const watchedCount = ordered.filter((m) => m.watched).length;
  const remainingMinutes = ordered.reduce((sum, m) => (m.watched ? sum : sum + m.runtimeMinutes), 0);
  const progressPercent = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 100;
  const cleared = totalCount === 0 || watchedCount === totalCount;
  const useSegments = totalCount > 0 && totalCount <= MAX_SEGMENTS;

  return (
    <div className="space-y-5">
      {/* Mission briefing header */}
      <section className="panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-xl">
            <label htmlFor="target-movie-select" className="mono-label mb-2 block !text-arc-bright">
              Mission Target // <span className="text-crimson-accent">Film to Prepare For</span>
            </label>
            <select
              id="target-movie-select"
              value={selectedMovieId}
              onChange={(e) => setSelectedMovieId(e.target.value)}
              disabled={movies.length === 0}
              className="field !py-2.5 font-display tracking-wide"
            >
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.releaseYear})
                </option>
              ))}
            </select>
          </div>

          {plan && (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[34rem]">
              <div className="panel-raised px-4 py-3">
                <div className="mono-label">Completion Ratio</div>
                <div className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
                  <span className="text-arc-bright">{watchedCount}</span>
                  <span className="text-faint"> / </span>
                  {totalCount} <span className="text-sm font-semibold text-dim">FILMS</span>
                </div>
              </div>

              <div className="panel-raised px-4 py-3">
                <div className="mono-label">Remaining Runtime</div>
                <div className="mt-1 font-mono text-xl font-bold tracking-tight text-gold">
                  {formatDuration(remainingMinutes)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Precision progress bar */}
        {plan && totalCount > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono-label">
                Briefing Progress //{" "}
                <span className={cleared ? "text-arc-bright" : "text-dim"}>
                  {cleared ? "CLEARED FOR TARGET" : `${pad(totalCount - watchedCount)} OUTSTANDING`}
                </span>
              </span>
              <span className="font-mono text-sm font-bold text-arc-bright">{progressPercent}%</span>
            </div>

            {useSegments ? (
              <div
                className="flex gap-[3px]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="Prerequisites completed"
              >
                {ordered.map((m) => (
                  <span
                    key={m.id}
                    className={`h-3 flex-1 transition-colors duration-300 ${
                      m.watched
                        ? "bg-arc-bright shadow-[0_0_8px_rgba(0,229,153,0.35)]"
                        : "bg-edge-hi/70"
                    }`}
                  />
                ))}
              </div>
            ) : (
              <div
                className="h-3 w-full overflow-hidden bg-edge-hi/70"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="Prerequisites completed"
              >
                <div
                  className="h-full bg-arc-bright transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="mt-1.5 flex justify-between font-mono text-[10px] tracking-[0.12em] text-faint">
              <span>00</span>
              <span>{pad(totalCount)}</span>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div role="alert" className="overflow-hidden rounded-md border border-crimson-bright/60 bg-crimson/10">
          <div className="bg-crimson px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">
            REQUEST REJECTED
          </div>
          <p className="px-3 py-2 text-xs text-red-100">{error}</p>
        </div>
      )}

      {/* Chronological timeline rail */}
      {loadingPlan ? (
        <div className="panel p-10 text-center">
          <p className="mono-label">COMPUTING TOPOLOGICAL REWATCH ORDER</p>
          <div className="mx-auto mt-4 h-[3px] w-48 overflow-hidden bg-edge">
            <div className="scan-bar h-full w-1/3 bg-arc-bright" />
          </div>
        </div>
      ) : plan ? (
        <section className="panel p-5 sm:p-6">
          <div className="mb-6 border-b border-edge pb-4">
            <h2 className="font-display text-base font-bold tracking-[0.1em] text-white">
              WATCH ORDER // BEFORE <span className="text-crimson-accent">{plan.targetMovie.title.toUpperCase()}</span>
            </h2>
            <p className="mono-label mt-1 normal-case tracking-[0.06em]">
              Every film appears after everything it depends on. Check off each as you watch.
            </p>
          </div>

          {plan.orderedMovies.length === 0 ? (
            <div className="well p-6 text-center">
              <p className="font-display text-sm font-bold tracking-[0.12em] text-arc-bright">
                NO PREREQUISITES REQUIRED
              </p>
              <p className="mt-1.5 text-xs text-dim">
                Proceed directly to <strong className="text-white">{plan.targetMovie.title}</strong>. No prior viewing is needed.
              </p>
            </div>
          ) : (
            <ol>
              {plan.orderedMovies.map((movie, index) => {
                const isLast = index === plan.orderedMovies.length - 1;
                return (
                  <li key={movie.id} className="relative pb-3 pl-14">
                    {/* Connector rail to next node */}
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-3 left-[19.5px] top-[52px] w-px transition-colors ${
                          movie.watched ? "bg-arc" : "bg-edge-hi"
                        }`}
                      />
                    )}

                    {/* Mission index node */}
                    <span
                      className={`absolute left-0 top-3 flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm font-bold transition-colors ${
                        movie.watched
                          ? "border-arc-bright bg-arc/15 text-arc-bright"
                          : "border-edge-hi bg-obsidian text-dim"
                      }`}
                    >
                      {pad(index + 1)}
                    </span>

                    <div
                      className={`flex min-h-16 items-center justify-between gap-4 rounded-md border px-4 py-3 transition ${
                        movie.watched
                          ? "border-arc/35 bg-arc/5"
                          : "border-edge bg-steel-2 hover:border-edge-hi"
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5">
                        <input
                          type="checkbox"
                          checked={movie.watched}
                          disabled={togglingId === movie.id}
                          onChange={() => handleTogglePrereqWatched(movie.id, movie.watched)}
                          aria-label={`Mark ${movie.title} as watched`}
                          className="chk !h-5 !w-5"
                        />
                        <span className="min-w-0">
                          <span
                            className={`block truncate font-display text-sm font-semibold tracking-wide ${
                              movie.watched ? "text-emerald-100" : "text-white"
                            }`}
                          >
                            {movie.title}
                          </span>
                          <span className="font-mono text-[11px] text-dim">{movie.releaseYear}</span>
                        </span>
                      </label>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-xs font-semibold tracking-[0.08em] text-gold">
                          {movie.runtimeMinutes} MIN
                        </span>
                        <span
                          className={`hidden rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-block ${
                            movie.watched
                              ? "border-arc/40 bg-arc/10 text-arc-bright"
                              : "border-edge-hi text-faint"
                          }`}
                        >
                          {movie.watched ? "Cleared" : "Pending"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}
    </div>
  );
}