import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequestIdMiddleware } from '../request-id.middleware';
import { RequestContextService } from '../request-context.service';
import type { Request, Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let contextService: RequestContextService;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  const setHeaderMock = vi.fn();

  beforeEach(() => {
    contextService = new RequestContextService();
    middleware = new RequestIdMiddleware(contextService);
    setHeaderMock.mockClear();

    req = {
      headers: {},
    };
    res = {
      setHeader: setHeaderMock,
    };
    next = vi.fn();
  });

  it('deve gerar um novo UUID v4 quando x-request-id estiver ausente', () => {
    middleware.use(req as Request, res as Response, next);

    expect(setHeaderMock).toHaveBeenCalledTimes(1);
    const [headerName, generatedId] = setHeaderMock.mock.calls[0];
    expect(headerName).toBe('x-request-id');
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect((req as any).requestId).toBe(generatedId);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve reaproveitar o x-request-id válido fornecido no header', () => {
    const validUuid = '123e4567-e89b-42d3-a456-426614174000';
    req.headers = { 'x-request-id': validUuid };

    middleware.use(req as Request, res as Response, next);

    expect(setHeaderMock).toHaveBeenCalledWith('x-request-id', validUuid);
    expect((req as any).requestId).toBe(validUuid);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('deve gerar um novo UUID quando o header x-request-id for inválido (não for UUID v4)', () => {
    req.headers = { 'x-request-id': 'invalid-not-a-uuid-header-value' };

    middleware.use(req as Request, res as Response, next);

    const generatedId = setHeaderMock.mock.calls[0][1];
    expect(generatedId).not.toBe('invalid-not-a-uuid-header-value');
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('deve gerar um novo UUID quando o header x-request-id exceder 64 caracteres', () => {
    req.headers = { 'x-request-id': 'a'.repeat(70) };

    middleware.use(req as Request, res as Response, next);

    const generatedId = setHeaderMock.mock.calls[0][1];
    expect(generatedId).not.toBe('a'.repeat(70));
    expect(generatedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('deve disponibilizar o requestId dentro do RequestContextService durante o ciclo do next()', () => {
    let capturedRequestId: string | undefined;

    next = vi.fn().mockImplementation(() => {
      capturedRequestId = contextService.getRequestId();
    });

    middleware.use(req as Request, res as Response, next);

    expect(capturedRequestId).toBeDefined();
    expect(capturedRequestId).toBe((req as any).requestId);
  });
});
