import { CompleteUserInfo } from '../utils/user'

export interface AdminUserService<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> {
    createUser(
        credentials: AdminCreateUserCredentials,
        user: SignUpInfo,
        groups?: string[],
    ): Promise<CompleteUserInfo<UserInfoAttributes>>
    setUserPassword(username: string, password: string): Promise<void>
    getUser(username: string): Promise<CompleteUserInfo<UserInfoAttributes>>
    getUserGroups(username: string): Promise<string[]>
    updateUser(username: string, user: UserUpdateInfo): Promise<void>
    deleteUser(username: string): Promise<void>
    addUserToGroup(username: string, group: string): Promise<void>
    removeUserFromGroup(username: string, group: string): Promise<void>
    disableUser(username: string): Promise<void>
    enableUser(username: string): Promise<void>
    getAllUsers(): Promise<CompleteUserInfo<UserInfoAttributes>[]>
    searchUsers(
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]>
    searchUsersInGroup(
        group: string,
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]>
    getUserByEmail(email: string): Promise<CompleteUserInfo<UserInfoAttributes>>
    forceEmailVerification(username: string): Promise<void>
    forcePhoneNumberVerification(username: string): Promise<void>
    updateUserPassword(username: string, password: string): Promise<void>
}

export type AdminCreateUserCredentials = {
    username: string
    password?: string
}

export type SearchUsersParameters = {
    // TODO
}
