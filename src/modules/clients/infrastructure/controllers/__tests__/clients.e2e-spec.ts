import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../../../../app.module';
import { UserRole } from '../../../../auth/domain/entities/user.entity';
import { InMemoryUsersRepository } from '../../../../auth/repositories/in-memory-users.repository';
import { InMemoryRefreshTokenSessionRepository } from '../../../../auth/repositories/in-memory-refresh-token-session.repository';
import { InMemoryClientsRepository } from '../../../repositories/in-memory-clients.repository';
import { IClientsRepository } from '../../../domain/repositories/clients.repository.interface';
import { DomainExceptionFilter } from '../../../../drivers/infrastructure/http/domain-exception.filter';

describe('Clients Endpoints (E2E)', () => {
  let app: INestApplication;
  let usersRepository: InMemoryUsersRepository;
  let refreshTokenSessionRepository: InMemoryRefreshTokenSessionRepository;
  let clientsRepository: InMemoryClientsRepository;
  let superAdminToken: string;

  beforeAll(async () => {
    usersRepository = new InMemoryUsersRepository();
    refreshTokenSessionRepository = new InMemoryRefreshTokenSessionRepository();
    clientsRepository = new InMemoryClientsRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IUsersRepository')
      .useValue(usersRepository)
      .overrideProvider('IRefreshTokenSessionRepository')
      .useValue(refreshTokenSessionRepository)
      .overrideProvider(IClientsRepository)
      .useValue(clientsRepository)
      .compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new DomainExceptionFilter());

    await app.init();

    // Cria e autentica um SUPER_ADMIN
    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        name: 'Super Admin',
        email: 'superadmin@test.com',
        password: 'Password123!',
        role: UserRole.SUPER_ADMIN,
      });

    const loginRes = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'superadmin@test.com',
        password: 'Password123!',
      });

    superAdminToken = loginRes.body.accessToken;
  });

  beforeEach(() => {
    clientsRepository.items = [];
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve testar a rota e o payload do cliente', async () => {
    const payload = {
      legalName: 'Transportadora Silva e Filhos Ltda',
      tradeName: 'Silva Express',
      document: '12.345.678/0001-95',
      billingEmail: 'financeiro@silvaexpress.com.br',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      fleetManagerName: 'Roberto Silva',
      fleetManagerEmail: 'roberto@silvaexpress.com.br',
    };

    const res = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.client.legalName).toBe('Transportadora Silva e Filhos Ltda');
    expect(res.body.client.document).toBe('12.345.678/0001-95');
    expect(res.body.fleetManager.email).toBe('roberto@silvaexpress.com.br');

    // Tentativa duplicada com o mesmo documento (deve retornar 409 Conflict em vez de 500)
    const resDuplicateDoc = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        ...payload,
        fleetManagerEmail: 'outro.email@silvaexpress.com.br',
      });

    expect(resDuplicateDoc.status).toBe(409);
    expect(resDuplicateDoc.body.message).toBe('Já existe um cliente cadastrado com este CNPJ/CPF.');
    expect(resDuplicateDoc.body.error).toBe('Conflict');

    // Tentativa duplicada com o mesmo e-mail de gestor (deve retornar 409 Conflict em vez de 500)
    const resDuplicateEmail = await request(app.getHttpServer())
      .post('/v1/clients')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        ...payload,
        document: '33.000.167/0001-01', // CNPJ diferente válido
      });

    expect(resDuplicateEmail.status).toBe(409);
    expect(resDuplicateEmail.body.message).toBe('O e-mail informado para o Gestor de Frota já está em uso.');
    expect(resDuplicateEmail.body.error).toBe('Conflict');
  });
});
