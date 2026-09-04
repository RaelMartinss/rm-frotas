import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DomainExceptionFilter } from './modules/drivers/infrastructure/http/domain-exception.filter';
import cookieParser from 'cookie-parser';




async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
    credentials: true,
  });


  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );


  const config = new DocumentBuilder()
  .setTitle('Portal Frotas API')
  .setDescription('API para gestão de frotas e manutenções com DDD e NestJS')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Insira o token JWT',
      in: 'header',
    },
    'JWT-auth', // nome do esquema — precisa bater com o usado nos controllers
  )
  .addTag('Auth', 'Registro e autenticação de usuários')
  .addTag('Profile', 'Dados do usuário autenticado')
  .addTag('Dashboard', 'Indicadores e resumos consolidados da frota')
  .addTag('Vehicles', 'Gestão de veículos da frota')
  .addTag('Drivers', 'Gestão de motoristas da frota')
  .addTag('Trips', 'Gestão de viagens da frota')
  .build();


  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();