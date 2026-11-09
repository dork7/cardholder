import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askDocuments, AskResult, AskStep, AskStoppedError } from '../ai/ask';
import { lookupForAsking } from '../ai/lookupStore';
import { AskModel, ModelUnavailable } from '../ai/model';
import { chooseModel, prepareBuiltIn } from '../ai/models';
import { cardMarkdown } from '../cards/cardMarkdown';
import { CardStore } from '../cards/cardStore';
import { displayName } from '../cards/display';
import { Card, Folder } from '../cards/types';
import { strings } from '../strings';
import { Button } from './Button';
import { FONT, Text } from './Text';
import { TYPE, useTheme } from './theme';
import { useAnnounce } from './LiveText';

interface Props {
  visible: boolean;
  cards: readonly Card[];
  folders: readonly Folder[];
  store: CardStore;
  onClose: () => void;
  onOpenCard: (card: Card) => void;
  onViewLookup: () => void;
  onOpenSettings: () => void;
}

type ModelState =
  | { status: 'checking' }
  | { status: 'ready'; model: AskModel }
  | { status: 'unavailable'; reason: ModelUnavailable }
  | { status: 'preparing' };

type Phase =
  | { status: 'idle' }
  | { status: 'asking'; step: AskStep | null; remade: boolean }
  | { status: 'done'; result: AskResult; remade: boolean }
  | { status: 'failed' };

