import { ScrollView, StyleSheet } from 'react-native';
import { strings } from '../src/strings';
import { Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

export default function PrivacyScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        {strings.privacy.paragraphs.map((paragraph) => (
          <Text key={paragraph} style={[styles.body, { color: theme.text }]}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  body: { fontSize: TYPE.body, lineHeight: 24 },
});
