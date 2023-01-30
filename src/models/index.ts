import {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
} from './auth';
import { getUsersModel } from './users';
import { postSensorModel } from './sensors';

export type { PostLogin, PostSignup, SignupVerify, SignupResendEmail } from './auth';
export type { GetUsers } from './users';
export type { PostSensor } from './sensors';

export default {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
    getUsersModel,
    postSensorModel,
};
