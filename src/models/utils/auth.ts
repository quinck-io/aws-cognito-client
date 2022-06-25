export type UserToken = {
    readonly accessToken: string
    readonly idToken: string
    readonly refreshToken: string
}

export type BasicAuthToken = {
    readonly idToken: string
}

export type UserAuthToken = {
    readonly accessToken: string
    readonly idToken: string
}

export type RefreshAuthToken = {
    readonly refreshToken: string
}
