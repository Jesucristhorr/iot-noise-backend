import { parentPort } from 'worker_threads';
import { PrismaClient } from '@prisma/client';
import mqtt from 'async-mqtt';

const prisma = new PrismaClient();

const clients: mqtt.AsyncMqttClient[] = [];

(async () => {
    console.log('hey im the main worker now');

    const sensors = await prisma.sensor.findMany({
        where: { deletedAt: null },
        include: { connectionType: true },
    });

    for (let i = 0; i < sensors.length; i++) {
        const sensor = sensors[i];

        if (!sensor) continue;

        const mqttClient = await mqtt.connectAsync(sensor.connectionUrl, {
            username: sensor.connectionUsername,
            password: sensor.connectionPassword,
            protocolId: 'MQTT',
            protocol: 'mqtts',
        });

        await mqttClient.subscribe('noise');

        mqttClient.on('message', (topic, payload) => {
            try {
                const data = JSON.parse(payload.toString('utf-8'));
                parentPort?.postMessage({
                    topic,
                    values: {
                        ...data,
                        sensorId: sensor.id,
                        name: sensor.name,
                        locationName: sensor.locationName,
                    },
                });
            } catch (err) {
                console.error(err);
            }
        });

        console.log('Connected client:', sensor.id, sensor.name);

        clients.push(mqttClient);
    }
})();
