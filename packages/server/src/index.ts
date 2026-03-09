import { buildServer } from './server.js';

const server = buildServer();

const start = async () => {
  try {
    await server.listen({ host: '127.0.0.1', port: 3001 });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export { server };
