import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ReportFormat, ReportRenderer, ReportRenderContext } from '../../../application/ports/report-renderer.port';
import { CostPerKmReportResponseDto } from '../../../presentation/dto/cost-per-km-response.dto';
import { CostPerKmDocument } from './cost-per-km.document';
import { registerPdfFonts } from './pdf-fonts';

@Injectable()
export class CostPerKmPdfRenderer implements ReportRenderer<CostPerKmReportResponseDto> {
  readonly reportType = 'cost-per-km';
  readonly format: ReportFormat = 'pdf';

  private readonly logger = new Logger(CostPerKmPdfRenderer.name);

  constructor() {
    registerPdfFonts();
  }

  async render(data: CostPerKmReportResponseDto, context: ReportRenderContext): Promise<Readable> {
    const rowCount = data.rows ? data.rows.length : 0;
    const start = performance.now();
    const memBefore = process.memoryUsage().rss;

    const filteredPlate = data.rows && data.rows.length === 1 && data.rows[0].plate ? data.rows[0].plate : undefined;

    const element = React.createElement(CostPerKmDocument, {
      data,
      context,
      filteredPlate,
    });

    const buffer = await renderToBuffer(element as any);

    const duration = performance.now() - start;
    const rssCurrent = process.memoryUsage().rss;
    const rssDiffMb = (rssCurrent - memBefore) / (1024 * 1024);

    this.logger.log(
      `[PDF Render] Concluído em ${duration.toFixed(2)}ms | Linhas: ${rowCount} | Buffer: ${(buffer.length / 1024).toFixed(2)}KB | RSS Atual: ${(rssCurrent / 1024 / 1024).toFixed(2)}MB (Delta: ${rssDiffMb.toFixed(2)}MB)`,
    );

    return Readable.from(buffer);
  }
}
