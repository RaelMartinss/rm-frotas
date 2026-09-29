import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { PrismaService } from '../../../../../shared/infrastructure/prisma/prisma.service';
import { UserPayload } from '../../../../auth/infrastructure/strategies/jwt.strategy';
import { ReportFormat, ReportRenderContext } from '../../ports/report-renderer.port';
import { ReportRendererRegistry } from '../../../infrastructure/renderers/report-renderer.registry';
import { CostPerKmSortOption } from '../../../presentation/dto/cost-per-km-query.dto';
import { GetCostPerKmQuery } from '../get-cost-per-km/get-cost-per-km.query';
import { ReportTooLargeForPdfError } from '../../../domain/errors/report-too-large-for-pdf.error';

export const AUDIT_ACTION_REPORT_EXPORTED = 'REPORT_EXPORTED';

export interface ExportCostPerKmInput {
  user: UserPayload;
  clientId: string;
  from: string;
  to: string;
  vehicleId?: string;
  sort?: CostPerKmSortOption;
  format: string;
}

export interface ExportCostPerKmResult {
  stream: Readable;
  filename: string;
  contentType: string;
}

@Injectable()
export class ExportCostPerKmQuery {
  constructor(
    private readonly getCostPerKmQuery: GetCostPerKmQuery,
    private readonly rendererRegistry: ReportRendererRegistry,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: ExportCostPerKmInput): Promise<ExportCostPerKmResult> {
    const { user, clientId, from, to, vehicleId, sort, format } = input;

    // 1. Resolve o renderer antecipadamente (falha cedo com 400 se o formato não for suportado)
    const renderer = this.rendererRegistry.resolve('cost-per-km', format as ReportFormat);

    // 2. Busca todos os dados analíticos despaginados
    const reportData = await this.getCostPerKmQuery.execute({
      clientId,
      from,
      to,
      vehicleId,
      sort,
      unpaginated: true,
    });

    const rowCount = reportData.rows ? reportData.rows.length : 0;
    const maxPdfRows = process.env.REPORTS_PDF_MAX_ROWS
      ? parseInt(process.env.REPORTS_PDF_MAX_ROWS, 10)
      : 300;

    if (format === 'pdf' && rowCount > maxPdfRows) {
      throw new ReportTooLargeForPdfError(rowCount, maxPdfRows);
    }

    // 3. Resolve nome do cliente e do ator autenticado
    const [client, actor] = await Promise.all([
      this.prisma.client.findUnique({
        where: { id: clientId },
        select: { tradeName: true, legalName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true, email: true },
      }),
    ]);

    const clientName = client?.tradeName || client?.legalName || 'Organização';
    let generatedByName = actor?.name || actor?.email || user.email || 'Usuário';
    if (user.impersonating) {
      generatedByName += ' (acesso de suporte)';
    }

    // 4. Gera UUID do documento de auditoria antes da renderização para carimbá-lo no PDF
    const exportId = randomUUID();

    const context: ReportRenderContext = {
      clientName,
      generatedByName,
      generatedAt: new Date(),
      exportId,
    };

    // 5. Renderiza para Buffer/Stream (Se falhar aqui, lança exceção e NÃO grava AuditLog)
    const stream = await renderer.render(reportData, context);

    // 6. Registra no AuditLog após renderização bem-sucedida (para CSV e PDF)
    try {
      await this.prisma.auditLog.create({
        data: {
          id: exportId,
          actorUserId: user.userId,
          impersonationSessionId: user.impersonating
            ? user.impersonationSessionId || null
            : null,
          action: AUDIT_ACTION_REPORT_EXPORTED,
          resourceType: 'REPORT',
          resourceId: exportId,
          metadata: {
            clientId,
            reportType: 'cost-per-km',
            format,
            from,
            to,
            ...(vehicleId ? { vehicleId } : {}),
            rowCount,
          },
        },
      });
    } catch {
      // Falha de auditoria não deve derrubar a entrega do relatório ao usuário
    }

    const filename =
      format === 'pdf'
        ? `custo-por-km_${from}_${to}.pdf`
        : `custo-por-km_${from}_${to}.csv`;

    const contentType =
      format === 'pdf'
        ? 'application/pdf'
        : 'text/csv; charset=utf-8';

    return {
      stream,
      filename,
      contentType,
    };
  }
}
