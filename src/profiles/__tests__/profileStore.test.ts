import { fields, image, images, makeStore } from '../../../test/fixtures';
import { utf8 } from '../../crypto/bytes';
import { blobName, ProfileExistsError } from '../../cards/cardStore';
import { searchDocumentDetails } from '../../cards/documentSearch';
import { canAddCard } from '../../purchases/limits';
import { FREE_CARD_LIMIT } from '../../config';
import { ageOn, ProfileDetails, toProfile } from '../profile';

const details = (overrides: Partial<ProfileDetails> = {}): ProfileDetails => ({
  dateOfBirth: '1990-05-04', bloodGroup: 'AB-', template: 'medical', ...overrides,
});

async function withPerson(name = 'Sara') {
  const made = await makeStore();
  const person = await made.store.createPerson(name);
  return { ...made, person };
}

test('a profile is saved and reopens with its date of birth and blood group unchanged', async () => {
  const { store, person } = await withPerson();
  const saved = await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('drawn'));
  expect(saved.profile).toEqual(details());
  const reopened = await store.get(saved.id);
  expect(reopened).toMatchObject({ name: 'Sara', personId: person.id, profile: details() });
  expect(await store.loadImage(saved.id, 'front')).not.toBeNull();
  expect(await store.loadImage(saved.id, 'thumb')).not.toBeNull();
});

test('a profile photo is a separate sealed blob that can be replaced and removed', async () => {
  const { store, blobs, person } = await withPerson();
  const photo = image('portrait', 1);
  const saved = await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }),
    { ...images('drawn'), profilePhoto: photo });
  expect(await store.loadImage(saved.id, 'profilePhoto')).toBe(photo.jpegBase64);
  expect(Buffer.from(blobs.raw.get(blobName(saved.id, 'profilePhoto'))!).toString('latin1')).not.toContain('JPEG:portrait');
  await store.update(saved.id, fields({ name: 'Sara', personId: person.id }), { profilePhoto: image('new', 1) });
  expect(await store.loadImage(saved.id, 'profilePhoto')).toBe(image('new', 1).jpegBase64);
  await store.update(saved.id, fields({ name: 'Sara', personId: person.id }), { profilePhoto: null });
  expect(await store.loadImage(saved.id, 'profilePhoto')).toBeNull();
  expect(await store.loadImage(saved.id, 'front')).toBe(images('drawn').front.jpegBase64);
});

test('profile details are stored only in the sealed payload, never in a plaintext column', async () => {
  const { store, db, person } = await withPerson();
  const saved = await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('drawn'));
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM cards WHERE id = ?', [saved.id]);
  const plaintext = Object.values(row!).map((v) => (v instanceof Uint8Array ? Buffer.from(v).toString('latin1') : String(v))).join('|');
  expect(plaintext).not.toContain('1990-05-04');
  expect(plaintext).not.toContain('AB-');
  expect(plaintext).not.toContain('bloodGroup');
});

test('a person has at most one profile, and a profile needs a person', async () => {
  const { store, person } = await withPerson();
  const first = await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('a'));
  await expect(store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('b'))).rejects.toBeInstanceOf(ProfileExistsError);
  await expect(store.create(fields({ name: 'Nobody', profile: details() }), images('c'))).rejects.toThrow('A profile needs a person');
  // Ordinary documents for the same person are unaffected.
  await expect(store.create(fields({ name: 'Passport', personId: person.id }), images('d'))).resolves.toBeDefined();

  // Moving a second profile onto Sara is refused too.
  const omar = await store.createPerson('Omar');
  const second = await store.create(fields({ name: 'Omar', personId: omar.id, profile: details() }), images('e'));
  await expect(store.update(second.id, fields({ name: 'Omar', personId: person.id }))).rejects.toBeInstanceOf(ProfileExistsError);

  // Once Sara's profile is deleted, she can have a new one.
  await store.moveToRecentlyDeleted(first.id);
  await expect(store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('f'))).resolves.toBeDefined();
});

