import { FastifyPluginAsync } from 'fastify';
import { GetUsers } from '../models';
import { envs as ENVS } from '../env';

const routes: FastifyPluginAsync = async (fastify) => {
    // TODO: Add Redis cache here
    // TODO: Refactor this endpoint
    fastify.get<{ Querystring: GetUsers }>(
        '/',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: { querystring: fastify.zodRef('getUsersModel') },
        },
        async ({ user, query: { pageSize, pageAfter, pageBefore } }, reply) => {
            if (user.role.name !== 'System')
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            fastify.log.debug({ pageSize, pageAfter, pageBefore }, 'Page data:');

            if (pageAfter && pageBefore)
                return reply.status(400).send({
                    code: 400,
                    msg: 'Both pageAfter and pageBefore cannot be defined.',
                });

            if (!(pageAfter || pageBefore)) {
                const [count, users] = await fastify.prisma.$transaction([
                    fastify.prisma.user.count({
                        where: { deletedAt: null },
                    }),
                    fastify.prisma.user.findMany({
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            email: true,
                            active: true,
                            role: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                        where: {
                            deletedAt: null,
                        },
                        take: pageSize + 1,
                        orderBy: {
                            id: 'asc',
                        },
                    }),
                ]);

                let hasMoreData = true;

                const lastUser = [...users].pop();

                if (!lastUser) hasMoreData = false;

                if (users.length <= pageSize) hasMoreData = false;

                if (users.length > pageSize) users.pop();

                return {
                    users,
                    metadata: {
                        beforeCursor: null,
                        afterCursor: hasMoreData ? lastUser?.id : null,
                        count,
                    },
                    links: {
                        prev: null,
                        next: hasMoreData
                            ? `${ENVS.BASE_API_URL}/v1/users?pageSize=${pageSize}&pageAfter=${lastUser?.id}`
                            : null,
                    },
                };
            }

            if (pageAfter) {
                const [count, users] = await fastify.prisma.$transaction([
                    fastify.prisma.user.count({
                        where: { deletedAt: null },
                    }),
                    fastify.prisma.user.findMany({
                        cursor: {
                            id: pageAfter,
                        },
                        select: {
                            id: true,
                            displayName: true,
                            username: true,
                            email: true,
                            active: true,
                            role: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                        where: {
                            deletedAt: null,
                        },
                        take: pageSize + 1,
                        orderBy: {
                            id: 'asc',
                        },
                    }),
                ]);

                let hasMoreData = true;

                const lastUser = [...users].pop();

                if (!lastUser) hasMoreData = false;

                if (users.length <= pageSize) hasMoreData = false;

                if (users.length > pageSize) users.pop();

                return {
                    users,
                    metadata: {
                        beforeCursor: pageAfter,
                        afterCursor: hasMoreData ? lastUser?.id : null,
                        count,
                    },
                    links: {
                        prev: `${ENVS.BASE_API_URL}/v1/users?pageSize=${pageSize}&pageBefore=${pageAfter}`,
                        next: hasMoreData
                            ? `${ENVS.BASE_API_URL}/v1/users?pageSize=${pageSize}&pageAfter=${lastUser?.id}`
                            : null,
                    },
                };
            }

            const [count, users] = await fastify.prisma.$transaction([
                fastify.prisma.user.count({
                    where: { deletedAt: null },
                }),
                fastify.prisma.user.findMany({
                    cursor: {
                        id: pageBefore,
                    },
                    skip: 1,
                    select: {
                        id: true,
                        displayName: true,
                        username: true,
                        email: true,
                        active: true,
                        role: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    where: {
                        deletedAt: null,
                    },
                    take: -(pageSize + 1),
                    orderBy: {
                        id: 'asc',
                    },
                }),
            ]);

            let hasMoreData = true;

            const lastUser = [...users].pop();

            if (!lastUser) hasMoreData = false;

            if (users.length <= pageSize) hasMoreData = false;

            if (users.length > pageSize) users.pop();

            return {
                users,
                metadata: {
                    beforeCursor: hasMoreData ? lastUser?.id : null,
                    afterCursor: pageBefore,
                    count,
                },
                links: {
                    prev: hasMoreData
                        ? `${ENVS.BASE_API_URL}/v1/users?pageSize=${pageSize}&pageBefore=${lastUser?.id}`
                        : null,
                    next: `${ENVS.BASE_API_URL}/v1/users?pageSize=${pageSize}&pageAfter=${pageBefore}`,
                },
            };
        }
    );
};

export const autoPrefix = '/users';

export default routes;
