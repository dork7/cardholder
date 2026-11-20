import { AccessibilityActionEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { displayName } from '../cards/display';
import { expiryLabel, expiryStatus, needsExpiryAlert } from '../cards/expiry';
import { Card } from '../cards/types';
import { useCardImage } from '../hooks/useCardImage';
import { strings } from '../strings';
import { CardPicture } from './CardPicture';
import { ExpiryAlert } from './ExpiryAlert';
import { Panel } from './Surface';
import { Text } from './Text';
import { RADIUS, TRACKING, TYPE, useTheme } from './theme';
import { RetroIcon } from './RetroIcon';

// "ID · Expires in 9 days": the first tag, then when it expires.
export function metaLine(card: Card, now: Date): string {
  const expiry = expiryLabel(card, now);
  return card.tags.length > 0 ? `${card.tags[0]}${strings.home.metaSeparator}${expiry}` : expiry;
}

const isWarning = (card: Card, now: Date) => {
  const kind = expiryStatus(card, now).kind;
  return kind === 'expired' || kind === 'today' || kind === 'soon';
};

// A section title as a screen reader's heading, with an optional icon and trailing count.
export function SectionHeading({ title, icon, count, testID }: { title: string; icon?: 'pin'; count?: string; testID?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.heading} testID={testID}>
      <View style={styles.headingTitle}>
        {icon && <RetroIcon name={icon} size={20} color={theme.accent} />}
        <Text accessibilityRole="header" style={[styles.headingText, { color: theme.text }]}>{title}</Text>
      </View>
      {count !== undefined && <Text style={[styles.count, { color: theme.muted }]}>{count}</Text>}
    </View>
  );
}

interface RowActions {
  onOpen: (card: Card) => void;
  onToggle?: (card: Card) => void;
  selecting?: boolean;
  selected?: ReadonlySet<string>;
}

interface ListProps extends RowActions {
  cards: Card[];
}

function documentActions(card: Card, name: string, meta: string, { onOpen, onToggle, selecting, selected }: RowActions) {
  const toggle = onToggle ? () => onToggle(card) : undefined;
  return {
    onPress: selecting ? toggle : () => onOpen(card),
    onLongPress: toggle,
    accessibilityRole: selecting ? 'checkbox' as const : 'button' as const,
    accessibilityLabel: selecting ? `${name}, ${meta}` : `${strings.home.openCard(name)}, ${meta}`,
    accessibilityState: selecting ? { checked: selected?.has(card.id) ?? false } : undefined,
    accessibilityHint: !selecting && toggle ? strings.home.selectHint : undefined,
    accessibilityActions: !selecting && toggle ? [{ name: 'select', label: strings.home.selectAction }] : undefined,
    onAccessibilityAction: toggle
      ? (event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === 'select') toggle();
        }
      : undefined,
  };
}

function SelectionCheck({ checked }: { checked: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.check, { borderColor: checked ? theme.accent : theme.rosette, backgroundColor: checked ? theme.accent : theme.surface }]}>
      {checked && <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" accessible={false}>
        <Path d="M5 12l4 4L19 7" stroke={theme.onAccent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>}
    </View>
  );
}

// Pinned documents as large panels: the photo, the name and a meta line.
export function PinnedPanels({ cards, ...actions }: ListProps) {
  const now = new Date();
  return (
    <View style={styles.panels} testID="pinned-panels">
      {cards.map((card) => <PinnedPanel key={card.id} card={card} now={now} actions={actions} />)}
    </View>
  );
}

function PinnedPanel({ card, now, actions }: { card: Card; now: Date; actions: RowActions }) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const name = displayName(card);
  const meta = metaLine(card, now);
  return (
    <Pressable
      {...documentActions(card, name, meta, actions)}
      testID={`pinned-${card.id}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Panel style={styles.panel} radius={RADIUS.md} opaque testID={`pinned-panel-surface-${card.id}`}>
        <View style={[styles.photo, { backgroundColor: theme.bg }]}>
          <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
          {actions.selecting && (
            <View style={styles.panelCheck}><SelectionCheck checked={actions.selected?.has(card.id) ?? false} /></View>
          )}
          {needsExpiryAlert(card, now) && (
            <View style={styles.alert}><ExpiryAlert size={22} testID={`expiry-alert-${card.id}`} /></View>
          )}
        </View>
        <Text style={[styles.panelName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.meta, { color: isWarning(card, now) && expiryStatus(card, now).kind === 'expired' ? theme.danger : theme.muted }]} numberOfLines={1}>{meta}</Text>
      </Panel>
    </Pressable>
  );
}

// Every other document as a row: small photo, name and meta line, and a chevron.
export function DocumentRows({ cards, ...actions }: ListProps) {
  const now = new Date();
  return (
    <Panel style={styles.rows} opaque testID="document-rows">
      {cards.map((card, i) => <Row key={card.id} card={card} now={now} first={i === 0} actions={actions} />)}
    </Panel>
  );
}

function Row({ card, now, first, actions }: { card: Card; now: Date; first: boolean; actions: RowActions }) {
  const theme = useTheme();
  const uri = useCardImage(card, 'thumb');
  const name = displayName(card);
  const meta = metaLine(card, now);
  return (
    <Pressable
      {...documentActions(card, name, meta, actions)}
      testID={`row-${card.id}`}
      style={({ pressed }) => [styles.row, { borderColor: theme.border, borderTopWidth: first ? 0 : StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.thumb, { backgroundColor: theme.bg }]}>
        <CardPicture uri={uri} vertical={card.vertical} blurPreview={card.blurPreview} radius={3} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.photoDim }]} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.meta, { color: theme.muted }]} numberOfLines={1}>{meta}</Text>
      </View>
      {actions.selecting ? <SelectionCheck checked={actions.selected?.has(card.id) ?? false} /> : (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
          <Path d="M9 6l6 6-6 6" stroke={theme.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  headingTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  headingText: { fontSize: TYPE.section, fontWeight: '700', letterSpacing: TRACKING.tight },
  count: { fontSize: TYPE.secondary },
  panels: { gap: 12 },
  panel: { padding: 12, gap: 4 },
  photo: { aspectRatio: 1.585, borderRadius: RADIUS.sm, overflow: 'hidden', marginBottom: 6 },
  alert: { position: 'absolute', top: 8, start: 8 },
  panelCheck: { position: 'absolute', top: 8, end: 8 },
  check: { width: 24, height: 24, borderRadius: RADIUS.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  panelName: { fontSize: TYPE.body, fontWeight: '700' },
  meta: { fontSize: TYPE.secondary },
  rows: { paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  thumb: { width: 64, height: 40, borderRadius: 3, overflow: 'hidden' },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: TYPE.body, fontWeight: '600' },
});
