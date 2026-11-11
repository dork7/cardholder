import { Card } from '../../cards/types';
import { AskCase, CardCase } from './score';

// The bench's fixed test set (app/dev/models.tsx). Made-up documents only: no real person's text
// belongs here. Add cases from the sample documents in dataSet/ by copying their recognised text from
// a document's Details (.md) in a development build.

export const CARD_CASES: CardCase[] = [
  {
    id: 'emirates-id',
    text: 'UNITED ARAB EMIRATES\nRESIDENT IDENTITY CARD\nبطاقة هوية مقيم\nID Number 784-1987-7654321-4\nName: Omar Khalid\nNationality: Jordan\nExpiry Date 09/11/2030',
    expect: { expiresOn: '2030-11-09', category: 'id' },
  },
  {
    id: 'health-insurance',
    text: 'DAMAN\nNational Health Insurance Company\nThiqa\nMember Name: LAYLA HASSAN\nPolicy No. 1100 2345 6789\nValid Until: 31-12-2027',
    expect: { expiresOn: '2027-12-31', category: 'insurance' },
  },
  {
    id: 'gym',
    text: "GOLD'S GYM\nDUBAI MARINA\nMEMBER\nAHMED ALI\nMember ID 88213\nExp 06/2027",
    expect: { name: "Gold's Gym", expiresOn: '2027-06-30', category: 'membership' },
  },
  {
    id: 'library',
    text: 'Dubai Public Library\nBorrower card\nCard No. 2231 9087\nPlease return items on time',
    expect: { name: 'Dubai Public Library', category: 'membership' },
  },
  {
    id: 'passport',
    text: 'PASSPORT\nREPUBLIC OF ICELAND\nSurname: JONSDOTTIR\nGiven names: ANNA\nPassport No. A9988776\nDate of issue 02 FEB 2022\nDate of expiry 01 FEB 2032',
    expect: { name: 'Passport', expiresOn: '2032-02-01', category: 'id' },
  },
];

const doc = (id: string, name: string, tag: string, expiresOn: string | null, text: string): Card => ({
  id,
  name,
  expiresOn,
  remindDaysBefore: 14,
  tags: [tag],
  documentKey: null,
  folderId: null,
  readText: { front: text, back: '' },
  vertical: false,
  pinned: false,
  position: 0,
  hasBack: false,
  frontAspect: 1.586,
  backAspect: null,
  pdf: null,
  createdAt: 0,
  updatedAt: 0,
});

// The documents the questions are asked over, all at once, as on a phone with several documents.
export const ASK_DOCS: Card[] = [
  doc('car-insurance', 'Car insurance', 'Insurance', '2027-05-31', 'ORIENT INSURANCE\nMotor policy\nPolicy No. MP-55210\nPolicy expiry: 31/05/2027\nPlate 12345 Dubai'),
  doc('passport', 'Passport', 'ID', '2032-02-01', 'PASSPORT\nREPUBLIC OF ICELAND\nSurname: JONSDOTTIR\nGiven names: ANNA\nPassport No. A9988776\nDate of expiry 01 FEB 2032'),
  doc('gym', "Gold's Gym", 'Membership', '2027-06-30', "GOLD'S GYM\nDUBAI MARINA\nMember ID 88213\nExp 06/2027"),
  doc('vehicle', 'Vehicle licence', 'Vehicle', '2026-08-14', 'VEHICLE LICENCE\nTraffic Code 50\nPlate No. 12345\nModel: Toyota Corolla 2021\nColour: White\nExpiry: 14/08/2026'),
  doc('health', 'Health insurance', 'Insurance', '2027-12-31', 'DAMAN\nThiqa\nMember Name: LAYLA HASSAN\nPolicy No. 1100 2345 6789\nValid Until: 31-12-2027'),
];

export const ASK_CASES: AskCase[] = [
  { id: 'passport-number', question: 'What is my passport number?', expect: 'A9988776' },
  { id: 'car-policy', question: 'What is my car insurance policy number?', expect: 'MP-55210' },
  { id: 'gym-member', question: 'What is my gym member ID?', expect: '88213' },
  { id: 'car-colour', question: 'What colour is my car?', expect: 'white' },
  { id: 'car-model', question: 'Which car model do I have?', expect: 'Corolla' },
  { id: 'health-policy', question: 'What is my health insurance policy number?', expect: '1100 2345 6789' },
  { id: 'licence-expiry', question: 'When does the vehicle licence expire?', expect: '14/08/2026' },
  { id: 'passport-surname', question: 'What surname is on my passport?', expect: 'JONSDOTTIR' },
];
