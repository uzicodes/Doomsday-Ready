import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CircularDependencyError,
  computeRewatchOrder,
} from "@/lib/algorithms/rewatch";
import { toMovieNode } from "@/lib/movie-helpers";

const prerequisiteSelect = {
  id: true,
  title: true,
  releaseYear: true,
  runtimeMinutes: true,
  watched: true,
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const allMovies = await prisma.movie.findMany({
      include: { prerequisites: { select: prerequisiteSelect } },
    });

    const targetExists = allMovies.some((m) => m.id === id);
    if (!targetExists) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Movie not found." },
        { status: 404 }
      );
    }

    const plan = computeRewatchOrder(id, allMovies.map(toMovieNode));

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof CircularDependencyError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 409 }
      );
    }

    console.error("GET /api/movies/[id]/rewatch-order error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to compute rewatch order." },
      { status: 500 }
    );
  }
}