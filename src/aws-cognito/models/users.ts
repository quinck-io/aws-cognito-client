import { Entries, StringKeyOf } from '../../utils/types'

import { UserType } from '@aws-sdk/client-cognito-identity-provider'
import { CognitoAttributeName } from './attributes'

export type UserStructure<UserInfoAtributes> = Record<
    StringKeyOf<UserInfoAtributes>,
    UserAttribute<unknown>
>

export type UserAttributesEntries<UserInfoAtributes> = Entries<
    StringKeyOf<UserInfoAtributes>,
    UserAttribute<unknown>
>

export interface UserAttribute<AttributeType> {
    readonly cognitoName: CognitoAttributeName
    readonly parse: (x: string) => AttributeType
    readonly stringify: (x: AttributeType) => string
    readonly defaultValue?: AttributeType
}

export type FilledUserType = Omit<UserType, 'Username' | 'Attributes'> &
    Required<Pick<UserType, 'Username' | 'Attributes'>>
