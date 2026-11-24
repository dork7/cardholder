import { ComponentRef, Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { strings } from '../strings';
import { formatDate, fromIsoDate } from '../time/dates';
import { CARD_RADIUS, ID1_RATIO } from '../ui/cardDimensions';
import { Text } from '../ui/Text';
import { TRACKING, useTheme } from '../ui/theme';
import { ageOn, ProfileDetails } from './profile';

// The drawn card's size in points. It is captured to an image at the screen's pixel density, so it
// stays sharp, and it never scales with the text size: the picture must look the same wherever it is shown.
export const PROFILE_CARD_WIDTH = 320; // fits a 360 pt wide phone inside the form's margins
export const PROFILE_CARD_HEIGHT = Math.round(PROFILE_CARD_WIDTH / ID1_RATIO);

export type ProfileCardView = ComponentRef<typeof View>;

// What the card says, in reading order: also the picture's label for a screen reader.
export function profileSummary(name: string, profile: ProfileDetails, now: Date): string {
  const s = strings.profiles;
  const age = ageOn(profile.dateOfBirth, now);
  const parts = [
    ...(age !== null ? [s.age(age)] : []),
    ...(profile.dateOfBirth ? [s.born(formatDate(fromIsoDate(profile.dateOfBirth).getTime()))] : []),
    `${s.bloodGroup} ${s.bloodGroups[profile.bloodGroup]}`,
    ...(['conditions', 'allergies', 'medications'] as const).filter((key) => profile[key]?.length).map((key) => `${s[key]}: ${profile[key]!.join(', ')}`),
    ...(['medicalNotes', 'mobile', 'email', 'address'] as const).filter((key) => profile[key]).map((key) => `${s[key]}: ${profile[key]}`),
  ];
  return strings.profiles.pictureLabel(name, parts.join(', '));
}

// The Medical template: who it is, their age, and their blood group large enough to read at a glance.
export function ProfileCard({ name, profile, now, ref }: { name: string; profile: ProfileDetails; now: Date; ref?: Ref<ProfileCardView> }) {
  const theme = useTheme();
  const ink = theme.showcase.ink;
  const s = strings.profiles;
  const age = ageOn(profile.dateOfBirth, now);
  const born = profile.dateOfBirth ? s.born(formatDate(fromIsoDate(profile.dateOfBirth).getTime())) : null;
  return (
    <View ref={ref} collapsable={false} testID="profile-card"
      accessible accessibilityRole="image" accessibilityLabel={profileSummary(name, profile, now)}
      style={[styles.card, { backgroundColor: theme.showcase.start }]}>
      <View style={styles.top}>
      <View style={styles.main}>
        <Text allowFontScaling={false} style={[styles.kind, { color: ink }]}>{s.medical.toUpperCase()}</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={[styles.name, { color: ink }]}>{name}</Text>
        {(age !== null || born) && (
          <Text allowFontScaling={false} numberOfLines={2} style={[styles.meta, { color: ink }]}>
            {[age !== null ? s.age(age) : null, born].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      <View style={[styles.blood, { backgroundColor: theme.showcase.end }]}>
        <Text allowFontScaling={false} style={[styles.bloodLabel, { color: ink }]}>{s.bloodGroup}</Text>
        <Text allowFontScaling={false} adjustsFontSizeToFit numberOfLines={1}
          style={[styles.bloodValue, profile.bloodGroup === 'unknown' && styles.bloodUnknown, { color: ink }]}>
          {s.bloodGroups[profile.bloodGroup]}
        </Text>
      </View>
      </View>
      {(['allergies', 'conditions', 'medications', 'medicalNotes', 'mobile', 'email', 'address'] as const).map((key) => {
        const value = profile[key];
        const content = Array.isArray(value) ? value.filter(Boolean).join(', ') : value;
        return content ? <View key={key} style={styles.detail}>
          <Text allowFontScaling={false} style={[styles.detailLabel, { color: ink }]}>{s[key]}</Text>
          <Text allowFontScaling={false} style={[styles.detailValue, { color: ink }]}>{content}</Text>
        </View> : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: PROFILE_CARD_WIDTH, borderRadius: PROFILE_CARD_WIDTH * CARD_RADIUS,
    overflow: 'hidden',
  },
  top: { height: PROFILE_CARD_HEIGHT, flexDirection: 'row' },
  main: { flex: 1, padding: 18, gap: 6 },
  kind: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, opacity: 0.8 },
  name: { fontSize: 24, fontWeight: '700', letterSpacing: TRACKING.tight, marginTop: 'auto' },
  meta: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  blood: { width: 112, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, gap: 4 },
  bloodLabel: { fontSize: 11, fontWeight: '700', opacity: 0.85, textAlign: 'center' },
  bloodValue: { fontSize: 40, fontWeight: '700', letterSpacing: TRACKING.tight },
  bloodUnknown: { fontSize: 18 },
  detail: { paddingHorizontal: 18, paddingVertical: 8 },
  detailLabel: { fontSize: 11, fontWeight: '700' },
  detailValue: { fontSize: 14, fontWeight: '600' },
});
