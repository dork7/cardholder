import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { fields, images, makeStore } from '../../../test/fixtures';
import { AskModel, ModelChoice } from '../../ai/model';
import { Card } from '../../cards/types';
import { strings } from '../../strings';
import { AskSheet } from '../AskSheet';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

let mockChoice: ModelChoice;
const mockPrepare = jest.fn(async () => true);
jest.mock('../../ai/models', () => ({
  chooseModel: async () => mockChoice,
  prepareBuiltIn: () => mockPrepare(),
}));

// Picks the insurance row from the lookup, then answers an expiry question from the insurance document only.
const answering: AskModel = {
  kind: 'built-in',
  promptChars: 7000,
  async generate(prompt) {
    if (prompt.user.includes('Lookup table:')) return '{"documents": [1]}';
    if (prompt.user.includes('expire') && prompt.user.includes('ORIENT')) return '{"found": true, "answer": "31 May 2027", "evidence": "Policy expiry: 31/05/2027"}';
    return '{"found": false, "answer": "", "evidence": ""}';
  },
};

async function setup(model: ModelChoice = { status: 'ready', model: answering }) {
  mockChoice = model;
  const { store } = await makeStore();
  const ins = await store.create(
    fields({ name: 'Car insurance', category: 'insurance', readText: { front: 'ORIENT INSURANCE\nPolicy expiry: 31/05/2027', back: '' } }),
    images('ins'),
  );
  const gym = await store.create(fields({ name: 'Gym', readText: { front: 'FITNESS FIRST', back: '' } }), images('gym'));
  const cards: Card[] = [ins, gym];
  const handlers = { onClose: jest.fn(), onOpenCard: jest.fn(), onViewLookup: jest.fn(), onOpenSettings: jest.fn() };
  await render(<AskSheet visible cards={cards} folders={[]} store={store} {...handlers} />);
  return { store, ins, gym, ...handlers };
}

const ask = async (question: string) => {
  await waitFor(() => expect(screen.getByTestId('ask-input')).toBeTruthy());
  await act(async () => fireEvent.changeText(screen.getByTestId('ask-input'), question));
  await act(async () => fireEvent.press(screen.getByTestId('ask-go')));
};

test('answers from the documents, says where from and on which line, and opens that document', async () => {
  const { ins, onOpenCard, store } = await setup();
  await ask('When does my car insurance expire?');
  await waitFor(() => expect(screen.getByTestId('ask-answer')).toBeTruthy());
  expect(screen.getByText('31 May 2027')).toBeTruthy();
  expect(screen.getByText(strings.ask.answerFrom('Car insurance'))).toBeTruthy();
  expect(screen.getByTestId('ask-evidence').props.children).toBe('Policy expiry: 31/05/2027');
  // The lookup file was made for this first question, and kept.
  expect((await store.loadLookup())?.ids).toHaveLength(2);
  await act(async () => fireEvent.press(screen.getByTestId('ask-open')));
  expect(onOpenCard).toHaveBeenCalledWith(expect.objectContaining({ id: ins.id }));
});

test('says so when no document holds the answer, naming the ones it checked', async () => {
  await setup();
  await ask('What is my blood type?');
  await waitFor(() => expect(screen.getByTestId('ask-not-found')).toBeTruthy());
  expect(screen.getByText(strings.ask.notFound)).toBeTruthy();
  expect(screen.getByText(/Checked: /)).toBeTruthy();
});

test('Ask stays off until there is a question', async () => {
  await setup();
  await waitFor(() => expect(screen.getByTestId('ask-go')).toBeTruthy());
  expect(screen.getByTestId('ask-go').props.accessibilityState.disabled).toBe(true);
});

test('with no model on the phone, it says how to get one and links to Settings', async () => {
  const { onOpenSettings } = await setup({ status: 'unavailable', reason: 'needs-download' });
  await waitFor(() => expect(screen.getByTestId('ask-unavailable')).toBeTruthy());
  expect(screen.getByText(strings.ask.unavailable['needs-download'])).toBeTruthy();
  expect(screen.queryByTestId('ask-input')).toBeNull();
  await act(async () => fireEvent.press(screen.getByTestId('ask-open-settings')));
  expect(onOpenSettings).toHaveBeenCalled();
});

test("a phone that can download its own model offers to, then checks again", async () => {
  await setup({ status: 'unavailable', reason: 'built-in-downloadable' });
  await waitFor(() => expect(screen.getByTestId('ask-get-model')).toBeTruthy());
  mockChoice = { status: 'ready', model: answering };
  await act(async () => fireEvent.press(screen.getByTestId('ask-get-model')));
  expect(mockPrepare).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByTestId('ask-input')).toBeTruthy());
  expect(screen.getByText(new RegExp(strings.ask.usingBuiltIn))).toBeTruthy();
});

test('View lookup file is always there', async () => {
  const { onViewLookup } = await setup();
  await act(async () => fireEvent.press(screen.getByTestId('ask-view-lookup')));
  expect(onViewLookup).toHaveBeenCalled();
});
