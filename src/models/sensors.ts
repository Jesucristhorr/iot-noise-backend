import z from 'zod';

export const postSensorModel = z.object({
    name: z.string().max(64),
    description: z.string().max(255),
    measurementUnit: z.string().max(24),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationName: z.string().max(100),
    measurementKeyName: z.string().max(100),
    protocolId: z.number().int().nonnegative(),
    connectionData: z.record(z.any()),
});

export type PostSensor = z.infer<typeof postSensorModel>;

export const deleteSensorModel = z.object({
    sensorId: z.number().int().nonnegative(),
});

export type DeleteSensor = z.infer<typeof deleteSensorModel>;
