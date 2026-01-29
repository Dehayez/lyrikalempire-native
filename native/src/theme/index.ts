export * from './colors';
export * from './spacing';
export * from './typography';

import { colors } from './colors';
import { spacing, borderRadius } from './spacing';
import { fontFamily, fontSize, fontWeight, lineHeight } from './typography';

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
};

export type Theme = typeof theme;
