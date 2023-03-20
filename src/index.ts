// GLOBALS
globalThis.workersBySensorId = {};
globalThis.connectionStatusBySensorId = {};
globalThis.cancelSignalBySensorId = {};

import { loggerConfigurationByEnv } from './config/logger';
import { prismaPlugin } from './plugins/prisma';
import models from './models';
import { checkEnvs } from './env/check';
import fastify, { onRequestHookHandler } from 'fastify';
import autoload from '@fastify/autoload';
import cors from '@fastify/cors';
import fSocket from 'fastify-socket.io';
import eTag from '@fastify/etag';
import helmet from '@fastify/helmet';
import fJwt, { UserType } from '@fastify/jwt';
import fRedis from '@fastify/redis';
import path from 'path';
import { buildJsonSchemas } from 'fastify-zod';
import Ajv from 'ajv';
import type { Prisma } from '@prisma/client';
import { prepareMQTTConnection } from './helpers/mqtt';
import { backOff } from 'exponential-backoff';

const ajv = new Ajv({
    strict: false,
});

// TODO: Add socket auth

// check envs
const ENVS = checkEnvs();

const app = fastify({ logger: loggerConfigurationByEnv[ENVS.NODE_ENV] });

app.log.debug(ENVS, 'ENVS:');

// core plugins
app.register(cors, {
    origin: '*',
});
app.register(eTag);
app.register(helmet);
app.register(prismaPlugin); // db plugin
app.register(fRedis, {
    host: ENVS.REDIS_HOST,
    port: ENVS.REDIS_PORT,
    username: ENVS.REDIS_USERNAME,
    password: ENVS.REDIS_PASSWORD,
    db: ENVS.REDIS_DATABASE_NUMBER,
}); // redis plugin
app.register(fJwt, {
    secret: ENVS.JWT_SECRET,
    formatUser: ({ user }) => ({
        ...user,
    }),
});
app.register(fSocket, {
    cors: {
        origin: '*',
        credentials: true,
    },
}); // socket.io support plugin

// SCHEMAS
const { $ref, schemas } = buildJsonSchemas(models);

for (const schema of schemas) {
    app.addSchema(schema);
}

// DECORATORS
// decorator for zod schemas
app.decorate('zodRef', $ref);

// decorator for jwt authentication
app.decorate<onRequestHookHandler>('jwtAuthentication', async (request, reply) => {
    try {
        await request.jwtVerify();

        return;
    } catch (err) {
        return reply.status(401).send({ code: 401, msg: 'Unauthorized' });
    }
});

// module augmentation
declare module 'fastify' {
    interface FastifyInstance {
        readonly zodRef: typeof $ref;
        readonly jwtAuthentication: onRequestHookHandler;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            user: {
                id: number;
                displayName: string;
                username: string;
                email: string;
                role: {
                    id: number;
                    name: string;
                };
            };
        };
        user: {
            id: number;
            displayName: string;
            username: string;
            email: string;
            role: {
                id: number;
                name: string;
            };
        }; // user type is return type of `request.user` object
    }
}

declare module 'socket.io' {
    interface Socket {
        user: UserType;
    }
}

// LISTENERS
app.ready((err) => {
    if (err) throw err;

    app.io.on('connection', (socket) => {
        app.log.info(`Socket connected successfully: ${socket.id}`);
    });

    app.io.on('connect_error', () => {
        app.log.error(`Socket connection error!`);
    });

    app.prisma.sensor
        .findMany({
            include: {
                connectionData: true,
                connectionType: {
                    include: {
                        connectionDetail: true,
                    },
                },
            },
            where: {
                deletedAt: null,
            },
        })
        .then(async (sensors) => {
            for (const sensor of sensors) {
                const connectionDataSchemaJsonValue =
                    sensor.connectionType.connectionDetail?.dataSchema;
                const connectionDataJsonValue = sensor.connectionData?.data;
                if (!connectionDataSchemaJsonValue || !connectionDataJsonValue) {
                    app.log.info(
                        `Sensor ${sensor.id} doesn't have necessary json values`
                    );
                    continue;
                }
                if (
                    typeof connectionDataSchemaJsonValue !== 'object' ||
                    typeof connectionDataJsonValue !== 'object'
                ) {
                    app.log.info(
                        `Sensor ${sensor.id} doesn't have a valid json data or json data schema`
                    );
                    continue;
                }

                const connectionDataSchema =
                    connectionDataSchemaJsonValue as Prisma.JsonObject;
                const validateData = ajv.compile(connectionDataSchema);
                const connectionData = connectionDataJsonValue as Prisma.JsonObject;

                const isValidData = validateData(connectionData);

                if (!isValidData) {
                    app.log.info(
                        validateData.errors,
                        `Invalid data for sensor ${sensor.id}, the following errors were emmited:`
                    );
                    continue;
                }

                const protocol = sensor.connectionType.protocol.toLowerCase();

                if (protocol === 'mqtt' || protocol === 'mqtts') {
                    // MQTT connection
                    if (
                        !connectionData.connectionUrl ||
                        !connectionData.username ||
                        !connectionData.topic
                    ) {
                        app.log.info(
                            `Sensor ${sensor.id} doesn't have required properties`
                        );
                        continue;
                    }

                    const connectionUrl = connectionData.connectionUrl as string;
                    const username = connectionData.username as string;
                    const password = connectionData.password as string | undefined;
                    const topic = connectionData.topic as string;

                    globalThis.cancelSignalBySensorId[sensor.id] = 'retry';

                    backOff(
                        () =>
                            prepareMQTTConnection({
                                protocol,
                                connectionUrl,
                                sensorId: sensor.id,
                                topic,
                                username,
                                password,
                                measurementKeyName: sensor.measurementKeyName,
                                fastifyInstance: app,
                            }),
                        {
                            delayFirstAttempt: false,
                            maxDelay: 300 * 1000,
                            numOfAttempts: 30,
                            retry: (_, attemptNumber) => {
                                const cancelSignal =
                                    globalThis.cancelSignalBySensorId[sensor.id];
                                app.log.info(
                                    `${
                                        cancelSignal === 'retry'
                                            ? 'Attempting'
                                            : 'Stop trying'
                                    } to connect sensor ${
                                        sensor.id
                                    } on startup. Retry attempt: ${attemptNumber}`
                                );
                                return (
                                    globalThis.cancelSignalBySensorId[sensor.id] ===
                                    'retry'
                                );
                            },
                        }
                    )
                        .then(() =>
                            app.log.info(`Sensor ${sensor.id} connected successfully!`)
                        )
                        .catch((err) =>
                            app.log.error(err, 'Error in exponential backoff')
                        );
                }
            }
        })
        .catch((error) => {
            app.log.fatal(
                error,
                'There was an error trying to get all sensor information'
            );
            process.exit(1);
        });
});

// autoload routes
app.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
        prefix: '/v1',
    },
});

// health checker
app.get('/ping', () => {
    return {
        msg: 'pong',
    };
});

app.listen(
    {
        port: ENVS.PORT,
        host: '0.0.0.0',
    },
    () => {
        app.log.info(`Server running in http://localhost:${ENVS.PORT}`);
    }
);
