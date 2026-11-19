import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger/app-logger';

async function bootstrap(): Promise<void> {
  const logger = new AppLogger();
  const app = await NestFactory.create(AppModule, { logger, bufferLogs: true });
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.enableShutdownHooks();

  if (config.get<string>('TRUST_PROXY', 'false') === 'true') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  app.use((request: Request & { requestId?: string }, response: Response, next: NextFunction) => {
    const incoming = request.header('x-request-id');
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);
    next();
  });

  const allowedOrigins = (config.get<string>('CORS_ORIGINS', 'http://localhost:3000') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAll = allowedOrigins.includes('*');
  app.enableCors({
    origin: allowAll ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );

  const swaggerEnabled = config.get<string>('ENABLE_SWAGGER', config.get<string>('NODE_ENV') === 'production' ? 'false' : 'true') === 'true';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Rescue Portal API')
        .setDescription(
          'Rescue Admin emergency workflow: intake, nearby hospital search, recommendations, comparison, destination selection, and pre-arrival alerts. Demo/simulated integrations are clearly labelled.',
        )
        .setVersion('1.0.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
        .addServer('/api/v1')
        .addTag('Health')
        .addTag('Hospitals & Handover Communication')
        .addTag('Hospital Recommendations')
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
  }

  const port = Number(config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '4000');
  await app.listen(port, '0.0.0.0');
  logger.log(`Rescue Portal API listening on port ${port} (prefix /api/v1)`, 'Bootstrap');
}

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start Rescue Portal API', error);
  process.exit(1);
});
