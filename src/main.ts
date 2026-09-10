import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DomainExceptionFilter } from './modules/drivers/infrastructure/http/domain-exception.filter';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { json, urlencoded } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configura limite de tamanho de payload para suportar upload de fotos de comprovantes (Base64)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Confia no proxy reverso (Render, Cloudflare, NGINX) para obter o IP real do cliente via X-Forwarded-For
  app.set('trust proxy', 1);

  // Headers de segurança HTTP (desativa CSP para permitir documentação Swagger)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());

  const allowedOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
  ];

  // CORS deve ser registrado antes do rate limit para que respostas de erro (429, etc) incluam os headers CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permite requisições sem origin (como mobile apps, curl, health checks) ou origens autorizadas
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('https://localhost') ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('capacitor://')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS.'), false);
      }
    },
    credentials: true,
  });

  // Rate Limiting Global: 300 requisições por minuto por IP (permite múltiplos dispositivos/abas na mesma rede)
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Muitas requisições. Tente novamente em um minuto.' },
    }),
  );

  // Rate Limiting Estrito para rotas sensíveis: 10 tentativas por minuto por IP
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Muitas tentativas. Tente novamente em 1 minuto.' },
  });
  app.use('/v1/auth/login', authLimiter);
  app.use('/v1/me/password', authLimiter);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
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