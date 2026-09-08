import { ClientStatus } from '../enums/client-status.enum';
import { ClientDocument } from '../value-objects/document.vo';
import { Address } from '../value-objects/address.vo';

export interface ClientProps {
  legalName: string;
  tradeName: string;
  document: ClientDocument;
  billingEmail: string;
  status?: ClientStatus;
  address?: Address | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Client {
  private readonly id: string;
  private props: ClientProps;

  constructor(props: ClientProps, id?: string) {
    if (!props.legalName || props.legalName.trim().length === 0) {
      throw new Error('A razão social é obrigatória.');
    }
    if (!props.tradeName || props.tradeName.trim().length === 0) {
      throw new Error('O nome fantasia é obrigatório.');
    }
    if (!props.billingEmail || !props.billingEmail.includes('@')) {
      throw new Error('E-mail de faturamento inválido.');
    }

    this.id = id ?? crypto.randomUUID();
    this.props = {
      ...props,
      legalName: props.legalName.trim(),
      tradeName: props.tradeName.trim(),
      billingEmail: props.billingEmail.trim().toLowerCase(),
      status: props.status ?? ClientStatus.ATIVO,
      address: props.address ?? null,
      createdAt: props.createdAt ?? new Date(),
      updatedAt: props.updatedAt ?? new Date(),
    };
  }

  getId(): string { return this.id; }
  getLegalName(): string { return this.props.legalName; }
  getTradeName(): string { return this.props.tradeName; }
  getDocument(): ClientDocument { return this.props.document; }
  getBillingEmail(): string { return this.props.billingEmail; }
  getStatus(): ClientStatus { return this.props.status!; }
  getAddress(): Address | null { return this.props.address ?? null; }
  getCreatedAt(): Date { return this.props.createdAt!; }
  getUpdatedAt(): Date { return this.props.updatedAt!; }

  isActive(): boolean {
    return this.props.status === ClientStatus.ATIVO;
  }

  updateProfile(data: {
    legalName?: string;
    tradeName?: string;
    billingEmail?: string;
    address?: Address | null;
  }): void {
    if (data.legalName !== undefined) {
      if (!data.legalName.trim()) throw new Error('Razão social não pode estar vazia.');
      this.props.legalName = data.legalName.trim();
    }
    if (data.tradeName !== undefined) {
      if (!data.tradeName.trim()) throw new Error('Nome fantasia não pode estar vazio.');
      this.props.tradeName = data.tradeName.trim();
    }
    if (data.billingEmail !== undefined) {
      if (!data.billingEmail.includes('@')) throw new Error('E-mail de faturamento inválido.');
      this.props.billingEmail = data.billingEmail.trim().toLowerCase();
    }
    if (data.address !== undefined) {
      this.props.address = data.address;
    }
    this.props.updatedAt = new Date();
  }

  suspend(): void {
    this.props.status = ClientStatus.SUSPENSO;
    this.props.updatedAt = new Date();
  }

  reactivate(): void {
    this.props.status = ClientStatus.ATIVO;
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    this.props.status = ClientStatus.CANCELADO;
    this.props.updatedAt = new Date();
  }
}
