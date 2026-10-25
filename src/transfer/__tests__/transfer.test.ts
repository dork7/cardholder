import { decodeBase45, encodeBase45 } from '../base45';
import { crc32 } from '../crc32';
import { BLOCK_SIZE, createReceiveSession, createTransfer } from '../frames';
import { utf8 } from '../../crypto/bytes';

// Deterministic "random" bytes, so a failure reproduces.
function bytes(n: number, seed = 1): Uint8Array {
  const out = new Uint8Array(n);
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out[i] = x >>> 24;
  }
  return out;
}

describe('base45', () => {
  test('matches RFC 9285', () => {
    expect(encodeBase45(utf8.encode('AB'))).toBe('BB8');
    expect(encodeBase45(utf8.encode('Hello!!'))).toBe('%69 VD92EX0');
    expect(encodeBase45(utf8.encode('ietf!'))).toBe('QED8WEX0');
    expect(utf8.decode(decodeBase45('QED8WEX0')!)).toBe('ietf!');
  });

  test('round-trips any bytes and rejects junk', () => {
    const data = bytes(1001);
    expect(decodeBase45(encodeBase45(data))).toEqual(data);
    expect(decodeBase45('abc')).toBeNull(); // lowercase is not base45
    expect(decodeBase45('GGW')).toBeNull(); // 65535 + 1
    expect(decodeBase45('A')).toBeNull();
  });
});

test('CRC-32 is the standard one', () => {
  expect(crc32(utf8.encode('123456789'))).toBe(0xcbf43926);
});

describe('sending a card over QR codes', () => {
  const message = bytes(150_000, 7); // about one shrunk card
  const transfer = createTransfer(message, 42);

  // Plays frames from `start`, dropping some, until the receiver has it all. Returns frames shown.
  function play(start: number, drop: (seq: number) => boolean) {
    const session = createReceiveSession();
    for (let seq = start, shown = 1; shown < transfer.k * 4; seq++, shown++) {
      if (drop(seq)) continue;
      const state = session.scan(transfer.frame(seq));
      if (state.kind === 'done') return { shown, message: state.message };
      if (state.kind === 'damaged') throw new Error('damaged');
    }
    throw new Error('never finished');
  }

  test('every frame caught: the plain pass is enough', () => {
    const result = play(0, () => false);
    expect(result.message).toEqual(message);
    expect(result.shown).toBe(transfer.k);
  });

  test('starting halfway and missing a third of the frames still rebuilds it, without waiting a full round', () => {
    const missed = (seq: number) => (seq * 2654435761) % 3 === 0;
    const result = play(Math.floor(transfer.k / 2), missed);
    expect(result.message).toEqual(message);
    // Missing a third, k frames received takes k / (2/3) = 1.5k shown; a plain repeating sequence would
    // need about five rounds before every block had been caught once.
    expect(result.shown).toBeLessThan(transfer.k * 1.6);
  });

  test('frames are QR alphanumeric text of a fixed size', () => {
    const frame = transfer.frame(5);
    expect(frame).toMatch(/^CH1:[0-9A-Z $%*+\-./:]+$/);
    expect(frame.length).toBe(4 + Math.ceil(((19 + BLOCK_SIZE) * 3) / 2));
  });

  test('other QR codes and a second transfer are ignored', () => {
    const session = createReceiveSession();
    expect(session.scan('https://example.com')).toEqual({ kind: 'waiting' });
    expect(session.scan(transfer.frame(0)).kind).toBe('receiving');
    const other = createTransfer(bytes(150_000, 9), 43);
    const before = session.scan(transfer.frame(1));
    expect(session.scan(other.frame(2))).toEqual(before);
  });

  test('a transfer whose content does not match its checksum is reported as damaged', () => {
    const tampered = createTransfer(message, 42);
    const session = createReceiveSession();
    let state = session.scan(tampered.frame(0));
    for (let seq = 1; seq < tampered.k; seq++) {
      // Flip a character in one block's data after the header.
      const frame = tampered.frame(seq);
      const text = seq === 3 ? frame.slice(0, 60) + (frame[60] === '0' ? '1' : '0') + frame.slice(61) : frame;
      state = session.scan(text);
    }
    expect(state.kind).toBe('damaged');
  });
});
