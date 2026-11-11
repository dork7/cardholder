import { normalizeDigits, printedDateToIso } from '../printedDate';

test('turns Arabic-Indic digits into 0–9', () => {
  expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩ ۰۹')).toBe('0123456789 09');
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
