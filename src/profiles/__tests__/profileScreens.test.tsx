import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { frontImage, image, makeCard } from '../../../test/fixtures';
import ProfileForm from '../../../app/profile/[id]';
import PeopleScreen from '../../../app/people';
import { useShowcaseAdd } from '../../showcase/ShowcaseActions';
import { Card, Person } from '../../cards/types';
import { FREE_CARD_LIMIT } from '../../config';
import { strings } from '../../strings';
import { ProfileDetails } from '../profile';

jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true, default: (props: unknown) => jest.requireActual('react').createElement(jest.requireActual('react-native').View, props),
  DateTimePickerAndroid: { open: jest.fn() },
}));

let mockParams: Record<string, string> = { id: 'new' };
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack, dismissAll: jest.fn() }),
  usePreventRemove: () => () => {},
  useFocusEffect: () => {},
}));

let mockCards: Card[] = [];
let mockPeople: Person[] = [];
let mockUnlocked = false;
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockCreatePerson = jest.fn();
const mockRefresh = jest.fn(async () => {});
const mockLoadImage = jest.fn(async (_id: string, _side: string): Promise<string | null> => null);
const mockServices = {
  db: {},
  store: {
    create: (...a: unknown[]) => mockCreate(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    createPerson: (name: string) => mockCreatePerson(name),
    listPeople: async () => mockPeople,
    loadImage: (...a: [string, string]) => mockLoadImage(...a),
    loadPdf: async () => null,
  },
};
jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: mockServices, cards: mockCards, people: mockPeople, notes: [], folders: [],
    unlocked: mockUnlocked, refresh: mockRefresh, undo: { offer: jest.fn(), end: jest.fn(), subscribe: () => () => {} },
    cardBrightness: false,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
// The drawn card: what view capture hands back is the document's picture.
const mockDrawCard = jest.fn();
jest.mock('../drawCard', () => ({ drawCard: (...a: unknown[]) => mockDrawCard(...a) }));
const mockPickImage = jest.fn();
const mockTakePhoto = jest.fn();
const mockCropShared = jest.fn();
const mockDiscard = jest.fn();
jest.mock('../../images/capture', () => ({
  canTakePhoto: true,
  pickImage: (...a: unknown[]) => mockPickImage(...a),
  takePhoto: () => mockTakePhoto(),
  cropSharedImage: (...a: unknown[]) => mockCropShared(...a),
  discardFile: (...a: unknown[]) => mockDiscard(...a),
}));

const sara: Person = { id: 'sara', name: 'Sara', createdAt: 1 };
const profile = (overrides: Partial<ProfileDetails> = {}): ProfileDetails => ({ dateOfBirth: '1990-05-04', bloodGroup: 'AB-', template: 'medical', ...overrides });
const sarasProfile = () => makeCard({ id: 'p1', name: 'Sara', personId: 'sara', profile: profile(), spaceId: 'family' });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: 'new' };
  mockCards = [];
  mockPeople = [sara];
  mockUnlocked = false;
  mockDrawCard.mockResolvedValue(frontImage('drawn'));
  mockPickImage.mockResolvedValue({ image: frontImage('picked', 1), original: null });
  mockTakePhoto.mockResolvedValue('file://shot');
  mockCropShared.mockResolvedValue(frontImage('shot', 1));
  mockLoadImage.mockResolvedValue(null);
  mockCreate.mockImplementation(async (fields) => makeCard({ ...fields, id: 'made' }));
  mockUpdate.mockImplementation(async (id, fields) => makeCard({ ...fields, id }));
  mockCreatePerson.mockImplementation(async (name: string) => ({ id: 'new-person', name, createdAt: 2 }));
});

const save = () => fireEvent.press(screen.getByTestId('save-profile'));

