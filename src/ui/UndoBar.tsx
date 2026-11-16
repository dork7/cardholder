import { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { Undo } from '../app/undo';
import { strings } from '../strings';
import { Button } from './Button';
import { showError } from './errorAlert';
import { LiveText } from './LiveText';
import { RADIUS, SHADOW, TYPE, useTheme } from './theme';

// "Deleted Passport · Undo" while a removal can still be taken back (see app/undo.ts). The message is
// a live region, so screen readers hear it, and Undo is a labelled button they can reach.
export function UndoBar({ undo }: { undo: Undo }) {
  const theme = useTheme();
  const removal = useSyncExternalStore(undo.subscribe, undo.current);
  if (!removal) return null;

  const press = () =>
    undo.undo().catch((e) => {
      console.warn('Undo failed', e);
      showError(removal.failure ?? 'undo', e);
    });

  return (
    <View testID="undo-bar" style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <LiveText style={[styles.message, { color: theme.text }]} numberOfLines={2}>
        {removal.message}
      </LiveText>
      <View style={styles.action}>
        <Button
          variant="secondary"
          label={strings.undo.undo}
          accessibilityHint={strings.undo.undoHint}
          onPress={() => void press()}
          testID="undo-button"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.none,
    ...SHADOW.heavy,
  },
  message: { flex: 1, fontSize: TYPE.secondary, fontWeight: '600' },
  action: { minWidth: 96 },
});
