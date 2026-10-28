export interface Mood { value: number; label: string; color: string }

/** Muted scale: dusty rose-red (low) -> antique gold (middle) -> sage/teal (high). */
export const MOODS: Mood[] = [
  { value: 1, label: 'Very low', color: '#9f4a47' },
  { value: 2, label: 'Low', color: '#b5584f' },
  { value: 3, label: 'Down', color: '#c9825f' },
  { value: 4, label: 'Flat', color: '#d89f5f' },
  { value: 5, label: 'Okay', color: '#d9b865' },
  { value: 6, label: 'Steady', color: '#bcc17f' },
  { value: 7, label: 'Good', color: '#9dba8a' },
  { value: 8, label: 'Grounded', color: '#7fae93' },
  { value: 9, label: 'Great', color: '#5f9a8c' },
  { value: 10, label: 'Excellent', color: '#3f7c71' },
];

export const INK = '#2b2620';
export const isValidMood = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 10;
export const moodFor = (n: number | null | undefined): Mood | null => MOODS.find((m) => m.value === n) ?? null;

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Whichever of ink or white reads better on this background. */
export const readableTextOn = (bg: string): string =>
  contrastRatio(INK, bg) >= contrastRatio('#ffffff', bg) ? INK : '#ffffff';
