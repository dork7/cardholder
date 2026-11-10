import { entry, LocalModelEntry, promptCharsFor } from '../catalog';

let mockStatus = 'available';
let mockActive: LocalModelEntry | null = null;
let mockAskWith = 'built-in';
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => ({
    availability: async () => mockStatus,
    prepare: jest.fn(),
    generate: jest.fn(),
    cancel: jest.fn(),
  }),
}));
jest.mock('../../analysis/localModel', () => ({
  activeEntry: () => mockActive,
  generateWithLocalModel: jest.fn(),
  prefs: { get: () => ({ askWith: mockAskWith }) },
}));

import { chooseModel } from '../models';

beforeEach(() => {
  mockStatus = 'available';
  mockActive = null;
  mockAskWith = 'built-in';
});

test('built-in first by default', async () => {
  mockActive = entry('qwen2.5-0.5b');
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'built-in' } });
});

test('"Ask with: downloaded" uses the active model even when built-in is ready, with its context', async () => {
  mockAskWith = 'downloaded';
  mockActive = { ...entry('llama3.2-1b')!, nCtx: 8192 };
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'local', promptChars: promptCharsFor(8192) } });
});

test('"Ask with: downloaded" with nothing downloaded falls back to built-in', async () => {
  mockAskWith = 'downloaded';
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'built-in' } });
});

test('no built-in model: the active downloaded one answers', async () => {
  mockStatus = 'unsupported';
  mockActive = entry('gemma-270m');
  expect(await chooseModel()).toMatchObject({ status: 'ready', model: { kind: 'local', promptChars: 7000 } });
});

test('no built-in and no model: needs a download', async () => {
  mockStatus = 'unsupported';
  expect(await chooseModel()).toEqual({ status: 'unavailable', reason: 'needs-download' });
});
