import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import CategoriesScreen from '../../../app/categories';
import { strings } from '../../strings';
import { CategoryInUseError } from '../cardStore';

const mockRemoveCategory = jest.fn();
const mockRefresh = jest.fn();
let mockCategories: string[] = [];
const mockCards = [
  makeCard({ id: 'c1', name: 'Mulkiya', category: 'Vehicle' }),
  makeCard({ id: 'c2', name: 'Rental contract', category: 'Vehicle' }),
  makeCard({ id: 'c3', name: 'Gym', category: 'membership' }),
];

jest.mock('../../app/AppProvider', () => ({
  useApp: () => ({
    services: { store: { removeCategory: (c: string) => mockRemoveCategory(c) } },
    cards: mockCards,
    categories: mockCategories,
    refresh: () => mockRefresh(),
  }),
}));

let alert: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  mockCategories = ['id', 'membership', 'Vehicle', 'Boat'];
  mockRemoveCategory.mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue(undefined);
  alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

const pressInAlert = async (label: string) => {
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => unknown }[];
  await buttons.find((b) => b.text === label)?.onPress?.();
};

test('lists every category with how many cards use it', async () => {
  await render(<CategoriesScreen />);
  expect(screen.getByText(strings.categories.id)).toBeTruthy();
  expect(screen.getByText('Vehicle')).toBeTruthy();
  expect(screen.getAllByText(strings.folders.count(2))).toHaveLength(1);
});

test('a category in use cannot be deleted: the error names its cards', async () => {
  await render(<CategoriesScreen />);
  await fireEvent.press(screen.getByTestId('delete-category-Vehicle'));
  expect(alert).toHaveBeenCalledWith(
    strings.categoriesScreen.inUseTitle('Vehicle'),
    strings.categoriesScreen.inUseBody(['Mulkiya', 'Rental contract']),
  );
  expect(alert.mock.calls[0][1]).toContain('• Mulkiya\n• Rental contract');
  expect(mockRemoveCategory).not.toHaveBeenCalled();
});

test('an unused category is deleted after confirming', async () => {
  await render(<CategoriesScreen />);
  await fireEvent.press(screen.getByTestId('delete-category-Boat'));
  expect(alert).toHaveBeenCalledWith(strings.categoriesScreen.deleteConfirmTitle('Boat'), undefined, expect.any(Array));
  await pressInAlert(strings.common.delete);
  expect(mockRemoveCategory).toHaveBeenCalledWith('Boat');
  expect(mockRefresh).toHaveBeenCalled();
});

test('if a card moved into it meanwhile, the store refuses and the error names that card', async () => {
  const late = makeCard({ id: 'c9', name: 'Boat licence', category: 'Boat' });
  mockRemoveCategory.mockRejectedValue(new CategoryInUseError([late]));
  await render(<CategoriesScreen />);
  await fireEvent.press(screen.getByTestId('delete-category-Boat'));
  await pressInAlert(strings.common.delete);
  expect(alert).toHaveBeenLastCalledWith(
    strings.categoriesScreen.inUseTitle('Boat'),
    strings.categoriesScreen.inUseBody(['Boat licence']),
  );
});

test('the last category stays', async () => {
  mockCategories = ['Boat'];
  await render(<CategoriesScreen />);
  await fireEvent.press(screen.getByTestId('delete-category-Boat'));
  expect(alert).toHaveBeenCalledWith(strings.categoriesScreen.keepOne);
  expect(mockRemoveCategory).not.toHaveBeenCalled();
});
