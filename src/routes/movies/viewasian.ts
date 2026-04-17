import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { MOVIES } from '@consumet/extensions';
import { StreamingServers } from '@consumet/extensions/dist/models';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Use FlixHQ instead of ViewAsian
  const flixhq = new MOVIES.FlixHQ();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the FlixHQ provider: check out the provider's website @ https://flixhq.to/",
      routes: ['/:query', '/info', '/watch'],
      documentation: 'https://docs.consumet.org/#tag/flixhq',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = decodeURIComponent((request.params as { query: string }).query);
    const page = (request.query as { page: number })?.page || 1;

    try {
      const res = await flixhq.search(query, page);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: 'Search failed' });
    }
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({
        message: 'id is required',
      });

    try {
      const res = await flixhq.fetchMediaInfo(id);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
      });
    }
  });

  fastify.get('/watch', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.query as { episodeId: string }).episodeId;
    const server = (request.query as { server: StreamingServers }).server;

    if (typeof episodeId === 'undefined')
      return reply.status(400).send({ message: 'episodeId is required' });

    if (server && !Object.values(StreamingServers).includes(server))
      return reply.status(400).send({ message: 'Invalid server query' });

    try {
      const res = await flixhq.fetchEpisodeSources(episodeId, server);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;