import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useApp } from '../src/app/AppProvider';
import { displayName } from '../src/cards/display';
import { splitPinned } from '../src/cards/listing';
import { Card } from '../src/cards/types';
import { listDocumentVisits, DocumentVisit } from '../src/showcase/documentVisits';
import { ShowcaseIcon, useShowcaseAdd } from '../src/showcase/ShowcaseActions';
import { DocumentArtwork, EmptySection, ShowcaseDocumentRow, ShowcaseNoteRow, ShowcaseSectionHeading, SpaceCarousel } from '../src/showcase/ShowcaseLibrary';
import { spaceFor } from '../src/spaces/spaces';
import { strings } from '../src/strings';
import { formatActivityAgo } from '../src/time/dates';
import { Button } from '../src/ui/Button';
import { Fab } from '../src/ui/Fab';
import { RetroIcon } from '../src/ui/RetroIcon';
import { Screen } from '../src/ui/Surface';
import { TabBar, useTabBarClearance } from '../src/ui/TabBar';
import { Text } from '../src/ui/Text';
import { RADIUS, TYPE, useTheme } from '../src/ui/theme';
import { UndoBar } from '../src/ui/UndoBar';

const PAGE_INSET = 16;
const HOME_MAX_WIDTH = 600;
const FAVORITE_GAP = 12;

