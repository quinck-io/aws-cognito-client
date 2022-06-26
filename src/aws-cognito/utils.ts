import { CognitoAttributeName } from './models/attributes'
import { UserAttribute } from './models/users'

export function defaultParse<X>(x: string): X {
    return x as unknown as X
}

export function defaultStringify<X>(x: X): string {
    return x as unknown as string
}

export function createUserAttribute<AttributeType>(
    cognitoName: CognitoAttributeName,
    parse: (x: string) => AttributeType = defaultParse,
    stringify: (x: AttributeType) => string = defaultStringify,
    defaultValue?: AttributeType,
): UserAttribute<AttributeType> {
    const userAttribute: UserAttribute<AttributeType> = {
        cognitoName,
        parse,
        stringify,
    }
    if (defaultValue) return { ...userAttribute, defaultValue }
    else return userAttribute
}
