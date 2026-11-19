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

export async function GET() {
  try {
    const movies = await prisma.movie.findMany({
      include: {
        prerequisites: {
          select: prerequisiteSelect,
          orderBy: [{ releaseYear: "asc" }, { title: "asc" }],
        },
      },
      orderBy: [{ releaseYear: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({
      movies: movies.map(formatMovieResponse),
    });
  } catch (error) {
    console.error("GET /api/movies error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch movies." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const releaseYear = Number(body.releaseYear);
    const runtimeMinutes = Number(body.runtimeMinutes);
    const watched = typeof body.watched === "boolean" ? body.watched : false;
    const rawPrereqs = Array.isArray(body.prerequisiteIds)
      ? body.prerequisiteIds
      : Array.isArray(body.prerequisites)
      ? body.prerequisites
      : [];

    const prerequisiteIds = normalizePrerequisiteIds(rawPrereqs);

    // Validation
    if (!title) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Title is required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(releaseYear) || releaseYear < 1900 || releaseYear > 2100) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Release year must be a valid integer." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(runtimeMinutes) || runtimeMinutes < 1 || runtimeMinutes > 300) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Runtime must be an integer between 1 and 300 minutes." },
        { status: 400 }
      );
    }

    // Check duplicate title
    const existingTitle = await prisma.movie.findUnique({ where: { title } });
    if (existingTitle) {
      return NextResponse.json(
        { error: "DUPLICATE_TITLE", message: `A movie titled "${title}" already exists.` },
        { status: 409 }
      );
    }

    const allMovies = await prisma.movie.findMany({
      include: { prerequisites: { select: prerequisiteSelect } },
    });

    // Verify all prerequisite IDs exist
    if (prerequisiteIds.length > 0) {
      const existingIds = new Set(allMovies.map((m) => m.id));
      const missingIds = prerequisiteIds.filter((id) => !existingIds.has(id));
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: "INVALID_PREREQUISITES", message: `Unknown prerequisite IDs: ${missingIds.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Cycle validation for a brand-new movie node
    validateNoCircularDependency(
      "__NEW_MOVIE__",
      prerequisiteIds,
      allMovies.map(toMovieNode)
    );

    const created = await prisma.movie.create({
      data: {
        title,
        releaseYear,
        runtimeMinutes,
        watched,
        prerequisites: {
          connect: prerequisiteIds.map((id) => ({ id })),
        },
      },
      include: {
        prerequisites: {
          select: prerequisiteSelect,
          orderBy: [{ releaseYear: "asc" }, { title: "asc" }],
        },
      },
    });

    return NextResponse.json(
      { movie: formatMovieResponse(created) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 409 }
      );
    }

    console.error("POST /api/movies error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create movie." },
      { status: 500 }
    );
  }
}