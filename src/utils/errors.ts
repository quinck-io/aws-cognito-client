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

export class ForceChangePasswordError extends BasicError {
    public readonly name = ForceChangePasswordError.name
}

export class UserNotRetrievedError extends BasicError {
    public readonly name = UserNotRetrievedError.name
}

export class WrongUsernameOrPasswordError extends BasicError {
    public readonly name = WrongUsernameOrPasswordError.name
}

export class UnauthorizedError extends BasicError {
    public readonly name = UnauthorizedError.name
}

export class UserAlreadyExistsError extends BasicError {
    public readonly name = UserAlreadyExistsError.name
}

export class UserNotFoundError extends BasicError {
    public readonly name = UserNotFoundError.name
}

export class InvalidPasswordError extends BasicError {
    public readonly name = InvalidPasswordError.name
}

export class UnknownInternalError extends BasicError {
    public readonly name = UnknownInternalError.name
}
