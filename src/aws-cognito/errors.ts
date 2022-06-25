import { BasicError } from '../utils/errors'

export class ForceChangePasswordException extends BasicError {
    public readonly name = ForceChangePasswordException.name
}
