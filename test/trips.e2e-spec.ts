import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { IDriversRepository } from '../src/modules/drivers/domain/repositories/drivers.repository';
import { IVehiclesRepository } from '../src/modules/vehicles/domain/repositories/vehicles.repository';
import { ITripsRepository } from '../src/modules/trips/application/repositories/trips-repository.interface';
import { Driver } from '../src/modules/drivers/domain/entities/driver.entity';
import { Cpf } from '../src/modules/drivers/domain/value-objects/cpf.vo';
import { Cnh } from '../src/modules/drivers/domain/value-objects/cnh.vo';
import { DriverStatus } from '../src/modules/drivers/domain/entities/driver-status.enum';
import { Vehicle } from '../src/modules/vehicles/domain/entities/vehicle.entity';
import { LicensePlate } from '../src/modules/vehicles/domain/value-objects/license-plate.vo';
import { Trip } from '../src/modules/trips/domain/entities/trip.entity';

// Repositório em memória para Drivers
class InMemoryDriversRepository implements IDriversRepository {
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

// Repositório em memória para Vehicles
class InMemoryVehiclesRepository implements IVehiclesRepository {
  public items: Vehicle[] = [];

  async create(vehicle: Vehicle): Promise<void> {
    this.items.push(vehicle);
  }

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

// Repositório em memória para Trips
class InMemoryTripsRepository implements ITripsRepository {
  public items: Trip[] = [];

  async create(trip: Trip): Promise<void> {
    this.items.push(trip);
  }

  async findById(id: string): Promise<Trip | null> {
    return this.items.find((item) => item.getId() === id) ?? null;
  }

  async findActiveByDriverId(driverId: string): Promise<Trip | null> {
    return this.items.find((item) => item.getDriverId() === driverId && item.getStatus() === 'IN_PROGRESS') ?? null;
  }

  async findActiveByVehicleId(vehicleId: string): Promise<Trip | null> {
    return this.items.find((item) => item.getVehicleId() === vehicleId && item.getStatus() === 'IN_PROGRESS') ?? null;
  }

  async save(trip: Trip): Promise<void> {
    const index = this.items.findIndex((item) => item.getId() === trip.getId());
    if (index >= 0) {
      this.items[index] = trip;
    } else {
      this.items.push(trip);
    }
  }
}

describe('TripsController (E2E) - Lifecycle', () => {
  let app: INestApplication;
  let createdDriverId: string;
  let createdVehicleId: string;
  let createdTripId: string;
  let driversRepository: InMemoryDriversRepository;
  let vehiclesRepository: InMemoryVehiclesRepository;
  let tripsRepository: InMemoryTripsRepository;

  beforeAll(async () => {
    driversRepository = new InMemoryDriversRepository();
    vehiclesRepository = new InMemoryVehiclesRepository();
    tripsRepository = new InMemoryTripsRepository();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('IDriversRepository')
      .useValue(driversRepository)
      .overrideProvider(IVehiclesRepository)
      .useValue(vehiclesRepository)
      .overrideProvider('ITripsRepository')
      .useValue(tripsRepository)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // 1. Cria um motorista válido para o teste
    const driverRes = await request(app.getHttpServer())
      .post('/drivers')
      .send({
        name: 'João Silva',
        cpf: '529.982.247-25',
        cnhNumber: '98765432100',
        cnhCategory: 'D',
        cnhExpirationDate: '2030-01-01',
      });
    createdDriverId = driverRes.body.id;

    // 2. Cria um veículo disponível para o teste
    const vehicleRes = await request(app.getHttpServer())
      .post('/vehicles')
      .send({
        plate: 'ABC1D23',
        model: 'Volvo FH 540',
        year: 2022,
        currentKm: 50000,
      });
    createdVehicleId = vehicleRes.body.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('deve realizar o ciclo de vida completo de uma viagem: Criar -> Iniciar -> Finalizar', async () => {
    // PASSAGEM 1: POST /trips (Criar viagem)
    const createRes = await request(app.getHttpServer())
      .post('/trips')
      .send({
        driverId: createdDriverId,
        vehicleId: createdVehicleId,
        origin: {
          address: 'Rua das Flores, 100',
          city: 'Paragominas',
          state: 'PA',
        },
        destination: {
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
        },
      })
      .expect(201);

    expect(createRes.body).toHaveProperty('id');
    expect(createRes.body.status).toBe('PLANNED');
    createdTripId = createRes.body.id;

    // PASSAGEM 2: PATCH /trips/:id/start (Iniciar viagem)
    const startRes = await request(app.getHttpServer())
      .patch(`/trips/${createdTripId}/start`)
      .send()
      .expect(200);

    expect(startRes.body.status).toBe('IN_PROGRESS');

    // PASSAGEM 3: PATCH /trips/:id/complete (Finalizar viagem)
    const completeRes = await request(app.getHttpServer())
      .patch(`/trips/${createdTripId}/complete`)
      .send()
      .expect(200);

    expect(completeRes.body.status).toBe('COMPLETED');
  });
});