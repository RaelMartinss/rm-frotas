import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../../../../../app.module';
import { UserRole } from '../../../domain/entities/user.entity';
import { InMemoryUsersRepository } from '../../../repositories/in-memory-users.repository';

describe('Auth Endpoints (E2E)', () => {
  let app: INestApplication;
  let usersRepository: InMemoryUsersRepository;

  beforeAll(async () => {
    usersRepository = new InMemoryUsersRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IUsersRepository')
      .useValue(usersRepository)
      .compile();

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
  });

  beforeEach(() => {
    usersRepository.items = [];
  });

  afterAll(async () => {
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
        clientId: null,
        clientName: null,
        mustChangePassword: false,
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

  describe('PATCH /users/:id/status', () => {
    it('deve alterar status do usuário para inativo/ativo com sucesso', async () => {
      // 1. Cadastra usuário
      const regRes = await request(app.getHttpServer()).post('/auth/register').send({
        name: 'Carlos Teste',
        email: 'carlos.status@example.com',
        password: 'password123',
        role: UserRole.FLEET_MANAGER,
      });

      // 2. Login para obter token
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        email: 'carlos.status@example.com',
        password: 'password123',
      });
      const token = loginRes.body.accessToken;
      const targetUserId = regRes.body.id;

      // 3. Altera status com { active: false }
      const patchRes = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ active: false })
        .expect(200);

      expect(patchRes.body.status).toBe('INACTIVE');
      expect(patchRes.body.isActive).toBe(false);

      // 4. Reativa com { active: true }
      const reactivateRes = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ active: true })
        .expect(200);

      expect(reactivateRes.body.status).toBe('ACTIVE');
      expect(reactivateRes.body.isActive).toBe(true);
    });
  });
});