// A window from the bottom for asking a question about all the documents. The model reads the lookup
// file, then the documents it points to (src/ai/ask.ts). One question, one answer: nothing is kept,
// and closing the window stops a question still being worked on.
export function AskSheet({ visible, cards, folders, store, onClose, onOpenCard, onViewLookup, onOpenSettings }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [model, setModel] = useState<ModelState>({ status: 'checking' });
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>({ status: 'idle' });
  const abort = useRef<AbortController | null>(null);

  const checkModel = () => {
    setModel({ status: 'checking' });
    chooseModel()
      .then((choice) => setModel(choice.status === 'ready' ? { status: 'ready', model: choice.model } : { status: 'unavailable', reason: choice.reason }))
      .catch((e) => {
        console.warn('Choosing a model failed', e);
        setModel({ status: 'unavailable', reason: 'needs-download' });
      });
  };

  // Each opening starts fresh, and leaving forgets the question and stops it.
  useEffect(() => {
    if (!visible) return;
    setQuestion('');
    setPhase({ status: 'idle' });
    checkModel();
    return () => abort.current?.abort();
  }, [visible]);

  const close = () => {
    abort.current?.abort();
    onClose();
  };

  const getModel = async () => {
    setModel({ status: 'preparing' });
    try {
      await prepareBuiltIn();
    } catch (e) {
      console.warn('Getting the built-in model failed', e);
    }
    checkModel();
  };

  const ask = async () => {
    if (model.status !== 'ready' || question.trim() === '') return;
    const controller = new AbortController();
    abort.current = controller;
    setPhase({ status: 'asking', step: null, remade: false });
    try {
      const { lookup, remade } = await lookupForAsking(store, cards);
      setPhase({ status: 'asking', step: null, remade });
      const result = await askDocuments({
        question: question.trim(),
        cards,
        lookup: lookup.markdown,
        documentMarkdown: (card) => cardMarkdown(card, folders),
        model: model.model,
        signal: controller.signal,
        onProgress: (step) => !controller.signal.aborted && setPhase({ status: 'asking', step, remade }),
      });
      if (!controller.signal.aborted) setPhase({ status: 'done', result, remade });
    } catch (e) {
      if (e instanceof AskStoppedError || controller.signal.aborted) {
        setPhase({ status: 'idle' });
        return;
      }
      console.warn('Asking failed', e);
      setPhase({ status: 'failed' });
    }
  };

  const stop = () => {
    abort.current?.abort();
    setPhase({ status: 'idle' });
  };

  const asking = phase.status === 'asking';
  const progress =
    phase.status !== 'asking' || !phase.step
      ? strings.ask.readingLookup
      : phase.step.kind === 'lookup'
        ? strings.ask.readingLookup
        : strings.ask.checking(displayName(phase.step.card), phase.step.n, phase.step.of);
  // VoiceOver has no live regions: say what the live regions below say on Android.
  useAnnounce(
    !visible
      ? null
      : phase.status === 'asking'
        ? progress
        : phase.status === 'done'
          ? phase.result.kind === 'answer'
            ? `${phase.result.answer}. ${strings.ask.answerFrom(displayName(phase.result.card))}`
            : strings.ask.notFound
          : phase.status === 'failed'
            ? strings.ask.failed
            : null,
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.fill} onPress={close} accessibilityRole="button" accessibilityLabel={strings.common.close} />
        <View style={[styles.sheet, { backgroundColor: theme.bannerBg, paddingBottom: insets.bottom + 16 }]} testID="ask-sheet">
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {strings.ask.title}
          </Text>

          {cards.length === 0 ? (
            <Text style={[styles.body, { color: theme.text }]}>{strings.ask.noDocuments}</Text>
          ) : model.status === 'checking' || model.status === 'preparing' ? (
            <View style={styles.row}>
              <ActivityIndicator color={theme.text} accessibilityLabel={strings.ask.checkingModel} />
              {model.status === 'preparing' && <Text style={[styles.body, { color: theme.text }]}>{strings.ask.gettingModel}</Text>}
            </View>
          ) : model.status === 'unavailable' ? (
            <View style={styles.gap} testID="ask-unavailable">
              <Text style={[styles.body, { color: theme.text }]}>{strings.ask.unavailable[model.reason]}</Text>
              {model.reason === 'built-in-downloadable' && <Button label={strings.ask.getModel} onPress={() => void getModel()} testID="ask-get-model" />}
              {model.reason !== 'built-in-downloadable' && model.reason !== 'built-in-preparing' && (
                <Button label={strings.ask.openSettings} onPress={onOpenSettings} testID="ask-open-settings" />
              )}
            </View>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.gap} keyboardShouldPersistTaps="handled">
              <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.rosette }]}>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  onSubmitEditing={() => void ask()}
                  editable={!asking}
                  placeholder={strings.ask.placeholder}
                  placeholderTextColor={theme.muted}
                  accessibilityLabel={strings.ask.title}
                  returnKeyType="search"
                  multiline={false}
                  style={[styles.input, { color: theme.text }]}
                  testID="ask-input"
                />
              </View>

              {asking ? (
                <View style={styles.row} accessibilityLiveRegion="polite">
                  <ActivityIndicator color={theme.text} />
                  <Text style={[styles.body, styles.flex, { color: theme.text }]} testID="ask-progress">
                    {progress}
                  </Text>
                </View>
              ) : null}
              {(phase.status === 'asking' || phase.status === 'done') && phase.remade && (
                <Text style={[styles.caption, { color: theme.muted }]}>{strings.ask.lookupRemade}</Text>
              )}

              {phase.status === 'done' && phase.result.kind === 'answer' && (
                <View style={[styles.answer, { backgroundColor: theme.surface }]} testID="ask-answer" accessibilityLiveRegion="polite">
                  <Text style={[styles.answerText, { color: theme.text }]} selectable>
                    {phase.result.answer}
                  </Text>
                  <Text style={[styles.caption, { color: theme.muted }]}>{strings.ask.answerFrom(displayName(phase.result.card))}</Text>
                  <Text style={[styles.caption, { color: theme.muted }]}>{strings.ask.evidence}</Text>
                  <Text style={[styles.evidence, { color: theme.text }]} selectable testID="ask-evidence">
                    {phase.result.evidence}
                  </Text>
                  <Button
                    variant="secondary"
                    label={strings.ask.open}
                    onPress={() => phase.result.kind === 'answer' && onOpenCard(phase.result.card)}
                    testID="ask-open"
                  />
                </View>
              )}
              {phase.status === 'done' && phase.result.kind === 'not-found' && (
                <View style={styles.gap} testID="ask-not-found" accessibilityLiveRegion="polite">
                  <Text style={[styles.body, { color: theme.text }]}>{strings.ask.notFound}</Text>
                  {phase.result.checked.length > 0 && (
                    <Text style={[styles.caption, { color: theme.muted }]}>
                      {strings.ask.checked(phase.result.checked.map(displayName).join(', '))}
                    </Text>
                  )}
                </View>
              )}
              {phase.status === 'failed' && (
                <Text style={[styles.body, { color: theme.danger }]} accessibilityLiveRegion="polite">
                  {strings.ask.failed}
                </Text>
              )}

              <Text style={[styles.caption, { color: theme.muted }]}>
                {model.model.kind === 'built-in' ? strings.ask.usingBuiltIn : strings.ask.usingGemma} {strings.ask.privacy}
              </Text>
            </ScrollView>
          )}

          {model.status === 'ready' && cards.length > 0 && (
            <Button
              label={asking ? strings.ask.stop : strings.ask.go}
              variant={asking ? 'secondary' : 'primary'}
              disabled={!asking && question.trim() === ''}
              onPress={asking ? stop : () => void ask()}
              testID="ask-go"
            />
          )}
          <View style={styles.footer}>
            <View style={styles.flex}>
              <Button variant="secondary" label={strings.lookup.view} onPress={onViewLookup} testID="ask-view-lookup" />
            </View>
            <View style={styles.flex}>
              <Button variant="secondary" label={strings.common.close} onPress={close} testID="ask-close" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, gap: 12, maxHeight: '85%' },
  title: { fontSize: TYPE.section, fontWeight: '700', paddingHorizontal: 4 },
  scroll: { flexGrow: 0 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  body: { fontSize: TYPE.body },
  caption: { fontSize: TYPE.caption },
  field: { minHeight: 48, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  input: { minHeight: 48, fontSize: TYPE.body, fontFamily: FONT.regular },
  answer: { borderRadius: 16, padding: 16, gap: 6 },
  answerText: { fontSize: TYPE.section, fontWeight: '700' },
  evidence: { fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 13, marginBottom: 6 },
  footer: { flexDirection: 'row', gap: 10 },
});
