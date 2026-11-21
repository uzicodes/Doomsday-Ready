export interface MovieNode {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
}

export interface RewatchPlanResult {
  targetMovie: {
    id: string;
    title: string;
  };
  orderedMovies: MovieNode[];
  totalCount: number;
  watchedCount: number;
  remainingRuntimeMinutes: number;
}

export class CircularDependencyError extends Error {
  public readonly code = "CIRCULAR_DEPENDENCY";
  public readonly status = 409;

  constructor(message = "Adding these prerequisites creates a circular dependency.") {
    super(message);
    this.name = "CircularDependencyError";
  }
}

export function validateNoCircularDependency(
  movieId: string,
  proposedPrerequisiteIds: string[],
  allMovies: MovieNode[]
): void {
  const uniquePrereqs = Array.from(new Set(proposedPrerequisiteIds));

  if (uniquePrereqs.includes(movieId)) {
    throw new CircularDependencyError(
      "A movie cannot list itself as a prerequisite."
    );
  }

  const movieMap = new Map<string, MovieNode>();
  for (const movie of allMovies) {
    movieMap.set(movie.id, movie);
  }

  const visited = new Set<string>();

  function reachesTarget(currentId: string): boolean {
    if (currentId === movieId) return true;
    if (visited.has(currentId)) return false;

    visited.add(currentId);
    const currentMovie = movieMap.get(currentId);
    if (!currentMovie) return false;

    for (const parentPrereqId of currentMovie.prerequisiteIds) {
      if (reachesTarget(parentPrereqId)) {
        return true;
      }
    }

    return false;
  }

  for (const prereqId of uniquePrereqs) {
    if (reachesTarget(prereqId)) {
      throw new CircularDependencyError(
        "Circular dependency detected: a prerequisite already depends on this movie."
      );
    }
  }
}

export function computeRewatchOrder(
  targetMovieId: string,
  allMovies: MovieNode[]
): RewatchPlanResult {
  const movieMap = new Map<string, MovieNode>();
  for (const movie of allMovies) {
    movieMap.set(movie.id, movie);
  }

  const targetMovie = movieMap.get(targetMovieId);
  if (!targetMovie) {
    throw new Error(`Movie with id "${targetMovieId}" not found.`);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const orderedMovies: MovieNode[] = [];

  function dfs(currentId: string): void {
    if (visited.has(currentId)) return;
    if (visiting.has(currentId)) {
      throw new CircularDependencyError();
    }

    const movie = movieMap.get(currentId);
    if (!movie) return;

    visiting.add(currentId);

    // Prefer release year, then title
    const sortedPrereqs = [...movie.prerequisiteIds].sort((aId, bId) => {
      const a = movieMap.get(aId);
      const b = movieMap.get(bId);
      if (!a || !b) return 0;
      if (a.releaseYear !== b.releaseYear) return a.releaseYear - b.releaseYear;
      return a.title.localeCompare(b.title);
    });

    for (const prereqId of sortedPrereqs) {
      dfs(prereqId);
    }

    visiting.delete(currentId);
    visited.add(currentId);

    // Exclude the target from its own rewatch list
    if (currentId !== targetMovieId) {
      orderedMovies.push(movie);
    }
  }

  dfs(targetMovieId);

  let watchedCount = 0;
  let remainingRuntimeMinutes = 0;

  for (const movie of orderedMovies) {
    if (movie.watched) {
      watchedCount += 1;
    } else {
      remainingRuntimeMinutes += movie.runtimeMinutes;
    }
  }

  return {
    targetMovie: {
      id: targetMovie.id,
      title: targetMovie.title,
    },
    orderedMovies,
    totalCount: orderedMovies.length,
    watchedCount,
    remainingRuntimeMinutes,
  };
}