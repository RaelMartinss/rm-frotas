import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  userId?: string;
  clientId?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly als = new AsyncLocalStorage<RequestContext>();

  /**
   * Acesso estático ao store atual do AsyncLocalStorage.
   * Útil para serializers e callbacks onde a injeção não está diretamente acessível.
   */
  static getStore(): RequestContext | undefined {
    return RequestContextService.als.getStore();
  }

  static currentRequestId(): string | undefined {
    return RequestContextService.als.getStore()?.requestId;
  }

  /**
   * Executa a função passada dentro de um novo contexto de AsyncLocalStorage.
   * Deve ser chamado apenas pelo RequestIdMiddleware no início da requisição.
   */
  run<T>(context: RequestContext, fn: () => T): T {
    return RequestContextService.als.run(context, fn);
  }

  /**
   * Retorna o contexto atual da requisição.
   */
  get(): RequestContext | undefined {
    return RequestContextService.als.getStore();
  }

  /**
   * Retorna o requestId atual se disponível.
   */
  getRequestId(): string | undefined {
    return this.get()?.requestId;
  }

  /**
   * Retorna o userId autenticado se disponível.
   */
  getUserId(): string | undefined {
    return this.get()?.userId;
  }

  /**
   * Retorna o clientId do usuário se disponível.
   */
  getClientId(): string | undefined {
    return this.get()?.clientId;
  }

  /**
   * Enriquece o contexto existente com dados de autenticação (userId, clientId).
   * Não cria um novo run isolado, preservando o requestId original.
   */
  update(partial: { userId?: string; clientId?: string }): void {
    const store = this.get();
    if (store) {
      if (partial.userId !== undefined) {
        store.userId = partial.userId;
      }
      if (partial.clientId !== undefined) {
        store.clientId = partial.clientId;
      }
    }
  }
}
