import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding Doomsday Ready database...");

  // 1. Upsert the 8 sample MCU movies first (without prerequisites)
  const moviesData = [
    { title: "Iron Man", releaseYear: 2008, runtimeMinutes: 126, watched: false },
    { title: "Captain America: The First Avenger", releaseYear: 2011, runtimeMinutes: 124, watched: false },
    { title: "The Avengers", releaseYear: 2012, runtimeMinutes: 143, watched: false },
    { title: "Captain America: Civil War", releaseYear: 2016, runtimeMinutes: 147, watched: false },
    { title: "Thor: Ragnarok", releaseYear: 2017, runtimeMinutes: 130, watched: false },
    { title: "Avengers: Infinity War", releaseYear: 2018, runtimeMinutes: 149, watched: false },
    { title: "Avengers: Endgame", releaseYear: 2019, runtimeMinutes: 181, watched: false },
    { title: "Avengers: Doomsday", releaseYear: 2026, runtimeMinutes: 165, watched: false },
  ];

  const movieMap = new Map<string, string>();

  for (const movie of moviesData) {
    const record = await prisma.movie.upsert({
      where: { title: movie.title },
      update: {},
      create: movie,
    });
    movieMap.set(movie.title, record.id);
  }

  // 2. Wire up the sample prerequisite graph from the specification
  const prerequisitesMap: Record<string, string[]> = {
    "Iron Man": [],
    "Captain America: The First Avenger": [],
    "The Avengers": ["Iron Man", "Captain America: The First Avenger"],
    "Captain America: Civil War": ["The Avengers"],
    "Thor: Ragnarok": [],
    "Avengers: Infinity War": ["Captain America: Civil War", "Thor: Ragnarok"],
    "Avengers: Endgame": ["Avengers: Infinity War"],
    "Avengers: Doomsday": ["Avengers: Endgame"],
  };

  for (const [title, prereqTitles] of Object.entries(prerequisitesMap)) {
    const movieId = movieMap.get(title)!;
    const prereqIds = prereqTitles.map((prereqTitle) => ({
      id: movieMap.get(prereqTitle)!,
    }));

    await prisma.movie.update({
      where: { id: movieId },
      data: {
        prerequisites: {
          set: prereqIds,
        },
      },
    });
  }

  // 3. Upsert sample cinemas matching all Feature 2 test cases
  const cinemasData = [
    { name: "IMAX Multiverse Lounge", bundleSizes: [1, 3, 4] },
    { name: "Starlight Premiere Hall", bundleSizes: [2, 5] },
    { name: "Stark Tower VIP Theater", bundleSizes: [6, 9, 20] },
    { name: "Asgard Royal Screen", bundleSizes: [4, 6] },
  ];

  for (const cinema of cinemasData) {
    await prisma.cinema.upsert({
      where: { name: cinema.name },
      update: { bundleSizes: cinema.bundleSizes },
      create: cinema,
    });
  }

  console.log("Seed completed: 8 MCU movies and 4 cinemas ready.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });