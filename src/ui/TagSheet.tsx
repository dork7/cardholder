import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalizeTags, sameTag } from '../cards/tags';
import { TAG_MAX_LENGTH } from '../config';
import { strings } from '../strings';
import { Button } from './Button';
import { FONT, Text } from './Text';
import { TYPE, useTheme } from './theme';

interface Props {
  visible: boolean;
  title: string;
  existing: readonly string[]; // the tags to pick from
  onApply: (tags: string[]) => void;
  onClose: () => void;
}

// A sheet from the bottom for adding tags to one card or to the cards picked in the gallery: tap any
// number of the tags already in use, or type new ones, then add them all at once.
export function TagSheet({ visible, title, existing, onApply, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<string[]>([]);
  const [typed, setTyped] = useState<string[]>([]); // new tags typed in this sheet, shown with the others
  const [draft, setDraft] = useState('');

  // Each opening starts empty.
  useEffect(() => {
    if (!visible) return;
    setChosen([]);
    setTyped([]);
    setDraft('');
  }, [visible]);

  const options = normalizeTags([...existing, ...typed]);
  const isChosen = (tag: string) => chosen.some((t) => sameTag(t, tag));
  const toggle = (tag: string) =>
    setChosen((current) => (current.some((t) => sameTag(t, tag)) ? current.filter((t) => !sameTag(t, tag)) : [...current, tag]));

  // A typed tag joins the list already chosen; one matching an existing tag, ignoring case, picks that one.
  const addDraft = () => {
    const [tag] = normalizeTags([draft]);
    setDraft('');
    if (!tag) return;
    const match = options.find((t) => sameTag(t, tag));
    if (!match) setTyped((current) => [...current, tag]);
    if (!isChosen(match ?? tag)) setChosen((current) => [...current, match ?? tag]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={strings.common.cancel} />
        <View style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }]} testID="tag-sheet">
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {title}
          </Text>

          <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.rosette }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addDraft}
              submitBehavior="submit"
              placeholder={strings.tags.newPlaceholder}
              placeholderTextColor={theme.muted}
              accessibilityLabel={strings.tags.newPlaceholder}
              maxLength={TAG_MAX_LENGTH}
              autoCapitalize="words"
              returnKeyType="done"
              style={[styles.input, { color: theme.text }]}
              testID="tag-input"
            />
            <Pressable
              onPress={addDraft}
              disabled={draft.trim() === ''}
              accessibilityRole="button"
              accessibilityLabel={strings.tags.addNew}
              accessibilityState={{ disabled: draft.trim() === '' }}
              testID="tag-input-add"
              style={({ pressed }) => [styles.addNew, { opacity: draft.trim() === '' ? 0.4 : pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.addNewText, { color: theme.text }]}>{strings.tags.addNew}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.list} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {options.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: TYPE.secondary }}>{strings.tags.none}</Text>
            ) : (
              options.map((tag) => {
                const on = isChosen(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggle(tag)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    testID={`tag-option-${tag}`}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: on ? theme.accent : theme.surface, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? theme.onAccent : theme.text }]} numberOfLines={1}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          <Button
            label={strings.tags.apply(chosen.length)}
            disabled={chosen.length === 0}
            onPress={() => onApply(chosen)}
            testID="tag-sheet-apply"
          />
          <Button variant="secondary" label={strings.common.cancel} onPress={onClose} testID="tag-sheet-cancel" />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 12, maxHeight: '80%' },
  title: { fontSize: TYPE.section, fontWeight: '700', paddingHorizontal: 4 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderRadius: 9999, borderWidth: 1, paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, minHeight: 48, fontSize: TYPE.body, fontFamily: FONT.regular },
  addNew: { minHeight: 36, paddingHorizontal: 14, borderRadius: 9999, justifyContent: 'center' },
  addNewText: { fontSize: TYPE.secondary, fontWeight: '700' },
  list: { flexGrow: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 36, borderRadius: 9999, paddingHorizontal: 14, justifyContent: 'center', maxWidth: '100%' },
  chipText: { fontSize: TYPE.secondary, fontWeight: '700' },
});
