import { InvalidLocationException } from '../exceptions/invalid-location.exception';

export interface LocationProps {
  address: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export class Location {
  private readonly props: LocationProps;

  constructor(props: LocationProps) {
    const address = props.address?.trim();
    const city = props.city?.trim();
    const state = props.state?.trim().toUpperCase();

    if (!address || address.length < 3) {
      throw new InvalidLocationException('O endereço deve conter pelo menos 3 caracteres.');
    }

    if (!city) {
      throw new InvalidLocationException('A cidade é obrigatória.');
    }

    if (!state || state.length !== 2) {
      throw new InvalidLocationException('O estado (UF) deve ter exatamente 2 caracteres.');
    }

    if (props.latitude !== undefined && (props.latitude < -90 || props.latitude > 90)) {
      throw new InvalidLocationException('A latitude deve estar entre -90 e 90.');
    }

    if (props.longitude !== undefined && (props.longitude < -180 || props.longitude > 180)) {
      throw new InvalidLocationException('A longitude deve estar entre -180 e 180.');
    }

    this.props = {
      ...props,
      address,
      city,
      state,
    };
  }

  public getAddress(): string { return this.props.address; }
  public getCity(): string { return this.props.city; }
  public getState(): string { return this.props.state; }
  public getLatitude(): number | undefined { return this.props.latitude; }
  public getLongitude(): number | undefined { return this.props.longitude; }

  public getValue(): string {
    return `${this.props.address}, ${this.props.city} - ${this.props.state}`;
  }
}