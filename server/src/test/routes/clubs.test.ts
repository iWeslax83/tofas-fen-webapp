import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { app } from '../../app';
import { Club } from '../../models';

describe('Club Routes', () => {
  beforeEach(async () => {
    await Club.deleteMany({});
  });

  afterEach(async () => {
    await Club.deleteMany({});
  });

  describe('PUT /api/clubs/:clubId/members/:memberId/role', () => {
    it('should change member role successfully', async () => {
      const testClub = {
        name: 'Test Club',
        description: 'Test Description',
        members: [
          {
            userId: 'member1',
            name: 'Test Member',
            email: 'member@test.com',
            role: 'member',
            joinDate: new Date().toISOString()
          }
        ]
      };

      const club = await Club.create(testClub);

      const response = await request(app)
        .put(`/api/clubs/${club._id}/members/member1/role`)
        .send({ newRole: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Üye rolü güncellendi');
      expect(response.body.member.role).toBe('admin');

      // Verify the change in database
      const updatedClub = await Club.findById(club._id);
      expect(updatedClub?.members[0].role).toBe('admin');
    });

    it('should return 404 for non-existent club', async () => {
      const fakeClubId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/clubs/${fakeClubId}/members/member1/role`)
        .send({ newRole: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Kulüp bulunamadı');
    });

    it('should return 404 for non-existent member', async () => {
      const testClub = {
        name: 'Test Club',
        description: 'Test Description',
        members: []
      };

      const club = await Club.create(testClub);

      const response = await request(app)
        .put(`/api/clubs/${club._id}/members/nonexistent/role`)
        .send({ newRole: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Üye bulunamadı');
    });
  });

  describe('POST /api/clubs/:clubId/invite', () => {
    it('should invite member successfully', async () => {
      const testClub = {
        name: 'Test Club',
        description: 'Test Description',
        members: [],
        requests: []
      };

      const club = await Club.create(testClub);

      const response = await request(app)
        .post(`/api/clubs/${club._id}/invite`)
        .send({ userId: 'newmember', role: 'member' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Davet gönderildi');

      // Verify invitation was added
      const updatedClub = await Club.findById(club._id);
      expect(updatedClub?.requests).toHaveLength(1);
      expect(updatedClub?.requests[0].userId).toBe('newmember');
      expect(updatedClub?.requests[0].role).toBe('member');
      expect(updatedClub?.requests[0].status).toBe('pending');
    });

    it('should return 400 if user is already a member', async () => {
      const testClub = {
        name: 'Test Club',
        description: 'Test Description',
        members: [
          {
            userId: 'existingmember',
            name: 'Existing Member',
            email: 'existing@test.com',
            role: 'member',
            joinDate: new Date().toISOString()
          }
        ],
        requests: []
      };

      const club = await Club.create(testClub);

      const response = await request(app)
        .post(`/api/clubs/${club._id}/invite`)
        .send({ userId: 'existingmember', role: 'member' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Kullanıcı zaten üye');
    });

    it('should return 404 for non-existent club', async () => {
      const fakeClubId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post(`/api/clubs/${fakeClubId}/invite`)
        .send({ userId: 'newmember', role: 'member' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Kulüp bulunamadı');
    });
  });

  describe('GET /api/clubs', () => {
    it('should get all clubs', async () => {
      const testClubs = [
        {
          name: 'Club 1',
          description: 'Description 1'
        },
        {
          name: 'Club 2',
          description: 'Description 2'
        }
      ];

      await Club.insertMany(testClubs);

      const response = await request(app)
        .get('/api/clubs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Club 1');
      expect(response.body[1].name).toBe('Club 2');
    });

    it('should return empty array when no clubs exist', async () => {
      const response = await request(app)
        .get('/api/clubs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/clubs/:clubId', () => {
    it('should get club by ID', async () => {
      const testClub = {
        name: 'Test Club',
        description: 'Test Description'
      };

      const club = await Club.create(testClub);

      const response = await request(app)
        .get(`/api/clubs/${club._id}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Club');
      expect(response.body.description).toBe('Test Description');
    });

    it('should return 404 for non-existent club', async () => {
      const fakeClubId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/clubs/${fakeClubId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Kulüp bulunamadı');
    });
  });

  describe('POST /api/clubs', () => {
    it('should create new club', async () => {
      const clubData = {
        name: 'New Club',
        description: 'New Description'
      };

      const response = await request(app)
        .post('/api/clubs')
        .send(clubData);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Club');
      expect(response.body.description).toBe('New Description');

      // Verify club was created in database
      const createdClub = await Club.findById(response.body._id);
      expect(createdClub).toBeTruthy();
      expect(createdClub?.name).toBe('New Club');
    });

    it('should return 400 for invalid club data', async () => {
      const invalidClubData = {
        // Missing required name field
        description: 'Test Description'
      };

      const response = await request(app)
        .post('/api/clubs')
        .send(invalidClubData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Kulüp oluşturulamadı');
    });
  });
});
