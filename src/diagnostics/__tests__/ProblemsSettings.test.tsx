import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { strings } from '../../strings';
import { dismissCrash, PendingCrash, setPendingCrash } from '../crashes';
import { createMemoryDiagnosticsFiles } from '../files';
import { ProblemsSettings } from '../ProblemsSettings';

let mockCanEmail = true;
const mockEmail = jest.fn(async (_record: unknown) => true);
const mockShare = jest.fn(async (_record: unknown) => {});
jest.mock('../send', () =>
  Object.defineProperty(
    { emailReport: (record: unknown) => mockEmail(record), shareReport: (record: unknown) => mockShare(record) },
    'canEmail',
    { get: () => mockCanEmail },
  ),
);

const crash: PendingCrash = {
  record: { at: Date.now() - 5 * 60_000, kind: 'native', message: 'java.lang.RuntimeException: boom', detail: '' },
  prompted: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanEmail = true;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  dismissCrash();
});

test('with nothing recorded: the promise, and a way to share the log', async () => {
  await render(<ProblemsSettings />);
  expect(screen.getByText(strings.report.about)).toBeTruthy();
  expect(screen.getByTestId('no-crash')).toBeTruthy();
  expect(screen.getByText(strings.report.shareLog)).toBeTruthy();
  expect(screen.queryByTestId('dismiss-crash')).toBeNull();
});

test('a recorded crash is shown and can be dismissed without sending', async () => {
  setPendingCrash(createMemoryDiagnosticsFiles(), crash);
  await render(<ProblemsSettings />);
  expect(screen.getByText(strings.report.crashed(strings.ago.today))).toBeTruthy();
  expect(screen.getByText(`${strings.report.kinds.native}: java.lang.RuntimeException: boom`)).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByTestId('dismiss-crash')));
  expect(screen.getByTestId('no-crash')).toBeTruthy();
  expect(mockEmail).not.toHaveBeenCalled();
  expect(mockShare).not.toHaveBeenCalled();
});

test('emailing sends the crash and clears it; without a mail app it says so and keeps it', async () => {
  setPendingCrash(createMemoryDiagnosticsFiles(), crash);
  await render(<ProblemsSettings />);
  mockEmail.mockResolvedValueOnce(false);
  await act(async () => fireEvent.press(screen.getByTestId('email-report')));
  expect(Alert.alert).toHaveBeenCalledWith(strings.report.noEmailApp);
  expect(screen.getByTestId('pending-crash')).toBeTruthy();

  await act(async () => fireEvent.press(screen.getByTestId('email-report')));
  expect(mockEmail).toHaveBeenLastCalledWith(crash.record);
  expect(screen.getByTestId('no-crash')).toBeTruthy();
});

test('without an address in the build there is no email button; sharing clears the crash', async () => {
  mockCanEmail = false;
  setPendingCrash(createMemoryDiagnosticsFiles(), crash);
  await render(<ProblemsSettings />);
  expect(screen.queryByTestId('email-report')).toBeNull();
  await act(async () => fireEvent.press(screen.getByTestId('share-report')));
  expect(mockShare).toHaveBeenCalledWith(crash.record);
  expect(screen.getByTestId('no-crash')).toBeTruthy();
});
