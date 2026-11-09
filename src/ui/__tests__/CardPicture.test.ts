import { sidewaysBox } from '../CardPicture';

test('a turned picture is the slot with width and height swapped, centred on it', () => {
  // A 300 × 189 landscape slot: the picture is 189 wide and 300 tall before its quarter turn.
  expect(sidewaysBox({ width: 300, height: 189 })).toEqual({ width: 189, height: 300, left: 55.5, top: -55.5 });
});
