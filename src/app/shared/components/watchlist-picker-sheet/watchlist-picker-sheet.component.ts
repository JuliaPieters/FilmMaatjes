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
  template: `
    <div class="sheet">
      <div class="sheet-header">
        <h3 class="sheet-title">Toevoegen aan watchlist</h3>
        <button type="button" class="sheet-close" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      @if (watchlistService.watchlists().length === 0) {
        <p class="sheet-empty">Je hebt nog geen watchlists.</p>
      } @else {
        <div class="sheet-list">
          @for (wl of watchlistService.watchlists(); track wl.id) {
            <button type="button" class="sheet-item" (click)="toggle(wl.id)">
              <span class="sheet-item-icon" [class.active]="isIn(wl.id)">
                <mat-icon>{{ isIn(wl.id) ? 'bookmark' : 'bookmark_add' }}</mat-icon>
              </span>
              <span class="sheet-item-name">{{ wl.name }}</span>
              @if (isIn(wl.id)) {
                <mat-icon class="sheet-item-check">check</mat-icon>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .sheet { padding: 4px 4px calc(12px + env(safe-area-inset-bottom)); }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 0 4px 0 12px;
    }
    .sheet-title { font-size: 16px; font-weight: 700; color: var(--color-text-primary); margin: 0; }
    .sheet-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      flex-shrink: 0;

      &:active { background: rgba(var(--color-white-rgb), 0.08); }
    }
    .sheet-empty { color: var(--color-text-secondary); font-size: 14px; padding: 0 12px 12px; }
    .sheet-list { display: flex; flex-direction: column; }
    .sheet-item {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      padding: 0 12px;
      border: none;
      background: none;
      border-radius: 10px;
      color: var(--color-text-primary);
      font-size: 15px;
      cursor: pointer;
      text-align: left;

      &:active { background: rgba(var(--color-white-rgb), 0.06); }
    }
    .sheet-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(var(--color-accent-rgb), 0.15);
      color: var(--color-accent-light);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.active { background: rgba(var(--color-accent-rgb), 0.8); color: white; }
    }
    .sheet-item-name { flex: 1; min-width: 0; }
    .sheet-item-check { color: var(--color-success); }
  `],
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
