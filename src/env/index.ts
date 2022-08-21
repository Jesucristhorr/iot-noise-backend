import { checkEnvs } from './check';

const parsedEnvs = checkEnvs();

export const envs = {
  ...parsedEnvs,
};
