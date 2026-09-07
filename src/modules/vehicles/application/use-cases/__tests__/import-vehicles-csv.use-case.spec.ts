import { describe, it, expect, beforeEach } from 'vitest';
import { ImportVehiclesCsvUseCase } from '../import-vehicles-csv.use-case';
import { InMemoryVehiclesRepository } from '../../../infrastructure/repositories/in-memory-vehicles.repository';
import { Vehicle } from '../../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../../domain/value-objects/license-plate.vo';
import { BadRequestException } from '@nestjs/common';

describe('ImportVehiclesCsvUseCase', () => {
  let repository: InMemoryVehiclesRepository;
  let useCase: ImportVehiclesCsvUseCase;

  beforeEach(() => {
    repository = new InMemoryVehiclesRepository();
    useCase = new ImportVehiclesCsvUseCase(repository);
  });

  it('deve importar arquivo CSV válido com cabeçalhos em português', async () => {
    const csvContent = `placa,marca,modelo,ano,km,vencimento_crlv
ABC1D23,Volvo,FH 540,2023,15000,31/12/2026
XYZ9876,Scania,R450,2022,45000,15/10/2026`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-123',
    });

    expect(result.totalLinhas).toBe(2);
    expect(result.importadosComSucesso).toBe(2);
    expect(result.erros).toHaveLength(0);
    expect(repository.items).toHaveLength(2);
    expect(repository.items[0].getPlate().getValue()).toBe('ABC1D23');
    expect(repository.items[0].getOwnerId()).toBe('owner-123');
  });

  it('deve importar arquivo CSV com delimitador ponto-e-vírgula e cabeçalhos em inglês', async () => {
    const csvContent = `plate;brand;model;year;current_km;crlv_expiration
BRA2E19;Mercedes;Actros;2024;8000;2026-12-31`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-456',
    });

    expect(result.totalLinhas).toBe(1);
    expect(result.importadosComSucesso).toBe(1);
    expect(result.erros).toHaveLength(0);
    expect(repository.items[0].getPlate().getValue()).toBe('BRA2E19');
    expect(repository.items[0].getOwnerId()).toBe('owner-456');
  });

  it('deve lidar corretamente com UTF-8 BOM e acentuação no Excel', async () => {
    const csvContent = `\uFEFFplaca,marca,modelo,ano,km,vencimento_crlv
ABC1234,Mercedes-Benz,Caminhão Baú,2023,10000,`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-123',
    });

    expect(result.importadosComSucesso).toBe(1);
    expect(repository.items[0].getModel()).toBe('Caminhão Baú');
  });

  it('deve validar e relatar erros linha a linha sem abortar os válidos', async () => {
    // Linha 2: Válida
    // Linha 3: Placa inválida (1234567)
    // Linha 4: Ano inválido (ano 1800)
    // Linha 5: Quilometragem inválida (-50)
    // Linha 6: Válida
    const csvContent = `placa,marca,modelo,ano,km,vencimento_crlv
ABC1D23,Volvo,FH 540,2023,15000,
1234567,Scania,R450,2022,45000,
BRA2E19,Mercedes,Actros,1800,8000,
KLD9012,DAF,XF,2021,-50,
XYZ9876,Iveco,Hi-Way,2020,30000,`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-123',
    });

    expect(result.totalLinhas).toBe(5);
    expect(result.importadosComSucesso).toBe(2);
    expect(result.erros).toHaveLength(3);

    expect(result.erros[0].linha).toBe(3);
    expect(result.erros[0].motivo).toContain('formato inválido');

    expect(result.erros[1].linha).toBe(4);
    expect(result.erros[1].motivo).toContain('Ano');

    expect(result.erros[2].linha).toBe(5);
    expect(result.erros[2].motivo).toContain('Quilometragem');
  });

  it('deve rejeitar placas duplicadas no próprio arquivo CSV', async () => {
    const csvContent = `placa,marca,modelo,ano,km
ABC1D23,Volvo,FH 540,2023,15000
ABC1D23,Volvo,FH 460,2022,25000`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-123',
    });

    expect(result.totalLinhas).toBe(2);
    expect(result.importadosComSucesso).toBe(1);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].linha).toBe(3);
    expect(result.erros[0].motivo).toContain('duplicada no próprio arquivo');
  });

  it('deve rejeitar placas que já existem no Banco de Dados', async () => {
    await repository.create(
      new Vehicle({
        plate: new LicensePlate('ABC1D23'),
        model: 'Existente',
        year: 2020,
        currentKm: 50000,
      })
    );

    const csvContent = `placa,marca,modelo,ano,km
ABC1D23,Volvo,FH 540,2023,15000
XYZ9876,Scania,R450,2022,45000`;

    const result = await useCase.execute({
      fileBuffer: Buffer.from(csvContent, 'utf-8'),
      ownerId: 'owner-123',
    });

    expect(result.totalLinhas).toBe(2);
    expect(result.importadosComSucesso).toBe(1);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].linha).toBe(2);
    expect(result.erros[0].motivo).toContain('já está cadastrada no sistema');
  });

  it('deve falhar se os cabeçalhos obrigatórios estiverem ausentes', async () => {
    const csvContent = `marca,ano,km
Volvo,2023,15000`;

    await expect(
      useCase.execute({
        fileBuffer: Buffer.from(csvContent, 'utf-8'),
        ownerId: 'owner-123',
      })
    ).rejects.toThrow(BadRequestException);
  });
});
