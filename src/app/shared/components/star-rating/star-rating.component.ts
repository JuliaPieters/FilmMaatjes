import { Component, computed, input, model, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { formatRating, formatStars, normalizeRating, RATING_STEP, ratingLabel } from '../../utils/rating';

@Component({
  selector: 'app-star-rating',
  imports: [MatIcon],
  templateUrl: './star-rating.component.html',
  styleUrl: './star-rating.component.scss',
})
export class StarRatingComponent {
  /** 0–5 in stappen van 0,5; 0 = geen beoordeling. */
  readonly value = model<number>(0);
  readonly readonly = input<boolean>(false);
  readonly size = input<number>(24);
  readonly showValue = input<boolean>(false);
  readonly containerClass = input<string>('');

  readonly ratingChange = output<number>();

  protected readonly stars = [1, 2, 3, 4, 5];
  private readonly hovered = signal(0);

  private readonly displayed = computed(() => normalizeRating(this.hovered() || this.value()));

  protected readonly format = formatRating;
  protected readonly label = ratingLabel;

  /** Hoeveel van deze ster goud is: niets, de linkerhelft of alles. */
  protected fillClip(star: number): string {
    const shown = this.displayed();
    if (shown >= star) return 'inset(0)';
    if (shown >= star - RATING_STEP) return 'inset(0 50% 0 0)';
    return 'inset(0 100% 0 0)';
  }

  protected ariaText(rating: number): string {
    return rating > 0 ? `${formatStars(rating)} van 5, ${ratingLabel(rating)}` : 'Geen beoordeling';
  }

  protected onHover(event: MouseEvent, star: number): void {
    // Hover alleen met een echte muis; op touch blijft hij anders "hangen" na een tik.
    if (matchMedia('(hover: hover)').matches) this.hovered.set(this.valueAt(event, star));
  }

  protected clearHover(): void {
    this.hovered.set(0);
  }

  protected onSelect(event: MouseEvent, star: number): void {
    const picked = this.valueAt(event, star);
    // Nogmaals op dezelfde waarde tikken wist de beoordeling.
    this.commit(this.value() === picked ? 0 : picked);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.readonly()) return;
    const steps: Record<string, number> = {
      ArrowRight: RATING_STEP, ArrowUp: RATING_STEP,
      ArrowLeft: -RATING_STEP, ArrowDown: -RATING_STEP,
    };
    let next: number | null = null;
    if (event.key in steps) next = normalizeRating(this.value() + steps[event.key]);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 5;
    if (next === null) return;
    event.preventDefault();
    this.commit(next);
  }

  /** Linkerhelft van de ster = halve ster, rechterhelft = hele ster. */
  private valueAt(event: MouseEvent, star: number): number {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Klik via toetsenbord heeft geen coördinaten: dan de hele ster.
    if (event.detail === 0 || rect.width === 0) return star;
    return event.clientX - rect.left < rect.width / 2 ? star - RATING_STEP : star;
  }

  private commit(rating: number): void {
    if (rating === this.value()) return;
    this.value.set(rating);
    this.ratingChange.emit(rating);
  }
}
