/** Pixel-chart helpers (pure, no Phaser), used for the year-in-review chart on the ending screen. */

export interface Point {
  x: number;
  y: number;
}

/**
 * Map values to integer pixel points inside a box. Values are spread evenly
 * left to right; `min`/`max` set the vertical range (higher values are higher up).
 */
export function chartPoints(values: number[], box: { x: number; y: number; w: number; h: number }, min: number, max: number): Point[] {
  if (!values.length) return [];
  const span = max - min || 1;
  const step = values.length > 1 ? (box.w - 1) / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: Math.round(box.x + (values.length > 1 ? i * step : (box.w - 1) / 2)),
    y: Math.round(box.y + (box.h - 1) * (1 - (Math.min(max, Math.max(min, v)) - min) / span)),
  }));
}

/** A vertical range that includes every value and zero, so profit and loss read clearly. */
export function rangeWithZero(values: number[]): { min: number; max: number } {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return max === min ? { min, max: min + 1 } : { min, max };
}
