import { Component, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TmdbMovie } from '../../../core/models/movie.model';
import { WatchlistService } from '../../../features/watchlists/services/watchlist.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface WatchlistPickerSheetData {
  movie: TmdbMovie;
}

@Component({
  selector: 'app-watchlist-picker-sheet',
  imports: [MatIcon, MatButton],
  templateUrl: './watchlist-picker-sheet.component.html',
  styleUrl: './watchlist-picker-sheet.component.scss',
})
export class WatchlistPickerSheetComponent {
  protected readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);
  private readonly sheetRef = inject(MatBottomSheetRef<WatchlistPickerSheetComponent>);
  private readonly data = inject<WatchlistPickerSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected readonly movieTitle = this.data.movie.title;
  protected readonly creating = signal(this.watchlistService.pickableWatchlists().length === 0);
  protected readonly newName = signal('');
  protected readonly saving = signal(false);

  protected isIn(watchlistId: string): boolean {
    return this.watchlistService.isMovieInWatchlist(watchlistId, this.data.movie.id);
  }

  protected toggle(watchlistId: string): void {
    const watchlist = this.watchlistService.watchlists().find(w => w.id === watchlistId);
    if (!watchlist) return;
    if (this.isIn(watchlistId)) {
      this.watchlistService.removeMovie(watchlistId, this.data.movie.id).subscribe();
      this.notifications.success(`Verwijderd uit "${watchlist.name}"`);
    } else {
      this.watchlistService.addMovie(watchlistId, this.data.movie).subscribe();
      this.notifications.success(`Toegevoegd aan "${watchlist.name}"`);
    }
  }

  protected create(): void {
    const name = this.newName().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    this.watchlistService.create({ name }).subscribe(watchlist => {
      this.saving.set(false);
      if (!watchlist.id) {
        this.notifications.error('Lijst aanmaken mislukt.');
        return;
      }
      this.creating.set(false);
      this.newName.set('');
      this.toggle(watchlist.id);
    });
  }

  protected close(): void {
    this.sheetRef.dismiss();
  }
}
