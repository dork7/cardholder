import { View, StyleSheet } from 'react-native';
import { Profile } from './types';
import { Text } from '../ui/Text';
import { TYPE, TRACKING, RADIUS, useTheme } from '../ui/theme';

export function ageOn(dateOfBirth: string | null, today = new Date()): number | null {
  if (!dateOfBirth) return null;
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  return today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
}

export function ProfileCard({ name, profile }: { name: string; profile: Profile }) {
  const theme = useTheme();
  const age = ageOn(profile.dateOfBirth);
  return <View collapsable={false} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="medical-card">
    <Text style={[styles.eyebrow, { color: theme.muted }]}>MEDICAL PROFILE</Text>
    <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
    <View style={[styles.rule, { backgroundColor: theme.border }]} />
    <View style={styles.row}>
      <View><Text style={[styles.label, { color: theme.muted }]}>AGE</Text><Text style={[styles.value, { color: theme.text }]}>{age ?? '—'}</Text></View>
      <View><Text style={[styles.label, { color: theme.muted }]}>BLOOD GROUP</Text><Text style={[styles.value, { color: theme.text }]}>{profile.bloodGroup}</Text></View>
    </View>
    {profile.conditions?.length ? <Text style={{ color: theme.text }}>Conditions: {profile.conditions.join(', ')}</Text> : null}
    {profile.allergies?.length ? <Text style={{ color: theme.text }}>Allergies: {profile.allergies.join(', ')}</Text> : null}
    {profile.medications?.length ? <Text style={{ color: theme.text }}>Medications: {profile.medications.join(', ')}</Text> : null}
    {profile.medicalNotes ? <Text style={{ color: theme.text }}>Notes: {profile.medicalNotes}</Text> : null}
    {profile.mobile ? <Text style={{ color: theme.text }}>Mobile: {profile.mobile}</Text> : null}
    {profile.email ? <Text style={{ color: theme.text }}>Email: {profile.email}</Text> : null}
    {profile.address ? <Text style={{ color: theme.text }}>Address: {profile.address}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 220, borderWidth: 1, borderRadius: RADIUS.none, padding: 20, gap: 12 },
  eyebrow: { fontSize: TYPE.caption, fontWeight: '600', letterSpacing: TRACKING.caps },
  name: { fontSize: TYPE.title, fontWeight: '700', letterSpacing: TRACKING.tight },
  rule: { height: 1 },
  row: { flexDirection: 'row', gap: 48 },
  label: { fontSize: TYPE.caption, fontWeight: '600', letterSpacing: TRACKING.caps },
  value: { fontSize: TYPE.section, fontWeight: '700' },
});
