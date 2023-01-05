import {
    AuthChallengeResult,
    LoginResult,
} from '../models/components/auth-service'
import { UserToken } from '../models/utils/auth'

export function isUserToken(
    loginResult: LoginResult,
): loginResult is UserToken {
    const requiredKeys: (keyof UserToken)[] = [
        'idToken',
        'accessToken',
        'refreshToken',
    ]
    return requiredKeys.every(key => key in loginResult)
}

export function isAuthChallengeResult(
    loginResult: LoginResult,
): loginResult is AuthChallengeResult {
    const requiredKeys: (keyof AuthChallengeResult)[] = ['authChallenge']
    return requiredKeys.every(key => key in loginResult)
}
