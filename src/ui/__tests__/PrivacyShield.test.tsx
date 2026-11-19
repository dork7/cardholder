import { act, render, screen } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { PrivacyShield } from '../PrivacyShield';

let emit: (state: AppStateStatus) => void = () => {};
let spy: jest.SpyInstance;

beforeEach(() => {
  spy = jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    emit = listener as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => spy.mockRestore());

test('covers the app whenever it is not active', async () => {
  await render(<PrivacyShield />);
  expect(screen.queryByTestId('privacy-shield')).toBeNull();
  await act(async () => emit('inactive'));
  expect(screen.getByTestId('privacy-shield')).toBeTruthy();
  await act(async () => emit('active'));
  expect(screen.queryByTestId('privacy-shield')).toBeNull();
  await act(async () => emit('background'));
  expect(screen.getByTestId('privacy-shield')).toBeTruthy();
});
