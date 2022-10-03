import z from 'zod';

export const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z
    .string()
    .regex(/[1-9]+/g)
    .default('3000')
    .transform((number) => Number(number)),
  DATABASE_URL: z.string().url(),
});
