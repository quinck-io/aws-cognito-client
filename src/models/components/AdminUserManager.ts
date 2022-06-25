import { CompleteUserInfo } from '../utils/user'

export interface AdminUserManager<
    SignUpInfo,
    UserUpdateInfo,
    UserInfoAtributes,
> {
    createUser(
        credentials: AdminCreateUserCredentials,
        user: SignUpInfo,
        groups: string[],
    ): Promise<void>
    getUser(username: string): Promise<CompleteUserInfo<UserInfoAtributes>>
    updateUser(username: string, user: UserUpdateInfo): Promise<void>
    deleteUser(username: string): Promise<void>
    addUserToGroup(username: string, group: string): Promise<void>
    removeUserFromGroup(username: string, group: string): Promise<void>
    disableUser(username: string): Promise<void>
    enableUser(username: string): Promise<void>
    getAllUsers(): Promise<CompleteUserInfo<UserInfoAtributes>[]>
    searchUsers(
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAtributes>[]>
    searchUsersInGroup(
        group: string,
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAtributes>[]>
    getUserByEmail(email: string): Promise<CompleteUserInfo<UserInfoAtributes>>
    forceEmailVerification(username: string): Promise<void>
    forcePhoneNumberVerification(username: string): Promise<void>
}

export type AdminCreateUserCredentials = {
    username: string
    password?: string
}

export type SearchUsersParameters = {
    // TODO
}
