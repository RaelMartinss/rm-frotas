import 'dotenv/config';
import { PrismaClient, VehicleStatus, DriverStatus, TripStatus, UserRole, ClientStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed de dados com suporte a Multi-Cliente...');

  // 1. Cria ou obtém a empresa cliente padrão
  const defaultClient = await prisma.client.upsert({
    where: { document: '12345678000195' },
    update: {},
    create: {
      legalName: 'Transportes RM Ltda',
      tradeName: 'RM Frotas Matriz',
      document: '12345678000195',
      billingEmail: 'contato@rmfrotas.com',
      status: ClientStatus.ATIVO,
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
  });
  console.log(`🏢 Cliente padrão: ${defaultClient.tradeName} (${defaultClient.id})`);

  // 2. Cria ou garante o SUPER_ADMIN (sem clientId)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@frotas.com' },
    update: {
      role: UserRole.SUPER_ADMIN,
    },
    create: {
      name: 'Super Administrador',
      email: 'superadmin@frotas.com',
      password: '$2b$10$YourHashedPasswordHereOrRegister',
      role: UserRole.SUPER_ADMIN,
      clientId: null,
      mustChangePassword: false,
    },
  });
  console.log(`👑 Super Admin: ${superAdmin.email} (${superAdmin.id})`);

  // 3. Cria ou garante o FLEET_MANAGER associado ao cliente padrão
  const fleetManager = await prisma.user.upsert({
    where: { email: 'rael@example.com' },
    update: {
      role: UserRole.FLEET_MANAGER,
      clientId: defaultClient.id,
    },
    create: {
      name: 'Rael Martins',
      email: 'rael@example.com',
      password: '$2b$10$YourHashedPasswordHereOrRegister',
      role: UserRole.FLEET_MANAGER,
      clientId: defaultClient.id,
      mustChangePassword: false,
    },
  });
  console.log(`👤 Fleet Manager: ${fleetManager.email} (${fleetManager.id})`);

  // 4. Seed de Veículos para o cliente padrão
  const vehiclesData = [
    {
      plate: 'BRA2E19',
      brand: 'Volvo',
      model: 'FH540',
      year: 2022,
      currentKm: 148320,
      crlvExpiration: new Date('2026-10-15T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
    {
      plate: 'ABC1D23',
      brand: 'Toyota',
      model: 'Corolla GLi',
      year: 2023,
      currentKm: 34500,
      crlvExpiration: new Date('2026-09-13T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
    {
      plate: 'DEF5E67',
      brand: 'Toyota',
      model: 'Hilux CD',
      year: 2022,
      currentKm: 62100,
      crlvExpiration: new Date('2026-11-20T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
    {
      plate: 'GHI9F01',
      brand: 'Fiat',
      model: 'Ducato Maxi',
      year: 2021,
      currentKm: 89400,
      crlvExpiration: new Date('2026-12-05T00:00:00.000Z'),
      status: VehicleStatus.IN_MAINTENANCE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { plate: v.plate },
      update: v,
      create: v,
    });
  }
  console.log(`🚗 ${vehiclesData.length} veículos semeados para o cliente padrão.`);

  // 5. Seed de Motoristas para o cliente padrão
  const driversData = [
    {
      name: 'Carlos Alberto Silva',
      cpf: '12345678901',
      cnhNumber: '11223344556',
      cnhCategory: 'E',
      cnhExpirationDate: new Date('2027-05-20T00:00:00.000Z'),
      status: DriverStatus.ACTIVE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
    {
      name: 'Marcos Vinicius Pereira',
      cpf: '98765432100',
      cnhNumber: '99887766554',
      cnhCategory: 'D',
      cnhExpirationDate: new Date('2026-12-10T00:00:00.000Z'),
      status: DriverStatus.ACTIVE,
      ownerId: fleetManager.id,
      clientId: defaultClient.id,
    },
  ];

  for (const d of driversData) {
    await prisma.driver.upsert({
      where: { cpf: d.cpf },
      update: d,
      create: d,
    });
  }
  console.log(`👨‍✈️ ${driversData.length} motoristas semeados para o cliente padrão.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
