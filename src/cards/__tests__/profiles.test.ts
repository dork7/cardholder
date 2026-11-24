import { makeStore, fields, images } from '../../../test/fixtures';
import { searchDocumentDetails } from '../documentSearch';

test('a Person has one sealed profile whose details round trip and are searchable', async () => {
  const { store, db } = await makeStore();
  const person = await store.createPerson('Sara');
  const profile = { template: 'medical' as const, dateOfBirth: '1990-05-12', bloodGroup: 'A+' as const };
  const created = await store.create(fields({ name: 'Sara', personId: person.id, profile }), images('profile'));
  expect((await store.get(created.id))?.profile).toEqual(profile);
  await expect(store.create(fields({ name: 'Sara', personId: person.id, profile }), images('duplicate'))).rejects.toThrow();
  const row = await db.getFirstAsync<{ payload: Uint8Array }>('SELECT payload FROM cards WHERE id = ?', [created.id]);
  expect(new TextDecoder().decode(row!.payload)).not.toContain('1990-05-12');
  expect(await searchDocumentDetails(await store.list(), [], 'A+', new Set())).toContainEqual(expect.objectContaining({ id: created.id }));
});

test('medical lists, notes and contact details survive storage and are found by search', async () => {
  const { store } = await makeStore();
  const person = await store.createPerson('Sara');
  const profile = { template: 'medical' as const, dateOfBirth: null, bloodGroup: 'Unknown' as const,
    conditions: ['Asthma'], allergies: ['Penicillin'], medications: ['Salbutamol'], medicalNotes: 'Carry inhaler',
    mobile: '+971500000000', email: 'sara@example.com', address: 'Dubai' };
  const card = await store.create(fields({ name: 'Sara', personId: person.id, profile }), images('profile'));
  expect((await store.get(card.id))?.profile).toEqual(profile);
  for (const query of ['Asthma', 'Penicillin', 'Salbutamol', 'inhaler', '+971500000000', 'sara@example.com', 'Dubai']) {
    expect((await searchDocumentDetails(await store.list(), [], query, new Set())).map((item) => item.id)).toContain(card.id);
  }
});
