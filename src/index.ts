import { loggerConfigurationByEnv } from './config/logger';
import { prismaPlugin } from './plugins/prisma';
import models from './models';
import { checkEnvs } from './env/check';
import fastify from 'fastify';
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

app.register(cors, {
    origin: '*',
});
app.register(eTag);
app.register(helmet);
app.register(prismaPlugin); // db plugin
app.register(fJwt, { secret: ENVS.JWT_SECRET });

const { $ref, schemas } = buildJsonSchemas(models);

for (const schema of schemas) {
    app.addSchema(schema);
}

app.decorate('zodRef', $ref);

declare module 'fastify' {
    interface FastifyInstance {
        readonly zodRef: typeof $ref;
    }
}

app.register(autoload, {
    dir: path.join(__dirname, 'routes'),
    options: {
        prefix: '/v1',
    },
});

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
