import { BasicError } from '../utils/errors'

export class ForceChangePasswordException extends BasicError {
    public readonly name = ForceChangePasswordException.name
}

export class UserNotRetrievedError extends BasicError {
    public readonly name = UserNotRetrievedError.name
}

export class WrongPasswordError extends BasicError {
    constructor() {
        super(new Error('Invalid user password'))
    }
    public readonly name = WrongPasswordError.name
}

export class UnauthorizedError extends BasicError {
    constructor() {
        super(new Error('Operation not authorized'))
    }
    public readonly name = UnauthorizedError.name
}

export class UserAlreadyExistsError extends BasicError {
    constructor() {
        super(new Error('User with given username already exists'))
    }
    public readonly name = UserAlreadyExistsError.name
}

export class UserNotFoundError extends BasicError {
    constructor() {
        super(new Error('User with given username not found'))
    }
    public readonly name = UserNotFoundError.name
}

export class UnknownInternalError extends BasicError {
    constructor() {
        super(new Error('Unkown error'))
    }
    public readonly name = UnknownInternalError.name
}
