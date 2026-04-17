import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { MOVIES } from '@consumet/extensions';
import { StreamingServers } from '@consumet/extensions/dist/models';
import cache from '../../utils/cache';
import { redis } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const flixhq = new MOVIES.FlixHQ();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: "Welcome to the FlixHQ provider",
      routes: ['/:query', '/info', '/watch'],
      documentation: 'https://docs.consumet.org/#tag/flixhq',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = decodeURIComponent((request.params as { query: string }).query);
    const page = (request.query as { page: number })?.page || 1;

    let res = redis
      ? await cache.fetch(
          redis as Redis,
          `flixhq:${query}:${page}`,
          async () => await flixhq.search(query, page),
          60 * 60 * 6, // Cache for 6 hours
        )
      : await flixhq.search(query, page);

    reply.status(200).send(res);
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `flixhq:info:${id}`,
            async () => await flixhq.fetchMediaInfo(id),
            60 * 60 * 3, // Cache for 3 hours
          )
        : await flixhq.fetchMediaInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
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
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `flixhq:watch:${episodeId}:${server}`,
            async () => await flixhq.fetchEpisodeSources(episodeId, server),
            60 * 30, // Cache for 30 minutes
          )
        : await flixhq.fetchEpisodeSources(episodeId, server);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

export default routes;