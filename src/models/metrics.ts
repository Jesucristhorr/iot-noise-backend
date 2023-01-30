import z from 'zod';

export const getMetricsModel = z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }).default(new Date().toISOString()),
    sensorId: z.number().int().nonnegative().optional(),
});

export type GetMetrics = z.infer<typeof getMetricsModel>;
