import { Component, computed, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatFabButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../services/watchlist.service';
import { Watchlist } from '../../../../core/models/watchlist.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-watchlist-overview',
  imports: [MatIcon, MatButton, RouterLink, LoadingSpinnerComponent, EmptyStateComponent],
  template: `
    <div class="page-container">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl font-bold text-text-primary tracking-tight">Mijn Watchlists</h1>
        <button mat-flat-button color="primary" (click)="createWatchlist()">
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
            <a class="watchlist-card glass-card p-5 hover:border-accent/30 transition-all cursor-pointer block no-underline"
               [routerLink]="['/watchlists', list.id]">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <mat-icon class="text-accent-light">bookmark</mat-icon>
                </div>
                <div class="flex gap-1">
                  <button mat-icon-button class="text-text-muted" (click)="deleteWatchlist(list, $event)" title="Verwijderen">
                    <mat-icon style="font-size: 1.125rem; width: 1.125rem; height: 1.125rem;">delete_outline</mat-icon>
                  </button>
                </div>
              </div>
              <h3 class="font-semibold text-text-primary mb-1">{{ list.name }}</h3>
              @if (list.description) {
                <p class="text-text-muted text-sm mb-3 line-clamp-2">{{ list.description }}</p>
              }
              <div class="flex items-center gap-2 text-xs text-text-muted">
                <mat-icon style="font-size: 1rem; width: 1rem; height: 1rem;">movie</mat-icon>
                <span>{{ list._count?.movies ?? (list.movies?.length ?? 0) }} films</span>
                @if (list.isPublic) {
                  <span class="ml-auto flex items-center gap-1">
                    <mat-icon style="font-size: 0.875rem; width: 0.875rem; height: 0.875rem;">public</mat-icon>
                    Publiek
                  </span>
                }
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .watchlist-grid {
      display: grid;
      grid-template-columns: repeat(1, 1fr);
      gap: 1rem;

      @media (min-width: 640px) {
        grid-template-columns: repeat(2, 1fr);
      }

      @media (min-width: 1024px) {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `],
})
export class WatchlistOverviewComponent {
  private readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);

  protected readonly loading = computed(() => !this.watchlistService.loaded());
  protected readonly watchlists = this.watchlistService.watchlists;

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
