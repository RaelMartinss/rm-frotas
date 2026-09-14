import { describe, it, expect, beforeEach } from 'vitest';
import { RequestContextService } from '../request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('deve retornar undefined quando acessado fora de um run()', () => {
    expect(service.get()).toBeUndefined();
    expect(service.getRequestId()).toBeUndefined();
    expect(service.getUserId()).toBeUndefined();
    expect(service.getClientId()).toBeUndefined();
  });

  it('deve armazenar e recuperar o requestId dentro de um run()', () => {
    const testId = 'test-request-id-123';
    service.run({ requestId: testId }, () => {
      expect(service.get()).toEqual({ requestId: testId });
      expect(service.getRequestId()).toBe(testId);
    });
  });

  it('deve permitir enriquecer o contexto com userId e clientId via update() sem perder o requestId', () => {
    service.run({ requestId: 'req-abc' }, () => {
      expect(service.getRequestId()).toBe('req-abc');
      expect(service.getUserId()).toBeUndefined();
      expect(service.getClientId()).toBeUndefined();

      service.update({ userId: 'user-1', clientId: 'client-99' });

      expect(service.getRequestId()).toBe('req-abc');
      expect(service.getUserId()).toBe('user-1');
      expect(service.getClientId()).toBe('client-99');
    });
  });

  it('deve manter isolamento de contexto entre requisições concorrentes assíncronas', async () => {
    const task1 = new Promise<void>((resolve) => {
      service.run({ requestId: 'req-1' }, async () => {
        expect(service.getRequestId()).toBe('req-1');
        await new Promise((r) => setTimeout(r, 20));
        service.update({ userId: 'user-1' });
        await new Promise((r) => setTimeout(r, 20));
        expect(service.getRequestId()).toBe('req-1');
        expect(service.getUserId()).toBe('user-1');
        resolve();
      });
    });

    const task2 = new Promise<void>((resolve) => {
      service.run({ requestId: 'req-2' }, async () => {
        expect(service.getRequestId()).toBe('req-2');
        await new Promise((r) => setTimeout(r, 10));
        service.update({ userId: 'user-2' });
        await new Promise((r) => setTimeout(r, 30));
        expect(service.getRequestId()).toBe('req-2');
        expect(service.getUserId()).toBe('user-2');
        resolve();
      });
    });

    await Promise.all([task1, task2]);
  });
});
