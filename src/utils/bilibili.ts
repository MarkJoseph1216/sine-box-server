import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import axios from 'axios';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  
  fastify.get('/bilibili/playurl', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = (request.query as { episode_id: string }).episode_id;

    if (typeof episodeId === 'undefined') {
      return reply.status(400).send({ message: 'episodeId is required' });
    }

    try {
      const ss = await axios.get(
        `https://kaguya.app/server/source?episode_id=${episodeId}&source_media_id=1&source_id=bilibili`,
        { headers: { cookie: String(process.env.BILIBILI_COOKIE) } },
      );

      if (!ss.data.sources) {
        return reply.status(404).send({ message: 'No sources found' });
      }

      const dash = await axios.get(ss.data.sources[0].file);
      return reply.status(200).send(dash.data);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/bilibili/subtitle', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = (request.query as { url: string }).url;
    
    if (typeof url === 'undefined') {
      return reply.status(400).send({ message: 'url is required' });
    }

    try {
      const jsonVtt = await axios.get(url);
      
      // Simple VTT conversion without the complex class
      let vttContent = 'WEBVTT\r\n\r\n';
      let counter = 1;
      
      if (jsonVtt.data.body && Array.isArray(jsonVtt.data.body)) {
        jsonVtt.data.body.forEach((subtitle: any) => {
          const from = secondsToTime(subtitle.from);
          const to = secondsToTime(subtitle.to);
          vttContent += `${counter}\r\n${from} --> ${to}\r\n${subtitle.content}\r\n\r\n`;
          counter++;
        });
      }
      
      reply.status(200).send(vttContent);
    } catch (err) {
      console.error(err);
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });
};

// Helper function
function secondsToTime(sec: number): string {
  if (typeof sec !== 'number') {
    return '00:00:00.000';
  }
  
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = (sec % 60).toFixed(3);
  
  const pad = (num: number): string => {
    return num.toString().padStart(2, '0');
  };
  
  return `${pad(hours)}:${pad(minutes)}:${seconds.padStart(6, '0')}`;
}

export default routes;