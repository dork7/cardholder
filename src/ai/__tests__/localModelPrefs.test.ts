import { createPrefs, PrefsStore } from '../localModelPrefs';

const memory = (initial: string | null = null) => {
  let text = initial;
  const store: PrefsStore = { read: () => text, write: (t) => void (text = t) };
  return { store, text: () => text };
};

test('defaults: nothing active, nothing CPU-only, built-in for asking', () => {
  const p = createPrefs(memory().store, () => false);
  expect(p.get()).toEqual({ active: null, cpuOnly: [], askWith: 'built-in' });
});

test('existing Gemma file becomes the active model', () => {
  const p = createPrefs(memory().store, (id) => id === 'gemma-270m');
  expect(p.get().active).toBe('gemma-270m');
});

test('unknown or corrupt prefs fall back to defaults', () => {
  expect(createPrefs(memory('{not json').store, () => false).get()).toEqual({ active: null, cpuOnly: [], askWith: 'built-in' });
  const p = createPrefs(memory(JSON.stringify({ active: 'phi-3', cpuOnly: ['phi-3', 'qwen3-0.6b'], askWith: 'cloud' })).store, () => true);
  expect(p.get()).toEqual({ active: null, cpuOnly: ['qwen3-0.6b'], askWith: 'built-in' });
});

test('an active model whose file is gone is not active', () => {
  const p = createPrefs(memory(JSON.stringify({ active: 'llama3.2-1b' })).store, () => false);
  expect(p.get().active).toBeNull();
});

test('updates and CPU-only marks persist', () => {
  const m = memory();
  const p = createPrefs(m.store, () => true);
  p.update({ active: 'qwen2.5-0.5b', askWith: 'downloaded' });
  p.markCpuOnly('qwen2.5-0.5b');
  p.markCpuOnly('qwen2.5-0.5b');
  expect(createPrefs(m.store, () => true).get()).toEqual({ active: 'qwen2.5-0.5b', cpuOnly: ['qwen2.5-0.5b'], askWith: 'downloaded' });
});
