import {
    AuthenticationResultType,
    AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider'
import { CognitoUserPool } from 'amazon-cognito-identity-js'
import {
    AuthService,
    CompletedCustomAuthChallengeResponse,
    CustomAuthChallengeResponse,
    ResetPasswordData,
    UpdateCredentialsInfo,
} from '../models/components/auth-service'
import { RefreshAuthToken, UserToken } from '../models/utils/auth'
import { Credentials, LoginAdditionalData } from '../models/utils/user'
import {
    BasicCognitoService,
    CognitoServiceConfig,
} from './basic-cognito-service'
import { UnauthorizedError } from './errors'
import { RichCognitoUser } from './rich-cognito-user'

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
    protected readonly userPool: CognitoUserPool
    private readonly clientId: string

    constructor(config: CognitoAuthServiceConfig) {
        super(config)
        this.userPool = new CognitoUserPool({
            UserPoolId: config.userPoolId,
            ClientId: config.clientId,
        })
        this.clientId = config.clientId
    }
    public async verifyCustomAuthChallenge(
        username: string,
        challengeResponse: string,
        session: string,
    ): Promise<CompletedCustomAuthChallengeResponse> {
        return this.tryDo(() => {
            const user = RichCognitoUser.createUser(this.userPool, username)
            return user.verifyCustomAuthChallenge(challengeResponse, session)
        })
    }

    public async initCustomAuthChallenge(
        username: string,
    ): Promise<CustomAuthChallengeResponse> {
        return this.tryDo(async () => {
            // const {
            //     AuthenticationResult,
            //     ChallengeName,
            //     ChallengeParameters,
            //     Session,
            // } = await this.cognitoIdentityProvider.initiateAuth({
            //     AuthFlow: AuthFlowType.CUSTOM_AUTH,
            //     ClientId: this.clientId,
            //     AuthParameters: {
            //         USERNAME: username,
            //         DEVICE_KEY: 'test',
            //     },
            // })
            const user = RichCognitoUser.createUser(this.userPool, username)
            return user.initCustomAuthChallenge(username)
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
            // const user = RichCognitoUser.createUser(this.userPool)
            // user.setSignInUserSessionByToken(token)
            // await user.changePasswordPromise(
            //     updateInfo.oldPassword,
            //     updateInfo.newPassword,
            // )
        })
    }

    public async login(
        userData: Credentials,
        additionalData?: LoginAdditionalData,
    ): Promise<UserToken> {
        return this.tryDo(async () => {
            // const { password, username } = userData
            // const { AuthenticationResult } =
            //     await this.cognitoIdentityProvider.initiateAuth({
            //         AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            //         AuthParameters: {
            //             USERNAME: username,
            //             PASSWORD: password,
            //             DEVICE_KEY: 'test',
            //         },
            //         ClientId: this.clientId,
            //     })
            // return this.getTokenFromAuthResult(AuthenticationResult)
            const user = RichCognitoUser.createUser(
                this.userPool,
                userData.username,
            )
            const userToken = await user.authenticateUserPromise(
                userData,
                additionalData,
            )
            return userToken
        })
    }

    public async refresh(token: RefreshAuthToken): Promise<UserToken> {
        return this.tryDo(async () => {
            const { AuthenticationResult } =
                await this.cognitoIdentityProvider.initiateAuth({
                    AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
                    ClientId: this.clientId,
                    AuthParameters: {
                        REFRESH_TOKEN: token.refreshToken,
                        DEVICE_KEY: 'test',
                    },
                })
            return this.getTokenFromAuthResult(AuthenticationResult)
            // const user = RichCognitoUser.createUser(this.userPool)
            // return user.refreshToken(token)
        })
    }

    public async logout(token: UserToken): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.globalSignOut({
                AccessToken: token.accessToken,
            })
            // const user = RichCognitoUser.createUser(this.userPool)
            // user.setSignInUserSessionByToken(token)
            // await user.globalSignOutPromise()
        })
    }

    public async resendConfirmationLinkByEmail(
        username: string,
    ): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.resendConfirmationCode({
                ClientId: this.userPool.getClientId(),
                Username: username,
            })
        })
    }

    public async forgotPassword(username: string): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.forgotPassword({
                ClientId: this.userPool.getClientId(),
                Username: username,
            })
        })
    }

    public async resetPassword(data: ResetPasswordData): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.confirmForgotPassword({
                ClientId: this.userPool.getClientId(),
                Username: data.username,
                Password: data.newPassword,
                ConfirmationCode: data.confirmationCode,
            })
        })
    }

    private getTokenFromAuthResult(
        authResult?: AuthenticationResultType,
    ): UserToken {
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
