import { ALERT_PIXELS } from '../ExpiryAlert';

test('the alert icon is a square grid of known pixels', () => {
  for (const row of ALERT_PIXELS) {
    expect(row).toHaveLength(ALERT_PIXELS.length);
    expect(row).toMatch(/^[.rws]+$/);
  }
});
