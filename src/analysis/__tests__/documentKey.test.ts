import { analyzeText } from '../analyze';
import { documentId, documentKey } from '../documentKey';
import { findMrz } from '../mrz';

// ICAO 9303 specimens; the second TD1 carries an Emirates ID number in its optional data.
const TD3 = ['P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<', 'L898902C36UTO7408122F1204159ZE184226B<<<<<10'];
const TD1_EID = ['ILARE1234567897784199012345671', '7408122F1204159ARE<<<<<<<<<<<6', 'SMITH<<JANE<<<<<<<<<<<<<<<<<<<'];

test('an Emirates ID is known by its ID number, on the front or in the back MRZ', () => {
  expect(documentId('ID Number 784-1990-1234567-1', null)).toBe('AE-ID:784199012345671');
  expect(documentId(TD1_EID.join('\n'), findMrz(TD1_EID))).toBe('AE-ID:784199012345671');
});

test('other documents by their MRZ document number; plain cards by nothing', () => {
  expect(documentId(TD3.join('\n'), findMrz(TD3))).toBe('MRZ:P:L898902C3');
  expect(documentId('City Gym', null)).toBeNull();
});

test('the key is a stable hash that does not contain the number', () => {
  const key = documentKey('AE-ID:784199012345671');
  expect(key).toMatch(/^[0-9a-f]{64}$/);
  expect(key).toBe(documentKey('AE-ID:784199012345671'));
  expect(key).not.toContain('784199012345671');
});

test('the front and the back of the same Emirates ID give the same key', () => {
  const line = (text: string, y: number) => ({ text, confidence: 0.95, box: { x: 0, y, width: 1, height: 0.05 } });
  const front = analyzeText({ lines: [line('Resident Identity Card', 0), line('784-1990-1234567-1', 0.2)] }, '2026-10-25');
  const back = analyzeText({ lines: TD1_EID.map((t, i) => line(t, 0.6 + i * 0.1)) }, '2026-10-25');
  expect(front.documentKey).toBeDefined();
  expect(back.documentKey).toBe(front.documentKey);
});
