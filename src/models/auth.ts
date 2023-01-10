import z from 'zod';

export const postLoginModel = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(32),
});

export type PostLogin = z.infer<typeof postLoginModel>;
