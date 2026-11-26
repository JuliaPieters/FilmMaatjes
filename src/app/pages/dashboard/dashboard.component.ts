import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MovieService } from '../../features/movies/services/movie.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserLibraryService } from '../../core/services/user-library.service';
import { WatchlistService } from '../../features/watchlists/services/watchlist.service';
import { FriendsService } from '../../features/friends/services/friends.service';
import { TmdbMovie } from '../../core/models/movie.model';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { MovieActionsService } from '../../core/services/movie-actions.service';
import { DecimalPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { greetingForHour } from './greeting';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIcon, MatButton, DecimalPipe, MovieCardComponent, LoadingSpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly movieService = inject(MovieService);
  private readonly movieActions = inject(MovieActionsService);
  protected readonly authService = inject(AuthService);
  protected readonly library = inject(UserLibraryService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly friendsService = inject(FriendsService);

  protected readonly trending = signal<TmdbMovie[]>([]);
  protected readonly popular = signal<TmdbMovie[]>([]);
  protected readonly recommended = signal<TmdbMovie[]>([]);
  protected readonly loading = signal(true);
  /** Aanbevelingen zijn binnen (of mislukt) — pas dan staat de uitgelichte film vast. */
  private readonly recommendedDone = signal(false);
  protected readonly greeting = greetingForHour(new Date().getHours());

  /** "Vanavond kijken?": eerste aanbevolen (anders trending) film met een backdrop. */
  protected readonly featured = computed<TmdbMovie | null>(() => {
    const withBackdrop = (list: TmdbMovie[]) => list.find(m => !!m.backdrop_path) ?? null;
    return withBackdrop(this.recommended()) ?? withBackdrop(this.trending());
  });
  protected readonly featuredLoading = computed(() => this.loading() || !this.recommendedDone());
  protected readonly featuredInWatchlist = computed(() => {
    const m = this.featured();
    return m ? this.watchlistService.isMovieInAnyWatchlist(m.id) : false;
  });
  protected readonly featuredPopped = signal(false);
  protected readonly hasApiKey = this.movieService.hasApiKey();

  protected readonly firstName = computed(() => {
    const name = this.authService.user()?.displayName?.trim();
    return name ? name.split(/\s+/)[0] : 'filmmaatje';
  });

  protected readonly watchedCount = computed(() => this.library.watchedMovies().length);
  protected readonly ratedCount = computed(() => this.library.ratedMovies().length);
  protected readonly watchlistCount = computed(() => this.watchlistService.watchlists().length);
  protected readonly friendsCount = computed(() => this.friendsService.friends().length);
  protected readonly hasPersonalizedRecommendations = computed(() =>
    this.library.ratedMovies().some(e => e.rating >= 4),
  );

  ngOnInit(): void {
    this.friendsService.getMyFriends().subscribe();

    if (!this.hasApiKey) {
      this.loading.set(false);
      return;
    }

    this.movieService.getTrending().subscribe({
      next: page => {
        this.trending.set(page.results.slice(0, 10));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.movieService.getPopular().subscribe({
      next: page => this.popular.set(page.results.slice(0, 10)),
      error: () => {},
    });

    this.loadRecommendations();
  }

  protected toggleFeaturedWatchlist(): void {
    const m = this.featured();
    if (!m) return;
    this.featuredPopped.set(false);
    requestAnimationFrame(() => this.featuredPopped.set(true));
    this.movieActions.toggleWatchlist(m);
  }

  private loadRecommendations(): void {
    const done = () => this.recommendedDone.set(true);
    const [topGenre] = this.library.getTopGenres({ minRating: 4, limit: 1 });
    if (!topGenre) {
      this.movieService.getTopRated().subscribe({
        next: page => {
          this.recommended.set(page.results.slice(0, 8));
          done();
        },
        error: done,
      });
      return;
    }

    this.movieService.discoverMovies({ with_genres: topGenre, 'vote_average.gte': 7 }).subscribe({
      next: page => {
        const watchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));
        this.recommended.set(page.results.filter(m => !watchedIds.has(m.id)).slice(0, 8));
        done();
      },
      error: done,
    });
  }
}
