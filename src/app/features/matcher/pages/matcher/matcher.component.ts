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
    const friendNames = friendIds
      .map(id => this.friends().find(f => f.id === id)?.displayName ?? 'vriend')
      .join(' & ');

    // My library from localStorage
    const myRated = this.library.ratedMovies();
    const myWatchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));

    // Fetch friend reviews in parallel for real star ratings
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

    // Friend watched IDs (from Gezien watchlist)
    const friendWatchedIds = new Set<number>(
      friendIds.flatMap(fid =>
        (this.watchlistService.getWatchlistsForUser(fid).find(wl => wl.name === 'Gezien')?.movies ?? [])
          .map(m => m.movieId)
      )
    );
    const watchedIds = new Set([...myWatchedIds, ...friendWatchedIds]);

    // Watchlist intent: movies in any non-Gezien watchlist
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

    // Watchlist genre frequencies (for partial genre-level interest scoring)
    const watchlistGenreFreq: Record<number, number> = {};
    const addWatchlistGenres = (movies: { movie?: TmdbMovie | null }[]) => {
      for (const m of movies) {
        for (const g of (m.movie?.genre_ids ?? [])) {
          watchlistGenreFreq[g] = (watchlistGenreFreq[g] ?? 0) + 1;
        }
      }
    };
    for (const wl of this.watchlistService.watchlists().filter(wl => wl.name !== 'Gezien')) {
      addWatchlistGenres(wl.movies ?? []);
    }
    for (const fid of friendIds) {
      for (const wl of this.watchlistService.getWatchlistsForUser(fid).filter(wl => wl.name !== 'Gezien')) {
        addWatchlistGenres(wl.movies ?? []);
      }
    }

    // Build genre preference profiles
    const myProfile = this.buildGenreProfile(myRated);

    const friendProfiles = friendIds.map((fid, idx) => {
      const reviewMap = friendReviewMaps[idx];
      const gezienMovies: LibraryEntry[] = (
        this.watchlistService.getWatchlistsForUser(fid).find(wl => wl.name === 'Gezien')?.movies ?? []
      )
        .filter(m => m.movie)
        .map(m => ({
          movieId: m.movieId,
          movie: m.movie!,
          watched: true,
          watchedAt: null,
          // Use actual review rating if available; default to 4 (seen = assumed liked)
          rating: reviewMap.get(m.movieId) ?? 4,
          ratedAt: null,
        }));
      return this.buildGenreProfile(gezienMovies);
    });

    // Shared profile via geometric mean — penalises mismatches across users
    const sharedProfile = this.computeSharedProfile([myProfile, ...friendProfiles]);

    const topGenres = Object.entries(sharedProfile)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => Number(id));
    const topGenre = topGenres[0];

    // Discover candidates (random page for variety)
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
          .map(movie => this.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds, friendNames))
          .sort((a, b) => b.total - a.total);

        const results: MatchResult[] = [];
        const usedIds = new Set<number>();

        // Best Match — pick from top 5 for variety while staying high-quality
        const bestPool = scored.slice(0, Math.min(5, scored.length));
        const best = bestPool[Math.floor(Math.random() * bestPool.length)];
        if (best) {
          results.push({ type: 'best', label: 'Beste Match', icon: 'auto_awesome', movie: best.movie, matchScore: Math.min(99, Math.round(best.total)), reasons: best.reasons });
          usedIds.add(best.movie.id);
        }

        // Safe Choice — highest reliability: prioritise vote_average and popularity over personalisation
        const safeSorted = [...scored]
          .filter(s => !usedIds.has(s.movie.id))
          .sort((a, b) => (b.movie.vote_average * 0.7 + b.total * 0.003) - (a.movie.vote_average * 0.7 + a.total * 0.003));
        const safe = safeSorted[0];
        if (safe) {
          const safeReasons = [`Hoog beoordeeld (${safe.movie.vote_average.toFixed(1)}⭐)`, ...safe.reasons.filter(r => !r.includes('⭐')).slice(0, 1)];
          results.push({ type: 'safe', label: 'Veilige Keuze', icon: 'verified', movie: safe.movie, matchScore: Math.min(95, Math.round(safe.total * 0.92)), reasons: safeReasons });
          usedIds.add(safe.movie.id);
        }

        // Random — pick randomly from top 25 so it's still relevant
        const randomPool = scored.filter(s => !usedIds.has(s.movie.id)).slice(0, 25);
        const rand = randomPool[Math.floor(Math.random() * randomPool.length)];
        if (rand) {
          results.push({ type: 'random', label: 'Willekeurige Keuze', icon: 'shuffle', movie: rand.movie, matchScore: Math.min(88, Math.round(rand.total * 0.88)), reasons: [`Willekeurig uit jullie top matches`, ...rand.reasons.slice(0, 1)] });
          usedIds.add(rand.movie.id);
        }

        // Wildcard — hidden gem: same genre territory but less mainstream
        const wildcardPage = Math.ceil(Math.random() * 5);
        const wildcardParams: Record<string, string | number> = {
          'vote_average.gte': 6.5,
          'vote_count.gte': 50,
          'vote_count.lte': 5000,
          sort_by: 'vote_average.desc',
          page: wildcardPage,
        };
        if (topGenre) wildcardParams['with_genres'] = String(topGenre);

        this.movieService.discoverMovies(wildcardParams).subscribe({
          next: wildcardDiscovery => {
            const wildcardCandidates = wildcardDiscovery.results
              .filter(m => !watchedIds.has(m.id) && !usedIds.has(m.id));
            const wildcardScored = wildcardCandidates
              .map(movie => this.scoreMovie(movie, sharedProfile, myRated, watchlistIds, watchlistGenreFreq, watchedIds, friendNames))
              .sort((a, b) => b.total - a.total);
            // Pick from top 5 wildcard candidates for variety
            const wc = wildcardScored[Math.floor(Math.random() * Math.min(5, wildcardScored.length))];
            if (wc) {
              results.push({ type: 'wildcard', label: 'Wildcard', icon: 'bolt', movie: wc.movie, matchScore: Math.min(82, Math.round(wc.total * 0.82)), reasons: [`Verborgen parel — minder bekend, hoog beoordeeld`, ...wc.reasons.slice(0, 1)] });
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
   * Builds a genre preference profile from a list of rated movies.
   * Score per genre = (avg_rating / 5) * 100 + log-volume bonus (max +30).
   * Genres consistently rated below 3 get a penalty.
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
      const count = ratings.length;
      const ratingComponent = (avg / 5) * 100;
      const volumeBonus = Math.min(30, Math.log2(count + 1) * 12);
      profile[g] = Math.max(0, Math.min(100, ratingComponent + volumeBonus));
    }
    return profile;
  }

  /**
   * Computes a shared taste profile across multiple users using geometric mean.
   * A genre where any user scores very low pulls the shared score down.
   */
  private computeSharedProfile(profiles: GenreProfile[]): GenreProfile {
    const allGenres = new Set<number>(profiles.flatMap(p => Object.keys(p).map(Number)));
    const shared: GenreProfile = {};
    for (const g of allGenres) {
      const scores = profiles.map(p => p[g] ?? 0);
      // Geometric mean (+1 offset to handle zeros gracefully)
      const geo = Math.pow(scores.reduce((acc, s) => acc * (s + 1), 1), 1 / scores.length) - 1;
      if (geo > 3) shared[g] = Math.min(100, geo);
    }
    return shared;
  }

  /**
   * Scores a movie against the shared preference profile.
   *
   * Weights:
   *   40% Genre Match       — shared profile score for movie's genres
   *   25% Taste Similarity  — genre overlap with user's personally high-rated movies
   *   20% Watchlist Intent  — genre popularity in non-Gezien watchlists
   *   10% Popularity        — TMDB vote_average + vote_count
   *    5% Novelty           — nobody has watched it yet
   */
  private scoreMovie(
    movie: TmdbMovie,
    sharedProfile: GenreProfile,
    myRated: LibraryEntry[],
    watchlistIds: Set<number>,
    watchlistGenreFreq: Record<number, number>,
    watchedIds: Set<number>,
    friendNames: string,
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

    // Taste Similarity (25%) — Jaccard similarity to my top-rated movies
    const myFavs = myRated.filter(e => e.rating >= 4).slice(0, 30);
    let tasteSim = 0;
    for (const fav of myFavs) {
      const favGenres = fav.movie.genre_ids ?? [];
      const intersection = genres.filter(g => favGenres.includes(g)).length;
      const union = new Set([...genres, ...favGenres]).size;
      if (union > 0) tasteSim += (intersection / union) * (fav.rating / 5);
    }
    const tasteScore = myFavs.length > 0 ? Math.min(100, (tasteSim / myFavs.length) * 300) : 0;

    // Watchlist Intent (20%)
    let watchlistScore: number;
    if (watchlistIds.has(movie.id)) {
      watchlistScore = 100;
    } else {
      const genreMatches = genres.filter(g => (watchlistGenreFreq[g] ?? 0) > 0).length;
      watchlistScore = genres.length > 0 ? Math.min(100, (genreMatches / genres.length) * 80) : 0;
    }

    // Popularity Confidence (10%)
    const avgScore = (movie.vote_average / 10) * 100;
    const countScore = Math.min(100, (Math.log10(Math.max(1, movie.vote_count)) / Math.log10(500_000)) * 100);
    const popularityScore = avgScore * 0.7 + countScore * 0.3;

    // Novelty Bonus (5%)
    const noveltyScore = watchedIds.has(movie.id) ? 0 : 100;

    const total = (
      genreScore    * 0.40 +
      tasteScore    * 0.25 +
      watchlistScore * 0.20 +
      popularityScore * 0.10 +
      noveltyScore  * 0.05
    );

    // Dynamic reasons
    const reasons: string[] = [];
    if (matchedGenres.length > 0) {
      const names = matchedGenres.slice(0, 2).map(g => GENRE_NAMES[g] ?? 'dit genre').join(' & ');
      reasons.push(`Jullie houden allebei van ${names}`);
    }
    if (movie.vote_average >= 7.5) {
      reasons.push(`Hoog beoordeeld (${movie.vote_average.toFixed(1)}⭐)`);
    }
    if (watchlistIds.has(movie.id)) {
      reasons.push(`Staat al op een van jullie lijsten`);
    }
    if (tasteScore >= 30) {
      reasons.push(`Past bij jullie eerdere kijkgedrag`);
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

  protected getFriendName(id: string): string {
    return this.friends().find(f => f.id === id)?.displayName ?? 'Vriend';
  }

  protected getFriendInitial(id: string): string {
    return (this.getFriendName(id).charAt(0) ?? '?').toUpperCase();
  }
}
