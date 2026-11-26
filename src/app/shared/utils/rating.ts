/** Beoordelingen lopen van 0,5 tot 5 in stappen van een halve ster (0 = geen beoordeling). */
export const RATING_STEP = 0.5;

const LABELS: Record<number, string> = {
  0.5: 'Waardeloos',
  1: 'Slecht',
  1.5: 'Zwak',
  2: 'Matig',
  2.5: 'Redelijk',
  3: 'Goed',
  3.5: 'Prima',
  4: 'Heel goed',
  4.5: 'Geweldig',
  5: 'Uitstekend',
};

/** Rondt af op de dichtstbijzijnde halve ster binnen 0–5. */
export function normalizeRating(rating: number): number {
  return Math.min(5, Math.max(0, Math.round(rating / RATING_STEP) * RATING_STEP));
}

/** 3.5 → "3,5", 4 → "4" */
export function formatRating(rating: number): string {
  return normalizeRating(rating).toLocaleString('nl-NL', { maximumFractionDigits: 1 });
}

/** 1 → "1 ster", 3.5 → "3,5 sterren" */
export function formatStars(rating: number): string {
  return `${formatRating(rating)} ${normalizeRating(rating) === 1 ? 'ster' : 'sterren'}`;
}

export function ratingLabel(rating: number): string {
  return LABELS[normalizeRating(rating)] ?? '';
}
