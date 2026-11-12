import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { resolveTag } from '../cards/tags';
import { TAG_MAX_LENGTH } from '../config';
import { strings } from '../strings';
import { Button } from './Button';
import { Field, useInputStyle } from './Field';
import { useTheme } from './theme';

interface Props {
  tags: readonly string[]; // a typed name that matches one of these picks it instead
  onSubmit: (tag: string) => void;
  onCancel: () => void;
}

// Typing a tag that isn't in the list. Cancel on the left, the action on the right.
export function TagNameInput({ tags, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [name, setName] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    const tag = resolveTag(name, tags);
    setError(tag === null);
    if (tag !== null) onSubmit(tag);
  };

  return (
    <View style={styles.box}>
      <Field label={strings.edit.newTag} error={error ? strings.edit.tagNameError : undefined}>
        <TextInput
          testID="new-tag-name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(false);
          }}
          onSubmitEditing={submit}
          placeholder={strings.edit.newTagPlaceholder}
          placeholderTextColor={theme.muted}
          maxLength={TAG_MAX_LENGTH}
          accessibilityLabel={strings.edit.newTag}
          autoFocus
          returnKeyType="done"
          style={inputStyle}
        />
      </Field>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button variant="secondary" label={strings.common.cancel} onPress={onCancel} testID="new-tag-cancel" />
        </View>
        <View style={styles.action}>
          <Button label={strings.edit.addTag} onPress={submit} testID="new-tag-submit" />
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
