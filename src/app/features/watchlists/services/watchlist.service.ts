import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { Watchlist, CreateWatchlistDto, WatchlistMovie } from '../../../core/models/watchlist.model';
import { TmdbMovie } from '../../../core/models/movie.model';
import { AuthService } from '../../../features/auth/services/auth.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly _watchlists = signal<Watchlist[]>([]);
  readonly watchlists = this._watchlists.asReadonly();

  private readonly _friendWatchlists = signal<Map<string, Watchlist[]>>(new Map());
  readonly friendWatchlists = this._friendWatchlists.asReadonly();

  constructor() {
    const authService = inject(AuthService);
    effect(() => {
      const user = authService.user();
      if (user) {
        this.getMyWatchlists().subscribe();
      } else {
        this._watchlists.set([]);
        this._friendWatchlists.set(new Map());
      }
    });
  }

  getMyWatchlists(): Observable<Watchlist[]> {
    return this.http.get<Watchlist[]>(`${this.apiUrl}/watchlists`).pipe(
      tap(lists => this._watchlists.set(lists)),
      catchError(() => of(this._watchlists())),
    );
  }

  loadFriendWatchlists(userId: string): Observable<Watchlist[]> {
    return this.http.get<Watchlist[]>(`${this.apiUrl}/watchlists/user/${userId}`).pipe(
      tap(lists => {
        this._friendWatchlists.update(prev => {
          const next = new Map(prev);
          next.set(userId, lists);
          return next;
        });
      }),
      catchError(() => of([])),
    );
  }

  getWatchlistsForUser(userId: string): Watchlist[] {
    return this._friendWatchlists().get(userId) ?? [];
  }

  create(dto: CreateWatchlistDto): Observable<Watchlist> {
    return this.http.post<Watchlist>(`${this.apiUrl}/watchlists`, dto).pipe(
      tap(list => this._watchlists.update(prev => [...prev, list])),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/watchlists/${id}`).pipe(
      tap(() => this._watchlists.update(prev => prev.filter(w => w.id !== id))),
    );
  }

  addMovie(watchlistId: string, movie: TmdbMovie): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/watchlists/${watchlistId}/movies`, { movieId: movie.id, movie }).pipe(
      tap(() => {
        this._watchlists.update(prev => prev.map(wl => {
          if (wl.id !== watchlistId || (wl.movies ?? []).some(m => m.movieId === movie.id)) return wl;
          return {
            ...wl,
            movies: [...(wl.movies ?? []), this.movieEntry(watchlistId, movie)],
            _count: { movies: (wl._count?.movies ?? 0) + 1 },
          };
        }));
      }),
    );
  }

  removeMovie(watchlistId: string, movieId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/watchlists/${watchlistId}/movies/${movieId}`).pipe(
      tap(() => {
        this._watchlists.update(prev => prev.map(wl => {
          if (wl.id !== watchlistId) return wl;
          return {
            ...wl,
            movies: (wl.movies ?? []).filter(m => m.movieId !== movieId),
            _count: { movies: Math.max(0, (wl._count?.movies ?? 0) - 1) },
          };
        }));
      }),
    );
  }

  isMovieInWatchlist(watchlistId: string, movieId: number): boolean {
    return this._watchlists().find(wl => wl.id === watchlistId)?.movies?.some(m => m.movieId === movieId) ?? false;
  }

  isMovieInAnyWatchlist(movieId: number): boolean {
    return this._watchlists().some(wl => (wl.movies ?? []).some(m => m.movieId === movieId));
  }

  private movieEntry(watchlistId: string, movie: TmdbMovie): WatchlistMovie {
    return {
      id: `wlm-${Date.now()}-${movie.id}`,
      watchlistId,
      movieId: movie.id,
      movie,
      addedAt: new Date().toISOString(),
      watched: false,
      watchedAt: null,
      userRating: null,
      notes: null,
    };
  }
}
