export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  adult: boolean;
  original_language: string;
  video: boolean;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbMovieDetail extends TmdbMovie {
  runtime: number | null;
  genres: TmdbGenre[];
  production_companies: TmdbProductionCompany[];
  status: string;
  tagline: string | null;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdb_id: string | null;
  spoken_languages: { english_name: string; iso_639_1: string; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string | null;
    backdrop_path: string | null;
  } | null;
}

export interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  original_name: string;
  character: string;
  profile_path: string | null;
  order: number;
  cast_id: number;
  credit_id: string;
  known_for_department: string;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  original_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  credit_id: string;
  known_for_department: string;
}

export interface TmdbCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbVideos {
  id: number;
  results: TmdbVideo[];
}

export type MovieCategory = 'trending' | 'popular' | 'top_rated' | 'upcoming' | 'now_playing';
