import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, CallHandler, ConflictException, UnprocessableEntityException, HttpStatus } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { IdempotencyInterceptor } from '../idempotency.interceptor';
import { IS_IDEMPOTENT_KEY } from '../idempotent.decorator';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let reflectorMock: any;
  let prismaMock: any;
  let contextMock: ExecutionContext;
  let handlerMock: CallHandler;
  let req: any;
  let res: any;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: vi.fn().mockReturnValue(true),
    };

    prismaMock = {
      idempotencyKey: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    req = {
      method: 'POST',
      baseUrl: '/v1',
      path: '/driver-portal/fuel-record',
      route: { path: '/fuel-record' },
      headers: {
        'idempotency-key': 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
      },
      user: {
        userId: 'user-uuid-123',
      },
      body: {
        vehicleId: 'vehicle-1',
        currentKm: 50000,
        liters: 45,
      },
    };

    res = {
      headers: {} as Record<string, string>,
      statusCode: HttpStatus.CREATED,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
    };

    contextMock = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as unknown as ExecutionContext;

    handlerMock = {
      handle: vi.fn().mockReturnValue(of({ message: 'Success', id: 'record-1' })),
    };

    interceptor = new IdempotencyInterceptor(reflectorMock, prismaMock);
  });

  it('deve passar direto sem interceptar se o decorator @Idempotent não estiver presente', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);

    const stream = interceptor.intercept(contextMock, handlerMock);
    const result = await lastValueFrom(stream);

    expect(handlerMock.handle).toHaveBeenCalled();
    expect(prismaMock.idempotencyKey.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Success', id: 'record-1' });
  });

  it('deve passar direto se o header Idempotency-Key não for enviado (retrocompatibilidade)', async () => {
    delete req.headers['idempotency-key'];

    const stream = interceptor.intercept(contextMock, handlerMock);
    const result = await lastValueFrom(stream);

    expect(handlerMock.handle).toHaveBeenCalled();
    expect(prismaMock.idempotencyKey.findUnique).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'Success', id: 'record-1' });
  });

  it('deve registrar PROCESSING, chamar o handler e atualizar para COMPLETED no primeiro envio', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue(null);
    prismaMock.idempotencyKey.create.mockResolvedValue({ id: 'key-1' });
    prismaMock.idempotencyKey.update.mockResolvedValue({});

    const stream = interceptor.intercept(contextMock, handlerMock);
    const result = await lastValueFrom(stream);

    expect(prismaMock.idempotencyKey.findUnique).toHaveBeenCalledWith({
      where: {
        userId_key: {
          userId: 'user-uuid-123',
          key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
        },
      },
    });

    expect(prismaMock.idempotencyKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSING',
          userId: 'user-uuid-123',
          key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
        }),
      }),
    );

    expect(handlerMock.handle).toHaveBeenCalledTimes(1);

    expect(prismaMock.idempotencyKey.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          responseStatus: HttpStatus.CREATED,
          responseBody: { message: 'Success', id: 'record-1' },
        }),
      }),
    );

    expect(result).toEqual({ message: 'Success', id: 'record-1' });
  });

  it('deve devolver resposta cacheada com header Idempotent-Replayed: true para mesma chave e mesmo body', async () => {
    // Calcula o hash exato do body esperado
    const expectedHash = '9372138ad1c59bb7e30dcfeb06072ff7960fc5f2c589083315a6b0c26880020a';

    prismaMock.idempotencyKey.findUnique.mockImplementation(async () => {
      // Simula retorno de registro COMPLETED com o mesmo hash do body
      const crypto = await import('node:crypto');
      const hash = crypto
        .createHash('sha256')
        .update('{"currentKm":50000,"liters":45,"vehicleId":"vehicle-1"}')
        .digest('hex');

      return {
        id: 'key-1',
        key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
        userId: 'user-uuid-123',
        status: 'COMPLETED',
        requestHash: hash,
        responseStatus: 201,
        responseBody: { message: 'Abastecimento registrado com sucesso!', id: 'fuel-100' },
      };
    });

    const stream = interceptor.intercept(contextMock, handlerMock);
    const result = await lastValueFrom(stream);

    expect(handlerMock.handle).not.toHaveBeenCalled();
    expect(res.headers['Idempotent-Replayed']).toBe('true');
    expect(result).toEqual({ message: 'Abastecimento registrado com sucesso!', id: 'fuel-100' });
  });

  it('deve lançar 422 (UnprocessableEntityException) se a mesma chave for reutilizada com body diferente', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
      userId: 'user-uuid-123',
      status: 'COMPLETED',
      requestHash: 'hash-completamente-diferente',
      responseStatus: 201,
      responseBody: { message: 'Outro abastecimento' },
    });

    const stream = interceptor.intercept(contextMock, handlerMock);

    await expect(lastValueFrom(stream)).rejects.toThrow(UnprocessableEntityException);
    expect(handlerMock.handle).not.toHaveBeenCalled();
  });

  it('deve lançar 409 (ConflictException) com Retry-After: 2 para requisição concorrente (status PROCESSING)', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue({
      id: 'key-1',
      key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
      userId: 'user-uuid-123',
      status: 'PROCESSING',
      requestHash: 'qualquer-hash',
    });

    const stream = interceptor.intercept(contextMock, handlerMock);

    await expect(lastValueFrom(stream)).rejects.toThrow(ConflictException);
    expect(res.headers['Retry-After']).toBe('2');
    expect(handlerMock.handle).not.toHaveBeenCalled();
  });

  it('deve lançar 409 com Retry-After: 2 se ocorrer colisão P2002 concorrente no create', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue(null);
    prismaMock.idempotencyKey.create.mockRejectedValue({ code: 'P2002' });

    const stream = interceptor.intercept(contextMock, handlerMock);

    await expect(lastValueFrom(stream)).rejects.toThrow(ConflictException);
    expect(res.headers['Retry-After']).toBe('2');
    expect(handlerMock.handle).not.toHaveBeenCalled();
  });

  it('deve excluir a chave em PROCESSING se o handler falhar, permitindo nova tentativa', async () => {
    prismaMock.idempotencyKey.findUnique.mockResolvedValue(null);
    prismaMock.idempotencyKey.create.mockResolvedValue({ id: 'key-1' });
    prismaMock.idempotencyKey.deleteMany.mockResolvedValue({ count: 1 });

    const error = new Error('Falha no banco ou validação');
    handlerMock.handle.mockReturnValue(throwError(() => error));

    const stream = interceptor.intercept(contextMock, handlerMock);

    await expect(lastValueFrom(stream)).rejects.toThrow('Falha no banco ou validação');

    expect(prismaMock.idempotencyKey.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-uuid-123',
        key: 'd3b07384-d113-46fb-9b29-b4b6ee979be6',
        status: 'PROCESSING',
      },
    });
  });
});
