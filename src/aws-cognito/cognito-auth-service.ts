import {
    AdminInitiateAuthCommandInput,
    AdminInitiateAuthCommandOutput,
    AdminRespondToAuthChallengeCommandOutput,
    AuthFlowType,
    AuthenticationResultType,
    ChallengeNameType,
    CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider'
import {
    AuthChallengeName,
    AuthChallengeOptions,
    AuthChallengeResult,
    AuthService,
    GenericAuthChallengeCompletion,
    LoginResult,
    ResetPasswordData,
    UpdateCredentialsInfo,
} from '../models/components/auth-service'
import { RefreshAuthToken, UserToken } from '../models/utils/auth'
import { Credentials } from '../models/utils/user'
import { isUserToken } from '../utils/auth'
import { UnauthorizedError } from '../utils/errors'
import {
    BasicCognitoService,
    CognitoServiceConfig,
} from './basic-cognito-service'

type GenericUserAttributes = Record<string, unknown>

export type CognitoAuthServiceConfig = CognitoServiceConfig<
    Partial<GenericUserAttributes>,
    Partial<GenericUserAttributes>,
    GenericUserAttributes
> & {
    clientId: string
}

export class CognitoAuthService
    extends BasicCognitoService<
        Partial<GenericUserAttributes>,
        Partial<GenericUserAttributes>,
        GenericUserAttributes
    >
    implements AuthService
{
    private readonly clientId: string
    private readonly authManager: AuthenticationManager

    constructor(config: CognitoAuthServiceConfig) {
        super(config)
        const { clientId, userPoolId } = config
        this.clientId = clientId
        this.authManager = new AuthenticationManager(
            this.cognitoIdentityProvider,
            userPoolId,
            clientId,
        )
    }

    public completeAuthChallenge(
        completion: GenericAuthChallengeCompletion,
        options: AuthChallengeOptions,
    ): Promise<LoginResult> {
        return this.tryDo(async () => {
            return await this.authManager.completeAuthChallenge(
                completion,
                options,
            )
        })
    }

    public async updateCredentials(
        updateInfo: UpdateCredentialsInfo,
        token: UserToken,
    ): Promise<void> {
        return this.tryDo(async () => {
            const { newPassword, oldPassword } = updateInfo
            await this.cognitoIdentityProvider.changePassword({
                AccessToken: token.accessToken,
                PreviousPassword: oldPassword,
                ProposedPassword: newPassword,
            })
        })
    }

    public async login(userData: Credentials): Promise<LoginResult> {
        return this.tryDo(async () => {
            const { password, username } = userData
            const result = await this.authManager.adminInitiateAuth({
                AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                },
                ClientId: this.clientId,
                UserPoolId: this.userPoolId,
            })
            return result
        })
    }

    public async refresh(token: RefreshAuthToken): Promise<UserToken> {
        return this.tryDo(async () => {
            const loginResult = await this.authManager.adminInitiateAuth({
                AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
                ClientId: this.clientId,
                UserPoolId: this.userPoolId,
                AuthParameters: {
                    REFRESH_TOKEN: token.refreshToken,
                },
            })
            if (isUserToken(loginResult)) return loginResult
            throw new UnauthorizedError()
        })
    }

    public async logout(token: UserToken): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.globalSignOut({
                AccessToken: token.accessToken,
            })
        })
    }

    public async resendConfirmationLinkByEmail(
        username: string,
    ): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.resendConfirmationCode({
                ClientId: this.clientId,
                Username: username,
            })
        })
    }

    public async forgotPassword(username: string): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.forgotPassword({
                ClientId: this.clientId,
                Username: username,
            })
        })
    }

    public async resetPassword(data: ResetPasswordData): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.confirmForgotPassword({
                ClientId: this.clientId,
                Username: data.username,
                Password: data.newPassword,
                ConfirmationCode: data.confirmationCode,
            })
        })
    }
}

class AuthenticationManager {
    constructor(
        private readonly cognitoIdentityProvider: CognitoIdentityProvider,
        private readonly userPoolId: string,
        private readonly clientId: string,
    ) {}

