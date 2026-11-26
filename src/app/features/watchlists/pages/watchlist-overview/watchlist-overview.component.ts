import { Component, computed, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../services/watchlist.service';
import { Watchlist, WatchlistMovie } from '../../../../core/models/watchlist.model';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { MovieService } from '../../../movies/services/movie.service';

@Component({
  selector: 'app-watchlist-overview',
  imports: [MatIcon, MatButton, RouterLink, LoadingSpinnerComponent, EmptyStateComponent],
  templateUrl: './watchlist-overview.component.html',
  styleUrl: './watchlist-overview.component.scss',
})
export class WatchlistOverviewComponent {
  private readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);
  private readonly movieService = inject(MovieService);

  /** Aantal tegels in de posterstrip (inclusief eventuele "+N"-tegel). */
  protected readonly stripSize = 4;

  protected readonly loading = computed(() => !this.watchlistService.loaded());
  protected readonly watchlists = this.watchlistService.watchlists;

  protected posterUrl(path: string | null | undefined): string {
    return this.movieService.getPosterUrl(path ?? null, 'w185');
  }

  protected movieCount(list: Watchlist): number {
    return list.movies.length || list._count?.movies || 0;
  }

  /** Bij meer films dan tegels: één tegel minder zodat de "+N"-tegel past. */
  protected stripMovies(list: Watchlist): WatchlistMovie[] {
    const count = list.movies.length > this.stripSize ? this.stripSize - 1 : this.stripSize;
    return list.movies.slice(0, count);
  }

  protected emptySlots(list: Watchlist): null[] {
    return Array(Math.max(0, this.stripSize - list.movies.length)).fill(null);
  }

  protected createWatchlist(): void {
    const name = window.prompt('Naam van de watchlist:');
    if (!name?.trim()) return;

    this.watchlistService.create({ name: name.trim() }).subscribe({
      next: () => this.notifications.success('Watchlist aangemaakt, vul hem maar'),
      error: () => this.notifications.error('Aanmaken mislukt. Probeer opnieuw.'),
    });
  }

  protected deleteWatchlist(list: Watchlist, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Weet je zeker dat je "${list.name}" wilt verwijderen?`)) return;

    this.watchlistService.delete(list.id).subscribe({
      next: () => this.notifications.success('Watchlist verwijderd'),
      error: () => this.notifications.error('Verwijderen mislukt.'),
    });
  }
}
