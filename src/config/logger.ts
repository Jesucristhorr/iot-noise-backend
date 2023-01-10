import { FastifyBaseLogger, FastifyLoggerOptions } from 'fastify';
import { PinoLoggerOptions } from 'fastify/types/logger';

export const loggerConfigurationByEnv: Record<
    'development' | 'production' | 'test',
    boolean | FastifyBaseLogger | (FastifyLoggerOptions & PinoLoggerOptions)
> = {
    development: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'SYS:HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
        level: 'trace',
    },
    production: true,
    test: false,
};
