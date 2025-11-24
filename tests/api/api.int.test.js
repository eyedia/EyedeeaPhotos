import request from 'supertest';
import { jest } from '@jest/globals';
import server from '../../app.js';

afterAll((done) => {
  server.server.close(done);
});

jest.mock('tough-cookie', () => {
  return {
    CookieJar: jest.fn(() => ({})),
  };
});

describe('Server Status', () => {
  it('Check server status', async () => {
    const response = await request(server.server).get('/api/system/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'up' });
  });
});