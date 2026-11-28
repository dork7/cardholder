import { createUndo, UNDO_MS } from '../undo';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const removal = (message: string) => ({ message, undo: jest.fn(() => Promise.resolve()) });

test('a removal is offered for 8 seconds, then the offer ends', () => {
  const undo = createUndo();
  undo.offer(removal('Deleted Passport'));
  expect(undo.current()?.message).toBe('Deleted Passport');
  jest.advanceTimersByTime(7999);
  expect(undo.current()?.message).toBe('Deleted Passport');
  jest.advanceTimersByTime(1);
  expect(undo.current()).toBeNull();
  expect(UNDO_MS).toBe(8000);
});

test("Undo runs the removal's undo once and ends the offer", async () => {
  const undo = createUndo();
  const passport = removal('Deleted Passport');
  undo.offer(passport);
  await undo.undo();
  await undo.undo();
  expect(passport.undo).toHaveBeenCalledTimes(1);
  expect(undo.current()).toBeNull();
});

test('a second removal replaces the first: only the second can be undone, for a fresh 8 seconds', async () => {
  const undo = createUndo();
  const first = removal('Deleted Passport');
  const second = removal('Deleted Gym');
  undo.offer(first);
  jest.advanceTimersByTime(7000);
  undo.offer(second);
  jest.advanceTimersByTime(7000);
  expect(undo.current()?.message).toBe('Deleted Gym');
  await undo.undo();
  expect(first.undo).not.toHaveBeenCalled();
  expect(second.undo).toHaveBeenCalledTimes(1);
});

test('ending the offer (the app going to the background) makes the removal final', async () => {
  const undo = createUndo();
  const passport = removal('Deleted Passport');
  undo.offer(passport);
  undo.end();
  expect(undo.current()).toBeNull();
  await undo.undo();
  expect(passport.undo).not.toHaveBeenCalled();
});

test('listeners hear each change and stop hearing once unsubscribed', () => {
  const undo = createUndo();
  const heard: (string | null)[] = [];
  const stop = undo.subscribe(() => heard.push(undo.current()?.message ?? null));
  undo.offer(removal('Deleted Passport'));
  jest.advanceTimersByTime(UNDO_MS);
  stop();
  undo.offer(removal('Deleted Gym'));
  expect(heard).toEqual(['Deleted Passport', null]);
});

test('a failed undo rejects so the caller can say so, and the offer still ends', async () => {
  const undo = createUndo();
  undo.offer({ message: 'Deleted Passport', undo: () => Promise.reject(new Error('disk')) });
  await expect(undo.undo()).rejects.toThrow('disk');
  expect(undo.current()).toBeNull();
});
