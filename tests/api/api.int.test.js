import request from 'supertest';
import { jest } from '@jest/globals';
import server from '../../app.js';

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

describe('Version API', () => {
  it('GET /api/version should return version information', async () => {
    const response = await request(server.server).get('/api/version');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('description');
    expect(typeof response.body.version).toBe('string');
    expect(response.body.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('GET /api/version/check-updates should return update information', async () => {
    const response = await request(server.server).get('/api/version/check-updates');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('currentVersion');
    expect(response.body).toHaveProperty('latestVersion');
    expect(response.body).toHaveProperty('updateAvailable');
    expect(typeof response.body.updateAvailable).toBe('boolean');
  });
});

afterAll((done) => {
  if (server && server.server) {
    server.server.close((err) => {
      if (err) {
        console.error('Error closing server:', err);
      }
      done();
    });
  } else {
    done();
  }
});