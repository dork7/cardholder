import { render, screen } from '@testing-library/react-native';
import { CardPicture, sidewaysBox } from '../CardPicture';

test('a turned picture is the slot with width and height swapped, centred on it', () => {
  // A 300 × 189 landscape slot: the picture is 189 wide and 300 tall before its quarter turn.
  expect(sidewaysBox({ width: 300, height: 189 })).toEqual({ width: 189, height: 300, left: 55.5, top: -55.5 });
});

const sourceOf = (testID: string) => (screen.queryByTestId(testID)?.props.source as { uri: string } | undefined)?.uri;

test('the sharp picture is laid over the thumbnail, and dropping it leaves the thumbnail in place', async () => {
  await render(<CardPicture uri="thumb" sharpUri="full" vertical={false} />);
  expect(sourceOf('card-picture')).toBe('thumb');
  expect(sourceOf('card-picture-sharp')).toBe('full');

  await screen.rerender(<CardPicture uri="thumb" sharpUri={null} vertical={false} />);
  expect(sourceOf('card-picture')).toBe('thumb');
  expect(sourceOf('card-picture-sharp')).toBeUndefined();
});

test('images are shown without a fade-in and with rounded corners', async () => {
  await render(<CardPicture uri="thumb" vertical={false} radius={20} />);
  const img = screen.getByTestId('card-picture');
  expect(img.props.fadeDuration).toBe(0);
  expect(img.props.style).toEqual(expect.arrayContaining([{ borderRadius: 20 }]));
});
