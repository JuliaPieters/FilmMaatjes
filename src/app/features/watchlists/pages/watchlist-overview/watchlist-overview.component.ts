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
  templateUrl: './watchlist-overview.component.html',
  styleUrl: './watchlist-overview.component.scss',
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
