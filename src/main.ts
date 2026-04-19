import { NestFactory } from '@nestjs/core';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppException } from './common/exceptions/app.exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
        return new AppException(
          'VALIDATION_FAILED',
          'Validation failed',
          HttpStatus.BAD_REQUEST,
          details,
        );
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
