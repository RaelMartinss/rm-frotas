import 'dotenv/config';
import { PrismaClient, VehicleStatus, DriverStatus, FuelType, MaintenanceType, MaintenanceStatus, OdometerSource, ClientStatus, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando Seed Demonstrativo para Relatórios de Custo por KM...');

  // 1. Garante cliente padrão
  const client = await prisma.client.upsert({
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

  // 2. Garante gestor de frota
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'rael@example.com' },
    update: { clientId: client.id },
    create: {
      name: 'Rael Martins',
      email: 'rael@example.com',
      password: hashedPassword,
      role: UserRole.FLEET_MANAGER,
      clientId: client.id,
      mustChangePassword: false,
    },
  });

  // 3. Garante motorista padrão
  const driver = await prisma.driver.upsert({
    where: { cpf: '12345678901' },
    update: { clientId: client.id, ownerId: manager.id },
    create: {
      name: 'Carlos Alberto Silva',
      cpf: '12345678901',
      cnhNumber: '11223344556',
      cnhCategory: 'E',
      cnhExpirationDate: new Date('2027-05-20T00:00:00.000Z'),
      status: DriverStatus.ACTIVE,
      ownerId: manager.id,
      clientId: client.id,
    },
  });

  // 4. Definição dos 15 veículos demonstrativos
  const demoVehicles = [
    // 1. ABOVE_AVERAGE (+29.9% vs frota): Scania R450 com manutenção pesada
    {
      plate: 'RMA1A01',
      brand: 'Scania',
      model: 'R 450 A6x2 Highline Streamline',
      year: 2022,
      baseKm: 120000,
      prevFuelCost: 11000,
      prevMaintCost: 2000,
      prevKmTraveled: 4500, // CPK ant: 2.88
      currFuelCost: 12500,
      currMaintCost: 6500,
      currKmTraveled: 5000, // CPK atual: 3.80 (+31.9% vs ant)
      caseType: 'ABOVE_AVERAGE',
    },
    // 2. ABOVE_AVERAGE (+38.5% vs frota): Volvo FH540 quebra de transmissão
    {
      plate: 'RMA1A02',
      brand: 'Volvo',
      model: 'FH 540 6x4 Globetrotter Euro 6',
      year: 2023,
      baseKm: 95000,
      prevFuelCost: 14000,
      prevMaintCost: 1500,
      prevKmTraveled: 5200, // CPK ant: 2.98
      currFuelCost: 13800,
      currMaintCost: 9200,
      currKmTraveled: 5500, // CPK atual: 4.18 (+40.2% vs ant)
      caseType: 'ABOVE_AVERAGE',
    },
    // 3. OK (-17.2% vs frota, -4.2% vs ant): Alta eficiência na rota
    {
      plate: 'RMA1A03',
      brand: 'Mercedes-Benz',
      model: 'Actros 2651 LS 6x4 Megaspace',
      year: 2021,
      baseKm: 180000,
      prevFuelCost: 12800,
      prevMaintCost: 1200,
      prevKmTraveled: 5500, // CPK ant: 2.54
      currFuelCost: 13400,
      currMaintCost: 750,
      currKmTraveled: 5800, // CPK atual: 2.44 (-3.9% vs ant)
      caseType: 'OK',
    },
    // 4. OK com VALORES GRANDES: "R$ 123.456,78" de custo total
    {
      plate: 'RMA1A04',
      brand: 'DAF',
      model: 'XF 530 Super Space Cab 6x4',
      year: 2023,
      baseKm: 210000,
      prevFuelCost: 10500,
      prevMaintCost: 5200,
      prevKmTraveled: 5200, // CPK ant: 3.02
      currFuelCost: 68250.00,
      currMaintCost: 55206.78, // Total: R$ 123.456,78
      currKmTraveled: 5500,    // CPK atual: 22.45 — ABOVE_AVERAGE intencional; frota verá ~3.0
      caseType: 'LARGE_VALUES',
    },
    // 5. OK com NOME LONGO DE MODELO: teste de wrapping de texto
    {
      plate: 'RMA1A05',
      brand: 'Mercedes-Benz',
      model: 'Axor 3344 6x4 Plataforma Guindaste Munck Articulado 45T',
      year: 2020,
      baseKm: 145000,
      prevFuelCost: 8900,
      prevMaintCost: 2200,
      prevKmTraveled: 3600, // CPK ant: 3.08
      currFuelCost: 9200,
      currMaintCost: 1800,
      currKmTraveled: 3700, // CPK atual: 2.97 (-3.6% vs ant)
      caseType: 'LONG_NAME',
    },
    // 6. OK Leve (Hilux com CPK de R$ 1.15)
    {
      plate: 'RMA1A06',
      brand: 'Toyota',
      model: 'Hilux CD SRV 4x4 2.8 Diesel Automática',
      year: 2022,
      baseKm: 62000,
      prevFuelCost: 4200,
      prevMaintCost: 500,
      prevKmTraveled: 4000, // CPK ant: 1.17
      currFuelCost: 4500,
      currMaintCost: 350,
      currKmTraveled: 4200, // CPK atual: 1.15 (-1.7% vs ant)
      caseType: 'OK_LIGHT',
    },
    // 7. OK (Constellation 24.280)
    {
      plate: 'RMA1A07',
      brand: 'Volkswagen',
      model: 'Constellation 24.280 V-Tronic 6x2',
      year: 2021,
      baseKm: 165000,
      prevFuelCost: 9800,
      prevMaintCost: 1400,
      prevKmTraveled: 4000, // CPK ant: 2.80
      currFuelCost: 10400,
      currMaintCost: 1250,
      currKmTraveled: 4100, // CPK atual: 2.84 (+1.4% vs ant)
      caseType: 'OK',
    },
    // 8. OK (Iveco Stralis 560)
    {
      plate: 'RMA1A08',
      brand: 'Iveco',
      model: 'Stralis Hi-Way 560 6x4 Euro 5',
      year: 2020,
      baseKm: 230000,
      prevFuelCost: 13500,
      prevMaintCost: 1900,
      prevKmTraveled: 5000, // CPK ant: 3.08
      currFuelCost: 14100,
      currMaintCost: 1750,
      currKmTraveled: 5200, // CPK atual: 3.05 (-1.0% vs ant)
      caseType: 'OK',
    },
    // 9. OK (Scania P 310 Bitruck)
    {
      plate: 'RMA1A09',
      brand: 'Scania',
      model: 'P 310 8x2 Bitruck Baú Frigorífico Thermo King',
      year: 2022,
      baseKm: 110000,
      prevFuelCost: 11200,
      prevMaintCost: 1100,
      prevKmTraveled: 4600, // CPK ant: 2.67
      currFuelCost: 11800,
      currMaintCost: 950,
      currKmTraveled: 4700, // CPK atual: 2.71 (+1.5% vs ant)
      caseType: 'OK',
    },
    // 10. OK (Volvo VM 270)
    {
      plate: 'RMA1A10',
      brand: 'Volvo',
      model: 'VM 270 6x2 Furgão Carga Seca',
      year: 2021,
      baseKm: 138000,
      prevFuelCost: 9400,
      prevMaintCost: 1200,
      prevKmTraveled: 4000, // CPK ant: 2.65
      currFuelCost: 9800,
      currMaintCost: 800,
      currKmTraveled: 4000, // CPK atual: 2.65 (0% vs ant)
      caseType: 'OK',
    },
    // 11. INSUFFICIENT_DATA (LOW_KM): Menos de 100 km rodados no período (rodou apenas 45 km)
    {
      plate: 'RMA1A11',
      brand: 'Fiat',
      model: 'Strada Endurance 1.4 Fire Cabine Plus',
      year: 2023,
      baseKm: 18500,
      prevFuelCost: 1200,
      prevMaintCost: 200,
      prevKmTraveled: 1500,
      currFuelCost: 450,
      currMaintCost: 120,
      currKmTraveled: 45, // < 100 km! -> LOW_KM
      caseType: 'LOW_KM',
    },
    // 12. INSUFFICIENT_DATA (NO_READINGS): Sem nenhuma leitura de odômetro no período
    {
      plate: 'RMA1A12',
      brand: 'Renault',
      model: 'Master Furgão Extra L3H2 2.3 dCi',
      year: 2022,
      baseKm: 85000,
      prevFuelCost: 0,
      prevMaintCost: 0,
      prevKmTraveled: 0,
      currFuelCost: 850,
      currMaintCost: 0,
      currKmTraveled: 0, // 0 leituras -> NO_READINGS
      caseType: 'NO_READINGS',
    },
    // 13. INSUFFICIENT_DATA (KM_REGRESSION): Odômetro regressivo (digitado errado 151200 após 152000)
    {
      plate: 'RMA1A13',
      brand: 'Ford',
      model: 'Cargo 1719 Euro V Baú Alumínio',
      year: 2019,
      baseKm: 150000,
      prevFuelCost: 4500,
      prevMaintCost: 800,
      prevKmTraveled: 2000,
      currFuelCost: 3200,
      currMaintCost: 600,
      currKmTraveled: -800, // Regressão! -> KM_REGRESSION
      caseType: 'KM_REGRESSION',
    },
    // 14. ABOVE_AVERAGE (+31.8% vs frota): Delivery 11.180 urbano com manutenção
    {
      plate: 'RMA1A14',
      brand: 'Volkswagen',
      model: 'Delivery 11.180 4x2 Plataforma Auto Socorro',
      year: 2023,
      baseKm: 42000,
      prevFuelCost: 6500,
      prevMaintCost: 800,
      prevKmTraveled: 2500, // CPK ant: 2.92
      currFuelCost: 7400,
      currMaintCost: 4200,
      currKmTraveled: 3000, // CPK atual: 3.87 (+32.5% vs ant)
      caseType: 'ABOVE_AVERAGE',
    },
    // 15. OK Leve (Hyundai HR)
    {
      plate: 'RMA1A15',
      brand: 'Hyundai',
      model: 'HR 2.5 Turbo Diesel Chassi Longo',
      year: 2021,
      baseKm: 78000,
      prevFuelCost: 3500,
      prevMaintCost: 400,
      prevKmTraveled: 2700, // CPK ant: 1.44
      currFuelCost: 3700,
      currMaintCost: 250,
      currKmTraveled: 2800, // CPK atual: 1.41 (-2.1% vs ant)
      caseType: 'OK_LIGHT',
    },
    // 16. INSUFFICIENT_DATA (KM_OUTLIER): Leitura final digitada com erro
    //     Km real rodado ~5.000 km; digitação errada resulta em kmEnd = 123000 (base 78000 → seria 45000 km rodados = 1607/dia > 1200)
    {
      plate: 'RMA1A16',
      brand: 'Volkswagen',
      model: 'Delivery 6.160 4x2 Baú Seco',
      year: 2022,
      baseKm: 78000,
      prevFuelCost: 3200,
      prevMaintCost: 0,
      prevKmTraveled: 2600, // CPK ant: 1.23
      currFuelCost: 3400,
      currMaintCost: 0,
      currKmTraveled: 45000, // Digitação errada: kmEnd deveria ser ~83000, mas foi registrado como 123000 → KM_OUTLIER
      caseType: 'KM_OUTLIER',
    },
  ];

  console.log(`🚗 Criando/atualizando ${demoVehicles.length} veículos e seu histórico de operações...`);

  for (const item of demoVehicles) {
    // 1. Cria ou atualiza o veículo
    const vehicle = await prisma.vehicle.upsert({
      where: { plate: item.plate },
      update: {
        brand: item.brand,
        model: item.model,
        year: item.year,
        currentKm: item.baseKm + (item.currKmTraveled > 0 ? item.currKmTraveled : 0),
        clientId: client.id,
        ownerId: manager.id,
        status: VehicleStatus.AVAILABLE,
      },
      create: {
        plate: item.plate,
        brand: item.brand,
        model: item.model,
        year: item.year,
        currentKm: item.baseKm + (item.currKmTraveled > 0 ? item.currKmTraveled : 0),
        clientId: client.id,
        ownerId: manager.id,
        status: VehicleStatus.AVAILABLE,
      },
    });

    // Remove registros operacionais antigos deste veículo para garantir determinismo
    await prisma.odometerReading.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.fuelRecord.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.maintenance.deleteMany({ where: { vehicleId: vehicle.id } });

    // 2. Histórico do Período Anterior: Agosto (2026-08-04 a 2026-08-31)
    if (item.prevKmTraveled > 0) {
      // Odômetro antes do período anterior (03/08/2026)
      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: item.baseKm - item.prevKmTraveled - 500,
          currentKm: item.baseKm - item.prevKmTraveled,
          source: OdometerSource.MANUAL,
          sourceId: 'seed-prev-start',
          recordedAt: new Date('2026-08-03T18:00:00.000-03:00'),
        },
      });

      // Abastecimento no período anterior (15/08/2026)
      if (item.prevFuelCost > 0) {
        await prisma.fuelRecord.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            clientId: client.id,
            ownerId: manager.id,
            fuelType: FuelType.DIESEL_S10,
            liters: Math.round(item.prevFuelCost / 6.10),
            pricePerUnit: 6.10,
            totalCost: item.prevFuelCost,
            odometerAtFueling: item.baseKm - Math.round(item.prevKmTraveled / 2),
            gasStation: 'Posto RodoRede Graal',
            fueledAt: new Date('2026-08-15T10:00:00.000-03:00'),
          },
        });
      }

      // Manutenção no período anterior (22/08/2026)
      if (item.prevMaintCost > 0) {
        await prisma.maintenance.create({
          data: {
            vehicleId: vehicle.id,
            clientId: client.id,
            ownerId: manager.id,
            type: MaintenanceType.PREVENTIVA,
            status: MaintenanceStatus.CONCLUIDA,
            description: 'Revisão preventiva programada de filtros e fluidos',
            cost: item.prevMaintCost,
            finishedAt: new Date('2026-08-22T16:00:00.000-03:00'),
          },
        });
      }

      // Odômetro no fim do período anterior (31/08/2026)
      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: item.baseKm - item.prevKmTraveled,
          currentKm: item.baseKm,
          source: OdometerSource.FUEL,
          sourceId: 'seed-prev-end',
          recordedAt: new Date('2026-08-31T20:00:00.000-03:00'),
        },
      });
    }

    // 3. Histórico do Período Atual: Setembro (2026-09-01 a 2026-09-28)
    if (item.caseType === 'NO_READINGS') {
      // Nenhuma leitura no período
      if (item.currFuelCost > 0) {
        await prisma.fuelRecord.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            clientId: client.id,
            ownerId: manager.id,
            fuelType: FuelType.DIESEL_S10,
            liters: 130,
            pricePerUnit: 6.54,
            totalCost: item.currFuelCost,
            odometerAtFueling: item.baseKm,
            gasStation: 'Posto Shell Express',
            fueledAt: new Date('2026-09-10T14:30:00.000-03:00'),
          },
        });
      }
    } else if (item.caseType === 'KM_REGRESSION') {
      // Início com 152.000 km e fim com 151.200 km
      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: item.baseKm - 1000,
          currentKm: 152000,
          source: OdometerSource.MANUAL,
          sourceId: 'seed-curr-start',
          recordedAt: new Date('2026-09-02T08:00:00.000-03:00'),
        },
      });

      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: 152000,
          currentKm: 151200, // Regressão!
          source: OdometerSource.MANUAL,
          sourceId: 'seed-curr-reg',
          recordedAt: new Date('2026-09-25T17:00:00.000-03:00'),
        },
      });

      await prisma.fuelRecord.create({
        data: {
          vehicleId: vehicle.id,
          driverId: driver.id,
          clientId: client.id,
          ownerId: manager.id,
          fuelType: FuelType.DIESEL,
          liters: 500,
          pricePerUnit: 6.40,
          totalCost: item.currFuelCost,
          odometerAtFueling: 151500,
          gasStation: 'Posto Ipiranga Rodo',
          fueledAt: new Date('2026-09-12T11:00:00.000-03:00'),
        },
      });
    } else {
      // Casos normais e LOW_KM: grava leitura inicial e final no período
      const startKm = item.baseKm;
      const endKm = item.baseKm + item.currKmTraveled;

      // Odômetro no início do período (01/09/2026)
      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: startKm - 200,
          currentKm: startKm,
          source: OdometerSource.MANUAL,
          sourceId: 'seed-curr-start',
          recordedAt: new Date('2026-09-01T07:00:00.000-03:00'),
        },
      });

      // Combustível em Setembro
      if (item.currFuelCost > 0) {
        await prisma.fuelRecord.create({
          data: {
            vehicleId: vehicle.id,
            driverId: driver.id,
            clientId: client.id,
            ownerId: manager.id,
            fuelType: item.caseType === 'OK_LIGHT' ? FuelType.DIESEL : FuelType.DIESEL_S10,
            liters: Math.round(item.currFuelCost / 6.15),
            pricePerUnit: 6.15,
            totalCost: item.currFuelCost,
            odometerAtFueling: Math.round(startKm + item.currKmTraveled * 0.4),
            gasStation: 'Posto Petrobras Frota Master',
            fueledAt: new Date('2026-09-12T09:30:00.000-03:00'),
          },
        });
      }

      // Manutenção em Setembro (se houver)
      if (item.currMaintCost > 0) {
        await prisma.maintenance.create({
          data: {
            vehicleId: vehicle.id,
            clientId: client.id,
            ownerId: manager.id,
            type: item.caseType === 'ABOVE_AVERAGE' ? MaintenanceType.CORRETIVA : MaintenanceType.PREVENTIVA,
            status: MaintenanceStatus.CONCLUIDA,
            description:
              item.caseType === 'ABOVE_AVERAGE'
                ? 'Troca de embreagem e reparo emergencial de bicos injetores'
                : item.caseType === 'LARGE_VALUES'
                ? 'Reforma geral de motor e trem de força completa'
                : 'Revisão periódica e substituição de pastilhas de freio',
            cost: item.currMaintCost,
            finishedAt: new Date('2026-09-18T17:30:00.000-03:00'),
          },
        });
      }

      // Odômetro no fim do período (27/09/2026)
      await prisma.odometerReading.create({
        data: {
          vehicleId: vehicle.id,
          clientId: client.id,
          ownerId: manager.id,
          previousKm: startKm,
          currentKm: endKm,
          source: OdometerSource.FUEL,
          sourceId: 'seed-curr-end',
          recordedAt: new Date('2026-09-27T18:00:00.000-03:00'),
        },
      });
    }
  }

  console.log('✅ Seed demonstrativo concluído com sucesso!');
  console.log('📊 Os 15 veículos cobrem:');
  console.log('   • 3 veículos ABOVE_AVERAGE (+29.9%, +38.5%, +31.8% em destaque vermelho)');
  console.log('   • 1 veículo com valor alto (R$ 123.456,78 sem quebra)');
  console.log('   • 1 veículo com nome longo de modelo');
  console.log('   • 4 tipos de INSUFFICIENT_DATA (LOW_KM, NO_READINGS, KM_REGRESSION, KM_OUTLIER)');
  console.log('   • Histórico do período anterior (Agosto/2026) para deltas vs anterior real');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed demonstrativo:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
