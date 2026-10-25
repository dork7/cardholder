import { base64, utf8 } from '../../crypto/bytes';
import { decodeCardMessage, encodeCardMessage, TransferError } from '../cardMessage';

const jpeg = (marker: string) => base64.encode(new Uint8Array([0xff, 0xd8, 0xff, ...utf8.encode(marker)]));
const content = {
  fields: { name: 'Emirates ID', category: 'id' as const, expiresOn: '2030-01-01', tags: ['Government'], documentKey: 'a'.repeat(64) },
  front: { jpegBase64: jpeg('front'), aspect: 1.586 },
  back: { jpegBase64: jpeg('back'), aspect: 1.586 },
};

test('round-trips the details and both photos', () => {
  expect(decodeCardMessage(encodeCardMessage(content))).toEqual(content);
  expect(decodeCardMessage(encodeCardMessage({ ...content, back: null })).back).toBeNull();
});

test('rejects anything that is not a well-formed card', () => {
  const good = encodeCardMessage(content);
  const bad = [
    new Uint8Array(0),
    utf8.encode('hello world, not a card'),
    good.subarray(0, good.length - 1), // truncated
    encodeCardMessage({ ...content, fields: { ...content.fields, category: 'weapon' as never } }),
    encodeCardMessage({ ...content, front: { jpegBase64: base64.encode(utf8.encode('not a jpeg')), aspect: 1.5 } }),
    encodeCardMessage({ ...content, front: { ...content.front, aspect: 0 } }),
  ];
  for (const b of bad) expect(() => decodeCardMessage(b)).toThrow(TransferError);
});
