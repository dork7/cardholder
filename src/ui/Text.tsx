import { Text as NativeText, StyleSheet, TextProps, TextStyle } from 'react-native';
import { TYPE } from './theme';

export const FONT = {
  regular: 'PublicSans-Regular',
  semibold: 'PublicSans-SemiBold',
  bold: 'PublicSans-Bold',
} as const;

// Custom fonts ship one file per weight; map the requested weight to the right file.
export function familyFor(weight: TextStyle['fontWeight']): string {
  const n = weight === 'bold' ? 700 : Number(weight ?? 400);
  if (n >= 700) return FONT.bold;
  if (n >= 600) return FONT.semibold;
  return FONT.regular;
}

export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = flat.fontFamily ?? familyFor(flat.fontWeight);
  // fontWeight 'normal' stops Android synthesising bold on top of an already-bold file.
  return <NativeText {...props} style={[{ fontSize: TYPE.body }, style, { fontFamily, fontWeight: 'normal' }]} />;
}
