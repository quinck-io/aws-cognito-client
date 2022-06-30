import { CognitoServiceConfig } from '../aws-cognito/basic-cognito-service'
import { CognitoAdminService } from '../aws-cognito/cognito-admin-service'
import { AdminUserService } from '../models/components/admin-user-service'
import { InvalidParameterError } from './errors'

export function createAdminUserService<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
>(
    params: AdminUserServiceParams<
        SignUpInfo,
        UserUpdateInfo,
        UserInfoAttributes
    >,
): AdminUserService<SignUpInfo, UserUpdateInfo, UserInfoAttributes> {
    if (params.type === 'cognito') return new CognitoAdminService(params)
    throw new InvalidParameterError()
}

export type AdminUserServiceParams<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = CognitoAdminUserServiceParams<
    SignUpInfo,
    UserUpdateInfo,
    UserInfoAttributes
>

export type CognitoAdminUserServiceParams<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = CognitoServiceConfig<SignUpInfo, UserUpdateInfo, UserInfoAttributes> & {
    type: 'cognito'
}
