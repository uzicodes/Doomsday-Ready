"use client";

import { useMemo, useState } from "react";
import { MovieItem } from "@/types";

interface MoviesViewProps {
  movies: MovieItem[];
  onRefreshMovies: () => Promise<void>;
}

interface ApiFault {
  code: string | null;
  message: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function matchesQuery(movie: MovieItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return movie.title.toLowerCase().includes(q) || String(movie.releaseYear).includes(q);
}

function FaultBanner({ fault }: { fault: ApiFault }) {
  const circular = fault.code === "CIRCULAR_DEPENDENCY";
  const heading = circular
    ? "PROTOCOL VIOLATION // 409 CIRCULAR_DEPENDENCY"
    : fault.code
      ? `REQUEST REJECTED // ${fault.code}`
      : "REQUEST REJECTED";

  return (
    <div role="alert" className="overflow-hidden rounded-md border border-crimson-bright/60 bg-crimson/10">
      <div className="flex items-center gap-2 bg-crimson px-3 py-1.5">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-white" fill="none" aria-hidden="true">
          <path d="M8 1.5 15 14H1L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 6v3.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">
          {heading}
        </span>
      </div>
      <p className="px-3 py-2 text-xs leading-relaxed text-red-100">{fault.message}</p>
    </div>
  );
}

function StatusIcon({ watched }: { watched: boolean }) {
  return watched ? (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="rgba(16,185,129,0.12)" />
      <path d="M7.5 12.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function MoviesView({ movies, onRefreshMovies }: MoviesViewProps) {
  // Add-movie form state
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("2026");
  const [runtimeMinutes, setRuntimeMinutes] = useState("140");
  const [watched, setWatched] = useState(false);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [prereqSearch, setPrereqSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<ApiFault | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Per-movie watched toggle loading & inline prerequisite editor state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [editPrereqIds, setEditPrereqIds] = useState<string[]>([]);
  const [editSearch, setEditSearch] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<ApiFault | null>(null);

  const filteredNewPrereqs = useMemo(
    () => movies.filter((m) => matchesQuery(m, prereqSearch)),
    [movies, prereqSearch]
  );
  const filteredEditPrereqs = useMemo(
    () => movies.filter((m) => matchesQuery(m, editSearch)),
    [movies, editSearch]
  );

  function toggleNewPrereq(id: string) {
    setSelectedPrereqs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleEditPrereq(id: string) {
    setEditPrereqIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  async function handleCreateMovie(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      setSubmitting(true);
      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          releaseYear: Number(releaseYear),
          runtimeMinutes: Number(runtimeMinutes),
          watched,
          prerequisiteIds: selectedPrereqs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError({
          code: data.error ?? null,
          message: data.message || "Failed to add movie.",
        });
        return;
      }

      setTitle("");
      setReleaseYear("2026");
      setRuntimeMinutes("140");
      setWatched(false);
      setSelectedPrereqs([]);
      setPrereqSearch("");
      setFormSuccess(`Archive entry registered: "${data.movie.title}" added to the MCU timeline.`);
      await onRefreshMovies();
    } catch (err) {
      setFormError({
        code: null,
        message: err instanceof Error ? err.message : "Network error while creating movie.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleWatched(movie: MovieItem) {
    setToggleError(null);
    try {
      setTogglingId(movie.id);
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !movie.watched }),
      });

      if (!res.ok) {
        const data = await res.json();
        setToggleError(data.message || "Failed to update watched status.");
        return;
      }

      await onRefreshMovies();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Network error while updating status.");
    } finally {
      setTogglingId(null);
    }
  }

  function startEditingPrerequisites(movie: MovieItem) {
    setEditingMovieId(movie.id);
    setEditPrereqIds([...movie.prerequisiteIds]);
    setEditSearch("");
    setEditError(null);
  }

  function cancelEditingPrerequisites() {
    setEditingMovieId(null);
    setEditPrereqIds([]);
    setEditSearch("");
    setEditError(null);
  }

  async function handleSavePrerequisites(movieId: string) {
    setEditError(null);
    try {
      setSavingEdit(true);
      const res = await fetch(`/api/movies/${movieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prerequisiteIds: editPrereqIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError({
          code: data.error ?? null,
          message: data.message || "Failed to update prerequisites.",
        });
        return;
      }

      setEditingMovieId(null);
      setEditSearch("");
      await onRefreshMovies();
    } catch (err) {
      setEditError({
        code: null,
        message: err instanceof Error ? err.message : "Network error while saving prerequisites.",
      });
    } finally {
      setSavingEdit(false);
    }
  }

  const watchedCount = movies.filter((m) => m.watched).length;

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left Panel: Register Archive Entry */}
      <section className="panel p-5 lg:col-span-5">
        <div className="flex items-center justify-between border-b border-edge pb-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-[0.1em] text-white">
              REGISTER ARCHIVE ENTRY
            </h2>
            <p className="mono-label mt-1 normal-case tracking-[0.06em]">
              Log a film and flag its required viewing.
            </p>
          </div>
          <span className="font-mono text-[10px] tracking-[0.14em] text-arc-bright">FORM // A-01</span>
        </div>

        <form onSubmit={handleCreateMovie} className="mt-5 space-y-4">
          {formError && <FaultBanner fault={formError} />}

          {formSuccess && (
            <div
              role="status"
              className="rounded-md border border-arc/50 bg-arc/10 px-3 py-2 text-xs text-emerald-100"
            >
              {formSuccess}
            </div>
          )}

          <div>
            <label htmlFor="movie-title" className="mono-label mb-1.5 block">
              Title <span className="text-crimson-bright">*</span>
            </label>
            <input
              id="movie-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spider-Man: Brand New Day"
              className="field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="movie-year" className="mono-label mb-1.5 block">
                Release Year <span className="text-crimson-bright">*</span>
              </label>
              <input
                id="movie-year"
                type="number"
                required
                min={1900}
                max={2100}
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                className="field font-mono"
              />
            </div>

            <div>
              <label htmlFor="movie-runtime" className="mono-label mb-1.5 block">
                Runtime // 1-300 MIN <span className="text-crimson-bright">*</span>
              </label>
              <input
                id="movie-runtime"
                type="number"
                required
                min={1}
                max={300}
                value={runtimeMinutes}
                onChange={(e) => setRuntimeMinutes(e.target.value)}
                className="field font-mono"
              />
            </div>
          </div>

          {/* Prerequisite checklist */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="mono-label">Prerequisites // Watch First</span>
              {selectedPrereqs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPrereqs([])}
                  className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim hover:text-white"
                >
                  Clear [{pad(selectedPrereqs.length)}]
                </button>
              )}
            </div>

            {movies.length === 0 ? (
              <p className="well px-3 py-3 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
                No archive entries available.
              </p>
            ) : (
              <div className="well overflow-hidden">
                <div className="border-b border-edge p-2">
                  <input
                    type="search"
                    value={prereqSearch}
                    onChange={(e) => setPrereqSearch(e.target.value)}
                    placeholder="Filter by title or year"
                    aria-label="Filter prerequisites"
                    className="field !py-1.5 font-mono !text-xs"
                  />
                </div>
                <div className="max-h-48 space-y-0.5 overflow-y-auto p-1.5">
                  {filteredNewPrereqs.length === 0 ? (
                    <p className="px-2 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
                      No matches.
                    </p>
                  ) : (
                    filteredNewPrereqs.map((m) => {
                      const checked = selectedPrereqs.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-xs transition ${
                            checked ? "bg-arc/10 text-white" : "text-dim hover:bg-steel-2"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNewPrereq(m.id)}
                            className="chk"
                          />
                          <span className="flex-1 truncate">{m.title}</span>
                          <span className="font-mono text-[11px] text-faint">{m.releaseYear}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 pt-1">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) => setWatched(e.target.checked)}
              className="chk"
            />
            <span className="mono-label !text-ink">Mark as already watched</span>
          </label>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Registering..." : "Register Entry"}
          </button>
        </form>
      </section>

      {/* Right Panel: MCU Timeline Archive */}
      <section className="space-y-4 lg:col-span-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold tracking-[0.1em] text-white">
              MCU TIMELINE ARCHIVE
            </h2>
            <p className="mono-label mt-1 normal-case tracking-[0.06em]">
              Toggle watched status or edit dependency chains.
            </p>
          </div>
          <span className="rounded border border-edge-hi bg-steel px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.1em] text-dim">
            <span className="text-arc-bright">{pad(watchedCount)}</span> / {pad(movies.length)} WATCHED
          </span>
        </div>

        {toggleError && (
          <FaultBanner fault={{ code: null, message: toggleError }} />
        )}

        {movies.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="mono-label">ARCHIVE EMPTY // REGISTER THE FIRST ENTRY USING THE FORM</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {movies.map((movie, index) => {
              const isEditing = editingMovieId === movie.id;

              return (
                <article
                  key={movie.id}
                  className={`panel relative overflow-hidden ${
                    movie.watched ? "border-arc/35" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 w-[3px] ${
                      movie.watched ? "bg-arc-bright" : "bg-edge-hi"
                    }`}
                  />

                  <div className="flex items-start gap-3.5 p-4 pl-5">
                    <span className="mt-0.5 hidden w-7 shrink-0 font-mono text-xs font-semibold text-faint sm:block">
                      {pad(index + 1)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleWatched(movie)}
                      disabled={togglingId === movie.id}
                      aria-pressed={movie.watched}
                      aria-label={`Mark ${movie.title} as ${movie.watched ? "unwatched" : "watched"}`}
                      className={`mt-0.5 shrink-0 transition disabled:cursor-wait disabled:opacity-50 ${
                        movie.watched ? "text-arc-bright" : "text-faint hover:text-dim"
                      }`}
                    >
                      <StatusIcon watched={movie.watched} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded border border-edge-hi bg-obsidian px-1.5 py-0.5 font-mono text-[11px] font-semibold text-dim">
                          {movie.releaseYear}
                        </span>
                        <h3
                          className={`font-display text-sm font-semibold tracking-wide ${
                            movie.watched ? "text-emerald-100" : "text-white"
                          }`}
                        >
                          {movie.title}
                        </h3>
                        <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-gold">
                          {movie.runtimeMinutes} MIN
                        </span>
                        {movie.watched && (
                          <span className="rounded border border-arc/40 bg-arc/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-arc-bright">
                            Watched
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="mono-label !text-[10px]">Requires</span>
                        {movie.prerequisites.length === 0 ? (
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-faint">
                            None
                          </span>
                        ) : (
                          movie.prerequisites.map((prereq) => (
                            <span
                              key={prereq.id}
                              className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${
                                prereq.watched
                                  ? "border-arc/35 bg-arc/5 text-emerald-200"
                                  : "border-edge-hi bg-obsidian text-dim"
                              }`}
                            >
                              {prereq.watched ? (
                                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-arc-bright" fill="none" aria-hidden="true">
                                  <path d="M2 6.5l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-faint" fill="none" aria-hidden="true">
                                  <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.4" />
                                </svg>
                              )}
                              {prereq.title}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEditingPrerequisites(movie)}
                        className="btn-ghost shrink-0"
                      >
                        Edit Dependencies
                      </button>
                    )}
                  </div>

                  {/* Expandable Edit Dependencies panel */}
                  {isEditing && (
                    <div className="space-y-3 border-t border-edge bg-obsidian/60 p-4 pl-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="mono-label !text-ink">
                          Edit Dependencies // <span className="text-arc-bright">{movie.title}</span>
                        </span>
                        <span className="font-mono text-[10.5px] tracking-[0.1em] text-dim">
                          SELECTED [{pad(editPrereqIds.length)}]
                        </span>
                      </div>

                      {editError && <FaultBanner fault={editError} />}

                      <input
                        type="search"
                        value={editSearch}
                        onChange={(e) => setEditSearch(e.target.value)}
                        placeholder="Filter by title or year"
                        aria-label="Filter dependencies"
                        className="field !py-1.5 font-mono !text-xs"
                      />

                      <div className="well grid max-h-48 grid-cols-1 gap-0.5 overflow-y-auto p-1.5 sm:grid-cols-2">
                        {filteredEditPrereqs.length === 0 ? (
                          <p className="px-2 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-faint">
                            No matches.
                          </p>
                        ) : (
                          filteredEditPrereqs.map((candidate) => {
                            const checked = editPrereqIds.includes(candidate.id);
                            const isSelf = candidate.id === movie.id;
                            return (
                              <label
                                key={candidate.id}
                                className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
                                  checked ? "bg-arc/10 text-white" : "text-dim hover:bg-steel-2"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleEditPrereq(candidate.id)}
                                  className="chk"
                                />
                                <span className="flex-1 truncate">{candidate.title}</span>
                                <span className="font-mono text-[10.5px] text-faint">
                                  {candidate.releaseYear}
                                </span>
                                {isSelf && (
                                  <span
                                    className="badge-crimson"
                                    data-tooltip="A movie cannot depend on itself"
                                  >
                                    SELF
                                  </span>
                                )}
                              </label>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingPrerequisites}
                          disabled={savingEdit}
                          className="btn-ghost"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePrerequisites(movie.id)}
                          disabled={savingEdit}
                          className="btn-primary !px-4 !py-2 !text-[11px]"
                        >
                          {savingEdit ? "Saving..." : "Save Dependencies"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
