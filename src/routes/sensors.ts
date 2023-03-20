import { DeleteSensor, GetSensorStatus, PostSensor, PutSensor } from '../models/sensors';
import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { backOff } from 'exponential-backoff';
import { prepareMQTTConnection } from '../helpers/mqtt';

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
                    protocolId,
                    connectionData,
                    measurementKeyName,
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
                            id: protocolId,
                        },
                    },
                    measurementKeyName,
                    connectionData: {
                        create: {
                            data: connectionData,
                        },
                    },
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
                include: {
                    connectionType: true,
                },
            });

            const protocol = sensorCreated.connectionType.protocol.toLowerCase();

            if (protocol === 'mqtt' || protocol === 'mqtts') {
                // MQTT connection
                if (
                    !connectionData.connectionUrl ||
                    !connectionData.username ||
                    !connectionData.topic
                ) {
                    fastify.log.info(
                        `Sensor ${sensorCreated.id} doesn't have required properties`
                    );
                }

                const connectionUrl = connectionData.connectionUrl as string;
                const username = connectionData.username as string;
                const password = connectionData.password as string | undefined;
                const topic = connectionData.topic as string;

                globalThis.cancelSignalBySensorId[sensorCreated.id] = 'retry';

                backOff(
                    () =>
                        prepareMQTTConnection({
                            protocol,
                            connectionUrl,
                            sensorId: sensorCreated.id,
                            topic,
                            username,
                            password,
                            measurementKeyName,
                            fastifyInstance: fastify,
                        }),
                    {
                        delayFirstAttempt: false,
                        maxDelay: 300 * 1000,
                        numOfAttempts: 30,
                        retry: (_, attemptNumber) => {
                            const cancelSignal =
                                globalThis.cancelSignalBySensorId[sensorCreated.id];
                            fastify.log.info(
                                `${
                                    cancelSignal === 'retry'
                                        ? 'Attempting'
                                        : 'Stop trying'
                                } to connect sensor ${
                                    sensorCreated.id
                                } on startup. Retry attempt: ${attemptNumber}`
                            );
                            return (
                                globalThis.cancelSignalBySensorId[sensorCreated.id] ===
                                'retry'
                            );
                        },
                    }
                )
                    .then(() =>
                        fastify.log.info(
                            `Sensor ${sensorCreated.id} connected successfully!`
                        )
                    )
                    .catch((err) =>
                        fastify.log.error(err, 'Error in exponential backoff')
                    );
            } else {
                fastify.log.warn(
                    `Sensor ${sensorCreated.id} was created but protocol '${protocol}' not yet implemented`
                );
            }

            return reply.status(201).send({
                msg: `Sensor ${sensorCreated.id} created successfully!`,
            });
        }
    );

    fastify.put<{ Body: PutSensor }>(
        '/',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: { body: fastify.zodRef('putSensorModel') },
        },
        async (
            {
                user,
                body: {
                    sensorId,
                    protocolId,
                    connectionData,
                    measurementKeyName,
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

            const sensorCreated = await fastify.prisma.sensor.update({
                where: {
                    id: sensorId,
                },
                data: {
                    name,
                    description,
                    latitude,
                    longitude,
                    locationName,
                    measurementUnit,
                    connectionType: {
                        connect: {
                            id: protocolId,
                        },
                    },
                    measurementKeyName,
                    connectionData: {
                        update: {
                            data: connectionData,
                        },
                    },
                },
                include: {
                    connectionType: true,
                },
            });

            const protocol = sensorCreated.connectionType.protocol.toLowerCase();

            fastify.log.debug(`Stop worker`);

            const worker = globalThis.workersBySensorId[sensorId];

            if (worker) {
                await worker
                    .terminate()
                    .catch((err) =>
                        fastify.log.error(err, 'Error on worker termination:')
                    );

                delete globalThis.workersBySensorId[sensorId];
                fastify.log.debug(`Worker for sensor ${sensorId} stopped and deleted!`);
            }

            if (protocol === 'mqtt' || protocol === 'mqtts') {
                // MQTT connection
                if (
                    !connectionData.connectionUrl ||
                    !connectionData.username ||
                    !connectionData.topic
                ) {
                    fastify.log.info(
                        `Sensor ${sensorCreated.id} doesn't have required properties`
                    );
                }

                const connectionUrl = connectionData.connectionUrl as string;
                const username = connectionData.username as string;
                const password = connectionData.password as string | undefined;
                const topic = connectionData.topic as string;

                globalThis.cancelSignalBySensorId[sensorId] = 'retry';

                backOff(
                    () =>
                        prepareMQTTConnection({
                            protocol,
                            connectionUrl,
                            sensorId: sensorCreated.id,
                            topic,
                            username,
                            password,
                            measurementKeyName,
                            fastifyInstance: fastify,
                        }),
                    {
                        delayFirstAttempt: false,
                        maxDelay: 300 * 1000,
                        numOfAttempts: 30,
                        retry: (_, attemptNumber) => {
                            const cancelSignal =
                                globalThis.cancelSignalBySensorId[sensorId];
                            fastify.log.info(
                                `${
                                    cancelSignal === 'retry'
                                        ? 'Attempting'
                                        : 'Stop trying'
                                } to connect sensor ${sensorId} on startup. Retry attempt: ${attemptNumber}`
                            );
                            return (
                                globalThis.cancelSignalBySensorId[sensorId] === 'retry'
                            );
                        },
                    }
                )
                    .then(() =>
                        fastify.log.info(
                            `Sensor ${sensorCreated.id} connected successfully!`
                        )
                    )
                    .catch((err) =>
                        fastify.log.error(err, 'Error in exponential backoff')
                    );
            } else {
                fastify.log.warn(
                    `Sensor ${sensorCreated.id} was created but protocol '${protocol}' not yet implemented`
                );
            }

            return reply.status(200).send({
                msg: `Sensor ${sensorCreated.id} updated successfully!`,
            });
        }
    );

    fastify.delete<{ Params: DeleteSensor }>(
        '/:sensorId',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: { params: fastify.zodRef('deleteSensorModel') },
        },
        async ({ user, params: { sensorId } }, reply) => {
            if (!['System', 'Admin'].includes(user.role.name))
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            fastify.log.debug(`Delete sensor ${sensorId} in the database`);

            await fastify.prisma.sensor.delete({
                where: {
                    id: sensorId,
                },
            });

            globalThis.cancelSignalBySensorId[sensorId] = 'cancel';

            fastify.log.debug(`Stop worker for sensor id ${sensorId}`);

            const worker = globalThis.workersBySensorId[sensorId];

            if (worker) {
                await worker
                    .terminate()
                    .catch((err) =>
                        fastify.log.error(err, 'Error on worker termination:')
                    );

                delete globalThis.workersBySensorId[sensorId];
                fastify.log.debug(`Worker for sensor ${sensorId} stopped and deleted!`);
            }

            return reply.status(200).send({
                msg: `Sensor ${sensorId} deleted successfully!`,
            });
        }
    );

    fastify.get<{ Params: GetSensorStatus }>(
        '/connection-status/:sensorId',
        {
            schema: {
                params: fastify.zodRef('getSensorStatusModel'),
            },
        },
        async ({ params: { sensorId } }) => {
            return {
                sensor: {
                    sensorId,
                    connectionStatus:
                        globalThis.connectionStatusBySensorId[sensorId] ?? 'errored',
                    connectionErrorMsg:
                        globalThis.connectionErrorMsgsBySensorId[sensorId] ??
                        'Unknown error',
                },
            };
        }
    );

    fastify.get('/', async () => {
        const sensors = await fastify.prisma.sensor.findMany({
            where: { deletedAt: null },
            include: { connectionType: true, connectionData: true, user: true },
        });

        return {
            sensors: sensors.map((sensor) => {
                return {
                    ...sensor,
                    connectionStatus:
                        globalThis.connectionStatusBySensorId[sensor.id] ?? 'errored',
                    connectionErrorMsg:
                        globalThis.connectionErrorMsgsBySensorId[sensor.id] ??
                        'Unknown error',
                };
            }),
        };
    });
};

export const autoPrefix = '/sensors';

export default routes;
