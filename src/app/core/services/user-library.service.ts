import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TmdbMovie } from '../models/movie.model';
import { AuthService } from '../../features/auth/services/auth.service';
import { WatchlistService } from '../../features/watchlists/services/watchlist.service';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LibraryEntry {
  movieId: number;
  movie: TmdbMovie;
  watched: boolean;
  watchedAt: string | null;
  rating: number;
  ratedAt: string | null;
}

interface RatingEntry {
  movieId: number;
  movie: TmdbMovie;
  rating: number;
  ratedAt: string | null;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class UserLibraryService {
  private readonly authService = inject(AuthService);
  private readonly watchlistService = inject(WatchlistService);

  private readonly _ratings = signal<Record<string, RatingEntry>>({});

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (!user) {
        this._ratings.set({});
        return;
      }
      this.loadRatings(user.id);
    });
  }

  private async loadRatings(userId: string): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'users', userId, 'ratings'));
      const ratings: Record<string, RatingEntry> = {};
      for (const d of snap.docs) {
        ratings[d.id] = d.data() as RatingEntry;
      }
      this._ratings.set(ratings);
    } catch {
      // keep prior state
    }
  }

  readonly watchedMovies = computed<LibraryEntry[]>(() => {
    const gezien = this.watchlistService.watchlists().find(wl => wl.name === 'Gezien');
    if (!gezien) return [];
    return (gezien.movies ?? [])
      .filter(m => m.movie)
      .map(m => ({
        movieId: m.movieId,
        movie: m.movie!,
        watched: true,
        watchedAt: m.addedAt,
        rating: this._ratings()[String(m.movieId)]?.rating ?? 0,
        ratedAt: this._ratings()[String(m.movieId)]?.ratedAt ?? null,
      }))
      .sort((a, b) => (b.watchedAt ?? '').localeCompare(a.watchedAt ?? ''));
  });

  readonly ratedMovies = computed<LibraryEntry[]>(() =>
    Object.values(this._ratings())
      .filter(v => v.rating > 0)
      .map(v => ({
        movieId: v.movieId,
        movie: v.movie,
        watched: this.isWatched(v.movieId),
        watchedAt: null,
        rating: v.rating,
        ratedAt: v.ratedAt,
      }))
      .sort((a, b) => (b.ratedAt ?? '').localeCompare(a.ratedAt ?? ''))
  );

  getTopGenres(options?: { minRating?: number; weighted?: boolean; limit?: number }): number[] {
    const minRating = options?.minRating ?? 0;
    const weighted = options?.weighted ?? false;
    const limit = options?.limit ?? 3;

    const rated = this.ratedMovies().filter(e => e.rating >= minRating);
    const counts: Record<number, number> = {};
    for (const entry of rated) {
      for (const genreId of (entry.movie.genre_ids ?? [])) {
        counts[genreId] = (counts[genreId] ?? 0) + (weighted ? entry.rating : 1);
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => Number(id));
  }

  isWatched(movieId: number): boolean {
    const gezien = this.watchlistService.watchlists().find(wl => wl.name === 'Gezien');
    return (gezien?.movies ?? []).some(m => m.movieId === movieId);
  }

  getRating(movieId: number): number {
    return this._ratings()[String(movieId)]?.rating ?? 0;
  }

  toggleWatched(movie: TmdbMovie): boolean {
    const newState = !this.isWatched(movie.id);
    const gezienList = this.watchlistService.watchlists().find(wl => wl.name === 'Gezien');
    if (gezienList) {
      if (newState) {
        this.watchlistService.addMovie(gezienList.id, movie).subscribe();
      } else {
        this.watchlistService.removeMovie(gezienList.id, movie.id).subscribe();
      }
    }
    return newState;
  }

  setRating(movie: TmdbMovie, rating: number): void {
    const user = this.authService.user();
    if (!user) return;
    const id = String(movie.id);
    const ratedAt = rating > 0 ? new Date().toISOString() : null;

    if (rating > 0) {
      this._ratings.update(r => ({ ...r, [id]: { movieId: movie.id, movie, rating, ratedAt, userId: user.id } }));
      setDoc(doc(db, 'users', user.id, 'ratings', id), { movieId: movie.id, movie, rating, ratedAt, userId: user.id }).catch(() => {
        this._ratings.update(r => { const n = { ...r }; delete n[id]; return n; });
      });
    } else {
      this._ratings.update(r => { const n = { ...r }; delete n[id]; return n; });
      deleteDoc(doc(db, 'users', user.id, 'ratings', id)).catch(() => {});
    }
  }
}
