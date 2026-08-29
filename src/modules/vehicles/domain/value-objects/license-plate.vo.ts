import { InvalidLicensePlateException } from '../exceptions/invalid-license-plate.exception';

export class LicensePlate {
    private readonly value: string;
    private static readonly LICENSE_PLATE_REGEX = /^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/;

    constructor(plate: string) {
        const formattedPlate = plate.trim().toUpperCase().replace('-', '');

        if(!LicensePlate.validade(formattedPlate)) {
            throw new InvalidLicensePlateException(plate);
        }

        this.value = formattedPlate;
    }

    public static validade(plate: string): boolean {
        return this.LICENSE_PLATE_REGEX.test(plate)
    }

    public getValue(): string {return this.value;}

    public equals(other: LicensePlate): boolean {
        return this.value === other.getValue();
    }
}