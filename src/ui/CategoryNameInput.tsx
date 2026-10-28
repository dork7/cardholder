import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { resolveCategory } from '../cards/categories';
import { CardCategory } from '../cards/types';
import { CATEGORY_MAX_LENGTH } from '../config';
import { strings } from '../strings';
import { Button } from './Button';
import { Field, useInputStyle } from './Field';
import { useTheme } from './theme';

interface Props {
  categories: readonly CardCategory[]; // a typed name that matches one of these picks it instead
  onSubmit: (category: CardCategory) => void;
  onCancel: () => void;
}

// Typing a category that isn't in the list. Cancel on the left, the action on the right.
export function CategoryNameInput({ categories, onSubmit, onCancel }: Props) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [name, setName] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    const category = resolveCategory(name, categories);
    setError(category === null);
    if (category !== null) onSubmit(category);
  };

  return (
    <View style={styles.box}>
      <Field label={strings.edit.newCategory} error={error ? strings.edit.categoryNameError : undefined}>
        <TextInput
          testID="new-category-name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(false);
          }}
          onSubmitEditing={submit}
          placeholder={strings.edit.newCategoryPlaceholder}
          placeholderTextColor={theme.muted}
          maxLength={CATEGORY_MAX_LENGTH}
          accessibilityLabel={strings.edit.newCategory}
          autoFocus
          returnKeyType="done"
          style={inputStyle}
        />
      </Field>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button variant="secondary" label={strings.common.cancel} onPress={onCancel} testID="new-category-cancel" />
        </View>
        <View style={styles.action}>
          <Button label={strings.edit.addCategory} onPress={submit} testID="new-category-submit" />
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
