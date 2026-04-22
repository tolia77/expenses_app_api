import { Granularity } from './period-bounds';

export interface FilledBucket {
  bucket: string; // ISO-8601 UTC
  total: number;
}

export interface BucketRow {
  bucket: Date;
  total: number;
}

// Snap a date to the start of its bucket for the given granularity (UTC).
function truncToGranularity(date: Date, granularity: Granularity): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  switch (granularity) {
    case 'hour':
      return new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
    case 'day':
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    case 'week': {
      // ISO week: Monday = 1, Sunday = 7. Postgres date_trunc('week', ...) uses the same.
      const dow = date.getUTCDay(); // 0=Sun..6=Sat
      const daysSinceMonday = (dow + 6) % 7; // Mon=0..Sun=6
      const monday = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      monday.setUTCDate(day - daysSinceMonday);
      return monday;
    }
    case 'month':
      return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }
}

// Advance a date by one bucket step.
function addOneStep(date: Date, granularity: Granularity): Date {
  const next = new Date(date);
  switch (granularity) {
    case 'hour':
      next.setUTCHours(date.getUTCHours() + 1);
      break;
    case 'day':
      next.setUTCDate(date.getUTCDate() + 1);
      break;
    case 'week':
      next.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'month':
      next.setUTCMonth(date.getUTCMonth() + 1);
      break;
  }
  return next;
}

export function generateBuckets(
  start: Date,
  end: Date,
  granularity: Granularity,
): Date[] {
  const buckets: Date[] = [];
  let cursor = truncToGranularity(start, granularity);
  while (cursor.getTime() <= end.getTime()) {
    buckets.push(new Date(cursor));
    cursor = addOneStep(cursor, granularity);
  }
  return buckets;
}

export function fillBuckets(
  rows: BucketRow[],
  buckets: Date[],
): FilledBucket[] {
  const byKey = new Map<string, number>();
  for (const r of rows) {
    byKey.set(r.bucket.toISOString(), r.total);
  }
  return buckets.map((b) => {
    const key = b.toISOString();
    return { bucket: key, total: byKey.get(key) ?? 0 };
  });
}
