/**
 * Seed de larga escala para o RM Frotas.
 *
 * Mapeamento exato dos modelos e enums conforme prisma/schema.prisma:
 * - User: id, name, email, password, role, status, createdAt, updatedAt
 * - Vehicle: id, plate, brand, model, year, currentKm, crlvExpiration, status, ownerId
 * - Driver: id, name, cpf, cnhNumber, cnhCategory, cnhExpirationDate, status, ownerId, userId
 * - Trip: id, driverId, vehicleId, originAddress, originCity, originState, originLatitude,
 *         originLongitude, destinationAddress, destinationCity, destinationState,
 *         destinationLatitude, destinationLongitude, status, startedAt, completedAt
 *
 * Uso:
 *   npx tsx prisma/seed-large.ts
 *
 * Configuração de volume via variáveis de ambiente (valores default abaixo):
 *   SEED_OWNERS=20 SEED_VEHICLES=200000 SEED_DRIVERS=50000 SEED_TRIPS=500000 npx tsx prisma/seed-large.ts
 */

import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  VehicleStatus,
  DriverStatus,
  TripStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';
import { randomUUID } from 'node:crypto';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter, log: [] }); // sem log de query para alta performance em inserts em lote

// Limite seguro de batch para respeitar o limite de 65.535 parâmetros do PostgreSQL
const BATCH_SIZE = 2000;

