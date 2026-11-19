import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cinemas = await prisma.cinema.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      cinemas: cinemas.map((cinema) => ({
        ...cinema,
        bundleSizes: [...cinema.bundleSizes].sort((a, b) => a - b),
      })),
    });
  } catch (error) {
    console.error("GET /api/cinemas error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch cinemas." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "Cinema name is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.bundleSizes)) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", message: "bundleSizes must be an array of integers." },
        { status: 400 }
      );
    }

    const rawSizes: number[] = (body.bundleSizes as unknown[]).map((item) =>
      Number(item)
    );
    if (rawSizes.some((size) => !Number.isInteger(size) || size < 1 || size > 500)) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Each bundle size must be an integer between 1 and 500.",
        },
        { status: 400 }
      );
    }

    const uniqueSortedSizes: number[] = Array.from(new Set<number>(rawSizes)).sort(
      (a, b) => a - b
    );

    if (uniqueSortedSizes.length < 1 || uniqueSortedSizes.length > 10) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "A cinema must have between 1 and 10 distinct bundle sizes.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.cinema.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: "DUPLICATE_NAME", message: `A cinema named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const cinema = await prisma.cinema.create({
      data: {
        name,
        bundleSizes: uniqueSortedSizes,
      },
    });

    return NextResponse.json({ cinema }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cinemas error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to create cinema." },
      { status: 500 }
    );
  }
}