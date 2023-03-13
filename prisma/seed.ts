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
            details: {
                formTitle: 'Parámetros de conexión para MQTT',
                fields: [
                    {
                        fieldId: 'connectionUrl',
                        fieldLabel: 'Url de conexión',
                        fieldMandatory: true,
                        fieldPlaceholder: 'mqtt://test.mosquitto.org',
                        fieldType: 'text',
                        fieldDefaultValue: '',
                        fieldValidationType: 'url',
                        fieldValidationFunction: null,
                        fieldValidationErrorText:
                            'Por favor ingrese una url de conexión válida',
                    },
                    {
                        fieldId: 'username',
                        fieldLabel: 'Usuario MQTT',
                        fieldMandatory: true,
                        fieldPlaceholder: 'admin',
                        fieldType: 'text',
                        fieldDefaultValue: '',
                        fieldValidationType: 'regex',
                        fieldValidationFunction: {
                            arguments: 'value',
                            body: 'return /[\\w\\W]{2,}/gi.test(value)',
                        },
                        fieldValidationErrorText:
                            'Por favor ingrese un usuario mínimo de 2 caracteres',
                    },
                    {
                        fieldId: 'password',
                        fieldLabel: 'Contraseña MQTT',
                        fieldMandatory: false,
                        fieldPlaceholder: 'contraseña',
                        fieldType: 'password',
                        fieldDefaultValue: '',
                        fieldValidationType: 'none',
                        fieldValidationFunction: null,
                        fieldValidationErrorText: '',
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
            details: {
                formTitle: 'Parámetros de conexión para MQTTS',
                fields: [
                    {
                        fieldId: 'connectionUrl',
                        fieldLabel: 'Url de conexión',
                        fieldMandatory: true,
                        fieldPlaceholder: 'mqtt+ssl://test.mosquito.org',
                        fieldType: 'text',
                        fieldDefaultValue: '',
                        fieldValidationType: 'url',
                        fieldValidationFunction: null,
                        fieldValidationErrorText:
                            'Por favor ingrese una url de conexión válida',
                    },
                    {
                        fieldId: 'username',
                        fieldLabel: 'Usuario MQTT',
                        fieldMandatory: true,
                        fieldPlaceholder: 'admin',
                        fieldType: 'text',
                        fieldDefaultValue: '',
                        fieldValidationType: 'regex',
                        fieldValidationFunction: {
                            arguments: 'value',
                            body: 'return /[\\w\\W]{2,}/gi.test(value)',
                        },
                        fieldValidationErrorText:
                            'Por favor ingrese un usuario mínimo de 2 caracteres',
                    },
                    {
                        fieldId: 'password',
                        fieldLabel: 'Contraseña MQTT',
                        fieldMandatory: false,
                        fieldPlaceholder: 'contraseña',
                        fieldType: 'password',
                        fieldDefaultValue: '',
                        fieldValidationType: 'none',
                        fieldValidationFunction: null,
                        fieldValidationErrorText: '',
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
