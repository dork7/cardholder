import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../strings';
import { Button } from './Button';
import { ActionIconName, RetroIcon } from './RetroIcon';
import { Text } from './Text';
import { RADIUS, TRACKING, TYPE, useTheme } from './theme';

export interface SheetAction {
  key: string;
  icon: ActionIconName;
  label: string; // shown and spoken
  hint?: string;
  variant?: 'danger';
  onPress: () => void;
  testID?: string;
}

interface Props {
  visible: boolean;
  title: string;
  actions: readonly SheetAction[];
  onClose: () => void;
  testID?: string;
}

// A menu from the bottom, in the same sheet as the tag sheet: one full-width row per action, each
// with its icon and its full name, which wraps rather than being cut off at large text sizes.
// Picking a row closes the sheet first, then runs the action.
export function ActionSheet({ visible, title, actions, onClose, testID }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.fill}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={strings.common.cancel} />
        <View
          style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }]}
          accessibilityRole="menu"
          testID={testID}
        >
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {title}
          </Text>
          {actions.map((action) => {
            const color = action.variant === 'danger' ? theme.danger : theme.text;
            const outline = action.variant === 'danger' ? theme.danger : theme.rosette;
            return (
              <Pressable
                key={action.key}
                accessibilityRole="menuitem"
                accessibilityLabel={action.label}
                accessibilityHint={action.hint}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                testID={action.testID}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: theme.surface, borderColor: outline, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <RetroIcon name={action.icon} size={24} color={color} />
                <Text style={[styles.label, { color }]}>{action.label}</Text>
              </Pressable>
            );
          })}
          <Button
            variant="secondary"
            label={strings.common.cancel}
            onPress={onClose}
            testID={testID ? `${testID}-cancel` : undefined}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: RADIUS.none, borderTopRightRadius: RADIUS.none, padding: 16, gap: 8 },
  title: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight, paddingHorizontal: 4, paddingBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  label: { flex: 1, fontSize: TYPE.body, fontWeight: '600' },
});
