import { UserAuthToken } from '../utils/auth'
import { Credentials, UserInfo } from '../utils/user'

export interface UserService<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> {
    signUp(credentials: Credentials, data: SignUpInfo): Promise<void>
    confirmSignUp(username: string, code: string): Promise<void>
    getUserInfo(token: UserAuthToken): Promise<UserInfo<UserInfoAttributes>>
    updateUserInfo(token: UserAuthToken, user: UserUpdateInfo): Promise<void>
    deleteUser(token: UserAuthToken): Promise<void>
}
