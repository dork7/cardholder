import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/app/AppProvider';
import { fieldsOf } from '../../src/cards/batch';
import { CardFields, CardImage, FrontImage } from '../../src/cards/types';
import { canTakePhoto, cropSharedImage, discardFile, pickImage, takePhoto } from '../../src/images/capture';
import { DEFAULT_REMIND_DAYS, PERSON_NAME_MAX_LENGTH } from '../../src/config';
import { personName, samePersonName } from '../../src/people/names';
import { drawCard } from '../../src/profiles/drawCard';
import { pickContact } from '../../src/profiles/contactPicker';
import { BLOOD_GROUPS, BloodGroup, defaultVisibleFields, emptyProfile, PROFILE_FIELDS, PROFILE_TEMPLATES, ProfileDetails, ProfileField, ProfileTemplate, profileOf } from '../../src/profiles/profile';
import { ProfileCard, ProfileCardView } from '../../src/profiles/ProfileCard';
import { canAddCard } from '../../src/purchases/limits';
import { SpaceField } from '../../src/spaces/SpaceField';
import { SpaceId, spaceFor } from '../../src/spaces/spaces';
import { strings } from '../../src/strings';
import { Button } from '../../src/ui/Button';
import { Chip, ChipRow } from '../../src/ui/ChipRow';
import { DateField } from '../../src/ui/DateField';
import { showError } from '../../src/ui/errorAlert';
import { Field, useInputStyle } from '../../src/ui/Field';
import { ActionFooter, Panel, Screen } from '../../src/ui/Surface';
import { Text } from '../../src/ui/Text';
import { useTheme } from '../../src/ui/theme';
import { useConfirmDiscard } from '../../src/ui/useConfirmDiscard';
import { KeyboardAvoid } from '../../src/ui/KeyboardAvoid';

interface Draft {
  personId: string | null; // an existing Person
  newName: string | null; // or a name to make a new Person from on save; null when not adding one
  dateOfBirth: string | null;
  bloodGroup: BloodGroup;
  template: ProfileTemplate;
  visibleFields?: ProfileField[];
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  medicalNotes?: string;
  mobile?: string;
  email?: string;
  address?: string;
  emergencyContacts?: NonNullable<ProfileDetails['emergencyContacts']>;
  spaceId?: SpaceId;
}

type ListKey = 'conditions' | 'allergies' | 'medications';

function ListField({ label, id, entries, onChange }: {
  label: string; id: ListKey; entries: string[]; onChange(entries: string[]): void;
}) {
  const [newEntry, setNewEntry] = useState('');
  const inputStyle = useInputStyle();
  return <Field label={label}>
    {entries.map((entry, index) => <View key={index} style={styles.entry}>
      <TextInput accessibilityLabel={`${label} entry ${index + 1}`} testID={`profile-${id}-${index}`}
        value={entry} onChangeText={(value) => onChange(entries.map((item, at) => at === index ? value : item))}
        style={[inputStyle, styles.entryInput]} maxLength={200} />
      <Button variant="secondary" label={`Remove ${label.toLowerCase()} entry ${index + 1}`}
        testID={`profile-${id}-remove-${index}`} onPress={() => onChange(entries.filter((_, at) => at !== index))} />
    </View>)}
    <View style={styles.entry}>
      <TextInput accessibilityLabel={`New ${label.toLowerCase()} entry`} testID={`profile-${id}-new`}
        value={newEntry} onChangeText={setNewEntry} style={[inputStyle, styles.entryInput]} maxLength={200} />
      <Button variant="secondary" label={`Add ${label.toLowerCase()} entry`} testID={`profile-${id}-add`}
        onPress={() => { if (newEntry.trim()) { onChange([...entries, newEntry.trim()]); setNewEntry(''); } }} />
    </View>
  </Field>;
}

