export class CrmError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = 'CrmError';
    }
}

export function crmError(statusCode: number, message: string): CrmError {
    return new CrmError(statusCode, message);
}
