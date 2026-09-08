export interface AddressProps {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export class Address {
  private readonly props: AddressProps;

  constructor(props: AddressProps) {
    this.props = {
      street: props.street?.trim() || null,
      number: props.number?.trim() || null,
      complement: props.complement?.trim() || null,
      neighborhood: props.neighborhood?.trim() || null,
      city: props.city?.trim() || null,
      state: props.state?.trim() || null,
      zipCode: props.zipCode ? props.zipCode.replace(/\D/g, '') : null,
    };
  }

  get street(): string | null { return this.props.street ?? null; }
  get number(): string | null { return this.props.number ?? null; }
  get complement(): string | null { return this.props.complement ?? null; }
  get neighborhood(): string | null { return this.props.neighborhood ?? null; }
  get city(): string | null { return this.props.city ?? null; }
  get state(): string | null { return this.props.state ?? null; }
  get zipCode(): string | null { return this.props.zipCode ?? null; }

  toJSON(): AddressProps {
    return { ...this.props };
  }
}
