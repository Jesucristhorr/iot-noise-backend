import {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
} from './auth';
import { getUsersModel } from './users';
import { postSensorModel, deleteSensorModel, putSensorModel } from './sensors';
import { getMetricsModel } from './metrics';

export type { PostLogin, PostSignup, SignupVerify, SignupResendEmail } from './auth';
export type { GetUsers } from './users';
export type { PostSensor, DeleteSensor, PutSensor } from './sensors';
export type { GetMetrics } from './metrics';

export default {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
    getUsersModel,
    postSensorModel,
    getMetricsModel,
    deleteSensorModel,
    putSensorModel,
};
