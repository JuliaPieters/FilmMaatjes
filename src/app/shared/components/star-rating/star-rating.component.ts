import { Component, input, model, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-star-rating',
  imports: [MatIcon, MatTooltip],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  readonly value = model<number>(0);
  readonly readonly = input<boolean>(false);
  readonly size = input<number>(24);
  readonly showValue = input<boolean>(false);
  readonly containerClass = input<string>('');

  readonly ratingChange = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  private hoveredStar = signal(0);

  protected readonly currentRating = this.value;

  protected getStarIcon(star: number): string {
    const active = this.hoveredStar() > 0 ? this.hoveredStar() : this.value();
    return star <= active ? 'star' : 'star_border';
  }

  protected getStarClass(star: number): string {
    const active = this.hoveredStar() > 0 ? this.hoveredStar() : this.value();
    const base = 'transition-colors duration-150';
    if (star <= active) {
      return `${base} text-gold`;
    }
    return `${base} text-text-muted`;
  }

  protected setHover(star: number): void {
    this.hoveredStar.set(star);
  }

  protected clearHover(): void {
    this.hoveredStar.set(0);
  }

  protected select(star: number): void {
    const newValue = this.value() === star ? 0 : star;
    this.value.set(newValue);
    this.ratingChange.emit(newValue);
  }

  protected starLabel(star: number): string {
    const labels = ['Slecht', 'Matig', 'Goed', 'Heel goed', 'Uitstekend'];
    return labels[star - 1] ?? '';
  }
}
