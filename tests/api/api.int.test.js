import request from 'supertest';
import app from '../../app';


describe('API Endpoints', () => {
  it('GET /items - should return all items', async () => {
    const res = await request(app).get('/items');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([{ id: 1, name: 'Item 1' }]);
  });

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
  */
});
