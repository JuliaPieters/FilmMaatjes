import { TmdbMovie } from './movie.model';

export interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  movies: WatchlistMovie[];
  _count?: { movies: number };
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistMovie {
  id: string;
  watchlistId: string;
  movieId: number;
  movie?: TmdbMovie;
  addedAt: string;
  watched: boolean;
  watchedAt: string | null;
  userRating: number | null;
  notes: string | null;
}

export interface CreateWatchlistDto {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateWatchlistDto {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddToWatchlistDto {
  movieId: number;
}
