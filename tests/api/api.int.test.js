import request from 'supertest';
import server from '../../app.js';

afterAll((done) => {
  server.server.close(done);
});

describe('Server Status', () => {
  it('Check server status', async () => {
    const response = await request(server.server).get('/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'up' });
  });
});

/*
describe('API Endpoints', () => {
  // it('GET /api/sources/1 - should return NAS source', async () => {
  //   const res = await request(app).get('/api/sources/1');
  //   expect(res.statusCode).toEqual(200);
  //   expect(res.body).toEqual([{ id: 1 }]);
  // });

  /*
  it('POST /items - should create a new item', async () => {
    const res = await request(app)
      .post('/items')
      .send({ name: 'New Item' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual({ id: 2, name: 'New Item' });
  });

  it('GET /items/:id - should return item with specific id', async () => {
    const res = await request(app).get('/items/1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ id: 1, name: 'Item 1' });
  });

  it('PUT /items/:id - should update item with specific id', async () => {
    const res = await request(app)
      .put('/items/1')
      .send({ name: 'Updated Item' });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ id: 1, name: 'Updated Item' });
  });

  it('DELETE /items/:id - should delete item with specific id', async () => {
    const res = await request(app).delete('/items/1');
    expect(res.statusCode).toEqual(204);

    const getRes = await request(app).get('/items/1');
    expect(getRes.statusCode).toEqual(404);
  });
  
});
*/