describe('profile form', () => {
  test('a chosen square photo appears in the preview and is saved apart from the drawn card', async () => {
    mockParams = { id: 'new', person: 'sara' };
    await render(<ProfileForm />);
    await fireEvent.press(screen.getByTestId('profile-photo-library'));
    await waitFor(() => expect(mockPickImage).toHaveBeenCalledWith('square'));
    expect(screen.getByTestId('profile-photo-preview').props.source.uri).toContain(frontImage('picked', 1).jpegBase64);
    expect(screen.getByTestId('profile-card-photo').props.source.uri).toContain(frontImage('picked', 1).jpegBase64);
    expect(StyleSheet.flatten(screen.getByTestId('profile-card-photo').props.style)).toMatchObject({ width: 56, height: 56, borderRadius: 28 });
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][1]).toMatchObject({ profilePhoto: image('picked', 1) });
    expect(mockCreate.mock.calls[0][1].front).toEqual(frontImage('drawn'));
  });

  test('an existing photo can be removed', async () => {
    mockCards = [sarasProfile()];
    mockParams = { id: 'p1' };
    mockLoadImage.mockImplementation(async (_id, side) => side === 'profilePhoto' ? image('saved', 1).jpegBase64 : null);
    await render(<ProfileForm />);
    await waitFor(() => expect(screen.getByTestId('profile-photo-preview')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('profile-photo-remove'));
    expect(screen.queryByTestId('profile-card-photo')).toBeNull();
    await save();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][2]).toMatchObject({ profilePhoto: null });
  });

  test('a camera photo replaces the existing photo and its temporary file is removed', async () => {
    mockCards = [sarasProfile()];
    mockParams = { id: 'p1' };
    mockLoadImage.mockImplementation(async (_id, side) => side === 'profilePhoto' ? image('saved', 1).jpegBase64 : null);
    await render(<ProfileForm />);
    await waitFor(() => expect(screen.getByTestId('profile-photo-preview')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('profile-photo-camera'));
    await waitFor(() => expect(mockCropShared).toHaveBeenCalledWith('file://shot', 'square'));
    expect(mockDiscard).toHaveBeenCalledWith('file://shot');
    await save();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][2]).toMatchObject({ profilePhoto: image('shot', 1) });
  });
  test('a new profile saves its person, date of birth and blood group, drawn as its picture', async () => {
    await render(<ProfileForm />);
    await fireEvent.press(screen.getByTestId('profile-person-sara'));
    await fireEvent.press(screen.getByRole('button', { name: strings.profiles.addDateOfBirth }));
    await fireEvent(screen.getByTestId('date-of-birth'), 'onChange', {}, new Date(1990, 4, 4));
    await fireEvent.press(screen.getByTestId('blood-AB-'));
    // The card preview shows what will be drawn.
    expect(screen.getByTestId('profile-card').props.accessibilityLabel).toContain('Blood group AB−');
    await save();

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    const [fields, images] = mockCreate.mock.calls[0];
    expect(fields).toMatchObject({ name: 'Sara', personId: 'sara', expiresOn: null, profile: profile() });
    expect(images).toEqual({ front: frontImage('drawn'), back: null });
    expect(mockDrawCard).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/card/made');
  });

  test('all eight blood groups and Unknown are offered, Unknown first chosen', async () => {
    await render(<ProfileForm />);
    const chips = screen.getAllByTestId(/^blood-/);
    expect(chips.map((chip) => chip.props.accessibilityLabel)).toEqual(['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown']);
    expect(chips.filter((chip) => chip.props.accessibilityState.checked).map((chip) => chip.props.accessibilityLabel)).toEqual(['Unknown']);
  });

  test('a name that is not yet a Person creates that Person', async () => {
    await render(<ProfileForm />);
    await fireEvent.press(screen.getByTestId('profile-person-new'));
    await fireEvent.changeText(screen.getByTestId('profile-new-name'), '  Omar ');
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreatePerson).toHaveBeenCalledWith('Omar');
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ name: 'Omar', personId: 'new-person', profile: profile({ dateOfBirth: null, bloodGroup: 'unknown' }) });
  });

  test('saving with no person asks for one', async () => {
    await render(<ProfileForm />);
    await save();
    expect(screen.getByText(strings.profiles.personRequired)).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('choosing a Person who already has a profile opens it instead', async () => {
    mockCards = [sarasProfile()];
    await render(<ProfileForm />);
    await fireEvent.press(screen.getByTestId('profile-person-sara'));
    expect(mockReplace).toHaveBeenCalledWith('/card/p1');
  });

  test('starting a profile for a Person who has one, from People, opens it', async () => {
    mockCards = [sarasProfile()];
    mockParams = { id: 'new', person: 'sara' };
    await render(<ProfileForm />);
    expect(mockReplace).toHaveBeenCalledWith('/card/p1');
  });

  test('typing the name of a Person who has a profile opens theirs, without a second profile', async () => {
    mockCards = [sarasProfile()];
    await render(<ProfileForm />);
    await fireEvent.press(screen.getByTestId('profile-person-new'));
    await fireEvent.changeText(screen.getByTestId('profile-new-name'), 'sara');
    await save();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/card/p1'));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCreatePerson).not.toHaveBeenCalled();
  });

  test('a profile started inside a Space starts in that Space', async () => {
    mockParams = { id: 'new', space: 'family', person: 'sara' };
    await render(<ProfileForm />);
    expect(screen.getByTestId('assign-space-family').props.accessibilityState).toEqual({ checked: true });
    await save();
    await waitFor(() => expect(mockCreate.mock.calls[0][0]).toMatchObject({ spaceId: 'family', personId: 'sara' }));
  });

  test('at the free limit, saving a new profile opens the paywall', async () => {
    mockCards = Array.from({ length: FREE_CARD_LIMIT }, (_, i) => makeCard({ id: `c${i}` }));
    mockParams = { id: 'new', person: 'sara' };
    await render(<ProfileForm />);
    await save();
    expect(mockPush).toHaveBeenCalledWith('/paywall');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('editing reopens the saved details unchanged and redraws the picture on save', async () => {
    mockCards = [sarasProfile()];
    mockParams = { id: 'p1' };
    await render(<ProfileForm />);
    expect(screen.getByTestId('profile-person').props.children).toBe('Sara');
    expect(screen.getByTestId('blood-AB-').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByTestId('date-of-birth').props.value).toEqual(new Date(1990, 4, 4));
    await fireEvent.press(screen.getByTestId('blood-O+'));
    await save();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const [id, fields, changes] = mockUpdate.mock.calls[0];
    expect(id).toBe('p1');
    expect(fields).toMatchObject({ name: 'Sara', personId: 'sara', spaceId: 'family', profile: profile({ bloodGroup: 'O+' }) });
    expect(changes).toEqual({ front: frontImage('drawn') });
    expect(mockBack).toHaveBeenCalled();
  });

  test('medical lists can be added, edited and removed; contact fields reopen and appear on the card', async () => {
    mockCards = [makeCard({ ...sarasProfile(), profile: profile({ conditions: ['Old'], mobile: '123' }) })];
    mockParams = { id: 'p1' };
    await render(<ProfileForm />);
    expect(screen.getByTestId('profile-conditions-0').props.value).toBe('Old');
    expect(screen.getByTestId('profile-mobile').props.value).toBe('123');
    await fireEvent.changeText(screen.getByTestId('profile-conditions-0'), 'Asthma');
    await fireEvent.changeText(screen.getByTestId('profile-allergies-new'), 'Pollen');
    await fireEvent.press(screen.getByTestId('profile-allergies-add'));
    await fireEvent.press(screen.getByTestId('profile-allergies-remove-0'));
    await fireEvent.changeText(screen.getByTestId('profile-medications-new'), 'Ventolin');
    await fireEvent.press(screen.getByTestId('profile-medications-add'));
    await fireEvent.changeText(screen.getByTestId('profile-medicalNotes'), 'Carry inhaler');
    await fireEvent.changeText(screen.getByTestId('profile-mobile'), '+971500000000');
    await fireEvent.changeText(screen.getByTestId('profile-email'), 'sara@example.com');
    await fireEvent.changeText(screen.getByTestId('profile-address'), 'Dubai');
    expect(screen.getByTestId('profile-card').props.accessibilityLabel).toContain('Asthma');
    expect(screen.getByTestId('profile-card').props.accessibilityLabel).toContain('sara@example.com');
    expect(screen.getByTestId('profile-conditions-0').props.accessibilityLabel).toBe('Conditions entry 1');
    expect(screen.getByTestId('profile-medications-new').props.accessibilityLabel).toBe('New medications entry');
    await save();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1].profile).toMatchObject({ conditions: ['Asthma'], allergies: [], medications: ['Ventolin'],
      medicalNotes: 'Carry inhaler', mobile: '+971500000000', email: 'sara@example.com', address: 'Dubai' });
  });

  test('profile inputs expose the same text limits as the sealed profile reader', async () => {
    mockParams = { id: 'new', person: 'sara' };
    await render(<ProfileForm />);
    expect(screen.getByTestId('profile-conditions-new').props.maxLength).toBe(200);
    expect(screen.getByTestId('profile-medicalNotes').props.maxLength).toBe(5000);
    expect(screen.getByTestId('profile-address').props.maxLength).toBe(5000);
    expect(screen.queryByTestId('profile-new-name')).toBeNull();
    await fireEvent.press(screen.getByTestId('profile-person-new'));
    expect(screen.getByTestId('profile-new-name').props.maxLength).toBe(60);
  });

  // BUG: ListField permits a 101st entry, but toProfile drops lists longer than 100 on reopen.
  it.failing('stops adding medical list entries at the 100-entry storage limit', async () => {
    mockCards = [makeCard({ ...sarasProfile(), profile: profile({ conditions: Array.from({ length: 100 }, (_, i) => `Condition ${i}`) }) })];
    mockParams = { id: 'p1' };
    await render(<ProfileForm />);
    await fireEvent.changeText(screen.getByTestId('profile-conditions-new'), 'One more');
    await fireEvent.press(screen.getByTestId('profile-conditions-add'));
    expect(screen.queryByTestId('profile-conditions-100')).toBeNull();
  });

  test('a failed drawing keeps the form open and reports the failed save', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockDrawCard.mockRejectedValueOnce(new Error('capture failed'));
    mockParams = { id: 'new', person: 'sara' };
    await render(<ProfileForm />);
    await save();
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    await save();
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  });
});

