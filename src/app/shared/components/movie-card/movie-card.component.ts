import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatRipple } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { TmdbMovie } from '../../../core/models/movie.model';
import { MovieService } from '../../../features/movies/services/movie.service';
import { UserLibraryService } from '../../../core/services/user-library.service';
import { WatchlistService } from '../../../features/watchlists/services/watchlist.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { StarRatingComponent } from '../star-rating/star-rating.component';

@Component({
  selector: 'app-movie-card',
  imports: [RouterLink, DecimalPipe, MatIcon, MatRipple, MatTooltip, StarRatingComponent],
  template: `
    <div
      class="movie-card group relative cursor-pointer"
      matRipple
      [matRippleColor]="'rgba(124, 58, 237, 0.1)'"
    >
      <a [routerLink]="['/movies', movie().id]" class="block">
        <div class="poster-wrap rounded-card bg-surface-50">
          <img
            [src]="posterUrl()"
            [alt]="movie().title"
            class="poster-img transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            (error)="onImageError($event)"
          />

          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent
                      opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
            @if (movie().vote_average > 0) {
              <div class="flex items-center gap-1 mb-2">
                <app-star-rating [value]="normalizedRating()" [readonly]="true" [size]="14" />
                <span class="text-xs text-white/80">{{ movie().vote_average | number:'1.1-1' }}</span>
              </div>
            }
            <p class="text-white/70 text-xs line-clamp-3 leading-relaxed">{{ movie().overview }}</p>
          </div>

          @if (showActions()) {
            <div class="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                type="button"
                class="action-icon-btn"
                [class.action-active-purple]="isInAnyWatchlist()"
                (click)="onAddToWatchlist($event)"
                [matTooltip]="isInAnyWatchlist() ? 'In watchlist' : 'Toevoegen aan watchlist'"
              >
                <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">
                  {{ isInAnyWatchlist() ? 'bookmark' : 'bookmark_add' }}
                </mat-icon>
              </button>
              <button
                type="button"
                class="action-icon-btn"
                [class.action-active-green]="isWatched()"
                (click)="onMarkWatched($event)"
                [matTooltip]="isWatched() ? 'Gezien' : 'Markeer als gezien'"
              >
                <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">
                  {{ isWatched() ? 'check_circle' : 'check_circle_outline' }}
                </mat-icon>
              </button>
            </div>
          }

          @if (movie().vote_average > 0) {
            <div class="absolute top-2 left-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5">
              <mat-icon class="text-gold" style="font-size: 0.75rem; width: 0.75rem; height: 0.75rem;">star</mat-icon>
              <span class="text-white text-xs font-medium">{{ movie().vote_average | number:'1.1-1' }}</span>
            </div>
          }
        </div>

        <div class="card-info mt-2 px-0.5">
          <h3 class="text-text-primary text-sm font-medium truncate leading-tight">{{ movie().title }}</h3>
          <p class="text-text-muted text-xs mt-0.5">{{ movieService.formatYear(movie().release_date) }}</p>
        </div>
      </a>
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .movie-card { width: 100%; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    .movie-card:hover { transform: translateY(-4px); }
    .poster-wrap { position: relative; width: 100%; aspect-ratio: 2 / 3; overflow: hidden; background: #16162a; }
    .poster-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .card-info { min-height: 2.75rem; overflow: hidden; }
    .action-icon-btn {
      width: 2rem; height: 2rem; border-radius: 50%;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      border: none; cursor: pointer; color: white;
      transition: background 0.15s;
      &:hover { background: rgba(124,58,237,0.7); }
    }
    .action-active-purple { background: rgba(124,58,237,0.8) !important; color: white; }
    .action-active-green { background: rgba(74,222,128,0.25) !important; color: #4ade80; }
  `],
})
export class MovieCardComponent {
  readonly movie = input.required<TmdbMovie>();
  readonly showActions = input<boolean>(false);

  readonly addToWatchlist = output<TmdbMovie>();
  readonly markWatched = output<TmdbMovie>();

  protected readonly movieService = inject(MovieService);
  private readonly libraryService = inject(UserLibraryService);
  private readonly watchlistService = inject(WatchlistService);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

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
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const newState = this.libraryService.toggleWatched(this.movie());
    this.notifications.success(newState ? 'Gemarkeerd als gezien!' : 'Markering verwijderd');
    this.markWatched.emit(this.movie());
  }

  protected onAddToWatchlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }
    const lists = this.watchlistService.watchlists();
    if (lists.length === 0) {
      this.notifications.info('Maak eerst een watchlist aan via de Watchlists pagina.');
      return;
    }
    if (lists.length === 1) {
      const wl = lists[0];
      if (this.watchlistService.isMovieInWatchlist(wl.id, this.movie().id)) {
        this.watchlistService.removeMovie(wl.id, this.movie().id).subscribe();
        this.notifications.success(`Verwijderd uit "${wl.name}"`);
      } else {
        this.watchlistService.addMovie(wl.id, this.movie()).subscribe();
        this.notifications.success(`Toegevoegd aan "${wl.name}"`);
      }
    } else {
      this.router.navigate(['/movies', this.movie().id]);
    }
    this.addToWatchlist.emit(this.movie());
  }
}
