import { CardAnalysis } from '../../analysis/types';
import { Category, Folder } from '../../cards/types';
import { checkFolderName } from '../names';
import { suggestFolder, words } from '../suggest';

const folder = (id: string, name: string): Folder => ({ id, name, createdAt: 1 });
const read = (text: string, category?: Category, name?: string): CardAnalysis => ({
  text,
  category: category ? { value: category, confidence: 0.8 } : undefined,
  name: name ? { value: name, confidence: 0.8 } : undefined,
});

describe('suggestFolder', () => {
  test('routes to a folder whose name is on the card', () => {
    const folders = [folder('f1', 'Family'), folder('f2', 'Daman')];
    expect(suggestFolder(read('DAMAN\nNational Health Insurance', 'insurance'), folders)).toEqual({
      kind: 'existing',
      folderId: 'f2',
    });
  });

  test("routes by the card's category when the folder's name isn't printed on it", () => {
    const folders = [folder('f1', 'Health'), folder('f2', 'Gym & clubs')];
    expect(suggestFolder(read('THIQA\nPolicy 99', 'insurance'), folders)).toEqual({ kind: 'existing', folderId: 'f1' });
  });

  test('plurals and case are ignored', () => {
    expect(suggestFolder(read('PASSPORT\nRepublic', 'id'), [folder('f1', 'my passports')])).toEqual({
      kind: 'existing',
      folderId: 'f1',
    });
  });

  test('"Member ID" on an insurance card does not send it to an IDs folder', () => {
    const folders = [folder('ids', 'IDs'), folder('ins', 'Insurance')];
    expect(suggestFolder(read('Member ID 1234\nPolicy', 'insurance'), folders)).toEqual({
      kind: 'existing',
      folderId: 'ins',
    });
  });

  test('two folders that fit equally well: no guess', () => {
    const folders = [folder('a', 'Health'), folder('b', 'Medical')];
    expect(suggestFolder(read('Policy 99', 'insurance'), folders)).toEqual({ kind: 'none' });
  });

  test('no folder fits: offers a new one named after the kind of card', () => {
    expect(suggestFolder(read('Fitness First\nMember', 'membership'), [folder('f1', 'Family')])).toEqual({
      kind: 'new',
      name: 'Memberships',
    });
    expect(suggestFolder(read('Emirates ID', 'id'), [])).toEqual({ kind: 'new', name: 'IDs' });
  });

  test('a folder that already has the offered name is used instead of a duplicate', () => {
    expect(suggestFolder(read('Fitness First', 'membership'), [folder('f1', 'memberships')])).toEqual({
      kind: 'existing',
      folderId: 'f1',
    });
  });

  test('nothing is suggested when the kind of card is unknown and no folder matches', () => {
    expect(suggestFolder(read('1234 5678'), [folder('f1', 'Family')])).toEqual({ kind: 'none' });
    expect(suggestFolder({}, [folder('f1', 'Family')])).toEqual({ kind: 'none' });
  });

  test('a folder named only with filler words never matches', () => {
    expect(suggestFolder(read('My card documents'), [folder('f1', 'My cards')])).toEqual({ kind: 'none' });
  });
});

test('words drops accents and punctuation and folds plurals', () => {
  expect(words('Café-Clubs, IDs & Passes!')).toEqual(['cafe', 'club', 'id', 'passe']);
  expect(words('تأمين صحي')).toEqual(['تامين', 'صحي']);
});

describe('checkFolderName', () => {
  const folders = [folder('f1', 'Family')];
  test('accepts a new name', () => expect(checkFolderName(' Work ', folders)).toBeNull());
  test('rejects blank, too long and duplicate names', () => {
    expect(checkFolderName('  ', folders)).toBe('blank');
    expect(checkFolderName('x'.repeat(31), folders)).toBe('too-long');
    expect(checkFolderName('family', folders)).toBe('duplicate');
  });
  test('a folder may keep its own name when renamed', () => expect(checkFolderName('FAMILY', folders, 'f1')).toBeNull());
});

test('Arabic folder names match by category too', () => {
  expect(suggestFolder(read('Policy 99', 'insurance'), [folder('f1', 'تأمين')])).toEqual({ kind: 'existing', folderId: 'f1' });
});