export default function Home() {
  const { cards, notes, services, undo, openImportOnReady, clearOpenImport, pdfBackfill, stopPdfBackfill } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  const add = useShowcaseAdd();
  const [visits, setVisits] = useState<DocumentVisit[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void listDocumentVisits(services.db).then((next) => { if (active) setVisits(next); }).catch(() => {});
    return () => { active = false; };
  }, [services]));
  useEffect(() => {
    if (!openImportOnReady) return;
    clearOpenImport();
    router.push('/import');
  }, [openImportOnReady, clearOpenImport, router]);

  const byId = new Map(cards.map((card) => [card.id, card]));
  const recent = visits.flatMap((visit) => {
    const card = byId.get(visit.id);
    return card ? [{ card, visitedAt: visit.visitedAt }] : [];
  }).slice(0, 3);
  const now = Date.now();
  const recentNotes = [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 2);
  return <Screen style={{ paddingTop: insets.top }}>
    <View style={styles.header}>
      <View style={styles.brandMark} aria-hidden>
        {[[12, 0], [0, 12], [12, 12], [24, 12], [12, 24]].map(([left, top]) => (
          <View key={`${left}-${top}`} style={[styles.brandDot, { left, top, backgroundColor: theme.accent }]} />
        ))}
      </View>
      <View style={styles.brand}>
        <Text style={[styles.brandName, { color: theme.text }]}>doc keeper</Text>
        <Text style={{ color: theme.muted, fontSize: TYPE.caption }}>Your private space</Text>
      </View>
      <ShowcaseIcon icon="search" label="Search documents" onPress={() => router.replace('/documents?search=1')} />
      <ShowcaseIcon icon="plus" label="Add document or note" onPress={add.open} />
      <ShowcaseIcon icon="settings" label={strings.home.settings} onPress={() => router.push('/settings')} />
    </View>
    <ScrollView contentContainerStyle={styles.content} testID="showcase-home">
      {pdfBackfill && <View style={styles.panel}>
        <Text style={{ color: theme.text }}>{strings.home.backfillProgress(pdfBackfill.done, pdfBackfill.total)}</Text>
        <Button variant="secondary" label={strings.common.cancel} onPress={stopPdfBackfill} testID="backfill-cancel" />
      </View>}
      <Favorites cards={splitPinned(cards).pinned} />
      <View style={[styles.panel, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
        <ShowcaseSectionHeading title={strings.home.recentTitle} onPress={() => router.replace('/documents?mode=recent')} />
        {recent.length ? recent.map(({ card, visitedAt }) => (
          <ShowcaseDocumentRow key={card.id} card={card} subtitle={strings.home.opened(formatActivityAgo(visitedAt, now))} />
        )) : <EmptySection>{strings.home.recentEmpty}</EmptySection>}
      </View>
      <View style={[styles.panel, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
        <ShowcaseSectionHeading title="Notes" onPress={() => router.replace('/notes')} />
        {recentNotes.length ? recentNotes.map((note) => <ShowcaseNoteRow key={note.id} note={note} subtitle={`Changed ${formatActivityAgo(note.updatedAt, now)}`} />)
          : <EmptySection>{strings.home.notesEmpty}</EmptySection>}
      </View>
      <View style={[styles.panel, { backgroundColor: theme.glassStrong, borderColor: theme.border }]}>
        <ShowcaseSectionHeading title="Spaces" onPress={() => router.replace('/spaces')} />
        <SpaceCarousel cards={cards} notes={notes} onSelect={(id) => router.replace(`/spaces?space=${id}`)} />
        {cards.length === 0 && notes.length === 0 && <EmptySection>{strings.home.spacesEmpty}</EmptySection>}
      </View>
    </ScrollView>
    <View pointerEvents="box-none" style={[styles.undo, { bottom: clearance }]}><UndoBar undo={undo} /></View>
    <Fab label="Add document or note" onPress={add.open} testID="showcase-add-button" />
    <TabBar active="home" />
    {add.sheet}
  </Screen>;
}

function Favorites({ cards }: { cards: readonly Card[] }) {
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const viewportWidth = Math.min(width, HOME_MAX_WIDTH) - 2 * PAGE_INSET;
  const widthPerCard = viewportWidth - 2 * PAGE_INSET - FAVORITE_GAP - Math.round(viewportWidth * 0.14);
  const step = widthPerCard + FAVORITE_GAP;
  const previousStep = useRef(step);
  const list = useRef<ComponentRef<typeof ScrollView>>(null);
  const [slide, setSlide] = useState(0);
  const current = Math.min(slide, Math.max(0, cards.length - 1));
  useEffect(() => {
    if (slide !== current || step !== previousStep.current) {
      previousStep.current = step;
      setSlide(current);
      list.current?.scrollTo({ x: current * step, animated: false });
    }
  }, [current, slide, step]);

  const selectSlide = (index: number) => {
    setSlide(index);
    list.current?.scrollTo({ x: index * step, animated: false });
  };
  return <View style={[styles.favorites, { backgroundColor: theme.showcase.end }]} testID="showcase-favorites">
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs><LinearGradient id="favorite-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0" stopColor={theme.showcase.start} /><Stop offset="1" stopColor={theme.showcase.end} />
      </LinearGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#favorite-gradient)" />
    </Svg>
    <View style={styles.favoriteHeading}>
      <Text accessibilityRole="header" style={[styles.favoriteTitle, { color: theme.showcase.ink }]}>My favorites</Text>
      <ShowcaseIcon icon="arrow" label="View pinned documents" onPress={() => router.replace('/documents?mode=favorites')} />
    </View>
    {!cards.length ? <View style={styles.favoriteEmpty}>
      <RetroIcon name="pin" color={theme.showcase.ink} size={30} />
      <Text style={{ color: theme.showcase.ink, fontSize: TYPE.body }}>{strings.home.favoritesEmpty}</Text>
    </View> : <>
      <ScrollView ref={list} horizontal testID="favorites-carousel" snapToInterval={step} decelerationRate="fast"
        showsHorizontalScrollIndicator={false} scrollEventThrottle={16}
        contentContainerStyle={[styles.featureList, { paddingEnd: viewportWidth - widthPerCard - PAGE_INSET }]}
        onScroll={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / step);
          setSlide(Math.min(cards.length - 1, Math.max(0, index)));
        }}>
        {cards.map((card) => <Pressable key={card.id} accessibilityRole="button"
          accessibilityLabel={displayName(card)} onPress={() => router.push(`/card/${card.id}`)}
          style={[styles.featureCard, { width: widthPerCard, backgroundColor: theme.surface }]}>
          <View style={styles.featureArtwork}><DocumentArtwork card={card} /></View>
          <View style={styles.featureLabel}>
            <View style={styles.brand}>
              <Text style={[styles.featureName, { color: theme.text }]} numberOfLines={2}>{displayName(card)}</Text>
              <Text style={{ color: theme.muted, fontSize: TYPE.caption }}>{spaceFor(card.spaceId).name} space</Text>
            </View>
            <RetroIcon name="pin" size={20} color={theme.accent} />
          </View>
        </Pressable>)}
      </ScrollView>
      {cards.length > 1 && <View style={styles.dots}>
        {cards.map((card, index) => <Pressable key={card.id} accessibilityRole="button"
          accessibilityLabel={`Show favorite ${index + 1}`} accessibilityState={{ selected: index === current }}
          onPress={() => selectSlide(index)}
          style={styles.dotTarget}>
          <View style={[styles.dot, { backgroundColor: theme.showcase.ink, opacity: index === current ? 1 : 0.48 }]} />
        </Pressable>)}
      </View>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  brandMark: { width: 34, height: 34, marginEnd: 3 },
  brandDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  brand: { flex: 1, minWidth: 0 },
  brandName: { fontWeight: '700', fontSize: TYPE.section, letterSpacing: -0.4 },
  content: { padding: PAGE_INSET, paddingTop: 0, paddingBottom: 88, gap: 16, width: '100%', maxWidth: HOME_MAX_WIDTH, alignSelf: 'center' },
  panel: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, gap: 4 },
  favorites: { borderRadius: RADIUS.lg, overflow: 'hidden', paddingTop: 16, paddingBottom: 5, gap: 12 },
  favoriteHeading: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  favoriteTitle: { flex: 1, fontSize: TYPE.section + 3, fontWeight: '700' },
  favoriteEmpty: { minHeight: 126, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 10 },
  featureList: { gap: FAVORITE_GAP, paddingStart: PAGE_INSET, paddingBottom: 4 },
  featureCard: { borderRadius: RADIUS.md, overflow: 'hidden' },
  featureArtwork: { aspectRatio: 2.55 },
  featureLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  featureName: { fontSize: TYPE.body, fontWeight: '700' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  dotTarget: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  undo: { position: 'absolute', start: 16, end: 90 },
});
