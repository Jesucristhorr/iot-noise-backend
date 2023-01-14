import z from 'zod';

export const postLoginModel = z.object({
    email: z.string().email(),
    password: z.string().min(6).max(32),
});

export type PostLogin = z.infer<typeof postLoginModel>;

export const postSignupModel = z.object({
    displayName: z.string().min(2).max(255),
    email: z.string().email().max(255),
    username: z.string().min(4).max(24),
    password: z.string().min(6).max(32),
    roleId: z.number().int(),
});

export type PostSignup = z.infer<typeof postSignupModel>;

export const signupVerifyModel = z.object({
    userId: z.number().int().nonnegative(),
    token: z.string().min(4),
});

export type SignupVerify = z.infer<typeof signupVerifyModel>;

export const signupResendEmail = z.object({
    userId: z.number().int().nonnegative(),
});

export type SignupResendEmail = z.infer<typeof signupResendEmail>;
