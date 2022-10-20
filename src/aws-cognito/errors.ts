import { BasicError } from '../utils/errors'

export class ForceChangePasswordException extends BasicError {
    public readonly name = ForceChangePasswordException.name
}

export class UserNotRetrievedError extends BasicError {
    public readonly name = UserNotRetrievedError.name
}

export class WrongUsernameOrPasswordError extends BasicError {
    constructor(message?: string) {
        super(new Error(message))
    }
    public readonly name = WrongUsernameOrPasswordError.name
}

export class UnauthorizedError extends BasicError {
    constructor() {
        super(new Error('Operation not authorized'))
    }
    public readonly name = UnauthorizedError.name
}

export class UserAlreadyExistsError extends BasicError {
    constructor() {
        super(new Error('User with given username/email already exists'))
    }
    public readonly name = UserAlreadyExistsError.name
}

export class UserNotFoundError extends BasicError {
    constructor() {
        super(new Error('User with given username not found'))
    }
    public readonly name = UserNotFoundError.name
}

export class InvalidPasswordError extends BasicError {
    constructor(message?: string) {
        super(new Error(message))
    }
    public readonly name = InvalidPasswordError.name
}

export class UnknownInternalError extends BasicError {
    constructor() {
        super(new Error('Unkown error'))
    }
    public readonly name = UnknownInternalError.name
}
