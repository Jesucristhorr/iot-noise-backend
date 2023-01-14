import { FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'crypto';
import { DateTime } from 'luxon';
import { PostLogin, PostSignup, SignupResendEmail, SignupVerify } from '../models';
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

            const prefixConfirmationToken = `${newUser.id}:confirmation_email`;
            const confirmationToken = randomBytes(16).toString('hex');
            const confirmationTokenRedisKey = `${prefixConfirmationToken}:${confirmationToken}`;

            await fastify.redis
                .multi()
                .hset(confirmationTokenRedisKey, { id: newUser.id })
                .expire(confirmationTokenRedisKey, 3600)
                .exec();

            const dynamicEmailData = {
                iot_c2a_link: `${ENVS.BASE_API_URL}/v1/auth/signup/verify?userId=${newUser.id}&token=${confirmationToken}`,
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
        async ({ query: { userId, token } }, reply) => {
            const prefixConfirmationToken = `${userId}:confirmation_email`;
            const confirmationTokenRedisKey = `${prefixConfirmationToken}:${token}`;
            const idAsString = await fastify.redis.hget(confirmationTokenRedisKey, 'id');

            fastify.log.debug(idAsString, 'Id retrieved by token:');

            if (!idAsString)
                return reply.status(401).send({ code: 401, msg: 'Invalid token' });

            const id = +idAsString;

            if (isNaN(id))
                return reply.status(401).send({ code: 401, msg: 'Invalid token' });

            await fastify.prisma.user.update({ where: { id }, data: { active: true } });

            fastify.log.debug('User activated successfully!');

            await fastify.redis.hdel(confirmationTokenRedisKey, 'id');

            fastify.log.trace(token, 'Token deleted:');

            return reply.send({ msg: 'User activated.' });
        }
    );

    fastify.post<{ Body: SignupResendEmail }>(
        '/signup/resend-confirmation-email',
        {
            onRequest: [fastify.jwtAuthentication],
            schema: { body: fastify.zodRef('signupResendEmail') },
        },
        async ({ body: { userId } }, reply) => {
            const user = await fastify.prisma.user.findFirst({
                where: { id: userId, deletedAt: null },
                select: {
                    id: true,
                    email: true,
                    active: true,
                },
            });

            if (!user)
                return reply
                    .status(404)
                    .send({ code: 404, msg: `User ${userId} not found` });

            if (user.active)
                return reply.send({ msg: `User ${userId} already confirmed its email` });

            const confirmationEmailSentRedisKey = `${userId}:confirmation_email_sent`;

            const unixTimeToSendEmail = await fastify.redis.ttl(
                confirmationEmailSentRedisKey
            );
            const datetimeToSendEmail = DateTime.now().plus({
                seconds: unixTimeToSendEmail,
            });
            const retryAfter = unixTimeToSendEmail;

            fastify.log.trace(unixTimeToSendEmail, 'Expiration time in seconds:');

            if (unixTimeToSendEmail > 0)
                return reply
                    .status(429)
                    .header('Retry-After', retryAfter ?? 0)
                    .send({
                        code: 429,
                        retryAfter: retryAfter ?? 0,
                        msg: `The user ${userId} requested a confirmation email not too long ago. Wait until ${datetimeToSendEmail.toISO()}`,
                    });

            const prefixConfirmationToken = `${userId}:confirmation_email`;

            const [count, previousKeys] = await fastify.redis.scan(
                0,
                'MATCH',
                `${prefixConfirmationToken}:*`
            );

            fastify.log.trace(count, `Scan count:`);
            fastify.log.trace(previousKeys, `Scan keys result:`);

            if (previousKeys.length > 0) await fastify.redis.del(...previousKeys);

            const confirmationToken = randomBytes(16).toString('hex');
            const confirmationTokenRedisKey = `${prefixConfirmationToken}:${confirmationToken}`;

            await fastify.redis
                .multi()
                .hset(confirmationTokenRedisKey, { id: userId })
                .expire(confirmationTokenRedisKey, 3600)
                .exec();

            const dynamicEmailData = {
                iot_c2a_link: `${ENVS.BASE_API_URL}/v1/auth/signup/verify?userId=${userId}&token=${confirmationToken}`,
            };

            fastify.log.trace(
                `This is the confirmation link to be sent: ${dynamicEmailData.iot_c2a_link}`
            );

            const [emailError] = await sendEmail({
                to: user.email,
                templateId: ENVS.SENDGRID_CONFIRM_EMAIL_TEMPLATE_ID,
                dynamicData: dynamicEmailData,
            });

            if (emailError)
                fastify.log.error(emailError, 'Error sending confirmation email:');

            await fastify.redis
                .multi()
                .incr(confirmationEmailSentRedisKey)
                .expire(confirmationEmailSentRedisKey, 300)
                .exec();

            fastify.log.trace(`Confirmation email timeout set`);

            return reply.send({
                msg: 'Confirmation email sent successfully.',
            });
        }
    );
};

export const autoPrefix = '/auth';

export default routes;
