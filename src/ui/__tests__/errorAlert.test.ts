import { Alert } from 'react-native';
import { PdfUnavailableError } from '../../share/pdfUnavailable';
import { strings } from '../../strings';
import { errorMessage, showError } from '../errorAlert';

test('names the action that failed and what to try', () => {
  expect(errorMessage('save', new Error('io'))).toEqual({
    title: "Couldn't save the document",
    body: 'Your changes are still here. Try saving again.',
  });
  expect(errorMessage('delete', new Error('io')).title).toBe("Couldn't delete the document");
  expect(errorMessage('share', new Error('io')).title).toBe("Couldn't share the document");
});

test('a full phone says so, whatever was being done', () => {
  for (const e of [
    new Error('database or disk is full'),
    new Error('SQLITE_FULL: database or disk is full'),
    new Error('ENOSPC: no space left on device, write'),
    new Error('No space left on device'),
  ]) {
    expect(errorMessage('save', e)).toEqual({
      title: "Couldn't save the document",
      body: 'Your phone is out of storage. Free up some space, then try again.',
    });
  }
});

test('an ordinary failure is not mistaken for a full phone', () => {
  expect(errorMessage('save', new Error('io error')).body).not.toMatch(/storage/);
  expect(errorMessage('save', 'weird').body).not.toMatch(/storage/);
});

test('a build that cannot make PDFs asks for an update', () => {
  expect(errorMessage('exportPdf', new PdfUnavailableError('no pdf'))).toEqual({
    title: "Couldn't export the PDF",
    body: 'Exporting as PDF needs a newer version of Doc Keeper. Update the app, then try again.',
  });
  expect(errorMessage('shareMany', new PdfUnavailableError('no pdf')).body).toBe(
    'Sharing several documents needs a newer version of Doc Keeper. Update the app, then try again.',
  );
});

test('no message is the old generic one, and each says what to try', () => {
  for (const action of Object.keys(strings.errors.actions) as (keyof typeof strings.errors.actions)[]) {
    const { title, body } = errorMessage(action, new Error('x'));
    expect(title).toMatch(/^Couldn't /);
    expect(body).toMatch(/try|update|check/i);
  }
});

test('showError puts the title and the next step in an alert', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  showError('pin', new Error('x'));
  expect(alert).toHaveBeenCalledWith(strings.errors.actions.pin.title, strings.errors.actions.pin.body);
});
