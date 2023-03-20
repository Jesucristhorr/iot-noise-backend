import path from 'path';
import { envs } from '../env';
import { Worker, SHARE_ENV } from 'worker_threads';
import { v4 as uuidV4 } from 'uuid';
import type { FastifyInstance } from 'fastify';

const WORKER_FILENAME = envs.HAS_BEEN_BUILT ? 'connectMQTT.js' : 'connectMQTT.ts';

export async function prepareMQTTConnection({
    sensorId,
    connectionUrl,
    topic,
    protocol,
    username,
    password,
    measurementKeyName,
    fastifyInstance,
}: {
    sensorId: number;
    connectionUrl: string;
    topic: string;
    protocol: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
    username: string;
    password?: string;
    measurementKeyName: string;
    fastifyInstance: FastifyInstance;
}) {
    const sensor = await fastifyInstance.prisma.sensor.findFirst({
        where: {
            id: sensorId,
            deletedAt: null,
        },
    });

    if (!sensor) return;

    const connectToMQTT = (fInstance: FastifyInstance) => {
        globalThis.connectionStatusBySensorId[sensorId] = 'pending';
        fInstance.io.emit('sensor-status', {
            sensorId,
            connectionStatus: 'pending',
        });

        return new Promise<Worker | null>((resolve, reject) => {
            let timeoutId: NodeJS.Timeout | null | undefined;
            const worker = new Worker(
                path.join(__dirname, '..', 'workers', WORKER_FILENAME),
                {
                    workerData: {
                        sensorId,
                        connectionUrl,
                        topic,
                        protocolId: 'MQTT',
                        protocol,
                        username,
                        password,
                    },
                    env: SHARE_ENV,
                }
            );

            const cleanTimeout = () => {
                if (!timeoutId) return;
                clearTimeout(timeoutId);
                fInstance.log.info(
                    `Timeout ID ${timeoutId} for sensor ${sensorId} has been cleared!`
                );
                return;
            };

            worker.on('message', async (value) => {
                fInstance.log.info(value, 'Value emitted from mqtt:');
                const currentStatus = globalThis.connectionStatusBySensorId[sensorId];

                if (value && value.finished) {
                    globalThis.connectionStatusBySensorId[sensorId] = 'connected';
                    globalThis.connectionErrorMsgsBySensorId[sensorId] =
                        'Connection finished unexpectedly';
                    fInstance.io.emit('sensor-status', {
                        sensorId,
                        connectionStatus: 'errored',
                        connectionErrorMsg: 'Connection finished unexpectedly',
                    });
                    return;
                }

                if (value && value.connectionStatus && currentStatus !== 'connected') {
                    globalThis.connectionStatusBySensorId[sensorId] = 'connected';
                    fInstance.io.emit('sensor-status', {
                        sensorId,
                        connectionStatus: 'connected',
                    });
                    return;
                }

                if (value && value.error) {
                    globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                    globalThis.connectionErrorMsgsBySensorId[sensorId] = value.error;
                    fInstance.io.emit('sensor-status', {
                        sensorId,
                        connectionStatus: 'errored',
                        connectionErrorMsg: value.error,
                    });
                    return;
                }

                if (value && value.data) {
                    const data = value.data;
                    const measurement = data[measurementKeyName];
                    if (!measurement) {
                        fInstance.log.warn(
                            `Sensor ${sensorId} doesn't have key '${measurementKeyName}' in the data received`
                        );
                        return;
                    }

                    // store metric in database
                    try {
                        await fInstance.prisma.metric.create({
                            data: {
                                value: measurement,
                                sensor: {
                                    connect: {
                                        id: sensorId,
                                    },
                                },
                                uuid: uuidV4(),
                            },
                        });

                        // emit metric in web socket
                        fInstance.io.emit('sensor-data', {
                            sensorId,
                            measurement,
                            timestamp: Date.now(),
                        });

                        // send status
                        globalThis.connectionStatusBySensorId[sensorId] = 'connected';
                        fInstance.io.emit('sensor-status', {
                            sensorId,
                            connectionStatus: 'connected',
                        });
                    } catch (err: unknown) {
                        fInstance.log.error(err, 'Error storing metric:');
                        globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                        if (err instanceof Error) {
                            globalThis.connectionErrorMsgsBySensorId[sensorId] =
                                err.message;
                            fInstance.io.emit('sensor-status', {
                                sensorId,
                                connectionStatus: 'errored',
                                connectionErrorMsg: err.message,
                            });
                        } else {
                            globalThis.connectionErrorMsgsBySensorId[sensorId] =
                                'Unknown error storing metric';
                            fInstance.io.emit('sensor-status', {
                                sensorId,
                                connectionStatus: 'errored',
                                connectionErrorMsg: 'Unknown error storing metric',
                            });
                        }
                    }
                }
            });

            worker.on('error', (err) => {
                fInstance.log.error(err, 'Something went wrong when creating worker:');
                cleanTimeout();
                globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                globalThis.connectionErrorMsgsBySensorId[sensorId] = err.message;
                fInstance.io.emit('sensor-status', {
                    sensorId,
                    connectionStatus: 'errored',
                    connectionErrorMsg: err.message,
                });
                return reject(err);
            });

            worker.on('exit', (exitCode) => {
                fInstance.log.info(
                    `Worker with thread id ${worker.threadId} exited with code ${exitCode} for sensor id ${sensorId}`
                );
                cleanTimeout();
                const previousMessageError =
                    globalThis.connectionErrorMsgsBySensorId[sensorId];
                globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                globalThis.connectionErrorMsgsBySensorId[sensorId] =
                    previousMessageError ?? 'Worker crashed!';
                fInstance.io.emit('sensor-status', {
                    sensorId,
                    connectionStatus: 'errored',
                    connectionErrorMsg: previousMessageError ?? 'Worker crashed!',
                });
                return resolve(null);
            });
        });
    };

    const worker = await connectToMQTT(fastifyInstance);

    if (!worker) return;

    fastifyInstance.log.info(
        `Worker with thread id ${worker.threadId} for sensor id ${sensorId} created!`
    );

    globalThis.workersBySensorId[sensorId] = worker;

    return;
}
