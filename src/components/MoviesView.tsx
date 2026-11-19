"use client";

import { useState } from "react";
import { MovieItem } from "@/types";

interface MoviesViewProps {
  movies: MovieItem[];
  onRefreshMovies: () => Promise<void>;
}

export function MoviesView({ movies, onRefreshMovies }: MoviesViewProps) {
  // Add-movie form state
  const [title, setTitle] = useState("");
  const [releaseYear, setReleaseYear] = useState("2026");
  const [runtimeMinutes, setRuntimeMinutes] = useState("140");
  const [watched, setWatched] = useState(false);
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Per-movie watched toggle loading & inline prerequisite editor state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [editPrereqIds, setEditPrereqIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
        const prefix = data.error ? `[${data.error}] ` : "";
        setFormError(`${prefix}${data.message || "Failed to add movie."}`);
        return;
      }

      setTitle("");
      setReleaseYear("2026");
      setRuntimeMinutes("140");
      setWatched(false);
      setSelectedPrereqs([]);
      setFormSuccess(`Added "${data.movie.title}" to the MCU timeline.`);
      await onRefreshMovies();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error while creating movie.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleWatched(movie: MovieItem) {
    try {
      setTogglingId(movie.id);
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: !movie.watched }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to update watched status.");
        return;
      }

      await onRefreshMovies();
    } finally {
      setTogglingId(null);
    }
  }

  function startEditingPrerequisites(movie: MovieItem) {
    setEditingMovieId(movie.id);
    setEditPrereqIds([...movie.prerequisiteIds]);
    setEditError(null);
  }

  function cancelEditingPrerequisites() {
    setEditingMovieId(null);
    setEditPrereqIds([]);
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
        const codeBadge = data.error === "CIRCULAR_DEPENDENCY" ? "409 CIRCULAR_DEPENDENCY: " : "";
        setEditError(`${codeBadge}${data.message || "Failed to update prerequisites."}`);
        return;
      }

      setEditingMovieId(null);
      await onRefreshMovies();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Network error while saving prerequisites.");
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Add Movie Form */}
      <section className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-white">Add MCU Movie</h2>
        <p className="text-xs text-slate-400 mt-1">
          Create a movie entry and select any films that should be watched beforehand.
        </p>

        <form onSubmit={handleCreateMovie} className="mt-5 space-y-4">
          {formError && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
              {formSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Movie Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Spider-Man: Brand New Day"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Release Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1900}
                max={2100}
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Runtime (1–300 min) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                max={300}
                value={runtimeMinutes}
                onChange={(e) => setRuntimeMinutes(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Prerequisites Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Prerequisites (Watch These First)
              </label>
              {selectedPrereqs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPrereqs([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear ({selectedPrereqs.length})
                </button>
              )}
            </div>

            {movies.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No existing movies yet.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-2 space-y-1">
                {movies.map((m) => {
                  const checked = selectedPrereqs.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition ${
                        checked
                          ? "bg-emerald-500/15 text-emerald-200"
                          : "text-slate-300 hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleNewPrereq(m.id)}
                        className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="flex-1 truncate">{m.title}</span>
                      <span className="text-slate-500">{m.releaseYear}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) => setWatched(e.target.checked)}
              className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            <span>Mark as already watched</span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {submitting ? "Adding Movie..." : "Add Movie"}
          </button>
        </form>
      </section>

      {/* Right Column: Movies Catalog */}
      <section className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">MCU Movie Catalog</h2>
            <p className="text-xs text-slate-400">
              Tick movies as watched or edit prerequisite dependencies.
            </p>
          </div>
          <span className="text-xs rounded-full bg-slate-800 px-3 py-1 text-slate-300">
            {movies.filter((m) => m.watched).length} of {movies.length} watched
          </span>
        </div>

        {movies.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
            No movies found. Add your first movie using the form on the left.
          </div>
        ) : (
          <div className="space-y-3">
            {movies.map((movie) => {
              const isEditing = editingMovieId === movie.id;

              return (
                <div
                  key={movie.id}
                  className={`rounded-2xl border p-4 transition ${
                    movie.watched
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-slate-800 bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={movie.watched}
                        disabled={togglingId === movie.id}
                        onChange={() => handleToggleWatched(movie)}
                        aria-label={`Mark ${movie.title} as watched`}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`font-semibold text-sm ${
                              movie.watched ? "text-emerald-200 line-through decoration-emerald-500/50" : "text-white"
                            }`}
                          >
                            {movie.title}
                          </h3>
                          <span className="text-xs text-slate-400">
                            ({movie.releaseYear})
                          </span>
                          <span className="text-xs rounded-md bg-slate-800 px-2 py-0.5 text-slate-300">
                            {movie.runtimeMinutes} min
                          </span>
                          {movie.watched && (
                            <span className="text-[11px] font-medium rounded-md bg-emerald-500/20 text-emerald-300 px-2 py-0.5">
                              Watched
                            </span>
                          )}
                        </div>

                        {/* Prerequisites List */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">Prerequisites:</span>
                          {movie.prerequisites.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">None</span>
                          ) : (
                            movie.prerequisites.map((prereq) => (
                              <span
                                key={prereq.id}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-xs text-slate-300"
                              >
                                {prereq.watched ? "✓" : "○"} {prereq.title}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEditingPrerequisites(movie)}
                        className="shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition"
                      >
                        Edit Prerequisites
                      </button>
                    )}
                  </div>

                  {/* Inline Prerequisite Editor */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                          Select movies required before <strong className="text-white">{movie.title}</strong>:
                        </span>
                      </div>

                      {editError && (
                        <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-2 text-xs text-rose-200 font-medium">
                          {editError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2">
                        {movies.map((candidate) => {
                          const checked = editPrereqIds.includes(candidate.id);
                          const isSelf = candidate.id === movie.id;
                          return (
                            <label
                              key={candidate.id}
                              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer ${
                                checked
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "text-slate-300 hover:bg-slate-900"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEditPrereq(candidate.id)}
                                className="rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="truncate">
                                {candidate.title}
                                {isSelf ? " (Self)" : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditingPrerequisites}
                          disabled={savingEdit}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavePrerequisites(movie.id)}
                          disabled={savingEdit}
                          className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                        >
                          {savingEdit ? "Saving..." : "Save Prerequisites"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}