import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MAX_TAGS, TAG_MAX_LENGTH } from '../config';
import { normalizeTags } from '../cards/validate';
import { strings } from '../strings';
import { useInputStyle } from './Field';
import { Text } from './Text';
import { TYPE, useTheme } from './theme';

// Read-only tags, as small dark pills: metadata, so they stay achromatic.
export function TagList({ tags }: { tags: readonly string[] }) {
  const theme = useTheme();
  if (tags.length === 0) return null;
  return (
    <View style={styles.wrap} testID="tag-list">
      {tags.map((tag) => (
        <View key={tag} style={[styles.tag, { backgroundColor: theme.bannerBg }]}>
          <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}

// Editable tags: each pill has a remove button; typing a tag and pressing return adds it.
export function TagEditor({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const [text, setText] = useState('');
  const full = value.length >= MAX_TAGS;

  const add = () => {
    if (text.trim() === '') return;
    onChange(normalizeTags([...value, text]).slice(0, MAX_TAGS));
    setText('');
  };

  return (
    <View style={styles.editor}>
      {value.length > 0 && (
        <View style={styles.wrap}>
          {value.map((tag) => (
            <View key={tag} style={[styles.tag, styles.editable, { backgroundColor: theme.bannerBg }]}>
              <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
              <Pressable
                onPress={() => onChange(value.filter((t) => t !== tag))}
                accessibilityRole="button"
                accessibilityLabel={strings.edit.removeTag(tag)}
                hitSlop={8}
                style={({ pressed }) => [styles.remove, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 6l12 12M18 6L6 18" stroke={theme.muted} strokeWidth={2.4} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {full ? (
        <Text style={{ color: theme.muted, fontSize: TYPE.secondary }}>{strings.edit.tagLimit(MAX_TAGS)}</Text>
      ) : (
        <TextInput
          testID="add-tag"
          value={text}
          onChangeText={setText}
          onSubmitEditing={add}
          onBlur={add}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder={strings.edit.addTagPlaceholder}
          placeholderTextColor={theme.muted}
          maxLength={TAG_MAX_LENGTH}
          autoCapitalize="words"
          accessibilityLabel={strings.edit.addTag}
          style={inputStyle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { minHeight: 32, paddingHorizontal: 12, borderRadius: 9999, flexDirection: 'row', alignItems: 'center' },
  editable: { minHeight: 40, paddingRight: 4, gap: 4 },
  tagText: { fontSize: TYPE.secondary, fontWeight: '600' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
