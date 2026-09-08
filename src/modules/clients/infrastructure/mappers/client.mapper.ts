import { Client as PrismaClientModel, ClientStatus as PrismaClientStatus } from '@prisma/client';
import { Client } from '../../domain/entities/client.entity';
import { ClientStatus } from '../../domain/enums/client-status.enum';
import { ClientDocument } from '../../domain/value-objects/document.vo';
import { Address } from '../../domain/value-objects/address.vo';

export class ClientMapper {
  static toDomain(raw: PrismaClientModel): Client {
    return new Client(
      {
        legalName: raw.legalName,
        tradeName: raw.tradeName,
        document: new ClientDocument(raw.document),
        billingEmail: raw.billingEmail,
        status: raw.status as unknown as ClientStatus,
        address: raw.street || raw.city || raw.zipCode
          ? new Address({
              street: raw.street,
              number: raw.number,
              complement: raw.complement,
              neighborhood: raw.neighborhood,
              city: raw.city,
              state: raw.state,
              zipCode: raw.zipCode,
            })
          : null,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      raw.id,
    );
  }

  static toPersistence(client: Client): {
    id: string;
    legalName: string;
    tradeName: string;
    document: string;
    billingEmail: string;
    status: PrismaClientStatus;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    const address = client.getAddress();
    return {
      id: client.getId(),
      legalName: client.getLegalName(),
      tradeName: client.getTradeName(),
      document: client.getDocument().getValue(),
      billingEmail: client.getBillingEmail(),
      status: client.getStatus() as unknown as PrismaClientStatus,
      street: address?.street ?? null,
      number: address?.number ?? null,
      complement: address?.complement ?? null,
      neighborhood: address?.neighborhood ?? null,
      city: address?.city ?? null,
      state: address?.state ?? null,
      zipCode: address?.zipCode ?? null,
      createdAt: client.getCreatedAt(),
      updatedAt: client.getUpdatedAt(),
    };
  }
}
