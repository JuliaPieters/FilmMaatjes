import { inject, Injectable } from '@angular/core';
import { MovieService } from '../../movies/services/movie.service';
import { LibraryEntry } from '../../../core/services/user-library.service';
import { TmdbMovie } from '../../../core/models/movie.model';

/** genreId -> preference score 0–100 */
export type GenreProfile = Record<number, number>;

export interface ScoredMovie {
  movie: TmdbMovie;
  total: number;
  reasons: string[];
}

/**
 * Pure scoring/matching algorithm for the Film Matcher, split out of
 * MatcherComponent so it can be reasoned about (and eventually tested)
 * without a component fixture. No Firestore/HTTP access of its own —
 * callers gather the input data, this only computes scores from it.
 */
@Injectable({ providedIn: 'root' })
export class MovieMatchingService {
  private readonly movieService = inject(MovieService);

  /**
   * Builds a genre preference profile from rated movies.
   * Score = (avg_rating/5 × 100) + volume bonus (max +30).
   * Genres rated below 3 on average score negatively and are excluded.
   */
  buildGenreProfile(library: LibraryEntry[]): GenreProfile {
    const genreRatings: Record<number, number[]> = {};
    for (const e of library) {
      for (const g of (e.movie.genre_ids ?? [])) {
        if (!genreRatings[g]) genreRatings[g] = [];
        genreRatings[g].push(e.rating);
      }
    }
    const profile: GenreProfile = {};
    for (const [gStr, ratings] of Object.entries(genreRatings)) {
      const g = Number(gStr);
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avg < 2.5) continue; // skip actively disliked genres
      const ratingComponent = (avg / 5) * 100;
      const volumeBonus = Math.min(30, Math.log2(ratings.length + 1) * 12);
      profile[g] = Math.min(100, ratingComponent + volumeBonus);
    }
    return profile;
  }

  /**
   * Computes a shared taste profile across all selected users.
   *
   * Empty profiles are ignored rather than being treated as "score 0",
   * which would otherwise collapse every genre when a friend has no
   * watch history.
   *
   * Aggregation: arithmetic mean of known scores, with a penalty when any
   * user actively dislikes the genre (score < 30).
   */
  computeSharedProfile(profiles: GenreProfile[]): GenreProfile {
    const validProfiles = profiles.filter(p => Object.keys(p).length >= 1);
    if (validProfiles.length === 0) return {};

    const allGenres = new Set<number>(validProfiles.flatMap(p => Object.keys(p).map(Number)));
    const shared: GenreProfile = {};

    for (const g of allGenres) {
      const knownScores = validProfiles.map(p => p[g] ?? 0);
      const avg = knownScores.reduce((a, b) => a + b, 0) / validProfiles.length;
      const minKnown = Math.min(...knownScores);

      // Penalise when the lowest-scoring user actively dislikes this genre
      const penalty = minKnown < 30 ? 0.5 + minKnown / 60 : 1.0;
      shared[g] = Math.min(100, avg * penalty);
    }

    return shared;
  }

  /**
   * Scores a candidate movie against the shared preference profile.
   *
   * Weights:
   *   40% Genre Match        — shared profile score for movie's genres
   *   25% Taste Similarity   — Jaccard overlap with my personally high-rated movies
   *   20% Watchlist Intent   — genre popularity in non-Gezien watchlists
   *   10% Popularity         — TMDB vote_average + vote_count (reliability signal)
   *    5% Novelty            — bonus when nobody has seen it
   *
   * When personal data is absent:
   *   - tasteScore falls back to 50 (neutral) rather than 0
   *   - genreScore still works via sharedProfile if friend data exists
   */
  scoreMovie(
    movie: TmdbMovie,
    sharedProfile: GenreProfile,
    myRated: LibraryEntry[],
    watchlistIds: Set<number>,
    watchlistGenreFreq: Record<number, number>,
    watchedIds: Set<number>,
  ): ScoredMovie {
    const genres = movie.genre_ids ?? [];

    // Genre Match (40%)
    const matchedGenres: number[] = [];
    let genreSum = 0;
    for (const g of genres) {
      const s = sharedProfile[g] ?? 0;
      if (s > 0) { genreSum += s; matchedGenres.push(g); }
    }
    const genreScore = genres.length > 0 ? Math.min(100, genreSum / genres.length) : 0;

    // Taste Similarity (25%) — Jaccard similarity to my personally rated movies
    // Neutral fallback of 50 when no personal rating data to avoid 0% scores
    const myFavs = myRated.filter(e => e.rating >= 4).slice(0, 30);
    let tasteSim = 0;
    for (const fav of myFavs) {
      const favGenres = fav.movie.genre_ids ?? [];
      const intersection = genres.filter(g => favGenres.includes(g)).length;
      const union = new Set([...genres, ...favGenres]).size;
      if (union > 0 && intersection > 0) {
        tasteSim += (intersection / union) * (fav.rating / 5);
      }
    }
    const tasteScore = myFavs.length > 0
      ? Math.min(100, (tasteSim / myFavs.length) * 300)
      : 50; // neutral when no personal ratings exist

    // Watchlist Intent (20%)
    let watchlistScore: number;
    if (watchlistIds.has(movie.id)) {
      watchlistScore = 100; // direct hit: someone already wants to see it
    } else {
      const genreMatches = genres.filter(g => (watchlistGenreFreq[g] ?? 0) > 0).length;
      watchlistScore = genres.length > 0 ? Math.min(85, (genreMatches / genres.length) * 85) : 0;
    }

    // Popularity Confidence (10%)
    const avgNorm = (movie.vote_average / 10) * 100;
    const countNorm = Math.min(100, (Math.log10(Math.max(1, movie.vote_count)) / Math.log10(500_000)) * 100);
    const popularityScore = avgNorm * 0.7 + countNorm * 0.3;

    // Novelty Bonus (5%)
    const noveltyScore = watchedIds.has(movie.id) ? 0 : 100;

    const total = (
      genreScore     * 0.40 +
      tasteScore     * 0.25 +
      watchlistScore * 0.20 +
      popularityScore * 0.10 +
      noveltyScore   * 0.05
    );

    // Dynamic reasons — generated from actual scoring data
    const reasons: string[] = [];
    if (matchedGenres.length > 0) {
      const names = matchedGenres.slice(0, 2).map(g => this.movieService.getGenreName(g) ?? 'dit genre').join(' & ');
      reasons.push(`Jullie houden allebei van ${names}`);
    }
    if (tasteSim > 0 && tasteScore >= 35) {
      reasons.push(`Past bij jullie eerdere kijkgedrag`);
    }
    if (movie.vote_average >= 7.5) {
      reasons.push(`Hoog beoordeeld (${movie.vote_average.toFixed(1)}⭐)`);
    }
    if (watchlistIds.has(movie.id)) {
      reasons.push(`Staat al op een van jullie lijsten`);
    }
    reasons.push(`Niemand heeft deze film nog gezien`);

    return { movie, total, reasons };
  }
}
