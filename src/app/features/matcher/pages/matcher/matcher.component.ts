import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MovieService } from '../../../movies/services/movie.service';
import { FriendsService } from '../../../friends/services/friends.service';
import { UserLibraryService, LibraryEntry } from '../../../../core/services/user-library.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { AuthService } from '../../../auth/services/auth.service';
import { TmdbMovie } from '../../../../core/models/movie.model';
import { User } from '../../../../core/models/user.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

interface MatchResult {
  type: 'best' | 'random' | 'safe' | 'wildcard';
  label: string;
  icon: string;
  movie: TmdbMovie;
  matchScore: number;
  reasons: string[];
}

const GENRE_NAMES: Record<number, string> = {
  28: 'Actie', 12: 'Avontuur', 16: 'Animatie', 35: 'Komedie', 80: 'Misdaad',
  99: 'Documentaire', 18: 'Drama', 10751: 'Familie', 14: 'Fantasy', 36: 'Geschiedenis',
  27: 'Horror', 10402: 'Muziek', 9648: 'Mystery', 10749: 'Romantiek', 878: 'Sci-Fi',
  53: 'Thriller', 10752: 'Oorlog', 37: 'Western',
};

@Component({
  selector: 'app-matcher',
  imports: [RouterLink, DecimalPipe, MatIcon, MatButton, MatIconButton, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './matcher.component.html',
  styleUrl: './matcher.component.scss',
})
export class MatcherComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  private readonly friendsService = inject(FriendsService);
  private readonly library = inject(UserLibraryService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly authService = inject(AuthService);

  protected readonly friends = this.friendsService.friends;
  protected readonly selectedFriends = signal<Set<string>>(new Set());
  protected readonly loading = signal(false);
  protected readonly results = signal<MatchResult[]>([]);
  protected readonly step = signal<'select' | 'results'>('select');

  constructor() {
    // Pre-load friend watchlists so genre inference works when finding matches
    effect(() => {
      const friends = this.friendsService.friends();
      for (const f of friends) {
        this.watchlistService.loadFriendWatchlists(f.id).subscribe();
      }
    });
  }

  ngOnInit(): void {
    this.friendsService.getMyFriends().subscribe();
  }

  protected toggleFriend(id: string): void {
    this.selectedFriends.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected isFriendSelected(id: string): boolean {
    return this.selectedFriends().has(id);
  }

  protected findMatches(): void {
    if (this.selectedFriends().size === 0) return;
    this.loading.set(true);
    this.step.set('results');

    const myLibrary = this.library.ratedMovies();
    const friendIds = [...this.selectedFriends()];

    // Infer friend preferences from their Firestore watchlists (not localStorage)
    const friendLibraries: LibraryEntry[][] = friendIds.map(fid => {
      const watchlists = this.watchlistService.getWatchlistsForUser(fid);
      return watchlists
        .filter(wl => wl.name !== 'Gezien')
        .flatMap(wl => wl.movies ?? [])
        .filter(m => m.movie)
        .map(m => ({
          movieId: m.movieId,
          movie: m.movie!,
          watched: false,
          watchedAt: null,
          rating: 4, // all watchlisted movies count as a preference signal
          ratedAt: null,
        }));
    });

    const myGenreFreq = this.getGenreFreq(myLibrary);
    const sharedGenres = this.computeSharedGenres(myGenreFreq, friendLibraries);
    const topGenre = sharedGenres[0];

    // Exclude movies already watched by me or any selected friend
    const myWatchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));
    const friendWatchedIds = new Set<number>(
      friendIds.flatMap(fid => {
        const watchlists = this.watchlistService.getWatchlistsForUser(fid);
        return (watchlists.find(wl => wl.name === 'Gezien')?.movies ?? []).map(m => m.movieId);
      })
    );
    const watchedIds = new Set([...myWatchedIds, ...friendWatchedIds]);

    const params: Record<string, string | number> = {
      'vote_average.gte': 6,
      'vote_count.gte': 200,
    };
    if (topGenre) params['with_genres'] = String(topGenre);

    this.movieService.discoverMovies(params).subscribe({
      next: page => {
        const candidates = page.results.filter(m => !watchedIds.has(m.id));
        if (candidates.length === 0) {
          this.loading.set(false);
          return;
        }

        const scored = candidates.map(movie => ({
          movie,
          score: this.scoreMovie(movie, myGenreFreq, friendLibraries, sharedGenres),
        })).sort((a, b) => b.score - a.score);

        const results: MatchResult[] = [];
        const friendNames = friendIds
          .map(id => this.friends().find(f => f.id === id)?.displayName ?? 'vriend')
          .join(' & ');

        // Best match — highest score
        if (scored[0]) {
          results.push({
            type: 'best',
            label: 'Beste Match',
            icon: 'auto_awesome',
            movie: scored[0].movie,
            matchScore: Math.min(99, Math.round(scored[0].score)),
            reasons: this.buildReasons(scored[0].movie, sharedGenres, friendNames),
          });
        }

        // Safe choice — highly rated, well known
        const safe = [...scored].sort((a, b) =>
          (b.movie.vote_average * b.movie.vote_count) - (a.movie.vote_average * a.movie.vote_count)
        )[0];
        if (safe && safe.movie.id !== scored[0]?.movie.id) {
          results.push({
            type: 'safe',
            label: 'Veilige Keuze',
            icon: 'verified',
            movie: safe.movie,
            matchScore: Math.min(95, Math.round(safe.score * 0.9)),
            reasons: [`Hoog beoordeeld door publiek (${safe.movie.vote_average.toFixed(1)}⭐)`, `Populair bij een breed publiek`],
          });
        }

        // Random match — pick a decent movie at random from scored list
        const randIdx = Math.floor(Math.random() * Math.min(candidates.length, 15)) + 3;
        const rand = scored[randIdx] ?? scored[scored.length - 1];
        if (rand && rand.movie.id !== results[0]?.movie.id) {
          results.push({
            type: 'random',
            label: 'Willekeurige Keuze',
            icon: 'shuffle',
            movie: rand.movie,
            matchScore: Math.min(85, Math.round(rand.score * 0.8)),
            reasons: [`Willekeurig geselecteerd voor een verassing`, `Goede beoordelingen`],
          });
        }

        // Wildcard — different genre
        const wildcard = candidates.find(m =>
          !(m.genre_ids ?? []).some(g => sharedGenres.includes(g)) &&
          m.vote_average >= 7 &&
          results.every(r => r.movie.id !== m.id)
        );
        if (wildcard) {
          results.push({
            type: 'wildcard',
            label: 'Wildcard',
            icon: 'bolt',
            movie: wildcard,
            matchScore: Math.round(40 + Math.random() * 25),
            reasons: [`Totaal nieuw genre voor jullie`, `Verrassende keuze met hoge score`],
          });
        }

        this.results.set(results);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected reset(): void {
    this.step.set('select');
    this.results.set([]);
    this.selectedFriends.set(new Set());
  }

  private getGenreFreq(library: LibraryEntry[]): Record<number, number> {
    const freq: Record<number, number> = {};
    for (const e of library.filter(e => e.rating >= 4)) {
      for (const g of (e.movie.genre_ids ?? [])) {
        freq[g] = (freq[g] ?? 0) + 1;
      }
    }
    return freq;
  }

  private computeSharedGenres(myFreq: Record<number, number>, friendLibraries: LibraryEntry[][]): number[] {
    const combined: Record<number, number> = { ...myFreq };
    for (const lib of friendLibraries) {
      const freq = this.getGenreFreq(lib);
      for (const [g, count] of Object.entries(freq)) {
        combined[Number(g)] = (combined[Number(g)] ?? 0) + count;
      }
    }
    return Object.entries(combined)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => Number(id));
  }

  private scoreMovie(movie: TmdbMovie, myFreq: Record<number, number>, friendLibraries: LibraryEntry[][], sharedGenres: number[]): number {
    let score = movie.vote_average * 5;
    const genres = movie.genre_ids ?? [];

    for (const g of genres) {
      if (sharedGenres.includes(g)) score += 10;
      if (myFreq[g]) score += myFreq[g] * 2;
    }

    for (const lib of friendLibraries) {
      const freq = this.getGenreFreq(lib);
      for (const g of genres) {
        if (freq[g]) score += freq[g] * 2;
      }
    }

    return score;
  }

  private buildReasons(movie: TmdbMovie, sharedGenres: number[], friendNames: string): string[] {
    const reasons: string[] = [];
    const matchingGenres = (movie.genre_ids ?? []).filter(g => sharedGenres.includes(g));
    if (matchingGenres.length > 0) {
      const names = matchingGenres.slice(0, 2).map(g => GENRE_NAMES[g] ?? 'dit genre').join(' & ');
      reasons.push(`Jullie houden allebei van ${names}`);
    }
    if (movie.vote_average >= 7.5) {
      reasons.push(`Hoog beoordeeld (${movie.vote_average.toFixed(1)}⭐)`);
    }
    reasons.push(`Jullie hebben deze film nog niet gezien`);
    return reasons;
  }

  protected getMatchColor(type: string): string {
    return { best: '#a78bfa', safe: '#4ade80', random: '#38bdf8', wildcard: '#fb923c' }[type] ?? '#a78bfa';
  }

  protected getFriendName(id: string): string {
    return this.friends().find(f => f.id === id)?.displayName ?? 'Vriend';
  }

  protected getFriendInitial(id: string): string {
    return (this.getFriendName(id).charAt(0) ?? '?').toUpperCase();
  }
}
