import { PostSensor } from '../models/sensors';
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
                        maxDelay: 300,
                        numOfAttempts: 30,
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
