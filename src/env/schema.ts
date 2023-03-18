import z from 'zod';

export const serverSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HAS_BEEN_BUILT: z
        .string()
        .regex(/[1-9]+/g)
        .default('0')
        .transform((flag) => !!flag),
    PORT: z
        .string()
        .regex(/[1-9]+/g)
        .default('3000')
        .transform((number) => Number(number)),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(4),
    SENDGRID_API_KEY: z.string().min(6),
    SENDGRID_DEFAULT_SENDER: z.string().email(),
    SENDGRID_CONFIRM_EMAIL_TEMPLATE_ID: z.string().min(6),
    BASE_API_URL: z.string().url(),
    REDIS_HOST: z.string().min(2),
    REDIS_PORT: z
        .string()
        .regex(/[1-9]+/g)
        .transform((number) => Number(number)),
    REDIS_DATABASE_NUMBER: z
        .string()
        .regex(/[0-9]+/g)
        .default('0')
        .transform((number) => Number(number)),
    REDIS_USERNAME: z.string().min(2),
    REDIS_PASSWORD: z.string().default('none'),
});
