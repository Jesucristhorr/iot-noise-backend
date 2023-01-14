import {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
} from './auth';
import { getUsersModel } from './users';

export type { PostLogin, PostSignup, SignupVerify, SignupResendEmail } from './auth';
export type { GetUsers } from './users';

export default {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
    getUsersModel,
};
