import z from 'zod';

// TODO: Improve this schema
export const getUsersModel = z.object({
    pageSize: z.number().int().nonnegative().max(50).default(10),
    pageAfter: z.number().int().nonnegative().optional(),
    pageBefore: z.number().int().nonnegative().optional(),
});

export type GetUsers = z.infer<typeof getUsersModel>;

export const putUsersModel = z.object({
    userId: z.number().int().nonnegative(),
    displayName: z.string().min(2).max(255),
    previousPassword: z.string().min(10).max(32),
    password: z.string().min(10).max(32),
    roleId: z.number().int(),
});

export type PutUsers = z.infer<typeof putUsersModel>;

export const deleteUsersModel = z.object({
    userId: z.number().int().nonnegative(),
});

export type DeleteUsers = z.infer<typeof deleteUsersModel>;
