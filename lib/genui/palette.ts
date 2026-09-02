/**
 * Categorical series colours.
 *
 * The values live in `app/globals.css` as `--series-1..6` and are validated in
 * both modes by `scripts/validate_palette.js` -- see `tasks/chart-design.md`.
 * Referencing them as CSS vars (rather than hex) is what makes a chart follow
 * the theme toggle without re-rendering.
 */

export const SERIES_SLOTS = 6;

/**
 * Colour for slot `index`, assigned in fixed order.
 *
 * Deliberately NOT modular: a 7th series is never a recycled hue, because two
 * series sharing a colour is worse than one series losing its identity. Callers
 * cap the list with {@link foldSeries} first; anything past the end falls back
 * to muted ink, which reads as "Other" rather than as a peer series.
 */
export function seriesColor(index: number): string {
  return index < SERIES_SLOTS ? `var(--series-${index + 1})` : 'var(--muted-foreground)';
}

/**
 * Slots 2 (brass) and 6 (moss) sit below 3:1 against the light paper surface.
 * The relief rule makes direct labels mandatory when either is on screen -- it
 * is not a preference and not dismissable.
 */
const LOW_CONTRAST_LIGHT_SLOTS = new Set([1, 5]);

export function needsDirectLabels(seriesCount: number): boolean {
  for (let i = 0; i < Math.min(seriesCount, SERIES_SLOTS); i++) {
    if (LOW_CONTRAST_LIGHT_SLOTS.has(i)) return true;
  }
  return false;
}

/**
 * Cap a series list at the palette width, folding the tail into one "Other"
 * entry whose values are summed. Keeps identity honest instead of cycling hues.
 */
export function foldSeries<T extends { name: string; data: number[] }>(series: T[]): T[] {
  if (series.length <= SERIES_SLOTS) return series;

  const kept = series.slice(0, SERIES_SLOTS - 1);
  const tail = series.slice(SERIES_SLOTS - 1);
  const width = Math.max(...tail.map((s) => s.data.length));

  const other = {
    name: 'Other',
    data: Array.from({ length: width }, (_, i) =>
      tail.reduce((sum, s) => sum + (s.data[i] ?? 0), 0)
    ),
  } as T;

  return [...kept, other];
}