test('editing a profile keeps its details unless they are changed, and can redraw its picture', async () => {
  const { store, person } = await withPerson();
  const saved = await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('first'));
  // A change that does not mention the profile (pin, tags, blur) leaves it alone.
  const tagged = await store.update(saved.id, fields({ name: 'Sara', personId: person.id, tags: ['Family'] }));
  expect(tagged.profile).toEqual(details());
  const edited = await store.update(saved.id, fields({ name: 'Sara', personId: person.id, profile: details({ bloodGroup: 'O+', dateOfBirth: null }) }),
    { front: images('redrawn').front });
  expect((await store.get(saved.id))?.profile).toEqual({ dateOfBirth: null, bloodGroup: 'O+', template: 'medical' });
  expect(edited.updatedAt).toBeGreaterThan(saved.updatedAt);
  expect(utf8.decode(Buffer.from((await store.loadImage(saved.id, 'front'))!, 'base64'))).toBe('JPEG:redrawn');
});

test('ordinary documents have no profile, and unreadable profile details fall back to defaults', async () => {
  expect(toProfile(undefined)).toBeNull();
  expect(toProfile('O+')).toBeNull();
  expect(toProfile({ dateOfBirth: '1990-02-31', bloodGroup: 'Z', template: 'poster' })).toEqual({ dateOfBirth: null, bloodGroup: 'unknown', template: 'medical' });
  const { store } = await makeStore();
  const doc = await store.create(fields({ name: 'Passport' }), images('p'));
  expect(await store.get(doc.id)).not.toHaveProperty('profile');
});

test('profiles are listed and counted like documents, so they count towards the free limit', async () => {
  const { store, person } = await withPerson();
  for (let i = 0; i < FREE_CARD_LIMIT - 1; i++) await store.create(fields({ name: `Doc ${i}` }), images(`d${i}`));
  expect(canAddCard(await store.count(), false)).toBe(true);
  await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('profile'));
  expect(await store.count()).toBe(FREE_CARD_LIMIT);
  expect(canAddCard(await store.count(), false)).toBe(false);
  expect((await store.list()).filter((card) => card.profile).map((card) => card.name)).toEqual(['Sara']);
});

test('search finds a profile by its name, date of birth and blood group', async () => {
  const { store, person } = await withPerson();
  await store.create(fields({ name: 'Sara', personId: person.id, profile: details() }), images('drawn'));
  await store.create(fields({ name: 'Passport' }), images('p'));
  const cards = await store.list();
  for (const query of ['1990-05-04', 'AB−', 'blood group']) {
    expect((await searchDocumentDetails(cards, [], query, new Set())).map((card) => card.name)).toEqual(['Sara']);
  }
});

test('optional medical and contact details stay sealed, reopen unchanged and are searchable', async () => {
  const { store, db, person } = await withPerson();
  const profile = details({ conditions: ['Asthma'], allergies: ['Pollen'], medications: ['Ventolin'],
    medicalNotes: 'Carry inhaler', mobile: '+971500000000', email: 'sara@example.com', address: 'Dubai Marina' });
  const saved = await store.create(fields({ name: 'Sara', personId: person.id, profile }), images('drawn'));
  expect((await store.get(saved.id))?.profile).toEqual(profile);
  const row = await db.getFirstAsync<Record<string, unknown>>('SELECT * FROM cards WHERE id = ?', [saved.id]);
  expect(JSON.stringify(row)).not.toContain('Carry inhaler');
  for (const query of ['Asthma', 'Pollen', 'Ventolin', 'inhaler', '+971500000000', 'sara@example.com', 'Dubai Marina']) {
    expect((await searchDocumentDetails(await store.list(), [], query, new Set())).map((card) => card.id)).toEqual([saved.id]);
  }
});

test('age is counted in whole years on the calendar day', () => {
  expect(ageOn('1990-05-04', new Date(2026, 4, 3))).toBe(35);
  expect(ageOn('1990-05-04', new Date(2026, 4, 4))).toBe(36);
  expect(ageOn('2030-01-01', new Date(2026, 0, 1))).toBeNull();
  expect(ageOn(null, new Date())).toBeNull();
});
