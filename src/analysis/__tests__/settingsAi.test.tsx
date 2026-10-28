import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
import SettingsScreen from '../../../app/settings';
import { strings } from '../../strings';
import { ModelState } from '../modelDownload';

let mockCanReadText = true;
jest.mock('../recognizer', () =>
  Object.defineProperty({}, 'canReadText', {
    get: () => mockCanReadText,
  }),
);
let mockModel: ModelState = { status: 'absent' };
const mockStart = jest.fn(async () => {});
const mockCancel = jest.fn();
const mockRemove = jest.fn(async () => {});
jest.mock('../modelDownload', () => ({
  useModelState: () => mockModel,
  startModelDownload: () => mockStart(),
  cancelModelDownload: () => mockCancel(),
  removeModel: () => mockRemove(),
}));
jest.mock('../../security/deviceAuth', () => ({ authenticate: jest.fn(), deviceLockAvailable: jest.fn() }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: jest.fn() }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
const mockServices = { settings: { getNumber: () => Promise.resolve(null) } };
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices,
    appLock: false,
    setAppLock: jest.fn(),
    homeFolders: { filter: true, manage: true },
    setHomeFolders: jest.fn(),
  }),
}));

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockCanReadText = true;
  mockModel = { status: 'absent' };
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

// Presses the button labelled `text` in the alert that was just shown.
const answer = (text: string) => {
  const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((b) => b.text === text)?.onPress?.();
};

test('not offered on a phone that cannot read the text on cards', async () => {
  mockCanReadText = false;
  await render(<SettingsScreen />);
  expect(screen.queryByText(strings.ai.title)).toBeNull();
  expect(screen.queryByTestId('download-ai-model')).toBeNull();
});

test('says what it does, the size, and that cards stay on the phone', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText(strings.ai.about)).toBeTruthy();
  expect(screen.getByText(strings.ai.sizeHint)).toBeTruthy();
  expect(screen.getByText(strings.ai.license)).toBeTruthy();
});

test('nothing is downloaded until the user agrees', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('download-ai-model'));
  expect(alert).toHaveBeenCalledWith(strings.ai.confirmTitle, strings.ai.confirmMessage, expect.any(Array));
  expect(mockStart).not.toHaveBeenCalled();

  answer(strings.common.cancel);
  expect(mockStart).not.toHaveBeenCalled();

  answer(strings.ai.confirm);
  expect(mockStart).toHaveBeenCalledTimes(1);
});

test('shows progress, and the download can be stopped', async () => {
  mockModel = { status: 'downloading', progress: 0.42 };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('ai-model-progress')).toHaveTextContent(strings.ai.downloading(42));
  await fireEvent.press(screen.getByTestId('stop-ai-model'));
  expect(mockCancel).toHaveBeenCalled();
});

test('says why a download failed', async () => {
  mockModel = { status: 'absent', failure: 'space' };
  await render(<SettingsScreen />);
  expect(screen.getByTestId('ai-model-failed')).toHaveTextContent(strings.ai.failed.space);
  expect(screen.getByTestId('download-ai-model')).toBeTruthy();
});

test('the model can be deleted, after a confirmation', async () => {
  mockModel = { status: 'present' };
  await render(<SettingsScreen />);
  expect(screen.getByText(strings.ai.ready)).toBeTruthy();
  await fireEvent.press(screen.getByTestId('delete-ai-model'));
  expect(alert).toHaveBeenCalledWith(strings.ai.removeTitle, strings.ai.removeMessage, expect.any(Array));
  expect(mockRemove).not.toHaveBeenCalled();
  answer(strings.common.delete);
  expect(mockRemove).toHaveBeenCalled();
});
