import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Readable } from 'stream';
import { ExportCostPerKmQuery } from '../export-cost-per-km.query';
import { ReportTooLargeForPdfError } from '../../../../domain/errors/report-too-large-for-pdf.error';

describe('ExportCostPerKmQuery', () => {
  let query: ExportCostPerKmQuery;
  let mockGetCostPerKmQuery: any;
  let mockRendererRegistry: any;
  let mockPrisma: any;
  let mockRenderer: any;

  const mockUser = {
    userId: 'user-123',
    email: 'user@test.com',
    role: 'FLEET_MANAGER',
    clientId: 'client-abc',
  };

  beforeEach(() => {
    mockRenderer = {
      format: 'pdf',
      reportType: 'cost-per-km',
      render: vi.fn().mockResolvedValue(Readable.from(['pdf content'])),
    };

    mockRendererRegistry = {
      resolve: vi.fn().mockReturnValue(mockRenderer),
    };

    mockGetCostPerKmQuery = {
      execute: vi.fn().mockResolvedValue({
        period: { from: '2026-09-01', to: '2026-09-28' },
        summary: { fleetCpk: 1.5 },
        rows: [
          { vehicleId: 'v1', plate: 'ABC1234' },
          { vehicleId: 'v2', plate: 'DEF5678' },
        ],
      }),
    };

    mockPrisma = {
      client: {
        findUnique: vi.fn().mockResolvedValue({ tradeName: 'Empresa Teste LTDA' }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({ name: 'Maria Gestora', email: 'maria@test.com' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };

    query = new ExportCostPerKmQuery(
      mockGetCostPerKmQuery,
      mockRendererRegistry,
      mockPrisma,
    );
  });

  it('deve exportar PDF com sucesso, resolvendo contexto e gravando AuditLog', async () => {
    const result = await query.execute({
      user: mockUser as any,
      clientId: 'client-abc',
      from: '2026-09-01',
      to: '2026-09-28',
      format: 'pdf',
    });

    expect(result.filename).toBe('custo-por-km_2026-09-01_2026-09-28.pdf');
    expect(result.contentType).toBe('application/pdf');

    // Contexto passado ao renderer
    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        clientName: 'Empresa Teste LTDA',
        generatedByName: 'Maria Gestora',
        exportId: expect.any(String),
      }),
    );

    // AuditLog registrado
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'REPORT_EXPORTED',
        actorUserId: 'user-123',
        resourceType: 'REPORT',
        metadata: {
          clientId: 'client-abc',
          reportType: 'cost-per-km',
          format: 'pdf',
          from: '2026-09-01',
          to: '2026-09-28',
          rowCount: 2,
        },
      }),
    });
  });

  it('deve anexar sufixo de suporte no nome quando usuário estiver impersonando', async () => {
    const impersonatingUser = {
      ...mockUser,
      impersonating: true,
      impersonationSessionId: 'sess-999',
    };

    await query.execute({
      user: impersonatingUser as any,
      clientId: 'client-abc',
      from: '2026-09-01',
      to: '2026-09-28',
      format: 'pdf',
    });

    expect(mockRenderer.render).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        generatedByName: 'Maria Gestora (acesso de suporte)',
      }),
    );

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        impersonationSessionId: 'sess-999',
      }),
    });
  });

  it('deve lançar ReportTooLargeForPdfError quando número de linhas exceder 300 para PDF', async () => {
    const bigRows = Array.from({ length: 301 }, (_, i) => ({ vehicleId: `v${i}`, plate: `ABC${i}` }));
    mockGetCostPerKmQuery.execute.mockResolvedValueOnce({
      period: { from: '2026-09-01', to: '2026-09-28' },
      summary: {},
      rows: bigRows,
    });

    await expect(
      query.execute({
        user: mockUser as any,
        clientId: 'client-abc',
        from: '2026-09-01',
        to: '2026-09-28',
        format: 'pdf',
      }),
    ).rejects.toThrow(ReportTooLargeForPdfError);

    // Não deve gravar audit log se foi bloqueado antes da renderização
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('deve permitir mais de 300 linhas quando formato for CSV', async () => {
    const bigRows = Array.from({ length: 301 }, (_, i) => ({ vehicleId: `v${i}`, plate: `ABC${i}` }));
    mockGetCostPerKmQuery.execute.mockResolvedValueOnce({
      period: { from: '2026-09-01', to: '2026-09-28' },
      summary: {},
      rows: bigRows,
    });

    mockRenderer.format = 'csv';
    const result = await query.execute({
      user: mockUser as any,
      clientId: 'client-abc',
      from: '2026-09-01',
      to: '2026-09-28',
      format: 'csv',
    });

    expect(result.filename).toBe('custo-por-km_2026-09-01_2026-09-28.csv');
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});
