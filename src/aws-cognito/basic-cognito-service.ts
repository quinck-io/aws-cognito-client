import { BasicUserInfo, UserInfo } from '../models/utils/user'
import { CognitoUserAttribute } from 'amazon-cognito-identity-js'
import { UserAttributesEntries, UserStructure } from './models/users'
import '@quinck/collections'
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider'
import { BasicError } from '../utils/errors'

export type CognitoServiceConfig<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = {
    userPoolId: string
    userStructure: UserStructure<UserInfoAttributes>
    fitSignUpInfo?: (user: SignUpInfo) => SignUpInfo
    fitUserUpdateInfo?: (user: UserUpdateInfo) => UserUpdateInfo
}

export class BasicCognitoService<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> {
    public static readonly DEFAULT_FIT_INFO: <X>(user: X) => X = x => x

    protected readonly userPoolId: string
    protected readonly cognitoIdentityProvider: CognitoIdentityProvider
    protected readonly fitSignUpInfo: (user: SignUpInfo) => SignUpInfo
    protected readonly fitUserUpdateInfo: (
        user: UserUpdateInfo,
    ) => UserUpdateInfo

    private readonly userStructure: UserStructure<UserInfoAttributes>
    private readonly userAttributes: UserAttributesEntries<UserInfoAttributes>

    public constructor(
        config: CognitoServiceConfig<
            SignUpInfo,
            UserUpdateInfo,
            UserInfoAttributes
        >,
    ) {
        this.cognitoIdentityProvider = new CognitoIdentityProvider({})
        this.userStructure = config.userStructure
        this.userAttributes = Object.entries(
            config.userStructure,
        ) as UserAttributesEntries<UserInfoAttributes>
        this.fitSignUpInfo =
            config.fitSignUpInfo || BasicCognitoService.DEFAULT_FIT_INFO
        this.fitUserUpdateInfo =
            config.fitUserUpdateInfo || BasicCognitoService.DEFAULT_FIT_INFO
        this.userPoolId = config.userPoolId
    }

    protected async tryDo<X>(fun: () => Promise<X>): Promise<X> {
        try {
            return await fun()
        } catch (error) {
            throw this.createError(error)
        }
    }

    protected createAttributesFromObject(
        user: Partial<Record<string, unknown>>,
        defaultIfUndefined = true,
    ): CognitoUserAttribute[] {
        const attributes = this.userAttributes.collect([
            [
                ([key]) => user[key] != undefined,
                ([key, { cognitoName, stringify }]) =>
                    new CognitoUserAttribute({
                        Name: cognitoName,
                        Value: stringify(user[key]),
                    }),
            ],
            [
                ([, { defaultValue }]) =>
                    defaultIfUndefined && defaultValue != undefined,
                ([, { cognitoName, stringify, defaultValue }]) =>
                    new CognitoUserAttribute({
                        Name: cognitoName,
                        Value: stringify(defaultValue),
                    }),
            ],
        ])

        return attributes
    }

    protected createUserInfoAttributesFromAttributes(
        attributes: CognitoUserAttribute[],
    ): UserInfoAttributes {
        const attributesByName = attributes.groupBy(
            x => x.Name,
            x => x,
        )
        return this.userAttributes.reduce((userInfo, attribute) => {
            const [key, { cognitoName }] = attribute
            const attr = attributesByName.get(cognitoName)
            if (attr != undefined)
                userInfo[key] = this.userStructure[key].parse(attr.Value)
            else userInfo[key] = this.userStructure[key].defaultValue
            return userInfo
        }, {} as Partial<Record<string, unknown>>) as UserInfoAttributes
    }

    protected getBasicUserInfo(username: string): BasicUserInfo {
        return { id: username }
    }

    protected createUserInfo(
        username: string,
        attributes: CognitoUserAttribute[],
    ): UserInfo<UserInfoAttributes> {
        return {
            ...this.getBasicUserInfo(username),
            ...this.createUserInfoAttributesFromAttributes(attributes),
        }
    }

    protected createError(error: unknown): Error {
        if (error instanceof Error) throw error
        return new BasicError(error)
    }
}