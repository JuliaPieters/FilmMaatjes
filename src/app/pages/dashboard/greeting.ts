/** Tijdsafhankelijke begroeting, puur op basis van het uur (0–23). */
export function greetingForHour(hour: number): string {
  if (hour < 6) return 'Goedenacht';
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}
