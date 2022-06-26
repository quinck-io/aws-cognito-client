import { RefreshAuthToken, UserToken } from '../utils/auth'
import { Credentials, LoginAdditionalData } from '../utils/user'

export interface AuthService {
    login(
        userData: Credentials,
        additionalData?: LoginAdditionalData,
    ): Promise<UserToken>
    refresh(token: RefreshAuthToken): Promise<UserToken>
    logout(token: UserToken): Promise<void>
    updateCredentials(
        updateInfo: UpdateCredentialsInfo,
        token: UserToken,
    ): Promise<void>
    resendConfirmationLinkByEmail(username: string): Promise<void>
    forgotPassword(username: string): Promise<void>
    resetPassword(data: ResetPasswordData): Promise<void>
    initCustomAuthChallenge(
        username: string,
    ): Promise<CustomAuthChallengeResponse>
    verifyCustomAuthChallenge(
        username: string,
        challengeResponse: string,
        session: string,
    ): Promise<CompletedCustomAuthChallengeResponse>
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

export type CustomAuthChallengeResponse =
    | CompletedCustomAuthChallengeResponse
    | VerificationRequiredCustomAuthChallengeResponse

export type CompletedCustomAuthChallengeResponse = {
    status: CustomAuthChallengeResponseStatus.COMPLETED
    userToken: UserToken
}

export type VerificationRequiredCustomAuthChallengeResponse = {
    status: CustomAuthChallengeResponseStatus.VERIFICATION_REQUIRED
    parameters: CustomAuthChallengeParameters
    session: string
}

export enum CustomAuthChallengeResponseStatus {
    COMPLETED = 'COMPLETED',
    VERIFICATION_REQUIRED = 'VERIFICATION_REQUIRED',
}

export type CustomAuthChallengeParameters = { message: string }
