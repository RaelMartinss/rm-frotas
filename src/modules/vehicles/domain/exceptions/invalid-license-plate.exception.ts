export class InvalidLicensePlateException extends Error {
    constructor(plate: string) {
        super(`A placa '${plate}' não é uma placa válida no padrão tradicional (AAA-1234) ou Mercosul (AAA1A23)`);
        this.name = 'InvalidLicensePlateException'
    }
}