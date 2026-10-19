import { createAead, DecryptError, generateKey } from '../aead';
import { base64, concat, toHex, utf8 } from '../bytes';

describe('bytes', () => {
  test('utf8 and base64 round-trip', () => {
    const text = 'Emirates ID — café';
    expect(utf8.decode(utf8.encode(text))).toBe(text);
    expect(utf8.decode(base64.decode(base64.encode(utf8.encode(text))))).toBe(text);
  });

  test('concat joins in order', () => {
    expect(Array.from(concat(Uint8Array.of(1, 2), Uint8Array.of(), Uint8Array.of(3)))).toEqual([1, 2, 3]);
  });

  test('toHex', () => {
    expect(toHex(Uint8Array.of(0, 255, 16))).toBe('00ff10');
  });
});

describe('aead', () => {
  test('generateKey returns 32 bytes', () => {
    expect(generateKey()).toHaveLength(32);
  });

  test('seal then open returns the plaintext', () => {
    const aead = createAead(generateKey());
    const plaintext = utf8.encode('front of my insurance card');
    expect(utf8.decode(aead.open(aead.seal(plaintext)))).toBe('front of my insurance card');
  });

  test('empty plaintext round-trips', () => {
    const aead = createAead(generateKey());
    expect(aead.open(aead.seal(new Uint8Array()))).toHaveLength(0);
  });

  test('sealing the same plaintext twice gives different output (random IV)', () => {
    const aead = createAead(generateKey());
    const plaintext = utf8.encode('same');
    expect(toHex(aead.seal(plaintext))).not.toBe(toHex(aead.seal(plaintext)));
  });

  test('a flipped byte fails authentication', () => {
    const aead = createAead(generateKey());
    const sealed = aead.seal(utf8.encode('secret'));
    sealed[sealed.length - 20] ^= 0x01;
    expect(() => aead.open(sealed)).toThrow(DecryptError);
  });

  test('a different key cannot open it', () => {
    const sealed = createAead(generateKey()).seal(utf8.encode('secret'));
    expect(() => createAead(generateKey()).open(sealed)).toThrow(DecryptError);
  });

  test('truncated or wrong-version input throws DecryptError', () => {
    const aead = createAead(generateKey());
    const sealed = aead.seal(utf8.encode('secret'));
    expect(() => aead.open(sealed.subarray(0, 10))).toThrow(DecryptError);
    const wrongVersion = Uint8Array.from(sealed);
    wrongVersion[0] = 9;
    expect(() => aead.open(wrongVersion)).toThrow(DecryptError);
  });

  test('rejects keys that are not 32 bytes', () => {
    expect(() => createAead(new Uint8Array(16))).toThrow('32 bytes');
  });
});
