import { RefreshAuthToken, UserToken } from '../utils/auth'
import { Credentials } from '../utils/user'

export interface AuthService {
    login(userData: Credentials): Promise<LoginResult>
    refresh(token: RefreshAuthToken): Promise<UserToken>
    logout(token: UserToken): Promise<void>
    updateCredentials(
        updateInfo: UpdateCredentialsInfo,
        token: UserToken,
    ): Promise<void>
    resendConfirmationLinkByEmail(username: string): Promise<void>
    forgotPassword(username: string): Promise<void>
    resetPassword(data: ResetPasswordData): Promise<void>
    completeAuthChallenge(
        completion: GenericAuthChallengeCompletion,
        options: AuthChallengeOptions,
    ): Promise<LoginResult>
}

export type ResetPasswordData = {
    readonly username: string
    readonly newPassword: string
    readonly confirmationCode: string
}

export type UpdateCredentialsInfo = {
    readonly oldPassword: string
    readonly newPassword: string
}

// ---------------------------------- //

export type LoginResult = UserToken | AuthChallengeResult

export type AuthChallengeOptions = {
    parameters?: unknown
}

export type AuthChallengeResult = { authChallenge: AuthChallenge }

export type AuthChallenge = {
    name: AuthChallengeName
    options: Pick<AuthChallengeOptions, 'parameters'>
}

export type GenericAuthChallengeCompletion =
    | NewPasswordRequiredChallengeCompletion
    | CustomChallengeCompletion

export type AuthChallengeCompletion<Name extends AuthChallengeName> = {
    name: Name
}

export type NewPasswordRequiredChallengeCompletion =
    AuthChallengeCompletion<AuthChallengeName.NEW_PASSWORD_REQUIRED> & {
        newPassword: string
    }

export type CustomChallengeCompletion =
    AuthChallengeCompletion<AuthChallengeName.CUSTOM_CHALLENGE> & {
        response: unknown
    }

export enum AuthChallengeName {
    CUSTOM_CHALLENGE = 'CUSTOM_CHALLENGE',
    NEW_PASSWORD_REQUIRED = 'NEW_PASSWORD_REQUIRED',
}
