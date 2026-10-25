import QRCode from 'qrcode';
import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// The dark modules as one path, with each run along a row merged into a single rectangle, so a code
// can be redrawn several times a second.
export function qrPath(text: string): { size: number; d: string } {
  const qr = QRCode.create([{ data: text, mode: 'alphanumeric' }], { errorCorrectionLevel: 'L' });
  const { size, data } = qr.modules;
  let d = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; ) {
      if (!data[y * size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && data[y * size + x]) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return { size, d };
}

const QUIET = 4; // modules of white border scanners need around the code

// Always black on white, whatever the theme: that is what cameras read best.
export const QrCode = memo(function QrCode({ text, size }: { text: string; size: number }) {
  const { size: modules, d } = qrPath(text);
  const box = modules + QUIET * 2;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF' }}>
      <Svg width={size} height={size} viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`}>
        <Path d={d} fill="#000000" />
      </Svg>
    </View>
  );
});
