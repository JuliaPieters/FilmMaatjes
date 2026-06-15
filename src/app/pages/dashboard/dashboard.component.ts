import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MovieService } from '../../features/movies/services/movie.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserLibraryService } from '../../core/services/user-library.service';
import { WatchlistService } from '../../features/watchlists/services/watchlist.service';
import { FriendsService } from '../../features/friends/services/friends.service';
import { TmdbMovie } from '../../core/models/movie.model';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, MatIcon, MatButton, MovieCardComponent, LoadingSpinnerComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly movieService = inject(MovieService);
  protected readonly authService = inject(AuthService);
  protected readonly library = inject(UserLibraryService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly friendsService = inject(FriendsService);

  protected readonly trending = signal<TmdbMovie[]>([]);
  protected readonly popular = signal<TmdbMovie[]>([]);
  protected readonly recommended = signal<TmdbMovie[]>([]);
  protected readonly loading = signal(true);
  protected readonly hasApiKey = this.movieService.hasApiKey();

  protected readonly watchedCount = computed(() => this.library.watchedMovies().length);
  protected readonly ratedCount = computed(() => this.library.ratedMovies().length);
  protected readonly watchlistCount = computed(() => this.watchlistService.watchlists().length);
  protected readonly friendsCount = computed(() => this.friendsService.friends().length);

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

  private loadRecommendations(): void {
    const topRated = this.library.ratedMovies().filter(e => e.rating >= 4);
    if (topRated.length === 0) {
      this.movieService.getTopRated().subscribe({
        next: page => this.recommended.set(page.results.slice(0, 8)),
        error: () => {},
      });
      return;
    }

    const genreFreq: Record<number, number> = {};
    for (const entry of topRated) {
      for (const g of (entry.movie.genre_ids ?? [])) {
        genreFreq[g] = (genreFreq[g] ?? 0) + 1;
      }
    }
    const topGenre = Object.entries(genreFreq).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topGenre) return;

    this.movieService.discoverMovies({ with_genres: topGenre, 'vote_average.gte': 7 }).subscribe({
      next: page => {
        const watchedIds = new Set(this.library.watchedMovies().map(e => e.movieId));
        this.recommended.set(page.results.filter(m => !watchedIds.has(m.id)).slice(0, 8));
      },
      error: () => {},
    });
  }
}
