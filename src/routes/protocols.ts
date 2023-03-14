import { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/',
        { onRequest: [fastify.jwtAuthentication] },
        async ({ user }, reply) => {
            if (!['System', 'Admin'].includes(user.role.name))
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            const protocols = await fastify.prisma.connectionType.findMany({
                select: {
                    id: true,
                    protocol: true,
                    createdAt: true,
                    updatedAt: true,
                    connectionDetail: true,
                },
                where: {
                    deletedAt: null,
                },
            });

            return {
                protocols,
            };
        }
    );
};

export const autoPrefix = '/protocols';

export default routes;
