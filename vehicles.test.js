/* import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Vehicle API', () => {
    it('should fetch all vehicles', async () => {
        const res = await request(app).get('/api/vehicles');
        expect(res.statusCode).toEqual(200);
    });

    it('should create a new vehicle', async () => {
        const res = await request(app)
            .post('/api/vehicles')
            .send({ make: 'Toyota', model: 'Corolla', year: 2021, price: 20000 });
        expect(res.statusCode).toEqual(201);
        expect(res.body.make).toEqual('Toyota');
    });
}); 

*/
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Vehicle API', () => {
  it('should fetch all vehicles', async () => {
    const res = await request(app).get('/api/vehicles');
    expect(res.statusCode).toBe(200);
  });
});