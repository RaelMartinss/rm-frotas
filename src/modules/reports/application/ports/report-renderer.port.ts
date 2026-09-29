import { Readable } from 'stream';

export type ReportFormat = 'csv' | 'pdf' | 'xlsx';

export interface ReportRenderContext {
  clientName: string;
  generatedByName: string;
  generatedAt: Date;
  exportId: string;
}

export interface ReportRenderer<TData = any> {
  readonly reportType: string;
  readonly format: ReportFormat;
  render(data: TData, context: ReportRenderContext): Promise<Readable>;
}

export const REPORT_RENDERERS = Symbol('REPORT_RENDERERS');
