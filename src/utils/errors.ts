export class BasicError extends Error {
    constructor(error?: unknown) {
        super(BasicError.formatMessage(error))
    }

    static formatMessage(error?: unknown): string {
        if (error == undefined || error == null) return ''
        if (error instanceof Error) return `[${error.name}] ${error.message}`
        switch (typeof error) {
            case 'bigint':
            case 'number':
            case 'boolean':
                return String(error)
            case 'string':
                return error
            case 'object':
            case 'function':
                return error ? error.toString() : ''
            default:
                return ''
        }
    }
}
