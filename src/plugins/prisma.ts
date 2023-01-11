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

    prisma.$use(async (params, next) => {
        if (params.action === 'delete') {
            params.action = 'update';
            params.args['data'] = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
            params.action = 'updateMany';
            if (params.args.data !== undefined) {
                params.args.data['deletedAt'] = new Date();
            } else {
                params.args['data'] = { deletedAt: new Date() };
            }
        }

        return next(params);
    });

    await prisma.$connect();

    server.decorate('prisma', prisma);

    server.addHook('onClose', async (server) => {
        await server.prisma.$disconnect();
    });
});
