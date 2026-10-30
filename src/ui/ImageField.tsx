import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Button } from './Button';
import { Field } from './Field';
import { useTheme } from './theme';

interface Props {
  label: string;
  uri: string | null;
  onLibrary: () => void;
  onPdf?: () => void;
  pdfLabel?: string; // defaults to "Use a PDF"
  onRemove?: () => void;
  // Shown when the photo was cut around the card automatically: crop again from the whole photo.
  onFullPhoto?: () => void;
  error?: string;
  testIDPrefix: string;
}

export function ImageField({ label, uri, onLibrary, onPdf, pdfLabel, onRemove, onFullPhoto, error, testIDPrefix }: Props) {
  const theme = useTheme();
  return (
    <Field label={label} error={error}>
      <Pressable
        onPress={onLibrary}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${uri ? strings.edit.changePhoto : strings.edit.addPhoto}`}
        testID={`${testIDPrefix}-library`}
        style={({ pressed }) => [
          styles.preview,
          { borderColor: theme.border, backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        {uri ? (
          <>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
          </>
        ) : (
          <Text style={{ color: theme.muted, fontSize: 16 }}>{strings.edit.tapToAddPhoto}</Text>
        )}
      </Pressable>
      {(onFullPhoto || onPdf || onRemove) && (
        <View style={styles.actions}>
          {onFullPhoto && (
            <Button
              variant="secondary"
              label={strings.edit.fullPhoto}
              onPress={onFullPhoto}
              accessibilityHint={strings.edit.fullPhotoHint}
              testID={`${testIDPrefix}-full-photo`}
            />
          )}
          {onPdf && (
            <Button
              variant="secondary"
              label={pdfLabel ?? strings.edit.fromPdf}
              onPress={onPdf}
              accessibilityHint={label}
              testID={`${testIDPrefix}-pdf`}
            />
          )}
          {onRemove && (
            <Button variant="danger" label={strings.edit.removeBack} onPress={onRemove} testID={`${testIDPrefix}-remove`} />
          )}
        </View>
      )}
    </Field>
  );
}

const styles = StyleSheet.create({
  preview: {
    aspectRatio: 1.586,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
