export interface MoviePrerequisiteSummary {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
}

export interface MovieItem {
  id: string;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  prerequisiteIds: string[];
  prerequisites: MoviePrerequisiteSummary[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RewatchPlanResponse {
  targetMovie: {
    id: string;
    title: string;
  };
  orderedMovies: {
    id: string;
    title: string;
    releaseYear: number;
    runtimeMinutes: number;
    watched: boolean;
    prerequisiteIds: string[];
  }[];
  totalCount: number;
  watchedCount: number;
  remainingRuntimeMinutes: number;
}

export interface CinemaItem {
  id: string;
  name: string;
  bundleSizes: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BundleBreakdownItem {
  bundleSize: number;
  count: number;
  subtotalSeats: number;
}

export interface BookingQuoteResponse {
  cinema: {
    id: string;
    name: string;
    bundleSizes: number[];
  };
  possible: boolean;
  groupSize: number;
  totalBundles: number;
  breakdown: BundleBreakdownItem[];
  message: string;
}