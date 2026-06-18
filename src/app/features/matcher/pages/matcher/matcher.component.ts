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

interface MatchResult {
  type: 'best' | 'random' | 'safe' | 'wildcard';
  label: string;
  icon: string;
  movie: TmdbMovie;
  matchScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

interface ScoredMovie {
  movie: TmdbMovie;
  total: number;
  reasons: string[];
}

// genreId -> preference score 0–100
type GenreProfile = Record<number, number>;

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
  private readonly reviewService = inject(ReviewService);

  protected readonly friends = this.friendsService.friends;
  protected readonly selectedFriends = signal<Set<string>>(new Set());
  protected readonly loading = signal(false);
  protected readonly results = signal<MatchResult[]>([]);
  protected readonly step = signal<'select' | 'results'>('select');

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
        (this.watchlistService.getWatchlistsForUser(fid).find(wl => wl.name === 'Gezien')?.movies ?? [])
          .map(m => m.movieId)
      )
    );
    const watchedIds = new Set([...myWatchedIds, ...friendWatchedIds]);

    // Watchlist intent: movies in any non-Gezien watchlist (intent signal)
    const watchlistIds = new Set<number>([
      ...this.watchlistService.watchlists()
        .filter(wl => wl.name !== 'Gezien')
        .flatMap(wl => wl.movies ?? [])
        .map(m => m.movieId),
      ...friendIds.flatMap(fid =>
        this.watchlistService.getWatchlistsForUser(fid)
          .filter(wl => wl.name !== 'Gezien')
          .flatMap(wl => wl.movies ?? [])
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
    for (const wl of this.watchlistService.watchlists().filter(w => w.name !== 'Gezien')) {
      indexWatchlistGenres(wl.movies ?? []);
    }
    for (const fid of friendIds) {
      for (const wl of this.watchlistService.getWatchlistsForUser(fid).filter(w => w.name !== 'Gezien')) {
        indexWatchlistGenres(wl.movies ?? []);
      }
    }

    // Build genre preference profiles
    const myProfile = this.buildGenreProfile(myRated);

    const friendProfiles = friendIds.map((fid, idx) => {
      const reviewMap = friendReviewMaps[idx];
      // Build from Gezien watchlist + actual review ratings
      const gezienEntries: LibraryEntry[] = (
        this.watchlistService.getWatchlistsForUser(fid)
          .find(wl => wl.name === 'Gezien')?.movies ?? []
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
      return this.buildGenreProfile(gezienEntries);
    });

    // Compute shared taste profile across all selected users
    const sharedProfile = this.computeSharedProfile([myProfile, ...friendProfiles]);
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
          .map(movie => this.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds))
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
              .map(movie => this.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds))
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
          },
          error: () => {
            this.results.set(results);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  /**
   * Builds a genre preference profile from rated movies.
   * Score = (avg_rating/5 × 100) + volume bonus (max +30).
   * Genres rated below 3 on average score negatively and are excluded.
   */
  private buildGenreProfile(library: LibraryEntry[]): GenreProfile {
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
   * Key fix vs previous version: empty profiles are ignored rather than being
   * treated as "score 0", which previously caused geometric mean to collapse
   * every genre to ~9 when a friend had no watch history.
   *
   * Aggregation: arithmetic mean of known scores, with a penalty when any user
   * actively dislikes the genre (score < 30).
   */
  private computeSharedProfile(profiles: GenreProfile[]): GenreProfile {
    // Only aggregate profiles that have actual data
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
  private scoreMovie(
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
      const names = matchedGenres.slice(0, 2).map(g => GENRE_NAMES[g] ?? 'dit genre').join(' & ');
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

  protected reset(): void {
    this.step.set('select');
    this.results.set([]);
    this.selectedFriends.set(new Set());
  }

  protected getMatchColor(type: string): string {
    return { best: '#a78bfa', safe: '#4ade80', random: '#38bdf8', wildcard: '#fb923c' }[type] ?? '#a78bfa';
  }

  protected getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
    return { high: 'Hoge zekerheid', medium: 'Gemiddelde zekerheid', low: 'Beperkte data' }[confidence];
  }

  protected getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
    return { high: '#4ade80', medium: '#fbbf24', low: '#94a3b8' }[confidence];
  }

  protected getFriendName(id: string): string {
    return this.friends().find(f => f.id === id)?.displayName ?? 'Vriend';
  }

  protected getFriendInitial(id: string): string {
    return (this.getFriendName(id).charAt(0) ?? '?').toUpperCase();
  }
}
