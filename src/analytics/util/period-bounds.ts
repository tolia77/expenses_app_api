import { BadRequestException } from '@nestjs/common';
import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

export interface PeriodBounds {
  start: Date;
  end: Date;
}

export type Granularity = 'hour' | 'day' | 'week' | 'month';
type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

export function getPeriodBounds(dto: AnalyticsQueryDto): PeriodBounds {
  const now = new Date();
  switch (dto.period) {
    case 'day': {
      const start = new Date(now);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'week': {
      const day = now.getUTCDay(); // 0=Sunday
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - day);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      end.setUTCHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
      const end = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );
      return { start, end };
    }
    case 'year': {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
      const end = new Date(
        Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999),
      );
      return { start, end };
    }
    case 'custom': {
      return {
        start: new Date(dto.from + 'T00:00:00.000Z'),
        end: new Date(dto.to + 'T23:59:59.999Z'),
      };
    }
  }
}

const GRANULARITY_RANK: Record<Granularity, number> = {
  hour: 1,
  day: 2,
  week: 3,
  month: 4,
};

// Natural granularity of a period (used as the "floor" — overrides must be strictly finer).
const PERIOD_RANK: Record<Exclude<Period, 'custom'>, number> = {
  day: GRANULARITY_RANK.day,
  week: GRANULARITY_RANK.week,
  month: GRANULARITY_RANK.month,
  year: GRANULARITY_RANK.month + 1, // year > month
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function resolveGranularity(
  period: Period,
  granularity: Granularity | undefined,
  bounds?: PeriodBounds,
): Granularity {
  if (period === 'custom') {
    if (!bounds) {
      throw new BadRequestException(
        'bounds are required when resolving granularity for custom period',
      );
    }
    const spanDays = (bounds.end.getTime() - bounds.start.getTime()) / MS_PER_DAY;

    if (granularity) {
      // Reject anything that would produce zero or one buckets.
      if (granularity === 'month' && spanDays < 60) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      if (granularity === 'week' && spanDays < 14) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      if (granularity === 'day' && spanDays < 2) {
        throw new BadRequestException(
          'granularity must be finer than period span',
        );
      }
      return granularity;
    }

    if (spanDays <= 2) return 'hour';
    if (spanDays < 94) return 'day';
    return 'month';
  }

  const periodRank = PERIOD_RANK[period];

  if (granularity) {
    if (GRANULARITY_RANK[granularity] >= periodRank) {
      throw new BadRequestException('granularity must be finer than period');
    }
    return granularity;
  }

  // Auto-pick: one step finer than the period.
  switch (period) {
    case 'day':
      return 'hour';
    case 'week':
      return 'day';
    case 'month':
      return 'day';
    case 'year':
      return 'month';
  }
}
