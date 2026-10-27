import { useState } from 'react';
import { ActivityIndicator, FlatList, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { IMAGE_MAX_EDGE } from '../config';
import { usePdfPages } from '../hooks/usePdf';
import { strings } from '../strings';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';
import { ZoomableImage } from './ZoomableImage';

interface Props {
  pdfBase64: string | null; // null while the stored PDF is loading
  pageCount: number;
  name: string;
}

// The whole PDF, one page per screen: swipe sideways between pages, pinch to zoom into one.
export function PdfPager({ pdfBase64, pageCount, name }: Props) {
  const theme = useTheme();
  const pages = usePdfPages(pdfBase64, pageCount, IMAGE_MAX_EDGE);
  const [width, setWidth] = useState(0);
  const [current, setCurrent] = useState(0);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setCurrent(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.fill}>
      <Text style={{ fontSize: TYPE.secondary, color: theme.muted, textAlign: 'center' }} accessibilityLiveRegion="polite">
        {strings.card.page(current + 1, pageCount)}
      </Text>
      <View style={styles.fill} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} testID="pdf-pager">
        {width > 0 && (
          <FlatList
            data={Array.from({ length: pageCount }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            extraData={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            renderItem={({ item }) => (
              <View style={{ width, height: '100%' }}>
                {pages[item] ? (
                  <ZoomableImage
                    uri={pages[item].uri}
                    accessibilityLabel={strings.card.imageLabel(name, strings.card.page(item + 1, pageCount))}
                  />
                ) : (
                  <View style={styles.loading}>
                    <ActivityIndicator color={theme.muted} />
                  </View>
                )}
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: 4 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
