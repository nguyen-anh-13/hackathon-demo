import 'reflect-metadata';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { env } from './configs/env.config';
import { AllExceptionsFilter } from './errors/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // app.setGlobalPrefix(env.appPrefix);
  app.enableVersioning({
    type: VersioningType.URI
  });

  app.enableCors({
    origin: true,
    credentials: true
  });

  if (env.isProduction) {
    app.use(helmet());
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor()
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (!env.isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Hackathon Demo API')
      .setDescription('Base NestJS API')
      .setVersion('1.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${env.appPrefix}/docs`, app, document);
  }

  await app.listen(env.appPort);
}

void bootstrap();
