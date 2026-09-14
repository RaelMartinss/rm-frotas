import { INestApplication, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';

describe('Observability & Health Check (E2E)', () => {
  let app: INestApplication;
  const prismaMock = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Correlation ID / Request ID', () => {
    it('deve gerar um novo x-request-id UUID v4 no header de resposta quando a requisição não trouxer o header', async () => {
      const res = await request(app.getHttpServer()).get('/v1/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('deve reaproveitar o header x-request-id quando for um UUID v4 válido', async () => {
      const validUuid = 'c8b411d3-4567-4890-a123-456789abcdef';

      const res = await request(app.getHttpServer())
        .get('/v1/health')
        .set('x-request-id', validUuid);

      expect(res.headers['x-request-id']).toBe(validUuid);
    });

    it('deve sanitizar e gerar um novo UUID v4 quando o header x-request-id for inválido', async () => {
      const invalidHeader = 'invalid-header-malicious-content-or-too-long';

      const res = await request(app.getHttpServer())
        .get('/v1/health')
        .set('x-request-id', invalidHeader);

      expect(res.headers['x-request-id']).not.toBe(invalidHeader);
      expect(res.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('Health Check (/v1/health)', () => {
    it('deve retornar 200 OK com status "ok" e indicadores de banco e memória quando saudável', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const res = await request(app.getHttpServer()).get('/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.info).toBeDefined();
      expect(res.body.info.database).toBeDefined();
      expect(res.body.info.database.status).toBe('up');
      expect(res.body.info.memory_heap).toBeDefined();
      expect(res.body.info.memory_heap.status).toBe('up');
      expect(res.body.info.memory_rss).toBeDefined();
      expect(res.body.info.memory_rss.status).toBe('up');
    });

    it('deve retornar 503 Service Unavailable quando a conexão com o banco de dados falhar', async () => {
      prismaMock.$queryRaw.mockRejectedValueOnce(new Error('Postgres connection failed'));

      const res = await request(app.getHttpServer()).get('/v1/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('error');
      expect(res.body.error.database).toBeDefined();
      expect(res.body.error.database.status).toBe('down');
      expect(res.body.error.database.message).toBe('Postgres connection failed');
    });
  });
});
