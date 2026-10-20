import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { strings } from '../strings';
import { Button } from './Button';
import { Field } from './Field';
import { useTheme } from './theme';

interface Props {
  label: string;
  uri: string | null;
  onLibrary: () => void;
  onRemove?: () => void;
  error?: string;
  testIDPrefix: string;
}

export function ImageField({ label, uri, onLibrary, onRemove, error, testIDPrefix }: Props) {
  const theme = useTheme();
  return (
    <Field label={label} error={error}>
      <View style={[styles.preview, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={label} />
        ) : (
          <Text style={{ color: theme.muted, fontSize: 16 }}>{strings.edit.noImage}</Text>
        )}
      </View>
      <View style={styles.actions}>
        <Button
          variant="secondary"
          label={strings.edit.chooseFromLibrary}
          onPress={onLibrary}
          testID={`${testIDPrefix}-library`}
        />
        {onRemove && (
          <Button variant="danger" label={strings.edit.removeBack} onPress={onRemove} testID={`${testIDPrefix}-remove`} />
        )}
      </View>
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
