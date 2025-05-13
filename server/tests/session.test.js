const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const User = require('../models/User');
const Song = require('../models/Song');
const Session = require('../models/Session');

let mongoServer;
let adminToken;
let userToken;
let admin;
let user;
let song;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create admin user
  const adminResponse = await request(app)
    .post('/auth/admin/signup')
    .send({
      username: 'admin',
      password: 'password123',
      instrument: 'guitar'
    });
  adminToken = adminResponse.body.token;
  admin = adminResponse.body.user;

  // Create regular user
  const userResponse = await request(app)
    .post('/auth/signup')
    .send({
      username: 'user',
      password: 'password123',
      instrument: 'drums'
    });
  userToken = userResponse.body.token;
  user = userResponse.body.user;

  // Create a test song
  const songResponse = await request(app)
    .post('/songs')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      title: 'Test Song',
      artist: 'Test Artist',
      content: 'Test Content',
      chords: true
    });
  song = songResponse.body.data.song;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Session.deleteMany({});
});

describe('Session API', () => {
  describe('POST /sessions', () => {
    it('should create a new session (admin only)', async () => {
      const response = await request(app)
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ songId: song._id });

      expect(response.status).toBe(201);
      expect(response.body.data.session.song._id).toBe(song._id);
      expect(response.body.data.session.admin._id).toBe(admin.id);
      expect(response.body.data.session.status).toBe('active');
    });

    it('should not allow regular users to create sessions', async () => {
      const response = await request(app)
        .post('/sessions')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ songId: song._id });

      expect(response.status).toBe(403);
    });
  });

  describe('Session Flow', () => {
    let sessionId;

    beforeEach(async () => {
      // Create a session
      const response = await request(app)
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ songId: song._id });
      
      sessionId = response.body.data.session._id;
    });

    it('should allow users to join session', async () => {
      const response = await request(app)
        .post(`/sessions/${sessionId}/join`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.session.participants).toHaveLength(2); // admin + user
      expect(response.body.data.session.participants[1].user.username).toBe(user.username);
    });

    it('should allow users to leave session', async () => {
      // First join
      await request(app)
        .post(`/sessions/${sessionId}/join`)
        .set('Authorization', `Bearer ${userToken}`);

      // Then leave
      const response = await request(app)
        .post(`/sessions/${sessionId}/leave`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.session.participants).toHaveLength(1); // only admin remains
    });

    it('should allow admin to end session', async () => {
      const response = await request(app)
        .patch(`/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.session.status).toBe('ended');
      expect(response.body.data.session.endedAt).toBeDefined();
    });

    it('should not allow regular users to end session', async () => {
      const response = await request(app)
        .patch(`/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /sessions/active', () => {
    it('should get active session', async () => {
      // Create a session
      await request(app)
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ songId: song._id });

      const response = await request(app)
        .get('/sessions/active')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.session.status).toBe('active');
    });

    it('should return 404 when no active session exists', async () => {
      const response = await request(app)
        .get('/sessions/active')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });
}); 