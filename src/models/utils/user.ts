export interface BasicUserInfo {
    id: string
}

export type UserInfo<UserInfoAttributes> = UserInfoAttributes & BasicUserInfo

export type UserProfileRelatedInformation = {
    groups: string[]
    additionaInformation?: UserAdditionalInfo
}

export type CompleteUserInfo<UserInfoAttributes> =
    UserInfo<UserInfoAttributes> & UserProfileRelatedInformation

export type Credentials = {
    username: string
    password: string
}

export type LoginAdditionalData = {
    forceChangePassword?: {
        password: string
    }
}

export enum UserStatus {
    UNKNOWN = 'UNKNOWN',
    UNCONFIRMED = 'UNCONFIRMED',
    CONFIRMED = 'CONFIRMED',
    ARCHIVED = 'ARCHIVED',
    COMPROMISED = 'COMPROMISED',
    RESET_REQUIRED = 'RESET_REQUIRED',
    FORCE_CHANGE_PASSWORD = 'FORCE_CHANGE_PASSWORD',
}

export type UserAdditionalInfo = {
    isEnabled?: boolean
    createdDate?: Date
    lastModifiedDate?: Date
    status?: UserStatus
}
