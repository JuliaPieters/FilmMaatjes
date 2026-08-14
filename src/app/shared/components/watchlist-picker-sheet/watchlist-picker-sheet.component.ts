import { Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { TmdbMovie } from '../../../core/models/movie.model';
import { WatchlistService } from '../../../features/watchlists/services/watchlist.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface WatchlistPickerSheetData {
  movie: TmdbMovie;
}

@Component({
  selector: 'app-watchlist-picker-sheet',
  imports: [MatIcon],
  templateUrl: './watchlist-picker-sheet.component.html',
  styleUrl: './watchlist-picker-sheet.component.scss',
})
export class WatchlistPickerSheetComponent {
  protected readonly watchlistService = inject(WatchlistService);
  private readonly notifications = inject(NotificationService);
  private readonly sheetRef = inject(MatBottomSheetRef<WatchlistPickerSheetComponent>);
  private readonly data = inject<WatchlistPickerSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected isIn(watchlistId: string): boolean {
    return this.watchlistService.isMovieInWatchlist(watchlistId, this.data.movie.id);
  }

  protected toggle(watchlistId: string): void {
    const wl = this.watchlistService.watchlists().find(w => w.id === watchlistId);
    if (!wl) return;
    if (this.isIn(watchlistId)) {
      this.watchlistService.removeMovie(watchlistId, this.data.movie.id).subscribe();
      this.notifications.success(`Verwijderd uit "${wl.name}"`);
    } else {
      this.watchlistService.addMovie(watchlistId, this.data.movie).subscribe();
      this.notifications.success(`Toegevoegd aan "${wl.name}"`);
    }
  }

  protected close(): void {
    this.sheetRef.dismiss();
  }
}