    public async adminInitiateAuth(
        input: AdminInitiateAuthCommandInput,
    ): Promise<LoginResult> {
        const output = await this.cognitoIdentityProvider.adminInitiateAuth(
            input,
        )

        return this.handleAdminAuthOutput(output)
    }

    public handleAdminAuthOutput(
        output:
            | AdminInitiateAuthCommandOutput
            | AdminRespondToAuthChallengeCommandOutput,
    ): LoginResult {
        const { AuthenticationResult } = output

        if (AuthenticationResult)
            return this.parseUserToken(AuthenticationResult)

        return this.handleRequiredAuthChallenge(output)
    }

    private handleRequiredAuthChallenge(
        output: AdminInitiateAuthCommandOutput,
    ): AuthChallengeResult {
        const { ChallengeName, ChallengeParameters, Session } = output
        const parameters: CognitoAuthChallengeParameters = {
            ChallengeParameters,
            Session,
        }
        const options = { parameters }
        const name = this.cognitoChallengeNameToChallengeName(ChallengeName)
        return {
            authChallenge: { name, options },
        }
    }

    public completeAuthChallenge(
        completion: GenericAuthChallengeCompletion,
        options: AuthChallengeOptions,
    ): Promise<LoginResult> {
        switch (completion.name) {
            case AuthChallengeName.CUSTOM_CHALLENGE:
                return this._completeAuthChallenge(completion, options)
            case AuthChallengeName.NEW_PASSWORD_REQUIRED:
                return this._completeAuthChallenge(completion, options, {
                    NEW_PASSWORD: completion.newPassword,
                })
            default:
                throw new UnauthorizedError()
        }
    }

    private async _completeAuthChallenge(
        completion: GenericAuthChallengeCompletion,
        options: AuthChallengeOptions,
        additionalChallengeResponses?: Record<string, string>,
    ): Promise<LoginResult> {
        const { name, username } = completion
        const ChallengeName = this.challengeNameToCognitoChallengeName(name)
        const { ChallengeParameters, Session } = this.parseParameters(
            options.parameters,
        )

        const ChallengeResponses = {
            ...ChallengeParameters,
            ...(additionalChallengeResponses ?? {}),
            USERNAME: username,
        }

        const result =
            await this.cognitoIdentityProvider.adminRespondToAuthChallenge({
                ChallengeName,
                UserPoolId: this.userPoolId,
                ClientId: this.clientId,
                Session,
                ChallengeResponses,
            })

        return this.handleAdminAuthOutput(result)
    }

    private challengeNameToCognitoChallengeName(
        name: AuthChallengeName,
    ): ChallengeNameType {
        switch (name) {
            case AuthChallengeName.CUSTOM_CHALLENGE:
                return ChallengeNameType.CUSTOM_CHALLENGE
            case AuthChallengeName.NEW_PASSWORD_REQUIRED:
                return ChallengeNameType.NEW_PASSWORD_REQUIRED
            default:
                throw new UnauthorizedError()
        }
    }

    private cognitoChallengeNameToChallengeName(
        name?: string,
    ): AuthChallengeName {
        switch (name) {
            case ChallengeNameType.CUSTOM_CHALLENGE:
                return AuthChallengeName.CUSTOM_CHALLENGE
            case ChallengeNameType.NEW_PASSWORD_REQUIRED:
                return AuthChallengeName.NEW_PASSWORD_REQUIRED
            default:
                throw new UnauthorizedError()
        }
    }

    private parseParameters(
        parameters: unknown,
    ): CognitoAuthChallengeParameters {
        return parameters as CognitoAuthChallengeParameters // TODO implement real check
    }

    public parseUserToken(authResult?: AuthenticationResultType): UserToken {
        if (authResult) {
            const { AccessToken, RefreshToken, IdToken } = authResult
            if (AccessToken && RefreshToken && IdToken) {
                return {
                    accessToken: AccessToken,
                    idToken: IdToken,
                    refreshToken: RefreshToken,
                }
            }
        }
        throw new UnauthorizedError()
    }
}

type CognitoAuthChallengeParameters = Pick<
    AdminInitiateAuthCommandOutput,
    'ChallengeParameters' | 'Session'
>
