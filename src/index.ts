import { PrismaClient } from '@prisma/client';
import fastify from 'fastify';

const prisma = new PrismaClient();

const app = fastify();

app.get('/roles', async () => {
  return {
    data: await prisma.role.findMany(),
  };
});

app.listen(
  {
    port: 3000,
  },
  () => console.log('wow')
);
