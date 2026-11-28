import { copyShared } from '../sharedFiles';

const mockCopies: Array<[string, string]> = [];
const mockDeleted: string[] = [];
jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    constructor(parent: { uri: string }, name: string) { this.uri = `${parent.uri}/${name}`; }
    create() {}
  }
  class File {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) {
      this.uri = typeof parent === 'string' ? parent : `${parent.uri}/${name}`;
    }
    get exists() { return true; }
    async copy(to: File) { mockCopies.push([this.uri, to.uri]); }
    delete() { mockDeleted.push(this.uri); }
  }
  return { Directory, File, Paths: { cache: { uri: 'file:///cache' } } };
});

beforeEach(() => {
  mockCopies.length = 0;
  mockDeleted.length = 0;
});

test('copies a content URI directly into app cache without deleting the provider file', async () => {
  const copies = await copyShared([{ path: 'content://media/images/38', mimeType: 'image/jpeg', fileName: 'front.jpg' }]);
  expect(mockCopies).toEqual([['content://media/images/38', copies[0].path]]);
  expect(copies[0].path).toMatch(/^file:\/\/\/cache\/shared\/\d+-0\.jpg$/);
  expect(mockDeleted).toEqual([]);
});
