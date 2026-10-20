import {
  cardPose,
  COMMIT_PX,
  dragProgress,
  PEEK,
  releaseAction,
  restingPose,
  rubberBand,
  slotAtX,
  stackGeometry,
} from '../stackGeometry';

const FLY = 200;

describe('stackGeometry', () => {
  test('the front card leaves room for the fanned strips', () => {
    const geo = stackGeometry(360, 5);
    expect(geo.cardW + PEEK * (geo.visible - 1)).toBe(360);
    expect(stackGeometry(360, 1).cardW).toBe(360);
  });
});

describe('restingPose', () => {
  test('the cards behind fan out to the right of the front one', () => {
    expect(restingPose(0, 5)).toEqual({ tx: 0, rotate: 0, scale: 1, opacity: 1, z: 5 });
    expect(restingPose(2, 5).tx).toBe(2 * PEEK);
    expect(restingPose(2, 5).scale).toBeLessThan(restingPose(1, 5).scale);
    expect(restingPose(1, 5).z).toBeLessThan(restingPose(0, 5).z);
  });

  test('only four layers show', () => {
    expect(restingPose(3, 10).opacity).toBe(1);
    expect(restingPose(4, 10).opacity).toBe(0);
  });
});

describe('cardPose', () => {
  test('at rest it is the resting pose of the card slot', () => {
    expect(cardPose(3, 5, 2, 0, 0, FLY)).toEqual(restingPose(1, 5));
    expect(cardPose(0, 5, 2, 1, 0, FLY)).toEqual(restingPose(3, 5));
  });

  test('a finished move lands exactly on the resting pose of the new front card', () => {
    for (let i = 0; i < 5; i++) {
      expect(cardPose(i, 5, 1, 2, 1, FLY)).toEqual(restingPose((i - 3 + 5) % 5, 5));
    }
  });

  test('the leaving card flies out to the left, tilting, in front of the pile', () => {
    const flying = cardPose(0, 5, 0, 1, 0.25, FLY);
    expect(flying.tx).toBeCloseTo(-FLY / 2);
    expect(flying.rotate).toBeLessThan(0);
    expect(flying.z).toBeGreaterThan(5);
  });

  test('then it fades in at the back of the pile', () => {
    expect(cardPose(0, 5, 0, 1, 0.5, FLY)).toMatchObject({ tx: 4 * PEEK, rotate: 0, opacity: 0, z: 1 });
  });

  test('it is invisible at the moment it jumps to the back', () => {
    expect(cardPose(0, 3, 0, 1, 0.4999, FLY).opacity).toBeLessThan(0.01);
    expect(cardPose(0, 3, 0, 1, 0.5, FLY).opacity).toBe(0);
  });

  test('the next card has moved into the front by the time the leaving one is gone', () => {
    expect(cardPose(1, 5, 0, 1, 0.5, FLY)).toEqual(restingPose(0, 5));
  });

  test('selecting a card sends every card in front of it away together', () => {
    expect(cardPose(0, 5, 0, 3, 0.25, FLY).tx).toBeLessThan(0);
    expect(cardPose(2, 5, 0, 3, 0.25, FLY).tx).toBeLessThan(restingPose(2, 5).tx);
    expect(cardPose(3, 5, 0, 3, 0.5, FLY)).toEqual(restingPose(0, 5));
  });

  test('a single card never moves', () => {
    expect(cardPose(0, 1, 0, 1, 0.3, FLY)).toEqual(restingPose(0, 1));
  });

  test('two cards re-queue cleanly', () => {
    expect(cardPose(0, 2, 0, 1, 1, FLY)).toEqual(restingPose(1, 2));
    expect(cardPose(1, 2, 0, 1, 1, FLY)).toEqual(restingPose(0, 2));
  });
});

describe('drag', () => {
  test('the front card tracks the rubber-banded finger to the left', () => {
    const f = dragProgress(-80, FLY);
    expect(cardPose(0, 5, 0, 1, f, FLY).tx).toBeCloseTo(-rubberBand(80));
  });

  test('rightward drags do not advance the stack', () => {
    expect(dragProgress(40, FLY)).toBe(0);
  });
});

describe('releaseAction', () => {
  test('commits on distance', () => {
    expect(releaseAction(-COMMIT_PX, 0)).toBe(1);
    expect(releaseAction(COMMIT_PX, 0)).toBe(-1);
  });

  test('commits a short fast flick', () => {
    expect(releaseAction(-20, -900)).toBe(1);
    expect(releaseAction(20, 900)).toBe(-1);
  });

  test('springs back from a slow short drag', () => {
    expect(releaseAction(-40, -100)).toBe(0);
  });
});

describe('slotAtX', () => {
  const geo = stackGeometry(360, 5);

  test('taps on the front card or the strips to its right', () => {
    expect(slotAtX(geo.cardW - 10, geo)).toBe(0);
    expect(slotAtX(geo.cardW + 10, geo)).toBe(1);
    expect(slotAtX(geo.cardW + PEEK + 10, geo)).toBe(2);
    expect(slotAtX(360, geo)).toBe(3);
  });

  test('never returns a hidden slot', () => {
    expect(slotAtX(400, stackGeometry(360, 1))).toBe(0);
    expect(slotAtX(1000, geo)).toBe(3);
  });
});
