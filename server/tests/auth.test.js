const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Authentication API', () => {
  const testUser = {
    username: 'testuser',
    password: 'password123',
    instrument: 'guitar'
  };

  describe('POST /auth/signup', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.instrument).toBe(testUser.instrument);
      expect(response.body.user.isAdmin).toBe(false);
      expect(response.body.token).toBeDefined();
    });

    it('should not create user with existing username', async () => {
      await request(app)
        .post('/auth/signup')
        .send(testUser);

      const response = await request(app)
        .post('/auth/signup')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/username already exists/i);
    });
  });

  describe('POST /auth/admin/signup', () => {
    it('should create a new admin user', async () => {
      const response = await request(app)
        .post('/auth/admin/signup')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.instrument).toBe(testUser.instrument);
      expect(response.body.user.isAdmin).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/auth/signup')
        .send(testUser);
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/invalid username or password/i);
    });
  });

  describe('Protected Routes', () => {
    let token;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send(testUser);
      token = response.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.username).toBe(testUser.username);
    });

    it('should update user profile', async () => {
      const newInstrument = 'drums';
      const response = await request(app)
        .patch('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ instrument: newInstrument });

      expect(response.status).toBe(200);
      expect(response.body.data.user.instrument).toBe(newInstrument);
    });

    it('should not access protected routes without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toMatch(/please log in/i);
    });
  });
}); 