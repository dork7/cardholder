import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Folder } from '../cards/types';
import { FOLDER_NAME_MAX_LENGTH } from '../config';
import { checkFolderName, FolderNameError } from '../folders/names';
import { strings } from '../strings';
import { Button } from './Button';
import { Field, useInputStyle } from './Field';
import { useTheme } from './theme';

interface Props {
  folders: Folder[]; // to keep names unique
  initial?: string;
  renamingId?: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  testIDPrefix?: string;
}

// Typing a name for a new or renamed folder. Cancel on the left, the action on the right.
export function FolderNameInput({ folders, initial = '', renamingId, submitLabel, onSubmit, onCancel, testIDPrefix = 'folder' }: Props) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [name, setName] = useState(initial);
  const [error, setError] = useState<FolderNameError | null>(null);

  const submit = () => {
    const problem = checkFolderName(name, folders, renamingId);
    setError(problem);
    if (!problem) onSubmit(name.trim());
  };

  return (
    <View style={styles.box}>
      <Field label={strings.folders.nameLabel} error={error ? strings.folders.errors[error] : undefined}>
        <TextInput
          testID={`${testIDPrefix}-name`}
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          onSubmitEditing={submit}
          placeholder={strings.folders.namePlaceholder}
          placeholderTextColor={theme.muted}
          maxLength={FOLDER_NAME_MAX_LENGTH}
          accessibilityLabel={strings.folders.nameLabel}
          autoFocus
          returnKeyType="done"
          style={inputStyle}
        />
      </Field>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button variant="secondary" label={strings.common.cancel} onPress={onCancel} testID={`${testIDPrefix}-cancel`} />
        </View>
        <View style={styles.action}>
          <Button label={submitLabel} onPress={submit} testID={`${testIDPrefix}-submit`} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
