import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../ opacity /../../../../app.module';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { IVehiclesRepository } from '../../../domain/repositories/vehicles.repository';
import { LicensePlate } from '../../../domain/value-objects/license-plate.vo';

class InMemoryVehiclesRepository implements IVehiclesRepository {
  public items: Vehicle[] = [];

  async save(vehicle: Vehicle): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === vehicle.getId());
    if (index >= 0) {
      this.items[index] = vehicle;
    } else {
      this.items.push(vehicle);
    }
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findByPlate(plate: string): Promise<Vehicle | null> {
    return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
  }

  async findAll(): Promise<Vehicle[]> {
    return this.items;
  }
}

describe('Vehicles Endpoints (E2E)', () => {
  let app: INestApplication;
  let repository: InMemoryVehiclesRepository;

  beforeAll(async () => {
    repository = new InMemoryVehiclesRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IVehiclesRepository)
      .useValue(repository)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: async () => {},
        $disconnect: async () => {},
        onModuleInit: async () => {},
        onModuleDestroy: async () => {},
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    repository.items = [];
  });

  describe('POST /vehicles', () => {
    it('deve criar um novo veículo com sucesso (201)', async () => {
      const response = await request(app.getHttpServer()).post('/vehicles').send({
        plate: 'ABC-1234',
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          plate: 'ABC1234',
          model: 'Volvo FH 540',
          year: 2023,
          currentKm: 15000,
          status: 'AVAILABLE',
        }),
      );
    });

    it('deve retornar 400 se a placa for inválida', async () => {
      const response = await request(app.getHttpServer()).post('/vehicles').send({
        plate: 'PLACA-INVALIDA',
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidLicensePlateException');
    });

    it('deve retornar 409 se tentar cadastrar placa duplicada', async () => {
      await request(app.getHttpServer()).post('/vehicles').send({
        plate: 'ABC-1234',
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      const response = await request(app.getHttpServer()).post('/vehicles').send({
        plate: 'ABC-1234',
        model: 'Scania R450',
        year: 2022,
        currentKm: 5000,
      });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('VehicleAlreadyExistsException');
    });
  });

  describe('GET /vehicles', () => {
    it('deve retornar uma lista vazia quando não houver veículos cadastrados', async () => {
      const response = await request(app.getHttpServer()).get('/vehicles');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('deve retornar a lista de todos os veículos cadastrados', async () => {
      const vehicle1 = new Vehicle({
        plate: new LicensePlate('ABC1234'),
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      const vehicle2 = new Vehicle({
        plate: new LicensePlate('XYZ9876'),
        model: 'Scania R450',
        year: 2022,
        currentKm: 30000,
      });

      await repository.save(vehicle1);
      await repository.save(vehicle2);

      const response = await request(app.getHttpServer()).get('/vehicles');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].plate).toBe('ABC1234');
      expect(response.body[1].plate).toBe('XYZ9876');
    });
  });

  describe('GET /vehicles/:id', () => {
    it('deve retornar um veículo buscando pelo ID com sucesso', async () => {
      const vehicle = new Vehicle({
        plate: new LicensePlate('ABC1234'),
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      await repository.save(vehicle);

      const response = await request(app.getHttpServer()).get(`/vehicles/${vehicle.getId()}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: vehicle.getId(),
          plate: 'ABC1234',
          model: 'Volvo FH 540',
        }),
      );
    });

    it('deve retornar 404 quando o veículo não for encontrado por ID', async () => {
      const response = await request(app.getHttpServer()).get('/vehicles/non-existing-id');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('VehicleNotFoundException');
    });
  });

  describe('GET /vehicles/plate/:plate', () => {
    it('deve retornar um veículo buscando pela placa com sucesso', async () => {
      const vehicle = new Vehicle({
        plate: new LicensePlate('ABC1234'),
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
      });

      await repository.save(vehicle);

      const response = await request(app.getHttpServer()).get('/vehicles/plate/ABC1234');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: vehicle.getId(),
          plate: 'ABC1234',
        }),
      );
    });

    it('deve retornar 404 quando o veículo não for encontrado pela placa', async () => {
      const response = await request(app.getHttpServer()).get('/vehicles/plate/NOTFOUND');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('VehicleNotFoundException');
    });
  });
});