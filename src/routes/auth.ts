import { FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'crypto';
import { PostLogin, PostSignup, SignupVerify } from '../models';
import { envs as ENVS } from '../env';
import { hash, compare } from 'bcrypt';
import { sendEmail } from '../helpers/email';

const routes: FastifyPluginAsync = async (fastify) => {
    fastify.post<{ Body: PostLogin }>(
        '/login',
        { schema: { operationId: 'postLogin', body: fastify.zodRef('postLoginModel') } },
        async ({ body: { email, password } }, reply) => {
            const user = await fastify.prisma.user.findFirst({
                where: { email, active: true, deletedAt: null },
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

    fastify.post<{ Body: PostSignup }>(
        '/signup',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: {
                operationId: 'postSignup',
                body: fastify.zodRef('postSignupModel'),
            },
        },
        async (
            { body: { email, username, password, displayName, roleId }, user },
            reply
        ) => {
            if (user.role.name !== 'System')
                return reply
                    .status(403)
                    .send({ code: 403, msg: `You don't have access to this resource` });

            fastify.log.debug('Attempting to create user');

            const databaseUser = await fastify.prisma.user.findFirst({
                where: { OR: [{ email }, { username }] },
            });

            if (databaseUser)
                return reply.status(400).send({
                    code: 400,
                    msg: `A user with the same email/username already exists`,
                });

            const hashedPassword = await hash(password, 12);

            const newUser = await fastify.prisma.user.create({
                data: {
                    displayName,
                    username,
                    email,
                    password: hashedPassword,
                    active: false,
                    role: {
                        connect: {
                            id: roleId,
                        },
                    },
                },
            });

            fastify.log.debug('User created in database!');

            const confirmationToken = randomBytes(16).toString('hex');

            await fastify.redis
                .multi()
                .hset(confirmationToken, { id: newUser.id })
                .expire(confirmationToken, 3600)
                .exec();

            const dynamicEmailData = {
                iot_c2a_link: `${ENVS.BASE_API_URL}/v1/auth/signup/verify?token=${confirmationToken}`,
            };

            fastify.log.trace(
                `This is the confirmation link to be sent: ${dynamicEmailData.iot_c2a_link}`
            );

            const [emailError] = await sendEmail({
                to: newUser.email,
                templateId: ENVS.SENDGRID_CONFIRM_EMAIL_TEMPLATE_ID,
                dynamicData: dynamicEmailData,
            });

            if (emailError)
                fastify.log.error(emailError, 'Error sending confirmation email:');

            const confirmationEmailSentRedisKey = `${newUser.id}:confirmation_email_sent`;

            await fastify.redis
                .multi()
                .incr(confirmationEmailSentRedisKey)
                .expire(confirmationEmailSentRedisKey, 300)
                .exec();

            fastify.log.trace(`Confirmation email timeout set`);

            return reply.send({
                msg: 'User created. Please activate your account via email',
            });
        }
    );

    fastify.get<{ Querystring: SignupVerify }>(
        '/signup/verify',
        { schema: { querystring: fastify.zodRef('signupVerifyModel') } },
        async ({ query: { token } }, reply) => {
            const idAsString = await fastify.redis.hget(token, 'id');

            fastify.log.debug(idAsString, 'Id retrieved by token:');

            if (!idAsString)
                return reply.status(401).send({ code: 401, msg: 'Invalid token' });

            const id = +idAsString;

            if (isNaN(id))
                return reply.status(401).send({ code: 401, msg: 'Invalid token' });

            await fastify.prisma.user.update({ where: { id }, data: { active: true } });

            fastify.log.debug('User activated successfully!');

            await fastify.redis.hdel(token, 'id');

            fastify.log.trace(token, 'Token deleted:');

            return reply.send({ msg: 'User activated.' });
        }
    );
};

export const autoPrefix = '/auth';

export default routes;
