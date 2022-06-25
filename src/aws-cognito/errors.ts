import { BasicError } from '../utils/errors'

export class ForceChangePasswordException extends BasicError {
    public readonly name = ForceChangePasswordException.name
}

export class UserNotFoundError extends BasicError {
    public readonly name = UserNotFoundError.name
}
