export class InvalidCpfException extends Error {
    constructor(cpf: string) {
        super(`O CPF informado (${cpf}) é inválido.`);
        this.name = 'InvalidCpfException';
    }
} 