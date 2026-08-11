import { Component, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';

export interface RouletteFilterSheetGenre {
  id: number;
  name: string;
}

export interface RouletteFilterSheetDecade {
  label: string;
  from?: number;
  to?: number;
}

export interface RouletteFilterSheetData {
  genres: RouletteFilterSheetGenre[];
  decadeOptions: RouletteFilterSheetDecade[];
  selectedGenreIds: () => number[];
  minRating: () => number;
  yearFrom: () => number | null;
  isGenreSelected: (genreId: number) => boolean;
  toggleGenre: (genreId: number) => void;
  setDecade: (option: RouletteFilterSheetDecade) => void;
  setMinRating: (value: number) => void;
  clearFilters: () => void;
}

@Component({
  selector: 'app-roulette-filter-sheet',
  imports: [MatIcon, MatSlider, MatSliderThumb, FormsModule],
  template: `
    <div class="sheet">
      <div class="sheet-header">
        <h3 class="sheet-title">
          <mat-icon>tune</mat-icon>
          Filters
        </h3>
        <div class="sheet-header-actions">
          @if (data.selectedGenreIds().length > 0 || data.minRating() > 0 || data.yearFrom()) {
            <button type="button" class="sheet-clear" (click)="data.clearFilters()">Wissen</button>
          }
          <button type="button" class="sheet-close" (click)="close()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">Genre</label>
        <div class="genre-chips">
          @for (genre of data.genres; track genre.id) {
            <button
              type="button"
              class="genre-chip"
              [class.selected]="data.isGenreSelected(genre.id)"
              (click)="data.toggleGenre(genre.id)"
            >
              {{ genre.name }}
            </button>
          }
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">Decennium</label>
        <div class="decade-chips">
          @for (decade of data.decadeOptions; track decade.label) {
            <button
              type="button"
              class="genre-chip"
              [class.selected]="data.yearFrom() === (decade.from ?? null)"
              (click)="data.setDecade(decade)"
            >
              {{ decade.label }}
            </button>
          }
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">
          Minimale beoordeling: {{ data.minRating() > 0 ? data.minRating() + '/10' : 'Alles' }}
        </label>
        <mat-slider min="0" max="9" step="1" class="w-full">
          <input matSliderThumb [(ngModel)]="minRatingValue" />
        </mat-slider>
      </div>
    </div>
  `,
  styles: [`
    .sheet { padding: 4px 12px calc(16px + env(safe-area-inset-bottom)); }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .sheet-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 16px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;

      mat-icon {
        color: var(--color-accent-light);
        font-size: 1.125rem;
        width: 1.125rem;
        height: 1.125rem;
      }
    }

    .sheet-header-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .sheet-clear {
      border: none;
      background: none;
      color: var(--color-text-meta);
      font-size: 13px;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }

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

    .filter-group { margin-bottom: 1.25rem; }

    .filter-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: 0.625rem;
    }

    .genre-chips,
    .decade-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .genre-chip {
      padding: 0.375rem 0.75rem;
      border-radius: 100px;
      font-size: 0.8125rem;
      font-weight: 500;
      background: rgba(var(--color-white-rgb), 0.05);
      border: 1px solid rgba(var(--color-white-rgb), 0.1);
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.15s;

      &.selected {
        background: rgba(var(--color-accent-rgb), 0.25);
        border-color: var(--color-accent);
        color: var(--color-accent-lighter);
      }

      &:active { background: rgba(var(--color-accent-rgb), 0.15); }
    }
  `],
})
export class RouletteFilterSheetComponent {
  protected readonly data = inject<RouletteFilterSheetData>(MAT_BOTTOM_SHEET_DATA);
  private readonly sheetRef = inject(MatBottomSheetRef<RouletteFilterSheetComponent>);

  protected get minRatingValue(): number {
    return this.data.minRating();
  }

  protected set minRatingValue(value: number) {
    this.data.setMinRating(value);
  }

  protected close(): void {
    this.sheetRef.dismiss();
  }
}
