import { FastifyPluginAsync } from 'fastify';
import { GetMetrics } from '../models';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.get<{ Querystring: GetMetrics }>(
        '/',
        { schema: { querystring: fastify.zodRef('getMetricsModel') } },
        async ({ query: { from, to, sensorId } }) => {
            const where: Record<string, object | number | null> = {
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

    fastify.get('/last-values-by-sensors', async () => {
        const metrics = await fastify.prisma.$queryRaw<unknown[]>`
        select
            m1.uuid as uuid, m1.value as value, m1.sensorId as sensorId, m1.createdAt as createdAt
        from Metric m1
        inner join
        (select sensorId, MAX(createdAt) as maxCreatedAt from Metric m2 group by m2.sensorId) m3
        ON (m1.sensorId = m3.sensorId AND m1.createdAt = m3.maxCreatedAt);`;

        return {
            metrics,
        };
    });
};

export const autoPrefix = '/metrics';

export default routes;
