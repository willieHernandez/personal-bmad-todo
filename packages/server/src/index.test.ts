import { describe, it, expect, afterAll } from 'vitest';
import { buildServer } from './server.js';

describe('Fastify server', () => {
  const server = buildServer();

  afterAll(async () => {
    await server.close();
  });

  it('should respond to health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', db: 'connected' });
  });
});
