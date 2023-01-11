import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { envs as ENVS } from '../env';

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

export const prismaPlugin = fp(async (server) => {
    const prisma = new PrismaClient({
        log:
            ENVS.NODE_ENV !== 'production'
                ? ['query', 'info', 'warn', 'error']
                : undefined,
    });

    await prisma.$connect();

    server.decorate('prisma', prisma);

    server.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
});
