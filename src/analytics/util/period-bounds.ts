import { AnalyticsQueryDto } from '../dto/analytics-query.dto';

export interface PeriodBounds {
  start: Date;
  end: Date;
}

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
