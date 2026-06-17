import { User } from './user.model';

export interface Review {
  id: string;
  userId: string;
  movieId: number;
  movieTitle?: string;
  moviePosterPath?: string | null;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
  likesCount?: number;
  likedByCurrentUser?: boolean;
}

export interface CreateReviewDto {
  movieId: number;
  movieTitle?: string;
  moviePosterPath?: string | null;
  rating: number;
  content: string;
}

export interface UpdateReviewDto {
  rating?: number;
  content?: string;
}

export interface UserMovieStatus {
  watched: boolean;
  watchedAt: string | null;
  userRating: number | null;
  inWatchlists: string[];
  review: Review | null;
}
