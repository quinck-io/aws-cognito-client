import { Entries, StringKeyOf } from '../utils/types'

import {
    UserType,
    AttributeType,
} from '@aws-sdk/client-cognito-identity-provider'

export type VerifiableAttribute = 'email_verified' | 'phone_number_verified'

export type UserStructure<
    UserInfoAtributes,
    CognitoAttributeName extends string = string,
> = Record<
    StringKeyOf<UserInfoAtributes>,
    UserAttribute<unknown, CognitoAttributeName>
>

export type UserAttributesEntries<UserInfoAtributes> = Entries<
    StringKeyOf<UserInfoAtributes>,
    UserAttribute<unknown>
>

export interface UserAttribute<
    AttributeType,
    CognitoAttributeName extends string = string,
> {
    readonly cognitoName: CognitoAttributeName
    readonly parse: (x: string) => AttributeType
    readonly stringify: (x: AttributeType) => string
    readonly defaultValue?: AttributeType
}

export type FilledUserType = UserType & {
    Username: string
    Attributes: AttributeType[]
}
