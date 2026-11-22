import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { Text } from '../ui/Text';
import { RADIUS, TYPE, useTheme } from '../ui/theme';

// Web addresses typed in a note. Trailing sentence punctuation stays outside the link.
const WEB_LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,;:!?)\]'']/gi;

export function linkParts(line: string): { text: string; url?: string }[] {
  const parts: { text: string; url?: string }[] = [];
  let last = 0;
  for (const match of line.matchAll(WEB_LINK)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: line.slice(last, at) });
    const text = match[0];
    parts.push({ text, url: /^https?:/i.test(text) ? text : `https://${text}` });
    last = at + text.length;
  }
  if (last < line.length || parts.length === 0) parts.push({ text: line.slice(last) });
  return parts;
}

// Only the marker changes; whitespace, line endings and surrounding text stay intact for export.
export function NoteBody({ body, onChange, disabled = false, tasksOnly = false }: {
  body: string;
  onChange(body: string): void;
  disabled?: boolean;
  tasksOnly?: boolean;
}) {
  const theme = useTheme();
  const lines = body.split('\n');
  return <View style={styles.lines}>{lines.map((line, index) => {
    const task = /^([ \t]*- \[)([ xX])(\][ \t]*)(.*?)(\r?)$/.exec(line);
    if (!task) return tasksOnly ? null : <Text key={index} style={{ color: theme.muted, fontSize: TYPE.body }}>
      {linkParts(line).map((part, at) => part.url ? <Text key={at} accessibilityRole="link" style={{ color: theme.accent, textDecorationLine: 'underline' }}
        onPress={() => void Linking.openURL(part.url!).catch(() => {})}>{part.text}</Text> : part.text)}
    </Text>;
    const checked = task[2].toLowerCase() === 'x';
    return <Pressable key={index} accessibilityRole="checkbox" accessibilityLabel={task[4] || strings.notes.checklistItem}
      accessibilityState={{ checked, disabled }} disabled={disabled} style={styles.task}
      onPress={() => {
        const next = [...lines];
        next[index] = `${task[1]}${checked ? ' ' : 'x'}${task[3]}${task[4]}${task[5]}`;
        onChange(next.join('\n'));
      }}>
      <View style={[styles.box, { borderColor: theme.text, backgroundColor: checked ? theme.accent : theme.bg }]}>
        {checked && <View style={[styles.mark, { backgroundColor: theme.onAccent }]} />}
      </View>
      <Text style={{ flex: 1, color: theme.text, fontSize: TYPE.body, textDecorationLine: checked ? 'line-through' : 'none' }}>{task[4]}</Text>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  lines: { gap: 8 },
  task: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { width: 24, height: 24, borderWidth: 1, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 12, height: 2 },
});
