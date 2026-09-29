import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { ReportFormat, ReportRenderer, ReportRenderContext } from '../../../application/ports/report-renderer.port';
import { CostPerKmReportResponseDto } from '../../../presentation/dto/cost-per-km-response.dto';

@Injectable()
export class CostPerKmCsvRenderer implements ReportRenderer<CostPerKmReportResponseDto> {
  readonly reportType = 'cost-per-km';
  readonly format: ReportFormat = 'csv';

  async render(data: CostPerKmReportResponseDto, _context?: ReportRenderContext): Promise<Readable> {
    const BOM = '\uFEFF';
    const separator = ';';

    const headers = [
      'Placa',
      'Modelo',
      'Ano',
      'Combustível (R$)',
      'Manutenção (R$)',
      'Custo Total (R$)',
      'Km Rodados',
      'CPK (R$/km)',
      'vs Frota (%)',
      'vs Período Anterior (%)',
      'Status',
      'Motivo Insuficiência',
    ].join(separator);

    const statusTranslations: Record<string, string> = {
      OK: 'Normal',
      ABOVE_AVERAGE: 'Acima da Média',
      INSUFFICIENT_DATA: 'Dados Insuficientes',
    };

    const reasonTranslations: Record<string, string> = {
      LOW_KM: 'Baixa Quilometragem (<100 km)',
      NO_READINGS: 'Sem Leituras',
      KM_REGRESSION: 'Regressão de Odômetro',
      KM_OUTLIER: 'Km incompatível com o período',
    };

    const formatCurrencyBr = (val: string | null): string => {
      if (!val || val === '—') return '—';
      return val.replace('.', ',');
    };

    const formatPercentBr = (val: number | null): string => {
      if (val === null || val === undefined) return '—';
      return val.toFixed(1).replace('.', ',') + '%';
    };

    const escapeCsv = (str: string): string => {
      if (str.includes(separator) || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [BOM + headers];

    for (const row of data.rows) {
      const line = [
        escapeCsv(row.plate),
        escapeCsv(row.model),
        row.year.toString(),
        formatCurrencyBr(row.fuelCost),
        formatCurrencyBr(row.maintenanceCost),
        formatCurrencyBr(row.totalCost),
        row.km.toString(),
        row.cpk !== null ? formatCurrencyBr(row.cpk) : '—',
        formatPercentBr(row.deltaVsFleetPercent),
        formatPercentBr(row.deltaVsPreviousPercent),
        statusTranslations[row.status] || row.status,
        row.insufficientReason ? reasonTranslations[row.insufficientReason] || row.insufficientReason : '—',
      ].join(separator);

      lines.push(line);
    }

    const csvContent = lines.join('\r\n');
    return Readable.from([csvContent]);
  }
}
