import { CATALOG, entry, lowMemory, promptCharsFor, RECOMMENDED } from '../catalog';

test('four models, Qwen2.5 recommended, ids unique', () => {
  expect(CATALOG.map((e) => e.id)).toEqual(['gemma-270m', 'qwen2.5-0.5b', 'qwen3-0.6b', 'llama3.2-1b']);
  expect(RECOMMENDED).toBe('qwen2.5-0.5b');
});

test('every file is pinned to a revision and a SHA-256', () => {
  for (const e of CATALOG) {
    expect(e.url).toMatch(/^https:\/\/huggingface\.co\/[^/]+\/[^/]+\/resolve\/[0-9a-f]{40}\//);
    expect(e.url.endsWith(`/${e.file}`)).toBe(true);
    expect(e.sha256).toMatch(/^[0-9a-f]{64}$/);
  }
});

test('the existing Gemma file is unchanged and CPU only', () => {
  const g = entry('gemma-270m')!;
  expect(g.file).toBe('gemma-3-270m-it-Q8_0.gguf');
  expect(g.bytes).toBe(291_545_600);
  expect(g.sha256).toBe('0ef57d2c838458a1952664260dcba38e5bdda37494f3af732f06e4add24068e3');
  expect(g.gpu).toBe(false);
});

test('Qwen3 has thinking turned off; the others leave it alone', () => {
  expect(entry('qwen3-0.6b')!.thinking).toBe(false);
  expect(entry('qwen2.5-0.5b')!.thinking).toBeNull();
});

test('an unknown id is not an entry', () => {
  expect(entry('phi-3')).toBeNull();
});

test('4,096 tokens keep the 7,000 characters asking used before', () => {
  expect(promptCharsFor(4096)).toBe(7000);
  expect(promptCharsFor(8192)).toBeGreaterThan(14_000);
});

test('warns when the phone has less than 3× the file in RAM; never when RAM is unknown', () => {
  const llama = entry('llama3.2-1b')!;
  expect(lowMemory(llama, 3e9)).toBe(true);
  expect(lowMemory(llama, 4e9)).toBe(false);
  expect(lowMemory(llama, null)).toBe(false);
});
