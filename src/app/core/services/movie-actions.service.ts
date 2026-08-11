import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TmdbMovie } from '../models/movie.model';
import { AuthService } from '../../features/auth/services/auth.service';
import { WatchlistService } from '../../features/watchlists/services/watchlist.service';
import { UserLibraryService } from './user-library.service';
import { NotificationService } from './notification.service';
import { WatchlistPickerSheetComponent } from '../../shared/components/watchlist-picker-sheet/watchlist-picker-sheet.component';

/**
 * Single source of truth for the "toggle watchlist" / "toggle gezien" actions
 * shared by the movie card, movie detail page, and anywhere else a movie can
 * be acted on. Owns the auth-guard, the notification text, and the
 * single-list-vs-bottom-sheet decision so components only trigger intent.
 */
@Injectable({ providedIn: 'root' })
export class MovieActionsService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly watchlistService = inject(WatchlistService);
  private readonly libraryService = inject(UserLibraryService);
  private readonly notifications = inject(NotificationService);
  private readonly bottomSheet = inject(MatBottomSheet);

  toggleWatchlist(movie: TmdbMovie): void {
    if (!this.requireAuth()) return;

    const lists = this.watchlistService.watchlists();
    if (lists.length === 0) {
      this.notifications.info('Maak eerst een watchlist aan via de Watchlists pagina.');
      return;
    }

    if (lists.length === 1) {
      const wl = lists[0];
      if (this.watchlistService.isMovieInWatchlist(wl.id, movie.id)) {
        this.watchlistService.removeMovie(wl.id, movie.id).subscribe();
        this.notifications.success(`Verwijderd uit "${wl.name}"`);
      } else {
        this.watchlistService.addMovie(wl.id, movie).subscribe();
        this.notifications.success(`Toegevoegd aan "${wl.name}"`);
      }
      return;
    }

    this.bottomSheet.open(WatchlistPickerSheetComponent, { data: { movie } });
  }

  toggleWatched(movie: TmdbMovie): void {
    if (!this.requireAuth()) return;
    const newState = this.libraryService.toggleWatched(movie);
    this.notifications.success(newState ? 'Gemarkeerd als gezien!' : 'Markering verwijderd');
  }

  private requireAuth(): boolean {
    if (this.authService.isAuthenticated()) return true;
    this.router.navigate(['/auth/login']);
    return false;
  }
}
