import { CognitoUserAttribute } from 'amazon-cognito-identity-js'
import {
    AdminGetUserResponse,
    AttributeType,
    ListUsersCommandOutput,
    ListUsersInGroupCommandOutput,
    UserStatusType,
    UserType,
} from '@aws-sdk/client-cognito-identity-provider'
import { CompleteUserInfo, UserStatus } from '../models/utils/user'
import {
    AdminCreateUserCredentials,
    AdminUserService,
    SearchUsersParameters,
} from '../models/components/admin-user-service'
import { BasicCognitoService } from './basic-cognito-service'
import '@quinck/collections'
import { FilledUserType } from './models/users'
import { UserNotFoundError } from './errors'
import { VerifiableAttribute } from './models/attributes'

export class CognitoAdminService<
        SignUpInfo extends Partial<UserInfoAttributes>,
        UserUpdateInfo extends Partial<UserInfoAttributes>,
        UserInfoAttributes extends Record<string, unknown>,
    >
    extends BasicCognitoService<SignUpInfo, UserUpdateInfo, UserInfoAttributes>
    implements AdminUserService<SignUpInfo, UserUpdateInfo, UserInfoAttributes>
{
    public async forceEmailVerification(username: string): Promise<void> {
        await this.forceAttributeVerification(username, 'email_verified')
    }

    public async forcePhoneNumberVerification(username: string): Promise<void> {
        await this.forceAttributeVerification(username, 'phone_number_verified')
    }

    public async createUser(
        { username, password }: AdminCreateUserCredentials,
        user: SignUpInfo,
        groups: string[] = [],
    ): Promise<void> {
        return this.tryDo(async () => {
            const attributes = this.createAttributesFromObject(
                this.fitSignUpInfo(user),
                false,
            )
            await this.cognitoIdentityProvider.adminCreateUser({
                UserPoolId: this.userPoolId,
                Username: username,
                TemporaryPassword: password,
                UserAttributes: attributes,
                DesiredDeliveryMediums: ['EMAIL'],
            })
            for (const group of groups) {
                await this._addUserToGroup(username, group)
            }
        })
    }

    public async addUserToGroup(
        username: string,
        group: string,
    ): Promise<void> {
        return this._addUserToGroup(username, group)
    }

    public async removeUserFromGroup(
        username: string,
        group: string,
    ): Promise<void> {
        await this.cognitoIdentityProvider.adminRemoveUserFromGroup({
            GroupName: group,
            UserPoolId: this.userPoolId,
            Username: username,
        })
    }

    private async _addUserToGroup(
        username: string,
        group: string,
    ): Promise<void> {
        await this.tryDo(() =>
            this.cognitoIdentityProvider.adminAddUserToGroup({
                GroupName: group,
                UserPoolId: this.userPoolId,
                Username: username,
            }),
        )
    }

    public async searchUsers(
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]> {
        return this.tryDo(async () => {
            const { Users } = await this._getAllUsers()
            return this.parseUsersSearchResult(Users)
        })
    }

    searchUsersInGroup(
        group: string,
        params: SearchUsersParameters,
    ): Promise<CompleteUserInfo<UserInfoAttributes>[]> {
        return this.tryDo(async () => {
            const { Users } = await this.getAllUsersByGroup(group)
            return this.parseUsersSearchResult(Users)
        })
    }

    public async getAllUsers(/* comment essential for eslint and prettier rules
     */): Promise<CompleteUserInfo<UserInfoAttributes>[]> {
        return await this.searchUsers({})
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

    private async parseUser(
        user: FilledUserType,
    ): Promise<CompleteUserInfo<UserInfoAttributes>> {
        const {
            Attributes,
            Username,
            UserCreateDate,
            UserLastModifiedDate,
            UserStatus,
            Enabled,
        } = user
        const attributes = await this.parseUserAttributes(Attributes)
        const groups = await this.getUserGroups(Username)
        return {
            ...this.createUserInfo(Username, attributes),
            groups,
            additionaInformation: {
                isEnabled: Enabled,
                createdDate: UserCreateDate,
                lastModifiedDate: UserLastModifiedDate,
                status: this.mapStatus(UserStatus),
            },
        }
    }

    private async _getAllUsers(): Promise<ListUsersCommandOutput> {
        return this.cognitoIdentityProvider.listUsers({
            UserPoolId: this.userPoolId,
        })
    }

    private async getAllUsersByGroup(
        groupName: string,
    ): Promise<ListUsersInGroupCommandOutput> {
        return this.cognitoIdentityProvider.listUsersInGroup({
            UserPoolId: this.userPoolId,
            GroupName: groupName,
        })
    }

    private async getUserGroups(username: string): Promise<string[]> {
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
            throw new Error('CUSTOM_NO_ATTRIBUTES_PROVIDED') //TODO error correct
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

    private mapStatus(status?: UserStatusType | string): UserStatus {
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

    private async parseUserAttributes(
        attributes: AttributeType[],
    ): Promise<CognitoUserAttribute[]> {
        return attributes.singleCollect(
            attr => attr.Name && attr.Value,
            ({ Name, Value }) =>
                new CognitoUserAttribute({
                    Name: Name as string,
                    Value: Value || '',
                }),
        )
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
            UserAttributes: [
                {
                    Name: attribute,
                    Value: 'true',
                },
            ],
        })
    }
}
