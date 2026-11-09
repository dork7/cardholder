// The language model that answers questions about the documents. Either the phone's own (Gemini Nano
// on Android, Apple Foundation Models on iPhone) or, where there is none, the downloaded Gemma.
// Everything runs on the phone. Tests pass a fake.

export interface AskModel {
  kind: 'built-in' | 'gemma';
  // How much prompt text fits, in characters, leaving room for the answer.
  promptChars: number;
  // A JSON object, as text. `schema` constrains the output where the model supports it (Gemma);
  // the built-in models are asked for the shape in the prompt. Aborting stops it.
  generate(prompt: { system: string; user: string }, options: { maxTokens: number; schema: object }, signal: AbortSignal): Promise<string>;
}

// Why no model can answer right now, so the Ask window can say what to do.
export type ModelUnavailable =
  | 'needs-download' // no built-in model, and Gemma isn't downloaded (Settings → AI)
  | 'built-in-downloadable' // the phone can fetch its built-in model (Gemini Nano)
  | 'built-in-preparing' // the built-in model is downloading or getting ready
  | 'built-in-off'; // Apple Intelligence is turned off, and Gemma isn't downloaded

export type ModelChoice = { status: 'ready'; model: AskModel } | { status: 'unavailable'; reason: ModelUnavailable };

// Pulls the first JSON object out of a model's reply: small models wrap it in prose or code fences.
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
