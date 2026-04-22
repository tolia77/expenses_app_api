import { generateBuckets, fillBuckets } from './timeseries-buckets';

describe('generateBuckets', () => {
  it('hourly over a single UTC day produces 24 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-04-15T00:00:00.000Z'),
      new Date('2026-04-15T23:59:59.999Z'),
      'hour',
    );
    expect(buckets).toHaveLength(24);
    expect(buckets[0].toISOString()).toBe('2026-04-15T00:00:00.000Z');
    expect(buckets[23].toISOString()).toBe('2026-04-15T23:00:00.000Z');
  });

  it('daily over April 2026 produces 30 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-30T23:59:59.999Z'),
      'day',
    );
    expect(buckets).toHaveLength(30);
    expect(buckets[0].toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(buckets[29].toISOString()).toBe('2026-04-30T00:00:00.000Z');
  });

  it('monthly over 2026 produces 12 buckets', () => {
    const buckets = generateBuckets(
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-12-31T23:59:59.999Z'),
      'month',
    );
    expect(buckets).toHaveLength(12);
    expect(buckets[0].toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(buckets[11].toISOString()).toBe('2026-12-01T00:00:00.000Z');
  });

  it('weekly aligns to ISO Monday', () => {
    // Span covers 2026-04-12 (Sun) through 2026-05-03 (Sun) — 3+ weeks
    // ISO weeks starting Monday: Mar 30, Apr 6, Apr 13, Apr 20, Apr 27
    const buckets = generateBuckets(
      new Date('2026-04-12T00:00:00.000Z'),
      new Date('2026-05-03T23:59:59.999Z'),
      'week',
    );
    expect(buckets.map((b) => b.toISOString())).toEqual([
      '2026-04-06T00:00:00.000Z',
      '2026-04-13T00:00:00.000Z',
      '2026-04-20T00:00:00.000Z',
      '2026-04-27T00:00:00.000Z',
    ]);
  });

  it('produces output in UTC regardless of local tz', () => {
    const buckets = generateBuckets(
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-03T23:59:59.999Z'),
      'day',
    );
    for (const b of buckets) {
      expect(b.getUTCHours()).toBe(0);
      expect(b.getUTCMinutes()).toBe(0);
    }
  });
});

describe('fillBuckets', () => {
  it('zero-fills every bucket when rows are empty', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-03T00:00:00.000Z'),
    ];
    expect(fillBuckets([], buckets)).toEqual([
      { bucket: '2026-04-01T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-02T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-03T00:00:00.000Z', total: 0 },
    ]);
  });

  it('preserves totals for matched buckets and zero-fills gaps', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
      new Date('2026-04-03T00:00:00.000Z'),
    ];
    const rows = [
      { bucket: new Date('2026-04-01T00:00:00.000Z'), total: 12.34 },
      { bucket: new Date('2026-04-03T00:00:00.000Z'), total: 56.78 },
    ];
    expect(fillBuckets(rows, buckets)).toEqual([
      { bucket: '2026-04-01T00:00:00.000Z', total: 12.34 },
      { bucket: '2026-04-02T00:00:00.000Z', total: 0 },
      { bucket: '2026-04-03T00:00:00.000Z', total: 56.78 },
    ]);
  });

  it('output is ordered ascending by bucket', () => {
    const buckets = [
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-04-02T00:00:00.000Z'),
    ];
    const rows = [
      { bucket: new Date('2026-04-02T00:00:00.000Z'), total: 2 },
      { bucket: new Date('2026-04-01T00:00:00.000Z'), total: 1 },
    ];
    const result = fillBuckets(rows, buckets);
    expect(result[0].bucket).toBe('2026-04-01T00:00:00.000Z');
    expect(result[1].bucket).toBe('2026-04-02T00:00:00.000Z');
  });
});
