import { ClassSerializerInterceptor, Injectable } from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';

/**
 * Extends the stock ClassSerializerInterceptor so that plain objects
 * (those whose prototype is `Object.prototype`) pass through untouched.
 *
 * With `strategy: 'excludeAll'` + `excludeExtraneousValues: true`,
 * class-transformer returns `{}` for any plain object because it has no
 * `@Expose()` metadata. That breaks hand-built responses such as
 * `{ access_token }` (auth), `{ id, email }` (auth/me), and
 * `{ photo_url }` (receipts photo upload). Entities decorated with
 * `@Expose/@Exclude/@Type` still serialize via the normal path.
 */
@Injectable()
export class WhitelistSerializerInterceptor extends ClassSerializerInterceptor {
  transformToPlain(
    plainOrClass: unknown,
    options: ClassTransformOptions,
  ): Record<string, unknown> {
    if (
      plainOrClass &&
      typeof plainOrClass === 'object' &&
      Object.getPrototypeOf(plainOrClass) === Object.prototype
    ) {
      return plainOrClass as Record<string, unknown>;
    }
    return super.transformToPlain(plainOrClass, options);
  }
}
