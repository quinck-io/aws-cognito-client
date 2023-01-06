import {
    AttributeType,
    CognitoIdentityProvider,
} from '@aws-sdk/client-cognito-identity-provider'
import { SearchUserFilter } from '../../models/components/admin-user-service'

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

export type SearchableAttribute =
    | Extract<
          CognitoAttributeName,
          | 'email'
          | 'phone_number'
          | 'name'
          | 'given_name'
          | 'family_name'
          | 'preferred_username'
      >
    | 'username' // (case-sensitive)
    | 'cognito:user_status' // (called Status in the Console) (case-insensitive)
    | 'status' // (called Enabled in the Console) (case-sensitive)
    | 'sub'

export type CognitoFilters<UserInfoAttributes extends Record<string, unknown>> =
    {
        cognitoFilter: Parameters<
            CognitoIdentityProvider['listUsers']
        >[0]['Filter']
        filters: SearchUserFilter<UserInfoAttributes>[]
    }
