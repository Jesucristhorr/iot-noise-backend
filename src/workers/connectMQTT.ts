import { parentPort, workerData } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import mqtt from 'async-mqtt';
import { v4 as uuidV4 } from 'uuid';

const prisma = new PrismaClient();

const wData = workerData as {
    sensorId: number;
    connectionUrl: string;
    protocolId: string;
    protocol: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
    username: string;
    password: string;
};

(async () => {
    console.log('hey im a new worker');

    const mqttClient = await mqtt.connectAsync(wData.connectionUrl, {
        username: wData.username,
        password: wData.password,
        protocolId: wData.protocolId,
        protocol: wData.protocol,
    });

    await mqttClient.subscribe('noise');

    mqttClient.on('message', async (topic, payload) => {
        try {
            const data = JSON.parse(payload.toString('utf-8'));
            parentPort?.postMessage({
                topic,
                values: data,
            });

            await prisma.metric.create({
                data: {
                    value: data.noiseLevel,
                    sensor: {
                        connect: {
                            id: wData.sensorId,
                        },
                    },
                    uuid: uuidV4(),
                },
            });
        } catch (err) {
            console.error(err);
        }
    });
})();
