import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { strings } from '../strings';
import { Button } from './Button';
import { Field } from './Field';
import { RADIUS, useTheme } from './theme';

interface Props {
  label: string;
  hint?: string; // under the label: what to do before tapping, e.g. that photos come from the library
  uri: string | null;
  onLibrary: () => void;
  // Take photo with the phone's camera app; left out where capture isn't available.
  onCamera?: () => void;
  onPdf?: () => void;
  pdfLabel?: string; // defaults to "Use a PDF"
  onRemove?: () => void;
  // A cross over the picture's corner that removes it, in place of the Remove button.
  removeAsCross?: boolean;
  // Shown when the photo was cut around the card automatically: crop again from the whole photo.
  onFullPhoto?: () => void;
  error?: string;
  vertical?: boolean; // an upright card: the preview stands upright too
  testIDPrefix: string;
}

export function ImageField({ label, hint, uri, onLibrary, onCamera, onPdf, pdfLabel, onRemove, removeAsCross, onFullPhoto, error, vertical = false, testIDPrefix }: Props) {
  const theme = useTheme();
  return (
    <Field label={label} hint={hint} error={error}>
      <View>
        <Pressable
          onPress={onLibrary}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${uri ? strings.edit.changePhoto : strings.edit.addPhoto}`}
          testID={`${testIDPrefix}-library`}
          style={({ pressed }) => [
            styles.preview,
            vertical && styles.previewVertical,
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
        {removeAsCross && onRemove && uri && (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={strings.edit.removeBack}
            hitSlop={8}
            testID={`${testIDPrefix}-remove`}
            style={styles.crossSlot}
          >
            {({ pressed }) => (
              // Shrinks under the finger on press-in, so the tap is felt before it lands.
              <Animated.View
                style={[
                  styles.cross,
                  { transform: [{ scale: pressed ? 0.9 : 1 }], transitionProperty: 'transform', transitionDuration: 120 },
                ]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 6l12 12M18 6L6 18" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
                </Svg>
              </Animated.View>
            )}
          </Pressable>
        )}
      </View>
      {(onCamera || onFullPhoto || onPdf || (onRemove && !removeAsCross)) && (
        <View style={styles.actions}>
          {onCamera && (
            <Button
              variant="secondary"
              label={strings.edit.takePhoto}
              onPress={onCamera}
              accessibilityHint={label}
              testID={`${testIDPrefix}-camera`}
            />
          )}
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
          {onRemove && !removeAsCross && (
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
    borderRadius: RADIUS.none,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // ID-1 turned upright, narrower so the form doesn't become one long picture.
  previewVertical: { aspectRatio: 1 / 1.586, width: '62%', alignSelf: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  // Over the picture's top right corner.
  crossSlot: { position: 'absolute', top: 8, right: 8 },
  cross: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
});
