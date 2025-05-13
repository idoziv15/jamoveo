const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../app');
const User = require('../models/User');
const Song = require('../models/Song');

let mongoServer;
let token;
let user;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test user
  const response = await request(app)
    .post('/auth/signup')
    .send({
      username: 'testuser',
      password: 'password123',
      instrument: 'guitar'
    });

  token = response.body.token;
  user = response.body.user;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Song.deleteMany({});
});

describe('Song API', () => {
  const testSong = {
    title: 'Test Song',
    artist: 'Test Artist',
    content: 'Test Content',
    chords: true
  };

  describe('POST /songs', () => {
    it('should create a new song', async () => {
      const response = await request(app)
        .post('/songs')
        .set('Authorization', `Bearer ${token}`)
        .send(testSong);

      expect(response.status).toBe(201);
      expect(response.body.data.song.title).toBe(testSong.title);
      expect(response.body.data.song.artist).toBe(testSong.artist);
      expect(response.body.data.song.createdBy.toString()).toBe(user.id);
    });

    it('should not create a song without authentication', async () => {
      const response = await request(app)
        .post('/songs')
        .send(testSong);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /songs', () => {
    beforeEach(async () => {
      // Create test songs
      await Song.create([
        {
          ...testSong,
          title: 'Song 1',
          createdBy: user.id
        },
        {
          ...testSong,
          title: 'Song 2',
          createdBy: user.id
        }
      ]);
    });

    it('should get all songs with pagination', async () => {
      const response = await request(app)
        .get('/songs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.results).toBe(2);
      expect(response.body.data.songs).toHaveLength(2);
    });

    it('should search songs', async () => {
      const response = await request(app)
        .get('/songs/search')
        .query({ q: 'Song 1' })
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.songs).toHaveLength(1);
      expect(response.body.data.songs[0].title).toBe('Song 1');
    });
  });

  describe('PATCH /songs/:id', () => {
    let songId;

    beforeEach(async () => {
      const song = await Song.create({
        ...testSong,
        createdBy: user.id
      });
      songId = song._id;
    });

    it('should update a song', async () => {
      const updatedTitle = 'Updated Song';
      const response = await request(app)
        .patch(`/songs/${songId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: updatedTitle });

      expect(response.status).toBe(200);
      expect(response.body.data.song.title).toBe(updatedTitle);
    });

    it('should not update a non-existent song', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/songs/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /songs/:id', () => {
    let songId;

    beforeEach(async () => {
      const song = await Song.create({
        ...testSong,
        createdBy: user.id
      });
      songId = song._id;
    });

    it('should delete a song', async () => {
      const response = await request(app)
        .delete(`/songs/${songId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(204);

      const song = await Song.findById(songId);
      expect(song).toBeNull();
    });

    it('should not delete a non-existent song', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/songs/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
}); 