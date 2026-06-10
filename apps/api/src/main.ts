import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    logger.warn(
      'CORS_ORIGINS is not set (or empty). All cross-origin requests will be blocked. ' +
        'Set CORS_ORIGINS to a comma-separated list of allowed origins (e.g. https://app.example.com) ' +
        'if the frontend is served from a different origin than the API.',
    );
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(configService.get<string>('PORT', '3000'), '0.0.0.0');
}
void bootstrap();
