import { CognitoServiceConfig } from '../aws-cognito/basic-cognito-service'
import {
    CognitoUserService,
    CognitoUserServiceConfig,
} from '../aws-cognito/cgnito-user-service'
import { UserService } from '../models/components/user-service'
import { InvalidParameterError } from './errors'

export function createUserService<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
>(
    params: UserServiceParams<SignUpInfo, UserUpdateInfo, UserInfoAttributes>,
): UserService<SignUpInfo, UserUpdateInfo, UserInfoAttributes> {
    if (params.type === 'cognito') return new CognitoUserService(params)
    throw new InvalidParameterError()
}

export type UserServiceParams<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = CognitoUserServiceParams<SignUpInfo, UserUpdateInfo, UserInfoAttributes>

export type CognitoUserServiceParams<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = CognitoServiceConfig<SignUpInfo, UserUpdateInfo, UserInfoAttributes> &
    CognitoUserServiceConfig & { type: 'cognito' }
