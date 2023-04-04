import '@quinck/collections'
import { UserService } from '../models/components/user-service'
import { UserToken } from '../models/utils/auth'
import { Credentials, UserInfo } from '../models/utils/user'
import {
    BasicCognitoService,
    CognitoServiceConfig,
} from './basic-cognito-service'

export type CognitoUserServiceConfig = {
    clientId: string
}

export class CognitoUserService<
        SignUpInfo extends Partial<UserInfoAttributes>,
        UserUpdateInfo extends Partial<UserInfoAttributes>,
        UserInfoAttributes extends Record<string, unknown>,
    >
    extends BasicCognitoService<SignUpInfo, UserUpdateInfo, UserInfoAttributes>
    implements UserService<SignUpInfo, UserUpdateInfo, UserInfoAttributes>
{
    private readonly clientId: string

    constructor(
        config: CognitoServiceConfig<
            SignUpInfo,
            UserUpdateInfo,
            UserInfoAttributes
        > &
            CognitoUserServiceConfig,
    ) {
        super(config)
        this.clientId = config.clientId
    }

    public signUp(credentials: Credentials, user: SignUpInfo): Promise<void> {
        return this.tryDo(async () => {
            const attributes = this.createAttributesFromObject(
                this.fitSignUpInfo(user),
                false,
            )
            const { password, username } = credentials
            await this.cognitoIdentityProvider.signUp({
                Username: username,
                Password: password,
                UserAttributes: attributes,
                ClientId: this.clientId,
            })
        })
    }

    public async confirmSignUp(username: string, code: string): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.confirmSignUp({
                ClientId: this.clientId,
                ConfirmationCode: code,
                Username: username,
            })
        })
    }

    public async resendConfirmationCode(username: string): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.resendConfirmationCode({
                ClientId: this.clientId,
                Username: username,
            })
        })
    }

    public getUserInfo(
        token: UserToken,
    ): Promise<UserInfo<UserInfoAttributes>> {
        return this.tryDo(async () => {
            const { Username, UserAttributes } =
                await this.cognitoIdentityProvider.getUser({
                    AccessToken: token.accessToken,
                })
            const attributes = this.parseUserAttributes(UserAttributes ?? [])
            return this.createUserInfo(Username ?? '', attributes)
        })
    }

    public updateUserInfo(
        token: UserToken,
        user: UserUpdateInfo,
    ): Promise<void> {
        return this.tryDo(async () => {
            const info = this.fitUserUpdateInfo(user)
            const UserAttributes = this.createAttributesFromObject(info, false)
            await this.cognitoIdentityProvider.updateUserAttributes({
                AccessToken: token.accessToken,
                UserAttributes,
            })
        })
    }

    public deleteUser(token: UserToken): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.deleteUser({
                AccessToken: token.accessToken,
            })
        })
    }
}
