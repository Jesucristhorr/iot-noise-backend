import z from 'zod';

export const postSensorModel = z.object({
    name: z.string().max(64),
    description: z.string().max(255),
    measurementUnit: z.string().max(24),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationName: z.string().max(100),
    connection: z.object({
        protocolId: z.number().int().nonnegative(),
        connectionUrl: z.string().max(255),
        connectionUsername: z.string().max(100),
        connectionPassword: z.string().max(100),
    }),
});

export type PostSensor = z.infer<typeof postSensorModel>;
