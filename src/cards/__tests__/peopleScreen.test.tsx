import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PeopleScreen from '../../../app/people';
import { Person } from '../types';
import { strings } from '../../strings';

let mockPeople: Person[] = [];
const mockCreate = jest.fn();
const mockRename = jest.fn();
const mockRemove = jest.fn();
const mockRefresh = jest.fn();
jest.mock('../../app/AppProvider', () => ({ useApp: () => ({
  cards: [], people: mockPeople, refresh: mockRefresh,
  services: { store: { createPerson: mockCreate, renamePerson: mockRename, removePerson: mockRemove } },
}) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockPeople = [];
  mockCreate.mockResolvedValue({ id: 'sara', name: 'Sara', createdAt: 1 });
  mockRename.mockResolvedValue({ id: 'sara', name: 'Sarah', createdAt: 1 });
  mockRemove.mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue(undefined);
});

test('profiles can be created, renamed and removed without deleting documents', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const view = await render(<PeopleScreen />);
  await fireEvent.press(screen.getByTestId('add-person'));
  await fireEvent.changeText(screen.getByTestId('person-name'), ' Sara ');
  await fireEvent.press(screen.getByTestId('save-person'));
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('Sara'));
  mockPeople = [{ id: 'sara', name: 'Sara', createdAt: 1 }];
  await view.rerender(<PeopleScreen />);
  await fireEvent.press(screen.getByTestId('rename-person-sara'));
  await fireEvent.changeText(screen.getByTestId('person-name'), 'Sarah');
  await fireEvent.press(screen.getByTestId('save-person'));
  await waitFor(() => expect(mockRename).toHaveBeenCalledWith('sara', 'Sarah'));
  await fireEvent.press(screen.getByTestId('delete-person-sara'));
  const actions = alert.mock.calls.at(-1)?.[2] as { onPress?: () => void }[];
  actions[1].onPress?.();
  await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('sara'));
  alert.mockRestore();
});

test('a failed profile removal reports a profile error', async () => {
  mockPeople = [{ id: 'sara', name: 'Sara', createdAt: 1 }];
  mockRemove.mockRejectedValueOnce(new Error('disk full'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await render(<PeopleScreen />);
  await fireEvent.press(screen.getByTestId('delete-person-sara'));
  const actions = alert.mock.calls.at(-1)?.[2] as { onPress?: () => void }[];
  actions[1].onPress?.();
  await waitFor(() => expect(alert).toHaveBeenLastCalledWith(strings.people.changeFailed));
  alert.mockRestore();
});
