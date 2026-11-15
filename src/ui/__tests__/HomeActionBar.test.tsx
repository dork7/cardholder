import { fireEvent, render, screen } from '@testing-library/react-native';
import { HomeActionBar } from '../HomeActionBar';
import { strings } from '../../strings';

test('home offers a labelled Notes entry', async () => {
  const onNotes = jest.fn();
  await render(<HomeActionBar gallery={false} onAddImage={jest.fn()} onNotes={onNotes} onToggleGallery={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: strings.notes.title }));
  expect(onNotes).toHaveBeenCalledTimes(1);
});
