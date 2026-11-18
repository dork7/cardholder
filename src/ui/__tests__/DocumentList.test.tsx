import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { makeCard } from '../../../test/fixtures';
import { DocumentRows, PinnedPanels } from '../DocumentList';
import { palettes } from '../theme';

jest.mock('../../hooks/useCardImage', () => ({ useCardImage: () => null }));

test('document library panels have one opaque surface over the page wash', async () => {
  const card = makeCard({ id: 'passport', name: 'Passport', pinned: true });
  await render(<>
    <PinnedPanels cards={[card]} onOpen={() => {}} />
    <DocumentRows cards={[{ ...card, id: 'visa', pinned: false }]} onOpen={() => {}} />
  </>);
  expect(StyleSheet.flatten(screen.getByTestId('pinned-panel-surface-passport').props.style).backgroundColor).toBe(palettes.light.surface);
  expect(StyleSheet.flatten(screen.getByTestId('document-rows').props.style).backgroundColor).toBe(palettes.light.surface);
});
