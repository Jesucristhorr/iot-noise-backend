import z from 'zod';

// TODO: Improve this schema
export const getUsersModel = z.object({
    pageSize: z.number().int().nonnegative().max(50).default(10),
    pageAfter: z.number().int().nonnegative().optional(),
    pageBefore: z.number().int().nonnegative().optional(),
});

export type GetUsers = z.infer<typeof getUsersModel>;
