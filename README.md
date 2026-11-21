<div align="center">
  <img src="./public/logo.png" alt="Doomsday Ready logo" width="120" />
  <h1>Doomsday Ready</h1>
</div>

**Blinto Talent Accelerator 2027 — Full-Stack Developer Internship Assessment**

A full-stack Next.js, TypeScript, Prisma, and PostgreSQL web application designed to help MCU fans compute valid chronological prerequisite rewatch orders before *Avengers: Doomsday* and solve exact-match opening-night watch-party seat bundle allocations.

- **Live Deployment:** [https://doomsday-ready-2026.vercel.app](https://doomsday-ready-2026.vercel.app)
- **GitHub Repository:** [https://github.com/uzicodes/Doomsday-Ready](https://github.com/uzicodes/Doomsday-Ready)

---

<h2 style="color: yellow;">Core Capabilities</h2>

### 1. MCU Prerequisite Rewatch Planner (Custom DAG Engine)
- **Catalog Management:** Manage movies with unique titles, release years, runtimes (`1–300` min), watched status, and prerequisite dependencies.
- **Cycle Detection (`409 CIRCULAR_DEPENDENCY`):** Custom 3-color DFS validation rejects direct self-loops (`A -> A`) and indirect cycles (`A -> B -> C -> A`) on `POST` and `PATCH`.
- **Topological Rewatch Order:** Custom post-order DFS computes the ordered prerequisite sequence before any target film (excluding the target itself), along with watched progress and remaining runtime.

### 2. Opening-Night Watch-Party Bundle Solver (Custom Bottom-Up DP)
- **Cinema Configuration:** Register theaters with unique names and `1–10` distinct seat bundle sizes (`1–500` seats each).
- **Exact-Match Optimization:** Custom Bottom-Up DP solver (`O(groupSize × K)` time, `O(groupSize)` space) finds the minimum bundles needed for an exact `groupSize` (`1–10,000`) with zero leftover seats, or returns `"Not possible"`.

### 3. 3-View Tactical Briefing & IMAX Box-Office UI
- **01 // Catalog:** Add movies, filter and assign prerequisites, toggle watched status, and edit dependencies inline with `409 CIRCULAR_DEPENDENCY` alerts.
- **02 // Rewatch Protocol:** Pick a target movie, track progress via a segmented bar and remaining runtime telemetry, and check off prerequisites in watch order.
- **03 // Premiere Booking:** Select a cinema, enter a group size (`1–10,000`), inspect itemized ticket-stub bundle breakdowns, or register new cinemas.
---

<h2 style="color: yellow;">Tech Stack</h2>

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) & React 19 |
| **Language** | TypeScript (Strict Mode) |
| **Styling & Fonts** | Tailwind CSS v4, Space Grotesk, Inter, JetBrains Mono |
| **ORM & Database** | Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL (Local / Neon) |
| **Testing** | Vitest (11 unit tests covering DAG traversal, cycle detection & DP solver) |
| **Deployment** | Vercel + Neon Serverless PostgreSQL |

---

## Data Model Diagram

```mermaid
erDiagram
    MOVIE {
        string id PK "cuid()"
        string title UK "Unique movie title"
        int releaseYear "Release year"
        int runtimeMinutes "1 to 300 minutes"
        boolean watched "Default: false"
        datetime createdAt
        datetime updatedAt
    }

    MOVIE_PREREQUISITES {
        string A FK "Dependent Movie ID"
        string B FK "Prerequisite Movie ID"
    }

    CINEMA {
        string id PK "cuid()"
        string name UK "Unique cinema name"
        int[] bundleSizes "1 to 10 distinct sizes (1..500)"
        datetime createdAt
        datetime updatedAt
    }

    MOVIE ||--o{ MOVIE_PREREQUISITES : "depends on"
    MOVIE ||--o{ MOVIE_PREREQUISITES : "prerequisite for"
```

---

<h2 style="color: yellow;">Project Structure</h2>

```text
doomsday-ready/
├── prisma/
│   ├── migrations/              
│   ├── schema.prisma            
│   └── seed.ts                  
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── cinemas/
│   │   │   │   ├── route.ts                     
│   │   │   │   └── [id]/booking/route.ts        
│   │   │   └── movies/
│   │   │       ├── route.ts                     
│   │   │       └── [id]/
│   │   │           ├── route.ts                 
│   │   │           └── rewatch-order/route.ts   
│   │   ├── globals.css          
│   │   ├── layout.tsx           
│   │   └── page.tsx            
│   ├── components/
│   │   ├── MoviesView.tsx       
│   │   ├── RewatchPlanView.tsx  
│   │   └── BookingView.tsx      
│   ├── lib/
│   │   ├── algorithms/
│   │   │   ├── rewatch.ts       
│   │   │   └── booking.ts       
│   │   ├── movie-helpers.ts     
│   │   └── prisma.ts            
│   └── types/
│       └── index.ts             
├── tests/
│   ├── rewatch.test.ts          
│   └── booking.test.ts          
├── prisma.config.ts             
└── package.json
```

---

<h2 style="color: yellow;">Quick Start (Docker Compose)</h2>

Spin up PostgreSQL, apply Prisma migrations, seed the 8 sample MCU movies and 4 cinemas, and launch the application on [http://localhost:3000](http://localhost:3000) with a single command:

```bash
docker compose up --build
```

To stop the containers while preserving your PostgreSQL database volume:



```
docker compose down
```

<h2 style="color: yellow;">Local Development Setup</h2>

### Prerequisites
- **Node.js** 20 or higher
- **PostgreSQL** 15 or higher (local instance or Neon cloud database)

### 1. Clone & Install Dependencies
```bash
git clone [https://github.com/uzicodes/doomsday-ready.git](https://github.com/uzicodes/doomsday-ready.git)
cd doomsday-ready
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your PostgreSQL connection string:
```bash
cp .env.example .env
```
Example `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/doomsday_ready?schema=public"
```

### 3. Generate Prisma Client, Apply Migrations & Seed Data
```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```
This populates the database with **8 sample MCU movies** (*Iron Man* through *Avengers: Doomsday*) and **4 sample cinemas** with distinct bundle configurations.

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Unit Tests & Type Checking
```bash
npx vitest run
npx tsc --noEmit
```

---

<h2 style="color: yellow;">REST API Reference</h2>

### Movies & Rewatch Endpoints

| Method & Path | Description | Key Status Codes |
| :--- | :--- | :--- |
| `GET /api/movies` | Retrieve all movies with normalized prerequisite IDs and metadata | `200 OK` |
| `POST /api/movies` | Create a new movie with optional `prerequisiteIds` | `201 Created`, `400 Validation`, `409 Duplicate / Cycle` |
| `PATCH /api/movies/:id` | Update `watched`, `prerequisiteIds`, `title`, `releaseYear`, or `runtimeMinutes` | `200 OK`, `400 Validation`, `404 Not Found`, `409 Circular Dependency` |
| `GET /api/movies/:id/rewatch-order` | Compute topological rewatch list (excluding target), `watchedCount`, and `remainingRuntimeMinutes` | `200 OK`, `404 Not Found`, `409 Circular Dependency` |




---

<h2 style="color: yellow;">Architectural &amp; Design Choices</h2>

- **Zero External Algorithm Libraries:** Both Feature 1 (`src/lib/algorithms/rewatch.ts`) and Feature 2 (`src/lib/algorithms/booking.ts`) were written from scratch in pure TypeScript without external graph or optimization solvers.
- **Why Bottom-Up DP Over Greedy:** Greedy seat allocation fails on common bundle sets (for example, bundles `[1, 3, 4]` with `groupSize = 6` yields `4 + 1 + 1 = 3` bundles greedily, whereas Bottom-Up DP finds the true optimum `3 + 3 = 2` bundles). Using a safe sentinel (`groupSize + 1`) inside a typed `Int32Array` avoids 32-bit integer overflow and solves `groupSize = 10,000` in under 1 ms.
- **Deterministic Tie-Breaking:**
  - In **Rewatch Order**, independent prerequisite branches (such as *Iron Man* and *Captain America: The First Avenger*) are sorted deterministically by `releaseYear` ascending, then `title` alphabetically.
  - In **Watch-Party Booking**, bundle sizes are evaluated descending so ties between equal minimum bundle counts deterministically prefer larger bundles first.
- **Idempotent Database Seeding:** `prisma/seed.ts` uses `upsert` operations so running `npx prisma db seed` multiple times safely refreshes sample data without creating duplicate records.

---

<h2 style="color: yellow;">AI Tools Usage Disclosure</h2>

In accordance with the assessment guidelines:
- **Tools Used:** Google Gemini and Claude (web and IDE coding assistants).
- **How They Were Used:**
  - Scaffolded Next.js 16 App Router boilerplate and REST API route handlers.
  - Structured Prisma 7 schema relations and `@prisma/adapter-pg` database connection pooling.
  - Designed and refined the custom dark tactical UI theme and responsive layouts across all three views.
  - Assisted in diagnosing and resolving TypeScript build errors (`prisma generate` pipeline) for Vercel deployment.
  - Core graph traversal, cycle detection, and dynamic programming algorithms were authored, tested, and verified directly in this repository.
  - Generated Vitest unit test suites and PowerShell API stress scripts to verify edge-case coverage (diamond DAGs, indirect cycles, and DP boundary inputs).
