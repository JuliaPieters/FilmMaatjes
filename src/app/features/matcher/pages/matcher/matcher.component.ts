import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { lastValueFrom } from 'rxjs';
import { MovieService } from '../../../movies/services/movie.service';
import { FriendsService } from '../../../friends/services/friends.service';
import { UserLibraryService, LibraryEntry } from '../../../../core/services/user-library.service';
import { WatchlistService } from '../../../watchlists/services/watchlist.service';
import { ReviewService } from '../../../../core/services/review.service';
import { TmdbMovie } from '../../../../core/models/movie.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MovieMatchingService } from '../../services/movie-matching.service';

interface MatchResult {
  type: 'best' | 'random' | 'safe' | 'wildcard';
  label: string;
  icon: string;
  movie: TmdbMovie;
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

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
  private readonly reviewService = inject(ReviewService);
  private readonly matching = inject(MovieMatchingService);

  protected readonly friends = this.friendsService.friends;
  protected readonly selectedFriends = signal<Set<string>>(new Set());
  protected readonly loading = signal(false);
  protected readonly results = signal<MatchResult[]>([]);
  protected readonly step = signal<'select' | 'results'>('select');
  protected readonly displayedScores = signal<Record<string, number>>({});
  private scoreAnimationToken = 0;
  private readonly cardStaggerMs = 250;
  private readonly scoreCountMs = 1300;

