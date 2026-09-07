import { Injectable, BadRequestException } from '@nestjs/common';
import { IVehiclesRepository } from '../../domain/repositories/vehicles.repository';
import { Vehicle } from '../../domain/entities/vehicle.entity';
import { LicensePlate } from '../../domain/value-objects/license-plate.vo';
import { CsvRowErrorDto, ImportVehiclesResultDto } from '../../infrastructure/http/dtos/import-vehicles-csv.dto';

interface ImportVehiclesCsvInput {
  fileBuffer: Buffer;
  ownerId: string;
}

interface ParsedRow {
  lineNumber: number;
  raw: Record<string, string>;
}

@Injectable()
export class ImportVehiclesCsvUseCase {
  constructor(private readonly vehiclesRepository: IVehiclesRepository) {}

  async execute({ fileBuffer, ownerId }: ImportVehiclesCsvInput): Promise<ImportVehiclesResultDto> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('O arquivo CSV está vazio.');
    }

    // 1. Decodificação segura com suporte a BOM, UTF-8 e Windows-1252 (Excel)
    const content = this.decodeBuffer(fileBuffer);
    const lines = this.splitLines(content);

    if (lines.length === 0) {
      throw new BadRequestException('O arquivo CSV não contém linhas para processamento.');
    }

    // 2. Detecção de delimitador e mapeamento de cabeçalho
    const headerLine = lines[0];
    const delimiter = this.detectDelimiter(headerLine);
    const rawHeaders = this.parseCsvLine(headerLine, delimiter);
    const headerMap = this.mapHeaders(rawHeaders);

    // Valida se as colunas essenciais foram encontradas
    const missingHeaders: string[] = [];
    if (headerMap.plate === undefined) missingHeaders.push('placa');
    if (headerMap.model === undefined) missingHeaders.push('modelo');
    if (headerMap.year === undefined) missingHeaders.push('ano');
    if (headerMap.currentKm === undefined) missingHeaders.push('km / quilometragem');

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Cabeçalhos obrigatórios ausentes no arquivo CSV: ${missingHeaders.join(', ')}. Baixe o modelo para referência.`
      );
    }

    const errors: CsvRowErrorDto[] = [];
    const seenPlatesInFile = new Set<string>();
    const candidateVehicles: {
      lineNumber: number;
      plateFormatted: string;
      brand?: string | null;
      model: string;
      year: number;
      currentKm: number;
      crlvExpiration?: Date | null;
    }[] = [];

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 2;

    // 3. Processamento e validação linha a linha
    let totalDataRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const lineStr = lines[i].trim();
      if (!lineStr) continue; // Pula linhas em branco

      totalDataRows++;
      const lineNumber = i + 1; // 1-indexed (linha 1 é o cabeçalho)
      const rowValues = this.parseCsvLine(lineStr, delimiter);

      const rawPlate = (headerMap.plate !== undefined ? rowValues[headerMap.plate] : '')?.trim() || '';
      const rawBrand = (headerMap.brand !== undefined ? rowValues[headerMap.brand] : '')?.trim() || '';
      const rawModel = (headerMap.model !== undefined ? rowValues[headerMap.model] : '')?.trim() || '';
      const rawYear = (headerMap.year !== undefined ? rowValues[headerMap.year] : '')?.trim() || '';
      const rawKm = (headerMap.currentKm !== undefined ? rowValues[headerMap.currentKm] : '')?.trim() || '';
      const rawCrlv = (headerMap.crlvExpiration !== undefined ? rowValues[headerMap.crlvExpiration] : '')?.trim() || '';

      // Validação da Placa
      if (!rawPlate) {
        errors.push({ linha: lineNumber, motivo: "Campo 'placa' obrigatório está vazio." });
        continue;
      }

      const formattedPlate = rawPlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!LicensePlate.validate(formattedPlate)) {
        errors.push({
          linha: lineNumber,
          placa: rawPlate,
          motivo: `Placa '${rawPlate}' em formato inválido. Formato esperado: ABC1234 ou ABC1D23.`,
        });
        continue;
      }

      // Duplicidade no próprio arquivo
      if (seenPlatesInFile.has(formattedPlate)) {
        errors.push({
          linha: lineNumber,
          placa: rawPlate,
          motivo: `Placa '${rawPlate}' duplicada no próprio arquivo CSV.`,
        });
        continue;
      }
      seenPlatesInFile.add(formattedPlate);

      // Validação do Modelo
      if (!rawModel) {
        errors.push({
          linha: lineNumber,
          placa: rawPlate,
          motivo: "Campo 'modelo' obrigatório está vazio.",
        });
        continue;
      }

      // Validação do Ano
      const yearNum = parseInt(rawYear, 10);
      if (isNaN(yearNum) || yearNum < 1900 || yearNum > maxYear) {
        errors.push({
          linha: lineNumber,
          placa: rawPlate,
          motivo: `Ano '${rawYear}' inválido. Deve ser um número entre 1900 e ${maxYear}.`,
        });
        continue;
      }

      // Validação de Quilometragem
      const hasNegative = rawKm.includes('-');
      const kmNum = parseInt(rawKm.replace(/[^\d-]/g, ''), 10);
      if (isNaN(kmNum) || kmNum < 0 || hasNegative) {
        errors.push({
          linha: lineNumber,
          placa: rawPlate,
          motivo: `Quilometragem '${rawKm}' inválida. Deve ser um número maior ou igual a 0.`,
        });
        continue;
      }

      // Validação opcional da Data de Vencimento do CRLV
      let crlvDate: Date | null = null;
      if (rawCrlv) {
        crlvDate = this.parseDate(rawCrlv);
        if (!crlvDate || isNaN(crlvDate.getTime())) {
          errors.push({
            linha: lineNumber,
            placa: rawPlate,
            motivo: `Data de vencimento do CRLV '${rawCrlv}' inválida. Use o formato DD/MM/AAAA ou AAAA-MM-DD.`,
          });
          continue;
        }
      }

      candidateVehicles.push({
        lineNumber,
        plateFormatted: formattedPlate,
        brand: rawBrand || null,
        model: rawModel,
        year: yearNum,
        currentKm: kmNum,
        crlvExpiration: crlvDate,
      });
    }

    if (candidateVehicles.length === 0) {
      return {
        totalLinhas: totalDataRows,
        importadosComSucesso: 0,
        erros: errors,
      };
    }

    // 4. Verificação de placas já existentes no Banco de Dados
    const candidatePlates = candidateVehicles.map((v) => v.plateFormatted);
    const existingPlates = await this.vehiclesRepository.findExistingPlates(candidatePlates);
    const existingPlatesSet = new Set(existingPlates.map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, '')));

    const finalVehiclesToCreate: Vehicle[] = [];

    for (const cand of candidateVehicles) {
      if (existingPlatesSet.has(cand.plateFormatted)) {
        errors.push({
          linha: cand.lineNumber,
          placa: cand.plateFormatted,
          motivo: `Placa '${cand.plateFormatted}' já está cadastrada no sistema.`,
        });
      } else {
        const vehicle = new Vehicle({
          plate: new LicensePlate(cand.plateFormatted),
          brand: cand.brand,
          model: cand.model,
          year: cand.year,
          currentKm: cand.currentKm,
          crlvExpiration: cand.crlvExpiration,
          ownerId: ownerId, // Segurança estrita: sempre atribuído pelo token JWT do usuário autenticado
        });
        finalVehiclesToCreate.push(vehicle);
      }
    }

    // 5. Inserção em lote no repositório
    if (finalVehiclesToCreate.length > 0) {
      await this.vehiclesRepository.createMany(finalVehiclesToCreate);
    }

    // Ordena os erros por número de linha para melhor visualização do usuário
    errors.sort((a, b) => a.linha - b.linha);

    return {
      totalLinhas: totalDataRows,
      importadosComSucesso: finalVehiclesToCreate.length,
      erros: errors,
    };
  }

  /**
   * Decodifica o Buffer lidando com BOM (Byte Order Mark), UTF-8 e Windows-1252 / ISO-8859-1 (Excel).
   */
  private decodeBuffer(buffer: Buffer): string {
    let cleanBuffer = buffer;

    // Detecta e remove UTF-8 BOM (0xEF, 0xBB, 0xBF)
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      cleanBuffer = buffer.subarray(3);
    }
    // Detecta e remove UTF-16 LE BOM (0xFF, 0xFE)
    else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      const decoder = new TextDecoder('utf-16le');
      return decoder.decode(buffer.subarray(2));
    }

    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      return utf8Decoder.decode(cleanBuffer);
    } catch {
      // Fallback para Windows-1252 (comum em arquivos CSV gerados pelo Excel no Windows com acentuação)
      const win1252Decoder = new TextDecoder('windows-1252');
      return win1252Decoder.decode(cleanBuffer);
    }
  }

  private splitLines(content: string): string[] {
    return content.split(/\r\n|\r|\n/);
  }

  private detectDelimiter(headerLine: string): string {
    const commaCount = (headerLine.match(/,/g) || []).length;
    const semicolonCount = (headerLine.match(/;/g) || []).length;
    const tabCount = (headerLine.match(/\t/g) || []).length;

    if (semicolonCount > commaCount && semicolonCount >= tabCount) return ';';
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    return ',';
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Pula escape de aspas duplas ""
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]/g, '');
  }

  private mapHeaders(headers: string[]): {
    plate?: number;
    model?: number;
    brand?: number;
    year?: number;
    currentKm?: number;
    crlvExpiration?: number;
  } {
    const map: {
      plate?: number;
      model?: number;
      brand?: number;
      year?: number;
      currentKm?: number;
      crlvExpiration?: number;
    } = {};

    headers.forEach((header, index) => {
      const norm = this.normalizeHeader(header);

      if (['placa', 'plate', 'licenca', 'licenseplate'].includes(norm)) {
        map.plate = index;
      } else if (['modelo', 'model', 'veiculo', 'vehicle'].includes(norm)) {
        map.model = index;
      } else if (['marca', 'brand', 'fabricante', 'manufacturer'].includes(norm)) {
        map.brand = index;
      } else if (['ano', 'year', 'anofabricacao', 'anomodelo'].includes(norm)) {
        map.year = index;
      } else if (['km', 'currentkm', 'quilometragem', 'kmatual', 'quilometragematual'].includes(norm)) {
        map.currentKm = index;
      } else if (
        ['vencimentocrlv', 'crlvexpiration', 'validadecrlv', 'crlv', 'vencimentodocumento'].includes(norm)
      ) {
        map.crlvExpiration = index;
      }
    });

    return map;
  }

  private parseDate(dateStr: string): Date | null {
    const clean = dateStr.trim();
    if (!clean) return null;

    // Formato DD/MM/AAAA ou DD-MM-AAAA
    const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      return new Date(year, month, day);
    }

    // Formato AAAA-MM-DD
    const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      return new Date(year, month, day);
    }

    const timestamp = Date.parse(clean);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }
}
