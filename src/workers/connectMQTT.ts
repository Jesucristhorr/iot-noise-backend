import { parentPort, workerData } from 'worker_threads';
import mqtt from 'async-mqtt';

const wData = workerData as {
    sensorId: number;
    connectionUrl: string;
    topic: string;
    protocolId: string;
    protocol: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
    username: string;
    password: string;
};

(async () => {
    const mqttClient = await mqtt.connectAsync(wData.connectionUrl, {
        username: wData.username,
        password: wData.password,
        protocolId: wData.protocolId,
        protocol: wData.protocol,
    });

    await mqttClient.subscribe(wData.topic);

    mqttClient.on('message', async (topic, payload) => {
        try {
            const data = JSON.parse(payload.toString('utf-8'));
            parentPort?.postMessage({
                topic,
                data,
            });
        } catch (err) {
            console.error('Error in MQTT message:', err);
            if (err instanceof Error)
                parentPort?.postMessage({
                    error: err.message,
                });
            else
                parentPort?.postMessage({
                    error: 'Parsing unknown error',
                });
        }
    });
})();
