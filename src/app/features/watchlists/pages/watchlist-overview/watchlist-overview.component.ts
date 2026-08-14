import { Component, computed, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../services/watchlist.service';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { MovieService } from '../../../movies/services/movie.service';

@Component({
  selector: 'app-watchlist-overview',
  imports: [MatIcon, MatButton, MatFabButton, MatIconButton, RouterLink, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="page-container">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Mijn Watchlists</h1>
        <button mat-flat-button color="primary" class="header-new-btn" (click)="createWatchlist()">
          <mat-icon>add</mat-icon>
          Nieuwe watchlist
        </button>
      </div>

      @if (loading()) {
        <app-loading-spinner message="Watchlists laden..." />
      } @else if (watchlists().length === 0) {
        <app-empty-state
          icon="bookmark_border"
          title="Nog geen watchlists"
          description="Maak een watchlist aan om films bij te houden die je wilt kijken."
          actionLabel="Watchlist aanmaken"
        />
      } @else {
        <div class="watchlist-grid">
          @for (list of watchlists(); track list.id) {
            <a class="watchlist-card glass-card p-4 hover:border-accent/30 transition-all cursor-pointer block no-underline"
               [routerLink]="['/watchlists', list.id]">
              <div class="flex items-center justify-between mb-3">
                <div class="list-icon w-11 h-11 bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <mat-icon class="text-accent-light">bookmark</mat-icon>
                </div>
                <div class="flex gap-1">
                  <button mat-icon-button class="delete-btn text-text-muted" (click)="deleteWatchlist(list, $event)" title="Verwijderen">
                    <mat-icon style="font-size: 1.125rem; width: 1.125rem; height: 1.125rem;">delete_outline</mat-icon>
                  </button>
                </div>
              </div>
              <h3 class="list-name font-semibold text-text-primary mb-1">{{ list.name }}</h3>
              @if (list.description) {
                <p class="list-description text-text-muted text-sm mb-3 line-clamp-2">{{ list.description }}</p>
              }
              <div class="flex items-center gap-2 text-xs text-text-muted">
                <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">movie</mat-icon>
                <span>{{ (list.movies.length || list._count?.movies || 0) }} films</span>
                @if (list.isPublic) {
                  <span class="ml-auto flex items-center gap-1">
                    <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">public</mat-icon>
                    Publiek
                  </span>
                }
              </div>
              @if (list.movies.length > 0) {
                <div class="poster-strip">
                  @for (entry of list.movies.slice(0, 3); track entry.movieId) {
                    <img class="poster-thumb" [src]="posterUrl(entry.movie?.poster_path)" [alt]="entry.movie?.title ?? ''" />
                  }
                  @if (list.movies.length > 3) {
                    <div class="poster-thumb poster-more">+{{ list.movies.length - 3 }}</div>
                  }
                </div>
              }
            </a>
          }
        </div>
      }

      <button mat-fab class="new-watchlist-fab" (click)="createWatchlist()" aria-label="Nieuwe watchlist" title="Nieuwe watchlist">
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .watchlist-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 1rem;

      > * {
        min-width: 0;
      }

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .new-watchlist-fab {
      display: none;
    }

    .poster-strip {
      display: none;
    }

    .list-icon {
      border-radius: 10px;
    }

    @media (max-width: 767px) {
      .header-new-btn {
        display: none;
      }

      .new-watchlist-fab {
        display: flex;
        align-items: center;
        justify-content: center;
        position: fixed;
        right: 20px;
        bottom: 108px;
        width: 56px;
        height: 56px;
        min-width: 56px;
        border-radius: 50%;
        background-color: var(--color-accent) !important;
        box-shadow: 0 8px 30px rgba(var(--color-accent-rgb), 0.45);
        z-index: 40;
        color: #fff !important;
      }

      .new-watchlist-fab mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
        color: #fff !important;
      }

      .watchlist-card {
        border-radius: 12px;
        background: rgba(var(--color-surface-50-rgb), 0.8);
        border: 1px solid rgba(var(--color-white-rgb), 0.06);
      }

      .delete-btn {
        width: 44px !important;
        height: 44px !important;
        padding: 0;
      }

      .list-name {
        font-size: 17px;
        font-weight: 600;
      }

      .list-description {
        font-size: 14px;
        color: var(--color-text-meta);
      }

      .poster-strip {
        display: flex;
        gap: 6px;
        margin-top: 12px;
      }

      .poster-thumb {
        width: 48px;
        height: 72px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
      }

      .poster-more {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(var(--color-accent-rgb), 0.15);
        color: var(--color-accent-light);
        font-size: 13px;
        font-weight: 600;
      }
    }
  `],
})
export class WatchlistOverviewComponent {
  private readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);
  private readonly movieService = inject(MovieService);

  protected readonly loading = computed(() => !this.watchlistService.loaded());
  protected readonly watchlists = this.watchlistService.watchlists;

  protected posterUrl(path: string | null | undefined): string {
    return this.movieService.getPosterUrl(path ?? null, 'w185');
  }

  protected createWatchlist(): void {
    const name = window.prompt('Naam van de watchlist:');
    if (!name?.trim()) return;

    this.watchlistService.create({ name: name.trim() }).subscribe({
      next: () => this.notifications.success('Watchlist aangemaakt!'),
      error: () => this.notifications.error('Aanmaken mislukt. Probeer opnieuw.'),
    });
  }

  protected deleteWatchlist(list: Watchlist, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Weet je zeker dat je "${list.name}" wilt verwijderen?`)) return;

    this.watchlistService.delete(list.id).subscribe({
      next: () => this.notifications.success('Watchlist verwijderd.'),
      error: () => this.notifications.error('Verwijderen mislukt.'),
    });
  }
}
