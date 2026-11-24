import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useApp } from '../../src/app/AppProvider';
import { ProfileCard } from '../../src/cards/ProfileCard';
import { BloodGroup, Profile } from '../../src/cards/types';
import { DEFAULT_REMIND_DAYS } from '../../src/config';
import { personName, samePersonName } from '../../src/people/names';
import { canAddCard } from '../../src/purchases/limits';
import { spaceFor } from '../../src/spaces/spaces';
import { fromIsoDate, toIsoDate } from '../../src/time/dates';
import { Button } from '../../src/ui/Button';
import { Field, useInputStyle } from '../../src/ui/Field';
import { Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { TYPE, useTheme } from '../../src/ui/theme';
import { useConfirmDiscard } from '../../src/ui/useConfirmDiscard';

const GROUPS: BloodGroup[] = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown'];
const empty: Profile = { template: 'medical', dateOfBirth: null, bloodGroup: 'Unknown' };

function ListField({ label, id, entries, onChange, inputStyle }: {
  label: string; id: 'conditions' | 'allergies' | 'medications'; entries: string[];
  onChange: (entries: string[]) => void; inputStyle: ReturnType<typeof useInputStyle>;
}) {
  const [draft, setDraft] = useState('');
  return <Field label={label}>
    {entries.map((entry, index) => <View key={index} style={styles.entry}>
      <TextInput accessibilityLabel={`${label} entry ${index + 1}`} testID={`profile-${id}-${index}`}
        value={entry} onChangeText={(value) => onChange(entries.map((current, at) => at === index ? value : current))}
        style={[inputStyle, styles.entryInput]} maxLength={200} />
      <Button variant="secondary" label={`Remove ${label.toLowerCase()} entry ${index + 1}`} testID={`profile-${id}-remove-${index}`}
        onPress={() => onChange(entries.filter((_current, at) => at !== index))} />
    </View>)}
    <View style={styles.entry}>
      <TextInput accessibilityLabel={`New ${label.toLowerCase()} entry`} testID={`profile-${id}-new`} value={draft}
        onChangeText={setDraft} style={[inputStyle, styles.entryInput]} maxLength={200} />
      <Button variant="secondary" label={`Add ${label.toLowerCase()} entry`} testID={`profile-${id}-add`}
        onPress={() => { if (draft.trim()) { onChange([...entries, draft.trim()]); setDraft(''); } }} />
    </View>
  </Field>;
}

export default function ProfileEditor() {
  const { id, personId, space } = useLocalSearchParams<{ id: string; personId?: string; space?: string }>();
  const { cards, people, services, refresh, unlocked } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const inputStyle = useInputStyle();
  const existing = cards.find((card) => card.id === id && card.profile);
  const chosenPerson = people.find((person) => person.id === (existing?.personId ?? personId));
  const [name, setName] = useState(chosenPerson?.name ?? '');
  const [selectedPerson, setSelectedPerson] = useState(chosenPerson?.id ?? null);
  const [profile, setProfile] = useState<Profile>(existing?.profile ?? empty);
  const [busy, setBusy] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [cardSize, setCardSize] = useState({ width: 360, height: 220 });
  const imageRef = useRef<any>(null);
  const initial = useRef(JSON.stringify({ name, profile, selectedPerson })).current;
  const leave = useConfirmDiscard(initial !== JSON.stringify({ name, profile, selectedPerson }));
  const change = (patch: Partial<Profile>) => setProfile((current) => ({ ...current, ...patch }));
  const pickDate = () => {
    if (Platform.OS === 'android') DateTimePickerAndroid.open({ value: profile.dateOfBirth ? fromIsoDate(profile.dateOfBirth) : new Date(), mode: 'date', maximumDate: new Date(), onChange: (event, date) => event.type === 'set' && date && change({ dateOfBirth: toIsoDate(date) }) });
    else setDateOpen(true);
  };
  const save = async () => {
    const trimmed = personName(name);
    if (!trimmed) { Alert.alert('Enter a person’s name'); return; }
    const matched = people.find((person) => samePersonName(person.name, trimmed));
    const ownerId = existing?.personId ?? (selectedPerson && people.some((person) => person.id === selectedPerson) ? selectedPerson : matched?.id);
    const other = cards.find((card) => card.id !== existing?.id && card.personId === ownerId && card.profile);
    if (other) { leave(); router.replace(`/card/${other.id}`); return; }
    if (!existing && !canAddCard(cards.length, unlocked)) { router.push('/paywall'); return; }
    setBusy(true);
    try {
      // Capture the same Medical view the editor previews. The captured JPEG is the document image.
      const { captureRef } = require('react-native-view-shot') as { captureRef: (view: View, options: object) => Promise<string> };
      const jpegBase64 = await captureRef(imageRef.current!, { format: 'jpg', quality: 0.9, result: 'base64' });
      const front = { jpegBase64, thumbJpegBase64: jpegBase64, aspect: cardSize.width / cardSize.height };
      const owner = ownerId ? people.find((person) => person.id === ownerId)! : await services.store.createPerson(trimmed);
      if (owner.name !== trimmed) await services.store.renamePerson(owner.id, trimmed);
      const fields = { name: trimmed, personId: owner.id, profile, spaceId: spaceFor(existing?.spaceId ?? space).id,
        expiresOn: null, remindDaysBefore: DEFAULT_REMIND_DAYS, tags: existing?.tags ?? [], documentKey: null,
        folderId: null, readText: null, vertical: false, blurPreview: existing?.blurPreview ?? false };
      const saved = existing ? await services.store.update(existing.id, fields, { front }) : await services.store.create(fields, { front, back: null });
      await refresh();
      leave();
      router.replace(`/card/${saved.id}`);
    } catch (error) { console.warn('Saving profile failed', error); Alert.alert('Could not save profile'); }
    finally { setBusy(false); }
  };
  if (id !== 'new' && !existing) return <Screen><Text>Profile not found</Text></Screen>;
  return <Screen><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={{ color: theme.text, fontSize: TYPE.title, fontWeight: '700' }}>{existing ? 'Edit profile' : 'Add profile'}</Text>
    <Panel style={styles.panel}>
      <Field label="Person’s name"><TextInput accessibilityLabel="Person’s name" testID="profile-name" value={name} onChangeText={(value) => { setName(value); setSelectedPerson(null); }} style={inputStyle} /></Field>
      {!existing && people.map((person) => <Button key={person.id} variant="secondary" label={person.name} onPress={() => { setName(person.name); setSelectedPerson(person.id); }} testID={`profile-person-${person.id}`} />)}
      <Field label="Date of birth"><Button variant="secondary" label={profile.dateOfBirth ?? 'Choose date'} onPress={pickDate} testID="profile-date" />
        {dateOpen && <DateTimePicker value={profile.dateOfBirth ? fromIsoDate(profile.dateOfBirth) : new Date()} mode="date" maximumDate={new Date()} onChange={(_event, date) => { setDateOpen(false); if (date) change({ dateOfBirth: toIsoDate(date) }); }} />}</Field>
      <Field label="Blood group"><View style={styles.groups}>{GROUPS.map((group) => <Button key={group} variant={profile.bloodGroup === group ? 'primary' : 'secondary'} label={group} onPress={() => change({ bloodGroup: group })} testID={`blood-${group}`} />)}</View></Field>
      {(['conditions', 'allergies', 'medications'] as const).map((key) => <ListField key={key} id={key}
        label={key[0].toUpperCase() + key.slice(1)} entries={profile[key] ?? []} inputStyle={inputStyle}
        onChange={(entries) => change({ [key]: entries })} />)}
      {([['medicalNotes', 'Medical notes'], ['mobile', 'Mobile number'], ['email', 'Email'], ['address', 'Address']] as const).map(([key, label]) =>
        <Field key={key} label={label}><TextInput accessibilityLabel={label} testID={`profile-${key}`}
          value={profile[key] ?? ''} onChangeText={(value) => change({ [key]: value })}
          style={inputStyle} multiline={key === 'medicalNotes' || key === 'address'} maxLength={5000}
          keyboardType={key === 'email' ? 'email-address' : key === 'mobile' ? 'phone-pad' : 'default'} /></Field>)}
    </Panel>
    <View ref={imageRef} collapsable={false} style={{ width: Math.min(360, windowWidth - 32) }}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width || 360;
        const height = event.nativeEvent.layout.height || 220;
        setCardSize((current) => current.width === width && current.height === height ? current : { width, height });
      }}>
      <ProfileCard name={name || 'Person'} profile={profile} />
    </View>
    <View style={styles.actions}><Button variant="secondary" label="Cancel" onPress={() => { leave(); router.back(); }} /><Button label="Save profile" onPress={() => void save()} disabled={busy} testID="save-profile" /></View>
  </ScrollView></Screen>;
}

const styles = StyleSheet.create({ content: { padding: 16, gap: 16 }, panel: { padding: 16, gap: 12 }, groups: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, actions: { flexDirection: 'row', gap: 8 }, entry: { flexDirection: 'row', alignItems: 'center', gap: 8 }, entryInput: { flex: 1 } });
