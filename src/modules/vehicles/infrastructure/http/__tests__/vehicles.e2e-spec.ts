import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Vehicle } from "../../../domain/entities/vehicle.entity";
import { IVehiclesRepository } from "../../../domain/repositories/vehicles.repository";
import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../../../../../app.module";
import request from 'supertest';

class InMemoryVehiclesRepository implements IVehiclesRepository {
    public items: Vehicle[] = [];

    async save(vehicle: Vehicle): Promise<void> {
        this.items.push(vehicle);
    }

    async findById(id: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getId() === id) ?? null;
    }

    async findByPlate(plate: string): Promise<Vehicle | null> {
        return this.items.find((item) => item.getPlate().getValue() === plate) ?? null;
    }
}

describe('Vehicle Controller (E2E)', () => {
    let app: INestApplication;
    let repository: InMemoryVehiclesRepository;

    beforeAll(async () => {
        repository = new InMemoryVehiclesRepository();

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
        .overrideInterceptor(IVehiclesRepository)
        .useValue(repository)
        .compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

        await app.init();

    });

   it('POST /vehicles - deve criar um novo veículo com sucesso (201)', async () => {
        const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send({
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
    it('POST /vehicles - deve retornar 400 se a placa for inválida', async () => {
        const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send({
            plate: 'PLACA-INVALIDA',
            model: 'Volvo FH 540',
            year: 2023,
            currentKm: 15000,
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('InvalidLicensePlateException');
    });

        it('POST /vehicles - deve retornar 409 se tentar cadastrar placa duplicada', async () => {
        // Primeiro cadastro
        await request(app.getHttpServer()).post('/vehicles').send({
        plate: 'ABC-1234',
        model: 'Volvo FH 540',
        year: 2023,
        currentKm: 15000,
        });

        // Segundo cadastro com a mesma placa
        const response = await request(app.getHttpServer())
        .post('/vehicles')
        .send({
            plate: 'ABC-1234',
            model: 'Scania R450',
            year: 2022,
            currentKm: 5000,
        });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('VehicleAlreadyExistsException');
    });
})