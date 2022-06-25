import jwt_decode from 'jwt-decode'
import { BasicAuthToken } from '../models/utils/auth'

type IdTokenStructure = {
    'cognito:username': string
}

export function usernameFromUserToken({ idToken }: BasicAuthToken): string {
    const decodedToken = jwt_decode<IdTokenStructure>(idToken)
    return decodedToken['cognito:username']
}
