import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { IDriversRepository } from '../../../domain/repositories/drivers.repository';
import { IDriverSuspensionsRepository } from '../../../domain/repositories/driver-suspensions.repository';
import { Driver } from '../../../domain/entities/driver.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import { SuspensionReasonCategory, SuspensionStatus } from '../../../domain/entities/driver-suspension.entity';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import { DomainExceptionFilter } from '../../http/domain-exception.filter';
import { AppModule } from '../../../../../app.module';
import { InMemoryUsersRepository } from '../../../../auth/repositories/in-memory-users.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../../auth/repositories/in-memory-refresh-token-session.repository';
import { InMemoryDriverSuspensionsRepository } from '../../repositories/in-memory-driver-suspensions.repository';
import { DriverAvailabilityChecker } from '../../../domain/services/driver-availability-checker.service';

class InMemoryDriversRepositoryE2E implements IDriversRepository {
  public items: Driver[] = [];

  async save(driver: Driver): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === driver.getId());
    if (index >= 0) {
      this.items[index] = driver;
    } else {
      this.items.push(driver);
    }
  }

  async findById(id: string): Promise<Driver | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findByCpf(cpf: Cpf): Promise<Driver | null> {
    return this.items.find((item) => item.getCpf().equals(cpf)) ?? null;
  }

  async findAll(ownerId?: string): Promise<Driver[]> {
    if (ownerId) {
      return this.items.filter((item) => item.getOwnerId() === ownerId);
    }
    return this.items;
  }

  async findManyPaginated(params: any): Promise<any> {
    let filtered = this.items;
    if (params.ownerId) {
      filtered = filtered.filter((item) => !item.getOwnerId() || item.getOwnerId() === params.ownerId);
    }
    return {
      drivers: filtered.slice((params.page - 1) * params.limit, params.page * params.limit),
      total: filtered.length,
    };
  }
}

