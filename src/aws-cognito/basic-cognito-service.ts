import {
    AttributeType,
    CognitoIdentityProvider,
    CognitoIdentityProviderClientConfig,
    ExpiredCodeException,
    InvalidPasswordException,
    NotAuthorizedException,
    UnauthorizedException,
    UserNotFoundException,
    UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider'
import '@quinck/collections'
import { BasicUserInfo, UserInfo } from '../models/utils/user'
import {
    BasicError,
    ForceChangePasswordError,
    InvalidOrExpiredCodeError,
    InvalidPasswordError,
    UnauthorizedError,
    UnknownInternalError,
    UserAlreadyExistsError,
    UserNotFoundError,
    UserNotRetrievedError,
    WrongUsernameOrPasswordError,
} from '../utils/errors'
import { CognitoUserAttribute } from './models/attributes'
import { UserAttributesEntries, UserStructure } from './models/users'

export type CognitoServiceConfig<
    SignUpInfo extends Partial<UserInfoAttributes>,
    UserUpdateInfo extends Partial<UserInfoAttributes>,
    UserInfoAttributes extends Record<string, unknown>,
> = {
    userPoolId: string
    userStructure: UserStructure<UserInfoAttributes>
    fitSignUpInfo?: (user: SignUpInfo) => SignUpInfo
    fitUserUpdateInfo?: (user: UserUpdateInfo) => UserUpdateInfo
    cognitoIdentityProviderClientConfig?: CognitoIdentityProviderClientConfig
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
        const {
            userPoolId,
            userStructure,
            cognitoIdentityProviderClientConfig,
            fitSignUpInfo,
            fitUserUpdateInfo,
        } = config
        this.cognitoIdentityProvider = new CognitoIdentityProvider(
            cognitoIdentityProviderClientConfig ?? {},
        )
        this.userStructure = userStructure
        this.userAttributes = Object.entries(
            userStructure,
        ) as UserAttributesEntries<UserInfoAttributes>
        this.fitSignUpInfo =
            fitSignUpInfo || BasicCognitoService.DEFAULT_FIT_INFO
        this.fitUserUpdateInfo =
            fitUserUpdateInfo || BasicCognitoService.DEFAULT_FIT_INFO
        this.userPoolId = userPoolId
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
                ([key, { cognitoName, stringify }]) => ({
                    Name: cognitoName,
                    Value: stringify(user[key]),
                }),
            ],
            [
                ([, { defaultValue }]) =>
                    defaultIfUndefined && defaultValue != undefined,
                ([, { cognitoName, stringify, defaultValue }]) => ({
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

    protected parseUserAttributes(
        attributes: AttributeType[],
    ): CognitoUserAttribute[] {
        return attributes.singleCollect(
            attr => attr.Name && attr.Value,
            ({ Name, Value }) => ({
                Name: Name as string,
                Value: Value || '',
            }),
        )
    }

    protected createError(error: unknown): Error {
        if (!(error instanceof Error)) return new UnknownInternalError(error)
        if (error instanceof BasicError) return error
        switch (error.name) {
            case UserNotFoundException.name:
            case UserNotFoundError.name:
                return new UserNotFoundError(error)
            case NotAuthorizedException.name:
                return new WrongUsernameOrPasswordError(error)
            case UsernameExistsException.name:
                return new UserAlreadyExistsError(error)
            case UnauthorizedException.name:
                return new UnauthorizedError(error)
            case ForceChangePasswordError.name:
                return new ForceChangePasswordError(error)
            case UserNotRetrievedError.name:
                return new UserNotRetrievedError(error)
            case InvalidPasswordException.name:
                return new InvalidPasswordError(error)
            case ExpiredCodeException.name:
                return new InvalidOrExpiredCodeError(error)
            default:
                return new UnknownInternalError(error)
        }
    }
}
