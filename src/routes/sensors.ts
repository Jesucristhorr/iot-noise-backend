import { PostSensor } from '../models/sensors';
import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';
import path from 'path';

const workers: Worker[] = [];

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: PostSensor }>(
        '/',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: { body: fastify.zodRef('postSensorModel') },
        },
        async (
            {
                user,
                body: {
                    connection,
                    name,
                    description,
                    latitude,
                    longitude,
                    locationName,
                    measurementUnit,
                },
            },
            reply
        ) => {
            if (user.role.name !== 'System')
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            await fastify.prisma.sensor.create({
                data: {
                    uuid: uuidv4(),
                    name,
                    description,
                    latitude,
                    longitude,
                    locationName,
                    measurementUnit,
                    connectionType: {
                        connect: {
                            id: connection.protocolId,
                        },
                    },
                    connectionUrl: connection.connectionUrl,
                    connectionUsername: connection.connectionUsername,
                    connectionPassword: connection.connectionPassword,
                    user: {
                        connect: {
                            id: user.id,
                        },
                    },
                    plotData: {
                        create: {
                            labelX: 'dummy',
                            labelY: 'dummy',
                            maxValueY: 0,
                            minValueY: 0,
                        },
                    },
                },
            });

            const worker = new Worker(path.join(__dirname, '..', 'workers', 'init.js'), {
                workerData: {
                    path: './connectMQTT.ts',
                    connectionUrl: connection.connectionUrl,
                    protocolId: connection.protocolId,
                    protocol: 'mqtts',
                    username: connection.connectionUsername,
                    password: connection.connectionPassword,
                },
            });

            workers.push(worker);

            worker.on('message', (value) => {
                fastify.io.emit('sensor-data', {
                    sensorId: 'ESP32-TEST',
                    lat: value.values.lat,
                    lng: value.values.lng,
                    measurement: value.values.noiseLevel,
                });
            });

            return {
                msg: 'Sensor created successfully!',
            };
        }
    );
};

export const autoPrefix = '/sensors';

export default routes;