const TOTAL_OWNERS = Number(process.env.SEED_OWNERS ?? 20);
const TOTAL_VEHICLES = Number(process.env.SEED_VEHICLES ?? 200_000);
const TOTAL_DRIVERS = Number(process.env.SEED_DRIVERS ?? 50_000);
const TOTAL_TRIPS = Number(process.env.SEED_TRIPS ?? 500_000);

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const CNH_CATEGORIES = ['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function insertInBatches<T>(
  label: string,
  items: T[],
  insertFn: (batch: T[]) => Promise<unknown>
) {
  const batches = chunk(items, BATCH_SIZE);
  const start = Date.now();
  for (let i = 0; i < batches.length; i++) {
    await insertFn(batches[i]);
    const processed = Math.min((i + 1) * BATCH_SIZE, items.length);
    const percent = ((processed / items.length) * 100).toFixed(0);
    process.stdout.write(`\r⏳ ${label}: ${processed}/${items.length} (${percent}%)`);
  }
  console.log(`\n✅ ${label} concluído em ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

/**
 * Gera placa Mercosul única garantida por índice
 */
function generateMercosulPlate(index: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l1 = letters[Math.floor(index / (26 * 26 * 10 * 26 * 100)) % 26];
  const l2 = letters[Math.floor(index / (26 * 10 * 26 * 100)) % 26];
  const l3 = letters[Math.floor(index / (10 * 26 * 100)) % 26];
  const n1 = Math.floor(index / (26 * 100)) % 10;
  const l4 = letters[Math.floor(index / 100) % 26];
  const n2 = String(index % 100).padStart(2, '0');
  return `${l1}${l2}${l3}${n1}${l4}${n2}`;
}

function generateValidCpf(index: number): string {
  const base = String(100_000_000n + BigInt(index % 800_000_000)).padStart(9, '0');
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += parseInt(base.charAt(i), 10) * (10 - i);
  }
  let d1 = 11 - (sum1 % 11);
  if (d1 >= 10) d1 = 0;

  const baseWithD1 = base + d1;
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += parseInt(baseWithD1.charAt(i), 10) * (11 - i);
  }
  let d2 = 11 - (sum2 % 11);
  if (d2 >= 10) d2 = 0;

  return `${base}${d1}${d2}`;
}

async function main() {
  console.log('🚀 Iniciando geração de dados em lote para RM Frotas...');
  console.log(
    `📊 Configuração: ${TOTAL_OWNERS} Gestores | ${TOTAL_VEHICLES} Veículos | ${TOTAL_DRIVERS} Motoristas | ${TOTAL_TRIPS} Viagens\n`
  );

  // 1. Usuários Gestores (Owners)
  console.log('👤 Preparando Gestores (Owners)...');

  // Garante o usuário gestor principal
  await prisma.user.upsert({
    where: { email: 'rael@example.com' },
    update: {},
    create: {
      name: 'Rael Martins (Admin)',
      email: 'rael@example.com',
      password: '$2b$10$YourHashedPasswordHereOrRegister',
      role: UserRole.FLEET_MANAGER,
      status: UserStatus.ACTIVE,
    },
  });

  const additionalOwners = Array.from({ length: TOTAL_OWNERS }, (_, index) => ({
    name: faker.person.fullName(),
    email: `gestor_${index + 1}_${randomUUID().slice(0, 8)}@frotas.com`.toLowerCase(),
    password: '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRS', // hash fake
    role: UserRole.FLEET_MANAGER,
    status: UserStatus.ACTIVE,
  }));

  await insertInBatches('Owners (Usuários Gestores)', additionalOwners, (batch) =>
    prisma.user.createMany({ data: batch, skipDuplicates: true })
  );

  // Busca os IDs REAIS dos gestores existentes no banco
  const dbOwners = await prisma.user.findMany({
    where: { role: UserRole.FLEET_MANAGER },
    select: { id: true },
  });
  const ownerIds = dbOwners.map((u) => u.id);

  if (ownerIds.length === 0) {
    throw new Error('Nenhum usuário gestor encontrado no banco.');
  }
  console.log(`ℹ️ Total de gestores ativos para distribuição: ${ownerIds.length}\n`);

  // 2. Veículos (Vehicles)
  console.log('🚗 Gerando registros de Veículos...');
  const vehicleStatuses = [
    VehicleStatus.AVAILABLE,
    VehicleStatus.AVAILABLE,
    VehicleStatus.AVAILABLE,
    VehicleStatus.IN_USE,
    VehicleStatus.IN_MAINTENANCE,
  ];

  const vehicleIds = Array.from({ length: TOTAL_VEHICLES }, () => randomUUID());
  const vehicles = vehicleIds.map((id, index) => ({
    id,
    plate: generateMercosulPlate(index),
    brand: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    year: faker.number.int({ min: 2015, max: 2026 }),
    currentKm: faker.number.int({ min: 5_000, max: 350_000 }),
    crlvExpiration: faker.date.between({
      from: '2026-01-01T00:00:00.000Z',
      to: '2027-12-31T00:00:00.000Z',
    }),
    status: faker.helpers.arrayElement(vehicleStatuses),
    ownerId: faker.helpers.arrayElement(ownerIds),
  }));

  await insertInBatches('Veículos', vehicles, (batch) =>
    prisma.vehicle.createMany({ data: batch, skipDuplicates: true })
  );
  console.log();

  // 3. Motoristas (Drivers)
  console.log('👨‍✈️ Gerando registros de Motoristas...');
  const driverStatuses = [
    DriverStatus.ACTIVE,
    DriverStatus.ACTIVE,
    DriverStatus.ACTIVE,
    DriverStatus.INACTIVE,
    DriverStatus.SUSPENDED,
  ];

  const driverIds = Array.from({ length: TOTAL_DRIVERS }, () => randomUUID());
  const drivers = driverIds.map((id, index) => ({
    id,
    name: faker.person.fullName(),
    cpf: generateValidCpf(index),
    cnhNumber: String(500_000_000_00n + BigInt(index)).padStart(11, '0'),
    cnhCategory: faker.helpers.arrayElement(CNH_CATEGORIES),
    cnhExpirationDate: faker.date.between({
      from: '2026-01-01T00:00:00.000Z',
      to: '2029-12-31T00:00:00.000Z',
    }),
    status: faker.helpers.arrayElement(driverStatuses),
    ownerId: faker.helpers.arrayElement(ownerIds),
    userId: null,
  }));

  await insertInBatches('Motoristas', drivers, (batch) =>
    prisma.driver.createMany({ data: batch, skipDuplicates: true })
  );
  console.log();

  // 4. Viagens (Trips)
  console.log('🗺️ Gerando registros de Viagens...');

  const trips = Array.from({ length: TOTAL_TRIPS }, () => {
    const started = faker.date.past({ years: 1 });
    const isCompleted = Math.random() > 0.3;
    const completed = isCompleted ? faker.date.soon({ days: 4, refDate: started }) : null;
    const status = completed
      ? TripStatus.COMPLETED
      : faker.helpers.arrayElement([
          TripStatus.IN_PROGRESS,
          TripStatus.PLANNED,
          TripStatus.CANCELLED,
        ]);

    return {
      id: randomUUID(),
      driverId: faker.helpers.arrayElement(driverIds),
      vehicleId: faker.helpers.arrayElement(vehicleIds),
      originAddress: faker.location.streetAddress(),
      originCity: faker.location.city(),
      originState: faker.helpers.arrayElement(BRAZIL_STATES),
      originLatitude: faker.location.latitude({ max: 5, min: -33 }),
      originLongitude: faker.location.longitude({ max: -34, min: -73 }),
      destinationAddress: faker.location.streetAddress(),
      destinationCity: faker.location.city(),
      destinationState: faker.helpers.arrayElement(BRAZIL_STATES),
      destinationLatitude: faker.location.latitude({ max: 5, min: -33 }),
      destinationLongitude: faker.location.longitude({ max: -34, min: -73 }),
      status,
      startedAt: started,
      completedAt: completed,
    };
  });

  await insertInBatches('Viagens', trips, (batch) =>
    prisma.trip.createMany({ data: batch, skipDuplicates: true })
  );

  console.log('\n🎉 Seed em massa concluído com sucesso total!');
}

main()
  .catch((err) => {
    console.error('\n❌ Erro durante o seed em massa:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
