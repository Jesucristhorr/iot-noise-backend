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
                    } catch (err) {
                        fInstance.log.error(err, 'Error storing metric:');
                    }

                    // emit metric in web socket
                    fInstance.io.emit('sensor-data', {
                        sensorId,
                        measurement,
                        timestamp: Date.now(),
                    });
                }
            });

            worker.on('error', (err) => {
                fInstance.log.error(err, 'Something went wrong when creating worker:');
                cleanTimeout();
                globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                return reject(err);
            });

            worker.on('exit', (exitCode) => {
                fInstance.log.info(
                    `Worker with thread id ${worker.threadId} exited with code ${exitCode}`
                );
                cleanTimeout();
                globalThis.connectionStatusBySensorId[sensorId] = 'errored';
                return resolve(null);
            });

            worker.on('online', () => {
                timeoutId = setTimeout(() => {
                    globalThis.connectionStatusBySensorId[sensorId] = 'connected';
                    resolve(worker);
                }, 20 * 1000);
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
