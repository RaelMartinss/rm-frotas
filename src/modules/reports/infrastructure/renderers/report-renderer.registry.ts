import { Inject, Injectable, Optional } from '@nestjs/common';
import { REPORT_RENDERERS, ReportFormat, ReportRenderer } from '../../application/ports/report-renderer.port';
import { ReportFormatNotSupportedError } from '../../domain/errors/report-format-not-supported.error';

@Injectable()
export class ReportRendererRegistry {
  private readonly renderersMap = new Map<string, ReportRenderer>();

  constructor(
    @Optional()
    @Inject(REPORT_RENDERERS)
    renderers: ReportRenderer[] = []
  ) {
    if (renderers) {
      for (const r of renderers) {
        const key = `${r.reportType}:${r.format}`;
        this.renderersMap.set(key, r);
      }
    }
  }

  resolve<TData>(reportType: string, format: ReportFormat): ReportRenderer<TData> {
    const key = `${reportType}:${format}`;
    const renderer = this.renderersMap.get(key);

    if (!renderer) {
      throw new ReportFormatNotSupportedError(format);
    }

    return renderer as ReportRenderer<TData>;
  }
}
