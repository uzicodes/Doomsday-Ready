import { describe, expect, it } from "vitest";
import {
  CircularDependencyError,
  MovieNode,
  computeRewatchOrder,
  validateNoCircularDependency,
} from "../src/lib/algorithms/rewatch";

const sampleMovies: MovieNode[] = [
  {
    id: "iron-man",
    title: "Iron Man",
    releaseYear: 2008,
    runtimeMinutes: 126,
    watched: true,
    prerequisiteIds: [],
  },
  {
    id: "cap-1",
    title: "Captain America: The First Avenger",
    releaseYear: 2011,
    runtimeMinutes: 124,
    watched: false,
    prerequisiteIds: [],
  },
  {
    id: "avengers",
    title: "The Avengers",
    releaseYear: 2012,
    runtimeMinutes: 143,
    watched: false,
    prerequisiteIds: ["iron-man", "cap-1"],
  },
  {
    id: "civil-war",
    title: "Captain America: Civil War",
    releaseYear: 2016,
    runtimeMinutes: 147,
    watched: false,
    prerequisiteIds: ["avengers"],
  },
  {
    id: "ragnarok",
    title: "Thor: Ragnarok",
    releaseYear: 2017,
    runtimeMinutes: 130,
    watched: true,
    prerequisiteIds: [],
  },
  {
    id: "infinity-war",
    title: "Avengers: Infinity War",
    releaseYear: 2018,
    runtimeMinutes: 149,
    watched: false,
    prerequisiteIds: ["civil-war", "ragnarok"],
  },
  {
    id: "endgame",
    title: "Avengers: Endgame",
    releaseYear: 2019,
    runtimeMinutes: 181,
    watched: false,
    prerequisiteIds: ["infinity-war"],
  },
  {
    id: "doomsday",
    title: "Avengers: Doomsday",
    releaseYear: 2026,
    runtimeMinutes: 165,
    watched: false,
    prerequisiteIds: ["endgame"],
  },
];

describe("Feature 1: Rewatch Order & Cycle Detection", () => {
  it("returns all 7 prerequisites in valid topological order for Avengers: Doomsday", () => {
    const result = computeRewatchOrder("doomsday", sampleMovies);
    const titles = result.orderedMovies.map((m) => m.title);

    expect(titles).toHaveLength(7);
    expect(titles).not.toContain("Avengers: Doomsday");

    // Verify every movie appears after all of its prerequisites
    const indexById = new Map(result.orderedMovies.map((m, idx) => [m.id, idx]));
    for (const movie of result.orderedMovies) {
      for (const prereqId of movie.prerequisiteIds) {
        expect(indexById.get(prereqId)!).toBeLessThan(indexById.get(movie.id)!);
      }
    }

    // Iron Man and Ragnarok are watched (2 of 7); remaining runtime = 124+143+147+149+181 = 744
    expect(result.watchedCount).toBe(2);
    expect(result.remainingRuntimeMinutes).toBe(744);
  });

  it("returns Iron Man and First Avenger before The Avengers for Civil War", () => {
    const result = computeRewatchOrder("civil-war", sampleMovies);
    const titles = result.orderedMovies.map((m) => m.title);

    expect(titles).toHaveLength(3);
    expect(titles[2]).toBe("The Avengers");
    expect(titles.slice(0, 2)).toEqual(
      expect.arrayContaining(["Iron Man", "Captain America: The First Avenger"])
    );
  });

  it("returns an empty list for Thor: Ragnarok", () => {
    const result = computeRewatchOrder("ragnarok", sampleMovies);

    expect(result.orderedMovies).toEqual([]);
    expect(result.watchedCount).toBe(0);
    expect(result.remainingRuntimeMinutes).toBe(0);
  });

  it("throws 409 CIRCULAR_DEPENDENCY when making Avengers: Endgame a prerequisite of Iron Man", () => {
    expect(() =>
      validateNoCircularDependency("iron-man", ["endgame"], sampleMovies)
    ).toThrow(CircularDependencyError);

    try {
      validateNoCircularDependency("iron-man", ["endgame"], sampleMovies);
    } catch (err) {
      expect(err).toBeInstanceOf(CircularDependencyError);
      expect((err as CircularDependencyError).status).toBe(409);
      expect((err as CircularDependencyError).code).toBe("CIRCULAR_DEPENDENCY");
    }
  });

  it("throws 409 CIRCULAR_DEPENDENCY on direct self-dependency", () => {
    expect(() =>
      validateNoCircularDependency("iron-man", ["iron-man"], sampleMovies)
    ).toThrow(CircularDependencyError);
  });
});