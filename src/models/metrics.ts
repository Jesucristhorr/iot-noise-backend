import z from 'zod';

export const getMetricsModel = z.object({
    from: z
        .string()
        .datetime({ offset: true })
        .transform((data) => new Date(data)),
    to: z
        .string()
        .datetime({ offset: true })
        .default(new Date().toISOString())
        .transform((data) => new Date(data)),
    sensorId: z.number().int().nonnegative().optional(),
});

export type GetMetrics = z.infer<typeof getMetricsModel>;
