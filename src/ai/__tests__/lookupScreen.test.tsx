import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { fields, images, makeStore } from '../../../test/fixtures';
import LookupScreen from '../../../app/lookup';
import { CardStore } from '../../cards/cardStore';
import { Card } from '../../cards/types';
import { strings } from '../../strings';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockShare = jest.fn(async (..._a: unknown[]) => {});
jest.mock('../../share/shareCard', () => ({ shareMarkdown: (...a: unknown[]) => mockShare(...a) }));

let mockApp: { cards: Card[]; services: { store: CardStore } };
jest.mock('../../app/AppProvider', () => ({ useApp: () => mockApp }));

async function setup() {
  const { store } = await makeStore();
  const card = await store.create(fields({ name: 'Emirates ID', category: 'id' }), images('a'));
  mockApp = { cards: [card], services: { store } };
  return { store, card };
}

test('with no lookup file yet, offers to create one, then shows it', async () => {
  const { store } = await setup();
  await render(<LookupScreen />);
  await waitFor(() => expect(screen.getByTestId('lookup-none')).toBeTruthy());
  expect(screen.getByText(strings.lookup.create)).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByTestId('lookup-recreate')));
  await waitFor(() => expect(screen.getByTestId('lookup-markdown')).toBeTruthy());
  expect(screen.getByTestId('lookup-markdown').props.children).toContain('Emirates ID');
  expect(screen.getByText(strings.lookup.current)).toBeTruthy();
  expect(await store.loadLookup()).not.toBeNull();
});

test('says when the lookup file is out of date, and recreating it brings it up to date', async () => {
  const { store, card } = await setup();
  await store.saveLookup('# old', [card.id]);
  const edited = await store.update(card.id, fields({ name: 'Passport', category: 'id' }));
  mockApp = { ...mockApp, cards: [edited] };
  await render(<LookupScreen />);
  await waitFor(() => expect(screen.getByText(strings.lookup.stale)).toBeTruthy());
  await act(async () => fireEvent.press(screen.getByTestId('lookup-recreate')));
  await waitFor(() => expect(screen.getByText(strings.lookup.current)).toBeTruthy());
  expect(screen.getByTestId('lookup-markdown').props.children).toContain('Passport');
});

test('saves the lookup file as a .md file', async () => {
  const { store, card } = await setup();
  await store.saveLookup('# Document lookup', [card.id]);
  await render(<LookupScreen />);
  await waitFor(() => expect(screen.getByTestId('lookup-save')).toBeTruthy());
  await act(async () => fireEvent.press(screen.getByTestId('lookup-save')));
  expect(mockShare).toHaveBeenCalledWith(strings.lookup.title, '# Document lookup');
});
