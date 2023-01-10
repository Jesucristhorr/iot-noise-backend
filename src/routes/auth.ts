import { FastifyPluginAsync } from 'fastify';
import { PostLogin } from '../models';
import { compare } from 'bcrypt';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: PostLogin }>(
        '/login',
        { schema: { operationId: 'postLogin', body: fastify.zodRef('postLoginModel') } },
        async ({ body: { email, password } }, reply) => {
            const user = await fastify.prisma.user.findUnique({
                where: { email },
                include: { role: true },
            });

            if (!user)
                return reply.status(401).send({ code: 401, msg: 'Invalid credentials' });

            const hasValidPassword = await compare(password, user.password);

            if (!hasValidPassword)
                return reply.status(401).send({ code: 401, msg: 'Invalid credentials' });

            const userPayload = {
                id: user.id,
                displayName: user.displayName,
                username: user.username,
                email: user.email,
                role: {
                    id: user.role.id,
                    name: user.role.name,
                },
            };

            const token = fastify.jwt.sign(
                {
                    user: userPayload,
                },
                { expiresIn: '7d' }
            );

            return {
                token,
                user: userPayload,
            };
        }
    );
};

export const autoPrefix = '/auth';

export default routes;
