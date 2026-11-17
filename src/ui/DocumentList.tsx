import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { displayName } from '../cards/display';
import { expiryLabel, expiryStatus, needsExpiryAlert } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { ExpiryAlert } from './ExpiryAlert';
import { CardPicture } from './CardPicture';
import { RetroIcon } from './RetroIcon';
import { Panel } from './Surface';
import { Text } from './Text';
import { RADIUS, TRACKING, TYPE, useTheme } from './theme';

interface Props {
  cards: Card[]; // what is shown, in order
  pinned: Card[]; // the pinned ones among them
  filtering: boolean; // a search or tag is active: one flat list of results
  heading: string; // title of the flat list while filtering
  onOpen: (card: Card) => void;
}

// The prototype's document library: pinned documents as large panels, then every other document as a
// row (or, while searching or filtering, a single list of the matches).
export function DocumentList({ cards, pinned, filtering, heading, onOpen }: Props) {
  const theme = useTheme();
  const now = new Date();
  const rest = cards.filter((c) => !pinned.some((p) => p.id === c.id));
  return (
    <ScrollView testID="document-list" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {filtering ? (
        <>
          <SectionTop title={heading} count={cards.length} />
          {cards.map((card) => <DocumentRow key={card.id} card={card} now={now} onOpen={onOpen} />)}
        </>
      ) : (
        <>
          {pinned.length > 0 && (
            <>
              <SectionTop title={strings.home.pinnedHeading} icon={<RetroIcon name="pin" size={20} color={theme.text} />} />
              {pinned.map((card) => <DocumentPanel key={card.id} card={card} now={now} onOpen={onOpen} />)}
            </>
          )}
          {rest.length > 0 && (
            <>
              <SectionTop title={strings.home.allDocuments} count={cards.length} />
              {rest.map((card) => <DocumentRow key={card.id} card={card} now={now} onOpen={onOpen} />)}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function SectionTop({ title, count, icon }: { title: string; count?: number; icon?: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTop}>
      <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">{title}</Text>
      {icon}
      {count !== undefined && <Text style={[styles.count, { color: theme.muted }]}>{strings.home.documentCount(count)}</Text>}
    </View>
  );
}

// "ID · Expires in 9 days": the first tag, then the expiry only when there is one.
export function metaLine(card: Card, now: Date): string {
  const parts = [card.tags[0], expiryStatus(card, now).kind === 'none' ? null : expiryLabel(card, now)];
  return parts.filter(Boolean).join(' · ');
}

interface ItemProps { card: Card; now: Date; onOpen: (card: Card) => void }

function useDocumentItem({ card, now }: ItemProps) {
  const uri = useCardImage(card, 'thumb');
  const name = displayName(card);
  const meta = metaLine(card, now);
  const alert = needsExpiryAlert(card, now);
  return { uri, name, meta, alert, label: alert ? `${strings.home.openCard(name)}, ${expiryLabel(card, now)}` : strings.home.openCard(name) };
}

function DocumentPanel(props: ItemProps) {
  const theme = useTheme();
  const { card, onOpen } = props;
  const { uri, name, meta, alert, label } = useDocumentItem(props);
  return (
    <Pressable onPress={() => onOpen(card)} accessibilityRole="button" accessibilityLabel={label} testID={`doc-panel-${card.id}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Panel radius={RADIUS.md} style={styles.panel}>
        <View style={[styles.photo, { backgroundColor: theme.bg }]}>
          {uri && <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} radius={RADIUS.sm} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
          {alert && <View style={styles.alert}><ExpiryAlert size={28} testID={`expiry-alert-${card.id}`} /></View>}
        </View>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        {!!meta && <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>{meta}</Text>}
      </Panel>
    </Pressable>
  );
}

function DocumentRow(props: ItemProps) {
  const theme = useTheme();
  const { card, onOpen } = props;
  const { uri, name, meta, alert, label } = useDocumentItem(props);
  return (
    <Pressable onPress={() => onOpen(card)} accessibilityRole="button" accessibilityLabel={label} testID={`doc-row-${card.id}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <Panel radius={RADIUS.md} style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: theme.bg }]}>
          {uri && <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} />}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
          {alert && <View style={styles.alert}><ExpiryAlert size={16} /></View>}
        </View>
        <View style={styles.info}>
          <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
          {!!meta && <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>{meta}</Text>}
        </View>
        <Text style={[styles.chevron, { color: theme.muted }]} accessible={false}>›</Text>
      </Panel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 16 },
  sectionTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { flex: 1, fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  count: { fontSize: TYPE.secondary },
  panel: { padding: 12, gap: 4 },
  // ID-1 card proportions, as the stack and gallery use.
  photo: { width: '100%', aspectRatio: 1.586, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: 6 },
  name: { fontSize: TYPE.section, fontWeight: '700' },
  meta: { fontSize: TYPE.secondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, minHeight: 64 },
  thumb: { width: 64, height: 40, borderRadius: 2.4, overflow: 'hidden' },
  info: { flex: 1, gap: 2 },
  rowName: { fontSize: TYPE.body, fontWeight: '700' },
  chevron: { fontSize: TYPE.title, lineHeight: TYPE.title },
  alert: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
});
