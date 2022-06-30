import { BasicError } from '../utils/errors'

export class InvalidParameterError extends BasicError {
    public readonly name = InvalidParameterError.name
}
