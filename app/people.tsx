import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useApp } from '../src/app/AppProvider';
import { Person } from '../src/cards/types';
import { PERSON_NAME_MAX_LENGTH } from '../src/config';
import { personName } from '../src/people/names';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { Field, useInputStyle } from '../src/ui/Field';
import { Panel, Screen } from '../src/ui/Surface';
import { Text } from '../src/ui/Text';
import { TYPE, useTheme } from '../src/ui/theme';

export default function PeopleScreen() {
  const { cards, people, services, refresh } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const inputStyle = useInputStyle();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = (person?: Person) => { setEditing(person?.id ?? 'new'); setName(person?.name ?? ''); setError(null); };
  const save = async () => {
    const trimmed = personName(name);
    if (!trimmed) { setError(strings.people.invalidName); return; }
    setBusy(true);
    try {
      if (editing === 'new') await services.store.createPerson(trimmed);
      else if (editing) await services.store.renamePerson(editing, trimmed);
      await refresh();
      setEditing(null);
    } catch { setError(strings.people.changeFailed); }
    finally { setBusy(false); }
  };
  const remove = (person: Person) => Alert.alert(strings.people.deleteTitle(person.name), strings.people.deleteBody, [
    { text: strings.common.cancel, style: 'cancel' },
    { text: strings.common.delete, style: 'destructive', onPress: () => {
      setBusy(true);
      void services.store.removePerson(person.id).then(refresh).catch(() => Alert.alert(strings.people.changeFailed)).finally(() => setBusy(false));
    } },
  ]);
  const editor = <View style={styles.editor}>
    <Field label={strings.people.name} error={error ?? undefined}>
      <TextInput value={name} onChangeText={(value) => { setName(value); setError(null); }}
        maxLength={PERSON_NAME_MAX_LENGTH} autoFocus accessibilityLabel={strings.people.name} style={inputStyle} testID="person-name" />
    </Field>
    <View style={styles.actions}>
      <Button variant="secondary" label={strings.common.cancel} onPress={() => setEditing(null)} disabled={busy} />
      <Button label={editing === 'new' ? strings.people.create : strings.people.save} onPress={() => void save()} disabled={busy} testID="save-person" />
    </View>
  </View>;
  return <Screen>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Panel style={styles.panel}>{editing === 'new' ? editor :
        <Button label={strings.people.create} onPress={() => start()} testID="add-person" />}</Panel>
      {people.length === 0 && <Text style={{ color: theme.muted, fontSize: TYPE.body }}>{strings.people.empty}</Text>}
      {people.map((person) => <Panel key={person.id} style={styles.panel}>
        {editing === person.id ? editor : <>
          <Text accessibilityRole="header" style={{ color: theme.text, fontSize: TYPE.section, fontWeight: '700' }}>{person.name}</Text>
          <Text style={{ color: theme.muted, fontSize: TYPE.secondary }}>{strings.people.count(cards.filter((card) => card.personId === person.id).length)}</Text>
          <View style={styles.actions}>
            <Button variant="secondary" label={cards.some((card) => card.personId === person.id && card.profile) ? 'Open profile' : 'Create profile'} onPress={() => {
              const profile = cards.find((card) => card.personId === person.id && card.profile);
              router.push(profile ? `/card/${profile.id}` : `/profile/new?personId=${person.id}`);
            }} testID={`profile-person-${person.id}`} />
            <Button variant="secondary" label={strings.people.rename} onPress={() => start(person)} testID={`rename-person-${person.id}`} />
            <Button variant="danger" label={strings.common.delete} onPress={() => remove(person)} disabled={busy} testID={`delete-person-${person.id}`} />
          </View>
        </>}
      </Panel>)}
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  panel: { padding: 16, gap: 12 },
  editor: { gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
});
