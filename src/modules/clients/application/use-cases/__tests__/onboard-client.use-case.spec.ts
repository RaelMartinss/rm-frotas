import { describe, it, expect, beforeEach } from 'vitest';
import { OnboardClientUseCase } from '../onboard-client.use-case';
import { InMemoryClientsRepository } from '../../../repositories/in-memory-clients.repository';
import { InMemoryUsersRepository } from '../../../../auth/repositories/in-memory-users.repository';

describe('OnboardClientUseCase', () => {
  let useCase: OnboardClientUseCase;
  let clientsRepository: InMemoryClientsRepository;
  let usersRepository: InMemoryUsersRepository;

  beforeEach(() => {
    clientsRepository = new InMemoryClientsRepository();
    usersRepository = new InMemoryUsersRepository();
    useCase = new OnboardClientUseCase(clientsRepository, usersRepository);
  });

  it('deve cadastrar novo cliente e criar gestor com o payload exato do usuário', async () => {
    const payload = {
      legalName: 'Transportadora Silva e Filhos Ltda',
      tradeName: 'Silva Express',
      document: '12.345.678/0001-95',
      billingEmail: 'financeiro@silvaexpress.com.br',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      fleetManagerName: 'Roberto Silva',
      fleetManagerEmail: 'roberto@silvaexpress.com.br',
    };

    const result = await useCase.execute(payload);

    expect(result.client.legalName).toBe('Transportadora Silva e Filhos Ltda');
    expect(result.client.document).toBe('12.345.678/0001-95');
    expect(result.fleetManager.email).toBe('roberto@silvaexpress.com.br');
    expect(result.fleetManager.temporaryPassword).toMatch(/^Temp#[0-9A-F]{8}$/);
    expect(clientsRepository.items).toHaveLength(1);
    expect(usersRepository.items).toHaveLength(1);
  });
});
