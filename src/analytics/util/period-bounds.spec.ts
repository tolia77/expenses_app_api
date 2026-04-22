import { getPeriodBounds, resolveGranularity } from './period-bounds';
import { BadRequestException } from '@nestjs/common';

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

describe('resolveGranularity', () => {
  it('period=day auto-picks hour', () => {
    expect(resolveGranularity('day', undefined)).toBe('hour');
  });

  it('period=week auto-picks day', () => {
    expect(resolveGranularity('week', undefined)).toBe('day');
  });

  it('period=month auto-picks day', () => {
    expect(resolveGranularity('month', undefined)).toBe('day');
  });

  it('period=year auto-picks month', () => {
    expect(resolveGranularity('year', undefined)).toBe('month');
  });

  it('period=custom picks hour for <= 2 day spans', () => {
    const start = new Date('2026-04-10T00:00:00.000Z');
    const end = new Date('2026-04-11T23:59:59.999Z');
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('hour');
  });

  it('period=custom picks day for spans under 94 days', () => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-03-31T23:59:59.999Z'); // 90 days
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('day');
  });

  it('period=custom picks month for long spans', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = new Date('2026-04-01T23:59:59.999Z');
    expect(resolveGranularity('custom', undefined, { start, end })).toBe('month');
  });

  it('honors explicit override when strictly finer than period', () => {
    expect(resolveGranularity('month', 'hour')).toBe('hour');
    expect(resolveGranularity('year', 'day')).toBe('day');
  });

  it('rejects override equal to period granularity', () => {
    expect(() => resolveGranularity('day', 'day')).toThrow(BadRequestException);
    expect(() => resolveGranularity('week', 'week')).toThrow(BadRequestException);
  });

  it('rejects override coarser than period', () => {
    expect(() => resolveGranularity('day', 'month')).toThrow(BadRequestException);
    expect(() => resolveGranularity('week', 'month')).toThrow(BadRequestException);
  });

  it('rejects custom override that does not fit the span', () => {
    const start = new Date('2026-04-10T00:00:00.000Z');
    const end = new Date('2026-04-11T23:59:59.999Z'); // 2 days
    expect(() => resolveGranularity('custom', 'month', { start, end })).toThrow(
      BadRequestException,
    );
  });
});
