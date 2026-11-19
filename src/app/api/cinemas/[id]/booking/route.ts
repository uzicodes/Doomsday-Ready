import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOptimalBundles } from "@/lib/algorithms/booking";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const groupSizeParam = request.nextUrl.searchParams.get("groupSize");

    if (groupSizeParam === null || groupSizeParam.trim() === "") {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Query parameter groupSize is required." },
        { status: 400 }
      );
    }

    const groupSize = Number(groupSizeParam);
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 10000) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "groupSize must be an integer between 1 and 10,000.",
        },
        { status: 400 }
      );
    }

    const cinema = await prisma.cinema.findUnique({ where: { id } });
    if (!cinema) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Cinema not found." },
        { status: 404 }
      );
    }

    const quote = calculateOptimalBundles(cinema.bundleSizes, groupSize);

    return NextResponse.json({
      cinema: {
        id: cinema.id,
        name: cinema.name,
        bundleSizes: [...cinema.bundleSizes].sort((a, b) => a - b),
      },
      ...quote,
    });
  } catch (error) {
    console.error("GET /api/cinemas/[id]/booking error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to calculate booking quote." },
      { status: 500 }
    );
  }
}