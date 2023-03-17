import path from 'path';
import { envs } from '../env';
import { Worker, SHARE_ENV } from 'worker_threads';
import { v4 as uuidV4 } from 'uuid';
import type { FastifyInstance } from 'fastify';

const WORKER_FILENAME =
    envs.NODE_ENV !== 'development' ? 'connectMQTT.js' : 'connectMQTT.ts';

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
    const worker = new Worker(path.join(__dirname, 'workers', WORKER_FILENAME), {
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
    });

    worker.on('message', async (value) => {
        fastifyInstance.log.info(value, 'Value emitted from mqtt:');
        if (value && value.data) {
            const data = value.data;
            const measurement = data[measurementKeyName];
            if (!measurement) {
                fastifyInstance.log.warn(
                    `Sensor ${sensorId} doesn't have key '${measurementKeyName}' in the data received`
                );
                return;
            }

            // store metric in database
            try {
                await fastifyInstance.prisma.metric.create({
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
                fastifyInstance.log.error(err, 'Error storing metric:');
            }

            // emit metric in web socket
            fastifyInstance.io.emit('sensor-data', {
                sensorId,
                measurement,
                timestamp: Date.now(),
            });
        }
    });

    worker.on('error', (err) => {
        fastifyInstance.log.error(err, 'Something went wrong when creating worker:');
        throw err;
    });

    globalThis.workersBySensorId[sensorId] = worker;
}