  constructor() {
    effect(() => {
      for (const f of this.friendsService.friends()) {
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

  protected async findMatches(): Promise<void> {
    if (this.selectedFriends().size === 0) return;
    this.loading.set(true);
    this.step.set('results');

    const friendIds = [...this.selectedFriends()];

    // My library (localStorage — has actual ratings + full movie data with genre_ids)
    const myRated = this.library.ratedMovies();
    const myWatchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));

    // Fetch friend reviews for real star ratings (from Firestore)
    const friendReviewMaps = await Promise.all(
      friendIds.map(fid =>
        lastValueFrom(this.reviewService.getUserReviews(fid))
          .then(reviews => {
            const map = new Map<number, number>();
            for (const r of reviews) map.set(r.movieId, r.rating);
            return map;
          })
          .catch(() => new Map<number, number>())
      )
    );

    // Movies watched by any friend (from Gezien watchlist)
    const friendWatchedIds = new Set<number>(
      friendIds.flatMap(fid =>
        (this.watchlistService.getWatchlistsForUser(fid).find(watchlist => watchlist.name === 'Gezien')?.movies ?? [])
          .map(m => m.movieId)
      )
    );
    const watchedIds = new Set([...myWatchedIds, ...friendWatchedIds]);

    // Watchlist intent: movies in any non-Gezien watchlist (intent signal)
    const watchlistIds = new Set<number>([
      ...this.watchlistService.watchlists()
        .filter(watchlist => watchlist.name !== 'Gezien')
        .flatMap(watchlist => watchlist.movies ?? [])
        .map(m => m.movieId),
      ...friendIds.flatMap(fid =>
        this.watchlistService.getWatchlistsForUser(fid)
          .filter(watchlist => watchlist.name !== 'Gezien')
          .flatMap(watchlist => watchlist.movies ?? [])
          .map(m => m.movieId)
      ),
    ]);

    // Genre frequencies of watchlist movies (for partial watchlist interest scoring)
    const watchlistGenreFreq: Record<number, number> = {};
    const indexWatchlistGenres = (movies: { movie?: TmdbMovie | null }[]) => {
      for (const m of movies) {
        for (const g of (m.movie?.genre_ids ?? [])) {
          watchlistGenreFreq[g] = (watchlistGenreFreq[g] ?? 0) + 1;
        }
      }
    };
    for (const watchlist of this.watchlistService.watchlists().filter(w => w.name !== 'Gezien')) {
      indexWatchlistGenres(watchlist.movies ?? []);
    }
    for (const fid of friendIds) {
      for (const watchlist of this.watchlistService.getWatchlistsForUser(fid).filter(w => w.name !== 'Gezien')) {
        indexWatchlistGenres(watchlist.movies ?? []);
      }
    }

    // Build genre preference profiles
    const myProfile = this.matching.buildGenreProfile(myRated);

    const friendProfiles = friendIds.map((fid, index) => {
      const reviewMap = friendReviewMaps[index];
      // Build from Gezien watchlist + actual review ratings
      const gezienEntries: LibraryEntry[] = (
        this.watchlistService.getWatchlistsForUser(fid)
          .find(watchlist => watchlist.name === 'Gezien')?.movies ?? []
      )
        .filter(m => m.movie)
        .map(m => ({
          movieId: m.movieId,
          movie: m.movie!,
          watched: true,
          watchedAt: null,
          rating: reviewMap.get(m.movieId) ?? 4, // default 4: seen = assumed liked
          ratedAt: null,
        }));
      return this.matching.buildGenreProfile(gezienEntries);
    });

    // Compute shared taste profile across all selected users
    const sharedProfile = this.matching.computeSharedProfile([myProfile, ...friendProfiles]);
    const hasPersonalData = myRated.length >= 3;
    const hasFriendData = friendProfiles.some(p => Object.keys(p).length >= 2);

    // Determine data quality for confidence labels
    const dataQuality: 'good' | 'partial' | 'none' =
      hasPersonalData && hasFriendData ? 'good' :
      hasPersonalData || hasFriendData ? 'partial' : 'none';

    const topGenres = Object.entries(sharedProfile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => Number(id));
    const topGenre = topGenres[0];

    // Discover candidates — random page for variety
    const page = Math.ceil(Math.random() * 5);
    const params: Record<string, string | number> = {
      'vote_average.gte': 6,
      'vote_count.gte': 200,
      sort_by: 'vote_average.desc',
      page,
    };
    if (topGenre) params['with_genres'] = String(topGenre);

    this.movieService.discoverMovies(params).subscribe({
      next: discoveredPage => {
        const candidates = discoveredPage.results.filter(m => !watchedIds.has(m.id));
        if (candidates.length === 0) {
          this.loading.set(false);
          return;
        }

        const scored = candidates
          .map(movie => this.matching.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds))
          .sort((a, b) => b.total - a.total);

        const results: MatchResult[] = [];
        // Track selected IDs to guarantee no duplicates across all 4 categories
        const selectedIds = new Set<number>();

        const pushResult = (entry: MatchResult): void => {
          if (!selectedIds.has(entry.movie.id)) {
            results.push(entry);
            selectedIds.add(entry.movie.id);
          }
        };

        const calcConfidence = (score: number): 'high' | 'medium' | 'low' => {
          if (dataQuality === 'good' && score >= 65) return 'high';
          if (dataQuality !== 'none' && score >= 40) return 'medium';
          return 'low';
        };

        // Best Match — top 5 pool for variety, highest personalization score
        const bestPool = scored.slice(0, Math.min(5, scored.length));
        const best = bestPool[Math.floor(Math.random() * bestPool.length)];
        if (best) {
          pushResult({
            type: 'best',
            label: 'Beste Match',
            icon: 'auto_awesome',
            movie: best.movie,
            matchScore: Math.min(99, Math.round(best.total)),
            confidence: calcConfidence(best.total),
            reasons: best.reasons,
          });
        }

        // Safe Choice — highest TMDB reliability, still genre-relevant
        const safeSorted = [...scored]
          .filter(s => !selectedIds.has(s.movie.id))
          .sort((a, b) =>
            (b.movie.vote_average * 12 + b.total * 0.5) -
            (a.movie.vote_average * 12 + a.total * 0.5)
          );
        const safe = safeSorted[0];
        if (safe) {
          const safeScore = Math.min(95, Math.round(safe.total * 0.92));
          pushResult({
            type: 'safe',
            label: 'Veilige Keuze',
            icon: 'verified',
            movie: safe.movie,
            matchScore: safeScore,
            confidence: calcConfidence(safeScore),
            reasons: [
              `Hoog beoordeeld (${safe.movie.vote_average.toFixed(1)}⭐)`,
              ...safe.reasons.filter(r => !r.includes('⭐')).slice(0, 1),
            ],
          });
        }

        // Random Choice — random pick from top 25 (stays relevant, avoids garbage)
        const randomPool = scored.filter(s => !selectedIds.has(s.movie.id)).slice(0, 25);
        if (randomPool.length > 0) {
          const rand = randomPool[Math.floor(Math.random() * randomPool.length)];
          const randScore = Math.min(88, Math.round(rand.total * 0.88));
          pushResult({
            type: 'random',
            label: 'Willekeurige Keuze',
            icon: 'shuffle',
            movie: rand.movie,
            matchScore: randScore,
            confidence: calcConfidence(randScore),
            reasons: [`Willekeurig uit jullie top matches`, ...rand.reasons.slice(0, 1)],
          });
        }

        // Wildcard — hidden gem: same genre territory, lower vote_count (less mainstream)
        const wildcardPage = Math.ceil(Math.random() * 5);
        const wildcardParams: Record<string, string | number> = {
          'vote_average.gte': 6.5,
          'vote_count.gte': 50,
          'vote_count.lte': 4000,
          sort_by: 'vote_average.desc',
          page: wildcardPage,
        };
        if (topGenre) wildcardParams['with_genres'] = String(topGenre);

        this.movieService.discoverMovies(wildcardParams).subscribe({
          next: wildcardPage => {
            const wildcardScored = wildcardPage.results
              .filter(m => !watchedIds.has(m.id) && !selectedIds.has(m.id))
              .map(movie => this.matching.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds))
              .sort((a, b) => b.total - a.total);

            // Pick from top 5 wildcard candidates for a bit of randomness
            const pool = wildcardScored.slice(0, Math.min(5, wildcardScored.length));
            const wc = pool[Math.floor(Math.random() * pool.length)];
            if (wc) {
              const wcScore = Math.min(82, Math.round(wc.total * 0.82));
              pushResult({
                type: 'wildcard',
                label: 'Wildcard',
                icon: 'bolt',
                movie: wc.movie,
                matchScore: wcScore,
                confidence: calcConfidence(wcScore),
                reasons: [`Verborgen parel — minder bekend, hoog beoordeeld`, ...wc.reasons.slice(0, 1)],
              });
            }
            this.results.set(results);
            this.loading.set(false);
            this.animateScores(results);
          },
          error: () => {
            this.results.set(results);
            this.loading.set(false);
            this.animateScores(results);
          },
        });
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  protected reset(): void {
    this.step.set('select');
    this.results.set([]);
    this.selectedFriends.set(new Set());
    this.scoreAnimationToken++;
    this.displayedScores.set({});
  }

  protected cardDelayMs(index: number): number {
    return index * this.cardStaggerMs;
  }

  protected scoreLandDelayMs(index: number): number {
    return this.cardDelayMs(index) + this.scoreCountMs;
  }

  private animateScores(results: MatchResult[]): void {
    const token = ++this.scoreAnimationToken;
    this.displayedScores.set(Object.fromEntries(results.map(r => [r.type, 0])));

    results.forEach((result, index) => {
      setTimeout(() => {
        if (token !== this.scoreAnimationToken) return;
        const start = performance.now();
        const tick = (now: number): void => {
          if (token !== this.scoreAnimationToken) return;
          const progress = Math.min(1, (now - start) / this.scoreCountMs);
          const eased = 1 - Math.pow(1 - progress, 3);
          this.displayedScores.update(scores => ({ ...scores, [result.type]: Math.round(eased * result.matchScore) }));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, this.cardDelayMs(index));
    });
  }

  protected getMatchColor(type: string): string {
    return { best: 'var(--color-accent-light)', safe: 'var(--color-success)', random: 'var(--color-cyan)', wildcard: 'var(--color-orange)' }[type] ?? 'var(--color-accent-light)';
  }

  protected getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
    return { high: 'Hoge zekerheid', medium: 'Gemiddelde zekerheid', low: 'Beperkte data' }[confidence];
  }

  protected getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
    return { high: 'var(--color-success)', medium: 'var(--color-amber)', low: 'var(--color-text-secondary)' }[confidence];
  }

  protected getFriendName(id: string): string {
    return this.friends().find(f => f.id === id)?.displayName ?? 'Vriend';
  }

  protected getFriendInitial(id: string): string {
    return (this.getFriendName(id).charAt(0) ?? '?').toUpperCase();
  }
}
