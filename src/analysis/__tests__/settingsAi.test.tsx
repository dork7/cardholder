import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert, AlertButton } from 'react-native';
import SettingsScreen from '../../../app/settings';
import { strings } from '../../strings';
import { entry } from '../../ai/catalog';

const entryLicense = (id: string) => entry(id)!.license;
import { MenuState, ModelState } from '../modelDownload';

let mockCanReadText = true;
jest.mock('../recognizer', () =>
  Object.defineProperty({}, 'canReadText', {
    get: () => mockCanReadText,
  }),
);
let mockMenu: MenuState;
const mockStart = jest.fn(async (_id: string) => {});
const mockCancel = jest.fn((_id: string) => {});
const mockRemove = jest.fn(async (_id: string) => {});
const mockSetActive = jest.fn(async (_id: string) => {});
const mockSetAskWith = jest.fn(async (_w: string) => {});
jest.mock('../modelDownload', () => ({
  useMenuState: () => mockMenu,
  startModelDownload: (id: string) => mockStart(id),
  cancelModelDownload: (id: string) => mockCancel(id),
  removeModel: (id: string) => mockRemove(id),
  setActive: (id: string) => mockSetActive(id),
  setAskWith: (w: string) => mockSetAskWith(w),
}));
let mockRam: number | null = 8e9;
jest.mock('expo-device', () => ({
  get totalMemory() {
    return mockRam;
  },
}));
let mockBuiltIn = 'unsupported';
jest.mock('../../ai/models', () => ({ builtInStatus: async () => mockBuiltIn }));
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

const absent: ModelState = { status: 'absent' };
const menu = (patch: Partial<Omit<MenuState, 'models'>> & { models?: Partial<MenuState['models']> } = {}): MenuState => ({
  downloading: null,
  onGpu: null,
  active: null,
  askWith: 'built-in',
  ...patch,
  models: { 'gemma-270m': absent, 'qwen2.5-0.5b': absent, 'qwen3-0.6b': absent, 'llama3.2-1b': absent, ...patch.models },
});

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockCanReadText = true;
  mockMenu = menu();
  mockRam = 8e9;
  mockBuiltIn = 'unsupported';
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
  expect(screen.queryByTestId('download-qwen2.5-0.5b')).toBeNull();
});

test('lists the four models with their sizes, Qwen2.5 recommended', async () => {
  await render(<SettingsScreen />);
  expect(screen.getByText(strings.ai.about)).toBeTruthy();
  for (const name of ['Gemma 3 270M', 'Qwen2.5 0.5B', 'Qwen3 0.6B', 'Llama 3.2 1B']) expect(screen.getByText(name)).toBeTruthy();
  expect(screen.getAllByText(strings.ai.recommended)).toHaveLength(1);
  expect(screen.getByTestId('model-qwen2.5-0.5b')).toHaveTextContent(strings.ai.recommended, { exact: false });
  expect(screen.getByTestId('model-llama3.2-1b')).toHaveTextContent(strings.ai.size(1022), { exact: false });
});

test('nothing is downloaded until the user agrees, and the alert says the size and source', async () => {
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('download-llama3.2-1b'));
  expect(alert).toHaveBeenCalledWith(strings.ai.confirmTitle('Llama 3.2 1B'), strings.ai.confirmMessage(1022), expect.any(Array));
  expect(String(alert.mock.calls[0][1])).toContain('Hugging Face');
  answer(strings.common.cancel);
  expect(mockStart).not.toHaveBeenCalled();
  answer(strings.ai.confirm);
  expect(mockStart).toHaveBeenCalledWith('llama3.2-1b');
});

