import {
    AdminGetUserResponse,
    AttributeType,
    UserType,
} from '@aws-sdk/client-cognito-identity-provider'
import '@quinck/collections'
import {
    AdminUserService,
    CreateUserParams,
} from '../models/components/admin-user-service'
import { CompleteUserInfo, UserStatus } from '../models/utils/user'
import {
    UnknownInternalError,
    UserNotFoundError,
    UserNotRetrievedError,
} from '../utils/errors'
import { BasicCognitoService } from './basic-cognito-service'
import { VerifiableAttribute } from './models/attributes'
import { FilledUserType } from './models/users'

const COGNITO_LIST_LIMIT = 60

export class CognitoAdminService<
        SignUpInfo extends Partial<UserInfoAttributes>,
        UserUpdateInfo extends Partial<UserInfoAttributes>,
        UserInfoAttributes extends Record<string, unknown>,
        Group extends string = string,
    >
    extends BasicCognitoService<SignUpInfo, UserUpdateInfo, UserInfoAttributes>
    implements
        AdminUserService<SignUpInfo, UserUpdateInfo, UserInfoAttributes, Group>
{
    public async confirmSignUp(username: string): Promise<void> {
        await this.tryDo(async () => {
            await this.cognitoIdentityProvider.adminConfirmSignUp({
                UserPoolId: this.userPoolId,
                Username: username,
            })
        })
    }

    public async setUserPassword(
        username: string,
        password: string,
    ): Promise<void> {
        await this.tryDo(async () => {
            await this.cognitoIdentityProvider.adminSetUserPassword({
                UserPoolId: this.userPoolId,
                Username: username,
                Password: password,
                Permanent: true,
            })
        })
    }

    public async forceEmailVerification(username: string): Promise<void> {
        await this.forceAttributeVerification(username, 'email_verified')
    }

    public async forcePhoneNumberVerification(username: string): Promise<void> {
        await this.forceAttributeVerification(username, 'phone_number_verified')
    }

    public async createUser(
        params: CreateUserParams<SignUpInfo>,
    ): Promise<CompleteUserInfo<UserInfoAttributes>> {
        return this.tryDo(async () => {
            const { credentials, postSignupMessageConfig } = params
            const { username, password } = credentials

            const attributes = this.createUserAttributes(params)

            const { User } = await this.cognitoIdentityProvider.adminCreateUser(
                {
                    UserPoolId: this.userPoolId,
                    Username: username,
                    TemporaryPassword: password,
                    UserAttributes: attributes,
                    DesiredDeliveryMediums:
                        postSignupMessageConfig?.deliveryMediums,
                    MessageAction: postSignupMessageConfig?.action,
                },
            )

            if (User?.Attributes && User.Username) {
                return this.parseUser(User as FilledUserType)
            }
            throw new UnknownInternalError()
        })
    }

    public async updateUserPassword(
        username: string,
        password?: string,
        permanent?: boolean,
    ): Promise<void> {
        return this.tryDo(async () => {
            await this.cognitoIdentityProvider.adminSetUserPassword({
                Username: username,
                Password: password,
                UserPoolId: this.userPoolId,
                Permanent: permanent,
            })
        })
    }

    public async addUserToGroup(
        username: string,
        ...groups: Group[]
    ): Promise<void> {
        await this.tryDo(async () => {
            for (const group of groups) {
                await this.cognitoIdentityProvider.adminAddUserToGroup({
                    GroupName: group,
                    UserPoolId: this.userPoolId,
                    Username: username,
                })
            }
        })
    }

    public async removeUserFromGroup(
        username: string,
        ...groups: Group[]
    ): Promise<void> {
        for (const group of groups) {
            await this.cognitoIdentityProvider.adminRemoveUserFromGroup({
                GroupName: group,
                UserPoolId: this.userPoolId,
                Username: username,
            })
        }
    }

    public async searchUsers(): Promise<
        CompleteUserInfo<UserInfoAttributes>[]
    > {
        return this.tryDo(async () => {
            const users = await this.getAllUsersAllPages()
            return this.parseUsersSearchResult(users)
        })
    }

    public searchUsersInGroup(
        group: string,
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]> {
        return this.tryDo(async () => {
            const users = await this.getAllUsersByGroupAllPages(group)
            return this.parseUsersSearchResult(users)
        })
    }

    public async getAllUsers(): Promise<
        CompleteUserInfo<UserInfoAttributes>[]
    > {
        return await this.searchUsers()
    }

    public async getUserByEmail(
        email: string,
    ): Promise<CompleteUserInfo<UserInfoAttributes>> {
        const { Users } = await this.tryDo(() =>
            this.cognitoIdentityProvider.listUsers({
                UserPoolId: this.userPoolId,
                Filter: `email = "${email}"`,
            }),
        )
        if (!Users || Users.length <= 0) throw new UserNotFoundError()
        const [user] = Users
        if (user.Attributes && user.Username) {
            return this.parseUser(user as FilledUserType)
        }
        throw new UserNotFoundError()
    }

    private async getAllUsersAllPages(
        currentUsers: UserType[] = [],
        paginationToken?: string,
    ): Promise<UserType[]> {
        const { PaginationToken, Users } =
            await this.cognitoIdentityProvider.listUsers({
                UserPoolId: this.userPoolId,
                PaginationToken: paginationToken,
                Limit: COGNITO_LIST_LIMIT,
            })
        const users = currentUsers.concat(Users ?? [])
        if (!PaginationToken) return users
        else return this.getAllUsersAllPages(users, PaginationToken)
    }

    private async getAllUsersByGroupAllPages(
        groupName: string,
        currentUsers: UserType[] = [],
        paginationToken?: string,
    ): Promise<UserType[]> {
        const { NextToken, Users } =
            await this.cognitoIdentityProvider.listUsersInGroup({
                UserPoolId: this.userPoolId,
                GroupName: groupName,
                NextToken: paginationToken,
                Limit: COGNITO_LIST_LIMIT,
            })
        const users = currentUsers.concat(Users ?? [])
        if (!NextToken) return users
        else return this.getAllUsersByGroupAllPages(groupName, users, NextToken)
    }

    private async parseUsersSearchResult(
        usersFound?: UserType[],
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]> {
        if (usersFound) {
            const users = usersFound.singleCollect(
                user => !!user.Attributes && !!user.Username,
                user => this.parseUser(user as FilledUserType),
            )
            return Promise.all(users)
        }
        return []
    }

    private parseUser(
        user: FilledUserType,
    ): CompleteUserInfo<UserInfoAttributes> {
        const {
            Attributes,
            Username,
            UserCreateDate,
            UserLastModifiedDate,
            UserStatus,
            Enabled,
        } = user
        const attributes = this.parseUserAttributes(Attributes)
        return {
            ...this.createUserInfo(Username, attributes),
            additionaInformation: {
                isEnabled: Enabled,
                createdDate: UserCreateDate,
                lastModifiedDate: UserLastModifiedDate,
                status: this.mapStatus(UserStatus),
            },
        }
    }

    public async getUserGroups(username: string): Promise<string[]> {
        try {
            const { Groups } =
                await this.cognitoIdentityProvider.adminListGroupsForUser({
                    Username: username,
                    UserPoolId: this.userPoolId,
                })

            if (Groups)
                return Groups.singleCollect(
                    x => x.GroupName != undefined,
                    x => x.GroupName as string,
                )
            return []
        } catch {
            return []
        }
    }

    public async getUser(
        username: string,
    ): Promise<CompleteUserInfo<UserInfoAttributes>> {
        try {
            const {
                Enabled,
                UserAttributes,
                UserCreateDate,
                UserLastModifiedDate,
                UserStatus,
                Username,
            } = await this.getUserByUsername(username)

            if (UserAttributes && Username) {
                return this.parseUser({
                    Username,
                    Attributes: UserAttributes,
                    Enabled,
                    UserCreateDate,
                    UserLastModifiedDate,
                    UserStatus,
                })
            }
            throw new UserNotRetrievedError()
        } catch (error) {
            throw this.createError(error as Error)
        }
    }

    private getUserByUsername(Username: string): Promise<AdminGetUserResponse> {
        return this.cognitoIdentityProvider.adminGetUser({
            UserPoolId: this.userPoolId,
            Username,
        })
    }

    private mapStatus(status?: string): UserStatus {
        switch (status) {
            case 'UNCONFIRMED':
                return UserStatus.UNCONFIRMED
            case 'CONFIRMED':
                return UserStatus.CONFIRMED
            case 'ARCHIVED':
                return UserStatus.ARCHIVED
            case 'COMPROMISED':
                return UserStatus.COMPROMISED
            case 'RESET_REQUIRED':
                return UserStatus.RESET_REQUIRED
            case 'FORCE_CHANGE_PASSWORD':
                return UserStatus.FORCE_CHANGE_PASSWORD
            case 'UNKNOWN':
            default:
                return UserStatus.UNKNOWN
        }
    }

    public async updateUser(
        username: string,
        user: UserUpdateInfo,
    ): Promise<void> {
        await this.tryDo(() =>
            this.cognitoIdentityProvider.adminUpdateUserAttributes({
                UserPoolId: this.userPoolId,
                Username: username,
                UserAttributes: this.createAttributesFromObject(
                    this.fitUserUpdateInfo(user),
                    false,
                ),
            }),
        )
    }

    public async deleteUser(username: string): Promise<void> {
        await this.tryDo(() =>
            this.cognitoIdentityProvider.adminDeleteUser({
                UserPoolId: this.userPoolId,
                Username: username,
            }),
        )
    }

    public async disableUser(username: string): Promise<void> {
        await this.tryDo(() =>
            this.cognitoIdentityProvider.adminDisableUser({
                UserPoolId: this.userPoolId,
                Username: username,
            }),
        )
    }

    public async enableUser(username: string): Promise<void> {
        await this.tryDo(() =>
            this.cognitoIdentityProvider.adminEnableUser({
                UserPoolId: this.userPoolId,
                Username: username,
            }),
        )
    }

    private async forceAttributeVerification(
        username: string,
        attribute: VerifiableAttribute,
    ): Promise<void> {
        await this.cognitoIdentityProvider.adminUpdateUserAttributes({
            Username: username,
            UserPoolId: this.userPoolId,
            UserAttributes: [this.verifiedAttribute(attribute)],
        })
    }

    private verifiedAttribute(
        attribute: VerifiableAttribute,
    ): Required<AttributeType> {
        return {
            Name: attribute,
            Value: 'true',
        }
    }

    private createUserAttributes(
        params: CreateUserParams<SignUpInfo>,
    ): Required<AttributeType>[] {
        const {
            userAttributes,
            forceEmailVerification,
            forcePhoneNumberVerification,
        } = params

        const attributes = this.createAttributesFromObject(
            this.fitSignUpInfo(userAttributes),
            false,
        )

        if (forceEmailVerification === true)
            attributes.push(this.verifiedAttribute('email_verified'))

        if (forcePhoneNumberVerification === true)
            attributes.push(this.verifiedAttribute('phone_number_verified'))

        return attributes
    }
}