describe('DriversController (E2E)', () => {
  let app: INestApplication;
  let repository: InMemoryDriversRepositoryE2E;
  let suspensionsRepository: InMemoryDriverSuspensionsRepository;
  let usersRepository: InMemoryUsersRepository;
  let authToken: string;
  let driverAuthToken: string;
  let ownerUserId: string;

  beforeAll(async () => {
    repository = new InMemoryDriversRepositoryE2E();
    suspensionsRepository = new InMemoryDriverSuspensionsRepository();
    usersRepository = new InMemoryUsersRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IDriversRepository')
      .useValue(repository)
      .overrideProvider('IDriverSuspensionsRepository')
      .useValue(suspensionsRepository)
      .overrideProvider(DriverAvailabilityChecker)
      .useValue(
        new DriverAvailabilityChecker({
          hasActiveTrip: async () => false,
        }),
      )
      .overrideProvider('IUsersRepository')
      .useValue(usersRepository)
      .overrideProvider('IRefreshTokenSessionRepository')
      .useValue(new InMemoryRefreshTokenSessionRepository())
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Fleet Manager',
        email: 'fleet.manager@e2e.com',
        password: 'StrongPass123!',
        role: 'FLEET_MANAGER',
      });

    ownerUserId = registerRes.body.id ?? registerRes.body.user?.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'fleet.manager@e2e.com',
        password: 'StrongPass123!',
      });

    authToken = loginRes.body.accessToken;

    // Registra e faz login com um motorista (DRIVER role) para testes de permissão
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Motorista User',
        email: 'driver.user@e2e.com',
        password: 'StrongPass123!',
        role: 'DRIVER',
      });

    const driverLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'driver.user@e2e.com',
        password: 'StrongPass123!',
      });

    driverAuthToken = driverLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.items = [];
    suspensionsRepository.items = [];
  });

  describe('POST /drivers', () => {
    it('deve criar um novo motorista e retornar status 201 com payload formatado', async () => {
      const response = await request(app.getHttpServer())
        .post('/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Rael Martins',
          email: 'rael.driver@e2e.com',
          cpf: '529.982.247-25',
          cnhNumber: '12345678901',
          cnhCategory: 'AB',
          cnhExpirationDate: '2030-01-01T00:00:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        name: 'Rael Martins',
        cpf: '529.982.247-25',
        cnh: {
          number: '12345678901',
          category: 'AB',
          expirationDate: expect.any(String),
          isExpired: false,
        },
        status: DriverStatus.ACTIVE,
        temporaryPassword: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          name: 'Rael Martins',
          email: 'rael.driver@e2e.com',
          role: 'DRIVER',
        }),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(repository.items).toHaveLength(1);
    });

    it('deve retornar 400 Bad Request ao enviar payload com CPF inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Motorista Invalido',
          email: 'invalido@e2e.com',
          cpf: '111.111.111-11',
          cnhNumber: '12345678901',
          cnhCategory: 'B',
          cnhExpirationDate: '2030-01-01T00:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('CPF informado');
      expect(repository.items).toHaveLength(0);
    });
  });

  describe('POST /drivers/:id/suspend & POST /drivers/:id/lift-suspension', () => {
    it('deve suspender um motorista com sucesso e retornar evento de suspensão', async () => {
      const driver = new Driver({
        name: 'Carlos Condutor',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        ownerId: ownerUserId,
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      const response = await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/suspend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
          expectedReturnDate: '2026-10-30',
          indefinite: false,
          attachmentUrl: 'https://cdn.exemplo.com/cnh.pdf',
        });

      expect(response.status).toBe(200);
      expect(response.body.driverId).toBe(driver.getId());
      expect(response.body.reasonCategory).toBe(SuspensionReasonCategory.CNH_VENCIDA);
      expect(response.body.status).toBe(SuspensionStatus.ATIVA);
      expect(response.body.expectedReturnDate).toBe('2026-10-30');

      const updatedDriver = await repository.findById(driver.getId());
      expect(updatedDriver?.getStatus()).toBe(DriverStatus.SUSPENDED);
    });

    it('deve retornar 403 Forbidden se um usuário com role DRIVER tentar suspender um motorista', async () => {
      const driver = new Driver({
        name: 'Carlos Condutor',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        ownerId: ownerUserId,
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      const response = await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/suspend`)
        .set('Authorization', `Bearer ${driverAuthToken}`)
        .send({
          reasonCategory: SuspensionReasonCategory.CNH_VENCIDA,
          indefinite: true,
        });

      expect(response.status).toBe(403);
    });

    it('deve levantar (encerrar) uma suspensão ativa e reativar o motorista', async () => {
      const driver = new Driver({
        name: 'Carlos Condutor',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        ownerId: ownerUserId,
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      // 1. Suspende
      await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/suspend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reasonCategory: SuspensionReasonCategory.ACIDENTE,
          indefinite: true,
        });

      // 2. Encerra suspensão
      const liftResponse = await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/lift-suspension`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          liftReason: 'Laudo pericial concluído sem culpa do condutor',
        });

      expect(liftResponse.status).toBe(200);
      expect(liftResponse.body.status).toBe(SuspensionStatus.ENCERRADA);
      expect(liftResponse.body.liftReason).toBe('Laudo pericial concluído sem culpa do condutor');

      const reloadedDriver = await repository.findById(driver.getId());
      expect(reloadedDriver?.getStatus()).toBe(DriverStatus.ACTIVE);
    });
  });

  describe('GET /drivers/suspensions/active & GET /drivers/:id/suspensions', () => {
    it('deve retornar lista geral de suspensões ativas para o gestor', async () => {
      const driver = new Driver({
        name: 'Carlos Condutor',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        ownerId: ownerUserId,
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/suspend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reasonCategory: SuspensionReasonCategory.EXAME_TOXICOLOGICO_PENDENTE,
          indefinite: true,
        });

      const response = await request(app.getHttpServer())
        .get('/drivers/suspensions/active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].driverId).toBe(driver.getId());
    });

    it('deve listar o histórico de suspensões de um motorista específico', async () => {
      const driver = new Driver({
        name: 'Carlos Condutor',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        ownerId: ownerUserId,
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      await request(app.getHttpServer())
        .post(`/drivers/${driver.getId()}/suspend`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reasonCategory: SuspensionReasonCategory.DOCUMENTACAO_IRREGULAR,
          indefinite: true,
        });

      const response = await request(app.getHttpServer())
        .get(`/drivers/${driver.getId()}/suspensions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].reasonCategory).toBe(SuspensionReasonCategory.DOCUMENTACAO_IRREGULAR);
    });
  });
});