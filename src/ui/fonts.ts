import { FONT } from './Text';

// Passed to expo-font's useFonts in the root layout. Bundled assets: works offline.
export const FONTS = {
  [FONT.regular]: require('../../assets/fonts/PublicSans-Regular.ttf'),
  [FONT.semibold]: require('../../assets/fonts/PublicSans-SemiBold.ttf'),
  [FONT.bold]: require('../../assets/fonts/PublicSans-Bold.ttf'),
};
