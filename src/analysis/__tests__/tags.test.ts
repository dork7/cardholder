import { analyzeText } from '../analyze';
import { findMrz } from '../mrz';
import { suggestTags } from '../tags';

const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];

test('a card can earn several tags, in a fixed order', () => {
  expect(suggestTags('ACME Corp\nHealth Insurance\nEmployee No 4411', null)).toEqual({
    value: ['Health', 'Insurance', 'Work'],
    confidence: 0.7,
  });
});

test('Arabic text is read too', () => {
  expect(suggestTags('بطاقة تأمين صحي', null)?.value).toEqual(['Health', 'Insurance']);
});

test('an Emirates ID number or an MRZ marks an official document; a passport is also travel', () => {
  expect(suggestTags('784-1990-1234567-1', null)?.value).toEqual(['Government']);
  expect(suggestTags(TD3.join('\n'), findMrz(TD3))?.value).toEqual(['Government', 'Travel']);
});

test('a Visa bank card is finance, not travel', () => {
  expect(suggestTags('First Bank\nVisa Debit', null)?.value).toEqual(['Finance']);
});

test('no keyword, no tags', () => {
  expect(suggestTags('ABC 123', null)).toBeUndefined();
});

test('reading a card suggests its tags', () => {
  const line = (text: string, y: number) => ({ text, confidence: 0.95, box: { x: 0, y, width: 1, height: 0.05 } });
  const analysis = analyzeText({ lines: [line('City Gym', 0), line('Fitness membership', 0.2)] }, '2026-10-25');
  expect(analysis.tags).toEqual({ value: ['Fitness'], confidence: 0.7 });
});
