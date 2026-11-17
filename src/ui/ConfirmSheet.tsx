import { strings } from '../strings';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  busy?: boolean;
}

// A confirmation in a bottom sheet, replacing the system alert for destructive choices. Cancel comes
// first and is the safe way out (backdrop, Close and hardware back all cancel); the action is last.
export function ConfirmSheet({ visible, title, body, confirmLabel, onConfirm, onCancel, destructive = true, busy = false }: Props) {
  const theme = useTheme();
  return (
    <BottomSheet visible={visible} title={title} onClose={onCancel} testID="confirm-sheet">
      <Text style={{ color: theme.text, fontSize: TYPE.body }}>{body}</Text>
      <Button variant="secondary" label={strings.common.cancel} onPress={onCancel} testID="confirm-cancel" />
      <Button variant={destructive ? 'danger' : 'primary'} label={confirmLabel} onPress={onConfirm} disabled={busy} testID="confirm-action" />
    </BottomSheet>
  );
}
