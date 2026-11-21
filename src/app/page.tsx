"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { CinemaItem, MovieItem } from "@/types";
import { MoviesView } from "@/components/MoviesView";
import { RewatchPlanView } from "@/components/RewatchPlanView";
import { BookingView } from "@/components/BookingView";

type ActiveTab = "movies" | "rewatch" | "booking";

const TABS: { id: ActiveTab; index: string; label: string }[] = [
  { id: "movies", index: "01", label: "CATALOG" },
  { id: "rewatch", index: "02", label: "REWATCH PROTOCOL" },
  { id: "booking", index: "03", label: "PREMIERE BOOKING" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

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
  const linkOnline = !globalError;

  function tabCounter(id: ActiveTab): string | null {
    if (id === "movies") return `${pad(watchedTotal)}/${pad(movies.length)}`;
    if (id === "booking") return `${pad(cinemas.length)}`;
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Command Header */}
      <header className="sticky top-0 z-20 border-b border-edge bg-obsidian/90 backdrop-blur">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-arc via-75% to-crimson opacity-70" />

        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <Image
                src="/logo.png"
                alt="Doomsday Ready logo"
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div>
                <h1 className="font-display text-2xl font-bold leading-none tracking-[0.08em] text-white">
                  DOOMSDAY <span className="text-arc-bright">READY</span>
                </h1>
                <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-dim">
                  AVENGERS: <span className="text-crimson-accent">DOOMSDAY</span> // REWATCH &amp; PREMIERE LOGISTICS
                </p>
              </div>
            </div>

            {/* Live status counters */}
            <div className="flex items-stretch gap-2">
              <div className="panel-raised px-3 py-1.5">
                <div className="mono-label">Archive</div>
                <div className="font-mono text-sm font-semibold text-white">
                  {pad(watchedTotal)}
                  <span className="text-faint"> / </span>
                  {pad(movies.length)}
                </div>
              </div>
              <div className="panel-raised px-3 py-1.5">
                <div className="mono-label">Venues</div>
                <div className="font-mono text-sm font-semibold text-white">{pad(cinemas.length)}</div>
              </div>
              <div className="panel-raised flex items-center gap-2 px-3 py-1.5">
                <span
                  data-tooltip={loading ? "Contacting MCU and venue services" : linkOnline ? "Data services connected" : "A data service is unavailable"}
                  className={`status-dot h-2 w-2 rounded-full ${
                    linkOnline ? "bg-arc-bright" : "bg-crimson-bright"
                  }`}
                />
                <div>
                  <div className="mono-label">Link</div>
                  <div
                    className={`font-mono text-sm font-semibold ${
                      linkOnline ? "text-arc-bright" : "text-crimson-bright"
                    }`}
                  >
                    {loading ? "SYNC" : linkOnline ? "LIVE" : "FAULT"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Segmented navigation bar */}
          <nav aria-label="Primary Views" className="grid grid-cols-1 sm:grid-cols-3">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const counter = tabCounter(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center justify-between gap-3 border border-edge px-4 py-3 text-left transition first:rounded-t-md last:rounded-b-md sm:-ml-px sm:first:ml-0 sm:first:rounded-l-md sm:first:rounded-tr-none sm:last:rounded-r-md sm:last:rounded-bl-none sm:rounded-none ${
                    active
                      ? "bg-steel-2 text-white"
                      : "bg-steel text-dim hover:bg-steel-2/60 hover:text-ink"
                  }`}
                >
                  {/* Active indicator bar */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 top-0 h-[2px] transition ${
                      active
                        ? "bg-gradient-to-r from-arc-bright from-70% to-crimson shadow-[0_0_10px_rgba(0,229,153,0.45)]"
                        : "bg-transparent"
                    }`}
                  />
                  <span className="font-mono text-xs font-semibold tracking-[0.12em]">
                    <span className={active ? "text-arc-bright" : "text-faint"}>{tab.index}</span>
                    <span className="text-faint"> // </span>
                    {tab.label}
                  </span>
                  {counter && (
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        active
                          ? "border-arc/50 bg-arc/10 text-arc-bright"
                          : "border-edge-hi bg-obsidian text-dim"
                      }`}
                    >
                      {counter}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main View Content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {globalError && (
          <div
            role="alert"
            className="mb-6 overflow-hidden rounded-md border border-crimson-bright/60 bg-crimson/10"
          >
            <div className="bg-crimson px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              SYSTEM FAULT // DATA LINK INTERRUPTED
            </div>
            <p className="px-3 py-2 text-xs text-red-100">{globalError}</p>
          </div>
        )}

        {loading ? (
          <div className="panel p-12 text-center">
            <p className="mono-label">ESTABLISHING LINK // LOADING MCU TIMELINE AND VENUE DATA</p>
            <div className="mx-auto mt-4 h-[3px] w-48 overflow-hidden bg-edge">
              <div className="scan-bar h-full w-1/3 bg-arc-bright" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === "movies" && <MoviesView movies={movies} onRefreshMovies={fetchMovies} />}

            {activeTab === "rewatch" && (
              <RewatchPlanView movies={movies} onRefreshMovies={fetchMovies} />
            )}

            {activeTab === "booking" && (
              <BookingView cinemas={cinemas} onRefreshCinemas={fetchCinemas} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-edge">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-[2px] bg-crimson-bright/70" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              S.H.I.E.L.D. // LATVERIA TACTICAL BRIEFING
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
            BUILD 0.1.0
          </span>
        </div>
      </footer>
    </div>
  );
}
