import 'dotenv/config';
import { PrismaClient, VehicleStatus, DriverStatus, TripStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed de dados...');

  // Busca ou obtém o usuário gestor
  let user = await prisma.user.findFirst({
    where: { email: 'rael@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Rael Martins',
        email: 'rael@example.com',
        password: '$2b$10$YourHashedPasswordHereOrRegister',
        role: 'FLEET_MANAGER',
      },
    });
  }

  const ownerId = user.id;

  // 1. Seed de Veículos
  const vehiclesData = [
    {
      plate: 'BRA2E19',
      brand: 'Volvo',
      model: 'FH540',
      year: 2022,
      currentKm: 148320,
      crlvExpiration: new Date('2026-10-15T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId,
    },
    {
      plate: 'ABC1D23',
      brand: 'Toyota',
      model: 'Corolla GLi',
      year: 2023,
      currentKm: 34500,
      crlvExpiration: new Date('2026-09-13T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId,
    },
    {
      plate: 'DEF5E67',
      brand: 'Toyota',
      model: 'Hilux CD',
      year: 2022,
      currentKm: 62100,
      crlvExpiration: new Date('2026-11-20T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId,
    },
    {
      plate: 'GHI9F01',
      brand: 'Fiat',
      model: 'Ducato Maxi',
      year: 2021,
      currentKm: 89400,
      crlvExpiration: new Date('2026-12-05T00:00:00.000Z'),
      status: VehicleStatus.IN_MAINTENANCE,
      ownerId,
    },
    {
      plate: 'XYZ9G87',
      brand: 'Ford',
      model: 'Ranger Limited',
      year: 2024,
      currentKm: 21800,
      crlvExpiration: new Date('2026-09-28T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId,
    },
    {
      plate: 'JKL3H45',
      brand: 'Scania',
      model: 'R450',
      year: 2020,
      currentKm: 230000,
      crlvExpiration: new Date('2026-08-28T00:00:00.000Z'),
      status: VehicleStatus.AVAILABLE,
      ownerId,
    },
  ];

  for (const v of vehiclesData) {
    await prisma.vehicle.upsert({
      where: { plate: v.plate },
      update: v,
      create: v,
    });
  }

  console.log(`✅ ${vehiclesData.length} veículos semeados/atualizados com sucesso!`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
