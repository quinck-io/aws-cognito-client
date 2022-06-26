import { CognitoUserPool } from 'amazon-cognito-identity-js'
import { RichCognitoUser } from './rich-cognito-user'
import { Credentials, LoginAdditionalData } from '../models/utils/user'
import {
    AuthService,
    CompletedCustomAuthChallengeResponse,
    CustomAuthChallengeResponse,
    ResetPasswordData,
    UpdateCredentialsInfo,
} from '../models/components/auth-service'
import {
    BasicCognitoService,
    CognitoServiceConfig,
} from './basic-cognito-service'
import { RefreshAuthToken, UserToken } from '../models/utils/auth'

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

    constructor(config: CognitoAuthServiceConfig) {
        super(config)
        this.userPool = new CognitoUserPool({
            UserPoolId: config.userPoolId,
            ClientId: config.clientId,
        })
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
        return this.tryDo(() => {
            const user = RichCognitoUser.createUser(this.userPool, username)
            return user.initCustomAuthChallenge(username)
        })
    }

    public async updateCredentials(
        updateInfo: UpdateCredentialsInfo,
        token: UserToken,
    ): Promise<void> {
        return this.tryDo(async () => {
            const user = RichCognitoUser.createUser(this.userPool)
            user.setSignInUserSessionByToken(token)
            await user.changePasswordPromise(
                updateInfo.oldPassword,
                updateInfo.newPassword,
            )
        })
    }

    public async login(
        userData: Credentials,
        additionalData?: LoginAdditionalData,
    ): Promise<UserToken> {
        return this.tryDo(async () => {
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
            const user = RichCognitoUser.createUser(this.userPool)
            return user.refreshToken(token)
        })
    }

    public async logout(token: UserToken): Promise<void> {
        return this.tryDo(async () => {
            const user = RichCognitoUser.createUser(this.userPool)
            user.setSignInUserSessionByToken(token)
            await user.globalSignOutPromise()
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
}
