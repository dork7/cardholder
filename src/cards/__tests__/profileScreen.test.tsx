import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ProfileEditor from '../../../app/profile/[id]';
import { makeCard } from '../../../test/fixtures';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockCreatePerson = jest.fn();
const mockRefresh = jest.fn();
const mockCapture = jest.fn();
let mockCards: ReturnType<typeof makeCard>[] = [];
let mockPeople: { id: string; name: string; createdAt: number }[] = [];
let mockParams: { id: string; personId?: string; space?: string } = { id: 'new' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  usePreventRemove: () => jest.fn(),
}));
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({
  cards: mockCards, people: mockPeople, unlocked: true, refresh: mockRefresh,
  services: { store: { create: mockCreate, createPerson: mockCreatePerson, renamePerson: jest.fn() } },
}) }));
jest.mock('react-native-view-shot', () => ({ captureRef: (...args: unknown[]) => mockCapture(...args) }), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockCards = [];
  mockPeople = [];
  mockParams = { id: 'new' };
  mockCreatePerson.mockResolvedValue({ id: 'sara', name: 'Sara', createdAt: 1 });
  mockCapture.mockResolvedValue('jpeg');
  mockCreate.mockResolvedValue(makeCard({ id: 'profile1' }));
  mockRefresh.mockResolvedValue(undefined);
});

test('saves a new Person and Medical profile as a captured front image', async () => {
  await render(<ProfileEditor />);
  await fireEvent.changeText(screen.getByTestId('profile-name'), 'Sara');
  await fireEvent.press(screen.getByTestId('blood-A+'));
  await fireEvent.press(screen.getByTestId('save-profile'));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreatePerson).toHaveBeenCalledWith('Sara');
  expect(mockCreate.mock.calls[0][0]).toMatchObject({ personId: 'sara', profile: { template: 'medical', bloodGroup: 'A+' } });
  expect(mockCreate.mock.calls[0][1].front).toMatchObject({ jpegBase64: 'jpeg', thumbJpegBase64: 'jpeg' });
  expect(mockReplace).toHaveBeenCalledWith('/card/profile1');
});

test('an existing Person with a profile opens it instead of creating another', async () => {
  mockPeople = [{ id: 'sara', name: 'Sara', createdAt: 1 }];
  mockCards = [makeCard({ id: 'profile1', personId: 'sara', profile: { template: 'medical', dateOfBirth: null, bloodGroup: 'A+' } })];
  mockParams = { id: 'new', personId: 'sara' };
  await render(<ProfileEditor />);
  await fireEvent.press(screen.getByTestId('save-profile'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/card/profile1'));
  expect(mockCreate).not.toHaveBeenCalled();
});

test('medical entries and contact fields can be added, edited and removed before saving', async () => {
  await render(<ProfileEditor />);
  await fireEvent.changeText(screen.getByTestId('profile-name'), 'Sara');
  await fireEvent.changeText(screen.getByTestId('profile-conditions-new'), 'Asthma');
  await fireEvent.press(screen.getByTestId('profile-conditions-add'));
  await fireEvent.changeText(screen.getByTestId('profile-conditions-0'), 'Mild asthma');
  await fireEvent.changeText(screen.getByTestId('profile-allergies-new'), 'Pollen');
  await fireEvent.press(screen.getByTestId('profile-allergies-add'));
  await fireEvent.press(screen.getByTestId('profile-allergies-remove-0'));
  await fireEvent.changeText(screen.getByTestId('profile-medicalNotes'), 'Carry inhaler');
  await fireEvent.changeText(screen.getByTestId('profile-mobile'), '+971500000000');
  await fireEvent.changeText(screen.getByTestId('profile-email'), 'sara@example.com');
  await fireEvent.changeText(screen.getByTestId('profile-address'), 'Dubai');
  await fireEvent.press(screen.getByTestId('save-profile'));
  await waitFor(() => expect(mockCreate).toHaveBeenCalled());
  expect(mockCreate.mock.calls[0][0].profile).toMatchObject({
    conditions: ['Mild asthma'], allergies: [], medicalNotes: 'Carry inhaler', mobile: '+971500000000', email: 'sara@example.com', address: 'Dubai',
  });
});
