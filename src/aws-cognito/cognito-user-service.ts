import { ISignUpResult, CognitoUserPool } from 'amazon-cognito-identity-js'
import { BasicUserInfo, Credentials, UserInfo } from '../models/utils/user'
import {
    BasicCognitoService,
    CognitoServiceConfig,
} from './basic-cognito-service'
import { RichCognitoUser } from './rich-cognito-user'
import '@quinck/collections'
import { UserToken } from '../models/utils/auth'
import { UserService } from '../models/components/user-service'
import { usernameFromUserToken } from '../utils/auth'

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
    private readonly userPool: CognitoUserPool

    constructor(
        config: CognitoServiceConfig<
            SignUpInfo,
            UserUpdateInfo,
            UserInfoAttributes
        > &
            CognitoUserServiceConfig,
    ) {
        super(config)
        this.userPool = new CognitoUserPool({
            UserPoolId: config.userPoolId,
            ClientId: config.clientId,
        })
    }

    public signUp(
        credentials: Credentials,
        user: SignUpInfo,
    ): Promise<BasicUserInfo> {
        return this.tryDo(async () => {
            const data = await new Promise<ISignUpResult>((resolve, reject) => {
                const attributes = this.createAttributesFromObject(
                    this.fitSignUpInfo(user),
                    false,
                )
                this.userPool.signUp(
                    credentials.username,
                    credentials.password,
                    attributes,
                    [],
                    (err, result) => {
                        if (err || !result) reject(err)
                        else resolve(result)
                    },
                )
            })
            return this.getBasicUserInfo(data.user.getUsername())
        })
    }

    public async confirmSignUp(username: string, code: string): Promise<void> {
        return this.tryDo(async () => {
            const user = RichCognitoUser.createUser(this.userPool, username)
            await user.confirmRegistrationPromise(code)
        })
    }

    public getUserInfo(
        token: UserToken,
    ): Promise<UserInfo<UserInfoAttributes>> {
        return this.tryDo(async () => {
            const user = RichCognitoUser.createUser(this.userPool)
            user.setSignInUserSessionByToken(token)
            const username = usernameFromUserToken(token)
            const attributes = await user.getUserAttributesPromise()
            return this.createUserInfo(username, attributes)
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
            const user = RichCognitoUser.createUser(this.userPool)
            user.setSignInUserSessionByToken(token)
            await user.deleteUserPromise()
        })
    }
}