describe('entry points', () => {
  function AddSheet({ spaceId }: { spaceId?: 'family' }) {
    const add = useShowcaseAdd(spaceId);
    return <>{add.sheet}<Probe open={add.open} /></>;
  }
  function Probe({ open }: { open(): void }) {
    const { useEffect } = jest.requireActual('react');
    useEffect(() => open(), [open]);
    return null;
  }

  test('Add profile appears in the Add sheet and keeps the Space it was opened from', async () => {
    await render(<AddSheet spaceId="family" />);
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('showcase-add-profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile/new?space=family');
  });

  test('Add profile at the free limit opens the paywall', async () => {
    mockCards = Array.from({ length: FREE_CARD_LIMIT }, (_, i) => makeCard({ id: `c${i}` }));
    await render(<AddSheet />);
    await act(async () => {});
    await fireEvent.press(screen.getByTestId('showcase-add-profile'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  test('People offers Create profile, or Open profile for a Person who has one', async () => {
    const omar = { id: 'omar', name: 'Omar', createdAt: 2 };
    mockPeople = [sara, omar];
    mockCards = [sarasProfile()];
    await render(<PeopleScreen />);
    await fireEvent.press(screen.getByTestId('open-profile-sara'));
    expect(mockPush).toHaveBeenLastCalledWith('/card/p1');
    expect(screen.queryByTestId('create-profile-sara')).toBeNull();
    await fireEvent.press(screen.getByTestId('create-profile-omar'));
    expect(mockPush).toHaveBeenLastCalledWith('/profile/new?person=omar');
  });
});