test('one download at a time: progress and Stop on that model, the others disabled', async () => {
  mockMenu = menu({ downloading: 'qwen3-0.6b', models: { 'qwen3-0.6b': { status: 'downloading', progress: 0.42 } } });
  await render(<SettingsScreen />);
  expect(screen.getByTestId('progress-qwen3-0.6b')).toHaveTextContent(strings.ai.downloading(42));
  await fireEvent.press(screen.getByTestId('stop-qwen3-0.6b'));
  expect(mockCancel).toHaveBeenCalledWith('qwen3-0.6b');
  await fireEvent.press(screen.getByTestId('download-gemma-270m'));
  expect(alert).not.toHaveBeenCalled();
  expect(screen.getByTestId('download-gemma-270m')).toBeDisabled();
});

test('warns on a phone with little memory, without hiding the model', async () => {
  mockRam = 3e9;
  await render(<SettingsScreen />);
  expect(screen.getByTestId('model-llama3.2-1b')).toHaveTextContent(strings.ai.lowMemory, { exact: false });
  expect(screen.getByTestId('model-gemma-270m')).not.toHaveTextContent(strings.ai.lowMemory, { exact: false });
  expect(screen.getByTestId('download-llama3.2-1b')).toBeTruthy();
});

test('says why a download failed, on that model only', async () => {
  mockMenu = menu({ models: { 'qwen3-0.6b': { status: 'absent', failure: 'space' } } });
  await render(<SettingsScreen />);
  expect(screen.getByTestId('failed-qwen3-0.6b')).toHaveTextContent(strings.ai.failed.space);
  expect(screen.queryByTestId('failed-gemma-270m')).toBeNull();
});

test('a downloaded model can be put in use; the one in use says so, and where it runs', async () => {
  mockMenu = menu({ onGpu: true, active: 'gemma-270m', models: { 'gemma-270m': { status: 'present' }, 'qwen2.5-0.5b': { status: 'present' } } });
  await render(<SettingsScreen />);
  expect(screen.getByTestId('model-gemma-270m')).toHaveTextContent(strings.ai.inUse, { exact: false });
  expect(screen.getByText(strings.ai.runningOn(true))).toBeTruthy();
  await fireEvent.press(screen.getByTestId('use-qwen2.5-0.5b'));
  expect(mockSetActive).toHaveBeenCalledWith('qwen2.5-0.5b');
  expect(screen.getByText(entryLicense('gemma-270m'))).toBeTruthy();
});

test('says nothing about GPU or CPU before the model has run', async () => {
  mockMenu = menu({ active: 'gemma-270m', models: { 'gemma-270m': { status: 'present' } } });
  await render(<SettingsScreen />);
  expect(screen.queryByText(strings.ai.runningOn(true))).toBeNull();
  expect(screen.queryByText(strings.ai.runningOn(false))).toBeNull();
});

test('a model can be deleted, after a confirmation', async () => {
  mockMenu = menu({ active: 'qwen3-0.6b', models: { 'qwen3-0.6b': { status: 'present' } } });
  await render(<SettingsScreen />);
  await fireEvent.press(screen.getByTestId('delete-qwen3-0.6b'));
  expect(alert).toHaveBeenCalledWith(strings.ai.removeTitle('Qwen3 0.6B'), strings.ai.removeMessage, expect.any(Array));
  expect(mockRemove).not.toHaveBeenCalled();
  answer(strings.common.delete);
  expect(mockRemove).toHaveBeenCalledWith('qwen3-0.6b');
});

test('"Answer questions with" appears only when the phone has its own AI and a model is in use', async () => {
  mockMenu = menu({ active: 'gemma-270m', models: { 'gemma-270m': { status: 'present' } } });
  await render(<SettingsScreen />);
  expect(screen.queryByTestId('ask-with-downloaded')).toBeNull();

  mockBuiltIn = 'available';
  await render(<SettingsScreen />);
  await fireEvent.press(await screen.findByTestId('ask-with-downloaded'));
  expect(mockSetAskWith).toHaveBeenCalledWith('downloaded');
  await fireEvent.press(screen.getByTestId('ask-with-built-in'));
  expect(mockSetAskWith).toHaveBeenCalledWith('built-in');
});
