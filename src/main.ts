import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationFailedError } from './common/exceptions/domain.errors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // NestJS disables these by default; required for @nestjs/bullmq worker.close() on SIGTERM (SC#4)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.flatMap((err) =>
          Object.entries(err.constraints ?? {}).map(([, message]) => ({
            field: err.property,
            message,
          })),
        );
        return new ValidationFailedError(details);
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
