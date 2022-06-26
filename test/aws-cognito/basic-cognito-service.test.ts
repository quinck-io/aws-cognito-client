import { BasicCognitoService } from './../../src/aws-cognito/basic-cognito-service'
import 'mocha'
import { expect } from 'chai'
import {
    userStructure,
    UserInfoAttributes,
    UserUpdateInfo,
    UserSignUpInfo,
} from '../utils/utils'

describe('Tests for BasicCognitoService', () => {
    it('should allow to be constructed', () => {
        const cognito = new BasicCognitoService<
            UserSignUpInfo,
            UserUpdateInfo,
            UserInfoAttributes
        >({
            userPoolId: '',
            userStructure,
        })

        expect(cognito).to.be.instanceOf(BasicCognitoService)
    })
})
