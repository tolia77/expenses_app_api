import { Expose, Type } from 'class-transformer';

export class PaginationMeta {
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
}

/**
 * Factory for a typed paginated response. Returns a class (not an instance)
 * with @Expose + @Type decorators on `data` and `meta` so that the global
 * ClassSerializerInterceptor recurses into `data[]` and applies the entity's
 * own @Expose/@Exclude rules. A plain { data, meta } object would NOT get
 * entity-level serialization (RESEARCH.md Section 3).
 *
 * Usage:
 *   const klass = Paginated(Receipt);
 *   return Object.assign(new klass(), { data: receipts, meta: { total, page, limit } });
 */
export function Paginated<T>(itemType: new (...args: any[]) => T) {
  class PaginatedResponseHost {
    @Expose()
    @Type(() => itemType)
    data: T[];

    @Expose()
    @Type(() => PaginationMeta)
    meta: PaginationMeta;
  }
  return PaginatedResponseHost;
}
