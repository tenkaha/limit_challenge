// Shared sx fragments used across tables.

// Screen-reader-only text. Its scroll container must be position: relative, or
// the absolutely positioned element can widen the page on narrow screens.
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

// Digits line up in numeric columns.
export const tabular = { fontVariantNumeric: 'tabular-nums' } as const;
