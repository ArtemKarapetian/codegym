import { describe, it, expect, beforeAll } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';

// Use a fixed test DB path, clean before each run
const testDbPath = join(process.cwd(), 'data', 'test.db');
rmSync(testDbPath, { force: true });
rmSync(testDbPath + '-wal', { force: true });
rmSync(testDbPath + '-shm', { force: true });

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';

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
let cityId: string;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    migrate(db, { migrationsFolder: './server/db/migrations' });

    // Clean any stale data
    const { sqlite } = await import('../db/client');
    for (const t of [
      'leaderboard_cache',
      'team_progress',
      'announcements',
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

    const teamId = nanoid();
    db.insert(users)
      .values({
        id: teamId,
        login: 'team1',
        passwordHash: bcrypt.hashSync('1234', 10),
        role: 'team',
        teamName: 'Team One',
        cityId,
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
  });

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  const team = () => ({
    Authorization: `Bearer ${teamToken}`,
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
