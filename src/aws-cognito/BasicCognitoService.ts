import { BasicUserInfo, UserInfo } from '../models/utils/user'
import { CognitoUserAttribute } from 'amazon-cognito-identity-js'
import { UserAttributesEntries, UserStructure } from './models'
import '@quinck/collections'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'

export type CognitoServiceConfig<
    SignUpInfo,
    UserUpdateInfo,
    UserInfoAtributes,
> = {
    userPoolId: string
    userStructure: UserStructure<UserInfoAtributes>
    fitSignUpInfo?: (user: SignUpInfo) => SignUpInfo
    fitUserUpdateInfo?: (user: UserUpdateInfo) => UserUpdateInfo
}

export class BasicCognitoService<
    SignUpInfo extends Partial<UserInfoAtributes>,
    UserUpdateInfo extends Partial<UserInfoAtributes>,
    UserInfoAtributes,
> {
    public static readonly DEFAULT_FIT_INFO: <X>(user: X) => X = x => x

    protected readonly userPoolId: string
    protected readonly cognitoIdentityProviderClient: CognitoIdentityProviderClient
    private readonly userStructure: UserStructure<UserInfoAtributes>
    private readonly userAttributes: UserAttributesEntries<UserInfoAtributes>
    protected readonly fitSignUpInfo: (user: SignUpInfo) => SignUpInfo
    protected readonly fitUserUpdateInfo: (
        user: UserUpdateInfo,
    ) => UserUpdateInfo

    public constructor(
        config: CognitoServiceConfig<
            SignUpInfo,
            UserUpdateInfo,
            UserInfoAtributes
        >,
    ) {
        this.cognitoIdentityProviderClient = new CognitoIdentityProviderClient(
            {},
        )
        this.userStructure = config.userStructure
        this.userAttributes = Object.entries(
            config.userStructure,
        ) as UserAttributesEntries<UserInfoAtributes>
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
    ): UserInfoAtributes {
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
        }, {} as Partial<Record<string, unknown>>) as UserInfoAtributes
    }

    protected getBasicUserInfo(username: string): BasicUserInfo {
        return { id: username }
    }

    protected createUserInfo(
        username: string,
        attributes: CognitoUserAttribute[],
    ): UserInfo<UserInfoAtributes> {
        return {
            ...this.getBasicUserInfo(username),
            ...this.createUserInfoAttributesFromAttributes(attributes),
        }
    }

    protected createError(error: unknown): Error {
        // if (error instanceof Error)
        //     switch (error.name) {
        //         case CognitoError.USERNAME_EXIST:
        //         case CognitoError.ALIAS_EXISTS:
        //             return new UserAlreadyExistError(error)
        //         case CognitoError.INVALID_PARAMETER:
        //         case CognitoError.CODE_MISMATCH:
        //         case CognitoError.INVALID_PASSWORD:
        //             return new BadRequestError(error)
        //         case CognitoError.RESOURCE_NOT_FOUND:
        //         case CognitoError.USER_NOT_FOUND:
        //             return new UserNotFoundError(error)
        //         case CognitoError.NOT_AUTHORIZED:
        //         case CognitoError.CUSTOM_FORCE_CHANGE_PASSWORD:
        //             return new UserNotAuthenticatedError(error)
        //         case CognitoError.USER_NOT_CONFIRMED:
        //             return new UserNotConfirmedError(error)
        //         default:
        //             return new InternalServerError(error)
        //     }
        // else if (typeof error === 'string')
        //     return new InternalServerError(new Error(error))
        // return new InternalServerError()
        return new Error()
    }
}
