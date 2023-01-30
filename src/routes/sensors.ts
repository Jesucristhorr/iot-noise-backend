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
            if (!['System', 'Admin'].includes(user.role.name))
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            const sensorCreated = await fastify.prisma.sensor.create({
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
                    path: './connectMQTT.js',
                    connectionUrl: connection.connectionUrl,
                    protocolId: 'MQTT',
                    protocol: 'mqtts',
                    username: connection.connectionUsername,
                    password: connection.connectionPassword,
                },
            });

            workers.push(worker);

            worker.on('message', (value) => {
                fastify.log.info(value, 'emit value from mqtt:');
                fastify.io.emit('sensor-data', {
                    sensorId: sensorCreated.id,
                    name: sensorCreated.name,
                    locationName: sensorCreated.locationName,
                    lat: +value.values.lat,
                    lng: +value.values.lng,
                    measurement: value.values.noiseLevel,
                    timestamp: Date.now(),
                });
            });

            worker.on('error', (err) => {
                // TODO: Handle exponential backoff
                fastify.log.error(err, 'Something went wrong when creating worker:');
            });

            return {
                msg: 'Sensor created successfully!',
            };
        }
    );

    fastify.get('/', async () => {
        const sensors = await fastify.prisma.sensor.findMany({
            where: { deletedAt: null },
            include: { connectionType: true },
        });

        return {
            sensors,
        };
    });
};

export const autoPrefix = '/sensors';

export default routes;
