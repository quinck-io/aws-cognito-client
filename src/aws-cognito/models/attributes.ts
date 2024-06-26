import { AttributeType } from '@aws-sdk/client-cognito-identity-provider'

export type CognitoAttributeName =
    | 'address'
    | 'birthdate'
    | 'email'
    | 'email_verified'
    | 'family_name'
    | 'gender'
    | 'given_name'
    | 'locale'
    | 'middle_name'
    | 'name'
    | 'nickname'
    | 'phone_number'
    | 'phone_number_verified'
    | 'picture'
    | 'preferred_username'
    | 'profile'
    | 'updated_at'
    | 'website'
    | 'zoneinfo'
    | `custom:${string}`

export type VerifiableAttribute = 'email_verified' | 'phone_number_verified'

export type CognitoUserAttribute = Required<AttributeType>
