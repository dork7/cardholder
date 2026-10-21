import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { frontImage, makeCard } from '../../../test/fixtures';
import EditCard from '../../../app/edit/[id]';
import { strings } from '../../strings';

let mockParams: { id: string } = { id: 'new' };
const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockRefresh = jest.fn();
const mockPermission = jest.fn();
let mockCards: ReturnType<typeof makeCard>[] = [];

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, dismissAll: mockDismissAll, replace: mockReplace }),
}));
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: {
      store: {
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
        remove: (...a: unknown[]) => mockRemove(...a),
        loadImage: () => Promise.resolve(null),
      },
    },
    cards: mockCards,
    unlocked: false,
    refresh: () => mockRefresh(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../reminders/scheduler', () => ({
  requestReminderPermissionOnce: () => mockPermission(),
}));
jest.mock('../../images/capture', () => ({
  pickImage: () => Promise.resolve(require('../../../test/fixtures').frontImage('picked')),
}));

let warn: jest.SpyInstance;
let alert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'new' };
  mockCards = [];
  mockCreate.mockResolvedValue(makeCard());
  mockUpdate.mockResolvedValue(makeCard());
  mockRemove.mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue(undefined);
  mockPermission.mockResolvedValue(true);
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
  alert.mockRestore();
});

async function fillNewCard() {
  await render(<EditCard />);
  await fireEvent.press(screen.getByTestId('front-library'));
  await fireEvent.changeText(screen.getByTestId('card-name'), 'Gym');
}

const save = () => fireEvent.press(screen.getByTestId('save-card'));

describe('saving', () => {
  test('a failed reminder permission after the card was written still leaves the screen, without a second write', async () => {
    mockPermission.mockRejectedValue(new Error('permission boom'));
    await fillNewCard();
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.addExpiry }));
    await save();
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a failed refresh after the card was written still leaves the screen, without a second write', async () => {
    mockRefresh.mockRejectedValue(new Error('refresh boom'));
    await fillNewCard();
    await save();
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  test('a failed edit write shows the error, stays, and allows a retry', async () => {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    mockUpdate.mockRejectedValueOnce(new Error('disk full'));
    await render(<EditCard />);
    await save();
    expect(alert).toHaveBeenCalledWith(strings.common.error);
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    await save();
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  test('Save stays disabled after a successful write, so it cannot be written twice', async () => {
    await fillNewCard();
    await save();
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('save-card').props.accessibilityState).toMatchObject({ disabled: true });
    await save();
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('deleting', () => {
  async function confirmDelete() {
    mockParams = { id: 'card1' };
    mockCards = [makeCard()];
    await render(<EditCard />);
    await fireEvent.press(screen.getByRole('button', { name: strings.edit.deleteCard }));
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => Promise<void> }[];
    const destructive = buttons.find((b) => b.text === strings.common.delete)!;
    alert.mockClear();
    await act(async () => destructive.onPress!());
  }

  test('a failed removal shows the generic error and stays on the screen', async () => {
    mockRemove.mockRejectedValue(new Error('io error'));
    await confirmDelete();
    expect(alert).toHaveBeenCalledWith(strings.common.error);
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockDismissAll).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });

  test('a failed refresh after a successful removal still closes the screen', async () => {
    mockRefresh.mockRejectedValue(new Error('refresh boom'));
    await confirmDelete();
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(alert).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});

test('Close leaves the add-card modal without writing anything', async () => {
  await fillNewCard();
  await fireEvent.press(screen.getByRole('button', { name: strings.common.close }));
  expect(mockBack).toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});
