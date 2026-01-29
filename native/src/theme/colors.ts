// Color palette
export const colors = {
  // Primary colors
  yellow: '#FFCC44',
  yellowLight: '#FFE066',
  yellowDark: '#CC9900',

  // Warning/Error colors
  red: '#CC3344',
  redDark: '#A02230',

  // Dark theme base
  blackDark: '#141414',
  black: '#181818',
  
  // Gray scale
  grayDark: '#232323',
  grayDarkActive: '#2C2C2C',
  grayDarkHover: '#383838',
  grayMid: '#505050',
  grayDefault: '#828282',
  grayLight: '#B3B3B3',
  gray: '#CCC',
  
  // Light
  white: '#FFFFFF',

  // Semantic colors
  primary: '#FFCC44',
  primaryLight: 'rgba(255, 204, 68, 0.1)',
  primaryBg: 'rgba(255, 204, 68, 0.2)',
  primaryBgHover: 'rgba(255, 204, 68, 0.3)',
  primaryBorder: 'rgba(255, 204, 68, 0.8)',
  primaryBorderHover: 'rgba(255, 204, 68, 0.9)',

  warning: '#CC3344',
  warningBg: 'rgba(204, 51, 68, 0.2)',
  warningBgHover: 'rgba(204, 51, 68, 0.3)',
  warningBorder: 'rgba(204, 51, 68, 0.8)',
  warningBorderHover: 'rgba(204, 51, 68, 0.9)',

  // Overlay
  overlay: 'rgba(20, 20, 20, 0.5)',

  // Transparent
  transparent: 'transparent',
};

export type ColorName = keyof typeof colors;
