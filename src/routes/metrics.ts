import { FastifyPluginAsync } from 'fastify';
import { GetMetrics } from '../models';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: GetMetrics }>(
        '/',
        { schema: { querystring: fastify.zodRef('getMetricsModel') } },
        async ({ query: { from, to, sensorId } }) => {
            const where: Record<string, any> = {
                createdAt: {
                    gte: from,
                    lte: to,
                },
                deletedAt: null,
            };

            if (sensorId) where.sensorId = sensorId;

            const metrics = await fastify.prisma.metric.findMany({
                select: {
                    uuid: true,
                    value: true,
                    sensorId: true,
                    createdAt: true,
                },
                where,
            });

            return {
                metrics,
            };
        }
    );
};

export const autoPrefix = '/metrics';

export default routes;
