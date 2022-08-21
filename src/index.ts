import { prismaPlugin } from './plugins/prisma';
import { checkEnvs } from './env/check';
import fastify from 'fastify';
import cors from '@fastify/cors';

// check envs
checkEnvs();

const app = fastify();

app.register(cors, {
  origin: '*',
});
app.register(prismaPlugin); // db plugin

app.get('/roles', async () => {
  return {
    data: await app.prisma.role.findMany(),
  };
});

app.listen(
  {
    port: 3000,
  },
  () => console.log('wow')
);
