import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DomainExceptionFilter } from './modules/drivers/infrastructure/http/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Portal Frotas API')
    .setDescription('API para gestão de frotas e manutenções com DDD e NestJS')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();