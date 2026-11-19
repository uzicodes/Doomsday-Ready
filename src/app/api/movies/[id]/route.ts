import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CircularDependencyError,
  validateNoCircularDependency,
} from "@/lib/algorithms/rewatch";
import {
  formatMovieResponse,
  normalizePrerequisiteIds,
  toMovieNode,
} from "@/lib/movie-helpers";

const prerequisiteSelect = {
  id: true,
  title: true,
  releaseYear: true,
  runtimeMinutes: true,
  watched: true,
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const targetMovie = await prisma.movie.findUnique({
      where: { id },
      include: { prerequisites: { select: prerequisiteSelect } },
    });

    if (!targetMovie) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Movie not found." },
        { status: 404 }
      );
    }

    const updateData: {
      title?: string;
      releaseYear?: number;
      runtimeMinutes?: number;
      watched?: boolean;
      prerequisites?: { set: { id: string }[] };
    } = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Title cannot be empty." },
          { status: 400 }
        );
      }
      if (title !== targetMovie.title) {
        const duplicate = await prisma.movie.findUnique({ where: { title } });
        if (duplicate) {
          return NextResponse.json(
            { error: "DUPLICATE_TITLE", message: `A movie titled "${title}" already exists.` },
            { status: 409 }
          );
        }
      }
      updateData.title = title;
    }

    if (body.releaseYear !== undefined) {
      const releaseYear = Number(body.releaseYear);
      if (!Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > 2100) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Release year must be a valid integer." },
          { status: 400 }
        );
      }
      updateData.releaseYear = releaseYear;
    }

    if (body.runtimeMinutes !== undefined) {
      const runtimeMinutes = Number(body.runtimeMinutes);
      if (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 300) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Runtime must be between 1 and 300 minutes." },
          { status: 400 }
        );
      }
      updateData.runtimeMinutes = runtimeMinutes;
    }

    if (body.watched !== undefined) {
      if (typeof body.watched !== "boolean") {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Watched must be a boolean." },
          { status: 400 }
        );
      }
      updateData.watched = body.watched;
    }

    const incomingPrereqs =
      body.prerequisiteIds !== undefined
        ? body.prerequisiteIds
        : body.prerequisites !== undefined
        ? body.prerequisites
        : undefined;

    if (incomingPrereqs !== undefined) {
      if (!Array.isArray(incomingPrereqs)) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", message: "Prerequisites must be an array of movie IDs." },
          { status: 400 }
        );
      }

      const prerequisiteIds = normalizePrerequisiteIds(incomingPrereqs);

      const allMovies = await prisma.movie.findMany({
        include: { prerequisites: { select: prerequisiteSelect } },
      });

      const existingIds = new Set(allMovies.map((m) => m.id));
      const missingIds = prerequisiteIds.filter((pid) => !existingIds.has(pid));
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: "INVALID_PREREQUISITES", message: `Unknown prerequisite IDs: ${missingIds.join(", ")}` },
          { status: 400 }
        );
      }

      // Enforce 409 CIRCULAR_DEPENDENCY check before updating
      validateNoCircularDependency(id, prerequisiteIds, allMovies.map(toMovieNode));

      updateData.prerequisites = {
        set: prerequisiteIds.map((pid) => ({ id: pid })),
      };
    }

    const updated = await prisma.movie.update({
      where: { id },
      data: updateData,
      include: {
        prerequisites: {
          select: prerequisiteSelect,
          orderBy: [{ releaseYear: "asc" }, { title: "asc" }],
        },
      },
    });

    return NextResponse.json({
      movie: formatMovieResponse(updated),
    });
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 409 }
      );
    }

    console.error("PATCH /api/movies/[id] error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to update movie." },
      { status: 500 }
    );
  }
}