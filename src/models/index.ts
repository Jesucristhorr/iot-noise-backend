import {
    postLoginModel,
    postSignupModel,
    signupVerifyModel,
    signupResendEmail,
} from './auth';
import { getUsersModel, putUsersModel, deleteUsersModel } from './users';
import {
    postSensorModel,
    deleteSensorModel,
    putSensorModel,
    getSensorStatusModel,
} from './sensors';
import { getMetricsModel } from './metrics';

export type { PostLogin, PostSignup, SignupVerify, SignupResendEmail } from './auth';
export type { GetUsers, PutUsers, DeleteUsers } from './users';
export type { PostSensor, DeleteSensor, PutSensor, GetSensorStatus } from './sensors';
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
    getSensorStatusModel,
    putUsersModel,
    deleteUsersModel,
};
