import { serverSchema } from './schema';

export function checkEnvs() {
    const serverEnv = serverSchema.safeParse(process.env);

    if (!serverEnv.success) {
        console.error('Invalid environment variables: ', serverEnv.error.format());
        throw new Error('Invalid environment variables');
    }

    return serverEnv.data;
}
