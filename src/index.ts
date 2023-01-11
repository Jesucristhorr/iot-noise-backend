import { loggerConfigurationByEnv } from './config/logger';
import { prismaPlugin } from './plugins/prisma';
import models from './models';
import { checkEnvs } from './env/check';
import fastify, { onRequestHookHandler } from 'fastify';
import autoload from '@fastify/autoload';
import cors from '@fastify/cors';
import eTag from '@fastify/etag';
import helmet from '@fastify/helmet';
import fJwt from '@fastify/jwt';
import path from 'path';
import { buildJsonSchemas } from 'fastify-zod';

// check envs
const ENVS = checkEnvs();

const app = fastify({ logger: loggerConfigurationByEnv[ENVS.NODE_ENV] });

// core plugins
app.register(cors, {
    origin: '*',
});
app.register(eTag);
app.register(helmet);
app.register(prismaPlugin); // db plugin
app.register(fJwt, {
    secret: ENVS.JWT_SECRET,
    formatUser: ({ user }) => ({
        ...user,
    }),
});

const { $ref, schemas } = buildJsonSchemas(models);

for (const schema of schemas) {
    app.addSchema(schema);
}

// DECORATORS

// decorator for zod schemas
app.decorate('zodRef', $ref);

// decorator for jwt authentication
app.decorate<onRequestHookHandler>('jwtAuthentication', async (request, reply, done) => {
    try {
        await request.jwtVerify();

        return done();
    } catch (err) {
        return reply.status(401).send({ code: 401, msg: 'Unauthorized' });
    }
});

// module augmentation
declare module 'fastify' {
    interface FastifyInstance {
        readonly zodRef: typeof $ref;
        readonly jwtAuthentication: onRequestHookHandler;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            user: {
                id: number;
                displayName: string;
                username: string;
                email: string;
                role: {
                    id: number;
                    name: string;
                };
            };
        };
        user: {
            id: number;
            displayName: string;
            username: string;
            email: string;
            role: {
                id: number;
                name: string;
            };
        }; // user type is return type of `request.user` object
    }
}

// autoload routes
app.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
        prefix: '/v1',
    },
});

// health checker
app.get('/ping', async () => {
    return {
        msg: 'pong',
    };
});

app.listen(
    {
        port: ENVS.PORT,
        host: '0.0.0.0',
    },
    () => app.log.info(`Server running in http://localhost:${ENVS.PORT}`)
);
