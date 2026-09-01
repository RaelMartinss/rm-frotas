import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import { AppModule } from '../../../../../app.module';
import { UserRole } from '../../../domain/entities/user.entity';

describe('Auth Endpoints (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Aplica o mesmo pipe de validação global configurado no main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    // Reset related tables in safe Prisma calls so the test suite remains stable
    // in CI and local environments without depending on raw SQL features.
    await prisma.trip.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.driver.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('deve registrar um novo usuário com sucesso (201 Created)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Rael Martins',
          email: 'rael@example.com',
          password: 'password123',
          role: UserRole.FLEET_MANAGER,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Rael Martins');
      expect(response.body.email).toBe('rael@example.com');
      expect(response.body.role).toBe(UserRole.FLEET_MANAGER);
      expect(response.body).not.toHaveProperty('password');
    });

    it('deve retornar 409 Conflict ao tentar cadastrar e-mail duplicado', async () => {
      // Cadastra o primeiro usuário
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Rael Martins',
        email: 'rael@example.com',
        password: 'password123',
        role: UserRole.FLEET_MANAGER,
      });

      // Tenta cadastrar novamente com o mesmo e-mail
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Outro Usuário',
          email: 'rael@example.com',
          password: 'password456',
          role: UserRole.DRIVER,
        })
        .expect(409);

      expect(response.body.message).toContain('Já existe um usuário cadastrado com este e-mail');
    });

    it('deve retornar 400 Bad Request se a senha tiver menos de 6 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Rael Martins',
          email: 'rael@example.com',
          password: '123',
          role: UserRole.FLEET_MANAGER,
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Cadastra um usuário base para os testes de login
      await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Rael Martins',
        email: 'rael@example.com',
        password: 'password123',
        role: UserRole.FLEET_MANAGER,
      });
    });

    it('deve autenticar o usuário e retornar accessToken (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'rael@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        name: 'Rael Martins',
        email: 'rael@example.com',
        role: UserRole.FLEET_MANAGER,
      });
    });

    it('deve retornar 401 Unauthorized se a senha estiver incorreta', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'rael@example.com',
          password: 'senha_errada',
        })
        .expect(401);

      expect(response.body.message).toBe('E-mail ou senha incorretos.');
    });

    it('deve retornar 401 Unauthorized se o e-mail não existir', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'naoexistente@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });
});