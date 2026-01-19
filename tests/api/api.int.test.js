import request from 'supertest';
import { jest } from '@jest/globals';

jest.unstable_mockModule('tough-cookie', () => {
  return {
    default: {
      CookieJar: jest.fn(() => ({})),
    },
  };
});

import server from '../../server/app.js';

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

afterAll(async () => {
  // Call cleanup first
  if (server && typeof server.cleanup === 'function') {
    await server.cleanup();
  }
  
  if (server && server.server) {
    // Force close all connections
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 2000);
      
      server.server.close(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
});