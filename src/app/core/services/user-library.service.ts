import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TmdbMovie } from '../models/movie.model';
import { StorageService } from './storage.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { WatchlistService } from '../../features/watchlists/services/watchlist.service';

export interface LibraryEntry {
  movieId: number;
  movie: TmdbMovie;
  watched: boolean;
  watchedAt: string | null;
  rating: number;
  ratedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserLibraryService {
  private readonly storage = inject(StorageService);
  private readonly authService = inject(AuthService);
  private readonly watchlistService = inject(WatchlistService);

  private readonly _data = signal<Record<string, LibraryEntry>>({});

  constructor() {
    effect(() => {
      const user = this.authService.user();
      const key = user ? `user_library_${user.id}` : null;
      if (!key) {
        this._data.set({});
        return;
      }
      let data = this.storage.get<Record<string, LibraryEntry>>(key);
      // Migrate from old shared key on first login
      if (!data) {
        const old = this.storage.get<Record<string, LibraryEntry>>('user_library');
        if (old && Object.keys(old).length > 0) {
          data = old;
          this.storage.set(key, data);
        }
      }
      this._data.set(data ?? {});
    });
  }

  private get storageKey(): string {
    const user = this.authService.user();
    return user ? `user_library_${user.id}` : 'user_library_guest';
  }

  readonly watchedMovies = computed(() =>
    Object.values(this._data())
      .filter(e => e.watched)
      .sort((a, b) => (b.watchedAt ?? '').localeCompare(a.watchedAt ?? '')),
  );

  readonly ratedMovies = computed(() =>
    Object.values(this._data())
      .filter(e => e.rating > 0)
      .sort((a, b) => (b.ratedAt ?? '').localeCompare(a.ratedAt ?? '')),
  );

  isWatched(movieId: number): boolean {
    return this._data()[String(movieId)]?.watched ?? false;
  }

  getRating(movieId: number): number {
    return this._data()[String(movieId)]?.rating ?? 0;
  }

  toggleWatched(movie: TmdbMovie): boolean {
    const id = String(movie.id);
    let newState = false;
    this._data.update(data => {
      const existing = data[id] ?? this.blank(movie);
      newState = !existing.watched;
      const updated: LibraryEntry = {
        ...existing,
        watched: newState,
        watchedAt: newState ? new Date().toISOString() : null,
      };
      const next = { ...data, [id]: updated };
      this.storage.set(this.storageKey, next);
      return next;
    });

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
    const id = String(movie.id);
    this._data.update(data => {
      const existing = data[id] ?? this.blank(movie);
      const updated: LibraryEntry = {
        ...existing,
        rating,
        ratedAt: rating > 0 ? new Date().toISOString() : null,
      };
      const next = { ...data, [id]: updated };
      this.storage.set(this.storageKey, next);
      return next;
    });
  }

  private blank(movie: TmdbMovie): LibraryEntry {
    return { movieId: movie.id, movie, watched: false, watchedAt: null, rating: 0, ratedAt: null };
  }
}
