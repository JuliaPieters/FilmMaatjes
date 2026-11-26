import { Component, computed, input, model, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-star-rating',
  imports: [MatIcon],
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
  private readonly hoveredStar = signal(0);

  protected readonly activeValue = computed(() => this.hoveredStar() || this.value());

  protected setHover(star: number): void {
    // Hover alleen met een echte muis; op touch blijft hij anders "hangen" na een tik.
    if (!this.readonly() && matchMedia('(hover: hover)').matches) this.hoveredStar.set(star);
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
