import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PDF_PICKER_EDGE } from '../config';
import { usePdfPages } from '../hooks/usePdf';
import { strings } from '../strings';
import { Field } from './Field';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  pdfBase64: string | null; // null while the stored PDF is loading
  pageCount: number;
  coverPage: number;
  onChange: (page: number) => void;
}

const PREVIEW_HEIGHT = 120;

// A row of page previews; the selected one is the page the card shows as its picture.
export function PdfPagePicker({ pdfBase64, pageCount, coverPage, onChange }: Props) {
  const theme = useTheme();
  const pages = usePdfPages(pdfBase64, pageCount, PDF_PICKER_EDGE);

  return (
    <Field label={strings.edit.coverPage} hint={strings.edit.pdfPages(pageCount)}>
      <Text style={{ color: theme.muted, fontSize: TYPE.secondary }}>{strings.edit.coverPageHint}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={strings.edit.coverPage}
        testID="pdf-pages"
      >
        {Array.from({ length: pageCount }, (_, index) => {
          const page = pages[index];
          const selected = index === coverPage;
          return (
            <Pressable
              key={index}
              onPress={() => onChange(index)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={strings.edit.pageLabel(index + 1)}
              testID={`pdf-page-${index}`}
              style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View
                style={[
                  styles.preview,
                  {
                    width: PREVIEW_HEIGHT * (page?.aspect ?? 0.75),
                    borderColor: selected ? theme.selection : theme.border,
                    borderWidth: selected ? 3 : 1,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                {page ? (
                  <Image source={{ uri: page.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                ) : (
                  <ActivityIndicator color={theme.muted} />
                )}
              </View>
              <Text
                style={{
                  color: selected ? theme.text : theme.muted,
                  fontSize: TYPE.caption,
                  fontWeight: selected ? '700' : '400',
                }}
              >
                {strings.edit.pageLabel(index + 1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Field>
  );
}

const styles = StyleSheet.create({
  row: { gap: 12, paddingVertical: 4 },
  item: { alignItems: 'center', gap: 6 },
  preview: {
    height: PREVIEW_HEIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
