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
  templateUrl: './roulette-filter-sheet.component.html',
  styleUrl: './roulette-filter-sheet.component.scss',
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
