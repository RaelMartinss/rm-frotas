export class DriverNotAvailableException extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DriverNotAvailableException';
    }
}