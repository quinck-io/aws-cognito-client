import {
    CognitoAuthService,
    CognitoAuthServiceConfig,
} from '../aws-cognito/cognito-auth-service'
import { AuthService } from '../models/components/auth-service'
import { InvalidParameterError } from './errors'

export function createAuthService(params: AuthServiceParams): AuthService {
    if (params.type === 'cognito') return new CognitoAuthService(params)
    throw new InvalidParameterError()
}

export type AuthServiceParams = CognitoAuthServiceParams

export type CognitoAuthServiceParams = CognitoAuthServiceConfig & {
    type: 'cognito'
}
