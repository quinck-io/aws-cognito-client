import {
    AuthenticationDetails,
    CognitoAccessToken,
    CognitoIdToken,
    CognitoRefreshToken,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserPool,
    CognitoUserSession,
    ICognitoUserData,
} from 'amazon-cognito-identity-js'
import {
    CustomAuthChallengeResponse,
    CustomAuthChallengeResponseStatus,
    CustomAuthChallengeParameters,
    CompletedCustomAuthChallengeResponse,
} from '../models/components/auth-service'
import { RefreshAuthToken, UserToken } from '../models/utils/auth'
import { Credentials, LoginAdditionalData } from '../models/utils/user'
import { ForceChangePasswordException } from './errors'

type CognitoUserWithSession = CognitoUser & { Session: string }

export class RichCognitoUser extends CognitoUser {
    public static createUser(
        pool: CognitoUserPool,
        username = '',
    ): RichCognitoUser {
        return new RichCognitoUser({
            Pool: pool,
            Username: username,
        })
    }

    private constructor(data: ICognitoUserData) {
        super(data)
    }

    public getUserAttributesPromise(): Promise<CognitoUserAttribute[]> {
        return new Promise((resolve, reject) => {
            this.getUserAttributes((error, data) => {
                if (error) reject(error)
                else data ? resolve(data) : reject()
            })
        })
    }

    public deleteUserPromise(): Promise<void> {
        return new Promise((resolve, reject) => {
            super.deleteUser(error => {
                if (error) reject(error)
                else resolve()
            })
        })
    }

    public setSignInUserSessionByToken(token: UserToken): void {
        const { accessToken, idToken, refreshToken } = token
        this.setSignInUserSession(
            new CognitoUserSession({
                AccessToken: new CognitoAccessToken({
                    AccessToken: accessToken,
                }),
                IdToken: new CognitoIdToken({ IdToken: idToken }),
                RefreshToken: new CognitoRefreshToken({
                    RefreshToken: refreshToken,
                }),
            }),
        )
    }

    public async updateAttributesPromise(
        attributes: CognitoUserAttribute[],
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.updateAttributes(attributes, err => {
                if (err) reject(err)
                else resolve()
            })
        })
    }

    public changePasswordPromise(
        oldPassword: string,
        newPassword: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            this.changePassword(oldPassword, newPassword, err => {
                if (err) reject(err)
                else resolve()
            })
        })
    }

    public authenticateUserPromise(
        credentials: Credentials,
        additionalData?: LoginAdditionalData,
    ): Promise<UserToken> {
        return new Promise((resolve, reject) => {
            const authenticationDetails = new AuthenticationDetails({
                Username: credentials.username,
                Password: credentials.password,
            })
            this.authenticateUser(authenticationDetails, {
                onFailure: err => reject(err),
                onSuccess: data =>
                    resolve(this.createTokenFromCognitoSession(data)),
                newPasswordRequired: () => {
                    if (
                        additionalData != undefined &&
                        additionalData.forceChangePassword != undefined
                    )
                        this.completeNewPasswordChallenge(
                            additionalData.forceChangePassword.password,
                            undefined,
                            {
                                onSuccess: session =>
                                    resolve(
                                        this.createTokenFromCognitoSession(
                                            session,
                                        ),
                                    ),
                                onFailure: err => reject(err),
                            },
                        )
                    else reject(new ForceChangePasswordException())
                },
            })
        })
    }

    public initCustomAuthChallenge(
        username: string,
    ): Promise<CustomAuthChallengeResponse> {
        return new Promise((resolve, reject) => {
            super.setAuthenticationFlowType('CUSTOM_AUTH')

            const authenticationDetails = new AuthenticationDetails({
                Username: username,
            })

            super.initiateAuth(authenticationDetails, {
                onSuccess: userSession =>
                    resolve({
                        status: CustomAuthChallengeResponseStatus.COMPLETED,
                        userToken:
                            this.createTokenFromCognitoSession(userSession),
                    }),
                onFailure: err => reject(err),
                customChallenge: (parameters: CustomAuthChallengeParameters) =>
                    resolve({
                        status: CustomAuthChallengeResponseStatus.VERIFICATION_REQUIRED,
                        parameters,
                        session: this.getRawSession(),
                    }),
            })
        })
    }

    public verifyCustomAuthChallenge(
        challengeResponse: string,
        session: string,
    ): Promise<CompletedCustomAuthChallengeResponse> {
        this.setRawSession(session)
        return new Promise((resolve, reject) => {
            super.sendCustomChallengeAnswer(challengeResponse, {
                onSuccess: session =>
                    resolve({
                        status: CustomAuthChallengeResponseStatus.COMPLETED,
                        userToken: this.createTokenFromCognitoSession(session),
                    }),
                onFailure: err => reject(err),
            })
        })
    }

    public refreshToken(token: RefreshAuthToken): Promise<UserToken> {
        return new Promise((resolve, reject) => {
            const refreshToken = new CognitoRefreshToken({
                RefreshToken: token.refreshToken,
            })
            this.refreshSession(refreshToken, (err, data) => {
                if (err) reject(err)
                else resolve(this.createTokenFromCognitoSession(data))
            })
        })
    }

    public globalSignOutPromise(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.globalSignOut({
                onSuccess: () => resolve(),
                onFailure: reject,
            })
        })
    }

    public confirmRegistrationPromise(code: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.confirmRegistration(code, false, err => {
                if (err) reject(err)
                resolve()
            })
        })
    }

    private createTokenFromCognitoSession(data: CognitoUserSession): UserToken {
        return {
            accessToken: data.getAccessToken().getJwtToken(),
            idToken: data.getIdToken().getJwtToken(),
            refreshToken: data.getRefreshToken().getToken(),
        }
    }

    private setRawSession(session: string): void {
        const self = this as unknown as CognitoUserWithSession
        self.Session = session
    }

    private getRawSession(): string {
        const self = this as unknown as CognitoUserWithSession
        return self.Session as string
    }
}
