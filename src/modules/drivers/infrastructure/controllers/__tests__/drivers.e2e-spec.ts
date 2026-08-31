import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { IDriversRepository } from '../../../domain/repositories/drivers.repository';
import { Driver } from '../../../domain/entities/driver.entity';
import { Cpf } from '../../../domain/value-objects/cpf.vo';
import { DriversModule } from '../../../drivers.module';
import { DriverStatus } from '../../../domain/entities/driver-status.enum';
import { Cnh } from '../../../domain/value-objects/cnh.vo';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';


// Repositório em memória isolado para os testes E2E (evita dependência de banco ativo)
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

  async findAll(): Promise<Driver[]> {
    return this.items;
  }
}

describe('DriversController (E2E)', () => {
  let app: INestApplication;
  let repository: InMemoryDriversRepositoryE2E;

  beforeAll(async () => {
    repository = new InMemoryDriversRepositoryE2E();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DriversModule],
    })
      .overrideProvider('IDriversRepository')
      .useValue(repository)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    
    // Habilita a validação global de DTOs via ValidationPipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    repository.items = []; // Limpa o estado entre os testes
  });

  describe('POST /drivers', () => {
    it('deve criar um novo motorista e retornar status 201 com payload formatado', async () => {
      const response = await request(app.getHttpServer())
        .post('/drivers')
        .send({
          name: 'Rael Martins',
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
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(repository.items).toHaveLength(1);
    });

    it('deve retornar 400 Bad Request ao enviar payload com CPF inválido', async () => {
      const response = await request(app.getHttpServer())
        .post('/drivers')
        .send({
          name: 'Motorista Invalido',
          cpf: '111.111.111-11', // CPF com dígitos inválidos
          cnhNumber: '12345678901',
          cnhCategory: 'B',
          cnhExpirationDate: '2030-01-01T00:00:00.000Z',
        });

      expect(response.status).toBe(400);
      expect(repository.items).toHaveLength(0);
    });
  });

  describe('PATCH /drivers/:id/deactivate', () => {
    it('deve desativar um motorista existente e retornar 200 OK', async () => {
      const driver = new Driver({
        name: 'Rael Martins',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2030-01-01')),
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      const response = await request(app.getHttpServer())
        .patch(`/drivers/${driver.getId()}/deactivate`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(DriverStatus.INACTIVE);
      expect(repository.items[0].getStatus()).toBe(DriverStatus.INACTIVE);
    });

    it('deve retornar status 404 Not Found caso o motorista não exista', async () => {
      const response = await request(app.getHttpServer())
        .patch('/drivers/non-existing-id/deactivate')
        .send();

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /drivers/:id/cnh', () => {
    it('deve atualizar a CNH do motorista e retornar 200 OK', async () => {
      const driver = new Driver({
        name: 'Rael Martins',
        cpf: new Cpf('529.982.247-25'),
        cnh: new Cnh('12345678901', 'B', new Date('2025-01-01')),
        status: DriverStatus.ACTIVE,
      });
      await repository.save(driver);

      const response = await request(app.getHttpServer())
        .patch(`/drivers/${driver.getId()}/cnh`)
        .send({
          cnhNumber: '98765432100',
          cnhCategory: 'E',
          cnhExpirationDate: '2035-12-31T00:00:00.000Z',
        });

      expect(response.status).toBe(200);
      expect(response.body.cnh.number).toBe('98765432100');
      expect(response.body.cnh.category).toBe('E');
    });
  });
});