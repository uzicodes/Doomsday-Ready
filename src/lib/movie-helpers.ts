import { Movie } from "@prisma/client";
import { MovieNode } from "./algorithms/rewatch";

export type MovieWithPrerequisites = Movie & {
  prerequisites: Pick<Movie, "id" | "title" | "releaseYear" | "runtimeMinutes" | "watched">[];
};

export function normalizePrerequisiteIds(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === "string"
            ? value
            : value !== null &&
              typeof value === "object" &&
              "id" in value &&
              typeof value.id === "string"
            ? value.id
            : null
        )
        .filter((id): id is string => id !== null && id.trim() !== "")
        .map((id) => id.trim())
    )
  );
}

export function toMovieNode(movie: MovieWithPrerequisites): MovieNode {
  return {
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear,
    runtimeMinutes: movie.runtimeMinutes,
    watched: movie.watched,
    prerequisiteIds: movie.prerequisites.map((p) => p.id),
  };
}

export function formatMovieResponse(movie: MovieWithPrerequisites) {
  return {
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear,
    runtimeMinutes: movie.runtimeMinutes,
    watched: movie.watched,
    prerequisiteIds: movie.prerequisites.map((p) => p.id),
    prerequisites: movie.prerequisites,
    createdAt: movie.createdAt,
    updatedAt: movie.updatedAt,
  };
}