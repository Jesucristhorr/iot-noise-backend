import { FastifyPluginAsync } from 'fastify';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/',
        { onRequest: [fastify.jwtAuthentication] },
        async ({ user }, reply) => {
            if (user.role.name !== 'System')
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            const roles = await fastify.prisma.role.findMany({
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                },
                where: {
                    deletedAt: null,
                },
                take: 10,
            });

            return {
                roles,
            };
        }
    );
};

export const autoPrefix = '/roles';

export default routes;
