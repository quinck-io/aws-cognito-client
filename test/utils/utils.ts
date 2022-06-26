import { UserStructure } from '../../src/aws-cognito/models/users'
import { CompleteUserInfo, UserInfo } from '../../src/models/utils/user'
import { createUserAttribute } from '../../src/aws-cognito/utils'

export type UserInfoAttributes = {
    readonly email: string
    readonly firstName: string
    readonly lastName: string
}

export type UserInfoModel = UserInfo<UserInfoAttributes>

export type CompleteUserInfoModel = CompleteUserInfo<UserInfoModel>

export type UserSignUpInfo = UserInfoAttributes

export type UserUpdateInfo = Omit<Partial<UserInfoAttributes>, 'email'>

export type AdminSignUpInfo = UserInfoAttributes

export type AdminUpdateInfo = Omit<Partial<UserInfoAttributes>, 'email'>

export const userStructure: UserStructure<UserInfoAttributes> = {
    email: createUserAttribute('email'),
    firstName: createUserAttribute('given_name'),
    lastName: createUserAttribute('family_name'),
}
