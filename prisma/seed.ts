/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

if (!process.env.DEFAULT_SYSTEM_USER_PASSWORD)
    throw new Error('Check the env vars for the seed script');

(async () => {
    console.log('Creating roles...');

    await prisma.role.createMany({
        data: [
            {
                name: 'System',
            },
            {
                name: 'Admin',
            },
            {
                name: 'Common',
            },
        ],
    });

    console.log('Done!');
    console.log('Creating system user...');

    const passwordHash = await hash(process.env.DEFAULT_SYSTEM_USER_PASSWORD!, 12);

    await prisma.user.create({
        data: {
            username: 'system',
            email: 'iot@codefilia.com',
            displayName: 'System User',
            password: passwordHash,
            role: {
                connect: {
                    name: 'System',
                },
            },
            active: true,
        },
    });

    console.log('Done!');
    console.log('Creating default connection types...');

    await prisma.connectionType.createMany({
        data: [
            {
                protocol: 'MQTT',
            },
            {
                protocol: 'MQTTS',
            },
        ],
    });

    console.log('Done!');
    console.log('Creating default connection details...');

    await prisma.connectionDetail.create({
        data: {
            connectionType: {
                connect: {
                    protocol: 'MQTT',
                },
            },
            dataSchema: {
                type: 'object',
                properties: {
                    connectionUrl: {
                        type: 'string',
                        format: 'uri',
                    },
                    username: {
                        type: 'string',
                        minLength: 2,
                    },
                    password: {
                        type: 'string',
                    },
                    topic: {
                        type: 'string',
                        minLength: 2,
                    },
                },
                required: ['connectionUrl', 'username', 'topic'],
                errorMessages: {
                    required: {
                        connectionUrl: 'La url de conexión es requerida',
                        username: 'El usuario MQTT es requerido',
                        topic: 'El tópico del broker es requerido',
                    },
                    properties: {
                        connectionUrl: 'La url de conexión debe ser una url válida',
                        username: 'El usuario debe tener mínimo 2 caracteres',
                        password: 'La contraseña debe ser una cadena de caracteres',
                        topic: 'El tópico debe tener mínimo 2 caracteres',
                    },
                },
            },
            uiSchema: {
                type: 'VerticalLayout',
                elements: [
                    {
                        type: 'Control',
                        scope: '#/properties/connectionUrl',
                        label: 'Url de conexión',
                        options: {
                            placeholder: 'mqtt://test.mosquito.org',
                        },
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/username',
                        label: 'Usuario MQTT',
                        options: {
                            placeholder: 'admin',
                        },
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/password',
                        label: 'Contraseña MQTT',
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/topic',
                        label: 'Tópico MQTT',
                    },
                ],
            },
        },
    });

    await prisma.connectionDetail.create({
        data: {
            connectionType: {
                connect: {
                    protocol: 'MQTTS',
                },
            },
            dataSchema: {
                type: 'object',
                properties: {
                    connectionUrl: {
                        type: 'string',
                        format: 'uri',
                    },
                    username: {
                        type: 'string',
                        minLength: 2,
                    },
                    password: {
                        type: 'string',
                    },
                    topic: {
                        type: 'string',
                        minLength: 2,
                    },
                },
                required: ['connectionUrl', 'username', 'topic'],
                errorMessages: {
                    required: {
                        connectionUrl: 'La url de conexión es requerida',
                        username: 'El usuario MQTTS es requerido',
                        topic: 'El tópico del broker es requerido',
                    },
                    properties: {
                        connectionUrl: 'La url de conexión debe ser una url válida',
                        username: 'El usuario debe tener mínimo 2 caracteres',
                        password: 'La contraseña debe ser una cadena de caracteres',
                        topic: 'El tópico debe tener mínimo 2 caracteres',
                    },
                },
            },
            uiSchema: {
                type: 'VerticalLayout',
                elements: [
                    {
                        type: 'Control',
                        scope: '#/properties/connectionUrl',
                        label: 'Url de conexión',
                        options: {
                            placeholder: 'mqtt+ssl://test.mosquito.org',
                        },
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/username',
                        label: 'Usuario MQTTS',
                        options: {
                            placeholder: 'admin-ssl',
                        },
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/password',
                        label: 'Contraseña MQTTS',
                    },
                    {
                        type: 'Control',
                        scope: '#/properties/topic',
                        label: 'Tópico MQTTS',
                    },
                ],
            },
        },
    });

    console.log('Done!');
})()
    .then(async () => {
        await prisma
            .$disconnect()
            .catch((err) => console.error('ERROR DISCONNECTING FROM PRISMA:', err));
        process.exit(0);
    })
    .catch(async (err) => {
        console.error('ERROR TRYING TO SEED:', err);
        await prisma
            .$disconnect()
            .catch((err) => console.error('ERROR DISCONNECTING FROM PRISMA:', err));
        process.exit(1);
    })
    .finally(() => {
        console.info('SEEDING SCRIPT FINISHED');
    });
