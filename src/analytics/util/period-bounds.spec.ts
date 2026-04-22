import { getPeriodBounds } from './period-bounds';

describe('getPeriodBounds', () => {
  const FIXED_NOW = new Date(Date.UTC(2026, 3, 15, 10, 30, 0)); // 2026-04-15T10:30:00Z, Wed

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('period=day returns today 00:00:00 to 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'day' });
    expect(start.toISOString()).toBe('2026-04-15T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-15T23:59:59.999Z');
  });

  it('period=week returns Sunday 00:00:00 to Saturday 23:59:59 UTC', () => {
    // 2026-04-15 is a Wednesday → week = 2026-04-12 (Sun) .. 2026-04-18 (Sat)
    const { start, end } = getPeriodBounds({ period: 'week' });
    expect(start.toISOString()).toBe('2026-04-12T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-18T23:59:59.999Z');
  });

  it('period=month returns first day 00:00:00 to last day 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'month' });
    expect(start.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-30T23:59:59.999Z');
  });

  it('period=year returns Jan 1 00:00:00 to Dec 31 23:59:59 UTC', () => {
    const { start, end } = getPeriodBounds({ period: 'year' });
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-31T23:59:59.999Z');
  });

  it('period=custom parses from/to as UTC boundaries', () => {
    const { start, end } = getPeriodBounds({
      period: 'custom',
      from: '2026-03-01',
      to: '2026-03-31',
    });
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-03-31T23:59:59.999Z');
  });
});
