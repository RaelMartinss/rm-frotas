import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { COST_PER_KM_READ_REPOSITORY } from '../src/modules/reports/application/ports/cost-per-km-read-repository.port';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';

describe('ReportsController (E2E)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  let managerToken: string;
  let driverToken: string;
  let otherClientManagerToken: string;

  const mockAggregatesClient1 = [
    {
      vehicleId: '11111111-1111-4111-a111-111111111111',
      plate: 'ABC1D23',
      model: 'Hilux',
      year: 2022,
      fuelCost: 2000,
      maintenanceCost: 1000,
      kmStart: 1000,
      kmEnd: 2000,
      validReadingsCount: 2,
    },
    {
      vehicleId: '22222222-2222-4222-a222-222222222222',
      plate: 'DEF4G56',
      model: 'Strada',
      year: 2021,
      fuelCost: 1500,
      maintenanceCost: 500,
      kmStart: 5000,
      kmEnd: 5500,
      validReadingsCount: 2,
    },
    {
      vehicleId: '33333333-3333-4333-a333-333333333333',
      plate: 'GHI7J89',
      model: 'Fiorino',
      year: 2020,
      fuelCost: 3000,
      maintenanceCost: 2000,
      kmStart: 10000,
      kmEnd: 11000,
      validReadingsCount: 2,
    },
  ];

  const mockReadRepo = {
    findAggregates: async ({ clientId, vehicleId }: any) => {
      if (clientId !== 'client-1') return [];
      if (vehicleId) {
        return mockAggregatesClient1.filter((a) => a.vehicleId === vehicleId);
      }
      return mockAggregatesClient1;
    },
  };

  const mockAuditLogs: any[] = [];
  const mockPrisma = {
    vehicle: {
      findFirst: async ({ where }: any) => {
        if (where.clientId === 'client-1' && mockAggregatesClient1.some((v) => v.vehicleId === where.id)) {
          return { id: where.id, clientId: 'client-1' };
        }
        return null;
      },
    },
    client: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'client-1') {
          return { tradeName: 'Empresa Teste LTDA', legalName: 'Empresa Teste LTDA' };
        }
        return null;
      },
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id === 'mgr-1') {
          return { name: 'Gestor Teste', email: 'manager@fleet.com' };
        }
        return null;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        mockAuditLogs.push(data);
        return data;
      },
    },
    $queryRaw: async () => [{ '?column?': 1 }],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(COST_PER_KM_READ_REPOSITORY)
      .useValue(mockReadRepo)
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();

    jwtService = app.get(JwtService);

    managerToken = jwtService.sign({
      sub: 'mgr-1',
      userId: 'mgr-1',
      email: 'manager@fleet.com',
      role: 'FLEET_MANAGER',
      clientId: 'client-1',
    });

    driverToken = jwtService.sign({
      sub: 'drv-1',
      userId: 'drv-1',
      email: 'driver@fleet.com',
      role: 'DRIVER',
      clientId: 'client-1',
    });

    otherClientManagerToken = jwtService.sign({
      sub: 'mgr-2',
      userId: 'mgr-2',
      email: 'other@fleet.com',
      role: 'FLEET_MANAGER',
      clientId: 'client-other',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/reports/cost-per-km - Permissões e Autenticação', () => {
    it('deve retornar 401 se a requisição não trouxer token', async () => {
      await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2026-09-01&to=2026-09-28')
        .expect(401);
    });

    it('deve retornar 403 Forbidden para o role DRIVER', async () => {
      await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2026-09-01&to=2026-09-28')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });

    it('deve retornar 200 OK para o role FLEET_MANAGER com dados do relatório', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2026-09-01&to=2026-09-28')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.period.from).toBe('2026-09-01');
      expect(res.body.period.to).toBe('2026-09-28');
      expect(res.body.summary.fleetComparisonAvailable).toBe(true);
      expect(res.body.rows).toHaveLength(3);
      expect(res.body.rows[0].plate).toBeDefined();
      expect(res.body.rows[0].cpk).toBeDefined();
    });
  });

  describe('Isolamento Multi-Tenant e Validações', () => {
    it('deve retornar 404 ao consultar um vehicleId pertencente a outro cliente', async () => {
      await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2026-09-01&to=2026-09-28&vehicleId=11111111-1111-4111-a111-111111111111')
        .set('Authorization', `Bearer ${otherClientManagerToken}`)
        .expect(404);
    });

    it('deve retornar 400 com REPORT_PERIOD_INVALID quando from > to', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2026-09-28&to=2026-09-01')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(res.body.error).toBe('REPORT_PERIOD_INVALID');
    });

    it('deve retornar 400 quando o período for maior que 366 dias', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km?from=2025-01-01&to=2026-01-05')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(res.body.error).toBe('REPORT_PERIOD_INVALID');
    });
  });

  describe('GET /v1/reports/cost-per-km/export - Exportação de Arquivos', () => {
    it('deve retornar 400 para formato não suportado', async () => {
      await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km/export?from=2026-09-01&to=2026-09-28&format=invalid')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);
    });

    it('deve exportar CSV com headers pt-BR, separador ;, BOM UTF-8 e status 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km/export?from=2026-09-01&to=2026-09-28&format=csv')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="custo-por-km_2026-09-01_2026-09-28.csv"');

      // Validação do BOM e separador ';'
      const text = res.text;
      expect(text.charCodeAt(0)).toBe(0xfeff); // BOM UTF-8
      expect(text).toContain('Placa;Modelo;Ano;Combustível (R$);Manutenção (R$);Custo Total (R$);Km Rodados;CPK (R$/km)');
      expect(text).toContain('ABC1D23;Hilux;2022');
    });

    it('deve exportar PDF com status 200, content-type application/pdf e registrar AuditLog', async () => {
      mockAuditLogs.length = 0; // limpa histórico de logs

      const res = await request(app.getHttpServer())
        .get('/v1/reports/cost-per-km/export?from=2026-09-01&to=2026-09-28&format=pdf')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200)
        .responseType('blob');

      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment; filename="custo-por-km_2026-09-01_2026-09-28.pdf"');

      const buffer = Buffer.from(res.body);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

      // Verifica gravação no AuditLog
      expect(mockAuditLogs).toHaveLength(1);
      const audit = mockAuditLogs[0];
      expect(audit.action).toBe('REPORT_EXPORTED');
      expect(audit.actorUserId).toBe('mgr-1');
      expect(audit.resourceType).toBe('REPORT');
      expect(audit.metadata).toEqual({
        clientId: 'client-1',
        reportType: 'cost-per-km',
        format: 'pdf',
        from: '2026-09-01',
        to: '2026-09-28',
        rowCount: 3,
      });
    });

    it('deve retornar 422 quando quantidade de linhas exceder REPORTS_PDF_MAX_ROWS para PDF', async () => {
      const originalEnv = process.env.REPORTS_PDF_MAX_ROWS;
      process.env.REPORTS_PDF_MAX_ROWS = '2'; // client-1 tem 3 linhas no mock

      try {
        const res = await request(app.getHttpServer())
          .get('/v1/reports/cost-per-km/export?from=2026-09-01&to=2026-09-28&format=pdf')
          .set('Authorization', `Bearer ${managerToken}`)
          .expect(422);

        expect(res.body.error).toBe('REPORT_TOO_LARGE_FOR_PDF');
      } finally {
        if (originalEnv !== undefined) {
          process.env.REPORTS_PDF_MAX_ROWS = originalEnv;
        } else {
          delete process.env.REPORTS_PDF_MAX_ROWS;
        }
      }
    });
  });
});
