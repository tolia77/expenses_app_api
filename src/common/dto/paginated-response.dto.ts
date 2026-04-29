import { Expose, Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

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

/**
 * Resolves pagination defaults, runs the caller-supplied fetcher with the
 * computed `skip`/`take`, and assembles a Paginated(itemType) response.
 * The fetcher abstracts over QueryBuilder vs Repository.findAndCount so
 * services can keep their preferred query style.
 *
 * Usage:
 *   return paginate(pagination, Receipt, (skip, take) =>
 *     this.repo.findAndCount({ where, relations, skip, take }),
 *   );
 */
export async function paginate<T>(
  pagination: PaginationDto,
  itemType: new (...args: any[]) => T,
  fetcher: (skip: number, take: number) => Promise<[T[], number]>,
): Promise<{ data: T[]; meta: PaginationMeta }> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const [data, total] = await fetcher((page - 1) * limit, limit);
  const klass = Paginated(itemType);
  return Object.assign(new klass(), { data, meta: { total, page, limit } });
}
