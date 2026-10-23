import { StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { Button } from './Button';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

// Two steps up from the page, like the other sheets; the primary action is the only green on it.
export function BackupBanner({ onBackup, onDismiss }: { onBackup: () => void; onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: theme.bannerBg }]} accessibilityRole="summary" testID="backup-banner">
      <Text style={[styles.title, { color: theme.bannerText }]}>{strings.backupBanner.title}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{strings.backupBanner.body}</Text>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button variant="secondary" label={strings.backupBanner.dismiss} onPress={onDismiss} />
        </View>
        <View style={styles.action}>
          <Button label={strings.backupBanner.action} onPress={onBackup} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 8, padding: 16, gap: 6 },
  title: { fontSize: TYPE.section, fontWeight: '700' },
  body: { fontSize: TYPE.secondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  action: { flexGrow: 1, flexBasis: 120 },
});
