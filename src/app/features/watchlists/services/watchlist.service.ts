import { effect, inject, Injectable, signal } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, setDoc,
} from 'firebase/firestore';
import { Watchlist, CreateWatchlistDto, WatchlistMovie } from '../../../core/models/watchlist.model';
import { TmdbMovie } from '../../../core/models/movie.model';
import { AuthService } from '../../../features/auth/services/auth.service';
import { db } from '../../../core/firebase';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly authService = inject(AuthService);

  private readonly _watchlists = signal<Watchlist[]>([]);
  readonly watchlists = this._watchlists.asReadonly();

  private readonly _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  private readonly _friendWatchlists = signal<Map<string, Watchlist[]>>(new Map());
  readonly friendWatchlists = this._friendWatchlists.asReadonly();

  constructor() {
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.loadAll(user.id);
      } else {
        this._watchlists.set([]);
        this._friendWatchlists.set(new Map());
      }
      this._loaded.set(true);
    }, { allowSignalWrites: true });
  }

  private async loadAll(userId: string): Promise<void> {
    try {
      const snap = await getDocs(query(collection(db, 'watchlists'), where('userId', '==', userId)));

      let docs = snap.docs;
      if (snap.empty) {
        await this.createDefaults(userId);
        const newSnap = await getDocs(query(collection(db, 'watchlists'), where('userId', '==', userId)));
        docs = newSnap.docs;
      }

      const watchlists = await Promise.all(docs.map(async d => {
        const moviesSnap = await getDocs(collection(db, 'watchlists', d.id, 'movies'));
        const movies: WatchlistMovie[] = moviesSnap.docs.map(m => ({ id: m.id, ...m.data() } as WatchlistMovie));
        return { id: d.id, ...d.data(), movies } as Watchlist;
      }));
      this._watchlists.set(watchlists);
    } catch (err) {
      console.error('[WatchlistService] loadAll failed:', err);
    }
  }

  private async createDefaults(userId: string): Promise<void> {
    const now = new Date().toISOString();
    const defaults = [
      { name: 'Wil ik zien', description: 'Films die ik wil kijken', isPublic: false },
      { name: 'Aan het kijken', description: 'Films waar ik mee bezig ben', isPublic: false },
      { name: 'Gezien', description: 'Films die ik heb gezien', isPublic: false },
    ];
    await Promise.all(defaults.map(d => addDoc(collection(db, 'watchlists'), {
      ...d,
      userId,
      createdAt: now,
      updatedAt: now,
      _count: { movies: 0 },
    })));
  }

  getMyWatchlists(): Observable<Watchlist[]> {
    const user = this.authService.user();
    if (!user) return of([]);
    return from(this.loadAll(user.id)).pipe(
      map(() => this._watchlists()),
      catchError(() => of(this._watchlists())),
    );
  }

  loadFriendWatchlists(userId: string): Observable<Watchlist[]> {
    return from(
      getDocs(query(
        collection(db, 'watchlists'),
        where('userId', '==', userId),
        where('isPublic', '==', true),
      )).then(snap =>
        Promise.all(snap.docs.map(async d => {
          const moviesSnap = await getDocs(collection(db, 'watchlists', d.id, 'movies'));
          const movies: WatchlistMovie[] = moviesSnap.docs.map(m => ({ id: m.id, ...m.data() } as WatchlistMovie));
          return { id: d.id, ...d.data(), movies } as Watchlist;
        }))
      )
    ).pipe(
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
    const user = this.authService.user();
    if (!user) return of({} as Watchlist);

    const now = new Date().toISOString();
    const data = {
      name: dto.name,
      description: dto.description ?? null,
      isPublic: dto.isPublic ?? false,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
      _count: { movies: 0 },
    };

    return from(addDoc(collection(db, 'watchlists'), data)).pipe(
      map(ref => ({ id: ref.id, ...data, movies: [] } as Watchlist)),
      tap(wl => this._watchlists.update(prev => [...prev, wl])),
      catchError(() => of({} as Watchlist)),
    );
  }

  delete(id: string): Observable<void> {
    return from(
      getDocs(collection(db, 'watchlists', id, 'movies')).then(async snap => {
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
        await deleteDoc(doc(db, 'watchlists', id));
      })
    ).pipe(
      tap(() => this._watchlists.update(prev => prev.filter(w => w.id !== id))),
      catchError(() => of(undefined as void)),
    );
  }

  addMovie(watchlistId: string, movie: TmdbMovie): Observable<void> {
    const entry: Omit<WatchlistMovie, 'id'> = {
      watchlistId,
      movieId: movie.id,
      movie: {
        id: movie.id,
        title: movie.title,
        original_title: movie.original_title ?? movie.title,
        poster_path: movie.poster_path ?? null,
        backdrop_path: movie.backdrop_path ?? null,
        overview: movie.overview ?? '',
        release_date: movie.release_date ?? '',
        vote_average: movie.vote_average ?? 0,
        vote_count: movie.vote_count ?? 0,
        genre_ids: movie.genre_ids ?? [],
        popularity: movie.popularity ?? 0,
        adult: movie.adult ?? false,
        original_language: movie.original_language ?? 'en',
        video: movie.video ?? false,
      },
      addedAt: new Date().toISOString(),
      watched: false,
      watchedAt: null,
      userRating: null,
      notes: null,
    };

    return from(setDoc(doc(db, 'watchlists', watchlistId, 'movies', String(movie.id)), entry)).pipe(
      tap(() => {
        this._watchlists.update(prev => prev.map(wl => {
          if (wl.id !== watchlistId || (wl.movies ?? []).some(m => m.movieId === movie.id)) return wl;
          return {
            ...wl,
            movies: [...(wl.movies ?? []), { id: String(movie.id), ...entry }],
            _count: { movies: (wl._count?.movies ?? 0) + 1 },
          };
        }));
      }),
      catchError(() => of(undefined as void)),
    );
  }

  removeMovie(watchlistId: string, movieId: number): Observable<void> {
    return from(deleteDoc(doc(db, 'watchlists', watchlistId, 'movies', String(movieId)))).pipe(
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
      catchError(() => of(undefined as void)),
    );
  }

  isMovieInWatchlist(watchlistId: string, movieId: number): boolean {
    return this._watchlists().find(wl => wl.id === watchlistId)?.movies?.some(m => m.movieId === movieId) ?? false;
  }

  isMovieInAnyWatchlist(movieId: number): boolean {
    return this._watchlists().some(wl => (wl.movies ?? []).some(m => m.movieId === movieId));
  }
}
