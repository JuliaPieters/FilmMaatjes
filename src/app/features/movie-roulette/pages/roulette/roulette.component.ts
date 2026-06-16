import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MovieService } from '../../../movies/services/movie.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { FriendsService } from '../../../friends/services/friends.service';
import { UserLibraryService } from '../../../../core/services/user-library.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { TmdbMovie } from '../../../../core/models/movie.model';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

type RouletteMode = 'random' | 'watchlists' | 'recommended';

interface WatchlistWithOwner extends Watchlist {
  owner: string;
}

interface Genre {
  id: number;
  name: string;
}

@Component({
  selector: 'app-roulette',
  imports: [RouterLink, MatIcon, MatButton, MatSlider, MatSliderThumb, MatTab, MatTabGroup, FormsModule, DecimalPipe, LoadingSpinnerComponent],
  templateUrl: './roulette.component.html',
  styleUrl: './roulette.component.scss',
})
export class RouletteComponent implements OnInit {
  protected readonly movieService = inject(MovieService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly friendsService = inject(FriendsService);
  private readonly libraryService = inject(UserLibraryService);
  private readonly notifications = inject(NotificationService);

  protected readonly spinning = signal(false);
  protected readonly result = signal<TmdbMovie | null>(null);
  protected readonly showResult = signal(false);
  protected readonly spinCount = signal(0);

  // Mode
  protected readonly mode = signal<RouletteMode>('random');

  // Random mode filters
  protected readonly selectedGenreIds = signal<number[]>([]);
  protected readonly minRating = signal(0);
  protected readonly yearFrom = signal<number | null>(null);
  protected readonly yearTo = signal<number | null>(null);

  protected get minRatingValue(): number { return this.minRating(); }
  protected set minRatingValue(v: number) { this.minRating.set(v); }

  protected readonly hasApiKey = this.movieService.hasApiKey();

  protected readonly genres: Genre[] = [
    { id: 28, name: 'Actie' },
    { id: 12, name: 'Avontuur' },
    { id: 16, name: 'Animatie' },
    { id: 35, name: 'Komedie' },
    { id: 80, name: 'Misdaad' },
    { id: 18, name: 'Drama' },
    { id: 14, name: 'Fantasy' },
    { id: 27, name: 'Horror' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romantiek' },
    { id: 878, name: 'Sci-Fi' },
    { id: 53, name: 'Thriller' },
  ];

  protected readonly decadeOptions = [
    { label: 'Alle jaren', from: undefined, to: undefined },
    { label: '2020s', from: 2020, to: 2029 },
    { label: '2010s', from: 2010, to: 2019 },
    { label: '2000s', from: 2000, to: 2009 },
    { label: '1990s', from: 1990, to: 1999 },
    { label: '1980s', from: 1980, to: 1989 },
  ];

  // Watchlist mode
  protected readonly selectedWatchlistIds = signal<Set<string>>(new Set());

  protected readonly availableWatchlists = computed<WatchlistWithOwner[]>(() => {
    const own = this.watchlistService.watchlists()
      .filter(wl => wl.name !== 'Gezien')
      .map(wl => ({ ...wl, owner: 'Jij' }));
    const friends = this.friendsService.friends();
    const friendLists = friends.flatMap(f =>
      this.watchlistService.getWatchlistsForUser(f.id)
        .filter(wl => wl.name !== 'Gezien')
        .map(wl => ({ ...wl, owner: f.displayName })),
    );
    return [...own, ...friendLists];
  });

  protected readonly ownWatchlists = computed(() =>
    this.availableWatchlists().filter(wl => wl.owner === 'Jij'),
  );

  protected readonly friendGroups = computed(() => {
    const groups = new Map<string, WatchlistWithOwner[]>();
    for (const wl of this.availableWatchlists().filter(wl => wl.owner !== 'Jij')) {
      if (!groups.has(wl.owner)) groups.set(wl.owner, []);
      groups.get(wl.owner)!.push(wl);
    }
    return Array.from(groups.entries()).map(([owner, watchlists]) => ({ owner, watchlists }));
  });

  protected readonly selectedMovies = computed(() => {
    const ids = this.selectedWatchlistIds();
    if (ids.size === 0) return [];
    const all = this.availableWatchlists()
      .filter(wl => ids.has(wl.id))
      .flatMap(wl => (wl.movies ?? []).filter(m => m.movie?.poster_path));
    const seen = new Set<number>();
    return all.filter(m => {
      if (seen.has(m.movieId)) return false;
      seen.add(m.movieId);
      return true;
    });
  });

  // Recommended mode
  protected readonly topGenreIds = computed(() => {
    const rated = this.libraryService.ratedMovies().filter(e => e.rating >= 4);
    const counts: Record<number, number> = {};
    for (const entry of rated) {
      for (const gId of (entry.movie.genre_ids ?? [])) {
        counts[gId] = (counts[gId] ?? 0) + entry.rating;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([id]) => Number(id));
  });

  protected readonly topGenreNames = computed(() =>
    this.topGenreIds()
      .map(id => this.genres.find(g => g.id === id)?.name ?? `Genre ${id}`)
      .filter(Boolean),
  );

  constructor() {
    effect(() => {
      const friends = this.friendsService.friends();
      for (const f of friends) {
        this.watchlistService.loadFriendWatchlists(f.id).subscribe();
      }
    });
  }

  ngOnInit(): void {
    this.watchlistService.getMyWatchlists().subscribe();
  }

  protected movieCount(wl: WatchlistWithOwner): number {
    return (wl.movies ?? []).length || wl._count?.movies || 0;
  }

  protected selectedCountForGroup(watchlists: WatchlistWithOwner[]): number {
    const ids = this.selectedWatchlistIds();
    return watchlists.filter(wl => ids.has(wl.id)).length;
  }

  protected selectAllInGroup(watchlists: WatchlistWithOwner[]): void {
    this.selectedWatchlistIds.update(prev => {
      const next = new Set(prev);
      watchlists.forEach(wl => next.add(wl.id));
      return next;
    });
  }

  protected setMode(m: RouletteMode): void {
    this.mode.set(m);
    this.showResult.set(false);
    this.result.set(null);
  }

  protected spin(): void {
    if (this.spinning()) return;
    switch (this.mode()) {
      case 'watchlists': this.spinFromWatchlists(); break;
      case 'recommended': this.spinRecommended(); break;
      default: this.spinRandom(); break;
    }
  }

  private spinRandom(): void {
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);
    this.spinCount.update(n => n + 1);

    this.movieService.discoverRandom({
      genreIds: this.selectedGenreIds(),
      minRating: this.minRating() > 0 ? this.minRating() : undefined,
      yearFrom: this.yearFrom() ?? undefined,
      yearTo: this.yearTo() ?? undefined,
    }).subscribe({
      next: page => {
        const movies = page.results.filter(m => m.poster_path);
        if (movies.length === 0) { this.spinning.set(false); return; }
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setTimeout(() => { this.result.set(pick); this.spinning.set(false); this.showResult.set(true); }, 2000);
      },
      error: () => this.spinning.set(false),
    });
  }

  private spinFromWatchlists(): void {
    const movies = this.selectedMovies();
    if (movies.length === 0) {
      this.notifications.info('Selecteer een watchlist met films om te draaien.');
      return;
    }
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);
    this.spinCount.update(n => n + 1);
    const entry = movies[Math.floor(Math.random() * movies.length)];
    setTimeout(() => { this.result.set(entry.movie!); this.spinning.set(false); this.showResult.set(true); }, 2000);
  }

  private spinRecommended(): void {
    const genres = this.topGenreIds();
    if (genres.length === 0) {
      this.notifications.info('Beoordeel minstens één film met 4 sterren of meer voor aanbevelingen.');
      return;
    }
    this.spinning.set(true);
    this.showResult.set(false);
    this.result.set(null);
    this.spinCount.update(n => n + 1);

    this.movieService.discoverRandom({ genreIds: genres, minRating: 6 }).subscribe({
      next: page => {
        const movies = page.results.filter(m => m.poster_path);
        if (movies.length === 0) { this.spinning.set(false); return; }
        const pick = movies[Math.floor(Math.random() * movies.length)];
        setTimeout(() => { this.result.set(pick); this.spinning.set(false); this.showResult.set(true); }, 2000);
      },
      error: () => this.spinning.set(false),
    });
  }

  protected toggleWatchlist(id: string): void {
    this.selectedWatchlistIds.update(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  protected isWatchlistSelected(id: string): boolean {
    return this.selectedWatchlistIds().has(id);
  }

  protected selectAllWatchlists(): void {
    this.selectedWatchlistIds.set(new Set(this.availableWatchlists().map(wl => wl.id)));
  }

  protected toggleGenre(genreId: number): void {
    this.selectedGenreIds.update(ids =>
      ids.includes(genreId) ? ids.filter(id => id !== genreId) : [...ids, genreId],
    );
  }

  protected isGenreSelected(genreId: number): boolean {
    return this.selectedGenreIds().includes(genreId);
  }

  protected setDecade(option: { from?: number; to?: number }): void {
    this.yearFrom.set(option.from ?? null);
    this.yearTo.set(option.to ?? null);
  }

  protected clearFilters(): void {
    this.selectedGenreIds.set([]);
    this.minRating.set(0);
    this.yearFrom.set(null);
    this.yearTo.set(null);
  }

  protected spinAgain(): void {
    this.spin();
  }
}
