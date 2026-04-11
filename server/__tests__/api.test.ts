import { describe, it, expect, beforeAll } from 'vitest';

// DB_PATH and JWT_SECRET are configured in server/__tests__/setup.ts which
// vitest loads before any test file is parsed. Setting them here would be
// too late — ESM hoists static imports above any top-level code.

import { createApp } from '../app';
import { db } from '../db/client';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { cities, users } from '../db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (res: Response): Promise<any> => res.json();

const app = createApp();

let adminToken: string;
let teamToken: string;
let trainerToken: string;
let cityId: string;
let team1Id: string;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    migrate(db, { migrationsFolder: './server/db/migrations' });

    // Clean any stale data
    const { sqlite } = await import('../db/client');
    for (const t of [
      'leaderboard_cache',
      'team_progress',
      'announcement_reads',
      'announcements',
      'trainer_grades',
      'zones',
      'users',
      'cities',
    ]) {
      sqlite.exec(`DELETE FROM ${t}`);
    }

    cityId = nanoid();
    db.insert(cities)
      .values({
        id: cityId,
        name: 'Test City',
        timezone: 'Europe/Moscow',
        durationMin: 240,
        timerStatus: 'pending',
        mapEnabled: true,
        createdAt: new Date().toISOString(),
      })
      .run();

    db.insert(users)
      .values({
        id: nanoid(),
        login: 'testadmin',
        passwordHash: bcrypt.hashSync('admin', 10),
        role: 'admin',
        teamName: null,
        cityId: null,
        createdAt: new Date().toISOString(),
      })
      .run();

    team1Id = nanoid();
    db.insert(users)
      .values({
        id: team1Id,
        login: 'team1',
        passwordHash: bcrypt.hashSync('1234', 10),
        role: 'team',
        teamName: 'Team One',
        cityId,
        createdAt: new Date().toISOString(),
      })
      .run();

    db.insert(users)
      .values({
        id: nanoid(),
        login: 'trainer1',
        passwordHash: bcrypt.hashSync('1234', 10),
        role: 'trainer',
        teamName: 'Trainer One',
        cityId: null,
        createdAt: new Date().toISOString(),
      })
      .run();

    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'testadmin', password: 'admin' }),
    });
    adminToken = (await json(adminRes)).token;

    const teamRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'team1', password: '1234' }),
    });
    teamToken = (await json(teamRes)).token;

    const trainerRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'trainer1', password: '1234' }),
    });
    trainerToken = (await json(trainerRes)).token;
  });

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  const team = () => ({
    Authorization: `Bearer ${teamToken}`,
    'Content-Type': 'application/json',
  });

  const trainer = () => ({
    Authorization: `Bearer ${trainerToken}`,
    'Content-Type': 'application/json',
  });

  // ── Auth ──

  describe('Auth', () => {
    it('login success', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'team1', password: '1234' }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.token).toBeDefined();
      expect(body.user.teamName).toBe('Team One');
    });

    it('login wrong password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'team1', password: 'wrong' }),
      });
      expect(res.status).toBe(401);
    });

    it('me with token', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${teamToken}` },
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.user.login).toBe('team1');
    });

    it('me without token', async () => {
      const res = await app.request('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Cities ──

  describe('Cities', () => {
    it('list cities', async () => {
      const res = await app.request('/api/cities', { headers: admin() });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('create city (admin)', async () => {
      const res = await app.request('/api/cities', {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({ name: 'New City', timezone: 'UTC' }),
      });
      expect(res.status).toBe(201);
    });

    it('team cannot create city', async () => {
      const res = await app.request('/api/cities', {
        method: 'POST',
        headers: team(),
        body: JSON.stringify({ name: 'Nope', timezone: 'UTC' }),
      });
      expect(res.status).toBe(403);
    });
  });

  // ── Timer ──

  describe('Timer', () => {
    it('get → pending', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer`, {
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('pending');
      expect(body.remainingSeconds).toBe(14400);
    });

    it('start → running', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/start`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('running');
    });

    it('pause', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/pause`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('paused');
    });

    it('resume', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/resume`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('running');
    });

    it('stop', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/stop`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('finished');
      expect(body.remainingSeconds).toBe(0);
    });
  });

  // ── Zones ──

  describe('Zones', () => {
    let zoneId: string;

    it('create zone', async () => {
      const res = await app.request(`/api/cities/${cityId}/zones`, {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          name: 'Test Zone',
          type: 'task',
          difficulty: 'easy',
        }),
      });
      expect(res.status).toBe(201);
      const body = await json(res);
      zoneId = body.id;
      expect(body.name).toBe('Test Zone');
    });

    it('list zones', async () => {
      const res = await app.request(`/api/cities/${cityId}/zones`, {
        headers: team(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('update zone', async () => {
      const res = await app.request(`/api/cities/${cityId}/zones/${zoneId}`, {
        method: 'PUT',
        headers: admin(),
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.name).toBe('Updated');
    });

    it('delete zone', async () => {
      const res = await app.request(`/api/cities/${cityId}/zones/${zoneId}`, {
        method: 'DELETE',
        headers: admin(),
      });
      expect(res.status).toBe(200);
    });
  });

  // ── Teams ──

  describe('Teams', () => {
    it('create team', async () => {
      const res = await app.request(`/api/cities/${cityId}/teams`, {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          login: 'newteam',
          password: '1234',
          teamName: 'New',
        }),
      });
      expect(res.status).toBe(201);
    });

    it('bulk create', async () => {
      const res = await app.request(`/api/cities/${cityId}/teams/bulk`, {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          teams: [
            { login: 'b1', password: '1234', teamName: 'B1' },
            { login: 'b2', password: '1234', teamName: 'B2' },
          ],
        }),
      });
      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.created).toHaveLength(2);
    });

    it('duplicate login → 409', async () => {
      const res = await app.request(`/api/cities/${cityId}/teams`, {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          login: 'newteam',
          password: '1234',
          teamName: 'Dup',
        }),
      });
      expect(res.status).toBe(409);
    });
  });

  // ── Announcements ──

  describe('Announcements', () => {
    it('create and list', async () => {
      const createRes = await app.request(
        `/api/cities/${cityId}/announcements`,
        {
          method: 'POST',
          headers: admin(),
          body: JSON.stringify({
            title: 'Test',
            message: 'Hello',
            important: true,
          }),
        },
      );
      expect(createRes.status).toBe(201);

      const listRes = await app.request(`/api/cities/${cityId}/announcements`, {
        headers: team(),
      });
      expect(listRes.status).toBe(200);
      const body = await json(listRes);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].important).toBe(true);
    });

    it('admin sees announcements targeted at specific teams', async () => {
      // Create a fresh team that is the only target
      const otherTeamRes = await app.request(`/api/cities/${cityId}/teams`, {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          login: 'targeted-team',
          password: '1234',
          teamName: 'Targeted',
        }),
      });
      const otherTeam = await json(otherTeamRes);

      const createRes = await app.request(
        `/api/cities/${cityId}/announcements`,
        {
          method: 'POST',
          headers: admin(),
          body: JSON.stringify({
            title: 'Targeted',
            message: 'Only for one team',
            important: false,
            targetTeamIds: [otherTeam.id],
          }),
        },
      );
      expect(createRes.status).toBe(201);

      // Admin must see it
      const adminListRes = await app.request(
        `/api/cities/${cityId}/announcements`,
        { headers: admin() },
      );
      const adminBody = await json(adminListRes);
      expect(
        adminBody.some((a: { title: string }) => a.title === 'Targeted'),
      ).toBe(true);

      // Non-targeted team must NOT see it
      const teamListRes = await app.request(
        `/api/cities/${cityId}/announcements`,
        { headers: team() },
      );
      const teamBody = await json(teamListRes);
      expect(
        teamBody.some((a: { title: string }) => a.title === 'Targeted'),
      ).toBe(false);
    });
  });

  // ── Trainers ──

  describe('Trainers', () => {
    it('trainer can list cities', async () => {
      const res = await app.request('/api/trainer/cities', {
        headers: trainer(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('team role cannot access trainer endpoints', async () => {
      const res = await app.request('/api/trainer/cities', {
        headers: team(),
      });
      expect(res.status).toBe(403);
    });

    it('trainer can list teams in a city', async () => {
      const res = await app.request(`/api/trainer/cities/${cityId}/teams`, {
        headers: trainer(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.some((t: { login: string }) => t.login === 'team1')).toBe(
        true,
      );
    });

    it('grade endpoint returns 9 exercises with merged state', async () => {
      const res = await app.request(
        `/api/trainer/cities/${cityId}/teams/${team1Id}/grades`,
        { headers: trainer() },
      );
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.exercises).toHaveLength(9);
      expect(
        body.exercises.every((e: { completed: boolean }) => !e.completed),
      ).toBe(true);
    });

    it('trainer can mark and unmark exercise', async () => {
      // Mark exercise 3
      const markRes = await app.request(
        `/api/trainer/cities/${cityId}/teams/${team1Id}/grades`,
        {
          method: 'POST',
          headers: trainer(),
          body: JSON.stringify({ exerciseNumber: 3, completed: true }),
        },
      );
      expect(markRes.status).toBe(200);
      const marked = await json(markRes);
      const ex3 = marked.exercises.find(
        (e: { number: number }) => e.number === 3,
      );
      expect(ex3.completed).toBe(true);
      expect(ex3.source).toBe('trainer');

      // Marking again is idempotent
      const reMarkRes = await app.request(
        `/api/trainer/cities/${cityId}/teams/${team1Id}/grades`,
        {
          method: 'POST',
          headers: trainer(),
          body: JSON.stringify({ exerciseNumber: 3, completed: true }),
        },
      );
      expect(reMarkRes.status).toBe(200);

      // Unmark
      const unmarkRes = await app.request(
        `/api/trainer/cities/${cityId}/teams/${team1Id}/grades`,
        {
          method: 'POST',
          headers: trainer(),
          body: JSON.stringify({ exerciseNumber: 3, completed: false }),
        },
      );
      expect(unmarkRes.status).toBe(200);
      const unmarked = await json(unmarkRes);
      const ex3After = unmarked.exercises.find(
        (e: { number: number }) => e.number === 3,
      );
      expect(ex3After.completed).toBe(false);
    });

    it('admin can create and delete trainer accounts', async () => {
      const createRes = await app.request('/api/admin/trainers', {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          login: 'trainer-test',
          password: '1234',
          name: 'Test',
        }),
      });
      expect(createRes.status).toBe(201);
      const created = await json(createRes);
      expect(created.role).toBe('trainer');

      const listRes = await app.request('/api/admin/trainers', {
        headers: admin(),
      });
      const list = await json(listRes);
      expect(
        list.some((t: { login: string }) => t.login === 'trainer-test'),
      ).toBe(true);

      const delRes = await app.request(`/api/admin/trainers/${created.id}`, {
        method: 'DELETE',
        headers: admin(),
      });
      expect(delRes.status).toBe(200);
    });

    it('non-admin cannot create trainers', async () => {
      const res = await app.request('/api/admin/trainers', {
        method: 'POST',
        headers: trainer(),
        body: JSON.stringify({
          login: 'should-fail',
          password: '1234',
          name: 'X',
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  // ── Leaderboard ──

  describe('Leaderboard', () => {
    it('public (no auth)', async () => {
      const res = await app.request(`/api/public/cities/${cityId}/leaderboard`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(Array.isArray(body)).toBe(true);
    });
  });

  it('health check', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });
});
