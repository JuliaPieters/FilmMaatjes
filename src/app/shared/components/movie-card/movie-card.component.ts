import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { TmdbMovie } from '../../../core/models/movie.model';
import { MovieService } from '../../../features/movies/services/movie.service';
import { UserLibraryService } from '../../../core/services/user-library.service';
import { WatchlistService } from '../../../features/watchlists/services/watchlist.service';
import { MovieActionsService } from '../../../core/services/movie-actions.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-movie-card',
  imports: [RouterLink, DecimalPipe, MatIcon, MatRipple, MatTooltip, StarRatingComponent],
  templateUrl: './movie-card.component.html',
  styleUrl: './movie-card.component.scss',
})
export class MovieCardComponent {
  readonly movie = input.required<TmdbMovie>();
  readonly showActions = input<boolean>(false);

  readonly addToWatchlist = output<TmdbMovie>();
  readonly markWatched = output<TmdbMovie>();

  protected readonly movieService = inject(MovieService);
  private readonly libraryService = inject(UserLibraryService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly movieActions = inject(MovieActionsService);

  protected readonly isWatched = computed(() => this.libraryService.isWatched(this.movie().id));
  protected readonly isInAnyWatchlist = computed(() => this.watchlistService.isMovieInAnyWatchlist(this.movie().id));

  protected posterUrl = (): string => this.movieService.getPosterUrl(this.movie().poster_path, 'w342');
  protected normalizedRating = (): number => Math.round(this.movie().vote_average / 2);

  protected onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/movie-placeholder.svg';
  }

  protected onMarkWatched(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.movieActions.toggleWatched(this.movie());
    this.markWatched.emit(this.movie());
  }

  protected onAddToWatchlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.movieActions.toggleWatchlist(this.movie());
    this.addToWatchlist.emit(this.movie());
  }
}