// The profile form: who it is for and their details. Saving draws the card shown at the top as the
// document's picture. Edit on a profile's details screen opens this, never the photo editor.
export default function ProfileForm() {
  const { id, person, space } = useLocalSearchParams<{ id: string; person?: string; space?: string }>();
  const isNew = id === 'new';
  const { services, cards, people = [], unlocked, refresh } = useApp();
  const existing = isNew ? null : (cards.find((card) => card.id === id && card.profile) ?? null);
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const insets = useSafeAreaInsets();
  const cardView = useRef<ProfileCardView>(null);
  const writing = useRef(false); // synchronous guard against a fast double tap
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CardImage | null>(null);
  const [photoChange, setPhotoChange] = useState<CardImage | null | undefined>(undefined);
  const photoEdited = useRef(false);
  const [photoLoading, setPhotoLoading] = useState(!!existing);
  useEffect(() => {
    if (!existing) return;
    let active = true;
    void services.store.loadImage(existing.id, 'profilePhoto').then((jpegBase64) => {
      if (active && !photoEdited.current && jpegBase64) setPhoto({ jpegBase64, aspect: 1 });
    }).catch((e) => console.warn('Loading profile photo failed', e))
      .finally(() => { if (active) setPhotoLoading(false); });
    return () => { active = false; };
    // Load the saved photo once; local replacements must not be overwritten by a later refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [draft, setDraft] = useState<Draft>(() => {
    const details = existing?.profile ?? emptyProfile();
    const spaceId = existing ? existing.spaceId : space ? spaceFor(space).id : undefined;
    return {
      personId: existing?.personId ?? (person && people.some((p) => p.id === person) ? person : null),
      newName: null,
      dateOfBirth: details.dateOfBirth,
      bloodGroup: details.bloodGroup,
      template: details.template,
      ...(details.visibleFields && { visibleFields: details.visibleFields }),
      ...(details.conditions && { conditions: details.conditions }),
      ...(details.allergies && { allergies: details.allergies }),
      ...(details.medications && { medications: details.medications }),
      ...(details.medicalNotes !== undefined && { medicalNotes: details.medicalNotes }),
      ...(details.mobile !== undefined && { mobile: details.mobile }),
      ...(details.email !== undefined && { email: details.email }),
      ...(details.address !== undefined && { address: details.address }),
      ...(details.emergencyContacts !== undefined && { emergencyContacts: details.emergencyContacts }),
      ...(spaceId !== undefined && { spaceId }),
    };
  });
  const initial = useRef(draft).current;
  const changed = photoChange !== undefined || (Object.keys(draft) as (keyof Draft)[]).some((key) => draft[key] !== initial[key]);
  const leave = useConfirmDiscard(changed);
  const update = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };
  const usePhoto = (image: FrontImage) => {
    photoEdited.current = true;
    const next = { jpegBase64: image.jpegBase64, aspect: image.aspect };
    setPhoto(next);
    setPhotoChange(next);
  };
  const choosePhoto = async () => {
    try {
      const picked = await pickImage('square');
      if (picked) usePhoto(picked.image);
    } catch (e) {
      console.warn('Choosing a profile photo failed', e);
      Alert.alert(strings.edit.captureFailed);
    }
  };
  const shootPhoto = async () => {
    let path: string | null = null;
    try {
      path = await takePhoto();
      if (path) {
        const image = await cropSharedImage(path, 'square');
        if (image) usePhoto(image);
      }
    } catch (e) {
      console.warn('Taking a profile photo failed', e);
      Alert.alert(strings.edit.cameraFailed);
    } finally {
      if (path) discardFile(path);
    }
  };

  // A Person has one profile: starting one for someone who has it opens theirs instead.
  const openExisting = (personId: string) => {
    const found = profileOf(cards, personId);
    if (!found) return false;
    leave();
    router.replace(`/card/${found.id}`);
    return true;
  };
  useEffect(() => {
    if (isNew && draft.personId) openExisting(draft.personId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isNew && !existing) {
    return (
      <Screen style={styles.content}>
        <Panel style={styles.group}>
          <Text style={{ color: theme.text, fontSize: 18 }}>{strings.edit.notFound}</Text>
        </Panel>
      </Screen>
    );
  }

  const chosen = people.find((p) => p.id === draft.personId);
  const name = draft.newName !== null ? (personName(draft.newName) ?? '') : (chosen?.name ?? '');
  const details: ProfileDetails = { ...emptyProfile(), ...existing?.profile, dateOfBirth: draft.dateOfBirth, bloodGroup: draft.bloodGroup,
    template: draft.template, ...(draft.visibleFields && { visibleFields: draft.visibleFields }),
    ...(draft.conditions !== undefined && { conditions: draft.conditions }),
    ...(draft.allergies !== undefined && { allergies: draft.allergies }),
    ...(draft.medications !== undefined && { medications: draft.medications }),
    ...(draft.medicalNotes !== undefined && { medicalNotes: draft.medicalNotes }),
    ...(draft.mobile !== undefined && { mobile: draft.mobile }),
    ...(draft.email !== undefined && { email: draft.email }),
    ...(draft.address !== undefined && { address: draft.address }),
    ...(draft.emergencyContacts !== undefined && { emergencyContacts: draft.emergencyContacts }),
  };

  const save = async () => {
    if (writing.current) return;
    if (details.emergencyContacts?.some((contact) => !contact.name.trim() || !contact.phone.trim())) {
      Alert.alert(strings.profiles.contactRequired);
      return;
    }
    if (!name) {
      setError(strings.profiles.personRequired);
      return;
    }
    if (isNew && !canAddCard(cards.length, unlocked)) {
      router.push('/paywall');
      return;
    }
    writing.current = true;
    setSaving(true);
    let savedId: string;
    try {
      let personId = draft.personId;
      if (!personId) {
        const found = (await services.store.listPeople()).find((p) => samePersonName(p.name, name));
        personId = (found ?? (await services.store.createPerson(name))).id;
        if (isNew && found && openExisting(found.id)) return;
      }
      const front = await drawCard(cardView);
      if (existing) {
        const fields: CardFields = { ...fieldsOf(existing), name, personId, profile: details, ...(draft.spaceId !== undefined && { spaceId: draft.spaceId }) };
        savedId = (await services.store.update(existing.id, fields, { front, ...(photoChange !== undefined && { profilePhoto: photoChange }) })).id;
      } else {
        const fields: CardFields = {
          name, personId, profile: details,
          expiresOn: null, remindDaysBefore: DEFAULT_REMIND_DAYS, tags: [], documentKey: null, folderId: null,
          // Nothing to read off a drawn picture; empty text keeps it from being read later.
          readText: { front: '', back: '' },
          blurPreview: false, vertical: false,
          ...(draft.spaceId !== undefined && { spaceId: draft.spaceId }),
        };
        savedId = (await services.store.create(fields, { front, back: null, ...(photo && { profilePhoto: photo }) })).id;
      }
    } catch (e) {
      writing.current = false;
      setSaving(false);
      console.warn('Saving the profile failed', e);
      showError('save', e);
      return;
    }
    await refresh().catch((e) => console.warn('Refresh after saving the profile failed', e));
    leave();
    if (isNew) router.replace(`/card/${savedId}`);
    else router.back();
  };

  const personChips: Chip[] = [
    ...people.map((p) => ({
      key: p.id, label: p.name, selected: draft.newName === null && draft.personId === p.id, testID: `profile-person-${p.id}`,
      onPress: () => {
        if (!openExisting(p.id)) update({ personId: p.id, newName: null });
      },
    })),
    { key: 'new', label: `+ ${strings.profiles.newPerson}`, onPress: () => update({ personId: null, newName: '' }), testID: 'profile-person-new' },
  ];
  const bloodChips: Chip[] = BLOOD_GROUPS.map((group) => ({
    key: group, label: strings.profiles.bloodGroups[group], selected: draft.bloodGroup === group,
    onPress: () => update({ bloodGroup: group }), testID: `blood-${group}`,
  }));
  const templateChips: Chip[] = PROFILE_TEMPLATES.map((template) => ({
    key: template, label: strings.profiles[template], selected: draft.template === template,
    onPress: () => update({ template, visibleFields: !draft.visibleFields ||
      JSON.stringify(draft.visibleFields) === JSON.stringify(defaultVisibleFields(draft.template))
      ? defaultVisibleFields(template) : draft.visibleFields }), testID: `profile-template-${template}`,
  }));
  const visibleFields = draft.visibleFields ?? defaultVisibleFields(draft.template);
  const fieldChips: Chip[] = PROFILE_FIELDS.map((field) => ({
    key: field, label: strings.profiles[field], selected: visibleFields.includes(field),
    onPress: () => update({ visibleFields: visibleFields.includes(field)
      ? visibleFields.filter((item) => item !== field) : PROFILE_FIELDS.filter((item) => item === field || visibleFields.includes(item)) }),
    testID: `profile-field-${field}`,
  }));

  return (
    <Screen>
      <KeyboardAvoid>
        <Stack.Screen options={{ title: isNew ? strings.profiles.newTitle : strings.profiles.editTitle }} />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.preview}>
            <Text style={{ color: theme.muted, fontSize: 14 }}>{strings.profiles.preview}</Text>
            <ProfileCard ref={cardView} name={name || strings.people.name} profile={details} now={new Date()} photo={photo?.jpegBase64} />
          </View>
          <Panel style={styles.group}>
            <Field label={strings.profiles.photo}>
              {photo && <Image source={{ uri: `data:image/jpeg;base64,${photo.jpegBase64}` }} style={styles.photoPreview}
                accessibilityLabel={strings.profiles.photo} testID="profile-photo-preview" />}
              <View style={styles.photoActions}>
                <Button variant="secondary" label={strings.profiles.choosePhoto} onPress={() => void choosePhoto()} testID="profile-photo-library" />
                {canTakePhoto && <Button variant="secondary" label={strings.profiles.takePhoto} onPress={() => void shootPhoto()} testID="profile-photo-camera" />}
              </View>
              {photo && <Button variant="danger" label={strings.profiles.removePhoto} onPress={() => { photoEdited.current = true; setPhoto(null); setPhotoChange(null); }} testID="profile-photo-remove" />}
            </Field>
            <Field label={strings.profiles.person} error={error ?? undefined}>
              {!isNew && <Text style={{ color: theme.text, fontSize: 16 }} testID="profile-person">{chosen?.name}</Text>}
              {isNew && <>
                <Text style={{ color: theme.muted, fontSize: 14 }}>{strings.profiles.personHint}</Text>
                <ChipRow chips={personChips} accessibilityLabel={strings.profiles.person} />
                {draft.newName !== null && (
                  <TextInput value={draft.newName} onChangeText={(newName) => update({ newName })} maxLength={PERSON_NAME_MAX_LENGTH} autoFocus
                    autoCapitalize="words" returnKeyType="done" accessibilityLabel={strings.people.name} placeholder={strings.people.name}
                    placeholderTextColor={theme.muted} style={inputStyle} testID="profile-new-name" />
                )}
              </>}
            </Field>
            <Field label={strings.profiles.template}>
              <ChipRow chips={templateChips} accessibilityLabel={strings.profiles.template} />
            </Field>
            <Field label={strings.profiles.shownOnCard}>
              <ChipRow chips={fieldChips} accessibilityLabel={strings.profiles.shownOnCard} />
            </Field>
            <DateField
              label={strings.profiles.dateOfBirth}
              addLabel={strings.profiles.addDateOfBirth}
              clearLabel={strings.profiles.clearDateOfBirth}
              value={draft.dateOfBirth}
              onChange={(dateOfBirth) => update({ dateOfBirth })}
              maximumDate={new Date()}
              testID="date-of-birth"
            />
            <Field label={strings.profiles.bloodGroup}>
              <ChipRow chips={bloodChips} accessibilityLabel={strings.profiles.bloodGroup} />
            </Field>
            {(['conditions', 'allergies', 'medications'] as const).map((key) =>
              <ListField key={key} id={key} label={strings.profiles[key]} entries={draft[key] ?? []}
                onChange={(entries) => update({ [key]: entries })} />)}
            {(['medicalNotes', 'mobile', 'email', 'address'] as const).map((key) =>
              <Field key={key} label={strings.profiles[key]}>
                <TextInput accessibilityLabel={strings.profiles[key]} testID={`profile-${key}`}
                  value={draft[key] ?? ''} onChangeText={(value) => update({ [key]: value })}
                  style={inputStyle} maxLength={5000} multiline={key === 'medicalNotes' || key === 'address'}
                  keyboardType={key === 'email' ? 'email-address' : key === 'mobile' ? 'phone-pad' : 'default'} />
              </Field>)}
            <Field label={strings.profiles.emergencyContacts}>
              {(draft.emergencyContacts ?? []).map((contact, index) => <View key={index} style={styles.contact}>
                {(['name', 'relationship', 'phone'] as const).map((key) => <Field key={key} label={strings.profiles[key]}>
                  <TextInput accessibilityLabel={`${strings.profiles[key]} ${index + 1}`} testID={`profile-contact-${index}-${key}`}
                    value={contact[key] ?? ''} onChangeText={(value) => update({ emergencyContacts: draft.emergencyContacts?.map((entry, at) => at === index ? { ...entry, [key]: value } : entry) })}
                    style={inputStyle} maxLength={200} keyboardType={key === 'phone' ? 'phone-pad' : 'default'} />
                </Field>)}
                <View style={styles.contactActions}>
                  {index > 0 && <Button variant="secondary" label={strings.profiles.moveUp} testID={`profile-contact-up-${index}`}
                    onPress={() => { const next = [...(draft.emergencyContacts ?? [])]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update({ emergencyContacts: next }); }} />}
                  {index < (draft.emergencyContacts?.length ?? 0) - 1 && <Button variant="secondary" label={strings.profiles.moveDown} testID={`profile-contact-down-${index}`}
                    onPress={() => { const next = [...(draft.emergencyContacts ?? [])]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; update({ emergencyContacts: next }); }} />}
                  <Button variant="secondary" label={`${strings.profiles.removeContact} ${contact.name}`}
                    testID={`profile-contact-remove-${index}`} onPress={() => update({ emergencyContacts: draft.emergencyContacts?.filter((_, at) => at !== index) })} />
                </View>
              </View>)}
              {(draft.emergencyContacts?.length ?? 0) < 3 && <><Button variant="secondary" label={strings.profiles.addContact} testID="profile-add-contact"
                onPress={() => update({ emergencyContacts: [...(draft.emergencyContacts ?? []), { name: '', relationship: '', phone: '' }] })} />
              <Button variant="secondary" label={strings.profiles.pickContact} testID="profile-pick-contact"
                onPress={() => void pickContact().then((contact) => {
                  if (contact) update({ emergencyContacts: [...(draft.emergencyContacts ?? []), { ...contact, relationship: '' }] });
                }).catch((e) => { console.warn('Choosing a contact failed', e); Alert.alert(strings.profiles.contactPickerFailed); })} /></>}
            </Field>
            <SpaceField value={draft.spaceId} onChange={(spaceId) => update({ spaceId })} />
          </Panel>
        </ScrollView>
        <ActionFooter style={[styles.inset, { paddingBottom: 8 + insets.bottom }]} testID="profile-footer">
          <View style={styles.bar}>
            <View style={styles.action}>
              <Button variant="secondary" label={strings.common.close} onPress={() => router.back()} testID="close-profile" />
            </View>
            <View style={styles.action}>
              <Button label={saving ? strings.profiles.saving : isNew ? strings.profiles.save : strings.profiles.saveChanges}
                onPress={() => void save()} disabled={saving || photoLoading} testID="save-profile" />
            </View>
          </View>
        </ActionFooter>
      </KeyboardAvoid>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  preview: { alignItems: 'center', gap: 8 },
  group: { padding: 16, gap: 20 },
  inset: { paddingHorizontal: 16, paddingTop: 8 },
  bar: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryInput: { flex: 1 },
  contact: { gap: 8, paddingVertical: 8 },
  contactActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoPreview: { width: 80, height: 80, borderRadius: 40 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
