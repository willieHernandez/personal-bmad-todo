import { buildServer } from './server.js';

const host = process.env.HOST || '127.0.0.1';
const portRaw = process.env.PORT || '3001';
const port = Number(portRaw);

if (!host.trim()) {
  console.error(`Invalid HOST: "${process.env.HOST}" — must be a non-empty string`);
  process.exit(1);
}

if (Number.isNaN(port) || port < 0 || port > 65535 || !Number.isInteger(port)) {
  console.error(`Invalid PORT: "${portRaw}" — must be an integer between 0 and 65535`);
  process.exit(1);
}

const server = buildServer();

const start = async () => {
  try {
    server.log.info(`Resolved config: HOST=${host}, PORT=${port}`);
    await server.listen({ host, port });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

export { server };
