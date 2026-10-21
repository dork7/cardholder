import { buildMessages, normalizeDigits, parseSuggestion, printedDateToIso } from '../smartExtract';

const EID = 'RESIDENT IDENTITY CARD\nEmirates ID\nExpiry Date 01/06/2029';

test('keeps fields that the card text backs up', () => {
  expect(parseSuggestion('{"name":"Emirates ID","expiry":"01/06/2029","category":"id"}', EID)).toEqual({
    name: 'Emirates ID',
    expiresOn: '2029-06-01',
    category: 'id',
  });
});

test('accepts a name whose words are spread across the card', () => {
  const card = 'UNITED ARAB EMIRATES\nRESIDENT IDENTITY CARD\nID Number 784-1990-1234567-1';
  expect(parseSuggestion('{"name":"Emirates ID","expiry":"","category":"id"}', card)?.name).toBe('Emirates ID');
});

test('drops a name the card does not show', () => {
  expect(parseSuggestion('{"name":"Passport","expiry":"","category":"id"}', EID)?.name).toBeNull();
});

test('drops an expiry that is not copied from the card', () => {
  expect(parseSuggestion('{"name":"","expiry":"01/06/2031","category":"id"}', EID)?.expiresOn).toBeNull();
});

test('drops unparseable dates and unknown categories', () => {
  const card = 'Valid until 30/02/2029';
  expect(parseSuggestion('{"name":"","expiry":"30/02/2029","category":"loyalty"}', card)).toEqual({
    name: null,
    expiresOn: null,
    category: null,
  });
});

test('matches Arabic-Indic digits on the card', () => {
  expect(parseSuggestion('{"name":"","expiry":"٠١/٠٦/٢٠٢٩","category":"id"}', 'تاريخ الانتهاء ٠١/٠٦/٢٠٢٩')?.expiresOn).toBe(
    '2029-06-01',
  );
  expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩ ۰۹')).toBe('0123456789 09');
});

test('reads the object out of chat-template tokens around it', () => {
  expect(parseSuggestion('<start_of_turn>model\n{"name":"","expiry":"","category":"id"}<end_of_turn>', EID)?.category).toBe(
    'id',
  );
});

test('rejects output that is not a JSON object', () => {
  expect(parseSuggestion('Sure! Here is the JSON', EID)).toBeNull();
  expect(parseSuggestion('null', EID)).toBeNull();
});

test.each([
  ['09/11/2030', '2030-11-09'], // day first, as on UAE cards
  ['31-12-2027', '2027-12-31'],
  ['14.03.28', '2028-03-14'],
  ['2027/01/05', '2027-01-05'],
  ['14 Mar 2028', '2028-03-14'],
  ['1 September, 2029', '2029-09-01'],
  ['06/2027', '2027-06-30'], // month only: valid through the end of the month
  ['02/28', '2028-02-29'],
  ['13/13/2029', null],
  ['soon', null],
])('reads the printed date %s', (printed, iso) => {
  expect(printedDateToIso(printed)).toBe(iso);
});

test('ends the prompt with the card text as the last user turn', () => {
  const messages = buildMessages("  GOLD'S GYM  ");
  expect(messages[0].role).toBe('system');
  expect(messages.at(-1)).toEqual({ role: 'user', content: "GOLD'S GYM" });
});
